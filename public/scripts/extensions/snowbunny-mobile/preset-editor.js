import { saveSettingsDebounced } from '../../../script.js';
import { oai_settings } from '../../openai.js';
import { uuidv4 } from '../../utils.js';

const WORKSPACE_ID = 'snowbunny-preset-editor';
const MODULE_EDITOR_ID = 'snowbunny-preset-module-editor';
const UTILITY_EDITOR_ID = 'snowbunny-preset-utility-editor';
const STYLE_ID = 'snowbunny-preset-editor-style';
const GLOBAL_ORDER_ID = '100000';

const FORCE_TOGGLE_MARKERS = new Set([
    'charDescription',
    'charPersonality',
    'scenario',
    'personaDescription',
    'worldInfoBefore',
    'worldInfoAfter',
    'main',
    'chatHistory',
    'dialogueExamples',
]);

const SOURCE_LABELS = {
    charDescription: 'Character Description',
    charPersonality: 'Character Personality',
    scenario: 'Character Scenario',
    personaDescription: 'Persona Description',
    worldInfoBefore: 'Lore / World Info before Character',
    worldInfoAfter: 'Lore / World Info after Character',
    chatHistory: 'Chat History',
    dialogueExamples: 'Dialogue Examples',
};

const UTILITIES = [
    ['Impersonation', 'impersonation_prompt', '#impersonation_prompt_textarea', '#impersonation_prompt_restore', 'Used when writing as the user.'],
    ['Lore format', 'wi_format', '#wi_format_textarea', '#wi_format_restore', 'Wraps compatible World Info before it enters the prompt.'],
    ['Scenario format', 'scenario_format', '#scenario_format_textarea', '#scenario_format_restore', 'Formatting used by ST’s compatible Scenario field.'],
    ['Personality format', 'personality_format', '#personality_format_textarea', '#personality_format_restore', 'Formatting used by compatible Character personality text.'],
    ['Group reply nudge', 'group_nudge_prompt', '#group_nudge_prompt_textarea', '#group_nudge_prompt_restore', 'Forces a group reply from the selected speaker.'],
    ['New chat', 'new_chat_prompt', '#newchat_prompt_textarea', '#newchat_prompt_restore', 'Marks the beginning of a new chat.'],
    ['New group chat', 'new_group_chat_prompt', '#newgroupchat_prompt_textarea', '#newgroupchat_prompt_restore', 'Marks the beginning of a new group chat.'],
    ['New example chat', 'new_example_chat_prompt', '#newexamplechat_prompt_textarea', '#newexamplechat_prompt_restore', 'Marks the beginning of dialogue examples.'],
    ['Continue nudge', 'continue_nudge_prompt', '#continue_nudge_prompt_textarea', '#continue_nudge_prompt_restore', 'Used when Continue asks the writer to continue the last reply.'],
    ['Replace empty message', 'send_if_empty', '#send_if_empty_textarea', '', 'Text sent when the composer is empty.'],
];

let initialized = false;
let savingTimer = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
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

function selectedPreset() {
    const select = document.getElementById('settings_preset_openai');
    if (!(select instanceof HTMLSelectElement)) return { name: 'Current preset', value: '' };
    return {
        name: select.selectedOptions[0]?.textContent?.trim() || select.value || 'Current preset',
        value: select.value,
    };
}

function promptList() {
    if (!Array.isArray(oai_settings.prompts)) oai_settings.prompts = [];
    return oai_settings.prompts;
}

function orderRecord() {
    if (!Array.isArray(oai_settings.prompt_order)) oai_settings.prompt_order = [];
    return oai_settings.prompt_order.find(record => String(record?.character_id) === GLOBAL_ORDER_ID) ?? null;
}

function promptOrder() {
    return orderRecord()?.order ?? [];
}

function promptById(identifier) {
    return promptList().find(prompt => prompt?.identifier === identifier) ?? null;
}

function canToggle(prompt) {
    if (!prompt) return false;
    return !prompt.marker || FORCE_TOGGLE_MARKERS.has(prompt.identifier);
}

function canEdit(prompt) {
    if (!prompt) return false;
    return !prompt.marker || FORCE_TOGGLE_MARKERS.has(prompt.identifier);
}

function canDelete(prompt) {
    return Boolean(prompt && prompt.system_prompt === false);
}

