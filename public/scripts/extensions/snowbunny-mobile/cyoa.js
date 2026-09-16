import { extension_prompt_roles, extension_prompt_types } from '../../../script.js';

const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SETTINGS_ID = 'snowbunny-cyoa-settings';
const STYLE_ID = 'snowbunny-cyoa-style';
const PROMPT_KEY = 'snowbunny-cyoa';
const CARD_CLASS = 'snowbunny-cyoa-card';

let initialized = false;
let drawerObserver = null;
let chatObserver = null;
let reconcileQueued = false;

const CYOA_PROMPT = `Story choices are enabled for this chat. At a meaningful decision point, you may place exactly one optional choice card at the END of the reply. Do not add a card to every reply.

Use this exact structure with 2 to 5 distinct paths:
<choicecard>
<path><act type="dialogue">A line the user could say</act><note>Short optional hint</note></path>
<path><act type="action">An action the user could take</act></path>
<path><act type="direction">A direction the user could give the story</act></path>
</choicecard>

The only act types are dialogue, action, and direction. Each act must stand on its own as the user's next message. Do not narrate unchosen paths as if they happened.`;

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
  .${CARD_CLASS} {
    margin: 4px 12px 12px;
    padding: 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 68%, transparent);
    border-radius: 16px;
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent),
      color-mix(in srgb, var(--SmartThemeBlurTintColor) 70%, transparent)
    );
    box-shadow: 0 8px 22px rgb(0 0 0 / 12%);
  }
  .${CARD_CLASS}.stale { opacity: .68; }
  .snowbunny-cyoa-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 1px 8px;
    font-size: .72rem;
    font-weight: 750;
    letter-spacing: .02em;
    opacity: .75;
  }
  .snowbunny-cyoa-path {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 6px 0 0;
    padding: 9px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent);
    color: inherit;
    text-align: left;
  }
  .snowbunny-cyoa-path:not(:disabled):active {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 55%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent);
  }
  .snowbunny-cyoa-path:disabled { cursor: default; }
  .snowbunny-cyoa-type {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent);
    opacity: .8;
  }
  .snowbunny-cyoa-copy { flex: 1; min-width: 0; }
  .snowbunny-cyoa-copy strong {
    display: block;
    font-size: .82rem;
    line-height: 1.38;
    font-weight: 620;
  }
  .snowbunny-cyoa-copy small {
    display: block;
    margin-top: 4px;
    font-size: .68rem;
    line-height: 1.35;
    opacity: .58;
  }

  #${SETTINGS_ID} {
    position: fixed;
    z-index: 12130;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SETTINGS_ID} .snowbunny-cyoa-settings-card {
    width: min(100%, 620px);
    max-height: 80dvh;
    overflow-y: auto;
    padding: 8px 14px calc(18px + env(safe-area-inset-bottom));
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 74%, transparent);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor);
    box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  #${SETTINGS_ID} .snowbunny-cyoa-settings-handle {
    width: 38px;
    height: 4px;
    margin: 0 auto 8px;
    border-radius: 999px;
    background: currentColor;
    opacity: .24;
  }
  #${SETTINGS_ID} .snowbunny-cyoa-settings-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  #${SETTINGS_ID} .snowbunny-cyoa-settings-header h3 { flex: 1; margin: 0; font-size: 1rem; }
  #${SETTINGS_ID} .snowbunny-cyoa-settings-close {
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
  }
  #${SETTINGS_ID} .snowbunny-cyoa-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent);
    border-radius: 16px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent);
  }
  #${SETTINGS_ID} .snowbunny-cyoa-toggle-copy { flex: 1; min-width: 0; }
  #${SETTINGS_ID} .snowbunny-cyoa-toggle-copy strong,
  #${SETTINGS_ID} .snowbunny-cyoa-toggle-copy small { display: block; }
  #${SETTINGS_ID} .snowbunny-cyoa-toggle-copy strong { font-size: .86rem; }
  #${SETTINGS_ID} .snowbunny-cyoa-toggle-copy small { margin-top: 3px; font-size: .7rem; opacity: .58; }
  #${SETTINGS_ID} .snowbunny-cyoa-toggle input { width: 20px; height: 20px; }
  #${SETTINGS_ID} .snowbunny-cyoa-help-title { margin: 15px 2px 6px; font-size: .82rem; font-weight: 720; }
  #${SETTINGS_ID} .snowbunny-cyoa-help {
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 15px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 48%, transparent);
  }
  #${SETTINGS_ID} .snowbunny-cyoa-help p { margin: 6px 0; font-size: .74rem; line-height: 1.42; opacity: .76; }
}
`;
    document.head.append(style);
}

function enabled() {
    return snowState()?.readChat?.()?.cyoaEnabled === true;
}

function syncPrompt() {
    const api = context();
    if (typeof api?.setExtensionPrompt !== 'function') return;
    api.setExtensionPrompt(
        PROMPT_KEY,
        enabled() ? CYOA_PROMPT : '',
        extension_prompt_types.IN_PROMPT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
}

function cleanText(value) {
    const container = document.createElement('div');
    container.innerHTML = String(value || '').replace(/<[^>]*>/g, '');
    return (container.textContent || '').replace(/\s+/g, ' ').trim();
}

function choiceCards(content) {
    return [...String(content || '').matchAll(/<choicecard\b[^>]*>([\s\S]*?)<\/choicecard>/gi)];
}

function parseChoices(content) {
    const cards = choiceCards(content);
    if (cards.length !== 1) return null;
    const choices = [];
    for (const match of cards[0][1].matchAll(/<path\b[^>]*>([\s\S]*?)<\/path>/gi)) {
        const body = match[1];
        const act = /<act\b([^>]*)>([\s\S]*?)<\/act>/i.exec(body);
        if (!act) return null;
        const type = /type\s*=\s*["']?(dialogue|action|direction)/i.exec(act[1])?.[1]?.toLowerCase() || 'action';
        let text = cleanText(act[2]);
        if (!text || text.length > 10000) return null;
        if (type === 'dialogue') {
            text = `"${text.replace(/^["“”]+|["“”]+$/g, '').trim()}"`;
        }
        const note = /<note\b[^>]*>([\s\S]*?)<\/note>/i.exec(body);
        choices.push({ type, text, note: cleanText(note?.[1] || '') });
    }
    if (choices.length < 2 || choices.length > 5) return null;
    return { choices, raw: cards[0][0] };
}

function latestVisibleAssistantIndex() {
    const api = context();
    if (!Array.isArray(api?.chat)) return -1;
    const ignore = api?.symbols?.ignore;
    for (let index = api.chat.length - 1; index >= 0; index--) {
        const message = api.chat[index];
        if (!message || message.is_user || message.is_system) continue;
        if (ignore && message.extra?.[ignore]) continue;
        return index;
    }
    return -1;
}

function generationBusy() {
    const api = context();
    return Boolean(api?.streamingProcessor);
}

function stripChoiceMarkup(message, index, parsed) {
    const element = document.querySelector(`#chat .mes[mesid="${index}"] .mes_text`);
    if (!(element instanceof HTMLElement)) return;
    const prose = String(message.mes || '').replace(parsed.raw, '').trimEnd();
    const source = globalThis.SnowBunny?.identity?.current?.(message)?.source || '';
    const displayStamp = `${source}:${prose.length}`;
    if (element.dataset.snowbunnyCyoaProse === displayStamp) return;
    if (typeof context()?.messageFormatting === 'function') {
        element.innerHTML = context().messageFormatting(prose, message.name || '', Boolean(message.is_system), Boolean(message.is_user), index);
    } else {
        element.textContent = prose;
    }
    element.dataset.snowbunnyCyoaProse = displayStamp;
}

