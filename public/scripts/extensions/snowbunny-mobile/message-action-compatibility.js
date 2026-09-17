const MENU_ID = 'snowbunny-message-menu';
const SELECTED_MESSAGE_CLASS = 'snowbunny-message-selected';
const MORE_CLASS = 'snowbunny-message-more';
const ACTION_DATASET_KEY = 'snowbunnyNativeActionKey';

const PRIMARY_ACTION_CLASSES = new Set([
    'mes_copy',
    'mes_edit',
    'mes_hide',
    'mes_unhide',
    'mes_prompt',
    'mes_swipe_picker',
]);

let initialized = false;
let observer = null;
let syncQueued = false;

function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hidden || element.classList.contains('displayNone')) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element instanceof HTMLButtonElement && element.disabled) return false;
    if (element.style.display === 'none' || element.style.visibility === 'hidden') return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

function handledByPrimaryMenu(element) {
    return [...PRIMARY_ACTION_CLASSES].some(name => element.classList.contains(name));
}

function labelFor(element) {
    const raw = element.getAttribute('title')
        || element.getAttribute('aria-label')
        || element.getAttribute('data-tooltip')
        || element.textContent
        || '';
    const label = String(raw).split('\n')[0].trim();
    if (label) return label;

    const semanticClass = [...element.classList].find(name =>
        !name.startsWith('fa-')
        && !['mes_button', 'menu_button', 'right_menu_button'].includes(name),
    );
    if (!semanticClass) return 'Action';
    return semanticClass
        .replace(/^mes_/, '')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, value => value.toUpperCase());
}

function iconClassesFor(element) {
    return [...element.classList].filter(name => name.startsWith('fa-'));
}

function actionKey(element, label) {
    if (element.id) return `id:${element.id}`;
    const semantic = [...element.classList]
        .filter(name => !name.startsWith('fa-') && !['mes_button', 'menu_button'].includes(name))
        .sort()
        .join('.');
    if (semantic) return `class:${semantic}`;
    return `label:${label.toLowerCase()}`;
}

function nativeActions(message) {
    const actions = [];
    const seen = new Set();

    for (const container of message.querySelectorAll('.mes_buttons')) {
        for (const child of container.children) {
            if (!(child instanceof HTMLElement)) continue;
            if (child.classList.contains('extraMesButtons') || child.classList.contains('extraMesButtonsHint')) continue;
            if (!child.matches('.mes_button, .menu_button, button, [role="button"], [data-action], [data-message-action]')) continue;
            if (handledByPrimaryMenu(child) || !visible(child)) continue;

            const label = labelFor(child);
            const key = actionKey(child, label);
            if (seen.has(key)) continue;
            seen.add(key);
            actions.push({ source: child, label, key, iconClasses: iconClassesFor(child) });
        }
    }

    return actions;
}

function reposition(menu, message) {
    if (!(menu instanceof HTMLElement) || !(message instanceof HTMLElement)) return;
    const rect = message.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 16);
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + (rect.width - width) / 2))}px`;

    const menuHeight = menu.getBoundingClientRect().height;
    const below = rect.bottom + 8;
    const above = rect.top - menuHeight - 8;
    const top = below + menuHeight <= window.innerHeight - 8 ? below : Math.max(8, above);
    menu.style.top = `${top}px`;
}

function ensureMore(menu, message) {
    let more = menu.querySelector(`.${MORE_CLASS}`);
    if (more instanceof HTMLElement) return more;

    const actions = menu.querySelector('.snowbunny-message-actions');
    if (!(actions instanceof HTMLElement)) return null;

    let trigger = actions.querySelector('[data-action="more"]');
    if (!(trigger instanceof HTMLButtonElement)) {
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'snowbunny-message-action';
        trigger.dataset.action = 'more';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = '<i class="snowbunny-action-icon fa-solid fa-ellipsis" aria-hidden="true"></i><span class="snowbunny-action-label">More</span>';
        trigger.addEventListener('click', () => {
            const open = menu.classList.toggle('snowbunny-more-open');
            trigger.setAttribute('aria-expanded', String(open));
            requestAnimationFrame(() => reposition(menu, message));
        });
        actions.append(trigger);
    }

    more = document.createElement('div');
    more.className = MORE_CLASS;
    menu.append(more);
    return more;
}

function appendAction(more, action) {
    const duplicate = [...more.querySelectorAll('.snowbunny-message-more-action')].some(button =>
        button instanceof HTMLElement && button.dataset[ACTION_DATASET_KEY] === action.key,
    );
    if (duplicate) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'snowbunny-message-more-action';
    button.dataset[ACTION_DATASET_KEY] = action.key;

    const icon = document.createElement('i');
    icon.className = action.iconClasses.length ? action.iconClasses.join(' ') : 'fa-solid fa-circle-dot';
    icon.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = action.label;
    button.append(icon, label);
    button.addEventListener('click', () => {
        document.getElementById(MENU_ID)?.remove();
        action.source.click();
    });
    more.append(button);
}

function syncMenu() {
    syncQueued = false;
    const menu = document.getElementById(MENU_ID);
    const message = document.querySelector(`#chat .mes.${SELECTED_MESSAGE_CLASS}`);
    if (!(menu instanceof HTMLElement) || !(message instanceof HTMLElement)) return;

    const actions = nativeActions(message);
    if (!actions.length) return;
    const more = ensureMore(menu, message);
    if (!(more instanceof HTMLElement)) return;

    for (const action of actions) appendAction(more, action);
    requestAnimationFrame(() => reposition(menu, message));
}

function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(syncMenu);
}

export function initMessageActionCompatibility() {
    if (initialized) return;
    initialized = true;

    observer = new MutationObserver(queueSync);
    observer.observe(document.body, { childList: true, subtree: true });
    queueSync();
}
