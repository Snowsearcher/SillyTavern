const MEMORY_SHEET_ID = 'snowbunny-memory-sheet';
const RECOVERY_ID = 'snowbunny-memory-recovery';
const STYLE_ID = 'snowbunny-memory-recovery-style';

let initialized = false;
let observer = null;
let queued = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function store() {
    return globalThis.SnowBunny?.memories ?? null;
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

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${MEMORY_SHEET_ID} .snowbunny-memory-tabs { grid-template-columns: repeat(3, 1fr); }
  #${RECOVERY_ID} {
    position: fixed; z-index: 12240; inset: 0; display: flex; align-items: flex-end; justify-content: center;
    background: rgb(0 0 0 / 48%);
  }
  #${RECOVERY_ID} .snowbunny-memory-recovery-card {
    width: min(100%, 680px); max-height: 91dvh; display: flex; flex-direction: column; overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 72%, transparent); border-bottom: 0;
    border-radius: 24px 24px 0 0; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 98%, #111 2%);
    color: var(--SmartThemeBodyColor); box-shadow: 0 -18px 54px rgb(0 0 0 / 38%);
  }
  #${RECOVERY_ID} .snowbunny-memory-recovery-handle { width: 38px; height: 4px; margin: 8px auto 2px; border-radius: 999px; background: currentColor; opacity: .24; }
  #${RECOVERY_ID} .snowbunny-memory-recovery-header { display: flex; align-items: center; gap: 8px; padding: 7px 10px 9px 16px; border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent); }
  #${RECOVERY_ID} .snowbunny-memory-recovery-header h3 { flex: 1; margin: 0; font-size: .98rem; }
  #${RECOVERY_ID} .snowbunny-memory-recovery-header button { width: 40px; height: 40px; border: 0; border-radius: 12px; background: transparent; color: inherit; }
  #${RECOVERY_ID} .snowbunny-memory-recovery-body { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 12px calc(16px + env(safe-area-inset-bottom)); }
  #${RECOVERY_ID} .snowbunny-memory-recovery-note { margin-bottom: 10px; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 52%, transparent); border-radius: 14px; font-size: .7rem; line-height: 1.42; opacity: .68; }
  #${RECOVERY_ID} .snowbunny-memory-revision { margin: 7px 0; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 56%, transparent); border-radius: 16px; background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 52%, transparent); }
  #${RECOVERY_ID} .snowbunny-memory-revision-head { display: flex; align-items: center; gap: 8px; }
  #${RECOVERY_ID} .snowbunny-memory-revision-head strong { flex: 1; min-width: 0; font-size: .8rem; }
  #${RECOVERY_ID} .snowbunny-memory-revision-head small { font-size: .62rem; opacity: .5; }
  #${RECOVERY_ID} .snowbunny-memory-revision p { margin: 6px 0 0; font-size: .7rem; line-height: 1.42; opacity: .7; }
  #${RECOVERY_ID} .snowbunny-memory-revision button { width: 100%; min-height: 38px; margin-top: 8px; border: 0; border-radius: 12px; background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent); color: inherit; font-weight: 720; }
  #${RECOVERY_ID} .snowbunny-memory-recovery-empty { padding: 24px 12px; text-align: center; font-size: .75rem; opacity: .56; }
}
`;
    document.head.append(style);
}

function closeRecovery() {
    document.getElementById(RECOVERY_ID)?.remove();
}

function recoverableRevision(revision) {
    if (!revision || typeof revision !== 'object') return false;
    if (Array.isArray(revision.before) && revision.before.length) return true;
    if (revision.type === 'proposal-accepted' && revision.proposal?.action === 'create') return true;
    return false;
}

function labelForRevision(revision) {
    if (revision.type === 'manual-edit' || revision.type === 'story-settings-edit') return 'Memory edited';
    if (revision.type === 'manual-delete' || revision.type === 'story-settings-delete') return 'Memory deleted';
    if (revision.type === 'proposal-accepted') {
        const action = revision.proposal?.action;
        if (action === 'create') return 'Memory Maker creation accepted';
        if (action === 'merge') return 'Memory Maker merge accepted';
        if (action === 'delete') return 'Memory Maker deletion accepted';
        return 'Memory Maker update accepted';
    }
    return 'Memory change';
}

function summaryForRevision(revision) {
    const before = Array.isArray(revision.before) ? revision.before : [];
    if (before.length) return before.map(memory => memory?.title).filter(Boolean).join(', ');
    if (revision.type === 'proposal-accepted' && revision.proposal?.action === 'create') return revision.proposal?.title || 'Created Memory';
    return '';
}

function proposalFromBefore(memory, state, revision) {
    const existing = state.memories.find(item => String(item.id) === String(memory.id));
    return store().normalizeProposal({
        id: store().newId('proposal'),
        batchId: store().newId('recovery'),
        baseVersion: state.version,
        action: existing ? 'edit' : 'create',
        targetIds: existing ? [String(existing.id)] : [],
        expected: existing ? [structuredClone(existing)] : [],
        title: memory.title,
        details: memory.details,
        reason: 'Restore this earlier saved version, as requested. Review it against the current story before accepting.',
        source: null,
        origin: {
            kind: 'revision-recovery',
            revisionAt: Number(revision.at) || 0,
            revisionType: String(revision.type || ''),
            originalMemoryId: String(memory.id || ''),
        },
        order: Math.max(0, ...state.memories.map(item => Number(item.order) || 0), ...state.proposals.map(item => Number(item.order) || 0)) + 1,
        createdAt: Date.now(),
    });
}

async function stageRecovery(revision) {
    const state = await store().read({ fresh: true });
    const proposals = [];
    const batchId = store().newId('recovery');
    let order = Math.max(0, ...state.memories.map(item => Number(item.order) || 0), ...state.proposals.map(item => Number(item.order) || 0));
    const before = Array.isArray(revision.before) ? revision.before : [];

    if (before.length) {
        for (const memory of before) {
            const existing = state.memories.find(item => String(item.id) === String(memory.id));
            const proposal = store().normalizeProposal({
                id: store().newId('proposal'),
                batchId,
                baseVersion: state.version,
                action: existing ? 'edit' : 'create',
                targetIds: existing ? [String(existing.id)] : [],
                expected: existing ? [structuredClone(existing)] : [],
                title: memory.title,
                details: memory.details,
                reason: 'Restore this earlier saved version, as requested. Review it against the current story before accepting.',
                source: null,
                origin: {
                    kind: 'revision-recovery',
                    revisionAt: Number(revision.at) || 0,
                    revisionType: String(revision.type || ''),
                    originalMemoryId: String(memory.id || ''),
                },
                order: ++order,
                createdAt: Date.now(),
            });
            if (proposal) proposals.push(proposal);
        }
    } else if (revision.type === 'proposal-accepted' && revision.proposal?.action === 'create') {
        const createdId = String(revision.proposal.id || '');
        const existing = state.memories.find(item => String(item.id) === createdId);
        if (existing) {
            const proposal = store().normalizeProposal({
                id: store().newId('proposal'),
                batchId,
                baseVersion: state.version,
                action: 'delete',
                targetIds: [createdId],
                expected: [structuredClone(existing)],
                title: existing.title,
                details: '',
                reason: 'Undo the creation of this Memory, as requested. Review the removal before accepting.',
                source: null,
                origin: { kind: 'revision-recovery', revisionAt: Number(revision.at) || 0, revisionType: 'proposal-create-undo' },
                order: ++order,
                createdAt: Date.now(),
            });
            if (proposal) proposals.push(proposal);
        }
    }

    if (!proposals.length) return 0;
    await store().setProposals([...(state.proposals || []), ...proposals]);
    document.dispatchEvent(new CustomEvent('snowbunny:memory-proposals-ready', { detail: { count: proposals.length, recovery: true } }));
    closeRecovery();
    return proposals.length;
}

async function openRecovery() {
    closeRecovery();
    const state = await store().read({ fresh: true });
    const root = el('div'); root.id = RECOVERY_ID;
    const card = el('section', 'snowbunny-memory-recovery-card');
    card.append(el('div', 'snowbunny-memory-recovery-handle'));
    const head = el('header', 'snowbunny-memory-recovery-header');
    head.append(icon('fa-clock-rotate-left'), el('h3', '', 'Memory History'));
    const close = el('button'); close.type = 'button'; close.append(icon('fa-xmark')); close.addEventListener('click', closeRecovery); head.append(close); card.append(head);
    const body = el('div', 'snowbunny-memory-recovery-body');
    body.append(el('div', 'snowbunny-memory-recovery-note', 'Recovery never silently rewrites Story history. Choosing a revision creates normal Memory proposals, which you review through the same Yes / No flow before anything changes.'));
    const revisions = [...(state.revisions || [])].filter(recoverableRevision).reverse();
    if (!revisions.length) body.append(el('div', 'snowbunny-memory-recovery-empty', 'No recoverable Memory revisions yet.'));
    for (const revision of revisions) {
        const item = el('article', 'snowbunny-memory-revision');
        const top = el('div', 'snowbunny-memory-revision-head');
        top.append(el('strong', '', labelForRevision(revision)), el('small', '', revision.at ? new Date(revision.at).toLocaleString() : 'Earlier revision'));
        item.append(top);
        const summary = summaryForRevision(revision);
        if (summary) item.append(el('p', '', summary));
        const recover = el('button', '', 'Review restore'); recover.type = 'button';
        recover.addEventListener('click', async () => {
            recover.disabled = true; recover.textContent = 'Preparing review…';
            try {
                const count = await stageRecovery(revision);
                if (!count) { recover.disabled = false; recover.textContent = 'Nothing to restore'; }
            } catch (error) {
                console.warn('[SnowBunny] Could not stage Memory recovery.', error);
                recover.disabled = false; recover.textContent = 'Try again';
            }
        });
        item.append(recover); body.append(item);
    }
    card.append(body); root.append(card); root.addEventListener('pointerdown', event => { if (event.target === root) closeRecovery(); }); document.body.append(root);
}

function enhanceMemorySheet() {
    queued = false;
    const sheet = document.getElementById(MEMORY_SHEET_ID);
    const tabs = sheet?.querySelector('.snowbunny-memory-tabs');
    if (!tabs || tabs.querySelector('[data-snowbunny-recovery="1"]')) return;
    const button = el('button', '', 'History'); button.type = 'button'; button.dataset.snowbunnyRecovery = '1';
    button.addEventListener('click', () => void openRecovery()); tabs.append(button);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhanceMemorySheet);
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(RECOVERY_ID)) {
        event.preventDefault(); closeRecovery();
    }
}

export function initMemoryRecovery() {
    if (initialized) return;
    initialized = true;
    installStyles();
    observer = new MutationObserver(queueEnhance);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', onKeyDown, true);
    queueEnhance();
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = { ...existing, memoryRecovery: { open: openRecovery, stage: stageRecovery } };
}
