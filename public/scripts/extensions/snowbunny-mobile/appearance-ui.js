import { background_settings, getBackgrounds } from '../../backgrounds.js';

const WORKSPACE_ID = 'snowbunny-appearance-workspace';
const STYLE_ID = 'snowbunny-appearance-style';

let initialized = false;

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
  #${WORKSPACE_ID} { position: fixed; z-index: 12365; inset: 0; display: flex; flex-direction: column; overflow: hidden; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor); }
  #${WORKSPACE_ID} .snowbunny-look-head { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px; padding: calc(8px + env(safe-area-inset-top)) 10px 8px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent); }
  #${WORKSPACE_ID} .snowbunny-look-head h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.02rem; }
  #${WORKSPACE_ID} .snowbunny-look-head button { min-width: 40px; min-height: 40px; border: 0; border-radius: 13px; background: transparent; color: inherit; }
  #${WORKSPACE_ID} .snowbunny-look-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px calc(24px + env(safe-area-inset-bottom)); }
  #${WORKSPACE_ID} .snowbunny-look-section { margin: 5px 0 17px; }
  #${WORKSPACE_ID} .snowbunny-look-title { margin: 0 2px 7px; font-size: .75rem; font-weight: 760; opacity: .68; }
  #${WORKSPACE_ID} .snowbunny-look-field { display: grid; gap: 5px; margin: 7px 0; }
  #${WORKSPACE_ID} .snowbunny-look-field span { font-size: .69rem; font-weight: 700; opacity: .7; }
  #${WORKSPACE_ID} select, #${WORKSPACE_ID} input[type="search"] { box-sizing: border-box; width: 100%; min-height: 43px; padding: 8px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 57%, transparent); color: inherit; font: inherit; }
  #${WORKSPACE_ID} .snowbunny-look-toolbar { display: flex; gap: 7px; margin-bottom: 9px; }
  #${WORKSPACE_ID} .snowbunny-look-toolbar input { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .snowbunny-look-toolbar button, #${WORKSPACE_ID} .snowbunny-look-action { min-height: 43px; padding: 7px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 55%, transparent); border-radius: 14px; background: color-mix(in srgb, currentColor 6%, transparent); color: inherit; font-weight: 700; }
  #${WORKSPACE_ID} .snowbunny-look-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  #${WORKSPACE_ID} .snowbunny-look-card { position: relative; overflow: hidden; min-width: 0; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent); border-radius: 17px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 54%, transparent); color: inherit; text-align: left; padding: 0; }
  #${WORKSPACE_ID} .snowbunny-look-card.selected { border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 70%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 32%, transparent); }
  #${WORKSPACE_ID} .snowbunny-look-art { position: relative; width: 100%; aspect-ratio: 16 / 10; background-position: center; background-size: cover; background-color: color-mix(in srgb, currentColor 7%, transparent); }
  #${WORKSPACE_ID} .snowbunny-look-selected { position: absolute; top: 7px; right: 7px; width: 27px; height: 27px; display: grid; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 88%, transparent); }
  #${WORKSPACE_ID} .snowbunny-look-copy { padding: 8px 9px 9px; }
  #${WORKSPACE_ID} .snowbunny-look-copy strong, #${WORKSPACE_ID} .snowbunny-look-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${WORKSPACE_ID} .snowbunny-look-copy strong { font-size: .76rem; }
  #${WORKSPACE_ID} .snowbunny-look-copy small { margin-top: 2px; font-size: .62rem; opacity: .52; }
  #${WORKSPACE_ID} .snowbunny-look-empty { padding: 24px 12px; text-align: center; font-size: .72rem; opacity: .58; grid-column: 1 / -1; }
  #${WORKSPACE_ID} .snowbunny-look-advanced { width: 100%; }
}
`;
    document.head.append(style);
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
}

function cloneSelect(source) {
    const select = el('select');
    if (!(source instanceof HTMLSelectElement)) return select;
    for (const option of source.options) {
        const copy = new Option(option.textContent?.trim() || option.value, option.value, false, option.value === source.value);
        copy.disabled = option.disabled;
        select.append(copy);
    }
    select.value = source.value;
    return select;
}

function field(label, control) {
    const host = el('label', 'snowbunny-look-field');
    host.append(el('span', '', label), control);
    return host;
}

function nativeBackgrounds() {
    const records = [];
    const seen = new Set();
    for (const source of document.querySelectorAll('#bg_menu_content .bg_example, #bg_custom_content .bg_example')) {
        if (!(source instanceof HTMLElement)) continue;
        const file = source.getAttribute('bgfile') || '';
        if (!file) continue;
        const custom = source.getAttribute('custom') === 'true';
        const key = `${custom}:${file}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const title = source.querySelector('.BGSampleTitle')?.textContent?.trim()
            || source.getAttribute('title')
            || file.split('/').at(-1)?.replace(/\.[^.]+$/, '')
            || 'Background';
        const clipper = source.querySelector('.thumbnail-clipper');
        const rendered = clipper instanceof HTMLElement ? getComputedStyle(clipper).backgroundImage : '';
        const url = custom ? file : `backgrounds/${encodeURIComponent(file)}`;
        records.push({ source, file, custom, title, rendered, url });
    }
    return records;
}

