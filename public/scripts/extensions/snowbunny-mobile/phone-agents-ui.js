const WORKSPACE_ID = 'snowbunny-agents-workspace';
const CARD_CLASS = 'snowbunny-phone-agent-card';

let initialized = false;
let observer = null;
let queued = false;

function phone() {
    return globalThis.SnowBunny?.phone ?? null;
}

function upkeep() {
    return globalThis.SnowBunny?.phoneUpkeep ?? null;
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

function toggleControl(checked, onChange) {
    const label = el('label', 'snowbunny-agent-toggle');
    const input = el('input'); input.type = 'checkbox'; input.checked = Boolean(checked);
    const track = el('span');
    input.addEventListener('change', () => void onChange(input.checked, input));
    label.append(input, track);
    return label;
}

function field(labelText, input) {
    const label = el('label', 'snowbunny-agent-field');
    label.append(el('span', '', labelText), input);
    return label;
}

function isAgentsHome(root) {
    return root?.querySelector('.snowbunny-agents-header h2')?.textContent?.trim() === 'Agents';
}

async function renderCard() {
    queued = false;
    const root = document.getElementById(WORKSPACE_ID);
    if (!root || !isAgentsHome(root) || root.querySelector(`.${CARD_CLASS}`)) return;
    const body = root.querySelector('.snowbunny-agents-body');
    if (!body || !phone()) return;
    const state = await phone().read();
    if (!document.body.contains(root) || !isAgentsHome(root) || root.querySelector(`.${CARD_CLASS}`)) return;
    const settings = state.settings || {};
    const upkeepSettings = settings.upkeep || {};

    const card = el('article', `snowbunny-agent-card ${CARD_CLASS}`);
    const top = el('div', 'snowbunny-agent-card-top');
    const mark = el('div', 'snowbunny-agent-icon'); mark.append(icon('fa-mobile-screen-button'));
    const copy = el('div', 'snowbunny-agent-copy');
    const statusText = upkeepSettings.enabled === true
        ? `Every ${Math.max(1, Number(upkeepSettings.frequency) || 5)} story repl${Number(upkeepSettings.frequency) === 1 ? 'y' : 'ies'}`
        : 'Off · Phone history stays saved';
    copy.append(el('strong', '', 'Pocket Phone Upkeep'), el('small', '', statusText));
    const toggle = toggleControl(upkeepSettings.enabled === true, async (value, input) => {
        input.disabled = true;
        try {
            await phone().setSettings({
                enabled: value ? true : settings.enabled === true,
                upkeep: { enabled: value },
            });
            document.dispatchEvent(new CustomEvent('snowbunny:phone-upkeep-settings-changed'));
            card.remove();
            queueRender();
        } catch (error) {
            console.warn('[SnowBunny] Could not change Pocket Phone Upkeep.', error);
            input.checked = !value;
            input.disabled = false;
        }
    });
    top.append(mark, copy, toggle); card.append(top);

    const status = el('div', 'snowbunny-agent-status');
    status.append(
        el('span', '', 'Evidence-backed contact discovery'),
        el('span', '', settings.incoming === true ? 'Fictional-time incoming messages' : 'Incoming messages are off'),
        el('span', '', 'Never uses real-world elapsed time'),
        el('span', '', 'Invalid branch evidence is ignored'),
    );
    card.append(status);

    const run = el('button', 'snowbunny-agent-card-action', upkeep()?.isBusy?.() ? 'Phone Upkeep is running…' : 'Run Phone Upkeep now');
    run.type = 'button'; run.disabled = Boolean(upkeep()?.isBusy?.());
    run.addEventListener('click', async () => {
        run.disabled = true; run.textContent = 'Checking Phone continuity…';
        try {
            const result = await upkeep()?.runNow?.();
            const added = result?.added?.length || 0;
            const delivered = (result?.generated || []).reduce((count, item) => count + (Array.isArray(item.incomingIds) ? item.incomingIds.length : 0), 0);
            run.textContent = added || delivered ? `${added} contact${added === 1 ? '' : 's'} · ${delivered} message${delivered === 1 ? '' : 's'}` : 'Phone is already current';
        } catch (error) {
            console.warn('[SnowBunny] Manual Pocket Phone Upkeep failed.', error);
            run.textContent = 'Try Phone Upkeep again';
            run.disabled = false;
        }
    });
    card.append(run);

    const advanced = el('details', 'snowbunny-agent-advanced');
    advanced.append(el('summary', '', 'Advanced'));
    const advancedBody = el('div', 'snowbunny-agent-advanced-body');
    const frequency = el('input'); frequency.type = 'number'; frequency.min = '1'; frequency.max = '50'; frequency.value = String(upkeepSettings.frequency || 5);
    const history = el('input'); history.type = 'number'; history.min = '4'; history.max = '200'; history.value = String(upkeepSettings.historyCount || 30);
    const limit = el('input'); limit.type = 'number'; limit.min = '800'; limit.max = '12000'; limit.step = '100'; limit.value = String(upkeepSettings.replyLimit || 3000);
    const save = el('button', 'snowbunny-agent-card-action', 'Save Phone Upkeep settings'); save.type = 'button';
    save.addEventListener('click', async () => {
        save.disabled = true;
        try {
            await phone().setSettings({
                upkeep: {
                    frequency: Number(frequency.value),
                    historyCount: Number(history.value),
                    replyLimit: Number(limit.value),
                },
            });
            save.textContent = 'Saved';
        } catch (error) {
            console.warn('[SnowBunny] Could not save Phone Upkeep settings.', error);
            save.disabled = false; save.textContent = 'Try again';
        }
    });
    advancedBody.append(
        field('Run after this many completed story replies', frequency),
        field('Recent story window', history),
        field('Upkeep reasoning reply limit', limit),
        save,
    );
    advanced.append(advancedBody); card.append(advanced);

    const trackerCard = body.querySelector('.snowbunny-agent-card');
    if (trackerCard) trackerCard.insertAdjacentElement('afterend', card);
    else body.prepend(card);
}

function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => void renderCard());
}

function registerEvents() {
    for (const name of ['snowbunny:phone-changed', 'snowbunny:phone-upkeep-complete', 'snowbunny:phone-upkeep-settings-changed', 'snowbunny:shell-open']) {
        document.addEventListener(name, queueRender);
    }
}

export function initPhoneAgentsUi() {
    if (initialized) return;
    initialized = true;
    registerEvents();
    observer = new MutationObserver(queueRender);
    observer.observe(document.body, { childList: true, subtree: true });
    queueRender();
}