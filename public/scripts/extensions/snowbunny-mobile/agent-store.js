const FILE_PREFIX = 'snowbunny-agents-';
const SCHEMA_VERSION = 1;
const PLACEMENTS = new Set(['header', 'top', 'bottom', 'none']);

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
    return ref ? `${ref.kind || ''}:${ref.owner || ''}:${ref.chatId || ''}` : '';
}

function ownerDescriptor() {
    const ref = currentRef();
    if (!ref) return null;
    return {
        id: refKey(ref),
        ref,
        path: String(snowState()?.readChat?.()?.agentFilePath || ''),
    };
}

function normalizeDefinition(input = {}) {
    const source = plainObject(input) ? input : {};
    const name = String(source.name || 'Custom Agent').trim().slice(0, 100) || 'Custom Agent';
    const prompt = String(source.prompt || '').trim().slice(0, 30000);
    const placement = PLACEMENTS.has(source.placement) ? source.placement : 'bottom';
    return {
        id: String(source.id || id('agent')),
        kind: source.kind === 'custom' ? 'custom' : 'custom',
        name,
        purpose: String(source.purpose || '').trim().slice(0, 500),
        prompt,
        enabled: source.enabled !== false,
        automatic: source.automatic !== false,
        frequency: Math.max(1, Math.min(100, Number(source.frequency) || 1)),
        placement,
        visible: placement !== 'none' && source.visible !== false,
        feedback: source.feedback === true,
        historyCount: Math.max(2, Math.min(500, Number(source.historyCount) || 30)),
        replyLimit: Math.max(64, Math.min(16000, Number(source.replyLimit) || 2400)),
        dependencies: [...new Set(safeArray(source.dependencies).map(String).filter(Boolean))].slice(0, 100),
        includeAcceptedMemories: source.includeAcceptedMemories === true,
        instructionsMode: source.instructionsMode === 'suggest' ? 'suggest' : 'record',
        createdAt: Number(source.createdAt) || Date.now(),
        updatedAt: Number(source.updatedAt) || Number(source.createdAt) || Date.now(),
    };
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

function normalizeResult(input = {}) {
    if (!plainObject(input) || !input.agentId || !String(input.text || '').trim()) return null;
    const source = plainObject(input.source) ? input.source : {};
    const message = plainObject(source.message) && source.message.id ? {
        id: String(source.message.id),
        revision: Number(source.message.revision) || 0,
        source: String(source.message.source || ''),
    } : null;
    if (!message) return null;
    return {
        id: String(input.id || id('agentresult')),
        agentId: String(input.agentId),
        text: String(input.text || '').trim().slice(0, 100000),
        source: {
            chatRef: plainObject(source.chatRef) ? clone(source.chatRef) : null,
            message,
            evidence: normalizeEvidence(source.evidence),
        },
        previousResultId: input.previousResultId ? String(input.previousResultId) : '',
        dependencyResultIds: safeArray(input.dependencyResultIds).map(String),
        generatedAt: Number(input.generatedAt) || Date.now(),
        stale: input.stale === true,
        staleReason: String(input.staleReason || ''),
    };
}

function normalizeStatus(input = {}) {
    if (!plainObject(input)) return {};
    return Object.fromEntries(Object.entries(input).map(([agentId, value]) => [String(agentId), {
        status: ['idle', 'waiting', 'running', 'failed', 'complete'].includes(value?.status) ? value.status : 'idle',
        detail: String(value?.detail || '').slice(0, 1000),
        updatedAt: Number(value?.updatedAt) || 0,
        throughMessageId: String(value?.throughMessageId || ''),
    }]));
}

function normalizeState(input = {}) {
    const definitions = safeArray(input.definitions).map(normalizeDefinition);
    const known = new Set(definitions.map(definition => definition.id));
    const results = safeArray(input.results).map(normalizeResult).filter(result => result && known.has(result.agentId));
    return {
        schemaVersion: SCHEMA_VERSION,
        definitions,
        results,
        status: normalizeStatus(input.status),
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
    cachePath = '';
    cacheState = null;
}

async function readState({ fresh = false } = {}) {
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
        console.warn('[SnowBunny] Could not load Custom Agent state.', error);
        cacheState = normalizeState();
        cacheKey = owner.id;
        cachePath = owner.path;
        return clone(cacheState);
    }
}

async function writeState(input) {
    const api = context();
    const owner = ownerDescriptor();
    if (!owner || !api?.getRequestHeaders) throw new Error('Open a chat before saving Agents.');
    const state = normalizeState(input);
    const pathHint = owner.path || cachePath;
    const fileId = pathHint
        ? String(pathHint).split('/').pop()?.replace(/^snowbunny-agents-/, '').replace(/\.json$/i, '') || id('owner')
        : id('owner');
    const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify({
            name: `${FILE_PREFIX}${fileId}.json`,
            data: utf8ToBase64(JSON.stringify(state, null, 2)),
        }),
    });
    if (!response.ok) throw new Error(`Could not save Agents (${response.status}).`);
    const result = await response.json();
    const path = String(result?.path || pathHint || '');
    if (!path) throw new Error('SillyTavern did not return an Agent file path.');
    if (path !== owner.path) snowState()?.patchChat?.({ agentFilePath: path });
    cacheKey = owner.id;
    cachePath = path;
    cacheState = state;
    document.dispatchEvent(new CustomEvent('snowbunny:agents-changed', { detail: { chatRef: clone(owner.ref) } }));
    return clone(state);
}

