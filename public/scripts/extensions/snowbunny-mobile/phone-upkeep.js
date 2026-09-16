const MAX_DISCOVERIES = 12;
const MAX_PROACTIVE_CONTACTS = 2;

let initialized = false;
let busy = false;
let queue = [];

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function conversation() {
    return globalThis.SnowBunny?.phoneConversation ?? null;
}

function lorebooks() {
    return globalThis.SnowBunny?.lorebooks ?? null;
}

function trackerStore() {
    return globalThis.SnowBunny?.trackers ?? null;
}

function cleanChoiceMarkup(value) {
    return String(value || '').replace(/<choicecard\b[^>]*>[\s\S]*?<\/choicecard>/gi, '').trim();
}

function stripFence(text) {
    const value = String(text || '').trim();
    const match = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(value);
    return match ? match[1].trim() : value;
}

function parseJson(text, label) {
    try {
        const value = JSON.parse(stripFence(text));
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
        return value;
    } catch (_) {
        throw new Error(`${label} returned invalid JSON. Existing Phone state was kept.`);
    }
}

function identityFor(message) {
    return globalThis.SnowBunny?.identity?.current?.(message) || message?.extra?.snowbunny || {};
}

function anchorFor(message) {
    const identity = identityFor(message);
    return {
        messageId: String(identity.id || ''),
        revision: Number(identity.revision) || 0,
        source: String(identity.source || ''),
    };
}

function visibleStory(endIndex, limit = 30) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    const end = Math.max(0, Math.min(api.chat.length - 1, Number(endIndex)));
    return api.chat
        .slice(0, end + 1)
        .map((message, index) => ({ message, index }))
        .filter(({ message }) => message && !message.is_system && !(ignore && message.extra?.[ignore]))
        .slice(-Math.max(4, Number(limit) || 30))
        .map(({ message, index }) => {
            const anchor = anchorFor(message);
            return {
                index,
                messageId: anchor.messageId,
                revision: anchor.revision,
                source: anchor.source,
                speaker: message.name || (message.is_user ? api.name1 : api.name2) || (message.is_user ? 'User' : 'Assistant'),
                role: message.is_user ? 'user' : 'assistant',
                text: cleanChoiceMarkup(message.mes),
            };
        })
        .filter(row => row.messageId && row.text);
}

function messageIndexByIdentity(messageId) {
    const api = context();
    if (!Array.isArray(api?.chat)) return -1;
    return api.chat.findIndex(message => String(identityFor(message).id || '') === String(messageId || ''));
}

function assistantIndexesBetween(startIndex, endIndex) {
    const api = context();
    if (!Array.isArray(api?.chat)) return [];
    const ignore = api?.symbols?.ignore;
    const indexes = [];
    for (let index = Math.max(0, startIndex); index <= Math.min(endIndex, api.chat.length - 1); index++) {
        const message = api.chat[index];
        if (!message || message.is_user || message.is_system || (ignore && message.extra?.[ignore])) continue;
        indexes.push(index);
    }
    return indexes;
}

function lastUpkeepAnchor(state) {
    return [...(Array.isArray(state?.activity) ? state.activity : [])].reverse().find(item => item?.kind === 'upkeep-run')?.through || null;
}

function due(state, targetIndex, force = false) {
    if (force) return true;
    if (state?.settings?.upkeep?.enabled !== true) return false;
    const previous = lastUpkeepAnchor(state);
    const previousIndex = previous?.messageId ? messageIndexByIdentity(previous.messageId) : -1;
    return assistantIndexesBetween(previousIndex + 1, targetIndex).length >= Math.max(1, Number(state.settings.upkeep.frequency) || 5);
}

function sourceStillValid(row) {
    const api = context();
    const current = api?.chat?.[row.index];
    if (!current) return false;
    const anchor = anchorFor(current);
    return anchor.messageId === row.messageId && anchor.revision === row.revision && anchor.source === row.source;
}

