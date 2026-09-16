import { extension_prompt_roles, extension_prompt_types } from '../../../script.js';

const PROMPT_KEY = 'snowbunny-current-story-state';
const SECTION_ORDER = ['thoughts', 'relationships', 'scene', 'threads', 'secrets', 'conditions', 'inventory', 'locations', 'gmNotes'];
const SECTION_LABELS = {
    thoughts: 'Thoughts',
    relationships: 'Relationships',
    scene: 'Scene',
    threads: 'Threads',
    secrets: 'Secrets',
    conditions: 'Conditions',
    inventory: 'Inventory',
    locations: 'Offscreen Characters',
    gmNotes: 'GM Notes',
};

let initialized = false;
let busy = false;
let queuedMessageId = null;
let rebuildTimer = null;
let pendingWriterReceipt = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function trackers() {
    return globalThis.SnowBunny?.trackers ?? null;
}

function cleanChoiceMarkup(value) {
    return String(value || '').replace(/<choicecard\b[^>]*>[\s\S]*?<\/choicecard>/gi, '').trim();
}

function visibleStory(limit) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    return api.chat
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(4, limit))
        .map(message => ({
            speaker: message.name || (message.is_user ? api.name1 : api.name2) || (message.is_user ? 'User' : 'Assistant'),
            role: message.is_user ? 'user' : 'assistant',
            text: cleanChoiceMarkup(message.mes),
        }))
        .filter(row => row.text);
}

function stripFence(text) {
    const value = String(text || '').trim();
    const match = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(value);
    return match ? match[1].trim() : value;
}

function enabledSections(settings) {
    return SECTION_ORDER.filter(key => settings?.sections?.[key] === true);
}

function sectionInstructions(keys) {
    const guidance = {
        thoughts: 'Private thoughts and real feelings of characters still present at the end. Never write thoughts for the user. Keep knowledge boundaries intact. Short, direct, character-specific prose.',
        relationships: 'How the user currently stands with recurring characters. No scores or levels. Preserve unchanged relationships instead of inventing movement. Mention a change only when this story reply genuinely changed the bond.',
        scene: 'Who is present and immediate physical details that matter to what happens next. Do not repeat time/place, atmosphere, or character-card description.',
        threads: 'Unfinished situations already in motion, including relevant offscreen developments. Distinguish established facts from trajectory. Do not resolve a thread just because it has been quiet.',
        secrets: 'Hidden knowledge actively shaping the story. Preserve who knows what. Do not restate ordinary lore or reveal a secret merely because you know it.',
        conditions: 'Persistent states such as drunk, drugged, injured, cursed, transformed, exhausted, restrained, or similar. Carry them forward until the fiction actually resolves them.',
        inventory: 'Plot-relevant possessions/resources only. Track ownership changes only when established.',
        locations: 'Named offscreen characters whose established location/activity could matter soon. Do not invent whereabouts or use this as a census.',
        gmNotes: 'Standing out-of-character player instructions, corrections, bans, or rules that need to survive. Story events never go here.',
    };
    return keys.map(key => `${SECTION_LABELS[key]}: ${guidance[key]}`).join('\n');
}

function trackerSystemPrompt(settings) {
    const keys = enabledSections(settings);
    return `You are SnowBunny's Story Tracker. You run after a completed fictional story reply and maintain the CURRENT state used by the next Story Writer response.

Start from the previous Story State. Update only what the supplied visible story actually establishes. Carry everything else forward. Do not change a feeling, relationship, condition, secret, thread, or location merely because another reply happened. Do not invent backstory, dates, elapsed time, knowledge, motives, or outcomes.

This is current state, not a recap and not long-term Memory. Memory Maker separately stores important historical events. Keep the present consequence here instead of retelling history. Lorebooks and Scenario are separate authored sources and are intentionally not supplied to you.

Private state stays private. A character may feel one thing and show another. The user knows only what the fiction established they know. If a response ends on a choice, decision point, or <choicecard>, none of the unchosen options happened.

TIME & PLACE: preserve the established story date/time and current place. Move either only when the visible fiction establishes the change. Unknown stays unknown. Include who is currently present when useful. Keep this to one or two tight lines.

Write plainly and specifically. Say the real emotion/state without clinical euphemism or poetic filler. Keep entries concise enough to be useful to a writer. Produce the FULL current record, not a change log. Empty sections may be an empty string.

Enabled sections:
${sectionInstructions(keys)}

Return JSON only in exactly this shape:
{"timePlace":"one or two lines","sections":{${keys.map(key => `"${key}":"text"`).join(',')}}}

Do not output disabled sections. Do not add commentary outside JSON.${settings?.instructions ? `\n\nAdditional user instructions for this tracker:\n${settings.instructions}` : ''}`;
}

