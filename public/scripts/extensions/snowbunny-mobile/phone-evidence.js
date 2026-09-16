let initialized = false;

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function fnv64(text) {
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    const mask = 0xffffffffffffffffn;
    const bytes = new TextEncoder().encode(String(text || ''));
    for (const byte of bytes) {
        hash ^= BigInt(byte);
        hash = (hash * prime) & mask;
    }
    return hash.toString(16).padStart(16, '0');
}

function fingerprint(value) {
    const text = JSON.stringify(value);
    return `${text.length.toString(16)}:${fnv64(text)}`;
}

function deliveredMedia(media) {
    if (!media || media.status !== 'ready') return null;
    return {
        kind: String(media.kind || ''),
        description: String(media.description || ''),
    };
}

function contactVisible(contact, endMessageId = '') {
    const store = phone();
    if (!store?.anchorVisible?.(contact.acquiredThrough, endMessageId)) return false;
    if (!store?.sourceValid?.(contact.acquiredEvidence)) return false;
    return true;
}

function eventVisible(event, endMessageId = '') {
    const store = phone();
    if (!store?.anchorVisible?.(event.through, endMessageId)) return false;
    if (!store?.sourceValid?.(event.evidence)) return false;
    return true;
}

function visiblePhoneState(state, { endMessageId = '' } = {}) {
    const contacts = [];
    for (const contact of safeArray(state?.contacts)) {
        if (!contactVisible(contact, endMessageId)) continue;
        const messages = safeArray(contact.messages).filter(message => eventVisible(message, endMessageId));
        const privateState = phone()?.anchorVisible?.(contact.stateThrough, endMessageId)
            ? String(contact.privateState || '')
            : '';
        contacts.push({ ...clone(contact), messages, privateState });
    }
    const posts = safeArray(state?.posts).filter(item => eventVisible(item, endMessageId)).map(clone);
    const actions = safeArray(state?.actions).filter(item => eventVisible(item, endMessageId)).map(clone);
    const profiles = safeArray(state?.profiles).filter(item => eventVisible(item, endMessageId)).map(clone);
    return { ...clone(state), contacts, posts, actions, profiles };
}

function messageEvent(contact, message) {
    const actor = phone()?.actorKey?.(contact.actor) || `contact:${contact.id}`;
    const media = deliveredMedia(message.media);
    return {
        key: `message:${contact.id}:${message.id}`,
        fingerprint: fingerprint([
            actor,
            contact.name,
            contact.channel,
            message.user === true,
            String(message.text || ''),
            media,
            String(message.storyTime || ''),
        ]),
        type: 'message',
        actor,
        contactId: contact.id,
        eventId: message.id,
        paragraph: `${message.user ? `Player sent; ${contact.name} received` : `${contact.name} sent`}${message.storyTime ? ` at ${message.storyTime}` : ''}: ${String(message.text || '').trim()}${media ? ` [Delivered ${media.kind}: ${media.description}]` : ''}`.trim(),
    };
}

function postEvent(post) {
    const media = deliveredMedia(post.media);
    return {
        key: `post:${post.id}`,
        fingerprint: fingerprint([
            String(post.authorActorKey || ''),
            String(post.text || ''),
            media,
            String(post.storyTime || ''),
        ]),
        type: 'post',
        actor: String(post.authorActorKey || ''),
        eventId: post.id,
        paragraph: `Public post${post.authorActorKey ? ` by ${post.authorActorKey}` : ''}${post.storyTime ? ` at ${post.storyTime}` : ''}: ${String(post.text || '').trim()}${media ? ` [Delivered ${media.kind}: ${media.description}]` : ''}`.trim(),
    };
}

function actionEvent(action) {
    return {
        key: `action:${action.id}`,
        fingerprint: fingerprint([
            String(action.kind || ''),
            String(action.audience || ''),
            String(action.text || ''),
            String(action.storyTime || ''),
        ]),
        type: 'action',
        actor: 'player',
        eventId: action.id,
        paragraph: `Player phone action (${action.audience || 'public'}${action.storyTime ? ` at ${action.storyTime}` : ''}): ${String(action.text || '').trim()}`,
    };
}

