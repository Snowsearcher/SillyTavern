import { extension_prompt_roles, extension_prompt_types } from '../../../script.js';

const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const MEMBERS_SHEET_ID = 'snowbunny-members-sheet';
const EDITOR_ID = 'snowbunny-narrator-editor';
const STYLE_ID = 'snowbunny-narrator-style';
const PROMPT_KEY = 'snowbunny-narrator';
const FILE_NAME = 'snowbunny-narrator.json';
const SCHEMA_VERSION = 1;

let initialized = false;
let drawerObserver = null;
let renderQueued = false;
let configCache = null;
let loadPromise = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function state() {
    return globalThis.SnowBunny?.state ?? null;
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

function defaultConfig() {
    return {
        schemaVersion: SCHEMA_VERSION,
        name: 'Narrator',
        instructions: '',
        voice: '',
        portrait: '',
        updatedAt: 0,
    };
}

function normalizeConfig(value = {}) {
    return {
        schemaVersion: SCHEMA_VERSION,
        name: String(value?.name || 'Narrator').trim() || 'Narrator',
        instructions: String(value?.instructions ?? value?.description ?? ''),
        voice: String(value?.voice ?? value?.personality ?? ''),
        portrait: typeof value?.portrait === 'string' ? value.portrait : '',
        updatedAt: Number(value?.updatedAt) || 0,
    };
}

function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const chunk = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunk) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
    }
    return btoa(binary);
}

function selected() {
    return state()?.readChat?.()?.narratorMember === true;
}

function setSelected(value) {
    if (!context()?.getCurrentChatId?.()) return false;
    state()?.patchChat?.({ narratorMember: Boolean(value) });
    void syncPrompt();
    queueRender();
    document.dispatchEvent(new CustomEvent('snowbunny:narrator-membership-changed', { detail: { selected: Boolean(value) } }));
    return true;
}

async function loadConfig({ fresh = false } = {}) {
    if (!fresh && configCache) return structuredClone(configCache);
    if (!fresh && loadPromise) return loadPromise;

    loadPromise = (async () => {
        const path = state()?.readGlobal?.()?.narratorFilePath;
        if (!path) {
            configCache = defaultConfig();
            return structuredClone(configCache);
        }
        try {
            const response = await fetch(path, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            configCache = normalizeConfig(await response.json());
        } catch (error) {
            console.warn('[SnowBunny] Could not load Narrator file. Using defaults.', error);
            configCache = defaultConfig();
        }
        return structuredClone(configCache);
    })().finally(() => {
        loadPromise = null;
    });
    return loadPromise;
}

async function saveConfig(value) {
    const api = context();
    if (!api?.getRequestHeaders) throw new Error('SillyTavern request helpers are unavailable.');
    const config = normalizeConfig(value);
    config.updatedAt = Date.now();
    const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify({
            name: FILE_NAME,
            data: utf8ToBase64(JSON.stringify(config, null, 2)),
        }),
    });
    if (!response.ok) throw new Error(`Could not save Narrator (${response.status}).`);
    const result = await response.json();
    const path = String(result?.path || '');
    if (!path) throw new Error('SillyTavern did not return a Narrator file path.');
    state()?.patchGlobal?.({ narratorFilePath: path });
    configCache = config;
    document.dispatchEvent(new CustomEvent('snowbunny:narrator-changed'));
    await syncPrompt();
    queueRender();
    return structuredClone(config);
}

