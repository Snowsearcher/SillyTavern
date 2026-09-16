const WORKSPACE_ID = 'snowbunny-character-library';
const FILTER_SHEET_ID = 'snowbunny-character-filter-sheet';
const STYLE_ID = 'snowbunny-character-library-style';
const LEFT_DRAWER_ID = 'snowbunny-left-drawer';

let initialized = false;
let shellObserver = null;
let recordsCache = null;
let recordsPromise = null;
const collapsedGroups = new Set();

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function authoring() {
    return globalThis.SnowBunny?.characterAuthoring ?? null;
}

function links() {
    return globalThis.SnowBunny?.characterCodexLinks ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
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
  #${WORKSPACE_ID} {
    position: fixed; z-index: 12115; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%);
    color: var(--SmartThemeBodyColor);
  }
  #${WORKSPACE_ID} .snowbunny-character-header {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 94%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-character-header h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.03rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${WORKSPACE_ID} .snowbunny-character-header button {
    min-width: 40px; min-height: 40px; border: 0; border-radius: 13px; background: transparent; color: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-character-header .primary {
    padding: 0 13px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); font-weight: 720;
  }
  #${WORKSPACE_ID} .snowbunny-character-body {
    flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
    padding: 12px 14px calc(22px + env(safe-area-inset-bottom));
  }
  #${WORKSPACE_ID} .snowbunny-character-toolbar { display: flex; gap: 7px; margin-bottom: 12px; }
  #${WORKSPACE_ID} .snowbunny-character-search,
  #${WORKSPACE_ID} .snowbunny-character-input,
  #${WORKSPACE_ID} .snowbunny-character-textarea,
  #${FILTER_SHEET_ID} select {
    box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 60%, transparent);
    color: inherit; font: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-character-search { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .snowbunny-character-tool {
    min-width: 44px; min-height: 42px; padding: 7px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 55%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 56%, transparent); color: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-character-view {
    display: inline-flex; gap: 2px; padding: 2px; border-radius: 12px; background: color-mix(in srgb, currentColor 7%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-character-view button { min-width: 34px; min-height: 34px; border: 0; border-radius: 10px; background: transparent; color: inherit; opacity: .48; }
  #${WORKSPACE_ID} .snowbunny-character-view button.active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); opacity: .95; }
  #${WORKSPACE_ID} .snowbunny-character-group { margin: 8px 0 16px; }
  #${WORKSPACE_ID} .snowbunny-character-group-title {
    width: 100%; min-height: 38px; display: flex; align-items: center; gap: 8px; padding: 5px 4px;
    border: 0; background: transparent; color: inherit; text-align: left; font-size: .75rem; font-weight: 750; opacity: .72;
  }
  #${WORKSPACE_ID} .snowbunny-character-group-title span { flex: 1; }
  #${WORKSPACE_ID} .snowbunny-character-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  #${WORKSPACE_ID} .snowbunny-character-grid.compact { display: block; }
  #${WORKSPACE_ID} .snowbunny-character-card {
    position: relative; min-width: 0; overflow: hidden; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-character-card-main { width: 100%; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; }
  #${WORKSPACE_ID} .snowbunny-character-art { position: relative; aspect-ratio: 3 / 4; overflow: hidden; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, #141418); }
  #${WORKSPACE_ID} .snowbunny-character-art img { width: 100%; height: 100%; object-fit: cover; }
  #${WORKSPACE_ID} .snowbunny-character-art .fallback { position: absolute; inset: 0; display: grid; place-items: center; font-size: 2rem; opacity: .35; }
  #${WORKSPACE_ID} .snowbunny-character-card-copy { padding: 9px 10px 11px; }
  #${WORKSPACE_ID} .snowbunny-character-card-copy strong,
  #${WORKSPACE_ID} .snowbunny-character-card-copy small { display: block; overflow: hidden; text-overflow: ellipsis; }
  #${WORKSPACE_ID} .snowbunny-character-card-copy strong { white-space: nowrap; font-size: .86rem; }
  #${WORKSPACE_ID} .snowbunny-character-card-copy small { margin-top: 3px; white-space: nowrap; font-size: .67rem; opacity: .56; }
  #${WORKSPACE_ID} .snowbunny-character-star {
    position: absolute; z-index: 2; top: 7px; right: 7px; width: 36px; height: 36px; border: 0; border-radius: 50%;
    background: rgb(0 0 0 / 42%); color: white; backdrop-filter: blur(7px);
  }
  #${WORKSPACE_ID} .snowbunny-character-grid.compact .snowbunny-character-card { margin: 6px 0; }
  #${WORKSPACE_ID} .snowbunny-character-grid.compact .snowbunny-character-card-main { display: grid; grid-template-columns: 58px 1fr; min-height: 70px; align-items: stretch; }
  #${WORKSPACE_ID} .snowbunny-character-grid.compact .snowbunny-character-art { aspect-ratio: auto; min-height: 70px; }
  #${WORKSPACE_ID} .snowbunny-character-grid.compact .snowbunny-character-card-copy { align-self: center; padding-right: 48px; }
  #${WORKSPACE_ID} .snowbunny-character-empty {
    padding: 30px 16px; border: 1px dashed color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 18px;
    text-align: center; font-size: .77rem; line-height: 1.45; opacity: .62;
  }
  #${WORKSPACE_ID} .snowbunny-narrator-library-card {
    display: flex; align-items: center; gap: 10px; min-height: 64px; margin-bottom: 11px; padding: 9px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 28%, var(--SmartThemeBorderColor));
    border-radius: 17px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 8%, var(--SmartThemeBlurTintColor));
  }
  #${WORKSPACE_ID} .snowbunny-narrator-library-card button { flex: 1; display: flex; align-items: center; gap: 11px; border: 0; background: transparent; color: inherit; text-align: left; }
  #${WORKSPACE_ID} .snowbunny-narrator-library-card i { width: 38px; text-align: center; font-size: 1.25rem; opacity: .65; }
  #${WORKSPACE_ID} .snowbunny-narrator-library-copy strong,
  #${WORKSPACE_ID} .snowbunny-narrator-library-copy small { display: block; }
  #${WORKSPACE_ID} .snowbunny-narrator-library-copy small { margin-top: 2px; font-size: .67rem; opacity: .56; }

  #${WORKSPACE_ID} .snowbunny-character-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 12px; padding: 3px; border-radius: 14px; background: color-mix(in srgb, currentColor 7%, transparent); }
  #${WORKSPACE_ID} .snowbunny-character-tabs button { min-height: 40px; border: 0; border-radius: 11px; background: transparent; color: inherit; font-weight: 700; }
  #${WORKSPACE_ID} .snowbunny-character-tabs button.active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
  #${WORKSPACE_ID} .snowbunny-character-hero { display: flex; gap: 12px; margin-bottom: 13px; padding: 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent); border-radius: 18px; }
  #${WORKSPACE_ID} .snowbunny-character-portrait { width: 86px; height: 112px; flex: 0 0 86px; overflow: hidden; border-radius: 16px; background: color-mix(in srgb, currentColor 8%, transparent); }
  #${WORKSPACE_ID} .snowbunny-character-portrait img { width: 100%; height: 100%; object-fit: cover; }
  #${WORKSPACE_ID} .snowbunny-character-hero-copy { flex: 1; min-width: 0; align-self: center; }
  #${WORKSPACE_ID} .snowbunny-character-hero-copy strong { display: block; font-size: 1.05rem; }
  #${WORKSPACE_ID} .snowbunny-character-hero-copy small { display: block; margin-top: 5px; font-size: .68rem; line-height: 1.4; opacity: .58; }
  #${WORKSPACE_ID} .snowbunny-character-form { display: grid; gap: 10px; }
  #${WORKSPACE_ID} .snowbunny-character-label { display: grid; gap: 5px; font-size: .72rem; font-weight: 700; }
  #${WORKSPACE_ID} .snowbunny-character-textarea { min-height: 96px; resize: vertical; line-height: 1.45; }
  #${WORKSPACE_ID} .snowbunny-character-check { display: flex; align-items: center; gap: 9px; min-height: 42px; padding: 8px 4px; font-size: .76rem; }
  #${WORKSPACE_ID} .snowbunny-character-check input { width: 19px; height: 19px; }
  #${WORKSPACE_ID} .snowbunny-character-link-list { display: grid; gap: 5px; }
  #${WORKSPACE_ID} .snowbunny-character-link-option { display: flex; align-items: center; gap: 9px; min-height: 44px; padding: 7px 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 13px; }
  #${WORKSPACE_ID} .snowbunny-character-link-option span { flex: 1; min-width: 0; font-size: .76rem; }
  #${WORKSPACE_ID} .snowbunny-writing-mode { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; }
  #${WORKSPACE_ID} .snowbunny-writing-mode button { min-height: 40px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 13px; background: transparent; color: inherit; }
  #${WORKSPACE_ID} .snowbunny-writing-mode button.active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent); }
  #${WORKSPACE_ID} .snowbunny-writing-field { margin: 7px 0; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 15px; overflow: hidden; }
  #${WORKSPACE_ID} .snowbunny-writing-field summary { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 8px 10px; cursor: pointer; font-size: .76rem; font-weight: 700; }
  #${WORKSPACE_ID} .snowbunny-writing-field summary span { flex: 1; }
  #${WORKSPACE_ID} .snowbunny-writing-field-body { padding: 0 9px 10px; }
  #${WORKSPACE_ID} .snowbunny-writing-field-tools { display: flex; justify-content: flex-end; gap: 5px; margin-top: 6px; }
  #${WORKSPACE_ID} .snowbunny-writing-field-tools button,
  #${WORKSPACE_ID} .snowbunny-add-field { min-height: 36px; padding: 6px 10px; border: 0; border-radius: 11px; background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; }
  #${WORKSPACE_ID} .snowbunny-character-preview { display: grid; gap: 10px; }
  #${WORKSPACE_ID} .snowbunny-preview-block { padding: 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent); }
  #${WORKSPACE_ID} .snowbunny-preview-block strong { display: block; margin-bottom: 5px; font-size: .76rem; }
  #${WORKSPACE_ID} .snowbunny-preview-block div { white-space: pre-wrap; overflow-wrap: anywhere; font-size: .79rem; line-height: 1.48; }

  #${FILTER_SHEET_ID} { position: fixed; z-index: 12170; inset: 0; display: flex; align-items: flex-end; justify-content: center; background: rgb(0 0 0 / 48%); }
  #${FILTER_SHEET_ID} .snowbunny-character-filter-card { width: min(100%, 620px); padding: 8px 14px calc(18px + env(safe-area-inset-bottom)); border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent); border-bottom: 0; border-radius: 24px 24px 0 0; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%); color: var(--SmartThemeBodyColor); }
  #${FILTER_SHEET_ID} h3 { margin: 6px 2px 11px; font-size: .96rem; }
  #${FILTER_SHEET_ID} label { display: grid; gap: 5px; margin: 9px 0; font-size: .72rem; font-weight: 700; }
  #${FILTER_SHEET_ID} .check { display: flex; align-items: center; gap: 9px; }
  #${FILTER_SHEET_ID} .actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 12px; }
  #${FILTER_SHEET_ID} .actions button { min-height: 40px; padding: 7px 13px; border: 0; border-radius: 12px; background: color-mix(in srgb, currentColor 8%, transparent); color: inherit; }
}
`;
    document.head.append(style);
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

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
    document.getElementById(FILTER_SHEET_ID)?.remove();
}

function header(title, onBack, actions = []) {
    const node = el('header', 'snowbunny-character-header');
    const back = el('button'); back.type = 'button'; back.append(icon('fa-arrow-left')); back.addEventListener('click', onBack);
    node.append(back, el('h2', '', title), ...actions);
    return node;
}

function thumbnail(avatar) {
    try {
        return context()?.getThumbnailUrl?.('avatar', avatar) || '';
    } catch (_) {
        return '';
    }
}

function viewMode() {
    return state()?.readGlobal?.()?.characterLibraryView === 'compact' ? 'compact' : 'visual';
}

function setViewMode(value) {
    state()?.patchGlobal?.({ characterLibraryView: value === 'compact' ? 'compact' : 'visual' });
}

function viewToggle(value, onChange) {
    const host = el('div', 'snowbunny-character-view');
    for (const [mode, iconName] of [['visual', 'fa-table-cells-large'], ['compact', 'fa-list']]) {
        const button = el('button'); button.type = 'button'; if (value === mode) button.classList.add('active'); button.append(icon(iconName));
        button.addEventListener('click', () => onChange(mode)); host.append(button);
    }
    return host;
}

async function loadRecords({ fresh = false } = {}) {
    if (!fresh && recordsCache) return clone(recordsCache);
    if (!fresh && recordsPromise) return recordsPromise;
    const api = context();
    const characters = (api?.characters || []).filter(character => character?.avatar && character?.name);
    recordsPromise = Promise.all(characters.map(async character => {
        const record = await authoring()?.read?.(character.avatar, { fresh });
        return record || {
            avatar: character.avatar,
            name: character.name,
            entityId: '',
            document: { mode: 'freeform', content: character.description || '', fields: [] },
            metadata: { category: '', aliases: [], tags: character.tags || [], favorite: character.fav === true || character.fav === 'true' },
            character,
        };
    })).then(records => {
        recordsCache = records;
        return clone(records);
    }).finally(() => { recordsPromise = null; });
    return recordsPromise;
}

function invalidateRecords() {
    recordsCache = null;
}

function parseList(value) {
    return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function labelInput(label, input) {
    const host = el('label', 'snowbunny-character-label');
    host.append(el('span', '', label), input);
    return host;
}

async function toggleFavorite(record, refresh) {
    const draft = clone(record);
    draft.metadata.favorite = !draft.metadata.favorite;
    try {
        await authoring()?.save?.(draft);
        invalidateRecords();
        await refresh();
    } catch (error) {
        console.error('[SnowBunny] Could not change Character favorite.', error);
    }
}

function cardSubtitle(record) {
    const bits = [];
    if (record.metadata?.category) bits.push(record.metadata.category);
    bits.push(...(record.metadata?.tags || []).slice(0, 2));
    return bits.join(' · ') || String(record.document?.content || '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Character';
}

function characterCard(record, mode, refresh) {
    const card = el('article', 'snowbunny-character-card');
    const main = el('button', 'snowbunny-character-card-main'); main.type = 'button';
    const art = el('div', 'snowbunny-character-art');
    const src = thumbnail(record.avatar);
    if (src) { const image = new Image(); image.src = src; image.alt = ''; art.append(image); }
    else { const fallback = el('div', 'fallback'); fallback.append(icon('fa-user')); art.append(fallback); }
    const copy = el('div', 'snowbunny-character-card-copy');
    copy.append(el('strong', '', record.name), el('small', '', cardSubtitle(record)));
    main.append(art, copy);
    main.addEventListener('click', () => void openCharacterEditor(record.avatar));
    const star = el('button', 'snowbunny-character-star'); star.type = 'button'; star.title = record.metadata?.favorite ? 'Remove favorite' : 'Add favorite';
    star.append(icon(record.metadata?.favorite ? 'fa-star' : 'fa-star-half-stroke'));
    star.addEventListener('click', event => { event.stopPropagation(); void toggleFavorite(record, refresh); });
    card.append(main, star);
    if (mode === 'compact') card.classList.add('compact');
    return card;
}

async function openNarratorCard(host) {
    const config = await globalThis.SnowBunny?.narrator?.get?.();
    const card = el('div', 'snowbunny-narrator-library-card');
    const button = el('button'); button.type = 'button';
    button.append(icon('fa-feather-pointed'));
    const copy = el('div', 'snowbunny-narrator-library-copy');
    copy.append(el('strong', '', config?.name || 'Narrator'), el('small', '', 'Built-in writer identity · protected'));
    button.append(copy, icon('fa-chevron-right'));
    button.addEventListener('click', () => void globalThis.SnowBunny?.narrator?.openEditor?.());
    card.append(button); host.append(card);
}

function nativeCreateCharacter() {
    closeWorkspace();
    const api = context();
    const index = api?.characters?.length || 0;
    const create = document.getElementById('rm_button_create');
    if (create instanceof HTMLElement) {
        create.click();
        return;
    }
    console.warn(`[SnowBunny] Native Character creation bridge is unavailable (${index} Characters loaded).`);
}

function openFilterSheet(filters, records, onApply) {
    document.getElementById(FILTER_SHEET_ID)?.remove();
    const overlay = el('div'); overlay.id = FILTER_SHEET_ID;
    const card = el('section', 'snowbunny-character-filter-card');
    card.append(el('h3', '', 'Character filters'));
    const favoriteLabel = el('label', 'check');
    const favorite = el('input'); favorite.type = 'checkbox'; favorite.checked = filters.favorite;
    favoriteLabel.append(favorite, el('span', '', 'Favorites only')); card.append(favoriteLabel);

    const tags = [...new Set(records.flatMap(record => record.metadata?.tags || []))].sort();
    const tag = el('select'); tag.append(new Option('Any tag', '')); for (const value of tags) tag.append(new Option(value, value)); tag.value = filters.tag;
    card.append(labelInput('Tag', tag));

    const book = el('select'); book.append(new Option('Any linked Lorebook', ''));
    for (const item of lorebooks()?.list?.() || []) book.append(new Option(item.name, item.id)); book.value = filters.book;
    card.append(labelInput('Linked Lorebook', book));

    const sort = el('select'); sort.append(new Option('Name', 'name'), new Option('Recently added', 'recent'), new Option('Oldest added', 'oldest')); sort.value = filters.sort;
    card.append(labelInput('Sort', sort));

    const actions = el('div', 'actions');
    const reset = el('button', '', 'Reset'); reset.type = 'button';
    const apply = el('button', '', 'Apply'); apply.type = 'button';
    reset.addEventListener('click', () => { favorite.checked = false; tag.value = ''; book.value = ''; sort.value = 'name'; });
    apply.addEventListener('click', () => { onApply({ favorite: favorite.checked, tag: tag.value, book: book.value, sort: sort.value }); overlay.remove(); });
    actions.append(reset, apply); card.append(actions); overlay.append(card);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) overlay.remove(); });
    document.body.append(overlay);
}

async function linkedSets(records) {
    const result = new Map();
    await Promise.all(records.map(async record => {
        result.set(record.avatar, new Set(await links()?.linkedBookIds?.(record.avatar) || []));
    }));
    return result;
}

async function openLibrary() {
    installStyles();
    const root = workspace();
    let mode = viewMode();
    const toggle = viewToggle(mode, value => { setViewMode(value); void openLibrary(); });
    const create = el('button', 'primary', '+ Create'); create.type = 'button'; create.addEventListener('click', nativeCreateCharacter);
    root.append(header('Characters', closeWorkspace, [toggle, create]));
    const body = el('main', 'snowbunny-character-body'); root.append(body);
    await openNarratorCard(body);

    const toolbar = el('div', 'snowbunny-character-toolbar');
    const search = el('input', 'snowbunny-character-search'); search.type = 'search'; search.placeholder = 'Search Characters'; search.autocomplete = 'off';
    const filter = el('button', 'snowbunny-character-tool'); filter.type = 'button'; filter.append(icon('fa-filter'));
    toolbar.append(search, filter); body.append(toolbar);
    const content = el('div'); content.append(el('div', 'snowbunny-character-empty', 'Loading Characters…')); body.append(content);

    const records = await loadRecords();
    const bookSets = await linkedSets(records);
    let filters = { favorite: false, tag: '', book: '', sort: 'name' };

    const render = () => {
        const query = search.value.trim().toLowerCase();
        let visible = records.filter(record => {
            const metadata = record.metadata || {};
            const haystack = `${record.name} ${metadata.category || ''} ${(metadata.aliases || []).join(' ')} ${(metadata.tags || []).join(' ')}`.toLowerCase();
            return (!query || haystack.includes(query))
                && (!filters.favorite || metadata.favorite)
                && (!filters.tag || (metadata.tags || []).includes(filters.tag))
                && (!filters.book || bookSets.get(record.avatar)?.has(filters.book));
        });
        if (filters.sort === 'recent') visible.sort((a, b) => Number(b.character?.date_added || 0) - Number(a.character?.date_added || 0));
        else if (filters.sort === 'oldest') visible.sort((a, b) => Number(a.character?.date_added || 0) - Number(b.character?.date_added || 0));
        else visible.sort((a, b) => a.name.localeCompare(b.name));

        content.replaceChildren();
        if (!visible.length) { content.append(el('div', 'snowbunny-character-empty', 'No Characters match this view.')); return; }
        const grouped = new Map();
        for (const record of visible) {
            const category = record.metadata?.category?.trim() || 'Ungrouped';
            if (!grouped.has(category)) grouped.set(category, []);
            grouped.get(category).push(record);
        }
        const refresh = async () => { await loadRecords({ fresh: true }); await openLibrary(); };
        for (const category of [...grouped.keys()].sort((a, b) => a.localeCompare(b))) {
            const section = el('section', 'snowbunny-character-group');
            const title = el('button', 'snowbunny-character-group-title'); title.type = 'button';
            title.append(icon(collapsedGroups.has(category) ? 'fa-chevron-right' : 'fa-chevron-down'), el('span', '', category), el('small', '', String(grouped.get(category).length)));
            title.addEventListener('click', () => { if (collapsedGroups.has(category)) collapsedGroups.delete(category); else collapsedGroups.add(category); render(); });
            section.append(title);
            if (!collapsedGroups.has(category)) {
                const grid = el('div', `snowbunny-character-grid${mode === 'compact' ? ' compact' : ''}`);
                for (const record of grouped.get(category)) grid.append(characterCard(record, mode, refresh));
                section.append(grid);
            }
            content.append(section);
        }
    };

    search.addEventListener('input', render);
    filter.addEventListener('click', () => openFilterSheet(filters, records, value => { filters = value; render(); }));
    render();
}

function fieldRoleLabel(field) {
    if (field.role === 'dialogueExamples') return 'Dialogue examples';
    if (field.role === 'firstMessage') return 'Chat opening';
    return '';
}

function previewTab(draft) {
    const host = el('div', 'snowbunny-character-preview');
    if (draft.document.content.trim()) {
        const block = el('div', 'snowbunny-preview-block'); block.append(el('strong', '', 'Description'), el('div', '', draft.document.content.trim())); host.append(block);
    }
    for (const field of draft.document.fields) {
        if (!field.value.trim()) continue;
        const block = el('div', 'snowbunny-preview-block'); block.append(el('strong', '', field.label), el('div', '', field.value)); host.append(block);
    }
    if (!host.children.length) host.append(el('div', 'snowbunny-character-empty', 'Nothing written yet.'));
    return host;
}

function writingTab(draft, rerender) {
    const host = el('div');
    const modes = el('div', 'snowbunny-writing-mode');
    for (const [value, label] of [['structured', 'Structured'], ['freeform', 'Freeform']]) {
        const button = el('button', draft.document.mode === value ? 'active' : '', label); button.type = 'button';
        button.addEventListener('click', () => { draft.document.mode = value; rerender('writing'); }); modes.append(button);
    }
    host.append(modes);
    const description = el('textarea', 'snowbunny-character-textarea'); description.value = draft.document.content; description.placeholder = 'Main description';
    description.addEventListener('input', () => { draft.document.content = description.value; });
    host.append(labelInput('Main Description', description));

    if (draft.document.mode === 'structured') {
        const fieldHost = el('div'); host.append(fieldHost);
        draft.document.fields.forEach((field, index) => {
            const details = el('details', 'snowbunny-writing-field');
            const summary = el('summary'); summary.append(el('span', '', field.label));
            const role = fieldRoleLabel(field); if (role) summary.append(el('small', '', role));
            details.append(summary);
            const body = el('div', 'snowbunny-writing-field-body');
            if (field.custom) {
                const label = el('input', 'snowbunny-character-input'); label.value = field.label;
                label.addEventListener('input', () => { field.label = label.value.trimStart(); }); body.append(label);
            }
            const textarea = el('textarea', 'snowbunny-character-textarea'); textarea.value = field.value;
            textarea.addEventListener('input', () => { field.value = textarea.value; }); body.append(textarea);
            const tools = el('div', 'snowbunny-writing-field-tools');
            const clear = el('button', '', 'Clear'); clear.type = 'button'; clear.addEventListener('click', () => { field.value = ''; textarea.value = ''; }); tools.append(clear);
            if (field.custom) {
                const up = el('button', '', '↑'); up.type = 'button'; up.disabled = index === 0; up.addEventListener('click', () => { [draft.document.fields[index - 1], draft.document.fields[index]] = [draft.document.fields[index], draft.document.fields[index - 1]]; rerender('writing'); });
                const down = el('button', '', '↓'); down.type = 'button'; down.disabled = index === draft.document.fields.length - 1; down.addEventListener('click', () => { [draft.document.fields[index + 1], draft.document.fields[index]] = [draft.document.fields[index], draft.document.fields[index + 1]]; rerender('writing'); });
                const remove = el('button', '', 'Remove'); remove.type = 'button'; remove.addEventListener('click', () => { draft.document.fields.splice(index, 1); rerender('writing'); });
                tools.append(up, down, remove);
            }
            body.append(tools); details.append(body); fieldHost.append(details);
        });
        const add = el('button', 'snowbunny-add-field', '+ Add field'); add.type = 'button';
        add.addEventListener('click', () => {
            draft.document.fields.push({ id: `custom_${Date.now()}_${draft.document.fields.length}`, label: 'Custom field', value: '', role: 'content', custom: true, order: draft.document.fields.length });
            rerender('writing');
        });
        host.append(add);
    } else {
        const note = el('div', 'snowbunny-character-empty', 'Structured fields are kept safely while Freeform is selected. Switching modes does not erase them.');
        note.style.marginTop = '10px'; host.append(note);
    }
    return host;
}

async function detailsTab(draft, linkedIds) {
    const host = el('div', 'snowbunny-character-form');
    const hero = el('div', 'snowbunny-character-hero');
    const portrait = el('div', 'snowbunny-character-portrait');
    const src = thumbnail(draft.avatar); if (src) { const image = new Image(); image.src = src; image.alt = ''; portrait.append(image); } else portrait.append(icon('fa-user'));
    const heroCopy = el('div', 'snowbunny-character-hero-copy'); heroCopy.append(el('strong', '', draft.name), el('small', '', 'Artwork and safe Character renaming still use SillyTavern’s native card ownership path. SnowBunny authoring below remains attached to this real card.'));
    hero.append(portrait, heroCopy); host.append(hero);

    const favorite = el('input'); favorite.type = 'checkbox'; favorite.checked = draft.metadata.favorite === true;
    favorite.addEventListener('change', () => { draft.metadata.favorite = favorite.checked; });
    const favLabel = el('label', 'snowbunny-character-check'); favLabel.append(favorite, el('span', '', 'Favorite')); host.append(favLabel);

    for (const [key, label, multiline] of [
        ['category', 'Category', false], ['aliases', 'Aliases / keywords', false], ['tags', 'Tags', false],
        ['creator', 'Creator', false], ['version', 'Card version', false], ['source', 'Source / attribution', false], ['notes', 'Creator notes', true],
    ]) {
        const input = multiline ? el('textarea', 'snowbunny-character-textarea') : el('input', 'snowbunny-character-input');
        const current = key === 'aliases' || key === 'tags' ? (draft.metadata[key] || []).join(', ') : draft.metadata[key] || '';
        input.value = current;
        input.addEventListener('input', () => { draft.metadata[key] = key === 'aliases' || key === 'tags' ? parseList(input.value) : input.value; });
        host.append(labelInput(label, input));
    }

    const books = lorebooks()?.list?.() || [];
    const linkHost = el('div', 'snowbunny-character-link-list');
    if (!books.length) linkHost.append(el('div', 'snowbunny-character-empty', 'No Lorebooks yet.'));
    for (const book of books) {
        const option = el('label', 'snowbunny-character-link-option');
        const check = el('input'); check.type = 'checkbox'; check.checked = linkedIds.has(book.id);
        check.addEventListener('change', () => { if (check.checked) linkedIds.add(book.id); else linkedIds.delete(book.id); });
        option.append(check, el('span', '', book.name)); linkHost.append(option);
    }
    host.append(labelInput('Linked Lorebooks', linkHost));
    return host;
}

async function openCharacterEditor(avatar) {
    const record = await authoring()?.read?.(avatar, { fresh: true });
    if (!record) return;
    const draft = clone(record);
    const linkedIds = new Set(await links()?.linkedBookIds?.(avatar) || []);
    let activeTab = 'details';

    const render = async requestedTab => {
        if (requestedTab) activeTab = requestedTab;
        const root = workspace();
        const save = el('button', 'primary', 'Save'); save.type = 'button';
        root.append(header(draft.name, () => void openLibrary(), [save]));
        const body = el('main', 'snowbunny-character-body'); root.append(body);
        const tabs = el('div', 'snowbunny-character-tabs');
        for (const [value, label] of [['details', 'Details'], ['writing', 'Writing'], ['preview', 'Preview']]) {
            const button = el('button', activeTab === value ? 'active' : '', label); button.type = 'button'; button.addEventListener('click', () => void render(value)); tabs.append(button);
        }
        body.append(tabs);
        if (activeTab === 'details') body.append(await detailsTab(draft, linkedIds));
        else if (activeTab === 'writing') body.append(writingTab(draft, value => void render(value)));
        else body.append(previewTab(draft));

        save.addEventListener('click', async () => {
            save.disabled = true; save.textContent = 'Saving…';
            try {
                const saved = await authoring()?.save?.(draft);
                if (!saved) throw new Error('Character save returned no result.');
                draft.entityId = saved.entityId;
                await links()?.setLinkedBooks?.(draft.avatar, [...linkedIds]);
                invalidateRecords();
                await openLibrary();
            } catch (error) {
                console.error('[SnowBunny] Could not save Character.', error);
                save.disabled = false; save.textContent = 'Try again';
            }
        });
    };
    await render();
}

function quickCharactersButton() {
    return [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-quick`)].find(button =>
        button.querySelector('span')?.textContent?.trim() === 'Characters',
    ) || null;
}

