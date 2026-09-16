import { beforeAll, describe, expect, test } from '@jest/globals';

beforeAll(async () => {
    globalThis.SnowBunny = {
        phone: {
            anchorVisible: anchor => String(anchor?.messageId || '') !== 'gone',
            sourceValid: evidence => !(Array.isArray(evidence) && evidence.some(item => String(item?.messageId || '') === 'edited')),
        },
    };
    const { initPhoneHistoryStatus } = await import('../public/scripts/extensions/snowbunny-mobile/phone-history-status.js');
    initPhoneHistoryStatus();
});

describe('Phone continuity status', () => {
    test('reports stale branch-derived records by category without deleting them', () => {
        const state = {
            contacts: [{
                id: 'stale-contact',
                acquiredThrough: { messageId: 'gone' },
                acquiredEvidence: [],
                messages: [
                    { id: 'current-message', through: { messageId: 'current' }, evidence: [] },
                    { id: 'stale-message', through: { messageId: 'current' }, evidence: [{ messageId: 'edited' }] },
                ],
            }],
            profiles: [
                { id: 'current-profile', through: { messageId: 'current' }, evidence: [] },
                { id: 'stale-profile', through: { messageId: 'gone' }, evidence: [] },
            ],
            posts: [
                { id: 'current-post', through: { messageId: 'current' }, evidence: [] },
                { id: 'stale-post', through: { messageId: 'current' }, evidence: [{ messageId: 'edited' }] },
            ],
            actions: [
                { id: 'stale-action', through: { messageId: 'gone' }, evidence: [] },
            ],
        };

        const snapshot = structuredClone(state);
        const report = globalThis.SnowBunny.phoneHistoryStatus.inspect(state);
        expect(report.stale).toEqual({
            contacts: 1,
            messages: 1,
            profiles: 1,
            posts: 1,
            actions: 1,
        });
        expect(report.staleTotal).toBe(5);
        expect(report.total).toBe(8);
        expect(report.currentTotal).toBe(3);
        expect(state).toEqual(snapshot);
    });

    test('reports a clean current branch without inventing stale items', () => {
        const report = globalThis.SnowBunny.phoneHistoryStatus.inspect({
            contacts: [{ acquiredThrough: { messageId: 'current' }, acquiredEvidence: [], messages: [] }],
            profiles: [],
            posts: [],
            actions: [],
        });
        expect(report.staleTotal).toBe(0);
        expect(report.currentTotal).toBe(1);
    });
});
