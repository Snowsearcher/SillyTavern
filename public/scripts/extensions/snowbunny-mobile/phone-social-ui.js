const WORKSPACE_ID = 'snowbunny-phone-workspace';
const STYLE_ID = 'snowbunny-phone-social-ui-style';
const POST_FORMATS = new Set(['status', 'thread', 'community', 'image', 'notice', 'announcement']);

let initialized = false;
let observer = null;
let queued = false;
let ensureBusy = false;
let renderBusy = false;
let socialView = { kind: 'feed', tab: 'home', id: '' };

function social() {
    return globalThis.SnowBunny?.phoneSocial ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function phoneUi() {
    return globalThis.SnowBunny?.phoneUi ?? null;
}

function socialActions() {
    return globalThis.SnowBunny?.phoneSocialActions ?? null;
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

function button(label, iconName = '', className = '') {
    const node = el('button', className);
    node.type = 'button';
    if (iconName) node.append(icon(iconName));
    if (label) node.append(el('span', '', label));
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
    margin-bottom: 10px; padding: 11px 12px;
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
  #${WORKSPACE_ID} .sb-phone-social-tabs {
    position: sticky; top: -13px; z-index: 2; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px;
    margin: 0 -2px 8px; padding: 7px 2px 8px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 96%, transparent);
  }
  #${WORKSPACE_ID} .sb-phone-social-tabs button,
  #${WORKSPACE_ID} .sb-phone-social-actions button,
  #${WORKSPACE_ID} .sb-phone-social-back,
  #${WORKSPACE_ID} .sb-phone-social-follow,
  #${WORKSPACE_ID} .sb-phone-social-create,
  #${WORKSPACE_ID} .sb-phone-social-compose button {
    min-height: 36px; border: 0; border-radius: 12px; background: transparent; color: inherit; font: inherit;
  }
  #${WORKSPACE_ID} .sb-phone-social-tabs button { padding: 7px 6px; font-size: .67rem; font-weight: 760; opacity: .6; }
  #${WORKSPACE_ID} .sb-phone-social-tabs button.active { background: color-mix(in srgb, currentColor 9%, transparent); opacity: 1; }
  #${WORKSPACE_ID} .sb-phone-social-create { width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px; margin: 0 0 11px; padding: 8px 10px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 15%, transparent); font-size: .7rem; font-weight: 780; }
  #${WORKSPACE_ID} .sb-phone-social-section { margin: 12px 0 16px; }
  #${WORKSPACE_ID} .sb-phone-social-section-title { margin: 0 3px 7px; font-size: .69rem; font-weight: 800; opacity: .58; letter-spacing: .02em; }
  #${WORKSPACE_ID} .sb-phone-social-card {
    margin-bottom: 9px; padding: 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 53%, transparent);
  }
  #${WORKSPACE_ID} .sb-phone-social-card.interactive { cursor: pointer; }
  #${WORKSPACE_ID} .sb-phone-social-author { display: flex; align-items: baseline; gap: 7px; min-width: 0; margin: -3px 0 7px -5px; padding: 3px 5px; border: 0; border-radius: 10px; background: transparent; color: inherit; text-align: left; }
  #${WORKSPACE_ID} .sb-phone-social-author strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .8rem; }
  #${WORKSPACE_ID} .sb-phone-social-author small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .63rem; opacity: .5; }
  #${WORKSPACE_ID} .sb-phone-social-title { margin: 0 0 6px; font-size: .9rem; line-height: 1.28; }
  #${WORKSPACE_ID} .sb-phone-social-text { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .79rem; line-height: 1.45; }
  #${WORKSPACE_ID} .sb-phone-social-meta { margin-top: 8px; font-size: .62rem; line-height: 1.35; opacity: .5; }
  #${WORKSPACE_ID} .sb-phone-social-space {
    display: inline-block; margin-bottom: 7px; padding: 3px 7px; border-radius: 999px;
    background: color-mix(in srgb, currentColor 8%, transparent); font-size: .61rem; font-weight: 760; opacity: .72;
  }
  #${WORKSPACE_ID} .sb-phone-social-actions { display: flex; align-items: center; gap: 2px; margin: 8px -5px -5px; padding-top: 5px; border-top: 1px solid color-mix(in srgb, currentColor 10%, transparent); }
  #${WORKSPACE_ID} .sb-phone-social-actions button { display: inline-flex; align-items: center; gap: 5px; padding: 5px 7px; font-size: .62rem; opacity: .58; }
  #${WORKSPACE_ID} .sb-phone-social-actions button.active { background: color-mix(in srgb, currentColor 9%, transparent); opacity: 1; }
  #${WORKSPACE_ID} .sb-phone-social-replies { display: grid; gap: 6px; margin-top: 9px; padding-left: 10px; border-left: 2px solid color-mix(in srgb, currentColor 12%, transparent); }
  #${WORKSPACE_ID} .sb-phone-social-reply { padding: 7px 8px; border-radius: 12px; background: color-mix(in srgb, currentColor 4%, transparent); cursor: pointer; }
  #${WORKSPACE_ID} .sb-phone-social-reply strong { display: block; margin-bottom: 3px; font-size: .65rem; }
  #${WORKSPACE_ID} .sb-phone-social-reply p { margin: 0; white-space: pre-wrap; font-size: .72rem; line-height: 1.38; }
  #${WORKSPACE_ID} .sb-phone-social-image-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  #${WORKSPACE_ID} .sb-phone-social-image-card { overflow: hidden; padding: 0; }
  #${WORKSPACE_ID} .sb-phone-social-image-frame { width: 100%; aspect-ratio: 1 / 1; display: grid; place-items: center; overflow: hidden; background: color-mix(in srgb, currentColor 7%, transparent); font-size: 1.45rem; }
  #${WORKSPACE_ID} .sb-phone-social-image-frame img { width: 100%; height: 100%; display: block; object-fit: cover; }
  #${WORKSPACE_ID} .sb-phone-social-image-copy { padding: 9px 10px 10px; }
  #${WORKSPACE_ID} .sb-phone-social-image-copy .sb-phone-social-text { font-size: .72rem; }
  #${WORKSPACE_ID} .sb-phone-social-notice { border-radius: 12px 18px 18px 12px; border-left-width: 4px; }
  #${WORKSPACE_ID} .sb-phone-social-forum-thread { border-radius: 15px; }
  #${WORKSPACE_ID} .sb-phone-social-community-card { border-radius: 20px; }
  #${WORKSPACE_ID} .sb-phone-social-back { display: inline-flex; align-items: center; gap: 7px; margin: -4px 0 9px -7px; padding: 6px 8px; font-size: .69rem; opacity: .7; }
  #${WORKSPACE_ID} .sb-phone-social-profile { padding: 15px; margin-bottom: 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 20px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 53%, transparent); }
  #${WORKSPACE_ID} .sb-phone-social-profile-top { display: flex; align-items: flex-start; gap: 10px; }
  #${WORKSPACE_ID} .sb-phone-social-profile-copy { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .sb-phone-social-profile-copy h3 { margin: 0; font-size: 1rem; }
  #${WORKSPACE_ID} .sb-phone-social-profile-copy small { display: block; margin-top: 2px; font-size: .66rem; opacity: .55; }
  #${WORKSPACE_ID} .sb-phone-social-profile-copy p { margin: 9px 0 0; font-size: .76rem; line-height: 1.42; }
  #${WORKSPACE_ID} .sb-phone-social-follow { flex: 0 0 auto; min-width: 76px; padding: 7px 10px; background: color-mix(in srgb, currentColor 8%, transparent); font-size: .67rem; font-weight: 760; }
  #${WORKSPACE_ID} .sb-phone-social-follow.active { background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 18%, transparent); }
  #${WORKSPACE_ID} .sb-phone-social-compose { display: grid; gap: 9px; padding: 13px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 53%, transparent); }
  #${WORKSPACE_ID} .sb-phone-social-compose input,
  #${WORKSPACE_ID} .sb-phone-social-compose textarea { box-sizing: border-box; width: 100%; padding: 9px 10px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent); border-radius: 12px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 60%, transparent); color: inherit; font: inherit; }
  #${WORKSPACE_ID} .sb-phone-social-compose textarea { min-height: 130px; resize: vertical; line-height: 1.42; }
  #${WORKSPACE_ID} .sb-phone-social-compose button { padding: 8px 11px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 17%, transparent); font-size: .7rem; font-weight: 780; }
  #${WORKSPACE_ID} .sb-phone-social-compose small { font-size: .65rem; line-height: 1.4; opacity: .58; }
  #${WORKSPACE_ID} .sb-phone-social-compose-error { padding: 8px 9px; border-radius: 10px; background: color-mix(in srgb, currentColor 7%, transparent); font-size: .67rem; line-height: 1.38; }
}
`;
    document.head.append(style);
}

function socialButton(root) {
    return root?.querySelector('.sb-phone-app[data-snowbunny-social="1"]') || null;
}

function terms(network) {
    const defaults = social()?.defaultTerms?.(network?.mode) || {};
    const source = network?.terminology && typeof network.terminology === 'object' ? network.terminology : {};
    return {
        home: String(source.home || defaults.home || 'Public'),
        post: String(source.post || defaults.post || 'Post'),
        reply: String(source.reply || defaults.reply || 'Reply'),
        profile: String(source.profile || defaults.profile || 'Profile'),
        space: String(source.space || source.community || defaults.space || 'Space'),
        reshare: String(source.reshare || defaults.reshare || 'Share'),
        like: String(source.like || defaults.like || 'React'),
        following: String(source.following || defaults.following || 'Following'),
        saved: String(source.saved || defaults.saved || 'Saved'),
    };
}

function applyNetwork(root) {
    if (!root) return;
    const network = social()?.read?.();
    if (!network) return;
    root.dataset.socialMode = network.mode || 'hybrid';
    root.dataset.socialNetwork = network.name || 'Social';
    const appButton = socialButton(root);
    if (appButton) {
        const label = appButton.querySelector('strong');
        if (label) label.textContent = network.name || 'Social';
        const oldIcon = appButton.querySelector('i');
        if (oldIcon) oldIcon.className = `fa-solid ${social()?.iconClass?.(network.iconId) || 'fa-globe'}`;
        appButton.title = network.description || `${network.name || 'Social'} public network`;
        appButton.setAttribute('aria-label', `Open ${network.name || 'Social'}`);
    }
}

function eventVisible(value) {
    const store = phone();
    return store?.anchorVisible?.(value?.through) !== false && store?.sourceValid?.(value?.evidence) !== false;
}

function isSocialSurface(root) {
    return root?.dataset?.snowbunnyPhoneView === 'social'
        || Boolean(root?.querySelector('[data-snowbunny-social-surface="1"]'));
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

function showHandles(network) {
    return !['bulletin'].includes(network?.mode);
}

function openProfile(actorKeyValue) {
    if (!actorKeyValue) return;
    socialView = { kind: 'profile', tab: socialView.tab, id: actorKeyValue };
    queueRefresh();
}

function openThread(postId) {
    if (!postId) return;
    socialView = { kind: 'thread', tab: socialView.tab, id: postId };
    queueRefresh();
}

function openCompose(replyTo = '') {
    socialView = { kind: 'compose', tab: socialView.tab, id: String(replyTo || '') };
    queueRefresh();
}

function backToFeed() {
    socialView = { kind: 'feed', tab: socialView.tab || 'home', id: '' };
    queueRefresh();
}

function authorNode(post, profiles, network) {
    const profile = profileFor(post, profiles);
    const actorKeyValue = String(post.authorActorKey || '');
    const row = el('button', 'sb-phone-social-author');
    row.type = 'button';
    row.append(el('strong', '', profile?.name || actorKeyValue || 'Public user'));
    if (showHandles(network) && profile?.handle) row.append(el('small', '', `@${profile.handle}`));
    if (actorKeyValue) {
        row.addEventListener('click', event => {
            event.stopPropagation();
            openProfile(actorKeyValue);
        });
    } else row.disabled = true;
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
    return cleanTitle(post?.space || fields.space || fields.community || fields.board || terms(network).space || 'General');
}

function pluralLabel(label, count) {
    if (count === 1) return label;
    if (/y$/i.test(label)) return `${label.slice(0, -1)}ies`;
    if (/(s|x|ch|sh)$/i.test(label)) return `${label}es`;
    return `${label}s`;
}

function metricText(post, network, replyCount = null, state = null) {
    const vocabulary = terms(network);
    const metrics = post?.metrics && typeof post.metrics === 'object' ? post.metrics : {};
    const rows = [];
    const replies = replyCount ?? Number(metrics.replies || 0);
    if (replies > 0) rows.push(`${replies} ${pluralLabel(vocabulary.reply, replies)}`);
    const baseLikes = Number(metrics.likes || metrics.reactions || 0);
    const reacted = state?.social?.reactedPostIds?.includes(post.id) === true;
    const likes = baseLikes + (reacted ? 1 : 0);
    if (likes > 0) rows.push(`${likes} ${pluralLabel(vocabulary.like, likes)}`);
    const shares = Number(metrics.shares || 0);
    if (shares > 0) rows.push(`${shares} ${pluralLabel(vocabulary.reshare, shares)}`);
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

function navigation(network) {
    const vocabulary = terms(network);
    const nav = el('nav', 'sb-phone-social-tabs');
    const rows = [
        ['home', vocabulary.home],
        ['following', vocabulary.following],
        ['saved', vocabulary.saved],
    ];
    for (const [key, label] of rows) {
        const tab = button(label, '', socialView.tab === key ? 'active' : '');
        tab.addEventListener('click', () => {
            socialView = { kind: 'feed', tab: key, id: '' };
            queueRefresh();
        });
        nav.append(tab);
    }
    return nav;
}

function createButton(network) {
    const vocabulary = terms(network);
    const create = button(`New ${vocabulary.post}`, 'fa-plus', 'sb-phone-social-create');
    create.addEventListener('click', () => openCompose());
    return create;
}

async function togglePost(kind, idValue) {
    const store = phone();
    if (!store || !idValue) return;
    if (kind === 'reaction') await store.toggleReaction?.(idValue);
    else if (kind === 'saved') await store.toggleSaved?.(idValue);
    queueRefresh();
}

function actionRow(post, state, network) {
    const vocabulary = terms(network);
    const host = el('div', 'sb-phone-social-actions');
    const reacted = state?.social?.reactedPostIds?.includes(post.id) === true;
    const saved = state?.social?.savedPostIds?.includes(post.id) === true;
    const react = button(vocabulary.like, 'fa-heart', reacted ? 'active' : '');
    react.setAttribute('aria-pressed', String(reacted));
    react.addEventListener('click', event => {
        event.stopPropagation();
        void togglePost('reaction', post.id);
    });
    const reply = button(vocabulary.reply, 'fa-reply');
    reply.addEventListener('click', event => {
        event.stopPropagation();
        openCompose(post.id);
    });
    const keep = button(vocabulary.saved, 'fa-bookmark', saved ? 'active' : '');
    keep.setAttribute('aria-pressed', String(saved));
    keep.addEventListener('click', event => {
        event.stopPropagation();
        void togglePost('saved', post.id);
    });
    host.append(react, reply, keep);
    return host;
}

function makeInteractive(card, post) {
    card.classList.add('interactive');
    card.tabIndex = 0;
    card.addEventListener('click', () => openThread(post.id));
    card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openThread(post.id);
    });
    return card;
}

function streamCard(post, profiles, network, state, { interactive = true } = {}) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-stream');
    card.append(authorNode(post, profiles, network));
    if (post.title) card.append(el('h3', 'sb-phone-social-title', cleanTitle(post.title)));
    if (post.text) card.append(el('p', 'sb-phone-social-text', post.text));
    const media = mediaNode(post);
    if (media) card.append(media);
    const meta = metaNode(post, metricText(post, network, null, state));
    if (meta) card.append(meta);
    card.append(actionRow(post, state, network));
    return interactive ? makeInteractive(card, post) : card;
}

function replyNode(reply, profiles) {
    const row = el('div', 'sb-phone-social-reply');
    row.append(el('strong', '', authorName(reply, profiles)));
    if (reply.text) row.append(el('p', '', reply.text));
    row.addEventListener('click', event => {
        event.stopPropagation();
        openThread(reply.id);
    });
    return row;
}

function threadCard(post, replies, profiles, network, state, { interactive = true, allReplies = false } = {}) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-forum-thread');
    const profile = profileFor(post, profiles);
    const space = spaceName(post, profile, network);
    if (space) card.append(el('span', 'sb-phone-social-space', space));
    card.append(el('h3', 'sb-phone-social-title', derivedTitle(post, network)), authorNode(post, profiles, network));
    if (post.text) card.append(el('p', 'sb-phone-social-text', post.text));
    const media = mediaNode(post);
    if (media) card.append(media);
    const meta = metaNode(post, metricText(post, network, replies.length, state));
    if (meta) card.append(meta);
    if (replies.length) {
        const host = el('div', 'sb-phone-social-replies');
        const visible = allReplies ? replies : replies.slice(0, 4);
        for (const reply of visible) host.append(replyNode(reply, profiles));
        if (!allReplies && replies.length > visible.length) host.append(el('div', 'sb-phone-social-meta', `+${replies.length - visible.length} more`));
        card.append(host);
    }
    card.append(actionRow(post, state, network));
    return interactive ? makeInteractive(card, post) : card;
}

function communityCard(post, replies, profiles, network, state, options = {}) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-community-card');
    const profile = profileFor(post, profiles);
    const space = spaceName(post, profile, network);
    if (space) card.append(el('span', 'sb-phone-social-space', space));
    card.append(authorNode(post, profiles, network));
    if (post.title) card.append(el('h3', 'sb-phone-social-title', cleanTitle(post.title)));
    if (post.text) card.append(el('p', 'sb-phone-social-text', post.text));
    const media = mediaNode(post);
    if (media) card.append(media);
    const meta = metaNode(post, metricText(post, network, replies.length, state));
    if (meta) card.append(meta);
    if (replies.length) {
        const host = el('div', 'sb-phone-social-replies');
        const visible = options.allReplies ? replies : replies.slice(0, 3);
        for (const reply of visible) host.append(replyNode(reply, profiles));
        if (!options.allReplies && replies.length > visible.length) host.append(el('div', 'sb-phone-social-meta', `+${replies.length - visible.length} more`));
        card.append(host);
    }
    card.append(actionRow(post, state, network));
    return options.interactive === false ? card : makeInteractive(card, post);
}

function noticeCard(post, profiles, network, state, { interactive = true } = {}) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-notice');
    const profile = profileFor(post, profiles);
    const space = spaceName(post, profile, network);
    if (space) card.append(el('span', 'sb-phone-social-space', space));
    card.append(el('h3', 'sb-phone-social-title', derivedTitle(post, network)), authorNode(post, profiles, network));
    if (post.text) card.append(el('p', 'sb-phone-social-text', post.text));
    const media = mediaNode(post);
    if (media) card.append(media);
    const meta = metaNode(post, metricText(post, network, null, state));
    if (meta) card.append(meta);
    card.append(actionRow(post, state, network));
    return interactive ? makeInteractive(card, post) : card;
}

function imageCard(post, profiles, network, state, { interactive = true } = {}) {
    const card = el('article', 'sb-phone-social-card sb-phone-social-image-card');
    const frame = mediaNode(post, { imageFrame: true });
    if (frame) card.append(frame);
    else {
        const placeholder = el('div', 'sb-phone-social-image-frame');
        placeholder.append(icon('fa-camera'));
        card.append(placeholder);
    }
    const copy = el('div', 'sb-phone-social-image-copy');
    copy.append(authorNode(post, profiles, network));
    if (post.text) copy.append(el('p', 'sb-phone-social-text', post.text));
    const meta = metaNode(post, metricText(post, network, null, state));
    if (meta) copy.append(meta);
    copy.append(actionRow(post, state, network));
    card.append(copy);
    return interactive ? makeInteractive(card, post) : card;
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
    for (const rows of map.values()) rows.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
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
        const key = spaceName(post, profileFor(post, profiles), network) || terms(network).space;
        const rows = groups.get(key) || [];
        rows.push(post);
        groups.set(key, rows);
    }
    return groups;
}

function formatFor(post, network) {
    if (POST_FORMATS.has(post?.format)) return post.format;
    if (network.mode === 'forum') return 'thread';
    if (network.mode === 'community') return 'community';
    if (network.mode === 'image') return 'image';
    if (network.mode === 'bulletin') return 'notice';
    return post?.media?.kind === 'photo' && network.mode === 'hybrid' ? 'image' : 'status';
}

function cardFor(post, replies, profiles, network, state, options = {}) {
    const format = formatFor(post, network);
    if (format === 'thread') return threadCard(post, replies, profiles, network, state, options);
    if (format === 'community') return communityCard(post, replies, profiles, network, state, options);
    if (format === 'image') return imageCard(post, profiles, network, state, options);
    if (format === 'notice' || format === 'announcement') return noticeCard(post, profiles, network, state, options);
    return streamCard(post, profiles, network, state, options);
}

function feedPosts(posts, state) {
    if (socialView.tab === 'following') {
        const following = new Set(state?.social?.followingActorKeys || []);
        return posts.filter(post => following.has(post.authorActorKey));
    }
    if (socialView.tab === 'saved') {
        const saved = new Set(state?.social?.savedPostIds || []);
        return posts.filter(post => saved.has(post.id));
    }
    return posts;
}

function renderFeed(body, posts, profiles, network, state) {
    body.append(navigation(network), createButton(network));
    const filtered = feedPosts(posts, state);
    if (!filtered.length) {
        const vocabulary = terms(network);
        const text = socialView.tab === 'following'
            ? `Nothing from ${vocabulary.following.toLocaleLowerCase()} accounts is visible yet.`
            : socialView.tab === 'saved'
                ? `No ${vocabulary.saved.toLocaleLowerCase()} items yet.`
                : `${network.name || 'This public network'} has no saved public activity yet. Opening or browsing it does not advance Story time.`;
        body.append(el('div', 'sb-phone-empty', text));
        return;
    }

    const replies = repliesByParent(posts);
    const top = roots(filtered);
    if (network.mode === 'forum') {
        for (const [space, rows] of groupBySpace(top, profiles, network)) {
            const section = el('section', 'sb-phone-social-section');
            section.append(el('h3', 'sb-phone-social-section-title', space));
            for (const post of rows) section.append(threadCard(post, replies.get(post.id) || [], profiles, network, state));
            body.append(section);
        }
        return;
    }
    if (network.mode === 'bulletin') {
        for (const [space, rows] of groupBySpace(top, profiles, network)) {
            const section = el('section', 'sb-phone-social-section');
            section.append(el('h3', 'sb-phone-social-section-title', space));
            for (const post of rows) section.append(noticeCard(post, profiles, network, state));
            body.append(section);
        }
        return;
    }
    if (network.mode === 'image') {
        const grid = el('div', 'sb-phone-social-image-grid');
        for (const post of top) grid.append(imageCard(post, profiles, network, state));
        body.append(grid);
        return;
    }
    for (const post of top) body.append(cardFor(post, replies.get(post.id) || [], profiles, network, state));
}

function backButton(network) {
    const vocabulary = terms(network);
    const back = button(vocabulary.home, 'fa-arrow-left', 'sb-phone-social-back');
    back.addEventListener('click', backToFeed);
    return back;
}

function followCommand(network, active) {
    if (active) return terms(network).following;
    if (network.mode === 'forum' || network.mode === 'bulletin') return 'Watch';
    return 'Follow';
}

async function toggleFollow(actorKeyValue) {
    if (!actorKeyValue) return;
    await phone()?.toggleFollow?.(actorKeyValue);
    queueRefresh();
}

function renderProfile(body, state, posts, profiles, network) {
    const profile = profiles.get(socialView.id);
    if (!profile) {
        body.append(backButton(network), el('div', 'sb-phone-empty', 'That public profile is no longer available on the current Story branch.'));
        return;
    }
    const actorKeyValue = phone()?.actorKey?.(profile.actor) || socialView.id;
    const following = state?.social?.followingActorKeys?.includes(actorKeyValue) === true;
    const own = actorKeyValue === socialActions()?.playerActorKey?.();
    const vocabulary = terms(network);
    body.append(backButton(network));
    const hero = el('section', 'sb-phone-social-profile');
    const top = el('div', 'sb-phone-social-profile-top');
    const copy = el('div', 'sb-phone-social-profile-copy');
    copy.append(el('h3', '', profile.name || vocabulary.profile));
    if (showHandles(network) && profile.handle) copy.append(el('small', '', `@${profile.handle}`));
    if (profile.bio) copy.append(el('p', '', profile.bio));
    top.append(copy);
    if (!own) {
        const follow = button(followCommand(network, following), '', `sb-phone-social-follow${following ? ' active' : ''}`);
        follow.setAttribute('aria-pressed', String(following));
        follow.addEventListener('click', () => void toggleFollow(actorKeyValue));
        top.append(follow);
    }
    hero.append(top);
    body.append(hero);

    const ownPosts = roots(posts.filter(post => post.authorActorKey === actorKeyValue));
    if (!ownPosts.length) {
        body.append(el('div', 'sb-phone-empty', `No visible ${pluralLabel(vocabulary.post, 2).toLocaleLowerCase()} from this ${vocabulary.profile.toLocaleLowerCase()} yet.`));
        return;
    }
    const replies = repliesByParent(posts);
    for (const post of ownPosts) body.append(cardFor(post, replies.get(post.id) || [], profiles, network, state));
}

function renderThreadDetail(body, state, posts, profiles, network) {
    const selected = posts.find(post => post.id === socialView.id);
    if (!selected) {
        body.append(backButton(network), el('div', 'sb-phone-empty', 'That public item is no longer available on the current Story branch.'));
        return;
    }
    const replies = repliesByParent(posts);
    body.append(backButton(network));
    body.append(cardFor(selected, replies.get(selected.id) || [], profiles, network, state, { interactive: false, allReplies: true }));
}

function composeField(kind, placeholder, maxLength) {
    const node = el(kind === 'textarea' ? 'textarea' : 'input');
    node.placeholder = placeholder;
    node.maxLength = maxLength;
    return node;
}

function renderCompose(body, posts, profiles, network) {
    const vocabulary = terms(network);
    const parent = socialView.id ? posts.find(post => post.id === socialView.id) || null : null;
    body.append(backButton(network));
    if (socialView.id && !parent) {
        body.append(el('div', 'sb-phone-empty', 'That public item is no longer available on the current Story branch.'));
        return;
    }
    if (parent) {
        const preview = el('section', 'sb-phone-social-card');
        preview.append(el('div', 'sb-phone-social-meta', `${vocabulary.reply} to ${authorName(parent, profiles)}`));
        preview.append(el('p', 'sb-phone-social-text', parent.text || derivedTitle(parent, network)));
        body.append(preview);
    }

    const form = el('form', 'sb-phone-social-compose');
    const titleNeeded = !parent && ['forum', 'bulletin'].includes(network.mode);
    const spaceUseful = !parent && ['forum', 'community', 'bulletin'].includes(network.mode);
    const title = titleNeeded ? composeField('input', `${vocabulary.post} title`, 180) : null;
    const space = spaceUseful ? composeField('input', vocabulary.space, 100) : null;
    const textLabel = parent ? vocabulary.reply : network.mode === 'image' ? 'Caption' : vocabulary.post;
    const text = composeField('textarea', textLabel, 6000);
    if (title) form.append(title);
    if (space) form.append(space);
    form.append(text);
    if (network.mode === 'image' && !parent) {
        form.append(el('small', '', 'Image attachment fulfillment remains separate; this saves the public caption without inventing an image file.'));
    }
    const error = el('div', 'sb-phone-social-compose-error');
    error.hidden = true;
    const submit = button(parent ? vocabulary.reply : `Publish ${vocabulary.post}`, 'fa-paper-plane');
    submit.type = 'submit';
    form.append(error, submit);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submit.disabled) return;
        submit.disabled = true;
        error.hidden = true;
        try {
            const post = await socialActions()?.publish?.({
                text: text.value,
                title: title?.value || '',
                space: space?.value || '',
                replyTo: parent?.id || '',
            });
            if (!post) throw new Error('The public post was not saved.');
            socialView = { kind: 'thread', tab: socialView.tab, id: parent?.id || post.id };
            queueRefresh();
        } catch (cause) {
            error.textContent = String(cause?.message || cause);
            error.hidden = false;
            submit.disabled = false;
        }
    });
    body.append(form);
    requestAnimationFrame(() => (title || text).focus());
}

async function renderSocialSurface(root, network) {
    if (renderBusy || !root || !network || !isSocialSurface(root)) return;
    const body = root.querySelector('.sb-phone-body');
    if (!body) return;
    renderBusy = true;
    try {
        const state = await phone()?.read?.() || { profiles: [], posts: [], social: {}, version: 0 };
        if (!isSocialSurface(root)) return;
        const viewSignature = `${socialView.kind}:${socialView.tab}:${socialView.id}`;
        const signature = `${network.updatedAt || 0}:${network.name || ''}:${network.mode || ''}:${state.version || 0}:${viewSignature}`;
        if (body.dataset.snowbunnySocialSignature === signature) return;

        const profiles = profileMap(state);
        const posts = (state.posts || []).filter(eventVisible).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        body.replaceChildren(networkIdentity(network));
        body.dataset.snowbunnySocialSignature = signature;

        if (socialView.kind === 'feed') renderFeed(body, posts, profiles, network, state);
        else if (socialView.kind === 'profile') renderProfile(body, state, posts, profiles, network);
        else if (socialView.kind === 'thread') renderThreadDetail(body, state, posts, profiles, network);
        else if (socialView.kind === 'compose') renderCompose(body, posts, profiles, network);
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
    if (network && isSocialSurface(root)) void renderSocialSurface(root, network);
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

function resetSocialView() {
    socialView = { kind: 'feed', tab: 'home', id: '' };
    queueRefresh();
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
    document.addEventListener('snowbunny:phone-social-opened', resetSocialView);
    queueRefresh();
}
