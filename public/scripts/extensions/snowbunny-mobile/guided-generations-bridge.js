const STYLE_ID = 'snowbunny-guided-generations-bridge-style';
const GG_BUTTON_ID = 'gg_menu_button';
const LEFT_FORM_ID = 'leftSendForm';
const GG_ORIGINAL_CONTAINER_ID = 'gg-menu-buttons-container';

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
  body.snowbunny-mobile #${LEFT_FORM_ID} > #${GG_BUTTON_ID} {
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
    border-color: color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent) !important;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent) !important;
    color: inherit !important;
  }

  body.snowbunny-mobile #${LEFT_FORM_ID} > #${GG_BUTTON_ID}:active {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 16%, transparent) !important;
  }

  body.snowbunny-mobile #${LEFT_FORM_ID} > #${GG_BUTTON_ID} .gg-tools-menu {
    top: auto !important;
    bottom: calc(100% + 8px) !important;
    left: 0 !important;
    right: auto !important;
    max-width: min(88vw, 360px) !important;
    max-height: 68dvh !important;
    overflow-y: auto !important;
    z-index: 13020 !important;
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

  body.snowbunny-mobile #gg-action-button-container::-webkit-scrollbar {
    display: none !important;
  }
}
`;
    document.head.append(style);
}

function restoreButton(button) {
    const original = document.getElementById(GG_ORIGINAL_CONTAINER_ID);
    if (original instanceof HTMLElement && button.parentElement !== original) {
        original.prepend(button);
    }
}

function moveButtonIntoComposer(button) {
    const left = document.getElementById(LEFT_FORM_ID);
    if (!(left instanceof HTMLElement) || button.parentElement === left) return;

    const nativeExtensions = document.getElementById('extensionsMenuButton');
    if (nativeExtensions?.parentElement === left) {
        nativeExtensions.insertAdjacentElement('afterend', button);
    } else {
        left.append(button);
    }
}

function reconcile() {
    reconcileQueued = false;
    const button = document.getElementById(GG_BUTTON_ID);
    if (!(button instanceof HTMLElement)) return;

    if (active()) moveButtonIntoComposer(button);
    else restoreButton(button);
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
