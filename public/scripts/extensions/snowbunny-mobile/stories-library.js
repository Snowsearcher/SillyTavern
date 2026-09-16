const WORKSPACE_ID = 'snowbunny-stories-library';
const SHEET_ID = 'snowbunny-stories-editor-sheet';
const STYLE_ID = 'snowbunny-stories-library-style';
const LEFT_DRAWER_ID = 'snowbunny-left-drawer';

let initialized = false;
let drawerObserver = null;
let discoveryCache = null;
let discoveryTime = 0;

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
  #${WORKSPACE_ID} {
    position: fixed;
    z-index: 12100;
    inset: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%);
    color: var(--SmartThemeBodyColor);
  }
  #${WORKSPACE_ID} .snowbunny-library-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 68%, transparent);
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 94%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-library-header h2 {
    flex: 1; min-width: 0; margin: 0; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; font-size: 1.04rem;
  }
  #${WORKSPACE_ID} .snowbunny-library-header button {
    min-width: 40px; min-height: 40px; border: 0; border-radius: 13px;
    background: transparent; color: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-library-body {
    flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
    padding: 12px 14px calc(22px + env(safe-area-inset-bottom));
  }
  #${WORKSPACE_ID} .snowbunny-library-intro {
    margin: 2px 0 12px; padding: 13px 14px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent);
    border-radius: 18px;
    background: linear-gradient(145deg,
      color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, transparent),
      color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent));
  }
  #${WORKSPACE_ID} .snowbunny-library-intro strong { display: block; font-size: .92rem; }
  #${WORKSPACE_ID} .snowbunny-library-intro small { display: block; margin-top: 4px; font-size: .72rem; line-height: 1.4; opacity: .62; }
  #${WORKSPACE_ID} .snowbunny-library-toolbar { display: flex; gap: 7px; margin-bottom: 11px; }
  #${WORKSPACE_ID} .snowbunny-library-search {
    flex: 1; min-width: 0; min-height: 42px; padding: 8px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 60%, transparent);
    color: inherit; font: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-library-primary {
    min-height: 42px; padding: 7px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 34%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent);
    color: inherit; font-weight: 720;
  }
  #${WORKSPACE_ID} .snowbunny-library-view {
    display: inline-flex; gap: 2px; padding: 2px; border-radius: 12px;
    background: color-mix(in srgb, currentColor 7%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-library-view button { min-width: 34px; min-height: 34px; border-radius: 10px; opacity: .5; }
  #${WORKSPACE_ID} .snowbunny-library-view button.active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); opacity: .95;
  }
  #${WORKSPACE_ID} .snowbunny-story-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  #${WORKSPACE_ID} .snowbunny-story-grid.compact { display: block; }
  #${WORKSPACE_ID} .snowbunny-story-card {
    min-width: 0; overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-story-card > button {
    width: 100%; display: block; padding: 0; border: 0; background: transparent; color: inherit; text-align: left;
  }
  #${WORKSPACE_ID} .snowbunny-story-cover {
    position: relative; aspect-ratio: 16 / 11; overflow: hidden;
    background: radial-gradient(circle at 75% 22%, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 32%, transparent), transparent 34%),
      linear-gradient(145deg, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 18%, #16161c), #121216 74%);
  }
  #${WORKSPACE_ID} .snowbunny-story-cover > i { position: absolute; left: 14px; bottom: 12px; font-size: 1.5rem; opacity: .48; }
  #${WORKSPACE_ID} .snowbunny-story-card-copy { padding: 9px 10px 10px; }
  #${WORKSPACE_ID} .snowbunny-story-card-copy strong,
  #${WORKSPACE_ID} .snowbunny-story-card-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${WORKSPACE_ID} .snowbunny-story-card-copy strong { font-size: .85rem; }
  #${WORKSPACE_ID} .snowbunny-story-card-copy small { margin-top: 3px; font-size: .67rem; opacity: .55; }
  #${WORKSPACE_ID} .snowbunny-story-grid.compact .snowbunny-story-card { margin: 6px 0; }
  #${WORKSPACE_ID} .snowbunny-story-grid.compact .snowbunny-story-card > button { display: flex; min-height: 70px; align-items: stretch; }
  #${WORKSPACE_ID} .snowbunny-story-grid.compact .snowbunny-story-cover { width: 74px; min-width: 74px; aspect-ratio: auto; }
  #${WORKSPACE_ID} .snowbunny-story-grid.compact .snowbunny-story-card-copy { flex: 1; min-width: 0; padding: 10px 12px; }
  #${WORKSPACE_ID} .snowbunny-chat-card {
    display: flex; align-items: center; gap: 10px; min-height: 70px; margin: 7px 0; padding: 9px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
    border-radius: 17px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-chat-card.current {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 48%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, var(--SmartThemeBlurTintColor));
  }
  #${WORKSPACE_ID} .snowbunny-chat-avatar {
    width: 46px; height: 46px; flex: 0 0 46px; display: flex; align-items: center; justify-content: center;
    overflow: hidden; border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 11%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-chat-avatar img { width: 100%; height: 100%; object-fit: cover; }
  #${WORKSPACE_ID} .snowbunny-chat-copy { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .snowbunny-chat-copy strong,
  #${WORKSPACE_ID} .snowbunny-chat-copy small { display: block; overflow: hidden; text-overflow: ellipsis; }
  #${WORKSPACE_ID} .snowbunny-chat-copy strong { white-space: nowrap; font-size: .83rem; }
  #${WORKSPACE_ID} .snowbunny-chat-copy small { margin-top: 3px; white-space: nowrap; font-size: .67rem; opacity: .55; }
  #${WORKSPACE_ID} .snowbunny-chat-action {
    width: 38px; height: 38px; flex: 0 0 38px; border: 0; border-radius: 12px; background: transparent; color: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-library-empty {
    padding: 28px 16px; text-align: center;
    border: 1px dashed color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent);
    border-radius: 18px; font-size: .78rem; line-height: 1.45; opacity: .62;
  }

  #${SHEET_ID} {
    position: fixed; z-index: 12140; inset: 0; display: flex; align-items: flex-end; justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SHEET_ID} .snowbunny-story-editor {
    width: min(100%, 620px); padding: 8px 14px calc(18px + env(safe-area-inset-bottom));
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent);
    border-bottom: 0; border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%); color: var(--SmartThemeBodyColor);
  }
  #${SHEET_ID} .snowbunny-story-editor-handle { width: 38px; height: 4px; margin: 0 auto 8px; border-radius: 999px; background: currentColor; opacity: .24; }
  #${SHEET_ID} h3 { margin: 4px 2px 10px; font-size: .98rem; }
  #${SHEET_ID} .snowbunny-story-editor input[type="text"] {
    width: 100%; box-sizing: border-box; min-height: 44px; padding: 9px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
    color: inherit; font: inherit;
  }
  #${SHEET_ID} .snowbunny-story-check { display: flex; align-items: center; gap: 9px; margin: 10px 2px; font-size: .76rem; }
  #${SHEET_ID} .snowbunny-story-editor-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  #${SHEET_ID} .snowbunny-story-editor-actions button {
    min-height: 40px; padding: 7px 13px; border: 0; border-radius: 12px; background: transparent; color: inherit; font-weight: 700;
  }
  #${SHEET_ID} .snowbunny-story-editor-actions .primary { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
}
`;
    document.head.append(style);
}

function globalState() {
    return state()?.readGlobal?.() || {};
}

function storyRecords() {
    return Array.isArray(globalState().stories) ? globalState().stories : [];
}

function saveStories(stories, extra = {}) {
    state()?.patchGlobal?.({ stories, ...extra });
}

function refKey(ref) {
    return `${ref?.kind || ''}:${ref?.owner || ''}:${ref?.chatId || ''}`;
}

function sameRef(a, b) {
    return refKey(a) === refKey(b);
}

function currentRef() {
    const api = context();
    const chatId = api?.getCurrentChatId?.();
    if (!chatId) return null;
    if (api.groupId) return { kind: 'group', owner: String(api.groupId), chatId: String(chatId) };
    const characterId = Number.parseInt(String(api.characterId ?? ''), 10);
    const character = Number.isInteger(characterId) ? api.characters?.[characterId] : null;
    return character?.avatar ? { kind: 'character', owner: character.avatar, chatId: String(chatId) } : null;
}

function storyForRef(ref) {
    return storyRecords().find(story => (story.chatRefs || []).some(item => sameRef(item, ref))) || null;
}

function ownerLabel(ref) {
    const api = context();
    if (ref.kind === 'group') return api?.groups?.find(group => String(group.id) === String(ref.owner))?.name || 'Group chat';
    return api?.characters?.find(character => character.avatar === ref.owner)?.name || 'Character chat';
}

function ownerAvatar(ref) {
    if (ref.kind !== 'character') return '';
    const api = context();
    const character = api?.characters?.find(item => item.avatar === ref.owner);
    if (!character?.avatar || character.avatar === 'none') return '';
    try { return api?.getThumbnailUrl?.('avatar', character.avatar) || ''; } catch (_) { return ''; }
}

function currentStoryId() {
    return state()?.readChat?.()?.storyId || '';
}

function createStory(title) {
    const api = context();
    return {
        id: api?.uuidv4?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: String(title || '').trim() || 'Untitled Story',
        cover: '',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        chatRefs: [],
    };
}

function attachCurrent(storyId) {
    const ref = currentRef();
    if (!ref) return false;
    const stories = storyRecords();
    const target = stories.find(story => story.id === storyId);
    if (!target) return false;
    for (const story of stories) story.chatRefs = (story.chatRefs || []).filter(item => !sameRef(item, ref));
    target.chatRefs = [...(target.chatRefs || []), ref];
    target.updatedAt = Date.now();
    saveStories(stories);
    state()?.patchChat?.({ storyId });
    return true;
}

function removeFromStory(storyId, ref) {
    const stories = storyRecords();
    const story = stories.find(item => item.id === storyId);
    if (!story) return;
    story.chatRefs = (story.chatRefs || []).filter(item => !sameRef(item, ref));
    story.updatedAt = Date.now();
    saveStories(stories);
    if (sameRef(currentRef(), ref) && currentStoryId() === storyId) state()?.deleteChatKey?.('storyId');
}

function reconcileCurrentMembership() {
    const ref = currentRef();
    if (!ref) return;
    const localId = currentStoryId();
    const stories = storyRecords();
    if (localId) {
        const story = stories.find(item => item.id === localId);
        if (story && !(story.chatRefs || []).some(item => sameRef(item, ref))) {
            story.chatRefs = [...(story.chatRefs || []), ref];
            story.updatedAt = Date.now();
            saveStories(stories);
        }
        return;
    }
    const indexed = stories.find(story => (story.chatRefs || []).some(item => sameRef(item, ref)));
    if (indexed) state()?.patchChat?.({ storyId: indexed.id });
}

async function discoverCharacterChats(character) {
    const api = context();
    try {
        const response = await fetch('/api/characters/chats', {
            method: 'POST', headers: api.getRequestHeaders(), body: JSON.stringify({ avatar_url: character.avatar }),
        });
        if (!response.ok) return [];
        const payload = await response.json();
        const infos = Array.isArray(payload) ? payload : Object.values(payload || {});
        return infos.map(info => ({
            ref: { kind: 'character', owner: character.avatar, chatId: String(info.file_id || info.file_name || '').replace(/\.jsonl$/i, '') },
            title: character.name || 'Character chat',
            preview: String(info.mes || ''),
            updatedAt: Number(info.last_mes) || 0,
        })).filter(item => item.ref.chatId);
    } catch (_) {
        return [];
    }
}

async function discoverGroupChats(group) {
    const api = context();
    return Promise.all((group.chats || []).map(async chatId => {
        try {
            const response = await fetch('/api/chats/group/info', {
                method: 'POST', headers: api.getRequestHeaders(), body: JSON.stringify({ id: chatId }),
            });
            const info = response.ok ? await response.json() : {};
            return {
                ref: { kind: 'group', owner: String(group.id), chatId: String(chatId) },
                title: group.name || 'Group chat',
                preview: String(info?.mes || ''),
                updatedAt: Number(info?.last_mes) || Number(group.date_last_chat) || 0,
            };
        } catch (_) {
            return {
                ref: { kind: 'group', owner: String(group.id), chatId: String(chatId) },
                title: group.name || 'Group chat', preview: '', updatedAt: Number(group.date_last_chat) || 0,
            };
        }
    }));
}

async function discoverChats({ fresh = false } = {}) {
    if (!fresh && discoveryCache && Date.now() - discoveryTime < 15_000) return discoveryCache;
    const api = context();
    const batches = await Promise.all([
        ...(api?.characters || []).filter(character => character?.avatar && character?.name).map(discoverCharacterChats),
        ...(api?.groups || []).map(discoverGroupChats),
    ]);
    const map = new Map();
    for (const item of batches.flat()) if (item?.ref?.chatId) map.set(refKey(item.ref), item);
    discoveryCache = [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    discoveryTime = Date.now();
    return discoveryCache;
}

function knownInfo(ref) {
    if (sameRef(ref, currentRef())) {
        const api = context();
        const message = [...(api?.chat || [])].reverse().find(item => !item?.is_system);
        return { ref, title: ownerLabel(ref), preview: String(message?.mes || ''), updatedAt: Date.now() };
    }
    return discoveryCache?.find(item => sameRef(item.ref, ref)) || { ref, title: ownerLabel(ref), preview: ref.chatId, updatedAt: 0 };
}

async function openChat(ref) {
    const api = context();
    closeWorkspace();
    if (ref.kind === 'group') {
        await api?.openGroupChat?.(ref.owner, ref.chatId);
        return;
    }
    const index = api?.characters?.findIndex(character => character.avatar === ref.owner) ?? -1;
    if (index < 0) return;
    await api.selectCharacterById?.(index, { switchMenu: false });
    await api.openCharacterChat?.(ref.chatId);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
    closeSheet();
}

function makeHeader(title, onBack, actions = []) {
    const header = el('header', 'snowbunny-library-header');
    const back = el('button');
    back.type = 'button';
    back.setAttribute('aria-label', 'Back');
    back.append(icon('fa-arrow-left'));
    back.addEventListener('click', onBack);
    header.append(back, el('h2', '', title), ...actions);
    return header;
}

function workspace() {
    let node = document.getElementById(WORKSPACE_ID);
    if (!node) {
        node = el('div');
        node.id = WORKSPACE_ID;
        document.body.append(node);
    }
    node.replaceChildren();
    return node;
}

function viewSwitch(view, onChange) {
    const host = el('div', 'snowbunny-library-view');
    for (const [name, iconName] of [['visual', 'fa-table-cells-large'], ['compact', 'fa-list']]) {
        const button = el('button');
        button.type = 'button';
        if (view === name) button.classList.add('active');
        button.append(icon(iconName));
        button.addEventListener('click', () => onChange(name));
        host.append(button);
    }
    return host;
}

function storyEditor({ story = null, addCurrent = true, onSave }) {
    closeSheet();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-story-editor');
    card.append(el('div', 'snowbunny-story-editor-handle'), el('h3', '', story ? 'Edit Story' : 'Create Story'));
    const input = el('input');
    input.type = 'text';
    input.placeholder = 'Story name';
    input.maxLength = 120;
    input.value = story?.title || '';
    card.append(input);
    let checkbox = null;
    if (!story) {
        const label = el('label', 'snowbunny-story-check');
        checkbox = el('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(currentRef()) && addCurrent;
        checkbox.disabled = !currentRef();
        label.append(checkbox, el('span', '', currentRef() ? 'Add the current chat to this Story' : 'Open a chat to add it immediately'));
        card.append(label);
    }
    const actions = el('div', 'snowbunny-story-editor-actions');
    const cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', closeSheet);
    const save = el('button', 'primary', story ? 'Save' : 'Create');
    save.type = 'button';
    save.addEventListener('click', () => {
        const title = input.value.trim() || story?.title || 'Untitled Story';
        if (story) {
            const stories = storyRecords();
            const target = stories.find(item => item.id === story.id);
            if (target) { target.title = title; target.updatedAt = Date.now(); saveStories(stories); }
            closeSheet();
            onSave?.(target || story);
            return;
        }
        const created = createStory(title);
        const stories = storyRecords();
        stories.push(created);
        saveStories(stories);
        if (checkbox?.checked) attachCurrent(created.id);
        closeSheet();
        onSave?.(created);
    });
    actions.append(cancel, save);
    card.append(actions);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) closeSheet(); });
    document.body.append(overlay);
    window.setTimeout(() => input.focus({ preventScroll: true }), 50);
}

function storyCard(story) {
    const card = el('article', 'snowbunny-story-card');
    const button = el('button');
    button.type = 'button';
    const cover = el('div', 'snowbunny-story-cover');
    cover.append(icon('fa-book-open'));
    const copy = el('div', 'snowbunny-story-card-copy');
    const count = (story.chatRefs || []).length;
    copy.append(el('strong', '', story.title), el('small', '', `${count} ${count === 1 ? 'chat' : 'chats'}`));
    button.append(cover, copy);
    button.addEventListener('click', () => void openStory(story.id));
    card.append(button);
    return card;
}

function chatCard(info, { storyId = '', removable = false } = {}) {
    const current = sameRef(info.ref, currentRef());
    const card = el('div', `snowbunny-chat-card${current ? ' current' : ''}`);
    const avatar = el('div', 'snowbunny-chat-avatar');
    const src = ownerAvatar(info.ref);
    if (src) {
        const image = new Image(); image.src = src; image.alt = ''; avatar.append(image);
    } else {
        avatar.append(icon(info.ref.kind === 'group' ? 'fa-users' : 'fa-message'));
    }
    const copy = el('div', 'snowbunny-chat-copy');
    copy.append(
        el('strong', '', info.title || ownerLabel(info.ref)),
        el('small', '', String(info.preview || info.ref.chatId).replace(/\s+/g, ' ').trim()),
    );
    const open = el('button', 'snowbunny-chat-action');
    open.type = 'button';
    open.append(icon(current ? 'fa-circle-check' : 'fa-chevron-right'));
    if (!current) open.addEventListener('click', () => void openChat(info.ref));
    card.append(avatar, copy, open);
    if (removable) {
        const remove = el('button', 'snowbunny-chat-action');
        remove.type = 'button'; remove.title = 'Remove from Story'; remove.append(icon('fa-xmark'));
        remove.addEventListener('click', () => { removeFromStory(storyId, info.ref); void openStory(storyId); });
        card.append(remove);
    }
    return card;
}

async function openStory(storyId) {
    const story = storyRecords().find(item => item.id === storyId);
    if (!story) return openStories();
    await discoverChats();
    const root = workspace();
    const edit = el('button');
    edit.type = 'button'; edit.title = 'Edit Story'; edit.append(icon('fa-pencil'));
    edit.addEventListener('click', () => storyEditor({ story, onSave: () => void openStory(story.id) }));
    root.append(makeHeader(story.title, openStories, [edit]));
    const body = el('main', 'snowbunny-library-body');
    const intro = el('div', 'snowbunny-library-intro');
    intro.append(el('strong', '', story.title), el('small', '', 'A Story groups related chats. Story Lorebooks and Story Memories will attach here; Model, Preset, Persona and other writing setup remain chat-specific.'));
    body.append(intro);
    const toolbar = el('div', 'snowbunny-library-toolbar');
    const search = el('input', 'snowbunny-library-search'); search.type = 'search'; search.placeholder = 'Search this Story’s chats';
    const add = el('button', 'snowbunny-library-primary', 'Add current'); add.type = 'button';
    add.disabled = !currentRef() || (story.chatRefs || []).some(ref => sameRef(ref, currentRef()));
    add.addEventListener('click', () => { if (attachCurrent(story.id)) void openStory(story.id); });
    toolbar.append(search, add); body.append(toolbar);
    const list = el('div'); body.append(list); root.append(body);
    const refs = story.chatRefs || [];
    const render = () => {
        const query = search.value.trim().toLowerCase();
        list.replaceChildren();
        const infos = refs.map(knownInfo).filter(info => !query || `${info.title} ${info.preview} ${info.ref.chatId}`.toLowerCase().includes(query));
        if (!infos.length) list.append(el('div', 'snowbunny-library-empty', refs.length ? 'No chats match this search.' : 'This Story has no chats yet. Open a chat and use Add current.'));
        for (const info of infos) list.append(chatCard(info, { storyId: story.id, removable: true }));
    };
    search.addEventListener('input', render); render();
}

async function openStandalone() {
    const root = workspace();
    root.append(makeHeader('Stand-alone Chats', openStories));
    const body = el('main', 'snowbunny-library-body');
    const toolbar = el('div', 'snowbunny-library-toolbar');
    const search = el('input', 'snowbunny-library-search'); search.type = 'search'; search.placeholder = 'Search stand-alone chats';
    const refresh = el('button', 'snowbunny-library-primary'); refresh.type = 'button'; refresh.append(icon('fa-rotate'));
    toolbar.append(search, refresh); body.append(toolbar); root.append(body);
    const list = el('div'); body.append(list);

    const load = async fresh => {
        list.replaceChildren(el('div', 'snowbunny-library-empty', 'Loading chats…'));
        const all = await discoverChats({ fresh });
        const render = () => {
            const query = search.value.trim().toLowerCase();
            const chats = all.filter(info => !storyForRef(info.ref)).filter(info => !query || `${info.title} ${info.preview} ${info.ref.chatId}`.toLowerCase().includes(query));
            list.replaceChildren();
            if (!chats.length) list.append(el('div', 'snowbunny-library-empty', 'No stand-alone chats match this view.'));
            for (const info of chats) list.append(chatCard(info));
        };
        search.oninput = render; render();
    };
    refresh.addEventListener('click', () => void load(true));
    void load(false);
}

function openStories() {
    const root = workspace();
    const view = globalState().storyLibraryView === 'compact' ? 'compact' : 'visual';
    const toggle = viewSwitch(view, next => { state()?.patchGlobal?.({ storyLibraryView: next }); openStories(); });
    const create = el('button'); create.type = 'button'; create.title = 'Create Story'; create.append(icon('fa-plus'));
    create.addEventListener('click', () => storyEditor({ onSave: openStories }));
    root.append(makeHeader('Stories', closeWorkspace, [toggle, create]));
    const body = el('main', 'snowbunny-library-body');
    const intro = el('div', 'snowbunny-library-intro');
    intro.append(el('strong', '', 'Your Library'), el('small', '', 'Stories keep related chats together. Stand-alone chats stay separate until you add them to a Story.'));
    body.append(intro);
    const standalone = el('button', 'snowbunny-library-primary', 'Stand-alone Chats');
    standalone.type = 'button'; standalone.style.width = '100%'; standalone.style.marginBottom = '10px';
    standalone.addEventListener('click', () => void openStandalone()); body.append(standalone);
    const toolbar = el('div', 'snowbunny-library-toolbar');
    const search = el('input', 'snowbunny-library-search'); search.type = 'search'; search.placeholder = 'Search your Stories';
    toolbar.append(search); body.append(toolbar);
    const grid = el('div', `snowbunny-story-grid${view === 'compact' ? ' compact' : ''}`); body.append(grid); root.append(body);
    const render = () => {
        const query = search.value.trim().toLowerCase();
        const records = storyRecords().filter(story => !query || `${story.title} ${(story.tags || []).join(' ')}`.toLowerCase().includes(query)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        grid.replaceChildren();
        if (!records.length) grid.append(el('div', 'snowbunny-library-empty', 'No Stories yet. Create one here, then add chats as you work.'));
        for (const story of records) grid.append(storyCard(story));
    };
    search.addEventListener('input', render); render();
}

function leftRow(label) {
    return [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === label,
    ) ?? null;
}

function enable(button, key, handler) {
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    if (button.dataset.snowbunnyLibraryAction === key) return;
    button.dataset.snowbunnyLibraryAction = key;
    button.addEventListener('click', handler);
}

function enhanceShell() {
    enable(document.querySelector('#snowbunny-top-strip .snowbunny-top-action[aria-label="Stories"]'), 'stories-top', openStories);
    enable(leftRow('Stories'), 'stories', openStories);
    enable(leftRow('Stand-alone Chats'), 'standalone', () => void openStandalone());
    enable(leftRow('Create'), 'create-story', () => storyEditor({ onSave: openStories }));
}

function updateRenamedRef(data) {
    if (!data) return;
    const oldChat = String(data.oldFileName || '').replace(/\.jsonl$/i, '');
    const newChat = String(data.newFileName || '').replace(/\.jsonl$/i, '');
    if (!oldChat || !newChat) return;
    const records = storyRecords();
    let changed = false;
    for (const story of records) {
        for (const ref of story.chatRefs || []) {
            const ownerMatches = data.groupId
                ? ref.kind === 'group' && String(ref.owner) === String(data.groupId)
                : ref.kind === 'character' && ref.owner === data.avatarId;
            if (ownerMatches && ref.chatId === oldChat) { ref.chatId = newChat; story.updatedAt = Date.now(); changed = true; }
        }
    }
    if (changed) saveStories(records);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'GROUP_CHAT_CREATED', 'CHAT_DELETED']) {
        const event = types[name];
        if (!event) continue;
        source.on(event, () => {
            discoveryCache = null;
            if (name === 'CHAT_CHANGED' || name === 'CHAT_LOADED') reconcileCurrentMembership();
            window.setTimeout(enhanceShell, 0);
        });
    }
    if (types.CHAT_RENAMED) source.on(types.CHAT_RENAMED, data => { updateRenamedRef(data); discoveryCache = null; });
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(SHEET_ID)) closeSheet();
    else if (document.getElementById(WORKSPACE_ID)) closeWorkspace();
}

export function initStoriesLibrary() {
    if (initialized) return;
    initialized = true;
    installStyles();
    reconcileCurrentMembership();
    enhanceShell();
    registerEvents();
    const drawer = document.getElementById(LEFT_DRAWER_ID);
    if (drawer) {
        drawerObserver = new MutationObserver(enhanceShell);
        drawerObserver.observe(drawer, { childList: true, subtree: true });
    }
    document.addEventListener('keydown', onKeyDown, true);
}
