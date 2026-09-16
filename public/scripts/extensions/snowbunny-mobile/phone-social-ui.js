const WORKSPACE_ID = 'snowbunny-phone-workspace';
const STYLE_ID = 'snowbunny-phone-social-ui-style';
const POST_FORMATS = new Set(['status', 'thread', 'community', 'image', 'notice', 'announcement']);

let initialized = false;
let observer = null;
let queued = false;
let ensureBusy = false;
let renderBusy = false;

function social() {
    return globalThis.SnowBunny?.phoneSocial ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function phoneUi() {
    return globalThis.SnowBunny?.phoneUi ?? null;
}

function el(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function icon(name) {
    const node = el('i', `fa-solid ${name}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${WORKSPACE_ID} .sb-phone-social-identity {
    display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: 10px; align-items: center;
    margin-bottom: 12px; padding: 11px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 7%, var(--SmartThemeBlurTintColor));
  }
  #${WORKSPACE_ID} .sb-phone-social-identity-icon {
    width: 46px; height: 46px; display: grid; place-items: center; border-radius: 15px;
    background: color-mix(in srgb, currentColor 8%, transparent); font-size: 1.12rem;
  }
  #${WORKSPACE_ID} .sb-phone-social-identity strong,
  #${WORKSPACE_ID} .sb-phone-social-identity small { display: block; }
  #${WORKSPACE_ID} .sb-phone-social-identity small { margin-top: 3px; font-size: .68rem; line-height: 1.4; opacity: .58; }
  #${WORKSPACE_ID} .sb-phone-social-section { margin: 12px 0 16px; }
  #${WORKSPACE_ID} .sb-phone-social-section-title {
    margin: 0 3px 7px; font-size: .69rem; font-weight: 800; opacity: .58; letter-spacing: .02em;
  }
  #${WORKSPACE_ID} .sb-phone-social-card {
    margin-bottom: 9px; padding: 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 53%, transparent);
  }
  #${WORKSPACE_ID} .sb-phone-social-author { display: flex; gap: 7px; align-items: baseline; min-width: 0; margin-bottom: 7px; }
  #${WORKSPACE_ID} .sb-phone-social-author strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .8rem; }
  #${WORKSPACE_ID} .sb-phone-social-author small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .63rem; opacity: .5; }
  #${WORKSPACE_ID} .sb-phone-social-title { margin: 0 0 6px; font-size: .9rem; line-height: 1.28; }
  #${WORKSPACE_ID} .sb-phone-social-text { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .79rem; line-height: 1.45; }
  #${WORKSPACE_ID} .sb-phone-social-meta { margin-top: 8px; font-size: .62rem; line-height: 1.35; opacity: .5; }
  #${WORKSPACE_ID} .sb-phone-social-space {
    display: inline-block; margin-bottom: 7px; padding: 3px 7px; border-radius: 999px;
    background: color-mix(in srgb, currentColor 8%, transparent); font-size: .61rem; font-weight: 760; opacity: .72;
  }
  #${WORKSPACE_ID} .sb-phone-social-replies { display: grid; gap: 6px; margin-top: 9px; padding-left: 10px; border-left: 2px solid color-mix(in srgb, currentColor 12%, transparent); }
  #${WORKSPACE_ID} .sb-phone-social-reply { padding: 7px 8px; border-radius: 12px; background: color-mix(in srgb, currentColor 4%, transparent); }
  #${WORKSPACE_ID} .sb-phone-social-reply strong { display: block; margin-bottom: 3px; font-size: .65rem; }
  #${WORKSPACE_ID} .sb-phone-social-reply p { margin: 0; white-space: pre-wrap; font-size: .72rem; line-height: 1.38; }
  #${WORKSPACE_ID} .sb-phone-social-image-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  #${WORKSPACE_ID} .sb-phone-social-image-card { overflow: hidden; padding: 0; }
  #${WORKSPACE_ID} .sb-phone-social-image-frame {
    width: 100%; aspect-ratio: 1 / 1; display: grid; place-items: center; overflow: hidden;
    background: color-mix(in srgb, currentColor 7%, transparent); font-size: 1.45rem;
  }
  #${WORKSPACE_ID} .sb-phone-social-image-frame img { width: 100%; height: 100%; display: block; object-fit: cover; }
  #${WORKSPACE_ID} .sb-phone-social-image-copy { padding: 9px 10px 10px; }
  #${WORKSPACE_ID} .sb-phone-social-image-copy .sb-phone-social-author { margin-bottom: 5px; }
  #${WORKSPACE_ID} .sb-phone-social-image-copy .sb-phone-social-text { font-size: .72rem; }
  #${WORKSPACE_ID} .sb-phone-social-notice { border-radius: 12px 18px 18px 12px; border-left-width: 4px; }
  #${WORKSPACE_ID} .sb-phone-social-forum-thread { border-radius: 15px; }
  #${WORKSPACE_ID} .sb-phone-social-community-card { border-radius: 20px; }
}
`;
    document.head.append(style);
}

function replaceText(root, from, to) {
    if (!root || !from || from === to) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const rows = [];
    while (walker.nextNode()) rows.push(walker.currentNode);
    for (const node of rows) {
        if (node.nodeValue?.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to);
    }
}

function socialButton(root) {
    return [...root.querySelectorAll('.sb-phone-app')].find(button => {
        const text = button.querySelector('strong')?.textContent?.trim() || '';
        return button.dataset.snowbunnySocial === '1' || text === 'Nightowl' || text === 'Social';
    }) || null;
}

function terms(network) {
    const source = network?.terminology && typeof network.terminology === 'object' ? network.terminology : {};
    return {
        home: String(source.home || 'Feed'),
        post: String(source.post || 'Post'),
        reply: String(source.reply || 'Reply'),
        profile: String(source.profile || 'Profile'),
        community: String(source.community || 'Community'),
    };
}

function applyNetwork(root) {
    if (!root) return;
    const network = social()?.read?.();
    if (!network) return;
    root.dataset.socialMode = network.mode || 'hybrid';
    root.dataset.socialNetwork = network.name || 'Social';

    replaceText(root, 'Nightowl', network.name || 'Social');

    const button = socialButton(root);
    if (button) {
        button.dataset.snowbunnySocial = '1';
        const label = button.querySelector('strong');
        if (label) label.textContent = network.name || 'Social';
        const oldIcon = button.querySelector('i');
        if (oldIcon) oldIcon.className = `fa-solid ${social()?.iconClass?.(network.iconId) || 'fa-globe'}`;
        button.title = network.description || `${network.name || 'Social'} public network`;
        button.setAttribute('aria-label', `Open ${network.name || 'Social'}`);
    }

    const heading = root.querySelector('.sb-phone-head h2');
    if (heading?.textContent?.trim() === 'Social') heading.textContent = network.name || 'Social';
}

function eventVisible(value) {
    const store = phone();
    return store?.anchorVisible?.(value?.through) !== false && store?.sourceValid?.(value?.evidence) !== false;
}

function isSocialSurface(root, network) {
    const heading = root?.querySelector('.sb-phone-head h2')?.textContent?.trim() || '';
    return Boolean(heading && heading === (network?.name || 'Social') && !root.querySelector('.sb-phone-app-grid'));
}

function profileMap(state) {
    const visible = (state?.profiles || []).filter(eventVisible);
    return new Map(visible.map(profile => [phone()?.actorKey?.(profile.actor) || profile.id, profile]));
}

function profileFor(post, profiles) {
    return profiles.get(post.authorActorKey) || null;
}

function authorName(post, profiles) {
    return profileFor(post, profiles)?.name || post.authorActorKey || 'Public user';
}

function authorNode(post, profiles, { showHandle = true } = {}) {
    const profile = profileFor(post, profiles);
    const row = el('div', 'sb-phone-social-author');
    row.append(el('strong', '', profile?.name || post.authorActorKey || 'Public user'));
    if (showHandle && profile?.handle) row.append(el('small', '', `@${profile.handle}`));
    return row;
}

function cleanTitle(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 140);
}

function derivedTitle(post, network) {
    const explicit = cleanTitle(post?.title);
    if (explicit) return explicit;
    const text = String(post?.text || '').trim().replace(/\s+/g, ' ');
    if (!text) return terms(network).post;
    const sentence = text.split(/(?<=[.!?])\s+/)[0] || text;
    return sentence.length > 92 ? `${sentence.slice(0, 89).trimEnd()}…` : sentence;
}

function spaceName(post, profile, network) {
    const fields = profile?.fields && typeof profile.fields === 'object' ? profile.fields : {};
    return cleanTitle(post?.space || fields.space || fields.community || fields.board || terms(network).community || 'General');
}

function metricText(post, replyCount = null) {
    const metrics = post?.metrics && typeof post.metrics === 'object' ? post.metrics : {};
    const rows = [];
    const replies = replyCount ?? Number(metrics.replies || 0);
    if (replies > 0) rows.push(`${replies} ${replies === 1 ? 'reply' : 'replies'}`);
    const likes = Number(metrics.likes || metrics.reactions || 0);
    if (likes > 0) rows.push(`${likes} reactions`);
    const shares = Number(metrics.shares || 0);
    if (shares > 0) rows.push(`${shares} shares`);
    return rows.join(' · ');
}

function metaNode(post, extra = '') {
    const text = [post?.storyTime, extra].filter(Boolean).join(' · ');
    return text ? el('div', 'sb-phone-social-meta', text) : null;
}

function mediaNode(post, { imageFrame = false } = {}) {
    const media = post?.media;
    if (!media) return null;
    if (imageFrame) {
        const frame = el('div', 'sb-phone-social-image-frame');
        if (media.kind === 'photo' && media.status === 'ready' && media.path) {
            const image = new Image();
            image.src = media.path;
            image.alt = media.description || '';
            frame.append(image);
        } else {
            frame.append(icon(media.kind === 'photo' ? 'fa-image' : media.kind === 'voice' ? 'fa-microphone' : 'fa-file'));
        }
        return frame;
    }
    const state = media.status === 'pending' ? 'requested' : media.status;
    return el('div', 'sb-phone-media', `${media.kind} · ${state}${media.description ? ` · ${media.description}` : ''}`);
}

function networkIdentity(network) {
    const hero = el('section', 'sb-phone-social-identity');
    const badge = el('div', 'sb-phone-social-identity-icon');
    badge.append(icon(social()?.iconClass?.(network.iconId) || 'fa-globe'));
    const copy = el('div');
    copy.append(el('strong', '', network.name || 'Social'));
    if (network.description) copy.append(el('small', '', network.description));
    hero.append(badge, copy);
    return hero;
}

function streamCard(post, profiles, network) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-stream');
    card.append(authorNode(post, profiles));
    if (post.title) card.append(el('h3', 'sb-phone-social-title', cleanTitle(post.title)));
    if (post.text) card.append(el('p', 'sb-phone-social-text', post.text));
    const media = mediaNode(post);
    if (media) card.append(media);
    const meta = metaNode(post, metricText(post));
    if (meta) card.append(meta);
    return card;
}

function replyNode(reply, profiles) {
    const row = el('div', 'sb-phone-social-reply');
    row.append(el('strong', '', authorName(reply, profiles)));
    if (reply.text) row.append(el('p', '', reply.text));
    return row;
}

function threadCard(post, replies, profiles, network) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-forum-thread');
    const profile = profileFor(post, profiles);
    const space = spaceName(post, profile, network);
    if (space) card.append(el('span', 'sb-phone-social-space', space));
    card.append(el('h3', 'sb-phone-social-title', derivedTitle(post, network)), authorNode(post, profiles));
    if (post.text) card.append(el('p', 'sb-phone-social-text', post.text));
    const media = mediaNode(post);
    if (media) card.append(media);
    const meta = metaNode(post, metricText(post, replies.length));
    if (meta) card.append(meta);
    if (replies.length) {
        const host = el('div', 'sb-phone-social-replies');
        for (const reply of replies.slice(0, 4)) host.append(replyNode(reply, profiles));
        if (replies.length > 4) host.append(el('div', 'sb-phone-social-meta', `+${replies.length - 4} more`));
        card.append(host);
    }
    return card;
}

