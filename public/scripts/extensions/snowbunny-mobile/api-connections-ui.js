const WORKSPACE_ID = 'snowbunny-api-workspace';
const STYLE_ID = 'snowbunny-api-workspace-style';

const CHAT_MODELS = {
    openai: '#model_openai_select',
    claude: '#model_claude_select',
    openrouter: '#model_openrouter_select',
    ai21: '#model_ai21_select',
    makersuite: '#model_google_select',
    vertexai: '#model_vertexai_select',
    mistralai: '#model_mistralai_select',
    custom: '#custom_model_id',
    cohere: '#model_cohere_select',
    perplexity: '#model_perplexity_select',
    groq: '#model_groq_select',
    electronhub: '#model_electronhub_select',
    chutes: '#model_chutes_select',
    nanogpt: '#model_nanogpt_select',
    deepseek: '#model_deepseek_select',
    aimlapi: '#model_aimlapi_select',
    xai: '#model_xai_select',
    pollinations: '#model_pollinations_select',
    moonshot: '#model_moonshot_select',
    fireworks: '#model_fireworks_select',
    cometapi: '#model_cometapi_select',
    zai: '#model_zai_select',
    siliconflow: '#model_siliconflow_select',
    workers_ai: '#model_workers_ai_select',
    minimax: '#model_minimax_select',
};

let initialized = false;

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
  #${WORKSPACE_ID} { position: fixed; z-index: 12370; inset: 0; display: flex; flex-direction: column; overflow: hidden; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor); }
  #${WORKSPACE_ID} .snowbunny-api-head { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px; padding: calc(8px + env(safe-area-inset-top)) 10px 8px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent); }
  #${WORKSPACE_ID} .snowbunny-api-head h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.02rem; }
  #${WORKSPACE_ID} .snowbunny-api-head button { min-width: 42px; min-height: 42px; border: 0; border-radius: 13px; background: transparent; color: inherit; }
  #${WORKSPACE_ID} .snowbunny-api-body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px calc(24px + env(safe-area-inset-bottom)); }
  #${WORKSPACE_ID} .snowbunny-api-hero { margin-bottom: 12px; padding: 12px 13px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 18px; background: linear-gradient(145deg, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, transparent), color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent)); }
  #${WORKSPACE_ID} .snowbunny-api-hero strong, #${WORKSPACE_ID} .snowbunny-api-hero small { display: block; }
  #${WORKSPACE_ID} .snowbunny-api-hero strong { font-size: .9rem; }
  #${WORKSPACE_ID} .snowbunny-api-hero small { margin-top: 4px; font-size: .68rem; line-height: 1.4; opacity: .6; }
  #${WORKSPACE_ID} .snowbunny-api-field { display: grid; gap: 5px; margin: 10px 0; }
  #${WORKSPACE_ID} .snowbunny-api-field > span { font-size: .72rem; font-weight: 710; opacity: .76; }
  #${WORKSPACE_ID} select, #${WORKSPACE_ID} input { box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 57%, transparent); color: inherit; font: inherit; }
  #${WORKSPACE_ID} .snowbunny-api-note { margin: 9px 0; padding: 9px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent); border-radius: 14px; font-size: .68rem; line-height: 1.42; opacity: .64; }
  #${WORKSPACE_ID} .snowbunny-api-actions { display: grid; gap: 8px; margin-top: 13px; }
  #${WORKSPACE_ID} .snowbunny-api-action { min-height: 45px; padding: 8px 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 14px; background: color-mix(in srgb, currentColor 6%, transparent); color: inherit; font-weight: 730; }
  #${WORKSPACE_ID} .snowbunny-api-action.primary { border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 34%, transparent); background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 16%, transparent); }
  #${WORKSPACE_ID} .snowbunny-api-status { margin-top: 9px; min-height: 20px; font-size: .69rem; line-height: 1.4; opacity: .7; }
}
`;
    document.head.append(style);
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
}

function canonical(selector) {
    return document.querySelector(selector);
}

function dispatchChange(control) {
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
}

function cloneSelect(source) {
    const select = el('select');
    if (!(source instanceof HTMLSelectElement)) return select;
    for (const option of source.options) {
        const clone = new Option(option.textContent?.trim() || option.value, option.value, false, option.value === source.value);
        clone.disabled = option.disabled;
        select.append(clone);
    }
    select.value = source.value;
    return select;
}

function field(label, control) {
    const host = el('label', 'snowbunny-api-field');
    host.append(el('span', '', label), control);
    return host;
}

function currentProvider() {
    const source = canonical('#chat_completion_source');
    return source instanceof HTMLSelectElement ? source.value : '';
}

function providerForm(provider) {
    const escaped = globalThis.CSS?.escape ? CSS.escape(provider) : provider.replace(/[^a-zA-Z0-9_-]/g, '');
    return document.querySelector(`#openai_api [data-source="${escaped}"]`);
}

