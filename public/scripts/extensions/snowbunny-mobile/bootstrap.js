import { initAgentStore } from './agent-store.js';
import { initAgentsUi } from './agents-ui.js';
import { initApiConnectionsUi } from './api-connections-ui.js';
import { initCharacterAuthoring } from './character-authoring.js';
import { initCharacterCodexLinks } from './character-codex-links.js';
import { initCharacterLibrary } from './character-library.js';
import { initChatStatistics } from './chat-statistics.js';
import { initCodex } from './codex.js';
import { initCodexLinkedCharacterUi } from './codex-linked-character-ui.js';
import { initComposerLayout } from './composer-layout.js';
import { initContextAudit } from './context-audit.js';
import { initContextView } from './context-view.js';
import { initCreateCodexBridge } from './create-codex-bridge.js';
import { initCreateLibraryBridge } from './create-library-bridge.js';
import { initCreateMenu } from './create-menu.js';
import { initCustomAgentDrawerCount } from './custom-agent-drawer-count.js';
import { initCustomAgentEngine } from './custom-agent-engine.js';
import { initCustomAgentResultsUi } from './custom-agent-results-ui.js';
import { initCustomAgentsUi } from './custom-agents-ui.js';
import { initCyoaNative } from './cyoa-native.js';
import { initEntityCreateUi } from './entity-create-ui.js';
import { initExtensionManagerUi } from './extension-manager-ui.js';
import { initExtensionToolsUi } from './extension-tools-ui.js';
import { initGuidedGenerationsBridge } from './guided-generations-bridge.js';
import { init as initMobileShell } from './index.js';
import { initLeftChatUtilities } from './left-chat-utilities.js';
import { initMessageActionCompatibility } from './message-action-compatibility.js';
import { initOlderMessageRetry } from './older-message-retry.js';
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
import { initPersonaAuthoring } from './persona-authoring.js';
import { initPersonaLibrary } from './persona-library.js';
import { initPersonaSelector } from './persona-selector.js';
import { initPhoneAgentsUi } from './phone-agents-ui.js';
import { initPhoneArtwork } from './phone-artwork.js';
import { initPhoneArtworkLibrary } from './phone-artwork-library.js';
import { initPhoneArtworkManagerUi } from './phone-artwork-manager-ui.js';
import { initPhoneConversation } from './phone-conversation.js';
import { initPhoneEvidence } from './phone-evidence.js';
import { initPhoneHistoryStatus } from './phone-history-status.js';
import { initPhoneHistoryStatusUi } from './phone-history-status-ui.js';
import { initPhoneRouting } from './phone-routing.js';
import { initPhoneSocialActions } from './phone-social-actions.js';
import { initPhoneSocialArtworkUi } from './phone-social-artwork-ui.js';
import { initPhoneSocialLifecycle } from './phone-social-lifecycle.js';
import { initPhoneSocialNetwork } from './phone-social-network.js';
import { initPhoneSocialPagingUi } from './phone-social-paging-ui.js';
import { initPhoneSocialProfileUi } from './phone-social-profile-ui.js';
import { initPhoneSocialUi } from './phone-social-ui.js';
import { initPhoneSocialWorld } from './phone-social-world.js';
import { initPhoneStore } from './phone-store.js';
import { initPhoneUi } from './phone-ui.js';
import { initPhoneUpkeep } from './phone-upkeep.js';
import { initPresetEditor } from './preset-editor.js';
import { initRecentChats } from './recent-chats.js';
import { initRegexCompatibilityGuard } from './regex-compat-guard.js';
import { initRegexNative } from './regex-native.js';
import { initResponseConfig } from './response-config.js';
import { initRightPanelTabs } from './right-panel-tabs.js';
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
    initCharacterAuthoring();
    initCharacterCodexLinks();
    initPersonaAuthoring();
    initLoreSemanticIndex();
    initMessageIdentity();
    initTrackerStore();
    initPhoneStore();
    initPhoneHistoryStatus();
    initPhoneArtwork();
    initPhoneArtworkLibrary();
    initPhoneSocialNetwork();
    initPhoneSocialActions();
    initPhoneSocialWorld();
    initPhoneEvidence();
    initPhoneRouting();
    initPhoneConversation();
    initPhoneUpkeep();
    initPhoneUi();
    initPhoneArtworkManagerUi();
    initPhoneHistoryStatusUi();
    initPhoneSocialUi();
    initPhoneSocialProfileUi();
    initPhoneSocialArtworkUi();
    initPhoneSocialPagingUi();
    initPhoneSocialLifecycle();
    initPhoneAgentsUi();
    initMemoryStore();
    initAgentStore();
    initMemoryIntegrity();
    initStoryOwnership();
    initStoryTracker();
    initMemoryMaker();
    initMemoryRecall();
    initCustomAgentEngine();
    initRegexCompatibilityGuard();
    initRegexNative();
    initContextAudit();
    initContextView();
    initComposerLayout();
    initMobileShell();
    initMessageActionCompatibility();
    initOlderMessageRetry();
    initSnowBunnyShell();
    initExtensionToolsUi();
    initExtensionManagerUi();
    initGuidedGenerationsBridge();
    initRightPanelTabs();
    initLeftChatUtilities();
    initApiConnectionsUi();
    initCharacterLibrary();
    initPersonaLibrary();
    initEntityCreateUi();
    initResponseConfig();
    initShellActions();
    initMemberSelector();
    initNarrator();
    initModelSelector();
    initPersonaSelector();
    initPresetEditor();
    initScenario();
    initCyoaNative();
    initChatStatistics();
    initStoriesLibrary();
    initStorySettings();
    initStoryCreateSafety();
    initRecentChats();
    initCodex();
    initCodexLinkedCharacterUi();
    initStoryLorebooks();
    initLoreRetrieval();
    initMemoryUi();
    initMemoryRecovery();
    initTrackerUi();
    initCustomAgentResultsUi();
    initAgentsUi();
    initCustomAgentsUi();
    initCustomAgentDrawerCount();
    initCreateMenu();
    initCreateCodexBridge();
    initCreateLibraryBridge();
    initShellTransitions();
}
