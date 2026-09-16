const MOBILE_MEDIA_QUERY = '(max-width: 1000px)';
const ACTIVE_CLASS = 'snowbunny-mobile';
const SELECTED_MESSAGE_CLASS = 'snowbunny-message-selected';
const COLLAPSED_MESSAGE_CLASS = 'snowbunny-message-collapsed';
const MESSAGE_MENU_ID = 'snowbunny-message-menu';
const TAIL_ACTIONS_CLASS = 'snowbunny-tail-actions';
const ATTACH_BUTTON_ID = 'snowbunny-attach-button';

let mobileQuery;
let initialized = false;
let selectedMessage = null;
let messageMenu = null;
let chatObserver = null;
let chromeObserver = null;
let reconcileQueued = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function isMobileMode() {
    return Boolean(mobileQuery?.matches && document.body.classList.contains(ACTIVE_CLASS));
}

function messageId(message) {
    const value = Number.parseInt(message?.getAttribute?.('mesid') ?? '', 10);
    return Number.isInteger(value) && value >= 0 ? value : null;
}

function chatMessage(message) {
    const id = messageId(message);
    return id === null ? null : context()?.chat?.[id] ?? null;
}

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
        '.swipes-counter',
        `#${MESSAGE_MENU_ID}`,
        `.${TAIL_ACTIONS_CLASS}`,
        '.interactable',
    ].join(',')));
}

function visibleNativeButton(message, selectors) {
    for (const selector of selectors) {
        const button = message.querySelector(selector);
        if (!button) continue;
        if (button.classList.contains('displayNone')) continue;
        if (button.style.display === 'none') continue;
        return button;
    }
    return null;
}

function nativeButton(message, selectors) {
    for (const selector of selectors) {
        const button = message.querySelector(selector);
        if (button) return button;
    }
    return null;
}

function generationBusy() {
    const stop = document.querySelector('#mes_stop');
    return Boolean(stop && getComputedStyle(stop).display !== 'none' && stop.getClientRects().length);
}

function latestMessageElement() {
    const messages = document.querySelectorAll('#chat .mes');
    return messages.length ? messages[messages.length - 1] : null;
}

function latestAssistantMessage() {
    const latest = latestMessageElement();
    const data = latest && chatMessage(latest);
    if (!latest || !data || data.is_user || data.is_system) return null;
    return latest;
}

function dispatchInput(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

function showToast(message) {
    if (globalThis.toastr?.info) {
        globalThis.toastr.info(message);
        return;
    }
    console.info(`[SnowBunny] ${message}`);
}

function copyMessage(message) {
    const data = chatMessage(message);
    const text = typeof data?.mes === 'string'
        ? data.mes
        : message.querySelector('.mes_text')?.textContent ?? '';

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Message copied.'))
            .catch(() => nativeButton(message, ['.mes_copy'])?.click());
        return;
    }

    nativeButton(message, ['.mes_copy'])?.click();
}

