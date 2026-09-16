const FILE_PREFIX = 'snowbunny-memory-';
const SCHEMA_VERSION = 1;

let initialized = false;
let cacheKey = '';
let cacheState = null;
let cachePath = '';

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function snowState() {
    return globalThis.SnowBunny?.state ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function plainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
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
    return character?.avatar
        ? { kind: 'character', owner: character.avatar, chatId: String(chatId) }
        : null;
}

function refKey(ref) {
    return ref ? `${ref.kind}:${ref.owner}:${ref.chatId}` : '';
}

function currentStory() {
    const storyId = snowState()?.readChat?.()?.storyId;
    if (!storyId) return null;
    const stories = safeArray(snowState()?.readGlobal?.()?.stories);
    return stories.find(story => story?.id === storyId) ?? null;
}

function ownerDescriptor() {
    const story = currentStory();
    if (story) {
        return {
            kind: 'story',
            id: String(story.id),
            label: String(story.title || 'Story'),
            path: typeof story.memoryFilePath === 'string' ? story.memoryFilePath : '',
        };
    }
    const ref = currentRef();
    if (!ref) return null;
    const chatState = snowState()?.readChat?.() || {};
    return {
        kind: 'chat',
        id: refKey(ref),
        label: 'Stand-alone chat',
        path: typeof chatState.memoryFilePath === 'string' ? chatState.memoryFilePath : '',
    };
}

function defaultSettings() {
    return {
        automatic: true,
        frequency: 5,
        historyCount: 40,
        allowEdits: true,
        replyLimit: 4096,
        instructions: '',
    };
}

function normalizeMemory(memory, index = 0) {
    if (!plainObject(memory)) return null;
    const title = String(memory.title || '').trim();
    const details = String(memory.details || '').trim();
    if (!title || !details) return null;
    return {
        id: String(memory.id || id('memory')),
        title,
        details,
        source: plainObject(memory.source) ? clone(memory.source) : null,
        order: Number.isFinite(Number(memory.order)) ? Number(memory.order) : index + 1,
        createdAt: Number(memory.createdAt) || Date.now(),
        updatedAt: Number(memory.updatedAt) || Number(memory.createdAt) || Date.now(),
    };
}

function normalizeProposal(proposal, index = 0) {
    if (!plainObject(proposal)) return null;
    const action = ['create', 'edit', 'merge', 'delete'].includes(proposal.action) ? proposal.action : 'create';
    const title = String(proposal.title || '').trim();
    const details = String(proposal.details || '');
    const reason = String(proposal.reason || '').trim();
    if (!title || !reason || (action !== 'delete' && !details.trim())) return null;
    return {
        id: String(proposal.id || id('proposal')),
        baseVersion: Number.isInteger(Number(proposal.baseVersion)) ? Number(proposal.baseVersion) : 0,
        action,
        targetIds: safeArray(proposal.targetIds).map(String),
        expected: safeArray(proposal.expected).map(item => clone(item)),
        title,
        details,
        reason,
        source: plainObject(proposal.source) ? clone(proposal.source) : null,
        order: Number.isFinite(Number(proposal.order)) ? Number(proposal.order) : index + 1,
        createdAt: Number(proposal.createdAt) || Date.now(),
        revisedFrom: proposal.revisedFrom ? String(proposal.revisedFrom) : '',
    };
}

