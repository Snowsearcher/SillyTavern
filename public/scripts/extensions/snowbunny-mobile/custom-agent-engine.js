import { extension_prompt_roles, extension_prompt_types } from '../../../script.js';

const PROMPT_KEY = 'snowbunny-custom-agents';
const MAX_FEEDBACK_CHARS = 24000;

let initialized = false;
let busy = false;
let queue = [];
let pendingWriterReceipt = null;
let reconcileTimer = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function agents() {
    return globalThis.SnowBunny?.agents ?? null;
}

function memories() {
    return globalThis.SnowBunny?.memories ?? null;
}

function cleanChoiceMarkup(value) {
    return String(value || '').replace(/<choicecard\b[^>]*>[\s\S]*?<\/choicecard>/gi, '').trim();
}

function visibleStory(endIndex, limit) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    const end = Math.max(0, Math.min(api.chat.length - 1, Number(endIndex)));
    return api.chat
        .slice(0, end + 1)
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(2, Number(limit) || 30))
        .map(message => ({
            speaker: message.name || (message.is_user ? api.name1 : api.name2) || (message.is_user ? 'User' : 'Assistant'),
            role: message.is_user ? 'user' : 'assistant',
            text: cleanChoiceMarkup(message.mes),
        }))
        .filter(row => row.text);
}

function wordSet(value) {
    return new Set(String(value || '').toLocaleLowerCase().split(/[^\p{L}\p{N}_]+/u).filter(word => word.length >= 3));
}

function memoryHints(memoryState, storyRows, limit = 12) {
    const pool = Array.isArray(memoryState?.memories) ? memoryState.memories : [];
    if (!pool.length) return [];
    const query = wordSet(storyRows.map(row => row.text).join(' '));
    return pool
        .map((memory, index) => {
            let score = 0;
            for (const word of wordSet(`${memory.title} ${memory.details}`)) if (query.has(word)) score++;
            return { memory, score, index };
        })
        .sort((a, b) => b.score - a.score || b.index - a.index)
        .slice(0, limit)
        .map(item => item.memory);
}

function assistantIndexesBetween(startIndex, endIndex) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    const indexes = [];
    for (let index = Math.max(0, startIndex); index <= Math.min(endIndex, api.chat.length - 1); index++) {
        const message = api.chat[index];
        if (!message || message.is_user || message.is_system || (ignore && message.extra?.[ignore])) continue;
        indexes.push(index);
    }
    return indexes;
}

function messageIndexByIdentity(messageId) {
    const api = context();
    if (!Array.isArray(api?.chat)) return -1;
    return api.chat.findIndex(message => {
        const identity = globalThis.SnowBunny?.identity?.current?.(message) || message?.extra?.snowbunny || {};
        return String(identity.id || '') === String(messageId || '');
    });
}

function dueForDefinition(definition, currentResult, targetIndex, force) {
    if (force) return true;
    if (!definition.automatic) return false;
    const previousIndex = currentResult ? messageIndexByIdentity(currentResult.source?.message?.id) : -1;
    return assistantIndexesBetween(previousIndex + 1, targetIndex).length >= Math.max(1, Number(definition.frequency) || 1);
}

function sourceStillValid(source) {
    return agents()?.sourceValid?.(source) === true;
}

function dependencyText(definition, currentByAgent, byDefinition) {
    const blocks = [];
    const ids = [];
    for (const dependencyId of definition.dependencies || []) {
        const result = currentByAgent.get(dependencyId);
        const dep = byDefinition.get(dependencyId);
        if (!result || !agents()?.resultStillValid?.(result)) {
            throw new Error(`${definition.name} needs a current result from ${dep?.name || 'one of its dependencies'}.`);
        }
        ids.push(result.id);
        blocks.push(`${dep?.name || dependencyId}:\n${result.text}`);
    }
    return { text: blocks.join('\n\n'), ids };
}

function baseSystemPrompt(definition) {
    const mode = definition.instructionsMode === 'suggest'
        ? 'This task may produce suggestions. Keep suggestions clearly separate from established fictional facts and never claim a suggestion already happened.'
        : 'Record or analyze only what the supplied fictional evidence supports. Do not invent developments merely to make the result interesting.';
    return `You are a focused SnowBunny story-support Agent. Carry out the user-authored task below and return the RESULT itself, without preamble about your role.

${mode}

Keep private knowledge private. Characters know only what the fiction established they know. Unchosen CYOA options did not happen. Do not write the next scene unless the task explicitly asks for writing. If previous Agent state is supplied, preserve useful established details until the story actually changes them.

Agent task:\n${definition.prompt}`;
}

