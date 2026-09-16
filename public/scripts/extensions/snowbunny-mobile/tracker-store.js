const FILE_PREFIX = 'snowbunny-tracker-';
const SCHEMA_VERSION = 1;
const SECTION_IDS = ['thoughts', 'relationships', 'scene', 'threads', 'secrets', 'conditions', 'inventory', 'locations', 'gmNotes'];

let initialized = false;
let cacheKey = '';
let cachePath = '';
let cacheState = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function snowState() {
    return globalThis.SnowBunny?.state ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function plainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function id(prefix) {
    const api = context();
    const uuid = api?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${String(uuid).replaceAll('-', '')}`;
}

function currentRef() {
    const api = context();
    const chatId = api?.getCurrentChatId?.();
    if (!chatId) return null;
    if (api.groupId) return { kind: 'group', owner: String(api.groupId), chatId: String(chatId) };
    const index = Number.parseInt(String(api.characterId ?? ''), 10);
    const character = Number.isInteger(index) ? api.characters?.[index] : null;
    return character?.avatar ? { kind: 'character', owner: character.avatar, chatId: String(chatId) } : null;
}

function refKey(ref) {
    return ref ? `${ref.kind}:${ref.owner}:${ref.chatId}` : '';
}

function defaultSettings() {
    return {
        automatic: true,
        historyCount: 14,
        replyLimit: 2600,
        instructions: '',
        sections: {
            thoughts: true,
            relationships: true,
            scene: true,
            threads: true,
            secrets: true,
            conditions: true,
            inventory: false,
            locations: true,
            gmNotes: true,
        },
    };
}

function normalizeSettings(input) {
    const defaults = defaultSettings();
    const source = plainObject(input) ? input : {};
    const sections = plainObject(source.sections) ? source.sections : {};
    return {
        automatic: source.automatic !== false,
        historyCount: Math.max(4, Math.min(80, Number(source.historyCount) || defaults.historyCount)),
        replyLimit: Math.max(900, Math.min(8000, Number(source.replyLimit) || defaults.replyLimit)),
        instructions: String(source.instructions || ''),
        sections: Object.fromEntries(SECTION_IDS.map(key => [key, sections[key] !== undefined ? sections[key] === true : defaults.sections[key]])),
    };
}

function normalizeSections(input) {
    const source = plainObject(input) ? input : {};
    return Object.fromEntries(SECTION_IDS.map(key => [key, String(source[key] || '').trim()]));
}

function normalizeEvidence(value) {
    return safeArray(value)
        .filter(item => plainObject(item) && item.id)
        .map(item => ({
            id: String(item.id),
            revision: Number(item.revision) || 0,
            source: String(item.source || ''),
        }));
}

function normalizeSnapshot(input = {}) {
    if (!plainObject(input)) return null;
    const source = plainObject(input.source) ? input.source : {};
    const message = plainObject(source.message) && source.message.id
        ? {
            id: String(source.message.id),
            revision: Number(source.message.revision) || 0,
            source: String(source.message.source || ''),
        }
        : null;
    if (!message) return null;
    return {
        id: String(input.id || id('tracker')),
        revision: Math.max(1, Number(input.revision) || 1),
        previousSnapshotId: input.previousSnapshotId ? String(input.previousSnapshotId) : '',
        source: {
            chatRef: plainObject(source.chatRef) ? clone(source.chatRef) : null,
            message,
            evidence: normalizeEvidence(source.evidence),
        },
        timePlace: String(input.timePlace || '').trim(),
        sections: normalizeSections(input.sections),
        generatedAt: Number(input.generatedAt) || Date.now(),
        updatedAt: Number(input.updatedAt) || Number(input.generatedAt) || Date.now(),
        manuallyEdited: input.manuallyEdited === true,
        generatedOriginal: plainObject(input.generatedOriginal) ? {
            timePlace: String(input.generatedOriginal.timePlace || '').trim(),
            sections: normalizeSections(input.generatedOriginal.sections),
        } : null,
        stale: input.stale === true,
        staleReason: String(input.staleReason || ''),
    };
}

function normalizeState(input = {}) {
    const snapshots = safeArray(input.snapshots).map(normalizeSnapshot).filter(Boolean);
    const currentId = String(input.currentSnapshotId || '');
    return {
        schemaVersion: SCHEMA_VERSION,
        settings: normalizeSettings(input.settings),
        snapshots,
        currentSnapshotId: snapshots.some(item => item.id === currentId && !item.stale) ? currentId : '',
        manualRevisions: safeArray(input.manualRevisions).filter(plainObject).map(clone),
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

function ownerDescriptor() {
    const ref = currentRef();
    if (!ref) return null;
    return {
        id: refKey(ref),
        ref,
        path: String(snowState()?.readChat?.()?.trackerFilePath || ''),
    };
}

function updateOwnerPath(path) {
    snowState()?.patchChat?.({ trackerFilePath: path });
}

function resetCache() {
    cacheKey = '';
    cachePath = '';
    cacheState = null;
}

export async function readTrackerState({ fresh = false } = {}) {
    const owner = ownerDescriptor();
    if (!owner) return normalizeState();
    if (!fresh && cacheKey === owner.id && cacheState) return clone(cacheState);
    if (!owner.path) {
        cacheKey = owner.id;
        cachePath = '';
        cacheState = normalizeState();
        return clone(cacheState);
    }
    try {
        const response = await fetch(owner.path, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        cacheState = normalizeState(await response.json());
        cacheKey = owner.id;
        cachePath = owner.path;
        return clone(cacheState);
    } catch (error) {
        console.warn('[SnowBunny] Could not load Story Tracker state.', error);
        cacheState = normalizeState();
        cacheKey = owner.id;
        cachePath = owner.path;
        return clone(cacheState);
    }
}

export async function writeTrackerState(input) {
    const api = context();
    const owner = ownerDescriptor();
    if (!owner || !api?.getRequestHeaders) throw new Error('Open a chat before saving Story State.');
    const state = normalizeState(input);
    const pathHint = owner.path || cachePath;
    const fileId = pathHint
        ? String(pathHint).split('/').pop()?.replace(/^snowbunny-tracker-/, '').replace(/\.json$/i, '') || id('owner')
        : id('owner');
    const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify({
            name: `${FILE_PREFIX}${fileId}.json`,
            data: utf8ToBase64(JSON.stringify(state, null, 2)),
        }),
    });
    if (!response.ok) throw new Error(`Could not save Story State (${response.status}).`);
    const result = await response.json();
    const path = String(result?.path || pathHint || '');
    if (!path) throw new Error('SillyTavern did not return a Story State path.');
    if (path !== owner.path) updateOwnerPath(path);
    cacheKey = owner.id;
    cachePath = path;
    cacheState = state;
    document.dispatchEvent(new CustomEvent('snowbunny:tracker-state-changed', { detail: { chatRef: clone(owner.ref) } }));
    return clone(state);
}

function identityFor(message) {
    return globalThis.SnowBunny?.identity?.current?.(message) || message?.extra?.snowbunny || {};
}

export function visibleEvidence(limit = 14) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    return api.chat
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(1, limit))
        .map(message => {
            const identity = identityFor(message);
            return {
                id: String(identity.id || ''),
                revision: Number(identity.revision) || 0,
                source: String(identity.source || ''),
            };
        })
        .filter(item => item.id);
}

export function sourceForMessage(message, historyCount = 14) {
    const identity = identityFor(message);
    if (!identity.id) return null;
    return {
        chatRef: currentRef(),
        message: {
            id: String(identity.id),
            revision: Number(identity.revision) || 0,
            source: String(identity.source || ''),
        },
        evidence: visibleEvidence(historyCount),
    };
}

function currentEvidenceMap() {
    return new Map(visibleEvidence(100000).map(item => [item.id, item]));
}

function evidenceValid(evidence, map = currentEvidenceMap()) {
    return normalizeEvidence(evidence).every(expected => {
        const actual = map.get(expected.id);
        return actual && actual.revision === expected.revision && actual.source === expected.source;
    });
}

export function snapshotStillValid(snapshot) {
    if (!snapshot || snapshot.stale) return false;
    if (refKey(snapshot.source?.chatRef) !== refKey(currentRef())) return false;
    return evidenceValid(snapshot.source?.evidence || [snapshot.source?.message]);
}

export async function reconcileTrackerSources({ persist = true } = {}) {
    const state = await readTrackerState({ fresh: true });
    if (!state.snapshots.length) return { state, changed: false, currentInvalidated: false };
    const map = currentEvidenceMap();
    const stale = new Set();
    let changed = false;
    for (const snapshot of state.snapshots) {
        const ownInvalid = refKey(snapshot.source?.chatRef) !== refKey(currentRef()) || !evidenceValid(snapshot.source?.evidence || [snapshot.source?.message], map);
        const chainInvalid = snapshot.previousSnapshotId && stale.has(snapshot.previousSnapshotId);
        const nextStale = Boolean(ownInvalid || chainInvalid);
        const reason = ownInvalid ? 'Story evidence changed' : chainInvalid ? 'Earlier Story State in this chain became stale' : '';
        if (snapshot.stale !== nextStale || snapshot.staleReason !== reason) changed = true;
        snapshot.stale = nextStale;
        snapshot.staleReason = reason;
        if (nextStale) stale.add(snapshot.id);
    }
    const before = state.currentSnapshotId;
    const latestValid = [...state.snapshots].reverse().find(snapshot => !snapshot.stale) || null;
    state.currentSnapshotId = latestValid?.id || '';
    if (before !== state.currentSnapshotId) changed = true;
    const currentInvalidated = Boolean(before && before !== state.currentSnapshotId);
    if (changed && persist) await writeTrackerState(state);
    return { state, changed, currentInvalidated };
}

export function currentSnapshotFromState(state) {
    const currentId = state?.currentSnapshotId;
    return safeArray(state?.snapshots).find(snapshot => snapshot.id === currentId && !snapshot.stale) || null;
}

export async function currentTrackerSnapshot() {
    const state = await readTrackerState();
    const snapshot = currentSnapshotFromState(state);
    return snapshot && snapshotStillValid(snapshot) ? clone(snapshot) : null;
}

export async function appendTrackerSnapshot({ source, timePlace = '', sections = {}, generatedOriginal = null } = {}) {
    if (!source?.message?.id) throw new Error('Story Tracker snapshot needs a producing message identity.');
    const state = await readTrackerState();
    const previous = currentSnapshotFromState(state);
    const snapshot = normalizeSnapshot({
        id: id('tracker'),
        revision: 1,
        previousSnapshotId: previous?.id || '',
        source,
        timePlace,
        sections,
        generatedOriginal,
        generatedAt: Date.now(),
        updatedAt: Date.now(),
        manuallyEdited: false,
    });
    state.snapshots.push(snapshot);
    state.currentSnapshotId = snapshot.id;
    await writeTrackerState(state);
    return clone(snapshot);
}

export async function editCurrentTracker({ timePlace, sections } = {}) {
    const state = await readTrackerState({ fresh: true });
    const snapshot = currentSnapshotFromState(state);
    if (!snapshot || !snapshotStillValid(snapshot)) throw new Error('Current Story State is stale. Regenerate it before editing.');
    const before = clone(snapshot);
    if (!snapshot.generatedOriginal) {
        snapshot.generatedOriginal = { timePlace: snapshot.timePlace, sections: clone(snapshot.sections) };
    }
    snapshot.timePlace = String(timePlace ?? snapshot.timePlace).trim();
    snapshot.sections = normalizeSections(sections ?? snapshot.sections);
    snapshot.revision += 1;
    snapshot.updatedAt = Date.now();
    snapshot.manuallyEdited = true;
    state.manualRevisions.push({ at: Date.now(), snapshotId: snapshot.id, revision: snapshot.revision, before });
    await writeTrackerState(state);
    return clone(snapshot);
}

export async function resetCurrentTrackerToGenerated() {
    const state = await readTrackerState({ fresh: true });
    const snapshot = currentSnapshotFromState(state);
    if (!snapshot?.generatedOriginal) return snapshot ? clone(snapshot) : null;
    const before = clone(snapshot);
    snapshot.timePlace = snapshot.generatedOriginal.timePlace;
    snapshot.sections = normalizeSections(snapshot.generatedOriginal.sections);
    snapshot.revision += 1;
    snapshot.updatedAt = Date.now();
    snapshot.manuallyEdited = false;
    state.manualRevisions.push({ at: Date.now(), snapshotId: snapshot.id, revision: snapshot.revision, type: 'reset-to-generated', before });
    await writeTrackerState(state);
    return clone(snapshot);
}

export async function setTrackerSettings(patch = {}) {
    const state = await readTrackerState();
    state.settings = normalizeSettings({
        ...state.settings,
        ...patch,
        sections: patch.sections ? { ...state.settings.sections, ...patch.sections } : state.settings.sections,
    });
    await writeTrackerState(state);
    return clone(state.settings);
}

export function initTrackerStore() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        trackers: {
            read: readTrackerState,
            write: writeTrackerState,
            current: currentTrackerSnapshot,
            currentFromState: currentSnapshotFromState,
            append: appendTrackerSnapshot,
            editCurrent: editCurrentTracker,
            resetCurrentToGenerated: resetCurrentTrackerToGenerated,
            setSettings: setTrackerSettings,
            sourceForMessage,
            visibleEvidence,
            snapshotStillValid,
            reconcile: reconcileTrackerSources,
            sectionIds: [...SECTION_IDS],
        },
    };

    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (source?.on && types) {
        for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
            const event = types[name];
            if (event) source.on(event, () => {
                resetCache();
                void reconcileTrackerSources({ persist: true });
            });
        }
    }
}
