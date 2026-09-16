import {
    getScriptsByType,
    RegexProvider,
    regex_placement,
    runRegexScript,
    saveScriptsByType,
    SCRIPT_TYPES,
    substitute_find_regex,
} from '../regex/engine.js';

const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const WORKSPACE_ID = 'snowbunny-regex-workspace';
const EDITOR_ID = 'snowbunny-regex-editor';
const STYLE_ID = 'snowbunny-regex-native-style';
const IMPORT_ID = 'snowbunny-regex-import';

let initialized = false;
let drawerObserver = null;
let activeScope = 'chat';
let renderQueued = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function snowState() {
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

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function id() {
    return context()?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeRule(raw = {}, { freshId = false, chat = false } = {}) {
    const placement = safeArray(raw.placement)
        .map(Number)
        .filter(value => [regex_placement.USER_INPUT, regex_placement.AI_OUTPUT].includes(value));
    const display = raw.markdownOnly === true;
    const prompt = raw.promptOnly === true;
    return {
        ...clone(raw),
        id: freshId || !raw.id ? id() : String(raw.id),
        scriptName: String(raw.scriptName || raw.name || 'Untitled rule'),
        findRegex: String(raw.findRegex || ''),
        replaceString: String(raw.replaceString ?? ''),
        trimStrings: safeArray(raw.trimStrings).map(String),
        placement: placement.length ? placement : [regex_placement.USER_INPUT, regex_placement.AI_OUTPUT],
        disabled: raw.disabled === true,
        runOnEdit: raw.runOnEdit !== false,
        substituteRegex: Number.isInteger(Number(raw.substituteRegex)) ? Number(raw.substituteRegex) : substitute_find_regex.NONE,
        minDepth: raw.minDepth === null || raw.minDepth === undefined || raw.minDepth === '' ? null : Number(raw.minDepth),
        maxDepth: raw.maxDepth === null || raw.maxDepth === undefined || raw.maxDepth === '' ? null : Number(raw.maxDepth),
        // SnowBunny-created chat rules are always ephemeral. Existing global
        // compatibility rules keep their authored flags until Snow edits them.
        markdownOnly: chat && !display && !prompt ? true : display,
        promptOnly: prompt,
        snowbunnyChatRule: chat || raw.snowbunnyChatRule === true,
    };
}

function chatRules() {
    return safeArray(snowState()?.readChat?.()?.regexRules).map(rule => normalizeRule(rule, { chat: true }));
}

function globalRules() {
    return safeArray(getScriptsByType(SCRIPT_TYPES.GLOBAL)).map(rule => normalizeRule(rule));
}

function rulesForScope(scope = activeScope) {
    return scope === 'global' ? globalRules() : chatRules();
}

async function saveScope(scope, rules, { rerender = true } = {}) {
    const normalized = safeArray(rules).map(rule => normalizeRule(rule, { chat: scope === 'chat' }));
    if (scope === 'global') {
        await saveScriptsByType(normalized, SCRIPT_TYPES.GLOBAL);
    } else {
        await snowState()?.patchChat?.({ regexRules: normalized });
    }
    RegexProvider.instance.clear();
    document.dispatchEvent(new CustomEvent('snowbunny:regex-changed', { detail: { scope, count: normalized.length } }));
    if (rerender && context()?.getCurrentChatId?.()) {
        try {
            await context()?.reloadCurrentChat?.();
        } catch (error) {
            console.warn('[SnowBunny] Regex rules were saved, but the chat could not be immediately rerendered.', error);
        }
    }
    queueEnhance();
    return normalized;
}

function getChatScriptsForEngine() {
    if (!context()?.getCurrentChatId?.()) return [];
    return chatRules();
}

function phaseLabels(rule) {
    const labels = [];
    if (rule.markdownOnly) labels.push('Display');
    if (rule.promptOnly) labels.push('AI input');
    if (!rule.markdownOnly && !rule.promptOnly) labels.push('Legacy direct');
    return labels;
}

function messageLabels(rule) {
    const labels = [];
    if (rule.placement.includes(regex_placement.USER_INPUT)) labels.push('User');
    if (rule.placement.includes(regex_placement.AI_OUTPUT)) labels.push('Assistant');
    return labels;
}

function parseRegexLiteral(value) {
    const source = String(value || '');
    if (!source.startsWith('/')) return { pattern: source, flags: 'g' };
    let slash = -1;
    for (let index = source.length - 1; index > 0; index--) {
        if (source[index] !== '/') continue;
        let escapes = 0;
        for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor--) escapes++;
        if (escapes % 2 === 0) { slash = index; break; }
    }
    if (slash <= 0) return { pattern: source, flags: 'g' };
    return {
        pattern: source.slice(1, slash).replace(/\\\//g, '/'),
        flags: source.slice(slash + 1).replace(/[^gimsu]/g, '') || 'g',
    };
}

function regexLiteral(pattern, flags) {
    const escaped = String(pattern || '').replace(/(^|[^\\])\//g, '$1\\/');
    const uniqueFlags = [...new Set(String(flags || '').replace(/[^gimsu]/g, ''))].join('');
    return `/${escaped}/${uniqueFlags}`;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${WORKSPACE_ID}, #${EDITOR_ID} {
    position: fixed; z-index: 12300; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor);
  }
  .snowbunny-regex-header {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 65%, transparent);
  }
  .snowbunny-regex-header h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.03rem; }
  .snowbunny-regex-header button { width: 42px; height: 42px; border: 0; border-radius: 13px; background: transparent; color: inherit; }
  .snowbunny-regex-body { flex: 1; min-height: 0; overflow-y: auto; padding: 11px 13px calc(22px + env(safe-area-inset-bottom)); }
  .snowbunny-regex-scope { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px; padding: 3px; border-radius: 14px; background: color-mix(in srgb, currentColor 7%, transparent); }
  .snowbunny-regex-scope button { min-height: 40px; border: 0; border-radius: 11px; background: transparent; color: inherit; font-weight: 720; opacity: .55; }
  .snowbunny-regex-scope button.active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); opacity: .95; }
  .snowbunny-regex-note { margin-bottom: 10px; padding: 9px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent); border-radius: 14px; font-size: .69rem; line-height: 1.42; opacity: .66; }
  .snowbunny-regex-toolbar { display: flex; gap: 7px; margin-bottom: 9px; }
  .snowbunny-regex-search, .snowbunny-regex-input, .snowbunny-regex-textarea, .snowbunny-regex-select {
    box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent); border-radius: 13px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 56%, transparent); color: inherit; font: inherit;
  }
  .snowbunny-regex-search { flex: 1; min-width: 0; }
  .snowbunny-regex-textarea { min-height: 96px; resize: vertical; line-height: 1.42; }
  .snowbunny-regex-primary { min-height: 42px; padding: 7px 12px; border: 0; border-radius: 13px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); color: inherit; font-weight: 740; }
  .snowbunny-regex-list { display: grid; gap: 7px; }
  .snowbunny-regex-rule {
    display: flex; align-items: center; gap: 7px; min-height: 68px; padding: 8px 8px 8px 5px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 57%, transparent); border-radius: 17px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 54%, transparent);
  }
  .snowbunny-regex-rule.disabled { opacity: .52; }
  .snowbunny-regex-rule.dragging { opacity: .7; border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 55%, transparent); }
  .snowbunny-regex-grip { width: 36px; height: 46px; flex: 0 0 36px; border: 0; border-radius: 11px; background: transparent; color: inherit; opacity: .45; touch-action: none; }
  .snowbunny-regex-copy { flex: 1; min-width: 0; text-align: left; }
  .snowbunny-regex-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .82rem; }
  .snowbunny-regex-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
  .snowbunny-regex-badge { padding: 2px 6px; border-radius: 999px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 11%, transparent); font-size: .59rem; opacity: .7; }
  .snowbunny-regex-toggle { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; }
  .snowbunny-regex-toggle input { width: 20px; height: 20px; }
  .snowbunny-regex-empty { padding: 28px 14px; text-align: center; border: 1px dashed color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent); border-radius: 17px; font-size: .74rem; line-height: 1.45; opacity: .56; }
  .snowbunny-regex-context-saver { margin-top: 10px; width: 100%; }
  .snowbunny-regex-compat { margin-top: 12px; padding: 10px 11px; border-radius: 15px; background: color-mix(in srgb, currentColor 5%, transparent); }
  .snowbunny-regex-compat strong { display: block; font-size: .76rem; }
  .snowbunny-regex-compat small { display: block; margin-top: 3px; font-size: .65rem; line-height: 1.4; opacity: .56; }

  .snowbunny-regex-editor-body { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 13px calc(20px + env(safe-area-inset-bottom)); }
  .snowbunny-regex-field { display: grid; gap: 5px; margin: 9px 0; }
  .snowbunny-regex-field > span { font-size: .7rem; font-weight: 720; opacity: .75; }
  .snowbunny-regex-segments { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; }
  .snowbunny-regex-segments label, .snowbunny-regex-checks label { display: flex; align-items: center; gap: 7px; min-height: 40px; padding: 7px 9px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent); border-radius: 12px; font-size: .7rem; }
  .snowbunny-regex-checks { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; }
  .snowbunny-regex-flags { display: flex; flex-wrap: wrap; gap: 5px; }
  .snowbunny-regex-flags label { min-width: 42px; min-height: 38px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 5px 7px; border-radius: 11px; background: color-mix(in srgb, currentColor 6%, transparent); font-size: .7rem; }
  .snowbunny-regex-preview { margin-top: 12px; padding: 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 15px; }
  .snowbunny-regex-preview strong { display: block; margin-bottom: 7px; font-size: .76rem; }
  .snowbunny-regex-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  .snowbunny-regex-preview textarea { min-height: 110px; }
  .snowbunny-regex-advanced { margin-top: 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent); border-radius: 15px; overflow: hidden; }
  .snowbunny-regex-advanced summary { padding: 10px 11px; font-size: .75rem; font-weight: 730; cursor: pointer; }
  .snowbunny-regex-advanced-body { padding: 0 10px 10px; }
  .snowbunny-regex-depths { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  .snowbunny-regex-editor-actions { display: flex; gap: 7px; margin-top: 12px; }
  .snowbunny-regex-editor-actions button { min-height: 42px; flex: 1; border: 0; border-radius: 13px; background: color-mix(in srgb, currentColor 7%, transparent); color: inherit; font-weight: 730; }
  .snowbunny-regex-editor-actions .save { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
  .snowbunny-regex-error { min-height: 18px; margin-top: 6px; font-size: .67rem; color: var(--SmartThemeQuoteColor, #e894a5); }
}
`;
    document.head.append(style);
}

function regexRow() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-row`)].find(button =>
        button.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() === 'Regex',
    ) ?? null;
}

