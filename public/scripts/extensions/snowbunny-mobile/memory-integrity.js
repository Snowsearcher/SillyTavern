let initialized = false;
let reconcileTimer = null;

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

async function reconcile() {
    const memoryStore = store();
    const currentRef = memoryStore?.currentRef?.();
    if (!memoryStore || !currentRef) return;
    const currentKey = refKey(currentRef);
    const memoryState = await memoryStore.read({ fresh: true });
    const previous = invalidIdsForCurrentOwner();
    const next = new Set(previous);

    for (const memory of memoryState.memories || []) {
        const sourceRef = memory?.source?.chatRef;
        if (!sourceRef || refKey(sourceRef) !== currentKey) continue;
        if (memoryStore.sourceStillValid(memory.source)) next.delete(String(memory.id));
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
    const api = globalThis.SillyTavern?.getContext?.();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED']) {
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
