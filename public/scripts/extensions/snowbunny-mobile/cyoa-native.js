import { extension_prompt_roles, extension_prompt_types } from '../../../script.js';

const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SETTINGS_ID = 'snowbunny-cyoa-settings-native';
const STYLE_ID = 'snowbunny-cyoa-native-style';
const CARD_CLASS = 'snowbunny-cyoa-native-card';
const PROMPT_KEY = 'snowbunny-cyoa';

let initialized = false;
let drawerObserver = null;
let queued = false;

const STORY_CHOICE_PROMPT = `Story choices are enabled for this chat. Only when a meaningful decision point naturally occurs, you may append exactly one choice card to the END of the reply. Do not add a card to every reply.

Use exactly 2 to 5 paths:
<choicecard>
<path><act type="dialogue">A line the user could say</act><note>Optional short hint</note></path>
<path><act type="action">An action the user could take</act></path>
<path><act type="direction">A direction the user could give the story</act></path>
</choicecard>

Valid act types are dialogue, action, and direction. Each act must work as the user's next message. Never treat an unchosen path as an event that happened.`;

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
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
    border-radius: 16px;
    background: linear-gradient(145deg,
      color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent),
      color-mix(in srgb, var(--SmartThemeBlurTintColor) 70%, transparent));
    box-shadow: 0 8px 22px rgb(0 0 0 / 12%);
  }
  .${CARD_CLASS}.stale { opacity: .66; }
  .snowbunny-cyoa-native-heading {
    display: flex; align-items: center; gap: 8px; margin: 0 1px 8px;
    font-size: .72rem; font-weight: 760; letter-spacing: .02em; opacity: .76;
  }
  .snowbunny-cyoa-native-path {
    width: 100%; min-height: 52px; display: flex; align-items: flex-start; gap: 10px;
    margin: 6px 0 0; padding: 9px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent);
    color: inherit; text-align: left;
  }
  .snowbunny-cyoa-native-path:not(:disabled):active {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 54%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent);
  }
  .snowbunny-cyoa-native-type {
    width: 30px; height: 30px; flex: 0 0 30px; display: inline-flex;
    align-items: center; justify-content: center; border-radius: 10px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent); opacity: .82;
  }
  .snowbunny-cyoa-native-copy { flex: 1; min-width: 0; }
  .snowbunny-cyoa-native-copy strong { display: block; font-size: .82rem; line-height: 1.38; font-weight: 620; }
  .snowbunny-cyoa-native-copy small { display: block; margin-top: 4px; font-size: .68rem; line-height: 1.35; opacity: .58; }

  #${SETTINGS_ID} {
    position: fixed; z-index: 12130; inset: 0; display: flex; align-items: flex-end;
    justify-content: center; background: rgb(0 0 0 / 48%);
  }
  #${SETTINGS_ID} .snowbunny-cyoa-native-settings {
    width: min(100%, 620px); padding: 8px 14px calc(18px + env(safe-area-inset-bottom));
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 74%, transparent);
    border-bottom: 0; border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor); box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  #${SETTINGS_ID} .snowbunny-cyoa-native-handle {
    width: 38px; height: 4px; margin: 0 auto 8px; border-radius: 999px;
    background: currentColor; opacity: .24;
  }
  #${SETTINGS_ID} .snowbunny-cyoa-native-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  #${SETTINGS_ID} .snowbunny-cyoa-native-header h3 { flex: 1; margin: 0; font-size: 1rem; }
  #${SETTINGS_ID} .snowbunny-cyoa-native-close {
    width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; color: inherit;
  }
  #${SETTINGS_ID} .snowbunny-cyoa-native-toggle {
    display: flex; align-items: center; gap: 12px; padding: 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent);
    border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent);
  }
  #${SETTINGS_ID} .snowbunny-cyoa-native-toggle-copy { flex: 1; min-width: 0; }
  #${SETTINGS_ID} .snowbunny-cyoa-native-toggle-copy strong,
  #${SETTINGS_ID} .snowbunny-cyoa-native-toggle-copy small { display: block; }
  #${SETTINGS_ID} .snowbunny-cyoa-native-toggle-copy strong { font-size: .86rem; }
  #${SETTINGS_ID} .snowbunny-cyoa-native-toggle-copy small { margin-top: 3px; font-size: .7rem; opacity: .58; }
  #${SETTINGS_ID} .snowbunny-cyoa-native-toggle input { width: 20px; height: 20px; }
  #${SETTINGS_ID} .snowbunny-cyoa-native-help-title { margin: 15px 2px 6px; font-size: .82rem; font-weight: 720; }
  #${SETTINGS_ID} .snowbunny-cyoa-native-help {
    padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 15px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 48%, transparent);
  }
  #${SETTINGS_ID} .snowbunny-cyoa-native-help p { margin: 6px 0; font-size: .74rem; line-height: 1.42; opacity: .76; }
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
        enabled() ? STORY_CHOICE_PROMPT : '',
        extension_prompt_types.IN_PROMPT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
}