function communityCard(post, replies, profiles, network) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-community-card');
    const profile = profileFor(post, profiles);
    const space = spaceName(post, profile, network);
    if (space) card.append(el('span', 'sb-phone-social-space', space));
    card.append(authorNode(post, profiles));
    if (post.title) card.append(el('h3', 'sb-phone-social-title', cleanTitle(post.title)));
    if (post.text) card.append(el('p', 'sb-phone-social-text', post.text));
    const media = mediaNode(post);
    if (media) card.append(media);
    const meta = metaNode(post, metricText(post, replies.length));
    if (meta) card.append(meta);
    if (replies.length) {
        const host = el('div', 'sb-phone-social-replies');
        for (const reply of replies.slice(0, 3)) host.append(replyNode(reply, profiles));
        if (replies.length > 3) host.append(el('div', 'sb-phone-social-meta', `+${replies.length - 3} more`));
        card.append(host);
    }
    return card;
}

function noticeCard(post, profiles, network) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-notice');
    const profile = profileFor(post, profiles);
    const space = spaceName(post, profile, network);
    if (space) card.append(el('span', 'sb-phone-social-space', space));
    card.append(el('h3', 'sb-phone-social-title', derivedTitle(post, network)));
    if (post.text) card.append(el('p', 'sb-phone-social-text', post.text));
    const media = mediaNode(post);
    if (media) card.append(media);
    const meta = metaNode(post, authorName(post, profiles));
    if (meta) card.append(meta);
    return card;
}