async function runOne(definition, targetIndex, state, currentByAgent, byDefinition, { force = false } = {}) {
    if (!definition.enabled) return null;
    const previous = currentByAgent.get(definition.id) || null;
    if (!dueForDefinition(definition, previous, targetIndex, force)) return null;
    const api = context();
    const target = api?.chat?.[targetIndex];
    if (!target || target.is_user || target.is_system) return null;

    const source = agents().sourceForMessage(target, targetIndex, definition.historyCount);
    if (!source) return null;
    const dependencies = dependencyText(definition, currentByAgent, byDefinition);
    const rows = visibleStory(targetIndex, definition.historyCount);
    if (!rows.length) return null;
    let memoryBlock = '';
    if (definition.includeAcceptedMemories) {
        try {
            const memoryState = await memories()?.read?.();
            const selected = memoryHints(memoryState, rows);
            if (selected.length) {
                memoryBlock = `\n\nAccepted long-term Memories supplied only because this Agent explicitly requested them:\n${selected.map(memory => `${memory.title}: ${memory.details}`).join('\n\n')}`;
            }
        } catch (error) {
            console.warn(`[SnowBunny] ${definition.name} could not read accepted Memories.`, error);
        }
    }

    const prompt = `Previous result:\n${previous?.text || '(none)'}\n\n${dependencies.text ? `Dependency results:\n${dependencies.text}\n\n` : ''}Recent visible story, oldest to newest:\n${rows.map(row => `${row.speaker}: ${row.text}`).join('\n\n')}${memoryBlock}\n\nReturn the updated/current result for your task.`;

    await agents().setStatus(definition.id, 'running', '', source.message.id);
    try {
        const resultText = await api.generateRaw({
            prompt,
            systemPrompt: baseSystemPrompt(definition),
            responseLength: definition.replyLimit,
            trimNames: false,
        });
        if (!sourceStillValid(source)) throw new Error('Story evidence changed while this Agent was running.');
        const currentState = await agents().read({ fresh: true });
        if (!currentState.definitions.some(item => item.id === definition.id && item.enabled)) {
            throw new Error('This Agent was changed or disabled while it was running.');
        }
        const text = String(resultText || '').trim();
        if (!text) throw new Error('The Agent returned an empty result. Its previous result was kept.');
        const result = await agents().appendResult({
            agentId: definition.id,
            text,
            source,
            previousResultId: previous?.id || '',
            dependencyResultIds: dependencies.ids,
        });
        currentByAgent.set(definition.id, result);
        document.dispatchEvent(new CustomEvent('snowbunny:agent-result-ready', {
            detail: { agentId: definition.id, resultId: result.id, messageId: source.message.id },
        }));
        return result;
    } catch (error) {
        await agents().setStatus(definition.id, 'failed', String(error?.message || error), source.message.id);
        throw error;
    }
}

async function runForMessage(targetIndex, { automatic = true, onlyAgentId = '', force = false } = {}) {
    const store = agents();
    if (!store || !context()?.getCurrentChatId?.()) return [];
    const reconciliation = await store.reconcile({ persist: true });
    const state = reconciliation.state;
    const ordered = store.validateGraph(state.definitions);
    const byDefinition = new Map(ordered.map(definition => [definition.id, definition]));
    const currentByAgent = store.currentResultsFromState(state);
    const requested = new Set();

    const addDependency = agentId => {
        if (requested.has(agentId)) return;
        const definition = byDefinition.get(agentId);
        if (!definition) throw new Error('The requested Custom Agent no longer exists.');
        for (const dependencyId of definition.dependencies || []) addDependency(dependencyId);
        requested.add(agentId);
    };
    if (onlyAgentId) addDependency(onlyAgentId);

    const produced = [];
    for (const definition of ordered) {
        if (!definition.enabled) continue;
        if (onlyAgentId && !requested.has(definition.id)) continue;
        if (!onlyAgentId && automatic && !definition.automatic) continue;
        try {
            const result = await runOne(definition, targetIndex, state, currentByAgent, byDefinition, { force: force || Boolean(onlyAgentId) });
            if (result) produced.push(result);
        } catch (error) {
            console.warn(`[SnowBunny] Custom Agent ${definition.name} failed.`, error);
            // A dependent Agent must not run on a failed/stale dependency. The
            // currentByAgent map still contains only the last valid result, and
            // dependency validation will stop a dependent job when appropriate.
        }
    }
    return produced;
}

async function drainQueue() {
    if (busy) return;
    busy = true;
    try {
        while (queue.length) {
            const index = queue.shift();
            if (!Number.isInteger(index)) continue;
            await runForMessage(index, { automatic: true });
        }
    } finally {
        busy = false;
    }
}

