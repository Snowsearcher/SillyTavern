import { extension_prompt_roles, extension_prompt_types } from '../../../script.js';

const PROMPT_KEY = 'snowbunny-lore';
const DEFAULT_RECENT_MESSAGES = 7;

let initialized = false;
let loadedBooks = new Map();
let preloadPromise = null;
let lastRoutingReceipt = null;
let receiptSaveTimer = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function semantic() {
    return globalThis.SnowBunny?.loreSemantic ?? null;
}

function characterAuthoring() {
    return globalThis.SnowBunny?.characterAuthoring ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
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

function queryText(book, { includeDraft = false } = {}) {
    const depth = Math.max(1, Number(book?.retrieval?.scanDepth) || DEFAULT_RECENT_MESSAGES);
    const parts = visibleRecentMessages(depth);
    if (includeDraft) {
        const draft = String(document.getElementById('send_textarea')?.value || '').trim();
        if (draft) parts.push(`${context()?.name1 || 'User'}: ${draft}`);
    }
    return normalizeText(parts.join('\n'));
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

function keywordScore(entry, query) {
    let score = 0;
    const name = normalizeText(entry.name);
    const signals = [entry.name, ...(entry.aliases || [])].map(normalizeText).filter(Boolean);
    for (const signal of signals) {
        if (wordMatch(query, signal)) score += signal === name ? 12 : 8;
    }
    for (const tag of entry.tags || []) {
        if (wordMatch(query, tag)) score += 2;
    }
    return score;
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

function linkedEntityId(entry) {
    return entry?.link?.kind === 'character' ? String(entry.link.entityId || '') : '';
}

function isActiveLinkedCharacter(entry, activeEntityIds) {
    const entityId = linkedEntityId(entry);
    return Boolean(entityId && activeEntityIds?.has(entityId));
}

async function materializeBook(book) {
    const adapter = characterAuthoring();
    if (!adapter?.materializeLinkedEntry) return clone(book);
    const entries = [];
    for (const entry of book.entries || []) entries.push(await adapter.materializeLinkedEntry(entry));
    return { ...clone(book), entries };
}

function alwaysActive(book, activeEntityIds) {
    return (book.entries || [])
        .filter(entry => entry.enabled !== false && entry.alwaysActive && !isActiveLinkedCharacter(entry, activeEntityIds))
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(entry => ({ entry, reason: 'always active', semanticRank: null, exactRank: null }));
}

function keywordMatches(book, query, limitOverride = null) {
    const matches = [];
    for (const entry of book.entries || []) {
        if (entry.enabled === false || entry.alwaysActive) continue;
        const score = keywordScore(entry, query);
        if (score > 0) matches.push({ entry, score, reason: 'keyword / alias match', semanticRank: null, exactRank: null });
    }
    matches.sort((a, b) => b.score - a.score || (a.entry.order || 0) - (b.entry.order || 0));
    const limit = Math.max(1, Number(limitOverride) || Number(book.retrieval?.maxMatches) || 3);
    return matches.slice(0, limit);
}

function exactRescueFallback(book, query, limitOverride = null) {
    return keywordMatches(book, query, limitOverride).map(match => ({
        ...match,
        reason: 'exact identity rescue · semantic index unavailable',
        vectorFallback: true,
    }));
}

async function meaningMatches(book, query) {
    const semanticApi = semantic();
    if (!semanticApi?.queryBook) {
        return {
            matches: exactRescueFallback(book, query),
            vectorReady: false,
            error: 'Semantic index adapter is unavailable.',
            source: '',
            model: '',
        };
    }
    const result = await semanticApi.queryBook(book, query);
    if (!result.vectorReady) {
        return { ...result, matches: exactRescueFallback(book, query) };
    }
    return result;
}

async function selectForBook(book, options, activeEntityIds) {
    const query = queryText(book, options);
    const baseLimit = Math.max(1, Number(book.retrieval?.maxMatches) || 3);
    const suppressed = (book.entries || []).filter(entry => isActiveLinkedCharacter(entry, activeEntityIds));
    const expandedLimit = baseLimit + suppressed.length;
    const always = alwaysActive(book, activeEntityIds);

    let result;
    if (book.retrieval?.mode !== 'meaning') {
        result = {
            matches: keywordMatches(book, query, expandedLimit),
            vectorReady: null,
            vectorError: '',
            source: '',
            model: '',
        };
    } else {
        const expandedBook = {
            ...book,
            retrieval: { ...(book.retrieval || {}), maxMatches: expandedLimit },
        };
        const semanticResult = await meaningMatches(expandedBook, query);
        result = {
            matches: semanticResult.matches || [],
            vectorReady: semanticResult.vectorReady === true,
            vectorError: semanticResult.error || '',
            source: semanticResult.source || '',
            model: semanticResult.model || '',
        };
    }

    const normal = result.matches
        .filter(match => !isActiveLinkedCharacter(match.entry, activeEntityIds))
        .slice(0, baseLimit);
    return {
        ...result,
        matches: [...always, ...normal],
        deduplicated: suppressed.map(entry => ({
            entryId: entry.id,
            entry: entry.name,
            entityId: linkedEntityId(entry),
            avatar: entry.link?.avatar || '',
            reason: 'active Character member already supplies this linked authored entity',
        })),
    };
}

function fitBookMatches(book, matches) {
    const budget = Math.max(500, Number(book.retrieval?.loreBudgetChars) || 12000);
    const selected = [];
    let used = 0;
    for (const match of matches) {
        const serialized = serializeEntry(match.entry, book);
        if (used + serialized.length > budget && used > 0) continue;
        selected.push({ ...match, serialized });
        used += serialized.length;
    }
    return { selected, used, budget };
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
    })().finally(() => {
        preloadPromise = null;
    });
    return preloadPromise;
}

async function routeLore({ includeDraft = false } = {}) {
    await preloadEffectiveBooks();
    const api = context();
    const ids = lorebooks()?.effectiveIds?.() ?? [];
    const activeEntityIds = await characterAuthoring()?.activeEntityIds?.() ?? new Set();
    const promptEntries = [];
    const receiptEntries = [];
    const deduplicated = [];
    const vectorBooks = [];
    let totalCharacters = 0;

    for (const id of ids) {
        const rawBook = loadedBooks.get(id);
        if (!rawBook) continue;
        const book = await materializeBook(rawBook);
        const selection = await selectForBook(book, { includeDraft }, activeEntityIds);
        deduplicated.push(...selection.deduplicated.map(item => ({ lorebook: book.name, lorebookId: book.id, ...item })));
        const fitted = fitBookMatches(book, selection.matches);
        totalCharacters += fitted.used;
        promptEntries.push(...fitted.selected.map(item => item.serialized));
        for (const item of fitted.selected) {
            receiptEntries.push({
                lorebook: book.name,
                lorebookId: book.id,
                entry: item.entry.name,
                entryId: item.entry.id,
                type: item.entry.type,
                entityId: linkedEntityId(item.entry) || null,
                reason: item.reason,
                mode: book.retrieval?.mode || 'keywords',
                semanticRank: item.semanticRank ?? null,
                exactRank: item.exactRank ?? null,
            });
        }
        if (book.retrieval?.mode === 'meaning') {
            vectorBooks.push({
                lorebook: book.name,
                lorebookId: book.id,
                ready: selection.vectorReady === true,
                source: selection.source || '',
                model: selection.model || '',
                error: selection.vectorError || '',
            });
        }
    }

    const prompt = promptEntries.length
        ? `<snowbunny_lore>\n${promptEntries.join('\n\n')}\n</snowbunny_lore>`
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
        entries: receiptEntries,
        deduplicatedLinkedCharacters: deduplicated,
        characters: totalCharacters,
        effectiveLorebooks: ids,
        semantic: vectorBooks,
        semanticVectorIndexReady: vectorBooks.length ? vectorBooks.every(item => item.ready) : null,
    };
    return lastRoutingReceipt;
}

