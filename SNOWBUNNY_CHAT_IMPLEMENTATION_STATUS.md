# SnowBunny Chat Implementation Status

This file records what is actually implemented on `snowbunny-mobile`, separate from the design/reference documents.

## Live SillyTavern chat shell

`public/scripts/extensions/snowbunny-mobile/index.js` works directly on SillyTavern's real chat DOM and real composer.

Implemented:

- SnowBunny mobile message-card presentation over `.mes` / `.mes_block`.
- Distinct user/system presentation classes without rewriting stored prose.
- Stock permanent message-action clutter hidden in normal reading mode while the original nodes remain for extension/core compatibility.
- Tap message -> anchored SnowBunny action menu.
- Copy, Edit, Use as Draft, Delete, latest-safe Retry, Hide/Show, Collapse/Expand, View Context and Replies where applicable.
- Extension-added `.extraMesButtons` remain reachable under the secondary `More` area.
- Latest assistant reply gets standalone Retry and Continue controls.
- The actual ST `#send_textarea` remains the text input.
- Attachment `+` invokes ST's actual file picker.
- Stock extension/composer actions remain compatible with the real composer.
- Observer reconciliation is idempotent.
- The leaked stock message ellipsis/pencil and the magic-wand/text-area collision found in the first visual pass are fixed.

## SnowBunny outer shell

`shell.js` replaces the stock SillyTavern mobile icon parade with SnowBunny-owned navigation.

Implemented:

- retractable top strip in the settled order: Stories, Response, API, Codex, Look, Extensions;
- stock top icon parade hidden only in SnowBunny mobile mode;
- Response routes to ST's real AI Response Configuration backend;
- API routes to ST's real connection/backend controls;
- Look routes to Background/Theme controls while the dedicated SnowBunny Appearance editor is still being ported;
- Extensions routes to real ST extension management;
- left and right SnowBunny sliding drawers with dimmed backdrop and edge access;
- left Library hierarchy and bottom quick-action row;
- right Current Chat hierarchy: Members, Persona, Model, Preset, Lorebooks, Scenario, Regex, Memory, Agents, CYOA;
- pinned Reset Chat, Statistics and Search utilities;
- top-strip collapsed state persisted through SnowBunny global state;
- panel/sheet transition coordination through `shell-transitions.js`.

Codex/Lorebooks are still deliberately not mapped to ST World Info.

## Members / current-chat cast

`member-selector.js` implements the first real SnowBunny Members backend adapter.

- `Members (N) + Add` is the current-chat cast surface.
- Add opens a portrait/name multi-select Character sheet with search and favorites-first ordering.
- Existing current members are preselected.
- For an ST group-backed chat, Apply writes the real `group.members` array and saves it through ST's group machinery.
- Per-member participation/mute maps to ST `disabled_members`, so the control affects real automatic group reply selection rather than being cosmetic.
- A chat is prevented from muting/removing its last ordinary Character member.
- Adding another ordinary Character to a legacy single-Character ST chat uses a safe promotion flow: save/snapshot the original, create a group-backed multi-member copy, copy history/metadata, record provenance, open the copy, and leave the original Character chat untouched.
- The promoted multi-member backend currently uses ST natural activation + APPEND card mode.

The mapping is documented in `SNOWBUNNY_MEMBERS_IMPLEMENTATION_REFERENCE.md`.

Still missing here: the special Narrator member adapter. Narrator must remain a protected built-in SnowBunny identity and must not be faked as an ST Character.

## Persona

`persona-selector.js` uses SillyTavern's real Persona records and selection machinery.

- searchable portrait/name sheet;
- default Persona surfaced as favorite;
- selected Persona locked to the current chat through ST chat metadata;
- chat switching reapplies that chat's Persona runtime context;
- `No Persona` is now a real per-chat option;
- No Persona suppresses Persona description/lorebook context in memory for that chat without persisting ST's global Persona position as NONE;
- leaving a No Persona chat restores the appropriate active/locked Persona context instead of leaking suppression into another chat;
- pencil route reaches the full Persona manager until the SnowBunny global editor is ported.

## Model

`model-selector.js` makes the right-drawer Model row functional without applying ST Connection Profiles wholesale.

- real ST provider/model controls remain canonical;
- Chat Completion catalog is searchable across loaded provider model selectors;
- provider identity is shown with models;
- provider source + actual model control are changed through ST's established controls;
- Text Completion uses the active connection's actual model selector;
- current chat stores only its model/provider selection reference under SnowBunny metadata;
- chat switching reapplies the saved model through ST controls;
- native model changes are captured back into chat state;
- global favorites support favorites-first browsing;
- model sheet links to API management.

Still missing: safe switching among multiple saved connection profiles. That adapter must apply only connection/model fields and must explicitly exclude Preset, Regex and fiction-system fields from ST Connection Profiles.

## Preset

`shell-actions.js` implements current-chat quick Preset selection over ST's real preset machinery.

- searchable preset sheet;
- selection changes the actual ST preset selector;
- current chat stores only its preset reference;
- switching chats reapplies that preset through ST;
- native preset changes are captured back into chat state;
- edit route temporarily opens ST's real preset/AI controls.

Still missing: the dedicated phone-first Preset editor with module toggles, reorder, import/export and Utility prompts.

## Scenario

`scenario.js` ports the settled four-field current-chat Scenario model:

- What this story is about;
- Genre and focus;
- For the writer to know;
- Important directions;
- Use this Scenario toggle;
- Reset action.

