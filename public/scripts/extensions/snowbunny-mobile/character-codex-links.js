let initialized = false;
let syncTimer = null;

function authoring() {
    return globalThis.SnowBunny?.characterAuthoring ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

async function allBooks() {
    const store = lorebooks();
    if (!store) return [];
    const values = [];
    for (const record of store.list?.() || []) {
        const book = await store.load?.(record.id);
        if (book) values.push(book);
    }
    return values;
}

function linkedEntry(book, entityId) {
    return (book?.entries || []).find(entry =>
        entry?.link?.kind === 'character' && String(entry.link.entityId || '') === String(entityId || ''),
    ) || null;
}

async function linkedBookIds(avatar) {
    const record = await authoring()?.read?.(avatar);
    if (!record?.entityId) return [];
    const ids = [];
    for (const book of await allBooks()) {
        if (linkedEntry(book, record.entityId)) ids.push(book.id);
    }
    return ids;
}

async function linkToBook(avatar, bookId) {
    const store = lorebooks();
    const record = await authoring()?.ensureIdentity?.(avatar);
    if (!store || !record?.entityId) throw new Error('Character identity is unavailable.');
    const book = await store.load?.(bookId);
    if (!book) throw new Error('Lorebook could not be loaded.');
    const existing = linkedEntry(book, record.entityId);
    if (existing) return clone(existing);

    const entry = store.createEmptyEntry?.('Character');
    if (!entry) throw new Error('Could not create linked Codex entry.');
    entry.name = record.name;
    entry.type = 'Character';
    entry.aliases = clone(record.metadata?.aliases || []);
    entry.tags = clone(record.metadata?.tags || []);
    entry.description = '';
    entry.sections = [];
    entry.link = {
        kind: 'character',
        entityId: record.entityId,
        avatar: record.avatar,
    };
    entry.updatedAt = Date.now();
    book.entries.push(entry);
    await store.save?.(book);
    document.dispatchEvent(new CustomEvent('snowbunny:character-codex-links-changed', {
        detail: { avatar, entityId: record.entityId, bookId, action: 'link' },
    }));
    return clone(entry);
}

async function unlinkFromBook(avatar, bookId) {
    const store = lorebooks();
    const record = await authoring()?.read?.(avatar);
    if (!store || !record?.entityId) return false;
    const book = await store.load?.(bookId);
    if (!book) return false;
    const before = book.entries.length;
    book.entries = book.entries.filter(entry => !(
        entry?.link?.kind === 'character' && String(entry.link.entityId || '') === record.entityId
    ));
    if (book.entries.length === before) return false;
    await store.save?.(book);
    document.dispatchEvent(new CustomEvent('snowbunny:character-codex-links-changed', {
        detail: { avatar, entityId: record.entityId, bookId, action: 'unlink' },
    }));
    return true;
}

async function setLinkedBooks(avatar, bookIds) {
    const wanted = new Set((bookIds || []).map(String));
    const current = new Set(await linkedBookIds(avatar));
    for (const bookId of current) {
        if (!wanted.has(String(bookId))) await unlinkFromBook(avatar, bookId);
    }
    for (const bookId of wanted) {
        if (!current.has(String(bookId))) await linkToBook(avatar, bookId);
    }
    return linkedBookIds(avatar);
}

async function syncLinkedMetadata(avatar) {
    const store = lorebooks();
    const record = await authoring()?.read?.(avatar, { fresh: true });
    if (!store || !record?.entityId) return;
    for (const book of await allBooks()) {
        const entry = linkedEntry(book, record.entityId);
        if (!entry) continue;
        const aliases = record.metadata?.aliases || [];
        const tags = record.metadata?.tags || [];
        const changed = entry.name !== record.name
            || JSON.stringify(entry.aliases || []) !== JSON.stringify(aliases)
            || JSON.stringify(entry.tags || []) !== JSON.stringify(tags)
            || entry.link?.avatar !== record.avatar;
        if (changed) {
            entry.name = record.name;
            entry.aliases = clone(aliases);
            entry.tags = clone(tags);
            entry.link = { kind: 'character', entityId: record.entityId, avatar: record.avatar };
            entry.updatedAt = Date.now();
            await store.save?.(book);
        }
        // The linked entry stores identity, not a prose copy. Character text can
        // therefore change without mutating the Lorebook JSON; explicitly wake
        // the semantic index so its materialized shared document is refreshed.
        document.dispatchEvent(new CustomEvent('snowbunny:linked-character-content-changed', {
            detail: { avatar, entityId: record.entityId, bookId: book.id },
        }));
    }
}

function scheduleSync(event) {
    clearTimeout(syncTimer);
    const avatar = String(event?.detail?.avatar || '');
    if (!avatar) return;
    syncTimer = window.setTimeout(() => void syncLinkedMetadata(avatar), 180);
}

export function initCharacterCodexLinks() {
    if (initialized) return;
    initialized = true;
    document.addEventListener('snowbunny:character-authoring-changed', scheduleSync);
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        characterCodexLinks: {
            linkedBookIds,
            link: linkToBook,
            unlink: unlinkFromBook,
            setLinkedBooks,
            sync: syncLinkedMetadata,
        },
    };
}
