const SAVE_DELAY_MS = 110;
const CLEAR_DELAY_MS = 900;

let initialized = false;
let active = null;
let clearTimer = null;
let sequence = 0;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function snowState() {
    return globalThis.SnowBunny?.state ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function compactWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanChoiceMarkup(value) {
    return String(value || '').replace(/<choicecard\b[^>]*>[\s\S]*?<\/choicecard>/gi, '').trim();
}

function contentText(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content.map(item => {
            if (typeof item === 'string') return item;
            if (!item || typeof item !== 'object') return '';
            return typeof item.text === 'string'
                ? item.text
                : typeof item.content === 'string'
                    ? item.content
                    : '';
        }).filter(Boolean).join('\n');
    }
    if (content && typeof content === 'object') {
        if (typeof content.text === 'string') return content.text;
        if (typeof content.content === 'string') return content.content;
    }
    return '';
}

function messageIdentity(message) {
    return globalThis.SnowBunny?.identity?.current?.(message) || message?.extra?.snowbunny || {};
}

function visibleCanonicalMessages() {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    return api.chat
        .map((message, index) => ({ message, index }))
        .filter(({ message }) => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .map(({ message, index }) => {
            const identity = messageIdentity(message);
            return {
                index,
                id: String(identity.id || ''),
                revision: Number(identity.revision) || 0,
                source: String(identity.source || ''),
                role: message.is_user ? 'user' : 'assistant',
                speaker: String(message.name || (message.is_user ? api.name1 : api.name2) || (message.is_user ? 'User' : 'Assistant')),
                text: cleanChoiceMarkup(message.mes),
            };
        });
}

function activePresetName() {
    const saved = snowState()?.readChat?.()?.presetSelection;
    const select = saved?.selectId ? document.getElementById(saved.selectId) : null;
    if (select instanceof HTMLSelectElement) {
        return select.selectedOptions[0]?.textContent?.trim() || select.value || '';
    }
    for (const selector of ['#settings_preset_openai', '#settings_preset_textgenerationwebui', '#settings_preset', '#settings_preset_novel']) {
        const candidate = document.querySelector(selector);
        if (candidate instanceof HTMLSelectElement && candidate.options.length) {
            return candidate.selectedOptions[0]?.textContent?.trim() || candidate.value || '';
        }
    }
    return '';
}

function modelSummary() {
    const api = context();
    const saved = snowState()?.readChat?.()?.modelSelection;
    return {
        api: String(saved?.mainApi || api?.mainApi || ''),
        provider: String(saved?.provider || api?.chatCompletionSettings?.chat_completion_source || api?.textCompletionSettings?.type || ''),
        model: String(saved?.model || api?.getChatCompletionModel?.() || ''),
        preset: activePresetName(),
    };
}

function guidanceSummary() {
    const state = snowState()?.readChat?.() || {};
    const scenario = state.scenario && typeof state.scenario === 'object' ? state.scenario : null;
    const chatRules = globalThis.SnowBunny?.regex?.chatRules?.() || [];
    const globalRules = globalThis.SnowBunny?.regex?.globalRules?.() || [];
    const api = context();
    const group = api?.groupId ? api?.groups?.find(item => String(item.id) === String(api.groupId)) : null;
    const parsedCharacterId = api?.characterId === null || api?.characterId === undefined || api?.characterId === ''
        ? Number.NaN
        : Number.parseInt(String(api.characterId), 10);
    const members = group
        ? (group.members || []).map(avatar => api?.characters?.find(character => character.avatar === avatar)?.name || avatar)
        : Number.isInteger(parsedCharacterId) && api?.characters?.[parsedCharacterId]
            ? [api.characters[parsedCharacterId].name]
            : [];

    return {
        scenario: scenario?.enabled === true
            ? {
                enabled: true,
                fields: [
                    scenario.premise?.trim() ? 'premise' : '',
                    scenario.focus?.trim() ? 'genre/focus' : '',
                    scenario.writerKnowledge?.trim() ? 'writer knowledge' : '',
                    scenario.directions?.trim() ? 'directions' : '',
                ].filter(Boolean),
            }
            : { enabled: false },
        cyoa: state.cyoaEnabled === true ? 'On' : 'Off',
        narrator: state.narratorMember === true ? 'Selected' : 'Not selected',
        members,
        regex: {
            chatEnabled: chatRules.filter(rule => !rule.disabled).length,
            globalEnabled: globalRules.filter(rule => !rule.disabled).length,
        },
    };
}

function startAudit(generationType, options, dryRun) {
    if (dryRun || !context()?.getCurrentChatId?.()) return;
    clearTimeout(clearTimer);
    const model = modelSummary();
    active = {
        id: `audit_${Date.now()}_${++sequence}`,
        chatId: String(context().getCurrentChatId()),
        generationType: String(generationType || options?.type || 'reply'),
        startedAt: Date.now(),
        model,
        guidance: guidanceSummary(),
        canonical: visibleCanonicalMessages(),
        final: null,
        attachedMessageIds: [],
    };
}

function normalizePromptRows(rows) {
    return rows.map((row, index) => {
        const role = String(row?.role || row?.name || (row?.is_user ? 'user' : '') || 'prompt');
        const text = contentText(row?.content ?? row?.message ?? row?.text ?? '');
        return {
            index,
            role,
            text,
            normalized: compactWhitespace(text),
            characters: text.length,
        };
    }).filter(row => row.text || row.characters === 0);
}

function captureChatCompletion(eventData) {
    if (!active || !Array.isArray(eventData?.chat)) return;
    active.canonical = visibleCanonicalMessages();
    active.final = {
        backend: 'chat-completion',
        rows: normalizePromptRows(eventData.chat),
        capturedAt: Date.now(),
    };
}

function captureTextCompletion(data) {
    if (!active || !Array.isArray(data?.finalMesSend)) return;
    active.canonical = visibleCanonicalMessages();
    active.final = {
        backend: 'text-completion',
        rows: normalizePromptRows(data.finalMesSend),
        capturedAt: Date.now(),
    };
}

function canonicalMatch(promptRows, canonical) {
    const matched = new Set();
    const promptTexts = promptRows.map(row => row.normalized).filter(Boolean);
    for (const item of canonical) {
        const needle = compactWhitespace(item.text);
        if (!needle || needle.length < 3) continue;
        const found = promptTexts.some(prompt => {
            if (!prompt) return false;
            if (prompt === needle) return true;
            if (needle.length >= 12 && prompt.includes(needle)) return true;
            if (prompt.length >= 12 && needle.includes(prompt)) return true;
            return false;
        });
        if (found) matched.add(item.id || `index:${item.index}`);
    }
    return matched;
}

function historyReceipt() {
    const finalRows = active?.final?.rows || [];
    const canonical = active?.canonical || [];
    const matched = canonicalMatch(finalRows, canonical);
    const included = [];
    const omitted = [];
    for (const item of canonical) {
        const key = item.id || `index:${item.index}`;
        const record = {
            id: item.id || `message-${item.index + 1}`,
            revision: item.revision,
            speaker: item.speaker,
            role: item.role,
        };
        (matched.has(key) ? included : omitted).push(record);
    }
    const roles = {};
    for (const row of finalRows) roles[row.role] = (roles[row.role] || 0) + 1;
    return {
        capture: active?.final?.backend || 'not captured',
        visibleCanonical: canonical.length,
        matchedCanonical: included.length,
        omittedCanonical: omitted.length,
        included,
        omitted,
        finalRequestMessages: finalRows.length,
        finalRequestRoles: roles,
        matchingNote: 'Included/omitted history is matched against the final outgoing request text. Formatting transforms can make a canonical message unmatchable even when equivalent text survived.',
    };
}

function fittingReceipt() {
    const rows = active?.final?.rows || [];
    const history = historyReceipt();
    const joined = rows.map(row => row.text).join('\n');
    return {
        backend: active?.final?.backend || 'not captured',
        finalCharacters: joined.length,
        finalRequestMessages: rows.length,
        visibleCanonicalMessages: history.visibleCanonical,
        matchedCanonicalMessages: history.matchedCanonical,
        omittedCanonicalMessages: history.omittedCanonical,
        historyMayHaveBeenTrimmed: history.omittedCanonical > 0,
        choiceCardMarkupInFinalRequest: /<choicecard\b/i.test(joined),
    };
}

function mergeReceipt(message) {
    if (!active) return false;
    const api = context();
    if (!message || message.is_user || message.is_system) return false;
    if (String(api?.getCurrentChatId?.() || '') !== active.chatId) return false;

    const identity = messageIdentity(message);
    const receipt = message.extra ||= {};
    receipt.snowbunny ||= {};
    receipt.snowbunny.contextReceipt ||= {};
    const target = receipt.snowbunny.contextReceipt;
    const model = active.model || {};
    if (model.model) target.model = model.model;
    if (model.provider) target.provider = model.provider;
    if (model.api) target.api = model.api;
    if (model.preset) target.preset = model.preset;
    target.history = historyReceipt();
    target.fitting = fittingReceipt();
    target.guidance = {
        ...clone(active.guidance),
        ...(target.guidance && typeof target.guidance === 'object' ? target.guidance : {}),
    };
    target.audit = {
        id: active.id,
        generationType: active.generationType,
        startedAt: active.startedAt,
        finalPromptCapturedAt: active.final?.capturedAt || null,
    };
    active.attachedMessageIds.push(String(identity.id || ''));
    document.dispatchEvent(new CustomEvent('snowbunny:context-receipt-changed', { detail: { messageId: identity.id || '' } }));
    if (typeof api?.saveChat === 'function') window.setTimeout(() => void api.saveChat(), SAVE_DELAY_MS);
    return true;
}

function scheduleClear() {
    clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
        active = null;
    }, CLEAR_DELAY_MS);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;

    if (types.GENERATION_AFTER_COMMANDS) {
        source.on(types.GENERATION_AFTER_COMMANDS, (generationType, options, dryRun) => startAudit(generationType, options, dryRun));
    }
    if (types.CHAT_COMPLETION_PROMPT_READY) {
        source.on(types.CHAT_COMPLETION_PROMPT_READY, captureChatCompletion);
    }
    if (types.GENERATE_BEFORE_COMBINE_PROMPTS) {
        source.on(types.GENERATE_BEFORE_COMBINE_PROMPTS, captureTextCompletion);
    }
    if (types.MESSAGE_RECEIVED) {
        source.on(types.MESSAGE_RECEIVED, messageId => {
            const index = Number(messageId);
            const message = Number.isInteger(index) ? api.chat?.[index] : api.chat?.at?.(-1);
            mergeReceipt(message);
        });
    }
    if (types.GENERATION_ENDED) source.on(types.GENERATION_ENDED, scheduleClear);
    if (types.GENERATION_STOPPED) source.on(types.GENERATION_STOPPED, () => { active = null; clearTimeout(clearTimer); });
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => { active = null; clearTimeout(clearTimer); });
    }
}

export function initContextAudit() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        contextAudit: {
            active: () => clone(active),
            historyReceipt: () => active ? historyReceipt() : null,
            fittingReceipt: () => active ? fittingReceipt() : null,
        },
    };
}
