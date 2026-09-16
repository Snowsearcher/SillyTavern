import { user_avatar } from '../../personas.js';
import { power_user } from '../../power-user.js';

const SCHEMA_VERSION = 1;
const MAX_FIELDS = 64;

let initialized = false;

const STARTER_FIELDS = Object.freeze([
    ['age', 'Age'],
    ['species', 'Race/Species'],
    ['sex', 'Sex'],
    ['face', 'Face'],
    ['eyes', 'Eyes'],
    ['hair', 'Hair'],
    ['body-build', 'Body/Build'],
    ['skin', 'Skin'],
    ['height', 'Height'],
    ['notable-features', 'Notable Features'],
    ['visual-impression', 'Visual Impression'],
    ['sexual-features', 'Sexual Features'],
    ['clothing-style', 'Clothing Style'],
    ['important-pieces', 'Important Pieces'],
    ['personality', 'Personality'],
    ['sexuality', 'Sexuality'],
    ['likes', 'Likes'],
    ['dislikes', 'Dislikes'],
    ['voice', 'Speech'],
    ['dialogue-examples', 'Voice Lines'],
    ['skills', 'Skills'],
    ['backstory', 'Background'],
]);

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function plainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function stringList(value, max = 100) {
    return Array.isArray(value)
        ? value.slice(0, max).map(item => String(item ?? '').trim()).filter(Boolean)
        : [];
}