function escapeAttr(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

async function narratorPrompt() {
    if (!selected()) return '';
    const config = await loadConfig();
    const body = [];
    if (config.instructions.trim()) body.push(`Narrator instructions:\n${config.instructions.trim()}`);
    if (config.voice.trim()) body.push(`Voice and style:\n${config.voice.trim()}`);
    return `<narrator name="${escapeAttr(config.name)}">\n${body.join('\n\n')}\n</narrator>\nThe Narrator is a protected special story identity in this chat, separate from ordinary Character records. Use its instructions and voice for narration where appropriate alongside the selected Character members.`;
}

async function syncPrompt() {
    const api = context();
    if (typeof api?.setExtensionPrompt !== 'function') return;
    const prompt = api?.getCurrentChatId?.() ? await narratorPrompt() : '';
    api.setExtensionPrompt(
        PROMPT_KEY,
        prompt,
        extension_prompt_types.IN_PROMPT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  .snowbunny-narrator-row {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 24%, var(--SmartThemeBorderColor));
  }
  .snowbunny-narrator-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent) !important;
  }
  .snowbunny-narrator-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .snowbunny-narrator-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 6px;
    padding: 2px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent);
    font-size: .59rem;
    font-weight: 720;
    opacity: .72;
  }
  #${MEMBERS_SHEET_ID} .snowbunny-narrator-option {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 22%, transparent);
  }
  #${MEMBERS_SHEET_ID} .snowbunny-narrator-option .snowbunny-member-option-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent);
  }
  #${MEMBERS_SHEET_ID} .snowbunny-narrator-option .snowbunny-member-option-avatar img {
    width: 100%; height: 100%; object-fit: cover;
  }

  #${EDITOR_ID} {
    position: fixed;
    z-index: 12200;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${EDITOR_ID} .snowbunny-narrator-card {
    width: min(100%, 680px);
    max-height: 92dvh;
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
  #${EDITOR_ID} .snowbunny-narrator-handle {
    width: 38px; height: 4px; margin: 8px auto 2px; border-radius: 999px; background: currentColor; opacity: .24;
  }
  #${EDITOR_ID} .snowbunny-narrator-header {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px 9px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
  }
  #${EDITOR_ID} .snowbunny-narrator-header h3 { flex: 1; margin: 0; font-size: .98rem; }
  #${EDITOR_ID} .snowbunny-narrator-header button {
    min-width: 42px; min-height: 38px; border: 0; border-radius: 12px; background: transparent; color: inherit; font-weight: 700;
  }
  #${EDITOR_ID} .snowbunny-narrator-save {
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent) !important;
  }
  #${EDITOR_ID} .snowbunny-narrator-body {
    flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px calc(18px + env(safe-area-inset-bottom));
  }
  #${EDITOR_ID} .snowbunny-narrator-hero {
    display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 56%, transparent);
  }
  #${EDITOR_ID} .snowbunny-narrator-portrait {
    width: 70px; height: 86px; flex: 0 0 70px; display: flex; align-items: center; justify-content: center;
    overflow: hidden; border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent);
  }
  #${EDITOR_ID} .snowbunny-narrator-portrait img { width: 100%; height: 100%; object-fit: cover; }
  #${EDITOR_ID} .snowbunny-narrator-portrait i { font-size: 1.5rem; opacity: .6; }
  #${EDITOR_ID} .snowbunny-narrator-hero-actions { flex: 1; min-width: 0; display: grid; gap: 7px; }
  #${EDITOR_ID} .snowbunny-narrator-hero-actions button {
    min-height: 38px; border: 0; border-radius: 12px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent); color: inherit;
  }
  #${EDITOR_ID} .snowbunny-narrator-field { display: grid; gap: 5px; margin: 10px 0; font-size: .72rem; font-weight: 700; }
  #${EDITOR_ID} .snowbunny-narrator-field input,
  #${EDITOR_ID} .snowbunny-narrator-field textarea {
    box-sizing: border-box; width: 100%; min-height: 44px; padding: 9px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent);
    border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent); color: inherit; font: inherit;
  }
  #${EDITOR_ID} .snowbunny-narrator-field textarea { min-height: 126px; resize: vertical; line-height: 1.45; }
  #${EDITOR_ID} .snowbunny-narrator-help {
    margin: 4px 0 12px; font-size: .69rem; line-height: 1.42; opacity: .58;
  }
}
`;
    document.head.append(style);
}

function membersSection() {
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (!drawer) return null;
    return [...drawer.querySelectorAll('.snowbunny-shell-section')].find(section =>
        section.querySelector('.snowbunny-shell-section-title > span')?.textContent?.trim().startsWith('Members'),
    ) ?? null;
}

async function renderNarratorRow() {
    renderQueued = false;
    const section = membersSection();
    if (!section) return;
    section.querySelector('[data-snowbunny-narrator-row]')?.remove();
    if (!selected()) return;

    const config = await loadConfig();
    const row = el('div', 'snowbunny-member-row snowbunny-narrator-row');
    row.dataset.snowbunnyNarratorRow = '1';
    const avatar = el('div', 'snowbunny-member-avatar snowbunny-narrator-avatar');
    if (config.portrait) {
        const image = new Image();
        image.src = config.portrait;
        image.alt = '';
        avatar.append(image);
    } else {
        avatar.append(icon('fa-feather-pointed'));
    }
    const name = el('div', 'snowbunny-member-name');
    name.append(document.createTextNode(config.name), el('span', 'snowbunny-narrator-badge', 'Narrator'));
    const controls = el('div', 'snowbunny-member-controls');
    const edit = el('button', 'snowbunny-member-control active');
    edit.type = 'button';
    edit.title = 'Edit Narrator';
    edit.setAttribute('aria-label', 'Edit Narrator');
    edit.append(icon('fa-pencil'));
    edit.addEventListener('click', () => void openEditor());
    controls.append(edit);
    row.append(avatar, name, controls);
    section.append(row);

    const heading = section.querySelector('.snowbunny-shell-section-title > span');
    if (heading) {
        const characterRows = section.querySelectorAll('[data-snowbunny-member-avatar]').length;
        heading.textContent = `Members (${characterRows + 1})`;
    }
}

function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => void renderNarratorRow());
}

async function augmentMembersSheet() {
    const sheet = document.getElementById(MEMBERS_SHEET_ID);
    const list = sheet?.querySelector('.snowbunny-members-list');
    if (!sheet || !list) return;
    if (sheet.dataset.snowbunnyNarratorSelected === undefined) {
        sheet.dataset.snowbunnyNarratorSelected = selected() ? '1' : '0';
    }
    list.querySelector('.snowbunny-narrator-option')?.remove();

    const config = await loadConfig();
    const search = sheet.querySelector('.snowbunny-members-search');
    const query = String(search?.value || '').trim().toLowerCase();
    const haystack = `${config.name} narrator narration`.toLowerCase();
    if (query && !haystack.includes(query)) return;

    const active = sheet.dataset.snowbunnyNarratorSelected === '1';
    const button = el('button', `snowbunny-member-option snowbunny-narrator-option${active ? ' selected' : ''}`);
    button.type = 'button';
    const avatar = el('div', 'snowbunny-member-option-avatar');
    if (config.portrait) {
        const image = new Image();
        image.src = config.portrait;
        image.alt = '';
        avatar.append(image);
    } else {
        avatar.append(icon('fa-feather-pointed'));
    }
    const copy = el('div', 'snowbunny-member-option-copy');
    copy.append(
        el('strong', '', config.name),
        el('small', '', 'Protected Narrator · special story identity'),
    );
    const protectedIcon = icon('fa-shield-halved');
    protectedIcon.classList.add('snowbunny-member-fav');
    protectedIcon.style.opacity = '.7';
    const check = icon(active ? 'fa-circle-check' : 'fa-circle');
    check.classList.add('snowbunny-member-check');
    button.append(avatar, copy, protectedIcon, check);
    button.addEventListener('click', () => {
        sheet.dataset.snowbunnyNarratorSelected = sheet.dataset.snowbunnyNarratorSelected === '1' ? '0' : '1';
        void augmentMembersSheet();
    });
    list.prepend(button);
}

function closeEditor() {
    document.getElementById(EDITOR_ID)?.remove();
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error('Could not read image.'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
    });
}

async function openEditor() {
    closeEditor();
    const saved = await loadConfig();
    let portraitValue = saved.portrait;

    const overlay = el('div');
    overlay.id = EDITOR_ID;
    const card = el('section', 'snowbunny-narrator-card');
    card.append(el('div', 'snowbunny-narrator-handle'));
    const header = el('header', 'snowbunny-narrator-header');
    const cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', closeEditor);
    header.append(el('h3', '', 'Narrator'), cancel);
    const save = el('button', 'snowbunny-narrator-save', 'Save');
    save.type = 'button';
    header.append(save);
    card.append(header);

    const body = el('div', 'snowbunny-narrator-body');
    const hero = el('div', 'snowbunny-narrator-hero');
    const portrait = el('div', 'snowbunny-narrator-portrait');
    const refreshPortrait = () => {
        portrait.replaceChildren();
        if (portraitValue) {
            const image = new Image();
            image.src = portraitValue;
            image.alt = '';
            portrait.append(image);
        } else {
            portrait.append(icon('fa-feather-pointed'));
        }
    };
    refreshPortrait();
    const heroActions = el('div', 'snowbunny-narrator-hero-actions');
    const choose = el('button', '', 'Choose portrait');
    choose.type = 'button';
    const remove = el('button', '', 'Remove portrait');
    remove.type = 'button';
    const file = el('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    choose.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
        const chosen = file.files?.[0];
        if (!chosen) return;
        if (chosen.size > 8 * 1024 * 1024) {
            console.warn('[SnowBunny] Narrator portrait is larger than 8 MB and was ignored.');
            file.value = '';
            return;
        }
        portraitValue = await fileToDataUrl(chosen);
        refreshPortrait();
        file.value = '';
    });
    remove.addEventListener('click', () => {
        portraitValue = '';
        refreshPortrait();
    });
    heroActions.append(choose, remove, file);
    hero.append(portrait, heroActions);
    body.append(hero);

    const nameLabel = el('label', 'snowbunny-narrator-field');
    nameLabel.append(el('span', '', 'Displayed name'));
    const name = el('input');
    name.type = 'text';
    name.maxLength = 100;
    name.value = saved.name;
    nameLabel.append(name);

    const instructionsLabel = el('label', 'snowbunny-narrator-field');
    instructionsLabel.append(el('span', '', 'Narrator instructions'));
    const instructions = el('textarea');
    instructions.maxLength = 30000;
    instructions.placeholder = 'What should the Narrator know or do?';
    instructions.value = saved.instructions;
    instructionsLabel.append(instructions);

    const voiceLabel = el('label', 'snowbunny-narrator-field');
    voiceLabel.append(el('span', '', 'Voice and style'));
    const voice = el('textarea');
    voice.maxLength = 12000;
    voice.placeholder = 'Point of view, tone, rhythm and how the Narrator speaks…';
    voice.value = saved.voice;
    voiceLabel.append(voice);

    const help = el('div', 'snowbunny-narrator-help', 'Narrator is a protected SnowBunny identity, not a Character card. Selecting it from Members makes its instructions available to the Story Writer in this chat.');
    const reset = el('button', 'snowbunny-narrator-save', 'Reset fields');
    reset.type = 'button';
    reset.style.minHeight = '40px';
    reset.style.border = '0';
    reset.style.borderRadius = '12px';
    reset.style.color = 'inherit';
    reset.addEventListener('click', () => {
        const defaults = defaultConfig();
        name.value = defaults.name;
        instructions.value = defaults.instructions;
        voice.value = defaults.voice;
        portraitValue = '';
        refreshPortrait();
    });

    body.append(nameLabel, instructionsLabel, voiceLabel, help, reset);
    card.append(body);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeEditor();
    });
    document.body.append(overlay);

    save.addEventListener('click', async () => {
        const displayName = name.value.trim();
        if (!displayName) {
            name.focus();
            return;
        }
        save.disabled = true;
        save.textContent = 'Saving…';
        try {
            await saveConfig({
                name: displayName,
                instructions: instructions.value,
                voice: voice.value,
                portrait: portraitValue,
            });
            closeEditor();
        } catch (error) {
            console.error('[SnowBunny] Could not save Narrator.', error);
            save.disabled = false;
            save.textContent = 'Try again';
        }
    });
}

function onDocumentClick(event) {
    const target = event.target;
    const add = target?.closest?.(`#${RIGHT_DRAWER_ID} .snowbunny-members-add`);
    if (add) {
        window.setTimeout(() => void augmentMembersSheet(), 0);
        return;
    }

    const sheet = target?.closest?.(`#${MEMBERS_SHEET_ID}`);
    if (!sheet) return;
    const apply = target?.closest?.('.snowbunny-members-apply');
    if (apply) {
        setSelected(sheet.dataset.snowbunnyNarratorSelected === '1');
        return;
    }
    window.setTimeout(() => void augmentMembersSheet(), 0);
}

