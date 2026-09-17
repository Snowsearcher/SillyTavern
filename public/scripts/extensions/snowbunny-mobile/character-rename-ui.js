import { renameCharacterForSnowBunny } from './character-rename.js';

const WORKSPACE_ID = 'snowbunny-character-library';
const STYLE_ID = 'snowbunny-character-rename-style';

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
  #${WORKSPACE_ID} .snowbunny-character-rename {
    display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; align-items: end;
  }
  #${WORKSPACE_ID} .snowbunny-character-rename label {
    display: grid; gap: 5px; font-size: .72rem; font-weight: 700;
  }
  #${WORKSPACE_ID} .snowbunny-character-rename button {
    min-height: 42px; padding: 7px 12px; border: 0; border-radius: 13px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent);
    color: inherit; font-weight: 720;
  }
  #${WORKSPACE_ID} .snowbunny-character-rename small {
    grid-column: 1 / -1; font-size: .65rem; line-height: 1.35; opacity: .55;
  }
}
`;
    document.head.append(style);
}

function selectedRecord() {
    const root = document.getElementById(WORKSPACE_ID);
    const hero = root?.querySelector('.snowbunny-character-hero');
    const image = hero?.querySelector('.snowbunny-character-portrait img');
    if (!(root instanceof HTMLElement) || !(hero instanceof HTMLElement)) return null;

    const api = context();
    const source = image instanceof HTMLImageElement ? image.src : '';
    for (const character of api?.characters || []) {
        if (!character?.avatar) continue;
        let expected = '';
        try {
            expected = new URL(api?.getThumbnailUrl?.('avatar', character.avatar) || '', location.href).href;
        } catch (_) { /* ignore malformed fallback */ }
        if (source && expected && source === expected) return character;
    }

    const displayedName = hero.querySelector('.snowbunny-character-hero-copy strong')?.textContent?.trim() || '';
    const matches = (api?.characters || []).filter(character => String(character?.name || '').trim() === displayedName);
    return matches.length === 1 ? matches[0] : null;
}

async function rename(character, input, button, note) {
    const nextName = input.value.trim();
    if (!nextName || nextName === String(character.name || '').trim()) return;
    button.disabled = true;
    input.disabled = true;
    button.textContent = 'Renaming…';
    note.textContent = 'Updating SillyTavern and SnowBunny references…';
    try {
        const record = await globalThis.SnowBunny?.characterAuthoring?.read?.(character.avatar, { fresh: true });
        const newAvatar = await renameCharacterForSnowBunny(character.avatar, nextName, record?.entityId || '');
        globalThis.SnowBunny?.characterLibrary?.invalidate?.();
        await globalThis.SnowBunny?.characterLibrary?.openEditor?.(newAvatar);
    } catch (error) {
        console.error('[SnowBunny] Could not rename Character.', error);
        button.disabled = false;
        input.disabled = false;
        button.textContent = 'Rename';
        note.textContent = 'Rename failed. The existing Character and its links were left in place where possible.';
    }
}

function enhance() {
    queued = false;
    const root = document.getElementById(WORKSPACE_ID);
    const form = root?.querySelector('.snowbunny-character-form');
    const hero = root?.querySelector('.snowbunny-character-hero');
    if (!(form instanceof HTMLElement) || !(hero instanceof HTMLElement)) return;
    if (form.querySelector('[data-snowbunny-character-rename="1"]')) return;

    const character = selectedRecord();
    if (!character?.avatar) return;

    const host = document.createElement('div');
    host.className = 'snowbunny-character-rename';
    host.dataset.snowbunnyCharacterRename = '1';
    const label = document.createElement('label');
    const title = document.createElement('span');
    title.textContent = 'Name';
    const input = document.createElement('input');
    input.className = 'snowbunny-character-input';
    input.type = 'text';
    input.maxLength = 120;
    input.value = String(character.name || '');
    label.append(title, input);

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Rename';
    const note = document.createElement('small');
    note.textContent = 'Uses SillyTavern’s real rename path and keeps SnowBunny Story/Codex links attached.';
    button.addEventListener('click', () => void rename(character, input, button, note));
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void rename(character, input, button, note);
        }
    });
    host.append(label, button, note);
    form.prepend(host);

    const heroNote = hero.querySelector('.snowbunny-character-hero-copy small');
    if (heroNote) heroNote.textContent = 'This is the real SillyTavern Character card. SnowBunny keeps its authoring, Story links and Codex links attached to it.';
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

export function initCharacterRenameUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(queueEnhance);
    observer.observe(document.body, { childList: true, subtree: true });
    queueEnhance();
}
