const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const ACTION_SHEET_ID = 'snowbunny-action-sheet';
const STYLE_ID = 'snowbunny-shell-actions-style';

let initialized = false;
let observer = null;
let enhanceQueued = false;

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
  #${ACTION_SHEET_ID} {
    position: fixed;
    z-index: 12070;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 46%);
  }
  #${ACTION_SHEET_ID} .snowbunny-action-card {
    width: min(100%, 620px);
    max-height: 82dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 76%, transparent);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor);
    box-shadow: 0 -18px 52px rgb(0 0 0 / 38%);
  }
  #${ACTION_SHEET_ID} .snowbunny-action-handle {
    width: 38px;
    height: 4px;
    margin: 8px auto 2px;
    border-radius: 999px;
    background: currentColor;
    opacity: .24;
  }
  #${ACTION_SHEET_ID} .snowbunny-action-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px 9px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
  }
  #${ACTION_SHEET_ID} .snowbunny-action-header h3 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: .96rem;
  }
  #${ACTION_SHEET_ID} .snowbunny-action-header button {
    min-width: 38px;
    min-height: 38px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
  }
  #${ACTION_SHEET_ID} .snowbunny-action-search {
    margin: 10px 12px 6px;
    min-height: 42px;
    padding: 8px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 68%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 64%, transparent);
    color: inherit;
    font: inherit;
  }
  #${ACTION_SHEET_ID} .snowbunny-action-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 6px 10px calc(14px + env(safe-area-inset-bottom));
  }
  #${ACTION_SHEET_ID} .snowbunny-action-option {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 3px 0;
    padding: 8px 11px;
    border: 1px solid transparent;
    border-radius: 15px;
    background: transparent;
    color: inherit;
    text-align: left;
  }
  #${ACTION_SHEET_ID} .snowbunny-action-option.current {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 46%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent);
  }
  #${ACTION_SHEET_ID} .snowbunny-action-option i {
    width: 22px;
    text-align: center;
    opacity: .72;
  }
  #${ACTION_SHEET_ID} .snowbunny-action-option-copy {
    flex: 1;
    min-width: 0;
  }
  #${ACTION_SHEET_ID} .snowbunny-action-option-copy strong,
  #${ACTION_SHEET_ID} .snowbunny-action-option-copy small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #${ACTION_SHEET_ID} .snowbunny-action-option-copy strong { font-size: .84rem; }
  #${ACTION_SHEET_ID} .snowbunny-action-option-copy small { margin-top: 2px; font-size: .67rem; opacity: .55; }
  #${ACTION_SHEET_ID} .snowbunny-action-empty {
    padding: 22px 14px;
    text-align: center;
    font-size: .78rem;
    opacity: .58;
  }
  .snowbunny-search-hit > .mes_block {
    outline: 2px solid color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 72%, transparent) !important;
    outline-offset: 3px;
  }
}
`;
    document.head.append(style);
}

function closeSheet() {
    document.getElementById(ACTION_SHEET_ID)?.remove();
}

function createSheet(title, { edit = null } = {}) {
    closeSheet();
    const overlay = el('div');
    overlay.id = ACTION_SHEET_ID;
    const card = el('section', 'snowbunny-action-card');
    const handle = el('div', 'snowbunny-action-handle');
    const header = el('header', 'snowbunny-action-header');
    header.append(el('h3', '', title));
    if (edit) {
        const editButton = el('button');
        editButton.type = 'button';
        editButton.title = 'Edit';
        editButton.setAttribute('aria-label', `Edit ${title}`);
        editButton.append(icon('fa-pencil'));
        editButton.addEventListener('click', edit);
        header.append(editButton);
    }
    const close = el('button');
    close.type = 'button';
    close.title = 'Close';
    close.setAttribute('aria-label', `Close ${title}`);
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSheet);
    header.append(close);
    card.append(handle, header);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);
    return { overlay, card };
}

function activePresetSelect() {
    const api = context();
    const byApi = {
        openai: '#settings_preset_openai',
        textgenerationwebui: '#settings_preset_textgenerationwebui',
        kobold: '#settings_preset',
        koboldhorde: '#settings_preset',
        novel: '#settings_preset_novel',
        novelai: '#settings_preset_novel',
    };
    const preferred = byApi[api?.mainApi];
    if (preferred) {
        const select = document.querySelector(preferred);
        if (select instanceof HTMLSelectElement) return select;
    }
    for (const selector of [
        '#settings_preset_openai',
        '#settings_preset_textgenerationwebui',
        '#settings_preset',
        '#settings_preset_novel',
    ]) {
        const select = document.querySelector(selector);
        if (select instanceof HTMLSelectElement && select.options.length) return select;
    }
    return null;
}

function openNativeAiConfig() {
    closeSheet();
    const wrapper = document.getElementById('ai-config-button');
    const panel = wrapper?.querySelector(':scope > .drawer-content');
    const toggle = wrapper?.querySelector(':scope > .drawer-toggle');
    if (toggle instanceof HTMLElement && !panel?.classList.contains('openDrawer')) toggle.click();
}

function presetName(select) {
    if (!(select instanceof HTMLSelectElement)) return 'Current preset';
    return select.selectedOptions[0]?.textContent?.trim() || select.value || 'Current preset';
}

function openPresetSelector() {
    const select = activePresetSelect();
    const { card } = createSheet('Preset', { edit: openNativeAiConfig });
    if (!(select instanceof HTMLSelectElement)) {
        card.append(el('div', 'snowbunny-action-empty', 'No preset selector is available for the active API yet.'));
        return;
    }

    const search = el('input', 'snowbunny-action-search');
    search.type = 'search';
    search.placeholder = 'Search presets';
    search.autocomplete = 'off';
    const list = el('div', 'snowbunny-action-list');
    card.append(search, list);

    const options = [...select.options].filter(option => !option.disabled && option.value !== '');
    const render = () => {
        const query = search.value.trim().toLowerCase();
        const visible = options.filter(option => (option.textContent || option.value).toLowerCase().includes(query));
        list.replaceChildren();
        if (!visible.length) {
            list.append(el('div', 'snowbunny-action-empty', 'No matching presets.'));
            return;
        }
        for (const option of visible) {
            const button = el('button', 'snowbunny-action-option');
            button.type = 'button';
            if (option.value === select.value) button.classList.add('current');
            button.append(icon(option.value === select.value ? 'fa-circle-check' : 'fa-circle'));
            const copy = el('div', 'snowbunny-action-option-copy');
            copy.append(el('strong', '', option.textContent?.trim() || option.value));
            if (option.value === select.value) copy.append(el('small', '', 'Current preset'));
            button.append(copy);
            button.addEventListener('click', () => {
                if (select.value !== option.value) {
                    select.value = option.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
                closeSheet();
                window.setTimeout(enhanceRows, 80);
            });
            list.append(button);
        }
    };
    search.addEventListener('input', render);
    render();
    window.setTimeout(() => search.focus({ preventScroll: true }), 50);
}

function canonicalMessages() {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    return api.chat.map((message, index) => ({
        index,
        speaker: message?.name || (message?.is_user ? api?.name1 : api?.name2) || 'Message',
        text: String(message?.mes ?? ''),
        hidden: Boolean(message?.extra?.[api?.symbols?.ignore]),
    }));
}

function snippet(text, query) {
    const flat = String(text).replace(/\s+/g, ' ').trim();
    if (!flat) return '(empty message)';
    const lower = flat.toLowerCase();
    const index = lower.indexOf(query.toLowerCase());
    const start = Math.max(0, (index < 0 ? 0 : index) - 48);
    const end = Math.min(flat.length, start + 150);
    return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}

function jumpToMessage(index) {
    closeSheet();
    const message = document.querySelector(`#chat .mes[mesid="${index}"]`);
    if (!(message instanceof HTMLElement)) return;
    message.scrollIntoView({ behavior: 'smooth', block: 'center' });
    message.classList.add('snowbunny-search-hit');
    window.setTimeout(() => message.classList.remove('snowbunny-search-hit'), 1800);
}

