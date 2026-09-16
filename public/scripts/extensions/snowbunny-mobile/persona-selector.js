import {
    getUserAvatar,
    getUserAvatars,
    persona_description_positions,
    setPersonaLockState,
    setUserAvatar,
    user_avatar,
} from '../../personas.js';
import { power_user } from '../../power-user.js';

const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SHEET_ID = 'snowbunny-action-sheet';
const STYLE_ID = 'snowbunny-persona-selector-style';

let initialized = false;
let observer = null;
let queued = false;
let applyingChatPersona = false;

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

function icon(name, extraClass = '') {
    const node = el('i', `fa-solid ${name}${extraClass ? ` ${extraClass}` : ''}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${SHEET_ID} .snowbunny-persona-thumb {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    overflow: hidden;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
  #${SHEET_ID} .snowbunny-persona-thumb img { width: 100%; height: 100%; object-fit: cover; }
  #${SHEET_ID} .snowbunny-persona-thumb i { width: 100%; line-height: 42px; text-align: center; opacity: .6; }
  #${SHEET_ID} .snowbunny-persona-star { width: 20px; text-align: center; opacity: .72; }
}
`;
    document.head.append(style);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function openPersonaManager() {
    closeSheet();
    const wrapper = document.getElementById('persona-management-button');
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
}

function createSheet(title) {
    closeSheet();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-action-card');
    card.append(el('div', 'snowbunny-action-handle'));
    const header = el('header', 'snowbunny-action-header');
    header.append(el('h3', '', title));
    const manage = el('button');
    manage.type = 'button';
    manage.title = 'Manage Personas';
    manage.setAttribute('aria-label', 'Manage Personas');
    manage.append(icon('fa-pencil'));
    manage.addEventListener('click', openPersonaManager);
    const close = el('button');
    close.type = 'button';
    close.title = 'Close';
    close.setAttribute('aria-label', `Close ${title}`);
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSheet);
    header.append(manage, close);
    card.append(header);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);
    return card;
}

function noPersonaSelected() {
    return snowState()?.readChat?.()?.noPersona === true;
}

function currentPersonaId(api = context()) {
    if (noPersonaSelected()) return '';
    return api?.chatMetadata?.persona || user_avatar || '';
}

function personaName(id) {
    return power_user.personas?.[id] || (id === user_avatar ? context()?.name1 : '') || '[Unnamed Persona]';
}

function restorePersonaContext(id = user_avatar) {
    const descriptor = power_user.persona_descriptions?.[id];
    if (!descriptor) {
        power_user.persona_description = '';
        power_user.persona_description_position = persona_description_positions.IN_PROMPT;
        power_user.persona_description_depth = 2;
        power_user.persona_description_role = 0;
        power_user.persona_description_lorebook = '';
        return;
    }
    power_user.persona_description = descriptor.description ?? '';
    power_user.persona_description_position = descriptor.position ?? persona_description_positions.IN_PROMPT;
    power_user.persona_description_depth = descriptor.depth ?? 2;
    power_user.persona_description_role = descriptor.role ?? 0;
    power_user.persona_description_lorebook = descriptor.lorebook ?? '';
}

function applyNoPersonaSuppression() {
    const api = context();
    if (!api?.getCurrentChatId?.() || !noPersonaSelected()) return;
    // This is an in-memory per-chat routing override. Do not persist NONE into
    // SillyTavern's global Persona settings or another chat would inherit it.
    power_user.persona_description = '';
    power_user.persona_description_position = persona_description_positions.NONE;
    power_user.persona_description_lorebook = '';
    if (api.chatMetadata?.persona) {
        delete api.chatMetadata.persona;
        api.saveMetadataDebounced?.();
    }
}

async function selectNoPersona() {
    const api = context();
    if (!api?.getCurrentChatId?.()) return;
    snowState()?.patchChat?.({ noPersona: true });
    applyNoPersonaSuppression();
    closeSheet();
    queueEnhance();
}

async function selectPersona(id) {
    const api = context();
    if (!api?.getCurrentChatId?.() || !id) return;
    applyingChatPersona = true;
    try {
        snowState()?.patchChat?.({ noPersona: false });
        if (id !== user_avatar) {
            await setUserAvatar(id, { toastPersonaNameChange: false, navigateToCurrent: false });
        } else {
            restorePersonaContext(id);
        }
        await setPersonaLockState(true, 'chat');
    } finally {
        applyingChatPersona = false;
    }
    closeSheet();
    queueEnhance();
}

