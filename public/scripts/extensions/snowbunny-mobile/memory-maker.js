let initialized = false;
let reviewing = false;
let lastError = '';

const MEMORY_MAKER_PROMPT = `You keep useful memories of what actually happened in this fictional story. Propose changes for the user's review. Never treat a suggestion as saved.

Write clearly in natural sentences. Keep the smallest complete account that preserves useful specifics. A memory must make sense without the original chat beside it. Identify people and the actual event, place, organization, promise, secret, cause, outcome, and necessary context when they matter. Keep uncertainty explicit.

Save distinctive events with future usefulness. Ordinary conversation, routine affection, or an unchanged condition does not deserve a memory just because a review ran. Record what happened, not a generic list of ongoing objectives.

Before creating a memory, look for an earlier account of the same event or connected episode. Prefer updating or merging connected memories when that produces one clearer historical account. Preserve useful chronology and lasting consequences. Propose deletion only when an accepted memory is actually wrong, duplicated, or no longer useful as history.

STRICT EVIDENCE RULES: use only the visible story messages supplied in this review, the accepted memories supplied for comparison, and the user's correction when revising a proposal. Do not infer historical facts from trackers, Scenario, Lorebooks/Codex, hidden thoughts/state, instructions, unchosen CYOA paths, or other support systems. Those are intentionally not provided to you.

Return JSON only in this shape:
{"proposals":[{"action":"create|edit|merge|delete","targetIds":[],"title":"short readable title","details":"the memory in clear natural language","reason":"one brief concrete reason to keep or change it"}]}

Use existing memory IDs for edit/merge/delete. Create uses an empty targetIds list. At most six focused proposals. {"proposals":[]} is correct when nothing needs saving or changing.`;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function store() {
    return globalThis.SnowBunny?.memories ?? null;
}

function visibleStory(limit = 40) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    return api.chat
        .filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(2, limit))
        .map(message => ({
            speaker: message.name || (message.is_user ? api.name1 : api.name2) || (message.is_user ? 'User' : 'Assistant'),
            role: message.is_user ? 'user' : 'assistant',
            text: String(message.mes || ''),
            identity: globalThis.SnowBunny?.identity?.current?.(message) || message.extra?.snowbunny || {},
        }));
}

function stripFence(text) {
    const value = String(text || '').trim();
    const match = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(value);
    return match ? match[1].trim() : value;
}

function parsePayload(text) {
    let decoded;
    try {
        decoded = JSON.parse(stripFence(text));
    } catch (_) {
        throw new Error('Memory Maker did not return complete proposal JSON. Nothing was changed.');
    }
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded) || !Array.isArray(decoded.proposals) || decoded.proposals.length > 6) {
        throw new Error('Memory Maker returned an invalid proposal list. Nothing was changed.');
    }
    return decoded.proposals;
}

function proposalKey(proposal) {
    return JSON.stringify([
        proposal.action,
        [...(proposal.targetIds || [])].sort(),
        String(proposal.title || '').trim().toLowerCase(),
        String(proposal.details || '').trim().toLowerCase(),
    ]);
}

