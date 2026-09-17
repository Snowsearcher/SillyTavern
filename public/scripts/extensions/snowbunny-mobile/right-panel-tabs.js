const RIGHT_DRAWER_ID = 'snowbunny-right-drawer';
const TABS_ID = 'snowbunny-right-tabs';
const STYLE_ID = 'snowbunny-right-tabs-style';

const CHAT_ROWS = new Set(['Persona', 'Model', 'Preset', 'Lorebooks', 'Scenario', 'Regex']);
const TOOL_ROWS = new Set(['Memory', 'Agents', 'CYOA']);
const TABS = [
    ['chat', 'Chat', 'fa-message'],
    ['tools', 'Tools', 'fa-toolbox'],
    ['extensions', 'Extensions', 'fa-cubes'],
];

let initialized = false;
let observer = null;
let applying = false;

function snowState() {
    return globalThis.SnowBunny?.state ?? null;
}

function el(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@media screen and (max-width: 1000px) {
  #${TABS_ID} {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    padding: 7px 9px 5px;
    border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor) 54%, transparent);
    background: color-mix(in srgb, var(--SmartThemeBlurTintColor) 72%, transparent);
  }
  #${TABS_ID} button {
    min-width: 0;
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 5px 7px;
    border: 1px solid transparent;
    border-radius: 13px;
    background: transparent;
    color: inherit;
    font-size: .7rem;
    font-weight: 690;
    opacity: .62;
  }
  #${TABS_ID} button.active {
    border-color: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 30%, transparent);
    background: color-mix(in srgb, var(--SmartThemeEmColor, #c7a8ff) 13%, transparent);
    opacity: 1;
  }
  #${TABS_ID} button i { font-size: .84rem; }
  #${RIGHT_DRAWER_ID} .snowbunny-right-tab-hidden { display: none !important; }
}
`;
    document.head.append(style);
}

function selectedTab() {
    const saved = snowState()?.readGlobal?.()?.rightPanelTab;
    return TABS.some(([key]) => key === saved) ? saved : 'chat';
}

function sectionTitle(section) {
    return section.querySelector('.snowbunny-shell-section-title span')?.textContent?.trim() || '';
}

function rowLabel(row) {
    return row.querySelector('.snowbunny-shell-row-copy strong')?.textContent?.trim() || '';
}

function setVisible(node, visible) {
    node.classList.toggle('snowbunny-right-tab-hidden', !visible);
}

function applyChatSection(section, tab) {
    const title = section.querySelector('.snowbunny-shell-section-title span');
    let visibleRows = 0;

    for (const row of section.querySelectorAll(':scope > .snowbunny-shell-row')) {
        const label = rowLabel(row);
        const bucket = TOOL_ROWS.has(label) ? 'tools' : CHAT_ROWS.has(label) ? 'chat' : 'chat';
        const visible = bucket === tab;
        setVisible(row, visible);
        if (visible) visibleRows++;
    }

    if (title instanceof HTMLElement) title.textContent = tab === 'tools' ? 'Tools' : 'Chat';
    setVisible(section, (tab === 'chat' || tab === 'tools') && visibleRows > 0);
}

function applyTab(tab = selectedTab()) {
    if (applying) return;
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (!(drawer instanceof HTMLElement)) return;

    applying = true;
    try {
        const scroll = drawer.querySelector('.snowbunny-shell-scroll');
        if (scroll instanceof HTMLElement) {
            for (const section of scroll.querySelectorAll(':scope > .snowbunny-shell-section')) {
                const title = sectionTitle(section);
                if (/^Members\b/i.test(title)) {
                    setVisible(section, tab === 'chat');
                    continue;
                }
                if (title === 'Chat' || title === 'Tools') {
                    applyChatSection(section, tab);
                    continue;
                }
                if (/Extension/i.test(title)) {
                    setVisible(section, tab === 'extensions');
                    continue;
                }
                setVisible(section, tab === 'tools');
            }
        }

        const bottom = drawer.querySelector('.snowbunny-shell-bottom');
        if (bottom instanceof HTMLElement) setVisible(bottom, tab !== 'extensions');

        for (const button of drawer.querySelectorAll(`#${TABS_ID} button[data-tab]`)) {
            button.classList.toggle('active', button.dataset.tab === tab);
            button.setAttribute('aria-selected', String(button.dataset.tab === tab));
        }
    } finally {
        applying = false;
    }
}

function chooseTab(tab) {
    snowState()?.patchGlobal?.({ rightPanelTab: tab });
    applyTab(tab);
}

function ensureTabs() {
    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (!(drawer instanceof HTMLElement) || document.getElementById(TABS_ID)) return;
    const header = drawer.querySelector('.snowbunny-shell-header');
    if (!(header instanceof HTMLElement)) return;

    const tabs = el('nav');
    tabs.id = TABS_ID;
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Current chat tools');

    for (const [key, label, iconName] of TABS) {
        const button = el('button');
        button.type = 'button';
        button.dataset.tab = key;
        button.setAttribute('role', 'tab');
        const mark = el('i', `fa-solid ${iconName}`);
        mark.setAttribute('aria-hidden', 'true');
        button.append(mark, el('span', '', label));
        button.addEventListener('click', () => chooseTab(key));
        tabs.append(button);
    }

    header.insertAdjacentElement('afterend', tabs);
}

function reconcile() {
    ensureTabs();
    applyTab();
}

export function initRightPanelTabs() {
    if (initialized) return;
    initialized = true;
    installStyles();
    ensureTabs();
    applyTab();

    const drawer = document.getElementById(RIGHT_DRAWER_ID);
    if (drawer) {
        observer = new MutationObserver(() => requestAnimationFrame(reconcile));
        observer.observe(drawer, { childList: true, subtree: true });
    }
}