function validateGraph(definitions) {
    const byId = new Map(definitions.map(definition => [definition.id, definition]));
    if (byId.size !== definitions.length) throw new Error('Custom Agent IDs must be unique.');
    const active = new Set();
    const done = new Set();
    const ordered = [];
    const visit = idValue => {
        if (done.has(idValue)) return;
        const definition = byId.get(idValue);
        if (!definition) throw new Error('A Custom Agent dependency is missing.');
        if (active.has(idValue)) throw new Error('Custom Agents cannot depend on one another in a circle.');
        active.add(idValue);
        for (const dependency of definition.dependencies) {
            if (!byId.has(dependency)) throw new Error(`${definition.name} depends on an Agent that no longer exists.`);
            visit(dependency);
        }
        active.delete(idValue);
        done.add(idValue);
        ordered.push(definition);
    };
    definitions.forEach(definition => visit(definition.id));
    return ordered;
}

async function setDefinitions(definitions) {
    const normalized = safeArray(definitions).map(normalizeDefinition);
    validateGraph(normalized);
    const state = await readState();
    const known = new Set(normalized.map(definition => definition.id));
    state.definitions = normalized;
    state.results = state.results.filter(result => known.has(result.agentId));
    state.status = Object.fromEntries(Object.entries(state.status).filter(([agentId]) => known.has(agentId)));
    return writeState(state);
}

async function upsertDefinition(input) {
    const state = await readState();
    const definition = normalizeDefinition({ ...input, updatedAt: Date.now() });
    const index = state.definitions.findIndex(item => item.id === definition.id);
    if (index >= 0) state.definitions[index] = definition;
    else state.definitions.push(definition);
    validateGraph(state.definitions);
    await writeState(state);
    return clone(definition);
}

async function removeDefinition(agentId) {
    const state = await readState();
    const dependents = state.definitions.filter(definition => definition.dependencies.includes(agentId));
    if (dependents.length) throw new Error(`Remove this Agent from ${dependents.map(item => item.name).join(', ')} dependencies first.`);
    state.definitions = state.definitions.filter(definition => definition.id !== agentId);
    state.results = state.results.filter(result => result.agentId !== agentId);
    delete state.status[agentId];
    return writeState(state);
}

function identityFor(message) {
    return globalThis.SnowBunny?.identity?.current?.(message) || message?.extra?.snowbunny || {};
}

function evidenceThrough(endIndex, limit = 30) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    const end = Math.max(0, Math.min(api.chat.length - 1, Number(endIndex)));
    const visible = api.chat
        .slice(0, end + 1)
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(2, limit));
    return visible.map(message => {
        const identity = identityFor(message);
        return { id: String(identity.id || ''), revision: Number(identity.revision) || 0, source: String(identity.source || '') };
    }).filter(item => item.id);
}

