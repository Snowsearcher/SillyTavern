# SnowBunny Chat Implementation Status

This file records what is actually implemented on `snowbunny-mobile`, separate from design/reference documents.

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
- real ST `#send_textarea`, attachment picker and extension composer controls remain canonical;
- observer reconciliation is idempotent;
- leaked stock message controls and the magic-wand/text collision found in the first visual pass are fixed.

## SnowBunny navigation shell

`shell.js` replaces the stock mobile icon parade with SnowBunny-owned navigation.

Implemented:

- retractable top strip: Stories, Response, API, Codex, Look, Extensions;
- left Library and right Current Chat sliding drawers;
- edge handles/swipes and dimmed backdrop;
- left Library hierarchy plus Creator / Characters / Personas / `…` bottom row;
- right Members, Persona, Model, Preset, Lorebooks, Scenario, Regex, Memory, Agents, CYOA hierarchy;
- pinned Reset Chat, Statistics and Search utilities;
- collapsed top-strip state persisted;
- panel/sheet transition coordination.

Response is now a native SnowBunny mobile surface over ST's canonical generation controls. API, Look and Extensions still bridge to established ST management surfaces while their final SnowBunny screens are ported.

## AI Response Configuration

`response-config.js` provides the native top Response/Cog surface without creating a second generation-settings stack.

It edits the real ST controls and therefore uses ST's existing persistence and request path.

Phone-first controls include response/context size, Temperature, Top P/Top K/Min P, applicable penalties, reasoning effort, verbosity, reasoning return and streaming. Provider-specific controls not mapped into the compact screen remain reachable through Advanced rather than being silently removed.

## Recent Chats

`recent-chats.js` implements the settled three-item quick list.

- current chat moves to the front on load/change;
- only three recent chats are kept;
- Character/group chats use stable owner + real chat-id references;
- Story identity is shown quietly when present;
- older items open the real ST chat;
- reconciliation is idempotent.

## Members / ordinary Character cast

`member-selector.js` implements ordinary Character membership over ST's real group machinery.

- `Members (N) + Add` with portrait/name multi-select, search and favorites first;
- group-backed chats write real `group.members`;
- participation/mute maps to `group.disabled_members`;
- last ordinary Character cannot be removed/muted;
- adding a second Character to a legacy one-on-one chat safely creates a group-backed copy with history/metadata while leaving the original untouched;
- promoted chats use ST natural activation + APPEND card mode.

See `SNOWBUNNY_MEMBERS_IMPLEMENTATION_REFERENCE.md`.

## Protected Narrator

`narrator.js` implements the protected special Narrator identity.

- Narrator option in Members;
- per-chat membership independent of ST `group.members`;
- may coexist with ordinary Characters;
- dedicated global editor for displayed name, portrait, instructions, Voice/style and Reset;
- authored Narrator data lives in an authenticated SnowBunny user file;
- selected Narrator routes to Story Writer through a native `<narrator>` wrapper without World Info scanning.

Still missing: independent Narrator-speaker dispatch, Narrator-only new-chat fallback and separately labelled Narrator generated messages.

See `SNOWBUNNY_NARRATOR_IMPLEMENTATION_REFERENCE.md`.

## Native Character authoring and library

`character-authoring.js` and `character-library.js` now provide the first native SnowBunny Character authoring path without creating duplicate Character records.

Canonical ownership:

- the real ST Character card remains authoritative;
- richer SnowBunny authoring lives under `data.extensions.snowbunny` on that same card;
- every adopted/saved Character can receive a stable SnowBunny `entityId`;
- existing ST description/personality/example-dialogue/First Message are adopted rather than discarded;
- other Character extensions are preserved.

Author document:

- Structured / Freeform mode;
- main freeform content;
- ordered built-in fields;
- custom fields;
- Voice Lines retain a dialogue-example role;
- First Message retains a startup-only role.

