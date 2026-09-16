const ACTION_SHEET_ID = 'snowbunny-action-sheet';

let initialized = false;

function closeSnowBunnyDrawers() {
    document.getElementById('snowbunny-left-drawer')?.classList.remove('open');
    document.getElementById('snowbunny-right-drawer')?.classList.remove('open');
    document.getElementById('snowbunny-shell-backdrop')?.classList.remove('open');
}

function onClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const sheet = target?.closest(`#${ACTION_SHEET_ID}`);
    if (!sheet) return;

    const title = sheet.querySelector('.snowbunny-action-header h3')?.textContent?.trim() || '';
    const headerButton = target.closest('.snowbunny-action-header button');

    // Editors leave the quick-selector flow and open a full/native management
    // surface. Retire the Current Chat drawer first so two panels never stack.
    if (headerButton && (headerButton.getAttribute('title') === 'Edit' || headerButton.getAttribute('title') === 'Manage Personas')) {
        closeSnowBunnyDrawers();
        return;
    }

    // Search results jump back into the story. The drawer must get out of the
    // way before scrollIntoView runs in the result's own click handler.
    if (title === 'Search in Chat' && target.closest('.snowbunny-action-option')) {
        closeSnowBunnyDrawers();
    }
}

export function initShellTransitions() {
    if (initialized) return;
    initialized = true;
    document.addEventListener('click', onClick, true);
}
