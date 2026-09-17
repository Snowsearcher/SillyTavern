const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SECTION_ID = 'snowbunny-extension-tools-section';
const SHEET_ID = 'snowbunny-extension-tools-sheet';
const STYLE_ID = 'snowbunny-extension-tools-style';
const TOOL_SELECTOR = '.mes_button, .menu_button, .list-group-item, .interactable, button, [role="button"]';

let initialized = false;
let drawerObserver = null;
let toolsObserver = null;
let renderQueued = false;

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

function icon(classNames = 'fa-solid fa-wand-magic-sparkles') {
    const node = el('i', classNames);
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
    z-index: 12120;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 46%);
  }
  #${SHEET_ID} .snowbunny-extension-card {
    width: min(100%, 620px);
    max-height: 82dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 76%, transparent);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor);
    box-shadow: 0 -18px 52px rgb(0 0 0 / 38%);
  }
  #${SHEET_ID} .snowbunny-extension-handle {
    width: 38px;
    height: 4px;
    margin: 8px auto 2px;
    border-radius: 999px;
    background: currentColor;
    opacity: .24;
  }
  #${SHEET_ID} .snowbunny-extension-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px 9px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
  }
  #${SHEET_ID} .snowbunny-extension-header h3 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: .96rem;
  }
  #${SHEET_ID} .snowbunny-extension-header button {
    min-width: 38px;
    min-height: 38px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
  }
  #${SHEET_ID} .snowbunny-extension-search {
    margin: 10px 12px 6px;
    min-height: 42px;
    padding: 8px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 68%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 64%, transparent);
    color: inherit;
    font: inherit;
  }
  #${SHEET_ID} .snowbunny-extension-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 5px 10px calc(14px + env(safe-area-inset-bottom));
  }
  #${SHEET_ID} .snowbunny-extension-item {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 52px;
    margin: 3px 0;
    border-radius: 15px;
  }
  #${SHEET_ID} .snowbunny-extension-run {
    flex: 1;
    min-width: 0;
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 15px;
    background: transparent;
    color: inherit;
    text-align: left;
  }
  #${SHEET_ID} .snowbunny-extension-run:active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent);
  }
  #${SHEET_ID} .snowbunny-extension-run > i {
    width: 22px;
    flex: 0 0 22px;
    text-align: center;
    opacity: .76;
  }
  #${SHEET_ID} .snowbunny-extension-copy { flex: 1; min-width: 0; }
  #${SHEET_ID} .snowbunny-extension-copy strong,
  #${SHEET_ID} .snowbunny-extension-copy small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #${SHEET_ID} .snowbunny-extension-copy strong { font-size: .84rem; }
  #${SHEET_ID} .snowbunny-extension-copy small { margin-top: 2px; font-size: .67rem; opacity: .55; }
  #${SHEET_ID} .snowbunny-extension-pin {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border: 0;
    border-radius: 13px;
    background: transparent;
    color: inherit;
    opacity: .62;
  }
  #${SHEET_ID} .snowbunny-extension-pin.pinned {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent);
    opacity: 1;
  }
  #${SHEET_ID} .snowbunny-extension-empty {
    padding: 24px 14px;
    text-align: center;
    font-size: .78rem;
    line-height: 1.45;
    opacity: .6;
  }
}
`;
    document.head.append(style);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function closeSnowBunnyDrawer() {
    document.getElementById(RIGHT_DRAWER_ID)?.classList.remove('open');
    document.getElementById('snowbunny-shell-backdrop')?.classList.remove('open');
}

function openNativeExtensions() {
    closeSheet();
    closeSnowBunnyDrawer();
    const wrapper = document.getElementById('extensions-settings-button');
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
}

function ownVisible(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hidden || element.classList.contains('displayNone')) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.style.display === 'none' || element.style.visibility === 'hidden') return false;
    if (element instanceof HTMLButtonElement && element.disabled) return false;
    return true;
}

function toolLabel(element) {
    const raw = element.getAttribute('title')
        || element.getAttribute('aria-label')
        || element.getAttribute('data-tooltip')
        || element.textContent
        || '';
    return String(raw).replace(/\s+/g, ' ').trim().slice(0, 120) || 'Extension tool';
}

function toolIcon(element) {
    const own = [...element.classList].filter(name => name.startsWith('fa-'));
    if (own.length) return own.join(' ');
    const nested = element.querySelector('i');
    if (nested) {
        const classes = [...nested.classList].filter(name => name.startsWith('fa-'));
        if (classes.length) return classes.join(' ');
    }
    return 'fa-solid fa-wand-magic-sparkles';
}

function toolKey(element, label) {
    if (element.id) return `id:${element.id}`;
    const container = element.closest('.extension_container');
    const semantic = [...element.classList]
        .filter(name => !name.startsWith('fa-') && !['menu_button', 'mes_button', 'interactable', 'list-group-item'].includes(name))
        .sort()
        .join('.');
    return `tool:${container?.id || 'extensions'}:${semantic || label.toLowerCase()}`;
}

function isTopInteractive(element, menu) {
    let parent = element.parentElement;
    while (parent && parent !== menu) {
        if (parent.matches?.(TOOL_SELECTOR)) return false;
        parent = parent.parentElement;
    }
    return true;
}

function discoverTools() {
    const menu = document.getElementById('extensionsMenu');
    if (!(menu instanceof HTMLElement)) return [];

    const seen = new Set();
    const tools = [];
    for (const element of menu.querySelectorAll(TOOL_SELECTOR)) {
        if (!(element instanceof HTMLElement) || !ownVisible(element) || !isTopInteractive(element, menu)) continue;
        const label = toolLabel(element);
        const key = toolKey(element, label);
        if (seen.has(key)) continue;
        seen.add(key);
        tools.push({ key, label, icon: toolIcon(element), source: element });
    }
    return tools;
}

function pinnedKeys() {
    const value = snowState()?.readChat?.()?.pinnedExtensionTools;
    return Array.isArray(value) ? value.filter(key => typeof key === 'string') : [];
}

function canPin() {
    return Boolean(context()?.getCurrentChatId?.());
}

function setPinned(key, on) {
    if (!canPin()) return;
    const next = new Set(pinnedKeys());
    if (on) next.add(key);
    else next.delete(key);
    snowState()?.patchChat?.({ pinnedExtensionTools: [...next] });
}

function runTool(tool) {
    closeSheet();
    closeSnowBunnyDrawer();
    if (tool?.source?.isConnected) tool.source.click();
}

function buildShellRow(tool, description = 'Pinned extension tool') {
    const button = el('button', 'snowbunny-shell-row');
    button.type = 'button';
    button.append(icon(tool?.icon || 'fa-solid fa-cubes'));
    const copy = el('div', 'snowbunny-shell-row-copy');
    copy.append(el('strong', '', tool?.label || 'Extension tools'));
    if (description) copy.append(el('small', '', description));
    button.append(copy, icon('fa-solid fa-chevron-right snowbunny-shell-row-chevron'));
    if (tool) button.addEventListener('click', () => runTool(tool));
    else button.addEventListener('click', openSheet);
    return button;
}

function renderPinned() {
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    const scroll = drawer?.querySelector('.snowbunny-shell-scroll');
    if (!(scroll instanceof HTMLElement)) return;

    document.getElementById(SECTION_ID)?.remove();
    const section = el('section', 'snowbunny-shell-section');
    section.id = SECTION_ID;
    const heading = el('div', 'snowbunny-shell-section-title');
    heading.append(el('span', '', 'Extensions'));
    section.append(heading);

    const all = discoverTools();
    const byKey = new Map(all.map(tool => [tool.key, tool]));
    const pinned = pinnedKeys().map(key => byKey.get(key)).filter(Boolean);

    if (!pinned.length) {
        section.append(buildShellRow(null, all.length ? 'Choose and pin the tools you use in this chat' : 'No extension tools are available yet'));
    } else {
        for (const tool of pinned) section.append(buildShellRow(tool));
        const more = buildShellRow(null, 'Choose, pin or open another extension tool');
        more.querySelector('strong').textContent = 'More extension tools';
        more.querySelector('i').className = 'fa-solid fa-plus';
        section.append(more);
    }

    scroll.append(section);
}

function renderSheetList(searchValue = '') {
    const list = document.querySelector(`#${SHEET_ID} .snowbunny-extension-list`);
    if (!(list instanceof HTMLElement)) return;

    const query = searchValue.trim().toLowerCase();
    const pins = new Set(pinnedKeys());
    const tools = discoverTools().filter(tool => tool.label.toLowerCase().includes(query));
    list.replaceChildren();

    if (!tools.length) {
        list.append(el('div', 'snowbunny-extension-empty', query ? 'No matching extension tools.' : 'No extension tools are currently available.'));
        return;
    }

    for (const tool of tools) {
        const item = el('div', 'snowbunny-extension-item');
        const run = el('button', 'snowbunny-extension-run');
        run.type = 'button';
        run.append(icon(tool.icon));
        const copy = el('div', 'snowbunny-extension-copy');
        copy.append(el('strong', '', tool.label), el('small', '', pins.has(tool.key) ? 'Pinned in this chat' : 'SillyTavern extension action'));
        run.append(copy);
        run.addEventListener('click', () => runTool(tool));
        item.append(run);

        const pin = el('button', `snowbunny-extension-pin${pins.has(tool.key) ? ' pinned' : ''}`);
        pin.type = 'button';
        pin.disabled = !canPin();
        pin.title = canPin() ? (pins.has(tool.key) ? 'Unpin from this chat' : 'Pin in this chat') : 'Open a chat to pin tools';
        pin.setAttribute('aria-label', pin.title);
        pin.append(icon(pins.has(tool.key) ? 'fa-solid fa-thumbtack' : 'fa-solid fa-plus'));
        pin.addEventListener('click', () => {
            const next = !pins.has(tool.key);
            setPinned(tool.key, next);
            renderPinned();
            const search = document.querySelector(`#${SHEET_ID} .snowbunny-extension-search`);
            renderSheetList(search instanceof HTMLInputElement ? search.value : '');
        });
        item.append(pin);
        list.append(item);
    }
}