function imageCard(post, profiles) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-image-card');
    const frame = mediaNode(post, { imageFrame: true });
    if (frame) card.append(frame);
    else {
        const placeholder = el('div', 'sb-phone-social-image-frame');
        placeholder.append(icon('fa-camera'));
        card.append(placeholder);
    }
    const copy = el('div', 'sb-phone-social-image-copy');
    copy.append(authorNode(post, profiles));
    if (post.text) copy.append(el('p', 'sb-phone-social-text', post.text));
    const meta = metaNode(post, metricText(post));
    if (meta) copy.append(meta);
    card.append(copy);
    return card;
}

function repliesByParent(posts) {
    const map = new Map();
    for (const post of posts) {
        const parent = String(post.replyTo || post.parentPostId || '');
        if (!parent) continue;
        const rows = map.get(parent) || [];
        rows.push(post);
        map.set(parent, rows);
    }
    return map;
}

function roots(posts) {
    const ids = new Set(posts.map(post => String(post.id || '')));
    return posts.filter(post => {
        const parent = String(post.replyTo || post.parentPostId || '');
        return !parent || !ids.has(parent);
    });
}

function groupBySpace(posts, profiles, network) {
    const groups = new Map();
    for (const post of posts) {
        const key = spaceName(post, profileFor(post, profiles), network) || terms(network).community;
        const rows = groups.get(key) || [];
        rows.push(post);
        groups.set(key, rows);
    }
    return groups;
}

