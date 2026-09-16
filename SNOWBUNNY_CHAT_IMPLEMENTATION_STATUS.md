# SnowBunny Chat Implementation Status

This file records what is actually implemented on `snowbunny-mobile`, separate from the design/reference documents.

## Live chat shell

SnowBunny works directly on SillyTavern's real chat DOM and real composer.

Implemented:

- mobile message-card presentation over `.mes` / `.mes_block`;
- distinct user/system presentation without rewriting canonical prose;
- stock permanent message-action clutter hidden while compatibility nodes remain;
- tap message -> anchored SnowBunny action menu;
- Copy, Edit, Use as Draft, Delete, latest-safe Retry, Hide/Show, Collapse/Expand, View Context and Replies where applicable;
- extension-added message actions remain reachable through `More`;
- standalone Retry and Continue beneath the latest assistant reply;
- real ST `#send_textarea` retained;
- attachment `+` uses the real ST picker;
- composer extension actions remain compatible;
- observer reconciliation is idempotent;
- the leaked stock message controls and magic-wand/text-area collision from the first visual pass are fixed.

## SnowBunny navigation shell

`shell.js` replaces the stock mobile icon parade with SnowBunny-owned navigation.

Implemented:

- retractable top strip: Stories, Response, API, Codex, Look, Extensions;
- left Library and right Current Chat sliding drawers;
- edge handles/swipes and dimmed backdrop;
- left Library hierarchy plus Creator / Characters / Personas / `…` bottom row;
- right Members, Persona, Model, Preset, Lorebooks, Scenario, Regex, Memory, Agents, CYOA hierarchy;
- pinned Reset Chat, Statistics and Search utilities;
- Response/API/Look/Extensions bridge to real ST backend controls while native SnowBunny editors are ported;
- collapsed top-strip state persisted;
- panel/sheet transition coordination.

## Recent Chats

`recent-chats.js` replaces the one-card shell placeholder with the settled three-item Recent Chats behavior.

- current chat is moved to the front on chat load/change;
- only the three most recently used chats are kept in the quick list;
- Character and group-backed chats use stable owner + real chat-id references;
- Story identity is shown quietly when the chat belongs to a Story;
- tapping an older recent item opens the real ST chat rather than creating a duplicate.

## Members / current-chat cast

`member-selector.js` implements the ordinary-Character Members backend adapter.

- `Members (N) + Add` is the current-chat cast surface;
- portrait/name multi-select with search and favorites first;
- existing members preselected;
- ST group-backed chats write the real `group.members` array;
- per-member participation/mute maps to ST `disabled_members`, so it affects real automatic group reply selection;
- last ordinary Character cannot be removed/muted;
- adding another ordinary Character to a legacy single-Character ST chat safely promotes by copying history/metadata into a new group-backed chat while leaving the original untouched;
- promoted chat uses ST natural activation + APPEND card mode.

See `SNOWBUNNY_MEMBERS_IMPLEMENTATION_REFERENCE.md`.

Still missing: the special Narrator adapter. Narrator must remain a protected built-in SnowBunny identity, not a fake ST Character.

## Persona

`persona-selector.js` uses ST's real Persona records and selection machinery.

- searchable portrait/name sheet;
- default Persona surfaced as favorite;
- selected Persona locked to current chat;
- switching chats reapplies that chat's Persona runtime context;
- real per-chat `No Persona` option;
- No Persona suppresses Persona description/lorebook context in memory for that chat without persisting global ST Persona settings as NONE;
- leaving a No Persona chat restores the appropriate Persona context;
- pencil route reaches the full Persona manager until the native SnowBunny library/editor is ported.

## Model

`model-selector.js` makes Model functional without applying ST Connection Profiles wholesale.

- real ST provider/model controls remain canonical;
- searchable Chat Completion catalog across loaded provider model selectors;
- provider identity shown with models;
- real provider source + model control changed through ST;
- Text Completion uses the active connection's real model selector;
- current chat stores only its model/provider reference;
- chat switching reapplies that selection;
- native model changes are captured back into chat state;
- global favorites-first browsing;
- direct route to API management.