function openSheet() {
    closeSheet();
    closeSnowBunnyDrawer();
    document.getElementById('snowbunny-action-sheet')?.remove();
    document.getElementById('snowbunny-shell-sheet')?.remove();

    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-extension-card');
    card.append(el('div', 'snowbunny-extension-handle'));

    const header = el('header', 'snowbunny-extension-header');
    header.append(el('h3', '', 'Extension tools'));

    const manage = el('button');
    manage.type = 'button';
    manage.title = 'Manage installed extensions';
    manage.setAttribute('aria-label', manage.title);
    manage.append(icon('fa-solid fa-gear'));
    manage.addEventListener('click', openNativeExtensions);

    const close = el('button');
    close.type = 'button';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close extension tools');
    close.append(icon('fa-solid fa-xmark'));
    close.addEventListener('click', closeSheet);
    header.append(manage, close);

    const search = el('input', 'snowbunny-extension-search');
    search.type = 'search';
    search.placeholder = 'Search extension tools';
    search.autocomplete = 'off';
    search.addEventListener('input', () => renderSheetList(search.value));

    card.append(header, search, el('div', 'snowbunny-extension-list'));
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);
    renderSheetList();
    window.setTimeout(() => search.focus({ preventScroll: true }), 50);
}

function interceptTopExtensions() {
    const button = document.querySelector('#snowbunny-top-strip .snowbunny-top-action[aria-label="Extensions"]');
    if (!(button instanceof HTMLButtonElement) || button.dataset.snowbunnyExtensionTools === 'true') return;
    button.dataset.snowbunnyExtensionTools = 'true';
    button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSheet();
    }, true);
}

function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        interceptTopExtensions();
        if (!document.getElementById(SECTION_ID)) renderPinned();
        if (document.getElementById(SHEET_ID)) {
            const search = document.querySelector(`#${SHEET_ID} .snowbunny-extension-search`);
            renderSheetList(search instanceof HTMLInputElement ? search.value : '');
        }
    });
}

function registerChatEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    const changed = () => requestAnimationFrame(renderPinned);
    if (types.CHAT_CHANGED) source.on(types.CHAT_CHANGED, changed);
    if (types.CHAT_LOADED) source.on(types.CHAT_LOADED, changed);
}

export function initExtensionToolsUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    interceptTopExtensions();
    renderPinned();
    registerChatEvents();

    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        drawerObserver = new MutationObserver(() => {
            if (!document.getElementById(SECTION_ID)) queueRender();
        });
        drawerObserver.observe(drawer, { childList: true, subtree: true });
    }

    const menu = document.getElementById('extensionsMenu');
    if (menu) {
        toolsObserver = new MutationObserver(queueRender);
        toolsObserver.observe(menu, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    }
}