function previousForPrompt(snapshot, settings) {
    const keys = enabledSections(settings);
    if (!snapshot) return { timePlace: '', sections: Object.fromEntries(keys.map(key => [key, ''])) };
    return {
        timePlace: snapshot.timePlace || '',
        sections: Object.fromEntries(keys.map(key => [key, snapshot.sections?.[key] || ''])),
    };
}

function parseTrackerResult(text, settings) {
    let decoded;
    try {
        decoded = JSON.parse(stripFence(text));
    } catch (_) {
        throw new Error('Story Tracker did not return complete JSON. The previous Story State was kept.');
    }
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded) || typeof decoded.sections !== 'object' || Array.isArray(decoded.sections)) {
        throw new Error('Story Tracker returned an invalid state object.');
    }
    const keys = enabledSections(settings);
    const sections = {};
    for (const key of SECTION_ORDER) {
        if (!keys.includes(key)) {
            sections[key] = '';
            continue;
        }
        const value = decoded.sections[key];
        if (value !== undefined && typeof value !== 'string') throw new Error(`Story Tracker returned invalid ${SECTION_LABELS[key]} text.`);
        sections[key] = String(value || '').trim().slice(0, 24000);
    }
    return {
        timePlace: String(decoded.timePlace || '').trim().slice(0, 2000),
        sections,
    };
}

function serializeCurrentState(snapshot) {
    if (!snapshot) return '';
    const blocks = [];
    if (snapshot.timePlace) blocks.push(`Time & Place: ${snapshot.timePlace}`);
    for (const key of SECTION_ORDER) {
        const value = String(snapshot.sections?.[key] || '').trim();
        if (value) blocks.push(`${SECTION_LABELS[key]}:\n${value}`);
    }
    if (!blocks.length) return '';
    return `<current-state revision="${Number(snapshot.revision) || 1}"${snapshot.manuallyEdited ? ' edited="true"' : ''}>\n${blocks.join('\n\n')}\n</current-state>`;
}

