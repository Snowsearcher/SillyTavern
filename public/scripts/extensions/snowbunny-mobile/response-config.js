const WORKSPACE_ID = 'snowbunny-response-config';
const STYLE_ID = 'snowbunny-response-config-style';

let initialized = false;

const CHAT_COMPLETION_CONTROLS = [
    ['Temperature', 'How adventurous token selection can be.', '#temp_openai'],
    ['Top P', 'Keep probability mass inside this nucleus.', '#top_p_openai'],
    ['Top K', 'Limit selection to the top K candidates when supported.', '#top_k_openai'],
    ['Min P', 'Drop tokens below a probability floor when supported.', '#min_p_openai'],
    ['Frequency penalty', 'Discourage repeating tokens based on how often they appeared.', '#freq_pen_openai'],
    ['Presence penalty', 'Discourage returning to tokens that already appeared.', '#pres_pen_openai'],
    ['Repetition penalty', 'Provider-specific repetition control when supported.', '#repetition_penalty_openai'],
];

const TEXT_COMPLETION_CONTROLS = [
    ['Temperature', 'How adventurous token selection can be.', '#temp'],
    ['Top P', 'Keep probability mass inside this nucleus.', '#top_p'],
    ['Top K', 'Limit selection to the top K candidates.', '#top_k'],
    ['Min P', 'Drop tokens below a probability floor.', '#min_p'],
    ['Repetition penalty', 'Discourage repetitive token patterns.', '#rep_pen'],
];

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

function currentProvider() {
    const api = context();
    if (api?.mainApi !== 'openai') return String(api?.textCompletionSettings?.type || api?.mainApi || 'Text Completion');
    return String(api?.chatCompletionSettings?.chat_completion_source || 'Chat Completion');
}

function providerAllows(control) {
    const source = control?.closest?.('[data-source]')?.getAttribute?.('data-source');
    if (!source) return true;
    return source.split(',').map(value => value.trim()).includes(currentProvider());
}

function canonicalControl(selector) {
    const control = document.querySelector(selector);
    return control instanceof HTMLInputElement || control instanceof HTMLSelectElement ? control : null;
}

