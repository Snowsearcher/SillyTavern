const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const WORKSPACE_ID = 'snowbunny-agents-workspace';
const STYLE_ID = 'snowbunny-agents-style';
const SECTION_META = {
    thoughts: ['Thoughts', 'Private thoughts and real feelings.', 'fa-brain'],
    relationships: ['Relationships', 'Current bonds, trust, tension and commitments.', 'fa-heart'],
    scene: ['Scene', 'Who is present and immediate physical state.', 'fa-masks-theater'],
    threads: ['Threads', 'Unfinished situations and offscreen developments.', 'fa-route'],
    secrets: ['Secrets', 'Hidden knowledge actively shaping scenes.', 'fa-lock'],
    conditions: ['Conditions', 'Persistent injuries, transformations and states.', 'fa-bandage'],
    inventory: ['Inventory', 'Plot-relevant items only. Off by default.', 'fa-bag-shopping'],
    locations: ['Offscreen Characters', 'Established whereabouts that may matter soon.', 'fa-location-dot'],
    gmNotes: ['GM Notes', 'Standing player instructions and corrections.', 'fa-bookmark'],
};

let initialized = false;
let observer = null;

function trackers() {
    return globalThis.SnowBunny?.trackers ?? null;
}

function storyTracker() {
    return globalThis.SnowBunny?.storyTracker ?? null;
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
    position: fixed; z-index: 12140; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor);
  }
  #${WORKSPACE_ID} .snowbunny-agents-header {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-agents-header h2 { flex: 1; margin: 0; font-size: 1.04rem; }
  #${WORKSPACE_ID} .snowbunny-agents-header button {
    min-width: 40px; min-height: 40px; border: 0; border-radius: 13px; background: transparent; color: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-agents-body {
    flex: 1; min-height: 0; overflow-y: auto; padding: 13px 14px calc(22px + env(safe-area-inset-bottom));
  }
  #${WORKSPACE_ID} .snowbunny-agent-intro {
    margin-bottom: 12px; padding: 13px 14px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 18px; background: linear-gradient(145deg, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 9%, transparent), color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent));
  }
  #${WORKSPACE_ID} .snowbunny-agent-intro strong { display: block; font-size: .9rem; }
  #${WORKSPACE_ID} .snowbunny-agent-intro small { display: block; margin-top: 4px; font-size: .7rem; line-height: 1.42; opacity: .62; }
  #${WORKSPACE_ID} .snowbunny-agent-card {
    overflow: hidden; margin: 9px 0; border: 1px solid color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 25%, var(--SmartThemeBorderColor));
    border-radius: 20px; background: radial-gradient(circle at 90% 0%, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent), transparent 42%), color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-agent-card-top { display: flex; align-items: center; gap: 10px; padding: 12px; }
  #${WORKSPACE_ID} .snowbunny-agent-icon {
    width: 44px; height: 44px; flex: 0 0 44px; display: flex; align-items: center; justify-content: center;
    border-radius: 15px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); font-size: 1.05rem;
  }
  #${WORKSPACE_ID} .snowbunny-agent-copy { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .snowbunny-agent-copy strong,
  #${WORKSPACE_ID} .snowbunny-agent-copy small { display: block; }
  #${WORKSPACE_ID} .snowbunny-agent-copy strong { font-size: .88rem; }
  #${WORKSPACE_ID} .snowbunny-agent-copy small { margin-top: 3px; font-size: .68rem; line-height: 1.35; opacity: .58; }
  #${WORKSPACE_ID} .snowbunny-agent-toggle { position: relative; width: 48px; height: 28px; flex: 0 0 48px; }
  #${WORKSPACE_ID} .snowbunny-agent-toggle input { position: absolute; opacity: 0; pointer-events: none; }
  #${WORKSPACE_ID} .snowbunny-agent-toggle span {
    position: absolute; inset: 0; border-radius: 999px; background: color-mix(in srgb, currentColor 16%, transparent); transition: background 140ms ease;
  }
  #${WORKSPACE_ID} .snowbunny-agent-toggle span::after {
    content: ''; position: absolute; width: 22px; height: 22px; left: 3px; top: 3px; border-radius: 50%; background: currentColor; opacity: .74; transition: transform 140ms ease;
  }
  #${WORKSPACE_ID} .snowbunny-agent-toggle input:checked + span { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 35%, transparent); }
  #${WORKSPACE_ID} .snowbunny-agent-toggle input:checked + span::after { transform: translateX(20px); opacity: .96; }
  #${WORKSPACE_ID} .snowbunny-agent-status {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 0 11px 11px;
  }
  #${WORKSPACE_ID} .snowbunny-agent-status span {
    padding: 7px 9px; border-radius: 12px; background: color-mix(in srgb, currentColor 6%, transparent); font-size: .64rem; line-height: 1.3; opacity: .72;
  }
  #${WORKSPACE_ID} .snowbunny-agent-card-action {
    width: 100%; min-height: 42px; border: 0; border-top: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 46%, transparent);
    background: transparent; color: inherit; font-weight: 700; font-size: .72rem;
  }
  #${WORKSPACE_ID} .snowbunny-agent-section-title { margin: 16px 2px 7px; font-size: .76rem; font-weight: 760; opacity: .68; }
  #${WORKSPACE_ID} .snowbunny-agent-section-row {
    display: flex; align-items: center; gap: 10px; min-height: 58px; margin: 5px 0; padding: 8px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 16px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-agent-section-row > i { width: 28px; text-align: center; opacity: .72; }
  #${WORKSPACE_ID} .snowbunny-agent-section-copy { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .snowbunny-agent-section-copy strong,
  #${WORKSPACE_ID} .snowbunny-agent-section-copy small { display: block; }
  #${WORKSPACE_ID} .snowbunny-agent-section-copy strong { font-size: .8rem; }
  #${WORKSPACE_ID} .snowbunny-agent-section-copy small { margin-top: 2px; font-size: .66rem; line-height: 1.35; opacity: .55; }
  #${WORKSPACE_ID} .snowbunny-agent-check { width: 22px; height: 22px; }
  #${WORKSPACE_ID} .snowbunny-agent-actions { display: flex; gap: 8px; margin: 11px 0; }
  #${WORKSPACE_ID} .snowbunny-agent-actions button {
    flex: 1; min-height: 43px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent);
    border-radius: 14px; background: color-mix(in srgb, currentColor 6%, transparent); color: inherit; font-weight: 700;
  }
  #${WORKSPACE_ID} details.snowbunny-agent-advanced {
    margin-top: 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 16px; overflow: hidden;
  }
  #${WORKSPACE_ID} details.snowbunny-agent-advanced summary { padding: 11px 12px; cursor: pointer; font-size: .74rem; font-weight: 720; }
  #${WORKSPACE_ID} .snowbunny-agent-advanced-body { padding: 2px 11px 12px; }
  #${WORKSPACE_ID} .snowbunny-agent-field { display: grid; gap: 5px; margin: 9px 0; font-size: .68rem; font-weight: 680; opacity: .8; }
  #${WORKSPACE_ID} .snowbunny-agent-field input,
  #${WORKSPACE_ID} .snowbunny-agent-field textarea {
    box-sizing: border-box; width: 100%; min-height: 41px; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
    border-radius: 13px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 55%, transparent); color: inherit; font: inherit;
  }
  #${WORKSPACE_ID} .snowbunny-agent-field textarea { min-height: 92px; resize: vertical; }
}
@media (prefers-reduced-motion: reduce) {
  #${WORKSPACE_ID} .snowbunny-agent-toggle span,
  #${WORKSPACE_ID} .snowbunny-agent-toggle span::after { transition: none !important; }
}
`;
    document.head.append(style);
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
}

function workspace() {
    closeWorkspace();
    const root = el('div'); root.id = WORKSPACE_ID; document.body.append(root); return root;
}

function header(title, back) {
    const head = el('header', 'snowbunny-agents-header');
    const button = el('button'); button.type = 'button'; button.append(icon('fa-arrow-left')); button.setAttribute('aria-label', 'Back'); button.addEventListener('click', back);
    head.append(button, el('h2', '', title));
    return head;
}

function toggleControl(checked, onChange) {
    const label = el('label', 'snowbunny-agent-toggle');
    const input = el('input'); input.type = 'checkbox'; input.checked = Boolean(checked);
    const track = el('span');
    input.addEventListener('change', () => onChange(input.checked, input));
    label.append(input, track);
    return label;
}

function scrollToLatestState() {
    closeWorkspace();
    const panels = [...document.querySelectorAll('.snowbunny-story-state')];
    const latest = panels.at(-1);
    latest?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
}

async function openDetail() {
    const root = workspace();
    root.append(header('Story Tracker', openAgents));
    const body = el('main', 'snowbunny-agents-body');
    root.append(body);
    const state = await trackers()?.read?.() || { settings: { sections: {} } };
    const settings = state.settings || {};

    const intro = el('div', 'snowbunny-agent-intro');
    intro.append(el('strong', '', 'Current continuity, kept alive'), el('small', '', 'After a story reply, Story Tracker maintains the state that is easy for a writer to forget. The same state appears as the rich panel in chat and helps write the next reply.'));
    body.append(intro);

    const card = el('article', 'snowbunny-agent-card');
    const top = el('div', 'snowbunny-agent-card-top');
    const mark = el('div', 'snowbunny-agent-icon'); mark.append(icon('fa-sparkles'));
    const copy = el('div', 'snowbunny-agent-copy'); copy.append(el('strong', '', 'Story Tracker'), el('small', '', settings.automatic === false ? 'Off · historical panels stay readable' : 'On · updates after completed story replies'));
    const toggle = toggleControl(settings.automatic !== false, async (value, input) => {
        input.disabled = true;
        try {
            await trackers()?.setSettings?.({ automatic: value });
            if (value && !trackers()?.currentFromState?.(await trackers().read())) await storyTracker()?.regenerate?.();
            await storyTracker()?.routeCurrentState?.();
            void openDetail();
        } catch (error) {
            console.warn('[SnowBunny] Could not change Story Tracker state.', error);
            input.checked = !value;
            input.disabled = false;
        }
    });
    top.append(mark, copy, toggle); card.append(top);
    const status = el('div', 'snowbunny-agent-status');
    status.append(
        el('span', '', 'Below each tracked reply'),
        el('span', '', 'Helps the next story reply'),
        el('span', '', 'Time & Place in message header'),
        el('span', '', 'Current state is editable'),
    );
    card.append(status); body.append(card);

    body.append(el('div', 'snowbunny-agent-section-title', 'Tracked sections'));
    const draftSections = { ...(settings.sections || {}) };
    for (const [key, [title, description, iconName]] of Object.entries(SECTION_META)) {
        const row = el('label', 'snowbunny-agent-section-row');
        row.append(icon(iconName));
        const rowCopy = el('div', 'snowbunny-agent-section-copy'); rowCopy.append(el('strong', '', title), el('small', '', description));
        const input = el('input', 'snowbunny-agent-check'); input.type = 'checkbox'; input.checked = draftSections[key] === true;
        input.addEventListener('change', async () => {
            draftSections[key] = input.checked;
            input.disabled = true;
            try {
                await trackers()?.setSettings?.({ sections: { [key]: input.checked } });
            } finally {
                input.disabled = false;
            }
        });
        row.append(rowCopy, input); body.append(row);
    }

    const actions = el('div', 'snowbunny-agent-actions');
    const run = el('button', '', 'Update now'); run.type = 'button';
    run.addEventListener('click', async () => {
        run.disabled = true; run.textContent = 'Updating…';
        try { await storyTracker()?.regenerate?.(); run.textContent = 'Updated'; }
        catch (error) { console.warn('[SnowBunny] Story Tracker update failed.', error); run.disabled = false; run.textContent = 'Try again'; }
    });
    const current = el('button', '', 'Open current state'); current.type = 'button'; current.disabled = !(state.currentSnapshotId); current.addEventListener('click', scrollToLatestState);
    actions.append(run, current); body.append(actions);

    const advanced = el('details', 'snowbunny-agent-advanced');
    advanced.append(el('summary', '', 'Advanced'));
    const advancedBody = el('div', 'snowbunny-agent-advanced-body');
    const history = el('label', 'snowbunny-agent-field'); history.append(el('span', '', 'Recent story window'));
    const historyInput = el('input'); historyInput.type = 'number'; historyInput.min = '4'; historyInput.max = '80'; historyInput.value = String(settings.historyCount || 14); history.append(historyInput);
    const limit = el('label', 'snowbunny-agent-field'); limit.append(el('span', '', 'Tracker reply limit'));
    const limitInput = el('input'); limitInput.type = 'number'; limitInput.min = '900'; limitInput.max = '8000'; limitInput.step = '100'; limitInput.value = String(settings.replyLimit || 2600); limit.append(limitInput);
    const instructions = el('label', 'snowbunny-agent-field'); instructions.append(el('span', '', 'Additional tracker instructions'));
    const instructionInput = el('textarea'); instructionInput.value = settings.instructions || ''; instructions.append(instructionInput);
    const saveAdvanced = el('button', 'snowbunny-agent-card-action', 'Save advanced settings'); saveAdvanced.type = 'button';
    saveAdvanced.addEventListener('click', async () => {
        saveAdvanced.disabled = true;
        try {
            await trackers()?.setSettings?.({
                historyCount: Number(historyInput.value),
                replyLimit: Number(limitInput.value),
                instructions: instructionInput.value,
            });
            saveAdvanced.textContent = 'Saved';
        } catch (error) {
            console.warn('[SnowBunny] Could not save Story Tracker settings.', error);
            saveAdvanced.disabled = false; saveAdvanced.textContent = 'Try again';
        }
    });
    advancedBody.append(history, limit, instructions, saveAdvanced); advanced.append(advancedBody); body.append(advanced);
}

async function openAgents() {
    const root = workspace();
    root.append(header('Agents', closeWorkspace));
    const body = el('main', 'snowbunny-agents-body'); root.append(body);
    const intro = el('div', 'snowbunny-agent-intro');
    intro.append(el('strong', '', 'Quiet jobs that keep the story together'), el('small', '', 'Agents run focused support tasks around the story. Their normal controls stay simple; the machinery stays underneath.'));
    body.append(intro);
    const state = await trackers()?.read?.() || { settings: {} };
    const card = el('article', 'snowbunny-agent-card');
    const top = el('div', 'snowbunny-agent-card-top');
    const mark = el('div', 'snowbunny-agent-icon'); mark.append(icon('fa-sparkles'));
    const copy = el('div', 'snowbunny-agent-copy');
    copy.append(el('strong', '', 'Story Tracker'), el('small', '', state.settings?.automatic === false ? 'Off' : 'Updates after every story reply'));
    const toggle = toggleControl(state.settings?.automatic !== false, async (value, input) => {
        input.disabled = true;
        try {
            await trackers()?.setSettings?.({ automatic: value });
            if (value && !state.currentSnapshotId) await storyTracker()?.regenerate?.();
            await storyTracker()?.routeCurrentState?.();
            void openAgents();
        } catch (error) {
            console.warn('[SnowBunny] Could not toggle Story Tracker.', error);
            input.checked = !value; input.disabled = false;
        }
    });
    top.append(mark, copy, toggle); card.append(top);
    const status = el('div', 'snowbunny-agent-status');
    status.append(el('span', '', 'Rich Story State panel'), el('span', '', 'Current state feeds the writer'));
    card.append(status);
    const edit = el('button', 'snowbunny-agent-card-action', 'Open Story Tracker'); edit.type = 'button'; edit.addEventListener('click', () => void openDetail());
    card.append(edit); body.append(card);

    const note = el('div', 'snowbunny-agent-intro');
    note.append(el('strong', '', 'Agent engine expansion'), el('small', '', 'Time & Place is already projected from Story Tracker without an extra model call. Pocket Phone Upkeep and Custom Agents will join this surface as their native engines are ported.'));
    body.append(note);
}

function agentsRow() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Agents',
    ) ?? null;
}

async function enhanceRow() {
    const row = agentsRow();
    if (!(row instanceof HTMLButtonElement)) return;
    const state = await trackers()?.read?.();
    const value = row.querySelector('.snowbunny-shell-row-value');
    if (value) value.textContent = state?.settings?.automatic === false ? 'Off' : '1 active';
    row.disabled = false;
    row.setAttribute('aria-disabled', 'false');
    if (row.dataset.snowbunnyAgents === '1') return;
    row.dataset.snowbunnyAgents = '1';
    row.addEventListener('click', () => void openAgents());
}

function registerEvents() {
    document.addEventListener('snowbunny:tracker-state-changed', () => void enhanceRow());
    document.addEventListener('snowbunny:shell-open', () => void enhanceRow());
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.getElementById(WORKSPACE_ID)) {
            event.preventDefault(); closeWorkspace();
        }
    }, true);
}

export function initAgentsUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    void enhanceRow();
    registerEvents();
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(() => void enhanceRow());
        observer.observe(drawer, { childList: true, subtree: true });
    }
}
