const WORKSPACE_ID = 'snowbunny-phone-workspace';
const CARD_ID = 'snowbunny-phone-history-status';

let initialized = false;
let observer = null;
let queued = false;

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function historyStatus() {
    return globalThis.SnowBunny?.phoneHistoryStatus ?? null;
}

function el(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function icon(name) {
    const node = el('i', `fa-solid ${name}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
}

function workspace() {
    return document.getElementById(WORKSPACE_ID);
}

function categoryText(report) {
    const labels = [
        ['contacts', 'contact'],
        ['messages', 'message'],
        ['profiles', 'public profile'],
        ['posts', 'public item'],
        ['actions', 'Phone action'],
    ];
    return labels
        .filter(([key]) => Number(report?.stale?.[key] || 0) > 0)
        .map(([key, label]) => {
            const count = Number(report.stale[key]);
            return `${count} ${label}${count === 1 ? '' : 's'}`;
        })
        .join(' · ');
}

async function render() {
    queued = false;
    const root = workspace();
    if (root?.dataset?.snowbunnyPhoneView !== 'settings') return;
    const settings = root.querySelector('.sb-phone-settings');
    const store = phone();
    if (!settings || !store?.read || !historyStatus()?.inspect) return;

    const state = await store.read();
    if (workspace()?.dataset?.snowbunnyPhoneView !== 'settings') return;
    const report = historyStatus().inspect(state);
    document.getElementById(CARD_ID)?.remove();

    const card = el('div', 'sb-phone-setting');
    card.id = CARD_ID;
    const title = el('label');
    title.append(icon(report.staleTotal ? 'fa-code-branch' : 'fa-circle-check'), el('span', '', 'Phone continuity'));
    card.append(title);

    if (!report.staleTotal) {
        card.append(el('small', '', 'Current Phone history matches the active Story branch.'));
    } else {
        card.append(
            el('small', '', `${report.staleTotal} stored Phone item${report.staleTotal === 1 ? '' : 's'} no longer match the active Story branch and are excluded from current generation/context.`),
            el('small', '', categoryText(report)),
            el('small', '', 'The old material is kept for recovery. SnowBunny does not silently rewrite it into the new branch.'),
        );
    }
    settings.append(card);
}

function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => void render());
}

export function initPhoneHistoryStatusUi() {
    if (initialized) return;
    initialized = true;
    observer = new MutationObserver(queueRender);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('snowbunny:phone-changed', queueRender);
    document.addEventListener('snowbunny:open-phone', queueRender);
    const api = globalThis.SillyTavern?.getContext?.();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (source?.on && types) {
        for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
            const event = types[name];
            if (event) source.on(event, queueRender);
        }
    }
    queueRender();
}
