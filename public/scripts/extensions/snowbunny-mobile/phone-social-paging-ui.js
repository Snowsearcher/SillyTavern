const WORKSPACE_ID = 'snowbunny-phone-workspace';
const STYLE_ID = 'snowbunny-phone-social-paging-ui-style';
const CONTROL_CLASS = 'sb-phone-social-page-more';
const PAGE_SIZE = 30;

let initialized = false;
let observer = null;
let queued = false;
let applying = false;
let detached = [];
const limits = new Map();

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

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${WORKSPACE_ID} .${CONTROL_CLASS} {
    width: 100%; min-height: 40px; display: flex; align-items: center; justify-content: center; gap: 8px;
    margin: 9px 0 3px; padding: 8px 11px; border: 0; border-radius: 13px;
    background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; font: inherit;
    font-size: .69rem; font-weight: 760;
  }
  #${WORKSPACE_ID} .${CONTROL_CLASS} small { font-size: .6rem; font-weight: 600; opacity: .55; }
}
`;
    document.head.append(style);
}

function root() {
    const node = document.getElementById(WORKSPACE_ID);
    return node?.dataset?.snowbunnyPhoneView === 'social' ? node : null;
}

function body() {
    return root()?.querySelector('.sb-phone-body') || null;
}

function isFeed(host) {
    return Boolean(
        host
        && host.querySelector('.sb-phone-social-tabs')
        && !host.querySelector('.sb-phone-social-back')
        && !host.querySelector('.sb-phone-social-compose'),
    );
}

function activeTab(host) {
    return String(host?.querySelector('.sb-phone-social-tabs .active')?.textContent || 'home').trim();
}

function feedKey(host) {
    const shell = root();
    return [
        shell?.dataset?.socialNetwork || '',
        shell?.dataset?.socialMode || '',
        activeTab(host),
    ].join('::');
}

function cardRows(host) {
    const rows = [];
    for (const child of host.children) {
        if (child.classList.contains('sb-phone-social-card')) {
            rows.push({ node: child, parent: host, section: null });
            continue;
        }
        if (child.classList.contains('sb-phone-social-section')) {
            for (const card of child.children) {
                if (card.classList.contains('sb-phone-social-card')) rows.push({ node: card, parent: child, section: child });
            }
            continue;
        }
        if (child.classList.contains('sb-phone-social-image-grid')) {
            for (const card of child.children) {
                if (card.classList.contains('sb-phone-social-card')) rows.push({ node: card, parent: child, section: null });
            }
        }
    }
    return rows;
}

function updateEmptySections(host) {
    for (const section of host.querySelectorAll('.sb-phone-social-section')) {
        section.hidden = !section.querySelector('.sb-phone-social-card');
    }
}

function removeControls(host) {
    host?.querySelector(`.${CONTROL_CLASS}`)?.remove();
}

function resetDetached() {
    detached = [];
}

function restoreRows(count, control) {
    if (!detached.length || count <= 0) return;
    applying = true;
    try {
        const rows = detached.splice(0, count);
        for (const row of rows) {
            if (!row.parent?.isConnected) continue;
            if (row.parent === control.parentElement) row.parent.insertBefore(row.node, control);
            else row.parent.append(row.node);
        }
        updateEmptySections(control.parentElement);
    } finally {
        applying = false;
    }
}

function controlFor(host, key) {
    if (!detached.length) return null;
    const remaining = detached.length;
    const next = Math.min(PAGE_SIZE, remaining);
    const button = el('button', CONTROL_CLASS);
    button.type = 'button';
    button.append(icon('fa-chevron-down'), el('span', '', `Show ${next} more`), el('small', '', `${remaining} older item${remaining === 1 ? '' : 's'}`));
    button.addEventListener('click', () => {
        const current = limits.get(key) || PAGE_SIZE;
        limits.set(key, current + next);
        restoreRows(next, button);
        if (!detached.length) button.remove();
        else {
            const left = detached.length;
            const nextCount = Math.min(PAGE_SIZE, left);
            button.querySelector('span').textContent = `Show ${nextCount} more`;
            button.querySelector('small').textContent = `${left} older item${left === 1 ? '' : 's'}`;
        }
    });
    return button;
}

function paginate() {
    queued = false;
    if (applying) return;
    const host = body();
    if (!isFeed(host)) {
        resetDetached();
        return;
    }

    const renderSignature = String(host.dataset.snowbunnySocialSignature || '');
    const key = feedKey(host);
    const marker = `${renderSignature}::${key}`;
    if (host.dataset.snowbunnyPagingSignature === marker && host.querySelector(`.${CONTROL_CLASS}`)) return;
    if (host.dataset.snowbunnyPagingSignature === marker && !detached.length) return;

    applying = true;
    try {
        resetDetached();
        removeControls(host);
        for (const section of host.querySelectorAll('.sb-phone-social-section')) section.hidden = false;

        const rows = cardRows(host);
        const limit = Math.max(PAGE_SIZE, Number(limits.get(key)) || PAGE_SIZE);
        limits.set(key, limit);
        if (rows.length > limit) {
            const overflow = rows.slice(limit);
            for (const row of overflow) {
                if (!row.node.isConnected) continue;
                row.node.remove();
                detached.push(row);
            }
            updateEmptySections(host);
            const control = controlFor(host, key);
            if (control) host.append(control);
        }
        host.dataset.snowbunnyPagingSignature = marker;
    } finally {
        applying = false;
    }
}

function queuePaginate() {
    if (applying || queued) return;
    queued = true;
    requestAnimationFrame(paginate);
}

function reset() {
    limits.clear();
    resetDetached();
    const host = body();
    if (host) delete host.dataset.snowbunnyPagingSignature;
    queuePaginate();
}

export function initPhoneSocialPagingUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(queuePaginate);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('snowbunny:phone-social-opened', reset);
    document.addEventListener('snowbunny:phone-network-changed', reset);
    document.addEventListener('snowbunny:phone-changed', queuePaginate);
    queuePaginate();
}