function clearCurrentStatePrompt(api) {
    api.setExtensionPrompt(
        PROMPT_KEY,
        '',
        extension_prompt_types.IN_CHAT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
    pendingWriterReceipt = null;
}

async function routeCurrentState() {
    const api = context();
    const trackerApi = trackers();
    if (!api?.setExtensionPrompt || !trackerApi) return null;
    const reconciliation = await trackerApi.reconcile({ persist: true });
    if (reconciliation.state.settings?.automatic === false) {
        clearCurrentStatePrompt(api);
        return null;
    }
    const snapshot = trackerApi.currentFromState(reconciliation.state);
    const valid = snapshot && trackerApi.snapshotStillValid(snapshot) ? snapshot : null;
    const prompt = serializeCurrentState(valid);
    api.setExtensionPrompt(
        PROMPT_KEY,
        prompt,
        extension_prompt_types.IN_CHAT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
    pendingWriterReceipt = valid ? {
        snapshotId: valid.id,
        revision: valid.revision,
        producingMessageId: valid.source?.message?.id || '',
        manuallyEdited: valid.manuallyEdited === true,
        stale: false,
        timePlace: valid.timePlace || '',
        sections: SECTION_ORDER.filter(key => String(valid.sections?.[key] || '').trim()).map(key => SECTION_LABELS[key]),
    } : null;
    return valid;
}

function attachWriterReceipt(message) {
    if (!message || message.is_user || message.is_system || !pendingWriterReceipt) return;
    message.extra ||= {};
    message.extra.snowbunny ||= {};
    message.extra.snowbunny.contextReceipt ||= {};
    message.extra.snowbunny.contextReceipt.trackers = structuredClone(pendingWriterReceipt);
    const save = context()?.saveChat;
    if (typeof save === 'function') window.setTimeout(() => void save(), 50);
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

async function updateTrackerForMessage(messageId, { force = false } = {}) {
    const api = context();
    const trackerApi = trackers();
    if (!trackerApi || !Array.isArray(api?.chat)) return;
    const state = await trackerApi.read();
    if (!force && state.settings?.automatic === false) return;
    const message = api.chat[messageId];
    if (!message || message.is_user || message.is_system) return;
    const source = trackerApi.sourceForMessage(message, state.settings?.historyCount || 14);
    if (!source) return;

    const previous = trackerApi.currentFromState(state);
    const rows = visibleStory(state.settings?.historyCount || 14);
    if (!rows.length) return;
    const prompt = `Previous Story State:\n${JSON.stringify(previousForPrompt(previous, state.settings))}\n\nVisible story evidence, oldest to newest:\n${rows.map(row => `${row.speaker}: ${row.text}`).join('\n\n')}\n\nUpdate the Story State to the exact situation after the final line.`;

    const result = await api.generateRaw({
        prompt,
        systemPrompt: trackerSystemPrompt(state.settings),
        responseLength: state.settings?.replyLimit || 2600,
        trimNames: false,
    });
    const parsed = parseTrackerResult(result, state.settings);

    const stillCurrentChat = trackerApi.snapshotStillValid({ source, stale: false });
    if (!stillCurrentChat) return;
    const snapshot = await trackerApi.append({
        source,
        timePlace: parsed.timePlace,
        sections: parsed.sections,
    });
    document.dispatchEvent(new CustomEvent('snowbunny:tracker-snapshot-ready', { detail: { snapshotId: snapshot.id, messageId: source.message.id } }));
}

async function drainQueue() {
    if (busy) return;
    busy = true;
    try {
        while (queuedMessageId !== null) {
            const next = queuedMessageId;
            queuedMessageId = null;
            try {
                await updateTrackerForMessage(next);
            } catch (error) {
                console.warn('[SnowBunny] Story Tracker update failed. Previous current state remains available.', error);
                document.dispatchEvent(new CustomEvent('snowbunny:tracker-error', { detail: { message: String(error?.message || error) } }));
            }
        }
    } finally {
        busy = false;
    }
}

function queueUpdate(messageId) {
    if (!Number.isInteger(Number(messageId))) return;
    queuedMessageId = Number(messageId);
    void drainQueue();
}

function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(async () => {
        try {
            const result = await trackers()?.reconcile?.({ persist: true });
            if (!result?.currentInvalidated) return;
            const index = latestAssistantIndex();
            if (index >= 0) {
                queuedMessageId = index;
                await drainQueue();
            }
        } catch (error) {
            console.warn('[SnowBunny] Could not reconcile Story State after a history change.', error);
        }
    }, 240);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;

    if (types.GENERATION_AFTER_COMMANDS) {
        source.on(types.GENERATION_AFTER_COMMANDS, async (_type, _options, dryRun) => {
            if (!dryRun) await routeCurrentState();
        });
    }

    if (types.MESSAGE_RECEIVED) {
        source.on(types.MESSAGE_RECEIVED, (messageId, generationType) => {
            const index = Number(messageId);
            const message = Number.isInteger(index) ? api.chat?.[index] : api.chat?.at?.(-1);
            attachWriterReceipt(message);
            if (generationType === 'first_message') return;
            if (Number.isInteger(index)) queueUpdate(index);
        });
    }

    for (const name of ['MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED']) {
        const event = types[name];
        if (event) source.on(event, scheduleRebuild);
    }

    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => {
            pendingWriterReceipt = null;
            void routeCurrentState();
        });
    }
}

export async function regenerateStoryTracker() {
    const index = latestAssistantIndex();
    if (index < 0) return null;
    await updateTrackerForMessage(index, { force: true });
    return trackers()?.current?.() ?? null;
}

export function initStoryTracker() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    document.addEventListener('snowbunny:tracker-state-changed', () => void routeCurrentState());
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        storyTracker: {
            regenerate: regenerateStoryTracker,
            routeCurrentState,
            sectionLabels: { ...SECTION_LABELS },
        },
    };
    void routeCurrentState();
}
