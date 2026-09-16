const LIBRARY_VERSION = 1;
const MAX_IMPORT_FILES = 60;
const MAX_FOLDER_IMAGES = 500;

let initialized = false;

function phoneArtwork() {
    return globalThis.SnowBunny?.phoneArtwork ?? null;
}

function stateApi() {
    return globalThis.SnowBunny?.state ?? null;
}

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function id(prefix) {
    const value = context()?.uuidv4?.() || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${String(value).replaceAll('-', '')}`;
}

function cleanName(value, fallback = 'Artwork') {
    return String(value || fallback).trim().replace(/\s+/g, ' ').slice(0, 80) || fallback;
}

function normalizeImage(value) {
    if (!value || typeof value !== 'object') return null;
    const path = String(value.path || '').trim();
    if (!path) return null;
    return {
        id: String(value.id || id('art')),
        name: cleanName(value.name, 'Image'),
        path,
        addedAt: Number(value.addedAt) || Date.now(),
    };
}

function normalizeFolder(value, index = 0) {
    if (!value || typeof value !== 'object') return null;
    const images = (Array.isArray(value.images) ? value.images : [])
        .map(normalizeImage)
        .filter(Boolean)
        .slice(0, MAX_FOLDER_IMAGES);
    return {
        id: String(value.id || id('folder')),
        name: cleanName(value.name, `Artwork ${index + 1}`),
        images,
        createdAt: Number(value.createdAt) || Date.now(),
        updatedAt: Number(value.updatedAt) || Number(value.createdAt) || Date.now(),
    };
}

function normalizeLibrary(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        version: LIBRARY_VERSION,
        folders: (Array.isArray(source.folders) ? source.folders : []).map(normalizeFolder).filter(Boolean),
        networkImage: String(source.networkImage || ''),
        updatedAt: Number(source.updatedAt) || 0,
    };
}

function currentStoryContainer() {
    const api = stateApi();
    const storyId = String(api?.readChat?.()?.storyId || '');
    if (!storyId) return null;
    const globalState = api?.readGlobal?.();
    const stories = Array.isArray(globalState?.stories) ? globalState.stories : [];
    const story = stories.find(item => String(item?.id || '') === storyId);
    return story ? { api, stories, story } : null;
}

function read() {
    const story = currentStoryContainer()?.story;
    if (story) return clone(normalizeLibrary(story?.phoneArtwork?.library));
    return clone(normalizeLibrary(stateApi()?.readChat?.()?.phoneArtworkLibrary));
}

function write(input) {
    const library = normalizeLibrary({ ...input, updatedAt: Date.now() });
    const storyContainer = currentStoryContainer();
    if (storyContainer) {
        const { api, stories, story } = storyContainer;
        const phoneArtwork = story.phoneArtwork && typeof story.phoneArtwork === 'object' ? story.phoneArtwork : {};
        story.phoneArtwork = { ...phoneArtwork, library: clone(library), updatedAt: Date.now() };
        story.updatedAt = Date.now();
        api?.patchGlobal?.({ stories });
    } else {
        stateApi()?.patchChat?.({ phoneArtworkLibrary: clone(library) });
    }
    document.dispatchEvent(new CustomEvent('snowbunny:phone-artwork-library-changed', { detail: { library: clone(library) } }));
    return clone(library);
}

function createFolder(name) {
    const library = read();
    const folder = normalizeFolder({
        id: id('folder'),
        name: cleanName(name, `Artwork ${library.folders.length + 1}`),
        images: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }, library.folders.length);
    library.folders.push(folder);
    write(library);
    return clone(folder);
}

function renameFolder(folderId, name) {
    const library = read();
    const folder = library.folders.find(item => item.id === String(folderId || ''));
    if (!folder) throw new Error('That artwork folder no longer exists.');
    folder.name = cleanName(name, folder.name);
    folder.updatedAt = Date.now();
    write(library);
    return clone(folder);
}

function removeFolder(folderId) {
    const library = read();
    const before = library.folders.length;
    library.folders = library.folders.filter(item => item.id !== String(folderId || ''));
    if (library.folders.length === before) return false;
    write(library);
    return true;
}

function pickImages() {
    return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/avif';
        input.style.position = 'fixed';
        input.style.left = '-10000px';
        document.body.append(input);
        let settled = false;
        const finish = files => {
            if (settled) return;
            settled = true;
            input.remove();
            resolve(files || []);
        };
        input.addEventListener('change', () => finish([...input.files || []]), { once: true });
        window.addEventListener('focus', () => window.setTimeout(() => finish([...input.files || []]), 250), { once: true });
        input.click();
    });
}

async function importImages(folderId, files) {
    const library = read();
    const folder = library.folders.find(item => item.id === String(folderId || ''));
    if (!folder) throw new Error('Choose an artwork folder first.');
    const rows = [...files || []].slice(0, MAX_IMPORT_FILES);
    if (!rows.length) return [];
    if (folder.images.length + rows.length > MAX_FOLDER_IMAGES) throw new Error(`An artwork folder can hold at most ${MAX_FOLDER_IMAGES} images.`);
    const uploader = phoneArtwork();
    if (!uploader?.uploadImage) throw new Error('Pocket Phone image upload is unavailable.');
    const imported = [];
    for (const file of rows) {
        const path = await uploader.uploadImage(file, { prefix: `library-${folder.name}` });
        imported.push({
            id: id('art'),
            name: cleanName(file.name?.replace(/\.[^.]+$/, ''), 'Image'),
            path,
            addedAt: Date.now() + imported.length,
        });
    }
    folder.images.push(...imported);
    folder.updatedAt = Date.now();
    write(library);
    return clone(imported);
}

async function importFromPicker(folderId) {
    const files = await pickImages();
    if (!files.length) return [];
    return importImages(folderId, files);
}

function findImage(imageId) {
    const library = read();
    for (const folder of library.folders) {
        const image = folder.images.find(item => item.id === String(imageId || ''));
        if (image) return clone({ ...image, folderId: folder.id, folderName: folder.name });
    }
    return null;
}

async function assignPublicProfile(profileId, imageId) {
    const image = findImage(imageId);
    if (!image) throw new Error('That artwork image no longer exists.');
    await phoneArtwork()?.setPublicProfilePicture?.(profileId, image.path);
    return image;
}

async function assignContact(contactId, imageId) {
    const image = findImage(imageId);
    if (!image) throw new Error('That artwork image no longer exists.');
    await phoneArtwork()?.setContactPicture?.(contactId, image.path);
    return image;
}

function setNetworkImage(imageId = '') {
    const library = read();
    if (!imageId) {
        library.networkImage = '';
        write(library);
        return '';
    }
    const image = findImage(imageId);
    if (!image) throw new Error('That artwork image no longer exists.');
    library.networkImage = image.path;
    write(library);
    return image.path;
}

function networkImage() {
    return String(read().networkImage || '');
}

export function initPhoneArtworkLibrary() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneArtworkLibrary: {
            read,
            createFolder,
            renameFolder,
            removeFolder,
            pickImages,
            importImages,
            importFromPicker,
            findImage,
            assignPublicProfile,
            assignContact,
            setNetworkImage,
            networkImage,
            maxImportFiles: MAX_IMPORT_FILES,
            maxFolderImages: MAX_FOLDER_IMAGES,
        },
    };
}
