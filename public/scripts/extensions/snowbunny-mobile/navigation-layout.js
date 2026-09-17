const TOP_ID = 'snowbunny-top-strip';
const LEFT_ID = 'snowbunny-left-drawer';
const RIGHT_ID = 'snowbunny-right-drawer';
const BACKDROP_ID = 'snowbunny-shell-backdrop';
const MORE_ID = 'snowbunny-more-sheet';
const STYLE_ID = 'snowbunny-navigation-layout-style';

let initialized = false;
let observer = null;
let queued = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function state() {
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
  body.snowbunny-mobile #${TOP_ID} {
    height: 50px !important;
    padding: 3px 7px !important;
  }
  body.snowbunny-mobile #${TOP_ID} .snowbunny-top-items {
    width: 100% !important;
    max-width: none !important;
    height: 100% !important;
    display: block !important;
  }
  body.snowbunny-mobile #${TOP_ID} .snowbunny-legacy-top-actions {
    display: none !important;
  }
  body.snowbunny-mobile #${TOP_ID} .snowbunny-chat-topbar {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    align-items: center;
    gap: 4px;
  }
  body.snowbunny-mobile #${TOP_ID} .snowbunny-chat-top-button {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 13px;
    background: transparent;
    color: inherit;
    font-size: 1rem;
  }
  body.snowbunny-mobile #${TOP_ID} .snowbunny-chat-top-button:active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 16%, transparent);
  }
  body.snowbunny-mobile #${TOP_ID} .snowbunny-chat-title {
    min-width: 0;
    text-align: center;
    line-height: 1.12;
  }
  body.snowbunny-mobile #${TOP_ID} .snowbunny-chat-title strong,
  body.snowbunny-mobile #${TOP_ID} .snowbunny-chat-title small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  body.snowbunny-mobile #${TOP_ID} .snowbunny-chat-title strong {
    font-size: .82rem;
    font-weight: 720;
  }
  body.snowbunny-mobile #${TOP_ID} .snowbunny-chat-title small {
    margin-top: 2px;
    font-size: .58rem;
    opacity: .52;
  }

  body.snowbunny-mobile #snowbunny-top-toggle,
  body.snowbunny-mobile #snowbunny-left-handle,
  body.snowbunny-mobile #snowbunny-right-handle,
  body.snowbunny-mobile #snowbunny-right-tabs,
  body.snowbunny-mobile #snowbunny-left-chat-utilities,
  body.snowbunny-mobile #${LEFT_ID} .snowbunny-navigation-hidden {
    display: none !important;
  }

  body.snowbunny-mobile #${RIGHT_ID} > .snowbunny-shell-bottom {
    display: grid !important;
  }
  body.snowbunny-mobile #${RIGHT_ID} .snowbunny-shell-section.snowbunny-right-tab-hidden {
    display: block !important;
  }
  body.snowbunny-mobile #${RIGHT_ID} .snowbunny-shell-row.snowbunny-right-tab-hidden,
  body.snowbunny-mobile #${RIGHT_ID} .snowbunny-member-row.snowbunny-right-tab-hidden {
    display: flex !important;
  }
  body.snowbunny-mobile #${RIGHT_ID} .snowbunny-shell-bottom.snowbunny-right-tab-hidden {
    display: grid !important;
  }

  #${MORE_ID} {
    position: fixed;
    z-index: 12420;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 46%);
  }
  #${MORE_ID} .snowbunny-more-card {
    width: min(100%, 600px);
    max-height: 82dvh;
    overflow-y: auto;
    padding: 8px 12px calc(15px + env(safe-area-inset-bottom));
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 70%, transparent);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor);
  }
  #${MORE_ID} .snowbunny-more-handle {
    width: 38px;
    height: 4px;
    margin: 0 auto 9px;
    border-radius: 999px;
    background: currentColor;
    opacity: .24;
  }
  #${MORE_ID} h3 { margin: 5px 5px 10px; font-size: .96rem; }
  #${MORE_ID} .snowbunny-more-row {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 11px;
    margin: 3px 0;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 15px;
    background: transparent;
    color: inherit;
    text-align: left;
  }
  #${MORE_ID} .snowbunny-more-row:active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent);
  }
  #${MORE_ID} .snowbunny-more-row > i { width: 25px; text-align: center; opacity: .78; }
  #${MORE_ID} .snowbunny-more-copy { flex: 1; min-width: 0; }
  #${MORE_ID} .snowbunny-more-copy strong,
  #${MORE_ID} .snowbunny-more-copy small { display: block; }
  #${MORE_ID} .snowbunny-more-copy strong { font-size: .82rem; }
  #${MORE_ID} .snowbunny-more-copy small { margin-top: 2px; font-size: .66rem; opacity: .55; }
}
`;
    document.head.append(style);
}

function currentRef() {
    const api = context();
    const chatId = api?.getCurrentChatId?.();
    if (!chatId) return null;
    if (api.groupId) return { kind: 'group', owner: String(api.groupId), chatId: String(chatId) };
    const index = Number.parseInt(String(api.characterId ?? ''), 10);
    const character = Number.isInteger(index) ? api?.characters?.[index] : null;
    return character?.avatar ? { kind: 'character', owner: String(character.avatar), chatId: String(chatId) } : null;
}

function sameRef(a, b) {
    return String(a?.kind || '') === String(b?.kind || '')
        && String(a?.owner || '') === String(b?.owner || '')
        && String(a?.chatId || '') === String(b?.chatId || '');
}

function currentStory() {
    const global = state()?.readGlobal?.() || {};
    const stories = Array.isArray(global.stories) ? global.stories : [];
    const chatState = state()?.readChat?.() || {};
    if (chatState.storyId) {
        const byId = stories.find(story => String(story.id) === String(chatState.storyId));
        if (byId) return byId;
    }
    const ref = currentRef();
    return ref ? stories.find(story => (story.chatRefs || []).some(item => sameRef(item, ref))) || null : null;
}

function titleData() {
    const api = context();
    const story = currentStory();
    const chatId = String(api?.getCurrentChatId?.() || '');
    if (story?.title) return { title: String(story.title), subtitle: chatId || 'Current chat' };
    const name = api?.groupId
        ? api?.groups?.find(group => String(group.id) === String(api.groupId))?.name
        : api?.name2;
    return {
        title: String(name || chatId || 'SnowBunny'),
        subtitle: story ? 'Story chat' : (chatId ? 'Chat' : 'Ready'),
    };
}

function clickLegacyTop(label) {
    const button = document.querySelector(`#${TOP_ID} .snowbunny-top-action[aria-label="${label}"]`);
    if (button instanceof HTMLElement) button.click();
}

