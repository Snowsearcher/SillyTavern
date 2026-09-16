const AGENTS_WORKSPACE_ID = 'snowbunny-agents-workspace';
const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const TEMPLATE_ID = 'snowbunny-custom-agent-templates';
const EDITOR_ID = 'snowbunny-custom-agent-editor';
const MORE_ID = 'snowbunny-custom-agent-more';
const IMPORT_ID = 'snowbunny-custom-agent-import';
const STYLE_ID = 'snowbunny-custom-agents-ui-style';

let initialized = false;
let observer = null;
let queued = false;
let enhancing = false;

function agents() {
    return globalThis.SnowBunny?.agents ?? null;
}

function engine() {
    return globalThis.SnowBunny?.customAgentEngine ?? null;
}

function trackers() {
    return globalThis.SnowBunny?.trackers ?? null;
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
  #${TEMPLATE_ID}, #${MORE_ID} {
    position: fixed; z-index: 12340; inset: 0; display: flex; align-items: flex-end; justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  .snowbunny-custom-agent-sheet {
    width: min(100%, 680px); max-height: 88dvh; display: flex; flex-direction: column; overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 70%, transparent); border-bottom: 0;
    border-radius: 24px 24px 0 0; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor); box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  .snowbunny-custom-agent-sheet-handle { width: 38px; height: 4px; margin: 8px auto 2px; border-radius: 999px; background: currentColor; opacity: .24; }
  .snowbunny-custom-agent-sheet-head { display: flex; align-items: center; gap: 8px; padding: 7px 10px 9px 16px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); }
  .snowbunny-custom-agent-sheet-head h3 { flex: 1; margin: 0; font-size: .98rem; }
  .snowbunny-custom-agent-sheet-head button { width: 40px; height: 40px; border: 0; border-radius: 12px; background: transparent; color: inherit; }
  .snowbunny-custom-agent-sheet-body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 10px calc(14px + env(safe-area-inset-bottom)); }
  .snowbunny-agent-template {
    width: 100%; min-height: 68px; display: flex; align-items: center; gap: 10px; margin: 5px 0; padding: 9px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 17px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 50%, transparent); color: inherit; text-align: left;
  }
  .snowbunny-agent-template:disabled { opacity: .48; }
  .snowbunny-agent-template-icon { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent); }
  .snowbunny-agent-template-copy { flex: 1; min-width: 0; }
  .snowbunny-agent-template-copy strong, .snowbunny-agent-template-copy small { display: block; }
  .snowbunny-agent-template-copy strong { font-size: .83rem; }
  .snowbunny-agent-template-copy small { margin-top: 3px; font-size: .67rem; line-height: 1.4; opacity: .58; }
  .snowbunny-custom-agent-home-card .snowbunny-agent-card-top { cursor: default; }
  .snowbunny-custom-agent-home-card .snowbunny-agent-status { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .snowbunny-custom-agent-home-card.failed { border-color: color-mix(in srgb, #c96a70 48%, var(--SmartThemeBorderColor)); }

  #${EDITOR_ID} {
    position: fixed; z-index: 12330; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor);
  }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-head {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent);
  }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-head h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.02rem; }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-head button { min-width: 42px; min-height: 42px; padding: 6px 10px; border: 0; border-radius: 13px; background: transparent; color: inherit; font-weight: 720; }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-head .save { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-body { flex: 1; min-height: 0; overflow-y: auto; padding: 11px 13px calc(22px + env(safe-area-inset-bottom)); }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-intro { margin-bottom: 10px; padding: 10px 11px; border-radius: 15px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 8%, transparent); font-size: .69rem; line-height: 1.42; opacity: .72; }
  #${EDITOR_ID} .snowbunny-custom-agent-field { display: grid; gap: 5px; margin: 9px 0; }
  #${EDITOR_ID} .snowbunny-custom-agent-field > span { font-size: .7rem; font-weight: 720; opacity: .76; }
  #${EDITOR_ID} input[type="text"], #${EDITOR_ID} input[type="number"], #${EDITOR_ID} select, #${EDITOR_ID} textarea {
    box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent); border-radius: 13px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 55%, transparent); color: inherit; font: inherit;
  }
  #${EDITOR_ID} textarea { min-height: 135px; resize: vertical; line-height: 1.45; }
  #${EDITOR_ID} .snowbunny-custom-agent-check { display: flex; align-items: center; gap: 9px; min-height: 44px; margin: 5px 0; padding: 7px 9px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 49%, transparent); border-radius: 13px; font-size: .7rem; }
  #${EDITOR_ID} .snowbunny-custom-agent-check input { width: 20px; height: 20px; }
  #${EDITOR_ID} .snowbunny-custom-agent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  #${EDITOR_ID} details { margin-top: 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent); border-radius: 15px; overflow: hidden; }
  #${EDITOR_ID} details summary { padding: 10px 11px; font-size: .75rem; font-weight: 730; cursor: pointer; }
  #${EDITOR_ID} .snowbunny-custom-agent-advanced { padding: 0 10px 10px; }
  #${EDITOR_ID} .snowbunny-custom-agent-dependencies { display: grid; gap: 4px; margin-top: 7px; }
  #${EDITOR_ID} .snowbunny-custom-agent-dependencies label { display: flex; align-items: center; gap: 7px; min-height: 38px; padding: 6px 8px; border-radius: 11px; background: color-mix(in srgb, currentColor 5%, transparent); font-size: .68rem; }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-actions { display: flex; gap: 7px; margin-top: 13px; }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-actions button { flex: 1; min-height: 42px; border: 0; border-radius: 13px; background: color-mix(in srgb, currentColor 7%, transparent); color: inherit; font-weight: 720; }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-actions .run { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent); }
  #${EDITOR_ID} .snowbunny-custom-agent-editor-error { min-height: 20px; margin-top: 7px; font-size: .67rem; color: var(--SmartThemeQuoteColor, #e894a5); }
}
`;
    document.head.append(style);
}

function closeTemplate() { document.getElementById(TEMPLATE_ID)?.remove(); }
function closeMore() { document.getElementById(MORE_ID)?.remove(); }
function closeEditor() { document.getElementById(EDITOR_ID)?.remove(); }

function sheetFrame(idValue, title) {
    document.getElementById(idValue)?.remove();
    const overlay = el('div'); overlay.id = idValue;
    const card = el('section', 'snowbunny-custom-agent-sheet'); card.append(el('div', 'snowbunny-custom-agent-sheet-handle'));
    const head = el('header', 'snowbunny-custom-agent-sheet-head'); head.append(el('h3', '', title));
    const close = el('button'); close.type = 'button'; close.append(icon('fa-xmark')); close.addEventListener('click', () => overlay.remove()); head.append(close);
    const body = el('div', 'snowbunny-custom-agent-sheet-body'); card.append(head, body); overlay.append(card);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) overlay.remove(); });
    document.body.append(overlay);
    return body;
}

function templateButton(title, description, iconName, handler, disabled = false) {
    const button = el('button', 'snowbunny-agent-template'); button.type = 'button'; button.disabled = disabled;
    const marker = el('span', 'snowbunny-agent-template-icon'); marker.append(icon(iconName));
    const copy = el('span', 'snowbunny-agent-template-copy'); copy.append(el('strong', '', title), el('small', '', description));
    button.append(marker, copy, icon(disabled ? 'fa-lock' : 'fa-chevron-right'));
    if (!disabled) button.addEventListener('click', handler);
    return button;
}

function openTemplatePicker() {
    const body = sheetFrame(TEMPLATE_ID, 'New Agent');
    const storyTracker = templateButton('Story Tracker', 'Already active as SnowBunny’s rich current-state Agent.', 'fa-sparkles', () => {
        closeTemplate();
        document.querySelector(`#${AGENTS_WORKSPACE_ID} .snowbunny-agent-card-action`)?.click();
    });
    const timePlace = templateButton('Time & Place', 'Already maintained by Story Tracker and shown near the reply without spending a second model call.', 'fa-location-dot', () => {
        closeTemplate();
        document.querySelector(`#${AGENTS_WORKSPACE_ID} .snowbunny-agent-card-action`)?.click();
    });
    const phone = templateButton('Pocket Phone Upkeep', 'Will become available when the native Pocket Phone continuity engine is connected. It will stay a hidden background job.', 'fa-mobile-screen-button', null, true);
    const custom = templateButton('Custom Agent', 'A focused job you define. It can show a result in chat, help the next writer reply, run automatically, or stay manual.', 'fa-wand-magic-sparkles', () => {
        closeTemplate(); void openEditor();
    });
    body.append(storyTracker, timePlace, phone, custom);
}

