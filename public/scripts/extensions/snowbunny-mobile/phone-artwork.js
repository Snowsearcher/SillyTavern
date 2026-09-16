const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MIME_EXTENSIONS = new Map([
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif'],
    ['image/avif', 'avif'],
]);

let initialized = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function stateApi() {
    return globalThis.SnowBunny?.state ?? null;
}

function id() {
    const value = context()?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return String(value).replaceAll('-', '');
}

function safePrefix(value) {
    const clean = String(value || 'art').toLocaleLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return clean || 'art';
}

function bytesToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += chunk) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
    }
    return btoa(binary);
}

function validateImage(file) {
    if (!(file instanceof File)) throw new Error('Choose an image file.');
    const extension = MIME_EXTENSIONS.get(String(file.type || '').toLocaleLowerCase());
    if (!extension) throw new Error('Pocket Phone supports PNG, JPG, WebP, GIF and AVIF images.');
    if (!file.size) throw new Error('That image file is empty.');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('That image is larger than 12 MB.');
    return extension;
}

function pickImage() {
    return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/avif';
        input.style.position = 'fixed';
        input.style.left = '-10000px';
        document.body.append(input);
        let settled = false;
        const finish = file => {
            if (settled) return;
            settled = true;
            input.remove();
            resolve(file || null);
        };
        input.addEventListener('change', () => finish(input.files?.[0] || null), { once: true });
        window.addEventListener('focus', () => window.setTimeout(() => finish(input.files?.[0] || null), 250), { once: true });
        input.click();
    });
}

async function uploadImage(file, { prefix = 'art' } = {}) {
    const extension = validateImage(file);
    const api = context();
    if (typeof api?.getRequestHeaders !== 'function') throw new Error('SillyTavern file upload is unavailable.');
    const name = `snowbunny-phone-${safePrefix(prefix)}-${id()}.${extension}`;
    const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: api.getRequestHeaders(),
        body: JSON.stringify({
            name,
            data: bytesToBase64(await file.arrayBuffer()),
        }),
    });
    if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Could not upload Pocket Phone artwork (${response.status}).`);
    }
    const result = await response.json();
    const path = String(result?.path || '');
    if (!path) throw new Error('SillyTavern did not return the uploaded image path.');
    return path;
}

async function pickAndUpload(options = {}) {
    const file = await pickImage();
    if (!file) return '';
    return uploadImage(file, options);
}

function actorPicture(actor) {
    const api = context();
    if (!actor || typeof api?.getThumbnailUrl !== 'function') return '';
    if (actor.kind === 'character' && actor.avatar) {
        try { return String(api.getThumbnailUrl('avatar', actor.avatar) || ''); } catch (_) { return ''; }
    }
    return '';
}

function currentStory() {
    const api = stateApi();
    const storyId = String(api?.readChat?.()?.storyId || '');
    if (!storyId) return null;
    const stories = api?.readGlobal?.()?.stories;
    if (!Array.isArray(stories)) return null;
    return stories.find(story => String(story?.id || '') === storyId) || null;
}

function storyProfilePicture(profileId) {
    const idValue = String(profileId || '');
    if (!idValue) return '';
    const map = currentStory()?.phoneArtwork?.publicProfilePictures;
    return map && typeof map === 'object' ? String(map[idValue] || '') : '';
}

function profilePicture(profile) {
    const explicit = String(profile?.picture || '').trim();
    if (explicit) return explicit;
    const storyPicture = storyProfilePicture(profile?.id);
    if (storyPicture) return storyPicture;
    const linked = actorPicture(profile?.actor);
    if (linked) return linked;
    const player = String(profile?.actor?.key || '') === 'player-public';
    const api = context();
    const persona = String(api?.chatMetadata?.persona || '');
    if (player && persona && typeof api?.getThumbnailUrl === 'function') {
        try { return String(api.getThumbnailUrl('persona', persona) || ''); } catch (_) { return ''; }
    }
    return '';
}

function contactPicture(contact) {
    const explicit = String(contact?.presentation?.picture || '').trim();
    if (explicit) return explicit;
    return actorPicture(contact?.actor);
}

function saveStoryProfilePicture(profileId, picture) {
    const api = stateApi();
    const storyId = String(api?.readChat?.()?.storyId || '');
    if (!storyId) return false;
    const globalState = api?.readGlobal?.();
    const stories = Array.isArray(globalState?.stories) ? globalState.stories : [];
    const story = stories.find(item => String(item?.id || '') === storyId);
    if (!story) return false;
    const phoneArtwork = story.phoneArtwork && typeof story.phoneArtwork === 'object' ? story.phoneArtwork : {};
    const publicProfilePictures = phoneArtwork.publicProfilePictures && typeof phoneArtwork.publicProfilePictures === 'object'
        ? { ...phoneArtwork.publicProfilePictures }
        : {};
    if (picture) publicProfilePictures[String(profileId)] = picture;
    else delete publicProfilePictures[String(profileId)];
    story.phoneArtwork = { ...phoneArtwork, publicProfilePictures, updatedAt: Date.now() };
    story.updatedAt = Date.now();
    api?.patchGlobal?.({ stories });
    return true;
}

async function setPublicProfilePicture(profileId, picture, { shareWithStory = true } = {}) {
    const store = phone();
    if (!store?.mutate) throw new Error('Pocket Phone is unavailable.');
    const idValue = String(profileId || '').trim();
    if (!idValue) throw new Error('Choose a public profile first.');
    const path = String(picture || '').trim().slice(0, 2048);
    const result = await store.mutate(draft => {
        const profile = (draft.profiles || []).find(item => String(item.id || '') === idValue);
        if (!profile) throw new Error('That public profile is no longer available on this Story branch.');
        profile.picture = path;
        profile.updatedAt = Date.now();
        return {
            id: profile.id,
            actorKey: store.actorKey?.(profile.actor) || '',
            player: String(profile?.actor?.key || '') === 'player-public',
        };
    });
    if (shareWithStory && !result.result?.player) saveStoryProfilePicture(idValue, path);
    return result.result;
}

async function choosePublicProfilePicture(profileId, options = {}) {
    const file = await pickImage();
    if (!file) return null;
    const path = await uploadImage(file, { prefix: options.prefix || 'public-profile' });
    return setPublicProfilePicture(profileId, path, options);
}

async function setContactPicture(contactId, picture) {
    const store = phone();
    if (!store?.mutate) throw new Error('Pocket Phone is unavailable.');
    const idValue = String(contactId || '').trim();
    if (!idValue) throw new Error('Choose a private contact first.');
    const path = String(picture || '').trim().slice(0, 2048);
    return (await store.mutate(draft => {
        const contact = (draft.contacts || []).find(item => String(item.id || '') === idValue && !item.archived);
        if (!contact) throw new Error('That private contact is no longer available on this Story branch.');
        contact.presentation = { ...(contact.presentation || {}), picture: path };
        contact.updatedAt = Date.now();
        return { id: contact.id, actorKey: store.actorKey?.(contact.actor) || '' };
    })).result;
}

async function chooseContactPicture(contactId, options = {}) {
    const file = await pickImage();
    if (!file) return null;
    const path = await uploadImage(file, { prefix: options.prefix || 'contact-profile' });
    return setContactPicture(contactId, path);
}

export function initPhoneArtwork() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneArtwork: {
            pickImage,
            uploadImage,
            pickAndUpload,
            profilePicture,
            contactPicture,
            storyProfilePicture,
            setPublicProfilePicture,
            choosePublicProfilePicture,
            setContactPicture,
            chooseContactPicture,
            maxImageBytes: MAX_IMAGE_BYTES,
        },
    };
}
