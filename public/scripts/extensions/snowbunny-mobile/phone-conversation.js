const MAX_REPLY_MESSAGES = 8;
const MAX_PRIVATE_STATE = 12000;
const MAX_MESSAGE_CHARS = 6000;

let initialized = false;
const busyContacts = new Set();

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function characterAuthoring() {
    return globalThis.SnowBunny?.characterAuthoring ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function trackerStore() {
    return globalThis.SnowBunny?.trackers ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function cleanChoiceMarkup(value) {
    return String(value || '').replace(/<choicecard\b[^>]*>[\s\S]*?<\/choicecard>/gi, '').trim();
}

function visibleStory(limit = 30) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    return api.chat
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(4, limit))
        .map(message => ({
            speaker: message.name || (message.is_user ? api.name1 : api.name2) || (message.is_user ? 'User' : 'Assistant'),
            role: message.is_user ? 'user' : 'assistant',
            text: cleanChoiceMarkup(message.mes),
        }))
        .filter(row => row.text);
}

function stripFence(text) {
    const value = String(text || '').trim();
    const match = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(value);
    return match ? match[1].trim() : value;
}

function parseReply(text) {
    let value;
    try {
        value = JSON.parse(stripFence(text));
    } catch (_) {
        throw new Error('The Pocket Phone model returned incomplete JSON. Your outgoing message was kept.');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.messages) || value.messages.length > MAX_REPLY_MESSAGES) {
        throw new Error('The Pocket Phone model returned an invalid reply. Your outgoing message was kept.');
    }
    const messages = value.messages.map(item => {
        const textValue = typeof item === 'string' ? item : item?.text;
        const clean = String(textValue || '').trim();
        if (!clean || clean.length > MAX_MESSAGE_CHARS) throw new Error('The Pocket Phone model returned an invalid message.');
        return clean;
    });
    const privateState = String(value.privateState || '');
    if (privateState.length > MAX_PRIVATE_STATE) throw new Error('Pocket Phone private continuity was too large.');
    const availability = String(value.availability || '');
    if (availability.length > 1500) throw new Error('Pocket Phone availability text was too large.');
    const reaction = String(value.reaction || '');
    if (reaction.length > 32) throw new Error('Pocket Phone reaction was invalid.');
    const mediaRows = Array.isArray(value.media) ? value.media : [];
    if (mediaRows.length > 1) throw new Error('Pocket Phone may propose at most one attachment per reply.');
    const media = mediaRows.length ? (() => {
        const row = mediaRows[0];
        if (!row || typeof row !== 'object' || !['photo', 'voice'].includes(row.kind)) throw new Error('Pocket Phone proposed an invalid attachment.');
        const description = String(row.description || '').trim();
        if (!description || description.length > 6000) throw new Error('Pocket Phone proposed an invalid attachment description.');
        return { kind: row.kind, description, status: 'pending' };
    })() : null;
    return { messages, privateState, availability, reaction, media };
}

function characterDocument(record) {
    if (!record) return '';
    const parts = [];
    if (record.document?.content?.trim()) parts.push(record.document.content.trim());
    for (const field of record.document?.fields || []) {
        if (field.role === 'firstMessage' || !field.value?.trim()) continue;
        parts.push(`${field.label}:\n${field.value.trim()}`);
    }
    return parts.join('\n\n');
}

function codexDocument(entry, book) {
    if (!entry) return '';
    const parts = [];
    if (entry.description?.trim()) parts.push(entry.description.trim());
    for (const section of [...(entry.sections || [])].sort((a, b) => (a.order || 0) - (b.order || 0))) {
        if (!String(section.text || '').trim()) continue;
        parts.push(`${section.label || 'Detail'}:\n${String(section.text).trim()}`);
    }
    return `<codex-character name="${entry.name}" lorebook="${book?.name || ''}">\n${parts.join('\n\n')}\n</codex-character>`;
}

