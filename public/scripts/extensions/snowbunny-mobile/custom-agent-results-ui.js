const STYLE_ID = 'snowbunny-custom-agent-results-style';
const RESULT_CLASS = 'snowbunny-custom-agent-result';

let initialized = false;
let renderQueued = false;
let rendering = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function agents() {
    return globalThis.SnowBunny?.agents ?? null;
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
  .${RESULT_CLASS} {
    margin: 9px 0 2px; overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 24%, var(--SmartThemeBorderColor));
    border-radius: 17px;
    background: linear-gradient(145deg, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 8%, transparent), color-mix(in srgb, var(--SmartThemeBlurTintColor) 55%, transparent));
  }
  .${RESULT_CLASS}.top { margin: 3px 0 9px; }
  .${RESULT_CLASS}.header {
    margin: 3px 0 7px; border-radius: 13px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 8%, transparent);
  }
  .${RESULT_CLASS}.stale { opacity: .68; border-color: color-mix(in srgb, #c96a70 42%, var(--SmartThemeBorderColor)); }
  .${RESULT_CLASS} .snowbunny-custom-agent-result-head {
    display: flex; align-items: center; gap: 8px; padding: 8px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 42%, transparent);
  }
  .${RESULT_CLASS}.header .snowbunny-custom-agent-result-head { border-bottom: 0; padding: 7px 9px 4px; }
  .${RESULT_CLASS} .snowbunny-custom-agent-result-head i { width: 20px; text-align: center; opacity: .78; }
  .${RESULT_CLASS} .snowbunny-custom-agent-result-head strong { flex: 1; min-width: 0; font-size: .72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .${RESULT_CLASS} .snowbunny-custom-agent-result-head span { font-size: .59rem; opacity: .48; }
  .${RESULT_CLASS} .snowbunny-custom-agent-result-copy { padding: 9px 11px 10px; font-size: .74rem; line-height: 1.48; overflow-wrap: anywhere; }
  .${RESULT_CLASS}.header .snowbunny-custom-agent-result-copy { padding: 0 9px 7px; font-size: .68rem; line-height: 1.38; }
  .${RESULT_CLASS} .snowbunny-custom-agent-result-copy p:first-child { margin-top: 0; }
  .${RESULT_CLASS} .snowbunny-custom-agent-result-copy p:last-child { margin-bottom: 0; }
  .${RESULT_CLASS} .snowbunny-custom-agent-result-warning { padding: 7px 9px; background: color-mix(in srgb, #c96a70 12%, transparent); font-size: .63rem; line-height: 1.38; }
}
`;
    document.head.append(style);
}

function safeMarkdown(host, text, messageIndex, name) {
    const api = context();
    try {
        if (typeof api?.messageFormatting === 'function') {
            host.innerHTML = api.messageFormatting(String(text || ''), name || 'Agent', true, false, messageIndex);
            return;
        }
    } catch (_) {
        // Text rendering remains safe fallback.
    }
    host.textContent = String(text || '');
}

function messageIdentity(message) {
    return globalThis.SnowBunny?.identity?.current?.(message) || message?.extra?.snowbunny || {};
}

function resultMap(state) {
    const map = new Map();
    for (const result of state?.results || []) {
        const messageId = result?.source?.message?.id;
        if (!messageId) continue;
        if (!map.has(messageId)) map.set(messageId, []);
        map.get(messageId).push(result);
    }
    return map;
}

function makeResult(definition, result, messageIndex) {
    const placement = definition.placement || 'bottom';
    const card = el('aside', `${RESULT_CLASS} ${placement}${result.stale ? ' stale' : ''}`);
    card.dataset.agentId = definition.id;
    card.dataset.resultId = result.id;
    const head = el('div', 'snowbunny-custom-agent-result-head');
    head.append(icon(placement === 'header' ? 'fa-location-crosshairs' : 'fa-wand-magic-sparkles'), el('strong', '', definition.name));
    if (definition.feedback) head.append(el('span', '', 'Helps writer'));
    card.append(head);
    const copy = el('div', 'snowbunny-custom-agent-result-copy');
    safeMarkdown(copy, result.text, messageIndex, definition.name);
    card.append(copy);
    if (result.stale) card.append(el('div', 'snowbunny-custom-agent-result-warning', result.staleReason || 'The story evidence behind this result changed. It is kept for audit and is no longer supplied to the writer.'));
    return card;
}

function removeProjected() {
    document.querySelectorAll(`#chat .${RESULT_CLASS}`).forEach(node => node.remove());
}

async function renderAll() {
    renderQueued = false;
    if (rendering) return;
    rendering = true;
    try {
        const api = context();
        const agentApi = agents();
        if (!agentApi || !Array.isArray(api?.chat)) return;
        const reconciliation = await agentApi.reconcile({ persist: true });
        const state = reconciliation.state;
        const definitions = new Map(state.definitions.map(definition => [definition.id, definition]));
        const byMessage = resultMap(state);
        removeProjected();

        for (const messageEl of document.querySelectorAll('#chat .mes:not([is_user="true"])')) {
            const index = Number.parseInt(messageEl.getAttribute('mesid') || '', 10);
            if (!Number.isInteger(index)) continue;
            const message = api.chat[index];
            if (!message || message.is_system) continue;
            const identity = messageIdentity(message);
            const results = byMessage.get(identity.id) || [];
            if (!results.length) continue;
            const block = messageEl.querySelector('.mes_block');
            const text = messageEl.querySelector('.mes_text');
            if (!(block instanceof HTMLElement) || !(text instanceof HTMLElement)) continue;

            const visible = results
                .map(result => ({ result, definition: definitions.get(result.agentId) }))
                .filter(item => item.definition?.visible && item.definition.placement !== 'none');
            const headers = visible.filter(item => item.definition.placement === 'header');
            const tops = visible.filter(item => item.definition.placement === 'top');
            const bottoms = visible.filter(item => item.definition.placement === 'bottom');

            for (const item of headers) block.insertBefore(makeResult(item.definition, item.result, index), text);
            for (const item of tops) block.insertBefore(makeResult(item.definition, item.result, index), text);
            let anchor = block.querySelector('.snowbunny-story-state') || text;
            for (const item of bottoms) {
                const card = makeResult(item.definition, item.result, index);
                anchor.insertAdjacentElement('afterend', card);
                anchor = card;
            }
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
    if (source?.on && types) {
        for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_RECEIVED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED', 'MORE_MESSAGES_LOADED']) {
            const event = types[name];
            if (event) source.on(event, () => window.setTimeout(queueRender, 0));
        }
    }
    for (const name of ['snowbunny:agent-result-ready', 'snowbunny:agent-results-reconciled', 'snowbunny:agents-changed']) {
        document.addEventListener(name, queueRender);
    }
}

export function initCustomAgentResultsUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    registerEvents();
    queueRender();
}
