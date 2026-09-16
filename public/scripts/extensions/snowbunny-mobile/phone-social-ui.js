const WORKSPACE_ID = 'snowbunny-phone-workspace';

let initialized = false;
let observer = null;
let queued = false;
let ensureBusy = false;

function social() {
    return globalThis.SnowBunny?.phoneSocial ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function phoneUi() {
    return globalThis.SnowBunny?.phoneUi ?? null;
}

function replaceText(root, from, to) {
    if (!root || !from || from === to) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const rows = [];
    while (walker.nextNode()) rows.push(walker.currentNode);
    for (const node of rows) {
        if (node.nodeValue?.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to);
    }
}

function socialButton(root) {
    return [...root.querySelectorAll('.sb-phone-app')].find(button => {
        const text = button.querySelector('strong')?.textContent?.trim() || '';
        return button.dataset.snowbunnySocial === '1' || text === 'Nightowl' || text === 'Social';
    }) || null;
}

function applyNetwork(root) {
    if (!root) return;
    const network = social()?.read?.();
    if (!network) return;
    root.dataset.socialMode = network.mode || 'hybrid';
    root.dataset.socialNetwork = network.name || 'Social';

    replaceText(root, 'Nightowl', network.name || 'Social');

    const button = socialButton(root);
    if (button) {
        button.dataset.snowbunnySocial = '1';
        const label = button.querySelector('strong');
        if (label) label.textContent = network.name || 'Social';
        const oldIcon = button.querySelector('i');
        if (oldIcon) oldIcon.className = `fa-solid ${social()?.iconClass?.(network.iconId) || 'fa-globe'}`;
        button.title = network.description || `${network.name || 'Social'} public network`;
        button.setAttribute('aria-label', `Open ${network.name || 'Social'}`);
    }

    const heading = root.querySelector('.sb-phone-head h2');
    if (heading?.textContent?.trim() === 'Social') heading.textContent = network.name || 'Social';
}

async function ensureStoryNetwork(root) {
    if (ensureBusy || !root || social()?.readSaved?.()) return;
    const state = await phone()?.read?.();
    if (state?.settings?.enabled !== true) return;
    ensureBusy = true;
    try {
        await social()?.ensure?.();
        applyNetwork(document.getElementById(WORKSPACE_ID));
    } catch (error) {
        console.warn('[SnowBunny] Could not design this Story social network yet.', error);
    } finally {
        ensureBusy = false;
    }
}

function refresh() {
    queued = false;
    const root = document.getElementById(WORKSPACE_ID);
    if (!root) return;
    applyNetwork(root);
    void ensureStoryNetwork(root);
}

function queueRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
}

function installCompatibilityAlias() {
    const ui = phoneUi();
    if (!ui || ui.openSocial) return;
    if (typeof ui.openNightowl === 'function') ui.openSocial = ui.openNightowl;
}

export function initPhoneSocialUi() {
    if (initialized) return;
    initialized = true;
    installCompatibilityAlias();
    observer = new MutationObserver(queueRefresh);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('snowbunny:phone-network-changed', queueRefresh);
    document.addEventListener('snowbunny:phone-changed', queueRefresh);
    queueRefresh();
}