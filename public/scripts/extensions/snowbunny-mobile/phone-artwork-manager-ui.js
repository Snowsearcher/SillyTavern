const WORKSPACE_ID = 'snowbunny-phone-workspace';
const STYLE_ID = 'snowbunny-phone-artwork-manager-ui-style';
const MANAGER_ID = 'snowbunny-phone-artwork-manager';

let initialized = false;
let observer = null;
let queued = false;
let rendering = false;
let expanded = false;
let expandedFolderId = '';
let assignmentTarget = null;

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function artwork() {
    return globalThis.SnowBunny?.phoneArtwork ?? null;
}

function library() {
    return globalThis.SnowBunny?.phoneArtworkLibrary ?? null;
}

function social() {
    return globalThis.SnowBunny?.phoneSocial ?? null;
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
  #${MANAGER_ID} .sb-phone-artwork-preview img,
  #${MANAGER_ID} .sb-phone-artwork-thumb img { width: 100%; height: 100%; display: block; object-fit: cover; }
  #${MANAGER_ID} .sb-phone-artwork-copy { min-width: 0; }
  #${MANAGER_ID} .sb-phone-artwork-copy strong,
  #${MANAGER_ID} .sb-phone-artwork-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${MANAGER_ID} .sb-phone-artwork-copy strong { font-size: .74rem; }
  #${MANAGER_ID} .sb-phone-artwork-copy small { margin-top: 2px; font-size: .61rem; opacity: .52; }
  #${MANAGER_ID} .sb-phone-artwork-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 7px; }
  #${MANAGER_ID} .sb-phone-artwork-actions button,
  #${MANAGER_ID} .sb-phone-artwork-folder-head button,
  #${MANAGER_ID} .sb-phone-artwork-create button,
  #${MANAGER_ID} .sb-phone-artwork-target button {
    min-height: 32px; padding: 6px 7px; border: 0; border-radius: 10px;
    background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; font: inherit; font-size: .62rem; font-weight: 720;
  }
  #${MANAGER_ID} .sb-phone-artwork-create { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
  #${MANAGER_ID} .sb-phone-artwork-create input {
    min-height: 34px; box-sizing: border-box; width: 100%; padding: 6px 9px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 55%, transparent); border-radius: 10px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 55%, transparent); color: inherit; font: inherit; font-size: .66rem;
  }
  #${MANAGER_ID} .sb-phone-artwork-target {
    display: flex; align-items: center; gap: 8px; padding: 8px 9px; border-radius: 12px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 11%, transparent); font-size: .65rem;
  }
  #${MANAGER_ID} .sb-phone-artwork-target span { flex: 1; min-width: 0; }
  #${MANAGER_ID} .sb-phone-artwork-folder { display: grid; gap: 7px; padding: 7px; border-radius: 13px; background: color-mix(in srgb, currentColor 3%, transparent); }
  #${MANAGER_ID} .sb-phone-artwork-folder-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; align-items: center; }
  #${MANAGER_ID} .sb-phone-artwork-folder-toggle {
    min-width: 0; display: flex; align-items: center; gap: 7px; border: 0; background: transparent; color: inherit; text-align: left; font: inherit; font-size: .67rem; font-weight: 730;
  }
  #${MANAGER_ID} .sb-phone-artwork-folder-toggle span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${MANAGER_ID} .sb-phone-artwork-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  #${MANAGER_ID} .sb-phone-artwork-thumb {
    position: relative; overflow: hidden; aspect-ratio: 1 / 1; padding: 0; border: 0; border-radius: 11px;
    background: color-mix(in srgb, currentColor 7%, transparent); color: inherit;
  }
  #${MANAGER_ID} .sb-phone-artwork-thumb span {
    position: absolute; inset: auto 3px 3px; padding: 3px 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    border-radius: 6px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 84%, transparent); font-size: .52rem;
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