function normalizeState(value = {}) {
    const settings = plainObject(value.settings) ? value.settings : {};
    return {
        schemaVersion: SCHEMA_VERSION,
        version: Math.max(0, Number(value.version) || 0),
        memories: safeArray(value.memories).map(normalizeMemory).filter(Boolean),
        proposals: safeArray(value.proposals).map(normalizeProposal).filter(Boolean),
        revisions: safeArray(value.revisions).map(item => clone(item)).filter(Boolean),
        lastReview: plainObject(value.lastReview) ? clone(value.lastReview) : null,
        settings: {
            ...defaultSettings(),
            ...settings,
            automatic: settings.automatic !== false,
            frequency: Math.max(1, Math.min(30, Number(settings.frequency) || 5)),
            historyCount: Math.max(2, Math.min(500, Number(settings.historyCount) || 40)),
            allowEdits: settings.allowEdits !== false,
            replyLimit: Math.max(512, Math.min(16000, Number(settings.replyLimit) || 4096)),
            instructions: String(settings.instructions || ''),
        },
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

function resetCache() {
    cacheKey = '';
    cacheState = null;
    cachePath = '';
}

async function readCurrent({ fresh = false } = {}) {
    const owner = ownerDescriptor();
    if (!owner) return normalizeState();
    const key = `${owner.kind}:${owner.id}`;
    if (!fresh && cacheKey === key && cacheState) return clone(cacheState);
    if (!owner.path) {
        cacheKey = key;
        cachePath = '';
        cacheState = normalizeState();
        return clone(cacheState);
    }
    try {
        const response = await fetch(owner.path, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        cacheState = normalizeState(await response.json());
        cacheKey = key;
        cachePath = owner.path;
        return clone(cacheState);
    } catch (error) {
        console.warn('[SnowBunny] Could not load Memory state. Using an empty state until it is saved again.', error);
        cacheState = normalizeState();
        cacheKey = key;
        cachePath = owner.path;
        return clone(cacheState);
    }
}

function updateOwnerPath(owner, path) {
    if (owner.kind === 'story') {
        const global = snowState()?.readGlobal?.() || {};
        const stories = safeArray(global.stories);
        const story = stories.find(item => String(item.id) === owner.id);
        if (!story) throw new Error('Current Story no longer exists.');
        story.memoryFilePath = path;
        story.updatedAt = Date.now();
        snowState()?.patchGlobal?.({ stories });
        return;
    }
    snowState()?.patchChat?.({ memoryFilePath: path });
}

async function writeCurrent(input) {
    const api = context();
    const owner = ownerDescriptor();
    if (!owner || !api?.getRequestHeaders) throw new Error('Open a chat before saving Memories.');
    const state = normalizeState(input);
    const pathHint = owner.path || cachePath;
    const fileId = pathHint
        ? String(pathHint).split('/').pop()?.replace(/^snowbunny-memory-/, '').replace(/\.json$/i, '') || id('owner')
        : id('owner');
    const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify({
            name: `${FILE_PREFIX}${fileId}.json`,
            data: utf8ToBase64(JSON.stringify(state, null, 2)),
        }),
    });
    if (!response.ok) throw new Error(`Could not save Memories (${response.status}).`);
    const result = await response.json();
    const path = String(result?.path || pathHint || '');
    if (!path) throw new Error('SillyTavern did not return a Memory file path.');
    if (path !== owner.path) updateOwnerPath(owner, path);
    cacheKey = `${owner.kind}:${owner.id}`;
    cachePath = path;
    cacheState = state;
    document.dispatchEvent(new CustomEvent('snowbunny:memories-changed', { detail: { owner: clone(owner) } }));
    return clone(state);
}

function messageEvidence(limit = 40) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    return api.chat
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(2, limit))
        .map(message => {
            const identity = globalThis.SnowBunny?.identity?.current?.(message) || message.extra?.snowbunny || {};
            return {
                id: String(identity.id || ''),
                revision: Number(identity.revision) || 0,
                source: String(identity.source || ''),
            };
        })
        .filter(item => item.id);
}

function sourceSnapshot(historyCount = 40) {
    return {
        chatRef: currentRef(),
        messages: messageEvidence(historyCount),
        createdAt: Date.now(),
    };
}

function sourceStillValid(source) {
    if (!plainObject(source)) return true;
    if (refKey(source.chatRef) !== refKey(currentRef())) return false;
    const current = new Map(messageEvidence(500).map(item => [item.id, item]));
    for (const expected of safeArray(source.messages)) {
        const found = current.get(String(expected.id));
        if (!found || found.revision !== Number(expected.revision) || found.source !== String(expected.source)) return false;
    }
    return true;
}

async function addMemory({ title, details, source = null } = {}) {
    const state = await readCurrent();
    const order = Math.max(0, ...state.memories.map(memory => Number(memory.order) || 0)) + 1;
    state.memories.push(normalizeMemory({ id: id('memory'), title, details, source, order }));
    state.version += 1;
    return writeCurrent(state);
}

async function updateMemory(memoryId, patch) {
    const state = await readCurrent();
    const memory = state.memories.find(item => item.id === memoryId);
    if (!memory) throw new Error('That Memory no longer exists.');
    const before = clone(memory);
    Object.assign(memory, {
        title: patch.title !== undefined ? String(patch.title).trim() : memory.title,
        details: patch.details !== undefined ? String(patch.details).trim() : memory.details,
        updatedAt: Date.now(),
    });
    if (!memory.title || !memory.details) throw new Error('Memory title and details cannot be empty.');
    state.revisions.push({ at: Date.now(), type: 'manual-edit', before: [before], after: clone(memory) });
    state.version += 1;
    return writeCurrent(state);
}

