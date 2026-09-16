import { initChatStatistics } from './chat-statistics.js';
import { initCodex } from './codex.js';
import { initComposerLayout } from './composer-layout.js';
import { initContextView } from './context-view.js';
import { initCreateCodexBridge } from './create-codex-bridge.js';
import { initCreateMenu } from './create-menu.js';
import { initCyoaNative } from './cyoa-native.js';
import { init as initMobileShell } from './index.js';
import { initLorebookStore } from './lorebook-store.js';
import { initLoreRetrieval } from './lore-retrieval.js';
import {
    currentMessageIdentity,
    ensureMessageIdentity,
    initMessageIdentity,
    messageFingerprint,
    reconcileMessageIdentities,
} from './message-identity.js';
import { initMemberSelector } from './member-selector.js';
import { initModelSelector } from './model-selector.js';
import { initPersonaSelector } from './persona-selector.js';
import { initRecentChats } from './recent-chats.js';
import { initScenario } from './scenario.js';
import { initSnowBunnyShell } from './shell.js';
import { initShellActions } from './shell-actions.js';
import { initShellTransitions } from './shell-transitions.js';
import { initStoriesLibrary } from './stories-library.js';
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
    initLorebookStore();
    initMessageIdentity();
    initContextView();
    initComposerLayout();
    initMobileShell();
    initSnowBunnyShell();
    initShellActions();
    initMemberSelector();
    initModelSelector();
    initPersonaSelector();
    initScenario();
    initCyoaNative();
    initChatStatistics();
    initStoriesLibrary();
    initRecentChats();
    initCodex();
    initLoreRetrieval();
    initCreateMenu();
    initCreateCodexBridge();
    initShellTransitions();
}