function rowShell(name, detail, source, fallbackIcon = 'fa-user') {
    const row = el('div', 'sb-phone-artwork-row');
    const content = el('div', 'sb-phone-artwork-copy');
    content.append(el('strong', '', name || 'Unnamed'), el('small', '', detail));
    row.append(preview(source, fallbackIcon), content);
    return { row, content };
}

function setTarget(target) {
    assignmentTarget = target;
    expanded = true;
    queueRefresh(true);
}

function actionButtons(content, onUpload, onDefault, target) {
    const actions = el('div', 'sb-phone-artwork-actions');
    const upload = el('button', '', 'Upload');
    upload.type = 'button';
    const fromLibrary = el('button', '', 'Library');
    fromLibrary.type = 'button';
    const reset = el('button', '', 'Default');
    reset.type = 'button';
    const run = async task => {
        upload.disabled = true;
        fromLibrary.disabled = true;
        reset.disabled = true;
        try {
            await task();
            queueRefresh(true);
        } catch (error) {
            console.warn('[SnowBunny] Could not update Pocket Phone artwork.', error);
        } finally {
            upload.disabled = false;
            fromLibrary.disabled = false;
            reset.disabled = false;
        }
    };
    upload.addEventListener('click', () => void run(onUpload));
    fromLibrary.addEventListener('click', () => setTarget(target));
    reset.addEventListener('click', () => void run(onDefault));
    actions.append(upload, fromLibrary, reset);
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
            { type: 'public', id: profile.id, name: profile.name || 'Public profile' },
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
            { type: 'contact', id: contact.id, name: contact.name || 'Private contact' },
        );
        section.append(row);
    }
    return section;
}

async function assignImage(imageId) {
    const target = assignmentTarget;
    if (!target) return;
    if (target.type === 'public') await library()?.assignPublicProfile?.(target.id, imageId);
    else if (target.type === 'contact') await library()?.assignContact?.(target.id, imageId);
    else if (target.type === 'network') await library()?.setNetworkImage?.(imageId);
    assignmentTarget = null;
    queueRefresh(true);
}

function artworkTarget() {
    if (!assignmentTarget) return null;
    const row = el('div', 'sb-phone-artwork-target');
    row.append(icon('fa-crosshairs'), el('span', '', `Choose library artwork for ${assignmentTarget.name}`));
    const cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', () => {
        assignmentTarget = null;
        queueRefresh(true);
    });
    row.append(cancel);
    return row;
}

function folderImages(folder) {
    const grid = el('div', 'sb-phone-artwork-grid');
    if (!folder.images.length) {
        grid.append(el('div', 'sb-phone-artwork-manager-help', 'This folder is empty. Import images to reuse them across Phone presentation.'));
        return grid;
    }
    for (const image of folder.images) {
        const button = el('button', 'sb-phone-artwork-thumb');
        button.type = 'button';
        button.title = assignmentTarget ? `Use ${image.name} for ${assignmentTarget.name}` : image.name;
        const picture = new Image();
        picture.src = image.path;
        picture.alt = '';
        button.append(picture, el('span', '', image.name));
        button.disabled = !assignmentTarget;
        if (assignmentTarget) button.addEventListener('click', () => void assignImage(image.id));
        grid.append(button);
    }
    return grid;
}

function folderCard(folder) {
    const card = el('div', 'sb-phone-artwork-folder');
    const head = el('div', 'sb-phone-artwork-folder-head');
    const toggle = el('button', 'sb-phone-artwork-folder-toggle');
    toggle.type = 'button';
    toggle.append(icon(expandedFolderId === folder.id ? 'fa-chevron-down' : 'fa-chevron-right'), el('span', '', `${folder.name} · ${folder.images.length}`));
    toggle.addEventListener('click', () => {
        expandedFolderId = expandedFolderId === folder.id ? '' : folder.id;
        queueRefresh(true);
    });
    const importButton = el('button', '', 'Import');
    importButton.type = 'button';
    importButton.addEventListener('click', async () => {
        importButton.disabled = true;
        try {
            await library()?.importFromPicker?.(folder.id);
            expandedFolderId = folder.id;
            queueRefresh(true);
        } catch (error) {
            console.warn('[SnowBunny] Could not import Pocket Phone artwork.', error);
            importButton.disabled = false;
        }
    });
    head.append(toggle, importButton);
    card.append(head);
    if (expandedFolderId === folder.id) card.append(folderImages(folder));
    return card;
}