async function deleteMemory(memoryId) {
    const state = await readCurrent();
    const index = state.memories.findIndex(item => item.id === memoryId);
    if (index < 0) return state;
    const before = state.memories[index];
    state.memories.splice(index, 1);
    state.revisions.push({ at: Date.now(), type: 'manual-delete', before: [clone(before)] });
    state.version += 1;
    return writeCurrent(state);
}

async function setSettings(patch = {}) {
    const state = await readCurrent();
    state.settings = normalizeState({ settings: { ...state.settings, ...patch } }).settings;
    return writeCurrent(state);
}

async function setProposals(proposals, { lastReview = undefined } = {}) {
    const state = await readCurrent();
    state.proposals = safeArray(proposals).map(normalizeProposal).filter(Boolean);
    if (lastReview !== undefined) state.lastReview = lastReview ? clone(lastReview) : null;
    return writeCurrent(state);
}

async function replaceProposal(proposalId, replacements = [], { lastReview = undefined } = {}) {
    const state = await readCurrent();
    state.proposals = state.proposals.filter(item => item.id !== proposalId);
    state.proposals.push(...safeArray(replacements).map(normalizeProposal).filter(Boolean));
    if (lastReview !== undefined) state.lastReview = lastReview ? clone(lastReview) : null;
    return writeCurrent(state);
}

function sameExpected(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected);
}

async function acceptProposal(proposalId) {
    const state = await readCurrent({ fresh: true });
    const proposal = state.proposals.find(item => item.id === proposalId);
    if (!proposal) throw new Error('This suggestion is no longer pending.');
    if (proposal.baseVersion !== state.version) throw new Error('Memories changed after this suggestion was made. Ask Memory Maker to review again.');
    if (!sourceStillValid(proposal.source)) throw new Error('The story text behind this suggestion changed. Review it again before saving.');

    const targets = state.memories.filter(memory => proposal.targetIds.includes(memory.id));
    if (!sameExpected(targets, proposal.expected)) throw new Error('A Memory in this suggestion changed. Review it again before saving.');

    const before = clone(targets);
    const targetIndices = proposal.targetIds
        .map(memoryId => state.memories.findIndex(memory => memory.id === memoryId))
        .filter(index => index >= 0);
    let insertion = targetIndices.length ? Math.min(...targetIndices) : state.memories.length;
    state.memories = state.memories.filter(memory => !proposal.targetIds.includes(memory.id));

    if (proposal.action !== 'delete') {
        const memory = normalizeMemory({
            id: proposal.action === 'create' ? proposal.id : proposal.targetIds[0],
            title: proposal.title,
            details: proposal.details,
            source: proposal.source,
            order: proposal.action === 'create'
                ? Math.max(0, ...state.memories.map(item => Number(item.order) || 0)) + 1
                : Number(proposal.expected?.[0]?.order) || proposal.order,
            createdAt: proposal.action === 'create'
                ? Date.now()
                : Number(proposal.expected?.[0]?.createdAt) || Date.now(),
            updatedAt: Date.now(),
        });
        insertion = Math.max(0, Math.min(insertion, state.memories.length));
        state.memories.splice(insertion, 0, memory);
    }

    state.revisions.push({
        at: Date.now(),
        type: 'proposal-accepted',
        proposal: clone(proposal),
        before,
    });
    state.proposals = state.proposals.filter(item => item.id !== proposalId);
    state.version += 1;
    return writeCurrent(state);
}

async function rejectProposal(proposalId) {
    const state = await readCurrent();
    if (!state.proposals.some(item => item.id === proposalId)) return state;
    state.proposals = state.proposals.filter(item => item.id !== proposalId);
    state.revisions.push({ at: Date.now(), type: 'proposal-rejected', proposalId });
    return writeCurrent(state);
}

function initMemoryStore() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object'
        ? globalThis.SnowBunny
        : {};
    globalThis.SnowBunny = {
        ...existing,
        memories: {
            read: readCurrent,
            write: writeCurrent,
            add: addMemory,
            update: updateMemory,
            delete: deleteMemory,
            setSettings,
            setProposals,
            replaceProposal,
            acceptProposal,
            rejectProposal,
            sourceSnapshot,
            sourceStillValid,
            owner: ownerDescriptor,
            currentRef,
            refKey,
            normalizeProposal,
            resetCache,
        },
    };

    const api = context();
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = api?.eventTypes?.[name];
        if (event) api.eventSource?.on?.(event, resetCache);
    }
}

export { initMemoryStore };
