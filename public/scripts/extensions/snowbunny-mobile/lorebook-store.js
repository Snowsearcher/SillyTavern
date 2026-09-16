const FILE_PREFIX = 'snowbunny-lorebook-';
const SCHEMA_VERSION = 1;

let initialized = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function stateApi() {
    return globalThis.SnowBunny?.state ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function plainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function stringList(value, max = 100) {
    return safeArray(value)
        .slice(0, max)
        .map(item => String(item ?? '').trim())
        .filter(Boolean);
}

function id(prefix) {
    const api = context();
    const uuid = api?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${String(uuid).replaceAll('-', '')}`;
}

function normalizeSection(section, index = 0) {
    if (!plainObject(section)) return null;
    const label = String(section.label ?? section.name ?? '').trim();
    const text = String(section.text ?? section.value ?? '');
    if (!label && !text) return null;
    return {
        id: String(section.id || id('section')),
        label: label || 'Section',
        text,
        order: Number.isFinite(Number(section.order)) ? Number(section.order) : index,
        custom: section.custom === true,
    };
}

function normalizeLink(link) {
    if (!plainObject(link) || link.kind !== 'character') return null;
    const entityId = String(link.entityId || '').trim();
    const avatar = String(link.avatar || '').trim();
    if (!entityId || !avatar) return null;
    return { kind: 'character', entityId, avatar };
}

function normalizeEntry(entry, index = 0) {
    if (!plainObject(entry)) return null;
    const name = String(entry.name ?? '').trim();
    if (!name) return null;
    return {
        id: String(entry.id || id('entry')),
        name,
        type: String(entry.type || 'Other').trim() || 'Other',
        aliases: stringList(entry.aliases),
        tags: stringList(entry.tags),
        enabled: entry.enabled !== false,
        alwaysActive: entry.alwaysActive === true,
        description: String(entry.description ?? ''),
        sections: safeArray(entry.sections).map(normalizeSection).filter(Boolean),
        image: plainObject(entry.image) ? clone(entry.image) : null,
        link: normalizeLink(entry.link),
        createdAt: Number(entry.createdAt) || Date.now(),
        updatedAt: Number(entry.updatedAt) || Date.now(),
        order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index,
    };
}

function normalizeRetrieval(retrieval) {
    retrieval = plainObject(retrieval) ? retrieval : {};
    return {
        mode: retrieval.mode === 'meaning' ? 'meaning' : 'keywords',
        scanDepth: Math.max(0, Number(retrieval.scanDepth) || 7),
        maxMatches: Math.max(1, Number(retrieval.maxMatches) || 3),
        threshold: Math.max(0, Math.min(1, Number(retrieval.threshold) || 0.45)),
        loreBudgetChars: Math.max(500, Number(retrieval.loreBudgetChars) || 12000),
    };
}

export function normalizeLorebook(book = {}) {
    const now = Date.now();
    return {
        schemaVersion: SCHEMA_VERSION,
        id: String(book.id || id('lore')),
        name: String(book.name || 'Untitled Lorebook').trim() || 'Untitled Lorebook',
        description: String(book.description ?? ''),
        tags: stringList(book.tags),
        retrieval: normalizeRetrieval(book.retrieval),
        entries: safeArray(book.entries).map(normalizeEntry).filter(Boolean),
        createdAt: Number(book.createdAt) || now,
        updatedAt: Number(book.updatedAt) || now,
    };
}

function indexRecords() {
    const value = stateApi()?.readGlobal?.()?.lorebookIndex;
    return safeArray(value).filter(item => plainObject(item) && item.id && item.path);
}

function writeIndex(records) {
    stateApi()?.patchGlobal?.({ lorebookIndex: records });
}

function recordFor(book, pathValue) {
    return {
        id: book.id,
        name: book.name,
        description: book.description,
        tags: clone(book.tags),
        retrieval: clone(book.retrieval),
        path: pathValue,
        entryCount: book.entries.length,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
    };
}

function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const chunk = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunk) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
    }
    return btoa(binary);
}

export function listLorebooks() {
    return clone(indexRecords()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || String(a.name).localeCompare(String(b.name)));
}

export async function loadLorebook(bookId) {
    const record = indexRecords().find(item => item.id === bookId);
    if (!record) return null;
    try {
        const response = await fetch(record.path, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const parsed = await response.json();
        const book = normalizeLorebook(parsed);
        book.id = record.id;
        book.createdAt = Number(parsed.createdAt) || record.createdAt || book.createdAt;
        return book;
    } catch (error) {
        console.warn(`[SnowBunny] Could not load Lorebook ${record.name}.`, error);
        return null;
    }
}

export async function saveLorebook(input) {
    const api = context();
    if (!api?.getRequestHeaders) throw new Error('SillyTavern request helpers are unavailable.');
    const existingRecord = input?.id ? indexRecords().find(item => item.id === input.id) : null;
    const book = normalizeLorebook(input);
    book.updatedAt = Date.now();
    if (existingRecord?.createdAt) book.createdAt = existingRecord.createdAt;

    const filename = `${FILE_PREFIX}${book.id}.json`;
    const data = utf8ToBase64(JSON.stringify(book, null, 2));
    const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify({ name: filename, data }),
    });
    if (!response.ok) throw new Error(`Could not save Lorebook (${response.status}).`);
    const result = await response.json();
    const pathValue = String(result.path || existingRecord?.path || '');
    if (!pathValue) throw new Error('SillyTavern did not return a saved Lorebook path.');

    const records = indexRecords().filter(item => item.id !== book.id);
    records.push(recordFor(book, pathValue));
    writeIndex(records);
    document.dispatchEvent(new CustomEvent('snowbunny:lorebooks-changed', { detail: { id: book.id, action: existingRecord ? 'update' : 'create' } }));
    return clone(book);
}

export async function deleteLorebook(bookId) {
    const api = context();
    const record = indexRecords().find(item => item.id === bookId);
    if (!record) return false;
    try {
        await fetch('/api/files/delete', {
            method: 'POST',
            headers: api.getRequestHeaders(),
            body: JSON.stringify({ path: record.path }),
        });
    } catch (error) {
        console.warn('[SnowBunny] Lorebook file deletion failed; removing the broken index reference anyway.', error);
    }
    writeIndex(indexRecords().filter(item => item.id !== bookId));

    const chatState = stateApi()?.readChat?.();
    if (Array.isArray(chatState?.chatLorebookIds) && chatState.chatLorebookIds.includes(bookId)) {
        stateApi()?.patchChat?.({ chatLorebookIds: chatState.chatLorebookIds.filter(idValue => idValue !== bookId) });
    }
    const global = stateApi()?.readGlobal?.() || {};
    const stories = safeArray(global.stories);
    let changed = false;
    for (const story of stories) {
        if (Array.isArray(story.lorebookIds) && story.lorebookIds.includes(bookId)) {
            story.lorebookIds = story.lorebookIds.filter(idValue => idValue !== bookId);
            story.updatedAt = Date.now();
            changed = true;
        }
    }
    if (changed) stateApi()?.patchGlobal?.({ stories });
    document.dispatchEvent(new CustomEvent('snowbunny:lorebooks-changed', { detail: { id: bookId, action: 'delete' } }));
    return true;
}

function currentStory() {
    const storyId = stateApi()?.readChat?.()?.storyId;
    if (!storyId) return null;
    return safeArray(stateApi()?.readGlobal?.()?.stories).find(story => story.id === storyId) || null;
}

export function storyLorebookIds() {
    const valid = new Set(indexRecords().map(item => item.id));
    return stringList(currentStory()?.lorebookIds).filter(idValue => valid.has(idValue));
}

export function chatLorebookIds() {
    const valid = new Set(indexRecords().map(item => item.id));
    return stringList(stateApi()?.readChat?.()?.chatLorebookIds).filter(idValue => valid.has(idValue));
}

export function effectiveLorebookIds() {
    return [...new Set([...storyLorebookIds(), ...chatLorebookIds()])];
}

export function setChatLorebookIds(ids) {
    const storySet = new Set(storyLorebookIds());
    const valid = new Set(indexRecords().map(item => item.id));
    const extras = stringList(ids).filter(idValue => valid.has(idValue) && !storySet.has(idValue));
    stateApi()?.patchChat?.({ chatLorebookIds: [...new Set(extras)] });
    document.dispatchEvent(new CustomEvent('snowbunny:lorebook-bindings-changed'));
    return extras;
}

export function setStoryLorebookIds(storyId, ids) {
    const valid = new Set(indexRecords().map(item => item.id));
    const stories = safeArray(stateApi()?.readGlobal?.()?.stories);
    const story = stories.find(item => item.id === storyId);
    if (!story) return false;
    story.lorebookIds = [...new Set(stringList(ids).filter(idValue => valid.has(idValue)))];
    story.updatedAt = Date.now();
    stateApi()?.patchGlobal?.({ stories });
    document.dispatchEvent(new CustomEvent('snowbunny:lorebook-bindings-changed', { detail: { storyId } }));
    return true;
}

export function createEmptyEntry(type = 'Other') {
    return normalizeEntry({ name: 'Untitled Entry', type, enabled: true, alwaysActive: false, description: '', sections: [] });
}

export function initLorebookStore() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        lorebooks: {
            list: listLorebooks,
            load: loadLorebook,
            save: saveLorebook,
            delete: deleteLorebook,
            normalize: normalizeLorebook,
            createEmptyEntry,
            storyIds: storyLorebookIds,
            chatIds: chatLorebookIds,
            effectiveIds: effectiveLorebookIds,
            setChatIds: setChatLorebookIds,
            setStoryIds: setStoryLorebookIds,
        },
    };
}