function dispatchCanonical(control, value) {
    if (!control) return;
    if (control instanceof HTMLInputElement && control.type === 'checkbox') {
        control.checked = Boolean(value);
    } else {
        control.value = String(value);
    }
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${WORKSPACE_ID} {
    position: fixed; z-index: 12360; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor);
  }
  #${WORKSPACE_ID} .snowbunny-response-head {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-response-head h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.02rem; }
  #${WORKSPACE_ID} .snowbunny-response-head button { width: 42px; height: 42px; border: 0; border-radius: 13px; background: transparent; color: inherit; }
  #${WORKSPACE_ID} .snowbunny-response-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px calc(24px + env(safe-area-inset-bottom)); }
  #${WORKSPACE_ID} .snowbunny-response-hero {
    margin-bottom: 12px; padding: 12px 13px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 18px; background: linear-gradient(145deg, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 11%, transparent), color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent));
  }
  #${WORKSPACE_ID} .snowbunny-response-hero strong { display: block; font-size: .9rem; }
  #${WORKSPACE_ID} .snowbunny-response-hero small { display: block; margin-top: 4px; font-size: .69rem; line-height: 1.42; opacity: .62; }
  #${WORKSPACE_ID} .snowbunny-response-section-title { margin: 16px 2px 7px; font-size: .75rem; font-weight: 760; opacity: .68; }
  #${WORKSPACE_ID} .snowbunny-response-card {
    margin: 7px 0; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 55%, transparent);
    border-radius: 17px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent);
  }
  #${WORKSPACE_ID} .snowbunny-response-copy { display: flex; align-items: baseline; gap: 8px; }
  #${WORKSPACE_ID} .snowbunny-response-copy strong { flex: 1; min-width: 0; font-size: .81rem; }
  #${WORKSPACE_ID} .snowbunny-response-copy output { font-size: .72rem; font-weight: 720; opacity: .72; }
  #${WORKSPACE_ID} .snowbunny-response-help { margin: 3px 0 9px; font-size: .65rem; line-height: 1.38; opacity: .53; }
  #${WORKSPACE_ID} .snowbunny-response-range { display: grid; grid-template-columns: minmax(0, 1fr) 82px; gap: 8px; align-items: center; }
  #${WORKSPACE_ID} input[type="range"] { width: 100%; accent-color: var(--SmartThemeEmColor, #c7a8ff); }
  #${WORKSPACE_ID} input[type="number"], #${WORKSPACE_ID} select {
    box-sizing: border-box; width: 100%; min-height: 40px; padding: 7px 9px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent);
    border-radius: 12px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent); color: inherit; font: inherit; font-size: .74rem;
  }
  #${WORKSPACE_ID} .snowbunny-response-toggle { display: flex; align-items: center; gap: 10px; min-height: 48px; }
  #${WORKSPACE_ID} .snowbunny-response-toggle-copy { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .snowbunny-response-toggle-copy strong, #${WORKSPACE_ID} .snowbunny-response-toggle-copy small { display: block; }
  #${WORKSPACE_ID} .snowbunny-response-toggle-copy strong { font-size: .8rem; }
  #${WORKSPACE_ID} .snowbunny-response-toggle-copy small { margin-top: 3px; font-size: .65rem; line-height: 1.35; opacity: .53; }
  #${WORKSPACE_ID} .snowbunny-response-toggle input { width: 21px; height: 21px; }
  #${WORKSPACE_ID} .snowbunny-response-action {
    width: 100%; min-height: 44px; margin-top: 9px; padding: 8px 11px; border: 0; border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent); color: inherit; font-weight: 730;
  }
  #${WORKSPACE_ID} details { margin-top: 13px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent); border-radius: 16px; overflow: hidden; }
  #${WORKSPACE_ID} details summary { padding: 11px 12px; cursor: pointer; font-size: .74rem; font-weight: 730; }
  #${WORKSPACE_ID} .snowbunny-response-advanced { padding: 0 10px 10px; }
  #${WORKSPACE_ID} .snowbunny-response-empty { padding: 22px 12px; text-align: center; font-size: .72rem; line-height: 1.45; opacity: .58; }
}
`;
    document.head.append(style);
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
}

function makeHeader() {
    const head = el('header', 'snowbunny-response-head');
    head.append(icon('fa-sliders'), el('h2', '', 'AI Response'));
    const close = el('button'); close.type = 'button'; close.title = 'Close'; close.setAttribute('aria-label', 'Close AI Response'); close.append(icon('fa-xmark')); close.addEventListener('click', closeWorkspace);
    head.append(close);
    return head;
}

function numberPair(label, help, selector) {
    const canonical = canonicalControl(selector);
    if (!(canonical instanceof HTMLInputElement) || !providerAllows(canonical)) return null;
    const card = el('section', 'snowbunny-response-card');
    const copy = el('div', 'snowbunny-response-copy');
    const output = el('output', '', canonical.value);
    copy.append(el('strong', '', label), output);
    card.append(copy, el('div', 'snowbunny-response-help', help));
    const row = el('div', 'snowbunny-response-range');
    const range = el('input'); range.type = 'range';
    const number = el('input'); number.type = 'number';
    for (const input of [range, number]) {
        if (canonical.min !== '') input.min = canonical.min;
        if (canonical.max !== '') input.max = canonical.max;
        if (canonical.step !== '') input.step = canonical.step;
        input.value = canonical.value;
    }
    const apply = value => {
        dispatchCanonical(canonical, value);
        range.value = canonical.value;
        number.value = canonical.value;
        output.value = canonical.value;
        output.textContent = canonical.value;
    };
    range.addEventListener('input', () => apply(range.value));
    number.addEventListener('change', () => apply(number.value));
    row.append(range, number); card.append(row);
    return card;
}

function selectCard(label, help, selector) {
    const canonical = canonicalControl(selector);
    if (!(canonical instanceof HTMLSelectElement) || !providerAllows(canonical)) return null;
    const card = el('section', 'snowbunny-response-card');
    const copy = el('div', 'snowbunny-response-copy'); copy.append(el('strong', '', label));
    card.append(copy, el('div', 'snowbunny-response-help', help));
    const select = el('select');
    for (const option of canonical.options) {
        const copyOption = new Option(option.textContent?.trim() || option.value, option.value, false, option.value === canonical.value);
        copyOption.disabled = option.disabled;
        select.append(copyOption);
    }
    select.value = canonical.value;
    select.addEventListener('change', () => dispatchCanonical(canonical, select.value));
    card.append(select);
    return card;
}

function checkboxCard(label, help, selectors) {
    const canonical = selectors.map(canonicalControl).find(control => control instanceof HTMLInputElement && control.type === 'checkbox');
    if (!(canonical instanceof HTMLInputElement) || !providerAllows(canonical)) return null;
    const card = el('section', 'snowbunny-response-card');
    const row = el('label', 'snowbunny-response-toggle');
    const copy = el('span', 'snowbunny-response-toggle-copy'); copy.append(el('strong', '', label), el('small', '', help));
    const input = el('input'); input.type = 'checkbox'; input.checked = canonical.checked;
    input.addEventListener('change', () => dispatchCanonical(canonical, input.checked));
    row.append(copy, input); card.append(row); return card;
}

function openNativeAllControls() {
    closeWorkspace();
    const wrapper = document.getElementById('ai-config-button');
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
}

function openWorkspace() {
    closeWorkspace();
    const root = el('div'); root.id = WORKSPACE_ID; root.append(makeHeader());
    const body = el('main', 'snowbunny-response-body');
    const api = context();
    const provider = currentProvider();
    const hero = el('div', 'snowbunny-response-hero');
    hero.append(
        el('strong', '', api?.mainApi === 'openai' ? `Chat Completion · ${provider}` : `Text Completion · ${provider}`),
        el('small', '', 'These are SillyTavern’s real generation controls. SnowBunny only gives them a phone-friendly surface, so the value shown here is the same setting ST saves and sends to the model.'),
    );
    body.append(hero);

    body.append(el('div', 'snowbunny-response-section-title', 'Length & context'));
    const response = numberPair('Response length', 'Maximum response tokens for ordinary story generations.', '#amount_gen');
    const contextSize = numberPair('Context size', 'Maximum prompt context before fitting/truncation.', '#max_context');
    if (response) body.append(response);
    if (contextSize) body.append(contextSize);

    body.append(el('div', 'snowbunny-response-section-title', 'Sampling'));
    const controls = api?.mainApi === 'openai' ? CHAT_COMPLETION_CONTROLS : TEXT_COMPLETION_CONTROLS;
    let samplingCount = 0;
    for (const [label, help, selector] of controls) {
        const card = numberPair(label, help, selector);
        if (card) { body.append(card); samplingCount++; }
    }
    if (!samplingCount) body.append(el('div', 'snowbunny-response-empty', 'This backend does not expose the usual sampling controls in the current SillyTavern configuration.'));

    if (api?.mainApi === 'openai') {
        body.append(el('div', 'snowbunny-response-section-title', 'Reasoning'));
        const reasoning = selectCard('Reasoning effort', 'Use the provider/model reasoning level supported by SillyTavern.', '#openai_reasoning_effort');
        const verbosity = selectCard('Verbosity', 'Preferred response verbosity where the provider supports it.', '#openai_verbosity');
        const thoughts = checkboxCard('Show reasoning', 'Ask compatible providers to return reasoning/thought content when supported.', ['#openai_show_thoughts']);
        if (reasoning) body.append(reasoning);
        if (verbosity) body.append(verbosity);
        if (thoughts) body.append(thoughts);
    }

    body.append(el('div', 'snowbunny-response-section-title', 'Delivery'));
    const streaming = checkboxCard('Streaming', 'Show the reply as it arrives instead of waiting for the complete response.', ['#streaming_openai', '#streaming_textgenerationwebui', '#streaming_kobold', '#streaming_novel']);
    if (streaming) body.append(streaming);

    const advanced = el('details'); advanced.append(el('summary', '', 'Advanced / provider-specific controls'));
    const advancedBody = el('div', 'snowbunny-response-advanced');
    advancedBody.append(
        el('div', 'snowbunny-response-help', 'SillyTavern has many provider-specific controls. They stay canonical and available while SnowBunny replaces the remaining desktop-oriented pieces instead of hiding capability.'),
    );
    const all = el('button', 'snowbunny-response-action', 'Open all current ST controls'); all.type = 'button'; all.addEventListener('click', openNativeAllControls); advancedBody.append(all); advanced.append(advancedBody); body.append(advanced);

    root.append(body); document.body.append(root);
}

function onTopClick(event) {
    const button = event.target instanceof Element ? event.target.closest('#snowbunny-top-strip .snowbunny-top-action[aria-label="Response"]') : null;
    if (!(button instanceof HTMLElement) || !document.body.classList.contains('snowbunny-mobile')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openWorkspace();
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(WORKSPACE_ID)) {
        event.preventDefault();
        closeWorkspace();
    }
}

export function initResponseConfig() {
    if (initialized) return;
    initialized = true;
    installStyles();
    document.addEventListener('click', onTopClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = { ...existing, responseConfig: { open: openWorkspace } };
}
