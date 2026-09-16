let initialized = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function state() {
    return globalThis.SnowBunny?.state ?? null;
}

function memories() {
    return globalThis.SnowBunny?.memories ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function stories() {
    const value = state()?.readGlobal?.()?.stories;
    return Array.isArray(value) ? value : [];
}

function currentStoryId() {
    return String(state()?.readChat?.()?.storyId || '');
}

function currentRef() {
    return memories()?.currentRef?.() ?? null;
}

function refKey(ref) {
    return memories()?.refKey?.(ref) || `${ref?.kind || ''}:${ref?.owner || ''}:${ref?.chatId || ''}`;
}

function sameRef(a, b) {
    return Boolean(a && b && refKey(a) === refKey(b));
}

function storyById(storyId) {
    return stories().find(story => String(story?.id) === String(storyId)) ?? null;
}

function persistStories(next) {
    state()?.patchGlobal?.({ stories: next });
}

function removeRefEverywhere(nextStories, ref) {
    for (const story of nextStories) {
        story.chatRefs = (story.chatRefs || []).filter(candidate => !sameRef(candidate, ref));
    }
}

function addRefToStory(nextStories, storyId, ref) {
    const target = nextStories.find(story => String(story.id) === String(storyId));
    if (!target) return null;
    removeRefEverywhere(nextStories, ref);
    target.chatRefs = [...(target.chatRefs || []), clone(ref)];
    target.updatedAt = Date.now();
    return target;
}

function memoryKey(memory) {
    return `${String(memory?.title || '').trim().toLocaleLowerCase()}\n${String(memory?.details || '').trim().toLocaleLowerCase()}`;
}

function forkMemory(memory, story, at) {
    return memories().normalizeMemory({
        ...clone(memory),
        id: memories().newId('memory'),
        lineage: {
            kind: 'story-fork',
            originStoryId: String(story.id),
            originStoryTitle: String(story.title || 'Story'),
            originMemoryId: String(memory.id),
            forkedAt: at,
            previousLineage: memory.lineage ? clone(memory.lineage) : null,
        },
        updatedAt: at,
    });
}

function reconciliationProposals(localState, storyState, targetStory, archivePath) {
    const localMemories = localState?.memories || [];
    if (!localMemories.length) return [];
    const exact = new Set((storyState.memories || []).map(memoryKey));
    const byId = new Map((storyState.memories || []).map(memory => [String(memory.id), memory]));
    const pendingKeys = new Set((storyState.proposals || []).map(proposal => `${proposal.action}\n${memoryKey(proposal)}`));
    const chatRef = currentRef();
    const batchId = memories().newId('reconcile');
    let order = Math.max(
        0,
        ...(storyState.memories || []).map(item => Number(item.order) || 0),
        ...(storyState.proposals || []).map(item => Number(item.order) || 0),
    );
    const proposals = [];

    for (const local of localMemories) {
        if (exact.has(memoryKey(local))) continue;
        const lineage = local.lineage || {};
        const originMatchesTarget = String(lineage.originStoryId || '') === String(targetStory.id);
        const origin = originMatchesTarget ? byId.get(String(lineage.originMemoryId || '')) : null;
        const action = origin ? 'edit' : 'create';
        const targetIds = origin ? [String(origin.id)] : [];
        const candidateKey = `${action}\n${memoryKey(local)}`;
        if (pendingKeys.has(candidateKey)) continue;

        const proposal = memories().normalizeProposal({
            id: memories().newId('proposal'),
            batchId,
            baseVersion: Number(storyState.version) || 0,
            action,
            targetIds,
            expected: origin ? [clone(origin)] : [],
            title: local.title,
            details: local.details,
            reason: origin
                ? 'This chat was previously forked from this Story, and its local copy now differs. Review whether the shared Story Memory should be updated.'
                : 'This accepted stand-alone Memory belongs to the chat being joined. Review it before deciding whether it should become shared Story history.',
            source: null,
            origin: {
                kind: 'standalone-join-review',
                targetStoryId: String(targetStory.id),
                chatRef: clone(chatRef),
                localMemoryId: String(local.id),
                localLineage: local.lineage ? clone(local.lineage) : null,
                archivePath: String(archivePath || ''),
            },
            order: ++order,
            createdAt: Date.now(),
        });
        if (!proposal) continue;
        proposals.push(proposal);
        pendingKeys.add(candidateKey);
    }
    return proposals;
}

export async function detachCurrentFromStory() {
    const ref = currentRef();
    const sourceStoryId = currentStoryId();
    const sourceStory = storyById(sourceStoryId);
    if (!ref || !sourceStory) return { changed: false, memoryCount: 0, lorebookCount: 0 };

    await context()?.saveChat?.();
    const memoryState = await memories().readStory(sourceStory.id, { fresh: true });
    const effectiveLorebooks = lorebooks()?.effectiveIds?.() ?? [];
    const at = Date.now();
    const forkedMemories = (memoryState.memories || []).map(memory => forkMemory(memory, sourceStory, at));
    const localState = memories().normalizeState({
        version: 0,
        memories: forkedMemories,
        proposals: [],
        revisions: [{
            at,
            type: 'story-fork',
            fromStoryId: String(sourceStory.id),
            fromStoryTitle: String(sourceStory.title || 'Story'),
            sourceMemoryVersion: Number(memoryState.version) || 0,
            memoryCount: forkedMemories.length,
        }],
        lastReview: null,
        settings: clone(memoryState.settings || {}),
    });

    // Write the fork before changing ownership. This deliberately creates a new
    // local file so an older stand-alone archive can never leak back in.
    await memories().writeStandalone(localState, { forceNewFile: true });

    const nextStories = stories();
    const stored = nextStories.find(story => String(story.id) === sourceStoryId);
    if (stored) {
        stored.chatRefs = (stored.chatRefs || []).filter(candidate => !sameRef(candidate, ref));
        stored.updatedAt = at;
    }
    persistStories(nextStories);
    state()?.deleteChatKey?.('storyId');
    lorebooks()?.setChatIds?.(effectiveLorebooks);
    state()?.patchChat?.({
        memoryOwnershipLineage: {
            kind: 'story-fork',
            fromStoryId: sourceStoryId,
            fromStoryTitle: String(sourceStory.title || 'Story'),
            at,
        },
    });
    memories()?.resetCache?.();
    document.dispatchEvent(new CustomEvent('snowbunny:story-ownership-changed', {
        detail: { action: 'fork-to-standalone', storyId: sourceStoryId, chatRef: clone(ref) },
    }));
    document.dispatchEvent(new CustomEvent('snowbunny:memories-changed'));
    document.dispatchEvent(new CustomEvent('snowbunny:lorebook-bindings-changed'));
    return { changed: true, memoryCount: forkedMemories.length, lorebookCount: effectiveLorebooks.length };
}

export async function joinCurrentToStory(storyId) {
    const ref = currentRef();
    const targetStory = storyById(storyId);
    if (!ref || !targetStory) throw new Error('Open a chat and choose a valid Story first.');
    if (currentStoryId() === String(storyId)) return { changed: false, staged: 0 };

    // Story -> Story is intentionally fork-then-join. This preserves the old
    // continuity as local history before the destination Story becomes authoritative.
    if (currentStoryId()) await detachCurrentFromStory();

    const localState = await memories().readStandalone({ fresh: true });
    const archivePath = String(state()?.readChat?.()?.memoryFilePath || '');
    const storyState = await memories().readStory(storyId, { fresh: true });
    const proposals = reconciliationProposals(localState, storyState, targetStory, archivePath);

    if (proposals.length) {
        storyState.proposals = [...(storyState.proposals || []), ...proposals];
        storyState.revisions = [...(storyState.revisions || []), {
            at: Date.now(),
            type: 'standalone-join-staged',
            chatRef: clone(ref),
            localArchivePath: archivePath,
            proposalIds: proposals.map(proposal => proposal.id),
        }];
        await memories().writeStory(storyId, storyState);
    }

    const nextStories = stories();
    addRefToStory(nextStories, storyId, ref);
    persistStories(nextStories);
    state()?.patchChat?.({
        storyId: String(storyId),
        standaloneMemoryArchivePath: archivePath,
        memoryJoinReview: proposals.length ? {
            storyId: String(storyId),
            proposalIds: proposals.map(proposal => proposal.id),
            localArchivePath: archivePath,
            stagedAt: Date.now(),
        } : null,
    });
    memories()?.resetCache?.();
    document.dispatchEvent(new CustomEvent('snowbunny:story-ownership-changed', {
        detail: { action: 'join-story', storyId: String(storyId), chatRef: clone(ref), staged: proposals.length },
    }));
    document.dispatchEvent(new CustomEvent('snowbunny:memories-changed'));
    document.dispatchEvent(new CustomEvent('snowbunny:lorebook-bindings-changed'));
    if (proposals.length) {
        document.dispatchEvent(new CustomEvent('snowbunny:memory-proposals-ready', {
            detail: { count: proposals.length, reconciliation: true },
        }));
    }
    return { changed: true, staged: proposals.length, archivePath };
}

export async function moveCurrentToStory(storyId) {
    return joinCurrentToStory(storyId);
}

export function initStoryOwnership() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        storyOwnership: {
            detachCurrent: detachCurrentFromStory,
            joinCurrent: joinCurrentToStory,
            moveCurrent: moveCurrentToStory,
            currentStoryId,
            storyById,
        },
    };
}
