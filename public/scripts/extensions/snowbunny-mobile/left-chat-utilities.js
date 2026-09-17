const LEFT_DRAWER_ID = 'snowbunny-left-drawer';
const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const SECTION_ID = 'snowbunny-left-chat-utilities';
const STYLE_ID = 'snowbunny-left-chat-utilities-style';

let initialized = false;
let observer = null;
let queued = false;

function el(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function icon(name, extra = '') {
    const node = el('i', `fa-solid ${name}${extra ? ` ${extra}` : ''}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  body.snowbunny-mobile #${RIGHT_DRAWER_ID} > .snowbunny-shell-bottom {
    display: none !important;
  }
}
`;
    document.head.append(style);
}

function rightQuick(label) {
    return [...document.querySelectorAll(`#${RIGHT_DRAWER_ID} .snowbunny-shell-quick`)].find(button =>
        button.querySelector('span')?.textContent?.trim() === label,
    ) ?? null;
}

function runNativeSnowBunnyQuick(label) {
    const button = rightQuick(label);
    if (!(button instanceof HTMLButtonElement) || button.disabled) {
        globalThis.toastr?.info?.(`${label} is still loading.`);
        return;
    }
    button.click();
}

function row(label, description, iconName) {
    const button = el('button', 'snowbunny-shell-row');
    button.type = 'button';
    button.dataset.snowbunnyLeftUtility = label;
    button.append(icon(iconName));
    const copy = el('div', 'snowbunny-shell-row-copy');
    copy.append(el('strong', '', label), el('small', '', description));
    button.append(copy, icon('fa-chevron-right', 'snowbunny-shell-row-chevron'));
    button.addEventListener('click', () => runNativeSnowBunnyQuick(label));
    return button;
}

function buildSection() {
    const section = el('section', 'snowbunny-shell-section');
    section.id = SECTION_ID;
    const title = el('div', 'snowbunny-shell-section-title');
    title.append(el('span', '', 'Chat Utilities'));
    section.append(
        title,
        row('Search', 'Find text in the current conversation', 'fa-magnifying-glass'),
        row('Statistics', 'Message, word and speaker counts for this chat', 'fa-chart-simple'),
        row('Reset Chat', 'Clear this chat while keeping the chat itself', 'fa-rotate-left'),
    );
    return section;
}

function enhance() {
    queued = false;
    const drawer = document.getElementById(LEFT_DRAWER_ID);
    const scroll = drawer?.querySelector('.snowbunny-shell-scroll');
    if (!(scroll instanceof HTMLElement) || document.getElementById(SECTION_ID)) return;

    const section = buildSection();
    const recent = scroll.querySelector(':scope > .snowbunny-shell-section');
    if (recent?.nextSibling) scroll.insertBefore(section, recent.nextSibling);
    else scroll.append(section);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
}

export function initLeftChatUtilities() {
    if (initialized) return;
    initialized = true;
    installStyles();
    const left = document.getElementById(LEFT_DRAWER_ID);
    if (left) {
        observer = new MutationObserver(queueEnhance);
        observer.observe(left, { childList: true, subtree: true });
    }
    enhance();
}
