const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const CODEX_SHEET_ID = 'snowbunny-codex-sheet';
const SHEET_ID = 'snowbunny-story-lorebooks-sheet';
const STYLE_ID = 'snowbunny-story-lorebooks-style';

let initialized = false;

function state() {
    return globalThis.SnowBunny?.state ?? null;
}

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

function currentStory() {
    const storyId = state()?.readChat?.()?.storyId;
    if (!storyId) return null;
    const stories = state()?.readGlobal?.()?.stories;
    return Array.isArray(stories) ? stories.find(story => story?.id === storyId) ?? null : null;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  .snowbunny-story-lorebooks-link {
    width: calc(100% - 16px);
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 4px 8px 8px;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 30%, transparent);
    border-radius: 15px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 10%, transparent);
    color: inherit;
    text-align: left;
  }
  .snowbunny-story-lorebooks-link > i { width: 24px; text-align: center; opacity: .8; }
  .snowbunny-story-lorebooks-link-copy { flex: 1; min-width: 0; }
  .snowbunny-story-lorebooks-link-copy strong,
  .snowbunny-story-lorebooks-link-copy small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .snowbunny-story-lorebooks-link-copy strong { font-size: .82rem; }
  .snowbunny-story-lorebooks-link-copy small { margin-top: 3px; font-size: .67rem; opacity: .58; }

  #${SHEET_ID} {
    position: fixed;
    z-index: 12180;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${SHEET_ID} .snowbunny-story-lorebooks-card {
    width: min(100%, 620px);
    max-height: 86dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent);
    border-bottom: 0;
    border-radius: 24px 24px 0 0;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor);
    box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  #${SHEET_ID} .snowbunny-story-lorebooks-handle {
    width: 38px;
    height: 4px;
    margin: 8px auto 2px;
    border-radius: 999px;
    background: currentColor;
    opacity: .24;
  }
  #${SHEET_ID} .snowbunny-story-lorebooks-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px 9px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
  }
  #${SHEET_ID} .snowbunny-story-lorebooks-header h3 { flex: 1; margin: 0; font-size: .96rem; }
  #${SHEET_ID} .snowbunny-story-lorebooks-header button {
    min-width: 42px;
    min-height: 38px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    font-weight: 700;
  }
  #${SHEET_ID} .snowbunny-story-lorebooks-apply {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent) !important;
  }
  #${SHEET_ID} .snowbunny-story-lorebooks-note {
    padding: 9px 14px 4px;
    font-size: .7rem;
    line-height: 1.4;
    opacity: .62;
  }
  #${SHEET_ID} .snowbunny-story-lorebooks-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 6px 10px calc(14px + env(safe-area-inset-bottom));
  }
  #${SHEET_ID} .snowbunny-story-lorebook-option {
    width: 100%;
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 3px 0;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 15px;
    background: transparent;
    color: inherit;
    text-align: left;
  }
  #${SHEET_ID} .snowbunny-story-lorebook-option.selected {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 44%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent);
  }
  #${SHEET_ID} .snowbunny-story-lorebook-option-copy { flex: 1; min-width: 0; }
  #${SHEET_ID} .snowbunny-story-lorebook-option-copy strong,
  #${SHEET_ID} .snowbunny-story-lorebook-option-copy small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #${SHEET_ID} .snowbunny-story-lorebook-option-copy strong { font-size: .83rem; }
  #${SHEET_ID} .snowbunny-story-lorebook-option-copy small { margin-top: 3px; font-size: .67rem; opacity: .56; }
  #${SHEET_ID} .snowbunny-story-lorebooks-empty {
    padding: 22px 14px;
    text-align: center;
    font-size: .76rem;
    opacity: .58;
  }
}
`;
    document.head.append(style);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function openStoryLorebooks() {
    closeSheet();
    const story = currentStory();
    if (!story) return;

    const records = store()?.list?.() ?? [];
    const selected = new Set(store()?.storyIds?.() ?? []);
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-story-lorebooks-card');
    card.append(el('div', 'snowbunny-story-lorebooks-handle'));

    const header = el('header', 'snowbunny-story-lorebooks-header');
    const cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', closeSheet);
    header.append(el('h3', '', `${story.title || 'Story'} · Lorebooks`), cancel);
    const apply = el('button', 'snowbunny-story-lorebooks-apply', 'Apply');
    apply.type = 'button';
    header.append(apply);
    card.append(header);

    card.append(el(
        'div',
        'snowbunny-story-lorebooks-note',
        'Story Lorebooks are shared by every chat in this Story. Chat-specific Lorebooks remain separate and are managed from the normal Lorebooks row.',
    ));

    const list = el('div', 'snowbunny-story-lorebooks-list');
    if (!records.length) {
        list.append(el('div', 'snowbunny-story-lorebooks-empty', 'No SnowBunny Lorebooks exist yet. Create one from Codex or the Lorebooks library first.'));
    }
    for (const record of records) {
        const button = el('button', `snowbunny-story-lorebook-option${selected.has(record.id) ? ' selected' : ''}`);
        button.type = 'button';
        const marker = icon(selected.has(record.id) ? 'fa-circle-check' : 'fa-circle');
        const copy = el('div', 'snowbunny-story-lorebook-option-copy');
        copy.append(
            el('strong', '', record.name || 'Untitled Lorebook'),
            el('small', '', `${record.entryCount || 0} entries${record.description ? ` · ${String(record.description).replace(/\s+/g, ' ').slice(0, 80)}` : ''}`),
        );
        button.append(marker, copy);
        button.addEventListener('click', () => {
            if (selected.has(record.id)) selected.delete(record.id); else selected.add(record.id);
            button.classList.toggle('selected', selected.has(record.id));
            marker.className = `fa-solid ${selected.has(record.id) ? 'fa-circle-check' : 'fa-circle'}`;
        });
        list.append(button);
    }
    card.append(list);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);

    apply.addEventListener('click', () => {
        store()?.setStoryIds?.(story.id, [...selected]);
        closeSheet();
        document.dispatchEvent(new CustomEvent('snowbunny:story-lorebooks-updated', { detail: { storyId: story.id } }));
    });
}

function enhanceCodexSheet() {
    const story = currentStory();
    const sheet = document.getElementById(CODEX_SHEET_ID);
    if (!story || !sheet) return;
    const body = sheet.querySelector('.snowbunny-codex-sheet-body');
    if (!body || body.querySelector('.snowbunny-story-lorebooks-link')) return;

    const button = el('button', 'snowbunny-story-lorebooks-link');
    button.type = 'button';
    button.append(icon('fa-book-open'));
    const copy = el('div', 'snowbunny-story-lorebooks-link-copy');
    const count = store()?.storyIds?.()?.length || 0;
    copy.append(
        el('strong', '', 'Story Lorebooks'),
        el('small', '', `${story.title || 'Current Story'} · ${count} shared ${count === 1 ? 'Lorebook' : 'Lorebooks'}`),
    );
    button.append(copy, icon('fa-chevron-right'));
    button.addEventListener('click', () => {
        document.getElementById(CODEX_SHEET_ID)?.remove();
        openStoryLorebooks();
    });
    body.prepend(button);
}

function isLorebooksRow(target) {
    const row = target?.closest?.(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`);
    return row?.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Lorebooks';
}

function onDocumentClick(event) {
    if (isLorebooksRow(event.target)) {
        window.setTimeout(enhanceCodexSheet, 0);
        return;
    }
    if (document.getElementById(CODEX_SHEET_ID) && currentStory()) {
        window.setTimeout(enhanceCodexSheet, 0);
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(SHEET_ID)) {
        event.preventDefault();
        closeSheet();
    }
}

export function initStoryLorebooks() {
    if (initialized) return;
    initialized = true;
    installStyles();
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', onKeyDown, true);

    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object'
        ? globalThis.SnowBunny
        : {};
    globalThis.SnowBunny = {
        ...existing,
        storyLorebooks: {
            open: openStoryLorebooks,
            currentStory,
        },
    };
}
