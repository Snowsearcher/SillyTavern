import { extension_prompt_roles, extension_prompt_types } from '../../../script.js';

const PROMPT_KEY = 'snowbunny-phone-context';
const MAX_CONTACTS = 4;
const MAX_MESSAGES_PER_CONTACT = 10;
const MAX_PROMPT_CHARS = 18000;

let initialized = false;
let pendingReceipt = null;
let inFlight = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function phoneStore() {
    return globalThis.SnowBunny?.phone ?? null;
}

function phoneEvidence() {
    return globalThis.SnowBunny?.phoneEvidence ?? null;
}

function characterAuthoring() {
    return globalThis.SnowBunny?.characterAuthoring ?? null;
}

function cleanChoiceMarkup(value) {
    return String(value || '').replace(/<choicecard\b[^>]*>[\s\S]*?<\/choicecard>/gi, '').trim();
}

function recentStoryQuery(limit = 7, includeDraft = true) {
    const api = context();
    if (!Array.isArray(api?.chat)) return '';
    const ignore = api?.symbols?.ignore;
    const rows = api.chat
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-limit)
        .map(message => `${message.name || (message.is_user ? api.name1 : api.name2) || ''}: ${cleanChoiceMarkup(message.mes)}`);
    if (includeDraft) {
        const draft = String(document.getElementById('send_textarea')?.value || '').trim();
        if (draft) rows.push(`${api?.name1 || 'User'}: ${draft}`);
    }
    return rows.join('\n');
}

function words(value) {
    return new Set(String(value || '').toLocaleLowerCase().split(/[^\p{L}\p{N}_]+/u).filter(word => word.length >= 3));
}

function overlapScore(text, queryWords) {
    let score = 0;
    for (const word of words(text)) if (queryWords.has(word)) score += 1;
    return score;
}

function currentAnchorId() {
    return String(phoneStore()?.currentStoryAnchor?.()?.messageId || '');
}

function latestContactTime(contact) {
    return Math.max(0, ...((contact.messages || []).map(message => Number(message.createdAt) || 0)));
}

function contactScore(contact, queryText, queryWords, activeEntityIds, anchorId) {
    let score = 0;
    const name = String(contact.name || '').toLocaleLowerCase();
    if (name && queryText.toLocaleLowerCase().includes(name)) score += 24;
    if (contact.actorKey && queryText.includes(contact.actorKey)) score += 10;
    if (contact.actorKey?.startsWith('entity:') && activeEntityIds.has(contact.actorKey.slice(7))) score += 18;
    const latest = contact.messages?.at(-1);
    if (latest?.through?.messageId && latest.through.messageId === anchorId) score += 40;
    if (latest?.unread) score += 8;
    score += Math.min(12, overlapScore([
        contact.privateState,
        contact.availability,
        ...(contact.messages || []).slice(-6).map(message => message.text),
    ].join(' '), queryWords));
    return score;
}