Compatibility projection writes the canonical document back to ST description/personality/example-dialogue/First Message fields so existing ST/Fabled presets and extensions still receive familiar sources.

Global Character library:

- Visual / Compact;
- artwork-forward cards;
- search by name/category/aliases/tags;
- favorites;
- tag and linked-Lorebook filtering;
- category grouping/collapse;
- name/recent/oldest sorting;
- protected Narrator discovery card;
- Create uses ST's real Character creation control.

Character editor:

- Details / Writing / Preview;
- category, aliases, tags, creator/version/source/notes;
- linked Lorebooks;
- Structured / Freeform authoring without destructive conversion;
- custom field add/remove/reorder/clear;
- empty fields hidden in Preview.

Still using ST's canonical card path for artwork replacement and safe card/chat-owner rename. Full SnowBunny import/export/delete/replace/rename UI has not been ported yet.

See `SNOWBUNNY_CHARACTER_PERSONA_IMPLEMENTATION_REFERENCE.md`.

## Character <-> Codex stable shared identity

This seam is now implemented by `character-codex-links.js`, the Lorebook store/retrieval/index adapters and `codex-linked-character-ui.js`.

- linked Codex Character entries store stable `entityId` + real Character avatar linkage, not a second prose copy;
- linked entry content is materialized from the live Character author document for semantic indexing and Lore retrieval;
- Character edits refresh semantic content even when the Lorebook JSON itself did not need to change;
- active Character Member + linked retrieved Codex Character is deduplicated by stable `entityId` before token fitting;
- display-name equality alone never causes deduplication;
- retrieval widens the candidate window before filtering a duplicate linked Character so another useful Lore entry is not crowded out;
- Lore View Context records linked Character entries suppressed by this rule;
- linked Codex Character cards are labelled `Shared Character` and route back to the Character editor.

Independent Character-type Codex entries remain ordinary independent Lore entries.

## Native Persona authoring and library

`persona-authoring.js` and `persona-library.js` provide the native SnowBunny Persona library/editor over ST's real Persona records.

- real ST Persona/avatar remains authoritative;
- SnowBunny authored document lives inside the existing Persona descriptor;
- ST Persona placement/depth/role/Lorebook/connection metadata is preserved;
- Structured / Freeform canonical authoring with ordered/custom fields;
- no Character-only First Message field;
- compatibility projection updates ST Persona description;
- editing the active Persona refreshes its in-memory Persona context;
- SnowBunny favorites are separate from ST's one default Persona;
- real default-Persona state remains editable.

Library/editor:

- Visual / Compact portrait cards;
- search by name/title/category/aliases/tags;
- favorites/default-first ordering;
- Details / Writing / Preview;
- title/category/aliases/tags;
- Structured / Freeform writing and custom fields.

Persona create/import/avatar replacement/delete and advanced placement/connection management currently remain available through ST's canonical Persona management rather than being reimplemented unsafely.

See `SNOWBUNNY_CHARACTER_PERSONA_IMPLEMENTATION_REFERENCE.md`.

## Persona current-chat selector

The right-drawer Persona selector remains chat-specific and separate from the global Persona library.

- searchable portrait/name selector over real ST Persona records;
- current-chat Persona lock/reapply;
- real per-chat `No Persona` suppression without persisting global ST Persona position as NONE;
- Persona context restores correctly when leaving a No Persona chat.

## Model / Preset / Scenario

Model:

- real ST provider/model controls remain canonical;
- searchable Chat Completion model catalog;
- provider identity and favorites-first browsing;
- per-chat model/provider reference and reapply;
- direct route to API management.

Preset:

- current-chat searchable quick selector over ST's real preset machinery;
- per-chat preset reference/reapply;
- `preset-editor.js` provides the native phone-first full editor for Chat Completion presets;
- actual ST prompt objects + global prompt order remain canonical;
- exact imported order/text/unknown fields preserved unless edited;
- touch reorder, enable/disable and add/edit/delete user modules;
- dynamic source markers remain source rows;
- Advanced exposes injection position/depth/order, triggers and forbid-overrides;
- Utility Prompts include Impersonation, Lore/Scenario/Personality formats, Group nudge, New Chat, New Group Chat, New Example Chat, Continue nudge and Replace Empty Message;
- ST reset/import/export/save-as/rename/delete semantics are reused.

Non-Chat-Completion preset families still fall back to their established ST editors until mapped safely.

Scenario:

- settled four fields;
- per-chat toggle and Reset;
- chat metadata storage;
- writer routing through ST extension-prompt plumbing with World Info scanning disabled.

Still missing here: selective multi-connection/profile switching in Model.

See `SNOWBUNNY_PRESET_IMPLEMENTATION_REFERENCE.md`.

## Native CYOA

`cyoa-native.js` implements Story Choices independently of Regex.

- per-chat toggle, default off;
- exactly one valid `<choicecard>` with 2–5 paths;
- dialogue/action/direction semantics;
- raw valid markup removed from display only, canonical assistant text preserved;
- card attached to producing reply;
- only latest visible assistant card actionable;
- historical cards readable but disabled;
- selection revalidates source/revision/latest status;
- unchosen paths never become events.

## Stories, Story Settings and stand-alone chats

`stories-library.js` implements visual Stories and Stand-alone Chats browsing over real ST chats.

`story-settings.js` manages only the settled shared layer: Story Lorebooks, accepted Story Memories and Story chat membership. Persona, Members, Model, Preset, Scenario, Regex, Agents and CYOA remain chat-specific.

`story-ownership.js` implements continuity-safe ownership transitions:

- Story -> stand-alone forks accepted Story Memories into new local ids with lineage and converts effective Story Lorebooks to chat bindings;
- pending proposals do not become accepted history;
- stand-alone -> Story leaves destination Story Memory authoritative and stages local accepted Memories for review;
- duplicates are skipped;
- related lineage can become edit-review rather than duplicate creation;
- Story A -> Story B is fork then join/review.

See `SNOWBUNNY_STORY_OWNERSHIP_IMPLEMENTATION_REFERENCE.md`.

## Native Lorebooks / Codex

SnowBunny Codex is its own authored Lore system, not a prettier ST World Info screen.

`lorebook-store.js` keeps canonical Lorebook JSON in authenticated ST user files with stable ids, typed entries, aliases, tags, activation, custom fields and Story/chat bindings.

`codex.js` supplies global Lorebooks, right chat assignment and top Codex with Visual/Compact browsing, search, type groups, create/edit and locked Story-owned assignments.

ST World Info remains a compatibility import/export target, not the native Codex backend.

See `SNOWBUNNY_CODEX_IMPLEMENTATION_REFERENCE.md`.

## Semantic + exact Lore retrieval

`lore-semantic-index.js` + `lore-retrieval.js` use ST's vector backend.

- stable vector collections;
- passage chunking/overlap and stable hashes;
- incremental list/insert/delete sync;
- semantic query with configurable source, default `transformers`;
- exact identity/tag rescue + reciprocal-rank fusion;
- Always active bypass;
- match/budget limits;
- typed wrappers;
- awaited generation-time retrieval including newest draft;
- exact-only fallback when vectors fail;
- detailed Lore View Context receipt;
- linked Character materialization and stable-identity dedup as described above.

Still missing: final advanced embedding-source UI.

## Story Memory + Memory Maker

Native Memory is implemented through `memory-store.js`, `memory-maker.js`, `memory-integrity.js`, `memory-ui.js`, `memory-recovery.js` and Recall.

- Story chats share Story Memory; stand-alone chats use local Memory;
- substantial state lives in authenticated user files;
- accepted Memories and reviewed proposals are versioned;
- automatic/manual Memory Maker with strict JSON proposals;
- never auto-saves proposals;
- Yes / No / Later and note-driven revision;
- source evidence uses message ids/revisions/fingerprints;
- edits/swipes/hides/deletes can mark accepted Memory `Needs review`;
- source-changed Memories are excluded from Recall;
- recovery creates review proposals rather than silently rewriting history.