function enhanceShell() {
    const button = quickCharactersButton();
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    if (button.dataset.snowbunnyCharacters === '1') return;
    button.dataset.snowbunnyCharacters = '1';
    // Capture first so the old temporary native-manager bridge never fires.
    button.addEventListener('click', event => { event.stopImmediatePropagation(); void openLibrary(); }, true);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (source?.on && types) {
        for (const name of ['CHARACTER_EDITED', 'CHARACTER_DELETED', 'CHARACTER_RENAMED']) {
            const event = types[name]; if (event) source.on(event, invalidateRecords);
        }
    }
    document.addEventListener('snowbunny:character-authoring-changed', invalidateRecords);
    document.addEventListener('snowbunny:character-codex-links-changed', invalidateRecords);
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(FILTER_SHEET_ID)) document.getElementById(FILTER_SHEET_ID)?.remove();
    else if (document.getElementById(WORKSPACE_ID)) closeWorkspace();
}

export function initCharacterLibrary() {
    if (initialized) return;
    initialized = true;
    installStyles();
    enhanceShell();
    registerEvents();
    const drawer = document.getElementById(LEFT_DRAWER_ID);
    if (drawer) {
        shellObserver = new MutationObserver(enhanceShell);
        shellObserver.observe(drawer, { childList: true, subtree: true });
    }
    document.addEventListener('keydown', onKeyDown, true);
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        characterLibrary: {
            open: openLibrary,
            openEditor: openCharacterEditor,
            invalidate: invalidateRecords,
        },
    };
}
