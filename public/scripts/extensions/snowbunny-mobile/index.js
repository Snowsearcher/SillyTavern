const MOBILE_MEDIA_QUERY = '(max-width: 1000px)';
const ACTIVE_CLASS = 'snowbunny-mobile';
const SELECTED_MESSAGE_CLASS = 'snowbunny-message-selected';

let mobileQuery;
let initialized = false;

function isInteractiveTarget(target) {
    if (!(target instanceof Element)) {
        return false;
    }

    return Boolean(target.closest([
        'a',
        'button',
        'input',
        'textarea',
        'select',
        'option',
        'label',
        'summary',
        '[contenteditable="true"]',
        '.mes_buttons',
        '.mes_edit_buttons',
        '.mes_reasoning_details',
        '.swipe_left',
        '.swipe_right',
        '.interactable',
    ].join(',')));
}

function clearSelectedMessage(except = null) {
    document.querySelectorAll(`#chat .mes.${SELECTED_MESSAGE_CLASS}`).forEach(message => {
        if (message !== except) {
            message.classList.remove(SELECTED_MESSAGE_CLASS);
        }
    });
}

function syncMobileMode() {
    const enabled = Boolean(mobileQuery?.matches);
    document.body.classList.toggle(ACTIVE_CLASS, enabled);

    if (!enabled) {
        clearSelectedMessage();
    }
}

function onChatClick(event) {
    if (!document.body.classList.contains(ACTIVE_CLASS)) {
        return;
    }

    const target = event.target;
    if (!(target instanceof Element) || isInteractiveTarget(target)) {
        return;
    }

    const message = target.closest('#chat .mes');
    if (!message) {
        return;
    }

    const shouldOpen = !message.classList.contains(SELECTED_MESSAGE_CLASS);
    clearSelectedMessage(message);
    message.classList.toggle(SELECTED_MESSAGE_CLASS, shouldOpen);
}

function onDocumentPointerDown(event) {
    if (!document.body.classList.contains(ACTIVE_CLASS)) {
        return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }

    if (target.closest('#chat .mes')) {
        return;
    }

    clearSelectedMessage();
}

function onKeyDown(event) {
    if (event.key === 'Escape') {
        clearSelectedMessage();
    }
}

export function init() {
    if (initialized) {
        return;
    }

    initialized = true;
    mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    syncMobileMode();

    mobileQuery.addEventListener?.('change', syncMobileMode);
    document.addEventListener('click', onChatClick);
    document.addEventListener('pointerdown', onDocumentPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
}
