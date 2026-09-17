import {
    default_user_avatar,
    getRequestHeaders,
} from '../../../script.js';
import {
    getUserAvatars,
    initPersona,
} from '../../personas.js';

const SHEET_ID = 'snowbunny-entity-create-sheet';
const STYLE_ID = 'snowbunny-entity-create-style';

let initialized = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
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
  #${SHEET_ID} {
    position: fixed; z-index: 12340; inset: 0; display: flex; align-items: flex-end; justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SHEET_ID} .snowbunny-entity-create-card {
    width: min(100%, 620px); max-height: 88dvh; display: flex; flex-direction: column; overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent); border-bottom: 0;
    border-radius: 24px 24px 0 0; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor); box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  #${SHEET_ID} .snowbunny-entity-create-handle { width: 38px; height: 4px; margin: 8px auto 2px; border-radius: 999px; background: currentColor; opacity: .24; }
  #${SHEET_ID} .snowbunny-entity-create-head { display: flex; align-items: center; gap: 8px; padding: 7px 10px 9px 16px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent); }
  #${SHEET_ID} .snowbunny-entity-create-head h3 { flex: 1; min-width: 0; margin: 0; font-size: .98rem; }
  #${SHEET_ID} .snowbunny-entity-create-head button { width: 40px; height: 40px; border: 0; border-radius: 12px; background: transparent; color: inherit; }
  #${SHEET_ID} .snowbunny-entity-create-body { flex: 1; min-height: 0; overflow-y: auto; padding: 11px 13px calc(18px + env(safe-area-inset-bottom)); }
  #${SHEET_ID} .snowbunny-entity-create-field { display: grid; gap: 5px; margin: 9px 0; font-size: .72rem; font-weight: 710; }
  #${SHEET_ID} .snowbunny-entity-create-field input { box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 57%, transparent); color: inherit; font: inherit; }
  #${SHEET_ID} .snowbunny-entity-create-avatar { display: flex; align-items: center; gap: 10px; margin: 10px 0; padding: 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 50%, transparent); }
  #${SHEET_ID} .snowbunny-entity-create-avatar i { width: 34px; text-align: center; opacity: .7; }
  #${SHEET_ID} .snowbunny-entity-create-avatar-copy { flex: 1; min-width: 0; }
  #${SHEET_ID} .snowbunny-entity-create-avatar-copy strong, #${SHEET_ID} .snowbunny-entity-create-avatar-copy small { display: block; }
  #${SHEET_ID} .snowbunny-entity-create-avatar-copy strong { font-size: .8rem; }
  #${SHEET_ID} .snowbunny-entity-create-avatar-copy small { margin-top: 3px; font-size: .66rem; opacity: .56; }
  #${SHEET_ID} .snowbunny-entity-create-file { min-height: 38px; padding: 6px 9px; border: 0; border-radius: 12px; background: color-mix(in srgb, currentColor 7%, transparent); color: inherit; font-weight: 690; }
  #${SHEET_ID} .snowbunny-entity-create-actions { display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px; margin-top: 13px; }
  #${SHEET_ID} .snowbunny-entity-create-actions button { min-height: 44px; border: 0; border-radius: 14px; background: color-mix(in srgb, currentColor 7%, transparent); color: inherit; font-weight: 730; }
  #${SHEET_ID} .snowbunny-entity-create-actions .primary { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 16%, transparent); }
  #${SHEET_ID} .snowbunny-entity-create-import { width: 100%; min-height: 48px; margin-top: 9px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 14px; background: transparent; color: inherit; font-weight: 710; }
  #${SHEET_ID} .snowbunny-entity-create-status { min-height: 20px; margin-top: 8px; font-size: .68rem; line-height: 1.4; opacity: .66; }
}
`;
    document.head.append(style);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function frame(title) {
    closeSheet();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-entity-create-card');
    card.append(el('div', 'snowbunny-entity-create-handle'));
    const head = el('header', 'snowbunny-entity-create-head');
    head.append(el('h3', '', title));
    const close = el('button');
    close.type = 'button'; close.setAttribute('aria-label', `Close ${title}`); close.append(icon('fa-xmark')); close.addEventListener('click', closeSheet);
    head.append(close);
    const body = el('div', 'snowbunny-entity-create-body');
    card.append(head, body); overlay.append(card);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) closeSheet(); });
    document.body.append(overlay);
    return body;
}

function field(labelText, input) {
    const host = el('label', 'snowbunny-entity-create-field');
    host.append(el('span', '', labelText), input);
    return host;
}

function avatarChooser({ optional = true } = {}) {
    const row = el('div', 'snowbunny-entity-create-avatar');
    row.append(icon('fa-image'));
    const copy = el('div', 'snowbunny-entity-create-avatar-copy');
    copy.append(el('strong', '', 'Picture'), el('small', '', optional ? 'Optional. You can change it later.' : 'Choose the Persona picture.'));
    const picker = el('input');
    picker.type = 'file'; picker.accept = 'image/*'; picker.hidden = true;
    const button = el('button', 'snowbunny-entity-create-file', 'Choose');
    button.type = 'button'; button.addEventListener('click', () => picker.click());
    picker.addEventListener('change', () => {
        button.textContent = picker.files?.[0]?.name || 'Choose';
    });
    row.append(copy, button, picker);
    return { row, picker };
}

function closeNativeCharacterDrawer() {
    const panel = document.querySelector('#rightNavHolder > .drawer-content.openDrawer');
    const toggle = document.querySelector('#rightNavHolder > .drawer-toggle');
    if (panel && toggle instanceof HTMLElement) toggle.click();
}

function waitForNewCharacter(before, timeout = 6000) {
    const started = performance.now();
    return new Promise(resolve => {
        const check = () => {
            const characters = context()?.characters || [];
            const found = characters.find(character => character?.avatar && !before.has(character.avatar));
            if (found) { resolve(found); return; }
            if (performance.now() - started >= timeout) { resolve(null); return; }
            window.setTimeout(check, 80);
        };
        check();
    });
}

async function createCharacter(name, avatarFile, status, submit) {
    const api = context();
    if (!name.trim()) return false;
    const before = new Set((api?.characters || []).map(character => character?.avatar).filter(Boolean));
    const createControl = document.getElementById('rm_button_create');
    const form = document.getElementById('form_create');
    const nameInput = document.getElementById('character_name_pole');
    const nativeAvatar = document.getElementById('add_avatar_button');
    if (!(createControl instanceof HTMLElement) || !(form instanceof HTMLFormElement) || !(nameInput instanceof HTMLInputElement)) {
        status.textContent = 'SillyTavern’s Character creator is unavailable.';
        return false;
    }

    submit.disabled = true;
    status.textContent = 'Creating Character…';
    closeNativeCharacterDrawer();
    createControl.click();
    nameInput.value = name.trim();
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    if (avatarFile && nativeAvatar instanceof HTMLInputElement) {
        try {
            const transfer = new DataTransfer();
            transfer.items.add(avatarFile);
            nativeAvatar.files = transfer.files;
            nativeAvatar.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (error) {
            console.warn('[SnowBunny] Could not pass the selected Character picture to SillyTavern.', error);
        }
    }

    form.requestSubmit();
    const created = await waitForNewCharacter(before);
    if (!created?.avatar) {
        submit.disabled = false;
        status.textContent = 'The Character was not created. Check SillyTavern’s message at the top of the screen and try again.';
        return false;
    }

    globalThis.SnowBunny?.characterLibrary?.invalidate?.();
    closeSheet();
    await globalThis.SnowBunny?.characterLibrary?.openEditor?.(created.avatar);
    return true;
}

function openCharacterCreate() {
    const body = frame('New Character');
    const name = el('input'); name.type = 'text'; name.placeholder = 'Character name'; name.maxLength = 120; name.autocomplete = 'off';
    const avatar = avatarChooser();
    const status = el('div', 'snowbunny-entity-create-status');
    const actions = el('div', 'snowbunny-entity-create-actions');
    const cancel = el('button', '', 'Cancel'); cancel.type = 'button'; cancel.addEventListener('click', closeSheet);
    const create = el('button', 'primary', 'Create & Edit'); create.type = 'button';
    create.addEventListener('click', () => void createCharacter(name.value, avatar.picker.files?.[0] || null, status, create));
    actions.append(cancel, create);

    const importButton = el('button', 'snowbunny-entity-create-import', 'Import Character file');
    importButton.type = 'button';
    importButton.addEventListener('click', () => {
        const input = document.getElementById('character_import_file');
        if (!(input instanceof HTMLInputElement)) { status.textContent = 'SillyTavern’s Character importer is unavailable.'; return; }
        const before = new Set((context()?.characters || []).map(character => character?.avatar).filter(Boolean));
        const onChange = async () => {
            input.removeEventListener('change', onChange);
            status.textContent = 'Importing Character…';
            const created = await waitForNewCharacter(before, 10000);
            globalThis.SnowBunny?.characterLibrary?.invalidate?.();
            closeSheet();
            if (created?.avatar) await globalThis.SnowBunny?.characterLibrary?.openEditor?.(created.avatar);
            else await globalThis.SnowBunny?.characterLibrary?.open?.();
        };
        input.addEventListener('change', onChange);
        input.click();
    });

    body.append(field('Name', name), avatar.row, actions, importButton, status);
    window.setTimeout(() => name.focus({ preventScroll: true }), 50);
}

async function uploadPersonaAvatar(file, fileName) {
    const source = file || await fetch(default_user_avatar).then(response => response.blob());
    const upload = source instanceof File ? source : new File([source], 'avatar.png', { type: source.type || 'image/png' });
    const form = new FormData();
    form.append('avatar', upload);
    form.append('overwrite_name', fileName);
    const response = await fetch('/api/avatars/upload', {
        method: 'POST',
        headers: getRequestHeaders({ omitContentType: true }),
        cache: 'no-cache',
        body: form,
    });
    if (!response.ok) throw new Error(`Avatar upload failed (${response.status}).`);
    const data = await response.json();
    return String(data?.path || fileName);
}

async function createPersonaRecord(name, title, avatarFile, status, submit) {
    if (!name.trim()) return false;
    submit.disabled = true;
    status.textContent = 'Creating Persona…';
    try {
        const safe = name.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'Persona';
        const requested = `${Date.now()}-${safe}.png`;
        const avatarId = await uploadPersonaAvatar(avatarFile, requested);
        await initPersona(avatarId, name.trim(), '', title.trim());
        await getUserAvatars(false);
        closeSheet();
        await globalThis.SnowBunny?.personaLibrary?.openEditor?.(avatarId);
        return true;
    } catch (error) {
        console.error('[SnowBunny] Could not create Persona.', error);
        submit.disabled = false;
        status.textContent = 'The Persona could not be created. Try again.';
        return false;
    }
}

function openPersonaCreate() {
    const body = frame('New Persona');
    const name = el('input'); name.type = 'text'; name.placeholder = 'Persona name'; name.maxLength = 120; name.autocomplete = 'off';
    const title = el('input'); title.type = 'text'; title.placeholder = 'Optional short title'; title.maxLength = 160; title.autocomplete = 'off';
    const avatar = avatarChooser();
    const status = el('div', 'snowbunny-entity-create-status');
    const actions = el('div', 'snowbunny-entity-create-actions');
    const cancel = el('button', '', 'Cancel'); cancel.type = 'button'; cancel.addEventListener('click', closeSheet);
    const create = el('button', 'primary', 'Create & Edit'); create.type = 'button';
    create.addEventListener('click', () => void createPersonaRecord(name.value, title.value, avatar.picker.files?.[0] || null, status, create));
    actions.append(cancel, create);
    body.append(field('Name', name), field('Title', title), avatar.row, actions, status);
    window.setTimeout(() => name.focus({ preventScroll: true }), 50);
}

function onCaptureClick(event) {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    const text = target.textContent?.trim() || '';

    if (target.closest('#snowbunny-character-library .snowbunny-character-header') && text === '+ Create') {
        event.preventDefault();
        event.stopImmediatePropagation();
        openCharacterCreate();
        return;
    }

    if (target.closest('#snowbunny-persona-library .sbp-head') && text === '+ Create / Import') {
        event.preventDefault();
        event.stopImmediatePropagation();
        openPersonaCreate();
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(SHEET_ID)) {
        event.preventDefault();
        closeSheet();
    }
}

export function initEntityCreateUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    document.addEventListener('click', onCaptureClick, true);
    document.addEventListener('keydown', onKeyDown, true);
}