async function actorContext(contact) {
    const actor = contact?.actor || {};
    if (actor.kind === 'character' && actor.avatar) {
        const record = await characterAuthoring()?.read?.(actor.avatar);
        if (record) return {
            identity: record.entityId || phone()?.actorKey?.(actor) || '',
            name: record.name,
            text: characterDocument(record),
        };
    }
    if (actor.kind === 'codex-character' && actor.lorebookId && actor.entryId) {
        const book = await lorebooks()?.load?.(actor.lorebookId);
        const raw = book?.entries?.find(entry => entry.id === actor.entryId);
        if (raw) {
            const entry = await characterAuthoring()?.materializeLinkedEntry?.(raw) || raw;
            return {
                identity: actor.entityId || phone()?.actorKey?.(actor) || '',
                name: entry.name,
                text: codexDocument(entry, book),
            };
        }
    }
    return null;
}

async function currentStoryTime() {
    try {
        const snapshot = await trackerStore()?.current?.();
        return String(snapshot?.timePlace || '');
    } catch (_) {
        return '';
    }
}

function conversationRows(contact, limit = 100) {
    return (contact.messages || []).slice(-Math.max(10, limit)).map(message => ({
        sender: message.user ? 'player' : contact.name,
        text: message.text,
        storyTime: message.storyTime || '',
        unread: message.user ? false : message.unread === true,
        media: message.media?.status === 'ready' ? { kind: message.media.kind, description: message.media.description } : null,
    }));
}

function systemPrompt(contact, actor, mediaSettings) {
    return `Write private Pocket Phone communication as ${actor.name}. Return the communication result, not story prose.

${actor.text}

KNOWLEDGE BOUNDARY: Story context is supplied only so timing and established circumstances remain consistent. It does not grant ${actor.name} omniscience. An absent person cannot see the current scene, another private conversation, hidden thoughts, or a secret merely because it appears in supplied context. Preserve only what this person has actually learned, sent, received, witnessed, or been told. Their privateState is writer continuity, not something they must reveal.

Availability follows fictional story time and circumstances, not elapsed real-world time. Someone busy, asleep, unwilling to answer, or with nothing worthwhile to say may remain silent. An unanswered message may remain pending. Proactive contact should be occasional and motivated. Invitations, accepted plans, and announced travel can motivate future story events, but sending a message does not make a journey or arrival happen.

Keep privateState concise and evidence-grounded: supported knowledge, relevant feelings, and active intentions for future phone replies. Do not use privateState to create long-term Story Memory. Do not invent offscreen events merely to make the phone busy.

Photo proposals are ${mediaSettings.incomingPhotos || 'off'} and voice proposals are ${mediaSettings.incomingVoice || 'off'}. A kind set to off cannot be proposed. A proposal is not yet delivered media; do not describe it as already sent.

Return JSON only:
{"messages":[{"text":"their message"}],"privateState":"supported private continuity","availability":"optional current reason for waiting","reaction":"optional single emoji","media":[{"kind":"photo or voice","description":"intended photo description, or words for a voice note"}]}

Use at most ${MAX_REPLY_MESSAGES} messages. Several messages are appropriate only when this person would naturally send them separately. An empty messages array means silence.`;
}