Still missing: selective multi-connection/profile switching that applies only connection/model fields and explicitly excludes Preset, Regex and fiction-system fields.

## Preset

`shell-actions.js` implements current-chat quick Preset selection over ST's real preset machinery.

- searchable preset sheet;
- changes the actual ST preset selector;
- stores only a per-chat preset reference;
- chat switching reapplies it;
- native preset changes are captured back;
- edit route temporarily opens ST's real controls.

Still missing: the full phone-first Preset editor with modules, reorder, import/export and Utility prompts.

## Scenario

`scenario.js` ports the settled current-chat Scenario:

- What this story is about;
- Genre and focus;
- For the writer to know;
- Important directions;
- Use this Scenario toggle;
- Reset.

Scenario lives in `chat_metadata.snowbunny` and routes to the Story Writer through ST extension-prompt plumbing with World Info scanning disabled.

## Native CYOA

`cyoa-native.js` implements Story Choices independently of Regex.

- per-chat toggle, default off;
- dedicated writer instruction;
- exactly one valid `<choicecard>` with 2 to 5 paths;
- dialogue/action/direction types;
- display removes valid raw choice markup without mutating saved assistant text;
- card attaches to the producing reply;
- only latest visible assistant card is actionable;
- historical cards remain readable but disabled;
- path click revalidates producing message source/revision and latest status before sending through the real composer;
- unchosen paths never become story events.

The earlier unsafe self-observing prototype was removed; the live renderer is event-driven.

## Stories and stand-alone chats

`stories-library.js` implements the first real Stories workspace.

- top Book and left Stories routes are live;
- Visual/Compact Story browsing;
- Story search;
- create/rename Story;
- Story interior is a chat browser rather than a settings dashboard;
- add current chat to Story;
- remove chat from Story;
- open Story chats;
- Stand-alone Chats browser;
- chat discovery uses real ST Character-chat/group-chat APIs;
- stable chat references use owner type + Character avatar/group id + real chat id;
- current chat stores its Story id in SnowBunny chat metadata;
- global Story index stores refs for library browsing;
- chat rename events reconcile indexed refs.

Story Lorebooks can now be represented by `story.lorebookIds` in the native Lorebook store, but the dedicated Story Settings assignment screen is still to be added. Story Memories remain to be wired.

## Create sheet

`create-menu.js` owns the settled six-entry Create sheet:

- Story;
- Chat;
- Lorebook;
- Lore Entry;
- Character;
- Persona.

Currently:

- Story creation works;
- Chat creation works from an existing Character/Members context and explicitly asks for stand-alone or target-Story ownership;
- Character and Persona bridge to their real managers;
- Lorebook and Lore Entry are still temporarily disabled in the Create sheet even though the native Codex store now exists; direct creation already works from the Lorebooks/Codex workspaces and the Create-sheet bridge remains to be connected.

## Native Lorebooks / Codex

The fork now has a native SnowBunny Lorebook data layer instead of mapping Codex to ST World Info.

`lorebook-store.js`:

- stores full canonical Lorebook JSON as authenticated ST user files through the existing `/api/files/upload` path;
- keeps only a lightweight Lorebook index in `extension_settings.snowbunny`;
- uses stable opaque Lorebook/entry/section ids;
- supports typed entries, aliases, tags, Enabled, Always active, Description and ordered custom/structured sections;
- tracks retrieval mode/settings;
- separates content from assignment;
- stores chat-specific extra Lorebook ids in chat metadata;
- reads Story-owned mandatory ids from Story records;
- computes the effective Story + chat Lorebook union;
- deletes broken assignment/index references when a Lorebook is removed.

`codex.js` wires the same data into all three settled access contexts:

1. left global Lorebooks library;
2. right current-chat Lorebook assignment;
3. top Codex workspace.

Current UI includes:

