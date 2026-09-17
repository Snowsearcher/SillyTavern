const STYLE_ID = 'snowbunny-guided-generations-bridge-style';
const GG_BUTTON_ID = 'gg_menu_button';
const PG_BUTTON_ID = 'pg_menu_button';
const RESPONSE_BUTTON_ID = 'gg_response_button';
const LEFT_FORM_ID = 'leftSendForm';
const GG_ORIGINAL_CONTAINER_ID = 'gg-menu-buttons-container';
const GG_REGULAR_CONTAINER_ID = 'gg-regular-buttons-container';
const ACTION_PROXY_CLASS = 'snowbunny-gg-action-proxy';

let initialized = false;
let observer = null;
let mobileQuery = null;
let reconcileQueued = false;

function active() {
    return Boolean(mobileQuery?.matches && document.body.classList.contains('snowbunny-mobile'));
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  body.snowbunny-mobile #${LEFT_FORM_ID} > #${GG_BUTTON_ID},
  body.snowbunny-mobile #${LEFT_FORM_ID} > #${PG_BUTTON_ID},
  body.snowbunny-mobile #${LEFT_FORM_ID} > #${RESPONSE_BUTTON_ID} {
    width: 38px !important;
    min-width: 38px !important;
    height: 38px !important;
    min-height: 38px !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex: 0 0 38px !important;
    border-radius: 12px !important;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent) !important;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent) !important;
    color: inherit !important;
  }

  body.snowbunny-mobile #${LEFT_FORM_ID} > #${RESPONSE_BUTTON_ID} {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, var(--SmartThemeBlurTintColor)) !important;
  }

  body.snowbunny-mobile #${LEFT_FORM_ID} > #${GG_BUTTON_ID}:active,
  body.snowbunny-mobile #${LEFT_FORM_ID} > #${PG_BUTTON_ID}:active,
  body.snowbunny-mobile #${LEFT_FORM_ID} > #${RESPONSE_BUTTON_ID}:active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 20%, transparent) !important;
  }

  body.snowbunny-mobile #${LEFT_FORM_ID} > #${GG_BUTTON_ID} .gg-tools-menu {
    top: auto !important;
    bottom: calc(100% + 8px) !important;
    left: 0 !important;
    right: auto !important;
    width: min(88vw, 360px) !important;
    max-width: min(88vw, 360px) !important;
    max-height: 68dvh !important;
    overflow-y: auto !important;
    z-index: 13020 !important;
  }

  body.snowbunny-mobile #${GG_REGULAR_CONTAINER_ID} {
    display: none !important;
  }

  body.snowbunny-mobile #gg-action-button-container {
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow-x: auto !important;
    overflow-y: visible !important;
    overscroll-behavior-x: contain !important;
    scrollbar-width: none !important;
    padding: 2px 4px !important;
    gap: 3px !important;
  }

  body.snowbunny-mobile #gg-action-button-container:has(#gg-qr-container:empty) {
    display: none !important;
  }

  body.snowbunny-mobile #gg-action-button-container::-webkit-scrollbar {
    display: none !important;
  }

  body.snowbunny-mobile .${ACTION_PROXY_CLASS}.snowbunny-gg-section-label {
    pointer-events: none;
    padding-top: 9px !important;
    font-size: .68rem;
    font-weight: 750;
    opacity: .55;
    text-transform: uppercase;
    letter-spacing: .04em;
  }
}
`;
    document.head.append(style);
}

function originalMenuContainer() {
    return document.getElementById(GG_ORIGINAL_CONTAINER_ID);
}

function regularContainer() {
    return document.getElementById(GG_REGULAR_CONTAINER_ID);
}

function moveIntoComposer(button, after = null) {
    const left = document.getElementById(LEFT_FORM_ID);
    if (!(left instanceof HTMLElement) || !(button instanceof HTMLElement) || button.parentElement === left) return;

    if (after instanceof HTMLElement && after.parentElement === left) {
        after.insertAdjacentElement('afterend', button);
        return;
    }

    const nativeExtensions = document.getElementById('extensionsMenuButton');
    if (nativeExtensions?.parentElement === left) nativeExtensions.insertAdjacentElement('afterend', button);
    else left.append(button);
}

function restoreMenuButton(button) {
    const original = originalMenuContainer();
    if (original instanceof HTMLElement && button instanceof HTMLElement && button.parentElement !== original) original.append(button);
}

function restoreActionButton(button) {
    const original = regularContainer();
    if (original instanceof HTMLElement && button instanceof HTMLElement && button.parentElement !== original) original.append(button);
}

function actionLabel(button) {
    return button.getAttribute('title')?.trim()
        || button.getAttribute('aria-label')?.trim()
        || button.id.replace(/^gg_/, '').replace(/_button$/, '').replaceAll('_', ' ').replace(/\b\w/g, value => value.toUpperCase());
}

function actionIconClasses(button) {
    return [...button.classList].filter(name => name.startsWith('fa-'));
}

function clearActionProxies(menu) {
    menu.querySelectorAll(`.${ACTION_PROXY_CLASS}`).forEach(node => node.remove());
}

function addActionProxies() {
    const menu = document.getElementById('gg_tools_menu');
    const regular = regularContainer();
    if (!(menu instanceof HTMLElement) || !(regular instanceof HTMLElement)) return;

    clearActionProxies(menu);
    const buttons = [...regular.querySelectorAll('.gg-action-button')]
        .filter(button => button instanceof HTMLElement && button.id !== RESPONSE_BUTTON_ID);
    if (!buttons.length) return;

    const separator = document.createElement('hr');
    separator.className = `pg-separator ${ACTION_PROXY_CLASS}`;
    menu.append(separator);
    const label = document.createElement('div');
    label.className = `${ACTION_PROXY_CLASS} snowbunny-gg-section-label interactable`;
    label.textContent = 'Generation';
    menu.append(label);

    for (const source of buttons) {
        const item = document.createElement('a');
        item.href = '#';
        item.className = `${ACTION_PROXY_CLASS} interactable`;
        item.dataset.sourceId = source.id;
        item.title = source.getAttribute('title') || actionLabel(source);
        const icon = document.createElement('i');
        const icons = actionIconClasses(source);
        icon.className = `${icons.length ? icons.join(' ') : 'fa-solid fa-wand-magic-sparkles'} fa-fw`;
        const text = document.createElement('span');
        text.textContent = actionLabel(source);
        item.append(icon, text);
        item.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            source.click();
            menu.classList.remove('shown');
        });
        menu.append(item);
    }
}

function reconcileMobile() {
    const gg = document.getElementById(GG_BUTTON_ID);
    const pg = document.getElementById(PG_BUTTON_ID);
    const response = document.getElementById(RESPONSE_BUTTON_ID);

    if (gg instanceof HTMLElement) moveIntoComposer(gg);
    if (pg instanceof HTMLElement) moveIntoComposer(pg, gg instanceof HTMLElement ? gg : null);
    if (response instanceof HTMLElement) moveIntoComposer(response, pg instanceof HTMLElement ? pg : gg instanceof HTMLElement ? gg : null);
    addActionProxies();
}

function reconcileDesktop() {
    const gg = document.getElementById(GG_BUTTON_ID);
    const pg = document.getElementById(PG_BUTTON_ID);
    const response = document.getElementById(RESPONSE_BUTTON_ID);
    restoreMenuButton(gg);
    restoreMenuButton(pg);
    restoreActionButton(response);
    const menu = document.getElementById('gg_tools_menu');
    if (menu instanceof HTMLElement) clearActionProxies(menu);
}

function reconcile() {
    reconcileQueued = false;
    if (active()) reconcileMobile();
    else reconcileDesktop();
}

function queueReconcile() {
    if (reconcileQueued) return;
    reconcileQueued = true;
    requestAnimationFrame(reconcile);
}

export function initGuidedGenerationsBridge() {
    if (initialized) return;
    initialized = true;
    installStyles();

    mobileQuery = window.matchMedia('(max-width: 1000px)');
    mobileQuery.addEventListener?.('change', queueReconcile);

    const sendForm = document.getElementById('send_form');
    if (sendForm) {
        observer = new MutationObserver(queueReconcile);
        observer.observe(sendForm, { childList: true, subtree: true });
    }

    const bodyObserver = new MutationObserver(queueReconcile);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    queueReconcile();
}