function onDocumentInput(event) {
    if (event.target?.closest?.(`#${MEMBERS_SHEET_ID}`)) {
        window.setTimeout(() => void augmentMembersSheet(), 0);
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(EDITOR_ID)) {
        event.preventDefault();
        closeEditor();
    }
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;

    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, async () => {
            await syncPrompt();
            queueRender();
        });
    }
    if (types.GENERATION_AFTER_COMMANDS) {
        source.on(types.GENERATION_AFTER_COMMANDS, async () => {
            await syncPrompt();
        });
    }
    if (types.GROUP_UPDATED) source.on(types.GROUP_UPDATED, queueRender);
}

export function initNarrator() {
    if (initialized) return;
    initialized = true;
    installStyles();
    registerEvents();
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('input', onDocumentInput, true);
    document.addEventListener('snowbunny:narrator-changed', queueRender);
    document.addEventListener('snowbunny:shell-open', queueRender);
    document.addEventListener('keydown', onKeyDown, true);

    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        drawerObserver = new MutationObserver(queueRender);
        drawerObserver.observe(drawer, { childList: true, subtree: true });
    }

    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object'
        ? globalThis.SnowBunny
        : {};
    globalThis.SnowBunny = {
        ...existing,
        narrator: {
            get: loadConfig,
            save: saveConfig,
            selected,
            setSelected,
            openEditor,
        },
    };

    void syncPrompt();
    queueRender();
}
