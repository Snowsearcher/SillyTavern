const FILE_PREFIX = 'snowbunny-phone-';
const SCHEMA_VERSION = 1;

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
    const value = api?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${String(value).replaceAll('-', '')}`;
}

function currentRef() {
    const api = context();
    const chatId = api?.getCurrentChatId?.();
    if (!chatId) return null;
    if (api.groupId) return { kind: 'group', owner: String(api.groupId), chatId: String(chatId) };
    const index = Number.parseInt(String(api.characterId ?? ''), 10);
    const character = Number.isInteger(index) ? api.characters?.[index] : null;
    return character?.avatar
        ? { kind: 'character', owner: String(character.avatar), chatId: String(chatId) }
        : null;
}

function refKey(ref) {
    return ref ? `${ref.kind || ''}:${ref.owner || ''}:${ref.chatId || ''}` : '';
}

function identityFor(message) {
    return globalThis.SnowBunny?.identity?.current?.(message) || message?.extra?.snowbunny || {};
}

function visibleStoryIdentities() {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    return api.chat
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .map((message, index) => {
            const identity = identityFor(message);
            return {
                index,
                id: String(identity.id || ''),
                revision: Number(identity.revision) || 0,
                source: String(identity.source || ''),
                isUser: message.is_user === true,
            };
        })
        .filter(item => item.id);
}

function currentStoryAnchor() {
    const latest = visibleStoryIdentities().at(-1);
    return latest ? {
        messageId: latest.id,
        revision: latest.revision,
        source: latest.source,
    } : { messageId: '', revision: 0, source: '' };
}

function normalizeAnchor(value) {
    if (!plainObject(value)) return { messageId: '', revision: 0, source: '' };
    return {
        messageId: String(value.messageId || value.id || ''),
        revision: Number(value.revision) || 0,
        source: String(value.source || ''),
    };
}

function normalizeEvidence(value) {
    return safeArray(value)
        .filter(item => plainObject(item) && (item.messageId || item.id))
        .map(item => ({
            messageId: String(item.messageId || item.id),
            revision: Number(item.revision) || 0,
            source: String(item.source || ''),
            quote: String(item.quote || ''),
        }));
}

function normalizeActor(value = {}) {
    const source = plainObject(value) ? value : {};
    const kind = ['character', 'codex-character', 'custom'].includes(source.kind) ? source.kind : 'custom';
    return {
        kind,
        entityId: String(source.entityId || ''),
        avatar: String(source.avatar || ''),
        lorebookId: String(source.lorebookId || ''),
        entryId: String(source.entryId || ''),
        key: String(source.key || ''),
    };
}

function actorKey(actor) {
    const value = normalizeActor(actor);
    if (value.entityId) return `entity:${value.entityId}`;
    if (value.kind === 'codex-character' && value.lorebookId && value.entryId) return `codex:${value.lorebookId}:${value.entryId}`;
    if (value.kind === 'character' && value.avatar) return `character:${value.avatar}`;
    return value.key ? `custom:${value.key}` : '';
}

function normalizeMedia(value) {
    if (!plainObject(value)) return null;
    const kind = ['photo', 'voice', 'file'].includes(value.kind) ? value.kind : '';
    if (!kind) return null;
    return {
        kind,
        description: String(value.description || ''),
        path: String(value.path || ''),
        status: ['pending', 'ready', 'rejected', 'failed'].includes(value.status) ? value.status : 'ready',
    };
}

function normalizeMessage(value, index = 0) {
    if (!plainObject(value)) return null;
    const text = String(value.text ?? '');
    const media = normalizeMedia(value.media || (value.requestKind ? {
        kind: value.requestKind,
        description: value.description,
        status: value.requestStatus,
    } : null));
    if (!text.trim() && !media) return null;
    return {
        id: String(value.id || id('phone_message')),
        user: value.user === true,
        text,
        through: normalizeAnchor(value.through || value.anchor),
        evidence: normalizeEvidence(value.evidence),
        storyTime: String(value.storyTime || ''),
        createdAt: Number(value.createdAt || value.at) || Date.now() + index,
        unread: value.user === true ? false : value.unread === true,
        reaction: String(value.reaction || ''),
        media,
    };
}

function normalizeContact(value, index = 0) {
    if (!plainObject(value)) return null;
    const name = String(value.name || value.personName || '').trim();
    if (!name) return null;
    const actor = normalizeActor(value.actor || value);
    return {
        id: String(value.id || id('contact')),
        actor,
        name,
        personName: String(value.personName || name),
        channel: value.channel === 'social' ? 'social' : 'phone',
        linked: value.linked !== false,
        archived: value.archived === true,
        proactive: value.proactive === true,
        memoryAllowed: value.memoryAllowed === true,
        memoryConsentKey: String(value.memoryConsentKey || ''),
        acquiredThrough: normalizeAnchor(value.acquiredThrough || value.through),
        acquiredEvidence: normalizeEvidence(value.acquiredEvidence || value.evidence),
        privateState: String(value.privateState || ''),
        stateThrough: normalizeAnchor(value.stateThrough),
        availability: String(value.availability || ''),
        pendingReply: value.pendingReply === true,
        style: String(value.style || ''),
        presentation: plainObject(value.presentation) ? clone(value.presentation) : {},
        messages: safeArray(value.messages).map(normalizeMessage).filter(Boolean),
        lastCheckAt: Number(value.lastCheckAt || value.lastCheck) || 0,
        lastStoryTime: String(value.lastStoryTime || value.lastStoryCheck || ''),
        order: Number.isFinite(Number(value.order)) ? Number(value.order) : index,
        createdAt: Number(value.createdAt) || Date.now(),
        updatedAt: Number(value.updatedAt) || Number(value.createdAt) || Date.now(),
    };
}

function normalizeProfile(value, index = 0) {
    if (!plainObject(value)) return null;
    const name = String(value.name || '').trim();
    if (!name) return null;
    return {
        id: String(value.id || id('phone_profile')),
        actor: normalizeActor(value.actor || value),
        name,
        handle: String(value.handle || '').replace(/^@+/, ''),
        bio: String(value.bio || ''),
        picture: String(value.picture || ''),
        fields: plainObject(value.fields) ? clone(value.fields) : {},
        locks: safeArray(value.locks).map(String),
        through: normalizeAnchor(value.through),
        evidence: normalizeEvidence(value.evidence),
        order: Number.isFinite(Number(value.order)) ? Number(value.order) : index,
        createdAt: Number(value.createdAt) || Date.now(),
        updatedAt: Number(value.updatedAt) || Number(value.createdAt) || Date.now(),
    };
}

function normalizePost(value, index = 0) {
    if (!plainObject(value)) return null;
    const text = String(value.text || '').trim();
    const media = normalizeMedia(value.media || (value.photoDescription ? { kind: 'photo', description: value.photoDescription, status: value.photoStatus } : null));
    if (!text && !media) return null;
    return {
        id: String(value.id || id('phone_post')),
        authorActorKey: String(value.authorActorKey || value.author || ''),
        text,
        media,
        through: normalizeAnchor(value.through),
        evidence: normalizeEvidence(value.evidence),
        storyTime: String(value.storyTime || ''),
        createdAt: Number(value.createdAt || value.at) || Date.now() + index,
    };
}

function normalizeAction(value, index = 0) {
    if (!plainObject(value)) return null;
    const text = String(value.text || '').trim();
    if (!text) return null;
    return {
        id: String(value.id || id('phone_action')),
        kind: String(value.kind || 'action'),
        text,
        audience: String(value.audience || 'public'),
        through: normalizeAnchor(value.through),
        evidence: normalizeEvidence(value.evidence),
        storyTime: String(value.storyTime || ''),
        createdAt: Number(value.createdAt || value.at) || Date.now() + index,
    };
}

function defaultSettings() {
    return {
        enabled: false,
        automaticReplies: true,
        incoming: false,
        shareMemory: false,
        incomingPhotos: 'off',
        incomingVoice: 'off',
        historyCount: 100,
        replyLimit: 3000,
        upkeep: {
            enabled: false,
            frequency: 5,
            historyCount: 30,
            replyLimit: 3000,
        },
    };
}

function normalizeSettings(value) {
    const source = plainObject(value) ? value : {};
    const upkeep = plainObject(source.upkeep) ? source.upkeep : {};
    const defaults = defaultSettings();
    return {
        enabled: source.enabled === true,
        automaticReplies: source.automaticReplies !== false,
        incoming: source.incoming === true,
        shareMemory: source.shareMemory === true,
        incomingPhotos: ['off', 'ask', 'on'].includes(source.incomingPhotos) ? source.incomingPhotos : 'off',
        incomingVoice: ['off', 'ask', 'on'].includes(source.incomingVoice) ? source.incomingVoice : 'off',
        historyCount: Math.max(10, Math.min(1000, Number(source.historyCount) || defaults.historyCount)),
        replyLimit: Math.max(800, Math.min(12000, Number(source.replyLimit) || defaults.replyLimit)),
        upkeep: {
            enabled: upkeep.enabled === true,
            frequency: Math.max(1, Math.min(50, Number(upkeep.frequency) || defaults.upkeep.frequency)),
            historyCount: Math.max(4, Math.min(200, Number(upkeep.historyCount) || defaults.upkeep.historyCount)),
            replyLimit: Math.max(800, Math.min(12000, Number(upkeep.replyLimit) || defaults.upkeep.replyLimit)),
        },
    };
}

function normalizeState(value = {}) {
    return {
        schemaVersion: SCHEMA_VERSION,
        version: Math.max(0, Number(value.version) || 0),
        settings: normalizeSettings(value.settings),
        brand: String(value.brand || ''),
        contacts: safeArray(value.contacts).map(normalizeContact).filter(Boolean),
        profiles: safeArray(value.profiles).map(normalizeProfile).filter(Boolean),
        posts: safeArray(value.posts).map(normalizePost).filter(Boolean),
        actions: safeArray(value.actions).map(normalizeAction).filter(Boolean),
        activity: safeArray(value.activity).filter(plainObject).slice(-200).map(clone),
    };
}

function ownerDescriptor() {
    const ref = currentRef();
    if (!ref) return null;
    return {
        id: refKey(ref),
        ref,
        path: String(snowState()?.readChat?.()?.phoneFilePath || ''),
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

async function readPhoneState({ fresh = false } = {}) {
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
        console.warn('[SnowBunny] Could not load Pocket Phone state.', error);
        cacheState = normalizeState();
        cacheKey = owner.id;
        cachePath = owner.path;
        return clone(cacheState);
    }
}

async function writePhoneState(input, { expectedVersion = null } = {}) {
    const api = context();
    const owner = ownerDescriptor();
    if (!owner || !api?.getRequestHeaders) throw new Error('Open a chat before saving Pocket Phone state.');
    if (expectedVersion !== null) {
        const current = await readPhoneState({ fresh: true });
        if (Number(current.version) !== Number(expectedVersion)) throw new Error('Pocket Phone changed while this action was running. Try again.');
    }
    if (owner.id !== refKey(currentRef())) throw new Error('The open chat changed before Pocket Phone could save.');
    const next = normalizeState(input);
    const pathHint = owner.path || cachePath;
    const fileId = pathHint
        ? String(pathHint).split('/').pop()?.replace(/^snowbunny-phone-/, '').replace(/\.json$/i, '') || id('owner')
        : id('owner');
    const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify({
            name: `${FILE_PREFIX}${fileId}.json`,
            data: utf8ToBase64(JSON.stringify(next, null, 2)),
        }),
    });
    if (!response.ok) throw new Error(`Could not save Pocket Phone (${response.status}).`);
    const result = await response.json();
    const path = String(result?.path || pathHint || '');
    if (!path) throw new Error('SillyTavern did not return a Pocket Phone file path.');
    if (path !== owner.path) snowState()?.patchChat?.({ phoneFilePath: path });
    cacheKey = owner.id;
    cachePath = path;
    cacheState = next;
    document.dispatchEvent(new CustomEvent('snowbunny:phone-changed', {
        detail: { chatRef: clone(owner.ref), version: next.version },
    }));
    return clone(next);
}

async function mutatePhoneState(mutator) {
    const ownerAtStart = ownerDescriptor();
    if (!ownerAtStart) throw new Error('Open a chat before changing Pocket Phone.');
    const current = await readPhoneState({ fresh: true });
    const draft = clone(current);
    const result = await mutator(draft);
    if (ownerAtStart.id !== ownerDescriptor()?.id) throw new Error('The open chat changed while Pocket Phone was updating.');
    draft.version = current.version + 1;
    const state = await writePhoneState(draft, { expectedVersion: current.version });
    return { state, result };
}

function sourceValid(source) {
    const expected = normalizeEvidence(source);
    if (!expected.length) return true;
    const current = new Map(visibleStoryIdentities().map(item => [item.id, item]));
    return expected.every(item => {
        const actual = current.get(item.messageId);
        return actual && actual.revision === item.revision && actual.source === item.source;
    });
}

function anchorVisible(anchor, endMessageId = '') {
    const normalized = normalizeAnchor(anchor);
    if (!normalized.messageId) return true;
    const visible = visibleStoryIdentities();
    const position = visible.findIndex(item => item.id === normalized.messageId);
    if (position < 0) return false;
    if (!endMessageId) return true;
    const end = visible.findIndex(item => item.id === String(endMessageId));
    return end < 0 ? true : position <= end;
}

async function setSettings(patch = {}) {
    return (await mutatePhoneState(state => {
        state.settings = normalizeSettings({
            ...state.settings,
            ...patch,
            upkeep: patch.upkeep ? { ...state.settings.upkeep, ...patch.upkeep } : state.settings.upkeep,
        });
    })).state.settings;
}

async function upsertContact(input) {
    return (await mutatePhoneState(state => {
        const contact = normalizeContact(input, state.contacts.length);
        if (!contact) throw new Error('Pocket Phone contact needs a name.');
        const index = state.contacts.findIndex(item => item.id === contact.id);
        if (index >= 0) state.contacts[index] = { ...contact, createdAt: state.contacts[index].createdAt, updatedAt: Date.now() };
        else state.contacts.push(contact);
        return clone(contact);
    })).result;
}

async function appendMessage(contactId, input) {
    return (await mutatePhoneState(state => {
        const contact = state.contacts.find(item => item.id === contactId && !item.archived);
        if (!contact) throw new Error('That Pocket Phone contact no longer exists.');
        const message = normalizeMessage({ ...input, through: input?.through || currentStoryAnchor() }, contact.messages.length);
        if (!message) throw new Error('A phone message needs text or delivered media.');
        contact.messages.push(message);
        contact.pendingReply = message.user === true;
        contact.updatedAt = Date.now();
        return clone(message);
    })).result;
}

async function appendAction(input) {
    return (await mutatePhoneState(state => {
        const action = normalizeAction({ ...input, through: input?.through || currentStoryAnchor() }, state.actions.length);
        if (!action) throw new Error('A Pocket Phone action needs text.');
        state.actions.push(action);
        return clone(action);
    })).result;
}

async function appendPost(input) {
    return (await mutatePhoneState(state => {
        const post = normalizePost({ ...input, through: input?.through || currentStoryAnchor() }, state.posts.length);
        if (!post) throw new Error('A Pocket Phone post needs text or delivered media.');
        state.posts.push(post);
        return clone(post);
    })).result;
}

function getContactFromState(state, contactId) {
    return safeArray(state?.contacts).find(item => item.id === contactId) || null;
}

async function getContact(contactId, options = {}) {
    return clone(getContactFromState(await readPhoneState(options), contactId));
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, resetCache);
    }
}

export function initPhoneStore() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phone: {
            read: readPhoneState,
            write: writePhoneState,
            mutate: mutatePhoneState,
            normalize: normalizeState,
            currentRef,
            refKey,
            currentStoryAnchor,
            visibleStoryIdentities,
            sourceValid,
            anchorVisible,
            actorKey,
            normalizeActor,
            setSettings,
            upsertContact,
            appendMessage,
            appendAction,
            appendPost,
            getContact,
            getContactFromState,
        },
    };
}