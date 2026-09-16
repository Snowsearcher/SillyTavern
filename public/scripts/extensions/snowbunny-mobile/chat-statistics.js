const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SHEET_ID = 'snowbunny-action-sheet';
const STYLE_ID = 'snowbunny-chat-statistics-style';

let initialized = false;
let observer = null;
let queued = false;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
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
  #${SHEET_ID} .snowbunny-stats-body {
    overflow-y: auto;
    padding: 10px 12px calc(16px + env(safe-area-inset-bottom));
  }
  #${SHEET_ID} .snowbunny-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  #${SHEET_ID} .snowbunny-stat-card {
    min-width: 0;
    padding: 11px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent);
    border-radius: 15px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 62%, transparent);
  }
  #${SHEET_ID} .snowbunny-stat-card small {
    display: block;
    margin-bottom: 3px;
    font-size: .66rem;
    opacity: .58;
  }
  #${SHEET_ID} .snowbunny-stat-card strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 1.08rem;
  }
  #${SHEET_ID} .snowbunny-stats-section {
    margin-top: 12px;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
    border-radius: 15px;
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 48%, transparent);
  }
  #${SHEET_ID} .snowbunny-stats-section h4 {
    margin: 0 0 8px;
    font-size: .78rem;
  }
  #${SHEET_ID} .snowbunny-speaker-stat {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    padding: 5px 0;
    font-size: .75rem;
  }
  #${SHEET_ID} .snowbunny-speaker-stat + .snowbunny-speaker-stat {
    border-top: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 36%, transparent);
  }
  #${SHEET_ID} .snowbunny-speaker-stat span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #${SHEET_ID} .snowbunny-speaker-stat span:last-child { opacity: .66; }
}
`;
    document.head.append(style);
}

function closeSheet() {
    document.getElementById(SHEET_ID)?.remove();
}

function createSheet() {
    closeSheet();
    const overlay = el('div');
    overlay.id = SHEET_ID;
    const card = el('section', 'snowbunny-action-card');
    card.append(el('div', 'snowbunny-action-handle'));
    const header = el('header', 'snowbunny-action-header');
    header.append(el('h3', '', 'Chat Statistics'));
    const close = el('button');
    close.type = 'button';
    close.title = 'Close';
    close.setAttribute('aria-label', 'Close Chat Statistics');
    close.append(icon('fa-xmark'));
    close.addEventListener('click', closeSheet);
    header.append(close);
    card.append(header);
    overlay.append(card);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeSheet();
    });
    document.body.append(overlay);
    return card;
}

function wordCount(text) {
    const clean = String(text ?? '').trim();
    return clean ? clean.split(/\s+/).length : 0;
}

function stats() {
    const api = context();
    const chat = Array.isArray(api?.chat) ? api.chat : [];
    const ignoreKey = api?.symbols?.ignore;
    const result = {
        total: chat.length,
        user: 0,
        assistant: 0,
        system: 0,
        hidden: 0,
        words: 0,
        chars: 0,
        swipes: 0,
        media: 0,
        speakers: new Map(),
    };

    for (const message of chat) {
        const text = String(message?.mes ?? '');
        result.words += wordCount(text);
        result.chars += text.length;
        if (ignoreKey && message?.extra?.[ignoreKey]) result.hidden++;
        if (message?.is_user) result.user++;
        else if (message?.is_system) result.system++;
        else result.assistant++;
        if (Array.isArray(message?.swipes)) result.swipes += Math.max(0, message.swipes.length - 1);
        if (Array.isArray(message?.extra?.media)) result.media += message.extra.media.length;
        else if (message?.extra?.image || message?.extra?.file) result.media++;

        const speaker = message?.name || (message?.is_user ? api?.name1 : message?.is_system ? 'System' : api?.name2) || 'Message';
        result.speakers.set(speaker, (result.speakers.get(speaker) || 0) + 1);
    }
    return result;
}

function statCard(label, value) {
    const card = el('div', 'snowbunny-stat-card');
    card.append(el('small', '', label), el('strong', '', String(value)));
    return card;
}

function openStatistics() {
    const data = stats();
    const card = createSheet();
    const body = el('div', 'snowbunny-stats-body');
    const grid = el('div', 'snowbunny-stats-grid');
    grid.append(
        statCard('Messages', data.total),
        statCard('Words', data.words.toLocaleString()),
        statCard('Your messages', data.user),
        statCard('AI messages', data.assistant),
        statCard('Alternate replies', data.swipes),
        statCard('Hidden messages', data.hidden),
    );
    body.append(grid);

    const speakerSection = el('section', 'snowbunny-stats-section');
    speakerSection.append(el('h4', '', 'Messages by speaker'));
    const speakers = [...data.speakers.entries()].sort((a, b) => b[1] - a[1]);
    if (!speakers.length) {
        speakerSection.append(el('div', 'snowbunny-action-empty', 'No messages yet.'));
    } else {
        for (const [name, count] of speakers) {
            const row = el('div', 'snowbunny-speaker-stat');
            row.append(el('span', '', name), el('span', '', String(count)));
            speakerSection.append(row);
        }
    }
    body.append(speakerSection);

    const detailSection = el('section', 'snowbunny-stats-section');
    detailSection.append(el('h4', '', 'Conversation details'));
    for (const [label, value] of [
        ['Characters', data.chars.toLocaleString()],
        ['System messages', data.system],
        ['Media items', data.media],
    ]) {
        const row = el('div', 'snowbunny-speaker-stat');
        row.append(el('span', '', label), el('span', '', String(value)));
        detailSection.append(row);
    }
    body.append(detailSection);
    card.append(body);
}

function statisticsButton() {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-quick`)].find(button =>
        button.querySelector('span')?.textContent?.trim() === 'Statistics',
    );
}

function enhance() {
    queued = false;
    const button = statisticsButton();
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    if (button.dataset.snowbunnyStats === '1') return;
    button.dataset.snowbunnyStats = '1';
    button.addEventListener('click', openStatistics);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

export function initChatStatistics() {
    if (initialized) return;
    initialized = true;
    installStyles();
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(queueEnhance);
        observer.observe(drawer, { subtree: true, childList: true });
    }
    enhance();
}