function openChatSearch() {
    const { card } = createSheet('Search in Chat');
    const search = el('input', 'snowbunny-action-search');
    search.type = 'search';
    search.placeholder = 'Search this conversation';
    search.autocomplete = 'off';
    const list = el('div', 'snowbunny-action-list');
    card.append(search, list);

    const render = () => {
        const query = search.value.trim();
        list.replaceChildren();
        if (query.length < 2) {
            list.append(el('div', 'snowbunny-action-empty', 'Type at least two characters.'));
            return;
        }
        const matches = canonicalMessages().filter(item => item.text.toLowerCase().includes(query.toLowerCase()));
        if (!matches.length) {
            list.append(el('div', 'snowbunny-action-empty', 'No messages found.'));
            return;
        }
        for (const match of matches.slice(-100).reverse()) {
            const button = el('button', 'snowbunny-action-option');
            button.type = 'button';
            button.append(icon(match.hidden ? 'fa-eye-slash' : 'fa-message'));
            const copy = el('div', 'snowbunny-action-option-copy');
            copy.append(el('strong', '', match.speaker), el('small', '', snippet(match.text, query)));
            button.append(copy);
            button.addEventListener('click', () => jumpToMessage(match.index));
            list.append(button);
        }
    };
    search.addEventListener('input', render);
    render();
    window.setTimeout(() => search.focus({ preventScroll: true }), 50);
}

async function resetChat() {
    const api = context();
    if (typeof api?.clearChat !== 'function') return;
    const confirmed = window.confirm('Reset this chat? This clears the current message history but keeps the chat itself.');
    if (!confirmed) return;
    await api.clearChat({ clearData: false });
    await api.saveChat?.();
}

function rowByLabel(label) {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === label,
    );
}

function quickByLabel(label) {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-quick`)].find(button =>
        button.querySelector('span')?.textContent?.trim() === label,
    );
}

function enableButton(button, key, onClick) {
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    if (button.dataset.snowbunnyAction === key) return;
    button.dataset.snowbunnyAction = key;
    button.addEventListener('click', onClick);
}

function enhanceRows() {
    enhanceQueued = false;
    const preset = rowByLabel('Preset');
    if (preset) {
        const value = preset.querySelector('.snowbunny-shell-row-value');
        if (value) value.textContent = presetName(activePresetSelect());
        enableButton(preset, 'preset', openPresetSelector);
    }

    enableButton(quickByLabel('Reset Chat'), 'reset-chat', () => void resetChat());
    enableButton(quickByLabel('Search'), 'search-chat', openChatSearch);
}

function queueEnhance() {
    if (enhanceQueued) return;
    enhanceQueued = true;
    requestAnimationFrame(enhanceRows);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'PRESET_CHANGED', 'OAI_PRESET_CHANGED_AFTER']) {
        if (types[name]) source.on(types[name], queueEnhance);
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(ACTION_SHEET_ID)) {
        event.preventDefault();
        closeSheet();
    }
}

export function initShellActions() {
    if (initialized) return;
    initialized = true;
    installStyles();
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueEnhance);
        observer.observe(drawer, { subtree: true, childList: true });
    }
    enhanceRows();
    registerEvents();
    document.addEventListener('keydown', onKeyDown, true);
}
