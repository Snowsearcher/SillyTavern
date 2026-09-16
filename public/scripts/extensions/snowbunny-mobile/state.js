export const SNOWBUNNY_STATE_VERSION = 1;
const NAMESPACE = 'snowbunny';

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function plainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

export function ensureGlobalState() {
    const api = context();
    const settings = api?.extensionSettings;
    if (!plainObject(settings)) return null;

    if (!plainObject(settings[NAMESPACE])) {
        settings[NAMESPACE] = { version: SNOWBUNNY_STATE_VERSION };
        api.saveSettingsDebounced?.();
    } else if (!Number.isInteger(settings[NAMESPACE].version)) {
        settings[NAMESPACE].version = SNOWBUNNY_STATE_VERSION;
        api.saveSettingsDebounced?.();
    }

    return settings[NAMESPACE];
}

export function readGlobalState() {
    const state = ensureGlobalState();
    return state ? clone(state) : null;
}

export function patchGlobalState(patch) {
    if (!plainObject(patch)) throw new TypeError('SnowBunny global state patch must be an object.');
    const state = ensureGlobalState();
    const api = context();
    if (!state || !api) return null;

    Object.assign(state, clone(patch), { version: SNOWBUNNY_STATE_VERSION });
    api.saveSettingsDebounced?.();
    return clone(state);
}

export function ensureChatState() {
    const api = context();
    const metadata = api?.chatMetadata;
    if (!plainObject(metadata) || !api?.getCurrentChatId?.()) return null;

    if (!plainObject(metadata[NAMESPACE])) {
        metadata[NAMESPACE] = { version: SNOWBUNNY_STATE_VERSION };
        api.saveMetadataDebounced?.();
    } else if (!Number.isInteger(metadata[NAMESPACE].version)) {
        metadata[NAMESPACE].version = SNOWBUNNY_STATE_VERSION;
        api.saveMetadataDebounced?.();
    }

    return metadata[NAMESPACE];
}

export function readChatState() {
    const state = ensureChatState();
    return state ? clone(state) : null;
}

export function patchChatState(patch) {
    if (!plainObject(patch)) throw new TypeError('SnowBunny chat state patch must be an object.');
    const state = ensureChatState();
    const api = context();
    if (!state || !api) return null;

    Object.assign(state, clone(patch), { version: SNOWBUNNY_STATE_VERSION });
    api.saveMetadataDebounced?.();
    return clone(state);
}

export function deleteChatStateKey(key) {
    if (typeof key !== 'string' || !key) return false;
    const state = ensureChatState();
    const api = context();
    if (!state || !Object.hasOwn(state, key)) return false;

    delete state[key];
    api.saveMetadataDebounced?.();
    return true;
}

export function initSnowBunnyState() {
    ensureGlobalState();
    ensureChatState();

    const api = context();
    const changed = api?.eventTypes?.CHAT_CHANGED;
    const loaded = api?.eventTypes?.CHAT_LOADED;
    if (typeof api?.eventSource?.on === 'function') {
        if (changed) api.eventSource.on(changed, ensureChatState);
        if (loaded) api.eventSource.on(loaded, ensureChatState);
    }
}
