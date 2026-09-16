let initialized = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function social() {
    return globalThis.SnowBunny?.phoneSocial ?? null;
}

function trackers() {
    return globalThis.SnowBunny?.trackers ?? null;
}

function id(prefix) {
    const value = context()?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${String(value).replaceAll('-', '')}`;
}

function clean(value, limit) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, limit);
}

function playerActor() {
    return { kind: 'custom', entityId: '', avatar: '', lorebookId: '', entryId: '', key: 'player-public' };
}

function playerActorKey() {
    return phone()?.actorKey?.(playerActor()) || 'custom:player-public';
}

function ownProfileFromState(state) {
    const key = playerActorKey();
    return (state?.profiles || []).find(profile => profile.id === 'you' || phone()?.actorKey?.(profile.actor) === key) || null;
}

function defaultHandle() {
    const api = context();
    const base = String(api?.name1 || 'you').toLocaleLowerCase().normalize('NFKD')
        .replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
    return base || 'you';
}

function ensureOwnProfileInDraft(draft) {
    const existing = ownProfileFromState(draft);
    if (existing) return existing;
    const api = context();
    const profile = {
        id: 'you',
        actor: playerActor(),
        name: clean(api?.name1 || 'You', 100),
        handle: defaultHandle(),
        bio: '',
        picture: '',
        fields: { owner: 'player' },
        locks: [],
        through: { messageId: '', revision: 0, source: '' },
        evidence: [],
        order: (draft.profiles || []).length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    draft.profiles ||= [];
    draft.profiles.push(profile);
    return profile;
}

async function storyTime() {
    try {
        return String((await trackers()?.current?.())?.timePlace || '').trim();
    } catch (_) {
        return '';
    }
}

function defaultFormat(mode, replying) {
    if (replying) return 'status';
    if (mode === 'forum') return 'thread';
    if (mode === 'community') return 'community';
    if (mode === 'image') return 'image';
    if (mode === 'bulletin') return 'notice';
    return 'status';
}

function visiblePost(post) {
    return phone()?.anchorVisible?.(post?.through) !== false && phone()?.sourceValid?.(post?.evidence) !== false;
}

function validateDraft(input, network, parent) {
    const text = String(input?.text || '').trim().slice(0, 6000);
    if (!text && !input?.media) throw new Error('A public post needs text or delivered media.');
    const replying = Boolean(parent);
    const format = defaultFormat(network?.mode || 'hybrid', replying);
    const title = clean(input?.title, 180);
    const space = clean(input?.space, 100);
    if (!replying && network?.mode === 'forum' && !title) throw new Error('This forum needs a thread title.');
    if (!replying && network?.mode === 'bulletin' && !title) throw new Error('This notice needs a title.');
    return { text, format, title, space };
}

async function ensureOwnProfile() {
    const store = phone();
    if (!store?.mutate) throw new Error('Pocket Phone is unavailable.');
    return (await store.mutate(draft => structuredClone(ensureOwnProfileInDraft(draft)))).result;
}

async function publish(input = {}) {
    const store = phone();
    if (!store?.mutate) throw new Error('Pocket Phone is unavailable.');
    const network = social()?.read?.() || { name: 'Social', mode: 'hybrid' };
    const timePlace = await storyTime();
    const anchor = store.currentStoryAnchor?.() || { messageId: '', revision: 0, source: '' };
    return (await store.mutate(draft => {
        const replyTo = clean(input.replyTo, 160);
        const parent = replyTo
            ? (draft.posts || []).find(post => post.id === replyTo && visiblePost(post)) || null
            : null;
        if (replyTo && !parent) throw new Error('That public item is no longer available on this Story branch.');
        const profile = ensureOwnProfileInDraft(draft);
        const values = validateDraft(input, network, parent);
        const post = {
            id: id('phone_post'),
            authorActorKey: store.actorKey?.(profile.actor) || playerActorKey(),
            format: values.format,
            title: values.title,
            space: values.space || String(parent?.space || ''),
            replyTo: parent?.id || '',
            text: values.text,
            media: input.media || null,
            metrics: {},
            through: anchor,
            evidence: [],
            storyTime: timePlace,
            createdAt: Date.now(),
        };
        draft.posts ||= [];
        draft.posts.push(post);
        draft.actions ||= [];
        draft.actions.push({
            id: id('phone_action'),
            kind: parent ? 'public-reply' : 'public-post',
            text: parent
                ? `Replied publicly on ${network.name || 'the Story network'}: ${values.text}`
                : `Published publicly on ${network.name || 'the Story network'}: ${values.text}`,
            audience: 'public',
            through: anchor,
            evidence: [],
            storyTime: timePlace,
            createdAt: Date.now(),
        });
        return structuredClone(post);
    })).result;
}

export function initPhoneSocialActions() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneSocialActions: {
            publish,
            ensureOwnProfile,
            ownProfile: state => structuredClone(ownProfileFromState(state)),
            playerActorKey,
        },
    };
}
