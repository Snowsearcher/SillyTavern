import {
    characters,
    eventSource,
    event_types,
    getCharacters,
    getRequestHeaders,
    renameCharacter as renameCurrentCharacter,
    saveSettingsDebounced,
} from '../../../script.js';
import { extension_settings } from '../../extensions.js';
import { renameGroupMember } from '../../group-chats.js';
import { renameTagKey } from '../../tags.js';
import { getCharaFilename } from '../../utils.js';
import { world_info } from '../../world-info.js';

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function snowState() {
    return globalThis.SnowBunny?.state ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function currentCharacterAvatar() {
    const api = context();
    if (api?.groupId) return '';
    const index = Number.parseInt(String(api?.characterId ?? ''), 10);
    return Number.isInteger(index) ? String(api?.characters?.[index]?.avatar || '') : '';
}

function characterByAvatar(avatar) {
    return characters.find(character => String(character?.avatar || '') === String(avatar || '')) || null;
}

function updateStoryReferences(oldAvatar, newAvatar, entityId = '') {
    const state = snowState();
    const global = state?.readGlobal?.();
    const stories = Array.isArray(global?.stories) ? structuredClone(global.stories) : [];
    let changed = false;

    for (const story of stories) {
        if (Array.isArray(story.chatRefs)) {
            for (const ref of story.chatRefs) {
                if (ref?.kind === 'character' && String(ref.owner || '') === oldAvatar) {
                    ref.owner = newAvatar;
                    changed = true;
                }
            }
        }

        const profiles = story?.socialWorld?.profiles;
        if (Array.isArray(profiles)) {
            for (const profile of profiles) {
                const actor = profile?.actor;
                if (!actor || actor.kind !== 'character') continue;
                if (String(actor.avatar || '') === oldAvatar || (entityId && String(actor.entityId || '') === entityId)) {
                    actor.avatar = newAvatar;
                    changed = true;
                }
            }
        }

        const posts = story?.socialWorld?.posts;
        if (Array.isArray(posts)) {
            for (const post of posts) {
                if (String(post?.authorActorKey || '') === `character:${oldAvatar}`) {
                    post.authorActorKey = entityId ? `entity:${entityId}` : `character:${newAvatar}`;
                    changed = true;
                }
            }
        }
    }

    if (changed) state?.patchGlobal?.({ stories });
}

async function updateCodexReferences(oldAvatar, newAvatar, entityId = '') {
    const store = lorebooks();
    const summaries = store?.list?.();
    if (!Array.isArray(summaries)) return;

    for (const summary of summaries) {
        const book = await store?.load?.(summary.id);
        if (!book || !Array.isArray(book.entries)) continue;
        let changed = false;
        for (const entry of book.entries) {
            const link = entry?.link;
            if (link?.kind !== 'character') continue;
            if (String(link.avatar || '') === oldAvatar || (entityId && String(link.entityId || '') === entityId)) {
                link.avatar = newAvatar;
                if (entityId) link.entityId = entityId;
                changed = true;
            }
        }
        if (changed) await store?.save?.(book);
    }
}

async function updateSnowBunnyReferences(oldAvatar, newAvatar, entityId = '') {
    updateStoryReferences(oldAvatar, newAvatar, entityId);
    await updateCodexReferences(oldAvatar, newAvatar, entityId);
    document.dispatchEvent(new CustomEvent('snowbunny:character-renamed', {
        detail: { oldAvatar, newAvatar, entityId },
    }));
}

async function renameNonCurrentCharacter(oldAvatar, newName) {
    const response = await fetch('/api/characters/rename', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ avatar_url: oldAvatar, new_name: newName }),
    });
    if (!response.ok) throw new Error(`Character rename failed (${response.status}).`);
    const data = await response.json();
    const newAvatar = String(data?.avatar || '');
    if (!newAvatar) throw new Error('SillyTavern did not return the renamed Character avatar.');

    const oldFileName = getCharaFilename(null, { manualAvatarKey: oldAvatar });
    const newFileName = getCharaFilename(null, { manualAvatarKey: newAvatar });

    renameTagKey(oldAvatar, newAvatar);

    const charLore = world_info.charLore?.find(item => item.name === oldFileName);
    if (charLore) {
        charLore.name = newFileName;
        saveSettingsDebounced();
    }

    const charNote = extension_settings.note?.chara?.find(item => item.name === oldFileName);
    if (charNote) {
        charNote.name = newFileName;
        saveSettingsDebounced();
    }

    await eventSource.emit(event_types.CHARACTER_RENAMED, oldAvatar, newAvatar);
    await renameGroupMember(oldAvatar, newAvatar, newName);
    await getCharacters();
    return newAvatar;
}

export async function renameCharacterForSnowBunny(oldAvatar, newName, entityId = '') {
    oldAvatar = String(oldAvatar || '');
    newName = String(newName || '').trim();
    if (!oldAvatar || !newName) throw new Error('Character name is required.');

    const current = characterByAvatar(oldAvatar);
    if (!current) throw new Error('Character no longer exists.');
    if (String(current.name || '').trim() === newName) return oldAvatar;

    let newAvatar = '';
    if (currentCharacterAvatar() === oldAvatar) {
        const ok = await renameCurrentCharacter(newName, { silent: true, renameChats: false });
        if (!ok) throw new Error('SillyTavern could not rename the current Character.');
        const renamed = characters.find(character => String(character?.name || '').trim() === newName);
        newAvatar = String(renamed?.avatar || currentCharacterAvatar() || '');
    } else {
        newAvatar = await renameNonCurrentCharacter(oldAvatar, newName);
    }

    if (!newAvatar) throw new Error('Renamed Character could not be found.');
    await updateSnowBunnyReferences(oldAvatar, newAvatar, entityId);
    return newAvatar;
}
