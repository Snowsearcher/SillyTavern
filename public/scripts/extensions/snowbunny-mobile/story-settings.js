const WORKSPACE_ID = 'snowbunny-stories-library';
const SETTINGS_ID = 'snowbunny-story-settings';
const MEMORY_EDITOR_ID = 'snowbunny-story-memory-editor';
const STYLE_ID = 'snowbunny-story-settings-style';

let initialized = false;
let observer = null;
let activeStoryId = '';
let enhancing = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function state() {
    return globalThis.SnowBunny?.state ?? null;
}

function store() {
    return globalThis.SnowBunny?.memories ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function ownership() {
    return globalThis.SnowBunny?.storyOwnership ?? null;
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

function stories() {
    const value = state()?.readGlobal?.()?.stories;
    return Array.isArray(value) ? value : [];
}

function storyById(storyId) {
    return stories().find(story => String(story?.id) === String(storyId)) ?? null;
}

function currentStoryId() {
    return String(state()?.readChat?.()?.storyId || '');
}

function currentRef() {
    return store()?.currentRef?.() ?? null;
}

function refKey(ref) {
    return store()?.refKey?.(ref) || `${ref?.kind || ''}:${ref?.owner || ''}:${ref?.chatId || ''}`;
}

function sameRef(a, b) {
    return Boolean(a && b && refKey(a) === refKey(b));
}

function ownerName(ref) {
    const api = context();
    if (ref?.kind === 'group') return api?.groups?.find(group => String(group.id) === String(ref.owner))?.name || 'Group chat';
    return api?.characters?.find(character => character.avatar === ref?.owner)?.name || 'Character chat';
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${SETTINGS_ID}, #${MEMORY_EDITOR_ID} {
    position: fixed; z-index: 12320; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor);
  }
  .snowbunny-story-settings-header {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 65%, transparent);
  }
  .snowbunny-story-settings-header h2 { flex: 1; min-width: 0; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 1.02rem; }
  .snowbunny-story-settings-header button {
    width: 42px; height: 42px; border: 0; border-radius: 13px; background: transparent; color: inherit;
  }
  .snowbunny-story-settings-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px calc(22px + env(safe-area-inset-bottom)); }
  .snowbunny-story-settings-summary {
    margin-bottom: 12px; padding: 12px 13px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent);
    border-radius: 18px; background: linear-gradient(145deg, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, transparent), color-mix(in srgb, var(--SmartThemeBlurTintColor) 56%, transparent));
  }
  .snowbunny-story-settings-summary strong { display: block; font-size: .92rem; }
  .snowbunny-story-settings-summary small { display: block; margin-top: 4px; font-size: .7rem; line-height: 1.42; opacity: .62; }
  .snowbunny-story-settings-section {
    margin: 11px 0; padding: 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent);
  }
  .snowbunny-story-settings-title { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
  .snowbunny-story-settings-title i { width: 22px; text-align: center; opacity: .75; }
  .snowbunny-story-settings-title strong { flex: 1; font-size: .86rem; }
  .snowbunny-story-settings-title small { font-size: .65rem; opacity: .55; }
  .snowbunny-story-settings-list { display: grid; gap: 5px; }
  .snowbunny-story-settings-row {
    width: 100%; min-height: 52px; display: flex; align-items: center; gap: 9px; padding: 8px 9px;
    border: 1px solid transparent; border-radius: 14px; background: transparent; color: inherit; text-align: left;
  }
  .snowbunny-story-settings-row.selected { border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 40%, transparent); background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 11%, transparent); }
  .snowbunny-story-settings-copy { flex: 1; min-width: 0; }
  .snowbunny-story-settings-copy strong, .snowbunny-story-settings-copy small { display: block; overflow: hidden; text-overflow: ellipsis; }
  .snowbunny-story-settings-copy strong { white-space: nowrap; font-size: .8rem; }
  .snowbunny-story-settings-copy small { margin-top: 3px; font-size: .66rem; line-height: 1.35; opacity: .56; }
  .snowbunny-story-settings-row .action {
    width: 36px; height: 36px; flex: 0 0 36px; border: 0; border-radius: 11px; background: color-mix(in srgb, currentColor 7%, transparent); color: inherit;
  }
  .snowbunny-story-settings-actions { display: flex; gap: 7px; margin-top: 9px; }
  .snowbunny-story-settings-action {
    min-height: 40px; flex: 1; padding: 7px 10px; border: 0; border-radius: 13px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent); color: inherit; font-weight: 720;
  }
  .snowbunny-story-settings-action.secondary { background: color-mix(in srgb, currentColor 7%, transparent); }
  .snowbunny-story-settings-note { margin-top: 7px; font-size: .68rem; line-height: 1.4; opacity: .58; }
  .snowbunny-story-settings-search, .snowbunny-story-memory-input, .snowbunny-story-memory-textarea {
    box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent); border-radius: 13px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 55%, transparent); color: inherit; font: inherit;
  }
  .snowbunny-story-settings-search { margin-bottom: 7px; }
  .snowbunny-story-memory-textarea { min-height: 150px; resize: vertical; line-height: 1.45; }
  .snowbunny-story-settings-empty { padding: 18px 10px; text-align: center; font-size: .72rem; opacity: .55; }
  .snowbunny-story-settings-gear { opacity: .78; }

  #${MEMORY_EDITOR_ID} .snowbunny-story-memory-body { flex: 1; overflow-y: auto; padding: 12px 14px calc(20px + env(safe-area-inset-bottom)); }
  #${MEMORY_EDITOR_ID} label { display: grid; gap: 5px; margin: 9px 0; font-size: .72rem; font-weight: 700; }
  #${MEMORY_EDITOR_ID} .snowbunny-story-settings-actions { position: sticky; bottom: 0; padding-top: 10px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 94%, transparent); }
}
`;
    document.head.append(style);
}

function closeSettings() {
    document.getElementById(SETTINGS_ID)?.remove();
}

function closeMemoryEditor() {
    document.getElementById(MEMORY_EDITOR_ID)?.remove();
}

function header(title, onClose) {
    const node = el('header', 'snowbunny-story-settings-header');
    const back = el('button'); back.type = 'button'; back.append(icon('fa-arrow-left')); back.addEventListener('click', onClose);
    node.append(back, el('h2', '', title));
    return node;
}

async function openRef(ref) {
    const api = context();
    closeSettings();
    document.getElementById(WORKSPACE_ID)?.remove();
    if (ref.kind === 'group') {
        await api?.openGroupChat?.(ref.owner, ref.chatId);
        return;
    }
    const index = api?.characters?.findIndex(character => character.avatar === ref.owner) ?? -1;
    if (index < 0) return;
    await api.selectCharacterById?.(index, { switchMenu: false });
    await api.openCharacterChat?.(ref.chatId);
}

async function editStoryMemory(storyId, memory = null) {
    closeMemoryEditor();
    const root = el('div'); root.id = MEMORY_EDITOR_ID;
    root.append(header(memory ? 'Edit Story Memory' : 'Add Story Memory', closeMemoryEditor));
    const body = el('main', 'snowbunny-story-memory-body');
    const titleLabel = el('label'); titleLabel.append(el('span', '', 'Title'));
    const title = el('input', 'snowbunny-story-memory-input'); title.type = 'text'; title.value = memory?.title || ''; title.maxLength = 1000; titleLabel.append(title);
    const detailsLabel = el('label'); detailsLabel.append(el('span', '', 'What happened'));
    const details = el('textarea', 'snowbunny-story-memory-textarea'); details.value = memory?.details || ''; details.maxLength = 12000; detailsLabel.append(details);
    const actions = el('div', 'snowbunny-story-settings-actions');
    const save = el('button', 'snowbunny-story-settings-action', 'Save'); save.type = 'button';
    actions.append(save); body.append(titleLabel, detailsLabel, actions); root.append(body); document.body.append(root);
    save.addEventListener('click', async () => {
        if (!title.value.trim() || !details.value.trim()) return;
        save.disabled = true;
        try {
            const memoryState = await store().readStory(storyId, { fresh: true });
            if (memory) {
                const target = memoryState.memories.find(item => item.id === memory.id);
                if (!target) throw new Error('That Story Memory no longer exists.');
                const before = structuredClone(target);
                target.title = title.value.trim();
                target.details = details.value.trim();
                target.updatedAt = Date.now();
                memoryState.revisions.push({ at: Date.now(), type: 'story-settings-edit', before: [before], after: structuredClone(target) });
            } else {
                const order = Math.max(0, ...memoryState.memories.map(item => Number(item.order) || 0)) + 1;
                memoryState.memories.push(store().normalizeMemory({ id: store().newId('memory'), title: title.value, details: details.value, order }));
                memoryState.revisions.push({ at: Date.now(), type: 'story-settings-create' });
            }
            memoryState.version += 1;
            await store().writeStory(storyId, memoryState);
            closeMemoryEditor();
            await openStorySettings(storyId);
        } catch (error) {
            console.warn('[SnowBunny] Could not save Story Memory.', error);
            save.disabled = false; save.textContent = 'Try again';
        }
    });
    window.setTimeout(() => title.focus({ preventScroll: true }), 50);
}

async function renderLorebooks(section, story) {
    const records = lorebooks()?.list?.() ?? [];
    const selected = new Set(Array.isArray(story.lorebookIds) ? story.lorebookIds : []);
    const title = el('div', 'snowbunny-story-settings-title');
    title.append(icon('fa-book-atlas'), el('strong', '', 'Story Lorebooks'), el('small', '', `${selected.size} shared`));
    const list = el('div', 'snowbunny-story-settings-list');
    if (!records.length) list.append(el('div', 'snowbunny-story-settings-empty', 'No Lorebooks exist yet. Create one from Codex first.'));
    for (const record of records) {
        const row = el('button', `snowbunny-story-settings-row${selected.has(record.id) ? ' selected' : ''}`);
        row.type = 'button';
        const marker = icon(selected.has(record.id) ? 'fa-circle-check' : 'fa-circle');
        const copy = el('div', 'snowbunny-story-settings-copy');
        copy.append(el('strong', '', record.name), el('small', '', `${record.entryCount || 0} entries${record.description ? ` · ${String(record.description).replace(/\s+/g, ' ').slice(0, 74)}` : ''}`));
        row.append(marker, copy);
        row.addEventListener('click', () => {
            if (selected.has(record.id)) selected.delete(record.id); else selected.add(record.id);
            row.classList.toggle('selected', selected.has(record.id));
            marker.className = `fa-solid ${selected.has(record.id) ? 'fa-circle-check' : 'fa-circle'}`;
        });
        list.append(row);
    }
    const actions = el('div', 'snowbunny-story-settings-actions');
    const apply = el('button', 'snowbunny-story-settings-action', 'Apply Lorebooks'); apply.type = 'button';
    apply.addEventListener('click', () => {
        lorebooks()?.setStoryIds?.(story.id, [...selected]);
        apply.textContent = 'Applied';
        document.dispatchEvent(new CustomEvent('snowbunny:story-lorebooks-updated', { detail: { storyId: story.id } }));
    });
    actions.append(apply); section.append(title, list, actions, el('div', 'snowbunny-story-settings-note', 'These Lorebooks are mandatory context for every chat in this Story. Chat-specific extra Lorebooks remain separate.'));
}

async function renderMemories(section, story) {
    const memoryState = await store().readStory(story.id, { fresh: true });
    const title = el('div', 'snowbunny-story-settings-title');
    title.append(icon('fa-brain'), el('strong', '', 'Story Memories'), el('small', '', `${memoryState.memories.length} saved · ${memoryState.proposals.length} pending`));
    const search = el('input', 'snowbunny-story-settings-search'); search.type = 'search'; search.placeholder = 'Search Story Memories';
    const list = el('div', 'snowbunny-story-settings-list');
    const render = () => {
        const query = search.value.trim().toLowerCase();
        list.replaceChildren();
        const items = memoryState.memories.filter(memory => !query || `${memory.title} ${memory.details}`.toLowerCase().includes(query));
        if (!items.length) list.append(el('div', 'snowbunny-story-settings-empty', memoryState.memories.length ? 'No Memories match this search.' : 'No accepted Story Memories yet.'));
        for (const memory of items) {
            const row = el('div', 'snowbunny-story-settings-row');
            const copy = el('div', 'snowbunny-story-settings-copy'); copy.append(el('strong', '', memory.title), el('small', '', memory.details.replace(/\s+/g, ' ').slice(0, 130)));
            const edit = el('button', 'action'); edit.type = 'button'; edit.title = 'Edit'; edit.append(icon('fa-pencil')); edit.addEventListener('click', () => void editStoryMemory(story.id, memory));
            const remove = el('button', 'action'); remove.type = 'button'; remove.title = 'Delete'; remove.append(icon('fa-trash'));
            remove.addEventListener('click', async () => {
                if (!window.confirm(`Delete Story Memory “${memory.title}”?`)) return;
                const latest = await store().readStory(story.id, { fresh: true });
                const target = latest.memories.find(item => item.id === memory.id);
                if (!target) return;
                latest.memories = latest.memories.filter(item => item.id !== memory.id);
                latest.revisions.push({ at: Date.now(), type: 'story-settings-delete', before: [structuredClone(target)] });
                latest.version += 1;
                await store().writeStory(story.id, latest);
                await openStorySettings(story.id);
            });
            row.append(copy, edit, remove); list.append(row);
        }
    };
    search.addEventListener('input', render); render();
    const actions = el('div', 'snowbunny-story-settings-actions');
    const add = el('button', 'snowbunny-story-settings-action', 'Add Memory'); add.type = 'button'; add.addEventListener('click', () => void editStoryMemory(story.id));
    actions.append(add);
    section.append(title, search, list, actions);
    if (memoryState.proposals.length) section.append(el('div', 'snowbunny-story-settings-note', `${memoryState.proposals.length} Memory ${memoryState.proposals.length === 1 ? 'suggestion is' : 'suggestions are'} waiting for review. Open the source Story chat to review them safely in the normal Memory proposal card.`));
}

async function renderChats(section, story) {
    const ref = currentRef();
    const title = el('div', 'snowbunny-story-settings-title');
    title.append(icon('fa-comments'), el('strong', '', 'Story Chats'), el('small', '', `${(story.chatRefs || []).length}`));
    const list = el('div', 'snowbunny-story-settings-list');
    if (!(story.chatRefs || []).length) list.append(el('div', 'snowbunny-story-settings-empty', 'No chats belong to this Story yet.'));
    for (const chatRef of story.chatRefs || []) {
        const current = sameRef(chatRef, ref);
        const row = el('div', `snowbunny-story-settings-row${current ? ' selected' : ''}`);
        const copy = el('div', 'snowbunny-story-settings-copy');
        copy.append(el('strong', '', ownerName(chatRef)), el('small', '', current ? 'Current chat' : chatRef.chatId));
        const action = el('button', 'action'); action.type = 'button';
        if (current) {
            action.title = 'Make stand-alone'; action.append(icon('fa-arrow-up-right-from-square'));
            action.addEventListener('click', async () => {
                action.disabled = true;
                try {
                    const result = await ownership()?.detachCurrent?.();
                    closeSettings();
                    document.dispatchEvent(new CustomEvent('snowbunny:story-settings-membership-changed', { detail: result }));
                } catch (error) {
                    console.warn('[SnowBunny] Could not fork this Story chat to stand-alone.', error);
                    action.disabled = false;
                }
            });
        } else {
            action.title = 'Open chat'; action.append(icon('fa-chevron-right')); action.addEventListener('click', () => void openRef(chatRef));
        }
        row.append(copy, action); list.append(row);
    }
    const actions = el('div', 'snowbunny-story-settings-actions');
    if (ref && currentStoryId() !== String(story.id)) {
        const join = el('button', 'snowbunny-story-settings-action', 'Add current chat'); join.type = 'button';
        join.addEventListener('click', async () => {
            join.disabled = true; join.textContent = 'Joining…';
            try {
                const result = await ownership()?.joinCurrent?.(story.id);
                join.textContent = result?.staged ? `Joined · ${result.staged} Memories to review` : 'Joined';
                window.setTimeout(() => void openStorySettings(story.id), 150);
            } catch (error) {
                console.warn('[SnowBunny] Could not join this chat to the Story.', error);
                join.disabled = false; join.textContent = 'Try again';
            }
        });
        actions.append(join);
    }
    section.append(title, list, actions, el('div', 'snowbunny-story-settings-note', 'Moving a chat never silently merges private history. Leaving snapshots Story Memories locally; joining stages stand-alone Memories for review while the destination Story remains authoritative.'));
}

export async function openStorySettings(storyId) {
    closeSettings();
    const story = storyById(storyId);
    if (!story) return;
    activeStoryId = String(story.id);
    const root = el('div'); root.id = SETTINGS_ID;
    root.append(header(`${story.title} · Settings`, closeSettings));
    const body = el('main', 'snowbunny-story-settings-body');
    const summary = el('div', 'snowbunny-story-settings-summary');
    summary.append(el('strong', '', story.title), el('small', '', 'Shared fiction only: Story Lorebooks, accepted Story Memories, and which chats belong here. Persona, Members, Model, Preset, Scenario, Regex, Agents and CYOA stay chat-specific.'));
    body.append(summary);
    const lore = el('section', 'snowbunny-story-settings-section');
    const memory = el('section', 'snowbunny-story-settings-section');
    const chats = el('section', 'snowbunny-story-settings-section');
    body.append(lore, memory, chats); root.append(body); document.body.append(root);
    await renderLorebooks(lore, storyById(story.id) || story);
    await renderMemories(memory, storyById(story.id) || story);
    await renderChats(chats, storyById(story.id) || story);
}

function mapStoryCards() {
    const root = document.getElementById(WORKSPACE_ID);
    if (!root) return;
    const records = [...stories()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const used = new Set();
    for (const card of root.querySelectorAll('.snowbunny-story-card')) {
        const title = card.querySelector('.snowbunny-story-card-copy strong')?.textContent?.trim() || '';
        const candidate = records.find(story => !used.has(String(story.id)) && String(story.title) === title);
        if (!candidate) continue;
        used.add(String(candidate.id));
        card.dataset.snowbunnyStoryId = String(candidate.id);
    }
}

function inferInteriorStory() {
    const root = document.getElementById(WORKSPACE_ID);
    const title = root?.querySelector('.snowbunny-library-header h2')?.textContent?.trim() || '';
    if (activeStoryId && storyById(activeStoryId)?.title === title) return storyById(activeStoryId);
    const matches = stories().filter(story => story.title === title);
    if (matches.length === 1) {
        activeStoryId = String(matches[0].id);
        return matches[0];
    }
    const current = storyById(currentStoryId());
    if (current?.title === title) {
        activeStoryId = String(current.id);
        return current;
    }
    return null;
}

function replaceUnsafeInteriorControls(story) {
    const root = document.getElementById(WORKSPACE_ID);
    if (!root || !story) return;
    const add = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Add current');
    if (add instanceof HTMLButtonElement && add.dataset.snowbunnySafeOwnership !== '1') {
        const replacement = add.cloneNode(true);
        replacement.dataset.snowbunnySafeOwnership = '1';
        replacement.addEventListener('click', async () => {
            replacement.disabled = true; replacement.textContent = 'Joining…';
            try {
                const result = await ownership()?.joinCurrent?.(story.id);
                replacement.textContent = result?.staged ? `Joined · ${result.staged} to review` : 'Joined';
            } catch (error) {
                console.warn('[SnowBunny] Could not safely add current chat to Story.', error);
                replacement.disabled = false; replacement.textContent = 'Try again';
            }
        });
        add.replaceWith(replacement);
    }

    for (const remove of root.querySelectorAll('button[title="Remove from Story"]')) {
        if (!(remove instanceof HTMLButtonElement) || remove.dataset.snowbunnySafeOwnership === '1') continue;
        const card = remove.closest('.snowbunny-chat-card');
        const replacement = remove.cloneNode(true);
        replacement.dataset.snowbunnySafeOwnership = '1';
        if (!card?.classList.contains('current')) {
            replacement.disabled = true;
            replacement.title = 'Open this chat before making it stand-alone so SnowBunny can preserve its continuity safely.';
        } else {
            replacement.addEventListener('click', async () => {
                replacement.disabled = true;
                try {
                    await ownership()?.detachCurrent?.();
                    replacement.title = 'This chat is now stand-alone';
                    card.remove();
                } catch (error) {
                    console.warn('[SnowBunny] Could not safely remove current chat from Story.', error);
                    replacement.disabled = false;
                }
            });
        }
        remove.replaceWith(replacement);
    }
}

function addSettingsButton(story) {
    const root = document.getElementById(WORKSPACE_ID);
    const header = root?.querySelector('.snowbunny-library-header');
    if (!header || !story || header.querySelector('.snowbunny-story-settings-gear')) return;
    const button = el('button', 'snowbunny-story-settings-gear'); button.type = 'button'; button.title = 'Story Settings'; button.append(icon('fa-gear'));
    button.addEventListener('click', () => void openStorySettings(story.id));
    header.append(button);
}

function enhanceWorkspace() {
    if (enhancing) return;
    enhancing = true;
    try {
        mapStoryCards();
        const story = inferInteriorStory();
        if (story) {
            addSettingsButton(story);
            replaceUnsafeInteriorControls(story);
        }
    } finally {
        enhancing = false;
    }
}

function onStoryCardClick(event) {
    const card = event.target instanceof Element ? event.target.closest(`#${WORKSPACE_ID} .snowbunny-story-card`) : null;
    const id = card?.dataset?.snowbunnyStoryId;
    if (!id) return;
    activeStoryId = String(id);
    window.setTimeout(enhanceWorkspace, 0);
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(MEMORY_EDITOR_ID)) {
        event.preventDefault(); closeMemoryEditor();
    } else if (document.getElementById(SETTINGS_ID)) {
        event.preventDefault(); closeSettings();
    }
}

export function initStorySettings() {
    if (initialized) return;
    initialized = true;
    installStyles();
    document.addEventListener('click', onStoryCardClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    observer = new MutationObserver(() => requestAnimationFrame(enhanceWorkspace));
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('snowbunny:story-ownership-changed', enhanceWorkspace);
    document.addEventListener('snowbunny:lorebook-bindings-changed', enhanceWorkspace);
    enhanceWorkspace();

    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        storySettings: {
            open: openStorySettings,
            close: closeSettings,
        },
    };
}
