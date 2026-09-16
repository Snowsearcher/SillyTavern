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
    const { initPhoneSocialNetwork } = await import('../public/scripts/extensions/snowbunny-mobile/phone-social-network.js');
    initPhoneSocialNetwork();
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
        expect(state.schemaVersion).toBe(2);
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
});

describe('Story social network identity', () => {
    test('normalizes the six supported interaction modes and terminology safely', () => {
        const normalize = globalThis.SnowBunny.phoneSocial.normalize;
        const forum = normalize({
            name: 'Guildwire',
            mode: 'forum',
            iconId: 'forum',
            terminology: { home: 'Boards', post: 'Thread', reply: 'Answer', profile: 'Member', community: 'Hall' },
        });
        expect(forum).toMatchObject({
            name: 'Guildwire',
            mode: 'forum',
            iconId: 'forum',
            terminology: { home: 'Boards', post: 'Thread', reply: 'Answer', profile: 'Member', community: 'Hall' },
        });

        const invalid = normalize({ name: 'Odd Net', mode: 'not-a-mode', iconId: 'invented-asset', terminology: {} });
        expect(invalid.mode).toBe('hybrid');
        expect(invalid.iconId).toBe('globe');
        expect(invalid.terminology).toEqual({ home: 'Feed', post: 'Post', reply: 'Reply', profile: 'Profile', community: 'Community' });
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
