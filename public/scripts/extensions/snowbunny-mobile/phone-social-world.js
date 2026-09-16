const MAX_NEW_PROFILES = 4;
const MAX_POSTS = 6;
const MAX_STORY_PROFILES = 80;
const MAX_EXISTING_PROFILES_IN_PROMPT = 48;
const MAX_EXISTING_POSTS_IN_PROMPT = 24;
const MAX_ACTOR_CANDIDATES = 80;
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

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function plainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
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

function identityFor(message) {
    return globalThis.SnowBunny?.identity?.current?.(message) || message?.extra?.snowbunny || {};
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

function actorKey(actor) {
    return phone()?.actorKey?.(actor) || '';
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
    const clean = profiles.map(normalizeBackgroundProfile).filter(Boolean).slice(-MAX_STORY_PROFILES);
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
        .map((message, index) => ({ message, index }))
        .filter(({ message }) => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(4, limit))
        .map(({ message, index }) => {
            const identity = identityFor(message);
            return {
                index,
                messageId: String(identity.id || ''),
                revision: Number(identity.revision) || 0,
                source: String(identity.source || ''),
                speaker: message.name || (message.is_user ? api?.name1 : api?.name2) || (message.is_user ? 'User' : 'Assistant'),
                role: message.is_user ? 'user' : 'assistant',
                text: cleanChoiceMarkup(message.mes),
            };
        })
        .filter(row => row.messageId && row.text);
}

function evidenceFromRows(rows, refs) {
    const rowById = new Map(rows.map(row => [row.messageId, row]));
    const evidence = [];
    const seen = new Set();
    for (const ref of safeArray(refs).map(String)) {
        const row = rowById.get(ref);
        if (!row || seen.has(ref)) continue;
        seen.add(ref);
        evidence.push({
            messageId: row.messageId,
            revision: row.revision,
            source: row.source,
            quote: row.text.slice(0, 320),
        });
    }
    return evidence;
}

function storyRowsStillValid(rows) {
    const evidence = rows.map(row => ({
        messageId: row.messageId,
        revision: row.revision,
        source: row.source,
        quote: '',
    }));
    return phone()?.sourceValid?.(evidence) !== false;
}

async function loreSummary() {
    const store = lorebooks();
    if (!store?.effectiveIds || !store?.load) return [];
    const ids = store.effectiveIds().slice(0, 8);
    const books = await Promise.all(ids.map(bookId => store.load(bookId)));
    const rows = [];
    for (const book of books) {
        if (!book) continue;
        for (const entry of safeArray(book.entries).filter(item => item.enabled !== false).slice(0, 18)) {
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
        return String((await trackers()?.current?.())?.timePlace || '').trim();
    } catch (_) {
        return '';
    }
}

function playerNames() {
    const api = context();
    return [api?.name1, api?.chatMetadata?.persona]
        .map(value => cleanText(value, 100).toLocaleLowerCase())
        .filter(Boolean);
}

function isPlayerProfile(profile) {
    const names = new Set(playerNames());
    const name = cleanText(profile?.name, 100).toLocaleLowerCase();
    return Boolean(name && names.has(name));
}

function directCharacterCandidates() {
    const api = context();
    const rows = [];
    for (const character of api?.characters || []) {
        const name = String(character?.data?.name ?? character?.name ?? '').trim();
        const avatar = String(character?.avatar || '').trim();
        if (!name || !avatar || isPlayerProfile({ name })) continue;
        const snow = character?.data?.extensions?.snowbunny || {};
        const actor = {
            kind: 'character',
            entityId: String(snow.entityId || ''),
            avatar,
            lorebookId: '',
            entryId: '',
            key: '',
        };
        rows.push({
            actorKey: actorKey(actor) || String(snow.entityId || `character:${avatar}`),
            actor,
            name,
            aliases: Array.isArray(snow.card?.aliases) ? snow.card.aliases.map(String) : [],
            source: 'Character library',
        });
    }
    return rows;
}

async function codexCandidates() {
    const store = lorebooks();
    if (!store) return [];
    const rows = [];
    for (const bookId of store.effectiveIds?.() || []) {
        const book = await store.load?.(bookId);
        if (!book) continue;
        for (const entry of safeArray(book.entries)) {
            if (entry.enabled === false || String(entry.type || '').toLocaleLowerCase() !== 'character') continue;
            const linked = entry.link?.kind === 'character' && entry.link.avatar;
            const actor = linked ? {
                kind: 'character',
                entityId: String(entry.link.entityId || ''),
                avatar: String(entry.link.avatar || ''),
                lorebookId: '',
                entryId: '',
                key: '',
            } : {
                kind: 'codex-character',
                entityId: String(entry.link?.entityId || ''),
                avatar: '',
                lorebookId: String(book.id),
                entryId: String(entry.id),
                key: '',
            };
            const name = String(entry.name || '').trim();
            if (!name || isPlayerProfile({ name })) continue;
            rows.push({
                actorKey: actorKey(actor) || `codex:${book.id}:${entry.id}`,
                actor,
                name,
                aliases: Array.isArray(entry.aliases) ? entry.aliases.map(String) : [],
                source: `Codex: ${book.name}`,
            });
        }
    }
    return rows;
}

function candidateRank(candidate, storyText) {
    const names = [candidate.name, ...safeArray(candidate.aliases)]
        .map(value => String(value || '').trim().toLocaleLowerCase())
        .filter(Boolean);
    let score = 0;
    for (const name of names) if (storyText.includes(name)) score += Math.max(1, name.length);
    return score;
}

async function publicActorCandidates(storyRows) {
    const all = [...directCharacterCandidates(), ...await codexCandidates()];
    const unique = new Map();
    for (const candidate of all) {
        if (!candidate.actorKey || !candidate.name) continue;
        if (!unique.has(candidate.actorKey) || candidate.source.startsWith('Codex')) unique.set(candidate.actorKey, candidate);
    }
    const storyText = storyRows.map(row => row.text).join('\n').toLocaleLowerCase();
    return [...unique.values()]
        .map(candidate => ({ ...candidate, rank: candidateRank(candidate, storyText) }))
        .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name))
        .slice(0, MAX_ACTOR_CANDIDATES)
        .map(({ rank: _rank, ...candidate }) => candidate);
}