function useAsDraft(message) {
    const textarea = document.querySelector('#send_textarea');
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    const data = chatMessage(message);
    textarea.value = typeof data?.mes === 'string'
        ? data.mes
        : message.querySelector('.mes_text')?.textContent ?? '';
    dispatchInput(textarea);
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

async function deleteMessage(message) {
    const id = messageId(message);
    const api = context();
    if (id === null || typeof api?.deleteMessage !== 'function') return;

    closeMessageMenu();
    await api.deleteMessage(id, undefined, true);
    queueReconcile();
}

function editMessage(message) {
    const edit = nativeButton(message, ['.mes_edit']);
    if (!edit) return;
    closeMessageMenu();
    edit.click();
}

function switchMessageVisibility(message) {
    const button = visibleNativeButton(message, ['.mes_hide', '.mes_unhide'])
        ?? nativeButton(message, ['.mes_hide', '.mes_unhide']);
    if (!button) return;
    button.click();
    queueReconcile();
}

function viewContext(message) {
    const prompt = nativeButton(message, ['.mes_prompt']);
    if (!prompt || prompt.style.display === 'none' || prompt.classList.contains('displayNone')) {
        showToast('No saved prompt receipt is available for this reply yet.');
        return;
    }
    closeMessageMenu();
    prompt.click();
}

function showReplies(message) {
    const data = chatMessage(message);
    if (!Array.isArray(data?.swipes) || data.swipes.length < 2) {
        showToast('This reply has no alternate responses yet.');
        return;
    }

    const picker = nativeButton(message, ['.mes_swipe_picker']);
    if (!picker) return;
    closeMessageMenu();
    picker.click();
}

async function retryLatest() {
    if (generationBusy()) return;

    const native = document.querySelector('#option_regenerate');
    if (native instanceof HTMLElement) {
        native.click();
        return;
    }

    const api = context();
    if (typeof api?.generate === 'function') {
        await api.generate('regenerate');
    }
}

async function continueLatest() {
    if (generationBusy()) return;

    const native = document.querySelector('#mes_continue');
    if (native instanceof HTMLElement) {
        native.click();
        return;
    }

    const api = context();
    if (typeof api?.generate === 'function') {
        await api.generate('continue');
    }
}

function toggleCollapse(message) {
    message.classList.toggle(COLLAPSED_MESSAGE_CLASS);
    const button = messageMenu?.querySelector('[data-action="collapse"] .snowbunny-action-label');
    if (button) {
        button.textContent = message.classList.contains(COLLAPSED_MESSAGE_CLASS)
            ? 'Expand'
            : 'Collapse';
    }
    positionMessageMenu();
}

function nativeSecondaryActions(message) {
    const ignored = new Set([
        'mes_copy',
        'mes_edit',
        'mes_hide',
        'mes_unhide',
        'mes_prompt',
        'mes_swipe_picker',
    ]);

    return [...message.querySelectorAll('.extraMesButtons .mes_button')]
        .filter(button => ![...ignored].some(name => button.classList.contains(name)))
        .filter(button => !button.classList.contains('displayNone') && button.style.display !== 'none')
        .map(button => ({
            label: button.getAttribute('title') || button.getAttribute('aria-label') || 'Action',
            iconClasses: [...button.classList].filter(name => name.startsWith('fa-')),
            run: () => {
                closeMessageMenu();
                button.click();
            },
        }));
}

function actionButton({ action, label, icon, disabled = false, run }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'snowbunny-message-action';
    button.dataset.action = action;
    button.disabled = disabled;
    button.setAttribute('aria-disabled', String(disabled));

    const iconNode = document.createElement('i');
    iconNode.className = `snowbunny-action-icon ${icon}`;
    iconNode.setAttribute('aria-hidden', 'true');

    const labelNode = document.createElement('span');
    labelNode.className = 'snowbunny-action-label';
    labelNode.textContent = label;

    button.append(iconNode, labelNode);
    if (!disabled) button.addEventListener('click', run);
    return button;
}

function buildMessageMenu(message) {
    const api = context();
    const data = chatMessage(message);
    const latestAssistant = latestAssistantMessage() === message;
    const ignoreKey = api?.symbols?.ignore;
    const hidden = Boolean(ignoreKey && data?.extra?.[ignoreKey]);
    const prompt = nativeButton(message, ['.mes_prompt']);
    const canViewContext = Boolean(
        prompt
        && !prompt.classList.contains('displayNone')
        && prompt.style.display !== 'none',
    );
    const hasReplies = Array.isArray(data?.swipes) && data.swipes.length > 1;

    const menu = document.createElement('div');
    menu.id = MESSAGE_MENU_ID;
    menu.className = 'snowbunny-message-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Message actions');

    const header = document.createElement('div');
    header.className = 'snowbunny-message-menu-header';

    const title = document.createElement('div');
    title.className = 'snowbunny-message-menu-title';
    title.textContent = message.querySelector('.name_text')?.textContent?.trim() || (data?.is_user ? 'You' : 'Message');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'snowbunny-message-menu-close fa-solid fa-xmark';
    close.setAttribute('aria-label', 'Close message actions');
    close.addEventListener('click', closeMessageMenu);
    header.append(title, close);

    const actions = document.createElement('div');
    actions.className = 'snowbunny-message-actions';
    const collapsed = message.classList.contains(COLLAPSED_MESSAGE_CLASS);
    const busy = generationBusy();

    const definitions = [
        { action: 'copy', label: 'Copy', icon: 'fa-solid fa-copy', run: () => copyMessage(message) },
        { action: 'edit', label: 'Edit', icon: 'fa-solid fa-pencil', disabled: busy, run: () => editMessage(message) },
        { action: 'draft', label: 'Use as Draft', icon: 'fa-solid fa-pen-to-square', run: () => { useAsDraft(message); closeMessageMenu(); } },
        { action: 'delete', label: 'Delete', icon: 'fa-solid fa-trash-can', disabled: busy, run: () => void deleteMessage(message) },
        { action: 'retry', label: 'Retry', icon: 'fa-solid fa-rotate-right', disabled: busy || !latestAssistant, run: () => { closeMessageMenu(); void retryLatest(); } },
        { action: 'hide', label: hidden ? 'Show' : 'Hide', icon: hidden ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash', disabled: busy, run: () => switchMessageVisibility(message) },
        { action: 'collapse', label: collapsed ? 'Expand' : 'Collapse', icon: collapsed ? 'fa-solid fa-angles-down' : 'fa-solid fa-angles-up', run: () => toggleCollapse(message) },
        { action: 'context', label: 'View Context', icon: 'fa-solid fa-list-check', disabled: !canViewContext, run: () => viewContext(message) },
        { action: 'replies', label: 'Replies', icon: 'fa-solid fa-layer-group', disabled: !hasReplies || busy, run: () => showReplies(message) },
    ];

    for (const definition of definitions) {
        actions.append(actionButton(definition));
    }

    const secondary = nativeSecondaryActions(message);
    if (secondary.length) {
        const moreButton = actionButton({
            action: 'more',
            label: 'More',
            icon: 'fa-solid fa-ellipsis',
            run: () => {
                menu.classList.toggle('snowbunny-more-open');
                positionMessageMenu();
            },
        });
        actions.append(moreButton);

        const more = document.createElement('div');
        more.className = 'snowbunny-message-more';
        for (const item of secondary) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'snowbunny-message-more-action';
            const icon = document.createElement('i');
            icon.className = item.iconClasses.length
                ? item.iconClasses.join(' ')
                : 'fa-solid fa-circle-dot';
            const label = document.createElement('span');
            label.textContent = item.label;
            button.append(icon, label);
            button.addEventListener('click', item.run);
            more.append(button);
        }
        menu.append(header, actions, more);
    } else {
        menu.append(header, actions);
    }

    return menu;
}

