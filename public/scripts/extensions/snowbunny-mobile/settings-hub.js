const WORKSPACE_ID = 'snowbunny-settings-hub';
const LEFT_DRAWER_ID = 'snowbunny-left-drawer';
const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const BACKDROP_ID = 'snowbunny-shell-backdrop';
const STYLE_ID = 'snowbunny-settings-hub-style';

let initialized = false;
let observer = null;
let queued = false;

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
  #${WORKSPACE_ID} { position: fixed; z-index: 12380; inset: 0; display: flex; flex-direction: column; overflow: hidden; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor); }
  #${WORKSPACE_ID} .snowbunny-settings-head { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px; padding: calc(8px + env(safe-area-inset-top)) 10px 8px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent); }
  #${WORKSPACE_ID} .snowbunny-settings-head h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.02rem; }
  #${WORKSPACE_ID} .snowbunny-settings-head button { width: 40px; height: 40px; border: 0; border-radius: 13px; background: transparent; color: inherit; }
  #${WORKSPACE_ID} .snowbunny-settings-body { flex: 1; min-height: 0; overflow-y: auto; padding: 11px 13px calc(22px + env(safe-area-inset-bottom)); }
  #${WORKSPACE_ID} .snowbunny-settings-title { margin: 14px 6px 5px; font-size: .72rem; font-weight: 760; opacity: .58; }
  #${WORKSPACE_ID} .snowbunny-settings-row { width: 100%; min-height: 56px; display: flex; align-items: center; gap: 11px; margin: 4px 0; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 50%, transparent); color: inherit; text-align: left; }
  #${WORKSPACE_ID} .snowbunny-settings-row > i:first-child { width: 28px; text-align: center; opacity: .76; }
  #${WORKSPACE_ID} .snowbunny-settings-copy { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .snowbunny-settings-copy strong, #${WORKSPACE_ID} .snowbunny-settings-copy small { display: block; }
  #${WORKSPACE_ID} .snowbunny-settings-copy strong { font-size: .82rem; }
  #${WORKSPACE_ID} .snowbunny-settings-copy small { margin-top: 3px; font-size: .66rem; line-height: 1.35; opacity: .54; }
  #${WORKSPACE_ID} .snowbunny-settings-row > i:last-child { font-size: .68rem; opacity: .4; }
}
`;
    document.head.append(style);
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
}

function closeSnowDrawers() {
    document.getElementById(LEFT_DRAWER_ID)?.classList.remove('open');
    document.getElementById(RIGHT_DRAWER_ID)?.classList.remove('open');
    document.getElementById(BACKDROP_ID)?.classList.remove('open');
}

function clickTop(label) {
    closeWorkspace();
    closeSnowDrawers();
    const button = document.querySelector(`#snowbunny-top-strip .snowbunny-top-action[aria-label="${label}"]`);
    if (button instanceof HTMLElement) button.click();
}

function rightRow(label) {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === label,
    ) ?? null;
}

function openRightSetting(label) {
    closeWorkspace();
    closeSnowDrawers();
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    const backdrop = document.getElementById(BACKDROP_ID);
    drawer?.classList.add('open');
    backdrop?.classList.add('open');
    window.setTimeout(() => {
        const row = rightRow(label);
        if (row instanceof HTMLButtonElement && !row.disabled) row.click();
        else globalThis.toastr?.info?.(`${label} is still loading.`);
    }, 30);
}

function openNativeAdvanced() {
    closeWorkspace();
    closeSnowDrawers();
    const wrapper = document.getElementById('user-settings-button');
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
}

function row(label, description, iconName, handler) {
    const button = el('button', 'snowbunny-settings-row');
    button.type = 'button';
    button.append(icon(iconName));
    const copy = el('div', 'snowbunny-settings-copy');
    copy.append(el('strong', '', label), el('small', '', description));
    button.append(copy, icon('fa-chevron-right'));
    button.addEventListener('click', handler);
    return button;
}

function section(body, title, rows) {
    body.append(el('div', 'snowbunny-settings-title', title), ...rows);
}

function openWorkspace() {
    closeWorkspace();
    closeSnowDrawers();
    const root = el('div'); root.id = WORKSPACE_ID;
    const head = el('header', 'snowbunny-settings-head');
    head.append(icon('fa-gear'), el('h2', '', 'Settings'));
    const close = el('button'); close.type = 'button'; close.setAttribute('aria-label', 'Close Settings'); close.append(icon('fa-xmark')); close.addEventListener('click', closeWorkspace);
    head.append(close); root.append(head);
    const body = el('main', 'snowbunny-settings-body'); root.append(body);

    section(body, 'AI', [
        row('Response', 'Response length, context, sampling and reasoning.', 'fa-sliders', () => clickTop('Response')),
        row('API & Connection', 'Provider, endpoint, API key and model.', 'fa-plug', () => clickTop('API')),
        row('Model', 'Choose the model for this chat.', 'fa-microchip', () => openRightSetting('Model')),
        row('Preset', 'Choose and remember the preset for this chat.', 'fa-file-lines', () => openRightSetting('Preset')),
    ]);

    section(body, 'Current chat', [
        row('Persona', 'Choose the Persona used in this chat.', 'fa-user', () => openRightSetting('Persona')),
        row('Lorebooks', 'Story and chat knowledge available here.', 'fa-book-atlas', () => openRightSetting('Lorebooks')),
        row('Scenario', 'Premise, role, direction and Story guidance.', 'fa-scroll', () => openRightSetting('Scenario')),
        row('Regex', 'Regex rules active for this chat.', 'fa-code', () => openRightSetting('Regex')),
        row('Memory', 'Memory generation, recall and recovery.', 'fa-brain', () => openRightSetting('Memory')),
        row('Agents', 'Story Tracker, custom agents and agent tools.', 'fa-robot', () => openRightSetting('Agents')),
        row('CYOA', 'Choice buttons and interactive story options.', 'fa-signs-post', () => openRightSetting('CYOA')),
    ]);

    section(body, 'Interface & extensions', [
        row('Look', 'Theme, background and layout appearance.', 'fa-palette', () => clickTop('Look')),
        row('Extensions', 'Pinned tools and installed extensions.', 'fa-cubes', () => clickTop('Extensions')),
        row('Advanced SillyTavern settings', 'Less common settings that SnowBunny has not given a mobile screen yet.', 'fa-screwdriver-wrench', openNativeAdvanced),
    ]);

    document.body.append(root);
}

function settingsQuick() {
    return [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-quick`)].find(button => {
        const text = button.querySelector('span')?.textContent?.trim();
        return text === '…' || text === 'Settings';
    }) ?? null;
}

function enhanceShortcut() {
    queued = false;
    const button = settingsQuick();
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    const text = button.querySelector('span');
    if (text) text.textContent = 'Settings';
    const mark = button.querySelector('i');
    if (mark) mark.className = 'fa-solid fa-gear';
    if (button.dataset.snowbunnySettingsHub === '1') return;
    button.dataset.snowbunnySettingsHub = '1';
    button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openWorkspace();
    }, true);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhanceShortcut);
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(WORKSPACE_ID)) {
        event.preventDefault();
        closeWorkspace();
    }
}

export function initSettingsHub() {
    if (initialized) return;
    initialized = true;
    installStyles();
    const drawer = document.getElementById(LEFT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueEnhance);
        observer.observe(drawer, { childList: true, subtree: true });
    }
    document.addEventListener('keydown', onKeyDown, true);
    enhanceShortcut();
}