function id(prefix) {
    const value = context()?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${String(value).replaceAll('-', '')}`;
}

function starterFields() {
    return STARTER_FIELDS.map(([fieldId, label], index) => ({
        id: fieldId,
        label,
        value: '',
        role: fieldId === 'dialogue-examples' ? 'dialogueExamples' : 'content',
        custom: false,
        order: index,
    }));
}

function normalizeField(field, index) {
    if (!plainObject(field)) return null;
    const fieldId = String(field.id || `field_${index}`).slice(0, 100);
    const label = String(field.label || '').trim().slice(0, 80);
    if (!fieldId || !label) return null;
    return {
        id: fieldId,
        label,
        value: String(field.value ?? ''),
        role: field.role === 'dialogueExamples' ? 'dialogueExamples' : 'content',
        custom: field.custom === true,
        order: Number.isFinite(Number(field.order)) ? Number(field.order) : index,
    };
}

function descriptor(avatar) {
    const value = power_user.persona_descriptions?.[avatar];
    return plainObject(value) ? value : {};
}

function snowData(avatar) {
    const value = descriptor(avatar).snowbunny;
    return plainObject(value) ? value : {};
}

function normalizeDocument(value, avatar) {
    const desc = descriptor(avatar);
    const fields = [];
    const seen = new Set();
    const source = Array.isArray(value?.fields) && value.fields.length ? value.fields : starterFields();
    source.slice(0, MAX_FIELDS).forEach((field, index) => {
        const normalized = normalizeField(field, index);
        if (!normalized || seen.has(normalized.id)) return;
        fields.push(normalized);
        seen.add(normalized.id);
    });
    for (const starter of starterFields()) {
        if (!seen.has(starter.id)) {
            starter.order = fields.length;
            fields.push(starter);
        }
    }
    return {
        schemaVersion: SCHEMA_VERSION,
        mode: value?.mode === 'freeform' ? 'freeform' : 'structured',
        content: String(value?.content ?? desc.description ?? ''),
        fields,
        updatedAt: Number(value?.updatedAt) || 0,
    };
}

function metadata(avatar) {
    const desc = descriptor(avatar);
    const snow = snowData(avatar);
    const card = plainObject(snow.card) ? snow.card : {};
    return {
        title: String(desc.title || ''),
        category: String(card.category || ''),
        aliases: stringList(card.aliases),
        tags: stringList(card.tags),
        favorite: card.favorite === true,
        default: power_user.default_persona === avatar,
    };
}

function read(avatar) {
    avatar = String(avatar || '');
    if (!avatar || !power_user.personas?.[avatar]) return null;
    const snow = snowData(avatar);
    return {
        avatar,
        name: String(power_user.personas[avatar] || '[Unnamed Persona]'),
        entityId: String(snow.entityId || ''),
        document: normalizeDocument(snow.authorDocument, avatar),
        metadata: metadata(avatar),
        native: clone(descriptor(avatar)),
    };
}

function compatibilityDescription(authorDocument) {
    const blocks = [];
    if (authorDocument.content.trim()) blocks.push(authorDocument.content.trim());
    if (authorDocument.mode !== 'freeform') {
        for (const field of authorDocument.fields) {
            if (!field.value.trim()) continue;
            blocks.push(`${field.label}:\n${field.value.trim()}`);
        }
    }
    return blocks.join('\n\n');
}

function applyCurrentContext(avatar, desc) {
    if (user_avatar !== avatar) return;
    power_user.persona_description = desc.description ?? '';
    power_user.persona_description_position = desc.position ?? 0;
    power_user.persona_description_depth = desc.depth ?? 2;
    power_user.persona_description_role = desc.role ?? 0;
    power_user.persona_description_lorebook = desc.lorebook ?? '';
}

async function save(record) {
    if (!record?.avatar || !power_user.personas?.[record.avatar]) throw new Error('Persona no longer exists.');
    const avatar = String(record.avatar);
    const old = descriptor(avatar);
    const authorDocument = normalizeDocument(record.document, avatar);
    authorDocument.updatedAt = Date.now();
    const meta = {
        ...metadata(avatar),
        ...(plainObject(record.metadata) ? record.metadata : {}),
    };
    meta.aliases = stringList(meta.aliases);
    meta.tags = stringList(meta.tags);
    const entityId = String(record.entityId || snowData(avatar).entityId || id('persona'));
    const next = {
        ...clone(old),
        description: compatibilityDescription(authorDocument),
        title: String(meta.title || ''),
        snowbunny: {
            ...(plainObject(old.snowbunny) ? clone(old.snowbunny) : {}),
            schemaVersion: SCHEMA_VERSION,
            entityId,
            authorDocument,
            card: {
                category: String(meta.category || ''),
                aliases: meta.aliases,
                tags: meta.tags,
                favorite: meta.favorite === true,
            },
        },
    };
    power_user.personas[avatar] = String(record.name || power_user.personas[avatar] || '[Unnamed Persona]').trim() || '[Unnamed Persona]';
    power_user.persona_descriptions[avatar] = next;
    if (meta.default === true) power_user.default_persona = avatar;
    else if (power_user.default_persona === avatar && record.metadata?.default === false) power_user.default_persona = '';
    applyCurrentContext(avatar, next);
    context()?.saveSettingsDebounced?.();
    const types = context()?.eventTypes;
    const event = types?.PERSONA_UPDATED || types?.PERSONA_CHANGED;
    if (event) await context()?.eventSource?.emit?.(event, { avatarId: avatar, name: power_user.personas[avatar] });
    document.dispatchEvent(new CustomEvent('snowbunny:persona-authoring-changed', { detail: { avatar, entityId } }));
    return read(avatar);
}

async function listAvatars() {
    const api = context();
    try {
        const response = await fetch('/api/avatars/get', {
            method: 'POST',
            headers: api?.getRequestHeaders?.({ omitContentType: true }) || {},
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        return Array.isArray(result) ? result.filter(avatar => power_user.personas?.[avatar]) : Object.keys(power_user.personas || {});
    } catch (error) {
        console.warn('[SnowBunny] Could not enumerate Persona avatars.', error);
        return Object.keys(power_user.personas || {});
    }
}

function serialize(record) {
    if (!record) return '';
    const blocks = [];
    if (record.document?.content?.trim()) blocks.push(record.document.content.trim());
    for (const field of record.document?.fields || []) {
        if (!field.value?.trim()) continue;
        blocks.push(`${field.label}:\n${field.value.trim()}`);
    }
    const name = String(record.name || 'User')
        .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<persona name="${name}" role="user">\n${blocks.join('\n\n')}\n</persona>`;
}

export function initPersonaAuthoring() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        personaAuthoring: {
            read,
            save,
            listAvatars,
            starterFields,
            serialize,
        },
    };
}