Memory Maker evidence remains intentionally separate from Tracker inference, Scenario/Lore as events and unchosen choices.

See `SNOWBUNNY_MEMORY_IMPLEMENTATION_REFERENCE.md`.

## Memory Recall

`memory-recall.js` routes relevant accepted Memories before Story Writer generation.

- newest draft + recent visible story;
- valid current Tracker only as a relevance hint;
- bounded candidate pass;
- active model selects at most five existing Memory ids with reasons;
- familiar names alone are insufficient;
- source-changed Memories excluded;
- conservative fallback on selector failure;
- selected text uses native `<recalled-memories>` wrappers;
- View Context records mode, exclusions, tracker hint revision and reasons.

## Story Tracker / rich Story State

`tracker-store.js`, `story-tracker.js`, `tracker-ui.js` and `agents-ui.js` implement the native Story Tracker.

- authenticated chat-specific snapshot store;
- source-bound snapshots with previous-state dependency chain;
- edits/deletes/swipes propagate staleness through descendants;
- stale state is removed from writer routing while historical panels remain readable;
- deep changes rebuild chronologically from the last trustworthy state;
- replay never sees future story text;
- multi-speaker replies are queued in order;
- failed rebuild stops at the continuity break;
- current editable state is hidden writer context, never rewritten into visible prose;
- Time & Place + rich Story State attach to the producing reply;
- manual edits preserve generated pre-edit state.

See `SNOWBUNNY_TRACKER_IMPLEMENTATION_REFERENCE.md`.

## Custom Agents

Native Custom Agents now run alongside the built-in Story Tracker.

- per-chat definitions/results;
- manual/automatic cadence;
- header/above/below/hidden placement;
- optional latest-valid feedback to Story Writer;
- dependencies with cycle/missing-dependency validation;
- optional accepted-Memory evidence;
- strict visible-story evidence and unchosen-CYOA exclusion;
- source validity and stale-result reconciliation;
- previous valid result survives a failed run;
- import/export;
- historical reader-facing result projection;
- View Context receipt when Agent feedback reached Story Writer.

## Pocket Phone

The native Pocket Phone continuity core, reader UI and first built-in Upkeep engine are live.

- authenticated chat-specific Phone file;
- stable Character/Codex actor identity;
- evidence-bound contacts/messages/posts/actions;
- invalid branch-derived Phone facts excluded by stable message id/revision/source checks;
- private Character-aware messaging with silence, pending replies and unread state;
- texting-style rules affect writing conventions only, never personality/knowledge;
- Story-time-aware availability and proactive communication;
- evidence-backed automatic contact discovery requiring an exact story quotation;
- Pocket Phone Upkeep cadence counts completed story replies rather than real time;
- unknown fictional time does not arm proactive polling;
- at most two motivated proactive contacts selected per upkeep pass;
- Agents surface exposes Phone Upkeep toggle, Run now and Advanced cadence/history/reply-limit controls;
- dashboard with Persona, Story time, Inbox, Messages, Nightowl, Settings and Gallery;
- Phone quick action in the composer when enabled;
- factual Phone evidence can reach Memory Maker;
- Phone can act as a Memory Recall relevance hint;
- relevant Phone continuity can reach Story Writer with an explicit knowledge boundary;
- View Context records Phone routing for the generated reply.

Still missing for full Phone parity: persistent/generated Nightowl world, public profile/reply generation, artwork/profile folders and bundle import, full generated media fulfillment, stale-evidence review UI and final shared composer quick tray.

See `SNOWBUNNY_PHONE_IMPLEMENTATION_REFERENCE.md`.

## Native Regex

