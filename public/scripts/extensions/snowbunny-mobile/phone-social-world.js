const MAX_NEW_PROFILES = 4;
const MAX_POSTS = 6;
const MAX_STORY_PROFILES = 80;
const MAX_EXISTING_PROFILES_IN_PROMPT = 48;
const MAX_EXISTING_POSTS_IN_PROMPT = 24;
const POST_FORMATS = new Set(['status', 'thread', 'community', 'image', 'notice', 'announcement']);

let initialized = false;
let inFlight = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function social() {
    return globalThis.SnowBunny?.phoneSocial ?? null;
}

function stateApi() {
    return globalThis.SnowBunny?.state ?? null;
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

function cleanText(value, limit) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, limit);
}

function id(prefix) {
    const value = context()?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${String(value).replaceAll('-', '')}`;
}

function currentStoryId() {
    return String(stateApi()?.readChat?.()?.storyId || '');
}

function storyRecords() {
    const rows = stateApi()?.readGlobal?.()?.stories;
    return Array.isArray(rows) ? rows : [];
}

function currentStory() {
    const storyId = currentStoryId();
    return storyId ? storyRecords().find(story => String(story.id) === storyId) || null : null;
}

function phoneOwnerKey() {
    const store = phone();
    return store?.refKey?.(store.currentRef?.()) || String(context()?.getCurrentChatId?.() || '');
}

function ownerKey() {
    const storyId = currentStoryId();
    return storyId ? `story:${storyId}` : `chat:${phoneOwnerKey()}`;
}

function normalizeActor(value) {
    return phone()?.normalizeActor?.(value) || {
        kind: 'custom',
        entityId: '',
        avatar: '',
        lorebookId: '',
        entryId: '',
        key: String(value?.key || ''),
    };
}

function normalizeBackgroundProfile(value) {
    if (!plainObject(value)) return null;
    const profileId = cleanText(value.id, 120);
    const name = cleanText(value.name, 100);
    if (!profileId || !name) return null;
    const actor = normalizeActor(value.actor || { kind: 'custom', key: `social-${profileId}` });
    return {
        id: profileId,
        actor,
        name,
        handle: cleanText(value.handle, 80).replace(/^@+/, ''),
        bio: cleanText(value.bio, 420),
        space: cleanText(value.space, 100),
        createdAt: Number(value.createdAt) || Date.now(),
        updatedAt: Number(value.updatedAt) || Number(value.createdAt) || Date.now(),
    };
}

function savedBackgroundProfiles() {
    const story = currentStory();
    const local = stateApi()?.readChat?.()?.socialWorld;
    const world = story?.socialWorld || local;
    const rows = Array.isArray(world?.profiles) ? world.profiles : [];
    return rows.map(normalizeBackgroundProfile).filter(Boolean).slice(0, MAX_STORY_PROFILES);
}

function saveBackgroundProfiles(profiles) {
    const clean = profiles.map(normalizeBackgroundProfile).filter(Boolean).slice(0, MAX_STORY_PROFILES);
    const storyId = currentStoryId();
    if (storyId) {
        const stories = storyRecords();
        const story = stories.find(item => String(item.id) === storyId);
        if (!story) throw new Error('This Story no longer exists.');
        story.socialWorld = {
            ...(plainObject(story.socialWorld) ? story.socialWorld : {}),
            profiles: clone(clean),
            updatedAt: Date.now(),
        };
        story.updatedAt = Date.now();
        stateApi()?.patchGlobal?.({ stories });
    } else {
        const existing = stateApi()?.readChat?.()?.socialWorld;
        stateApi()?.patchChat?.({
            socialWorld: {
                ...(plainObject(existing) ? existing : {}),
                profiles: clone(clean),
                updatedAt: Date.now(),
            },
        });
    }
    return clean;
}

function stripFence(text) {
    const value = String(text || '').trim();
    const match = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(value);
    return match ? match[1].trim() : value;
}

function parseJson(text) {
    try {
        const value = JSON.parse(stripFence(text));
        if (!plainObject(value)) throw new Error();
        return value;
    } catch (_) {
        throw new Error('The public-network maintainer returned invalid JSON. Existing Phone state was kept.');
    }
}

function recentStory(limit = 24, targetIndex = null) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    const end = Number.isInteger(Number(targetIndex))
        ? Math.max(0, Math.min(api.chat.length - 1, Number(targetIndex)))
        : api.chat.length - 1;
    return api.chat
        .slice(0, end + 1)
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(4, limit))
        .map(message => ({
            speaker: message.name || (message.is_user ? api?.name1 : api?.name2) || (message.is_user ? 'User' : 'Assistant'),
            role: message.is_user ? 'user' : 'assistant',
            text: cleanChoiceMarkup(message.mes),
        }))
        .filter(row => row.text);
}

async function currentTimePlace() {
    try {
        return String((await trackers()?.current?.())?.timePlace || '').trim();
    } catch (_) {
        return '';
    }
}

function playerNames() {
    const api = context();
    return [api?.name1, api?.chatMetadata?.persona].map(value => cleanText(value, 100).toLocaleLowerCase()).filter(Boolean);
}

function isPlayerProfile(profile) {
    const names = new Set(playerNames());
    const name = cleanText(profile?.name, 100).toLocaleLowerCase();
    return Boolean(name && names.has(name));
}

function publicSystemPrompt(network) {
    const mode = String(network?.mode || 'hybrid');
    return `Maintain a fictional PUBLIC social/communication world for one Story. You are creating background public activity, not writing the next Story scene.

The network identity and interaction grammar are already fixed. Respect them exactly. Current mode: ${mode}. Network name: ${network?.name || 'Social'}.

Knowledge boundary is strict. Public accounts may use only information that a plausible public participant could know. Never expose private Pocket Phone messages, hidden thoughts, private conversations, secret plans, off-screen omniscient facts, confidential lore, or facts that the recent Story shows only to the player/narrator. If you are unsure whether a detail is public, do not post it. You may create ordinary setting-appropriate chatter, local public notices, hobby/community discussion, rumors clearly framed as rumors, and reactions to events that were visibly public.

Background accounts are persistent people/organizations. Reuse supplied existing profile ids when the same identity fits. Create at most ${MAX_NEW_PROFILES} new profiles. Do not create the player's Persona as a background account. Do not impersonate the player. Do not rename an existing profile into somebody else.

Generate at most ${MAX_POSTS} new public items. Do not repeat or lightly paraphrase existing posts. Replies must point to an existing post id or to an earlier new post ref from this same response. Do not claim a photo/file/voice asset exists; media fulfillment is separate.

Mode grammar:
- microblog: short status posts and reply chains; titles/spaces usually blank.
- forum: thread posts need concise titles and boards/spaces; replies use replyTo.
- community: posts should usually identify a group/community space and can have replies.
- image: use image-oriented captions/discussion, but do not invent delivered image paths. format may be image even when only a caption/description is available.
- bulletin: notices/announcements need concise titles and sections/spaces.
- hybrid: mix formats only when natural for this fictional network.

Allowed formats: status, thread, community, image, notice, announcement.

Return JSON only:
{"profiles":[{"ref":"existing profile id OR new1/new2/new3/new4","name":"...","handle":"...","bio":"...","space":"optional home group/board"}],"posts":[{"ref":"p1","authorRef":"profile ref","format":"allowed format","title":"optional","space":"optional board/community/section","replyTo":"optional existing post id or earlier p-ref","text":"public content"}]}

For a new profile, ref must be new1, new2, new3, or new4. For an existing profile, copy its exact supplied id. Post refs must be p1 through p6 and unique.`;
}

function modeDefaultFormat(mode) {
    if (mode === 'forum') return 'thread';
    if (mode === 'community') return 'community';
    if (mode === 'image') return 'image';
    if (mode === 'bulletin') return 'notice';
    return 'status';
}

function normalizeFormat(value, mode) {
    const format = String(value || '');
    if (!POST_FORMATS.has(format)) return modeDefaultFormat(mode);
    if (mode === 'forum' && !['thread', 'status'].includes(format)) return 'thread';
    if (mode === 'community' && !['community', 'status'].includes(format)) return 'community';
    if (mode === 'image' && !['image', 'status'].includes(format)) return 'image';
    if (mode === 'bulletin' && !['notice', 'announcement'].includes(format)) return 'notice';
    return format;
}

function duplicateKey(value) {
    return String(value || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function backgroundAsPhoneProfile(profile) {
    return {
        id: profile.id,
        actor: clone(profile.actor),
        name: profile.name,
        handle: profile.handle,
        bio: profile.bio,
        picture: '',
        fields: profile.space ? { space: profile.space } : {},
        locks: [],
        through: phone()?.currentStoryAnchor?.(),
        evidence: [],
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
    };
}

function visibleExistingPosts(state) {
    return (Array.isArray(state?.posts) ? state.posts : [])
        .filter(post => phone()?.anchorVisible?.(post?.through) !== false && phone()?.sourceValid?.(post?.evidence) !== false)
        .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
}

function buildPrompt(network, state, background, targetIndex, timePlace) {
    const story = currentStory();
    const scenario = stateApi()?.readChat?.()?.scenario || {};
    const existingProfiles = new Map();
    for (const profile of background) existingProfiles.set(profile.id, profile);
    for (const profile of state.profiles || []) {
        if (!profile?.id || isPlayerProfile(profile)) continue;
        if (!existingProfiles.has(profile.id)) existingProfiles.set(profile.id, {
            id: profile.id,
            name: profile.name,
            handle: profile.handle,
            bio: profile.bio,
            space: profile.fields?.space || profile.fields?.community || profile.fields?.board || '',
        });
    }
    const posts = visibleExistingPosts(state).slice(-MAX_EXISTING_POSTS_IN_PROMPT);
    return `Story: ${story?.title || '(stand-alone chat)'}
Network: ${JSON.stringify({ name: network.name, description: network.description, mode: network.mode, terminology: network.terminology })}
Fictional time/place: ${timePlace || '(not established; do not invent a precise timestamp)'}
Scenario premise hints: ${JSON.stringify({ premise: scenario.premise || '', focus: scenario.focus || '' })}

Persistent/existing public profiles. Reuse exact ids when appropriate:
${JSON.stringify([...existingProfiles.values()].slice(0, MAX_EXISTING_PROFILES_IN_PROMPT).map(profile => ({ id: profile.id, name: profile.name, handle: profile.handle || '', bio: profile.bio || '', space: profile.space || '' })))}

Recent existing public posts. Do not duplicate them:
${JSON.stringify(posts.map(post => ({ id: post.id, author: post.authorActorKey, format: post.format || 'status', title: post.title || '', space: post.space || '', text: post.text || '' })))}

Recent visible Story. Treat this as evidence to reason about what might be public, NOT as permission to reveal every detail:
${JSON.stringify(recentStory(24, targetIndex))}

Create a small believable update to the public world. It is valid to create fewer than the maximums.`;
}

function validateResponse(parsed, network, state, background) {
    const profileRows = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    const postRows = Array.isArray(parsed.posts) ? parsed.posts : [];
    if (profileRows.length > MAX_EXISTING_PROFILES_IN_PROMPT + MAX_NEW_PROFILES) throw new Error('The public-network maintainer returned too many profiles.');
    if (postRows.length > MAX_POSTS) throw new Error('The public-network maintainer returned too many posts.');

    const backgroundById = new Map(background.map(profile => [profile.id, profile]));
    const phoneById = new Map((state.profiles || []).filter(profile => profile?.id).map(profile => [String(profile.id), profile]));
    const profilesByRef = new Map();
    const updatedBackground = [...background];
    let newProfiles = 0;

    for (const row of profileRows) {
        if (!plainObject(row)) continue;
        const ref = cleanText(row.ref, 120);
        if (!ref || profilesByRef.has(ref)) continue;
        const isNew = /^new[1-4]$/.test(ref);
        const existing = backgroundById.get(ref) || phoneById.get(ref);
        if (!isNew && !existing) continue;

        const name = cleanText(row.name || existing?.name, 100);
        if (!name || isPlayerProfile({ name })) continue;
        const handle = cleanText(row.handle || existing?.handle, 80).replace(/^@+/, '');
        const bio = cleanText(row.bio || existing?.bio, 420);
        const space = cleanText(row.space || existing?.space || existing?.fields?.space, 100);

        if (isNew) {
            if (newProfiles >= MAX_NEW_PROFILES) continue;
            const profileId = id('social_profile');
            const profile = normalizeBackgroundProfile({
                id: profileId,
                actor: { kind: 'custom', key: `social-${profileId}` },
                name,
                handle,
                bio,
                space,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            if (!profile) continue;
            updatedBackground.push(profile);
            backgroundById.set(profile.id, profile);
            profilesByRef.set(ref, profile);
            newProfiles++;
        } else if (backgroundById.has(ref)) {
            const original = backgroundById.get(ref);
            const updated = normalizeBackgroundProfile({ ...original, name, handle, bio, space, updatedAt: Date.now() });
            const index = updatedBackground.findIndex(profile => profile.id === ref);
            if (updated && index >= 0) updatedBackground[index] = updated;
            if (updated) backgroundById.set(ref, updated);
            profilesByRef.set(ref, updated || original);
        } else {
            profilesByRef.set(ref, {
                id: ref,
                actor: clone(existing.actor),
                name,
                handle,
                bio,
                space,
                createdAt: existing.createdAt || Date.now(),
                updatedAt: Date.now(),
                existingPhoneProfile: true,
            });
        }
    }

    for (const profile of updatedBackground) {
        if (!profilesByRef.has(profile.id)) profilesByRef.set(profile.id, profile);
    }
    for (const profile of state.profiles || []) {
        if (profile?.id && !isPlayerProfile(profile) && !profilesByRef.has(profile.id)) {
            profilesByRef.set(String(profile.id), {
                id: String(profile.id),
                actor: clone(profile.actor),
                name: profile.name,
                handle: profile.handle,
                bio: profile.bio,
                space: profile.fields?.space || '',
                existingPhoneProfile: true,
            });
        }
    }

    const existingPosts = visibleExistingPosts(state);
    const existingIds = new Set(existingPosts.map(post => String(post.id || '')).filter(Boolean));
    const duplicatePosts = new Set(existingPosts.map(post => duplicateKey(post.text)).filter(Boolean));
    const localPostIds = new Map();
    const posts = [];
    const seenRefs = new Set();

    for (const row of postRows) {
        if (!plainObject(row)) continue;
        const ref = cleanText(row.ref, 20);
        if (!/^p[1-6]$/.test(ref) || seenRefs.has(ref)) continue;
        const authorRef = cleanText(row.authorRef, 120);
        const author = profilesByRef.get(authorRef);
        if (!author || isPlayerProfile(author)) continue;
        const text = String(row.text || '').trim().slice(0, 4000);
        if (!text || duplicatePosts.has(duplicateKey(text))) continue;
        const postId = id('phone_post');
        const rawReply = cleanText(row.replyTo, 160);
        let replyTo = '';
        if (rawReply) {
            if (existingIds.has(rawReply)) replyTo = rawReply;
            else if (localPostIds.has(rawReply)) replyTo = localPostIds.get(rawReply);
            else continue;
        }
        const format = normalizeFormat(row.format, network.mode);
        const post = {
            id: postId,
            authorActorKey: phone()?.actorKey?.(author.actor) || '',
            format,
            title: cleanText(row.title, 180),
            space: cleanText(row.space || author.space, 100),
            replyTo,
            text,
            media: null,
            metrics: {},
            through: phone()?.currentStoryAnchor?.(),
            evidence: [],
            storyTime: '',
            createdAt: Date.now() + posts.length,
        };
        if (!post.authorActorKey) continue;
        duplicatePosts.add(duplicateKey(text));
        seenRefs.add(ref);
        localPostIds.set(ref, postId);
        posts.push(post);
    }

    return {
        background: updatedBackground.slice(-MAX_STORY_PROFILES),
        profilesByRef,
        posts,
        newProfiles,
    };
}

async function generateBatch({ targetIndex = null, force = false } = {}) {
    const api = context();
    const store = phone();
    if (!store || typeof api?.generateRaw !== 'function') return { profilesAdded: 0, postsAdded: 0, skipped: 'no-model' };
    const state = await store.read({ fresh: true });
    if (state.settings?.enabled !== true) return { profilesAdded: 0, postsAdded: 0, skipped: 'disabled' };
    if (!force && visibleExistingPosts(state).length) return { profilesAdded: 0, postsAdded: 0, skipped: 'already-populated' };

    const network = await social()?.ensure?.();
    if (!network) return { profilesAdded: 0, postsAdded: 0, skipped: 'no-network' };
    const ownerBefore = ownerKey();
    const background = savedBackgroundProfiles();
    const timePlace = await currentTimePlace();
    const raw = await api.generateRaw({
        prompt: buildPrompt(network, state, background, targetIndex, timePlace),
        systemPrompt: publicSystemPrompt(network),
        responseLength: Math.max(1200, Math.min(6000, Number(state.settings?.upkeep?.replyLimit) || 3000)),
        trimNames: false,
    });
    if (ownerBefore !== ownerKey()) throw new Error('The open Story changed while its public network was updating.');

    const parsed = parseJson(raw);
    const validated = validateResponse(parsed, network, state, background);
    if (ownerBefore !== ownerKey()) throw new Error('The open Story changed while its public network was being validated.');

    const backgroundSaved = saveBackgroundProfiles(validated.background);
    const backgroundById = new Map(backgroundSaved.map(profile => [profile.id, profile]));
    let postsAdded = 0;
    await store.mutate(draft => {
        const profileIndex = new Map((draft.profiles || []).map((profile, index) => [String(profile.id), index]));
        for (const profile of backgroundSaved) {
            const phoneProfile = backgroundAsPhoneProfile(profile);
            const index = profileIndex.get(profile.id);
            if (index === undefined) {
                profileIndex.set(profile.id, draft.profiles.length);
                draft.profiles.push(phoneProfile);
            } else {
                draft.profiles[index] = { ...draft.profiles[index], ...phoneProfile, createdAt: draft.profiles[index].createdAt || phoneProfile.createdAt };
            }
        }
        for (const [ref, profile] of validated.profilesByRef) {
            if (backgroundById.has(profile.id) || !profile.existingPhoneProfile) continue;
            const index = profileIndex.get(profile.id);
            if (index === undefined) continue;
            draft.profiles[index] = {
                ...draft.profiles[index],
                name: profile.name,
                handle: profile.handle,
                bio: profile.bio,
                fields: { ...(draft.profiles[index].fields || {}), ...(profile.space ? { space: profile.space } : {}) },
                updatedAt: Date.now(),
            };
            void ref;
        }
        const existingIds = new Set((draft.posts || []).map(post => String(post.id || '')));
        for (const post of validated.posts) {
            if (existingIds.has(post.id)) continue;
            draft.posts.push({ ...post, storyTime: timePlace });
            existingIds.add(post.id);
            postsAdded++;
        }
        draft.activity ||= [];
        draft.activity.push({
            kind: 'social-world-update',
            network: network.name,
            mode: network.mode,
            profilesAdded: validated.newProfiles,
            postsAdded,
            through: store.currentStoryAnchor?.(),
            storyTime: timePlace,
            createdAt: Date.now(),
        });
        draft.activity = draft.activity.slice(-200);
    });

    document.dispatchEvent(new CustomEvent('snowbunny:phone-social-world-updated', {
        detail: { network: network.name, mode: network.mode, profilesAdded: validated.newProfiles, postsAdded },
    }));
    return { profilesAdded: validated.newProfiles, postsAdded };
}

async function run(options = {}) {
    if (inFlight) return inFlight;
    inFlight = generateBatch(options).finally(() => { inFlight = null; });
    return inFlight;
}

async function ensure(options = {}) {
    return run({ ...options, force: false });
}

async function refresh(options = {}) {
    return run({ ...options, force: true });
}

function reset() {
    inFlight = null;
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, reset);
    }
}

export function initPhoneSocialWorld() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneSocialWorld: {
            ensure,
            refresh,
            readProfiles: () => clone(savedBackgroundProfiles()),
            isBusy: () => Boolean(inFlight),
        },
    };
}