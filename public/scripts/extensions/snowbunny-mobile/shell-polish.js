const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const LEFT_DRAWER_ID = 'snowbunny-left-drawer';

let initialized = false;
let observer = null;
let queued = false;

const RIGHT_DESCRIPTIONS = {
    Persona: 'Persona for this chat',
    Model: 'Model for this chat',
    Preset: 'Generation preset for this chat',
    Lorebooks: 'Story and chat knowledge',
    Scenario: 'Premise, role and Story direction',
    Regex: 'Regex rules for this chat',
    Memory: 'Memory and recall',
    Agents: 'Story Tracker and agent tools',
    CYOA: 'Interactive choices',
};

function rows(drawerId) {
    return [...document.querySelectorAll(`#${drawerId} .snowbunny-shell-row`)];
}

function polishRightRows() {
    for (const row of rows(RIGHT_DRAWER_ID)) {
        const copy = row.querySelector('.snowbunny-shell-row-copy');
        const label = copy?.querySelector('strong')?.textContent?.trim() || '';
        if (!label || !RIGHT_DESCRIPTIONS[label]) continue;

        let description = copy.querySelector('small');
        if (!description) {
            description = document.createElement('small');
            copy.append(description);
        }
        description.textContent = RIGHT_DESCRIPTIONS[label];

        const value = row.querySelector('.snowbunny-shell-row-value');
        if (value?.textContent?.trim() === 'Not wired') value.textContent = 'Loading…';
    }

    const add = document.querySelector(`#${RIGHT_DRAWER_ID} .snowbunny-members-add`);
    if (add instanceof HTMLElement && /being ported/i.test(add.title || '')) {
        add.title = 'Add or manage chat members';
    }
}

function polishLeftRows() {
    for (const row of rows(LEFT_DRAWER_ID)) {
        const copy = row.querySelector('.snowbunny-shell-row-copy');
        const label = copy?.querySelector('strong')?.textContent?.trim() || '';
        const description = copy?.querySelector('small');
        if (!description) continue;
        if (label === 'Stories') description.textContent = 'Stories and their chats';
        if (label === 'Lorebooks') description.textContent = 'SnowBunny Codex and Lorebooks';
        if (label === 'Stand-alone Chats') description.textContent = 'Chats that are not inside a Story';
        if (label === 'Create') description.textContent = 'Story, chat, Lorebook, entry, Character or Persona';
    }
}

function polishTop() {
    const stories = document.querySelector('#snowbunny-top-strip .snowbunny-top-action[aria-label="Stories"]');
    const codex = document.querySelector('#snowbunny-top-strip .snowbunny-top-action[aria-label="Codex"]');
    if (stories instanceof HTMLElement) stories.title = 'Stories';
    if (codex instanceof HTMLElement) codex.title = 'Codex & Lorebooks';
}

function polish() {
    queued = false;
    polishTop();
    polishLeftRows();
    polishRightRows();
}

function queuePolish() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(polish);
}

export function initShellPolish() {
    if (initialized) return;
    initialized = true;
    observer = new MutationObserver(queuePolish);
    observer.observe(document.body, { childList: true, subtree: true });
    polish();
}
