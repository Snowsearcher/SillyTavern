import { getRequestHeaders } from '../../../script.js';

const WORKSPACE_ID = 'snowbunny-character-library';
const STYLE_ID = 'snowbunny-character-avatar-style';

let initialized = false;
let observer = null;
let queued = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${WORKSPACE_ID} .snowbunny-character-avatar-tools {
    display: flex; align-items: center; gap: 8px; margin-top: 9px;
  }
  #${WORKSPACE_ID} .snowbunny-character-avatar-tools small {
    flex: 1; min-width: 0; font-size: .65rem; line-height: 1.35; opacity: .56;
  }
  #${WORKSPACE_ID} .snowbunny-character-avatar-tools button {
    min-height: 38px; padding: 6px 10px; border: 0; border-radius: 12px;
    background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; font-weight: 700;
  }
}
`;
    document.head.append(style);
}

function selectedCharacter() {
    const root = document.getElementById(WORKSPACE_ID);
    const image = root?.querySelector('.snowbunny-character-portrait img');
    if (!(root instanceof HTMLElement) || !(image instanceof HTMLImageElement)) return null;

    const api = context();
    const source = image.src;
    for (const character of api?.characters || []) {
        if (!character?.avatar) continue;
        try {
            const expected = new URL(api?.getThumbnailUrl?.('avatar', character.avatar) || '', location.href).href;
            if (expected && source.split('?')[0] === expected.split('?')[0]) return character;
        } catch (_) { /* ignore malformed fallback */ }
    }

    const displayedName = root.querySelector('.snowbunny-character-hero-copy strong')?.textContent?.trim() || '';
    const matches = (api?.characters || []).filter(character => String(character?.name || '').trim() === displayedName);
    return matches.length === 1 ? matches[0] : null;
}

async function replacePicture(character, file, button, note, image) {
    if (!(file instanceof File) || !character?.avatar) return;
    button.disabled = true;
    button.textContent = 'Saving…';
    note.textContent = 'Replacing the Character picture…';

    try {
        const form = new FormData();
        form.append('avatar', file);
        form.append('avatar_url', character.avatar);
        const response = await fetch('/api/characters/edit-avatar', {
            method: 'POST',
            headers: getRequestHeaders({ omitContentType: true }),
            body: form,
        });
        if (!response.ok) throw new Error(`Character picture update failed (${response.status}).`);

        globalThis.SnowBunny?.characterLibrary?.invalidate?.();
        const api = context();
        const event = api?.eventTypes?.CHARACTER_EDITED;
        if (event) await api?.eventSource?.emit?.(event, { detail: { character } });

        if (image instanceof HTMLImageElement) {
            const clean = image.src.split('?')[0];
            image.src = `${clean}?snowbunny=${Date.now()}`;
        }
        button.disabled = false;
        button.textContent = 'Change picture';
        note.textContent = 'Picture updated on the real SillyTavern Character card.';
    } catch (error) {
        console.error('[SnowBunny] Could not replace Character picture.', error);
        button.disabled = false;
        button.textContent = 'Change picture';
        note.textContent = 'The picture could not be changed. The existing Character card was left in place.';
    }
}

function enhance() {
    queued = false;
    const root = document.getElementById(WORKSPACE_ID);
    const hero = root?.querySelector('.snowbunny-character-hero');
    const portrait = hero?.querySelector('.snowbunny-character-portrait');
    const image = portrait?.querySelector('img');
    if (!(root instanceof HTMLElement) || !(hero instanceof HTMLElement) || !(portrait instanceof HTMLElement)) return;
    if (hero.querySelector('[data-snowbunny-character-avatar="1"]')) return;

    const character = selectedCharacter();
    if (!character?.avatar) return;

    const tools = document.createElement('div');
    tools.className = 'snowbunny-character-avatar-tools';
    tools.dataset.snowbunnyCharacterAvatar = '1';
    const note = document.createElement('small');
    note.textContent = 'Change the picture without changing the Character identity or Story links.';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Change picture';
    button.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) void replacePicture(character, file, button, note, image);
        input.value = '';
    });
    tools.append(note, button, input);

    const copy = hero.querySelector('.snowbunny-character-hero-copy');
    if (copy instanceof HTMLElement) copy.append(tools);
    else hero.append(tools);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

export function initCharacterAvatarUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(queueEnhance);
    observer.observe(document.body, { childList: true, subtree: true });
    queueEnhance();
}