function syncNativeUtility(key, selector, value) {
    oai_settings[key] = value;
    const control = document.querySelector(selector);
    if (control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement) {
        control.value = value;
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function persist({ updatePreset = true } = {}) {
    saveSettingsDebounced();
    clearTimeout(savingTimer);
    if (!updatePreset) return;
    savingTimer = window.setTimeout(() => {
        const preset = selectedPreset();
        if (!preset.value || preset.value === 'gui') return;
        const update = document.getElementById('update_oai_preset');
        if (update instanceof HTMLElement) update.click();
    }, 260);
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${WORKSPACE_ID}, #${MODULE_EDITOR_ID}, #${UTILITY_EDITOR_ID} {
    position: fixed; z-index: 12380; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 99%, #0b0b0d 1%); color: var(--SmartThemeBodyColor);
  }
  .snowbunny-preset-head {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent);
  }
  .snowbunny-preset-head h2 { flex: 1; min-width: 0; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 1.02rem; }
  .snowbunny-preset-head button { min-width: 42px; min-height: 42px; padding: 6px 9px; border: 0; border-radius: 13px; background: transparent; color: inherit; font-weight: 720; }
  .snowbunny-preset-head .primary { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
  .snowbunny-preset-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 11px 13px calc(24px + env(safe-area-inset-bottom)); }
  .snowbunny-preset-hero {
    margin-bottom: 11px; padding: 12px 13px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 18px;
    background: linear-gradient(145deg, color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 11%, transparent), color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent));
  }
  .snowbunny-preset-hero strong { display: block; font-size: .9rem; }
  .snowbunny-preset-hero small { display: block; margin-top: 4px; font-size: .68rem; line-height: 1.42; opacity: .62; }
  .snowbunny-preset-toolbar { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin-bottom: 12px; }
  .snowbunny-preset-toolbar button {
    min-width: 0; min-height: 46px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent); border-radius: 13px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 48%, transparent); color: inherit; font-size: .62rem;
  }
  .snowbunny-preset-toolbar i { font-size: .9rem; opacity: .72; }
  .snowbunny-preset-section-title { display: flex; align-items: center; gap: 7px; margin: 16px 2px 7px; font-size: .75rem; font-weight: 760; opacity: .7; }
  .snowbunny-preset-section-title span { flex: 1; }
  .snowbunny-preset-add { width: 34px; height: 34px; border: 0; border-radius: 11px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent); color: inherit; }
  .snowbunny-preset-list { display: grid; gap: 6px; }
  .snowbunny-preset-module {
    min-height: 66px; display: flex; align-items: center; gap: 7px; padding: 7px 8px 7px 5px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent); border-radius: 17px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent);
  }
  .snowbunny-preset-module.off { opacity: .5; }
  .snowbunny-preset-module.dragging { border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 55%, transparent); opacity: .76; }
  .snowbunny-preset-grip { width: 36px; height: 48px; flex: 0 0 36px; border: 0; border-radius: 11px; background: transparent; color: inherit; opacity: .44; touch-action: none; }
  .snowbunny-preset-module-copy { flex: 1; min-width: 0; border: 0; background: transparent; color: inherit; text-align: left; }
  .snowbunny-preset-module-copy strong, .snowbunny-preset-module-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .snowbunny-preset-module-copy strong { font-size: .8rem; }
  .snowbunny-preset-module-copy small { margin-top: 4px; font-size: .63rem; opacity: .55; }
  .snowbunny-preset-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
  .snowbunny-preset-badge { padding: 2px 6px; border-radius: 999px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 11%, transparent); font-size: .57rem; opacity: .72; }
  .snowbunny-preset-toggle { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; }
  .snowbunny-preset-toggle input { width: 20px; height: 20px; }
  .snowbunny-preset-utility {
    width: 100%; min-height: 58px; display: flex; align-items: center; gap: 9px; margin: 5px 0; padding: 8px 10px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 15px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 48%, transparent); color: inherit; text-align: left;
  }
  .snowbunny-preset-utility > i { width: 26px; text-align: center; opacity: .7; }
  .snowbunny-preset-utility-copy { flex: 1; min-width: 0; }
  .snowbunny-preset-utility-copy strong, .snowbunny-preset-utility-copy small { display: block; }
  .snowbunny-preset-utility-copy strong { font-size: .78rem; }
  .snowbunny-preset-utility-copy small { margin-top: 3px; font-size: .63rem; line-height: 1.35; opacity: .54; }
  .snowbunny-preset-field { display: grid; gap: 5px; margin: 9px 0; }
  .snowbunny-preset-field > span { font-size: .7rem; font-weight: 720; opacity: .76; }
  .snowbunny-preset-field input, .snowbunny-preset-field select, .snowbunny-preset-field textarea {
    box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent); border-radius: 13px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 55%, transparent); color: inherit; font: inherit;
  }
  .snowbunny-preset-field textarea { min-height: 180px; resize: vertical; line-height: 1.45; }
  .snowbunny-preset-source-note { margin: 8px 0; padding: 9px 10px; border-radius: 13px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 8%, transparent); font-size: .67rem; line-height: 1.42; opacity: .7; }
  .snowbunny-preset-check { display: flex; align-items: center; gap: 8px; min-height: 42px; margin: 6px 0; padding: 7px 9px; border-radius: 12px; background: color-mix(in srgb, currentColor 5%, transparent); font-size: .69rem; }
  .snowbunny-preset-check input { width: 20px; height: 20px; }
  .snowbunny-preset-advanced { margin-top: 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 50%, transparent); border-radius: 15px; overflow: hidden; }
  .snowbunny-preset-advanced summary { padding: 10px 11px; cursor: pointer; font-size: .74rem; font-weight: 730; }
  .snowbunny-preset-advanced-body { padding: 0 10px 10px; }
  .snowbunny-preset-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  .snowbunny-preset-editor-actions { display: flex; gap: 7px; margin-top: 13px; }
  .snowbunny-preset-editor-actions button { flex: 1; min-height: 42px; border: 0; border-radius: 13px; background: color-mix(in srgb, currentColor 7%, transparent); color: inherit; font-weight: 720; }
  .snowbunny-preset-editor-actions .save { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); }
  .snowbunny-preset-error { min-height: 18px; margin-top: 6px; font-size: .67rem; color: var(--SmartThemeQuoteColor, #e894a5); }
}
`;
    document.head.append(style);
}

function closeWorkspace() { document.getElementById(WORKSPACE_ID)?.remove(); }
function closeModuleEditor() { document.getElementById(MODULE_EDITOR_ID)?.remove(); }
function closeUtilityEditor() { document.getElementById(UTILITY_EDITOR_ID)?.remove(); }

function header(id, title, onBack, saveHandler = null) {
    const root = el('header', 'snowbunny-preset-head');
    const back = el('button'); back.type = 'button'; back.append(icon('fa-arrow-left')); back.addEventListener('click', onBack);
    root.append(back, el('h2', '', title));
    if (saveHandler) {
        const save = el('button', 'primary', 'Save'); save.type = 'button'; save.dataset.saveFor = id; save.addEventListener('click', saveHandler); root.append(save);
    }
    return root;
}

function nativeAction(selector) {
    closeWorkspace();
    const target = document.querySelector(selector);
    if (target instanceof HTMLElement) target.click();
}

function promptStatus(prompt, entry) {
    const tags = [];
    tags.push(entry?.enabled === false ? 'Off' : 'On');
    if (prompt.marker) tags.push(SOURCE_LABELS[prompt.identifier] || 'Prompt source');
    else tags.push(prompt.role || 'system');
    if (prompt.injection_position === 1) tags.push(`Depth ${Number(prompt.injection_depth) || 0}`);
    return tags;
}

function moduleCard(prompt, entry) {
    const card = el('article', `snowbunny-preset-module${entry?.enabled === false ? ' off' : ''}`);
    card.dataset.promptId = prompt.identifier;
    const grip = el('button', 'snowbunny-preset-grip'); grip.type = 'button'; grip.title = 'Drag to reorder'; grip.append(icon('fa-grip-vertical'));
    const copy = el('button', 'snowbunny-preset-module-copy'); copy.type = 'button';
    copy.append(el('strong', '', prompt.name || prompt.identifier));
    const badges = el('span', 'snowbunny-preset-badges');
    promptStatus(prompt, entry).forEach(text => badges.append(el('span', 'snowbunny-preset-badge', text)));
    copy.append(badges);
    copy.addEventListener('click', () => canEdit(prompt) ? openModuleEditor(prompt.identifier) : null);
    const toggle = el('label', 'snowbunny-preset-toggle');
    const input = el('input'); input.type = 'checkbox'; input.checked = entry?.enabled !== false; input.disabled = !canToggle(prompt);
    input.addEventListener('change', () => {
        const target = promptOrder().find(item => item.identifier === prompt.identifier);
        if (!target) return;
        target.enabled = input.checked;
        card.classList.toggle('off', !input.checked);
        persist();
    });
    toggle.append(input);
    card.append(grip, copy, toggle);
    return card;
}

function wireReorder(list) {
    let dragging = null;
    let pointerId = null;
    const finish = () => {
        if (!dragging) return;
        dragging.classList.remove('dragging');
        dragging = null;
        pointerId = null;
        const record = orderRecord();
        if (!record) return;
        const previous = new Map(record.order.map(item => [item.identifier, item]));
        record.order = [...list.querySelectorAll('.snowbunny-preset-module')]
            .map(card => previous.get(card.dataset.promptId))
            .filter(Boolean);
        for (const item of previous.values()) if (!record.order.some(entry => entry.identifier === item.identifier)) record.order.push(item);
        persist();
    };
    list.addEventListener('pointerdown', event => {
        const grip = event.target instanceof Element ? event.target.closest('.snowbunny-preset-grip') : null;
        const card = grip?.closest('.snowbunny-preset-module');
        if (!(grip instanceof HTMLElement) || !(card instanceof HTMLElement)) return;
        event.preventDefault();
        dragging = card; pointerId = event.pointerId; card.classList.add('dragging'); grip.setPointerCapture?.(event.pointerId);
    });
    list.addEventListener('pointermove', event => {
        if (!dragging || event.pointerId !== pointerId) return;
        event.preventDefault();
        const under = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.snowbunny-preset-module');
        if (!(under instanceof HTMLElement) || under === dragging || under.parentElement !== list) return;
        const box = under.getBoundingClientRect();
        list.insertBefore(dragging, event.clientY < box.top + box.height / 2 ? under : under.nextSibling);
    });
    list.addEventListener('pointerup', event => { if (event.pointerId === pointerId) finish(); });
    list.addEventListener('pointercancel', event => { if (event.pointerId === pointerId) finish(); });
}

function openWorkspace() {
    closeWorkspace(); closeModuleEditor(); closeUtilityEditor();
    if (context()?.mainApi !== 'openai') return;
    const record = orderRecord();
    const root = el('div'); root.id = WORKSPACE_ID; root.append(header(WORKSPACE_ID, 'Preset', closeWorkspace));
    const body = el('main', 'snowbunny-preset-body');
    const current = selectedPreset();
    const hero = el('div', 'snowbunny-preset-hero');
    hero.append(el('strong', '', current.name), el('small', '', current.value === 'gui'
        ? 'The built-in Default can be used and edited as current settings. Use Save as to create your own named preset before expecting a reusable preset file.'
        : 'This editor works on SillyTavern’s actual Chat Completion preset state. Imported prompt text, order and placement stay intact unless you explicitly change them.'));
    body.append(hero);

    const toolbar = el('div', 'snowbunny-preset-toolbar');
    for (const [label, iconName, selector] of [
        ['Import', 'fa-file-import', '#import_oai_preset'],
        ['Export', 'fa-file-export', '#export_oai_preset'],
        ['Save as', 'fa-copy', '#new_oai_preset'],
        ['Rename', 'fa-pencil', '[data-preset-manager-rename="openai"]'],
    ]) {
        const button = el('button'); button.type = 'button'; button.append(icon(iconName), el('span', '', label)); button.addEventListener('click', () => nativeAction(selector)); toolbar.append(button);
    }
    body.append(toolbar);

    const sectionTitle = el('div', 'snowbunny-preset-section-title');
    sectionTitle.append(icon('fa-layer-group'), el('span', '', 'Prompt modules'));
    const add = el('button', 'snowbunny-preset-add'); add.type = 'button'; add.title = 'New prompt module'; add.append(icon('fa-plus'));
    add.addEventListener('click', () => openModuleEditor(''));
    sectionTitle.append(add); body.append(sectionTitle);

    if (!record) {
        body.append(el('div', 'snowbunny-preset-source-note', 'SillyTavern’s Prompt Manager has not initialized a global prompt order yet. Open the normal Chat Completion controls once, then return here. SnowBunny will not invent a replacement order because that could rewrite an imported preset.'));
    } else {
        const list = el('div', 'snowbunny-preset-list');
        for (const entry of record.order) {
            const prompt = promptById(entry.identifier);
            if (prompt) list.append(moduleCard(prompt, entry));
        }
        body.append(list); wireReorder(list);
    }

    body.append(el('div', 'snowbunny-preset-section-title', 'Utility prompts'));
    for (const utility of UTILITIES) {
        const [label, key, , , help] = utility;
        const button = el('button', 'snowbunny-preset-utility'); button.type = 'button'; button.append(icon('fa-wand-magic-sparkles'));
        const copy = el('span', 'snowbunny-preset-utility-copy'); copy.append(el('strong', '', label), el('small', '', help));
        button.append(copy, icon('fa-chevron-right')); button.addEventListener('click', () => openUtilityEditor(utility)); body.append(button);
    }

    const management = el('details', 'snowbunny-preset-advanced'); management.append(el('summary', '', 'Preset management'));
    const managementBody = el('div', 'snowbunny-preset-advanced-body');
    const remove = el('button', 'snowbunny-preset-utility'); remove.type = 'button'; remove.disabled = !current.value || current.value === 'gui';
    remove.append(icon('fa-trash'), el('span', 'snowbunny-preset-utility-copy', 'Delete current named preset'));
    remove.addEventListener('click', () => nativeAction('#delete_oai_preset')); managementBody.append(remove); management.append(managementBody); body.append(management);

    root.append(body); document.body.append(root);
}

function field(label, control) {
    const host = el('label', 'snowbunny-preset-field'); host.append(el('span', '', label), control); return host;
}

function checkbox(label, checked) {
    const host = el('label', 'snowbunny-preset-check'); const input = el('input'); input.type = 'checkbox'; input.checked = Boolean(checked); host.append(input, el('span', '', label)); return { host, input };
}

function openModuleEditor(identifier) {
    closeModuleEditor();
    const source = identifier ? promptById(identifier) : null;
    const prompt = clone(source || {
        identifier: uuidv4(),
        name: 'New prompt',
        role: 'system',
        content: '',
        system_prompt: false,
        marker: false,
        injection_position: 0,
        injection_depth: 4,
        injection_order: 100,
        injection_trigger: [],
        forbid_overrides: false,
    });
    const root = el('div'); root.id = MODULE_EDITOR_ID;
    const body = el('main', 'snowbunny-preset-body');
    const error = el('div', 'snowbunny-preset-error');
    const saveModule = () => {
        error.textContent = '';
        const nameValue = name.value.trim();
        if (!nameValue) { error.textContent = 'Give this prompt a name.'; return; }
        if (!prompt.marker && !content.value.trim() && !window.confirm('Save this prompt with empty content?')) return;
        prompt.name = nameValue;
        prompt.role = role.value;
        if (!prompt.marker) prompt.content = content.value;
        prompt.injection_position = Number(position.value);
        prompt.injection_depth = Number(depth.value) || 0;
        prompt.injection_order = Number(order.value) || 0;
        prompt.injection_trigger = triggers.value.split(/[\n,]+/).map(value => value.trim()).filter(Boolean);
        prompt.forbid_overrides = forbid.input.checked;
        if (source) Object.assign(source, prompt);
        else {
            promptList().push(prompt);
            const record = orderRecord();
            if (!record) { error.textContent = 'SillyTavern has not initialized the prompt order yet.'; promptList().pop(); return; }
            record.order.push({ identifier: prompt.identifier, enabled: true });
        }
        persist(); closeModuleEditor(); openWorkspace();
    };
    root.append(header(MODULE_EDITOR_ID, source ? (source.name || 'Edit prompt') : 'New prompt', () => { closeModuleEditor(); openWorkspace(); }, saveModule));

    if (prompt.marker) body.append(el('div', 'snowbunny-preset-source-note', `${SOURCE_LABELS[prompt.identifier] || 'Prompt source'} supplies its content dynamically. SnowBunny keeps it as a movable/toggleable source row instead of pretending its content is ordinary preset prose.`));
    const name = el('input'); name.type = 'text'; name.maxLength = 200; name.value = prompt.name || '';
    const role = el('select');
    const roles = new Set(['system', 'user', 'assistant', prompt.role || 'system']);
    for (const item of roles) role.append(new Option(item[0].toUpperCase() + item.slice(1), item)); role.value = prompt.role || 'system';
    const content = el('textarea'); content.value = prompt.content || ''; content.disabled = Boolean(prompt.marker); content.placeholder = prompt.marker ? 'Content comes from the selected source at generation time.' : 'Prompt text';
    body.append(field('Name', name), field('Role', role), field('Prompt text', content));

    const advanced = el('details', 'snowbunny-preset-advanced'); advanced.append(el('summary', '', 'Advanced placement'));
    const advancedBody = el('div', 'snowbunny-preset-advanced-body');
    const position = el('select'); position.append(new Option('Relative / normal order', '0'), new Option('Absolute in-chat injection', '1')); position.value = String(prompt.injection_position ?? 0);
    const depth = el('input'); depth.type = 'number'; depth.min = '0'; depth.max = '9999'; depth.value = String(prompt.injection_depth ?? 4);
    const order = el('input'); order.type = 'number'; order.min = '0'; order.max = '99999'; order.value = String(prompt.injection_order ?? 100);
    const grid = el('div', 'snowbunny-preset-grid'); grid.append(field('Injection depth', depth), field('Injection order', order));
    const triggers = el('textarea'); triggers.style.minHeight = '86px'; triggers.value = Array.isArray(prompt.injection_trigger) ? prompt.injection_trigger.join(', ') : ''; triggers.placeholder = 'Optional generation triggers, comma separated';
    const forbid = checkbox('Forbid Character/card overrides for this prompt', prompt.forbid_overrides === true);
    advancedBody.append(field('Position', position), grid, field('Generation triggers', triggers), forbid.host); advanced.append(advancedBody); body.append(advanced, error);

    if (source && canDelete(source)) {
        const actions = el('div', 'snowbunny-preset-editor-actions');
        const remove = el('button', '', 'Delete prompt'); remove.type = 'button';
        remove.addEventListener('click', () => {
            if (!window.confirm(`Delete prompt “${source.name || source.identifier}”?`)) return;
            const index = promptList().findIndex(item => item.identifier === source.identifier); if (index >= 0) promptList().splice(index, 1);
            const record = orderRecord(); if (record) record.order = record.order.filter(item => item.identifier !== source.identifier);
            persist(); closeModuleEditor(); openWorkspace();
        });
        actions.append(remove); body.append(actions);
    }
    root.append(body); document.body.append(root);
}

function openUtilityEditor(utility) {
    closeUtilityEditor();
    const [label, key, selector, restoreSelector, help] = utility;
    const root = el('div'); root.id = UTILITY_EDITOR_ID;
    const body = el('main', 'snowbunny-preset-body');
    const control = document.querySelector(selector);
    const current = control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement ? control.value : String(oai_settings[key] ?? '');
    const textarea = el('textarea'); textarea.value = current; textarea.style.minHeight = '52dvh';
    const saveUtility = () => {
        syncNativeUtility(key, selector, textarea.value);
        persist(); closeUtilityEditor(); openWorkspace();
    };
    root.append(header(UTILITY_EDITOR_ID, label, () => { closeUtilityEditor(); openWorkspace(); }, saveUtility));
    body.append(el('div', 'snowbunny-preset-source-note', help), field(label, textarea));
    if (restoreSelector) {
        const reset = el('button', 'snowbunny-preset-utility'); reset.type = 'button'; reset.append(icon('fa-clock-rotate-left'));
        const copy = el('span', 'snowbunny-preset-utility-copy'); copy.append(el('strong', '', 'Restore SillyTavern default'), el('small', '', 'Uses the same reset action as the canonical ST preset controls.'));
        reset.append(copy); reset.addEventListener('click', () => {
            const target = document.querySelector(restoreSelector);
            if (!(target instanceof HTMLElement)) return;
            target.click();
            window.setTimeout(() => {
                const canonical = document.querySelector(selector);
                if (canonical instanceof HTMLTextAreaElement || canonical instanceof HTMLInputElement) textarea.value = canonical.value;
            }, 40);
        });
        body.append(reset);
    }
    root.append(body); document.body.append(root);
}

function onPresetEditClick(event) {
    const button = event.target instanceof Element ? event.target.closest('#snowbunny-action-sheet button[aria-label="Edit Preset"]') : null;
    if (!(button instanceof HTMLElement) || context()?.mainApi !== 'openai') return;
    event.preventDefault(); event.stopImmediatePropagation();
    document.getElementById('snowbunny-action-sheet')?.remove();
    openWorkspace();
}

function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById(MODULE_EDITOR_ID)) { event.preventDefault(); closeModuleEditor(); openWorkspace(); }
    else if (document.getElementById(UTILITY_EDITOR_ID)) { event.preventDefault(); closeUtilityEditor(); openWorkspace(); }
    else if (document.getElementById(WORKSPACE_ID)) { event.preventDefault(); closeWorkspace(); }
}

export function initPresetEditor() {
    if (initialized) return;
    initialized = true;
    installStyles();
    document.addEventListener('click', onPresetEditClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = { ...existing, presetEditor: { open: openWorkspace } };
}