function esc(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function serializeMedia(media) {
    if (!media || media.status !== 'ready') return '';
    return ` [Delivered ${media.kind}: ${media.description || 'media'}]`;
}

function serializeContact(contact) {
    const attributes = [
        `name="${esc(contact.name)}"`,
        contact.actorKey ? `actor="${esc(contact.actorKey)}"` : '',
        contact.channel ? `channel="${esc(contact.channel)}"` : '',
    ].filter(Boolean).join(' ');
    const blocks = [];
    if (contact.privateState) {
        blocks.push(`Private continuity for ${contact.name}. This is writer support for this contact only; it is not scene narration or knowledge held by other characters:\n${contact.privateState}`);
    }
    if (contact.availability) blocks.push(`Availability/status: ${contact.availability}`);
    const messages = (contact.messages || []).slice(-MAX_MESSAGES_PER_CONTACT);
    if (messages.length) {
        blocks.push(`Delivered conversation, oldest to newest:\n${messages.map(message => {
            const sender = message.sender === 'player' ? 'Player' : message.sender || contact.name;
            return `${sender}${message.storyTime ? ` (${message.storyTime})` : ''}: ${message.text || ''}${serializeMedia(message.media)}`;
        }).join('\n')}`);
    }
    return `<phone-contact ${attributes}>\n${blocks.join('\n\n')}\n</phone-contact>`;
}

function serializePublic(post, action) {
    const blocks = [];
    if (post?.length) {
        blocks.push(`<phone-public-posts>\n${post.map(item => `${item.authorActorKey || 'Unknown'}${item.storyTime ? ` (${item.storyTime})` : ''}: ${item.text || ''}${serializeMedia(item.media)}`).join('\n')}\n</phone-public-posts>`);
    }
    if (action?.length) {
        blocks.push(`<phone-actions>\n${action.map(item => `${item.kind || 'action'} [${item.audience || 'public'}]${item.storyTime ? ` (${item.storyTime})` : ''}: ${item.text}`).join('\n')}\n</phone-actions>`);
    }
    return blocks.join('\n\n');
}

function setPrompt(value) {
    context()?.setExtensionPrompt?.(
        PROMPT_KEY,
        value,
        extension_prompt_types.IN_PROMPT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
}

async function computeRoute({ includeDraft = true } = {}) {
    const api = context();
    if (!api?.getCurrentChatId?.()) {
        pendingReceipt = null;
        setPrompt('');
        return null;
    }
    const phoneContext = await phoneEvidence()?.writerContext?.() || { enabled: false, contacts: [], posts: [], actions: [] };
    if (!phoneContext.enabled) {
        pendingReceipt = null;
        setPrompt('');
        return null;
    }

    const queryText = recentStoryQuery(7, includeDraft);
    const queryWords = words(queryText);
    const activeEntityIds = await characterAuthoring()?.activeEntityIds?.() || new Set();
    const anchorId = currentAnchorId();
    const ranked = phoneContext.contacts
        .map(contact => ({
            contact,
            score: contactScore(contact, queryText, queryWords, activeEntityIds, anchorId),
            latestAt: latestContactTime(contact),
        }))
        .sort((a, b) => b.score - a.score || b.latestAt - a.latestAt);

    const selected = ranked.filter(item => item.score > 0).slice(0, MAX_CONTACTS);
    // A Phone event created at the current Story boundary is immediately relevant
    // even when the next user draft does not repeat the contact's name.
    for (const item of ranked) {
        if (selected.length >= MAX_CONTACTS) break;
        if (selected.some(existing => existing.contact.id === item.contact.id)) continue;
        const latest = item.contact.messages?.at(-1);
        if (latest?.through?.messageId === anchorId) selected.push(item);
    }

    const recentPosts = (phoneContext.posts || []).filter(post => post?.through?.messageId === anchorId).slice(-6);
    const recentActions = (phoneContext.actions || []).filter(action => action?.through?.messageId === anchorId).slice(-6);
    if (!selected.length && !recentPosts.length && !recentActions.length) {
        pendingReceipt = {
            selectedContacts: [],
            selectedPosts: [],
            selectedActions: [],
            reason: 'No Pocket Phone continuity was relevant to this reply.',
        };
        setPrompt('');
        return pendingReceipt;
    }

    const contactBlocks = selected.map(item => serializeContact(item.contact));
    const publicBlock = serializePublic(recentPosts, recentActions);
    const knowledgeBoundary = `Pocket Phone continuity is real fictional continuity but is not automatically scene knowledge. A private phone exchange is known only to its participants unless the story establishes sharing. A public post exists publicly but do not assume every character saw it. Do not turn Phone state into offscreen omniscience, and do not treat private continuity notes as events that happened.`;
    let body = [knowledgeBoundary, ...contactBlocks, publicBlock].filter(Boolean).join('\n\n');
    if (body.length > MAX_PROMPT_CHARS) body = body.slice(-MAX_PROMPT_CHARS);
    const prompt = `<phone-context>\n${body}\n</phone-context>`;
    setPrompt(prompt);

    pendingReceipt = {
        characters: prompt.length,
        selectedContacts: selected.map(item => ({
            id: item.contact.id,
            name: item.contact.name,
            actorKey: item.contact.actorKey,
            score: item.score,
            messageIds: (item.contact.messages || []).slice(-MAX_MESSAGES_PER_CONTACT).map(message => message.id),
        })),
        selectedPosts: recentPosts.map(item => item.id),
        selectedActions: recentActions.map(item => item.id),
        currentStoryAnchor: anchorId,
    };
    return pendingReceipt;
}

async function routePhone(options = {}) {
    if (inFlight) return inFlight;
    inFlight = computeRoute(options).finally(() => { inFlight = null; });
    return inFlight;
}

function attachReceipt(message) {
    if (!message || message.is_user || message.is_system || !pendingReceipt) return;
    message.extra ||= {};
    message.extra.snowbunny ||= {};
    message.extra.snowbunny.contextReceipt ||= {};
    message.extra.snowbunny.contextReceipt.phone = structuredClone(pendingReceipt);
    const save = context()?.saveChat;
    if (typeof save === 'function') window.setTimeout(() => void save(), 90);
}

function invalidate() {
    pendingReceipt = null;
    setPrompt('');
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    if (types.GENERATION_AFTER_COMMANDS) {
        source.on(types.GENERATION_AFTER_COMMANDS, async (_type, _options, dryRun) => {
            if (!dryRun) await routePhone({ includeDraft: true });
        });
    }
    if (types.MESSAGE_RECEIVED) {
        source.on(types.MESSAGE_RECEIVED, messageId => {
            const index = Number(messageId);
            const message = Number.isInteger(index) ? api.chat?.[index] : api.chat?.at?.(-1);
            attachReceipt(message);
        });
    }
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MESSAGE_DELETED']) {
        const event = types[name];
        if (event) source.on(event, invalidate);
    }
}

export function initPhoneRouting() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    document.addEventListener('snowbunny:phone-changed', () => void routePhone({ includeDraft: false }));
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneRouting: {
            route: routePhone,
            invalidate,
        },
    };
}