function pathIcon(type) {
    if (type === 'dialogue') return 'fa-quote-left';
    if (type === 'direction') return 'fa-compass';
    return 'fa-person-walking-arrow-right';
}

function activeStamp(message) {
    const identity = globalThis.SnowBunny?.identity?.current?.(message);
    return identity?.source || `${message?.send_date || ''}:${String(message?.mes || '').length}`;
}

function sendChoice(index, stamp, choice) {
    const api = context();
    const message = api?.chat?.[index];
    if (!message || activeStamp(message) !== stamp || index !== latestVisibleAssistantIndex() || !enabled()) {
        queueReconcile();
        return;
    }
    const input = document.getElementById('send_textarea');
    if (!(input instanceof HTMLTextAreaElement)) return;
    input.value = choice.text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const send = document.getElementById('send_but');
    if (send instanceof HTMLElement) send.click();
}

function buildCard(message, index, parsed, active) {
    const card = el('div', CARD_CLASS);
    if (!active) card.classList.add('stale');
    card.dataset.snowbunnyCyoaFor = String(index);
    const heading = el('div', 'snowbunny-cyoa-heading');
    heading.append(icon('fa-signs-post'), el('span', '', active ? 'Choose your next move' : 'Story choices'));
    card.append(heading);
    const stamp = activeStamp(message);
    for (const choice of parsed.choices) {
        const button = el('button', 'snowbunny-cyoa-path');
        button.type = 'button';
        button.disabled = !active;
        const type = el('span', 'snowbunny-cyoa-type');
        type.append(icon(pathIcon(choice.type)));
        const copy = el('span', 'snowbunny-cyoa-copy');
        copy.append(el('strong', '', choice.text));
        if (choice.note) copy.append(el('small', '', choice.note));
        button.append(type, copy);
        if (active) button.addEventListener('click', () => sendChoice(index, stamp, choice));
        card.append(button);
    }
    return card;
}

