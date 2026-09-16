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

`recent-chats.js` implements the settled three-item Recent Chats behavior.

- current chat is moved to the front on chat load/change;
- only the three most recently used chats are kept;
- Character and group-backed chats use stable owner + real chat-id references;
- Story identity is shown quietly when present;
- tapping an older recent item opens the real ST chat;
- reconciliation is idempotent so drawer mutation does not create a render loop.

## Members / ordinary Character cast

`member-selector.js` implements ordinary Character membership over ST's real group machinery.

- `Members (N) + Add` is the current-chat cast surface;
- portrait/name multi-select with search and favorites first;
- current members preselected;
- group-backed chats write the real `group.members` array;
- per-member participation/mute maps to `group.disabled_members`;
- last ordinary Character cannot be removed/muted;
- adding another ordinary Character to a legacy single-Character chat safely copies history/metadata into a new group-backed chat while leaving the original untouched;
- promoted chat uses ST natural activation + APPEND card mode.

See `SNOWBUNNY_MEMBERS_IMPLEMENTATION_REFERENCE.md`.

## Protected Narrator

`narrator.js` implements the first real SnowBunny Narrator adapter.

Implemented:

- protected Narrator option inside the same Members picker;
- per-chat `narratorMember` selection independent of ST `group.members`;
- Narrator may coexist with ordinary Characters;
- protected Narrator row appears in Members when selected;
- dedicated global mobile editor with displayed name, portrait, Narrator instructions, Voice/style and Reset;
- substantial Narrator authored data is stored as an authenticated SnowBunny user file, with only its path kept in lightweight global state;
- selected Narrator is routed to the Story Writer with a native `<narrator name="...">` wrapper through ST extension-prompt plumbing with World Info scanning disabled.

Still missing: independent Narrator-speaker dispatch. Ordinary Character replies still use ST group generation; Narrator-only new-chat fallback and separately labelled Narrator generated messages are not claimed complete.

See `SNOWBUNNY_NARRATOR_IMPLEMENTATION_REFERENCE.md`.

## Persona

`persona-selector.js` uses ST's real Persona records and selection machinery.

- searchable portrait/name sheet;
- default Persona surfaced as favorite;
- selected Persona locked to current chat;
- chat switching reapplies the correct Persona runtime context;
- real per-chat `No Persona` option;
- No Persona suppresses Persona description/lorebook context for that chat without persisting global ST Persona settings as NONE;
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

Still missing: full phone-first Preset editor with modules, reorder, import/export and Utility prompts.

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
- valid raw choice markup is removed from display without mutating saved assistant text;
- card attaches to the producing reply;
- only latest visible assistant card is actionable;
- historical cards remain readable but disabled;
- path click revalidates producing message source/revision and latest status before sending through the real composer;
- unchosen paths never become story events.

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
- global Story index stores refs for browsing;
- chat rename events reconcile indexed refs.

`story-lorebooks.js` makes Story-owned Lorebook assignment real for the current Story:

- current-chat Lorebooks sheet exposes a separate `Story Lorebooks` action when the chat belongs to a Story;
- Story selection edits `story.lorebookIds` through the native Lorebook store;
- Story Lorebooks are mandatory/effective for every chat in that Story while chat-specific extras remain separate;
- changing Story bindings emits the same binding event used by Lore retrieval.

Still missing: the full Story Settings surface that combines Story Lorebooks, Story Memories and chat membership management.

## Create sheet

`create-menu.js` owns the settled six-entry Create sheet: Story, Chat, Lorebook, Lore Entry, Character, Persona.

`create-codex-bridge.js` makes Lorebook and Lore Entry creation functional:

- create a native SnowBunny Lorebook directly;
- create a typed Lore Entry into an existing native Lorebook;
- if no Lorebook exists, create the book first.

Story and context-aware Chat creation are also live. Character and Persona still bridge to their real ST managers until native SnowBunny libraries/editors are ported.

## Native Lorebooks / Codex

The fork has a native SnowBunny Lorebook data layer rather than mapping Codex to ST World Info.

`lorebook-store.js`:

- stores full canonical Lorebook JSON as authenticated ST user files through `/api/files/upload`;
- keeps only a lightweight Lorebook index in `extension_settings.snowbunny`;
- stable opaque Lorebook/entry/section ids;
- typed entries, aliases, tags, Enabled, Always active, Description and ordered custom/structured sections;
- retrieval settings;
- chat-specific extra Lorebook ids in chat metadata;
- Story-owned mandatory ids in Story records;
- effective Story + chat Lorebook union;
- cleanup of broken assignment/index references on delete.

`codex.js` wires the same data into left global Lorebooks, right current-chat assignment and top Codex.

Current UI includes Visual/Compact views, create/edit/delete Lorebook, effective-book selector, remembered last viewed book, search, entries grouped by type, create/edit/delete Lore Entry, aliases/tags/toggles, addable custom structured fields, and locked Story-owned books in chat assignment.

See `SNOWBUNNY_CODEX_IMPLEMENTATION_REFERENCE.md`.

ST World Info remains a future compatibility import/export target, not the native Codex backend.

## Semantic + exact Lore retrieval

`lore-semantic-index.js` and `lore-retrieval.js` implement the first real semantic retrieval path using ST's vector backend.

Implemented:

