const WORKSPACE_ID = 'snowbunny-phone-workspace';
const STYLE_ID = 'snowbunny-phone-ui-style';
const QUICK_ID = 'snowbunny-phone-quick-action';

let initialized = false;
let activeView = 'home';
let activeContactId = '';
let refreshTimer = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function conversation() {
    return globalThis.SnowBunny?.phoneConversation ?? null;
}

function tracker() {
    return globalThis.SnowBunny?.trackers ?? null;
}

function snowState() {
    return globalThis.SnowBunny?.state ?? null;
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
  #${WORKSPACE_ID} {
    position: fixed; z-index: 12210; inset: 0; display: flex; flex-direction: column; overflow: hidden;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #090a0d 2%); color: var(--SmartThemeBodyColor);
  }
  #${WORKSPACE_ID} .sb-phone-head {
    flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-height: 58px;
    padding: calc(8px + env(safe-area-inset-top)) 10px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 64%, transparent);
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 95%, transparent);
  }
  #${WORKSPACE_ID} .sb-phone-head h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.03rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${WORKSPACE_ID} .sb-phone-head button { min-width: 40px; min-height: 40px; border: 0; border-radius: 13px; background: transparent; color: inherit; }
  #${WORKSPACE_ID} .sb-phone-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 13px 14px calc(22px + env(safe-area-inset-bottom)); }
  #${WORKSPACE_ID} .sb-phone-hero {
    display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; align-items: center;
    padding: 14px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
    border-radius: 22px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 9%, var(--SmartThemeBlurTintColor));
  }
  #${WORKSPACE_ID} .sb-phone-hero-avatar { width: 64px; height: 64px; overflow: hidden; border-radius: 20px; display: grid; place-items: center; background: color-mix(in srgb, currentColor 8%, transparent); }
  #${WORKSPACE_ID} .sb-phone-hero-avatar img { width: 100%; height: 100%; object-fit: cover; }
  #${WORKSPACE_ID} .sb-phone-hero-copy strong, #${WORKSPACE_ID} .sb-phone-hero-copy small { display: block; overflow: hidden; text-overflow: ellipsis; }
  #${WORKSPACE_ID} .sb-phone-hero-copy strong { font-size: 1rem; }
  #${WORKSPACE_ID} .sb-phone-hero-copy small { margin-top: 4px; font-size: .72rem; line-height: 1.35; opacity: .62; }
  #${WORKSPACE_ID} .sb-phone-inbox {
    width: 100%; display: flex; align-items: center; gap: 11px; margin-top: 12px; padding: 13px 14px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent); border-radius: 18px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent); color: inherit; text-align: left;
  }
  #${WORKSPACE_ID} .sb-phone-inbox > i { width: 30px; font-size: 1.15rem; opacity: .7; text-align: center; }
  #${WORKSPACE_ID} .sb-phone-inbox-copy { flex: 1; min-width: 0; }
  #${WORKSPACE_ID} .sb-phone-inbox-copy strong, #${WORKSPACE_ID} .sb-phone-inbox-copy small { display: block; }
  #${WORKSPACE_ID} .sb-phone-inbox-copy small { margin-top: 3px; font-size: .69rem; opacity: .58; }
  #${WORKSPACE_ID} .sb-phone-badge { min-width: 28px; padding: 5px 8px; border-radius: 999px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 20%, transparent); text-align: center; font-size: .72rem; font-weight: 800; }
  #${WORKSPACE_ID} .sb-phone-app-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
  #${WORKSPACE_ID} .sb-phone-app {
    min-height: 104px; display: grid; grid-template-rows: auto 1fr; gap: 10px; padding: 13px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent); border-radius: 20px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 56%, transparent); color: inherit; text-align: left;
  }
  #${WORKSPACE_ID} .sb-phone-app i { font-size: 1.3rem; opacity: .72; }
  #${WORKSPACE_ID} .sb-phone-app strong { align-self: end; font-size: .84rem; }
  #${WORKSPACE_ID} .sb-phone-note { margin: 14px 3px 0; font-size: .68rem; line-height: 1.45; opacity: .52; }
  #${WORKSPACE_ID} .sb-phone-search, #${WORKSPACE_ID} .sb-phone-input, #${WORKSPACE_ID} .sb-phone-select {
    box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 11px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 62%, transparent); border-radius: 14px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 58%, transparent); color: inherit; font: inherit;
  }
  #${WORKSPACE_ID} .sb-phone-search { margin-bottom: 10px; }
  #${WORKSPACE_ID} .sb-phone-list { display: grid; gap: 7px; }
  #${WORKSPACE_ID} .sb-phone-contact {
    width: 100%; display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; gap: 10px; align-items: center;
    min-height: 64px; padding: 8px 9px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent);
    border-radius: 17px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent); color: inherit; text-align: left;
  }
  #${WORKSPACE_ID} .sb-phone-contact-avatar { width: 48px; height: 48px; display: grid; place-items: center; overflow: hidden; border-radius: 50%; background: color-mix(in srgb, currentColor 8%, transparent); }
  #${WORKSPACE_ID} .sb-phone-contact-avatar img { width: 100%; height: 100%; object-fit: cover; }
  #${WORKSPACE_ID} .sb-phone-contact-copy { min-width: 0; }
  #${WORKSPACE_ID} .sb-phone-contact-copy strong, #${WORKSPACE_ID} .sb-phone-contact-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #${WORKSPACE_ID} .sb-phone-contact-copy small { margin-top: 3px; font-size: .68rem; opacity: .57; }
  #${WORKSPACE_ID} .sb-phone-thread { display: flex; flex-direction: column; min-height: 100%; }
  #${WORKSPACE_ID} .sb-phone-thread-messages { flex: 1; display: flex; flex-direction: column; gap: 7px; padding-bottom: 12px; }
  #${WORKSPACE_ID} .sb-phone-message { max-width: 84%; padding: 9px 11px; border-radius: 16px; background: color-mix(in srgb, currentColor 8%, transparent); font-size: .82rem; line-height: 1.42; white-space: pre-wrap; overflow-wrap: anywhere; }
  #${WORKSPACE_ID} .sb-phone-message.user { align-self: flex-end; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 18%, transparent); }
  #${WORKSPACE_ID} .sb-phone-message .meta { display: block; margin-top: 5px; font-size: .61rem; opacity: .48; }
  #${WORKSPACE_ID} .sb-phone-media { margin-top: 7px; padding-top: 7px; border-top: 1px solid color-mix(in srgb, currentColor 14%, transparent); font-size: .68rem; opacity: .72; }
  #${WORKSPACE_ID} .sb-phone-thread-compose { position: sticky; bottom: 0; display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: 7px; padding-top: 9px; background: linear-gradient(transparent, color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #090a0d 2%) 22%); }
  #${WORKSPACE_ID} .sb-phone-thread-compose textarea { min-height: 44px; max-height: 130px; resize: vertical; }
  #${WORKSPACE_ID} .sb-phone-thread-compose button, #${WORKSPACE_ID} .sb-phone-secondary {
    min-height: 42px; border: 0; border-radius: 14px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 17%, transparent); color: inherit; font-weight: 750;
  }
  #${WORKSPACE_ID} .sb-phone-secondary { width: 100%; margin: 0 0 8px; }
  #${WORKSPACE_ID} .sb-phone-empty { padding: 26px 16px; border: 1px dashed color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 18px; font-size: .75rem; line-height: 1.45; text-align: center; opacity: .62; }
  #${WORKSPACE_ID} .sb-phone-post { margin-bottom: 9px; padding: 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 53%, transparent); }
  #${WORKSPACE_ID} .sb-phone-post-head { display: flex; gap: 7px; align-items: baseline; margin-bottom: 7px; }
  #${WORKSPACE_ID} .sb-phone-post-head strong { font-size: .8rem; }
  #${WORKSPACE_ID} .sb-phone-post-head small { font-size: .64rem; opacity: .5; }
  #${WORKSPACE_ID} .sb-phone-post p { margin: 0; white-space: pre-wrap; font-size: .79rem; line-height: 1.45; }
  #${WORKSPACE_ID} .sb-phone-gallery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  #${WORKSPACE_ID} .sb-phone-gallery-card { min-height: 120px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent); border-radius: 18px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 53%, transparent); }
  #${WORKSPACE_ID} .sb-phone-gallery-card img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; }
  #${WORKSPACE_ID} .sb-phone-gallery-copy { padding: 9px; font-size: .68rem; line-height: 1.35; }
  #${WORKSPACE_ID} .sb-phone-settings { display: grid; gap: 9px; }
  #${WORKSPACE_ID} .sb-phone-setting { padding: 11px 12px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 17px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent); }
  #${WORKSPACE_ID} .sb-phone-setting label { display: flex; align-items: center; gap: 9px; font-size: .78rem; font-weight: 680; }
  #${WORKSPACE_ID} .sb-phone-setting label span { flex: 1; }
  #${WORKSPACE_ID} .sb-phone-setting small { display: block; margin-top: 5px; font-size: .66rem; line-height: 1.38; opacity: .55; }
  #${QUICK_ID} { width: 38px; min-width: 38px; height: 38px; padding: 0; border: 0; border-radius: 12px; background: transparent; color: inherit; opacity: .8; }
}
`;
    document.head.append(style);
}

function workspace() {
    let root = document.getElementById(WORKSPACE_ID);
    if (!root) {
        root = el('div');
        root.id = WORKSPACE_ID;
        document.body.append(root);
    }
    root.replaceChildren();
    return root;
}

function closePhone() {
    document.getElementById(WORKSPACE_ID)?.remove();
    activeView = 'home';
    activeContactId = '';
}

function header(root, title, back = null) {
    const head = el('header', 'sb-phone-head');
    const left = el('button');
    left.type = 'button';
    left.setAttribute('aria-label', back ? 'Back' : 'Close Pocket Phone');
    left.append(icon(back ? 'fa-arrow-left' : 'fa-xmark'));
    left.addEventListener('click', back || closePhone);
    head.append(left, el('h2', '', title));
    root.append(head);
}

function avatarUrl(actor) {
    const api = context();
    const avatar = actor?.avatar;
    if (!avatar || typeof api?.getThumbnailUrl !== 'function') return '';
    try {
        return api.getThumbnailUrl('avatar', avatar) || '';
    } catch (_) {
        return '';
    }
}

function contactAvatar(contact) {
    const host = el('div', 'sb-phone-contact-avatar');
    const src = avatarUrl(contact.actor);
    if (src) {
        const image = new Image();
        image.src = src;
        image.alt = '';
        host.append(image);
    } else {
        host.append(icon(contact.channel === 'social' ? 'fa-at' : 'fa-user'));
    }
    return host;
}

function eventVisible(value) {
    const store = phone();
    return store?.anchorVisible?.(value?.through) !== false && store?.sourceValid?.(value?.evidence) !== false;
}

function contactVisible(contact) {
    const store = phone();
    return store?.anchorVisible?.(contact?.acquiredThrough) !== false && store?.sourceValid?.(contact?.acquiredEvidence) !== false;
}

function visibleMessages(contact) {
    return (contact?.messages || []).filter(eventVisible);
}

function visibleContacts(state) {
    return (state?.contacts || []).filter(contact => !contact.archived && contactVisible(contact));
}

function unreadCount(state) {
    return visibleContacts(state).reduce((count, contact) => count + visibleMessages(contact).filter(message => !message.user && message.unread).length, 0);
}

function pendingCount(state) {
    return visibleContacts(state).filter(contact => contact.pendingReply).length;
}

async function phoneTime() {
    try {
        const snapshot = await tracker()?.current?.();
        return String(snapshot?.timePlace || '').trim();
    } catch (_) {
        return '';
    }
}

function personaHero(timePlace) {
    const api = context();
    const hero = el('div', 'sb-phone-hero');
    const avatar = el('div', 'sb-phone-hero-avatar');
    const persona = String(api?.chatMetadata?.persona || '');
    let src = '';
    if (persona && typeof api?.getThumbnailUrl === 'function') {
        try { src = api.getThumbnailUrl('persona', persona) || ''; } catch (_) { src = ''; }
    }
    if (src) {
        const image = new Image(); image.src = src; image.alt = ''; avatar.append(image);
    } else avatar.append(icon('fa-user'));
    const copy = el('div', 'sb-phone-hero-copy');
    copy.append(el('strong', '', `${api?.name1 || 'Your'}’s phone`), el('small', '', timePlace ? `Story time · ${timePlace}` : 'Story time · not established yet'));
    hero.append(avatar, copy);
    return hero;
}

async function renderHome() {
    activeView = 'home';
    activeContactId = '';
    const root = workspace();
    header(root, 'Pocket Phone');
    const body = el('main', 'sb-phone-body');
    root.append(body);
    const state = await phone()?.read?.() || { settings: {}, contacts: [], posts: [] };
    body.append(personaHero(await phoneTime()));

    const inbox = el('button', 'sb-phone-inbox'); inbox.type = 'button'; inbox.append(icon('fa-inbox'));
    const inboxCopy = el('div', 'sb-phone-inbox-copy');
    const unread = unreadCount(state); const pending = pendingCount(state);
    inboxCopy.append(el('strong', '', 'Inbox'), el('small', '', pending ? `${pending} conversation${pending === 1 ? '' : 's'} waiting for a reply` : unread ? `${unread} unread message${unread === 1 ? '' : 's'}` : 'No unread messages'));
    const badge = el('span', 'sb-phone-badge', String(unread));
    inbox.append(inboxCopy, badge); inbox.addEventListener('click', () => void renderMessages()); body.append(inbox);

    const apps = [
        ['Messages', 'fa-message', renderMessages],
        ['Nightowl', 'fa-moon', renderNightowl],
        ['Settings', 'fa-gear', renderSettings],
        ['Gallery', 'fa-images', renderGallery],
    ];
    const grid = el('div', 'sb-phone-app-grid');
    for (const [label, iconName, handler] of apps) {
        const button = el('button', 'sb-phone-app'); button.type = 'button'; button.append(icon(iconName), el('strong', '', label)); button.addEventListener('click', () => void handler()); grid.append(button);
    }
    body.append(grid, el('p', 'sb-phone-note', 'Pocket Phone is parallel story continuity. Reading or browsing it does not advance Story time by itself.'));
}

function latestMessageText(contact) {
    const latest = visibleMessages(contact).at(-1);
    if (!latest) return contact.pendingReply ? 'Waiting for a reply' : contact.availability || 'No messages yet';
    const prefix = latest.user ? 'You: ' : '';
    return `${prefix}${latest.text || (latest.media ? `[${latest.media.kind}]` : '')}`.replace(/\s+/g, ' ').trim();
}

async function renderMessages() {
    activeView = 'messages';
    activeContactId = '';
    const root = workspace();
    header(root, 'Messages', renderHome);
    const body = el('main', 'sb-phone-body'); root.append(body);
    const state = await phone()?.read?.() || { contacts: [] };
    const contacts = visibleContacts(state);
    const search = el('input', 'sb-phone-search'); search.type = 'search'; search.placeholder = 'Search messages'; search.autocomplete = 'off'; body.append(search);
    const list = el('div', 'sb-phone-list'); body.append(list);
    const render = () => {
        const query = search.value.trim().toLowerCase(); list.replaceChildren();
        const visible = contacts.filter(contact => `${contact.name} ${latestMessageText(contact)}`.toLowerCase().includes(query));
        if (!visible.length) {
            list.append(el('div', 'sb-phone-empty', contacts.length ? 'No conversations match this search.' : 'No contacts yet. A Character becoming known in the story is not enough by itself; their contact details must actually be acquired before they appear here.'));
            return;
        }
        visible.sort((a, b) => Number(visibleMessages(b).at(-1)?.createdAt || b.updatedAt || 0) - Number(visibleMessages(a).at(-1)?.createdAt || a.updatedAt || 0));
        for (const contact of visible) {
            const row = el('button', 'sb-phone-contact'); row.type = 'button';
            const copy = el('div', 'sb-phone-contact-copy'); copy.append(el('strong', '', contact.name), el('small', '', latestMessageText(contact)));
            const unread = visibleMessages(contact).filter(message => !message.user && message.unread).length;
            row.append(contactAvatar(contact), copy, unread ? el('span', 'sb-phone-badge', String(unread)) : icon(contact.pendingReply ? 'fa-clock' : 'fa-chevron-right'));
            row.addEventListener('click', () => void renderThread(contact.id)); list.append(row);
        }
    };
    search.addEventListener('input', render); render();
}

function mediaDescription(media) {
    if (!media) return '';
    const state = media.status === 'pending' ? 'requested' : media.status;
    return `${media.kind} · ${state}${media.description ? ` · ${media.description}` : ''}`;
}

async function renderThread(contactId) {
    activeView = 'thread';
    activeContactId = contactId;
    const state = await phone()?.read?.({ fresh: true });
    const contact = visibleContacts(state).find(item => item.id === contactId);
    if (!contact) return renderMessages();
    const root = workspace();
    header(root, contact.name, renderMessages);
    const body = el('main', 'sb-phone-body'); root.append(body);
    const thread = el('div', 'sb-phone-thread'); const messages = el('div', 'sb-phone-thread-messages');
    for (const message of visibleMessages(contact)) {
        const bubble = el('div', `sb-phone-message${message.user ? ' user' : ''}`, message.text || '');
        if (message.media) bubble.append(el('div', 'sb-phone-media', mediaDescription(message.media)));
        if (message.storyTime || message.reaction) bubble.append(el('span', 'meta', [message.storyTime, message.reaction].filter(Boolean).join(' · ')));
        messages.append(bubble);
    }
    if (!messages.children.length) messages.append(el('div', 'sb-phone-empty', 'No messages in this thread yet.'));
    thread.append(messages);

    if (contact.pendingReply || state.settings?.automaticReplies === false) {
        const check = el('button', 'sb-phone-secondary', contact.pendingReply ? 'Check for reply' : 'Ask for reply'); check.type = 'button';
        check.addEventListener('click', async () => {
            check.disabled = true; check.textContent = 'Checking…';
            try { await conversation()?.generate?.(contact.id, { proactive: false }); await renderThread(contact.id); }
            catch (error) { console.warn('[SnowBunny] Pocket Phone reply failed.', error); check.disabled = false; check.textContent = 'Try again'; }
        });
        thread.append(check);
    }

    const compose = el('div', 'sb-phone-thread-compose'); const input = el('textarea', 'sb-phone-input'); input.placeholder = `Message ${contact.name}`; input.maxLength = 6000;
    const send = el('button'); send.type = 'button'; send.setAttribute('aria-label', 'Send message'); send.append(icon('fa-paper-plane'));
    send.addEventListener('click', async () => {
        const text = input.value.trim(); if (!text) return; input.disabled = true; send.disabled = true;
        try { await conversation()?.send?.(contact.id, text, { generate: true }); await renderThread(contact.id); }
        catch (error) { console.warn('[SnowBunny] Pocket Phone send failed.', error); input.disabled = false; send.disabled = false; input.focus(); }
    });
    compose.append(input, send); thread.append(compose); body.append(thread);
    void conversation()?.markRead?.(contact.id);
    requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
}

async function renderNightowl() {
    activeView = 'nightowl'; activeContactId = '';
    const root = workspace(); header(root, 'Nightowl', renderHome);
    const body = el('main', 'sb-phone-body'); root.append(body);
    const state = await phone()?.read?.() || { profiles: [], posts: [] };
    const profiles = (state.profiles || []).filter(eventVisible);
    const profileByActor = new Map(profiles.map(profile => [phone()?.actorKey?.(profile.actor) || profile.id, profile]));
    const posts = (state.posts || []).filter(eventVisible).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    if (!posts.length) {
        body.append(el('div', 'sb-phone-empty', 'Nightowl has no feed yet. The social world will be maintained from the story and its persistent background users; browsing an empty feed does not invent activity or advance Story time.'));
        return;
    }
    for (const post of posts) {
        const profile = profileByActor.get(post.authorActorKey);
        const card = el('article', 'sb-phone-post'); const head = el('div', 'sb-phone-post-head');
        head.append(el('strong', '', profile?.name || post.authorActorKey || 'Nightowl user'));
        if (profile?.handle) head.append(el('small', '', `@${profile.handle}`));
        card.append(head, el('p', '', post.text || ''));
        if (post.media) card.append(el('div', 'sb-phone-media', mediaDescription(post.media)));
        body.append(card);
    }
}

async function renderGallery() {
    activeView = 'gallery'; activeContactId = '';
    const root = workspace(); header(root, 'Gallery', renderHome);
    const body = el('main', 'sb-phone-body'); root.append(body);
    const state = await phone()?.read?.() || { contacts: [], posts: [] };
    const media = [];
    for (const contact of visibleContacts(state)) {
        for (const message of visibleMessages(contact)) {
            if (message.media?.status === 'ready') media.push({ ...message.media, label: contact.name, at: message.createdAt });
        }
    }
    for (const post of (state.posts || []).filter(eventVisible)) if (post.media?.status === 'ready') media.push({ ...post.media, label: 'Nightowl', at: post.createdAt });
    media.sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
    if (!media.length) { body.append(el('div', 'sb-phone-empty', 'No delivered Phone media yet. Pending photo or voice proposals do not enter the Gallery until they are actually fulfilled.')); return; }
    const grid = el('div', 'sb-phone-gallery');
    for (const item of media) {
        const card = el('article', 'sb-phone-gallery-card');
        if (item.kind === 'photo' && item.path) { const image = new Image(); image.src = item.path; image.alt = item.description || ''; card.append(image); }
        else { const art = el('div', 'sb-phone-hero-avatar'); art.style.margin = '18px auto 4px'; art.append(icon(item.kind === 'voice' ? 'fa-microphone' : 'fa-file')); card.append(art); }
        card.append(el('div', 'sb-phone-gallery-copy', `${item.label} · ${item.description || item.kind}`)); grid.append(card);
    }
    body.append(grid);
}

function settingToggle(labelText, help, checked, onChange) {
    const card = el('div', 'sb-phone-setting'); const label = el('label'); const copy = el('span', '', labelText); const input = el('input'); input.type = 'checkbox'; input.checked = checked; input.addEventListener('change', () => void onChange(input.checked)); label.append(copy, input); card.append(label, el('small', '', help)); return card;
}

function settingSelect(labelText, help, value, values, onChange) {
    const card = el('div', 'sb-phone-setting'); const label = el('label'); label.append(el('span', '', labelText)); const select = el('select', 'sb-phone-select');
    for (const [optionValue, optionLabel] of values) select.append(new Option(optionLabel, optionValue)); select.value = value; select.addEventListener('change', () => void onChange(select.value)); card.append(label, select, el('small', '', help)); return card;
}

async function renderSettings() {
    activeView = 'settings'; activeContactId = '';
    const root = workspace(); header(root, 'Phone Settings', renderHome);
    const body = el('main', 'sb-phone-body'); root.append(body);
    const state = await phone()?.read?.({ fresh: true }); const settings = state?.settings || {};
    const host = el('div', 'sb-phone-settings');
    const save = async patch => { await phone()?.setSettings?.(patch); scheduleRefresh(); };
    host.append(
        settingToggle('Pocket Phone enabled', 'Turns Phone context and private conversations on for this chat. Turning it off does not erase saved Phone history.', settings.enabled === true, value => save({ enabled: value })),
        settingToggle('Automatic private replies', 'After you send a private message, let the linked Character decide whether to answer. Silence remains a valid result.', settings.automaticReplies !== false, value => save({ automaticReplies: value })),
        settingToggle('Proactive incoming messages', 'Allows Phone Upkeep to consider occasional motivated contact. This does not use real-world elapsed time.', settings.incoming === true, value => save({ incoming: value })),
        settingToggle('Share factual Phone events with Memory Maker', 'Only actual delivered Phone events may become Memory evidence. Private continuity notes are not Story events.', settings.shareMemory === true, value => save({ shareMemory: value })),
        settingSelect('Incoming photos', 'Controls whether a Character may propose a photo. A proposal is not delivered media until fulfilled.', settings.incomingPhotos || 'off', [['off', 'Off'], ['ask', 'Ask'], ['on', 'On']], value => save({ incomingPhotos: value })),
        settingSelect('Incoming voice', 'Controls whether a Character may propose a voice note. A proposal is not delivered media until fulfilled.', settings.incomingVoice || 'off', [['off', 'Off'], ['ask', 'Ask'], ['on', 'On']], value => save({ incomingVoice: value })),
    );
    const reply = el('div', 'sb-phone-setting'); reply.append(el('label', '', 'Private reply output limit'));
    const number = el('input', 'sb-phone-input'); number.type = 'number'; number.min = '800'; number.max = '12000'; number.step = '100'; number.value = String(settings.replyLimit || 3000);
    number.addEventListener('change', () => void save({ replyLimit: Math.max(800, Math.min(12000, Number(number.value) || 3000)) }));
    reply.append(number, el('small', '', 'Separate from Phone Upkeep. Changing background maintenance must not silently change ordinary message replies.')); host.append(reply);
    body.append(host, el('p', 'sb-phone-note', 'Profiles & pictures, artwork folders, background Nightowl users and the dedicated Phone Upkeep controls belong to the next Phone surface pass; they are not being faked by these switches.'));
}

async function openPhone(view = 'home') {
    installStyles();
    if (!context()?.getCurrentChatId?.()) return;
    if (view === 'messages') return renderMessages();
    if (view === 'nightowl') return renderNightowl();
    if (view === 'gallery') return renderGallery();
    if (view === 'settings') return renderSettings();
    return renderHome();
}

function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
        ensureQuickAction();
        if (!document.getElementById(WORKSPACE_ID)) return;
        if (activeView === 'thread' && activeContactId) void renderThread(activeContactId);
        else void openPhone(activeView);
    }, 80);
}

async function ensureQuickAction() {
    const host = document.querySelector('#leftSendForm');
    if (!host || !context()?.getCurrentChatId?.()) { document.getElementById(QUICK_ID)?.remove(); return; }
    const state = await phone()?.read?.();
    const shouldShow = state?.settings?.enabled === true;
    let button = document.getElementById(QUICK_ID);
    if (!shouldShow) { button?.remove(); return; }
    if (button) return;
    button = el('button'); button.id = QUICK_ID; button.type = 'button'; button.title = 'Pocket Phone'; button.setAttribute('aria-label', 'Open Pocket Phone'); button.append(icon('fa-mobile-screen-button')); button.addEventListener('click', () => void openPhone('home')); host.append(button);
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(WORKSPACE_ID)) { event.preventDefault(); closePhone(); }
}

function registerEvents() {
    const api = context(); const source = api?.eventSource; const types = api?.eventTypes;
    if (source?.on && types) {
        for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) { const event = types[name]; if (event) source.on(event, scheduleRefresh); }
    }
    document.addEventListener('snowbunny:phone-changed', scheduleRefresh);
    document.addEventListener('snowbunny:phone-reply-ready', scheduleRefresh);
    document.addEventListener('snowbunny:open-phone', event => void openPhone(event?.detail?.view || 'home'));
}

export function initPhoneUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    registerEvents();
    document.addEventListener('keydown', onKeyDown, true);
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneUi: {
            open: openPhone,
            close: closePhone,
            openMessages: () => openPhone('messages'),
            openNightowl: () => openPhone('nightowl'),
            openGallery: () => openPhone('gallery'),
            openSettings: () => openPhone('settings'),
        },
    };
    void ensureQuickAction();
}