function renderMicroblog(body, posts, profiles, network) {
    for (const post of posts) body.append(streamCard(post, profiles, network));
}

function renderForum(body, posts, profiles, network) {
    const replies = repliesByParent(posts);
    const top = roots(posts);
    for (const [space, rows] of groupBySpace(top, profiles, network)) {
        const section = el('section', 'sb-phone-social-section');
        section.append(el('h3', 'sb-phone-social-section-title', space));
        for (const post of rows) section.append(threadCard(post, replies.get(post.id) || [], profiles, network));
        body.append(section);
    }
}

function renderCommunity(body, posts, profiles, network) {
    const replies = repliesByParent(posts);
    const top = roots(posts);
    for (const post of top) body.append(communityCard(post, replies.get(post.id) || [], profiles, network));
}

function renderImage(body, posts, profiles) {
    const grid = el('div', 'sb-phone-social-image-grid');
    for (const post of posts.filter(post => !post.replyTo && !post.parentPostId)) grid.append(imageCard(post, profiles));
    body.append(grid);
}

function renderBulletin(body, posts, profiles, network) {
    for (const [space, rows] of groupBySpace(roots(posts), profiles, network)) {
        const section = el('section', 'sb-phone-social-section');
        section.append(el('h3', 'sb-phone-social-section-title', space));
        for (const post of rows) section.append(noticeCard(post, profiles, network));
        body.append(section);
    }
}

