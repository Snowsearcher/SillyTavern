const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SHEET_ID = 'snowbunny-action-sheet';
const STYLE_ID = 'snowbunny-persona-selector-style';

let initialized = false;
let observer = null;
let queued = false;

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
  #${SHEET_ID} .snowbunny-persona-thumb {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    overflow: hidden;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
  #${SHEET_ID} .snowbunny-persona-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  #${SHEET_ID} .snowbunny-persona-star {
    width: 20px;
    text-align: center;
    opacity: .7;
  }
}
`;
    document.head.append(style);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
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
    manage.addEventListener('click', () => {
        closeSheet();
        const wrapper = document.getElementById('persona-management-button');
        const panel = wrapper?.querySelector(':scope > .drawer-content');
        const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
        if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
    });
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

function currentPersonaId(api = context()) {
    return api?.chatMetadata?.persona || api?.user_avatar || '';
}

function personaName(id, api = context()) {
    return api?.powerUserSettings?.personas?.[id] || (id === api?.user_avatar ? api?.name1 : '') || '[Unnamed Persona]';
}

async function selectPersona(id) {
    const api = context();
    if (!api?.getCurrentChatId?.() || typeof api?.setUserAvatar !== 'function') return;
    await api.setUserAvatar(id, { toastPersonaNameChange: false, navigateToCurrent: false });
    api.chatMetadata.persona = id;
    api.saveMetadataDebounced?.();
    closeSheet();
    queueEnhance();
}

async function openPersonaSelector() {
    const api = context();
    const card = createSheet('Persona');
    const search = el('input', 'snowbunny-action-search');
    search.type = 'search';
    search.placeholder = 'Search Personas';
    search.autocomplete = 'off';
    const list = el('div', 'snowbunny-action-list');
    card.append(search, list);

    let ids = [];
    try {
        ids = await api?.getUserAvatars?.(false) ?? [];
    } catch (error) {
        console.warn('[SnowBunny] Could not load Personas.', error);
    }
    if (!Array.isArray(ids)) ids = [];

    const favorite = api?.powerUserSettings?.default_persona || '';
    ids.sort((a, b) => {
        if (a === favorite) return -1;
        if (b === favorite) return 1;
        return personaName(a, api).localeCompare(personaName(b, api));
    });

    const render = () => {
        const query = search.value.trim().toLowerCase();
        const current = currentPersonaId(api);
        const visible = ids.filter(id => {
            const description = api?.powerUserSettings?.persona_descriptions?.[id]?.description || '';
            return `${personaName(id, api)} ${description}`.toLowerCase().includes(query);
        });
        list.replaceChildren();
        if (!visible.length) {
            list.append(el('div', 'snowbunny-action-empty', ids.length ? 'No matching Personas.' : 'No Personas found.'));
            return;
        }
        for (const id of visible) {
            const button = el('button', 'snowbunny-action-option');
            button.type = 'button';
            if (id === current) button.classList.add('current');

            const thumb = el('div', 'snowbunny-persona-thumb');
            const image = new Image();
            image.alt = '';
            image.src = api?.getUserAvatar?.(id) || '';
            thumb.append(image);

            const copy = el('div', 'snowbunny-action-option-copy');
            copy.append(el('strong', '', personaName(id, api)));
            const title = api?.powerUserSettings?.persona_descriptions?.[id]?.title || '';
            const description = api?.powerUserSettings?.persona_descriptions?.[id]?.description || '';
            const subtitle = id === current
                ? 'Current Persona for this chat'
                : title || description.replace(/\s+/g, ' ').trim() || id;
            copy.append(el('small', '', subtitle));
            button.append(thumb, copy);
            if (id === favorite) button.append(icon('fa-star', 'snowbunny-persona-star'));
            button.addEventListener('click', () => void selectPersona(id));
            list.append(button);
        }
    };
    search.addEventListener('input', render);
    render();
    window.setTimeout(() => search.focus({ preventScroll: true }), 50);
}

function personaRow() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Persona',
    );
}

function enhance() {
    queued = false;
    const row = personaRow();
    if (!(row instanceof HTMLButtonElement)) return;
    const api = context();
    const value = row.querySelector('.snowbunny-shell-row-value');
    if (value) value.textContent = personaName(currentPersonaId(api), api) || 'No Persona';
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
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'PERSONA_CHANGED', 'PERSONA_CREATED', 'PERSONA_UPDATED', 'PERSONA_RENAMED', 'PERSONA_DELETED']) {
        if (types[name]) source.on(types[name], queueEnhance);
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
    enhance();
    registerEvents();
}