Scenario data lives in `chat_metadata.snowbunny`. When enabled it is routed to the Story Writer through ST's extension-prompt mechanism as a system prompt with World Info scanning disabled. It is not Story-shared.

## Native CYOA

`cyoa-native.js` implements the SnowBunny CYOA/story-choice system without requiring Regex ownership.

- per-chat Story Choices toggle, default off;
- dedicated writer instruction through ST extension-prompt routing;
- exactly one valid `<choicecard>` with 2 to 5 paths;
- path types dialogue/action/direction;
- dialogue is sent quoted, action/direction plain;
- valid raw CYOA markup is removed from display rendering only, while canonical saved assistant text remains unchanged;
- polished choice card is attached to the assistant reply that produced it;
- only the latest visible assistant card is actionable;
- historical cards remain readable but disabled;
- selecting a path revalidates the producing message source/revision and latest-reply status before sending through the real composer;
- unchosen paths are never inserted as story events.

An earlier prototype with unsafe self-observing DOM reconciliation was removed. The live module is event-driven instead.

## Stories and stand-alone chats

`stories-library.js` implements the first SnowBunny Stories workspace and is wired into the top Book action and left Library.

- visual and compact Story browsing modes;
- Story search;
- create/rename Story;
- Story interior as a chat browser, not a settings dashboard;
- add current chat to a Story;
- remove a chat from a Story;
- open a Story's chats;
- stand-alone chat browser;
- stand-alone discovery uses the real ST Character-chat and group-chat APIs rather than inventing duplicate chat files;
- chat references use owner type + stable Character avatar/group id + real chat id;
- current chat stores its `storyId` under SnowBunny chat metadata while the global Story index stores references for library browsing;
- chat rename events reconcile indexed Story references.

Current Story records are lightweight SnowBunny library metadata in global SnowBunny state. Story Lorebooks and Story Memories are not yet wired into these records.

`create-menu.js` owns the left-drawer Create sheet with the settled six entries: Story, Chat, Lorebook, Lore Entry, Character, Persona.

- Story creation is functional.
- Chat creation is functional when a current Character/Members chat exists and explicitly asks for stand-alone ownership or a target Story.
- Character and Persona currently bridge to their real managers.
- Lorebook and Lore Entry remain visibly unavailable until the real SnowBunny Codex store is wired; they are not redirected to ST World Info.

The old Stories prototype that used an unsafe broad DOM observer was removed.

## Current-chat utilities

- Reset Chat clears current history through ST's real clear-chat path while keeping the chat object.
- Search in Chat searches canonical message text and jumps/highlights the selected result.
- Chat Statistics shows message, word/character, alternate-reply, hidden-message, media and per-speaker counts.

## SnowBunny state + identity plumbing

`state.js` establishes lightweight namespaced state:

- global: `extension_settings.snowbunny`;
- current chat: `chat_metadata.snowbunny`;
- schema versioning;
- read/patch/delete helpers using ST's persistence functions.

`message-identity.js` gives real ST messages persisted SnowBunny identity metadata:

- stable opaque id;
- revision;
- current source fingerprint;
- origin id when a duplicate in the same chat needs a new local identity.

The source fingerprint follows canonical prose, role/speaker, selected swipe, hidden state and relevant media so derived systems can invalidate against real history changes.

## View Context

`context-view.js` provides a SnowBunny mobile View Context sheet.

- actual model/API metadata when ST stored it;
- SnowBunny message revision;
- prepared sections for History, Lore/Codex, Memories, Current State, Phone, Guidance and fitting;
- raw ST itemized prompt details remain available through a secondary action when present.

Full SnowBunny context-routing receipt production is still to be wired.

## Development launcher

`SnowBunny.bat` is the simple Windows development/testing path inside the clone:

- updates only `snowbunny-mobile` from origin;
- checks/installs production packages;
- starts the server;
- leaves errors visible.

It is a development convenience, not the final Android package/install flow.

## Visual validation completed

The first narrow/mobile-width pass confirmed the original chat-shell layer actually loads and caught two concrete layout bugs that were fixed.

The newer outer-shell, Members, Persona No Persona, Model, Scenario, CYOA and Stories work above is implemented/wired but has **not yet received another visual/device validation pass**. Do not describe those newer surfaces as tested until they are actually run.

## Still not complete

- Narrator member adapter and dedicated Narrator editor.
- SnowBunny Lorebook library and top Codex workspace.
- Story Lorebook assignment and Story-wide Memory ownership UI/data integration.
- Regex destination and native display/input integration.
- Memory Maker engine/proposal UI in the fork.
- Agents engine/UI port and Tracker/Story State panels.
- safe selective multi-connection/profile switching in Model.
- full mobile Preset editor + Utility prompts.
- final extension quick-action tray in the composer.
- full View Context routing receipts.
- safe historical Retry semantics.
- message multi-select behavior.
- final Character/Persona global SnowBunny libraries/editors instead of temporary ST manager bridges.
- full Create flow for a brand-new chat with no current Character/Members context.
- Android packaging/launcher and true-device polish.

## Next implementation focus

The next large dependency is the real SnowBunny Lorebook/Codex data layer, because it unlocks the top Codex workspace, global Lorebook library, Story Lorebook assignment and current-chat Lorebook row without lying through ST World Info. In parallel, the special Narrator adapter can finish the Members model without contaminating ordinary Character storage.