function closeWorkspace() {
    document.getElementById(WORKSPACE_ID)?.remove();
    document.getElementById(EDITOR_ID)?.remove();
}

function closeEditor() {
    document.getElementById(EDITOR_ID)?.remove();
}

function header(title, back) {
    const host = el('header', 'snowbunny-regex-header');
    const button = el('button'); button.type = 'button'; button.append(icon('fa-arrow-left')); button.addEventListener('click', back);
    host.append(button, el('h2', '', title));
    return host;
}

function downloadJson(scope, rules) {
    const payload = {
        format: 'snowbunny-regex-v1',
        scope,
        scripts: clone(rules),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `snowbunny-regex-${scope}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function importInput(scope) {
    let input = document.getElementById(IMPORT_ID);
    if (!(input instanceof HTMLInputElement)) {
        input = document.createElement('input');
        input.id = IMPORT_ID;
        input.type = 'file';
        input.accept = '.json,application/json';
        input.hidden = true;
        document.body.append(input);
    }
    input.onchange = async () => {
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        try {
            const decoded = JSON.parse(await file.text());
            const source = Array.isArray(decoded) ? decoded : Array.isArray(decoded?.scripts) ? decoded.scripts : Array.isArray(decoded?.regex) ? decoded.regex : null;
            if (!source) throw new Error('This file does not contain a Regex rule list.');
            const imported = source.map(rule => normalizeRule(rule, { freshId: true, chat: scope === 'chat' }));
            await saveScope(scope, [...rulesForScope(scope), ...imported]);
            openWorkspace(scope);
        } catch (error) {
            console.warn('[SnowBunny] Regex import failed.', error);
            alert(String(error?.message || error));
        }
    };
    input.click();
}

function contextSaverRule() {
    return normalizeRule({
        id: id(),
        scriptName: 'Context Saver — States + CYOA',
        findRegex: '/(?:<choicecard\\b[^>]*>[\\s\\S]*?<\\/choicecard>|<current-state\\b[^>]*>[\\s\\S]*?<\\/current-state>|<story_state\\b[^>]*>[\\s\\S]*?<\\/story_state>|<tracker\\b[^>]*>[\\s\\S]*?<\\/tracker>)/giu',
        replaceString: '',
        trimStrings: [],
        placement: [regex_placement.USER_INPUT, regex_placement.AI_OUTPUT],
        disabled: false,
        markdownOnly: false,
        promptOnly: true,
        runOnEdit: true,
        substituteRegex: substitute_find_regex.NONE,
        minDepth: 1,
        maxDepth: null,
        snowbunnyBuiltIn: 'context-saver',
    }, { chat: true });
}

async function addContextSaver() {
    const rules = chatRules();
    if (rules.some(rule => rule.snowbunnyBuiltIn === 'context-saver')) return;
    await saveScope('chat', [...rules, contextSaverRule()]);
    openWorkspace('chat');
}

function makeBadge(text) {
    return el('span', 'snowbunny-regex-badge', text);
}

function ruleCard(rule, scope, onOpen) {
    const card = el('article', `snowbunny-regex-rule${rule.disabled ? ' disabled' : ''}`);
    card.dataset.ruleId = rule.id;
    card.draggable = false;
    const grip = el('button', 'snowbunny-regex-grip'); grip.type = 'button'; grip.title = 'Drag to reorder'; grip.append(icon('fa-grip-vertical'));
    const copy = el('button', 'snowbunny-regex-copy'); copy.type = 'button';
    copy.append(el('strong', '', rule.scriptName || 'Untitled rule'));
    const badges = el('span', 'snowbunny-regex-badges');
    phaseLabels(rule).forEach(label => badges.append(makeBadge(label)));
    messageLabels(rule).forEach(label => badges.append(makeBadge(label)));
    if (rule.snowbunnyBuiltIn === 'context-saver') badges.append(makeBadge('Built-in'));
    copy.append(badges);
    copy.addEventListener('click', onOpen);
    const toggle = el('label', 'snowbunny-regex-toggle');
    const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.checked = !rule.disabled;
    checkbox.addEventListener('change', async () => {
        const rules = rulesForScope(scope);
        const target = rules.find(item => item.id === rule.id);
        if (!target) return;
        target.disabled = !checkbox.checked;
        await saveScope(scope, rules);
        card.classList.toggle('disabled', target.disabled);
    });
    toggle.append(checkbox);
    card.append(grip, copy, toggle);
    return card;
}

async function persistDomOrder(list, scope) {
    const ids = [...list.querySelectorAll('.snowbunny-regex-rule')].map(card => card.dataset.ruleId).filter(Boolean);
    const byId = new Map(rulesForScope(scope).map(rule => [rule.id, rule]));
    const ordered = ids.map(ruleId => byId.get(ruleId)).filter(Boolean);
    for (const rule of byId.values()) if (!ids.includes(rule.id)) ordered.push(rule);
    await saveScope(scope, ordered, { rerender: false });
}

function wireReorder(list, scope) {
    let dragging = null;
    let pointerId = null;
    const stop = async () => {
        if (!dragging) return;
        dragging.classList.remove('dragging');
        dragging = null;
        pointerId = null;
        await persistDomOrder(list, scope);
    };
    list.addEventListener('pointerdown', event => {
        const grip = event.target instanceof Element ? event.target.closest('.snowbunny-regex-grip') : null;
        const card = grip?.closest('.snowbunny-regex-rule');
        if (!(grip instanceof HTMLElement) || !(card instanceof HTMLElement)) return;
        event.preventDefault();
        dragging = card; pointerId = event.pointerId; card.classList.add('dragging');
        grip.setPointerCapture?.(event.pointerId);
    });
    list.addEventListener('pointermove', event => {
        if (!dragging || event.pointerId !== pointerId) return;
        event.preventDefault();
        const under = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.snowbunny-regex-rule');
        if (!(under instanceof HTMLElement) || under === dragging || under.parentElement !== list) return;
        const box = under.getBoundingClientRect();
        if (event.clientY < box.top + box.height / 2) list.insertBefore(dragging, under);
        else list.insertBefore(dragging, under.nextSibling);
    });
    list.addEventListener('pointerup', event => { if (event.pointerId === pointerId) void stop(); });
    list.addEventListener('pointercancel', event => { if (event.pointerId === pointerId) void stop(); });
}

function openWorkspace(scope = activeScope) {
    closeWorkspace();
    if (!context()?.getCurrentChatId?.() && scope === 'chat') scope = 'global';
    activeScope = scope;
    const root = el('div'); root.id = WORKSPACE_ID;
    const head = header('Regex', closeWorkspace);
    const importButton = el('button'); importButton.type = 'button'; importButton.title = 'Import'; importButton.append(icon('fa-file-import')); importButton.addEventListener('click', () => importInput(activeScope));
    const exportButton = el('button'); exportButton.type = 'button'; exportButton.title = 'Export'; exportButton.append(icon('fa-file-export')); exportButton.addEventListener('click', () => downloadJson(activeScope, rulesForScope(activeScope)));
    const add = el('button'); add.type = 'button'; add.title = 'New rule'; add.append(icon('fa-plus')); add.addEventListener('click', () => openEditor(null, activeScope));
    head.append(importButton, exportButton, add); root.append(head);
    const body = el('main', 'snowbunny-regex-body');
    const scopes = el('div', 'snowbunny-regex-scope');
    for (const [value, label] of [['chat', 'This chat'], ['global', 'All chats']]) {
        const button = el('button', activeScope === value ? 'active' : '', label); button.type = 'button';
        button.disabled = value === 'chat' && !context()?.getCurrentChatId?.();
        button.addEventListener('click', () => openWorkspace(value)); scopes.append(button);
    }
    body.append(scopes);
    body.append(el('div', 'snowbunny-regex-note', activeScope === 'chat'
        ? 'These rules belong only to this chat. Global rules run first, then these chat rules. SnowBunny rules never rewrite the stored original message.'
        : 'All-chat rules use SillyTavern’s established Regex engine. Existing compatibility rules are preserved; rules saved through SnowBunny use safe display and/or AI-input phases.'));
    const toolbar = el('div', 'snowbunny-regex-toolbar');
    const search = el('input', 'snowbunny-regex-search'); search.type = 'search'; search.placeholder = 'Search Regex rules';
    toolbar.append(search); body.append(toolbar);
    const list = el('div', 'snowbunny-regex-list'); body.append(list);
    const render = () => {
        const query = search.value.trim().toLowerCase();
        list.replaceChildren();
        const rules = rulesForScope(activeScope).filter(rule => !query || `${rule.scriptName} ${rule.findRegex} ${rule.replaceString}`.toLowerCase().includes(query));
        if (!rules.length) list.append(el('div', 'snowbunny-regex-empty', query ? 'No rules match this search.' : activeScope === 'chat' ? 'No chat-specific Regex rules yet.' : 'No global Regex rules yet.'));
        for (const rule of rules) list.append(ruleCard(rule, activeScope, () => openEditor(rule, activeScope)));
    };
    search.addEventListener('input', render); render();
    wireReorder(list, activeScope);
    if (activeScope === 'chat') {
        const saver = el('button', 'snowbunny-regex-primary snowbunny-regex-context-saver', chatRules().some(rule => rule.snowbunnyBuiltIn === 'context-saver') ? 'Context Saver already added' : 'Add Context Saver');
        saver.type = 'button'; saver.disabled = chatRules().some(rule => rule.snowbunnyBuiltIn === 'context-saver'); saver.addEventListener('click', () => void addContextSaver()); body.append(saver);
    }
    const compat = el('div', 'snowbunny-regex-compat');
    compat.append(el('strong', '', 'Interactive messages'), el('small', '', 'Scripted/HTML message compatibility remains an advanced SillyTavern Regex capability. Native SnowBunny CYOA does not depend on it. A dedicated safe control surface will be added with rich-message compatibility rather than exposing arbitrary scripts casually.'));
    body.append(compat);
    root.append(body); document.body.append(root);
}

function makeCheck(text, checked = false) {
    const label = el('label');
    const input = el('input'); input.type = 'checkbox'; input.checked = checked;
    label.append(input, el('span', '', text));
    return { label, input };
}

function openEditor(sourceRule, scope) {
    closeEditor();
    const existing = sourceRule ? normalizeRule(sourceRule, { chat: scope === 'chat' }) : normalizeRule({
        id: id(),
        scriptName: 'New Regex rule',
        findRegex: '',
        replaceString: '',
        trimStrings: [],
        placement: [regex_placement.USER_INPUT, regex_placement.AI_OUTPUT],
        disabled: false,
        markdownOnly: true,
        promptOnly: false,
        runOnEdit: true,
        substituteRegex: substitute_find_regex.NONE,
        minDepth: null,
        maxDepth: null,
    }, { chat: scope === 'chat' });
    const parsed = parseRegexLiteral(existing.findRegex);
    const root = el('div'); root.id = EDITOR_ID;
    const head = header(sourceRule ? 'Edit Regex rule' : 'New Regex rule', closeEditor); root.append(head);
    const body = el('main', 'snowbunny-regex-editor-body');

    const nameField = el('label', 'snowbunny-regex-field'); nameField.append(el('span', '', 'Name'));
    const name = el('input', 'snowbunny-regex-input'); name.type = 'text'; name.value = existing.scriptName; nameField.append(name);
    const findField = el('label', 'snowbunny-regex-field'); findField.append(el('span', '', 'Find pattern'));
    const pattern = el('textarea', 'snowbunny-regex-textarea'); pattern.value = parsed.pattern; findField.append(pattern);

    const modeField = el('div', 'snowbunny-regex-field'); modeField.append(el('span', '', 'What to do'));
    const modeSegments = el('div', 'snowbunny-regex-segments');
    const replaceLabel = el('label'); const replaceRadio = el('input'); replaceRadio.type = 'radio'; replaceRadio.name = `regex-mode-${existing.id}`; replaceRadio.checked = existing.replaceString !== ''; replaceLabel.append(replaceRadio, el('span', '', 'Replace'));
    const eraseLabel = el('label'); const eraseRadio = el('input'); eraseRadio.type = 'radio'; eraseRadio.name = replaceRadio.name; eraseRadio.checked = existing.replaceString === ''; eraseLabel.append(eraseRadio, el('span', '', 'Erase'));
    modeSegments.append(replaceLabel, eraseLabel); modeField.append(modeSegments);
    const replaceField = el('label', 'snowbunny-regex-field'); replaceField.append(el('span', '', 'Replacement'));
    const replacement = el('textarea', 'snowbunny-regex-textarea'); replacement.value = existing.replaceString; replaceField.append(replacement);
    const syncMode = () => { replaceField.style.display = eraseRadio.checked ? 'none' : ''; };
    replaceRadio.addEventListener('change', syncMode); eraseRadio.addEventListener('change', syncMode); syncMode();

    const phaseField = el('div', 'snowbunny-regex-field'); phaseField.append(el('span', '', 'Apply to'));
    const phaseChecks = el('div', 'snowbunny-regex-checks');
    const display = makeCheck('Message display', existing.markdownOnly === true);
    const prompt = makeCheck('AI input', existing.promptOnly === true);
    phaseChecks.append(display.label, prompt.label); phaseField.append(phaseChecks);

    const messageField = el('div', 'snowbunny-regex-field'); messageField.append(el('span', '', 'Messages'));
    const messageChecks = el('div', 'snowbunny-regex-checks');
    const user = makeCheck('User', existing.placement.includes(regex_placement.USER_INPUT));
    const assistant = makeCheck('Assistant', existing.placement.includes(regex_placement.AI_OUTPUT));
    messageChecks.append(user.label, assistant.label); messageField.append(messageChecks);

    const preview = el('section', 'snowbunny-regex-preview'); preview.append(el('strong', '', 'Preview'));
    const previewGrid = el('div', 'snowbunny-regex-preview-grid');
    const sample = el('textarea', 'snowbunny-regex-textarea'); sample.placeholder = 'Paste sample text';
    const output = el('textarea', 'snowbunny-regex-textarea'); output.readOnly = true; output.placeholder = 'Result';
    previewGrid.append(sample, output); preview.append(previewGrid);

    const advanced = el('details', 'snowbunny-regex-advanced');
    const advancedSummary = el('summary', '', 'Advanced');
    const advancedBody = el('div', 'snowbunny-regex-advanced-body');
    const flagsField = el('div', 'snowbunny-regex-field'); flagsField.append(el('span', '', 'Regex flags'));
    const flags = el('div', 'snowbunny-regex-flags');
    const flagInputs = new Map();
    for (const [flag, label] of [['g', 'Global'], ['i', 'Ignore case'], ['m', 'Multiline'], ['s', 'Dot-all'], ['u', 'Unicode']]) {
        const check = makeCheck(`${flag} · ${label}`, parsed.flags.includes(flag)); flagInputs.set(flag, check.input); flags.append(check.label);
    }
    flagsField.append(flags);
    const depthField = el('div', 'snowbunny-regex-field'); depthField.append(el('span', '', 'Message depth'));
    const depths = el('div', 'snowbunny-regex-depths');
    const minDepth = el('input', 'snowbunny-regex-input'); minDepth.type = 'number'; minDepth.min = '-1'; minDepth.placeholder = 'Min · unlimited'; minDepth.value = existing.minDepth ?? '';
    const maxDepth = el('input', 'snowbunny-regex-input'); maxDepth.type = 'number'; maxDepth.min = '0'; maxDepth.placeholder = 'Max · unlimited'; maxDepth.value = existing.maxDepth ?? '';
    depths.append(minDepth, maxDepth); depthField.append(depths);
    const trimField = el('label', 'snowbunny-regex-field'); trimField.append(el('span', '', 'Trim from captures · one per line'));
    const trim = el('textarea', 'snowbunny-regex-textarea'); trim.value = safeArray(existing.trimStrings).join('\n'); trimField.append(trim);
    const macroField = el('label', 'snowbunny-regex-field'); macroField.append(el('span', '', 'Macros in Find pattern'));
    const macro = el('select', 'snowbunny-regex-select');
    macro.append(new Option('Do not substitute', '0'), new Option('Substitute raw', '1'), new Option('Substitute escaped', '2')); macro.value = String(existing.substituteRegex ?? 0); macroField.append(macro);
    const editCheck = makeCheck('Run after message edits', existing.runOnEdit !== false);
    advancedBody.append(flagsField, depthField, trimField, macroField, editCheck.label); advanced.append(advancedSummary, advancedBody);

    const error = el('div', 'snowbunny-regex-error');
    const actions = el('div', 'snowbunny-regex-editor-actions');
    const remove = el('button', '', sourceRule ? 'Delete' : 'Cancel'); remove.type = 'button';
    const save = el('button', 'save', 'Save'); save.type = 'button'; actions.append(remove, save);
    body.append(nameField, findField, modeField, replaceField, phaseField, messageField, preview, advanced, error, actions);
    root.append(body); document.body.append(root);

    const flagsValue = () => [...flagInputs].filter(([, input]) => input.checked).map(([flag]) => flag).join('');
    const draftRule = () => normalizeRule({
        ...existing,
        scriptName: name.value.trim() || 'Untitled rule',
        findRegex: regexLiteral(pattern.value, flagsValue()),
        replaceString: eraseRadio.checked ? '' : replacement.value,
        trimStrings: trim.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
        placement: [user.input.checked ? regex_placement.USER_INPUT : null, assistant.input.checked ? regex_placement.AI_OUTPUT : null].filter(value => value !== null),
        disabled: existing.disabled,
        markdownOnly: display.input.checked,
        promptOnly: prompt.input.checked,
        runOnEdit: editCheck.input.checked,
        substituteRegex: Number(macro.value),
        minDepth: minDepth.value === '' ? null : Number(minDepth.value),
        maxDepth: maxDepth.value === '' ? null : Number(maxDepth.value),
    }, { chat: scope === 'chat' });

    const updatePreview = () => {
        error.textContent = '';
        if (!pattern.value.trim()) { output.value = sample.value; return; }
        const draft = draftRule();
        const compiled = RegexProvider.instance.get(draft.findRegex);
        if (!compiled) { error.textContent = 'This Regex pattern is invalid.'; output.value = sample.value; return; }
        output.value = runRegexScript({ ...draft, disabled: false }, sample.value);
    };
    for (const input of [pattern, replacement, sample, minDepth, maxDepth, trim, macro, display.input, prompt.input, user.input, assistant.input, replaceRadio, eraseRadio, editCheck.input, ...flagInputs.values()]) {
        input.addEventListener('input', updatePreview); input.addEventListener('change', updatePreview);
    }
    updatePreview();

    remove.addEventListener('click', async () => {
        if (!sourceRule) { closeEditor(); return; }
        if (!window.confirm(`Delete Regex rule “${existing.scriptName}”?`)) return;
        const next = rulesForScope(scope).filter(rule => rule.id !== existing.id);
        await saveScope(scope, next); closeEditor(); openWorkspace(scope);
    });
    save.addEventListener('click', async () => {
        error.textContent = '';
        if (!pattern.value.trim()) { error.textContent = 'Find pattern cannot be empty.'; pattern.focus(); return; }
        if (!display.input.checked && !prompt.input.checked) { error.textContent = 'Choose Message display, AI input, or both.'; return; }
        if (!user.input.checked && !assistant.input.checked) { error.textContent = 'Choose User, Assistant, or both.'; return; }
        const draft = draftRule();
        if (!RegexProvider.instance.get(draft.findRegex)) { error.textContent = 'This Regex pattern is invalid.'; return; }
        if (draft.minDepth !== null && draft.maxDepth !== null && draft.maxDepth < draft.minDepth) { error.textContent = 'Maximum depth must be greater than or equal to minimum depth.'; return; }
        save.disabled = true;
        try {
            const rules = rulesForScope(scope);
            const index = rules.findIndex(rule => rule.id === existing.id);
            if (index >= 0) rules[index] = draft; else rules.push(draft);
            await saveScope(scope, rules);
            closeEditor(); openWorkspace(scope);
        } catch (saveError) {
            console.warn('[SnowBunny] Could not save Regex rule.', saveError);
            save.disabled = false; error.textContent = String(saveError?.message || saveError);
        }
    });
}

function enhanceRow() {
    renderQueued = false;
    const row = regexRow();
    if (!(row instanceof HTMLButtonElement)) return;
    row.disabled = false;
    row.setAttribute('aria-disabled', 'false');
    const chat = chatRules();
    const globals = globalRules();
    const value = row.querySelector('.snowbunny-shell-row-value');
    const enabled = chat.filter(rule => !rule.disabled).length;
    if (value) value.textContent = enabled ? `${enabled} chat · ${globals.filter(rule => !rule.disabled).length} global` : globals.some(rule => !rule.disabled) ? `${globals.filter(rule => !rule.disabled).length} global` : 'No rules';
    if (row.dataset.snowbunnyRegex === '1') return;
    row.dataset.snowbunnyRegex = '1';
    row.addEventListener('click', () => openWorkspace('chat'));
}

function queueEnhance() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(enhanceRow);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (source?.on && types) {
        for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'MESSAGE_EDITED', 'MESSAGE_UPDATED']) {
            const event = types[name];
            if (event) source.on(event, queueEnhance);
        }
    }
    document.addEventListener('snowbunny:regex-changed', queueEnhance);
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(EDITOR_ID)) { event.preventDefault(); closeEditor(); }
    else if (document.getElementById(WORKSPACE_ID)) { event.preventDefault(); closeWorkspace(); }
}

export function initRegexNative() {
    if (initialized) return;
    initialized = true;
    installStyles();
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        regex: {
            getChatScriptsForEngine,
            chatRules,
            globalRules,
            saveScope,
            open: openWorkspace,
        },
    };
    registerEvents();
    document.addEventListener('keydown', onKeyDown, true);
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        drawerObserver = new MutationObserver(queueEnhance);
        drawerObserver.observe(drawer, { childList: true, subtree: true });
    }
    document.addEventListener('snowbunny:shell-open', queueEnhance);
    queueEnhance();
}