function librarySection() {
    const section = el('section', 'sb-phone-artwork-section');
    section.append(el('h4', '', 'Reusable artwork'));
    const target = artworkTarget();
    if (target) section.append(target);

    const network = social()?.read?.();
    const libraryState = library()?.read?.() || { folders: [], networkImage: '' };
    const networkRow = rowShell(
        network?.name || 'Story public network',
        'Optional app/network image. The generated semantic identity stays unchanged.',
        libraryState.networkImage || '',
        'fa-globe',
    );
    const networkActions = el('div', 'sb-phone-artwork-actions');
    const chooseNetwork = el('button', '', 'Library');
    chooseNetwork.type = 'button';
    chooseNetwork.addEventListener('click', () => setTarget({ type: 'network', id: 'network', name: network?.name || 'Story network' }));
    const resetNetwork = el('button', '', 'Default');
    resetNetwork.type = 'button';
    resetNetwork.addEventListener('click', () => {
        library()?.setNetworkImage?.('');
        queueRefresh(true);
    });
    networkActions.append(chooseNetwork, resetNetwork);
    networkRow.content.append(networkActions);
    section.append(networkRow.row);

    const create = el('form', 'sb-phone-artwork-create');
    const input = el('input');
    input.placeholder = 'New artwork folder';
    input.maxLength = 80;
    const add = el('button', '', 'Add');
    add.type = 'submit';
    create.append(input, add);
    create.addEventListener('submit', event => {
        event.preventDefault();
        const folder = library()?.createFolder?.(input.value);
        if (!folder) return;
        input.value = '';
        expandedFolderId = folder.id;
        queueRefresh(true);
    });
    section.append(create);

    if (!libraryState.folders.length) {
        section.append(el('div', 'sb-phone-artwork-manager-help', 'Create a folder, then import several images at once. Importing artwork never creates contacts or fictional relationships.'));
    } else {
        for (const folder of libraryState.folders) section.append(folderCard(folder));
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
    const signature = `${expanded}:${expandedFolderId}:${assignmentTarget?.type || ''}:${assignmentTarget?.id || ''}:${library()?.read?.()?.updatedAt || 0}`;
    if (existing?.dataset.signature === signature) return;
    existing?.remove();

    const state = await store.read();
    if (workspace()?.dataset?.snowbunnyPhoneView !== 'settings') return;
    const card = el('div', 'sb-phone-setting');
    card.id = MANAGER_ID;
    card.dataset.signature = signature;
    const toggle = el('button', 'sb-phone-artwork-manager-toggle');
    toggle.type = 'button';
    toggle.append(icon('fa-images'), el('span', '', 'Profiles & pictures'), icon(expanded ? 'fa-chevron-up' : 'fa-chevron-down'));
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.addEventListener('click', () => {
        expanded = !expanded;
        if (!expanded) assignmentTarget = null;
        queueRefresh(true);
    });
    card.append(toggle, el('div', 'sb-phone-artwork-manager-help', 'Pictures change Phone presentation only. They do not create contacts, change Character cards, or alter public identity.'));
    if (expanded) card.append(librarySection(), publicSection(state), privateSection(state));
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
    expandedFolderId = '';
    assignmentTarget = null;
    queueRefresh(true);
}

export function initPhoneArtworkManagerUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(() => queueRefresh());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('snowbunny:phone-changed', () => queueRefresh(true));
    document.addEventListener('snowbunny:phone-artwork-library-changed', () => queueRefresh(true));
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
