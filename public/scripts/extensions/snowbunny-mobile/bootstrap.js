import { initAgentsUi } from './agents-ui.js';
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
import { initLoreSemanticIndex } from './lore-semantic-index.js';
import { initMemoryIntegrity } from './memory-integrity.js';
import { initMemoryMaker } from './memory-maker.js';
import { initMemoryRecall } from './memory-recall.js';
import { initMemoryRecovery } from './memory-recovery.js';
import { initMemoryStore } from './memory-store.js';
import { initMemoryUi } from './memory-ui.js';
import {
    currentMessageIdentity,
    ensureMessageIdentity,
    initMessageIdentity,
    messageFingerprint,
    reconcileMessageIdentities,
} from './message-identity.js';
import { initMemberSelector } from './member-selector.js';
import { initModelSelector } from './model-selector.js';
import { initNarrator } from './narrator.js';
import { initPersonaSelector } from './persona-selector.js';
import { initRecentChats } from './recent-chats.js';
import { initRegexCompatibilityGuard } from './regex-compat-guard.js';
import { initRegexNative } from './regex-native.js';
import { initScenario } from './scenario.js';
import { initSnowBunnyShell } from './shell.js';
import { initShellActions } from './shell-actions.js';
import { initShellTransitions } from './shell-transitions.js';
import { initStoriesLibrary } from './stories-library.js';
import { initStoryCreateSafety } from './story-create-safety.js';
import { initStoryLorebooks } from './story-lorebooks.js';
import { initStoryOwnership } from './story-ownership.js';
import { initStorySettings } from './story-settings.js';
import { initStoryTracker } from './story-tracker.js';
import {
    deleteChatStateKey,
    initSnowBunnyState,
    patchChatState,
    patchGlobalState,
    readChatState,
    readGlobalState,
    SNOWBUNNY_STATE_VERSION,
} from './state.js';
import { initTrackerStore } from './tracker-store.js';
import { initTrackerUi } from './tracker-ui.js';

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
    initLoreSemanticIndex();
    initMessageIdentity();
    initTrackerStore();
    initMemoryStore();
    initMemoryIntegrity();
    initStoryOwnership();
    initStoryTracker();
    initMemoryMaker();
    initMemoryRecall();
    initRegexCompatibilityGuard();
    initRegexNative();
    initContextView();
    initComposerLayout();
    initMobileShell();
    initSnowBunnyShell();
    initShellActions();
    initMemberSelector();
    initNarrator();
    initModelSelector();
    initPersonaSelector();
    initScenario();
    initCyoaNative();
    initChatStatistics();
    initStoriesLibrary();
    initStorySettings();
    initStoryCreateSafety();
    initRecentChats();
    initCodex();
    initStoryLorebooks();
    initLoreRetrieval();
    initMemoryUi();
    initMemoryRecovery();
    initTrackerUi();
    initAgentsUi();
    initCreateMenu();
    initCreateCodexBridge();
    initShellTransitions();
}
