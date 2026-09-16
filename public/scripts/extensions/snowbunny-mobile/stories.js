const WORKSPACE_ID = 'snowbunny-stories-workspace';
const SHEET_ID = 'snowbunny-stories-sheet';
const STYLE_ID = 'snowbunny-stories-style';
const LEFT_DRAWER_ID = 'snowbunny-left-drawer';

let initialized = false;
let shellObserver = null;
let enhanceQueued = false;
let discoveredCache = null;
let discoveredAt = 0;

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
  .snowbunny-stories-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 68%, transparent);
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 94%, transparent);
  }
  .snowbunny-stories-header h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1.04rem;
  }
  .snowbunny-stories-header button {
    min-width: 40px;
    min-height: 40px;
    border: 0;
    border-radius: 13px;
    background: transparent;
    color: inherit;
  }
  .snowbunny-stories-header button:active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent);
  }
  .snowbunny-stories-view-toggle {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border-radius: 12px;
    background: color-mix(in srgb, currentColor 7%, transparent);
  }
  .snowbunny-stories-view-toggle button { min-width: 34px; min-height: 34px; border-radius: 10px; opacity: .5; }
  .snowbunny-stories-view-toggle button.active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent);
    opacity: .95;
  }
  .snowbunny-stories-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 12px 14px calc(22px + env(safe-area-inset-bottom));
  }
  .snowbunny-stories-intro {
    margin: 3px 2px 12px;
    padding: 13px 14px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
    border-radius: 18px;
    background: linear-gradient(145deg,
      color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, transparent),
      color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent));
  }
  .snowbunny-stories-intro strong { display: block; font-size: .92rem; }
  .snowbunny-stories-intro small { display: block; margin-top: 4px; font-size: .72rem; line-height: 1.4; opacity: .62; }
  .snowbunny-stories-toolbar {
    display: flex;
    gap: 7px;
    margin: 0 0 12px;
  }
  .snowbunny-stories-search {
    flex: 1;
    min-width: 0;
    min-height: 42px;
    padding: 8px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 60%, transparent);
    color: inherit;
    font: inherit;
  }
  .snowbunny-stories-primary {
    min-width: 44px;
    min-height: 42px;
    padding: 7px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 34%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent);
    color: inherit;
    font-weight: 720;
  }
  .snowbunny-story-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .snowbunny-story-grid.compact { display: block; }
  .snowbunny-story-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent);
    border-radius: 18px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent);
    color: inherit;
  }
  .snowbunny-story-card button { color: inherit; }
  .snowbunny-story-cover {
    position: relative;
    aspect-ratio: 16 / 11;
    overflow: hidden;
    background:
      radial-gradient(circle at 76% 24%, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 32%, transparent), transparent 34%),
      linear-gradient(145deg, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 18%, #16161c), #121216 74%);
  }
  .snowbunny-story-cover img { width: 100%; height: 100%; object-fit: cover; }
  .snowbunny-story-cover > i {
    position: absolute;
    left: 14px;
    bottom: 12px;
    font-size: 1.55rem;
    opacity: .48;
  }
  .snowbunny-story-card-copy { padding: 9px 10px 10px; }
  .snowbunny-story-card-copy strong,
  .snowbunny-story-card-copy small { display: block; overflow: hidden; text-overflow: ellipsis; }
  .snowbunny-story-card-copy strong { white-space: nowrap; font-size: .85rem; }
  .snowbunny-story-card-copy small { margin-top: 3px; white-space: nowrap; font-size: .67rem; opacity: .55; }
  .snowbunny-story-open {
    width: 100%;
    display: block;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
  }
  .snowbunny-story-grid.compact .snowbunny-story-card { margin: 6px 0; }
  .snowbunny-story-grid.compact .snowbunny-story-open {
    display: flex;
    align-items: center;
    min-height: 70px;
  }
  .snowbunny-story-grid.compact .snowbunny-story-cover {
    width: 74px;
    min-width: 74px;
    align-self: stretch;
    aspect-ratio: auto;
  }
  .snowbunny-story-grid.compact .snowbunny-story-card-copy { flex: 1; min-width: 0; padding: 10px 12px; }
  .snowbunny-story-grid.compact .snowbunny-story-card-copy small { white-space: normal; max-height: 2.7em; }
  .snowbunny-stories-empty {
    padding: 28px 16px;
    text-align: center;
    border: 1px dashed color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent);
    border-radius: 18px;
    font-size: .78rem;
    line-height: 1.45;
    opacity: .62;
  }
  .snowbunny-story-chat-card {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 70px;
    margin: 7px 0;
    padding: 9px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
    border-radius: 17px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
  }
  .snowbunny-story-chat-card.current {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 48%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, var(--SmartThemeBlurTintColor));
  }
  .snowbunny-story-chat-icon {
    width: 46px;
    height: 46px;
    flex: 0 0 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 11%, transparent);
  }
  .snowbunny-story-chat-icon img { width: 100%; height: 100%; object-fit: cover; }
  .snowbunny-story-chat-copy { flex: 1; min-width: 0; }
  .snowbunny-story-chat-copy strong,
  .snowbunny-story-chat-copy small { display: block; overflow: hidden; text-overflow: ellipsis; }
  .snowbunny-story-chat-copy strong { white-space: nowrap; font-size: .83rem; }
  .snowbunny-story-chat-copy small { margin-top: 3px; font-size: .67rem; line-height: 1.35; opacity: .55; white-space: nowrap; }
  .snowbunny-story-chat-open,
  .snowbunny-story-chat-remove {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
  }
  .snowbunny-story-chat-open:active,
  .snowbunny-story-chat-remove:active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent); }

  #${SHEET_ID} {
    position: fixed;
    z-index: 12140;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SHEET_ID} .snowbunny-story-sheet-card {
    width: min(100%, 620px);
    padding: 8px 14px calc(18px + env(safe-area-inset-bottom));
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor);
  }
  #${SHEET_ID} .snowbunny-story-sheet-handle {
    width: 38px; height: 4px; margin: 0 auto 8px; border-radius: 999px; background: currentColor; opacity: .24;
  }
  #${SHEET_ID} h3 { margin: 4px 2px 10px; font-size: .98rem; }
  #${SHEET_ID} .snowbunny-story-input {
    width: 100%;
    box-sizing: border-box;
    min-height: 44px;
    padding: 9px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
    color: inherit;
    font: inherit;
  }
  #${SHEET_ID} .snowbunny-story-check {
    display: flex; align-items: center; gap: 9px; margin: 10px 2px; font-size: .76rem;
  }
  #${SHEET_ID} .snowbunny-story-sheet-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  #${SHEET_ID} .snowbunny-story-sheet-actions button {
    min-height: 40px; padding: 7px 13px; border: 0; border-radius: 12px; background: transparent; color: inherit; font-weight: 700;
  }
  #${SHEET_ID} .snowbunny-story-sheet-actions .primary {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent);
  }
}
`;
    document.head.append(style);
}

function globalState() {
    return snowState()?.readGlobal?.() || {};
}

function stories() {
    const list = globalState().stories;
    return Array.isArray(list) ? list : [];
}

function saveStories(list, extra = {}) {
    return snowState()?.patchGlobal?.({ stories: list, ...extra });
}

function storyView() {
    return globalState().storyLibraryView === 'compact' ? 'compact' : 'visual';
}

function setStoryView(view) {
    snowState()?.patchGlobal?.({ storyLibraryView: view === 'compact' ? 'compact' : 'visual' });
}

function refKey(ref) {
    return `${ref?.kind || ''}:${ref?.owner || ''}:${ref?.chatId || ''}`;
}

function currentRef() {
    const api = context();
    const chatId = api?.getCurrentChatId?.();
    if (!chatId) return null;
    if (api.groupId) return { kind: 'group', owner: String(api.groupId), chatId: String(chatId) };
    const characterId = Number.parseInt(String(api.characterId ?? ''), 10);
    const character = Number.isInteger(characterId) ? api.characters?.[characterId] : null;
    if (!character?.avatar) return null;
    return { kind: 'character', owner: character.avatar, chatId: String(chatId) };
}

function sameRef(a, b) {
    return refKey(a) === refKey(b);
}

function ownerLabel(ref) {
    const api = context();
    if (ref.kind === 'group') return api?.groups?.find(group => String(group.id) === String(ref.owner))?.name || 'Group chat';
    return api?.characters?.find(character => character.avatar === ref.owner)?.name || 'Character chat';
}

function ownerAvatar(ref) {
    const api = context();
    if (ref.kind !== 'character') return '';
    const character = api?.characters?.find(item => item.avatar === ref.owner);
    if (!character?.avatar || character.avatar === 'none') return '';
    try {
        return api?.getThumbnailUrl?.('avatar', character.avatar) || '';
    } catch (_) {
        return '';
    }
}

function touchRecentCurrent() {
    const ref = currentRef();
    if (!ref) return;
    const state = globalState();
    const current = Array.isArray(state.recentChats) ? state.recentChats : [];
    const next = [ref, ...current.filter(item => !sameRef(item, ref))].slice(0, 3);
    snowState()?.patchGlobal?.({ recentChats: next });
    reconcileCurrentStoryMembership();
}

function currentStoryId() {
    return snowState()?.readChat?.()?.storyId || '';
}

function reconcileCurrentStoryMembership() {
    const ref = currentRef();
    if (!ref) return;
    const localId = currentStoryId();
    const list = stories();
    if (localId) {
        const story = list.find(item => item.id === localId);
        if (story && !(story.chatRefs || []).some(item => sameRef(item, ref))) {
            story.chatRefs = [...(story.chatRefs || []), ref];
            story.updatedAt = Date.now();
            saveStories(list);
        }
        return;
    }
    const indexed = list.find(story => (story.chatRefs || []).some(item => sameRef(item, ref)));
    if (indexed) snowState()?.patchChat?.({ storyId: indexed.id });
}

function createStoryRecord(title) {
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

function attachCurrentChat(storyId) {
    const ref = currentRef();
    if (!ref) return false;
    const list = stories();
    const target = list.find(story => story.id === storyId);
    if (!target) return false;
    for (const story of list) {
        story.chatRefs = (story.chatRefs || []).filter(item => !sameRef(item, ref));
    }
    target.chatRefs.push(ref);
    target.updatedAt = Date.now();
    saveStories(list);
    snowState()?.patchChat?.({ storyId });
    return true;
}

function removeRefFromStory(storyId, ref) {
    const list = stories();
    const story = list.find(item => item.id === storyId);
    if (!story) return;
    story.chatRefs = (story.chatRefs || []).filter(item => !sameRef(item, ref));
    story.updatedAt = Date.now();
    saveStories(list);
    if (sameRef(currentRef(), ref) && currentStoryId() === storyId) snowState()?.deleteChatKey?.('storyId');
}

function storyForRef(ref) {
    return stories().find(story => (story.chatRefs || []).some(item => sameRef(item, ref))) || null;
}

async function discoverCharacterChats(character) {
    const api = context();
    try {
        const response = await fetch('/api/characters/chats', {
            method: 'POST',
            headers: api.getRequestHeaders(),
            body: JSON.stringify({ avatar_url: character.avatar }),
        });
        if (!response.ok) return [];
        const payload = await response.json();
        const infos = Array.isArray(payload) ? payload : Object.values(payload || {});
        return infos.map(info => ({
            ref: { kind: 'character', owner: character.avatar, chatId: String(info.file_id || info.file_name || '').replace(/\.jsonl$/i, '') },
            title: character.name || 'Character chat',
            preview: String(info.mes || ''),
            updatedAt: Number(info.last_mes) || 0,
            items: Number(info.chat_items) || 0,
        })).filter(item => item.ref.chatId);
    } catch (error) {
        console.warn('[SnowBunny] Could not list character chats.', character?.name, error);
        return [];
    }
}

async function discoverGroupChats(group) {
    const api = context();
    const refs = Array.isArray(group?.chats) ? group.chats : [];
    const results = await Promise.all(refs.map(async chatId => {
        try {
            const response = await fetch('/api/chats/group/info', {
                method: 'POST',
                headers: api.getRequestHeaders(),
                body: JSON.stringify({ id: chatId }),
            });
            const info = response.ok ? await response.json() : {};
            return {
                ref: { kind: 'group', owner: String(group.id), chatId: String(chatId) },
                title: group.name || 'Group chat',
                preview: String(info?.mes || ''),
                updatedAt: Number(info?.last_mes) || Number(group.date_last_chat) || 0,
                items: Number(info?.chat_items) || 0,
            };
        } catch (_) {
            return {
                ref: { kind: 'group', owner: String(group.id), chatId: String(chatId) },
                title: group.name || 'Group chat',
                preview: '',
                updatedAt: Number(group.date_last_chat) || 0,
                items: 0,
            };
        }
    }));
    return results;
}

async function discoverAllChats({ fresh = false } = {}) {
    if (!fresh && discoveredCache && Date.now() - discoveredAt < 15_000) return discoveredCache;
    const api = context();
    const characters = (api?.characters || []).filter(character => character?.avatar && character?.name);
    const groups = api?.groups || [];
    const batches = await Promise.all([
        ...characters.map(discoverCharacterChats),
        ...groups.map(discoverGroupChats),
    ]);
    const map = new Map();
    for (const item of batches.flat()) {
        if (!item?.ref?.chatId) continue;
        map.set(refKey(item.ref), item);
    }
    discoveredCache = [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    discoveredAt = Date.now();
    return discoveredCache;
}

function knownInfo(ref) {
    const current = currentRef();
    if (current && sameRef(current, ref)) {
        const api = context();
        const last = Array.isArray(api?.chat) ? [...api.chat].reverse().find(message => !message?.is_system) : null;
        return {
            ref,
            title: ownerLabel(ref),
            preview: String(last?.mes || ''),
            updatedAt: Date.now(),
            items: Array.isArray(api?.chat) ? api.chat.length : 0,
        };
    }
    return discoveredCache?.find(item => sameRef(item.ref, ref)) || {
        ref,
        title: ownerLabel(ref),
        preview: ref.chatId,
        updatedAt: 0,
        items: 0,
    };
}

async function openChatRef(ref) {
    const api = context();
    if (!ref || !api) return;
    closeWorkspace();
    if (ref.kind === 'group') {
        await api.openGroupChat?.(ref.owner, ref.chatId);
        return;
    }
    const index = api.characters?.findIndex(character => character.avatar === ref.owner) ?? -1;
    if (index < 0) return;
    await api.selectCharacterById?.(index, { switchMenu: false });
    await api.openCharacterChat?.(ref.chatId);
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
    closeSheet();
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function viewToggle(current, onChange) {
    const host = el('div', 'snowbunny-stories-view-toggle');
    const visual = el('button');
    visual.type = 'button';
    visual.title = 'Visual view';
    visual.append(icon('fa-table-cells-large'));
    if (current === 'visual') visual.classList.add('active');
    const compact = el('button');
    compact.type = 'button';
    compact.title = 'Compact view';
    compact.append(icon('fa-list'));
    if (current === 'compact') compact.classList.add('active');
    visual.addEventListener('click', () => onChange('visual'));
    compact.addEventListener('click', () => onChange('compact'));
    host.append(visual, compact);
    return host;
}

function createHeader(title, { onBack = closeWorkspace, actions = [] } = {}) {
    const header = el('header', 'snowbunny-stories-header');
    const back = el('button');
    back.type = 'button';
    back.setAttribute('aria-label', 'Back');
    back.append(icon('fa-arrow-left'));
    back.addEventListener('click', onBack);
    header.append(back, el('h2', '', title), ...actions);
    return header;
}

function storyCard(story, view, onOpen) {
    const card = el('article', 'snowbunny-story-card');
    const open = el('button', 'snowbunny-story-open');
    open.type = 'button';
    const cover = el('div', 'snowbunny-story-cover');
    if (story.cover) {
        const image = new Image();
        image.src = story.cover;
        image.alt = '';
        cover.append(image);
    } else {
        cover.append(icon('fa-book-open'));
    }
    const copy = el('div', 'snowbunny-story-card-copy');
    const count = (story.chatRefs || []).length;
    copy.append(
        el('strong', '', story.title),
        el('small', '', `${count} ${count === 1 ? 'chat' : 'chats'} · ${story.updatedAt ? new Date(story.updatedAt).toLocaleDateString() : 'New story'}`),
    );
    open.append(cover, copy);
    open.addEventListener('click', onOpen);
    card.append(open);
    return card;
}

function createStorySheet(onCreated) {
    closeSheet();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-story-sheet-card');
    card.append(el('div', 'snowbunny-story-sheet-handle'), el('h3', '', 'Create Story'));
    const input = el('input', 'snowbunny-story-input');
    input.type = 'text';
    input.placeholder = 'Story name';
    input.maxLength = 120;
    card.append(input);
    const ref = currentRef();
    const check = el('label', 'snowbunny-story-check');
    const checkbox = el('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(ref);
    checkbox.disabled = !ref;
    check.append(checkbox, el('span', '', ref ? 'Add the current chat to this Story' : 'Open a chat to add it immediately'));
    card.append(check);
    const actions = el('div', 'snowbunny-story-sheet-actions');
    const cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', closeSheet);
    const create = el('button', 'primary', 'Create');
    create.type = 'button';
    create.addEventListener('click', () => {
        const story = createStoryRecord(input.value);
        const list = stories();
        list.push(story);
        saveStories(list);
        if (checkbox.checked && ref) attachCurrentChat(story.id);
        closeSheet();
        onCreated?.(story);
    });
    actions.append(cancel, create);
    card.append(actions);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);
    window.setTimeout(() => input.focus({ preventScroll: true }), 60);
}

function editStorySheet(story, onSaved) {
    closeSheet();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-story-sheet-card');
    card.append(el('div', 'snowbunny-story-sheet-handle'), el('h3', '', 'Edit Story'));
    const input = el('input', 'snowbunny-story-input');
    input.type = 'text';
    input.value = story.title;
    input.maxLength = 120;
    card.append(input);
    const actions = el('div', 'snowbunny-story-sheet-actions');
    const cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', closeSheet);
    const save = el('button', 'primary', 'Save');
    save.type = 'button';
    save.addEventListener('click', () => {
        const list = stories();
        const current = list.find(item => item.id === story.id);
        if (current) {
            current.title = input.value.trim() || current.title;
            current.updatedAt = Date.now();
            saveStories(list);
        }
        closeSheet();
        onSaved?.();
    });
    actions.append(cancel, save);
    card.append(actions);
    overlay.append(card);
    document.body.append(overlay);
}

function chatCard(info, { storyId = '', removable = false } = {}) {
    const current = sameRef(currentRef(), info.ref);
    const card = el('div', `snowbunny-story-chat-card${current ? ' current' : ''}`);
    const avatar = el('div', 'snowbunny-story-chat-icon');
    const src = ownerAvatar(info.ref);
    if (src) {
        const image = new Image();
        image.src = src;
        image.alt = '';
        avatar.append(image);
    } else {
        avatar.append(icon(info.ref.kind === 'group' ? 'fa-users' : 'fa-message'));
    }
    const copy = el('div', 'snowbunny-story-chat-copy');
    const preview = String(info.preview || '').replace(/\s+/g, ' ').trim();
    copy.append(
        el('strong', '', info.title || ownerLabel(info.ref)),
        el('small', '', preview || info.ref.chatId),
    );
    const open = el('button', 'snowbunny-story-chat-open');
    open.type = 'button';
    open.title = current ? 'Current chat' : 'Open chat';
    open.append(icon(current ? 'fa-circle-check' : 'fa-chevron-right'));
    if (!current) open.addEventListener('click', () => void openChatRef(info.ref));
    card.append(avatar, copy, open);
    if (removable) {
        const remove = el('button', 'snowbunny-story-chat-remove');
        remove.type = 'button';
        remove.title = 'Remove from Story';
        remove.append(icon('fa-xmark'));
        remove.addEventListener('click', event => {
            event.stopPropagation();
            removeRefFromStory(storyId, info.ref);
            openStory(storyId);
        });
        card.append(remove);
    }
    return card;
}

async function openStory(storyId) {
    const story = stories().find(item => item.id === storyId);
    if (!story) return openStoriesLibrary();
    await discoverAllChats();
    const workspace = document.getElementById(WORKSPACE_ID) || el('div');
    workspace.id = WORKSPACE_ID;
    workspace.replaceChildren();
    if (!workspace.isConnected) document.body.append(workspace);

    const edit = el('button');
    edit.type = 'button';
    edit.title = 'Edit Story details';
    edit.append(icon('fa-pencil'));
    edit.addEventListener('click', () => editStorySheet(story, () => openStory(storyId)));
    workspace.append(createHeader(story.title, { onBack: openStoriesLibrary, actions: [edit] }));
    const body = el('main', 'snowbunny-stories-body');
    const intro = el('div', 'snowbunny-stories-intro');
    intro.append(el('strong', '', story.title), el('small', '', 'Chats in this Story share Story Lorebooks and Story Memories once those systems are wired. Chat-specific setup stays with each chat.'));
    body.append(intro);

    const toolbar = el('div', 'snowbunny-stories-toolbar');
    const search = el('input', 'snowbunny-stories-search');
    search.type = 'search';
    search.placeholder = 'Search this Story’s chats';
    const add = el('button', 'snowbunny-stories-primary', 'Add current');
    add.type = 'button';
    add.disabled = !currentRef() || (story.chatRefs || []).some(ref => sameRef(ref, currentRef()));
    add.addEventListener('click', () => {
        if (attachCurrentChat(story.id)) openStory(story.id);
    });
    toolbar.append(search, add);
    body.append(toolbar);

    const list = el('div');
    body.append(list);
    const refs = story.chatRefs || [];
    const render = () => {
        const query = search.value.trim().toLowerCase();
        list.replaceChildren();
        const infos = refs.map(knownInfo).filter(info => {
            if (!query) return true;
            return `${info.title} ${info.preview} ${info.ref.chatId}`.toLowerCase().includes(query);
        });
        if (!infos.length) {
            list.append(el('div', 'snowbunny-stories-empty', refs.length ? 'No chats match this search.' : 'This Story has no chats yet. Open a chat and tap Add current.'));
            return;
        }
        for (const info of infos) list.append(chatCard(info, { storyId: story.id, removable: true }));
    };
    search.addEventListener('input', render);
    render();
    workspace.append(body);
}

async function openStandaloneLibrary() {
    const workspace = document.getElementById(WORKSPACE_ID) || el('div');
    workspace.id = WORKSPACE_ID;
    workspace.replaceChildren();
    if (!workspace.isConnected) document.body.append(workspace);
    workspace.append(createHeader('Stand-alone Chats', { onBack: openStoriesLibrary }));
    const body = el('main', 'snowbunny-stories-body');
    const toolbar = el('div', 'snowbunny-stories-toolbar');
    const search = el('input', 'snowbunny-stories-search');
    search.type = 'search';
    search.placeholder = 'Search stand-alone chats';
    const refresh = el('button', 'snowbunny-stories-primary');
    refresh.type = 'button';
    refresh.title = 'Refresh';
    refresh.append(icon('fa-rotate'));
    toolbar.append(search, refresh);
    body.append(toolbar);
    const list = el('div');
    body.append(list);
    workspace.append(body);

    const load = async (fresh = false) => {
        list.replaceChildren(el('div', 'snowbunny-stories-empty', 'Loading chats…'));
        const all = await discoverAllChats({ fresh });
        const render = () => {
            const query = search.value.trim().toLowerCase();
            const standalone = all.filter(info => !storyForRef(info.ref)).filter(info => {
                if (!query) return true;
                return `${info.title} ${info.preview} ${info.ref.chatId}`.toLowerCase().includes(query);
            });
            list.replaceChildren();
            if (!standalone.length) {
                list.append(el('div', 'snowbunny-stories-empty', 'No stand-alone chats match this view.'));
                return;
            }
            for (const info of standalone) list.append(chatCard(info));
        };
        search.oninput = render;
        render();
    };
    refresh.addEventListener('click', () => void load(true));
    void load();
}

function openStoriesLibrary() {
    closeSheet();
    const workspace = document.getElementById(WORKSPACE_ID) || el('div');
    workspace.id = WORKSPACE_ID;
    workspace.replaceChildren();
    if (!workspace.isConnected) document.body.append(workspace);

    let view = storyView();
    const create = el('button');
    create.type = 'button';
    create.title = 'Create Story';
    create.append(icon('fa-plus'));
    create.addEventListener('click', () => createStorySheet(() => openStoriesLibrary()));
    const toggleHost = viewToggle(view, next => {
        view = next;
        setStoryView(next);
        openStoriesLibrary();
    });
    workspace.append(createHeader('Stories', { actions: [toggleHost, create] }));

    const body = el('main', 'snowbunny-stories-body');
    const intro = el('div', 'snowbunny-stories-intro');
    intro.append(el('strong', '', 'Your Library'), el('small', '', 'Stories keep related chats together. Stand-alone chats stay separate until you add them to a Story.'));
    intro.addEventListener('click', () => {});
    body.append(intro);
    const standalone = el('button', 'snowbunny-stories-primary', 'Stand-alone Chats');
    standalone.type = 'button';
    standalone.style.width = '100%';
    standalone.style.marginBottom = '10px';
    standalone.addEventListener('click', () => void openStandaloneLibrary());
    body.append(standalone);

    const toolbar = el('div', 'snowbunny-stories-toolbar');
    const search = el('input', 'snowbunny-stories-search');
    search.type = 'search';
    search.placeholder = 'Search your Stories';
    toolbar.append(search);
    body.append(toolbar);
    const grid = el('div', `snowbunny-story-grid${view === 'compact' ? ' compact' : ''}`);
    body.append(grid);
    workspace.append(body);

    const render = () => {
        const query = search.value.trim().toLowerCase();
        const list = stories()
            .filter(story => !query || `${story.title} ${(story.tags || []).join(' ')}`.toLowerCase().includes(query))
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        grid.replaceChildren();
        if (!list.length) {
            grid.append(el('div', 'snowbunny-stories-empty', 'No Stories yet. Create one here, then add chats as you work.'));
            return;
        }
        for (const story of list) grid.append(storyCard(story, view, () => void openStory(story.id)));
    };
    search.addEventListener('input', render);
    render();
}

function rowByLabel(label) {
    return [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === label,
    ) ?? null;
}

function enableButton(button, key, handler) {
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    if (button.dataset.snowbunnyStoriesAction === key) return;
    button.dataset.snowbunnyStoriesAction = key;
    button.addEventListener('click', handler);
}

function recentSection() {
    const drawer = document.getElementById(LEFT_DRAWER_ID);
    return [...(drawer?.querySelectorAll('.snowbunny-shell-section') || [])].find(section =>
        section.querySelector('.snowbunny-shell-section-title > span')?.textContent?.trim() === 'Recent Chats',
    ) ?? null;
}

function renderRecents() {
    const section = recentSection();
    if (!section) return;
    const heading = section.querySelector('.snowbunny-shell-section-title');
    [...section.children].forEach(child => {
        if (child !== heading) child.remove();
    });
    const refs = Array.isArray(globalState().recentChats) ? globalState().recentChats.slice(0, 3) : [];
    if (!refs.length && currentRef()) refs.push(currentRef());
    for (const ref of refs) {
        const current = sameRef(ref, currentRef());
        const item = el('button', 'snowbunny-library-current');
        item.type = 'button';
        item.style.width = '100%';
        item.style.color = 'inherit';
        item.style.textAlign = 'left';
        item.append(icon(ref.kind === 'group' ? 'fa-users' : 'fa-message'));
        const copy = el('div');
        copy.append(
            el('strong', '', ownerLabel(ref)),
            el('small', '', current ? 'Current chat' : ref.chatId),
        );
        item.append(copy);
        if (!current) item.addEventListener('click', () => void openChatRef(ref));
        section.append(item);
    }
}

function enhanceShell() {
    enhanceQueued = false;
    const top = document.querySelector('#snowbunny-top-strip .snowbunny-top-action[aria-label="Stories"]');
    enableButton(top, 'top-stories', openStoriesLibrary);
    enableButton(rowByLabel('Stories'), 'stories', openStoriesLibrary);
    enableButton(rowByLabel('Stand-alone Chats'), 'standalone', () => void openStandaloneLibrary());
    const create = rowByLabel('Create');
    if (create instanceof HTMLButtonElement) {
        create.disabled = false;
        create.setAttribute('aria-disabled', 'false');
        if (create.dataset.snowbunnyStoriesAction !== 'create') {
            create.dataset.snowbunnyStoriesAction = 'create';
            create.addEventListener('click', () => createStorySheet(() => openStoriesLibrary()));
        }
    }
    renderRecents();
}

function queueEnhance() {
    if (enhanceQueued) return;
    enhanceQueued = true;
    requestAnimationFrame(enhanceShell);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'CHAT_RENAMED', 'CHAT_DELETED', 'GROUP_CHAT_CREATED']) {
        const event = types[name];
        if (!event) continue;
        source.on(event, () => {
            discoveredCache = null;
            if (name === 'CHAT_CHANGED' || name === 'CHAT_LOADED') touchRecentCurrent();
            queueEnhance();
        });
    }
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(SHEET_ID)) closeSheet();
    else if (document.getElementById(WORKSPACE_ID)) closeWorkspace();
}

export function initStories() {
    if (initialized) return;
    initialized = true;
    installStyles();
    touchRecentCurrent();
    enhanceShell();
    registerEvents();
    shellObserver = new MutationObserver(queueEnhance);
    shellObserver.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', onKeyDown, true);
}
