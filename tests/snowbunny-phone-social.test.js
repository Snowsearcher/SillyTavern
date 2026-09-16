import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';

let globalState;
let chatState;

beforeAll(async () => {
    globalThis.SillyTavern = {
        getContext: () => ({
            getCurrentChatId: () => 'chat-1',
            characterId: 0,
            characters: [{ avatar: 'character.png' }],
            chat: [],
            name1: 'Player',
        }),
    };
    globalState = { stories: [] };
    chatState = {};
    globalThis.SnowBunny = {
        state: {
            readGlobal: () => globalState,
            patchGlobal: patch => { globalState = { ...globalState, ...patch }; },
            readChat: () => chatState,
            patchChat: patch => { chatState = { ...chatState, ...patch }; },
        },
    };

    const { initPhoneStore } = await import('../public/scripts/extensions/snowbunny-mobile/phone-store.js');
    initPhoneStore();
    const { initPhoneArtwork } = await import('../public/scripts/extensions/snowbunny-mobile/phone-artwork.js');
    initPhoneArtwork();
    const { initPhoneArtworkLibrary } = await import('../public/scripts/extensions/snowbunny-mobile/phone-artwork-library.js');
    initPhoneArtworkLibrary();
    const { initPhoneSocialNetwork } = await import('../public/scripts/extensions/snowbunny-mobile/phone-social-network.js');
    initPhoneSocialNetwork();
    const { initPhoneSocialActions } = await import('../public/scripts/extensions/snowbunny-mobile/phone-social-actions.js');
    initPhoneSocialActions();
    const { initPhoneSocialWorld } = await import('../public/scripts/extensions/snowbunny-mobile/phone-social-world.js');
    initPhoneSocialWorld();
});

beforeEach(() => {
    globalState = { stories: [] };
    chatState = {};
});

describe('SnowBunny Phone social post schema', () => {
    test('keeps old plain posts backward compatible', () => {
        const state = globalThis.SnowBunny.phone.normalize({
            posts: [{ id: 'old', authorActorKey: 'custom:old-user', text: 'Old saved post' }],
        });
        expect(state.schemaVersion).toBe(3);
        expect(state.posts).toHaveLength(1);
        expect(state.posts[0]).toMatchObject({
            id: 'old',
            format: 'status',
            title: '',
            space: '',
            replyTo: '',
            text: 'Old saved post',
            metrics: { likes: 0, reactions: 0, replies: 0, shares: 0 },
        });
        expect(state.social).toEqual({ followingActorKeys: [], savedPostIds: [], reactedPostIds: [] });
    });

    test('preserves structural fields used by mode-specific renderers', () => {
        const state = globalThis.SnowBunny.phone.normalize({
            posts: [{
                id: 'thread-1',
                authorActorKey: 'custom:poster',
                format: 'thread',
                title: '  Lost sword near the east gate  ',
                board: 'Adventurers',
                parentPostId: 'thread-root',
                text: 'Has anyone seen it?',
                metrics: { likes: 3.8, reactions: -1, replies: 2, shares: 1 },
            }],
        });
        expect(state.posts[0]).toMatchObject({
            format: 'thread',
            title: 'Lost sword near the east gate',
            space: 'Adventurers',
            replyTo: 'thread-root',
            metrics: { likes: 3, reactions: 0, replies: 2, shares: 1 },
        });
    });

    test('rejects unknown formats back to the safe status format', () => {
        const state = globalThis.SnowBunny.phone.normalize({
            posts: [{ authorActorKey: 'custom:poster', format: 'twitter-clone', text: 'Hello' }],
        });
        expect(state.posts[0].format).toBe('status');
    });

    test('keeps player interactions separate from generated public facts', () => {
        const state = globalThis.SnowBunny.phone.normalize({
            social: {
                followingActorKeys: ['custom:a', 'custom:a', '', 'custom:b'],
                savedPostIds: ['p1', 'p1', 'p2'],
                reactedPostIds: ['p2'],
            },
            posts: [{ id: 'p1', authorActorKey: 'custom:a', text: 'Untouched public fact', metrics: { likes: 4 } }],
        });
        expect(state.social).toEqual({
            followingActorKeys: ['custom:a', 'custom:b'],
            savedPostIds: ['p1', 'p2'],
            reactedPostIds: ['p2'],
        });
        expect(state.posts[0].metrics.likes).toBe(4);
    });
});