function providerKeyInput(provider) {
    const form = providerForm(provider);
    const local = form?.querySelector('input[id^="api_key_"]');
    if (local instanceof HTMLInputElement) return local;
    const direct = document.getElementById(`api_key_${provider}`);
    return direct instanceof HTMLInputElement ? direct : null;
}

function providerUrlInput(provider) {
    if (provider === 'custom') {
        const custom = document.getElementById('custom_api_url_text');
        return custom instanceof HTMLInputElement ? custom : null;
    }
    const form = providerForm(provider);
    const candidate = [...(form?.querySelectorAll('input') || [])].find(input => /url|endpoint|server/i.test(input.id || input.name || ''));
    return candidate instanceof HTMLInputElement ? candidate : null;
}

function providerModelControl(provider) {
    const selector = CHAT_MODELS[provider];
    return selector ? document.querySelector(selector) : null;
}

function modelChoices(control) {
    if (control instanceof HTMLSelectElement) {
        return [...control.options]
            .filter(option => option.value && !option.disabled)
            .map(option => ({ value: option.value, label: option.textContent?.trim() || option.value }));
    }
    if (control instanceof HTMLInputElement) {
        const listId = control.getAttribute('list');
        const datalist = listId ? document.getElementById(listId) : null;
        const choices = datalist instanceof HTMLDataListElement
            ? [...datalist.options].filter(option => option.value).map(option => ({ value: option.value, label: option.label || option.value }))
            : [];
        if (control.value && !choices.some(item => item.value === control.value)) choices.unshift({ value: control.value, label: control.value });
        return choices;
    }
    return [];
}

function openNativeAdvanced() {
    closeWorkspace();
    const wrapper = document.getElementById('sys-settings-button');
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
}