function downloadAgents(definitions) {
    const payload = { format: 'snowbunny-agents-v1', agents: definitions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'snowbunny-custom-agents.json'; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

function importAgents() {
    let input = document.getElementById(IMPORT_ID);
    if (!(input instanceof HTMLInputElement)) {
        input = document.createElement('input'); input.id = IMPORT_ID; input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true; document.body.append(input);
    }
    input.onchange = async () => {
        const file = input.files?.[0]; input.value = ''; if (!file) return;
        try {
            const decoded = JSON.parse(await file.text());
            const source = Array.isArray(decoded) ? decoded : Array.isArray(decoded?.agents) ? decoded.agents : Array.isArray(decoded?.items) ? decoded.items : null;
            if (!source) throw new Error('This file does not contain an Agent list.');
            const state = await agents().read({ fresh: true });
            const imported = source.filter(item => item && typeof item === 'object').map(item => agents().normalizeDefinition({
                ...item,
                id: agents().newId('agent'),
                enabled: false,
                automatic: false,
                dependencies: [],
                name: `${String(item.name || 'Imported Agent')} · imported`,
            }));
            await agents().setDefinitions([...state.definitions, ...imported]);
            closeMore(); queueEnhance();
        } catch (error) {
            console.warn('[SnowBunny] Agent import failed.', error); alert(String(error?.message || error));
        }
    };
    input.click();
}

async function openMoreMenu() {
    const body = sheetFrame(MORE_ID, 'Agent tools');
    const state = await agents().read();
    body.append(
        templateButton('Import Agents', 'Imported custom Agents start disabled and automatic running stays off until you review them.', 'fa-file-import', importAgents),
        templateButton('Export Custom Agents', 'Save the current chat’s custom Agent definitions as JSON.', 'fa-file-export', () => { downloadAgents(state.definitions); closeMore(); }, !state.definitions.length),
    );
}

function statusCopy(status) {
    if (!status) return 'Waiting for its first run';
    if (status.status === 'failed') return status.detail || 'Last update failed';
    if (status.status === 'running') return 'Updating now';
    if (status.status === 'complete') return 'Up to date';
    if (status.status === 'waiting') return status.detail || 'Waiting';
    return 'Ready';
}

function placementCopy(definition) {
    if (!definition.visible || definition.placement === 'none') return 'Hidden result';
    if (definition.placement === 'header') return 'Message header';
    if (definition.placement === 'top') return 'Above reply';
    return 'Below reply';
}

async function toggleDefinition(definition, enabled, checkbox) {
    checkbox.disabled = true;
    try {
        await agents().upsert({ ...definition, enabled });
        queueEnhance();
    } catch (error) {
        console.warn('[SnowBunny] Could not toggle Custom Agent.', error); checkbox.checked = !enabled; checkbox.disabled = false;
    }
}

function homeCard(definition, status) {
    const card = el('article', `snowbunny-agent-card snowbunny-custom-agent-home-card${status?.status === 'failed' ? ' failed' : ''}`);
    const top = el('div', 'snowbunny-agent-card-top');
    const marker = el('div', 'snowbunny-agent-icon'); marker.append(icon('fa-wand-magic-sparkles'));
    const copy = el('div', 'snowbunny-agent-copy');
    copy.append(el('strong', '', definition.name), el('small', '', definition.purpose || statusCopy(status)));
    const toggle = el('label', 'snowbunny-agent-toggle');
    const input = el('input'); input.type = 'checkbox'; input.checked = definition.enabled; input.addEventListener('change', () => void toggleDefinition(definition, input.checked, input));
    toggle.append(input, el('span'));
    top.append(marker, copy, toggle); card.append(top);
    const statusGrid = el('div', 'snowbunny-agent-status');
    statusGrid.append(
        el('span', '', definition.automatic ? `Updates every ${definition.frequency} ${definition.frequency === 1 ? 'reply' : 'replies'}` : 'Manual updates'),
        el('span', '', placementCopy(definition)),
        el('span', '', definition.feedback ? 'Helps the next story reply' : 'Does not alter writer context'),
        el('span', '', statusCopy(status)),
    );
    card.append(statusGrid);
    const open = el('button', 'snowbunny-agent-card-action', 'Open Agent'); open.type = 'button'; open.addEventListener('click', () => void openEditor(definition)); card.append(open);
    return card;
}

function field(label, control) {
    const host = el('label', 'snowbunny-custom-agent-field'); host.append(el('span', '', label), control); return host;
}

function check(label, checked) {
    const host = el('label', 'snowbunny-custom-agent-check'); const input = el('input'); input.type = 'checkbox'; input.checked = Boolean(checked); host.append(input, el('span', '', label)); return { host, input };
}

async function openEditor(definition = null) {
    closeEditor();
    const state = await agents().read({ fresh: true });
    const draft = agents().normalizeDefinition(definition || {
        id: agents().newId('agent'),
        name: 'Custom Agent',
        purpose: '',
        prompt: '',
        enabled: true,
        automatic: true,
        frequency: 1,
        placement: 'bottom',
        visible: true,
        feedback: false,
        historyCount: 30,
        replyLimit: 2400,
        dependencies: [],
        includeAcceptedMemories: false,
        instructionsMode: 'record',
    });
    const root = el('div'); root.id = EDITOR_ID;
    const head = el('header', 'snowbunny-custom-agent-editor-head');
    const back = el('button'); back.type = 'button'; back.append(icon('fa-arrow-left')); back.addEventListener('click', closeEditor);
    const heading = el('h2', '', definition ? definition.name : 'New Custom Agent');
    const save = el('button', 'save', 'Save'); save.type = 'button'; head.append(back, heading, save); root.append(head);
    const body = el('main', 'snowbunny-custom-agent-editor-body');
    body.append(el('div', 'snowbunny-custom-agent-editor-intro', 'Give this Agent one focused job. Automatic running happens after completed story replies, never just because you typed. If it helps the Story Writer, SnowBunny supplies only the latest valid result.'));

    const name = el('input'); name.type = 'text'; name.maxLength = 100; name.value = draft.name;
    const purpose = el('input'); purpose.type = 'text'; purpose.maxLength = 500; purpose.value = draft.purpose;
    const prompt = el('textarea'); prompt.maxLength = 30000; prompt.value = draft.prompt; prompt.placeholder = 'Describe the Agent’s focused job in plain language.';
    const enabled = check('On', draft.enabled);
    const automatic = check('Update automatically after story replies', draft.automatic);
    const writer = check('Let the latest valid result help the next Story Writer reply', draft.feedback);
    const visible = check('Show this Agent’s result in the chat', draft.visible && draft.placement !== 'none');
    const frequency = el('input'); frequency.type = 'number'; frequency.min = '1'; frequency.max = '100'; frequency.value = String(draft.frequency);
    const placement = el('select');
    placement.append(new Option('Below reply', 'bottom'), new Option('Above reply', 'top'), new Option('Message header', 'header'), new Option('Hidden', 'none')); placement.value = draft.visible ? draft.placement : 'none';
    visible.input.addEventListener('change', () => { if (!visible.input.checked) placement.value = 'none'; else if (placement.value === 'none') placement.value = 'bottom'; });
    placement.addEventListener('change', () => { visible.input.checked = placement.value !== 'none'; });

    body.append(field('Name', name), field('Short purpose', purpose), field('Agent instructions', prompt), enabled.host, automatic.host);
    const grid = el('div', 'snowbunny-custom-agent-grid'); grid.append(field('Update every completed replies', frequency), field('Reader-facing result', placement)); body.append(grid, writer.host);

    const advanced = el('details'); advanced.append(el('summary', '', 'Advanced'));
    const advancedBody = el('div', 'snowbunny-custom-agent-advanced');
    const history = el('input'); history.type = 'number'; history.min = '2'; history.max = '500'; history.value = String(draft.historyCount);
    const limit = el('input'); limit.type = 'number'; limit.min = '64'; limit.max = '16000'; limit.step = '100'; limit.value = String(draft.replyLimit);
    const memory = check('Allow accepted Memories as additional evidence for this Agent', draft.includeAcceptedMemories);
    const suggest = check('This Agent produces suggestions, not established current facts', draft.instructionsMode === 'suggest');
    advancedBody.append(field('Recent story window', history), field('Reply limit', limit), memory.host, suggest.host);
    const depsTitle = el('div', 'snowbunny-custom-agent-field'); depsTitle.append(el('span', '', 'Run after these Custom Agents'));
    const deps = el('div', 'snowbunny-custom-agent-dependencies');
    const dependencyInputs = new Map();
    for (const other of state.definitions.filter(item => item.id !== draft.id)) {
        const dep = check(other.name, draft.dependencies.includes(other.id)); dependencyInputs.set(other.id, dep.input); deps.append(dep.host);
    }
    if (!dependencyInputs.size) deps.append(el('div', 'snowbunny-agent-section-copy', 'No other Custom Agents in this chat.'));
    depsTitle.append(deps); advancedBody.append(depsTitle); advanced.append(advancedBody); body.append(advanced);

    const error = el('div', 'snowbunny-custom-agent-editor-error'); body.append(error);
    const actions = el('div', 'snowbunny-custom-agent-editor-actions');
    const run = el('button', 'run', definition ? 'Update now' : 'Save before running'); run.type = 'button'; run.disabled = !definition;
    const duplicate = el('button', '', definition ? 'Duplicate' : 'Cancel'); duplicate.type = 'button';
    const remove = el('button', '', definition ? 'Delete' : ''); remove.type = 'button'; remove.style.display = definition ? '' : 'none';
    actions.append(run, duplicate, remove); body.append(actions); root.append(body); document.body.append(root);

    const collect = () => agents().normalizeDefinition({
        ...draft,
        name: name.value,
        purpose: purpose.value,
        prompt: prompt.value,
        enabled: enabled.input.checked,
        automatic: automatic.input.checked,
        frequency: Number(frequency.value),
        placement: placement.value,
        visible: visible.input.checked && placement.value !== 'none',
        feedback: writer.input.checked,
        historyCount: Number(history.value),
        replyLimit: Number(limit.value),
        dependencies: [...dependencyInputs].filter(([, input]) => input.checked).map(([id]) => id),
        includeAcceptedMemories: memory.input.checked,
        instructionsMode: suggest.input.checked ? 'suggest' : 'record',
        updatedAt: Date.now(),
    });

    save.addEventListener('click', async () => {
        error.textContent = '';
        const value = collect();
        if (!value.name.trim() || !value.prompt.trim()) { error.textContent = 'Give this Agent a name and a focused task.'; return; }
        save.disabled = true;
        try {
            await agents().upsert(value);
            closeEditor(); queueEnhance();
        } catch (saveError) {
            console.warn('[SnowBunny] Could not save Custom Agent.', saveError); error.textContent = String(saveError?.message || saveError); save.disabled = false;
        }
    });
    run.addEventListener('click', async () => {
        run.disabled = true; run.textContent = 'Updating…';
        try {
            await agents().upsert(collect());
            const result = await engine()?.runNow?.(draft.id);
            run.textContent = result ? 'Updated' : 'No result';
        } catch (runError) {
            console.warn('[SnowBunny] Custom Agent update failed.', runError); error.textContent = String(runError?.message || runError); run.disabled = false; run.textContent = 'Try again';
        }
    });
    duplicate.addEventListener('click', async () => {
        if (!definition) { closeEditor(); return; }
        const copy = collect(); copy.id = agents().newId('agent'); copy.name = `${copy.name} copy`; copy.automatic = false; copy.dependencies = [];
        await agents().upsert(copy); closeEditor(); queueEnhance();
    });
    remove.addEventListener('click', async () => {
        if (!definition || !window.confirm(`Delete Agent “${draft.name}”?`)) return;
        try { await agents().remove(draft.id); closeEditor(); queueEnhance(); }
        catch (removeError) { error.textContent = String(removeError?.message || removeError); }
    });
}

async function enhanceHome() {
    queued = false;
    if (enhancing) return;
    const workspace = document.getElementById(AGENTS_WORKSPACE_ID);
    if (!workspace) return;
    enhancing = true;
    try {
        const head = workspace.querySelector('.snowbunny-agents-header');
        if (head && !head.querySelector('[data-snowbunny-custom-add]')) {
            const more = el('button'); more.type = 'button'; more.dataset.snowbunnyCustomMore = '1'; more.title = 'Import / Export'; more.append(icon('fa-ellipsis')); more.addEventListener('click', () => void openMoreMenu());
            const add = el('button'); add.type = 'button'; add.dataset.snowbunnyCustomAdd = '1'; add.title = 'New Agent'; add.append(icon('fa-plus')); add.addEventListener('click', openTemplatePicker);
            head.append(more, add);
        }
        const body = workspace.querySelector('.snowbunny-agents-body');
        if (!body) return;
        body.querySelectorAll('[data-snowbunny-custom-card]').forEach(node => node.remove());
        for (const intro of body.querySelectorAll('.snowbunny-agent-intro')) {
            if (intro.querySelector('strong')?.textContent?.trim() === 'Agent engine expansion') intro.remove();
        }
        const state = await agents().read();
        const trackerCard = body.querySelector('.snowbunny-agent-card');
        let anchor = trackerCard;
        if (state.definitions.length) {
            const title = el('div', 'snowbunny-agent-section-title', 'Custom Agents'); title.dataset.snowbunnyCustomCard = '1';
            anchor?.insertAdjacentElement('afterend', title); anchor = title;
            for (const definition of state.definitions) {
                const card = homeCard(definition, state.status?.[definition.id]); card.dataset.snowbunnyCustomCard = '1';
                anchor.insertAdjacentElement('afterend', card); anchor = card;
            }
        }
        const note = el('div', 'snowbunny-agent-intro'); note.dataset.snowbunnyCustomCard = '1';
        note.append(el('strong', '', 'Built-in + custom jobs'), el('small', '', 'Time & Place stays inside Story Tracker so it costs no extra model call. Custom Agents can depend on one another, stay manual, display a result, or feed only their latest valid result to the writer. Pocket Phone Upkeep remains locked until the Phone system itself is native.'));
        (anchor || trackerCard)?.insertAdjacentElement('afterend', note);
    } finally {
        enhancing = false;
        void enhanceDrawerCount();
    }
}

async function enhanceDrawerCount() {
    const row = [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button => button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Agents');
    if (!(row instanceof HTMLButtonElement)) return;
    const custom = await agents().read();
    const tracker = await trackers()?.read?.();
    const active = custom.definitions.filter(definition => definition.enabled).length + (tracker?.settings?.automatic === false ? 0 : 1);
    const failed = Object.values(custom.status || {}).filter(status => status.status === 'failed').length;
    const value = row.querySelector('.snowbunny-shell-row-value');
    if (value) value.textContent = failed ? `${failed} failed` : active ? `${active} active` : 'Off';
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => void enhanceHome());
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(EDITOR_ID)) { event.preventDefault(); closeEditor(); }
    else if (document.getElementById(TEMPLATE_ID)) { event.preventDefault(); closeTemplate(); }
    else if (document.getElementById(MORE_ID)) { event.preventDefault(); closeMore(); }
}

export function initCustomAgentsUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(queueEnhance);
    // The Agents workspace is mounted directly under body. Watching only direct
    // children catches workspace creation without observing the cards this module
    // itself adds/removes, which avoids a self-triggering render loop.
    observer.observe(document.body, { childList: true });
    for (const name of ['snowbunny:agents-changed', 'snowbunny:agent-result-ready', 'snowbunny:agent-results-reconciled', 'snowbunny:tracker-state-changed', 'snowbunny:shell-open']) {
        document.addEventListener(name, queueEnhance);
    }
    document.addEventListener('keydown', onKeyDown, true);
    queueEnhance();
}
