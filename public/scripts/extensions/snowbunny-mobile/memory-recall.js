import { extension_prompt_roles, extension_prompt_types } from '../../../script.js';

const PROMPT_KEY = 'snowbunny-memory-recall';
const MAX_SELECTED = 5;
const MAX_CANDIDATES = 42;

let initialized = false;
let pendingReceipt = null;
let inFlight = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function memoryStore() {
    return globalThis.SnowBunny?.memories ?? null;
}

function trackerStore() {
    return globalThis.SnowBunny?.trackers ?? null;
}

function normalizeText(value) {
    return String(value || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function cleanChoiceMarkup(value) {
    return String(value || '').replace(/<choicecard\b[^>]*>[\s\S]*?<\/choicecard>/gi, '').trim();
}

function recentConversation(limit = 8, { includeDraft = false } = {}) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    const rows = api.chat
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-limit)
        .map(message => ({
            speaker: message.name || (message.is_user ? api.name1 : api.name2) || (message.is_user ? 'User' : 'Assistant'),
            role: message.is_user ? 'user' : 'assistant',
            text: cleanChoiceMarkup(message.mes),
        }))
        .filter(row => row.text);
    if (includeDraft) {
        const draft = String(document.getElementById('send_textarea')?.value || '').trim();
        if (draft) rows.push({ speaker: api?.name1 || 'User', role: 'user', text: draft });
    }
    return rows;
}

function trackerHint(snapshot) {
    if (!snapshot) return '';
    const blocks = [];
    if (snapshot.timePlace) blocks.push(`Time & Place: ${snapshot.timePlace}`);
    for (const key of ['thoughts', 'relationships', 'scene', 'threads', 'secrets', 'conditions', 'locations', 'gmNotes']) {
        const value = String(snapshot.sections?.[key] || '').trim();
        if (value) blocks.push(`${key}: ${value}`);
    }
    return blocks.join('\n\n').slice(0, 18000);
}

function terms(text) {
    return new Set(normalizeText(text).split(/[^\p{L}\p{N}_]+/u).filter(word => word.length >= 3));
}

function overlapScore(memory, queryTerms, queryText) {
    const title = normalizeText(memory.title);
    const details = normalizeText(memory.details);
    let score = 0;
    if (title && queryText.includes(title)) score += 18;
    for (const word of terms(`${memory.title} ${memory.details}`)) {
        if (queryTerms.has(word)) score += title.includes(word) ? 2.5 : 1;
    }
    return score;
}

function candidates(memories, queryText) {
    if (memories.length <= MAX_CANDIDATES) return memories;
    const queryTerms = terms(queryText);
    const ranked = memories
        .map((memory, index) => ({ memory, index, score: overlapScore(memory, queryTerms, queryText) }))
        .sort((a, b) => b.score - a.score || b.index - a.index);
    const chosen = ranked.slice(0, MAX_CANDIDATES - 8).map(item => item.memory);
    for (const memory of memories.slice(-8)) {
        if (!chosen.some(item => item.id === memory.id)) chosen.push(memory);
    }
    return chosen.slice(0, MAX_CANDIDATES);
}

function stripFence(text) {
    const value = String(text || '').trim();
    const match = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(value);
    return match ? match[1].trim() : value;
}

function parseSelection(text, allowed) {
    let decoded;
    try {
        decoded = JSON.parse(stripFence(text));
    } catch (_) {
        throw new Error('Memory Recall did not return complete JSON.');
    }
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded) || !Array.isArray(decoded.selected) || decoded.selected.length > MAX_SELECTED) {
        throw new Error('Memory Recall returned an invalid selection.');
    }
    const allowedIds = new Set(allowed.map(memory => memory.id));
    const seen = new Set();
    const selected = [];
    for (const item of decoded.selected) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Memory Recall returned an invalid item.');
        const id = String(item.id || '');
        const reason = String(item.reason || '').trim();
        if (!allowedIds.has(id) || seen.has(id) || !reason || reason.length > 1000) throw new Error('Memory Recall referenced an invalid Memory.');
        seen.add(id);
        selected.push({ id, reason });
    }
    return selected;
}

