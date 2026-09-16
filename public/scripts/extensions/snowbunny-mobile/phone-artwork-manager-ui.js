const WORKSPACE_ID = 'snowbunny-phone-workspace';
const STYLE_ID = 'snowbunny-phone-artwork-manager-ui-style';
const MANAGER_ID = 'snowbunny-phone-artwork-manager';

let initialized = false;
let observer = null;
let queued = false;
let rendering = false;
let expanded = false;

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function artwork() {
    return globalThis.SnowBunny?.phoneArtwork ?? null;
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

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${MANAGER_ID} { display: grid; gap: 8px; }
  #${MANAGER_ID} .sb-phone-artwork-manager-toggle {
    width: 100%; min-height: 40px; display: flex; align-items: center; gap: 9px;
    padding: 0; border: 0; background: transparent; color: inherit; text-align: left; font: inherit; font-weight: 760;
  }
  #${MANAGER_ID} .sb-phone-artwork-manager-toggle span { flex: 1; }
  #${MANAGER_ID} .sb-phone-artwork-manager-help { margin-top: -3px; font-size: .65rem; line-height: 1.4; opacity: .56; }
  #${MANAGER_ID} .sb-phone-artwork-section { display: grid; gap: 7px; padding-top: 5px; }
  #${MANAGER_ID} .sb-phone-artwork-section > h4 { margin: 3px 2px 0; font-size: .68rem; opacity: .62; }
  #${MANAGER_ID} .sb-phone-artwork-row {
    display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 9px; align-items: center;
    padding: 8px; border-radius: 14px; background: color-mix(in srgb, currentColor 4%, transparent);
  }
  #${MANAGER_ID} .sb-phone-artwork-preview {
    width: 44px; height: 44px; overflow: hidden; display: grid; place-items: center; border-radius: 14px;
    background: color-mix(in srgb, currentColor 8%, transparent); font-size: .82rem;
  }
  #${MANAGER_ID} .sb-phone-artwork-preview img { width: 100%; height: 100%; display: block; object-fit: cover; }
  #${MANAGER_ID} .sb-phone-artwork-copy { min-width: 0; }
  #${MANAGER_ID} .sb-phone-artwork-copy strong,
  #${MANAGER_ID} .sb-phone-artwork-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${MANAGER_ID} .sb-phone-artwork-copy strong { font-size: .74rem; }
  #${MANAGER_ID} .sb-phone-artwork-copy small { margin-top: 2px; font-size: .61rem; opacity: .52; }
  #${MANAGER_ID} .sb-phone-artwork-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 7px; }
  #${MANAGER_ID} .sb-phone-artwork-actions button {
    min-height: 32px; padding: 6px 7px; border: 0; border-radius: 10px;
    background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; font: inherit; font-size: .62rem; font-weight: 720;
  }
}
`;
    document.head.append(style);
}

function workspace() {
    return document.getElementById(WORKSPACE_ID);
}

function eventVisible(value) {
    const store = phone();
    return store?.anchorVisible?.(value?.through) !== false && store?.sourceValid?.(value?.evidence) !== false;
}

function contactVisible(contact) {
    const store = phone();
    return store?.anchorVisible?.(contact?.acquiredThrough) !== false && store?.sourceValid?.(contact?.acquiredEvidence) !== false;
}

function preview(source, fallbackIcon = 'fa-user') {
    const host = el('div', 'sb-phone-artwork-preview');
    if (source) {
        const image = new Image();
        image.src = source;
        image.alt = '';
        host.append(image);
    } else host.append(icon(fallbackIcon));
    return host;
}

function rowShell(name, detail, source) {
    const row = el('div', 'sb-phone-artwork-row');
    const content = el('div', 'sb-phone-artwork-copy');
    content.append(el('strong', '', name || 'Unnamed'), el('small', '', detail));
    row.append(preview(source), content);
    return { row, content };
}

function actionButtons(content, onChoose, onDefault) {
    const actions = el('div', 'sb-phone-artwork-actions');
    const choose = el('button', '', 'Change');
    choose.type = 'button';
    const reset = el('button', '', 'Default');
    reset.type = 'button';
    const run = async task => {
        choose.disabled = true;
        reset.disabled = true;
        try {
            await task();
            queueRefresh();
        } catch (error) {
            console.warn('[SnowBunny] Could not update Pocket Phone artwork.', error);
        } finally {
            choose.disabled = false;
            reset.disabled = false;
        }
    };
    choose.addEventListener('click', () => void run(onChoose));
    reset.addEventListener('click', () => void run(onDefault));
    actions.append(choose, reset);
    content.append(actions);
}

function publicRows(state) {
    const profiles = (state?.profiles || []).filter(eventVisible);
    return profiles.sort((a, b) => {
        const aPlayer = String(a?.actor?.key || '') === 'player-public' ? 0 : 1;
        const bPlayer = String(b?.actor?.key || '') === 'player-public' ? 0 : 1;
        return aPlayer - bPlayer || String(a.name || '').localeCompare(String(b.name || ''));
    });
}

function privateRows(state) {
    return (state?.contacts || [])
        .filter(contact => !contact.archived && contactVisible(contact))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

function publicSection(state) {
    const section = el('section', 'sb-phone-artwork-section');
    section.append(el('h4', '', 'Public profiles'));
    const rows = publicRows(state);
    if (!rows.length) {
        section.append(el('div', 'sb-phone-artwork-manager-help', 'No public profiles exist on this Story branch yet.'));
        return section;
    }
    for (const profile of rows) {
        const source = artwork()?.profilePicture?.(profile) || '';
        const detail = String(profile?.actor?.key || '') === 'player-public'
            ? 'Your public Story-network profile'
            : profile.handle ? `@${profile.handle}` : 'Public Story-network identity';
        const { row, content } = rowShell(profile.name, detail, source);
        actionButtons(
            content,
            () => artwork()?.choosePublicProfilePicture?.(profile.id, { prefix: 'public-profile' }),
            () => artwork()?.setPublicProfilePicture?.(profile.id, ''),
        );
        section.append(row);
    }
    return section;
}

function privateSection(state) {
    const section = el('section', 'sb-phone-artwork-section');
    section.append(el('h4', '', 'Private contacts'));
    const rows = privateRows(state);
    if (!rows.length) {
        section.append(el('div', 'sb-phone-artwork-manager-help', 'No acquired private contacts are available on this branch.'));
        return section;
    }
    for (const contact of rows) {
        const { row, content } = rowShell(contact.name, 'Private contact presentation', artwork()?.contactPicture?.(contact) || '');
        actionButtons(
            content,
            () => artwork()?.chooseContactPicture?.(contact.id, { prefix: 'contact-profile' }),
            () => artwork()?.setContactPicture?.(contact.id, ''),
        );
        section.append(row);
    }
    return section;
}

async function renderManager() {
    const root = workspace();
    if (root?.dataset?.snowbunnyPhoneView !== 'settings') return;
    const settings = root.querySelector('.sb-phone-settings');
    const store = phone();
    if (!settings || !store?.read) return;
    const existing = document.getElementById(MANAGER_ID);
    if (existing && existing.dataset.expanded === String(expanded)) return;
    existing?.remove();

    const state = await store.read();
    if (workspace()?.dataset?.snowbunnyPhoneView !== 'settings') return;
    const card = el('div', 'sb-phone-setting');
    card.id = MANAGER_ID;
    card.dataset.expanded = String(expanded);
    const toggle = el('button', 'sb-phone-artwork-manager-toggle');
    toggle.type = 'button';
    toggle.append(icon('fa-images'), el('span', '', 'Profiles & pictures'), icon(expanded ? 'fa-chevron-up' : 'fa-chevron-down'));
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.addEventListener('click', () => {
        expanded = !expanded;
        queueRefresh(true);
    });
    card.append(toggle, el('div', 'sb-phone-artwork-manager-help', 'Pictures change Phone presentation only. They do not create contacts, change Character cards, or alter public identity.'));
    if (expanded) card.append(publicSection(state), privateSection(state));
    settings.prepend(card);
}

function uniqueContactByName(contacts) {
    const map = new Map();
    for (const contact of contacts) {
        const name = String(contact.name || '').trim().toLocaleLowerCase();
        if (!name) continue;
        const rows = map.get(name) || [];
        rows.push(contact);
        map.set(name, rows);
    }
    return map;
}

async function decorateMessageContacts() {
    const root = workspace();
    if (root?.dataset?.snowbunnyPhoneView !== 'messages') return;
    const store = phone();
    if (!store?.read) return;
    const state = await store.read();
    if (workspace()?.dataset?.snowbunnyPhoneView !== 'messages') return;
    const contacts = privateRows(state);
    const byName = uniqueContactByName(contacts);
    for (const row of root.querySelectorAll('.sb-phone-contact:not([data-snowbunny-contact-art])')) {
        row.dataset.snowbunnyContactArt = '1';
        const name = String(row.querySelector('.sb-phone-contact-copy strong')?.textContent || '').trim().toLocaleLowerCase();
        const matches = byName.get(name) || [];
        if (matches.length !== 1) continue;
        const source = artwork()?.contactPicture?.(matches[0]) || '';
        if (!source) continue;
        const host = row.querySelector('.sb-phone-contact-avatar');
        if (!host) continue;
        const image = new Image();
        image.src = source;
        image.alt = '';
        host.replaceChildren(image);
    }
}

async function refresh() {
    queued = false;
    if (rendering) return;
    rendering = true;
    try {
        await renderManager();
        await decorateMessageContacts();
    } finally {
        rendering = false;
    }
}

function queueRefresh(force = false) {
    if (force) document.getElementById(MANAGER_ID)?.remove();
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => void refresh());
}

function reset() {
    expanded = false;
    queueRefresh(true);
}

export function initPhoneArtworkManagerUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(() => queueRefresh());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('snowbunny:phone-changed', () => queueRefresh(true));
    document.addEventListener('snowbunny:open-phone', queueRefresh);
    document.addEventListener('snowbunny:phone-social-opened', queueRefresh);
    const api = globalThis.SillyTavern?.getContext?.();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (source?.on && types) {
        for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
            const event = types[name];
            if (event) source.on(event, reset);
        }
    }
    queueRefresh();
}
