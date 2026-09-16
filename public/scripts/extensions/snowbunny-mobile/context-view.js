const STYLE_ID = 'snowbunny-context-view-style';
const OVERLAY_ID = 'snowbunny-context-view';
const PROMPT_SELECTOR = '#chat .mes:not([is_user="true"]) .mes_prompt';

let initialized = false;
let observer = null;

function context() {
    return globalThis.SillyTavern?.getContext?.() ?? null;
}

function messageId(element) {
    const message = element?.closest?.('.mes');
    const id = Number.parseInt(message?.getAttribute('mesid') ?? '', 10);
    return Number.isInteger(id) && id >= 0 ? id : null;
}

function clean(value) {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        #${OVERLAY_ID} {
            position: fixed;
            inset: 0;
            z-index: 11000;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            background: rgba(0, 0, 0, .42);
            padding-top: max(18px, env(safe-area-inset-top));
        }
        #${OVERLAY_ID} .snowbunny-context-sheet {
            width: min(720px, 100%);
            max-height: min(88dvh, 900px);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 82%, transparent);
            border-radius: 22px 22px 0 0;
            background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 97%, transparent);
            color: var(--SmartThemeBodyColor);
            box-shadow: 0 -16px 44px rgba(0, 0, 0, .28);
            backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) * 1.7));
            -webkit-backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) * 1.7));
            animation: snowbunny-context-in 150ms ease-out;
        }
        @keyframes snowbunny-context-in {
            from { transform: translateY(20px); opacity: .6; }
            to { transform: translateY(0); opacity: 1; }
        }
        #${OVERLAY_ID} .snowbunny-context-handle {
            width: 38px;
            height: 4px;
            margin: 8px auto 2px;
            border-radius: 999px;
            background: color-mix(in srgb, currentColor 28%, transparent);
        }
        #${OVERLAY_ID} .snowbunny-context-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px 10px 16px;
            border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
        }
        #${OVERLAY_ID} .snowbunny-context-title {
            flex: 1;
            min-width: 0;
        }
        #${OVERLAY_ID} .snowbunny-context-title strong {
            display: block;
            font-size: 1rem;
        }
        #${OVERLAY_ID} .snowbunny-context-title span {
            display: block;
            margin-top: 2px;
            opacity: .62;
            font-size: .74rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        #${OVERLAY_ID} .snowbunny-context-close {
            width: 40px;
            height: 40px;
            border: 0;
            border-radius: 50%;
            background: transparent;
            color: inherit;
            font-size: 1rem;
        }
        #${OVERLAY_ID} .snowbunny-context-body {
            overflow-y: auto;
            padding: 12px 14px calc(18px + env(safe-area-inset-bottom));
        }
        #${OVERLAY_ID} .snowbunny-context-summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 12px;
        }
        #${OVERLAY_ID} .snowbunny-context-cell {
            min-width: 0;
            padding: 10px 11px;
            border-radius: 14px;
            border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 60%, transparent);
            background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 65%, transparent);
        }
        #${OVERLAY_ID} .snowbunny-context-cell small {
            display: block;
            margin-bottom: 3px;
            opacity: .58;
            font-size: .68rem;
        }
        #${OVERLAY_ID} .snowbunny-context-cell span {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: .82rem;
            font-weight: 600;
        }
        #${OVERLAY_ID} .snowbunny-context-section {
            margin: 8px 0;
            border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 58%, transparent);
            border-radius: 14px;
            overflow: hidden;
            background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 54%, transparent);
        }
        #${OVERLAY_ID} .snowbunny-context-section summary {
            cursor: pointer;
            padding: 10px 12px;
            font-size: .82rem;
            font-weight: 650;
        }
        #${OVERLAY_ID} .snowbunny-context-section-content {
            padding: 0 12px 11px;
            font-size: .78rem;
            line-height: 1.45;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
        #${OVERLAY_ID} .snowbunny-context-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        #${OVERLAY_ID} .snowbunny-context-action {
            min-height: 42px;
            padding: 8px 13px;
            border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 66%, transparent);
            border-radius: 13px;
            background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 12%, transparent);
            color: inherit;
            font-weight: 600;
        }
        @media (min-width: 560px) {
            #${OVERLAY_ID} { align-items: center; padding: 18px; }
            #${OVERLAY_ID} .snowbunny-context-sheet { border-radius: 22px; }
        }
    `;
    document.head.append(style);
}

function exposeContextHooks() {
    for (const button of document.querySelectorAll(PROMPT_SELECTOR)) {
        if (!(button instanceof HTMLElement)) continue;
        if (button.dataset.snowbunnyContextHook !== '1') {
            const available = button.style.display !== 'none' && !button.classList.contains('displayNone');
            button.dataset.snowbunnyRawPromptAvailable = String(available);
            button.dataset.snowbunnyContextHook = '1';
        } else if (button.style.display !== 'none' && !button.classList.contains('displayNone')) {
            button.dataset.snowbunnyRawPromptAvailable = 'true';
        }
        button.classList.remove('displayNone');
        button.style.removeProperty('display');
    }
}

function appendCell(host, label, value) {
    const cell = document.createElement('div');
    cell.className = 'snowbunny-context-cell';
    const small = document.createElement('small');
    small.textContent = label;
    const text = document.createElement('span');
    text.textContent = clean(value);
    text.title = clean(value);
    cell.append(small, text);
    host.append(cell);
}

function normalizeSectionValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === 'string') return `• ${item}`;
            if (item && typeof item === 'object') {
                const name = item.name ?? item.title ?? item.id ?? 'Item';
                const reason = item.reason ?? item.note ?? item.status ?? '';
                return `• ${name}${reason ? ` — ${reason}` : ''}`;
            }
            return `• ${String(item)}`;
        }).join('\n');
    }
    if (typeof value === 'object') {
        return Object.entries(value)
            .map(([key, item]) => `${key}: ${typeof item === 'string' ? item : JSON.stringify(item)}`)
            .join('\n');
    }
    return String(value);
}

function appendReceiptSections(host, receipt) {
    if (!receipt || typeof receipt !== 'object') return;

    const known = [
        ['history', 'History'],
        ['lore', 'Lorebook / Codex'],
        ['memories', 'Memories'],
        ['trackers', 'Current state'],
        ['phone', 'Phone continuity'],
        ['guidance', 'Guidance'],
        ['fitting', 'Context fitting'],
    ];

    for (const [key, label] of known) {
        if (!(key in receipt)) continue;
        const content = normalizeSectionValue(receipt[key]);
        if (!content.trim()) continue;
        const details = document.createElement('details');
        details.className = 'snowbunny-context-section';
        const summary = document.createElement('summary');
        summary.textContent = label;
        const body = document.createElement('div');
        body.className = 'snowbunny-context-section-content';
        body.textContent = content;
        details.append(summary, body);
        host.append(details);
    }
}

function closeContextView() {
    document.getElementById(OVERLAY_ID)?.remove();
}

function openRawPrompt(button) {
    if (!(button instanceof HTMLElement)) return;
    button.dataset.snowbunnyBypassContext = '1';
    button.click();
}

function showContextView(button) {
    closeContextView();
    installStyles();

    const id = messageId(button);
    const api = context();
    const message = id === null ? null : api?.chat?.[id] ?? null;
    if (!message) return;

    const identity = globalThis.SnowBunny?.identity?.current?.(message);
    const receipt = message?.extra?.snowbunny?.contextReceipt ?? null;
    const speaker = message?.name || 'Reply';
    const rawAvailable = button.dataset.snowbunnyRawPromptAvailable === 'true';

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'View Context');

    const sheet = document.createElement('section');
    sheet.className = 'snowbunny-context-sheet';

    const handle = document.createElement('div');
    handle.className = 'snowbunny-context-handle';

    const header = document.createElement('div');
    header.className = 'snowbunny-context-header';
    const title = document.createElement('div');
    title.className = 'snowbunny-context-title';
    const strong = document.createElement('strong');
    strong.textContent = 'View Context';
    const subtitle = document.createElement('span');
    subtitle.textContent = `${speaker} · reply ${id + 1}`;
    title.append(strong, subtitle);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'snowbunny-context-close fa-solid fa-xmark';
    close.setAttribute('aria-label', 'Close View Context');
    close.addEventListener('click', closeContextView);
    header.append(title, close);

    const body = document.createElement('div');
    body.className = 'snowbunny-context-body';
    const summary = document.createElement('div');
    summary.className = 'snowbunny-context-summary';
    appendCell(summary, 'Model', receipt?.model ?? message?.extra?.model);
    appendCell(summary, 'API / provider', receipt?.provider ?? receipt?.api ?? message?.extra?.api);
    appendCell(summary, 'Preset', receipt?.preset ?? receipt?.presetName);
    appendCell(summary, 'SnowBunny revision', identity?.revision ?? '—');
    body.append(summary);

    appendReceiptSections(body, receipt);

    if (!receipt) {
        const details = document.createElement('details');
        details.className = 'snowbunny-context-section';
        details.open = true;
        const label = document.createElement('summary');
        label.textContent = 'Context receipt';
        const text = document.createElement('div');
        text.className = 'snowbunny-context-section-content';
        text.textContent = rawAvailable
            ? 'SillyTavern saved the raw prompt details for this reply. SnowBunny-specific Lore, Memory, tracker and Phone routing will appear here as those systems are wired into the fork.'
            : 'This reply predates the SnowBunny context receipt, or SillyTavern did not save itemized prompt details for it.';
        details.append(label, text);
        body.append(details);
    }

    const actions = document.createElement('div');
    actions.className = 'snowbunny-context-actions';
    if (rawAvailable) {
        const raw = document.createElement('button');
        raw.type = 'button';
        raw.className = 'snowbunny-context-action';
        raw.textContent = 'Raw prompt details';
        raw.addEventListener('click', () => {
            closeContextView();
            openRawPrompt(button);
        });
        actions.append(raw);
    }
    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'snowbunny-context-action';
    done.textContent = 'Done';
    done.addEventListener('click', closeContextView);
    actions.append(done);
    body.append(actions);

    sheet.append(handle, header, body);
    overlay.append(sheet);
    overlay.addEventListener('pointerdown', event => {
        if (event.target === overlay) closeContextView();
    });
    document.body.append(overlay);
}

function onPromptClick(event) {
    const button = event.target instanceof Element ? event.target.closest('.mes_prompt') : null;
    if (!(button instanceof HTMLElement) || !button.closest('#chat')) return;

    if (button.dataset.snowbunnyBypassContext === '1') {
        delete button.dataset.snowbunnyBypassContext;
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    showContextView(button);
}

function onKeyDown(event) {
    if (event.key === 'Escape' && document.getElementById(OVERLAY_ID)) {
        event.preventDefault();
        closeContextView();
    }
}

export function initContextView() {
    if (initialized) return;
    initialized = true;

    installStyles();
    exposeContextHooks();

    const chat = document.querySelector('#chat');
    if (chat) {
        observer = new MutationObserver(exposeContextHooks);
        observer.observe(chat, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class', 'style'],
        });
    }

    document.addEventListener('click', onPromptClick, true);
    document.addEventListener('keydown', onKeyDown, true);
}