function decodePlain(value) {
    const tmp = document.createElement('div');
    tmp.innerHTML = String(value || '').replace(/<[^>]*>/g, '');
    return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
}

function parseCard(content) {
    const cards = [...String(content || '').matchAll(/<choicecard\b[^>]*>([\s\S]*?)<\/choicecard>/gi)];
    if (cards.length !== 1) return null;
    const choices = [];
    for (const path of cards[0][1].matchAll(/<path\b[^>]*>([\s\S]*?)<\/path>/gi)) {
        const act = /<act\b([^>]*)>([\s\S]*?)<\/act>/i.exec(path[1]);
        if (!act) return null;
        const type = /type\s*=\s*["']?(dialogue|action|direction)/i.exec(act[1])?.[1]?.toLowerCase() || 'action';
        let text = decodePlain(act[2]);
        if (!text || text.length > 10000) return null;
        if (type === 'dialogue') text = `"${text.replace(/^["“”]+|["“”]+$/g, '').trim()}"`;
        const note = /<note\b[^>]*>([\s\S]*?)<\/note>/i.exec(path[1]);
        choices.push({ type, text, note: decodePlain(note?.[1] || '') });
    }
    if (choices.length < 2 || choices.length > 5) return null;
    return { raw: cards[0][0], choices };
}

function messageStamp(message) {
    return globalThis.SnowBunny?.identity?.current?.(message)?.source
        || `${message?.send_date || ''}:${String(message?.mes || '').length}:${Number(message?.swipe_id) || 0}`;
}

function latestVisibleAssistant() {
    const api = context();
    const ignore = api?.symbols?.ignore;
    for (let index = (api?.chat?.length || 0) - 1; index >= 0; index--) {
        const message = api.chat[index];
        if (!message || message.is_user || message.is_system) continue;
        if (ignore && message.extra?.[ignore]) continue;
        return index;
    }
    return -1;
}

function generationBusy() {
    if (context()?.streamingProcessor) return true;
    const stop = document.getElementById('mes_stop');
    return stop instanceof HTMLElement && getComputedStyle(stop).display !== 'none' && !stop.classList.contains('displayNone');
}

function typeIcon(type) {
    if (type === 'dialogue') return 'fa-quote-left';
    if (type === 'direction') return 'fa-compass';
    return 'fa-person-walking-arrow-right';
}

function sendChoice(index, stamp, text) {
    const api = context();
    const message = api?.chat?.[index];
    if (!enabled() || !message || messageStamp(message) !== stamp || latestVisibleAssistant() !== index || generationBusy()) {
        queueReconcile();
        return;
    }
    const textarea = document.getElementById('send_textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('send_but')?.click();
}

function renderProse(message, index, parsed, stamp) {
    const textNode = document.querySelector(`#chat .mes[mesid="${index}"] .mes_text`);
    if (!(textNode instanceof HTMLElement)) return;
    const prose = String(message.mes || '').replace(parsed.raw, '').trimEnd();
    const proseStamp = `${stamp}:${prose.length}`;
    if (textNode.dataset.snowbunnyCyoaProse === proseStamp) return;
    const api = context();
    textNode.innerHTML = typeof api?.messageFormatting === 'function'
        ? api.messageFormatting(prose, message.name || '', Boolean(message.is_system), Boolean(message.is_user), index)
        : prose;
    textNode.dataset.snowbunnyCyoaProse = proseStamp;
}

function createCard(message, index, parsed, active, stamp) {
    const card = el('div', CARD_CLASS);
    card.dataset.snowbunnyCyoaMessage = String(index);
    card.dataset.snowbunnyCyoaStamp = stamp;
    if (!active) card.classList.add('stale');
    const heading = el('div', 'snowbunny-cyoa-native-heading');
    heading.append(icon('fa-signs-post'), el('span', '', active ? 'Choose your next move' : 'Story choices'));
    card.append(heading);
    for (const choice of parsed.choices) {
        const button = el('button', 'snowbunny-cyoa-native-path');
        button.type = 'button';
        button.disabled = !active;
        const type = el('span', 'snowbunny-cyoa-native-type');
        type.append(icon(typeIcon(choice.type)));
        const copy = el('span', 'snowbunny-cyoa-native-copy');
        copy.append(el('strong', '', choice.text));
        if (choice.note) copy.append(el('small', '', choice.note));
        button.append(type, copy);
        if (active) button.addEventListener('click', () => sendChoice(index, stamp, choice.text));
        card.append(button);
    }
    return card;
}

function updateActiveState(card, active) {
    card.classList.toggle('stale', !active);
    const heading = card.querySelector('.snowbunny-cyoa-native-heading span');
    if (heading) heading.textContent = active ? 'Choose your next move' : 'Story choices';
    card.querySelectorAll('.snowbunny-cyoa-native-path').forEach(button => {
        if (button instanceof HTMLButtonElement) button.disabled = !active;
    });
}

function reconcileCards() {
    queued = false;
    const api = context();
    if (!Array.isArray(api?.chat)) return;
    const expected = new Set();
    const latest = latestVisibleAssistant();
    for (let index = 0; index < api.chat.length; index++) {
        const message = api.chat[index];
        if (!message || message.is_user || message.is_system) continue;
        const parsed = parseCard(message.mes);
        if (!parsed) continue;
        const stamp = messageStamp(message);
        const active = enabled() && index === latest && !generationBusy();
        const block = document.querySelector(`#chat .mes[mesid="${index}"] .mes_block`);
        if (!(block instanceof HTMLElement)) continue;
        renderProse(message, index, parsed, stamp);
        expected.add(String(index));
        let card = block.querySelector(`:scope > .${CARD_CLASS}[data-snowbunny-cyoa-message="${index}"]`);
        if (!(card instanceof HTMLElement) || card.dataset.snowbunnyCyoaStamp !== stamp) {
            card?.remove();
            card = createCard(message, index, parsed, active, stamp);
            block.append(card);
        } else {
            updateActiveState(card, active);
        }
    }
    document.querySelectorAll(`.${CARD_CLASS}`).forEach(card => {
        if (!expected.has(card.getAttribute('data-snowbunny-cyoa-message') || '')) card.remove();
    });
}

function queueReconcile() {
    if (queued) return;
    queued = true;
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
    const card = el('section', 'snowbunny-cyoa-native-settings');
    card.append(el('div', 'snowbunny-cyoa-native-handle'));
    const header = el('div', 'snowbunny-cyoa-native-header');
    header.append(icon('fa-signs-post'), el('h3', '', 'CYOAs'));
    const close = el('button', 'snowbunny-cyoa-native-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close CYOAs');
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSettings);
    header.append(close);
    card.append(header);

    const label = el('label', 'snowbunny-cyoa-native-toggle');
    const marker = el('span');
    marker.append(icon('fa-route'));
    const copy = el('span', 'snowbunny-cyoa-native-toggle-copy');
    const helpText = el('small', '', enabled()
        ? 'The story may offer choices when a decision matters.'
        : 'No new choice cards will be requested in this chat.');
    copy.append(el('strong', '', 'Story choices'), helpText);
    const input = el('input');
    input.type = 'checkbox';
    input.checked = enabled();
    input.addEventListener('change', () => {
        setEnabled(input.checked);
        helpText.textContent = input.checked
            ? 'The story may offer choices when a decision matters.'
            : 'No new choice cards will be requested in this chat.';
    });
    label.append(marker, copy, input);
    card.append(label, el('div', 'snowbunny-cyoa-native-help-title', 'How it works'));
    const help = el('div', 'snowbunny-cyoa-native-help');
    help.append(
        el('p', '', 'Tap a path to send it as your next message.'),
        el('p', '', 'Dialogue stays quoted. Actions and directions stay plain.'),
        el('p', '', 'Ignore the card whenever you want and write your own reply. Older cards stay readable but stop being clickable.'),
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
    if (row.dataset.snowbunnyCyoaNative === '1') return;
    row.dataset.snowbunnyCyoaNative = '1';
    row.addEventListener('click', openSettings);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of [
        'CHAT_CHANGED', 'CHAT_LOADED', 'MESSAGE_RECEIVED', 'MESSAGE_UPDATED', 'MESSAGE_EDITED',
        'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED', 'MORE_MESSAGES_LOADED',
        'CHARACTER_MESSAGE_RENDERED', 'GENERATION_ENDED', 'GENERATION_STOPPED',
    ]) {
        const event = types[name];
        if (!event) continue;
        source.on(event, () => {
            if (name === 'CHAT_CHANGED' || name === 'CHAT_LOADED') syncPrompt();
            enhanceRow();
            window.setTimeout(queueReconcile, 0);
        });
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(SETTINGS_ID)) {
        event.preventDefault();
        closeSettings();
    }
}

export function initCyoaNative() {
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
    document.addEventListener('keydown', onKeyDown, true);
}