function buildProposals(rawList, state, source, { allowEdits = true, revisedFrom = '' } = {}) {
    const known = new Map((state.memories || []).map(memory => [memory.id, memory]));
    const pendingKeys = new Set((state.proposals || []).filter(item => item.id !== revisedFrom).map(proposalKey));
    const proposals = [];
    let nextOrder = Math.max(
        0,
        ...(state.memories || []).map(item => Number(item.order) || 0),
        ...(state.proposals || []).map(item => Number(item.order) || 0),
    );

    for (const raw of rawList) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Memory Maker returned an invalid proposal.');
        const action = String(raw.action || '');
        const targetIds = Array.isArray(raw.targetIds) ? raw.targetIds.map(String) : null;
        if (!['create', 'edit', 'merge', 'delete'].includes(action) || !targetIds) throw new Error('Memory Maker returned an invalid change type.');
        if (new Set(targetIds).size !== targetIds.length) throw new Error('Memory Maker repeated a target Memory in one suggestion.');
        if (targetIds.some(memoryId => !known.has(memoryId))) throw new Error('Memory Maker referenced a Memory that does not exist.');
        if (action === 'create' && targetIds.length !== 0) throw new Error('A create suggestion cannot target an existing Memory.');
        if (action === 'edit' && targetIds.length !== 1) throw new Error('An edit suggestion must target exactly one Memory.');
        if (action === 'merge' && targetIds.length < 2) throw new Error('A merge suggestion must target at least two Memories.');
        if (action === 'delete' && targetIds.length < 1) throw new Error('A delete suggestion must target at least one Memory.');
        if (!allowEdits && action !== 'create') continue;

        const title = String(raw.title || '').trim();
        const details = String(raw.details || '').trim();
        const reason = String(raw.reason || '').trim();
        if (!title || title.length > 1000 || !reason || reason.length > 1000 || details.length > 12000 || (action !== 'delete' && !details)) {
            throw new Error('Memory Maker returned invalid title/details/reason text.');
        }

        const api = context();
        const proposal = store()?.normalizeProposal?.({
            id: api?.uuidv4?.() || `${Date.now()}-${proposals.length}-${Math.random().toString(36).slice(2)}`,
            baseVersion: state.version,
            action,
            targetIds,
            expected: targetIds.map(memoryId => structuredClone(known.get(memoryId))),
            title,
            details,
            reason,
            source: structuredClone(source),
            order: ++nextOrder,
            createdAt: Date.now(),
            revisedFrom,
        });
        if (!proposal) continue;
        const key = proposalKey(proposal);
        if (pendingKeys.has(key) || proposals.some(item => proposalKey(item) === key)) continue;
        proposals.push(proposal);
    }
    return proposals;
}

function storyTranscript(rows) {
    return rows.map(row => `${row.speaker}: ${row.text}`).join('\n\n');
}

function readingMemories(state, proposal = null) {
    const required = new Set(proposal?.targetIds || []);
    const memories = state.memories || [];
    if (memories.length <= 80) return memories;
    const recent = memories.slice(-70);
    const extras = memories.filter(memory => required.has(memory.id) && !recent.some(item => item.id === memory.id));
    return [...extras, ...recent];
}