async function applyChatPersonaState() {
    const api = context();
    if (!api?.getCurrentChatId?.() || applyingChatPersona) return;
    if (noPersonaSelected()) {
        applyNoPersonaSuppression();
        queueEnhance();
        return;
    }

    const locked = api.chatMetadata?.persona;
    const target = locked && power_user.personas?.[locked] ? locked : user_avatar;
    applyingChatPersona = true;
    try {
        if (target && target !== user_avatar) {
            await setUserAvatar(target, { toastPersonaNameChange: false, navigateToCurrent: false });
        } else {
            restorePersonaContext(target);
        }
    } finally {
        applyingChatPersona = false;
    }
    queueEnhance();
}

async function openPersonaSelector() {
    const api = context();
    if (!api?.getCurrentChatId?.()) return;
    const card = createSheet('Persona');
    const search = el('input', 'snowbunny-action-search');
    search.type = 'search';
    search.placeholder = 'Search Personas';
    search.autocomplete = 'off';
    const list = el('div', 'snowbunny-action-list');
    card.append(search, list);

    let ids = [];
    try {
        ids = await getUserAvatars(false) ?? [];
    } catch (error) {
        console.warn('[SnowBunny] Could not load Personas.', error);
    }
    if (!Array.isArray(ids)) ids = [];

    const favorite = power_user.default_persona || '';
    ids.sort((a, b) => {
        if (a === favorite) return -1;
        if (b === favorite) return 1;
        return personaName(a).localeCompare(personaName(b));
    });

    const render = () => {
        const query = search.value.trim().toLowerCase();
        const current = currentPersonaId(api);
        list.replaceChildren();

        if (!query || 'no persona none'.includes(query)) {
            const none = el('button', 'snowbunny-action-option');
            none.type = 'button';
            if (noPersonaSelected()) none.classList.add('current');
            const thumb = el('div', 'snowbunny-persona-thumb');
            thumb.append(icon('fa-user-slash'));
            const copy = el('div', 'snowbunny-action-option-copy');
            copy.append(
                el('strong', '', 'No Persona'),
                el('small', '', noPersonaSelected() ? 'No Persona context is sent in this chat' : 'Use no Persona card for this chat'),
            );
            none.append(thumb, copy, icon(noPersonaSelected() ? 'fa-circle-check' : 'fa-circle'));
            none.addEventListener('click', () => void selectNoPersona());
            list.append(none);
        }

        const visible = ids.filter(id => {
            const description = power_user.persona_descriptions?.[id]?.description || '';
            return `${personaName(id)} ${description}`.toLowerCase().includes(query);
        });
        for (const id of visible) {
            const button = el('button', 'snowbunny-action-option');
            button.type = 'button';
            if (!noPersonaSelected() && id === current) button.classList.add('current');

            const thumb = el('div', 'snowbunny-persona-thumb');
            const image = new Image();
            image.alt = '';
            image.src = getUserAvatar(id) || '';
            thumb.append(image);

            const copy = el('div', 'snowbunny-action-option-copy');
            copy.append(el('strong', '', personaName(id)));
            const title = power_user.persona_descriptions?.[id]?.title || '';
            const description = power_user.persona_descriptions?.[id]?.description || '';
            const subtitle = !noPersonaSelected() && id === current
                ? 'Current Persona for this chat'
                : title || description.replace(/\s+/g, ' ').trim() || id;
            copy.append(el('small', '', subtitle));
            button.append(thumb, copy);
            if (id === favorite) button.append(icon('fa-star', 'snowbunny-persona-star'));
            button.addEventListener('click', () => void selectPersona(id));
            list.append(button);
        }

        if (!list.children.length) {
            list.append(el('div', 'snowbunny-action-empty', ids.length ? 'No matching Personas.' : 'No Personas found.'));
        }
    };
    search.addEventListener('input', render);
    render();
    window.setTimeout(() => search.focus({ preventScroll: true }), 50);
}

function personaRow() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Persona',
    ) ?? null;
}

function enhance() {
    queued = false;
    const row = personaRow();
    if (!(row instanceof HTMLButtonElement)) return;
    const value = row.querySelector('.snowbunny-shell-row-value');
    if (value) value.textContent = noPersonaSelected() ? 'No Persona' : personaName(currentPersonaId()) || 'No Persona';
    row.disabled = false;
    row.setAttribute('aria-disabled', 'false');
    if (row.dataset.snowbunnyPersona === '1') return;
    row.dataset.snowbunnyPersona = '1';
    row.addEventListener('click', () => void openPersonaSelector());
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['PERSONA_CHANGED', 'PERSONA_CREATED', 'PERSONA_UPDATED', 'PERSONA_RENAMED', 'PERSONA_DELETED']) {
        const event = types[name];
        if (event) source.on(event, queueEnhance);
    }
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => void applyChatPersonaState());
    }
}

export function initPersonaSelector() {
    if (initialized) return;
    initialized = true;
    installStyles();
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueEnhance);
        observer.observe(drawer, { subtree: true, childList: true });
    }
    void applyChatPersonaState();
    enhance();
    registerEvents();
}
