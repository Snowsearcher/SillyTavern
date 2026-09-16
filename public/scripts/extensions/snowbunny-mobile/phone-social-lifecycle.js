const WORKSPACE_ID = 'snowbunny-phone-workspace';

let initialized = false;
let observer = null;
let queued = false;
let attemptedOwners = new Set();

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function social() {
    return globalThis.SnowBunny?.phoneSocial ?? null;
}

function world() {
    return globalThis.SnowBunny?.phoneSocialWorld ?? null;
}

function stateApi() {
    return globalThis.SnowBunny?.state ?? null;
}

function ownerKey() {
    const storyId = String(stateApi()?.readChat?.()?.storyId || '');
    if (storyId) return `story:${storyId}`;
    const store = phone();
    return `chat:${store?.refKey?.(store.currentRef?.()) || context()?.getCurrentChatId?.() || ''}`;
}

function eventVisible(value) {
    const store = phone();
    return store?.anchorVisible?.(value?.through) !== false && store?.sourceValid?.(value?.evidence) !== false;
}

function socialSurfaceOpen(root, network) {
    if (!root || !network) return false;
    if (root.querySelector('.sb-phone-app-grid')) return false;
    const heading = root.querySelector('.sb-phone-head h2')?.textContent?.trim() || '';
    return heading === String(network.name || 'Social');
}

async function ensureInitialWorld() {
    const root = document.getElementById(WORKSPACE_ID);
    if (!root) return;
    const network = social()?.read?.();
    if (!socialSurfaceOpen(root, network)) return;
    const store = phone();
    const engine = world();
    if (!store || !engine?.ensure) return;
    const state = await store.read();
    if (state?.settings?.enabled !== true) return;
    if ((state.posts || []).some(eventVisible)) return;

    const key = ownerKey();
    if (!key || attemptedOwners.has(key)) return;
    attemptedOwners.add(key);

    const empty = root.querySelector('.sb-phone-empty');
    if (empty) empty.textContent = `Preparing ${network?.name || 'the public network'} from this Story…`;
    try {
        await engine.ensure();
    } catch (error) {
        console.warn('[SnowBunny] Could not prepare the public social world.', error);
        if (document.contains(empty)) empty.textContent = `${network?.name || 'The public network'} could not be prepared yet. Existing Phone state was kept.`;
    }
}

function queueInitialWorld() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        void ensureInitialWorld();
    });
}

async function maintainAfterUpkeep() {
    const engine = world();
    const store = phone();
    if (!engine?.refresh || !store) return;
    const state = await store.read();
    if (state?.settings?.enabled !== true) return;
    try {
        await engine.refresh();
    } catch (error) {
        console.warn('[SnowBunny] Public social-world upkeep failed.', error);
    }
}

function reset() {
    attemptedOwners = new Set();
    queueInitialWorld();
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (source?.on && types) {
        for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
            const event = types[name];
            if (event) source.on(event, reset);
        }
    }
    document.addEventListener('snowbunny:phone-upkeep-complete', () => void maintainAfterUpkeep());
    document.addEventListener('snowbunny:phone-network-changed', queueInitialWorld);
    document.addEventListener('snowbunny:phone-changed', queueInitialWorld);
}

export function initPhoneSocialLifecycle() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    observer = new MutationObserver(queueInitialWorld);
    observer.observe(document.body, { childList: true, subtree: true });
    queueInitialWorld();
}