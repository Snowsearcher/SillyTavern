const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SHEET_ID = 'snowbunny-memory-sheet';
const EDITOR_ID = 'snowbunny-memory-editor';
const PROPOSAL_ID = 'snowbunny-memory-proposal';
const STYLE_ID = 'snowbunny-memory-style';

let initialized = false;
let drawerObserver = null;
let renderQueued = false;
let activeTab = 'saved';

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function store() {
    return globalThis.SnowBunny?.memories ?? null;
}

function maker() {
    return globalThis.SnowBunny?.memoryMaker ?? null;
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
  #${SHEET_ID}, #${EDITOR_ID} {
    position: fixed; z-index: 12220; inset: 0; display: flex; align-items: flex-end; justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SHEET_ID} .snowbunny-memory-card,
  #${EDITOR_ID} .snowbunny-memory-editor-card {
    width: min(100%, 680px); max-height: 91dvh; display: flex; flex-direction: column; overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent); border-bottom: 0;
    border-radius: 24px 24px 0 0; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor); box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  .snowbunny-memory-handle { width: 38px; height: 4px; margin: 8px auto 2px; border-radius: 999px; background: currentColor; opacity: .24; }
  .snowbunny-memory-header {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px 9px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
  }
  .snowbunny-memory-header h3 { flex: 1; margin: 0; font-size: .98rem; }
  .snowbunny-memory-header button {
    min-width: 40px; min-height: 38px; border: 0; border-radius: 12px; background: transparent; color: inherit; font-weight: 700;
  }
  .snowbunny-memory-header .primary { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
  .snowbunny-memory-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 8px 10px 0; }
  .snowbunny-memory-tabs button {
    min-height: 40px; border: 0; border-radius: 12px; background: transparent; color: inherit; font-weight: 700; opacity: .55;
  }
  .snowbunny-memory-tabs button.active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent); opacity: .95; }
  .snowbunny-memory-body { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 12px calc(16px + env(safe-area-inset-bottom)); }
  .snowbunny-memory-toolbar { display: flex; gap: 7px; margin-bottom: 9px; }
  .snowbunny-memory-search, .snowbunny-memory-input, .snowbunny-memory-textarea {
    box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent); color: inherit; font: inherit;
  }
  .snowbunny-memory-search { flex: 1; min-width: 0; }
  .snowbunny-memory-textarea { min-height: 120px; resize: vertical; line-height: 1.45; }
  .snowbunny-memory-action {
    min-height: 42px; padding: 7px 11px; border: 0; border-radius: 13px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent); color: inherit; font-weight: 700;
  }
  .snowbunny-memory-owner {
    margin-bottom: 9px; padding: 9px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent);
    border-radius: 14px; font-size: .69rem; line-height: 1.4; opacity: .68;
  }
  .snowbunny-memory-item, .snowbunny-memory-suggestion {
    margin: 7px 0; padding: 11px 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 57%, transparent);
    border-radius: 17px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 55%, transparent);
  }
  .snowbunny-memory-item-head, .snowbunny-memory-suggestion-head { display: flex; align-items: center; gap: 8px; }
  .snowbunny-memory-item-head strong, .snowbunny-memory-suggestion-head strong { flex: 1; min-width: 0; font-size: .84rem; }
  .snowbunny-memory-item-head button {
    width: 34px; height: 34px; border: 0; border-radius: 10px; background: transparent; color: inherit; opacity: .68;
  }
  .snowbunny-memory-item p, .snowbunny-memory-suggestion p { margin: 7px 0 0; font-size: .75rem; line-height: 1.48; white-space: pre-wrap; }
  .snowbunny-memory-reason { opacity: .62; }
  .snowbunny-memory-badge {
    display: inline-flex; align-items: center; gap: 5px; padding: 3px 7px; border-radius: 999px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent); font-size: .62rem; font-weight: 760; opacity: .78;
  }
  .snowbunny-memory-empty { padding: 26px 14px; text-align: center; font-size: .76rem; line-height: 1.45; opacity: .58; }
  .snowbunny-memory-settings {
    margin-top: 14px; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent);
    border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 45%, transparent);
  }
  .snowbunny-memory-settings label { display: flex; align-items: center; gap: 9px; margin: 7px 0; font-size: .72rem; }
  .snowbunny-memory-settings input[type="number"] { width: 72px; min-height: 34px; margin-left: auto; }
  .snowbunny-memory-settings textarea { margin-top: 7px; min-height: 84px; }

  #${EDITOR_ID} .snowbunny-memory-editor-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px calc(18px + env(safe-area-inset-bottom)); }
  #${EDITOR_ID} .snowbunny-memory-field { display: grid; gap: 5px; margin: 9px 0; font-size: .72rem; font-weight: 700; }

  #${PROPOSAL_ID} {
    position: fixed; z-index: 11970; left: 50%; bottom: calc(var(--snowbunny-memory-composer-height, 70px) + 12px + env(safe-area-inset-bottom));
    width: min(calc(100vw - 18px), 560px); transform: translateX(-50%);
    border: 1px solid color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 34%, var(--SmartThemeBorderColor));
    border-radius: 20px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 96%, #111 4%);
    color: var(--SmartThemeBodyColor); box-shadow: 0 16px 44px rgb(0 0 0 / 34%);
    backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) * 1.45)); -webkit-backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) * 1.45));
    overflow: hidden;
  }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-head { display: flex; align-items: center; gap: 8px; padding: 10px 11px 8px; }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-head strong { flex: 1; min-width: 0; font-size: .83rem; }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-body { max-height: min(42dvh, 340px); overflow-y: auto; padding: 0 12px 8px; }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-body h4 { margin: 4px 0 5px; font-size: .9rem; }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-body p { margin: 5px 0; font-size: .73rem; line-height: 1.43; white-space: pre-wrap; }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-note { width: 100%; box-sizing: border-box; min-height: 58px; margin-top: 7px; padding: 8px 9px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent); border-radius: 12px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 54%, transparent); color: inherit; font: inherit; resize: vertical; }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-actions { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; padding: 8px 10px 10px; border-top: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 48%, transparent); }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-actions button { min-height: 39px; border: 0; border-radius: 12px; background: transparent; color: inherit; font-weight: 740; }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-actions .yes { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
  #${PROPOSAL_ID} .snowbunny-memory-proposal-status { padding: 0 12px 8px; font-size: .68rem; opacity: .65; }
}
`;
    document.head.append(style);
}

function memoryRow() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Memory',
    ) ?? null;
}

function actionLabel(action) {
    return action === 'edit' ? 'Update' : action === 'merge' ? 'Merge' : action === 'delete' ? 'Delete' : 'Create';
}

function proposalIntro(proposal) {
    if (proposal.action === 'edit') return 'Memory Maker wants to update a Memory';
    if (proposal.action === 'merge') return 'Memory Maker wants to combine Memories';
    if (proposal.action === 'delete') return 'Memory Maker wants to remove a Memory';
    return 'Memory Maker wants to save a new Memory';
}

function composerHeight() {
    const form = document.getElementById('send_form');
    const height = form instanceof HTMLElement ? Math.ceil(form.getBoundingClientRect().height) : 70;
    document.body.style.setProperty('--snowbunny-memory-composer-height', `${Math.max(56, height)}px`);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function closeEditor() {
    document.getElementById(EDITOR_ID)?.remove();
}

function closeProposal() {
    document.getElementById(PROPOSAL_ID)?.remove();
}

function ownerText() {
    const owner = store()?.owner?.();
    if (!owner) return 'No chat is open.';
    return owner.kind === 'story'
        ? `Story Memory · shared by every chat in ${owner.label}`
        : 'Stand-alone Memory · belongs only to this chat';
}

function openMemoryEditor(memory = null) {
    closeEditor();
    closeSheet();
    const overlay = el('div'); overlay.id = EDITOR_ID;
    const card = el('section', 'snowbunny-memory-editor-card');
    card.append(el('div', 'snowbunny-memory-handle'));
    const header = el('header', 'snowbunny-memory-header');
    const cancel = el('button', '', 'Cancel'); cancel.type = 'button'; cancel.addEventListener('click', () => { closeEditor(); void openMemorySheet(); });
    header.append(el('h3', '', memory ? 'Edit Memory' : 'Add Memory'), cancel);
    const save = el('button', 'primary', 'Save'); save.type = 'button'; header.append(save); card.append(header);
    const body = el('div', 'snowbunny-memory-editor-body');
    const titleLabel = el('label', 'snowbunny-memory-field'); titleLabel.append(el('span', '', 'Title'));
    const title = el('input', 'snowbunny-memory-input'); title.type = 'text'; title.maxLength = 1000; title.value = memory?.title || ''; titleLabel.append(title);
    const detailsLabel = el('label', 'snowbunny-memory-field'); detailsLabel.append(el('span', '', 'What happened'));
    const details = el('textarea', 'snowbunny-memory-textarea'); details.maxLength = 12000; details.value = memory?.details || ''; detailsLabel.append(details);
    body.append(titleLabel, detailsLabel); card.append(body); overlay.append(card); document.body.append(overlay);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) { closeEditor(); void openMemorySheet(); } });
    save.addEventListener('click', async () => {
        if (!title.value.trim() || !details.value.trim()) return;
        save.disabled = true;
        try {
            if (memory) await store().update(memory.id, { title: title.value, details: details.value });
            else await store().add({ title: title.value, details: details.value });
            closeEditor();
            await openMemorySheet();
        } catch (error) {
            console.warn('[SnowBunny] Could not save Memory.', error);
            save.disabled = false; save.textContent = 'Try again';
        }
    });
    window.setTimeout(() => title.focus({ preventScroll: true }), 50);
}

async function askMemoryMaker(button = null) {
    if (button) { button.disabled = true; button.textContent = 'Reviewing…'; }
    try {
        const result = await maker()?.review?.();
        if (button) button.textContent = result?.count ? `${result.count} ready` : 'Nothing new';
        await renderMemorySheet();
        await renderProposalCard();
    } catch (error) {
        if (button) { button.disabled = false; button.textContent = 'Try again'; }
        console.warn('[SnowBunny] Memory Maker review failed.', error);
    }
}

async function renderSaved(body, state) {
    const toolbar = el('div', 'snowbunny-memory-toolbar');
    const search = el('input', 'snowbunny-memory-search'); search.type = 'search'; search.placeholder = 'Search saved Memories';
    const add = el('button', 'snowbunny-memory-action', 'Add'); add.type = 'button'; add.addEventListener('click', () => openMemoryEditor());
    toolbar.append(search, add); body.append(toolbar);
    const list = el('div'); body.append(list);
    const render = () => {
        const query = search.value.trim().toLowerCase(); list.replaceChildren();
        const memories = (state.memories || []).filter(memory => !query || `${memory.title} ${memory.details}`.toLowerCase().includes(query));
        if (!memories.length) list.append(el('div', 'snowbunny-memory-empty', state.memories?.length ? 'No saved Memories match this search.' : 'No saved Memories yet. Memory Maker can propose them, or you can add one yourself.'));
        for (const memory of memories) {
            const item = el('article', 'snowbunny-memory-item');
            const head = el('div', 'snowbunny-memory-item-head'); head.append(el('strong', '', memory.title));
            const edit = el('button'); edit.type = 'button'; edit.title = 'Edit'; edit.append(icon('fa-pencil')); edit.addEventListener('click', () => openMemoryEditor(memory));
            const remove = el('button'); remove.type = 'button'; remove.title = 'Delete'; remove.append(icon('fa-trash')); remove.addEventListener('click', async () => { if (!window.confirm(`Delete Memory “${memory.title}”?`)) return; await store().delete(memory.id); await renderMemorySheet(); });
            head.append(edit, remove); item.append(head, el('p', '', memory.details)); list.append(item);
        }
    };
    search.addEventListener('input', render); render();

    const settings = el('div', 'snowbunny-memory-settings');
    const automatic = el('input'); automatic.type = 'checkbox'; automatic.checked = state.settings?.automatic !== false;
    const automaticLabel = el('label'); automaticLabel.append(automatic, el('span', '', 'Automatic Memory Maker checks'));
    const frequency = el('input'); frequency.type = 'number'; frequency.min = '1'; frequency.max = '30'; frequency.value = String(state.settings?.frequency || 5);
    const frequencyLabel = el('label'); frequencyLabel.append(el('span', '', 'Check every completed replies'), frequency);
    const instructions = el('textarea', 'snowbunny-memory-textarea'); instructions.placeholder = 'Optional extra Memory Maker instructions'; instructions.value = state.settings?.instructions || '';
    instructions.style.minHeight = '82px';
    const saveSettings = el('button', 'snowbunny-memory-action', 'Save Memory settings'); saveSettings.type = 'button';
    saveSettings.addEventListener('click', async () => {
        saveSettings.disabled = true;
        await store().setSettings({ automatic: automatic.checked, frequency: Number(frequency.value) || 5, instructions: instructions.value });
        saveSettings.textContent = 'Saved';
    });
    settings.append(automaticLabel, frequencyLabel, instructions, saveSettings); body.append(settings);
}

function suggestionBlock(proposal, state) {
    const item = el('article', 'snowbunny-memory-suggestion');
    const head = el('div', 'snowbunny-memory-suggestion-head');
    head.append(el('span', 'snowbunny-memory-badge', actionLabel(proposal.action)), el('strong', '', proposal.title));
    item.append(head);
    if (proposal.action !== 'create') {
        const current = (state.memories || []).filter(memory => proposal.targetIds.includes(memory.id));
        if (current.length) item.append(el('p', 'snowbunny-memory-reason', `Current: ${current.map(memory => memory.title).join(', ')}`));
    }
    if (proposal.details) item.append(el('p', '', proposal.details));
    item.append(el('p', 'snowbunny-memory-reason', `Reason: ${proposal.reason}`));
    return item;
}

async function renderSuggestions(body, state) {
    const ask = el('button', 'snowbunny-memory-action', maker()?.status?.()?.reviewing ? 'Reviewing…' : 'Ask Memory Maker');
    ask.type = 'button'; ask.disabled = maker()?.status?.()?.reviewing === true; ask.style.width = '100%'; ask.style.marginBottom = '9px';
    ask.addEventListener('click', () => void askMemoryMaker(ask)); body.append(ask);
    if (!state.proposals?.length) {
        body.append(el('div', 'snowbunny-memory-empty', 'No suggestions are waiting. Memory Maker only proposes something when the story has useful history worth keeping or correcting.'));
        return;
    }
    state.proposals.forEach(proposal => body.append(suggestionBlock(proposal, state)));
    const note = el('div', 'snowbunny-memory-owner', 'Suggestions are reviewed one at a time above the composer. Open the source chat before accepting a proposal if its story evidence came from another chat.');
    body.append(note);
}

async function renderMemorySheet() {
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return;
    const body = sheet.querySelector('.snowbunny-memory-body');
    if (!body) return;
    const state = await store().read({ fresh: true });
    body.replaceChildren(el('div', 'snowbunny-memory-owner', ownerText()));
    if (activeTab === 'suggestions') await renderSuggestions(body, state); else await renderSaved(body, state);
    sheet.querySelectorAll('.snowbunny-memory-tabs button').forEach(button => button.classList.toggle('active', button.dataset.tab === activeTab));
}

async function openMemorySheet(tab = activeTab) {
    if (!context()?.getCurrentChatId?.()) return;
    closeSheet(); activeTab = tab;
    const overlay = el('div'); overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-memory-card'); card.append(el('div', 'snowbunny-memory-handle'));
    const header = el('header', 'snowbunny-memory-header'); header.append(icon('fa-brain'), el('h3', '', 'Memory'));
    const ask = el('button', 'primary', 'Ask'); ask.type = 'button'; ask.addEventListener('click', () => void askMemoryMaker(ask));
    const close = el('button'); close.type = 'button'; close.append(icon('fa-xmark')); close.addEventListener('click', closeSheet); header.append(ask, close); card.append(header);
    const tabs = el('div', 'snowbunny-memory-tabs');
    for (const [name, label] of [['saved', 'Saved Memories'], ['suggestions', 'Suggestions']]) {
        const button = el('button', activeTab === name ? 'active' : '', label); button.type = 'button'; button.dataset.tab = name;
        button.addEventListener('click', () => { activeTab = name; void renderMemorySheet(); }); tabs.append(button);
    }
    const body = el('div', 'snowbunny-memory-body'); card.append(tabs, body); overlay.append(card); document.body.append(overlay);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) closeSheet(); });
    await renderMemorySheet();
}

async function handleProposalDecision(proposal, accept, note, status) {
    status.textContent = note ? 'Asking Memory Maker to revise this suggestion…' : accept ? 'Saving Memory…' : 'Rejecting suggestion…';
    try {
        if (note) {
            await maker().review({ proposalId: proposal.id, correction: note, feedbackDecision: accept ? 'Yes, but revise it' : 'No, reconsider it' });
        } else if (accept) {
            await store().acceptProposal(proposal.id);
        } else {
            await store().rejectProposal(proposal.id);
        }
        snowState()?.deleteChatKey?.('memorySnoozedProposalId');
        await renderProposalCard();
        if (document.getElementById(SHEET_ID)) await renderMemorySheet();
        queueEnhance();
    } catch (error) {
        status.textContent = String(error?.message || error);
    }
}

async function renderProposalCard() {
    closeProposal();
    if (!context()?.getCurrentChatId?.()) return;
    const state = await store().read();
    const snoozed = snowState()?.readChat?.()?.memorySnoozedProposalId || '';
    const proposal = (state.proposals || []).find(item => item.id !== snoozed);
    if (!proposal) return;
    composerHeight();

    const card = el('aside'); card.id = PROPOSAL_ID;
    const head = el('div', 'snowbunny-memory-proposal-head');
    head.append(icon('fa-brain'), el('strong', '', proposalIntro(proposal)), el('span', 'snowbunny-memory-badge', `${(state.proposals || []).indexOf(proposal) + 1} of ${state.proposals.length}`));
    card.append(head);
    const body = el('div', 'snowbunny-memory-proposal-body');
    body.append(el('h4', '', proposal.title));
    if (proposal.action !== 'create') {
        const current = (state.memories || []).filter(memory => proposal.targetIds.includes(memory.id));
        if (current.length) body.append(el('p', 'snowbunny-memory-reason', `Current: ${current.map(memory => `${memory.title}: ${memory.details}`).join('\n\n')}`));
    }
    if (proposal.details) body.append(el('p', '', proposal.details));
    body.append(el('p', 'snowbunny-memory-reason', `Reason: ${proposal.reason}`));
    const note = el('textarea', 'snowbunny-memory-proposal-note'); note.placeholder = 'Optional correction or explanation…'; body.append(note); card.append(body);
    const status = el('div', 'snowbunny-memory-proposal-status'); card.append(status);
    const actions = el('div', 'snowbunny-memory-proposal-actions');
    const yes = el('button', 'yes', 'Yes'); yes.type = 'button'; yes.addEventListener('click', () => void handleProposalDecision(proposal, true, note.value.trim(), status));
    const no = el('button', '', 'No'); no.type = 'button'; no.addEventListener('click', () => void handleProposalDecision(proposal, false, note.value.trim(), status));
    const later = el('button', '', 'Later'); later.type = 'button'; later.addEventListener('click', () => { snowState()?.patchChat?.({ memorySnoozedProposalId: proposal.id }); closeProposal(); });
    actions.append(yes, no, later); card.append(actions); document.body.append(card);
}

function queueEnhance() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => void enhance());
}

async function enhance() {
    renderQueued = false;
    const row = memoryRow();
    if (row instanceof HTMLButtonElement) {
        row.disabled = false; row.setAttribute('aria-disabled', 'false');
        if (row.dataset.snowbunnyMemory !== '1') { row.dataset.snowbunnyMemory = '1'; row.addEventListener('click', () => void openMemorySheet()); }
        const value = row.querySelector('.snowbunny-shell-row-value');
        if (value) {
            const state = await store().read();
            value.textContent = state.proposals?.length ? `${state.proposals.length} ready` : state.memories?.length ? `${state.memories.length} saved` : 'Empty';
        }
    }
    await renderProposalCard();
}

function registerEvents() {
    const api = context(); const source = api?.eventSource; const types = api?.eventTypes;
    if (source?.on && types) {
        for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'MESSAGE_RECEIVED']) {
            const event = types[name]; if (event) source.on(event, () => { if (name === 'CHAT_CHANGED' || name === 'CHAT_LOADED') snowState()?.deleteChatKey?.('memorySnoozedProposalId'); queueEnhance(); });
        }
    }
    for (const name of ['snowbunny:memories-changed', 'snowbunny:memory-proposals-ready', 'snowbunny:memory-maker-status']) {
        document.addEventListener(name, queueEnhance);
    }
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(EDITOR_ID)) { event.preventDefault(); closeEditor(); void openMemorySheet(); }
    else if (document.getElementById(SHEET_ID)) { event.preventDefault(); closeSheet(); }
}

export function initMemoryUi() {
    if (initialized) return;
    initialized = true; installStyles(); registerEvents(); document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', composerHeight, { passive: true });
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) { drawerObserver = new MutationObserver(queueEnhance); drawerObserver.observe(drawer, { childList: true, subtree: true }); }
    document.addEventListener('snowbunny:shell-open', queueEnhance);
    queueEnhance();
}
