import {
    editGroup,
    getGroups,
    group_activation_strategy,
    group_generation_mode,
    groups,
    openGroupById,
    selected_group,
} from '../../group-chats.js';

const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SHEET_ID = 'snowbunny-members-sheet';
const STYLE_ID = 'snowbunny-members-style';

let initialized = false;
let observer = null;
let renderQueued = false;
let applying = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
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
  .snowbunny-member-row .snowbunny-member-controls {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .snowbunny-member-control {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 11px;
    background: transparent;
    color: inherit;
    opacity: .68;
  }
  .snowbunny-member-control.active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent);
    opacity: .92;
  }
  .snowbunny-member-control:disabled { opacity: .25; }

  #${SHEET_ID} {
    position: fixed;
    z-index: 12120;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SHEET_ID} .snowbunny-members-card {
    width: min(100%, 620px);
    max-height: 86dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 74%, transparent);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor);
    box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  #${SHEET_ID} .snowbunny-members-handle {
    width: 38px;
    height: 4px;
    margin: 8px auto 2px;
    border-radius: 999px;
    background: currentColor;
    opacity: .24;
  }
  #${SHEET_ID} .snowbunny-members-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px 9px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
  }
  #${SHEET_ID} .snowbunny-members-header h3 {
    flex: 1;
    margin: 0;
    font-size: .98rem;
  }
  #${SHEET_ID} .snowbunny-members-header button {
    min-width: 44px;
    min-height: 38px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font-weight: 700;
  }
  #${SHEET_ID} .snowbunny-members-apply {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 16%, transparent) !important;
  }
  #${SHEET_ID} .snowbunny-members-search {
    min-height: 42px;
    margin: 10px 12px 5px;
    padding: 8px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 65%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 64%, transparent);
    color: inherit;
    font: inherit;
  }
  #${SHEET_ID} .snowbunny-members-note {
    padding: 2px 14px 7px;
    font-size: .69rem;
    line-height: 1.35;
    opacity: .56;
  }
  #${SHEET_ID} .snowbunny-members-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 5px 10px calc(14px + env(safe-area-inset-bottom));
  }
  #${SHEET_ID} .snowbunny-member-option {
    width: 100%;
    min-height: 58px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 3px 0;
    padding: 7px 10px;
    border: 1px solid transparent;
    border-radius: 16px;
    background: transparent;
    color: inherit;
    text-align: left;
  }
  #${SHEET_ID} .snowbunny-member-option.selected {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 45%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent);
  }
  #${SHEET_ID} .snowbunny-member-option.favorite .snowbunny-member-fav { opacity: .9; }
  #${SHEET_ID} .snowbunny-member-option-avatar {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    overflow: hidden;
    border-radius: 50%;
    background: color-mix(in srgb, currentColor 9%, transparent);
  }
  #${SHEET_ID} .snowbunny-member-option-avatar img { width: 100%; height: 100%; object-fit: cover; }
  #${SHEET_ID} .snowbunny-member-option-copy { flex: 1; min-width: 0; }
  #${SHEET_ID} .snowbunny-member-option-copy strong,
  #${SHEET_ID} .snowbunny-member-option-copy small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #${SHEET_ID} .snowbunny-member-option-copy strong { font-size: .86rem; }
  #${SHEET_ID} .snowbunny-member-option-copy small { margin-top: 2px; font-size: .68rem; opacity: .55; }
  #${SHEET_ID} .snowbunny-member-fav { width: 20px; text-align: center; opacity: 0; }
  #${SHEET_ID} .snowbunny-member-check { width: 24px; text-align: center; opacity: .48; }
  #${SHEET_ID} .snowbunny-member-option.selected .snowbunny-member-check { opacity: .95; }
}
`;
    document.head.append(style);
}

function currentGroup() {
    const api = context();
    const id = api?.groupId || selected_group;
    return id ? groups.find(group => group.id === id) ?? null : null;
}

function legacyCharacter() {
    const api = context();
    if (api?.groupId) return null;
    const id = Number.parseInt(String(api?.characterId ?? ''), 10);
    return Number.isInteger(id) ? api?.characters?.[id] ?? null : null;
}

function membersState() {
    const group = currentGroup();
    if (group) {
        return {
            kind: 'group',
            group,
            avatars: Array.isArray(group.members) ? [...group.members] : [],
            disabled: new Set(Array.isArray(group.disabled_members) ? group.disabled_members : []),
        };
    }
    const character = legacyCharacter();
    return {
        kind: character ? 'legacy' : 'empty',
        group: null,
        avatars: character?.avatar ? [character.avatar] : [],
        disabled: new Set(),
    };
}

function characterForAvatar(avatar) {
    return context()?.characters?.find(character => character?.avatar === avatar) ?? null;
}

function avatarUrl(character) {
    const api = context();
    if (!character?.avatar || character.avatar === 'none') return '';
    try {
        return api?.getThumbnailUrl?.('avatar', character.avatar) || '';
    } catch (_) {
        return '';
    }
}

function membersSection() {
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (!drawer) return null;
    return [...drawer.querySelectorAll('.snowbunny-shell-section')].find(section =>
        section.querySelector('.snowbunny-shell-section-title > span')?.textContent?.trim().startsWith('Members'),
    ) ?? null;
}

function makeMemberRow(character, { muted = false, canRemove = false, group = null } = {}) {
    const row = el('div', 'snowbunny-member-row');
    row.dataset.snowbunnyMemberAvatar = character.avatar;
    const avatar = el('div', 'snowbunny-member-avatar');
    const src = avatarUrl(character);
    if (src) {
        const image = new Image();
        image.src = src;
        image.alt = '';
        avatar.append(image);
    } else {
        avatar.append(icon('fa-user'));
    }
    row.append(avatar, el('div', 'snowbunny-member-name', character.name || 'Unnamed Character'));

    const controls = el('div', 'snowbunny-member-controls');
    if (group) {
        const speaking = el('button', `snowbunny-member-control${muted ? '' : ' active'}`);
        speaking.type = 'button';
        speaking.title = muted ? 'Muted for automatic replies. Tap to enable.' : 'Active for automatic replies. Tap to mute.';
        speaking.setAttribute('aria-label', speaking.title);
        speaking.append(icon(muted ? 'fa-comment-slash' : 'fa-comment'));
        speaking.addEventListener('click', () => void toggleMember(group, character.avatar));
        controls.append(speaking);

        const remove = el('button', 'snowbunny-member-control');
        remove.type = 'button';
        remove.disabled = !canRemove;
        remove.title = canRemove ? 'Remove from this chat' : 'A chat needs at least one Character member';
        remove.setAttribute('aria-label', remove.title);
        remove.append(icon('fa-xmark'));
        remove.addEventListener('click', () => void removeMember(group, character.avatar));
        controls.append(remove);
    }
    row.append(controls);
    return row;
}

function renderMembers() {
    renderQueued = false;
    if (applying) return;
    const section = membersSection();
    if (!section) return;

    const state = membersState();
    const characters = state.avatars.map(characterForAvatar).filter(Boolean);
    const signature = JSON.stringify({
        kind: state.kind,
        group: state.group?.id || '',
        members: characters.map(character => character.avatar),
        disabled: [...state.disabled].sort(),
    });
    if (section.dataset.snowbunnyMembersSignature === signature && section.querySelector('[data-snowbunny-member-avatar]')) return;

    section.dataset.snowbunnyMembersSignature = signature;
    const heading = section.querySelector('.snowbunny-shell-section-title');
    const title = heading?.querySelector(':scope > span');
    if (title) title.textContent = `Members (${characters.length})`;
    const add = heading?.querySelector('.snowbunny-members-add');
    if (add instanceof HTMLButtonElement) {
        add.disabled = false;
        add.title = 'Add or remove Characters in this chat';
        add.onclick = openMemberSelector;
    }

    [...section.children].forEach(child => {
        if (child !== heading) child.remove();
    });

    if (!characters.length) {
        const empty = el('div', 'snowbunny-member-row');
        empty.append(icon('fa-user-plus'), el('div', 'snowbunny-member-name', 'Add a Character to this chat'));
        section.append(empty);
        return;
    }

    for (const character of characters) {
        section.append(makeMemberRow(character, {
            muted: state.disabled.has(character.avatar),
            canRemove: state.kind === 'group' && characters.length > 1,
            group: state.group,
        }));
    }
}

function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(renderMembers);
}

async function persistGroup(group) {
    applying = true;
    try {
        await editGroup(group.id, true, false);
        const api = context();
        await api?.eventSource?.emit?.(api?.eventTypes?.GROUP_UPDATED, group.id);
        document.dispatchEvent(new CustomEvent('snowbunny:members-changed', { detail: { groupId: group.id } }));
    } finally {
        applying = false;
        queueRender();
    }
}

async function toggleMember(group, avatar) {
    if (!group || !Array.isArray(group.members)) return;
    if (!Array.isArray(group.disabled_members)) group.disabled_members = [];
    const disabled = new Set(group.disabled_members);
    if (disabled.has(avatar)) {
        disabled.delete(avatar);
    } else {
        const activeCount = group.members.filter(member => !disabled.has(member)).length;
        if (activeCount <= 1) return;
        disabled.add(avatar);
    }
    group.disabled_members = [...disabled];
    await persistGroup(group);
}

async function removeMember(group, avatar) {
    if (!group || !Array.isArray(group.members) || group.members.length <= 1) return;
    group.members = group.members.filter(member => member !== avatar);
    group.disabled_members = (group.disabled_members || []).filter(member => member !== avatar && group.members.includes(member));
    await persistGroup(group);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function uniqueChatId(api) {
    const suffix = typeof api?.uuidv4 === 'function'
        ? api.uuidv4().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return `snowbunny-${Date.now()}-${suffix}`;
}

async function promoteLegacyChat(selectedAvatars) {
    const api = context();
    if (!api?.getCurrentChatId?.() || !selectedAvatars.length) return false;

    await api.saveChat?.();
    const originalChatId = api.getCurrentChatId();
    const sourceCharacter = legacyCharacter();
    const chatSnapshot = structuredClone(Array.isArray(api.chat) ? api.chat : []);
    const metadata = structuredClone(api.chatMetadata || {});
    metadata.integrity ||= api.uuidv4?.() || `${Date.now()}-${Math.random()}`;
    metadata.snowbunny = {
        ...(metadata.snowbunny || {}),
        promotedFrom: {
            kind: 'character-chat',
            chatId: originalChatId,
            characterAvatar: sourceCharacter?.avatar || '',
            at: Date.now(),
        },
    };

    const chatId = uniqueChatId(api);
    const names = selectedAvatars
        .map(characterForAvatar)
        .filter(Boolean)
        .map(character => character.name)
        .filter(Boolean);
    const groupModel = {
        name: names.length ? names.join(', ') : 'SnowBunny Chat',
        members: selectedAvatars,
        avatar_url: '',
        allow_self_responses: true,
        hideMutedSprites: false,
        activation_strategy: group_activation_strategy.NATURAL,
        generation_mode: group_generation_mode.APPEND,
        generation_mode_join_prefix: '\n{{char}} — <FIELDNAME>:\n',
        generation_mode_join_suffix: '\n',
        disabled_members: [],
        fav: false,
        chat_id: chatId,
        chats: [chatId],
        auto_mode_delay: 5,
    };

    const createResponse = await fetch('/api/groups/create', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify(groupModel),
    });
    if (!createResponse.ok) throw new Error(`Could not create multi-member chat (${createResponse.status}).`);
    const created = await createResponse.json();
    if (!created?.id) throw new Error('Group creation did not return an id.');

    const header = {
        chat_metadata: metadata,
        user_name: api.name1 || 'User',
        character_name: 'unused',
    };
    const saveResponse = await fetch('/api/chats/group/save', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify({ id: chatId, chat: [header, ...chatSnapshot], force: true }),
    });
    if (!saveResponse.ok) throw new Error(`Could not copy the current chat into its multi-member form (${saveResponse.status}).`);

    await getGroups();
    const opened = await openGroupById(String(created.id));
    if (!opened) throw new Error('The new multi-member chat was created but could not be opened.');
    return true;
}

async function applySelection(selectedAvatars) {
    if (!selectedAvatars.length) return;
    const state = membersState();
    if (state.kind === 'group' && state.group) {
        const next = selectedAvatars.filter((avatar, index, list) => list.indexOf(avatar) === index);
        state.group.members = next;
        state.group.disabled_members = (state.group.disabled_members || []).filter(member => next.includes(member));
        await persistGroup(state.group);
        return;
    }

    const current = state.avatars;
    const unchanged = current.length === selectedAvatars.length && current.every(avatar => selectedAvatars.includes(avatar));
    if (!unchanged) await promoteLegacyChat(selectedAvatars);
}

function openMemberSelector() {
    closeSheet();
    const api = context();
    if (!api?.getCurrentChatId?.()) return;

    const state = membersState();
    const selected = new Set(state.avatars);
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-members-card');
    card.append(el('div', 'snowbunny-members-handle'));

    const header = el('header', 'snowbunny-members-header');
    const cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', closeSheet);
    const title = el('h3', '', 'Select Characters');
    const apply = el('button', 'snowbunny-members-apply', 'Apply');
    apply.type = 'button';
    header.append(cancel, title, apply);
    card.append(header);

    const search = el('input', 'snowbunny-members-search');
    search.type = 'search';
    search.placeholder = 'Search Characters';
    search.autocomplete = 'off';
    card.append(search);

    if (state.kind === 'legacy') {
        card.append(el('div', 'snowbunny-members-note', 'Adding another Character keeps this chat history and opens a SnowBunny multi-member copy. The original single-Character chat is left untouched.'));
    }

    const list = el('div', 'snowbunny-members-list');
    card.append(list);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);

    const all = (api.characters || [])
        .filter(character => character?.avatar && character?.name)
        .sort((a, b) => {
            const af = a.fav === true || a.fav === 'true' ? 1 : 0;
            const bf = b.fav === true || b.fav === 'true' ? 1 : 0;
            return bf - af || String(a.name).localeCompare(String(b.name));
        });

    const render = () => {
        const query = search.value.trim().toLowerCase();
        const visible = all.filter(character => {
            if (!query) return true;
            const haystack = `${character.name} ${character.description || ''}`.toLowerCase();
            return haystack.includes(query);
        });
        list.replaceChildren();
        for (const character of visible) {
            const button = el('button', 'snowbunny-member-option');
            button.type = 'button';
            const favorite = character.fav === true || character.fav === 'true';
            if (favorite) button.classList.add('favorite');
            if (selected.has(character.avatar)) button.classList.add('selected');

            const avatar = el('div', 'snowbunny-member-option-avatar');
            const src = avatarUrl(character);
            if (src) {
                const image = new Image();
                image.src = src;
                image.alt = '';
                avatar.append(image);
            } else {
                avatar.append(icon('fa-user'));
            }
            const copy = el('div', 'snowbunny-member-option-copy');
            copy.append(el('strong', '', character.name));
            const subtitle = character.data?.extensions?.world || character.description || '';
            if (subtitle) copy.append(el('small', '', String(subtitle).replace(/\s+/g, ' ').slice(0, 90)));
            const fav = icon('fa-star');
            fav.classList.add('snowbunny-member-fav');
            const check = icon(selected.has(character.avatar) ? 'fa-circle-check' : 'fa-circle');
            check.classList.add('snowbunny-member-check');
            button.append(avatar, copy, fav, check);
            button.addEventListener('click', () => {
                if (selected.has(character.avatar)) {
                    if (selected.size > 1) selected.delete(character.avatar);
                } else {
                    selected.add(character.avatar);
                }
                render();
            });
            list.append(button);
        }
    };

    search.addEventListener('input', render);
    apply.addEventListener('click', async () => {
        apply.disabled = true;
        try {
            await applySelection([...selected]);
            closeSheet();
        } catch (error) {
            console.error('[SnowBunny] Could not update Members.', error);
            apply.disabled = false;
            apply.textContent = 'Try again';
        }
    });
    render();
    window.setTimeout(() => search.focus({ preventScroll: true }), 50);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'GROUP_UPDATED', 'GROUP_CHAT_CREATED']) {
        const event = types[name];
        if (event) source.on(event, queueRender);
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(SHEET_ID)) {
        event.preventDefault();
        closeSheet();
    }
}

export function initMemberSelector() {
    if (initialized) return;
    initialized = true;
    installStyles();
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueRender);
        observer.observe(drawer, { subtree: true, childList: true });
    }
    registerEvents();
    document.addEventListener('snowbunny:shell-open', queueRender);
    document.addEventListener('keydown', onKeyDown, true);
    queueRender();
}