describe('Story social network identity', () => {
    test('normalizes the six supported modes with interaction grammar', () => {
        const normalize = globalThis.SnowBunny.phoneSocial.normalize;
        const forum = normalize({
            name: 'Guildwire',
            mode: 'forum',
            iconId: 'forum',
            terminology: {
                home: 'Boards', post: 'Thread', reply: 'Answer', profile: 'Member',
                community: 'Hall', like: 'Favor', following: 'Watching', saved: 'Kept', reshare: 'Quote',
            },
        });
        expect(forum).toMatchObject({
            name: 'Guildwire',
            mode: 'forum',
            iconId: 'forum',
            terminology: {
                home: 'Boards', post: 'Thread', reply: 'Answer', profile: 'Member',
                space: 'Hall', community: 'Hall', like: 'Favor', following: 'Watching', saved: 'Kept', reshare: 'Quote',
            },
        });

        const invalid = normalize({ name: 'Odd Net', mode: 'not-a-mode', iconId: 'invented-asset', terminology: {} });
        expect(invalid.mode).toBe('hybrid');
        expect(invalid.iconId).toBe('globe');
        expect(invalid.terminology).toEqual({
            home: 'Public', post: 'Entry', reply: 'Response', profile: 'Profile',
            space: 'Space', community: 'Space', reshare: 'Echo', like: 'Mark', following: 'Following', saved: 'Saved',
        });
    });

    test('gives each structural mode distinct default language', () => {
        const defaults = globalThis.SnowBunny.phoneSocial.defaultTerms;
        expect(defaults('forum')).toMatchObject({ home: 'Boards', post: 'Thread', space: 'Board', like: 'Upvote' });
        expect(defaults('bulletin')).toMatchObject({ home: 'Notices', post: 'Notice', space: 'Section', saved: 'Kept' });
        expect(defaults('image')).toMatchObject({ home: 'Explore', post: 'Share', space: 'Collection' });
        expect(defaults('microblog')).toMatchObject({ home: 'For you', reshare: 'Repost' });
    });
});

describe('public player identity boundary', () => {
    test('uses a stable public player actor without turning it into a private contact', () => {
        expect(globalThis.SnowBunny.phoneSocialActions.playerActorKey()).toBe('custom:player-public');
        const state = globalThis.SnowBunny.phone.normalize({
            profiles: [{
                id: 'you',
                actor: { kind: 'custom', key: 'player-public' },
                name: 'Player',
            }],
        });
        expect(state.profiles[0].id).toBe('you');
        expect(globalThis.SnowBunny.phone.actorKey(state.profiles[0].actor)).toBe('custom:player-public');
        expect(state.contacts).toEqual([]);
    });
});

