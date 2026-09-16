const MODES = Object.freeze(['microblog', 'forum', 'community', 'image', 'bulletin', 'hybrid']);

const STOCK_ICONS = Object.freeze([
    { id: 'comet', fa: 'fa-comet', fit: 'fast public updates, short-post networks, modern or futuristic chatter' },
    { id: 'threads', fa: 'fa-comments', fit: 'conversation-heavy social spaces and threaded public discussion' },
    { id: 'forum', fa: 'fa-layer-group', fit: 'topic boards, forum/reddit-like communities, nested discussion' },
    { id: 'people', fa: 'fa-user-group', fit: 'friend/community networks, clubs, family and local social circles' },
    { id: 'camera', fa: 'fa-camera-retro', fit: 'image-first public sharing, fashion, art, travel or visual culture' },
    { id: 'signal', fa: 'fa-tower-broadcast', fit: 'broadcast-like networks, newsy public streams and high-tech settings' },
    { id: 'noticeboard', fa: 'fa-thumbtack', fit: 'public bulletin boards, local notices, guild boards and low-tech worlds' },
    { id: 'scroll', fa: 'fa-scroll', fit: 'fantasy, historical or magical public correspondence and proclamations' },
    { id: 'crystal', fa: 'fa-gem', fit: 'magical, psychic, holographic or fantastical social communication' },
    { id: 'globe', fa: 'fa-globe', fit: 'broad general-purpose social networks or mixed public communication' },
    { id: 'star', fa: 'fa-star', fit: 'fandom, celebrity, entertainment or aspirational social spaces' },
    { id: 'radio', fa: 'fa-radio', fit: 'retro, broadcast, community-radio or analog-flavored public networks' },
]);

const DEFAULT_TERMS = Object.freeze({
    home: 'Feed',
    post: 'Post',
    reply: 'Reply',
    profile: 'Profile',
    community: 'Community',
});

