const CREATE_SHEET_ID = 'snowbunny-create-sheet';
const LEFT_DRAWER_ID = 'snowbunny-left-drawer';

let initialized = false;
let observer = null;
let queued = false;

function createRow() {
    return [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Create',
    ) ?? null;
}

function creatorQuick() {
    return [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-quick`)].find(button =>
        button.querySelector('span')?.textContent?.trim() === 'Creator',
    ) ?? null;
}

function openCreateMenu() {
    const row = createRow();
    if (row instanceof HTMLButtonElement && !row.disabled) row.click();
}

function openCharacterLibrary() {
    document.getElementById(CREATE_SHEET_ID)?.remove();
    const open = globalThis.SnowBunny?.characterLibrary?.open;
    if (typeof open === 'function') {
        void open();
        return;
    }
    const button = [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-quick`)].find(item =>
        item.querySelector('span')?.textContent?.trim() === 'Characters',
    );
    button?.click();
}

function openPersonaLibrary() {
    document.getElementById(CREATE_SHEET_ID)?.remove();
    const open = globalThis.SnowBunny?.personaLibrary?.open;
    if (typeof open === 'function') {
        void open();
        return;
    }
    const button = [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-quick`)].find(item =>
        item.querySelector('span')?.textContent?.trim() === 'Personas',
    );
    button?.click();
}

function replaceOption(label, handler, description) {
    const sheet = document.getElementById(CREATE_SHEET_ID);
    if (!(sheet instanceof HTMLElement)) return;
    const original = [...sheet.querySelectorAll('.snowbunny-create-option')].find(button =>
        button.querySelector('.snowbunny-create-copy strong')?.textContent?.trim() === label,
    );
    if (!(original instanceof HTMLButtonElement) || original.dataset.snowbunnyLibraryCreate === '1') return;

    const replacement = original.cloneNode(true);
    replacement.disabled = false;
    replacement.setAttribute('aria-disabled', 'false');
    replacement.dataset.snowbunnyLibraryCreate = '1';
    const subtitle = replacement.querySelector('.snowbunny-create-copy small');
    if (subtitle && description) subtitle.textContent = description;
    replacement.addEventListener('click', handler);
    original.replaceWith(replacement);
}

function enhanceCreatorQuick() {
    const button = creatorQuick();
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    if (button.dataset.snowbunnyCreator === '1') return;
    button.dataset.snowbunnyCreator = '1';
    button.addEventListener('click', openCreateMenu);
}

function enhance() {
    queued = false;
    enhanceCreatorQuick();
    replaceOption('Character', openCharacterLibrary, 'Create, import or edit a Character in the SnowBunny library.');
    replaceOption('Persona', openPersonaLibrary, 'Create, import or edit a Persona in the SnowBunny library.');
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

export function initCreateLibraryBridge() {
    if (initialized) return;
    initialized = true;
    observer = new MutationObserver(queueEnhance);
    observer.observe(document.body, { childList: true, subtree: true });
    enhance();
}
