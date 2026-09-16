const COLLECTION_VERSION = 1;
const DEFAULT_SOURCE = 'transformers';
const DEFAULT_PASSAGE_CHARS = 1400;
const DEFAULT_PASSAGE_OVERLAP = 220;
const RRF_K = 60;

let initialized = false;
let syncPromises = new Map();
let availability = { available: true, lastError: '' };

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function snowState() {
    return globalThis.SnowBunny?.state ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function semanticConfig() {
    const configured = snowState()?.readGlobal?.()?.loreSemantic;
    const source = typeof configured?.source === 'string' && configured.source ? configured.source : DEFAULT_SOURCE;
    return {
        source,
        model: typeof configured?.model === 'string' ? configured.model : '',
        apiUrl: typeof configured?.apiUrl === 'string' ? configured.apiUrl : '',
        extrasUrl: typeof configured?.extrasUrl === 'string' ? configured.extrasUrl : '',
        extrasKey: typeof configured?.extrasKey === 'string' ? configured.extrasKey : '',
        siliconflow_endpoint: configured?.siliconflow_endpoint === 'cn' ? 'cn' : 'global',
        workers_ai_account_id: typeof configured?.workers_ai_account_id === 'string' ? configured.workers_ai_account_id : '',
        keep: configured?.keep === true,
    };
}

function requestBody(extra = {}) {
    const config = semanticConfig();
    return {
        source: config.source,
        ...(config.model ? { model: config.model } : {}),
        ...(config.apiUrl ? { apiUrl: config.apiUrl } : {}),
        ...(config.extrasUrl ? { extrasUrl: config.extrasUrl } : {}),
        ...(config.extrasKey ? { extrasKey: config.extrasKey } : {}),
        ...(config.siliconflow_endpoint ? { siliconflow_endpoint: config.siliconflow_endpoint } : {}),
        ...(config.workers_ai_account_id ? { workers_ai_account_id: config.workers_ai_account_id } : {}),
        keep: config.keep,
        ...extra,
    };
}

function collectionId(bookId) {
    return `snowbunny-lore-${bookId}-v${COLLECTION_VERSION}`;
}

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function entryBody(entry) {
    const blocks = [];
    if (entry.description?.trim()) blocks.push(entry.description.trim());
    for (const section of [...(entry.sections || [])].sort((a, b) => (a.order || 0) - (b.order || 0))) {
        const label = String(section.label || '').trim();
        const text = String(section.text || '').trim();
        if (!label && !text) continue;
        blocks.push(label ? `${label}: ${text}` : text);
    }
    return blocks.join('\n\n');
}

function passagePrefix(entry, book) {
    const parts = [
        `Lorebook: ${book.name}`,
        `Entry: ${entry.name}`,
        `Type: ${entry.type || 'Other'}`,
    ];
    if (entry.aliases?.length) parts.push(`Aliases: ${entry.aliases.join(', ')}`);
    if (entry.tags?.length) parts.push(`Tags: ${entry.tags.join(', ')}`);
    return parts.join('\n');
}

function splitPassages(text, maxChars = DEFAULT_PASSAGE_CHARS, overlap = DEFAULT_PASSAGE_OVERLAP) {
    const source = String(text || '').trim();
    if (!source) return [''];
    if (source.length <= maxChars) return [source];

    const passages = [];
    let start = 0;
    while (start < source.length) {
        let end = Math.min(source.length, start + maxChars);
        if (end < source.length) {
            const floor = start + Math.floor(maxChars * 0.58);
            const candidates = [
                source.lastIndexOf('\n\n', end),
                source.lastIndexOf('. ', end),
                source.lastIndexOf('! ', end),
                source.lastIndexOf('? ', end),
                source.lastIndexOf('\n', end),
                source.lastIndexOf(' ', end),
            ].filter(index => index >= floor);
            if (candidates.length) end = Math.max(...candidates) + 1;
        }
        passages.push(source.slice(start, end).trim());
        if (end >= source.length) break;
        start = Math.max(start + 1, end - Math.min(overlap, Math.floor((end - start) / 3)));
    }
    return passages.filter(Boolean);
}

function stableHash(text) {
    // FNV-1a 32-bit. ST's vector endpoint stores hashes as numbers.
    let hash = 0x811c9dc5;
    const value = String(text || '');
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

export function passagesForBook(book) {
    const passages = [];
    for (const entry of [...(book?.entries || [])].sort((a, b) => (a.order || 0) - (b.order || 0))) {
        if (entry.enabled === false) continue;
        const prefix = passagePrefix(entry, book);
        const chunks = splitPassages(entryBody(entry));
        chunks.forEach((chunk, passageIndex) => {
            const text = normalizeText(`${prefix}\n${chunk}`);
            const signature = `${book.id}|${entry.id}|${passageIndex}|${text}`;
            passages.push({
                entryId: entry.id,
                entryName: entry.name,
                passageIndex,
                hash: stableHash(signature),
                text,
                index: passages.length,
            });
        });
    }
    return passages;
}

async function postVector(path, body) {
    const api = context();
    const response = await fetch(`/api/vector/${path}`, {
        method: 'POST',
        headers: api?.getRequestHeaders?.() || { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Vector ${path} failed (${response.status}).`);
    availability = { available: true, lastError: '' };
    if (response.status === 204 || response.headers.get('content-length') === '0') return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

async function doSyncBook(book) {
    if (!book?.id) return { indexed: 0, inserted: 0, deleted: 0 };
    const collection = collectionId(book.id);
    const passages = passagesForBook(book);
    const desiredHashes = new Set(passages.map(item => Number(item.hash)));
    const saved = await postVector('list', requestBody({ collectionId: collection })) ?? [];
    const savedHashes = new Set(saved.map(Number));
    const stale = [...savedHashes].filter(hash => !desiredHashes.has(hash));
    const missing = passages.filter(item => !savedHashes.has(Number(item.hash)));

    if (stale.length) {
        await postVector('delete', requestBody({ collectionId: collection, hashes: stale }));
    }
    if (missing.length) {
        await postVector('insert', requestBody({
            collectionId: collection,
            items: missing.map(item => ({ hash: item.hash, text: item.text, index: item.index })),
        }));
    }
    return { indexed: passages.length, inserted: missing.length, deleted: stale.length };
}

export async function syncBook(book) {
    if (!book?.id) return { indexed: 0, inserted: 0, deleted: 0 };
    if (syncPromises.has(book.id)) return syncPromises.get(book.id);
    const promise = doSyncBook(book)
        .catch(error => {
            availability = { available: false, lastError: String(error?.message || error) };
            console.warn(`[SnowBunny] Could not sync semantic Lore index for ${book.name}.`, error);
            return { indexed: 0, inserted: 0, deleted: 0, error: availability.lastError };
        })
        .finally(() => syncPromises.delete(book.id));
    syncPromises.set(book.id, promise);
    return promise;
}

export async function purgeBook(bookId) {
    if (!bookId) return;
    try {
        await postVector('purge', { collectionId: collectionId(bookId) });
    } catch (error) {
        console.warn('[SnowBunny] Could not purge semantic Lore index.', error);
    }
}

function collapseSemanticRanks(book, metadata, passages) {
    const byIndex = new Map(passages.map(item => [Number(item.index), item]));
    const ranks = new Map();
    metadata.forEach((item, resultIndex) => {
        const passage = byIndex.get(Number(item?.index));
        if (!passage) return;
        const current = ranks.get(passage.entryId);
        const rank = resultIndex + 1;
        if (!current || rank < current.rank) {
            ranks.set(passage.entryId, {
                entryId: passage.entryId,
                entryName: passage.entryName,
                rank,
                passage: String(item?.text || passage.text),
            });
        }
    });
    return ranks;
}

function exactRanks(book, query) {
    const normalized = String(query || '').toLocaleLowerCase();
    const results = [];
    for (const entry of book?.entries || []) {
        if (entry.enabled === false || entry.alwaysActive) continue;
        let score = 0;
        const signals = [entry.name, ...(entry.aliases || [])].map(item => String(item || '').trim()).filter(Boolean);
        signals.forEach((signal, index) => {
            const needle = signal.toLocaleLowerCase();
            if (!needle) return;
            if (normalized.includes(needle)) score += index === 0 ? 12 : 8;
        });
        for (const tag of entry.tags || []) {
            const needle = String(tag || '').trim().toLocaleLowerCase();
            if (needle && normalized.includes(needle)) score += 2;
        }
        if (score > 0) results.push({ entryId: entry.id, score });
    }
    results.sort((a, b) => b.score - a.score);
    return new Map(results.map((item, index) => [item.entryId, { rank: index + 1, rawScore: item.score }]));
}

function rrfScore(rank) {
    return rank ? 1 / (RRF_K + rank) : 0;
}

export async function queryBook(book, searchText) {
    if (!book?.id || !String(searchText || '').trim()) return { matches: [], vectorReady: false, error: '' };
    const passages = passagesForBook(book);
    if (!passages.length) return { matches: [], vectorReady: true, error: '' };

    const syncResult = await syncBook(book);
    if (syncResult?.error) {
        return { matches: [], vectorReady: false, error: syncResult.error };
    }

    try {
        const topK = Math.max(8, (Number(book.retrieval?.maxMatches) || 3) * 6);
        const threshold = Math.max(0, Math.min(1, Number(book.retrieval?.threshold) || 0.45));
        const result = await postVector('query', requestBody({
            collectionId: collectionId(book.id),
            searchText: String(searchText),
            topK,
            threshold,
        })) || { metadata: [] };

        const semantic = collapseSemanticRanks(book, Array.isArray(result.metadata) ? result.metadata : [], passages);
        const exact = exactRanks(book, searchText);
        const entries = new Map((book.entries || []).map(entry => [entry.id, entry]));
        const candidateIds = new Set([...semantic.keys(), ...exact.keys()]);
        const fused = [];
        for (const entryId of candidateIds) {
            const entry = entries.get(entryId);
            if (!entry || entry.enabled === false || entry.alwaysActive) continue;
            const semanticHit = semantic.get(entryId);
            const exactHit = exact.get(entryId);
            const score = rrfScore(semanticHit?.rank) + rrfScore(exactHit?.rank);
            fused.push({
                entry,
                score,
                semanticRank: semanticHit?.rank || null,
                exactRank: exactHit?.rank || null,
                reason: exactHit && semanticHit
                    ? 'exact + semantic fusion'
                    : exactHit
                        ? 'exact identity rescue'
                        : 'semantic match',
                passage: semanticHit?.passage || '',
            });
        }
        fused.sort((a, b) => b.score - a.score || (a.entry.order || 0) - (b.entry.order || 0));
        const limit = Math.max(1, Number(book.retrieval?.maxMatches) || 3);
        return {
            matches: fused.slice(0, limit),
            vectorReady: true,
            error: '',
            source: semanticConfig().source,
            model: semanticConfig().model,
            collectionId: collectionId(book.id),
        };
    } catch (error) {
        availability = { available: false, lastError: String(error?.message || error) };
        console.warn(`[SnowBunny] Semantic Lore query failed for ${book.name}.`, error);
        return {
            matches: [],
            vectorReady: false,
            error: availability.lastError,
            source: semanticConfig().source,
            model: semanticConfig().model,
            collectionId: collectionId(book.id),
        };
    }
}

async function syncChangedBook(event) {
    const bookId = event?.detail?.id;
    if (!bookId) return;
    if (event.detail?.action === 'delete') {
        await purgeBook(bookId);
        return;
    }
    const book = await lorebooks()?.load?.(bookId);
    if (!book) return;
    if (book.retrieval?.mode === 'meaning') await syncBook(book);
}

export function semanticStatus() {
    return {
        ...availability,
        ...semanticConfig(),
    };
}

export function initLoreSemanticIndex() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        loreSemantic: {
            syncBook,
            purgeBook,
            queryBook,
            passagesForBook,
            status: semanticStatus,
        },
    };
    document.addEventListener('snowbunny:lorebooks-changed', event => void syncChangedBook(event));
}
