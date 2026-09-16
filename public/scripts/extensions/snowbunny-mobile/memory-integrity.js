let initialized = false;
let reconcileTimer = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function store() {
    return globalThis.SnowBunny?.memories ?? null;
}

function state() {
    return globalThis.SnowBunny?.state ?? null;
}

function refKey(ref) {
    return ref ? `${ref.kind || ''}:${ref.owner || ''}:${ref.chatId || ''}` : '';
}

function ownerKey() {
    const owner = store()?.owner?.();
    return owner ? `${owner.kind}:${owner.id}` : '';
}

function mapState() {
    const value = state()?.readGlobal?.()?.memorySourceChanges;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function invalidIdsForCurrentOwner() {
    const key = ownerKey();
    const map = mapState();
    return new Set(key && Array.isArray(map[key]) ? map[key].map(String) : []);
}

function persistInvalidIds(ids) {
    const key = ownerKey();
    if (!key) return;
    const map = { ...mapState() };
    const next = [...new Set(ids.map(String))];
    if (next.length) map[key] = next;
    else delete map[key];
    state()?.patchGlobal?.({ memorySourceChanges: map });
    document.dispatchEvent(new CustomEvent('snowbunny:memory-integrity-changed', { detail: { ownerKey: key, invalidIds: next } }));
}

function fullVisibleEvidenceMap() {
    const api = context();
    const map = new Map();
    if (!Array.isArray(api?.chat)) return map;
    const ignore = api?.symbols?.ignore;
    for (const message of api.chat) {
        if (!message || message.is_system || (ignore && message.extra?.[ignore])) continue;
        const identity = globalThis.SnowBunny?.identity?.current?.(message) || message.extra?.snowbunny || {};
        if (!identity.id) continue;
        map.set(String(identity.id), {
            id: String(identity.id),
            revision: Number(identity.revision) || 0,
            source: String(identity.source || ''),
        });
    }
    return map;
}

function sourceStillValidHere(source, currentRefKey, evidenceMap) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return true;
    if (refKey(source.chatRef) !== currentRefKey) return true;
    const expected = Array.isArray(source.messages) ? source.messages : [];
    if (!expected.length) return true;
    for (const item of expected) {
        if (!item?.id) continue;
        const actual = evidenceMap.get(String(item.id));
        if (!actual || actual.revision !== Number(item.revision) || actual.source !== String(item.source || '')) return false;
    }
    return true;
}

async function reconcile() {
    const memoryStore = store();
    const currentRef = memoryStore?.currentRef?.();
    if (!memoryStore || !currentRef) return;
    const currentKey = refKey(currentRef);
    const memoryState = await memoryStore.read({ fresh: true });
    const previous = invalidIdsForCurrentOwner();
    const next = new Set(previous);
    const evidenceMap = fullVisibleEvidenceMap();

    for (const memory of memoryState.memories || []) {
        const sourceRef = memory?.source?.chatRef;
        if (!sourceRef || refKey(sourceRef) !== currentKey) continue;
        if (sourceStillValidHere(memory.source, currentKey, evidenceMap)) next.delete(String(memory.id));
        else next.add(String(memory.id));
    }

    // Remove IDs that no longer exist in the owner Memory store.
    const existing = new Set((memoryState.memories || []).map(memory => String(memory.id)));
    for (const memoryId of [...next]) if (!existing.has(memoryId)) next.delete(memoryId);

    const before = [...previous].sort().join('|');
    const after = [...next].sort().join('|');
    if (before !== after) persistInvalidIds([...next]);
}

function scheduleReconcile() {
    clearTimeout(reconcileTimer);
    reconcileTimer = window.setTimeout(() => void reconcile(), 180);
}

function isInvalid(memoryId) {
    return invalidIdsForCurrentOwner().has(String(memoryId));
}

function annotate(memories) {
    const invalid = invalidIdsForCurrentOwner();
    return (memories || []).map(memory => ({ ...memory, sourceChanged: invalid.has(String(memory.id)) }));
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'MESSAGE_EDITED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED']) {
        const event = types[name];
        if (event) source.on(event, scheduleReconcile);
    }
}

export function initMemoryIntegrity() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    document.addEventListener('snowbunny:memories-changed', scheduleReconcile);
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        memoryIntegrity: {
            reconcile,
            schedule: scheduleReconcile,
            invalidIds: invalidIdsForCurrentOwner,
            isInvalid,
            annotate,
        },
    };
    scheduleReconcile();
}
