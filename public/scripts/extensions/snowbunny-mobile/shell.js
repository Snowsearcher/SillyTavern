const MOBILE_MEDIA_QUERY = '(max-width: 1000px)';
const STYLE_ID = 'snowbunny-shell-style';
const TOP_ID = 'snowbunny-top-strip';
const LEFT_ID = 'snowbunny-left-drawer';
const RIGHT_ID = 'snowbunny-right-drawer';
const BACKDROP_ID = 'snowbunny-shell-backdrop';
const SHEET_ID = 'snowbunny-shell-sheet';

let initialized = false;
let mobileQuery;
let activeDrawer = null;
let edgeStart = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function isMobile() {
    return Boolean(mobileQuery?.matches && document.body.classList.contains('snowbunny-mobile'));
}

function el(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function icon(name, className = '') {
    const node = el('i', `fa-solid ${name}${className ? ` ${className}` : ''}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  body.snowbunny-mobile {
    --sb-shell-top: 54px;
    --sb-shell-panel: color-mix(in srgb, var(--SmartThemeBlurTintColor) 97%, #111 3%);
    --sb-shell-border: color-mix(in srgb, var(--SmartThemeBorderColor) 76%, transparent);
    --sb-shell-accent: var(--SmartThemeEmColor, #c7a8ff);
  }

  /* SnowBunny owns the visible mobile shell. Keep ST's real drawers available
     underneath so temporary bridge routes still reach the canonical controls. */
  body.snowbunny-mobile #top-bar,
  body.snowbunny-mobile #top-settings-holder > .drawer > .drawer-toggle,
  body.snowbunny-mobile #rightNavHolder > .drawer-toggle {
    display: none !important;
  }
  body.snowbunny-mobile #top-settings-holder {
    pointer-events: none !important;
    height: 0 !important;
    min-height: 0 !important;
  }
  body.snowbunny-mobile #top-settings-holder .drawer-content,
  body.snowbunny-mobile #rightNavHolder .drawer-content {
    pointer-events: auto !important;
  }
  body.snowbunny-mobile #top-settings-holder .drawer-content.openDrawer,
  body.snowbunny-mobile #rightNavHolder .drawer-content.openDrawer {
    z-index: 12020 !important;
  }

  body.snowbunny-mobile #sheld {
    top: var(--sb-shell-top) !important;
    height: calc(100dvh - var(--sb-shell-top)) !important;
    transition: top 160ms ease, height 160ms ease;
  }
  body.snowbunny-mobile.snowbunny-top-collapsed #sheld {
    top: 0 !important;
    height: 100dvh !important;
  }

  #${TOP_ID} {
    position: fixed;
    z-index: 12000;
    top: max(0px, env(safe-area-inset-top));
    left: 0;
    right: 0;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    border-bottom: 1px solid var(--sb-shell-border);
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 91%, transparent);
    box-shadow: 0 6px 24px rgb(0 0 0 / 14%);
    backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) * 1.45));
    -webkit-backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) * 1.45));
    transform: translateY(0);
    transition: transform 160ms ease;
  }
  body.snowbunny-top-collapsed #${TOP_ID} {
    transform: translateY(calc(-100% - env(safe-area-inset-top)));
  }
  #${TOP_ID} .snowbunny-top-items {
    width: min(100%, 430px);
    height: 100%;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 2px;
  }
  #${TOP_ID} .snowbunny-top-action {
    min-width: 0;
    min-height: 42px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 3px 2px;
    border: 0;
    border-radius: 13px;
    background: transparent;
    color: inherit;
  }
  #${TOP_ID} .snowbunny-top-action:first-child {
    width: 44px;
    justify-self: center;
    border-radius: 50%;
    background: color-mix(in srgb, var(--sb-shell-accent) 15%, transparent);
  }
  #${TOP_ID} .snowbunny-top-action i { font-size: 1rem; opacity: .9; }
  #${TOP_ID} .snowbunny-top-action span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: .57rem;
    opacity: .72;
  }
  #${TOP_ID} .snowbunny-top-action:not(:disabled):active {
    background: color-mix(in srgb, var(--sb-shell-accent) 18%, transparent);
  }
  #${TOP_ID} .snowbunny-top-action:disabled { opacity: .34; }

  #snowbunny-top-toggle {
    position: fixed;
    z-index: 12005;
    top: calc(max(0px, env(safe-area-inset-top)) + 48px);
    left: 50%;
    width: 44px;
    height: 12px;
    transform: translateX(-50%);
    border: 0;
    border-radius: 0 0 999px 999px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 92%, transparent);
    color: inherit;
    opacity: .58;
    transition: top 160ms ease, opacity 120ms ease;
  }
  #snowbunny-top-toggle::before {
    content: '';
    display: block;
    width: 18px;
    height: 3px;
    margin: 2px auto 0;
    border-radius: 99px;
    background: currentColor;
    opacity: .55;
  }
  body.snowbunny-top-collapsed #snowbunny-top-toggle {
    top: max(0px, env(safe-area-inset-top));
    opacity: .82;
  }

  #snowbunny-left-handle,
  #snowbunny-right-handle {
    position: fixed;
    z-index: 11980;
    top: 46%;
    width: 19px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--sb-shell-border);
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 82%, transparent);
    color: inherit;
    opacity: .54;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  #snowbunny-left-handle { left: -1px; border-radius: 0 14px 14px 0; }
  #snowbunny-right-handle { right: -1px; border-radius: 14px 0 0 14px; }
  #snowbunny-left-handle i, #snowbunny-right-handle i { font-size: .72rem; }

  #${BACKDROP_ID} {
    position: fixed;
    z-index: 12030;
    inset: 0;
    display: none;
    background: rgb(0 0 0 / 42%);
    opacity: 0;
    transition: opacity 160ms ease;
  }
  #${BACKDROP_ID}.open { display: block; opacity: 1; }

  .snowbunny-shell-drawer {
    position: fixed;
    z-index: 12040;
    top: max(8px, env(safe-area-inset-top));
    bottom: max(8px, env(safe-area-inset-bottom));
    width: min(88vw, 390px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--sb-shell-border);
    background: var(--sb-shell-panel);
    color: var(--SmartThemeBodyColor);
    box-shadow: 0 18px 54px rgb(0 0 0 / 38%);
    backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) * 1.8));
    -webkit-backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) * 1.8));
    transition: transform 190ms cubic-bezier(.2,.8,.2,1);
  }
  #${LEFT_ID} {
    left: 0;
    border-radius: 0 24px 24px 0;
    transform: translateX(-105%);
  }
  #${RIGHT_ID} {
    right: 0;
    border-radius: 24px 0 0 24px;
    transform: translateX(105%);
  }
  #${LEFT_ID}.open, #${RIGHT_ID}.open { transform: translateX(0); }

  .snowbunny-shell-header {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 56px;
    padding: 9px 10px 8px 16px;
    border-bottom: 1px solid var(--sb-shell-border);
  }
  .snowbunny-shell-header h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }
  .snowbunny-shell-close {
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
  }
  .snowbunny-shell-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 10px 12px 16px;
  }
  .snowbunny-shell-section { margin: 4px 0 14px; }
  .snowbunny-shell-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 32px;
    padding: 0 7px;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .025em;
    opacity: .68;
  }
  .snowbunny-shell-row {
    width: 100%;
    min-height: 50px;
    display: flex;
    align-items: center;
    gap: 11px;
    margin: 3px 0;
    padding: 7px 10px;
    border: 1px solid transparent;
    border-radius: 15px;
    background: transparent;
    color: inherit;
    text-align: left;
  }
  .snowbunny-shell-row:not(:disabled):active {
    background: color-mix(in srgb, var(--sb-shell-accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--sb-shell-accent) 22%, transparent);
  }
  .snowbunny-shell-row:disabled { opacity: .38; }
  .snowbunny-shell-row > i {
    width: 24px;
    flex: 0 0 24px;
    text-align: center;
    font-size: 1rem;
    opacity: .8;
  }
  .snowbunny-shell-row-copy { flex: 1; min-width: 0; }
  .snowbunny-shell-row-copy strong,
  .snowbunny-shell-row-copy small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .snowbunny-shell-row-copy strong { font-size: .84rem; font-weight: 650; }
  .snowbunny-shell-row-copy small { margin-top: 2px; font-size: .67rem; opacity: .55; }
  .snowbunny-shell-row-value {
    max-width: 42%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: .72rem;
    opacity: .62;
  }
  .snowbunny-shell-row-chevron { font-size: .66rem !important; opacity: .42 !important; }

  .snowbunny-member-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    margin: 4px 0;
    padding: 6px 8px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 55%, transparent);
    border-radius: 15px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 56%, transparent);
  }
  .snowbunny-member-avatar {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    overflow: hidden;
    border-radius: 50%;
    background: color-mix(in srgb, currentColor 9%, transparent);
  }
  .snowbunny-member-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .snowbunny-member-avatar i { width: 100%; line-height: 38px; text-align: center; opacity: .6; }
  .snowbunny-member-name { flex: 1; min-width: 0; font-size: .84rem; font-weight: 650; }
  .snowbunny-members-add {
    min-width: 42px;
    min-height: 32px;
    border: 0;
    border-radius: 11px;
    background: color-mix(in srgb, var(--sb-shell-accent) 13%, transparent);
    color: inherit;
    font-size: .72rem;
    font-weight: 700;
  }
  .snowbunny-members-add:disabled { opacity: .38; }

  .snowbunny-library-current {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border: 1px solid var(--sb-shell-border);
    border-radius: 17px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
  }
  .snowbunny-library-current i { width: 28px; text-align: center; opacity: .7; }
  .snowbunny-library-current div { flex: 1; min-width: 0; }
  .snowbunny-library-current strong,
  .snowbunny-library-current small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .snowbunny-library-current strong { font-size: .84rem; }
  .snowbunny-library-current small { margin-top: 2px; font-size: .67rem; opacity: .55; }

  .snowbunny-shell-bottom {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    padding: 8px 9px calc(8px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--sb-shell-border);
  }
  .snowbunny-shell-quick {
    min-width: 0;
    min-height: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border: 0;
    border-radius: 13px;
    background: transparent;
    color: inherit;
  }
  .snowbunny-shell-quick i { font-size: 1rem; opacity: .82; }
  .snowbunny-shell-quick span { font-size: .59rem; opacity: .65; }
  .snowbunny-shell-quick:disabled { opacity: .34; }

  #${SHEET_ID} {
    position: fixed;
    z-index: 12060;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 44%);
  }
  #${SHEET_ID} .snowbunny-shell-sheet-card {
    width: min(100%, 560px);
    max-height: 75dvh;
    padding: 7px 12px calc(14px + env(safe-area-inset-bottom));
    overflow-y: auto;
    border: 1px solid var(--sb-shell-border);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: var(--sb-shell-panel);
    box-shadow: 0 -18px 48px rgb(0 0 0 / 35%);
  }
  #${SHEET_ID} .snowbunny-shell-sheet-handle {
    width: 38px;
    height: 4px;
    margin: 1px auto 9px;
    border-radius: 99px;
    background: currentColor;
    opacity: .25;
  }
  #${SHEET_ID} h3 { margin: 7px 5px 10px; font-size: .94rem; }

  @media (prefers-reduced-motion: reduce) {
    #${TOP_ID}, #snowbunny-top-toggle, .snowbunny-shell-drawer, #${BACKDROP_ID} { transition: none !important; }
  }
}
`;
    document.head.append(style);
}

function topAction({ label, iconName, onClick, disabled = false, title = label }) {
    const button = el('button', 'snowbunny-top-action');
    button.type = 'button';
    button.disabled = disabled;
    button.title = title;
    button.setAttribute('aria-label', label);
    button.append(icon(iconName), el('span', '', label));
    if (!disabled && onClick) button.addEventListener('click', onClick);
    return button;
}

function shellRow({ label, description = '', iconName, value = '', onClick, disabled = false }) {
    const button = el('button', 'snowbunny-shell-row');
    button.type = 'button';
    button.disabled = disabled;
    button.append(icon(iconName));
    const copy = el('div', 'snowbunny-shell-row-copy');
    copy.append(el('strong', '', label));
    if (description) copy.append(el('small', '', description));
    button.append(copy);
    if (value) button.append(el('span', 'snowbunny-shell-row-value', value));
    if (!disabled && onClick) {
        button.append(icon('fa-chevron-right', 'snowbunny-shell-row-chevron'));
        button.addEventListener('click', onClick);
    }
    return button;
}

function section(title, rows = [], trailing = null) {
    const host = el('section', 'snowbunny-shell-section');
    const heading = el('div', 'snowbunny-shell-section-title');
    heading.append(el('span', '', title));
    if (trailing) heading.append(trailing);
    host.append(heading, ...rows);
    return host;
}

function closeNativeDrawers() {
    document.querySelectorAll('.drawer-content.openDrawer').forEach(panel => {
        const drawer = panel.closest('.drawer');
        const toggle = drawer?.querySelector(':scope > .drawer-toggle');
        if (toggle instanceof HTMLElement) toggle.click();
    });
}

function openNativeDrawer(wrapperId, afterOpen = null) {
    closeDrawers();
    closeSheet();
    const wrapper = document.getElementById(wrapperId);
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (!(toggle instanceof HTMLElement)) return;
    if (!panel?.classList.contains('openDrawer')) toggle.click();
    if (afterOpen) window.setTimeout(afterOpen, 100);
}

function openCharacterManager() {
    openNativeDrawer('rightNavHolder', () => {
        document.getElementById('rm_button_characters')?.click();
    });
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function openAppearanceSheet() {
    closeDrawers();
    closeSheet();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-shell-sheet-card');
    card.append(el('div', 'snowbunny-shell-sheet-handle'), el('h3', '', 'Appearance'));
    card.append(
        shellRow({
            label: 'Backgrounds',
            description: 'Change the chat background.',
            iconName: 'fa-panorama',
            onClick: () => openNativeDrawer('backgrounds-button'),
        }),
        shellRow({
            label: 'Theme & interface',
            description: 'Use the current theme controls while SnowBunny’s appearance editor is ported.',
            iconName: 'fa-palette',
            onClick: () => openNativeDrawer('user-settings-button'),
        }),
    );
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);
}

function installTopStrip() {
    if (document.getElementById(TOP_ID)) return;
    const top = el('nav');
    top.id = TOP_ID;
    top.setAttribute('aria-label', 'SnowBunny workspace');
    const items = el('div', 'snowbunny-top-items');
    items.append(
        topAction({
            label: 'Stories',
            iconName: 'fa-book-open',
            disabled: true,
            title: 'Stories browser is the next library surface being ported',
        }),
        topAction({
            label: 'Response',
            iconName: 'fa-sliders',
            onClick: () => openNativeDrawer('ai-config-button'),
            title: 'AI Response Configuration',
        }),
        topAction({ label: 'API', iconName: 'fa-plug', onClick: () => openNativeDrawer('sys-settings-button') }),
        topAction({
            label: 'Codex',
            iconName: 'fa-book-atlas',
            disabled: true,
            title: 'SnowBunny Codex is not wired to the new shell yet',
        }),
        topAction({ label: 'Look', iconName: 'fa-image', onClick: openAppearanceSheet, title: 'Backgrounds & Themes' }),
        topAction({ label: 'Extensions', iconName: 'fa-cubes', onClick: () => openNativeDrawer('extensions-settings-button') }),
    );
    top.append(items);
    document.body.append(top);

    const toggle = el('button');
    toggle.id = 'snowbunny-top-toggle';
    toggle.type = 'button';
    toggle.title = 'Hide or show top menu';
    toggle.setAttribute('aria-label', 'Hide or show top menu');
    toggle.addEventListener('click', () => {
        document.body.classList.toggle('snowbunny-top-collapsed');
        void globalThis.SnowBunny?.state?.patchGlobal?.({
            topMenuCollapsed: document.body.classList.contains('snowbunny-top-collapsed'),
        });
    });
    document.body.append(toggle);
}

function currentChatLabel() {
    const api = context();
    if (!api?.getCurrentChatId?.()) return 'No chat open';
    const last = Array.isArray(api.chat) ? api.chat.at(-1) : null;
    return last?.name || api.name2 || 'Current chat';
}

function currentMember() {
    const api = context();
    const messages = [...document.querySelectorAll('#chat .mes:not([is_user="true"])')].reverse();
    const assistant = messages.find(message => {
        const id = Number.parseInt(message.getAttribute('mesid') || '', 10);
        return Number.isInteger(id) && !api?.chat?.[id]?.is_system;
    });
    const id = assistant ? Number.parseInt(assistant.getAttribute('mesid') || '', 10) : NaN;
    const data = Number.isInteger(id) ? api?.chat?.[id] : null;
    return {
        name: data?.name || api?.name2 || 'Assistant',
        src: assistant?.querySelector('.avatar img')?.getAttribute('src') || '',
    };
}

function selectedPreset() {
    for (const selector of [
        '#settings_preset_openai',
        '#settings_preset_textgenerationwebui',
        '#settings_preset',
        '#settings_preset_novel',
    ]) {
        const select = document.querySelector(selector);
        if (!(select instanceof HTMLSelectElement) || !select.value) continue;
        return select.selectedOptions[0]?.textContent?.trim() || select.value;
    }
    return '';
}

function selectedModel() {
    const api = context();
    try {
        const model = api?.getChatCompletionModel?.();
        if (model) return String(model);
    } catch (_) {
        // Text-completion backends do not necessarily expose an OAI model.
    }
    for (const selector of [
        '#openai_model',
        '#model_openrouter_select',
        '#model_custom_select',
        '#textgenerationwebui_model',
    ]) {
        const select = document.querySelector(selector);
        if (select instanceof HTMLSelectElement && select.value) {
            return select.selectedOptions[0]?.textContent?.trim() || select.value;
        }
    }
    return 'Use API model';
}

function drawerFrame(id, title) {
    const drawer = el('aside', 'snowbunny-shell-drawer');
    drawer.id = id;
    drawer.setAttribute('aria-label', title);
    const header = el('header', 'snowbunny-shell-header');
    header.append(el('h2', '', title));
    const close = el('button', 'snowbunny-shell-close');
    close.type = 'button';
    close.setAttribute('aria-label', `Close ${title}`);
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeDrawers);
    header.append(close);
    const scroll = el('div', 'snowbunny-shell-scroll');
    const bottom = el('footer', 'snowbunny-shell-bottom');
    drawer.append(header, scroll, bottom);
    return { drawer, scroll, bottom };
}

function quickButton(label, iconName, onClick, disabled = false) {
    const button = el('button', 'snowbunny-shell-quick');
    button.type = 'button';
    button.disabled = disabled;
    button.append(icon(iconName), el('span', '', label));
    if (!disabled && onClick) button.addEventListener('click', onClick);
    return button;
}

function renderLeftDrawer() {
    const frame = document.getElementById(LEFT_ID);
    const scroll = frame?.querySelector('.snowbunny-shell-scroll');
    const bottom = frame?.querySelector('.snowbunny-shell-bottom');
    if (!scroll || !bottom) return;
    scroll.replaceChildren();
    bottom.replaceChildren();

    const current = el('div', 'snowbunny-library-current');
    current.append(icon('fa-message'));
    const copy = el('div');
    copy.append(el('strong', '', currentChatLabel()), el('small', '', 'Current chat'));
    current.append(copy);
    scroll.append(section('Recent Chats', [current]));

    scroll.append(section('Library', [
        shellRow({ label: 'Stories', description: 'Visual Story library', iconName: 'fa-book-open', disabled: true }),
        shellRow({ label: 'Lorebooks', description: 'SnowBunny Lorebook library', iconName: 'fa-book-atlas', disabled: true }),
        shellRow({ label: 'Stand-alone Chats', description: 'Chats outside a Story', iconName: 'fa-comments', disabled: true }),
        shellRow({ label: 'Create', description: 'Story, chat, Lorebook, entry, Character or Persona', iconName: 'fa-plus', disabled: true }),
    ]));

    bottom.append(
        quickButton('Creator', 'fa-wand-magic-sparkles', null, true),
        quickButton('Characters', 'fa-users', openCharacterManager),
        quickButton('Personas', 'fa-user', () => openNativeDrawer('persona-management-button')),
        quickButton('…', 'fa-ellipsis', () => openNativeDrawer('user-settings-button')),
    );
}

function renderRightDrawer() {
    const frame = document.getElementById(RIGHT_ID);
    const scroll = frame?.querySelector('.snowbunny-shell-scroll');
    const bottom = frame?.querySelector('.snowbunny-shell-bottom');
    if (!scroll || !bottom) return;
    scroll.replaceChildren();
    bottom.replaceChildren();

    const add = el('button', 'snowbunny-members-add', 'Add');
    add.type = 'button';
    add.disabled = true;
    add.title = 'Current-chat multi-member selection is being ported';
    const member = currentMember();
    const memberRow = el('div', 'snowbunny-member-row');
    const avatar = el('div', 'snowbunny-member-avatar');
    if (member.src) {
        const image = new Image();
        image.src = member.src;
        image.alt = '';
        avatar.append(image);
    } else {
        avatar.append(icon('fa-user'));
    }
    memberRow.append(avatar, el('div', 'snowbunny-member-name', member.name));
    scroll.append(section('Members (1)', [memberRow], add));

    scroll.append(section('Chat', [
        shellRow({ label: 'Persona', iconName: 'fa-user', value: context()?.name1 || 'No Persona', disabled: true }),
        shellRow({ label: 'Model', iconName: 'fa-microchip', value: selectedModel(), disabled: true }),
        shellRow({ label: 'Preset', iconName: 'fa-file-lines', value: selectedPreset() || 'Current preset', disabled: true }),
        shellRow({ label: 'Lorebooks', iconName: 'fa-book-atlas', value: 'Not wired', disabled: true }),
        shellRow({ label: 'Scenario', iconName: 'fa-scroll', value: 'Not wired', disabled: true }),
        shellRow({ label: 'Regex', iconName: 'fa-code', value: 'Not wired', disabled: true }),
        shellRow({ label: 'Memory', iconName: 'fa-brain', value: 'Not wired', disabled: true }),
        shellRow({ label: 'Agents', iconName: 'fa-robot', value: 'Not wired', disabled: true }),
        shellRow({ label: 'CYOA', iconName: 'fa-signs-post', value: 'Not wired', disabled: true }),
    ]));

    bottom.style.gridTemplateColumns = 'repeat(3, 1fr)';
    bottom.append(
        quickButton('Reset Chat', 'fa-rotate-left', null, true),
        quickButton('Statistics', 'fa-chart-simple', null, true),
        quickButton('Search', 'fa-magnifying-glass', null, true),
    );
}

function installDrawers() {
    if (document.getElementById(LEFT_ID)) return;
    const backdrop = el('div');
    backdrop.id = BACKDROP_ID;
    backdrop.addEventListener('pointerdown', closeDrawers);
    document.body.append(backdrop);

    const left = drawerFrame(LEFT_ID, 'Library');
    const right = drawerFrame(RIGHT_ID, 'Current Chat');
    document.body.append(left.drawer, right.drawer);

    const leftHandle = el('button');
    leftHandle.id = 'snowbunny-left-handle';
    leftHandle.type = 'button';
    leftHandle.setAttribute('aria-label', 'Open Library');
    leftHandle.append(icon('fa-chevron-right'));
    leftHandle.addEventListener('click', () => openDrawer('left'));

    const rightHandle = el('button');
    rightHandle.id = 'snowbunny-right-handle';
    rightHandle.type = 'button';
    rightHandle.setAttribute('aria-label', 'Open Current Chat settings');
    rightHandle.append(icon('fa-chevron-left'));
    rightHandle.addEventListener('click', () => openDrawer('right'));
    document.body.append(leftHandle, rightHandle);

    renderLeftDrawer();
    renderRightDrawer();
}

function openDrawer(side) {
    if (!isMobile()) return;
    closeNativeDrawers();
    closeSheet();
    renderLeftDrawer();
    renderRightDrawer();
    const next = side === 'left' ? document.getElementById(LEFT_ID) : document.getElementById(RIGHT_ID);
    const other = side === 'left' ? document.getElementById(RIGHT_ID) : document.getElementById(LEFT_ID);
    other?.classList.remove('open');
    next?.classList.add('open');
    document.getElementById(BACKDROP_ID)?.classList.add('open');
    activeDrawer = side;
}

function closeDrawers() {
    document.getElementById(LEFT_ID)?.classList.remove('open');
    document.getElementById(RIGHT_ID)?.classList.remove('open');
    document.getElementById(BACKDROP_ID)?.classList.remove('open');
    activeDrawer = null;
}

function restoreTopPreference() {
    const saved = globalThis.SnowBunny?.state?.readGlobal?.();
    document.body.classList.toggle('snowbunny-top-collapsed', saved?.topMenuCollapsed === true);
}

function syncVisibility() {
    const visible = isMobile();
    for (const id of [TOP_ID, 'snowbunny-top-toggle', 'snowbunny-left-handle', 'snowbunny-right-handle']) {
        const node = document.getElementById(id);
        if (node) node.hidden = !visible;
    }
    if (!visible) closeDrawers();
}

function registerRefreshEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of [
        'CHAT_CHANGED',
        'CHAT_LOADED',
        'MESSAGE_RECEIVED',
        'MESSAGE_SENT',
        'CHARACTER_EDITED',
        'PERSONA_CHANGED',
        'CHAT_COMPLETION_MODEL_CHANGED',
        'MAIN_API_CHANGED',
        'PRESET_CHANGED',
        'OAI_PRESET_CHANGED_AFTER',
    ]) {
        const event = types[name];
        if (!event) continue;
        source.on(event, () => {
            if (activeDrawer === 'left') renderLeftDrawer();
            if (activeDrawer === 'right') renderRightDrawer();
        });
    }
}

function onPointerDown(event) {
    if (!isMobile() || activeDrawer || document.getElementById(SHEET_ID)) return;
    if (!event.isPrimary || event.button !== 0) return;
    if (event.clientX <= 22 || event.clientX >= window.innerWidth - 22) {
        edgeStart = { x: event.clientX, y: event.clientY };
    }
}

function onPointerUp(event) {
    const start = edgeStart;
    edgeStart = null;
    if (!start || !isMobile()) return;
    const dx = event.clientX - start.x;
    const dy = Math.abs(event.clientY - start.y);
    if (dy > 70 || Math.abs(dx) < 55) return;
    if (start.x <= 22 && dx > 0) openDrawer('left');
    if (start.x >= window.innerWidth - 22 && dx < 0) openDrawer('right');
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(SHEET_ID)) closeSheet();
    else if (activeDrawer) closeDrawers();
}

export function initSnowBunnyShell() {
    if (initialized) return;
    initialized = true;
    mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    installStyles();
    installTopStrip();
    installDrawers();
    restoreTopPreference();
    syncVisibility();
    registerRefreshEvents();

    mobileQuery.addEventListener?.('change', syncVisibility);
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('keydown', onKeyDown, true);
}
