const WORKSPACE_ID = 'snowbunny-phone-workspace';
const STYLE_ID = 'snowbunny-phone-social-profile-ui-style';
const EDITOR_ID = 'snowbunny-phone-social-own-profile-editor';
const YOU_ID = 'snowbunny-phone-social-you';

let initialized = false;
let observer = null;
let queued = false;
let editorOpen = false;
let editorBusy = false;

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function actions() {
    return globalThis.SnowBunny?.phoneSocialActions ?? null;
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
  #${WORKSPACE_ID} .sb-phone-social-toolbar {
    display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; margin: 0 0 11px;
  }
  #${WORKSPACE_ID} .sb-phone-social-toolbar .sb-phone-social-create { margin: 0; }
  #${YOU_ID} {
    min-width: 72px; min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 8px 11px; border: 0; border-radius: 12px;
    background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; font: inherit;
    font-size: .7rem; font-weight: 780;
  }
  #${EDITOR_ID} {
    display: grid; gap: 9px; margin: 0 0 12px; padding: 13px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 53%, transparent);
  }
  #${EDITOR_ID} .sb-phone-social-profile-editor-head { display: flex; align-items: center; gap: 8px; }
  #${EDITOR_ID} .sb-phone-social-profile-editor-head strong { flex: 1; min-width: 0; font-size: .82rem; }
  #${EDITOR_ID} .sb-phone-social-profile-editor-close {
    width: 34px; min-width: 34px; height: 34px; border: 0; border-radius: 10px; background: transparent; color: inherit;
  }
  #${EDITOR_ID} .sb-phone-social-profile-picture-row {
    display: grid; grid-template-columns: 66px minmax(0, 1fr); gap: 10px; align-items: center;
    padding: 8px; border-radius: 15px; background: color-mix(in srgb, currentColor 4%, transparent);
  }
  #${EDITOR_ID} .sb-phone-social-profile-picture {
    width: 66px; height: 66px; overflow: hidden; display: grid; place-items: center;
    border-radius: 18px; background: color-mix(in srgb, currentColor 8%, transparent); font-size: 1.2rem;
  }
  #${EDITOR_ID} .sb-phone-social-profile-picture img { width: 100%; height: 100%; object-fit: cover; display: block; }
  #${EDITOR_ID} .sb-phone-social-profile-picture-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
  #${EDITOR_ID} .sb-phone-social-profile-picture-actions button {
    min-height: 36px; padding: 7px 8px; border: 0; border-radius: 11px;
    background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; font: inherit; font-size: .67rem; font-weight: 730;
  }
  #${EDITOR_ID} input, #${EDITOR_ID} textarea {
    box-sizing: border-box; width: 100%; padding: 9px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
    border-radius: 12px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 60%, transparent); color: inherit; font: inherit;
  }
  #${EDITOR_ID} textarea { min-height: 90px; resize: vertical; line-height: 1.42; }
  #${EDITOR_ID} .sb-phone-social-profile-editor-save {
    min-height: 38px; border: 0; border-radius: 12px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 17%, transparent); color: inherit; font: inherit; font-weight: 780;
  }
  #${EDITOR_ID} .sb-phone-social-profile-editor-help,
  #${EDITOR_ID} .sb-phone-social-profile-editor-error { font-size: .65rem; line-height: 1.4; }
  #${EDITOR_ID} .sb-phone-social-profile-editor-help { opacity: .56; }
  #${EDITOR_ID} .sb-phone-social-profile-editor-error { padding: 8px 9px; border-radius: 10px; background: color-mix(in srgb, currentColor 7%, transparent); }
}
`;
    document.head.append(style);
}

function socialRoot() {
    const root = document.getElementById(WORKSPACE_ID);
    return root?.dataset?.snowbunnyPhoneView === 'social' ? root : null;
}

function socialBody() {
    return socialRoot()?.querySelector('.sb-phone-body') || null;
}

function createButton() {
    return socialBody()?.querySelector('.sb-phone-social-create') || null;
}

function ownProfile(state) {
    return actions()?.ownProfile?.(state) || null;
}

async function readOwnProfile() {
    const store = phone();
    if (!store?.read) return null;
    let state = await store.read();
    let profile = ownProfile(state);
    if (profile) return profile;
    profile = await actions()?.ensureOwnProfile?.();
    if (!profile) return null;
    state = await store.read();
    return ownProfile(state) || profile;
}

function closeEditor() {
    editorOpen = false;
    document.getElementById(EDITOR_ID)?.remove();
}

function picturePreview(host, profile, explicitPicture, file, objectUrl) {
    host.replaceChildren();
    let source = objectUrl;
    if (!source) source = artwork()?.profilePicture?.({ ...profile, picture: explicitPicture }) || '';
    if (source) {
        const image = new Image();
        image.src = source;
        image.alt = '';
        host.append(image);
    } else {
        host.append(icon(file ? 'fa-image' : 'fa-user'));
    }
}

function buildEditor(profile) {
    const form = el('form');
    form.id = EDITOR_ID;

    const head = el('div', 'sb-phone-social-profile-editor-head');
    head.append(el('strong', '', 'Your public profile'));
    const close = el('button', 'sb-phone-social-profile-editor-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close public profile editor');
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeEditor);
    head.append(close);

    let picture = String(profile?.picture || '');
    let chosenFile = null;
    let objectUrl = '';
    const pictureRow = el('div', 'sb-phone-social-profile-picture-row');
    const preview = el('div', 'sb-phone-social-profile-picture');
    const pictureActions = el('div', 'sb-phone-social-profile-picture-actions');
    const choose = el('button', '', 'Choose picture');
    choose.type = 'button';
    const remove = el('button', '', 'Use default');
    remove.type = 'button';
    pictureActions.append(choose, remove);
    pictureRow.append(preview, pictureActions);
    picturePreview(preview, profile, picture, chosenFile, objectUrl);

    const revokePreview = () => {
        if (!objectUrl) return;
        URL.revokeObjectURL(objectUrl);
        objectUrl = '';
    };

    choose.addEventListener('click', async () => {
        if (editorBusy) return;
        try {
            const file = await artwork()?.pickImage?.();
            if (!file) return;
            revokePreview();
            chosenFile = file;
            objectUrl = URL.createObjectURL(file);
            picturePreview(preview, profile, picture, chosenFile, objectUrl);
        } catch (cause) {
            console.warn('[SnowBunny] Could not choose public profile artwork.', cause);
        }
    });

    remove.addEventListener('click', () => {
        revokePreview();
        chosenFile = null;
        picture = '';
        picturePreview(preview, profile, picture, chosenFile, objectUrl);
    });

    const name = el('input');
    name.name = 'name';
    name.placeholder = 'Display name';
    name.maxLength = 100;
    name.value = String(profile?.name || '');

    const handle = el('input');
    handle.name = 'handle';
    handle.placeholder = 'Handle';
    handle.maxLength = 80;
    handle.autocapitalize = 'none';
    handle.spellcheck = false;
    handle.value = String(profile?.handle || '');

    const bio = el('textarea');
    bio.name = 'bio';
    bio.placeholder = 'Public bio';
    bio.maxLength = 600;
    bio.value = String(profile?.bio || '');

    const help = el('div', 'sb-phone-social-profile-editor-help', 'This is your public Story-network identity. Its picture is separate from your Persona avatar. “Use default” falls back to your current Persona image without rewriting it.');
    const error = el('div', 'sb-phone-social-profile-editor-error');
    error.hidden = true;
    const save = el('button', 'sb-phone-social-profile-editor-save', 'Save profile');
    save.type = 'submit';

    form.append(head, pictureRow, name, handle, bio, help, error, save);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (editorBusy) return;
        editorBusy = true;
        save.disabled = true;
        choose.disabled = true;
        remove.disabled = true;
        error.hidden = true;
        try {
            if (chosenFile) picture = await artwork()?.uploadImage?.(chosenFile, { prefix: 'public-profile' }) || picture;
            await actions()?.saveOwnProfile?.({ name: name.value, handle: handle.value, bio: bio.value, picture });
            revokePreview();
            editorOpen = false;
            document.getElementById(EDITOR_ID)?.remove();
        } catch (cause) {
            error.textContent = String(cause?.message || cause);
            error.hidden = false;
            save.disabled = false;
            choose.disabled = false;
            remove.disabled = false;
        } finally {
            editorBusy = false;
        }
    });
    return form;
}

async function ensureEditor(body, toolbar) {
    if (!editorOpen || editorBusy || !body || !toolbar || document.getElementById(EDITOR_ID)) return;
    editorBusy = true;
    try {
        const profile = await readOwnProfile();
        if (!editorOpen || !profile || !body.isConnected) return;
        toolbar.insertAdjacentElement('afterend', buildEditor(profile));
    } catch (error) {
        console.warn('[SnowBunny] Could not open the public profile editor.', error);
        editorOpen = false;
    } finally {
        editorBusy = false;
    }
}

function ensureToolbar() {
    queued = false;
    const body = socialBody();
    if (!body) return;
    const create = createButton();
    if (!create) return;

    let toolbar = create.closest('.sb-phone-social-toolbar');
    if (!toolbar) {
        toolbar = el('div', 'sb-phone-social-toolbar');
        create.replaceWith(toolbar);
        toolbar.append(create);
    }

    let you = document.getElementById(YOU_ID);
    if (!you) {
        you = el('button');
        you.id = YOU_ID;
        you.type = 'button';
        you.append(icon('fa-user'), el('span', '', 'You'));
        you.addEventListener('click', () => {
            editorOpen = !editorOpen;
            if (!editorOpen) document.getElementById(EDITOR_ID)?.remove();
            else queueRefresh();
        });
        toolbar.append(you);
    }

    if (editorOpen) void ensureEditor(body, toolbar);
}

function queueRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(ensureToolbar);
}

function reset() {
    editorOpen = false;
    editorBusy = false;
    queueRefresh();
}

export function initPhoneSocialProfileUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(queueRefresh);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('snowbunny:phone-social-opened', reset);
    document.addEventListener('snowbunny:phone-changed', queueRefresh);
    document.addEventListener('snowbunny:phone-network-changed', queueRefresh);
    queueRefresh();
}