`regex-native.js` provides SnowBunny Regex UX while ST's mature engine remains canonical.

- real `This chat` and `All chats` scopes;
- global before chat rules through a small direct core adapter;
- reorder/toggle;
- Message display vs AI input;
- User/Assistant targets;
- Replace/Erase;
- live preview through ST's compiler/replacement behavior;
- Advanced flags/depth/capture trimming/macros/edit behavior;
- import/export;
- Context Saver helper;
- compatibility guard for extra ST placements.

Canonical saved chat prose is not rewritten by SnowBunny-authored chat rules.

See `SNOWBUNNY_REGEX_IMPLEMENTATION_REFERENCE.md` and `SNOWBUNNY_DIRECT_CORE_CHANGES.md`.

## View Context / final-request audit

Context receipts now include:

- Lore/Codex retrieval and linked-Character dedup;
- recalled Memories;
- current Story Tracker;
- Custom Agent writer feedback;
- selectively routed Pocket Phone continuity;
- selected model/provider/API/preset;
- Scenario/CYOA/Narrator/Members/Regex guidance summary;
- final outgoing Chat/Text Completion request capture;
- message-role and character counts;
- visible canonical history text-matched against the final outgoing request;
- omitted/unmatched visible history;
- context-fitting warning;
- whether raw `<choicecard>` markup survived into model input.

History is labelled as text matching rather than pretending transformed prompts always have exact one-to-one provenance.

## Current-chat utilities

Reset Chat, Search in Chat and Chat Statistics are live through real ST chat data.

## State, validation and launcher

`state.js` keeps lightweight namespaced global/chat state. `message-identity.js` persists stable SnowBunny message ids/revisions/source fingerprints and underpins CYOA expiry, Tracker, Memory, Agents, Phone and View Context.

`SnowBunny.bat` updates the development branch, checks packages and starts ST without the earlier repeated command sequence. It is not the final Android package.

`.github/workflows/snowbunny-static-check.yml` checks every SnowBunny JavaScript file plus the deliberate Regex core adapter on pushes. The current SnowBunny JavaScript build passes this check.

The upstream merge-conflict workflow may remain red on the fork because its GitHub App token cannot be minted; it fails before its actual conflict check and is not a SnowBunny code result.

## Visual validation status

The first narrow/mobile-width pass validated the original chat shell and caught the fixed stock-control/composer overlap bugs.

The newer navigation, Response, Members, Narrator, Character/Persona libraries, shared Character/Codex editor route, Model, Preset, Scenario, CYOA, Stories, Codex retrieval, Memory, Regex, Agents, Story State, Pocket Phone and expanded View Context are implemented/wired but have **not yet received the next visual/device validation pass**. Do not call those surfaces visually approved until they are run.

## Still not complete

- independent Narrator-speaker dispatch and Narrator-only new-chat fallback;
- full Pocket Phone Nightowl/social-world and artwork/media parity;
- Memory Maker cross-chat source validation without opening the source chat;
- final advanced Lore embedding-source UI;
- selective multi-connection/profile switching in Model;
- native full preset editors for non-Chat-Completion backend families;
- final extension quick-action tray in composer;
- safe historical Retry semantics;
- message multi-select behavior;
- direct SnowBunny Character import/export/safe delete/replace/rename/artwork workflows;
- direct SnowBunny Persona creation/import/avatar replacement/delete/advanced placement workflows;
- full brand-new-chat flow with no existing Character/Members context;
- Android packaging and true-device polish.

## Next implementation focus

Pocket Phone private continuity and evidence-backed Upkeep are now in place. The next Phone block is the Story-persistent Nightowl/social-world layer plus the profile/artwork system recovered from the old SnowBunny design, followed by its richer public profile/reply interactions and media fulfillment.

A fresh narrow/mobile visual pass is also due soon. It should happen before presentation work stacks much further, so keyboard, drag/reorder, selector, Phone and workspace layout problems in the newly added surfaces are caught early.