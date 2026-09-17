const MENU_ID = 'snowbunny-message-menu';
const SELECTED_CLASS = 'snowbunny-message-selected';

let initialized = false;
let observer = null;
let queued = false;

function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hidden || element.classList.contains('displayNone')) return false;
    if (element.style.display === 'none' || element.style.visibility === 'hidden') return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

function closeMenu(menu) {
    const close = menu.querySelector('.snowbunny-message-menu-close');
    if (close instanceof HTMLElement) close.click();
    else menu.remove();
}

function selectedMessage() {
    return document.querySelector(`#chat .mes.${SELECTED_CLASS}`);
}

function nativeOlderRetry(message) {
    if (!(message instanceof HTMLElement)) return null;
    const candidates = [
        message.querySelector('.swipe_right'),
        message.querySelector('.mes_swipe_right'),
    ];
    return candidates.find(candidate => candidate instanceof HTMLElement && visible(candidate))
        || candidates.find(candidate => candidate instanceof HTMLElement)
        || null;
}

function latestAssistantMessage() {
    const messages = [...document.querySelectorAll('#chat .mes')];
    for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index];
        if (message.getAttribute('is_user') === 'true') continue;
        if (message.getAttribute('is_system') === 'true') continue;
        return message;
    }
    return null;
}

function enhance() {
    queued = false;
    const menu = document.getElementById(MENU_ID);
    const message = selectedMessage();
    if (!(menu instanceof HTMLElement) || !(message instanceof HTMLElement)) return;
    if (message === latestAssistantMessage()) return;

    const retry = menu.querySelector('[data-action="retry"]');
    const source = nativeOlderRetry(message);
    if (!(retry instanceof HTMLButtonElement) || !(source instanceof HTMLElement)) return;

    retry.disabled = false;
    retry.setAttribute('aria-disabled', 'false');
    const label = retry.querySelector('.snowbunny-action-label');
    if (label) label.textContent = 'Retry from here';
    if (retry.dataset.snowbunnyOlderRetry === '1') return;
    retry.dataset.snowbunnyOlderRetry = '1';
    retry.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeMenu(menu);
        source.click();
    }, true);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

export function initOlderMessageRetry() {
    if (initialized) return;
    initialized = true;
    observer = new MutationObserver(queueEnhance);
    observer.observe(document.body, { childList: true, subtree: true });
    queueEnhance();
}