function openDrawer(side) {
    const handle = document.getElementById(side === 'left' ? 'snowbunny-left-handle' : 'snowbunny-right-handle');
    if (handle instanceof HTMLElement) handle.click();
}

function closeDrawers() {
    document.getElementById(LEFT_ID)?.classList.remove('open');
    document.getElementById(RIGHT_ID)?.classList.remove('open');
    document.getElementById(BACKDROP_ID)?.classList.remove('open');
}

function rebuildTop() {
    const top = document.getElementById(TOP_ID);
    const items = top?.querySelector('.snowbunny-top-items');
    if (!(items instanceof HTMLElement)) return;

    let legacy = items.querySelector('.snowbunny-legacy-top-actions');
    if (!(legacy instanceof HTMLElement)) {
        legacy = el('div', 'snowbunny-legacy-top-actions');
        for (const button of [...items.querySelectorAll(':scope > .snowbunny-top-action')]) legacy.append(button);
        items.append(legacy);
    }

    let bar = items.querySelector('.snowbunny-chat-topbar');
    if (!(bar instanceof HTMLElement)) {
        bar = el('div', 'snowbunny-chat-topbar');
        const menu = el('button', 'snowbunny-chat-top-button');
        menu.type = 'button';
        menu.title = 'Chats and navigation';
        menu.setAttribute('aria-label', 'Open chats and navigation');
        menu.append(icon('fa-bars'));
        menu.addEventListener('click', () => openDrawer('left'));

        const title = el('div', 'snowbunny-chat-title');
        title.append(el('strong'), el('small'));

        const chat = el('button', 'snowbunny-chat-top-button');
        chat.type = 'button';
        chat.title = 'Current chat controls';
        chat.setAttribute('aria-label', 'Open current chat controls');
        chat.append(icon('fa-sliders'));
        chat.addEventListener('click', () => openDrawer('right'));

        bar.append(menu, title, chat);
        items.append(bar);
    }

    const data = titleData();
    const title = bar.querySelector('.snowbunny-chat-title');
    const strong = title?.querySelector('strong');
    const small = title?.querySelector('small');
    if (strong) strong.textContent = data.title;
    if (small) small.textContent = data.subtitle;

    document.body.classList.remove('snowbunny-top-collapsed');
}

