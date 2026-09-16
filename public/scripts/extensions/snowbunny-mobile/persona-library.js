import { getUserAvatar } from '../../personas.js';

const WORKSPACE_ID = 'snowbunny-persona-library';
const STYLE_ID = 'snowbunny-persona-library-style';
const LEFT_DRAWER_ID = 'snowbunny-left-drawer';

let initialized = false;
let observer = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function authoring() {
    return globalThis.SnowBunny?.personaAuthoring ?? null;
}

function state() {
    return globalThis.SnowBunny?.state ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
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
  #${WORKSPACE_ID} { position: fixed; z-index: 12115; inset: 0; display: flex; flex-direction: column; overflow: hidden; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor); }
  #${WORKSPACE_ID} .sbp-head { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px; padding: calc(8px + env(safe-area-inset-top)) 10px 8px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent); }
  #${WORKSPACE_ID} .sbp-head h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.03rem; }
  #${WORKSPACE_ID} .sbp-head button { min-width: 40px; min-height: 40px; padding: 0 12px; border: 0; border-radius: 13px; background: transparent; color: inherit; }
  #${WORKSPACE_ID} .sbp-head .primary { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); font-weight: 720; }
  #${WORKSPACE_ID} .sbp-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px calc(22px + env(safe-area-inset-bottom)); }
  #${WORKSPACE_ID} .sbp-tools { display: flex; gap: 7px; margin-bottom: 12px; }
  #${WORKSPACE_ID} .sbp-search, #${WORKSPACE_ID} .sbp-input, #${WORKSPACE_ID} .sbp-text { box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 60%, transparent); color: inherit; font: inherit; }
  #${WORKSPACE_ID} .sbp-search { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .sbp-text { min-height: 96px; resize: vertical; line-height: 1.45; }
  #${WORKSPACE_ID} .sbp-view { display: inline-flex; gap: 2px; padding: 2px; border-radius: 12px; background: color-mix(in srgb, currentColor 7%, transparent); }
  #${WORKSPACE_ID} .sbp-view button { min-width: 34px; min-height: 34px; border: 0; border-radius: 10px; background: transparent; color: inherit; opacity: .48; }
  #${WORKSPACE_ID} .sbp-view button.active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); opacity: .95; }
  #${WORKSPACE_ID} .sbp-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  #${WORKSPACE_ID} .sbp-grid.compact { display: block; }
  #${WORKSPACE_ID} .sbp-card { position: relative; min-width: 0; overflow: hidden; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent); border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent); }
  #${WORKSPACE_ID} .sbp-card-main { width: 100%; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; }
  #${WORKSPACE_ID} .sbp-art { position: relative; aspect-ratio: 3 / 4; overflow: hidden; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, #141418); }
  #${WORKSPACE_ID} .sbp-art img { width: 100%; height: 100%; object-fit: cover; }
  #${WORKSPACE_ID} .sbp-copy { padding: 9px 10px 11px; }
  #${WORKSPACE_ID} .sbp-copy strong, #${WORKSPACE_ID} .sbp-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${WORKSPACE_ID} .sbp-copy strong { font-size: .86rem; }
  #${WORKSPACE_ID} .sbp-copy small { margin-top: 3px; font-size: .67rem; opacity: .56; }
  #${WORKSPACE_ID} .sbp-star { position: absolute; z-index: 2; top: 7px; right: 7px; width: 36px; height: 36px; border: 0; border-radius: 50%; background: rgb(0 0 0 / 42%); color: white; }
  #${WORKSPACE_ID} .sbp-grid.compact .sbp-card { margin: 6px 0; }
  #${WORKSPACE_ID} .sbp-grid.compact .sbp-card-main { display: grid; grid-template-columns: 58px 1fr; min-height: 70px; }
  #${WORKSPACE_ID} .sbp-grid.compact .sbp-art { aspect-ratio: auto; min-height: 70px; }
  #${WORKSPACE_ID} .sbp-grid.compact .sbp-copy { align-self: center; padding-right: 48px; }
  #${WORKSPACE_ID} .sbp-empty { padding: 30px 16px; border: 1px dashed color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 18px; text-align: center; font-size: .77rem; opacity: .62; }
  #${WORKSPACE_ID} .sbp-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 12px; padding: 3px; border-radius: 14px; background: color-mix(in srgb, currentColor 7%, transparent); }
  #${WORKSPACE_ID} .sbp-tabs button { min-height: 40px; border: 0; border-radius: 11px; background: transparent; color: inherit; font-weight: 700; }
  #${WORKSPACE_ID} .sbp-tabs button.active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
  #${WORKSPACE_ID} .sbp-form { display: grid; gap: 10px; }
  #${WORKSPACE_ID} .sbp-label { display: grid; gap: 5px; font-size: .72rem; font-weight: 700; }
  #${WORKSPACE_ID} .sbp-check { display: flex; align-items: center; gap: 9px; min-height: 42px; padding: 8px 4px; font-size: .76rem; }
  #${WORKSPACE_ID} .sbp-check input { width: 19px; height: 19px; }
  #${WORKSPACE_ID} .sbp-mode { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
  #${WORKSPACE_ID} .sbp-mode button { min-height: 40px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 13px; background: transparent; color: inherit; }
  #${WORKSPACE_ID} .sbp-mode button.active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent); }
  #${WORKSPACE_ID} .sbp-field { margin: 7px 0; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 15px; overflow: hidden; }
  #${WORKSPACE_ID} .sbp-field summary { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 8px 10px; cursor: pointer; font-size: .76rem; font-weight: 700; }
  #${WORKSPACE_ID} .sbp-field summary span { flex: 1; }
  #${WORKSPACE_ID} .sbp-field-body { padding: 0 9px 10px; }
  #${WORKSPACE_ID} .sbp-field-tools { display: flex; justify-content: flex-end; gap: 5px; margin-top: 6px; }
  #${WORKSPACE_ID} .sbp-field-tools button, #${WORKSPACE_ID} .sbp-add { min-height: 36px; padding: 6px 10px; border: 0; border-radius: 11px; background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; }
  #${WORKSPACE_ID} .sbp-preview { display: grid; gap: 10px; }
  #${WORKSPACE_ID} .sbp-preview-block { padding: 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent); }
  #${WORKSPACE_ID} .sbp-preview-block strong { display: block; margin-bottom: 5px; font-size: .76rem; }
  #${WORKSPACE_ID} .sbp-preview-block div { white-space: pre-wrap; font-size: .79rem; line-height: 1.48; }
}
`;
    document.head.append(style);
}

function workspace() {
    let root = document.getElementById(WORKSPACE_ID);
    if (!root) { root = el('div'); root.id = WORKSPACE_ID; document.body.append(root); }
    root.replaceChildren();
    return root;
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
}

function head(title, onBack, actions = []) {
    const node = el('header', 'sbp-head');
    const back = el('button'); back.type = 'button'; back.append(icon('fa-arrow-left')); back.addEventListener('click', onBack);
    node.append(back, el('h2', '', title), ...actions); return node;
}

function label(labelText, input) {
    const host = el('label', 'sbp-label'); host.append(el('span', '', labelText), input); return host;
}

function parseList(value) {
    return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function viewMode() {
    return state()?.readGlobal?.()?.personaLibraryView === 'compact' ? 'compact' : 'visual';
}

function viewToggle(mode, onChange) {
    const host = el('div', 'sbp-view');
    for (const [value, iconName] of [['visual', 'fa-table-cells-large'], ['compact', 'fa-list']]) {
        const button = el('button'); button.type = 'button'; if (mode === value) button.classList.add('active'); button.append(icon(iconName)); button.addEventListener('click', () => onChange(value)); host.append(button);
    }
    return host;
}

function openNativePersonaManager() {
    closeWorkspace();
    const wrapper = document.getElementById('persona-management-button');
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
}

function personaCard(record, mode, refresh) {
    const card = el('article', 'sbp-card');
    const main = el('button', 'sbp-card-main'); main.type = 'button';
    const art = el('div', 'sbp-art'); const image = new Image(); image.src = getUserAvatar(record.avatar); image.alt = ''; art.append(image);
    const copy = el('div', 'sbp-copy');
    const subtitle = record.metadata?.title || record.metadata?.category || (record.metadata?.tags || []).slice(0, 2).join(' · ') || 'Persona';
    copy.append(el('strong', '', record.name), el('small', '', subtitle)); main.append(art, copy);
    main.addEventListener('click', () => void openEditor(record.avatar));
    const star = el('button', 'sbp-star'); star.type = 'button'; star.title = record.metadata?.favorite ? 'Remove favorite' : 'Add favorite'; star.append(icon(record.metadata?.favorite ? 'fa-star' : 'fa-star-half-stroke'));
    star.addEventListener('click', async event => { event.stopPropagation(); const draft = clone(record); draft.metadata.favorite = !draft.metadata.favorite; await authoring()?.save?.(draft); await refresh(); });
    card.append(main, star); if (mode === 'compact') card.classList.add('compact'); return card;
}

async function openLibrary() {
    installStyles();
    const root = workspace();
    let mode = viewMode();
    const toggle = viewToggle(mode, value => { state()?.patchGlobal?.({ personaLibraryView: value }); void openLibrary(); });
    const manage = el('button', 'primary', '+ Create / Import'); manage.type = 'button'; manage.addEventListener('click', openNativePersonaManager);
    root.append(head('Personas', closeWorkspace, [toggle, manage]));
    const body = el('main', 'sbp-body'); root.append(body);
    const tools = el('div', 'sbp-tools'); const search = el('input', 'sbp-search'); search.type = 'search'; search.placeholder = 'Search Personas'; search.autocomplete = 'off'; tools.append(search); body.append(tools);
    const grid = el('div', `sbp-grid${mode === 'compact' ? ' compact' : ''}`); body.append(grid);
    const ids = await authoring()?.listAvatars?.() || [];
    let records = ids.map(id => authoring()?.read?.(id)).filter(Boolean);
    const render = () => {
        const query = search.value.trim().toLowerCase();
        const visible = records.filter(record => `${record.name} ${record.metadata?.title || ''} ${record.metadata?.category || ''} ${(record.metadata?.aliases || []).join(' ')} ${(record.metadata?.tags || []).join(' ')}`.toLowerCase().includes(query))
            .sort((a, b) => Number(b.metadata?.favorite) - Number(a.metadata?.favorite) || Number(b.metadata?.default) - Number(a.metadata?.default) || a.name.localeCompare(b.name));
        grid.replaceChildren();
        if (!visible.length) { grid.append(el('div', 'sbp-empty', ids.length ? 'No Personas match this search.' : 'No Personas yet. Create or import one.')); return; }
        const refresh = async () => { records = (await authoring()?.listAvatars?.() || []).map(id => authoring()?.read?.(id)).filter(Boolean); render(); };
        visible.forEach(record => grid.append(personaCard(record, mode, refresh)));
    };
    search.addEventListener('input', render); render();
}

function preview(draft) {
    const host = el('div', 'sbp-preview');
    if (draft.document.content.trim()) { const block = el('div', 'sbp-preview-block'); block.append(el('strong', '', 'Description'), el('div', '', draft.document.content)); host.append(block); }
    for (const field of draft.document.fields) {
        if (!field.value.trim()) continue;
        const block = el('div', 'sbp-preview-block'); block.append(el('strong', '', field.label), el('div', '', field.value)); host.append(block);
    }
    if (!host.children.length) host.append(el('div', 'sbp-empty', 'Nothing written yet.'));
    return host;
}

function writing(draft, rerender) {
    const host = el('div');
    const modes = el('div', 'sbp-mode');
    for (const [value, name] of [['structured', 'Structured'], ['freeform', 'Freeform']]) {
        const button = el('button', draft.document.mode === value ? 'active' : '', name); button.type = 'button'; button.addEventListener('click', () => { draft.document.mode = value; rerender('writing'); }); modes.append(button);
    }
    host.append(modes);
    const description = el('textarea', 'sbp-text'); description.value = draft.document.content; description.placeholder = 'Main description'; description.addEventListener('input', () => { draft.document.content = description.value; }); host.append(label('Main Description', description));
    if (draft.document.mode === 'structured') {
        draft.document.fields.forEach((field, index) => {
            const details = el('details', 'sbp-field'); const summary = el('summary'); summary.append(el('span', '', field.label)); if (field.role === 'dialogueExamples') summary.append(el('small', '', 'Dialogue examples')); details.append(summary);
            const body = el('div', 'sbp-field-body');
            if (field.custom) { const title = el('input', 'sbp-input'); title.value = field.label; title.addEventListener('input', () => { field.label = title.value; }); body.append(title); }
            const text = el('textarea', 'sbp-text'); text.value = field.value; text.addEventListener('input', () => { field.value = text.value; }); body.append(text);
            const tools = el('div', 'sbp-field-tools'); const clear = el('button', '', 'Clear'); clear.type = 'button'; clear.addEventListener('click', () => { field.value = ''; text.value = ''; }); tools.append(clear);
            if (field.custom) { const remove = el('button', '', 'Remove'); remove.type = 'button'; remove.addEventListener('click', () => { draft.document.fields.splice(index, 1); rerender('writing'); }); tools.append(remove); }
            body.append(tools); details.append(body); host.append(details);
        });
        const add = el('button', 'sbp-add', '+ Add field'); add.type = 'button'; add.addEventListener('click', () => { draft.document.fields.push({ id: `custom_${Date.now()}`, label: 'Custom field', value: '', role: 'content', custom: true, order: draft.document.fields.length }); rerender('writing'); }); host.append(add);
    } else {
        const note = el('div', 'sbp-empty', 'Structured fields stay safe while Freeform is selected.'); note.style.marginTop = '10px'; host.append(note);
    }
    return host;
}

function details(draft) {
    const host = el('div', 'sbp-form');
    const art = el('div', 'sbp-card'); const image = new Image(); image.src = getUserAvatar(draft.avatar); image.alt = ''; image.style.width = '100%'; image.style.maxHeight = '220px'; image.style.objectFit = 'cover'; art.append(image); host.append(art);
    const fields = [
        ['name', 'Name'], ['title', 'Title'], ['category', 'Category'], ['aliases', 'Aliases / keywords'], ['tags', 'Tags'],
    ];
    for (const [key, title] of fields) {
        const input = el('input', 'sbp-input'); input.value = key === 'name' ? draft.name : key === 'aliases' || key === 'tags' ? (draft.metadata[key] || []).join(', ') : draft.metadata[key] || '';
        input.addEventListener('input', () => { if (key === 'name') draft.name = input.value; else draft.metadata[key] = key === 'aliases' || key === 'tags' ? parseList(input.value) : input.value; }); host.append(label(title, input));
    }
    for (const [key, title] of [['favorite', 'Favorite'], ['default', 'Use as default Persona']]) {
        const input = el('input'); input.type = 'checkbox'; input.checked = draft.metadata[key] === true; input.addEventListener('change', () => { draft.metadata[key] = input.checked; });
        const row = el('label', 'sbp-check'); row.append(input, el('span', '', title)); host.append(row);
    }
    const native = draft.native || {};
    const note = el('div', 'sbp-empty', `Injection stays compatible with SillyTavern: ${native.position === 9 ? 'disabled' : native.position === 4 ? `at depth ${native.depth ?? 2}` : 'normal prompt placement'}. Advanced placement and avatar replacement remain in native Persona management.`); host.append(note);
    return host;
}

async function openEditor(avatar) {
    const record = authoring()?.read?.(avatar); if (!record) return;
    const draft = clone(record); let active = 'details';
    const render = async tab => {
        if (tab) active = tab;
        const root = workspace(); const save = el('button', 'primary', 'Save'); save.type = 'button'; root.append(head(draft.name, () => void openLibrary(), [save]));
        const body = el('main', 'sbp-body'); root.append(body); const tabs = el('div', 'sbp-tabs');
        for (const [value, name] of [['details', 'Details'], ['writing', 'Writing'], ['preview', 'Preview']]) { const button = el('button', active === value ? 'active' : '', name); button.type = 'button'; button.addEventListener('click', () => void render(value)); tabs.append(button); }
        body.append(tabs); body.append(active === 'details' ? details(draft) : active === 'writing' ? writing(draft, value => void render(value)) : preview(draft));
        save.addEventListener('click', async () => { save.disabled = true; save.textContent = 'Saving…'; try { await authoring()?.save?.(draft); await openLibrary(); } catch (error) { console.error('[SnowBunny] Could not save Persona.', error); save.disabled = false; save.textContent = 'Try again'; } });
    };
    await render();
}

function quickPersonasButton() {
    return [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-quick`)].find(button => button.querySelector('span')?.textContent?.trim() === 'Personas') || null;
}

function enhanceShell() {
    const button = quickPersonasButton(); if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false; button.setAttribute('aria-disabled', 'false');
    if (button.dataset.snowbunnyPersonas === '1') return;
    button.dataset.snowbunnyPersonas = '1';
    button.addEventListener('click', event => { event.stopImmediatePropagation(); void openLibrary(); }, true);
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(WORKSPACE_ID)) closeWorkspace();
}

export function initPersonaLibrary() {
    if (initialized) return;
    initialized = true; installStyles(); enhanceShell();
    const drawer = document.getElementById(LEFT_DRAWER_ID); if (drawer) { observer = new MutationObserver(enhanceShell); observer.observe(drawer, { childList: true, subtree: true }); }
    document.addEventListener('keydown', onKeyDown, true);
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = { ...existing, personaLibrary: { open: openLibrary, openEditor } };
}