function invalidateBook(bookId = '') {
    if (bookId) loadedBooks.delete(bookId);
    else loadedBooks.clear();
    void preloadEffectiveBooks().then(() => routeLore({ includeDraft: false }));
}

function queueReceiptSave() {
    clearTimeout(receiptSaveTimer);
    receiptSaveTimer = setTimeout(() => {
        const save = context()?.saveChat;
        if (typeof save !== 'function') return;
        void save().catch(error => console.warn('[SnowBunny] Could not persist View Context Lore receipt.', error));
    }, 120);
}

function attachReceiptToMessage(message) {
    if (!message || message.is_user || message.is_system || !lastRoutingReceipt) return;
    message.extra ||= {};
    message.extra.snowbunny ||= {};
    message.extra.snowbunny.contextReceipt ||= {};
    message.extra.snowbunny.contextReceipt.lore = structuredClone(lastRoutingReceipt);
    queueReceiptSave();
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;

    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, async () => {
            loadedBooks.clear();
            await preloadEffectiveBooks();
            await routeLore({ includeDraft: false });
        });
    }

    if (types.GENERATION_AFTER_COMMANDS) {
        source.on(types.GENERATION_AFTER_COMMANDS, async (_type, _options, dryRun) => {
            await routeLore({ includeDraft: !dryRun });
        });
    }

    for (const name of ['MESSAGE_EDITED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED']) {
        const event = types[name];
        if (event) source.on(event, () => void routeLore({ includeDraft: false }));
    }

    if (types.MESSAGE_RECEIVED) {
        source.on(types.MESSAGE_RECEIVED, async messageId => {
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
    document.addEventListener('snowbunny:character-authoring-changed', () => void routeLore({ includeDraft: false }));
    document.addEventListener('snowbunny:linked-character-content-changed', () => void routeLore({ includeDraft: false }));
    registerEvents();
    void preloadEffectiveBooks().then(() => routeLore({ includeDraft: false }));
}
