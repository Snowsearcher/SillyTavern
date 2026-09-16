const LEFT_DRAWER_ID = 'snowbunny-left-drawer';

let initialized = false;
let observer = null;
let queued = false;
let rendering = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function state() {
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

function refKey(ref) {
    return `${ref?.kind || ''}:${ref?.owner || ''}:${ref?.chatId || ''}`;
}

function sameRef(a, b) {
    return refKey(a) === refKey(b);
}

function currentRef() {
    const api = context();
    const chatId = api?.getCurrentChatId?.();
    if (!chatId) return null;
    if (api.groupId) return { kind: 'group', owner: String(api.groupId), chatId: String(chatId) };
    const index = Number.parseInt(String(api.characterId ?? ''), 10);
    const character = Number.isInteger(index) ? api.characters?.[index] : null;
    return character?.avatar ? { kind: 'character', owner: character.avatar, chatId: String(chatId) } : null;
}

function ownerName(ref) {
    const api = context();
    if (ref.kind === 'group') return api?.groups?.find(group => String(group.id) === String(ref.owner))?.name || 'Group chat';
    return api?.characters?.find(character => character.avatar === ref.owner)?.name || 'Character chat';
}

function storyName(ref) {
    const global = state()?.readGlobal?.() || {};
    const story = (global.stories || []).find(item => (item.chatRefs || []).some(candidate => sameRef(candidate, ref)));
    return story?.title || '';
}

function avatarSrc(ref) {
    if (ref.kind !== 'character') return '';
    const api = context();
    const character = api?.characters?.find(item => item.avatar === ref.owner);
    if (!character?.avatar || character.avatar === 'none') return '';
    try { return api.getThumbnailUrl?.('avatar', character.avatar) || ''; } catch (_) { return ''; }
}

function rememberCurrent() {
    const ref = currentRef();
    if (!ref) return;
    const global = state()?.readGlobal?.() || {};
    const existing = Array.isArray(global.recentChats) ? global.recentChats : [];
    const next = [
        { ...ref, touchedAt: Date.now() },
        ...existing.filter(item => !sameRef(item, ref)),
    ].slice(0, 3);
    state()?.patchGlobal?.({ recentChats: next });
}

function recentSection() {
    const drawer = document.getElementById(LEFT_DRAWER_ID);
    if (!drawer) return null;
    return [...drawer.querySelectorAll('.snowbunny-shell-section')].find(section =>
        section.querySelector('.snowbunny-shell-section-title > span')?.textContent?.trim() === 'Recent Chats',
    ) ?? null;
}

async function openRef(ref) {
    const api = context();
    if (!api || sameRef(ref, currentRef())) return;
    document.getElementById('snowbunny-shell-backdrop')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    if (ref.kind === 'group') {
        await api.openGroupChat?.(ref.owner, ref.chatId);
        return;
    }
    const index = api.characters?.findIndex(character => character.avatar === ref.owner) ?? -1;
    if (index < 0) return;
    await api.selectCharacterById?.(index, { switchMenu: false });
    await api.openCharacterChat?.(ref.chatId);
}

function recentSignature(refs) {
    const current = currentRef();
    return JSON.stringify(refs.map(ref => ({
        key: refKey(ref),
        current: sameRef(ref, current),
        owner: ownerName(ref),
        story: storyName(ref),
    })));
}

function render() {
    queued = false;
    if (rendering) return;
    const section = recentSection();
    if (!section) return;
    const heading = section.querySelector('.snowbunny-shell-section-title');
    const global = state()?.readGlobal?.() || {};
    const refs = Array.isArray(global.recentChats) ? global.recentChats.slice(0, 3) : [];
    if (!refs.length && currentRef()) refs.push(currentRef());

    const signature = recentSignature(refs);
    if (section.dataset.snowbunnyRecentSignature === signature) return;
    section.dataset.snowbunnyRecentSignature = signature;

    rendering = true;
    try {
        [...section.children].forEach(child => { if (child !== heading) child.remove(); });
        if (!refs.length) {
            const empty = el('div', 'snowbunny-library-current');
            empty.append(icon('fa-message'));
            const copy = el('div');
            copy.append(el('strong', '', 'No recent chats'), el('small', '', 'Open a chat and it will appear here.'));
            empty.append(copy);
            section.append(empty);
            return;
        }

        for (const ref of refs) {
            const current = sameRef(ref, currentRef());
            const button = el('button', 'snowbunny-library-current');
            button.type = 'button';
            button.style.width = '100%';
            button.style.color = 'inherit';
            button.style.textAlign = 'left';
            const avatar = avatarSrc(ref);
            if (avatar) {
                const host = el('span');
                host.style.width = '28px';
                host.style.height = '28px';
                host.style.flex = '0 0 28px';
                host.style.overflow = 'hidden';
                host.style.borderRadius = '50%';
                const image = new Image();
                image.src = avatar;
                image.alt = '';
                image.style.width = '100%';
                image.style.height = '100%';
                image.style.objectFit = 'cover';
                host.append(image);
                button.append(host);
            } else {
                button.append(icon(ref.kind === 'group' ? 'fa-users' : 'fa-message'));
            }
            const copy = el('div');
            const story = storyName(ref);
            copy.append(
                el('strong', '', ownerName(ref)),
                el('small', '', current ? `Current chat${story ? ` · ${story}` : ''}` : story || ref.chatId),
            );
            button.append(copy);
            if (!current) button.addEventListener('click', () => void openRef(ref));
            section.append(button);
        }
    } finally {
        rendering = false;
    }
}

function queueRender() {
    if (queued || rendering) return;
    queued = true;
    requestAnimationFrame(render);
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => {
            rememberCurrent();
            const section = recentSection();
            if (section) delete section.dataset.snowbunnyRecentSignature;
            queueRender();
        });
    }
}

export function initRecentChats() {
    if (initialized) return;
    initialized = true;
    rememberCurrent();
    render();
    registerEvents();
    const drawer = document.getElementById(LEFT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueRender);
        observer.observe(drawer, { childList: true, subtree: true });
    }
    document.addEventListener('snowbunny:lorebook-bindings-changed', () => {
        const section = recentSection();
        if (section) delete section.dataset.snowbunnyRecentSignature;
        queueRender();
    });
}
