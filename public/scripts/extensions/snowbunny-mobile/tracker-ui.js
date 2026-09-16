const STYLE_ID = 'snowbunny-tracker-ui-style';
const EDITOR_ID = 'snowbunny-tracker-editor';
const PANEL_CLASS = 'snowbunny-story-state';
const TIME_CLASS = 'snowbunny-time-place';
const SECTION_ORDER = ['thoughts', 'relationships', 'scene', 'threads', 'secrets', 'conditions', 'inventory', 'locations', 'gmNotes'];
const SECTION_META = {
    thoughts: ['Thoughts', 'fa-brain', 'pink'],
    relationships: ['Relationships', 'fa-heart', 'green'],
    scene: ['Scene', 'fa-masks-theater', 'blue'],
    threads: ['Threads', 'fa-route', 'gold'],
    secrets: ['Secrets', 'fa-lock', 'violet'],
    conditions: ['Conditions', 'fa-bandage', 'red'],
    inventory: ['Inventory', 'fa-bag-shopping', 'amber'],
    locations: ['Offscreen Characters', 'fa-location-dot', 'cyan'],
    gmNotes: ['GM Notes', 'fa-bookmark', 'indigo'],
};

let initialized = false;
let rendering = false;
let renderQueued = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

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
  .${TIME_CLASS} {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    max-width: calc(100% - 12px);
    margin: 2px 5px 8px;
    padding: 6px 9px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 28%, transparent);
    border-radius: 12px;
    background: linear-gradient(120deg,
      color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, transparent),
      color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent));
    font-size: .68rem;
    line-height: 1.35;
    opacity: .88;
  }
  .${TIME_CLASS} i { flex: 0 0 auto; opacity: .74; }
  .${TIME_CLASS} span { min-width: 0; white-space: pre-wrap; }

  .${PANEL_CLASS} {
    --sb-tracker-accent: var(--SmartThemeEmColor, #c7a8ff);
    margin: 12px 3px 8px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--sb-tracker-accent) 30%, var(--SmartThemeBorderColor));
    border-radius: 20px;
    background:
      radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--sb-tracker-accent) 12%, transparent), transparent 40%),
      linear-gradient(155deg,
        color-mix(in srgb, var(--SmartThemeBlurTintColor) 78%, transparent),
        color-mix(in srgb, var(--SmartThemeBlurTintColor) 55%, #0c0c12 10%));
    box-shadow: 0 10px 26px rgb(0 0 0 / 15%);
  }
  .${PANEL_CLASS}.stale { opacity: .67; filter: saturate(.76); }
  .snowbunny-story-state-header {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 52px;
    padding: 9px 9px 9px 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent);
  }
  .snowbunny-story-state-mark {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: color-mix(in srgb, var(--sb-tracker-accent) 17%, transparent);
  }
  .snowbunny-story-state-heading { flex: 1; min-width: 0; }
  .snowbunny-story-state-heading strong,
  .snowbunny-story-state-heading small { display: block; }
  .snowbunny-story-state-heading strong { font-size: .8rem; letter-spacing: .015em; }
  .snowbunny-story-state-heading small { margin-top: 2px; font-size: .62rem; opacity: .52; }
  .snowbunny-story-state-action {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    opacity: .66;
  }
  .snowbunny-story-state-action:active { background: color-mix(in srgb, currentColor 9%, transparent); opacity: .94; }
  .snowbunny-story-state-sections { padding: 7px 8px 9px; }
  .snowbunny-story-state-section {
    --section-accent: var(--sb-tracker-accent);
    margin: 5px 0;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--section-accent) 21%, var(--SmartThemeBorderColor));
    border-radius: 15px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 56%, transparent);
  }
  .snowbunny-story-state-section[data-tone="pink"] { --section-accent: #ef80bb; }
  .snowbunny-story-state-section[data-tone="green"] { --section-accent: #83d7aa; }
  .snowbunny-story-state-section[data-tone="blue"] { --section-accent: #82b7f2; }
  .snowbunny-story-state-section[data-tone="gold"] { --section-accent: #e7bf73; }
  .snowbunny-story-state-section[data-tone="violet"] { --section-accent: #b89bf2; }
  .snowbunny-story-state-section[data-tone="red"] { --section-accent: #e58c91; }
  .snowbunny-story-state-section[data-tone="amber"] { --section-accent: #dfac68; }
  .snowbunny-story-state-section[data-tone="cyan"] { --section-accent: #74cbd5; }
  .snowbunny-story-state-section[data-tone="indigo"] { --section-accent: #9299e8; }
  .snowbunny-story-state-section summary {
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    cursor: pointer;
    list-style: none;
    font-size: .72rem;
    font-weight: 730;
  }
  .snowbunny-story-state-section summary::-webkit-details-marker { display: none; }
  .snowbunny-story-state-section summary > i:first-child {
    width: 24px;
    text-align: center;
    color: var(--section-accent);
  }
  .snowbunny-story-state-section summary .snowbunny-state-chevron { margin-left: auto; opacity: .38; transition: transform 140ms ease; }
  .snowbunny-story-state-section[open] summary .snowbunny-state-chevron { transform: rotate(90deg); }
  .snowbunny-story-state-copy {
    padding: 1px 11px 11px 42px;
    font-size: .72rem;
    line-height: 1.53;
    overflow-wrap: anywhere;
  }
  .snowbunny-story-state-copy p:first-child { margin-top: 0; }
  .snowbunny-story-state-copy p:last-child { margin-bottom: 0; }
  .snowbunny-story-state-warning {
    margin: 0 8px 8px;
    padding: 8px 10px;
    border-radius: 12px;
    background: color-mix(in srgb, #c96a70 12%, transparent);
    font-size: .66rem;
    line-height: 1.4;
  }

  #${EDITOR_ID} {
    position: fixed;
    z-index: 12220;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${EDITOR_ID} .snowbunny-tracker-editor-card {
    width: min(100%, 680px);
    max-height: 92dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 74%, transparent);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #101014 2%);
    color: var(--SmartThemeBodyColor);
    box-shadow: 0 -18px 56px rgb(0 0 0 / 38%);
  }
  #${EDITOR_ID} .snowbunny-tracker-editor-handle { width: 38px; height: 4px; margin: 8px auto 2px; border-radius: 999px; background: currentColor; opacity: .24; }
  #${EDITOR_ID} .snowbunny-tracker-editor-head {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px 9px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
  }
  #${EDITOR_ID} .snowbunny-tracker-editor-head h3 { flex: 1; margin: 0; font-size: .98rem; }
  #${EDITOR_ID} .snowbunny-tracker-editor-head button {
    min-width: 40px; min-height: 38px; padding: 6px 10px; border: 0; border-radius: 12px;
    background: transparent; color: inherit; font-weight: 700;
  }
  #${EDITOR_ID} .snowbunny-tracker-editor-save { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent) !important; }
  #${EDITOR_ID} .snowbunny-tracker-editor-body { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 13px calc(16px + env(safe-area-inset-bottom)); }
  #${EDITOR_ID} .snowbunny-tracker-editor-note { margin: 0 2px 10px; font-size: .69rem; line-height: 1.42; opacity: .6; }
  #${EDITOR_ID} .snowbunny-tracker-editor-field { display: grid; gap: 5px; margin: 10px 0; }
  #${EDITOR_ID} .snowbunny-tracker-editor-field > span { font-size: .7rem; font-weight: 720; opacity: .72; }
  #${EDITOR_ID} textarea {
    box-sizing: border-box; width: 100%; min-height: 92px; resize: vertical; padding: 9px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
    color: inherit; font: inherit; font-size: .76rem; line-height: 1.45;
  }
  #${EDITOR_ID} textarea.snowbunny-tracker-time { min-height: 66px; }
  #${EDITOR_ID} .snowbunny-tracker-editor-foot { display: flex; gap: 8px; margin-top: 14px; }
  #${EDITOR_ID} .snowbunny-tracker-editor-foot button {
    flex: 1; min-height: 42px; border: 0; border-radius: 13px; background: color-mix(in srgb, currentColor 7%, transparent); color: inherit; font-weight: 680;
  }
}
@media (prefers-reduced-motion: reduce) {
  .snowbunny-story-state-section summary .snowbunny-state-chevron { transition: none !important; }
}
`;
    document.head.append(style);
}

function disclosureState() {
    const global = globalThis.SnowBunny?.state?.readGlobal?.() || {};
    return global.trackerDisclosure && typeof global.trackerDisclosure === 'object' ? global.trackerDisclosure : {};
}

function saveDisclosure(key, open) {
    const next = { ...disclosureState(), [key]: Boolean(open) };
    globalThis.SnowBunny?.state?.patchGlobal?.({ trackerDisclosure: next });
}

function safeMarkdown(host, text, messageIndex) {
    const api = context();
    try {
        if (typeof api?.messageFormatting === 'function') {
            host.innerHTML = api.messageFormatting(String(text || ''), 'Story State', true, false, messageIndex);
            return;
        }
    } catch (_) {
        // Fall through to text-only rendering.
    }
    host.textContent = String(text || '');
}

function messageIdentity(message) {
    return globalThis.SnowBunny?.identity?.current?.(message) || message?.extra?.snowbunny || {};
}

function snapshotMap(state) {
    const map = new Map();
    for (const snapshot of state?.snapshots || []) {
        const messageId = snapshot?.source?.message?.id;
        if (!messageId) continue;
        const existing = map.get(messageId);
        if (!existing || (snapshot.updatedAt || 0) >= (existing.updatedAt || 0)) map.set(messageId, snapshot);
    }
    return map;
}

function currentId(state) {
    return String(state?.currentSnapshotId || '');
}

function removeProjectedState() {
    document.querySelectorAll(`.${PANEL_CLASS}, .${TIME_CLASS}`).forEach(node => node.remove());
}

function makeTimePlace(snapshot) {
    if (!snapshot.timePlace) return null;
    const host = el('div', TIME_CLASS);
    host.dataset.snowbunnyTrackerSnapshot = snapshot.id;
    host.append(icon('fa-clock'), el('span', '', snapshot.timePlace));
    return host;
}

function makeSection(key, text, messageIndex) {
    const [label, iconName, tone] = SECTION_META[key];
    const details = el('details', 'snowbunny-story-state-section');
    details.dataset.section = key;
    details.dataset.tone = tone;
    details.open = disclosureState()[key] === true;
    const summary = el('summary');
    summary.append(icon(iconName), el('span', '', label), icon('fa-chevron-right'));
    summary.lastElementChild.classList.add('snowbunny-state-chevron');
    const copy = el('div', 'snowbunny-story-state-copy');
    safeMarkdown(copy, text, messageIndex);
    details.append(summary, copy);
    details.addEventListener('toggle', () => saveDisclosure(key, details.open));
    return details;
}

function closeEditor() {
    document.getElementById(EDITOR_ID)?.remove();
}

async function openEditor(snapshot) {
    closeEditor();
    const trackerApi = trackers();
    const state = await trackerApi?.read?.({ fresh: true });
    const current = trackerApi?.currentFromState?.(state);
    if (!current || current.id !== snapshot.id || !trackerApi.snapshotStillValid(current)) return;

    const overlay = el('div');
    overlay.id = EDITOR_ID;
    const card = el('section', 'snowbunny-tracker-editor-card');
    card.append(el('div', 'snowbunny-tracker-editor-handle'));
    const head = el('header', 'snowbunny-tracker-editor-head');
    const cancel = el('button', '', 'Cancel'); cancel.type = 'button'; cancel.addEventListener('click', closeEditor);
    const title = el('h3', '', 'Edit current Story State');
    const save = el('button', 'snowbunny-tracker-editor-save', 'Save'); save.type = 'button';
    head.append(cancel, title, save); card.append(head);
    const body = el('div', 'snowbunny-tracker-editor-body');
    body.append(el('div', 'snowbunny-tracker-editor-note', 'This exact edited state will help write the next reply and becomes the tracker’s starting point on its next update. The generated version is kept for audit/undo.'));

    const inputs = new Map();
    const timeLabel = el('label', 'snowbunny-tracker-editor-field');
    timeLabel.append(el('span', '', 'Time & Place'));
    const time = el('textarea', 'snowbunny-tracker-time'); time.value = current.timePlace || ''; timeLabel.append(time); body.append(timeLabel);

    for (const key of SECTION_ORDER) {
        const enabled = state.settings?.sections?.[key] === true;
        const value = String(current.sections?.[key] || '');
        if (!enabled && !value) continue;
        const label = el('label', 'snowbunny-tracker-editor-field');
        label.append(el('span', '', SECTION_META[key][0]));
        const input = el('textarea'); input.value = value; label.append(input); body.append(label); inputs.set(key, input);
    }

    const foot = el('div', 'snowbunny-tracker-editor-foot');
    const generated = el('button', '', 'Restore generated');
    generated.type = 'button';
    generated.disabled = !current.generatedOriginal;
    generated.addEventListener('click', async () => {
        generated.disabled = true;
        await trackerApi.resetCurrentToGenerated();
        closeEditor();
        queueRender();
    });
    const regenerate = el('button', '', 'Regenerate state');
    regenerate.type = 'button';
    regenerate.addEventListener('click', async () => {
        regenerate.disabled = true;
        regenerate.textContent = 'Updating…';
        try {
            await storyTracker()?.regenerate?.();
            closeEditor();
            queueRender();
        } catch (error) {
            regenerate.disabled = false;
            regenerate.textContent = 'Try again';
            console.warn('[SnowBunny] Could not regenerate Story State.', error);
        }
    });
    foot.append(generated, regenerate); body.append(foot); card.append(body); overlay.append(card);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) closeEditor(); });
    document.body.append(overlay);

    save.addEventListener('click', async () => {
        save.disabled = true;
        try {
            const sections = { ...current.sections };
            for (const [key, input] of inputs) sections[key] = input.value;
            await trackerApi.editCurrent({ timePlace: time.value, sections });
            closeEditor();
            queueRender();
        } catch (error) {
            console.warn('[SnowBunny] Could not save edited Story State.', error);
            save.disabled = false;
            save.textContent = 'Try again';
        }
    });
}

function makePanel(snapshot, { isCurrent = false, messageIndex = 0 } = {}) {
    const panel = el('section', PANEL_CLASS);
    panel.dataset.snowbunnyTrackerSnapshot = snapshot.id;
    if (snapshot.stale) panel.classList.add('stale');

    const header = el('header', 'snowbunny-story-state-header');
    const mark = el('div', 'snowbunny-story-state-mark'); mark.append(icon('fa-sparkles'));
    const heading = el('div', 'snowbunny-story-state-heading');
    heading.append(
        el('strong', '', 'Story State'),
        el('small', '', snapshot.stale
            ? 'Historical snapshot · source changed'
            : snapshot.manuallyEdited
                ? `Current continuity · edited revision ${snapshot.revision}`
                : isCurrent ? 'Current continuity · helps the next reply' : 'Historical continuity snapshot'),
    );
    header.append(mark, heading);
    if (isCurrent && !snapshot.stale) {
        const edit = el('button', 'snowbunny-story-state-action'); edit.type = 'button'; edit.title = 'Edit current Story State'; edit.setAttribute('aria-label', edit.title); edit.append(icon('fa-pencil'));
        edit.addEventListener('click', event => { event.stopPropagation(); void openEditor(snapshot); });
        header.append(edit);
    }
    panel.append(header);

    const sections = el('div', 'snowbunny-story-state-sections');
    for (const key of SECTION_ORDER) {
        const text = String(snapshot.sections?.[key] || '').trim();
        if (text) sections.append(makeSection(key, text, messageIndex));
    }
    if (sections.children.length) panel.append(sections);
    if (snapshot.stale) panel.append(el('div', 'snowbunny-story-state-warning', snapshot.staleReason || 'The story history behind this state changed. This snapshot is kept for audit but is no longer supplied to the writer.'));
    return panel;
}

async function renderAll() {
    renderQueued = false;
    if (rendering) return;
    rendering = true;
    try {
        const api = context();
        const state = await trackers()?.read?.();
        if (!state || !Array.isArray(api?.chat)) return;
        removeProjectedState();
        const byMessage = snapshotMap(state);
        for (const messageEl of document.querySelectorAll('#chat .mes:not([is_user="true"])')) {
            const index = Number.parseInt(messageEl.getAttribute('mesid') || '', 10);
            if (!Number.isInteger(index)) continue;
            const message = api.chat[index];
            if (!message || message.is_system) continue;
            const identity = messageIdentity(message);
            const snapshot = byMessage.get(identity.id);
            if (!snapshot) continue;
            const block = messageEl.querySelector('.mes_block');
            const text = messageEl.querySelector('.mes_text');
            if (!(block instanceof HTMLElement) || !(text instanceof HTMLElement)) continue;
            const time = makeTimePlace(snapshot);
            if (time) block.insertBefore(time, text);
            text.insertAdjacentElement('afterend', makePanel(snapshot, { isCurrent: snapshot.id === currentId(state) && !snapshot.stale, messageIndex: index }));
        }
    } finally {
        rendering = false;
    }
}

function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => void renderAll());
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_RECEIVED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED', 'MORE_MESSAGES_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => window.setTimeout(queueRender, 0));
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(EDITOR_ID)) {
        event.preventDefault();
        closeEditor();
    }
}

export function initTrackerUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    registerEvents();
    document.addEventListener('snowbunny:tracker-state-changed', queueRender);
    document.addEventListener('snowbunny:tracker-snapshot-ready', queueRender);
    document.addEventListener('keydown', onKeyDown, true);
    queueRender();
}