function fallbackSelection(memories, queryText) {
    const queryTerms = terms(queryText);
    return memories
        .map(memory => ({ memory, score: overlapScore(memory, queryTerms, queryText) }))
        .filter(item => item.score >= 5)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => ({ id: item.memory.id, reason: 'Direct overlap with the current conversation.' }));
}

function hash(value) {
    let h = 0x811c9dc5;
    const text = String(value || '');
    for (let index = 0; index < text.length; index++) {
        h ^= text.charCodeAt(index);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}

function sourceKey({ memoryVersion, source, draft, tracker }) {
    return hash(JSON.stringify({
        memoryVersion,
        messages: source?.messages || [],
        draft: String(draft || ''),
        tracker: tracker ? [tracker.id, tracker.revision, tracker.updatedAt] : null,
    }));
}

function cachedRecall(key, memoryVersion) {
    const cache = globalThis.SnowBunny?.state?.readChat?.()?.memoryRecall;
    if (!cache || cache.key !== key || Number(cache.memoryVersion) !== Number(memoryVersion) || !Array.isArray(cache.selected)) return null;
    return cache;
}

function saveRecallCache(cache) {
    globalThis.SnowBunny?.state?.patchChat?.({ memoryRecall: cache });
}

function serializeSelected(memories, selected) {
    const byId = new Map(memories.map(memory => [memory.id, memory]));
    const blocks = [];
    for (const item of selected) {
        const memory = byId.get(item.id);
        if (!memory) continue;
        blocks.push(`<memory id="${String(memory.id).replaceAll('"', '&quot;')}" title="${String(memory.title).replaceAll('"', '&quot;')}">\n${memory.details}\n</memory>`);
    }
    return blocks.length ? `<recalled-memories>\n${blocks.join('\n\n')}\n</recalled-memories>` : '';
}

function setPrompt(prompt) {
    context()?.setExtensionPrompt?.(
        PROMPT_KEY,
        prompt,
        extension_prompt_types.IN_PROMPT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
}

async function computeRecall({ includeDraft = true } = {}) {
    const api = context();
    const store = memoryStore();
    if (!api?.getCurrentChatId?.() || !store) {
        setPrompt('');
        pendingReceipt = null;
        return [];
    }
    const state = await store.read();
    const memories = Array.isArray(state.memories) ? state.memories : [];
    if (!memories.length) {
        setPrompt('');
        pendingReceipt = { selected: [], memoryVersion: state.version, reason: 'No accepted Memories available.' };
        return [];
    }

    const source = store.sourceSnapshot(10);
    const tracker = await trackerStore()?.current?.();
    const rows = recentConversation(8, { includeDraft });
    const draft = includeDraft ? String(document.getElementById('send_textarea')?.value || '') : '';
    const queryText = `${rows.map(row => `${row.speaker}: ${row.text}`).join('\n')}\n${trackerHint(tracker)}`;
    const key = sourceKey({ memoryVersion: state.version, source, draft, tracker });
    const cached = cachedRecall(key, state.version);
    let selected;
    let mode = 'AI relevance review';

    if (cached) {
        selected = cached.selected;
        mode = 'cached relevance review';
    } else {
        const pool = candidates(memories, queryText);
        const systemPrompt = `Select accepted long-term fictional Memories that would genuinely help write the NEXT story reply.

Select nothing when none are useful. A familiar name alone is not enough. A past event matters when the current exchange refers to it, repeats a specific situation, depends on why someone cares, or needs established details for continuity. Do not force nostalgia, repeat reminders, or resurrect resolved conflict as current conflict.

The Current Story State below is a relevance hint only. It cannot create or alter historical facts. Select only existing Memory IDs. Private information remains private to the people who know it.

Return JSON only: {"selected":[{"id":"existing Memory ID","reason":"brief specific connection to this scene"}]}. Choose at most ${MAX_SELECTED}.`;
        const userPrompt = `${tracker ? `Current Story State (relevance hint only):\n${trackerHint(tracker)}\n\n` : ''}Accepted Memories:\n${JSON.stringify(pool.map(memory => ({ id: memory.id, title: memory.title, details: memory.details })))}\n\nRecent conversation and pending user turn:\n${rows.map(row => `${row.speaker}: ${row.text}`).join('\n\n')}`;
        try {
            const result = await api.generateRaw({
                prompt: userPrompt,
                systemPrompt,
                responseLength: 1200,
                trimNames: false,
            });
            if (!store.sourceStillValid(source)) throw new Error('Story history changed during Memory Recall.');
            const latest = await store.read({ fresh: true });
            if (latest.version !== state.version) throw new Error('Accepted Memories changed during Memory Recall.');
            const currentTracker = await trackerStore()?.current?.();
            if ((tracker?.id || '') !== (currentTracker?.id || '') || Number(tracker?.revision || 0) !== Number(currentTracker?.revision || 0)) {
                throw new Error('Current Story State changed during Memory Recall.');
            }
            selected = parseSelection(result, pool);
        } catch (error) {
            console.warn('[SnowBunny] Memory Recall review failed; using conservative direct-match fallback.', error);
            selected = fallbackSelection(pool, queryText);
            mode = 'conservative direct-match fallback';
        }
        saveRecallCache({
            key,
            memoryVersion: state.version,
            selected,
            at: Date.now(),
        });
    }

    const prompt = serializeSelected(memories, selected);
    setPrompt(prompt);
    const byId = new Map(memories.map(memory => [memory.id, memory]));
    pendingReceipt = {
        memoryVersion: state.version,
        selectionMode: mode,
        trackerHint: tracker ? { snapshotId: tracker.id, revision: tracker.revision } : null,
        selected: selected.map(item => ({
            id: item.id,
            title: byId.get(item.id)?.title || item.id,
            reason: item.reason,
        })),
    };
    return selected;
}

function attachReceipt(message) {
    if (!message || message.is_user || message.is_system || !pendingReceipt) return;
    message.extra ||= {};
    message.extra.snowbunny ||= {};
    message.extra.snowbunny.contextReceipt ||= {};
    message.extra.snowbunny.contextReceipt.memories = structuredClone(pendingReceipt);
    const save = context()?.saveChat;
    if (typeof save === 'function') window.setTimeout(() => void save(), 70);
}

async function routeMemoryRecall(options = {}) {
    if (inFlight) return inFlight;
    inFlight = computeRecall(options).finally(() => { inFlight = null; });
    return inFlight;
}

function invalidate() {
    globalThis.SnowBunny?.state?.deleteChatKey?.('memoryRecall');
    pendingReceipt = null;
    setPrompt('');
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;

    if (types.GENERATION_AFTER_COMMANDS) {
        source.on(types.GENERATION_AFTER_COMMANDS, async (_type, _options, dryRun) => {
            if (!dryRun) await routeMemoryRecall({ includeDraft: true });
        });
    }
    if (types.MESSAGE_RECEIVED) {
        source.on(types.MESSAGE_RECEIVED, messageId => {
            const index = Number(messageId);
            const message = Number.isInteger(index) ? api.chat?.[index] : api.chat?.at?.(-1);
            attachReceipt(message);
        });
    }
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED']) {
        const event = types[name];
        if (event) source.on(event, invalidate);
    }
}

export function initMemoryRecall() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    document.addEventListener('snowbunny:memories-changed', invalidate);
    document.addEventListener('snowbunny:tracker-state-changed', () => {
        globalThis.SnowBunny?.state?.deleteChatKey?.('memoryRecall');
    });
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        memoryRecall: {
            route: routeMemoryRecall,
            invalidate,
        },
    };
}
