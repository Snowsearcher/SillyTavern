import {
    disableExtension,
    enableExtension,
    extensionNames,
    extensionTypes,
    extension_settings,
} from '../../extensions.js';

const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const BACKDROP_ID = 'snowbunny-shell-backdrop';
const SECTION_ID = 'snowbunny-extension-tools-section';
const TABS_ID = 'snowbunny-right-tabs';
const SHEET_ID = 'snowbunny-extension-manager-sheet';
const STYLE_ID = 'snowbunny-extension-manager-style';

let initialized = false;
let observer = null;
let changed = false;

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
    position: fixed; z-index: 12280; inset: 0; display: flex; align-items: flex-end; justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SHEET_ID} .snowbunny-extension-manager-card {
    width: min(100%, 660px); max-height: 88dvh; display: flex; flex-direction: column; overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent); border-bottom: 0;
    border-radius: 24px 24px 0 0; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor); box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  #${SHEET_ID} .snowbunny-extension-manager-handle { width: 38px; height: 4px; margin: 8px auto 2px; border-radius: 999px; background: currentColor; opacity: .24; }
  #${SHEET_ID} .snowbunny-extension-manager-head { display: flex; align-items: center; gap: 8px; padding: 7px 10px 9px 16px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent); }
  #${SHEET_ID} .snowbunny-extension-manager-head h3 { flex: 1; min-width: 0; margin: 0; font-size: .97rem; }
  #${SHEET_ID} .snowbunny-extension-manager-head button { min-width: 40px; min-height: 38px; border: 0; border-radius: 12px; background: transparent; color: inherit; }
  #${SHEET_ID} .snowbunny-extension-manager-search { margin: 10px 12px 5px; min-height: 42px; padding: 8px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent); color: inherit; font: inherit; }
  #${SHEET_ID} .snowbunny-extension-manager-note { padding: 3px 14px 7px; font-size: .67rem; line-height: 1.4; opacity: .58; }
  #${SHEET_ID} .snowbunny-extension-manager-list { flex: 1; min-height: 0; overflow-y: auto; padding: 5px 10px calc(14px + env(safe-area-inset-bottom)); }
  #${SHEET_ID} .snowbunny-extension-manager-row { display: flex; align-items: center; gap: 10px; min-height: 58px; margin: 4px 0; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent); }
  #${SHEET_ID} .snowbunny-extension-manager-row.enabled { border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 28%, var(--SmartThemeBorderColor)); }
  #${SHEET_ID} .snowbunny-extension-manager-mark { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; border-radius: 12px; background: color-mix(in srgb, currentColor 7%, transparent); opacity: .76; }
  #${SHEET_ID} .snowbunny-extension-manager-copy { flex: 1; min-width: 0; }
  #${SHEET_ID} .snowbunny-extension-manager-copy strong, #${SHEET_ID} .snowbunny-extension-manager-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${SHEET_ID} .snowbunny-extension-manager-copy strong { font-size: .82rem; }
  #${SHEET_ID} .snowbunny-extension-manager-copy small { margin-top: 3px; font-size: .65rem; opacity: .55; }
  #${SHEET_ID} .snowbunny-extension-manager-toggle { position: relative; width: 48px; height: 28px; flex: 0 0 48px; }
  #${SHEET_ID} .snowbunny-extension-manager-toggle input { position: absolute; opacity: 0; pointer-events: none; }
  #${SHEET_ID} .snowbunny-extension-manager-toggle span { position: absolute; inset: 0; border-radius: 999px; background: color-mix(in srgb, currentColor 16%, transparent); }
  #${SHEET_ID} .snowbunny-extension-manager-toggle span::after { content: ''; position: absolute; width: 22px; height: 22px; left: 3px; top: 3px; border-radius: 50%; background: currentColor; opacity: .72; transition: transform 140ms ease; }
  #${SHEET_ID} .snowbunny-extension-manager-toggle input:checked + span { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 36%, transparent); }
  #${SHEET_ID} .snowbunny-extension-manager-toggle input:checked + span::after { transform: translateX(20px); opacity: .96; }
  #${SHEET_ID} .snowbunny-extension-manager-toggle input:disabled + span { opacity: .35; }
  #${SHEET_ID} .snowbunny-extension-manager-empty { padding: 28px 14px; text-align: center; font-size: .75rem; opacity: .58; }
  #${SHEET_ID} .snowbunny-extension-manager-apply { margin: 7px 10px calc(10px + env(safe-area-inset-bottom)); min-height: 44px; border: 0; border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 16%, transparent); color: inherit; font-weight: 740; }
  #${SHEET_ID} .snowbunny-extension-manager-apply[hidden] { display: none; }
  #${SECTION_ID} .snowbunny-extension-manager-link { order: -1; }
}
`;
    document.head.append(style);
}

function cleanName(name) {
    return String(name || '')
        .replace(/^third-party\/?/i, '')
        .replace(/^\/+/g, '')
        .split('/')
        .filter(Boolean)
        .at(-1)
        ?.replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, value => value.toUpperCase()) || 'Extension';
}

function extensionType(name) {
    return extensionTypes?.[name] || extensionTypes?.[`third-party/${name}`] || '';
}

function isSystem(name) {
    return extensionType(name) === 'system';
}

function disabledSet() {
    return new Set(Array.isArray(extension_settings?.disabledExtensions) ? extension_settings.disabledExtensions : []);
}

function extensionRecords() {
    const disabled = disabledSet();
    return [...new Set(Array.isArray(extensionNames) ? extensionNames : [])]
        .map(name => ({
            name,
            label: cleanName(name),
            type: extensionType(name) || 'extension',
            disabled: disabled.has(name),
            system: isSystem(name),
        }))
        .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.label.localeCompare(b.label));
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function showExtensionsTab() {
    closeSheet();
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    const backdrop = document.getElementById(BACKDROP_ID);
    if (!(drawer instanceof HTMLElement)) return;
    document.querySelectorAll('.drawer-content.openDrawer').forEach(panel => {
        const toggle = panel.closest('.drawer')?.querySelector(':scope > .drawer-toggle');
        if (toggle instanceof HTMLElement) toggle.click();
    });
    drawer.classList.add('open');
    backdrop?.classList.add('open');
    const tab = document.querySelector(`#${TABS_ID} button[data-tab="extensions"]`);
    if (tab instanceof HTMLElement) tab.click();
}

