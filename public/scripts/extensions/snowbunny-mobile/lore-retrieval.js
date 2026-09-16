import { extension_prompt_roles, extension_prompt_types } from '../../../script.js';

const PROMPT_KEY = 'snowbunny-lore';
const DEFAULT_RECENT_MESSAGES = 7;

let initialized = false;
let loadedBooks = new Map();
let preloadPromise = null;
let lastRoutingReceipt = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value) {
    return String(value || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function visibleRecentMessages(limit = DEFAULT_RECENT_MESSAGES) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    return api.chat
        .filter(message => {
            if (!message || message.is_system) return false;
            if (ignore && message.extra?.[ignore]) return false;
            return true;
        })
        .slice(-limit)
        .map(message => `${message.name || (message.is_user ? api.name1 : api.name2) || ''}: ${message.mes || ''}`);
}

function queryText(book) {
    const depth = Math.max(1, Number(book?.retrieval?.scanDepth) || DEFAULT_RECENT_MESSAGES);
    return normalizeText(visibleRecentMessages(depth).join('\n'));
}

function wordMatch(query, needle) {
    needle = normalizeText(needle);
    if (!needle) return false;
    if (needle.includes(' ')) return query.includes(needle);
    try {
        return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(needle)}(?:$|[^\\p{L}\\p{N}_])`, 'iu').test(query);
    } catch (_) {
        return query.includes(needle);
    }
}

function exactSignals(entry) {
    return [entry.name, ...(entry.aliases || [])].map(normalizeText).filter(Boolean);
}

function keywordScore(entry, query) {
    let score = 0;
    for (const signal of exactSignals(entry)) {
        if (wordMatch(query, signal)) score += signal === normalizeText(entry.name) ? 12 : 8;
    }
    for (const tag of entry.tags || []) {
        if (wordMatch(query, tag)) score += 2;
    }
    return score;
}

function meaningFallbackScore(entry, query) {
    // Exact name/alias rescue remains active even before the dedicated semantic
    // embedding index is ported. Do not pretend this is vector similarity.
    const exact = keywordScore(entry, query);
    if (exact > 0) return exact;

    const prose = normalizeText(`${entry.description || ''} ${(entry.sections || []).map(section => section.text || '').join(' ')}`);
    if (!prose || !query) return 0;
    const queryWords = new Set(query.split(/[^\p{L}\p{N}_]+/u).filter(word => word.length >= 4));
    if (!queryWords.size) return 0;
    const proseWords = new Set(prose.split(/[^\p{L}\p{N}_]+/u).filter(word => word.length >= 4));
    let overlap = 0;
    for (const word of queryWords) if (proseWords.has(word)) overlap++;
    return overlap / Math.sqrt(Math.max(1, queryWords.size));
}

function entryBody(entry) {
    const parts = [];
    if (entry.description?.trim()) parts.push(entry.description.trim());
    for (const section of [...(entry.sections || [])].sort((a, b) => (a.order || 0) - (b.order || 0))) {
        const label = String(section.label || '').trim();
        const text = String(section.text || '').trim();
        if (!label && !text) continue;
        parts.push(label ? `${label}: ${text}` : text);
    }
    return parts.join('\n');
}

function wrapperName(type) {
    const key = normalizeText(type).replace(/[^a-z0-9]+/g, '_');
    if (key === 'object_item') return 'object';
    return ['character', 'location', 'lore', 'concept', 'faction', 'event', 'object'].includes(key) ? key : 'entry';
}

function escapeAttr(value) {
    return String(value || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function serializeEntry(entry, book) {
    const tag = wrapperName(entry.type);
    const body = entryBody(entry);
    const aliases = (entry.aliases || []).length ? ` aliases="${escapeAttr(entry.aliases.join(', '))}"` : '';
    return `<${tag} name="${escapeAttr(entry.name)}" lorebook="${escapeAttr(book.name)}"${aliases}>\n${body}\n</${tag}>`;
}

function pickEntries(book) {
    const query = queryText(book);
    const candidates = [];
    for (const entry of book.entries || []) {
        if (entry.enabled === false) continue;
        if (entry.alwaysActive) {
            candidates.push({ entry, score: Number.POSITIVE_INFINITY, reason: 'always active' });
            continue;
        }
        const mode = book.retrieval?.mode === 'meaning' ? 'meaning' : 'keywords';
        const score = mode === 'meaning' ? meaningFallbackScore(entry, query) : keywordScore(entry, query);
        const threshold = mode === 'meaning' ? 0.35 : 0;
        if (score > threshold) {
            candidates.push({
                entry,
                score,
                reason: mode === 'meaning' ? (score >= 8 ? 'exact identity rescue' : 'semantic fallback overlap') : 'keyword / alias match',
            });
        }
    }

    candidates.sort((a, b) => {
        if (a.score === b.score) return (a.entry.order || 0) - (b.entry.order || 0);
        return b.score - a.score;
    });
    const limit = Math.max(1, Number(book.retrieval?.maxMatches) || 3);
    const always = candidates.filter(item => !Number.isFinite(item.score));
    const matched = candidates.filter(item => Number.isFinite(item.score)).slice(0, limit);
    return [...always, ...matched];
}

function routeFromCache() {
    const api = context();
    const ids = lorebooks()?.effectiveIds?.() ?? [];
    const selected = [];
    const receipt = [];
    let budget = 0;
    for (const id of ids) {
        const book = loadedBooks.get(id);
        if (!book) continue;
        const perBookBudget = Math.max(500, Number(book.retrieval?.loreBudgetChars) || 12000);
        let used = 0;
        for (const match of pickEntries(book)) {
            const serialized = serializeEntry(match.entry, book);
            if (used + serialized.length > perBookBudget && used > 0) continue;
            selected.push(serialized);
            used += serialized.length;
            budget += serialized.length;
            receipt.push({
                lorebook: book.name,
                lorebookId: book.id,
                entry: match.entry.name,
                entryId: match.entry.id,
                type: match.entry.type,
                reason: match.reason,
                mode: book.retrieval?.mode || 'keywords',
            });
        }
    }

    const prompt = selected.length
        ? `<snowbunny_lore>\n${selected.join('\n\n')}\n</snowbunny_lore>`
        : '';
    api?.setExtensionPrompt?.(
        PROMPT_KEY,
        prompt,
        extension_prompt_types.IN_PROMPT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
    lastRoutingReceipt = {
        entries: receipt,
        characters: budget,
        effectiveLorebooks: ids,
        semanticVectorIndexReady: false,
    };
}

async function preloadEffectiveBooks() {
    if (preloadPromise) return preloadPromise;
    preloadPromise = (async () => {
        const ids = lorebooks()?.effectiveIds?.() ?? [];
        const next = new Map();
        for (const id of ids) {
            const existing = loadedBooks.get(id);
            if (existing) {
                next.set(id, existing);
                continue;
            }
            const book = await lorebooks()?.load?.(id);
            if (book) next.set(id, book);
        }
        loadedBooks = next;
        routeFromCache();
    })().finally(() => {
        preloadPromise = null;
    });
    return preloadPromise;
}

function invalidateBook(bookId = '') {
    if (bookId) loadedBooks.delete(bookId);
    else loadedBooks.clear();
    void preloadEffectiveBooks();
}

function attachReceiptToMessage(message) {
    if (!message || message.is_user || message.is_system || !lastRoutingReceipt) return;
    message.extra ||= {};
    message.extra.snowbunny ||= {};
    message.extra.snowbunny.contextReceipt ||= {};
    message.extra.snowbunny.contextReceipt.lore = structuredClone(lastRoutingReceipt);
    context()?.saveChatDebounced?.();
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;

    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => {
            loadedBooks.clear();
            void preloadEffectiveBooks();
        });
    }

    for (const name of ['MESSAGE_SENT', 'MESSAGE_EDITED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'GENERATION_STARTED']) {
        const event = types[name];
        if (event) source.on(event, routeFromCache);
    }

    if (types.MESSAGE_RECEIVED) {
        source.on(types.MESSAGE_RECEIVED, messageId => {
            const index = Number(messageId);
            const message = Number.isInteger(index) ? api.chat?.[index] : api.chat?.at?.(-1);
            attachReceiptToMessage(message);
        });
    }
}

export function initLoreRetrieval() {
    if (initialized) return;
    initialized = true;
    document.addEventListener('snowbunny:lorebooks-changed', event => invalidateBook(event.detail?.id || ''));
    document.addEventListener('snowbunny:lorebook-bindings-changed', () => invalidateBook(''));
    registerEvents();
    void preloadEffectiveBooks();
}
