const WORKSPACE_ID = 'snowbunny-phone-workspace';
const STYLE_ID = 'snowbunny-phone-social-artwork-ui-style';

let initialized = false;
let observer = null;
let queued = false;
let decorating = false;

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function artwork() {
    return globalThis.SnowBunny?.phoneArtwork ?? null;
}

function el(tag, className = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
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
  #${WORKSPACE_ID} .sb-phone-social-author-art {
    width: 28px; min-width: 28px; height: 28px; overflow: hidden; display: grid; place-items: center;
    border-radius: 50%; background: color-mix(in srgb, currentColor 8%, transparent); font-size: .67rem;
  }
  #${WORKSPACE_ID} .sb-phone-social-author-art img,
  #${WORKSPACE_ID} .sb-phone-social-profile-art img { width: 100%; height: 100%; display: block; object-fit: cover; }
  #${WORKSPACE_ID} .sb-phone-social-author[data-snowbunny-profile-art="1"] { align-items: center; }
  #${WORKSPACE_ID} .sb-phone-social-profile-art {
    width: 68px; min-width: 68px; height: 68px; overflow: hidden; display: grid; place-items: center;
    border-radius: 20px; background: color-mix(in srgb, currentColor 8%, transparent); font-size: 1.18rem;
  }
}
`;
    document.head.append(style);
}

function socialRoot() {
    const root = document.getElementById(WORKSPACE_ID);
    return root?.dataset?.snowbunnyPhoneView === 'social' ? root : null;
}

function eventVisible(value) {
    const store = phone();
    return store?.anchorVisible?.(value?.through) !== false && store?.sourceValid?.(value?.evidence) !== false;
}

function key(value) {
    return String(value || '').trim().toLocaleLowerCase();
}

function profileIndexes(profiles) {
    const byHandle = new Map();
    const byName = new Map();
    const add = (map, lookup, profile) => {
        if (!lookup) return;
        const rows = map.get(lookup) || [];
        rows.push(profile);
        map.set(lookup, rows);
    };
    for (const profile of profiles) {
        add(byHandle, key(profile.handle).replace(/^@+/, ''), profile);
        add(byName, key(profile.name), profile);
    }
    return { byHandle, byName };
}

function unique(rows) {
    return Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
}

function resolveProfile(node, indexes) {
    const handleText = String(node.querySelector('small')?.textContent || '').trim().replace(/^@+/, '');
    const byHandle = unique(indexes.byHandle.get(key(handleText)));
    if (byHandle) return byHandle;
    const nameNode = node.querySelector('strong, h3');
    return unique(indexes.byName.get(key(nameNode?.textContent)));
}

function artNode(profile, className) {
    const host = el('span', className);
    const source = artwork()?.profilePicture?.(profile) || '';
    if (source) {
        const image = new Image();
        image.src = source;
        image.alt = '';
        host.append(image);
    } else {
        host.append(icon('fa-user'));
    }
    return host;
}

function decorateAuthors(root, indexes) {
    for (const author of root.querySelectorAll('.sb-phone-social-author:not([data-snowbunny-profile-art])')) {
        const profile = resolveProfile(author, indexes);
        author.dataset.snowbunnyProfileArt = '1';
        if (!profile) continue;
        author.prepend(artNode(profile, 'sb-phone-social-author-art'));
    }
}

function decorateProfiles(root, indexes) {
    for (const card of root.querySelectorAll('.sb-phone-social-profile:not([data-snowbunny-profile-art])')) {
        const profile = resolveProfile(card, indexes);
        card.dataset.snowbunnyProfileArt = '1';
        if (!profile) continue;
        const top = card.querySelector('.sb-phone-social-profile-top');
        const copy = top?.querySelector('.sb-phone-social-profile-copy');
        if (!top || !copy) continue;
        top.insertBefore(artNode(profile, 'sb-phone-social-profile-art'), copy);
    }
}

async function decorate() {
    queued = false;
    if (decorating) return;
    const root = socialRoot();
    const store = phone();
    if (!root || !store?.read) return;
    decorating = true;
    try {
        const state = await store.read();
        if (!socialRoot()) return;
        const profiles = (state?.profiles || []).filter(eventVisible);
        const indexes = profileIndexes(profiles);
        decorateAuthors(root, indexes);
        decorateProfiles(root, indexes);
    } catch (error) {
        console.warn('[SnowBunny] Could not render Phone profile artwork.', error);
    } finally {
        decorating = false;
    }
}

function queueDecorate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => void decorate());
}

export function initPhoneSocialArtworkUi() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(queueDecorate);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('snowbunny:phone-social-opened', queueDecorate);
    document.addEventListener('snowbunny:phone-changed', queueDecorate);
    document.addEventListener('snowbunny:phone-network-changed', queueDecorate);
    queueDecorate();
}