function queueMessage(index) {
    index = Number(index);
    if (!Number.isInteger(index) || queue.includes(index)) return;
    queue.push(index);
    void drainQueue();
}

function escapeAttr(value) {
    return String(value || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function routeFeedback() {
    const api = context();
    if (!api?.setExtensionPrompt || !agents()) return [];
    const reconciliation = await agents().reconcile({ persist: true });
    const state = reconciliation.state;
    const definitions = new Map(state.definitions.map(definition => [definition.id, definition]));
    const current = agents().currentResultsFromState(state);
    const selected = [];
    let characters = 0;
    for (const definition of state.definitions) {
        if (!definition.enabled || !definition.feedback) continue;
        const result = current.get(definition.id);
        if (!result || !agents().resultStillValid(result)) continue;
        const block = `<agent-result id="${escapeAttr(definition.id)}" name="${escapeAttr(definition.name)}">\n${result.text}\n</agent-result>`;
        if (characters + block.length > MAX_FEEDBACK_CHARS && selected.length) continue;
        selected.push({ definition, result, block });
        characters += block.length;
    }
    const prompt = selected.length ? `<agent-context>\n${selected.map(item => item.block).join('\n\n')}\n</agent-context>` : '';
    api.setExtensionPrompt(
        PROMPT_KEY,
        prompt,
        extension_prompt_types.IN_CHAT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
    pendingWriterReceipt = selected.length ? {
        characters,
        results: selected.map(item => ({
            agentId: item.definition.id,
            name: item.definition.name,
            resultId: item.result.id,
            producingMessageId: item.result.source.message.id,
        })),
    } : null;
    return selected;
}

function attachWriterReceipt(message) {
    if (!message || message.is_user || message.is_system || !pendingWriterReceipt) return;
    message.extra ||= {};
    message.extra.snowbunny ||= {};
    message.extra.snowbunny.contextReceipt ||= {};
    message.extra.snowbunny.contextReceipt.guidance ||= {};
    message.extra.snowbunny.contextReceipt.guidance.customAgents = structuredClone(pendingWriterReceipt);
    const save = context()?.saveChat;
    if (typeof save === 'function') window.setTimeout(() => void save(), 90);
}

function latestAssistantIndex() {
    const api = context();
    if (!Array.isArray(api?.chat)) return -1;
    const ignore = api?.symbols?.ignore;
    for (let index = api.chat.length - 1; index >= 0; index--) {
        const message = api.chat[index];
        if (!message || message.is_user || message.is_system || (ignore && message.extra?.[ignore])) continue;
        return index;
    }
    return -1;
}

export async function runCustomAgentNow(agentId) {
    const index = latestAssistantIndex();
    if (index < 0) throw new Error('There is no completed story reply for this Agent to review yet.');
    const results = await runForMessage(index, { automatic: false, onlyAgentId: agentId, force: true });
    await routeFeedback();
    return results.find(result => result.agentId === agentId) || null;
}

function scheduleReconcile() {
    clearTimeout(reconcileTimer);
    reconcileTimer = window.setTimeout(async () => {
        try {
            const result = await agents()?.reconcile?.({ persist: true });
            if (result?.changed) {
                await routeFeedback();
                document.dispatchEvent(new CustomEvent('snowbunny:agent-results-reconciled'));
            }
        } catch (error) {
            console.warn('[SnowBunny] Could not reconcile Custom Agent results.', error);
        }
    }, 220);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;

    if (types.GENERATION_AFTER_COMMANDS) {
        source.on(types.GENERATION_AFTER_COMMANDS, async (_type, _options, dryRun) => {
            if (!dryRun) await routeFeedback();
        });
    }
    if (types.MESSAGE_RECEIVED) {
        source.on(types.MESSAGE_RECEIVED, (messageId, generationType) => {
            const index = Number(messageId);
            const message = Number.isInteger(index) ? api.chat?.[index] : api.chat?.at?.(-1);
            attachWriterReceipt(message);
            if (generationType === 'first_message' || !message || message.is_user || message.is_system) return;
            if (Number.isInteger(index)) queueMessage(index);
        });
    }
    for (const name of ['MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED']) {
        const event = types[name];
        if (event) source.on(event, scheduleReconcile);
    }
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => {
            queue = [];
            pendingWriterReceipt = null;
            void routeFeedback();
        });
    }
}

export function initCustomAgentEngine() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    document.addEventListener('snowbunny:agents-changed', () => void routeFeedback());
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        customAgentEngine: {
            runNow: runCustomAgentNow,
            runForMessage,
            routeFeedback,
        },
    };
    void routeFeedback();
}
