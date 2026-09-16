let initialized = false;

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function currentEvent(value) {
    const store = phone();
    return store?.anchorVisible?.(value?.through) !== false && store?.sourceValid?.(value?.evidence) !== false;
}

function currentContact(contact) {
    const store = phone();
    return store?.anchorVisible?.(contact?.acquiredThrough) !== false
        && store?.sourceValid?.(contact?.acquiredEvidence) !== false;
}

function inspect(state = {}) {
    const stale = {
        contacts: 0,
        messages: 0,
        profiles: 0,
        posts: 0,
        actions: 0,
    };
    const totals = {
        contacts: safeArray(state.contacts).length,
        messages: 0,
        profiles: safeArray(state.profiles).length,
        posts: safeArray(state.posts).length,
        actions: safeArray(state.actions).length,
    };

    for (const contact of safeArray(state.contacts)) {
        if (!currentContact(contact)) stale.contacts++;
        const messages = safeArray(contact?.messages);
        totals.messages += messages.length;
        stale.messages += messages.filter(message => !currentEvent(message)).length;
    }
    stale.profiles = safeArray(state.profiles).filter(profile => !currentEvent(profile)).length;
    stale.posts = safeArray(state.posts).filter(post => !currentEvent(post)).length;
    stale.actions = safeArray(state.actions).filter(action => !currentEvent(action)).length;

    const staleTotal = Object.values(stale).reduce((sum, value) => sum + value, 0);
    const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
    return {
        stale,
        totals,
        staleTotal,
        total,
        currentTotal: Math.max(0, total - staleTotal),
    };
}

export function initPhoneHistoryStatus() {
    if (initialized) return;
    initialized = true;
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object' ? globalThis.SnowBunny : {};
    globalThis.SnowBunny = {
        ...existing,
        phoneHistoryStatus: {
            inspect,
        },
    };
}