async function review({ proposalId = '', correction = '', feedbackDecision = '' } = {}) {
    if (reviewing) return { count: 0, busy: true };
    const api = context();
    if (!api?.getCurrentChatId?.() || typeof api.generateRaw !== 'function') throw new Error('Open a connected chat before asking Memory Maker.');

    reviewing = true;
    lastError = '';
    document.dispatchEvent(new CustomEvent('snowbunny:memory-maker-status', { detail: { reviewing: true } }));
    try {
        const state = await store().read({ fresh: true });
        const settings = state.settings || {};
        const prior = proposalId ? state.proposals.find(item => item.id === proposalId) : null;
        if (proposalId && !prior) throw new Error('That Memory suggestion is no longer pending.');

        const rows = visibleStory(settings.historyCount || 40);
        if (!rows.length) return { count: 0 };
        const source = store().sourceSnapshot(settings.historyCount || 40);
        const memories = readingMemories(state, prior);
        const pending = state.proposals
            .filter(item => item.id !== proposalId)
            .map(item => ({
                action: item.action,
                targetIds: item.targetIds,
                title: item.title,
                details: item.details,
            }));

        const revisionText = prior
            ? `\n\nReview ONLY this one pending suggestion again:\n${JSON.stringify({
                action: prior.action,
                targetIds: prior.targetIds,
                title: prior.title,
                details: prior.details,
                reason: prior.reason,
            })}\nUser decision on the current version: ${feedbackDecision || 'feedback'}\nUser correction/explanation: ${String(correction || '').trim()}\nReturn exactly one revised proposal or none. The revised result still requires approval.`
            : '';

        const userPrompt = `Existing accepted Memories, in story order:\n${JSON.stringify(memories.map(memory => ({
            id: memory.id,
            title: memory.title,
            details: memory.details,
        })))}\n\nAlready pending suggestions (do not duplicate):\n${JSON.stringify(pending)}\n\nRecent visible story evidence:\n${storyTranscript(rows)}${revisionText}`;

        const result = await api.generateRaw({
            prompt: userPrompt,
            systemPrompt: `${MEMORY_MAKER_PROMPT}${settings.instructions ? `\n\nAdditional user instructions for Memory Maker:\n${settings.instructions}` : ''}`,
            responseLength: settings.replyLimit || 4096,
            trimNames: false,
        });

        if (!store().sourceStillValid(source)) {
            throw new Error('The story changed while Memory Maker was reviewing it. Request a fresh review.');
        }
        const latest = await store().read({ fresh: true });
        if (latest.version !== state.version) throw new Error('Accepted Memories changed during this review. Try again.');

        const raw = parsePayload(result);
        const proposals = buildProposals(raw, latest, source, {
            allowEdits: latest.settings?.allowEdits !== false,
            revisedFrom: proposalId,
        });
        if (prior && proposals.length > 1) throw new Error('Memory Maker returned more than one revision for a single suggestion.');

        const lastReview = {
            chatRef: store().currentRef(),
            throughMessageId: source.messages?.at(-1)?.id || '',
            at: Date.now(),
        };
        if (prior) {
            await store().replaceProposal(proposalId, proposals, { lastReview });
        } else {
            await store().setProposals([...(latest.proposals || []), ...proposals], { lastReview });
        }

        document.dispatchEvent(new CustomEvent('snowbunny:memory-proposals-ready', { detail: { count: proposals.length, revised: Boolean(prior) } }));
        return { count: proposals.length, revised: Boolean(prior) };
    } catch (error) {
        lastError = String(error?.message || error);
        console.warn('[SnowBunny] Memory Maker review failed.', error);
        document.dispatchEvent(new CustomEvent('snowbunny:memory-maker-error', { detail: { message: lastError } }));
        throw error;
    } finally {
        reviewing = false;
        document.dispatchEvent(new CustomEvent('snowbunny:memory-maker-status', { detail: { reviewing: false } }));
    }
}

function completedAssistantMessagesAfter(lastReview) {
    const api = context();
    if (!Array.isArray(api?.chat)) return 0;
    const ignore = api?.symbols?.ignore;
    const messages = api.chat.filter(message => message && !message.is_system && !(ignore && message.extra?.[ignore]));
    let start = 0;
    const throughId = lastReview?.throughMessageId;
    if (throughId) {
        const index = messages.findIndex(message => {
            const identity = globalThis.SnowBunny?.identity?.current?.(message) || message.extra?.snowbunny || {};
            return identity.id === throughId;
        });
        if (index >= 0) start = index + 1;
    }
    return messages.slice(start).filter(message => !message.is_user).length;
}

async function maybeAutoReview() {
    if (reviewing) return;
    const memoryStore = store();
    if (!memoryStore || !context()?.getCurrentChatId?.()) return;
    const state = await memoryStore.read();
    const settings = state.settings || {};
    if (settings.automatic === false) return;
    const due = completedAssistantMessagesAfter(state.lastReview) >= Math.max(1, Number(settings.frequency) || 5);
    if (!due) return;
    try {
        await review();
    } catch (_) {
        // Error state is surfaced by Memory UI; never interrupt story generation with an automatic review failure.
    }
}

function status() {
    return { reviewing, lastError };
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    if (types.MESSAGE_RECEIVED) {
        source.on(types.MESSAGE_RECEIVED, messageId => {
            const index = Number(messageId);
            const message = Number.isInteger(index) ? api.chat?.[index] : api.chat?.at?.(-1);
            if (!message || message.is_user || message.is_system) return;
            window.setTimeout(() => void maybeAutoReview(), 0);
        });
    }
}

export function initMemoryMaker() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object'
        ? globalThis.SnowBunny
        : {};
    globalThis.SnowBunny = {
        ...existing,
        memoryMaker: {
            review,
            maybeAutoReview,
            status,
            prompt: MEMORY_MAKER_PROMPT,
        },
    };
}
