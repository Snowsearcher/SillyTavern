const SCHEMA_VERSION = 1;
const EXTENSION_KEY = 'snowbunny';
const MAX_FIELDS = 64;

let initialized = false;
const cache = new Map();

const STARTER_FIELDS = Object.freeze([
    ['age', 'Age', 'content'],
    ['species', 'Race/Species', 'content'],
    ['sex', 'Sex', 'content'],
    ['face', 'Face', 'content'],
    ['eyes', 'Eyes', 'content'],
    ['hair', 'Hair', 'content'],
    ['body-build', 'Body/Build', 'content'],
    ['skin', 'Skin', 'content'],
    ['height', 'Height', 'content'],
    ['notable-features', 'Notable Features', 'content'],
    ['visual-impression', 'Visual Impression', 'content'],
    ['sexual-features', 'Sexual Features', 'content'],
    ['clothing-style', 'Clothing Style', 'content'],
    ['important-pieces', 'Important Pieces', 'content'],
    ['personality', 'Personality', 'content'],
    ['sexuality', 'Sexuality', 'content'],
    ['likes', 'Likes', 'content'],
    ['dislikes', 'Dislikes', 'content'],
    ['voice', 'Speech', 'content'],
    ['dialogue-examples', 'Voice Lines', 'dialogueExamples'],
    ['skills', 'Skills', 'content'],
    ['backstory', 'Background', 'content'],
    ['first-message', 'First Message', 'firstMessage'],
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

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function id(prefix) {
    const api = context();
    const value = api?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${String(value).replaceAll('-', '')}`;
}

function stringList(value, max = 100) {
    return safeArray(value)
        .slice(0, max)
        .map(item => String(item ?? '').trim())
        .filter(Boolean);
}

function normalizeField(field, index = 0) {
    if (!plainObject(field)) return null;
    const fieldId = String(field.id || `field_${index}`).slice(0, 100);
    const label = String(field.label || '').trim().slice(0, 80);
    if (!fieldId || !label) return null;
    const role = ['content', 'dialogueExamples', 'firstMessage'].includes(field.role) ? field.role : 'content';
    return {
        id: fieldId,
        label,
        value: String(field.value ?? ''),
        role,
        custom: field.custom === true,
        order: Number.isFinite(Number(field.order)) ? Number(field.order) : index,
    };
}

function starterFields() {
    return STARTER_FIELDS.map(([fieldId, label, role], index) => ({
        id: fieldId,
        label,
        value: '',
        role,
        custom: false,
        order: index,
    }));
}

function legacyFieldValues(character) {
    return {
        personality: String(character?.data?.personality ?? character?.personality ?? ''),
        'dialogue-examples': String(character?.data?.mes_example ?? character?.mes_example ?? ''),
        'first-message': String(character?.data?.first_mes ?? character?.first_mes ?? ''),
    };
}

function normalizeDocument(value, character = null) {
    const legacy = legacyFieldValues(character);
    const sourceFields = safeArray(value?.fields).length ? value.fields : starterFields();
    const seen = new Set();
    const fields = sourceFields
        .slice(0, MAX_FIELDS)
        .map(normalizeField)
        .filter(field => field && !seen.has(field.id) && seen.add(field.id))
        .map(field => ({
            ...field,
            value: field.value || legacy[field.id] || '',
        }))
        .sort((a, b) => a.order - b.order);

    for (const starter of starterFields()) {
        if (seen.has(starter.id)) continue;
        starter.value = legacy[starter.id] || '';
        starter.order = fields.length;
        fields.push(starter);
        seen.add(starter.id);
    }

    return {
        schemaVersion: SCHEMA_VERSION,
        mode: value?.mode === 'freeform' ? 'freeform' : 'structured',
        content: String(value?.content ?? character?.data?.description ?? character?.description ?? ''),
        fields,
        updatedAt: Number(value?.updatedAt) || 0,
    };
}

function snowExtension(character) {
    const value = character?.data?.extensions?.[EXTENSION_KEY];
    return plainObject(value) ? value : {};
}

function metadataFrom(character) {
    const snow = snowExtension(character);
    const meta = plainObject(snow.card) ? snow.card : {};
    return {
        category: String(meta.category || ''),
        aliases: stringList(meta.aliases),
        tags: stringList(character?.data?.tags ?? character?.tags),
        favorite: meta.favorite ?? character?.fav === true || character?.fav === 'true' || character?.data?.extensions?.fav === true,
        creator: String(character?.data?.creator ?? ''),
        version: String(character?.data?.character_version ?? ''),
        source: String(meta.source || ''),
        notes: String(character?.data?.creator_notes ?? ''),
    };
}

function recordFrom(character) {
    const snow = snowExtension(character);
    return {
        avatar: String(character?.avatar || ''),
        name: String(character?.data?.name ?? character?.name ?? '').trim() || 'Unnamed Character',
        entityId: String(snow.entityId || ''),
        document: normalizeDocument(snow.authorDocument, character),
        metadata: metadataFrom(character),
        character: clone(character),
    };
}

async function fetchCharacter(avatar, { fresh = false } = {}) {
    avatar = String(avatar || '');
    if (!avatar) return null;
    if (!fresh && cache.has(avatar)) return clone(cache.get(avatar));
    const api = context();
    if (!api?.getRequestHeaders) return null;
    try {
        const response = await fetch('/api/characters/get', {
            method: 'POST',
            headers: api.getRequestHeaders(),
            body: JSON.stringify({ avatar_url: avatar }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const character = await response.json();
        if (!character?.avatar) character.avatar = avatar;
        cache.set(avatar, character);
        return clone(character);
    } catch (error) {
        console.warn(`[SnowBunny] Could not load Character ${avatar}.`, error);
        const fallback = api?.characters?.find(item => item?.avatar === avatar) || null;
        return fallback ? clone(fallback) : null;
    }
}

async function readCharacter(avatar, options = {}) {
    const character = await fetchCharacter(avatar, options);
    return character ? recordFrom(character) : null;
}

async function editAttribute(character, field, value) {
    const api = context();
    if (!api?.getRequestHeaders || !character?.avatar) throw new Error('Character editing is unavailable.');
    const response = await fetch('/api/characters/edit-attribute', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify({
            avatar_url: character.avatar,
            ch_name: character.data?.name || character.name || 'Character',
            field,
            value,
        }),
    });
    if (!response.ok) throw new Error(`Could not save Character ${field} (${response.status}).`);
}

function fieldValue(document, fieldId) {
    return document.fields.find(field => field.id === fieldId)?.value || '';
}

function compatibilityDescription(document) {
    const chunks = [];
    if (document.content.trim()) chunks.push(document.content.trim());
    if (document.mode !== 'freeform') {
        for (const field of document.fields) {
            if (field.role !== 'content' || field.id === 'personality' || !field.value.trim()) continue;
            chunks.push(`${field.label}:\n${field.value.trim()}`);
        }
    }
    return chunks.join('\n\n');
}

function compatibilityValues(document) {
    return {
        description: compatibilityDescription(document),
        personality: fieldValue(document, 'personality'),
        mes_example: document.fields.filter(field => field.role === 'dialogueExamples' && field.value.trim()).map(field => field.value.trim()).join('\n\n'),
        first_mes: document.fields.find(field => field.role === 'firstMessage')?.value || '',
    };
}

function updateRuntimeCharacter(avatar, record) {
    const runtime = context()?.characters?.find(item => item?.avatar === avatar);
    if (!runtime) return;
    runtime.name = record.name;
    runtime.description = compatibilityDescription(record.document);
    runtime.personality = fieldValue(record.document, 'personality');
    runtime.mes_example = record.document.fields.filter(field => field.role === 'dialogueExamples').map(field => field.value).filter(Boolean).join('\n\n');
    runtime.first_mes = record.document.fields.find(field => field.role === 'firstMessage')?.value || '';
    runtime.fav = record.metadata.favorite === true;
    runtime.tags = clone(record.metadata.tags);
    runtime.data ||= {};
    runtime.data.name = record.name;
    runtime.data.description = runtime.description;
    runtime.data.personality = runtime.personality;
    runtime.data.mes_example = runtime.mes_example;
    runtime.data.first_mes = runtime.first_mes;
    runtime.data.tags = clone(record.metadata.tags);
    runtime.data.creator = record.metadata.creator;
    runtime.data.character_version = record.metadata.version;
    runtime.data.creator_notes = record.metadata.notes;
    runtime.data.extensions ||= {};
    runtime.data.extensions.fav = record.metadata.favorite === true;
    runtime.data.extensions[EXTENSION_KEY] = {
        ...(plainObject(runtime.data.extensions[EXTENSION_KEY]) ? runtime.data.extensions[EXTENSION_KEY] : {}),
        entityId: record.entityId,
        authorDocument: clone(record.document),
        card: {
            category: record.metadata.category,
            aliases: clone(record.metadata.aliases),
            favorite: record.metadata.favorite === true,
            source: record.metadata.source,
        },
    };
}

async function saveCharacter(record) {
    if (!record?.avatar) throw new Error('Character avatar is missing.');
    const character = await fetchCharacter(record.avatar, { fresh: true });
    if (!character) throw new Error('Character could not be loaded.');

    const document = normalizeDocument(record.document, character);
    document.updatedAt = Date.now();
    const metadata = {
        ...metadataFrom(character),
        ...(plainObject(record.metadata) ? record.metadata : {}),
    };
    metadata.aliases = stringList(metadata.aliases);
    metadata.tags = stringList(metadata.tags);
    metadata.favorite = metadata.favorite === true;
    const entityId = String(record.entityId || snowExtension(character).entityId || id('entity'));
    const existingExtensions = plainObject(character.data?.extensions) ? clone(character.data.extensions) : {};
    existingExtensions.fav = metadata.favorite;
    existingExtensions[EXTENSION_KEY] = {
        ...(plainObject(existingExtensions[EXTENSION_KEY]) ? existingExtensions[EXTENSION_KEY] : {}),
        schemaVersion: SCHEMA_VERSION,
        entityId,
        authorDocument: document,
        card: {
            category: String(metadata.category || ''),
            aliases: metadata.aliases,
            favorite: metadata.favorite,
            source: String(metadata.source || ''),
        },
    };

    const compat = compatibilityValues(document);
    const nextName = String(record.name || character.data?.name || character.name || '').trim() || 'Unnamed Character';
    // These are compatibility projections of the canonical SnowBunny document.
    // The authored structured document itself lives under data.extensions.snowbunny.
    await editAttribute(character, 'extensions', existingExtensions);
    await editAttribute(character, 'description', compat.description);
    await editAttribute(character, 'personality', compat.personality);
    await editAttribute(character, 'mes_example', compat.mes_example);
    await editAttribute(character, 'first_mes', compat.first_mes);
    await editAttribute(character, 'tags', metadata.tags);
    await editAttribute(character, 'creator', String(metadata.creator || ''));
    await editAttribute(character, 'character_version', String(metadata.version || ''));
    await editAttribute(character, 'creator_notes', String(metadata.notes || ''));
    if (nextName !== String(character.data?.name || character.name || '')) {
        // Renaming the actual PNG/chat owner has wider consequences, so keep the
        // native Character name authoritative until the dedicated rename flow is used.
        console.warn('[SnowBunny] Character display rename was not applied because ST rename also changes chat ownership.');
    }

    const saved = {
        avatar: record.avatar,
        name: String(character.data?.name || character.name || nextName),
        entityId,
        document,
        metadata,
    };
    const refreshed = await fetchCharacter(record.avatar, { fresh: true });
    if (refreshed) cache.set(record.avatar, refreshed);
    updateRuntimeCharacter(record.avatar, saved);
    document.dispatchEvent(new CustomEvent('snowbunny:character-authoring-changed', {
        detail: { avatar: record.avatar, entityId },
    }));
    return clone(saved);
}

function serializeDocument(record) {
    if (!record) return '';
    const parts = [];
    if (record.document?.content?.trim()) parts.push(record.document.content.trim());
    for (const field of record.document?.fields || []) {
        if (field.role !== 'content' || !field.value?.trim()) continue;
        parts.push(`${field.label}:\n${field.value.trim()}`);
    }
    const name = String(record.name || 'Character').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<character name="${name}">\n${parts.join('\n\n')}\n</character>`;
}

async function ensureIdentity(avatar) {
    const record = await readCharacter(avatar, { fresh: true });
    if (!record) return null;
    if (record.entityId) return record;
    return saveCharacter(record);
}

async function materializeLinkedEntry(entry) {
    const link = plainObject(entry?.link) ? entry.link : null;
    if (link?.kind !== 'character' || !link.avatar) return clone(entry);
    const record = await readCharacter(link.avatar);
    if (!record || (link.entityId && record.entityId && link.entityId !== record.entityId)) return clone(entry);
    const sections = [];
    for (const field of record.document.fields || []) {
        if (field.role !== 'content' || !field.value.trim()) continue;
        sections.push({
            id: `linked_${field.id}`,
            label: field.label,
            text: field.value,
            custom: field.custom === true,
            order: field.order,
        });
    }
    return {
        ...clone(entry),
        name: record.name,
        description: record.document.content,
        sections,
        link: {
            kind: 'character',
            entityId: record.entityId || link.entityId || '',
            avatar: record.avatar,
        },
    };
}

function activeAvatars() {
    const api = context();
    if (api?.groupId) {
        const group = api?.groups?.find(item => String(item.id) === String(api.groupId));
        return safeArray(group?.members).map(String);
    }
    const characterId = Number.parseInt(String(api?.characterId ?? ''), 10);
    const character = Number.isInteger(characterId) ? api?.characters?.[characterId] : null;
    return character?.avatar ? [String(character.avatar)] : [];
}

async function activeEntityIds() {
    const values = [];
    for (const avatar of activeAvatars()) {
        const record = await readCharacter(avatar);
        if (record?.entityId) values.push(record.entityId);
    }
    return new Set(values);
}

function invalidate(avatar = '') {
    if (avatar) cache.delete(avatar);
    else cache.clear();
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHARACTER_EDITED', 'CHARACTER_DELETED', 'CHARACTER_RENAMED']) {
        const event = types[name];
        if (event) source.on(event, () => invalidate());
    }
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => invalidate());
    }
}

export function initCharacterAuthoring() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        characterAuthoring: {
            read: readCharacter,
            save: saveCharacter,
            ensureIdentity,
            materializeLinkedEntry,
            serialize: serializeDocument,
            activeAvatars,
            activeEntityIds,
            starterFields,
            invalidate,
        },
    };
}
