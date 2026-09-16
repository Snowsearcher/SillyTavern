import { doNewChat } from '../../../script.js';

const LEFT_DRAWER_ID = 'snowbunny-left-drawer';
const SHEET_ID = 'snowbunny-create-sheet';
const STYLE_ID = 'snowbunny-create-sheet-style';

let initialized = false;
let observer = null;
let queued = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function snowState() {
    return globalThis.SnowBunny?.state ?? null;
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
    position: fixed;
    z-index: 12180;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SHEET_ID} .snowbunny-create-card {
    width: min(100%, 620px);
    max-height: 84dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor);
    box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  #${SHEET_ID} .snowbunny-create-handle {
    width: 38px; height: 4px; margin: 8px auto 2px; border-radius: 999px;
    background: currentColor; opacity: .24;
  }
  #${SHEET_ID} .snowbunny-create-header {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px 9px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
  }
  #${SHEET_ID} .snowbunny-create-header h3 { flex: 1; min-width: 0; margin: 0; font-size: .98rem; }
  #${SHEET_ID} .snowbunny-create-close {
    width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; color: inherit;
  }
  #${SHEET_ID} .snowbunny-create-body {
    flex: 1; min-height: 0; overflow-y: auto; padding: 8px 10px calc(16px + env(safe-area-inset-bottom));
  }
  #${SHEET_ID} .snowbunny-create-option {
    width: 100%; min-height: 57px; display: flex; align-items: center; gap: 11px;
    margin: 3px 0; padding: 8px 10px;
    border: 1px solid transparent; border-radius: 16px;
    background: transparent; color: inherit; text-align: left;
  }
  #${SHEET_ID} .snowbunny-create-option:not(:disabled):active {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 34%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent);
  }
  #${SHEET_ID} .snowbunny-create-option:disabled { opacity: .35; }
  #${SHEET_ID} .snowbunny-create-icon {
    width: 38px; height: 38px; flex: 0 0 38px; display: flex; align-items: center; justify-content: center;
    border-radius: 12px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 11%, transparent);
  }
  #${SHEET_ID} .snowbunny-create-copy { flex: 1; min-width: 0; }
  #${SHEET_ID} .snowbunny-create-copy strong,
  #${SHEET_ID} .snowbunny-create-copy small { display: block; }
  #${SHEET_ID} .snowbunny-create-copy strong { font-size: .84rem; }
  #${SHEET_ID} .snowbunny-create-copy small { margin-top: 3px; font-size: .68rem; line-height: 1.35; opacity: .56; }
  #${SHEET_ID} .snowbunny-create-form { padding: 7px 4px 4px; }
  #${SHEET_ID} .snowbunny-create-input {
    width: 100%; box-sizing: border-box; min-height: 44px; padding: 9px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
    color: inherit; font: inherit;
  }
  #${SHEET_ID} .snowbunny-create-check { display: flex; align-items: center; gap: 9px; margin: 11px 3px; font-size: .75rem; }
  #${SHEET_ID} .snowbunny-create-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  #${SHEET_ID} .snowbunny-create-actions button {
    min-height: 40px; padding: 7px 13px; border: 0; border-radius: 12px; background: transparent; color: inherit; font-weight: 700;
  }
  #${SHEET_ID} .snowbunny-create-actions .primary { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
  #${SHEET_ID} .snowbunny-create-note { padding: 4px 5px 9px; font-size: .7rem; line-height: 1.4; opacity: .58; }
}
`;
    document.head.append(style);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function createFrame(title) {
    closeSheet();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-create-card');
    card.append(el('div', 'snowbunny-create-handle'));
    const header = el('header', 'snowbunny-create-header');
    header.append(el('h3', '', title));
    const close = el('button', 'snowbunny-create-close');
    close.type = 'button';
    close.setAttribute('aria-label', `Close ${title}`);
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSheet);
    header.append(close);
    const body = el('div', 'snowbunny-create-body');
    card.append(header, body);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) closeSheet(); });
    document.body.append(overlay);
    return body;
}

function option({ label, description, iconName, disabled = false, onClick }) {
    const button = el('button', 'snowbunny-create-option');
    button.type = 'button';
    button.disabled = disabled;
    const marker = el('span', 'snowbunny-create-icon');
    marker.append(icon(iconName));
    const copy = el('span', 'snowbunny-create-copy');
    copy.append(el('strong', '', label), el('small', '', description));
    button.append(marker, copy);
    if (!disabled && onClick) button.addEventListener('click', onClick);
    return button;
}

function stories() {
    const value = snowState()?.readGlobal?.()?.stories;
    return Array.isArray(value) ? value : [];
}

function currentRef() {
    const api = context();
    const chatId = api?.getCurrentChatId?.();
    if (!chatId) return null;
    if (api.groupId) return { kind: 'group', owner: String(api.groupId), chatId: String(chatId) };
    const characterId = Number.parseInt(String(api.characterId ?? ''), 10);
    const character = Number.isInteger(characterId) ? api.characters?.[characterId] : null;
    return character?.avatar ? { kind: 'character', owner: character.avatar, chatId: String(chatId) } : null;
}

function sameRef(a, b) {
    return a?.kind === b?.kind && a?.owner === b?.owner && a?.chatId === b?.chatId;
}

function attachCurrentToStory(storyId) {
    const ref = currentRef();
    if (!ref || !storyId) return;
    const list = stories();
    const target = list.find(story => story.id === storyId);
    if (!target) return;
    for (const story of list) story.chatRefs = (story.chatRefs || []).filter(item => !sameRef(item, ref));
    target.chatRefs = [...(target.chatRefs || []), ref];
    target.updatedAt = Date.now();
    snowState()?.patchGlobal?.({ stories: list });
    snowState()?.patchChat?.({ storyId });
}

function openStoryCreate() {
    const body = createFrame('Create Story');
    const form = el('div', 'snowbunny-create-form');
    const input = el('input', 'snowbunny-create-input');
    input.type = 'text';
    input.placeholder = 'Story name';
    input.maxLength = 120;
    form.append(input);
    const ref = currentRef();
    const check = el('label', 'snowbunny-create-check');
    const checkbox = el('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(ref);
    checkbox.disabled = !ref;
    check.append(checkbox, el('span', '', ref ? 'Add the current chat to this Story' : 'Open a chat first if you want to attach it immediately'));
    form.append(check);
    const actions = el('div', 'snowbunny-create-actions');
    const back = el('button', '', 'Back');
    back.type = 'button';
    back.addEventListener('click', openCreateMenu);
    const create = el('button', 'primary', 'Create');
    create.type = 'button';
    create.addEventListener('click', () => {
        const api = context();
        const story = {
            id: api?.uuidv4?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: input.value.trim() || 'Untitled Story',
            cover: '',
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            chatRefs: [],
        };
        const list = stories();
        list.push(story);
        snowState()?.patchGlobal?.({ stories: list });
        if (checkbox.checked) attachCurrentToStory(story.id);
        closeSheet();
        document.querySelector('#snowbunny-top-strip .snowbunny-top-action[aria-label="Stories"]')?.click();
    });
    actions.append(back, create);
    form.append(actions);
    body.append(form);
    window.setTimeout(() => input.focus({ preventScroll: true }), 50);
}

async function createChatForStory(storyId = '') {
    const api = context();
    if (!api?.getCurrentChatId?.()) return;
    closeSheet();
    await doNewChat();
    if (storyId) attachCurrentToStory(storyId);
}

function openChatCreate() {
    const body = createFrame('Create Chat');
    if (!context()?.getCurrentChatId?.()) {
        body.append(el('div', 'snowbunny-create-note', 'Open a Character or Members chat first. The full SnowBunny new-chat flow will later let you choose members before a chat exists.'));
        body.append(option({ label: 'Back', description: 'Return to Create', iconName: 'fa-arrow-left', onClick: openCreateMenu }));
        return;
    }

    body.append(el('div', 'snowbunny-create-note', 'Choose where the new chat belongs. It keeps the current Character/Members setup; other chat-specific setup can then be changed independently.'));
    body.append(option({
        label: 'Stand-alone Chat',
        description: 'Create it outside any Story.',
        iconName: 'fa-comments',
        onClick: () => void createChatForStory(''),
    }));
    for (const story of stories().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))) {
        body.append(option({
            label: story.title,
            description: 'Create the new chat inside this Story.',
            iconName: 'fa-book-open',
            onClick: () => void createChatForStory(story.id),
        }));
    }
    body.append(option({ label: 'Back', description: 'Return to Create', iconName: 'fa-arrow-left', onClick: openCreateMenu }));
}

function openNativeDrawer(wrapperId, afterOpen = null) {
    closeSheet();
    const wrapper = document.getElementById(wrapperId);
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (!(toggle instanceof HTMLElement)) return;
    if (!panel?.classList.contains('openDrawer')) toggle.click();
    if (afterOpen) window.setTimeout(afterOpen, 80);
}

function openCreateMenu() {
    const body = createFrame('Create');
    body.append(
        option({ label: 'Story', description: 'Create a Story for related chats.', iconName: 'fa-book-open', onClick: openStoryCreate }),
        option({ label: 'Chat', description: 'Create a stand-alone chat or put it in a Story.', iconName: 'fa-message', onClick: openChatCreate }),
        option({ label: 'Lorebook', description: 'SnowBunny Lorebook creation will live here when Codex storage is wired.', iconName: 'fa-book-atlas', disabled: true }),
        option({ label: 'Lore Entry', description: 'Create directly into a SnowBunny Lorebook once Codex is live.', iconName: 'fa-file-circle-plus', disabled: true }),
        option({
            label: 'Character',
            description: 'Open the Character library/editor.',
            iconName: 'fa-user-plus',
            onClick: () => openNativeDrawer('rightNavHolder', () => document.getElementById('rm_button_characters')?.click()),
        }),
        option({
            label: 'Persona',
            description: 'Open the Persona library/editor.',
            iconName: 'fa-person-circle-plus',
            onClick: () => openNativeDrawer('persona-management-button'),
        }),
    );
}

function createRow() {
    return [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Create',
    ) ?? null;
}

function enhanceCreateRow() {
    queued = false;
    const row = createRow();
    if (!(row instanceof HTMLButtonElement)) return;
    if (row.dataset.snowbunnyCreateMenu === '1') return;

    // Clone to remove any temporary direct-create listener installed by an
    // earlier shell adapter. The Create row always owns the six-option sheet.
    const replacement = row.cloneNode(true);
    replacement.disabled = false;
    replacement.setAttribute('aria-disabled', 'false');
    replacement.dataset.snowbunnyCreateMenu = '1';
    // Mark this with the key the Stories adapter uses so it does not attach a
    // second Story-only listener after the replacement enters the DOM.
    replacement.dataset.snowbunnyLibraryAction = 'create-story';
    replacement.addEventListener('click', openCreateMenu);
    row.replaceWith(replacement);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhanceCreateRow);
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(SHEET_ID)) {
        event.preventDefault();
        closeSheet();
    }
}

export function initCreateMenu() {
    if (initialized) return;
    initialized = true;
    installStyles();
    enhanceCreateRow();
    const drawer = document.getElementById(LEFT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueEnhance);
        observer.observe(drawer, { childList: true, subtree: true });
    }
    document.addEventListener('keydown', onKeyDown, true);
}
