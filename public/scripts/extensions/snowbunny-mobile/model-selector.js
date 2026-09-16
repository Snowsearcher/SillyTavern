const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SHEET_ID = 'snowbunny-action-sheet';

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

const PROVIDER_NAMES = {
    openai: 'OpenAI',
    claude: 'Claude',
    openrouter: 'OpenRouter',
    ai21: 'AI21',
    makersuite: 'Google AI Studio',
    vertexai: 'Vertex AI',
    mistralai: 'Mistral',
    custom: 'Custom API',
    cohere: 'Cohere',
    perplexity: 'Perplexity',
    groq: 'Groq',
    electronhub: 'ElectronHub',
    chutes: 'Chutes',
    nanogpt: 'NanoGPT',
    deepseek: 'DeepSeek',
    aimlapi: 'AIMLAPI',
    xai: 'xAI',
    pollinations: 'Pollinations',
    moonshot: 'Moonshot',
    fireworks: 'Fireworks',
    cometapi: 'CometAPI',
    zai: 'Z.AI',
    siliconflow: 'SiliconFlow',
    workers_ai: 'Workers AI',
    minimax: 'MiniMax',
};

let initialized = false;
let observer = null;
let queued = false;
let applying = false;

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

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function createSheet() {
    closeSheet();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-action-card');
    card.append(el('div', 'snowbunny-action-handle'));
    const header = el('header', 'snowbunny-action-header');
    header.append(el('h3', '', 'Model'));

    const apiButton = el('button');
    apiButton.type = 'button';
    apiButton.title = 'API connections';
    apiButton.setAttribute('aria-label', 'Open API connections');
    apiButton.append(icon('fa-plug'));
    apiButton.addEventListener('click', () => {
        closeSheet();
        document.getElementById('snowbunny-right-drawer')?.classList.remove('open');
        document.getElementById('snowbunny-shell-backdrop')?.classList.remove('open');
        const wrapper = document.getElementById('sys-settings-button');
        const panel = wrapper?.querySelector(':scope > .drawer-content');
        const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
        if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
    });

    const close = el('button');
    close.type = 'button';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close Model selector');
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSheet);
    header.append(apiButton, close);
    card.append(header);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);
    return card;
}

function compoundKey(provider, model) {
    return `${provider}:${model}`;
}

function favorites() {
    const value = snowState()?.readGlobal?.()?.modelFavorites;
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}

function setFavorite(provider, model, on) {
    const key = compoundKey(provider, model);
    const next = new Set(favorites());
    if (on) next.add(key);
    else next.delete(key);
    snowState()?.patchGlobal?.({ modelFavorites: [...next] });
}

function currentChatCompletionSelection() {
    const api = context();
    const provider = api?.chatCompletionSettings?.chat_completion_source || '';
    const selector = CHAT_MODELS[provider];
    const control = selector ? document.querySelector(selector) : null;
    if (control instanceof HTMLSelectElement) {
        return { mainApi: 'openai', provider, selector, model: control.value || '' };
    }
    if (control instanceof HTMLInputElement) {
        return { mainApi: 'openai', provider, selector, model: control.value.trim() };
    }
    const model = api?.getChatCompletionModel?.();
    return { mainApi: 'openai', provider, selector: selector || '', model: model ? String(model) : '' };
}

function currentTextSelection() {
    const candidates = [
        '#textgenerationwebui_model',
        '#model_textgenerationwebui_select',
        '#model_koboldcpp_select',
    ];
    for (const selector of candidates) {
        const control = document.querySelector(selector);
        if (control instanceof HTMLSelectElement && control.value) {
            return {
                mainApi: context()?.mainApi || 'textgenerationwebui',
                provider: context()?.textCompletionSettings?.type || 'text',
                selector,
                model: control.value,
            };
        }
        if (control instanceof HTMLInputElement && control.value.trim()) {
            return {
                mainApi: context()?.mainApi || 'textgenerationwebui',
                provider: context()?.textCompletionSettings?.type || 'text',
                selector,
                model: control.value.trim(),
            };
        }
    }
    return null;
}

function currentSelection() {
    const api = context();
    if (api?.mainApi === 'openai') return currentChatCompletionSelection();
    return currentTextSelection() ?? {
        mainApi: api?.mainApi || '',
        provider: '',
        selector: '',
        model: '',
    };
}

function displayModel(selection = currentSelection()) {
    return selection?.model || 'Use API model';
}

