const SHEET_ID = 'snowbunny-stories-editor-sheet';

let initialized = false;
let observer = null;
let queued = false;

function protectCreateSheet() {
    queued = false;
    const sheet = document.getElementById(SHEET_ID);
    if (!sheet) return;
    const title = sheet.querySelector('h3')?.textContent?.trim();
    if (title !== 'Create Story') return;
    const label = sheet.querySelector('.snowbunny-story-check');
    const checkbox = label?.querySelector('input[type="checkbox"]');
    const copy = label?.querySelector('span');
    if (!(checkbox instanceof HTMLInputElement) || checkbox.dataset.snowbunnyContinuitySafe === '1') return;
    checkbox.dataset.snowbunnyContinuitySafe = '1';
    checkbox.checked = false;
    checkbox.disabled = true;
    if (copy) copy.textContent = 'Create the Story first, then add this chat from Story Settings so Lorebooks and Memories are transferred safely.';
}

function queueProtect() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(protectCreateSheet);
}

export function initStoryCreateSafety() {
    if (initialized) return;
    initialized = true;
    observer = new MutationObserver(queueProtect);
    observer.observe(document.body, { childList: true, subtree: true });
    protectCreateSheet();
}