function nativeExtensionMaintenance() {
    closeSheet();
    const wrapper = document.getElementById('extensions-settings-button');
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
}

function renderList(searchValue = '') {
    const list = document.querySelector(`#${SHEET_ID} .snowbunny-extension-manager-list`);
    if (!(list instanceof HTMLElement)) return;
    const query = searchValue.trim().toLowerCase();
    const records = extensionRecords().filter(record => `${record.label} ${record.name} ${record.type}`.toLowerCase().includes(query));
    list.replaceChildren();

    if (!records.length) {
        list.append(el('div', 'snowbunny-extension-manager-empty', query ? 'No matching extensions.' : 'No extensions were discovered by SillyTavern.'));
        return;
    }

    for (const record of records) {
        const row = el('div', `snowbunny-extension-manager-row${record.disabled ? '' : ' enabled'}`);
        const mark = el('div', 'snowbunny-extension-manager-mark');
        mark.append(icon(record.system ? 'fa-shield' : 'fa-puzzle-piece'));
        const copy = el('div', 'snowbunny-extension-manager-copy');
        copy.append(
            el('strong', '', record.label),
            el('small', '', record.system ? 'Built-in SillyTavern extension' : `${record.type} · ${record.disabled ? 'Off' : 'On'}`),
        );
        const toggle = el('label', 'snowbunny-extension-manager-toggle');
        const input = el('input');
        input.type = 'checkbox';
        input.checked = !record.disabled;
        input.disabled = record.system;
        const track = el('span');
        toggle.append(input, track);
        input.addEventListener('change', async () => {
            input.disabled = true;
            try {
                if (input.checked) await enableExtension(record.name, false);
                else await disableExtension(record.name, false);
                changed = true;
                renderList(document.querySelector(`#${SHEET_ID} .snowbunny-extension-manager-search`)?.value || '');
                const apply = document.querySelector(`#${SHEET_ID} .snowbunny-extension-manager-apply`);
                if (apply instanceof HTMLButtonElement) apply.hidden = false;
            } catch (error) {
                console.warn(`[SnowBunny] Could not ${input.checked ? 'enable' : 'disable'} extension ${record.name}.`, error);
                input.checked = !input.checked;
                input.disabled = record.system;
            }
        });
        row.append(mark, copy, toggle);
        list.append(row);
    }
}