let initialized = false;
let inFlight = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function stateApi() {
    return globalThis.SnowBunny?.state ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function trackers() {
    return globalThis.SnowBunny?.trackers ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function plainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cleanChoiceMarkup(value) {
    return String(value || '').replace(/<choicecard\b[^>]*>[\s\S]*?<\/choicecard>/gi, '').trim();
}

function currentStoryId() {
    return String(stateApi()?.readChat?.()?.storyId || '');
}

function storyRecords() {
    const rows = stateApi()?.readGlobal?.()?.stories;
    return Array.isArray(rows) ? rows : [];
}

function currentStory() {
    const id = currentStoryId();
    return id ? storyRecords().find(story => String(story.id) === id) || null : null;
}

function fallbackNetwork() {
    return {
        name: 'Social',
        description: 'The public social network used in this story.',
        mode: 'hybrid',
        iconId: 'globe',
        terminology: { ...DEFAULT_TERMS },
        source: 'fallback',
        createdAt: 0,
        updatedAt: 0,
    };
}

function cleanTerm(value, fallback) {
    const text = String(value || '').trim().replace(/\s+/g, ' ');
    return text ? text.slice(0, 28) : fallback;
}

function normalizeNetwork(value, { fallback = true } = {}) {
    if (!plainObject(value)) return fallback ? fallbackNetwork() : null;
    const name = String(value.name || '').trim().replace(/\s+/g, ' ').slice(0, 36);
    if (!name) return fallback ? fallbackNetwork() : null;
    const iconId = STOCK_ICONS.some(icon => icon.id === value.iconId) ? value.iconId : 'globe';
    const mode = MODES.includes(value.mode) ? value.mode : 'hybrid';
    const sourceTerms = plainObject(value.terminology) ? value.terminology : {};
    return {
        name,
        description: String(value.description || '').trim().slice(0, 360),
        mode,
        iconId,
        terminology: {
            home: cleanTerm(sourceTerms.home, DEFAULT_TERMS.home),
            post: cleanTerm(sourceTerms.post, DEFAULT_TERMS.post),
            reply: cleanTerm(sourceTerms.reply, DEFAULT_TERMS.reply),
            profile: cleanTerm(sourceTerms.profile, DEFAULT_TERMS.profile),
            community: cleanTerm(sourceTerms.community, DEFAULT_TERMS.community),
        },
        source: String(value.source || 'ai'),
        createdAt: Number(value.createdAt) || Date.now(),
        updatedAt: Number(value.updatedAt) || Date.now(),
    };
}

function readSavedNetwork() {
    const story = currentStory();
    if (story?.socialNetwork) return normalizeNetwork(story.socialNetwork, { fallback: false });
    const local = stateApi()?.readChat?.()?.socialNetwork;
    return normalizeNetwork(local, { fallback: false });
}

function readNetwork() {
    return readSavedNetwork() || fallbackNetwork();
}

function saveNetwork(input) {
    const network = normalizeNetwork(input);
    network.source = String(input?.source || network.source || 'ai');
    network.updatedAt = Date.now();
    if (!network.createdAt) network.createdAt = network.updatedAt;

    const storyId = currentStoryId();
    if (storyId) {
        const stories = storyRecords();
        const story = stories.find(item => String(item.id) === storyId);
        if (!story) throw new Error('This Story no longer exists.');
        story.socialNetwork = clone(network);
        story.updatedAt = Date.now();
        stateApi()?.patchGlobal?.({ stories });
    } else {
        stateApi()?.patchChat?.({ socialNetwork: clone(network) });
    }

    document.dispatchEvent(new CustomEvent('snowbunny:phone-network-changed', { detail: clone(network) }));
    return clone(network);
}

function iconRecord(iconId) {
    return STOCK_ICONS.find(icon => icon.id === iconId) || STOCK_ICONS.find(icon => icon.id === 'globe');
}

function iconClass(iconId) {
    return iconRecord(iconId)?.fa || 'fa-globe';
}

function recentStory(limit = 20) {
    const api = context();
    const ignore = api?.symbols?.ignore;
    return (Array.isArray(api?.chat) ? api.chat : [])
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(4, limit))
        .map(message => ({
            speaker: message.name || (message.is_user ? api?.name1 : api?.name2) || (message.is_user ? 'User' : 'Assistant'),
            text: cleanChoiceMarkup(message.mes),
        }))
        .filter(row => row.text);
}

async function loreSummary() {
    const store = lorebooks();
    if (!store?.effectiveIds || !store?.load) return [];
    const ids = store.effectiveIds().slice(0, 8);
    const books = await Promise.all(ids.map(id => store.load(id)));
    const rows = [];
    for (const book of books) {
        if (!book) continue;
        for (const entry of (book.entries || []).filter(item => item.enabled !== false).slice(0, 18)) {
            rows.push({
                lorebook: book.name,
                name: entry.name,
                type: entry.type,
                description: String(entry.description || '').slice(0, 420),
            });
            if (rows.length >= 36) return rows;
        }
    }
    return rows;
}

async function currentTimePlace() {
    try {
        return String((await trackers()?.current?.())?.timePlace || '');
    } catch (_) {
        return '';
    }
}

function stripFence(text) {
    const value = String(text || '').trim();
    const match = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(value);
    return match ? match[1].trim() : value;
}

function parseNetwork(text) {
    let value;
    try {
        value = JSON.parse(stripFence(text));
    } catch (_) {
        throw new Error('The social-network designer returned invalid JSON.');
    }
    const normalized = normalizeNetwork({ ...value, source: 'ai' }, { fallback: false });
    if (!normalized) throw new Error('The social-network designer did not return a usable identity.');
    if (!MODES.includes(normalized.mode)) throw new Error('The social-network designer returned an unsupported layout.');
    if (!STOCK_ICONS.some(icon => icon.id === normalized.iconId)) throw new Error('The social-network designer returned an unsupported stock icon.');
    return normalized;
}

function designerSystemPrompt() {
    return `Design ONE fictional public/social communication network for the supplied Story. This network belongs to the setting. Do not default to a fixed app name or fixed modern social-media model.

Infer what fits the world: a short-post microblog, threaded forum, friend/community network, image-first network, local bulletin/notice board, fantasy or magical public medium, or a hybrid. A fantasy setting does not need a smartphone clone. A futuristic setting does not need to copy a present-day brand. A modern setting may naturally resemble familiar social patterns without naming a real service.

This identity is Story-level and should remain stable across that Story's chats. It must describe the broader public network, not merely the current scene, current venue, or current cast.

Choose exactly one mode from: ${MODES.join(', ')}.
Choose exactly one stock icon id from this catalog:\n${STOCK_ICONS.map(icon => `${icon.id}: ${icon.fit}`).join('\n')}

Also choose short interface terminology that fits the network. A forum-like service might call items Threads and Communities. A microblog might use Posts and Replies. A fantasy notice medium could use Notices and Boards. Keep the terms understandable.

Do not use Reddit, X, Twitter, Facebook, Instagram, Tumblr, TikTok or another real product name unless the fictional source material explicitly establishes that real service as canon.

Return JSON only:
{"name":"fictional network name","description":"one concise sentence","mode":"microblog|forum|community|image|bulletin|hybrid","iconId":"one allowed id","terminology":{"home":"Feed","post":"Post","reply":"Reply","profile":"Profile","community":"Community"}}`;
}

async function generateNetwork() {
    const api = context();
    if (typeof api?.generateRaw !== 'function') throw new Error('A model connection is needed to design this Story social network.');
    const story = currentStory();
    const scenario = stateApi()?.readChat?.()?.scenario || {};
    const prompt = `Story title:\n${story?.title || '(stand-alone chat)'}\n\nScenario/premise hints:\n${JSON.stringify({
        premise: scenario.premise || '',
        focus: scenario.focus || '',
        writerKnowledge: scenario.writerKnowledge || '',
    })}\n\nCurrent fictional time/place:\n${await currentTimePlace() || '(not established)'}\n\nRelevant Lore/Codex overview:\n${JSON.stringify(await loreSummary())}\n\nRecent visible Story:\n${recentStory().map(row => `${row.speaker}: ${row.text}`).join('\n\n')}\n\nDesign the public social network that naturally belongs to this Story's world.`;
    const raw = await api.generateRaw({
        prompt,
        systemPrompt: designerSystemPrompt(),
        responseLength: 1100,
        trimNames: false,
    });
    return parseNetwork(raw);
}

async function ensureNetwork({ force = false } = {}) {
    const saved = readSavedNetwork();
    if (saved && !force) return saved;
    if (inFlight) return inFlight;
    inFlight = (async () => {
        const ownerBefore = currentStoryId() || phoneOwnerKey();
        const generated = await generateNetwork();
        const ownerAfter = currentStoryId() || phoneOwnerKey();
        if (ownerBefore !== ownerAfter) throw new Error('The open Story changed while its social network was being designed.');
        return saveNetwork({ ...generated, createdAt: saved?.createdAt || Date.now() });
    })().finally(() => { inFlight = null; });
    return inFlight;
}

function phoneOwnerKey() {
    const phone = globalThis.SnowBunny?.phone;
    return phone?.refKey?.(phone.currentRef?.()) || String(context()?.getCurrentChatId?.() || '');
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => { inFlight = null; });
    }
}

export function initPhoneSocialNetwork() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneSocial: {
            read: readNetwork,
            readSaved: readSavedNetwork,
            save: saveNetwork,
            ensure: ensureNetwork,
            regenerate: () => ensureNetwork({ force: true }),
            normalize: normalizeNetwork,
            iconClass,
            iconRecord,
            modes: [...MODES],
            stockIcons: clone(STOCK_ICONS),
        },
    };
}