function reconcileCards() {
    reconcileQueued = false;
    const api = context();
    if (!Array.isArray(api?.chat)) return;

    document.querySelectorAll(`.${CARD_CLASS}`).forEach(node => node.remove());
    const latest = latestVisibleAssistantIndex();
    const isEnabled = enabled();
    for (let index = 0; index < api.chat.length; index++) {
        const message = api.chat[index];
        if (!message || message.is_user || message.is_system) continue;
        const parsed = parseChoices(message.mes);
        if (!parsed) continue;
        stripChoiceMarkup(message, index, parsed);
        const block = document.querySelector(`#chat .mes[mesid="${index}"] .mes_block`);
        if (!(block instanceof HTMLElement)) continue;
        const active = isEnabled && index === latest && !generationBusy();
        block.append(buildCard(message, index, parsed, active));
    }
}

function queueReconcile() {
    if (reconcileQueued) return;
    reconcileQueued = true;
    requestAnimationFrame(reconcileCards);
}

function closeSettings() {
    document.getElementById(SETTINGS_ID)?.remove();
}

function setEnabled(value) {
    snowState()?.patchChat?.({ cyoaEnabled: Boolean(value) });
    syncPrompt();
    enhanceRow();
    queueReconcile();
}

function openSettings() {
    closeSettings();
    const overlay = el('div');
    overlay.id = SETTINGS_ID;
    const card = el('section', 'snowbunny-cyoa-settings-card');
    card.append(el('div', 'snowbunny-cyoa-settings-handle'));
    const header = el('div', 'snowbunny-cyoa-settings-header');
    header.append(icon('fa-signs-post'), el('h3', '', 'CYOAs'));
    const close = el('button', 'snowbunny-cyoa-settings-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close CYOAs');
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSettings);
    header.append(close);
    card.append(header);

    const label = el('label', 'snowbunny-cyoa-toggle');
    const marker = el('span');
    marker.append(icon('fa-route'));
    const copy = el('span', 'snowbunny-cyoa-toggle-copy');
    copy.append(
        el('strong', '', 'Story choices'),
        el('small', '', enabled() ? 'The story may offer choices when a decision matters.' : 'No new choice cards will be requested in this chat.'),
    );
    const input = el('input');
    input.type = 'checkbox';
    input.checked = enabled();
    input.addEventListener('change', () => {
        setEnabled(input.checked);
        copy.querySelector('small').textContent = input.checked
            ? 'The story may offer choices when a decision matters.'
            : 'No new choice cards will be requested in this chat.';
    });
    label.append(marker, copy, input);
    card.append(label, el('div', 'snowbunny-cyoa-help-title', 'How it works'));
    const help = el('div', 'snowbunny-cyoa-help');
    help.append(
        el('p', '', 'Tap a path to send it as your next message.'),
        el('p', '', 'Dialogue stays quoted. Actions and directions stay plain.'),
        el('p', '', 'You can ignore the card and write your own reply. Old cards remain readable but stop being clickable.'),
    );
    card.append(help);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSettings();
    });
    document.body.append(overlay);
}

function cyoaRow() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'CYOA',
    ) ?? null;
}

function enhanceRow() {
    const row = cyoaRow();
    if (!(row instanceof HTMLButtonElement)) return;
    row.disabled = false;
    row.setAttribute('aria-disabled', 'false');
    const value = row.querySelector('.snowbunny-shell-row-value');
    if (value) value.textContent = enabled() ? 'On' : 'Off';
    if (row.dataset.snowbunnyCyoa === '1') return;
    row.dataset.snowbunnyCyoa = '1';
    row.addEventListener('click', openSettings);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of [
        'CHAT_CHANGED', 'CHAT_LOADED', 'MESSAGE_RECEIVED', 'MESSAGE_UPDATED', 'MESSAGE_EDITED',
        'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED', 'GENERATION_ENDED', 'GENERATION_STOPPED',
    ]) {
        const event = types[name];
        if (!event) continue;
        source.on(event, () => {
            if (name === 'CHAT_CHANGED' || name === 'CHAT_LOADED') syncPrompt();
            enhanceRow();
            queueReconcile();
        });
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(SETTINGS_ID)) {
        event.preventDefault();
        closeSettings();
    }
}

export function initCyoa() {
    if (initialized) return;
    initialized = true;
    installStyles();
    syncPrompt();
    enhanceRow();
    queueReconcile();
    registerEvents();

    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        drawerObserver = new MutationObserver(enhanceRow);
        drawerObserver.observe(drawer, { childList: true, subtree: true });
    }
    const chat = document.getElementById('chat');
    if (chat) {
        chatObserver = new MutationObserver(queueReconcile);
        chatObserver.observe(chat, { childList: true, subtree: true });
    }
    document.addEventListener('keydown', onKeyDown, true);
}