function directCharacterCandidates() {
    const api = context();
    const rows = [];
    for (const character of api?.characters || []) {
        const name = String(character?.data?.name ?? character?.name ?? '').trim();
        const avatar = String(character?.avatar || '').trim();
        if (!name || !avatar) continue;
        const snow = character?.data?.extensions?.snowbunny || {};
        rows.push({
            key: String(snow.entityId || `character:${avatar}`),
            actor: {
                kind: 'character',
                entityId: String(snow.entityId || ''),
                avatar,
                lorebookId: '',
                entryId: '',
                key: '',
            },
            name,
            aliases: Array.isArray(snow.card?.aliases) ? snow.card.aliases.map(String) : [],
            source: 'Character library',
        });
    }
    return rows;
}

async function codexCandidates() {
    const rows = [];
    const store = lorebooks();
    if (!store) return rows;
    for (const bookId of store.effectiveIds?.() || []) {
        const book = await store.load?.(bookId);
        if (!book) continue;
        for (const entry of book.entries || []) {
            if (entry.enabled === false || String(entry.type || '').toLocaleLowerCase() !== 'character') continue;
            const linked = entry.link?.kind === 'character' && entry.link.avatar;
            const actor = linked ? {
                kind: 'character',
                entityId: String(entry.link.entityId || ''),
                avatar: String(entry.link.avatar || ''),
                lorebookId: '',
                entryId: '',
                key: '',
            } : {
                kind: 'codex-character',
                entityId: String(entry.link?.entityId || ''),
                avatar: '',
                lorebookId: String(book.id),
                entryId: String(entry.id),
                key: '',
            };
            rows.push({
                key: phone()?.actorKey?.(actor) || `codex:${book.id}:${entry.id}`,
                actor,
                name: String(entry.name || '').trim(),
                aliases: Array.isArray(entry.aliases) ? entry.aliases.map(String) : [],
                source: `Codex: ${book.name}`,
            });
        }
    }
    return rows;
}

function candidateRank(candidate, storyText) {
    const names = [candidate.name, ...(candidate.aliases || [])].map(value => String(value || '').trim().toLocaleLowerCase()).filter(Boolean);
    let score = 0;
    for (const name of names) if (storyText.includes(name)) score += Math.max(1, name.length);
    return score;
}

async function candidateCast(rows, state) {
    const all = [...directCharacterCandidates(), ...await codexCandidates()];
    const unique = new Map();
    for (const candidate of all) {
        const key = phone()?.actorKey?.(candidate.actor) || candidate.key;
        if (!key || !candidate.name) continue;
        if (!unique.has(key) || candidate.source.startsWith('Codex')) unique.set(key, { ...candidate, key });
    }
    const existing = new Set((state.contacts || []).map(contact => phone()?.actorKey?.(contact.actor)).filter(Boolean));
    const text = rows.map(row => row.text).join('\n').toLocaleLowerCase();
    return [...unique.values()]
        .filter(candidate => !existing.has(candidate.key))
        .map(candidate => ({ ...candidate, rank: candidateRank(candidate, text) }))
        .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name))
        .slice(0, 120)
        .map(({ rank: _rank, ...candidate }) => candidate);
}

function discoverySystemPrompt() {
    return `Update Pocket Phone's address book only from contact access that is already established in the supplied story passages. A person becomes a private Phone contact only when the player's Persona actually acquires a private contact route: for example, an explicit exchange of numbers/details, an already-established number they are shown to possess, or somebody actually sharing a private contact with them.

Meeting a person, knowing their name, seeing them in the current scene, being related to them, mentioning them, having them in a Character/Codex library, or seeing a public social account does NOT by itself establish private contact access. Do not infer an exchange merely because it would be convenient. The narrator is never a Phone contact.

Every discovery MUST use one supplied candidate actorKey and one supplied story messageId, plus an exact quotation copied from that message showing the acquisition. The quotation is machine-checked. If the evidence is ambiguous or absent, return no contact. Do not invent phone numbers or write new story events.

Return JSON only: {"contacts":[{"actorKey":"exact candidate key","messageId":"exact story message id","quote":"exact quotation"}]}. Return at most ${MAX_DISCOVERIES} contacts. An empty contacts array is correct when no new exchange is established.`;
}