async function generateReply(contactId, { proactive = false, expectedVersion = null } = {}) {
    const store = phone();
    const api = context();
    if (!store || typeof api?.generateRaw !== 'function') throw new Error('Pocket Phone needs an active model connection.');
    if (busyContacts.has(contactId)) throw new Error('That Pocket Phone conversation is already being updated.');
    busyContacts.add(contactId);
    document.dispatchEvent(new CustomEvent('snowbunny:phone-work-status', { detail: { contactId, busy: true } }));
    try {
        const state = await store.read({ fresh: true });
        if (expectedVersion !== null && Number(state.version) !== Number(expectedVersion)) throw new Error('Pocket Phone changed before the reply could start.');
        if (state.settings?.enabled !== true) throw new Error('Pocket Phone is turned off for this chat.');
        const contact = state.contacts.find(item => item.id === contactId && !item.archived);
        if (!contact) throw new Error('That Pocket Phone contact no longer exists.');
        if (contact.linked === false) throw new Error('This contact is not linked to a story identity, so SnowBunny will not invent an automatic voice for them.');
        const actor = await actorContext(contact);
        if (!actor?.text) throw new Error('The linked Character/Codex identity could not be loaded.');
        const versionAtStart = state.version;
        const storyRows = visibleStory(state.settings?.historyCount || 100);
        const timePlace = await currentStoryTime();
        const prompt = `${contact.privateState ? `Current private continuity for ${contact.name}:\n${contact.privateState}\n\n` : ''}Current Story time/place hint:\n${timePlace || '(not established)'}\n\nRecent visible story context. Use only for timing/circumstance; do not treat all of it as ${contact.name}'s knowledge:\n${storyRows.map(row => `${row.speaker}: ${row.text}`).join('\n\n')}\n\nPrivate phone thread, oldest to newest:\n${JSON.stringify(conversationRows(contact, state.settings?.historyCount || 100))}\n\n${proactive ? 'This is an opportunity to initiate or answer something pending. Silence is correct if there is no motivated reason to contact the player now.' : 'The player has just sent the latest private message. Decide whether this person can and would answer now; silence is allowed.'}`;
        const raw = await api.generateRaw({
            prompt,
            systemPrompt: systemPrompt(contact, actor, state.settings || {}),
            responseLength: Math.max(800, Number(state.settings?.upkeep?.replyLimit) || 3000),
            trimNames: false,
        });
        const parsed = parseReply(raw);
        const storyTime = timePlace;
        const anchor = store.currentStoryAnchor?.() || { messageId: '', revision: 0, source: '' };
        const saved = await store.mutate(draft => {
            if (draft.version !== versionAtStart) throw new Error('Pocket Phone changed while the reply was being generated. Your existing messages were kept.');
            const fresh = draft.contacts.find(item => item.id === contactId && !item.archived);
            if (!fresh) throw new Error('That Pocket Phone contact disappeared while the reply was being generated.');
            const incoming = parsed.messages.map((text, index) => ({
                id: api?.uuidv4?.() || `phone_reply_${Date.now()}_${index}`,
                user: false,
                text,
                through: clone(anchor),
                evidence: [],
                storyTime,
                createdAt: Date.now() + index,
                unread: true,
                reaction: index === 0 ? parsed.reaction : '',
                media: index === parsed.messages.length - 1 ? parsed.media : null,
            }));
            fresh.messages.push(...incoming);
            fresh.privateState = parsed.privateState;
            fresh.stateThrough = clone(anchor);
            fresh.availability = parsed.availability;
            fresh.lastCheckAt = Date.now();
            fresh.lastStoryTime = storyTime;
            fresh.updatedAt = Date.now();
            return { incomingIds: incoming.map(message => message.id), silent: incoming.length === 0 };
        });
        document.dispatchEvent(new CustomEvent('snowbunny:phone-reply-ready', {
            detail: { contactId, ...saved.result },
        }));
        return saved.result;
    } finally {
        busyContacts.delete(contactId);
        document.dispatchEvent(new CustomEvent('snowbunny:phone-work-status', { detail: { contactId, busy: false } }));
    }
}

async function sendMessage(contactId, text, { generate = true } = {}) {
    const store = phone();
    const clean = String(text || '').trim();
    if (!clean || clean.length > MAX_MESSAGE_CHARS) throw new Error('Type a shorter Pocket Phone message first.');
    const storyTime = await currentStoryTime();
    await store.appendMessage(contactId, {
        user: true,
        text: clean,
        storyTime,
        unread: false,
    });
    const state = await store.read({ fresh: true });
    if (generate && state.settings?.automaticReplies !== false) {
        return generateReply(contactId, { proactive: false, expectedVersion: state.version });
    }
    return { incomingIds: [], silent: true };
}

async function markRead(contactId) {
    const store = phone();
    return (await store.mutate(state => {
        const contact = state.contacts.find(item => item.id === contactId);
        if (!contact) return false;
        for (const message of contact.messages || []) if (!message.user) message.unread = false;
        return true;
    })).result;
}

function isBusy(contactId = '') {
    return contactId ? busyContacts.has(contactId) : busyContacts.size > 0;
}

export function initPhoneConversation() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneConversation: {
            send: sendMessage,
            generate: generateReply,
            markRead,
            isBusy,
            actorContext,
        },
    };
}