function chatCompletionCatalog() {
    const items = [];
    for (const [provider, selector] of Object.entries(CHAT_MODELS)) {
        const control = document.querySelector(selector);
        if (control instanceof HTMLSelectElement) {
            for (const option of control.options) {
                const value = String(option.value || '').trim();
                const label = String(option.textContent || '').trim();
                if (!value || option.disabled || /^--/.test(label)) continue;
                items.push({
                    mainApi: 'openai',
                    provider,
                    providerName: PROVIDER_NAMES[provider] || provider,
                    selector,
                    model: value,
                    label: label || value,
                });
            }
        } else if (control instanceof HTMLInputElement) {
            const value = control.value.trim();
            if (value) {
                items.push({
                    mainApi: 'openai',
                    provider,
                    providerName: PROVIDER_NAMES[provider] || provider,
                    selector,
                    model: value,
                    label: value,
                });
            }
        }
    }
    const seen = new Set();
    return items.filter(item => {
        const key = compoundKey(item.provider, item.model);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function currentTextCatalog() {
    const current = currentTextSelection();
    if (!current?.selector) return [];
    const control = document.querySelector(current.selector);
    if (control instanceof HTMLSelectElement) {
        return [...control.options]
            .filter(option => option.value && !option.disabled)
            .map(option => ({
                ...current,
                providerName: current.provider || 'Current connection',
                model: option.value,
                label: option.textContent?.trim() || option.value,
            }));
    }
    return current.model ? [{ ...current, providerName: current.provider || 'Current connection', label: current.model }] : [];
}

function catalog() {
    return context()?.mainApi === 'openai' ? chatCompletionCatalog() : currentTextCatalog();
}

function dispatchChange(control) {
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
}

async function waitForModelControl(selector, model, timeout = 4500) {
    const started = performance.now();
    while (performance.now() - started < timeout) {
        const control = document.querySelector(selector);
        if (control instanceof HTMLSelectElement) {
            if ([...control.options].some(option => option.value === model)) return control;
        } else if (control instanceof HTMLInputElement) {
            return control;
        }
        await new Promise(resolve => setTimeout(resolve, 60));
    }
    return null;
}

async function applySelection(selection, { persist = true } = {}) {
    if (!selection?.model) return false;
    const api = context();

    if (selection.mainApi === 'openai') {
        if (api?.mainApi !== 'openai') {
            console.warn('[SnowBunny] Saved chat model uses Chat Completion, but the current global API mode is different.');
            return false;
        }
        const source = document.querySelector('#chat_completion_source');
        if (source instanceof HTMLSelectElement && selection.provider && source.value !== selection.provider) {
            applying = true;
            source.value = selection.provider;
            dispatchChange(source);
            applying = false;
        }
        const selector = selection.selector || CHAT_MODELS[selection.provider];
        if (!selector) return false;
        const control = await waitForModelControl(selector, selection.model);
        if (!control) return false;
        applying = true;
        if (control instanceof HTMLSelectElement) control.value = selection.model;
        else control.value = selection.model;
        dispatchChange(control);
        applying = false;
    } else {
        if (api?.mainApi !== selection.mainApi || !selection.selector) return false;
        const control = await waitForModelControl(selection.selector, selection.model, 1200);
        if (!control) return false;
        applying = true;
        control.value = selection.model;
        dispatchChange(control);
        applying = false;
    }

    if (persist && api?.getCurrentChatId?.()) {
        snowState()?.patchChat?.({ modelSelection: selection });
    }
    queueEnhance();
    return true;
}

function rememberCurrent() {
    if (applying || !context()?.getCurrentChatId?.()) return;
    const selection = currentSelection();
    if (selection?.model) snowState()?.patchChat?.({ modelSelection: selection });
}

async function applySaved() {
    if (!context()?.getCurrentChatId?.()) return;
    const saved = snowState()?.readChat?.()?.modelSelection;
    if (!saved?.model) {
        rememberCurrent();
        return;
    }
    const current = currentSelection();
    if (current.mainApi === saved.mainApi && current.provider === saved.provider && current.model === saved.model) return;
    await applySelection(saved, { persist: false });
}

async function openModelSelector() {
    const card = createSheet();
    const search = el('input', 'snowbunny-action-search');
    search.type = 'search';
    search.placeholder = 'Search models';
    search.autocomplete = 'off';
    const list = el('div', 'snowbunny-action-list');
    card.append(search, list);

    let items = catalog();
    const favs = new Set(favorites());
    items = items.sort((a, b) => {
        const af = favs.has(compoundKey(a.provider, a.model)) ? 0 : 1;
        const bf = favs.has(compoundKey(b.provider, b.model)) ? 0 : 1;
        return af - bf || a.providerName.localeCompare(b.providerName) || a.label.localeCompare(b.label);
    });

    const render = () => {
        const current = currentSelection();
        const query = search.value.trim().toLowerCase();
        const visible = items.filter(item => `${item.label} ${item.model} ${item.providerName}`.toLowerCase().includes(query));
        list.replaceChildren();
        if (!visible.length) {
            list.append(el('div', 'snowbunny-action-empty', 'No models are currently available from the configured connection(s).'));
            return;
        }
        for (const item of visible) {
            const key = compoundKey(item.provider, item.model);
            const active = current.mainApi === item.mainApi && current.provider === item.provider && current.model === item.model;
            const button = el('button', 'snowbunny-action-option');
            button.type = 'button';
            if (active) button.classList.add('current');
            button.append(icon(active ? 'fa-circle-check' : 'fa-microchip'));
            const copy = el('div', 'snowbunny-action-option-copy');
            copy.append(el('strong', '', item.label));
            copy.append(el('small', '', `${item.providerName}${item.label !== item.model ? ` · ${item.model}` : ''}`));
            button.append(copy);

            const star = el('button');
            star.type = 'button';
            star.className = 'snowbunny-model-favorite';
            star.title = favs.has(key) ? 'Remove favorite' : 'Add favorite';
            star.setAttribute('aria-label', star.title);
            star.append(icon(favs.has(key) ? 'fa-star' : 'fa-star-half-stroke'));
            star.addEventListener('click', event => {
                event.stopPropagation();
                const next = !favs.has(key);
                if (next) favs.add(key); else favs.delete(key);
                setFavorite(item.provider, item.model, next);
                star.replaceChildren(icon(next ? 'fa-star' : 'fa-star-half-stroke'));
                star.title = next ? 'Remove favorite' : 'Add favorite';
                star.setAttribute('aria-label', star.title);
            });
            button.append(star);
            button.addEventListener('click', async () => {
                const ok = await applySelection(item);
                if (ok) closeSheet();
            });
            list.append(button);
        }
    };
    search.addEventListener('input', render);
    render();
    window.setTimeout(() => search.focus({ preventScroll: true }), 50);
}

function modelRow() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Model',
    );
}

function enhance() {
    queued = false;
    const row = modelRow();
    if (!(row instanceof HTMLButtonElement)) return;
    const value = row.querySelector('.snowbunny-shell-row-value');
    if (value) value.textContent = displayModel();
    row.disabled = false;
    row.setAttribute('aria-disabled', 'false');
    if (row.dataset.snowbunnyModel === '1') return;
    row.dataset.snowbunnyModel = '1';
    row.addEventListener('click', () => void openModelSelector());
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
    if (source?.on && types) {
        const chatChanged = () => window.setTimeout(() => void applySaved(), 0);
        if (types.CHAT_CHANGED) source.on(types.CHAT_CHANGED, chatChanged);
        if (types.CHAT_LOADED) source.on(types.CHAT_LOADED, chatChanged);
        for (const name of ['CHAT_COMPLETION_MODEL_CHANGED', 'CHATCOMPLETION_SOURCE_CHANGED', 'MAIN_API_CHANGED']) {
            if (types[name]) source.on(types[name], () => {
                rememberCurrent();
                queueEnhance();
            });
        }
    }

    document.addEventListener('change', event => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || applying) return;
        const isSource = target.id === 'chat_completion_source';
        const isModel = Object.values(CHAT_MODELS).some(selector => selector.startsWith('#') && target.id === selector.slice(1))
            || ['textgenerationwebui_model', 'model_textgenerationwebui_select', 'model_koboldcpp_select'].includes(target.id);
        if (isSource || isModel) {
            window.setTimeout(() => {
                rememberCurrent();
                queueEnhance();
            }, 0);
        }
    });
}

function installLocalStyles() {
    const id = 'snowbunny-model-selector-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${SHEET_ID} .snowbunny-model-favorite {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    opacity: .72;
  }
  #${SHEET_ID} .snowbunny-model-favorite:active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent);
  }
}
`;
    document.head.append(style);
}

export function initModelSelector() {
    if (initialized) return;
    initialized = true;
    installLocalStyles();
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueEnhance);
        observer.observe(drawer, { subtree: true, childList: true });
    }
    void applySaved();
    enhance();
    registerEvents();
}