describe('Phone artwork ownership', () => {
    test('preserves explicit public and private presentation pictures in Phone state', () => {
        const state = globalThis.SnowBunny.phone.normalize({
            profiles: [{ id: 'merchant', name: 'Merchant', picture: '/user/files/merchant.webp' }],
            contacts: [{ id: 'friend', name: 'Friend', presentation: { picture: '/user/files/friend.png' } }],
        });
        expect(state.profiles[0].picture).toBe('/user/files/merchant.webp');
        expect(state.contacts[0].presentation.picture).toBe('/user/files/friend.png');
        expect(globalThis.SnowBunny.phoneArtwork.contactPicture(state.contacts[0])).toBe('/user/files/friend.png');
    });

    test('uses Story-owned public artwork when a branch profile has no local override', () => {
        globalState = {
            stories: [{
                id: 'story-1',
                phoneArtwork: {
                    publicProfilePictures: {
                        merchant: '/user/files/story-merchant.webp',
                    },
                },
            }],
        };
        chatState = { storyId: 'story-1' };
        expect(globalThis.SnowBunny.phoneArtwork.profilePicture({ id: 'merchant', name: 'Merchant' }))
            .toBe('/user/files/story-merchant.webp');
    });

    test('keeps Story-shared public artwork consistent across branches even if one chat has stale presentation data', () => {
        globalState = {
            stories: [{
                id: 'story-1',
                phoneArtwork: { publicProfilePictures: { merchant: '/user/files/story.webp' } },
            }],
        };
        chatState = { storyId: 'story-1' };
        expect(globalThis.SnowBunny.phoneArtwork.profilePicture({
            id: 'merchant',
            name: 'Merchant',
            picture: '/user/files/old-local.webp',
        })).toBe('/user/files/story.webp');
    });

    test('keeps the player public profile picture chat-local instead of inheriting Story NPC art', () => {
        globalState = {
            stories: [{
                id: 'story-1',
                phoneArtwork: { publicProfilePictures: { you: '/user/files/wrong-story-player.webp' } },
            }],
        };
        chatState = { storyId: 'story-1' };
        expect(globalThis.SnowBunny.phoneArtwork.profilePicture({
            id: 'you',
            actor: { kind: 'custom', key: 'player-public' },
            name: 'Player',
            picture: '/user/files/player-local.webp',
        })).toBe('/user/files/player-local.webp');
    });

    test('stores reusable artwork folders on the Story when a Story owns the chat', () => {
        globalState = { stories: [{ id: 'story-1', title: 'Story' }] };
        chatState = { storyId: 'story-1' };
        const folder = globalThis.SnowBunny.phoneArtworkLibrary.createFolder('Faces');
        expect(folder.name).toBe('Faces');
        expect(globalState.stories[0].phoneArtwork.library.folders).toHaveLength(1);
        expect(globalState.stories[0].phoneArtwork.library.folders[0].name).toBe('Faces');
        expect(chatState.phoneArtworkLibrary).toBeUndefined();
    });

    test('keeps reusable artwork local for a stand-alone chat', () => {
        chatState = { storyId: '' };
        const folder = globalThis.SnowBunny.phoneArtworkLibrary.createFolder('Standalone art');
        expect(folder.name).toBe('Standalone art');
        expect(chatState.phoneArtworkLibrary.folders).toHaveLength(1);
        expect(globalState.stories).toEqual([]);
    });
});

describe('persistent background public identities', () => {
    test('reads Story-owned profiles ahead of chat-local fallback profiles', () => {
        globalState = {
            stories: [{
                id: 'story-1',
                socialWorld: {
                    profiles: [{
                        id: 'town-crier',
                        actor: { kind: 'custom', key: 'town-crier' },
                        name: 'Town Crier',
                        handle: 'crier',
                        bio: 'Public notices and market news.',
                    }],
                },
            }],
        };
        chatState = {
            storyId: 'story-1',
            socialWorld: { profiles: [{ id: 'local-only', name: 'Wrong Scope' }] },
        };

        const profiles = globalThis.SnowBunny.phoneSocialWorld.readProfiles();
        expect(profiles).toHaveLength(1);
        expect(profiles[0]).toMatchObject({ id: 'town-crier', name: 'Town Crier', handle: 'crier' });
    });

    test('uses chat-local public identities for a stand-alone chat', () => {
        chatState = {
            storyId: '',
            socialWorld: {
                profiles: [{
                    id: 'local-user',
                    actor: { kind: 'custom', key: 'local-user' },
                    name: 'Local User',
                }],
            },
        };
        expect(globalThis.SnowBunny.phoneSocialWorld.readProfiles()).toMatchObject([{ id: 'local-user', name: 'Local User' }]);
    });
});