async function discoverContacts(targetRow, state, rows) {
    const api = context();
    if (typeof api?.generateRaw !== 'function') return [];
    const candidates = await candidateCast(rows, state);
    if (!candidates.length) return [];
    const prompt = `Candidate fictional people. actorKey is an internal identifier and must be copied exactly:\n${JSON.stringify(candidates.map(item => ({ actorKey: item.key, name: item.name, aliases: item.aliases, source: item.source })))}\n\nVisible story passages, oldest to newest:\n${JSON.stringify(rows.map(row => ({ messageId: row.messageId, speaker: row.speaker, text: row.text })))}\n\nExisting private Phone contacts already cover these actor identities:\n${JSON.stringify((state.contacts || []).map(contact => ({ actorKey: phone()?.actorKey?.(contact.actor) || '', name: contact.name })).filter(item => item.actorKey))}\n\nReturn only newly established private contact access.`;
    const raw = await api.generateRaw({
        prompt,
        systemPrompt: discoverySystemPrompt(),
        responseLength: Math.max(900, Math.min(5000, Number(state.settings?.upkeep?.replyLimit) || 3000)),
        trimNames: false,
    });
    if (!sourceStillValid(targetRow)) throw new Error('Story evidence changed while Pocket Phone contact discovery was running.');
    const parsed = parseJson(raw, 'Pocket Phone contact discovery');
    if (!Array.isArray(parsed.contacts) || parsed.contacts.length > MAX_DISCOVERIES) throw new Error('Pocket Phone contact discovery returned an invalid contact list.');
    const candidateByKey = new Map(candidates.map(item => [item.key, item]));
    const rowById = new Map(rows.map(row => [row.messageId, row]));
    const found = [];
    const seen = new Set();
    for (const item of parsed.contacts) {
        if (!item || typeof item !== 'object') continue;
        const candidate = candidateByKey.get(String(item.actorKey || ''));
        const row = rowById.get(String(item.messageId || ''));
        const quote = String(item.quote || '').trim();
        if (!candidate || !row || !quote || quote.length > 2000 || !row.text.includes(quote) || seen.has(candidate.key)) continue;
        seen.add(candidate.key);
        found.push({ candidate, row, quote });
    }
    if (!found.length) return [];

    const latest = await phone().read({ fresh: true });
    const existing = new Set((latest.contacts || []).map(contact => phone()?.actorKey?.(contact.actor)).filter(Boolean));
    const added = [];
    await phone().mutate(draft => {
        for (const discovery of found) {
            if (existing.has(discovery.candidate.key)) continue;
            const evidence = {
                messageId: discovery.row.messageId,
                revision: discovery.row.revision,
                source: discovery.row.source,
                quote: discovery.quote,
            };
            const contact = {
                id: `contact_${crypto.randomUUID?.()?.replaceAll('-', '') || `${Date.now()}${Math.random().toString(36).slice(2)}`}`,
                actor: discovery.candidate.actor,
                name: discovery.candidate.name,
                personName: discovery.candidate.name,
                channel: 'phone',
                linked: true,
                archived: false,
                proactive: draft.settings?.incoming === true,
                memoryAllowed: draft.settings?.shareMemory === true,
                acquiredThrough: evidence,
                acquiredEvidence: [evidence],
                privateState: '',
                stateThrough: evidence,
                availability: '',
                pendingReply: false,
                style: '',
                presentation: {},
                messages: [],
                order: draft.contacts.length,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            draft.contacts.push(contact);
            existing.add(discovery.candidate.key);
            added.push({ id: contact.id, name: contact.name, actorKey: discovery.candidate.key, evidence });
        }
        return added;
    });
    if (added.length) document.dispatchEvent(new CustomEvent('snowbunny:phone-contacts-discovered', { detail: { contacts: structuredClone(added) } }));
    return added;
}

async function storyTime() {
    try {
        return String((await trackerStore()?.current?.())?.timePlace || '').trim();
    } catch (_) {
        return '';
    }
}

function eligibleProactiveContacts(state, currentStoryTime) {
    if (!currentStoryTime || state.settings?.incoming !== true) return [];
    return (state.contacts || []).filter(contact =>
        contact.linked !== false
        && !contact.archived
        && contact.proactive === true
        && phone()?.anchorVisible?.(contact.acquiredThrough) !== false
        && phone()?.sourceValid?.(contact.acquiredEvidence) !== false
        && String(contact.lastStoryTime || '') !== currentStoryTime,
    );
}

function proactiveSystemPrompt() {
    return `Choose which existing Pocket Phone contacts, if any, have a motivated reason to initiate or resume private contact at the CURRENT fictional Story time. This is a selector, not a writer. Do not create messages or new events.

Fictional time matters. Real-world elapsed time is irrelevant. A person who is asleep, occupied, unwilling, unaware, or has no reason to contact the player should not be selected. A pending unanswered player message can be a reason only if enough fictional circumstances changed for that person to plausibly answer now. A relationship alone is not a reason to constantly text. Do not fill a quota.

Return JSON only: {"contactIds":["existing id"]}. Select at most ${MAX_PROACTIVE_CONTACTS}. An empty array is normal.`;
}

async function chooseProactiveContacts(targetRow, state, rows, currentStoryTime) {
    const api = context();
    const eligible = eligibleProactiveContacts(state, currentStoryTime);
    if (!eligible.length || typeof api?.generateRaw !== 'function') return [];
    const prompt = `Current fictional Story time/place:\n${currentStoryTime}\n\nRecent visible story:\n${rows.map(row => `${row.speaker}: ${row.text}`).join('\n\n')}\n\nEligible contacts:\n${JSON.stringify(eligible.map(contact => ({
        id: contact.id,
        name: contact.name,
        pendingReply: contact.pendingReply === true,
        availability: contact.availability || '',
        privateState: contact.privateState || '',
        latestMessages: (contact.messages || []).slice(-6).map(message => ({ sender: message.user ? 'player' : contact.name, text: message.text, storyTime: message.storyTime || '' })),
    })))}`;
    const raw = await api.generateRaw({
        prompt,
        systemPrompt: proactiveSystemPrompt(),
        responseLength: 900,
        trimNames: false,
    });
    if (!sourceStillValid(targetRow)) throw new Error('Story evidence changed while Pocket Phone upkeep was selecting incoming messages.');
    const parsed = parseJson(raw, 'Pocket Phone upkeep');
    if (!Array.isArray(parsed.contactIds) || parsed.contactIds.length > MAX_PROACTIVE_CONTACTS) throw new Error('Pocket Phone upkeep returned an invalid contact selection.');
    const allowed = new Set(eligible.map(contact => contact.id));
    return [...new Set(parsed.contactIds.map(String).filter(id => allowed.has(id)))].slice(0, MAX_PROACTIVE_CONTACTS);
}

async function generateProactive(contactIds) {
    const results = [];
    for (const contactId of contactIds) {
        try {
            const result = await conversation()?.generate?.(contactId, { proactive: true });
            results.push({ contactId, ...result });
        } catch (error) {
            console.warn(`[SnowBunny] Pocket Phone upkeep could not update ${contactId}.`, error);
            results.push({ contactId, error: String(error?.message || error) });
        }
    }
    return results;
}

async function recordRun(targetRow, currentStoryTime, detail = {}) {
    await phone()?.mutate?.(draft => {
        draft.activity ||= [];
        draft.activity.push({
            kind: 'upkeep-run',
            through: {
                messageId: targetRow.messageId,
                revision: targetRow.revision,
                source: targetRow.source,
            },
            storyTime: currentStoryTime,
            contactsAdded: Number(detail.contactsAdded) || 0,
            proactiveSelected: Number(detail.proactiveSelected) || 0,
            proactiveDelivered: Number(detail.proactiveDelivered) || 0,
            createdAt: Date.now(),
        });
        draft.activity = draft.activity.slice(-200);
    });
}

async function runForMessage(targetIndex, { force = false } = {}) {
    const api = context();
    const target = api?.chat?.[targetIndex];
    if (!target || target.is_user || target.is_system || !phone()) return null;
    const state = await phone().read({ fresh: true });
    if (state.settings?.enabled !== true) return null;
    if (!due(state, targetIndex, force)) return null;
    const rows = visibleStory(targetIndex, state.settings?.upkeep?.historyCount || 30);
    const targetRow = rows.find(row => row.index === targetIndex);
    if (!targetRow) return null;

    const added = await discoverContacts(targetRow, state, rows);
    const afterDiscovery = await phone().read({ fresh: true });
    const currentStoryTime = await storyTime();
    const chosen = currentStoryTime
        ? await chooseProactiveContacts(targetRow, afterDiscovery, rows, currentStoryTime)
        : [];
    const generated = chosen.length ? await generateProactive(chosen) : [];
    const delivered = generated.reduce((count, item) => count + (Array.isArray(item.incomingIds) ? item.incomingIds.length : 0), 0);
    await recordRun(targetRow, currentStoryTime, {
        contactsAdded: added.length,
        proactiveSelected: chosen.length,
        proactiveDelivered: delivered,
    });
    document.dispatchEvent(new CustomEvent('snowbunny:phone-upkeep-complete', {
        detail: {
            messageId: targetRow.messageId,
            contactsAdded: added.length,
            proactiveSelected: chosen.length,
            proactiveDelivered: delivered,
            storyTime: currentStoryTime,
        },
    }));
    return { added, chosen, generated, storyTime: currentStoryTime };
}

async function drainQueue() {
    if (busy) return;
    busy = true;
    try {
        while (queue.length) {
            const index = queue.shift();
            if (!Number.isInteger(index)) continue;
            try {
                await runForMessage(index, { force: false });
            } catch (error) {
                console.warn('[SnowBunny] Pocket Phone upkeep failed.', error);
            }
        }
    } finally {
        busy = false;
    }
}

function queueMessage(index) {
    index = Number(index);
    if (!Number.isInteger(index) || queue.includes(index)) return;
    queue.push(index);
    void drainQueue();
}

function latestAssistantIndex() {
    const api = context();
    if (!Array.isArray(api?.chat)) return -1;
    const ignore = api?.symbols?.ignore;
    for (let index = api.chat.length - 1; index >= 0; index--) {
        const message = api.chat[index];
        if (!message || message.is_user || message.is_system || (ignore && message.extra?.[ignore])) continue;
        return index;
    }
    return -1;
}

async function runNow() {
    const index = latestAssistantIndex();
    if (index < 0) throw new Error('There is no completed story reply for Pocket Phone Upkeep to review yet.');
    if (busy) throw new Error('Pocket Phone Upkeep is already running.');
    busy = true;
    try {
        return await runForMessage(index, { force: true });
    } finally {
        busy = false;
    }
}

function registerEvents() {
    const api = context();
    const source = api?.eventSource;
    const types = api?.eventTypes;
    if (!source?.on || !types) return;
    if (types.MESSAGE_RECEIVED) {
        source.on(types.MESSAGE_RECEIVED, (messageId, generationType) => {
            if (generationType === 'first_message') return;
            const index = Number(messageId);
            if (Number.isInteger(index)) queueMessage(index);
        });
    }
    for (const name of ['CHAT_CHANGED', 'CHAT_LOADED']) {
        const event = types[name];
        if (event) source.on(event, () => { queue = []; });
    }
}

export function initPhoneUpkeep() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneUpkeep: {
            runNow,
            runForMessage,
            isBusy: () => busy,
        },
    };
}