function sourceForMessage(message, endIndex, historyCount = 30) {
    const identity = identityFor(message);
    if (!identity.id) return null;
    return {
        chatRef: currentRef(),
        message: { id: String(identity.id), revision: Number(identity.revision) || 0, source: String(identity.source || '') },
        evidence: evidenceThrough(endIndex, historyCount),
    };
}

function currentEvidenceMap() {
    const api = context();
    if (!Array.isArray(api?.chat)) return new Map();
    const ignore = api?.symbols?.ignore;
    return new Map(api.chat
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .map(message => {
            const identity = identityFor(message);
            return [String(identity.id || ''), { id: String(identity.id || ''), revision: Number(identity.revision) || 0, source: String(identity.source || '') }];
        })
        .filter(([key]) => key));
}

function sourceValid(source, map = currentEvidenceMap()) {
    if (!plainObject(source) || refKey(source.chatRef) !== refKey(currentRef())) return false;
    return normalizeEvidence(source.evidence?.length ? source.evidence : [source.message]).every(expected => {
        const actual = map.get(expected.id);
        return actual && actual.revision === expected.revision && actual.source === expected.source;
    });
}

function currentResultsFromState(state) {
    const current = new Map();
    for (const result of state?.results || []) {
        if (result.stale) continue;
        current.set(result.agentId, result);
    }
    return current;
}

function resultStillValid(result) {
    if (!result || result.stale) return false;
    return sourceValid(result.source);
}

async function reconcile({ persist = true } = {}) {
    const state = await readState({ fresh: true });
    const map = currentEvidenceMap();
    const byResultId = new Map(state.results.map(result => [result.id, result]));
    let changed = false;
    for (const result of state.results) {
        const evidenceBad = !sourceValid(result.source, map);
        const previousBad = result.previousResultId && (!byResultId.has(result.previousResultId) || byResultId.get(result.previousResultId).stale);
        const dependencyBad = result.dependencyResultIds.some(resultId => !byResultId.has(resultId) || byResultId.get(resultId).stale);
        const stale = Boolean(evidenceBad || previousBad || dependencyBad);
        const reason = evidenceBad
            ? 'Story evidence changed'
            : previousBad
                ? 'This result depended on an earlier result that became stale'
                : dependencyBad
                    ? 'A dependency result became stale'
                    : '';
        if (result.stale !== stale || result.staleReason !== reason) changed = true;
        result.stale = stale;
        result.staleReason = reason;
    }
    if (changed && persist) await writeState(state);
    return { state, changed };
}

async function appendResult(input) {
    const state = await readState({ fresh: true });
    const definition = state.definitions.find(item => item.id === input.agentId);
    if (!definition) throw new Error('This Custom Agent no longer exists.');
    const result = normalizeResult({ ...input, id: input.id || id('agentresult'), generatedAt: Date.now() });
    if (!result) throw new Error('Custom Agent returned an invalid result.');
    state.results.push(result);
    // Keep a generous audit trail without allowing an unattended custom agent
    // to grow one chat file forever.
    const keepIds = new Set();
    for (const agent of state.definitions) {
        state.results.filter(item => item.agentId === agent.id).slice(-80).forEach(item => keepIds.add(item.id));
    }
    state.results = state.results.filter(item => keepIds.has(item.id));
    state.status[result.agentId] = { status: 'complete', detail: '', updatedAt: Date.now(), throughMessageId: result.source.message.id };
    await writeState(state);
    return clone(result);
}

async function setStatus(agentId, status, detail = '', throughMessageId = '') {
    const state = await readState();
    state.status[String(agentId)] = {
        status,
        detail: String(detail || '').slice(0, 1000),
        updatedAt: Date.now(),
        throughMessageId: String(throughMessageId || ''),
    };
    await writeState(state);
}

export function initAgentStore() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        agents: {
            read: readState,
            write: writeState,
            setDefinitions,
            upsert: upsertDefinition,
            remove: removeDefinition,
            normalizeDefinition,
            validateGraph,
            currentResultsFromState,
            appendResult,
            setStatus,
            sourceForMessage,
            sourceValid,
            resultStillValid,
            reconcile,
            currentRef,
            refKey,
            newId: id,
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
                void reconcile({ persist: true });
            });
        }
    }
}