function publicSystemPrompt(network) {
    const mode = String(network?.mode || 'hybrid');
    return `Maintain a fictional PUBLIC social/communication world for one Story. You are creating background public activity, not writing the next Story scene.

The network identity and interaction grammar are already fixed. Respect them exactly. Current mode: ${mode}. Network name: ${network?.name || 'Social'}.

Knowledge boundary is strict. Public accounts may use only information that a plausible public participant could know. Never expose private Pocket Phone messages, hidden thoughts, private conversations, secret plans, off-screen omniscient facts, confidential lore, or facts that the recent Story shows only to the player/narrator. Lore/Codex material is writer context for understanding the world; its presence does not make every detail public knowledge. If you are unsure whether a detail is public, do not post it.

Background accounts are persistent fictional identities. Existing profile ids and their identity fields are canonical and immutable for this update. Reuse supplied profile ids for those same accounts. Do not rename, replace, or silently rewrite an existing account. A supplied known actorKey may be used for a NEW public profile when that Character/Codex person plausibly has an account. This links the public profile to the same fictional actor; it does not make them a private contact. Create at most ${MAX_NEW_PROFILES} new profiles. Do not create or impersonate the player's Persona.

Generate at most ${MAX_POSTS} new public items. Do not repeat or lightly paraphrase existing posts. Replies must point to an existing post id or to an earlier new post ref from this same response. Do not claim a photo/file/voice asset exists and never invent an asset filename, path or URL; media fulfillment is separate.

For every post that directly uses an event or fact from Recent visible Story, sourceRefs MUST contain the exact supplied messageId values supporting it. For ordinary ambient public chatter that does not depend on a recent Story event, sourceRefs should be []. Never invent source ids.

Mode grammar:
- microblog: short status posts and reply chains; titles/spaces usually blank.
- forum: thread posts need concise titles and boards/spaces; replies use replyTo.
- community: posts should usually identify a group/community space and can have replies.
- image: use image-oriented captions/discussion, but do not invent delivered image paths. format may be image even when only a caption is available.
- bulletin: notices/announcements need concise titles and sections/spaces.
- hybrid: mix formats only when natural for this fictional network.

Allowed formats: status, thread, community, image, notice, announcement.

Return JSON only:
{"profiles":[{"ref":"existing profile id OR new1/new2/new3/new4","actorKey":"optional exact known actorKey for a NEW linked profile","name":"new-profile display name","handle":"...","bio":"...","space":"optional home group/board"}],"posts":[{"ref":"p1","authorRef":"profile ref","format":"allowed format","title":"optional","space":"optional board/community/section","replyTo":"optional existing post id or earlier p-ref","sourceRefs":["exact recent messageId"],"text":"public content"}]}

For an existing profile, ref must be its exact supplied id and its identity fields are ignored in favor of the saved canonical profile. For a new profile, ref must be new1, new2, new3, or new4. Post refs must be p1 through p6 and unique.`;
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

function visibleEvent(value) {
    return phone()?.anchorVisible?.(value?.through) !== false && phone()?.sourceValid?.(value?.evidence) !== false;
}

function visibleExistingPosts(state) {
    return safeArray(state?.posts)
        .filter(visibleEvent)
        .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
}

function sameAnchor(left, right) {
    return String(left?.messageId || '') === String(right?.messageId || '')
        && (Number(left?.revision) || 0) === (Number(right?.revision) || 0)
        && String(left?.source || '') === String(right?.source || '');
}

function attemptedAtCurrentAnchor(state) {
    const current = phone()?.currentStoryAnchor?.() || {};
    return [...safeArray(state?.activity)].reverse().some(item => item?.kind === 'social-world-update'
        && visibleEvent(item)
        && sameAnchor(item.through, current));
}

async function buildPrompt(network, state, background, actorCandidates, storyRows, timePlace) {
    const story = currentStory();
    const scenario = stateApi()?.readChat?.()?.scenario || {};
    const existingProfiles = new Map();
    for (const profile of background) existingProfiles.set(profile.id, profile);
    for (const profile of safeArray(state.profiles)) {
        if (!profile?.id || isPlayerProfile(profile)) continue;
        if (!existingProfiles.has(profile.id)) existingProfiles.set(profile.id, {
            id: profile.id,
            actor: profile.actor,
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
Scenario/premise hints: ${JSON.stringify({ premise: scenario.premise || '', focus: scenario.focus || '', writerKnowledge: scenario.writerKnowledge || '' })}

Lore/Codex overview for WORLD CONSISTENCY only. Do not treat private/secret details here as public knowledge:
${JSON.stringify(await loreSummary())}

Known Character/Codex actors that may receive a linked public profile if plausible. actorKey must be copied exactly:
${JSON.stringify(actorCandidates.map(candidate => ({ actorKey: candidate.actorKey, name: candidate.name, aliases: candidate.aliases, source: candidate.source })))}

Persistent/existing public profiles. Their identities are canonical. Reuse exact ids and do not rewrite them:
${JSON.stringify([...existingProfiles.values()].slice(0, MAX_EXISTING_PROFILES_IN_PROMPT).map(profile => ({ id: profile.id, actorKey: actorKey(profile.actor), name: profile.name, handle: profile.handle || '', bio: profile.bio || '', space: profile.space || '' })))}

Recent existing public posts. Do not duplicate them:
${JSON.stringify(posts.map(post => ({ id: post.id, author: post.authorActorKey, format: post.format || 'status', title: post.title || '', space: post.space || '', text: post.text || '' })))}

Recent visible Story. Treat it as evidence to reason about what might be public, NOT as permission to reveal every detail:
${JSON.stringify(storyRows.map(row => ({ messageId: row.messageId, speaker: row.speaker, role: row.role, text: row.text })))}

Create a small believable update to the broader public world. The current venue or plot point should not dominate the network. Ordinary setting-native activity is welcome. It is valid to create fewer than the maximums, including zero posts.`;
}

function canonicalPhoneProfile(profile) {
    return {
        id: String(profile.id),
        actor: clone(profile.actor),
        name: String(profile.name || ''),
        handle: String(profile.handle || ''),
        bio: String(profile.bio || ''),
        space: String(profile.fields?.space || profile.fields?.community || profile.fields?.board || ''),
        createdAt: Number(profile.createdAt) || Date.now(),
        updatedAt: Number(profile.updatedAt) || Number(profile.createdAt) || Date.now(),
        existingPhoneProfile: true,
    };
}

function validateResponse(parsed, network, state, background, actorCandidates, storyRows) {
    const profileRows = safeArray(parsed.profiles);
    const postRows = safeArray(parsed.posts);
    if (profileRows.length > MAX_EXISTING_PROFILES_IN_PROMPT + MAX_NEW_PROFILES) throw new Error('The public-network maintainer returned too many profiles.');
    if (postRows.length > MAX_POSTS) throw new Error('The public-network maintainer returned too many posts.');

    const backgroundById = new Map(background.map(profile => [profile.id, profile]));
    const phoneById = new Map(safeArray(state.profiles).filter(profile => profile?.id).map(profile => [String(profile.id), profile]));
    const candidateByKey = new Map(actorCandidates.map(candidate => [candidate.actorKey, candidate]));
    const existingByActor = new Map();
    for (const profile of background) {
        const key = actorKey(profile.actor);
        if (key) existingByActor.set(key, profile);
    }
    for (const profile of safeArray(state.profiles)) {
        const key = actorKey(profile.actor);
        if (key && !existingByActor.has(key)) existingByActor.set(key, canonicalPhoneProfile(profile));
    }

    const profilesByRef = new Map();
    const updatedBackground = [...background];
    let newProfiles = 0;

    for (const row of profileRows) {
        if (!plainObject(row)) continue;
        const ref = cleanText(row.ref, 120);
        if (!ref || profilesByRef.has(ref)) continue;
        const isNew = /^new[1-4]$/.test(ref);

        if (!isNew) {
            const savedBackground = backgroundById.get(ref);
            const savedPhone = phoneById.get(ref);
            if (savedBackground) profilesByRef.set(ref, savedBackground);
            else if (savedPhone && !isPlayerProfile(savedPhone)) profilesByRef.set(ref, canonicalPhoneProfile(savedPhone));
            continue;
        }

        if (newProfiles >= MAX_NEW_PROFILES) continue;
        const requestedActorKey = cleanText(row.actorKey, 240);
        const candidate = requestedActorKey ? candidateByKey.get(requestedActorKey) : null;
        if (requestedActorKey && !candidate) continue;
        if (candidate && existingByActor.has(candidate.actorKey)) {
            profilesByRef.set(ref, existingByActor.get(candidate.actorKey));
            continue;
        }

        const name = cleanText(candidate?.name || row.name, 100);
        if (!name || isPlayerProfile({ name })) continue;
        const profileId = id('social_profile');
        const actor = candidate?.actor || { kind: 'custom', key: `social-${profileId}` };
        const profile = normalizeBackgroundProfile({
            id: profileId,
            actor,
            name,
            handle: cleanText(row.handle, 80).replace(/^@+/, ''),
            bio: cleanText(row.bio, 420),
            space: cleanText(row.space, 100),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        if (!profile) continue;
        updatedBackground.push(profile);
        backgroundById.set(profile.id, profile);
        const key = actorKey(profile.actor);
        if (key) existingByActor.set(key, profile);
        profilesByRef.set(ref, profile);
        newProfiles++;
    }

    for (const profile of updatedBackground) if (!profilesByRef.has(profile.id)) profilesByRef.set(profile.id, profile);
    for (const profile of safeArray(state.profiles)) {
        if (profile?.id && !isPlayerProfile(profile) && !profilesByRef.has(String(profile.id))) {
            profilesByRef.set(String(profile.id), canonicalPhoneProfile(profile));
        }
    }

    const storyRowById = new Map(storyRows.map(row => [row.messageId, row]));
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

        const rawSourceRefs = [...new Set(safeArray(row.sourceRefs).map(value => cleanText(value, 160)).filter(Boolean))];
        if (rawSourceRefs.some(sourceRef => !storyRowById.has(sourceRef))) continue;
        const evidence = evidenceFromRows(storyRows, rawSourceRefs);

        const rawReply = cleanText(row.replyTo, 160);
        let replyTo = '';
        if (rawReply) {
            if (existingIds.has(rawReply)) replyTo = rawReply;
            else if (localPostIds.has(rawReply)) replyTo = localPostIds.get(rawReply);
            else continue;
        }

        const postId = id('phone_post');
        const post = {
            id: postId,
            authorActorKey: actorKey(author.actor),
            format: normalizeFormat(row.format, network.mode),
            title: cleanText(row.title, 180),
            space: cleanText(row.space || author.space, 100),
            replyTo,
            text,
            media: null,
            metrics: {},
            through: phone()?.currentStoryAnchor?.(),
            evidence,
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
    if (!force && (visibleExistingPosts(state).length || attemptedAtCurrentAnchor(state))) {
        return { profilesAdded: 0, postsAdded: 0, skipped: 'already-populated-or-attempted' };
    }

    const network = await social()?.ensure?.();
    if (!network) return { profilesAdded: 0, postsAdded: 0, skipped: 'no-network' };
    const ownerBefore = ownerKey();
    const storyRows = recentStory(24, targetIndex);
    const actorCandidates = await publicActorCandidates(storyRows);
    const background = savedBackgroundProfiles();
    const timePlace = await currentTimePlace();
    const raw = await api.generateRaw({
        prompt: await buildPrompt(network, state, background, actorCandidates, storyRows, timePlace),
        systemPrompt: publicSystemPrompt(network),
        responseLength: Math.max(1200, Math.min(6000, Number(state.settings?.upkeep?.replyLimit) || 3000)),
        trimNames: false,
    });
    if (ownerBefore !== ownerKey()) throw new Error('The open Story changed while its public network was updating.');
    if (!storyRowsStillValid(storyRows)) throw new Error('Story evidence changed while the public network was updating. Existing Phone state was kept.');

    const parsed = parseJson(raw);
    const validated = validateResponse(parsed, network, state, background, actorCandidates, storyRows);
    if (ownerBefore !== ownerKey()) throw new Error('The open Story changed while its public network was being validated.');
    if (!storyRowsStillValid(storyRows)) throw new Error('Story evidence changed while the public network was being validated. Existing Phone state was kept.');

    const backgroundSaved = saveBackgroundProfiles(validated.background);
    let postsAdded = 0;
    await store.mutate(draft => {
        const profileIndex = new Map(safeArray(draft.profiles).map((profile, index) => [String(profile.id), index]));
        for (const profile of backgroundSaved) {
            const phoneProfile = backgroundAsPhoneProfile(profile);
            const index = profileIndex.get(profile.id);
            if (index === undefined) {
                profileIndex.set(profile.id, draft.profiles.length);
                draft.profiles.push(phoneProfile);
            } else {
                const existing = draft.profiles[index];
                draft.profiles[index] = {
                    ...existing,
                    actor: clone(profile.actor),
                    name: profile.name,
                    handle: profile.handle,
                    bio: profile.bio,
                    fields: { ...(existing.fields || {}), ...(profile.space ? { space: profile.space } : {}) },
                    createdAt: existing.createdAt || phoneProfile.createdAt,
                    updatedAt: profile.updatedAt,
                };
            }
        }

        const existingIds = new Set(safeArray(draft.posts).map(post => String(post.id || '')));
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
            evidence: [],
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