function formatFor(post, network) {
    if (POST_FORMATS.has(post?.format)) return post.format;
    if (network.mode === 'forum') return 'thread';
    if (network.mode === 'community') return 'community';
    if (network.mode === 'image') return 'image';
    if (network.mode === 'bulletin') return 'notice';
    return post?.media?.kind === 'photo' && network.mode === 'hybrid' ? 'image' : 'status';
}

function renderHybrid(body, posts, profiles, network) {
    const replies = repliesByParent(posts);
    for (const post of roots(posts)) {
        const format = formatFor(post, network);
        if (format === 'thread') body.append(threadCard(post, replies.get(post.id) || [], profiles, network));
        else if (format === 'community') body.append(communityCard(post, replies.get(post.id) || [], profiles, network));
        else if (format === 'image') body.append(imageCard(post, profiles));
        else if (format === 'notice' || format === 'announcement') body.append(noticeCard(post, profiles, network));
        else body.append(streamCard(post, profiles, network));
    }
}

async function renderSocialSurface(root, network) {
    if (renderBusy || !root || !network || !isSocialSurface(root, network)) return;
    const body = root.querySelector('.sb-phone-body');
    if (!body) return;
    renderBusy = true;
    try {
        const state = await phone()?.read?.() || { profiles: [], posts: [], version: 0 };
        if (!isSocialSurface(root, network)) return;
        const signature = `${network.updatedAt || 0}:${network.name || ''}:${network.mode || ''}:${state.version || 0}`;
        if (body.dataset.snowbunnySocialSignature === signature) return;

        const profiles = profileMap(state);
        const posts = (state.posts || []).filter(eventVisible).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        body.replaceChildren(networkIdentity(network));
        body.dataset.snowbunnySocialSignature = signature;

        if (!posts.length) {
            body.append(el('div', 'sb-phone-empty', `${network.name || 'This public network'} has no saved public activity yet. Opening or browsing it does not invent posts or advance Story time.`));
            return;
        }

        if (network.mode === 'forum') renderForum(body, posts, profiles, network);
        else if (network.mode === 'community') renderCommunity(body, posts, profiles, network);
        else if (network.mode === 'image') renderImage(body, posts, profiles);
        else if (network.mode === 'bulletin') renderBulletin(body, posts, profiles, network);
        else if (network.mode === 'microblog') renderMicroblog(body, posts, profiles, network);
        else renderHybrid(body, posts, profiles, network);
    } finally {
        renderBusy = false;
    }
}

async function ensureStoryNetwork(root) {
    if (ensureBusy || !root || social()?.readSaved?.()) return;
    const state = await phone()?.read?.();
    if (state?.settings?.enabled !== true) return;
    ensureBusy = true;
    try {
        await social()?.ensure?.();
        const currentRoot = document.getElementById(WORKSPACE_ID);
        applyNetwork(currentRoot);
        const network = social()?.read?.();
        if (currentRoot && network) void renderSocialSurface(currentRoot, network);
    } catch (error) {
        console.warn('[SnowBunny] Could not design this Story social network yet.', error);
    } finally {
        ensureBusy = false;
    }
}

function refresh() {
    queued = false;
    const root = document.getElementById(WORKSPACE_ID);
    if (!root) return;
    installStyles();
    applyNetwork(root);
    const network = social()?.read?.();
    if (network) void renderSocialSurface(root, network);
    void ensureStoryNetwork(root);
}

function queueRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
}

function installCompatibilityAlias() {
    const ui = phoneUi();
    if (!ui || ui.openSocial) return;
    if (typeof ui.openNightowl === 'function') ui.openSocial = ui.openNightowl;
}

export function initPhoneSocialUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    installCompatibilityAlias();
    observer = new MutationObserver(queueRefresh);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('snowbunny:phone-network-changed', queueRefresh);
    document.addEventListener('snowbunny:phone-changed', queueRefresh);
    queueRefresh();
}