- stable vector collection per Lorebook/version;
- passage generation with Lorebook/entry/type/aliases/tags context;
- passage chunking with overlap;
- stable numeric hashes for incremental sync;
- list/insert/delete synchronization through `/api/vector`;
- semantic query through the configured embedding source, default `transformers`;
- exact identity/tag ranking kept as a rescue signal;
- reciprocal-rank fusion of semantic + exact results;
- Always active entries bypass ranking;
- max-match and per-book character budgets;
- native typed wrappers into Story Writer context;
- semantic source/model/readiness/error details in Lore routing receipts;
- generation-time retrieval on awaited `GENERATION_AFTER_COMMANDS`, including the newest user draft;
- exact-only fallback if vector retrieval is unavailable.

Still missing: Character-card <-> Codex Character shared-document identity/dedup and advanced embedding-source settings UI.

## Story Memory + Memory Maker

`memory-store.js`, `memory-maker.js` and `memory-ui.js` now implement the first native Memory system.

Ownership/storage:

- Story chats share one Story Memory file referenced from the Story record;
- stand-alone chats use a chat-local Memory file pointer;
- substantial Memory state is stored as authenticated ST user files rather than bloating lightweight settings;
- accepted Memories, pending proposals, revisions, settings and last-review source are versioned together;
- manual add/edit/delete is supported with revision records.

Memory Maker:

- uses the real currently selected ST model through `generateRaw` rather than a second connection stack;
- default automatic review cadence is every five completed assistant replies, configurable 1–30;
- manual `Ask Memory Maker` is available from the Memory screen;
- proposal output is JSON-only and limited to six focused create/edit/merge/delete proposals;
- proposals are never auto-saved;
- edits/merges/deletes reference real accepted Memory ids and preserve an expected-before snapshot;
- proposal source evidence stores SnowBunny message ids/revisions/source fingerprints;
- accepting a proposal fails if accepted Memories changed or source story evidence no longer matches;
- Memory Maker's fork prompt follows the strict routing boundary: visible story + accepted Memories + pending proposals + explicit correction only; no trackers, Scenario, Lorebooks, hidden support state or unchosen CYOA paths are supplied.

Review UI:

- right-drawer Memory row is live;
- dedicated Saved Memories / Suggestions sheet;
- search and manual Memory editing;
- automatic-check settings and extra Memory Maker instructions;
- non-blocking in-chat proposal card above the composer;
- one proposal at a time with queue position;
- Create/Edit/Merge/Delete-specific presentation;
- Yes / No / Later actions;
- Yes with no note accepts;
- No with no note rejects;
- Yes + note asks Memory Maker for a revised proposal and does not save until the revised version is approved;
- No + note rejects the current version as final and asks Memory Maker to reconsider, returning a revised proposal or none;
- Later leaves the proposal pending and snoozes it for the current chat.

Still missing from Memory: relevant-Memory Recall into Story Writer context, Story/stand-alone continuity reconciliation when moving chats across ownership boundaries, phone-event evidence once Pocket Phone is ported, revision-recovery UI, and final visual/device validation.

## Current-chat utilities

- Reset Chat uses ST's real clear-chat path while keeping the chat object.
- Search in Chat searches canonical message text and jumps/highlights the result.
- Chat Statistics reports messages, words/chars, alternate replies, hidden messages, media and per-speaker counts.

## SnowBunny state + message identity

`state.js` keeps lightweight namespaced state in global `extension_settings.snowbunny` and chat `chat_metadata.snowbunny`.

`message-identity.js` gives real ST messages persisted SnowBunny ids, revisions and source fingerprints that follow prose, role/speaker, selected swipe, hidden state and relevant media.

This is the validity base for Trackers, Memories, CYOA and View Context.

## View Context

`context-view.js` provides the SnowBunny mobile sheet with actual ST model/API metadata, SnowBunny message revision, future routing sections and a raw-ST-prompt secondary action.

Lore routing produces/persists its detailed receipt section. Memory recall receipts are not present yet because Recall is not yet implemented.

## Development launcher

`SnowBunny.bat` updates `snowbunny-mobile`, checks packages and starts the server without repeating the earlier PowerShell command quest.

It remains a development launcher, not the final Android package.

## Visual validation status

The first narrow/mobile-width pass validated the original chat-shell layer and caught the two fixed layout bugs.

The newer navigation, Members, Narrator, No Persona, Model, Scenario, CYOA, Stories, Recent Chats, native Codex/semantic retrieval and Memory systems are implemented/wired but have **not yet received another visual/device validation pass**. Do not call those newer surfaces tested until they are run.

## Still not complete

- Narrator independent-speaker dispatch, Narrator-only new-chat fallback and separate Narrator message identity;
- full Story Settings combining Lorebooks + Memories + chat membership;
- relevant accepted-Memory Recall into Story Writer context;
- continuity reconciliation for Story <-> stand-alone Memory ownership changes;
- Memory revision/recovery UI;
- Character <-> Codex Character stable shared-document identity/dedup;
- Regex destination and native display/input integration;
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

The next coherent block is Memory Recall + Tracker/Story State routing, because both can now build on stable message identity, native Memories, Lore receipts and the existing Current Chat shell. After that, Regex/Agents and the full mobile Preset editor can replace more of the remaining temporary ST bridges.
