const CREATE_SHEET_ID = 'snowbunny-create-sheet';
const LEFT_DRAWER_ID = 'snowbunny-left-drawer';
const TYPES = ['Character', 'Location', 'Object/Item', 'Lore', 'Concept', 'Faction', 'Event', 'Other'];

let initialized = false;
let observer = null;
let queued = false;

function store() {
    return globalThis.SnowBunny?.lorebooks ?? null;
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

function closeSheet() {
    document.getElementById(CREATE_SHEET_ID)?.remove();
}

function createFrame(title) {
    closeSheet();
    const overlay = el('div');
    overlay.id = CREATE_SHEET_ID;
    const card = el('section', 'snowbunny-create-card');
    card.append(el('div', 'snowbunny-create-handle'));
    const header = el('header', 'snowbunny-create-header');
    header.append(el('h3', '', title));
    const close = el('button', 'snowbunny-create-close');
    close.type = 'button';
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSheet);
    header.append(close);
    const body = el('div', 'snowbunny-create-body');
    card.append(header, body);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => { if (event.target === overlay) closeSheet(); });
    document.body.append(overlay);
    return body;
}

function actions(saveLabel, onSave) {
    const host = el('div', 'snowbunny-create-actions');
    const cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', closeSheet);
    const save = el('button', 'primary', saveLabel);
    save.type = 'button';
    save.addEventListener('click', () => void onSave(save));
    host.append(cancel, save);
    return host;
}

function openLorebookLibrary() {
    closeSheet();
    const row = [...document.querySelectorAll(`#${LEFT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Lorebooks',
    );
    row?.click();
}

function openNewLorebook() {
    const body = createFrame('Create Lorebook');
    const form = el('div', 'snowbunny-create-form');
    const name = el('input', 'snowbunny-create-input');
    name.type = 'text';
    name.placeholder = 'Lorebook name';
    const description = el('textarea', 'snowbunny-create-input');
    description.placeholder = 'Short description (optional)';
    description.style.minHeight = '86px';
    description.style.resize = 'vertical';
    form.append(name, description, actions('Create', async button => {
        const title = name.value.trim();
        if (!title) { name.focus(); return; }
        button.disabled = true;
        try {
            const book = store()?.normalize?.({ name: title, description: description.value.trim(), entries: [] });
            await store()?.save?.(book);
            openLorebookLibrary();
        } catch (error) {
            console.error('[SnowBunny] Could not create Lorebook.', error);
            button.disabled = false;
            button.textContent = 'Try again';
        }
    }));
    body.append(form);
    window.setTimeout(() => name.focus({ preventScroll: true }), 50);
}

function openNewLoreEntry() {
    const records = store()?.list?.() ?? [];
    const body = createFrame('Create Lore Entry');
    const form = el('div', 'snowbunny-create-form');
    if (!records.length) {
        form.append(el('div', 'snowbunny-create-note', 'Create a Lorebook first. Lore Entries always belong to a SnowBunny Lorebook.'));
        const makeBook = el('button', 'snowbunny-create-option');
        makeBook.type = 'button';
        const marker = el('span', 'snowbunny-create-icon'); marker.append(icon('fa-book-atlas'));
        const copy = el('span', 'snowbunny-create-copy'); copy.append(el('strong', '', 'Create Lorebook'), el('small', '', 'Make the book, then add its first entry.'));
        makeBook.append(marker, copy);
        makeBook.addEventListener('click', openNewLorebook);
        form.append(makeBook);
        body.append(form);
        return;
    }

    const book = el('select', 'snowbunny-create-input');
    for (const record of records) book.append(new Option(record.name, record.id));
    const name = el('input', 'snowbunny-create-input');
    name.type = 'text';
    name.placeholder = 'Entry name';
    const type = el('select', 'snowbunny-create-input');
    for (const item of TYPES) type.append(new Option(item, item));
    const description = el('textarea', 'snowbunny-create-input');
    description.placeholder = 'What should the AI know?';
    description.style.minHeight = '110px';
    description.style.resize = 'vertical';
    form.append(book, name, type, description, actions('Create', async button => {
        const title = name.value.trim();
        if (!title) { name.focus(); return; }
        button.disabled = true;
        try {
            const target = await store()?.load?.(book.value);
            if (!target) throw new Error('Selected Lorebook could not be loaded.');
            const entry = store()?.createEmptyEntry?.(type.value);
            entry.name = title;
            entry.type = type.value;
            entry.description = description.value;
            entry.updatedAt = Date.now();
            target.entries.push(entry);
            await store()?.save?.(target);
            openLorebookLibrary();
        } catch (error) {
            console.error('[SnowBunny] Could not create Lore Entry.', error);
            button.disabled = false;
            button.textContent = 'Try again';
        }
    }));
    body.append(form);
    window.setTimeout(() => name.focus({ preventScroll: true }), 50);
}

function replaceOption(label, handler) {
    const sheet = document.getElementById(CREATE_SHEET_ID);
    if (!sheet) return;
    const original = [...sheet.querySelectorAll('.snowbunny-create-option')].find(button =>
        button.querySelector('.snowbunny-create-copy strong')?.textContent?.trim() === label,
    );
    if (!(original instanceof HTMLButtonElement) || original.dataset.snowbunnyCodexCreate === '1') return;
    const replacement = original.cloneNode(true);
    replacement.disabled = false;
    replacement.dataset.snowbunnyCodexCreate = '1';
    replacement.addEventListener('click', handler);
    original.replaceWith(replacement);
}

function enhance() {
    queued = false;
    replaceOption('Lorebook', openNewLorebook);
    replaceOption('Lore Entry', openNewLoreEntry);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

export function initCreateCodexBridge() {
    if (initialized) return;
    initialized = true;
    observer = new MutationObserver(queueEnhance);
    observer.observe(document.body, { childList: true, subtree: true });
    enhance();
}