function collectEvents(state, { endMessageId = '', forValidation = false, memory = false, destinationKey = '' } = {}) {
    const visible = visiblePhoneState(state, { endMessageId });
    if (memory && visible.settings?.shareMemory !== true) return [];
    const events = [];

    for (const contact of visible.contacts) {
        if (contact.linked === false && !forValidation) continue;
        if (memory) {
            if (contact.memoryAllowed !== true) continue;
            if (contact.memoryConsentKey && destinationKey && contact.memoryConsentKey !== destinationKey) continue;
        }
        const messages = safeArray(contact.messages);
        const window = forValidation ? messages : messages.slice(-40);
        for (const message of window) {
            const event = messageEvent(contact, message);
            if (event.paragraph) events.push(event);
        }
    }

    if (!memory || visible.settings?.shareMemory === true) {
        const posts = forValidation ? visible.posts : visible.posts.slice(-40);
        for (const post of posts) events.push(postEvent(post));
        for (const action of visible.actions) events.push(actionEvent(action));
    }
    return events;
}

async function readEvidence({ endMessageId = '', forValidation = false, memory = false, destinationKey = '' } = {}) {
    const store = phone();
    if (!store) return { paragraphs: [], fingerprints: {}, events: [], version: 0 };
    const state = await store.read({ fresh: forValidation });
    const events = collectEvents(state, { endMessageId, forValidation, memory, destinationKey });
    return {
        paragraphs: events.map(event => event.paragraph),
        fingerprints: Object.fromEntries(events.map(event => [event.key, event.fingerprint])),
        events: events.map(event => ({
            key: event.key,
            type: event.type,
            actor: event.actor,
            contactId: event.contactId || '',
            eventId: event.eventId,
        })),
        version: Number(state.version) || 0,
    };
}

async function validateFingerprints(expected) {
    if (expected === null || expected === undefined) return true;
    if (!expected || typeof expected !== 'object' || Array.isArray(expected)) return false;
    const current = (await readEvidence({ forValidation: true })).fingerprints;
    return Object.entries(expected).every(([key, value]) => current[key] === value);
}

async function writerContext({ endMessageId = '', maxContacts = 12, maxMessagesPerContact = 24 } = {}) {
    const state = await phone()?.read?.() || { contacts: [], profiles: [], posts: [], actions: [], settings: {} };
    if (state.settings?.enabled !== true) return { enabled: false, contacts: [], posts: [], actions: [] };
    const visible = visiblePhoneState(state, { endMessageId });
    const contacts = visible.contacts
        .filter(contact => contact.linked !== false && !contact.archived)
        .slice(-Math.max(1, maxContacts))
        .map(contact => ({
            id: contact.id,
            actorKey: phone()?.actorKey?.(contact.actor) || '',
            name: contact.name,
            channel: contact.channel,
            privateState: String(contact.privateState || ''),
            availability: String(contact.availability || ''),
            messages: safeArray(contact.messages).slice(-Math.max(1, maxMessagesPerContact)).map(message => ({
                sender: message.user ? 'player' : contact.name,
                text: String(message.text || ''),
                media: deliveredMedia(message.media),
                storyTime: String(message.storyTime || ''),
                unread: message.user ? false : message.unread === true,
            })),
        }));
    return {
        enabled: true,
        brand: String(visible.brand || ''),
        contacts,
        profiles: visible.profiles.map(profile => ({
            actorKey: phone()?.actorKey?.(profile.actor) || '',
            name: profile.name,
            handle: profile.handle,
            bio: profile.bio,
            fields: clone(profile.fields),
        })),
        posts: visible.posts.slice(-24).map(post => ({
            authorActorKey: post.authorActorKey,
            text: post.text,
            media: deliveredMedia(post.media),
            storyTime: post.storyTime,
        })),
        actions: visible.actions.slice(-24).map(action => ({
            kind: action.kind,
            audience: action.audience,
            text: action.text,
            storyTime: action.storyTime,
        })),
    };
}

async function relevanceHints(options = {}) {
    const value = await writerContext({ ...options, maxContacts: 8, maxMessagesPerContact: 8 });
    if (!value.enabled) return null;
    return {
        contacts: value.contacts.map(contact => ({
            actorKey: contact.actorKey,
            name: contact.name,
            channel: contact.channel,
            latest: contact.messages.slice(-3),
            privateState: contact.privateState,
        })),
        recentPosts: value.posts.slice(-8),
        recentActions: value.actions.slice(-8),
    };
}

export function initPhoneEvidence() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneEvidence: {
            visibleState: visiblePhoneState,
            read: readEvidence,
            memory: options => readEvidence({ ...(options || {}), memory: true }),
            validate: validateFingerprints,
            writerContext,
            relevanceHints,
            fingerprint,
        },
    };
}
