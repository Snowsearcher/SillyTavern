const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';

let initialized = false;
let queued = false;
let observer = null;

function agents() {
    return globalThis.SnowBunny?.agents ?? null;
}

function trackers() {
    return globalThis.SnowBunny?.trackers ?? null;
}

function agentsRow() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Agents',
    ) ?? null;
}

async function render() {
    queued = false;
    const row = agentsRow();
    if (!(row instanceof HTMLButtonElement) || !agents()) return;
    const [custom, tracker] = await Promise.all([
        agents().read(),
        trackers()?.read?.() ?? Promise.resolve(null),
    ]);
    const active = (custom.definitions || []).filter(definition => definition.enabled).length
        + (tracker?.settings?.automatic === false ? 0 : 1);
    const failed = Object.values(custom.status || {}).filter(status => status?.status === 'failed').length;
    const value = row.querySelector('.snowbunny-shell-row-value');
    if (value) value.textContent = failed ? `${failed} failed` : active ? `${active} active` : 'Off';
}

function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => void render());
}

export function initCustomAgentDrawerCount() {
    if (initialized) return;
    initialized = true;
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueRender);
        observer.observe(drawer, { childList: true, subtree: true });
    }
    for (const name of ['snowbunny:agents-changed', 'snowbunny:agent-result-ready', 'snowbunny:agent-results-reconciled', 'snowbunny:tracker-state-changed', 'snowbunny:shell-open']) {
        document.addEventListener(name, queueRender);
    }
    queueRender();
}
