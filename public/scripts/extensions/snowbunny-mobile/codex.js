const WORKSPACE_ID = 'snowbunny-codex-workspace';
const SHEET_ID = 'snowbunny-codex-sheet';
const STYLE_ID = 'snowbunny-codex-style';
const LEFT_DRAWER_ID = 'snowbunny-left-drawer';
const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const ENTRY_TYPES = ['Character', 'Location', 'Object/Item', 'Lore', 'Concept', 'Faction', 'Event', 'Other'];

let initialized = false;
let shellObserver = null;
let queued = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function store() {
    return globalThis.SnowBunny?.lorebooks ?? null;
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
  #${WORKSPACE_ID} {
    position: fixed; z-index: 12110; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%);
    color: var(--SmartThemeBodyColor);
  }
  #${WORKSPACE_ID} .snowbunny-codex-header {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 94%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-codex-header h2 {
    flex: 1; min-width: 0; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 1.03rem;
  }
  #${WORKSPACE_ID} .snowbunny-codex-header button {
    min-width: 40px; min-height: 40px; border: 0; border-radius: 13px; background: transparent; color: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-codex-body {
    flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
    padding: 12px 14px calc(22px + env(safe-area-inset-bottom));
  }
  #${WORKSPACE_ID} .snowbunny-codex-bookbar {
    display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
  }
  #${WORKSPACE_ID} .snowbunny-codex-bookselect,
  #${WORKSPACE_ID} .snowbunny-codex-search,
  #${WORKSPACE_ID} .snowbunny-codex-field,
  #${WORKSPACE_ID} .snowbunny-codex-textarea,
  #${WORKSPACE_ID} .snowbunny-codex-select {
    box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 60%, transparent);
    color: inherit; font: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-codex-bookselect { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .snowbunny-codex-textarea { min-height: 120px; resize: vertical; line-height: 1.45; }
  #${WORKSPACE_ID} .snowbunny-codex-toolbar { display: flex; gap: 7px; margin: 8px 0 12px; }
  #${WORKSPACE_ID} .snowbunny-codex-search { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .snowbunny-codex-action {
    min-height: 42px; padding: 7px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
    color: inherit; font-weight: 690;
  }
  #${WORKSPACE_ID} .snowbunny-codex-action.primary {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 34%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-codex-view-toggle {
    display: inline-flex; gap: 2px; padding: 2px; border-radius: 12px;
    background: color-mix(in srgb, currentColor 7%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-codex-view-toggle button { min-width: 34px; min-height: 34px; border-radius: 10px; opacity: .48; }
  #${WORKSPACE_ID} .snowbunny-codex-view-toggle button.active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); opacity: .95;
  }
  #${WORKSPACE_ID} .snowbunny-codex-intro,
  #${WORKSPACE_ID} .snowbunny-codex-empty {
    padding: 14px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 56%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-codex-intro strong { display: block; font-size: .92rem; }
  #${WORKSPACE_ID} .snowbunny-codex-intro small,
  #${WORKSPACE_ID} .snowbunny-codex-empty { font-size: .72rem; line-height: 1.42; opacity: .65; }
  #${WORKSPACE_ID} .snowbunny-codex-empty { text-align: center; border-style: dashed; }
  #${WORKSPACE_ID} .snowbunny-lorebook-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  #${WORKSPACE_ID} .snowbunny-lorebook-grid.compact { display: block; }
  #${WORKSPACE_ID} .snowbunny-lorebook-card {
    min-width: 0; overflow: hidden; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-lorebook-card button { width: 100%; min-height: 112px; padding: 12px; border: 0; background: transparent; color: inherit; text-align: left; }
  #${WORKSPACE_ID} .snowbunny-lorebook-card i { font-size: 1.35rem; opacity: .48; }
  #${WORKSPACE_ID} .snowbunny-lorebook-card strong,
  #${WORKSPACE_ID} .snowbunny-lorebook-card small { display: block; overflow: hidden; text-overflow: ellipsis; }
  #${WORKSPACE_ID} .snowbunny-lorebook-card strong { margin-top: 10px; white-space: nowrap; font-size: .86rem; }
  #${WORKSPACE_ID} .snowbunny-lorebook-card small { margin-top: 4px; white-space: nowrap; font-size: .67rem; opacity: .56; }
  #${WORKSPACE_ID} .snowbunny-lorebook-grid.compact .snowbunny-lorebook-card { margin: 6px 0; }
  #${WORKSPACE_ID} .snowbunny-lorebook-grid.compact .snowbunny-lorebook-card button { min-height: 64px; display: grid; grid-template-columns: 34px 1fr; align-items: center; }
  #${WORKSPACE_ID} .snowbunny-lorebook-grid.compact .snowbunny-lorebook-card i { grid-row: 1 / 3; }
  #${WORKSPACE_ID} .snowbunny-lorebook-grid.compact .snowbunny-lorebook-card strong { margin: 0; }

  #${WORKSPACE_ID} .snowbunny-codex-type-section { margin: 8px 0 12px; }
  #${WORKSPACE_ID} .snowbunny-codex-type-title {
    display: flex; align-items: center; gap: 7px; padding: 5px 4px 7px; font-size: .75rem; font-weight: 750; opacity: .7;
  }
  #${WORKSPACE_ID} .snowbunny-codex-entry-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  #${WORKSPACE_ID} .snowbunny-codex-entry-grid.compact { display: block; }
  #${WORKSPACE_ID} .snowbunny-codex-entry {
    min-width: 0; overflow: hidden; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent);
    border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 54%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-codex-entry button { width: 100%; min-height: 94px; padding: 10px; border: 0; background: transparent; color: inherit; text-align: left; }
  #${WORKSPACE_ID} .snowbunny-codex-entry strong,
  #${WORKSPACE_ID} .snowbunny-codex-entry small { display: block; overflow: hidden; text-overflow: ellipsis; }
  #${WORKSPACE_ID} .snowbunny-codex-entry strong { white-space: nowrap; font-size: .82rem; }
  #${WORKSPACE_ID} .snowbunny-codex-entry small { margin-top: 5px; font-size: .67rem; line-height: 1.35; opacity: .58; max-height: 2.7em; }
  #${WORKSPACE_ID} .snowbunny-codex-entry-grid.compact .snowbunny-codex-entry { margin: 5px 0; }
  #${WORKSPACE_ID} .snowbunny-codex-entry-grid.compact .snowbunny-codex-entry button { min-height: 58px; }

  #${WORKSPACE_ID} .snowbunny-codex-form { display: grid; gap: 11px; }
  #${WORKSPACE_ID} .snowbunny-codex-label { display: grid; gap: 5px; font-size: .72rem; font-weight: 690; opacity: .82; }
  #${WORKSPACE_ID} .snowbunny-codex-checkrow { display: flex; align-items: center; gap: 12px; padding: 9px 3px; font-size: .76rem; }
  #${WORKSPACE_ID} .snowbunny-codex-checkrow label { display: inline-flex; align-items: center; gap: 6px; }
  #${WORKSPACE_ID} .snowbunny-codex-section-editor {
    padding: 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent);
    border-radius: 15px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 48%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-codex-section-editor input { margin-bottom: 6px; }
  #${WORKSPACE_ID} .snowbunny-codex-editor-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; margin-top: 4px; }
  #${WORKSPACE_ID} .snowbunny-codex-danger { background: color-mix(in srgb, #c44 16%, transparent); }

  #${SHEET_ID} {
    position: fixed; z-index: 12160; inset: 0; display: flex; align-items: flex-end; justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SHEET_ID} .snowbunny-codex-sheet-card {
    width: min(100%, 620px); max-height: 86dvh; display: flex; flex-direction: column; overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent); border-bottom: 0;
    border-radius: 24px 24px 0 0; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor); box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  #${SHEET_ID} .snowbunny-codex-sheet-handle { width: 38px; height: 4px; margin: 8px auto 2px; border-radius: 999px; background: currentColor; opacity: .24; }
  #${SHEET_ID} .snowbunny-codex-sheet-header { display: flex; align-items: center; gap: 8px; padding: 7px 10px 9px 16px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent); }
  #${SHEET_ID} .snowbunny-codex-sheet-header h3 { flex: 1; margin: 0; font-size: .96rem; }
  #${SHEET_ID} .snowbunny-codex-sheet-header button { min-width: 40px; min-height: 38px; border: 0; border-radius: 12px; background: transparent; color: inherit; font-weight: 700; }
  #${SHEET_ID} .snowbunny-codex-sheet-body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 10px calc(14px + env(safe-area-inset-bottom)); }
  #${SHEET_ID} .snowbunny-lorebook-option {
    width: 100%; min-height: 54px; display: flex; align-items: center; gap: 10px; margin: 3px 0; padding: 8px 10px;
    border: 1px solid transparent; border-radius: 15px; background: transparent; color: inherit; text-align: left;
  }
  #${SHEET_ID} .snowbunny-lorebook-option.selected { border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 42%, transparent); background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent); }
  #${SHEET_ID} .snowbunny-lorebook-option.locked { opacity: .7; }
  #${SHEET_ID} .snowbunny-lorebook-option-copy { flex: 1; min-width: 0; }
  #${SHEET_ID} .snowbunny-lorebook-option-copy strong,
  #${SHEET_ID} .snowbunny-lorebook-option-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${SHEET_ID} .snowbunny-lorebook-option-copy strong { font-size: .83rem; }
  #${SHEET_ID} .snowbunny-lorebook-option-copy small { margin-top: 3px; font-size: .67rem; opacity: .56; }
}
`;
    document.head.append(style);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
    closeSheet();
}

function workspace() {
    let root = document.getElementById(WORKSPACE_ID);
    if (!root) {
        root = el('div');
        root.id = WORKSPACE_ID;
        document.body.append(root);
    }
    root.replaceChildren();
    return root;
}

function header(title, onBack, actions = []) {
    const host = el('header', 'snowbunny-codex-header');
    const back = el('button');
    back.type = 'button';
    back.setAttribute('aria-label', 'Back');
    back.append(icon('fa-arrow-left'));
    back.addEventListener('click', onBack);
    host.append(back, el('h2', '', title), ...actions);
    return host;
}

function action(label, iconName, onClick, { primary = false, title = label } = {}) {
    const button = el('button', `snowbunny-codex-action${primary ? ' primary' : ''}`);
    button.type = 'button';
    button.title = title;
    button.append(icon(iconName));
    if (label) button.append(document.createTextNode(` ${label}`));
    button.addEventListener('click', onClick);
    return button;
}

function currentView() {
    return state()?.readGlobal?.()?.codexView === 'compact' ? 'compact' : 'visual';
}

function viewToggle(view, onChange) {
    const host = el('div', 'snowbunny-codex-view-toggle');
    for (const [value, iconName] of [['visual', 'fa-table-cells-large'], ['compact', 'fa-list']]) {
        const button = el('button');
        button.type = 'button';
        if (view === value) button.classList.add('active');
        button.append(icon(iconName));
        button.addEventListener('click', () => onChange(value));
        host.append(button);
    }
    return host;
}

function listRecords() {
    return store()?.list?.() ?? [];
}

function parseList(value) {
    return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function fieldLabel(label, input) {
    const host = el('label', 'snowbunny-codex-label');
    host.append(el('span', '', label), input);
    return host;
}

async function openLorebookEditor(bookId = '') {
    const book = bookId ? await store()?.load?.(bookId) : store()?.normalize?.({ name: 'Untitled Lorebook', entries: [] });
    if (!book) return;
    const root = workspace();
    root.append(header(bookId ? 'Edit Lorebook' : 'New Lorebook', openLorebookLibrary));
    const body = el('main', 'snowbunny-codex-body');
    const form = el('div', 'snowbunny-codex-form');
    const name = el('input', 'snowbunny-codex-field'); name.value = book.name;
    const description = el('textarea', 'snowbunny-codex-textarea'); description.value = book.description || ''; description.style.minHeight = '90px';
    const mode = el('select', 'snowbunny-codex-select');
    mode.append(new Option('Keywords', 'keywords'), new Option('Meaning', 'meaning')); mode.value = book.retrieval?.mode || 'keywords';
    form.append(fieldLabel('Name', name), fieldLabel('Description', description), fieldLabel('Retrieval', mode));
    const actions = el('div', 'snowbunny-codex-editor-actions');
    actions.append(action('Cancel', 'fa-xmark', openLorebookLibrary));
    if (bookId) {
        const remove = action('Delete', 'fa-trash', async () => {
            if (!window.confirm(`Delete Lorebook “${book.name}”?`)) return;
            await store()?.delete?.(book.id);
            openLorebookLibrary();
        });
        remove.classList.add('snowbunny-codex-danger');
        actions.append(remove);
    }
    actions.append(action('Save', 'fa-check', async () => {
        book.name = name.value.trim() || 'Untitled Lorebook';
        book.description = description.value.trim();
        book.retrieval = { ...(book.retrieval || {}), mode: mode.value };
        const saved = await store()?.save?.(book);
        if (saved) openBook(saved.id, { globalLibrary: true });
    }, { primary: true }));
    form.append(actions); body.append(form); root.append(body);
}

function bookCard(record) {
    const card = el('article', 'snowbunny-lorebook-card');
    const button = el('button');
    button.type = 'button';
    button.append(icon('fa-book-atlas'));
    button.append(el('strong', '', record.name));
    button.append(el('small', '', `${record.entryCount || 0} entries · ${record.retrieval?.mode === 'meaning' ? 'Meaning' : 'Keywords'}`));
    button.addEventListener('click', () => void openBook(record.id, { globalLibrary: true }));
    card.append(button);
    return card;
}

function openLorebookLibrary() {
    const root = workspace();
    let view = currentView();
    const toggle = viewToggle(view, value => { state()?.patchGlobal?.({ codexView: value }); openLorebookLibrary(); });
    const create = action('', 'fa-plus', () => void openLorebookEditor(), { title: 'Create Lorebook' });
    root.append(header('Lorebooks', closeWorkspace, [toggle, create]));
    const body = el('main', 'snowbunny-codex-body');
    const intro = el('div', 'snowbunny-codex-intro');
    intro.append(el('strong', '', 'Your Lorebooks'), el('small', '', 'SnowBunny Lorebooks are authored Codex data. SillyTavern World Info remains a compatibility import/export target, not this library.'));
    body.append(intro);
    const toolbar = el('div', 'snowbunny-codex-toolbar');
    const search = el('input', 'snowbunny-codex-search'); search.type = 'search'; search.placeholder = 'Search Lorebooks';
    toolbar.append(search); body.append(toolbar);
    const grid = el('div', `snowbunny-lorebook-grid${view === 'compact' ? ' compact' : ''}`); body.append(grid); root.append(body);
    const render = () => {
        const query = search.value.trim().toLowerCase();
        const records = listRecords().filter(record => !query || `${record.name} ${record.description || ''} ${(record.tags || []).join(' ')}`.toLowerCase().includes(query));
        grid.replaceChildren();
        if (!records.length) {
            grid.append(el('div', 'snowbunny-codex-empty', 'No Lorebooks yet. Create one here instead of using World Info as SnowBunny’s canonical store.'));
            return;
        }
        for (const record of records) grid.append(bookCard(record));
    };
    search.addEventListener('input', render); render();
}

async function openEntryEditor(bookId, entryId = '') {
    const book = await store()?.load?.(bookId);
    if (!book) return;
    const existing = entryId ? book.entries.find(entry => entry.id === entryId) : null;
    const entry = existing ? structuredClone(existing) : store()?.createEmptyEntry?.('Other');
    if (!entry) return;
    if (!existing) entry.name = '';

    const root = workspace();
    root.append(header(existing ? entry.name : 'New Lore Entry', () => void openBook(book.id, { globalLibrary: true })));
    const body = el('main', 'snowbunny-codex-body');
    const form = el('div', 'snowbunny-codex-form');
    const name = el('input', 'snowbunny-codex-field'); name.value = entry.name || ''; name.placeholder = 'Entry name';
    const type = el('select', 'snowbunny-codex-select');
    for (const typeName of ENTRY_TYPES) type.append(new Option(typeName, typeName)); type.value = ENTRY_TYPES.includes(entry.type) ? entry.type : 'Other';
    const aliases = el('input', 'snowbunny-codex-field'); aliases.value = (entry.aliases || []).join(', '); aliases.placeholder = 'Alias, another alias';
    const tags = el('input', 'snowbunny-codex-field'); tags.value = (entry.tags || []).join(', '); tags.placeholder = 'tag, tag';
    const description = el('textarea', 'snowbunny-codex-textarea'); description.value = entry.description || ''; description.placeholder = 'What should the AI know about this entry?';
    form.append(fieldLabel('Name', name), fieldLabel('Type', type), fieldLabel('Aliases / keywords', aliases), fieldLabel('Tags', tags), fieldLabel('Description', description));

    const checks = el('div', 'snowbunny-codex-checkrow');
    const enabled = el('input'); enabled.type = 'checkbox'; enabled.checked = entry.enabled !== false;
    const always = el('input'); always.type = 'checkbox'; always.checked = entry.alwaysActive === true;
    const enabledLabel = el('label'); enabledLabel.append(enabled, el('span', '', 'Enabled'));
    const alwaysLabel = el('label'); alwaysLabel.append(always, el('span', '', 'Always active'));
    checks.append(enabledLabel, alwaysLabel); form.append(checks);

    const sectionsHost = el('div');
    const sections = structuredClone(entry.sections || []);
    const renderSections = () => {
        sectionsHost.replaceChildren();
        sections.forEach((section, index) => {
            const panel = el('div', 'snowbunny-codex-section-editor');
            const label = el('input', 'snowbunny-codex-field'); label.value = section.label || ''; label.placeholder = 'Section name';
            const text = el('textarea', 'snowbunny-codex-textarea'); text.value = section.text || ''; text.style.minHeight = '88px';
            label.addEventListener('input', () => { section.label = label.value; });
            text.addEventListener('input', () => { section.text = text.value; });
            const remove = action('Remove', 'fa-trash', () => { sections.splice(index, 1); renderSections(); });
            panel.append(label, text, remove); sectionsHost.append(panel);
        });
        const add = action('Add field', 'fa-plus', () => { sections.push({ id: `section_${Date.now()}_${sections.length}`, label: 'Custom field', text: '', custom: true, order: sections.length }); renderSections(); });
        sectionsHost.append(add);
    };
    renderSections(); form.append(fieldLabel('Structured fields', sectionsHost));

    const actions = el('div', 'snowbunny-codex-editor-actions');
    if (existing) {
        const remove = action('Delete', 'fa-trash', async () => {
            if (!window.confirm(`Delete Lore Entry “${entry.name}”?`)) return;
            book.entries = book.entries.filter(item => item.id !== entry.id);
            await store()?.save?.(book);
            void openBook(book.id, { globalLibrary: true });
        });
        remove.classList.add('snowbunny-codex-danger'); actions.append(remove);
    }
    actions.append(action('Cancel', 'fa-xmark', () => void openBook(book.id, { globalLibrary: true })), action('Save', 'fa-check', async () => {
        const finalName = name.value.trim();
        if (!finalName) { name.focus(); return; }
        entry.name = finalName;
        entry.type = type.value;
        entry.aliases = parseList(aliases.value);
        entry.tags = parseList(tags.value);
        entry.description = description.value;
        entry.enabled = enabled.checked;
        entry.alwaysActive = always.checked;
        entry.sections = sections.map((section, index) => ({ ...section, order: index })).filter(section => section.label?.trim() || section.text?.trim());
        entry.updatedAt = Date.now();
        if (existing) book.entries = book.entries.map(item => item.id === entry.id ? entry : item);
        else book.entries.push(entry);
        await store()?.save?.(book);
        void openBook(book.id, { globalLibrary: true });
    }, { primary: true }));
    form.append(actions); body.append(form); root.append(body);
    window.setTimeout(() => name.focus({ preventScroll: true }), 40);
}

function entryExcerpt(entry) {
    const text = entry.description || entry.sections?.find(section => section.text)?.text || '';
    return String(text).replace(/\s+/g, ' ').trim().slice(0, 150) || (entry.alwaysActive ? 'Always active' : entry.enabled === false ? 'Disabled' : 'No description yet');
}

async function openBook(bookId, { globalLibrary = false } = {}) {
    const book = await store()?.load?.(bookId);
    if (!book) return globalLibrary ? openLorebookLibrary() : openCodex();
    if (!globalLibrary) state()?.patchChat?.({ codexViewedLorebookId: book.id });
    const root = workspace();
    let view = currentView();
    const edit = action('', 'fa-pencil', () => void openLorebookEditor(book.id), { title: 'Edit Lorebook' });
    const create = action('', 'fa-plus', () => void openEntryEditor(book.id), { title: 'New Lore Entry' });
    root.append(header(book.name, globalLibrary ? openLorebookLibrary : openCodex, [edit, create]));
    const body = el('main', 'snowbunny-codex-body');

    if (!globalLibrary) {
        const effective = store()?.effectiveIds?.() ?? [];
        if (effective.length > 1) {
            const bar = el('div', 'snowbunny-codex-bookbar');
            const select = el('select', 'snowbunny-codex-bookselect');
            for (const idValue of effective) {
                const record = listRecords().find(item => item.id === idValue);
                if (record) select.append(new Option(record.name, record.id));
            }
            select.value = book.id;
            select.addEventListener('change', () => void openBook(select.value));
            bar.append(select); body.append(bar);
        }
    }

    const toolbar = el('div', 'snowbunny-codex-toolbar');
    const search = el('input', 'snowbunny-codex-search'); search.type = 'search'; search.placeholder = 'Search your Codex';
    const toggle = viewToggle(view, value => { state()?.patchGlobal?.({ codexView: value }); void openBook(book.id, { globalLibrary }); });
    toolbar.append(search, toggle); body.append(toolbar);
    const content = el('div'); body.append(content); root.append(body);

    const render = () => {
        const query = search.value.trim().toLowerCase();
        const entries = [...(book.entries || [])]
            .filter(entry => !query || `${entry.name} ${entry.type} ${entry.description || ''} ${(entry.aliases || []).join(' ')} ${(entry.tags || []).join(' ')}`.toLowerCase().includes(query))
            .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
        content.replaceChildren();
        if (!entries.length) {
            content.append(el('div', 'snowbunny-codex-empty', book.entries?.length ? 'No entries match this search.' : 'This Lorebook is empty. Add your first Lore Entry.'));
            return;
        }
        const groups = new Map();
        for (const entry of entries) {
            const type = ENTRY_TYPES.includes(entry.type) ? entry.type : 'Other';
            if (!groups.has(type)) groups.set(type, []);
            groups.get(type).push(entry);
        }
        for (const typeName of ENTRY_TYPES) {
            const items = groups.get(typeName);
            if (!items?.length) continue;
            const section = el('section', 'snowbunny-codex-type-section');
            const heading = el('div', 'snowbunny-codex-type-title');
            heading.append(icon(typeName === 'Character' ? 'fa-user' : typeName === 'Location' ? 'fa-location-dot' : typeName === 'Faction' ? 'fa-people-group' : 'fa-bookmark'), el('span', '', `${typeName} (${items.length})`));
            section.append(heading);
            const grid = el('div', `snowbunny-codex-entry-grid${view === 'compact' ? ' compact' : ''}`);
            for (const entry of items) {
                const card = el('article', 'snowbunny-codex-entry');
                const button = el('button'); button.type = 'button';
                button.append(el('strong', '', entry.name), el('small', '', entryExcerpt(entry)));
                button.addEventListener('click', () => void openEntryEditor(book.id, entry.id));
                card.append(button); grid.append(card);
            }
            section.append(grid); content.append(section);
        }
    };
    search.addEventListener('input', render); render();
}

function createAssignmentSheet() {
    closeSheet();
    const overlay = el('div'); overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-codex-sheet-card');
    card.append(el('div', 'snowbunny-codex-sheet-handle'));
    const head = el('header', 'snowbunny-codex-sheet-header');
    head.append(el('h3', '', 'Lorebooks'));
    const close = el('button', '', 'Cancel'); close.type = 'button'; close.addEventListener('click', closeSheet);
    const apply = el('button', '', 'Apply'); apply.type = 'button';
    head.append(close, apply); card.append(head);
    const body = el('div', 'snowbunny-codex-sheet-body'); card.append(body); overlay.append(card);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) closeSheet(); });
    document.body.append(overlay);

    const records = listRecords();
    const storyIds = new Set(store()?.storyIds?.() ?? []);
    const selected = new Set(store()?.effectiveIds?.() ?? []);
    if (!records.length) {
        body.append(el('div', 'snowbunny-codex-empty', 'No SnowBunny Lorebooks exist yet. Create one from the global Lorebooks library.'));
    }
    for (const record of records) {
        const locked = storyIds.has(record.id);
        const row = el('button', `snowbunny-lorebook-option${selected.has(record.id) ? ' selected' : ''}${locked ? ' locked' : ''}`);
        row.type = 'button'; row.disabled = locked;
        row.append(icon(locked ? 'fa-lock' : selected.has(record.id) ? 'fa-circle-check' : 'fa-circle'));
        const copy = el('div', 'snowbunny-lorebook-option-copy');
        copy.append(el('strong', '', record.name), el('small', '', locked ? 'Story Lorebook · always active in this Story' : `${record.entryCount || 0} entries · chat-specific`));
        row.append(copy);
        if (!locked) row.addEventListener('click', () => {
            if (selected.has(record.id)) selected.delete(record.id); else selected.add(record.id);
            row.classList.toggle('selected', selected.has(record.id));
            row.querySelector('i').className = `fa-solid ${selected.has(record.id) ? 'fa-circle-check' : 'fa-circle'}`;
        });
        body.append(row);
    }
    apply.addEventListener('click', () => {
        store()?.setChatIds?.([...selected]);
        closeSheet();
        enhanceShell();
    });
}

function openCodex() {
    const effective = store()?.effectiveIds?.() ?? [];
    if (!effective.length) {
        const root = workspace();
        root.append(header('Codex', closeWorkspace));
        const body = el('main', 'snowbunny-codex-body');
        const empty = el('div', 'snowbunny-codex-empty', 'No Lorebooks are bound to this chat. Codex only shows the current chat’s effective Story + chat Lorebooks.');
        body.append(empty, action('Choose Lorebooks', 'fa-book-atlas', createAssignmentSheet, { primary: true }));
        root.append(body);
        return;
    }
    const remembered = state()?.readChat?.()?.codexViewedLorebookId;
    const selected = effective.includes(remembered) ? remembered : effective[0];
    void openBook(selected);
}

function leftRow(label) {
    return [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === label,
    ) ?? null;
}

function rightRow(label) {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === label,
    ) ?? null;
}

function enable(button, key, handler) {
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    if (button.dataset.snowbunnyCodexAction === key) return;
    button.dataset.snowbunnyCodexAction = key;
    button.addEventListener('click', handler);
}

function enhanceShell() {
    queued = false;
    enable(document.querySelector('#snowbunny-top-strip .snowbunny-top-action[aria-label="Codex"]'), 'top-codex', openCodex);
    enable(leftRow('Lorebooks'), 'global-lorebooks', openLorebookLibrary);
    const row = rightRow('Lorebooks');
    if (row instanceof HTMLButtonElement) {
        const value = row.querySelector('.snowbunny-shell-row-value');
        const count = store()?.effectiveIds?.()?.length || 0;
        if (value) value.textContent = count ? `${count} active` : 'None';
        enable(row, 'chat-lorebooks', createAssignmentSheet);
    }
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhanceShell);
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(SHEET_ID)) closeSheet();
    else if (document.getElementById(WORKSPACE_ID)) closeWorkspace();
}

export function initCodex() {
    if (initialized) return;
    initialized = true;
    installStyles();
    enhanceShell();
    const left = document.getElementById(LEFT_DRAWER_ID);
    const right = document.getElementById(RIGHT_DRAWER_ID);
    shellObserver = new MutationObserver(queueEnhance);
    if (left) shellObserver.observe(left, { childList: true, subtree: true });
    if (right) shellObserver.observe(right, { childList: true, subtree: true });
    document.addEventListener('snowbunny:lorebooks-changed', queueEnhance);
    document.addEventListener('snowbunny:lorebook-bindings-changed', queueEnhance);
    document.addEventListener('keydown', onKeyDown, true);
}
