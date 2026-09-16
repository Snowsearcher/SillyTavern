const NAMESPACE = 'snowbunny';
const SAVE_DELAY_MS = 350;

let initialized = false;
let saveTimer = null;
let saveInFlight = false;
let saveAgain = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function stableId(api) {
    if (typeof api?.uuidv4 === 'function') return api.uuidv4();
    if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
    const random = crypto?.getRandomValues?.(new Uint32Array(4)) ?? [Date.now(), Math.random() * 0xffffffff, 0, 0];
    return [...random].map(value => Number(value).toString(16).padStart(8, '0')).join('-');
}

function fingerprintText(value) {
    let hash = 0x811c9dc5;
    const text = String(value ?? '');
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export function messageFingerprint(message, api = context()) {
    const ignoreKey = api?.symbols?.ignore;
    const hidden = Boolean(ignoreKey && message?.extra?.[ignoreKey]);
    const material = JSON.stringify({
        role: message?.is_user ? 'user' : message?.is_system ? 'system' : 'assistant',
        name: message?.name ?? '',
        mes: message?.mes ?? '',
        swipeId: Number.isInteger(message?.swipe_id) ? message.swipe_id : null,
        hidden,
    });
    return fingerprintText(material);
}

function messageMeta(message) {
    if (!message.extra || typeof message.extra !== 'object' || Array.isArray(message.extra)) {
        message.extra = {};
    }
    if (!message.extra[NAMESPACE] || typeof message.extra[NAMESPACE] !== 'object' || Array.isArray(message.extra[NAMESPACE])) {
        message.extra[NAMESPACE] = {};
    }
    return message.extra[NAMESPACE];
}

function validId(value) {
    return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}

export function ensureMessageIdentity(message, api = context()) {
    if (!message || typeof message !== 'object') return false;

    const meta = messageMeta(message);
    let changed = false;

    if (!validId(meta.id)) {
        meta.id = stableId(api);
        meta.revision = 1;
        changed = true;
    }

    const source = messageFingerprint(message, api);
    if (meta.source !== source) {
        if (meta.source !== undefined) {
            meta.revision = Math.max(1, Number(meta.revision) || 1) + 1;
        } else if (!Number.isInteger(meta.revision) || meta.revision < 1) {
            meta.revision = 1;
        }
        meta.source = source;
        changed = true;
    }

    return changed;
}

export function currentMessageIdentity(message) {
    const meta = message?.extra?.[NAMESPACE];
    if (!meta || !validId(meta.id)) return null;
    return {
        id: meta.id,
        revision: Math.max(1, Number(meta.revision) || 1),
        source: typeof meta.source === 'string' ? meta.source : null,
    };
}

async function flushSave() {
    if (saveInFlight) {
        saveAgain = true;
        return;
    }

    const api = context();
    if (!api?.getCurrentChatId?.() || typeof api?.saveChat !== 'function') return;

    saveInFlight = true;
    try {
        await api.saveChat();
    } catch (error) {
        console.warn('[SnowBunny] Could not persist message identities.', error);
    } finally {
        saveInFlight = false;
        if (saveAgain) {
            saveAgain = false;
            scheduleSave();
        }
    }
}

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flushSave(), SAVE_DELAY_MS);
}

export function reconcileMessageIdentities({ persist = true } = {}) {
    const api = context();
    const chat = api?.chat;
    if (!Array.isArray(chat) || !api?.getCurrentChatId?.()) return false;

    let changed = false;
    for (const message of chat) {
        changed = ensureMessageIdentity(message, api) || changed;
    }

    if (changed && persist) scheduleSave();
    return changed;
}

function registerEvent(api, eventName) {
    const event = api?.eventTypes?.[eventName];
    if (!event || typeof api?.eventSource?.on !== 'function') return;
    api.eventSource.on(event, () => reconcileMessageIdentities());
}

export function initMessageIdentity() {
    if (initialized) return;
    initialized = true;

    const api = context();
    reconcileMessageIdentities();

    for (const eventName of [
        'CHAT_CHANGED',
        'CHAT_LOADED',
        'MESSAGE_SENT',
        'MESSAGE_RECEIVED',
        'MESSAGE_EDITED',
        'MESSAGE_UPDATED',
        'MESSAGE_SWIPED',
        'MESSAGE_SWIPE_DELETED',
        'MESSAGE_FILE_EMBEDDED',
        'MEDIA_ATTACHMENT_DELETED',
        'MORE_MESSAGES_LOADED',
    ]) {
        registerEvent(api, eventName);
    }
}