function openManager() {
    closeSheet();
    changed = false;
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-extension-manager-card');
    card.append(el('div', 'snowbunny-extension-manager-handle'));
    const head = el('header', 'snowbunny-extension-manager-head');
    head.append(el('h3', '', 'Installed Extensions'));

    const maintenance = el('button');
    maintenance.type = 'button';
    maintenance.title = 'Install or update extensions';
    maintenance.setAttribute('aria-label', maintenance.title);
    maintenance.append(icon('fa-download'));
    maintenance.addEventListener('click', nativeExtensionMaintenance);

    const close = el('button');
    close.type = 'button';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close installed extensions');
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSheet);
    head.append(maintenance, close);

    const search = el('input', 'snowbunny-extension-manager-search');
    search.type = 'search';
    search.placeholder = 'Search installed extensions';
    search.autocomplete = 'off';
    search.addEventListener('input', () => renderList(search.value));

    const note = el('div', 'snowbunny-extension-manager-note', 'Turn extensions on or off here. A reload is required to fully apply changes because extensions can add code and interface elements while SillyTavern starts.');
    const list = el('div', 'snowbunny-extension-manager-list');
    const apply = el('button', 'snowbunny-extension-manager-apply', 'Reload and apply changes');
    apply.type = 'button';
    apply.hidden = true;
    apply.addEventListener('click', () => globalThis.location.reload());

    card.append(head, search, note, list, apply);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);
    renderList();
    window.setTimeout(() => search.focus({ preventScroll: true }), 50);
}

function managerRow() {
    const button = el('button', 'snowbunny-shell-row snowbunny-extension-manager-link');
    button.type = 'button';
    button.dataset.snowbunnyExtensionManager = '1';
    button.append(icon('fa-sliders'));
    const copy = el('div', 'snowbunny-shell-row-copy');
    const enabled = extensionRecords().filter(record => !record.disabled).length;
    copy.append(el('strong', '', 'Installed extensions'), el('small', '', `${enabled} enabled · turn extensions on or off`));
    button.append(copy, icon('fa-chevron-right'));
    button.addEventListener('click', openManager);
    return button;
}

function enhanceSection() {
    const section = document.getElementById(SECTION_ID);
    if (!(section instanceof HTMLElement)) return;
    if (!section.querySelector('[data-snowbunny-extension-manager="1"]')) {
        const heading = section.querySelector('.snowbunny-shell-section-title');
        const row = managerRow();
        if (heading?.nextSibling) section.insertBefore(row, heading.nextSibling);
        else section.append(row);
    }
}

function onCaptureClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const top = target.closest('#snowbunny-top-strip .snowbunny-top-action[aria-label="Extensions"]');
    if (top) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showExtensionsTab();
        return;
    }

    const manage = target.closest('[aria-label="Manage installed extensions"]');
    if (manage) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openManager();
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(SHEET_ID)) {
        event.preventDefault();
        closeSheet();
    }
}

export function initExtensionManagerUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    document.addEventListener('click', onCaptureClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    observer = new MutationObserver(() => requestAnimationFrame(enhanceSection));
    observer.observe(document.body, { childList: true, subtree: true });
    enhanceSection();
}