function positionMessageMenu() {
    if (!messageMenu || !selectedMessage?.isConnected || !isMobileMode()) return;

    const rect = selectedMessage.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 16);
    messageMenu.style.width = `${width}px`;
    messageMenu.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + (rect.width - width) / 2))}px`;

    const menuHeight = messageMenu.getBoundingClientRect().height;
    const below = rect.bottom + 8;
    const above = rect.top - menuHeight - 8;
    const top = below + menuHeight <= window.innerHeight - 8
        ? below
        : Math.max(8, above);
    messageMenu.style.top = `${top}px`;
}

function closeMessageMenu() {
    messageMenu?.remove();
    messageMenu = null;
    selectedMessage?.classList.remove(SELECTED_MESSAGE_CLASS);
    selectedMessage = null;
}

function openMessageMenu(message) {
    if (!isMobileMode() || !message?.isConnected) return;

    if (selectedMessage === message && messageMenu) {
        closeMessageMenu();
        return;
    }

    closeMessageMenu();
    selectedMessage = message;
    selectedMessage.classList.add(SELECTED_MESSAGE_CLASS);
    messageMenu = buildMessageMenu(message);
    document.body.append(messageMenu);
    requestAnimationFrame(positionMessageMenu);
}

function triggerAttachmentPicker() {
    const input = document.querySelector('#file_form_input');
    if (input instanceof HTMLInputElement) {
        input.click();
        return;
    }
    document.querySelector('#options_button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function enhanceComposer() {
    const host = document.querySelector('#nonQRFormItems');
    if (!host || document.getElementById(ATTACH_BUTTON_ID)) return;

    const button = document.createElement('button');
    button.id = ATTACH_BUTTON_ID;
    button.type = 'button';
    button.className = 'snowbunny-composer-button snowbunny-attach-button';
    button.setAttribute('aria-label', 'Add attachment');
    button.title = 'Add attachment';
    button.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
    button.addEventListener('click', triggerAttachmentPicker);
    host.prepend(button);

    const options = document.querySelector('#options_button');
    if (options instanceof HTMLElement) {
        options.setAttribute('aria-label', 'Tools and extensions');
        options.title = 'Tools and extensions';
    }
}

function createTailActions(message) {
    const id = messageId(message);
    if (id === null) return null;

    const actions = document.createElement('div');
    actions.className = TAIL_ACTIONS_CLASS;
    actions.dataset.messageId = String(id);
    actions.setAttribute('aria-label', 'Latest reply actions');

    const make = (label, icon, handler) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'snowbunny-tail-action';
        button.dataset.action = label.toLowerCase();
        button.innerHTML = `<i class="${icon}" aria-hidden="true"></i><span>${label}</span>`;
        button.addEventListener('click', handler);
        return button;
    };

    actions.append(
        make('Retry', 'fa-solid fa-rotate-right', () => void retryLatest()),
        make('Continue', 'fa-solid fa-arrow-right', () => void continueLatest()),
    );
    return actions;
}

function syncTailActions() {
    const existing = document.querySelector(`.${TAIL_ACTIONS_CLASS}`);
    const message = isMobileMode() ? latestAssistantMessage() : null;
    const id = messageId(message);

    if (!message || id === null) {
        existing?.remove();
        return;
    }

    let actions = existing;
    if (!actions || actions.dataset.messageId !== String(id) || actions.previousElementSibling !== message) {
        actions?.remove();
        actions = createTailActions(message);
        if (!actions) return;
        message.insertAdjacentElement('afterend', actions);
    }

    const busy = generationBusy();
    for (const button of actions.querySelectorAll('.snowbunny-tail-action')) {
        if (button.disabled !== busy) button.disabled = busy;
        button.setAttribute('aria-disabled', String(busy));
    }
}

function syncMessagePresentation() {
    if (!isMobileMode()) return;

    const messages = [...document.querySelectorAll('#chat .mes')];
    for (const message of messages) {
        const data = chatMessage(message);
        message.classList.toggle('snowbunny-user-message', Boolean(data?.is_user));
        message.classList.toggle('snowbunny-system-message', Boolean(data?.is_system));
    }
}

function reconcile() {
    reconcileQueued = false;
    enhanceComposer();
    syncMessagePresentation();
    syncTailActions();

    if (selectedMessage && !selectedMessage.isConnected) {
        closeMessageMenu();
    } else if (messageMenu) {
        positionMessageMenu();
    }
}

function queueReconcile() {
    if (reconcileQueued) return;
    reconcileQueued = true;
    requestAnimationFrame(reconcile);
}

function attachObservers() {
    chatObserver?.disconnect();
    const chat = document.querySelector('#chat');
    if (chat) {
        chatObserver = new MutationObserver(queueReconcile);
        chatObserver.observe(chat, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'is_user', 'is_system'],
        });
        chat.addEventListener('scroll', () => {
            if (messageMenu) closeMessageMenu();
        }, { passive: true });
    }

    chromeObserver?.disconnect();
    const chrome = document.querySelector('#send_form');
    if (chrome) {
        chromeObserver = new MutationObserver(queueReconcile);
        chromeObserver.observe(chrome, { childList: true, subtree: true, attributes: true });
    }
}

function syncMobileMode() {
    const enabled = Boolean(mobileQuery?.matches);
    document.body.classList.toggle(ACTIVE_CLASS, enabled);

    if (!enabled) {
        closeMessageMenu();
        document.querySelectorAll(`.${TAIL_ACTIONS_CLASS}`).forEach(node => node.remove());
    }

    queueReconcile();
}

function onChatClick(event) {
    if (!isMobileMode()) return;

    const target = event.target;
    if (!(target instanceof Element) || isInteractiveTarget(target)) return;

    const message = target.closest('#chat .mes');
    if (!message) return;

    openMessageMenu(message);
}

function onDocumentPointerDown(event) {
    if (!isMobileMode() || !messageMenu) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (messageMenu.contains(target) || selectedMessage?.contains(target)) return;
    closeMessageMenu();
}

function onKeyDown(event) {
    if (event.key === 'Escape') {
        closeMessageMenu();
    }
}

export function init() {
    if (initialized) return;

    initialized = true;
    mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    syncMobileMode();
    enhanceComposer();
    attachObservers();
    queueReconcile();

    mobileQuery.addEventListener?.('change', syncMobileMode);
    document.addEventListener('click', onChatClick);
    document.addEventListener('pointerdown', onDocumentPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', queueReconcile, { passive: true });
}
