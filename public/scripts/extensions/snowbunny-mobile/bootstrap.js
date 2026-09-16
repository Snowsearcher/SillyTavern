import { initChatStatistics } from './chat-statistics.js';
import { initComposerLayout } from './composer-layout.js';
import { initContextView } from './context-view.js';
import { init as initMobileShell } from './index.js';
import {
    currentMessageIdentity,
    ensureMessageIdentity,
    initMessageIdentity,
    messageFingerprint,
    reconcileMessageIdentities,
} from './message-identity.js';
import { initPersonaSelector } from './persona-selector.js';
import { initSnowBunnyShell } from './shell.js';
import { initShellActions } from './shell-actions.js';
import { initShellTransitions } from './shell-transitions.js';
import {
    deleteChatStateKey,
    initSnowBunnyState,
    patchChatState,
    patchGlobalState,
    readChatState,
    readGlobalState,
    SNOWBUNNY_STATE_VERSION,
} from './state.js';

function installNamespace() {
    const existing = globalThis.SnowBunny && typeof globalThis.SnowBunny === 'object'
        ? globalThis.SnowBunny
        : {};

    globalThis.SnowBunny = {
        ...existing,
        apiVersion: 1,
        stateVersion: SNOWBUNNY_STATE_VERSION,
        state: {
            readGlobal: readGlobalState,
            patchGlobal: patchGlobalState,
            readChat: readChatState,
            patchChat: patchChatState,
            deleteChatKey: deleteChatStateKey,
        },
        identity: {
            current: currentMessageIdentity,
            ensure: ensureMessageIdentity,
            fingerprint: messageFingerprint,
            reconcile: reconcileMessageIdentities,
        },
    };
}

export function init() {
    installNamespace();
    initSnowBunnyState();
    initMessageIdentity();
    initContextView();
    initComposerLayout();
    initMobileShell();
    initSnowBunnyShell();
    initShellActions();
    initPersonaSelector();
    initChatStatistics();
    initShellTransitions();
}
