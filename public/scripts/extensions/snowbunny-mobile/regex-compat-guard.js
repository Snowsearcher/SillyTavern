import { getScriptsByType, saveScriptsByType, SCRIPT_TYPES } from '../regex/engine.js';

const NATIVE_MESSAGE_PLACEMENTS = new Set([1, 2]);

let initialized = false;
const compatibilityPlacements = new Map();

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

export function initRegexCompatibilityGuard() {
    if (initialized) return;
    initialized = true;
    captureCompatibilityPlacements();
    document.addEventListener('snowbunny:regex-changed', onRegexChanged);
}