function rowLabel(row) {
    return row.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() || '';
}

function sectionTitle(section) {
    return section.querySelector('.snowbunny-shell-section-title span')?.textContent?.trim() || '';
}

function shellRow(label, description, iconName, handler) {
    const button = el('button', 'snowbunny-shell-row');
    button.type = 'button';
    button.append(icon(iconName));
    const copy = el('div', 'snowbunny-shell-row-copy');
    copy.append(el('strong', '', label), el('small', '', description));
    button.append(copy, icon('fa-chevron-right'));
    button.lastElementChild?.classList.add('snowbunny-shell-row-chevron');
    button.addEventListener('click', handler);
    return button;
}

async function startNewChat() {
    closeDrawers();
    const api = context();
    if (typeof api?.doNewChat === 'function') {
        await api.doNewChat();
        return;
    }
    const native = document.getElementById('newChatFromManageScreenButton');
    if (native instanceof HTMLElement) native.click();
}

function ensureLeftNavigation() {
    const drawer = document.getElementById(LEFT_ID);
    const scroll = drawer?.querySelector('.snowbunny-shell-scroll');
    const bottom = drawer?.querySelector('.snowbunny-shell-bottom');
    if (!(scroll instanceof HTMLElement) || !(bottom instanceof HTMLElement)) return;

    for (const section of scroll.querySelectorAll(':scope > .snowbunny-shell-section')) {
        section.classList.toggle('snowbunny-navigation-hidden', sectionTitle(section) === 'Library');
    }

    const recent = [...scroll.querySelectorAll(':scope > .snowbunny-shell-section')].find(section => sectionTitle(section) === 'Recent Chats');
    if (recent && !document.getElementById('snowbunny-new-chat-row')) {
        const create = shellRow('New Chat', 'Start a fresh chat with the current character or group', 'fa-plus', () => void startNewChat());
        create.id = 'snowbunny-new-chat-row';
        recent.insertAdjacentElement('afterend', create);
    }

    const labels = [...bottom.querySelectorAll('.snowbunny-shell-quick span')].map(node => node.textContent?.trim()).filter(Boolean);
    const corrected = labels[0] === 'API' && labels[1] === 'Characters' && labels[2] === 'More';
    if (corrected) return;

    bottom.replaceChildren();
    bottom.style.gridTemplateColumns = 'repeat(3, 1fr)';

    const quick = (label, iconName, handler, extraClass = '') => {
        const button = el('button', `snowbunny-shell-quick${extraClass ? ` ${extraClass}` : ''}`);
        button.type = 'button';
        button.append(icon(iconName), el('span', '', label));
        if (handler) button.addEventListener('click', handler);
        return button;
    };

    bottom.append(
        quick('API', 'fa-plug', () => clickLegacyTop('API')),
        quick('Characters', 'fa-users', () => {
            const library = globalThis.SnowBunny?.characterLibrary;
            if (library?.open) library.open();
            else document.getElementById('rm_button_characters')?.click();
        }),
        quick('More', 'fa-ellipsis', openMore),
    );

    const settings = quick('Settings', 'fa-gear', null, 'snowbunny-hidden-settings-shortcut');
    settings.style.display = 'none';
    bottom.append(settings);
}

function findRightSection() {
    const drawer = document.getElementById(RIGHT_ID);
    const scroll = drawer?.querySelector('.snowbunny-shell-scroll');
    if (!(scroll instanceof HTMLElement)) return null;
    return [...scroll.querySelectorAll(':scope > .snowbunny-shell-section')].find(section =>
        [...section.querySelectorAll(':scope > .snowbunny-shell-row')].some(row => rowLabel(row) === 'Persona'),
    ) || null;
}