function backgroundCard(record, rerender) {
    const card = el('button', 'snowbunny-look-card');
    card.type = 'button';
    if (record.source.classList.contains('selected-background') || record.file === background_settings.name) card.classList.add('selected');
    const art = el('div', 'snowbunny-look-art');
    art.style.backgroundImage = record.rendered && !record.rendered.includes('data:image/png;base64,iVBOR')
        ? record.rendered
        : `url("${record.url}")`;
    if (card.classList.contains('selected')) {
        const mark = el('span', 'snowbunny-look-selected'); mark.append(icon('fa-check')); art.append(mark);
    }
    const copy = el('div', 'snowbunny-look-copy');
    copy.append(el('strong', '', record.title), el('small', '', record.custom ? 'This chat' : 'Global background'));
    card.append(art, copy);
    card.addEventListener('click', () => {
        record.source.click();
        window.setTimeout(rerender, 40);
    });
    return card;
}

function openAdvancedAppearance() {
    closeWorkspace();
    const wrapper = document.getElementById('user-settings-button');
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
}

async function openWorkspace() {
    closeWorkspace();
    const root = el('div'); root.id = WORKSPACE_ID;
    const head = el('header', 'snowbunny-look-head');
    head.append(icon('fa-palette'), el('h2', '', 'Look'));
    const close = el('button'); close.type = 'button'; close.setAttribute('aria-label', 'Close Look'); close.append(icon('fa-xmark')); close.addEventListener('click', closeWorkspace);
    head.append(close); root.append(head);
    const body = el('main', 'snowbunny-look-body'); root.append(body); document.body.append(root);

    const themeSection = el('section', 'snowbunny-look-section');
    themeSection.append(el('div', 'snowbunny-look-title', 'Theme & layout'));
    const nativeTheme = document.getElementById('themes');
    if (nativeTheme instanceof HTMLSelectElement) {
        const theme = cloneSelect(nativeTheme);
        theme.addEventListener('change', () => {
            nativeTheme.value = theme.value;
            nativeTheme.dispatchEvent(new Event('change', { bubbles: true }));
        });
        themeSection.append(field('Theme', theme));
    }
    const nativeFitting = document.getElementById('background_fitting');
    if (nativeFitting instanceof HTMLSelectElement) {
        const fitting = cloneSelect(nativeFitting);
        fitting.addEventListener('change', () => {
            nativeFitting.value = fitting.value;
            nativeFitting.dispatchEvent(new Event('input', { bubbles: true }));
        });
        themeSection.append(field('Background fit', fitting));
    }
    body.append(themeSection);

    const backgroundSection = el('section', 'snowbunny-look-section');
    backgroundSection.append(el('div', 'snowbunny-look-title', 'Backgrounds'));
    const toolbar = el('div', 'snowbunny-look-toolbar');
    const search = el('input'); search.type = 'search'; search.placeholder = 'Search backgrounds'; search.autocomplete = 'off';
    const upload = el('button', '', 'Upload'); upload.type = 'button';
    upload.addEventListener('click', () => document.getElementById('add_bg_button')?.click());
    toolbar.append(search, upload); backgroundSection.append(toolbar);
    const grid = el('div', 'snowbunny-look-grid'); backgroundSection.append(grid); body.append(backgroundSection);

    const renderGrid = () => {
        const query = search.value.trim().toLowerCase();
        const records = nativeBackgrounds().filter(item => item.title.toLowerCase().includes(query));
        grid.replaceChildren();
        if (!records.length) {
            grid.append(el('div', 'snowbunny-look-empty', query ? 'No matching backgrounds.' : 'No backgrounds found.'));
            return;
        }
        for (const record of records) grid.append(backgroundCard(record, renderGrid));
    };
    search.addEventListener('input', renderGrid);

    try {
        await getBackgrounds();
    } catch (error) {
        console.warn('[SnowBunny] Could not refresh backgrounds.', error);
    }
    renderGrid();

    const advanced = el('button', 'snowbunny-look-action snowbunny-look-advanced', 'Advanced interface settings');
    advanced.type = 'button'; advanced.addEventListener('click', openAdvancedAppearance); body.append(advanced);
}

function onTopClick(event) {
    const target = event.target instanceof Element ? event.target.closest('#snowbunny-top-strip .snowbunny-top-action[aria-label="Look"]') : null;
    if (!(target instanceof HTMLElement) || !document.body.classList.contains('snowbunny-mobile')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void openWorkspace();
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(WORKSPACE_ID)) {
        event.preventDefault();
        closeWorkspace();
    }
}

export function initAppearanceUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    document.addEventListener('click', onTopClick, true);
    document.addEventListener('keydown', onKeyDown, true);
}
