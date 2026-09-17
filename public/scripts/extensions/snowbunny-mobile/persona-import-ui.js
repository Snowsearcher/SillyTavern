import { getRequestHeaders } from '../../../script.js';
import { getUserAvatars, initPersona } from '../../personas.js';

const SHEET_ID = 'snowbunny-entity-create-sheet';

let initialized = false;
let observer = null;
let queued = false;

function personaSheet() {
    const sheet = document.getElementById(SHEET_ID);
    if (!(sheet instanceof HTMLElement)) return null;
    const title = sheet.querySelector('.snowbunny-entity-create-head h3')?.textContent?.trim();
    return title === 'New Persona' ? sheet : null;
}

function cleanName(fileName) {
    const base = String(fileName || '')
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return base || 'Imported Persona';
}

async function uploadAvatar(file, name) {
    const safe = name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'Persona';
    const requested = `${Date.now()}-${safe}.png`;
    const form = new FormData();
    form.append('avatar', file);
    form.append('overwrite_name', requested);
    const response = await fetch('/api/avatars/upload', {
        method: 'POST',
        headers: getRequestHeaders({ omitContentType: true }),
        cache: 'no-cache',
        body: form,
    });
    if (!response.ok) throw new Error(`Avatar upload failed (${response.status}).`);
    const data = await response.json();
    return String(data?.path || requested);
}

async function importPersona(file, button, status) {
    if (!(file instanceof File)) return;
    const name = cleanName(file.name);
    button.disabled = true;
    button.textContent = 'Importing…';
    status.textContent = 'Adding this image as a Persona…';

    try {
        const avatarId = await uploadAvatar(file, name);
        await initPersona(avatarId, name, '', '');
        await getUserAvatars(false);
        document.getElementById(SHEET_ID)?.remove();
        await globalThis.SnowBunny?.personaLibrary?.openEditor?.(avatarId);
    } catch (error) {
        console.error('[SnowBunny] Could not import Persona image.', error);
        button.disabled = false;
        button.textContent = 'Import Persona image';
        status.textContent = 'The Persona image could not be imported. Try again.';
    }
}

function enhance() {
    queued = false;
    const sheet = personaSheet();
    if (!sheet || sheet.querySelector('[data-snowbunny-persona-import="1"]')) return;

    const body = sheet.querySelector('.snowbunny-entity-create-body');
    if (!(body instanceof HTMLElement)) return;

    const status = body.querySelector('.snowbunny-entity-create-status') || document.createElement('div');
    if (!status.classList.contains('snowbunny-entity-create-status')) status.className = 'snowbunny-entity-create-status';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'snowbunny-entity-create-import';
    button.dataset.snowbunnyPersonaImport = '1';
    button.textContent = 'Import Persona image';
    button.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) void importPersona(file, button, status);
        input.value = '';
    });

    const note = document.createElement('div');
    note.className = 'snowbunny-entity-create-status';
    note.textContent = 'SillyTavern Persona import is image-based. Importing an image creates the Persona, then opens SnowBunny so you can fill in its details.';

    body.append(button, input, note);
    if (!status.isConnected) body.append(status);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

export function initPersonaImportUi() {
    if (initialized) return;
    initialized = true;
    observer = new MutationObserver(queueEnhance);
    observer.observe(document.body, { childList: true, subtree: true });
    queueEnhance();
}