function ensureRightCurrentChat() {
    const drawer = document.getElementById(RIGHT_ID);
    if (!(drawer instanceof HTMLElement)) return;
    const section = findRightSection();
    if (section) {
        const title = section.querySelector('.snowbunny-shell-section-title span');
        if (title) title.textContent = 'Current Chat';

        const rows = [...section.querySelectorAll(':scope > .snowbunny-shell-row')];
        if (!rows.some(row => rowLabel(row) === 'Connection')) {
            const connection = shellRow('Connection', 'API connection used by the story-writing model', 'fa-plug', () => clickLegacyTop('API'));
            const model = rows.find(row => rowLabel(row) === 'Model');
            if (model) section.insertBefore(connection, model);
            else section.append(connection);
        }
        if (!rows.some(row => rowLabel(row) === 'Theme & Background')) {
            const look = shellRow('Theme & Background', 'Appearance for this chat', 'fa-palette', () => clickLegacyTop('Look'));
            const agents = rows.find(row => rowLabel(row) === 'Agents');
            if (agents) section.insertBefore(look, agents);
            else section.append(look);
        }
    }

    const bottom = drawer.querySelector('.snowbunny-shell-bottom');
    if (bottom instanceof HTMLElement) bottom.style.gridTemplateColumns = 'repeat(3, 1fr)';
}

function moreRow(label, description, iconName, handler) {
    const button = el('button', 'snowbunny-more-row');
    button.type = 'button';
    button.append(icon(iconName));
    const copy = el('div', 'snowbunny-more-copy');
    copy.append(el('strong', '', label), el('small', '', description));
    button.append(copy, icon('fa-chevron-right'));
    button.addEventListener('click', () => {
        document.getElementById(MORE_ID)?.remove();
        handler();
    });
    return button;
}

function clickHiddenLeftRow(label) {
    const row = [...document.querySelectorAll(`#${LEFT_ID} .snowbunny-shell-row`)].find(item => rowLabel(item) === label);
    if (row instanceof HTMLButtonElement && !row.disabled) row.click();
}

function openMore() {
    document.getElementById(MORE_ID)?.remove();
    closeDrawers();
    const overlay = el('div');
    overlay.id = MORE_ID;
    const card = el('section', 'snowbunny-more-card');
    card.append(el('div', 'snowbunny-more-handle'), el('h3', '', 'More'));
    card.append(
        moreRow('Stories', 'Story library and Story chats', 'fa-book-open', () => clickLegacyTop('Stories')),
        moreRow('Personas', 'Persona library and editor', 'fa-user', () => globalThis.SnowBunny?.personaLibrary?.open?.()),
        moreRow('Codex & Lorebooks', 'Lorebooks and Codex entries', 'fa-book-atlas', () => clickLegacyTop('Codex')),
        moreRow('Create', 'Create Story, chat, Lorebook, Character or Persona', 'fa-plus', () => clickHiddenLeftRow('Create')),
        moreRow('Extensions', 'Installed extensions and extension tools', 'fa-cubes', () => clickLegacyTop('Extensions')),
        moreRow('Look', 'Theme, background and appearance', 'fa-palette', () => clickLegacyTop('Look')),
        moreRow('Settings', 'Model controls and advanced configuration', 'fa-gear', () => {
            const settings = [...document.querySelectorAll(`#${LEFT_ID} .snowbunny-shell-quick`)].find(button => button.querySelector('span')?.textContent?.trim() === 'Settings');
            if (settings instanceof HTMLElement) settings.click();
            else document.querySelector('#user-settings-button > .drawer-toggle')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }),
    );
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) overlay.remove(); });
    document.body.append(overlay);
}

function reconcile() {
    queued = false;
    rebuildTop();
    ensureLeftNavigation();
    ensureRightCurrentChat();
}

function queueReconcile() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(reconcile);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'PERSONA_CHANGED', 'CHARACTER_EDITED']) {
        const event = types[name];
        if (event) source.on(event, queueReconcile);
    }
}

export function initNavigationLayout() {
    if (initialized) return;
    initialized = true;
    installStyles();
    document.body.classList.remove('snowbunny-top-collapsed');
    state()?.patchGlobal?.({ topMenuCollapsed: false });
    observer = new MutationObserver(queueReconcile);
    observer.observe(document.body, { childList: true, subtree: true });
    registerEvents();
    reconcile();
}