function render() {
    closeWorkspace();
    const root = el('div');
    root.id = WORKSPACE_ID;
    const head = el('header', 'snowbunny-api-head');
    head.append(icon('fa-plug'), el('h2', '', 'API & Connection'));
    const close = el('button');
    close.type = 'button'; close.title = 'Close'; close.setAttribute('aria-label', 'Close API & Connection'); close.append(icon('fa-xmark')); close.addEventListener('click', closeWorkspace);
    head.append(close); root.append(head);

    const body = el('main', 'snowbunny-api-body');
    const hero = el('div', 'snowbunny-api-hero');
    hero.append(el('strong', '', 'Use SillyTavern’s real connection underneath'), el('small', '', 'SnowBunny edits the same provider, URL, key and model controls SillyTavern uses. Keys remain in SillyTavern’s own secret handling.'));
    body.append(hero);

    const main = canonical('#main_api');
    if (main instanceof HTMLSelectElement) {
        const mainSelect = cloneSelect(main);
        mainSelect.addEventListener('change', () => {
            main.value = mainSelect.value;
            dispatchChange(main);
            window.setTimeout(render, 80);
        });
        body.append(field('API type', mainSelect));
    }

    if (!(main instanceof HTMLSelectElement) || main.value !== 'openai') {
        body.append(el('div', 'snowbunny-api-note', 'SnowBunny’s compact connection editor currently covers Chat Completion and OpenAI-compatible APIs. This connection type still uses SillyTavern’s detailed connection page.'));
        const advanced = el('button', 'snowbunny-api-action primary', 'Open this connection');
        advanced.type = 'button'; advanced.addEventListener('click', openNativeAdvanced); body.append(advanced);
        root.append(body); document.body.append(root); return;
    }

    const source = canonical('#chat_completion_source');
    if (source instanceof HTMLSelectElement) {
        const provider = cloneSelect(source);
        provider.addEventListener('change', () => {
            source.value = provider.value;
            dispatchChange(source);
            window.setTimeout(render, 80);
        });
        body.append(field('Provider', provider));
    }

    const provider = currentProvider();
    const urlSource = providerUrlInput(provider);
    const keySource = providerKeyInput(provider);
    const modelSource = providerModelControl(provider);

    let urlInput = null;
    if (urlSource) {
        urlInput = el('input');
        urlInput.type = 'url';
        urlInput.value = urlSource.value || '';
        urlInput.placeholder = urlSource.placeholder || 'Base URL';
        body.append(field(provider === 'custom' ? 'Base URL' : 'Endpoint / URL', urlInput));
    }

    let keyInput = null;
    if (keySource) {
        keyInput = el('input');
        keyInput.type = 'password';
        keyInput.autocomplete = 'off';
        keyInput.placeholder = 'Leave blank to keep the saved key';
        body.append(field('API key', keyInput));
    }

    let modelSelect = null;
    const choices = modelChoices(modelSource);
    if (choices.length) {
        modelSelect = el('select');
        for (const item of choices) modelSelect.append(new Option(item.label, item.value));
        if (modelSource instanceof HTMLSelectElement || modelSource instanceof HTMLInputElement) modelSelect.value = modelSource.value;
        body.append(field('Model', modelSelect));
    } else {
        body.append(el('div', 'snowbunny-api-note', provider === 'custom'
            ? 'No model list is available yet. Connect once and SillyTavern can populate the models exposed by this endpoint.'
            : 'This provider has not exposed a model list yet.'));
    }

    const status = el('div', 'snowbunny-api-status');
    const actions = el('div', 'snowbunny-api-actions');
    const connect = el('button', 'snowbunny-api-action primary', choices.length ? 'Save & Connect' : 'Connect / Refresh Models');
    connect.type = 'button';
    connect.addEventListener('click', () => {
        if (urlSource && urlInput) { urlSource.value = urlInput.value.trim(); dispatchChange(urlSource); }
        if (keySource && keyInput?.value.trim()) { keySource.value = keyInput.value.trim(); dispatchChange(keySource); }
        if (modelSource && modelSelect?.value) { modelSource.value = modelSelect.value; dispatchChange(modelSource); }
        const native = document.getElementById('api_button_openai');
        if (!(native instanceof HTMLElement)) {
            status.textContent = 'SillyTavern’s Connect control is unavailable.';
            return;
        }
        status.textContent = 'Connecting through SillyTavern…';
        native.click();
        window.setTimeout(() => {
            status.textContent = 'Connection request sent. Available models will appear here after SillyTavern refreshes them.';
            window.setTimeout(render, 700);
        }, 250);
    });

    const advanced = el('button', 'snowbunny-api-action', 'Advanced connection settings');
    advanced.type = 'button'; advanced.addEventListener('click', openNativeAdvanced);
    actions.append(connect, advanced); body.append(actions, status);
    root.append(body); document.body.append(root);
}

function onTopClick(event) {
    const target = event.target instanceof Element ? event.target.closest('#snowbunny-top-strip .snowbunny-top-action[aria-label="API"]') : null;
    if (!(target instanceof HTMLElement) || !document.body.classList.contains('snowbunny-mobile')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    render();
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(WORKSPACE_ID)) {
        event.preventDefault();
        closeWorkspace();
    }
}

export function initApiConnectionsUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    document.addEventListener('click', onTopClick, true);
    document.addEventListener('keydown', onKeyDown, true);
}
