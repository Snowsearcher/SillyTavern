const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SHEET_ID = 'snowbunny-action-sheet';
const STYLE_ID = 'snowbunny-scenario-style';
const PROMPT_KEY = 'snowbunny-scenario';

// SillyTavern's extension prompt constants. Keep the Scenario in the main
// prompt as a system instruction and out of World Info scans.
const IN_PROMPT = 0;
const SYSTEM_ROLE = 0;

const EMPTY_SCENARIO = Object.freeze({
    enabled: false,
    premise: '',
    focus: '',
    writerKnowledge: '',
    directions: '',
});

let initialized = false;
let observer = null;
let queued = false;

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
  #${SHEET_ID} .snowbunny-scenario-body {
    overflow-y: auto;
    padding: 10px 12px calc(16px + env(safe-area-inset-bottom));
  }
  #${SHEET_ID} .snowbunny-scenario-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 46px;
    margin-bottom: 9px;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 54%, transparent);
  }
  #${SHEET_ID} .snowbunny-scenario-toggle input { width: 20px; height: 20px; }
  #${SHEET_ID} .snowbunny-scenario-toggle-copy { flex: 1; min-width: 0; }
  #${SHEET_ID} .snowbunny-scenario-toggle-copy strong,
  #${SHEET_ID} .snowbunny-scenario-toggle-copy small { display: block; }
  #${SHEET_ID} .snowbunny-scenario-toggle-copy strong { font-size: .82rem; }
  #${SHEET_ID} .snowbunny-scenario-toggle-copy small { margin-top: 2px; font-size: .67rem; opacity: .56; }
  #${SHEET_ID} .snowbunny-scenario-field { margin: 9px 0; }
  #${SHEET_ID} .snowbunny-scenario-field label {
    display: block;
    margin: 0 4px 5px;
    font-size: .75rem;
    font-weight: 700;
  }
  #${SHEET_ID} .snowbunny-scenario-field small {
    display: block;
    margin: -2px 4px 6px;
    font-size: .65rem;
    line-height: 1.35;
    opacity: .52;
  }
  #${SHEET_ID} .snowbunny-scenario-field textarea {
    width: 100%;
    min-height: 92px;
    max-height: 260px;
    box-sizing: border-box;
    padding: 10px 11px;
    resize: vertical;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 68%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent);
    color: inherit;
    font: inherit;
    font-size: .8rem;
    line-height: 1.45;
  }
  #${SHEET_ID} .snowbunny-scenario-actions {
    position: sticky;
    bottom: 0;
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 8px;
    margin-top: 12px;
    padding-top: 9px;
    background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%) 28%);
  }
  #${SHEET_ID} .snowbunny-scenario-actions button {
    min-height: 44px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 64%, transparent);
    color: inherit;
    font-weight: 700;
  }
  #${SHEET_ID} .snowbunny-scenario-actions .primary {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 18%, transparent);
  }
}
`;
    document.head.append(style);
}

function currentScenario() {
    const value = snowState()?.readChat?.()?.scenario;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY_SCENARIO };
    return {
        enabled: value.enabled === true,
        premise: String(value.premise ?? ''),
        focus: String(value.focus ?? ''),
        writerKnowledge: String(value.writerKnowledge ?? ''),
        directions: String(value.directions ?? ''),
    };
}

function serializeScenario(scenario) {
    if (!scenario.enabled) return '';
    const rows = [
        ['Premise', scenario.premise],
        ['Genre and focus', scenario.focus],
        ['For the writer to know', scenario.writerKnowledge],
        ['Important directions', scenario.directions],
    ].filter(([, value]) => String(value).trim());
    if (!rows.length) return '';
    return `<scenario>\n${rows.map(([label, value]) => `${label}: ${String(value).trim()}`).join('\n\n')}\n</scenario>`;
}

function applyScenarioPrompt() {
    const api = context();
    if (typeof api?.setExtensionPrompt !== 'function') return;
    const text = serializeScenario(currentScenario());
    api.setExtensionPrompt(PROMPT_KEY, text, IN_PROMPT, 0, false, SYSTEM_ROLE);
    queueEnhance();
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function createField(id, label, help, value) {
    const host = el('div', 'snowbunny-scenario-field');
    const labelNode = el('label', '', label);
    labelNode.htmlFor = id;
    const helpNode = el('small', '', help);
    const textarea = el('textarea');
    textarea.id = id;
    textarea.value = value;
    textarea.spellcheck = true;
    host.append(labelNode, helpNode, textarea);
    return { host, textarea };
}

function openScenarioEditor() {
    closeSheet();
    const scenario = currentScenario();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-action-card');
    card.append(el('div', 'snowbunny-action-handle'));

    const header = el('header', 'snowbunny-action-header');
    header.append(el('h3', '', 'Scenario'));
    const close = el('button');
    close.type = 'button';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close Scenario');
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSheet);
    header.append(close);
    card.append(header);

    const body = el('div', 'snowbunny-scenario-body');
    const toggle = el('label', 'snowbunny-scenario-toggle');
    const checkbox = el('input');
    checkbox.type = 'checkbox';
    checkbox.checked = scenario.enabled;
    const toggleCopy = el('div', 'snowbunny-scenario-toggle-copy');
    toggleCopy.append(el('strong', '', 'Use this Scenario'), el('small', '', 'Supplies these story directions to the writer for this chat.'));
    toggle.append(checkbox, toggleCopy);
    body.append(toggle);

    const premise = createField(
        'snowbunny-scenario-premise',
        'What this story is about',
        'The central premise or situation the writer should keep in mind.',
        scenario.premise,
    );
    const focus = createField(
        'snowbunny-scenario-focus',
        'Genre and focus',
        'The kind of story this is and what the writing should pay attention to.',
        scenario.focus,
    );
    const knowledge = createField(
        'snowbunny-scenario-knowledge',
        'For the writer to know',
        'Useful hidden context for writing the story. This is not automatically character knowledge.',
        scenario.writerKnowledge,
    );
    const directions = createField(
        'snowbunny-scenario-directions',
        'Important directions',
        'Specific ongoing instructions that matter to this chat.',
        scenario.directions,
    );
    body.append(premise.host, focus.host, knowledge.host, directions.host);

    const actions = el('div', 'snowbunny-scenario-actions');
    const reset = el('button', '', 'Reset');
    reset.type = 'button';
    reset.addEventListener('click', () => {
        if (!window.confirm('Clear this chat’s Scenario?')) return;
        checkbox.checked = false;
        premise.textarea.value = '';
        focus.textarea.value = '';
        knowledge.textarea.value = '';
        directions.textarea.value = '';
    });
    const save = el('button', 'primary', 'Save Scenario');
    save.type = 'button';
    save.addEventListener('click', () => {
        const next = {
            enabled: checkbox.checked,
            premise: premise.textarea.value.trim(),
            focus: focus.textarea.value.trim(),
            writerKnowledge: knowledge.textarea.value.trim(),
            directions: directions.textarea.value.trim(),
        };
        snowState()?.patchChat?.({ scenario: next });
        applyScenarioPrompt();
        closeSheet();
    });
    actions.append(reset, save);
    body.append(actions);
    card.append(body);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);
}

function scenarioRow() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Scenario',
    );
}

function enhance() {
    queued = false;
    const row = scenarioRow();
    if (!(row instanceof HTMLButtonElement)) return;
    const scenario = currentScenario();
    const value = row.querySelector('.snowbunny-shell-row-value');
    if (value) value.textContent = scenario.enabled && serializeScenario(scenario) ? 'On' : 'Off';
    row.disabled = false;
    row.setAttribute('aria-disabled', 'false');
    if (row.dataset.snowbunnyScenario === '1') return;
    row.dataset.snowbunnyScenario = '1';
    row.addEventListener('click', openScenarioEditor);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    const refresh = () => window.setTimeout(() => {
        applyScenarioPrompt();
        queueEnhance();
    }, 0);
    if (types.CHAT_CHANGED) source.on(types.CHAT_CHANGED, refresh);
    if (types.CHAT_LOADED) source.on(types.CHAT_LOADED, refresh);
}

export function initScenario() {
    if (initialized) return;
    initialized = true;
    installStyles();
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueEnhance);
        observer.observe(drawer, { subtree: true, childList: true });
    }
    applyScenarioPrompt();
    enhance();
    registerEvents();
}
