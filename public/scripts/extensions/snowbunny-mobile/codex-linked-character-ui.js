const WORKSPACE_ID = 'snowbunny-codex-workspace';
const STYLE_ID = 'snowbunny-codex-linked-character-style';

let initialized = false;
let observer = null;
let queued = false;

function state() {
    return globalThis.SnowBunny?.state ?? null;
}

function store() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function library() {
    return globalThis.SnowBunny?.characterLibrary ?? null;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${WORKSPACE_ID} .snowbunny-codex-entry[data-snowbunny-shared-character="1"] {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 34%, var(--SmartThemeBorderColor));
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 8%, var(--SmartThemeBlurTintColor));
  }
  #${WORKSPACE_ID} .snowbunny-shared-character-badge {
    display: inline-flex; align-items: center; gap: 4px; width: max-content; margin-top: 6px; padding: 2px 7px;
    border-radius: 999px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 14%, transparent);
    font-size: .58rem; font-weight: 740; opacity: .78;
  }
}
`;
    document.head.append(style);
}

function currentBookId() {
    const root = document.getElementById(WORKSPACE_ID);
    const title = root?.querySelector('.snowbunny-codex-header h2')?.textContent?.trim() || '';
    if (!root || !title) return '';

    const remembered = state()?.readChat?.()?.codexViewedLorebookId;
    const records = store()?.list?.() || [];
    const rememberedRecord = records.find(record => record.id === remembered);
    if (rememberedRecord?.name === title) return rememberedRecord.id;

    const matching = records.filter(record => record.name === title);
    return matching.length === 1 ? matching[0].id : '';
}

async function decorate() {
    queued = false;
    const root = document.getElementById(WORKSPACE_ID);
    if (!root || !store()?.load) return;
    const bookId = currentBookId();
    if (!bookId) return;
    const book = await store().load(bookId);
    if (!book) return;

    const linkedByName = new Map();
    for (const entry of book.entries || []) {
        if (entry?.link?.kind !== 'character' || !entry.link.avatar || !entry.link.entityId) continue;
        if (!linkedByName.has(entry.name)) linkedByName.set(entry.name, []);
        linkedByName.get(entry.name).push(entry);
    }

    for (const card of root.querySelectorAll('.snowbunny-codex-entry')) {
        if (!(card instanceof HTMLElement)) continue;
        const name = card.querySelector('strong')?.textContent?.trim() || '';
        const candidates = linkedByName.get(name) || [];
        if (candidates.length !== 1) continue;
        const entry = candidates[0];
        card.dataset.snowbunnySharedCharacter = '1';
        card.dataset.snowbunnyCharacterAvatar = entry.link.avatar;
        const button = card.querySelector('button');
        if (!(button instanceof HTMLButtonElement)) continue;
        if (!button.querySelector('.snowbunny-shared-character-badge')) {
            const badge = document.createElement('span');
            badge.className = 'snowbunny-shared-character-badge';
            badge.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i> Shared Character';
            button.append(badge);
        }
        const small = button.querySelector('small');
        if (small && (!small.textContent?.trim() || small.textContent === 'No description yet')) {
            small.textContent = 'Uses the same authored document as the Character card.';
        }
    }
}

function queueDecorate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => void decorate());
}

function onClick(event) {
    const card = event.target instanceof Element
        ? event.target.closest(`#${WORKSPACE_ID} .snowbunny-codex-entry[data-snowbunny-shared-character="1"]`)
        : null;
    if (!(card instanceof HTMLElement)) return;
    const avatar = card.dataset.snowbunnyCharacterAvatar;
    if (!avatar || !library()?.openEditor) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void library().openEditor(avatar);
}

export function initCodexLinkedCharacterUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(queueDecorate);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('snowbunny:lorebooks-changed', queueDecorate);
    document.addEventListener('snowbunny:character-authoring-changed', queueDecorate);
    queueDecorate();
}