- Visual/Compact Lorebook library;
- create/edit/delete Lorebook;
- one effective Codex book at a time with selector when multiple books are bound;
- remembered last viewed effective book per chat;
- prominent Codex search;
- entries grouped by type;
- create/edit/delete Lore Entry;
- Character/Location/Object/Lore/Concept/Faction/Event/Other types;
- aliases, tags, Enabled, Always active, Description;
- addable custom structured fields;
- Story-owned books shown locked in the current-chat assignment sheet.

See `SNOWBUNNY_CODEX_IMPLEMENTATION_REFERENCE.md`.

ST World Info is still only a future compatibility import/export target.

## Lore routing to the Story Writer

`lore-retrieval.js` routes effective native SnowBunny Lorebooks into the real Story Writer prompt.

Current keyword path supports:

- recent visible-history scan window;
- Enabled filtering;
- Always active entries;
- exact name/alias whole-word rescue;
- tag signals;
- max matches;
- per-book character budget;
- directional native wrappers by entry type;
- a View Context receipt describing selected Lorebook/entry ids and match reason.

Meaning mode is **not yet the final vector system**. Until the old SnowBunny semantic index is ported it uses exact identity rescue plus a temporary lexical-overlap fallback, and the routing receipt explicitly marks the semantic vector index as not ready. Do not describe this as vector similarity.

Still missing from Codex retrieval: dedicated embedding cache/passages/semantic fusion and stable Character-card <-> Codex Character shared-document dedup.

## Current-chat utilities

- Reset Chat uses ST's real clear-chat path while keeping the chat object.
- Search in Chat searches canonical message text and jumps/highlights the result.
- Chat Statistics reports messages, words/chars, alternate replies, hidden messages, media and per-speaker counts.

## SnowBunny state + message identity

`state.js` keeps lightweight namespaced state in:

- global `extension_settings.snowbunny`;
- chat `chat_metadata.snowbunny`.

`message-identity.js` gives real ST messages persisted SnowBunny ids, revisions and source fingerprints that follow prose, role/speaker, selected swipe, hidden state and relevant media.

This is the validity base for Trackers, Memories, CYOA and View Context.

## View Context

`context-view.js` provides the SnowBunny mobile sheet with actual ST model/API metadata, SnowBunny message revision, future routing sections and a raw-ST-prompt secondary action.

Lore routing now produces its own receipt section, though persistence/final receipt aggregation for every subsystem is still incomplete.

## Development launcher

`SnowBunny.bat` updates `snowbunny-mobile`, checks packages and starts the server without repeating the earlier PowerShell command quest.

It remains a development launcher, not the final Android package.

## Visual validation status

The first narrow/mobile-width pass validated the original chat-shell layer and caught the two fixed layout bugs.

The newer navigation, Members, No Persona, Model, Scenario, CYOA, Stories, Recent Chats and native Codex work is implemented/wired but has **not yet received another visual/device validation pass**. Do not call those newer surfaces tested until they are run.

## Still not complete

- Narrator member adapter and dedicated Narrator editor;
- Story Settings for mandatory Lorebook assignment, Story Memory management and Story chat membership management;
- full semantic/vector Lorebook index and exact+semantic fusion;
- Character <-> Codex Character stable shared-document identity/dedup;
- Create-sheet Lorebook/Lore Entry bridge;
- Regex destination and native display/input integration;
- Memory Maker engine/proposal UI;
- Agents engine/UI and Tracker/Story State panels;
- selective multi-connection/profile switching in Model;
- full mobile Preset editor + Utility prompts;
- final extension quick-action tray in composer;
- full View Context receipt aggregation/persistence;
- safe historical Retry semantics;
- message multi-select behavior;
- native SnowBunny Character/Persona global libraries/editors instead of temporary ST manager bridges;
- full brand-new-chat flow with no existing Character/Members context;
- Android packaging and true-device polish.

## Next implementation focus

Finish the Codex ownership seam now that native storage exists: Story Settings Lorebook assignment + Create-sheet Lorebook/Lore Entry routes, then port the semantic retrieval index. After that, Narrator can finish the Members model without contaminating ordinary Character storage.
