import { getScriptsByType, RegexProvider, saveScriptsByType, SCRIPT_TYPES } from '../regex/engine.js';

const NATIVE_MESSAGE_PLACEMENTS = new Set([1, 2]);
const IMPORT_ID = 'snowbunny-regex-import';
const WORKSPACE_ID = 'snowbunny-regex-workspace';

let initialized = false;
const compatibilityPlacements = new Map();

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function captureCompatibilityPlacements() {
    for (const rule of getScriptsByType(SCRIPT_TYPES.GLOBAL) || []) {
        if (!rule?.id || !Array.isArray(rule.placement)) continue;
        const extras = rule.placement.map(Number).filter(value => !NATIVE_MESSAGE_PLACEMENTS.has(value));
        if (extras.length) compatibilityPlacements.set(String(rule.id), [...new Set(extras)]);
    }
}

function restoreCompatibilityPlacements() {
    const rules = getScriptsByType(SCRIPT_TYPES.GLOBAL) || [];
    let changed = false;
    for (const rule of rules) {
        const extras = compatibilityPlacements.get(String(rule?.id || ''));
        if (!extras?.length) continue;
        const current = Array.isArray(rule.placement) ? rule.placement.map(Number) : [];
        const next = [...new Set([...current, ...extras])];
        if (next.length !== current.length || next.some(value => !current.includes(value))) {
            rule.placement = next;
            changed = true;
        }
    }
    if (changed) void saveScriptsByType(rules, SCRIPT_TYPES.GLOBAL);
    captureCompatibilityPlacements();
}

function onRegexChanged(event) {
    if (event?.detail?.scope !== 'global') return;
    // Restore synchronously in the in-memory global rule objects so an immediate
    // chat rerender cannot observe a partially normalized compatibility rule.
    restoreCompatibilityPlacements();
}

function allChatsScopeActive() {
    const active = document.querySelector(`#${WORKSPACE_ID} .snowbunny-regex-scope button.active`);
    return active?.textContent?.trim() === 'All chats';
}

function newRuleId() {
    return context()?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function importGlobalCompatibilityFile(file) {
    const decoded = JSON.parse(await file.text());
    const source = Array.isArray(decoded)
        ? decoded
        : Array.isArray(decoded?.scripts)
            ? decoded.scripts
            : Array.isArray(decoded?.regex)
                ? decoded.regex
                : null;
    if (!source) throw new Error('This file does not contain a Regex rule list.');

    // Global compatibility imports bypass the mobile editor's normal
    // User/Assistant normalization. Preserve WI/reasoning/slash placements and
    // unknown fields exactly, changing only ids to avoid collisions.
    const imported = source
        .filter(rule => rule && typeof rule === 'object' && !Array.isArray(rule))
        .map(rule => ({
            ...structuredClone(rule),
            id: newRuleId(),
            scriptName: String(rule.scriptName || rule.name || 'Imported Regex rule'),
            placement: Array.isArray(rule.placement) ? rule.placement.map(Number).filter(Number.isFinite) : [1, 2],
            trimStrings: Array.isArray(rule.trimStrings) ? rule.trimStrings.map(String) : [],
            replaceString: String(rule.replaceString ?? ''),
            findRegex: String(rule.findRegex || ''),
        }));
    if (!imported.length) throw new Error('No usable Regex rules were found in this file.');

    await saveScriptsByType([...(getScriptsByType(SCRIPT_TYPES.GLOBAL) || []), ...imported], SCRIPT_TYPES.GLOBAL);
    RegexProvider.instance.clear();
    captureCompatibilityPlacements();
    document.dispatchEvent(new CustomEvent('snowbunny:regex-changed', { detail: { scope: 'global', count: imported.length, compatibilityImport: true } }));
    if (context()?.getCurrentChatId?.()) await context()?.reloadCurrentChat?.();
    globalThis.SnowBunny?.regex?.open?.('global');
}

function onImportChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== IMPORT_ID || !allChatsScopeActive()) return;
    const file = input.files?.[0];
    if (!file) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    input.value = '';
    void importGlobalCompatibilityFile(file).catch(error => {
        console.warn('[SnowBunny] Global Regex compatibility import failed.', error);
        alert(String(error?.message || error));
    });
}

function onReorderPointerDown(event) {
    const grip = event.target instanceof Element ? event.target.closest('.snowbunny-regex-grip') : null;
    if (!grip) return;
    const search = document.querySelector(`#${WORKSPACE_ID} .snowbunny-regex-search`);
    if (!(search instanceof HTMLInputElement) || !search.value.trim()) return;
    // Reordering a filtered subset would otherwise move every hidden rule to
    // the end. Keep search useful without allowing a misleading partial order.
    event.preventDefault();
    event.stopImmediatePropagation();
    grip.title = 'Clear the search before reordering rules';
}

export function initRegexCompatibilityGuard() {
    if (initialized) return;
    initialized = true;
    captureCompatibilityPlacements();
    document.addEventListener('snowbunny:regex-changed', onRegexChanged);
    document.addEventListener('change', onImportChange, true);
    document.addEventListener('pointerdown', onReorderPointerDown, true);
}
