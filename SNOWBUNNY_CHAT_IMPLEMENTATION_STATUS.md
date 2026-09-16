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
- the real ST `#send_textarea` remains canonical;
- attachment `+` uses ST's real picker;
- composer extension actions remain compatible;
- observer reconciliation is idempotent;
- the leaked stock message controls and magic-wand/text collision found in the first visual pass are fixed.

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

`response-config.js` provides the native top `Response` / Cog surface without creating a second generation-settings stack.

It edits the real ST controls and therefore uses ST's existing persistence and request path.

Live phone-first controls include:

- response length;
- context size;
- Temperature;
- Top P;
- Top K;
- Min P;
- frequency/presence penalties where supported;
- repetition penalty where supported;
- reasoning effort;
- verbosity;
- reasoning/thought return toggle;
- streaming where the current backend exposes it.

Provider-specific capability that is not mapped into the compact SnowBunny screen remains reachable through a small Advanced route to the canonical ST controls instead of being silently removed.

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

`narrator.js` implements the first native Narrator adapter.

- protected Narrator option in Members;
- per-chat Narrator membership independent of ST `group.members`;
- Narrator may coexist with ordinary Characters;
- dedicated global editor for displayed name, portrait, Narrator instructions, Voice/style and Reset;
- authored Narrator data lives in an authenticated SnowBunny user file;
- selected Narrator routes to Story Writer with a native `<narrator>` wrapper and no World Info scan.

Still missing: independent Narrator-speaker dispatch, Narrator-only new-chat fallback and separately labelled Narrator generated messages.

See `SNOWBUNNY_NARRATOR_IMPLEMENTATION_REFERENCE.md`.

## Persona / Model / Preset / Scenario

Persona:

- searchable portrait/name selector over real ST Persona records;
- default Persona favorite;
- current-chat Persona lock/reapply;
- real per-chat `No Persona` suppression without persisting global ST Persona position as NONE;
- Persona context restores correctly when leaving a No Persona chat.

Model:

- real ST provider/model controls remain canonical;
- searchable Chat Completion model catalog;
- provider identity and favorites-first browsing;
- per-chat model/provider reference and reapply;
- direct route to API management.

Preset:

- current-chat searchable quick selector over ST's real preset machinery;
- per-chat preset reference/reapply;
- `preset-editor.js` now provides the native phone-first full editor for Chat Completion presets;
- actual ST prompt objects + global prompt order remain canonical;
- exact imported order/text/unknown fields are preserved unless edited;
- touch reorder and enable/disable;
- add/edit/delete user prompt modules;
- dynamic source markers remain source rows rather than fake editable prose;
- Advanced exposes injection position/depth/order, generation triggers and forbid-overrides;
- Utility Prompts include Impersonation, Lore format, Scenario format, Personality format, Group nudge, New Chat, New Group Chat, New Example Chat, Continue nudge and Replace Empty Message;
- ST's own reset actions are reused for defaults;
- Import / Export / Save as / Rename / Delete delegate to established ST preset management.

Non-Chat-Completion backend preset editors still fall back to their existing ST controls until their schemas are mapped safely.

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

`stories-library.js` implements the visual Stories workspace and Stand-alone Chats browser.

- top Book and left Stories routes;
- Visual/Compact browsing and search;
- create/rename Story;
- Story interior is a chat browser;
- real ST Character/group chat discovery;
- stable owner + chat-id refs;
- current chat Story id plus global Story chat index.

`story-settings.js` manages only the settled shared layer:

- Story Lorebook assignment;
- accepted Story Memories;
- Story chat membership.

It does not make Persona, Members, Model, Preset, Scenario, Regex, Agents or CYOA Story-owned.

`story-ownership.js` implements continuity-safe ownership transitions:

- Story -> stand-alone snapshots all accepted Story Memories into a new local Memory file with new local ids + lineage metadata;
- pending Story proposals are not treated as accepted local history;
- effective Story + chat Lorebook union becomes chat-specific bindings when leaving;
- stand-alone -> Story leaves destination Story Memories authoritative and stages local accepted Memories as review proposals instead of silently injecting them;
- exact duplicates are skipped;
- a local Memory forked from the same destination Story can become an edit-review proposal against its original Story Memory;
- Story A -> Story B is fork-to-stand-alone then join/review;
- other Story chats must be opened before detaching so SnowBunny can safely write their local continuity rather than editing only the Story index.

`story-create-safety.js` disables the old Story-create checkbox that could bypass continuity review. Create the Story first, then add the chat through the safe ownership path.

See `SNOWBUNNY_STORY_OWNERSHIP_IMPLEMENTATION_REFERENCE.md`.

## Native Lorebooks / Codex

SnowBunny Codex is its own data system rather than a prettier ST World Info screen.

`lorebook-store.js`:

- full canonical Lorebook JSON in authenticated ST user files;
- lightweight global index only;
- stable Lorebook/entry/section ids;
- typed entries, aliases, tags, Enabled, Always active, Description and ordered custom fields;
- chat-specific and Story-owned bindings;
- effective Story + chat union.

`codex.js` wires the same data into left global Lorebooks, right chat assignment and top Codex.

UI includes Visual/Compact views, create/edit/delete books and entries, effective-book selector, search, type groups, aliases/tags/toggles/custom fields, and locked Story-owned assignments.

See `SNOWBUNNY_CODEX_IMPLEMENTATION_REFERENCE.md`.

ST World Info remains a compatibility import/export target, not the native Codex backend.

## Semantic + exact Lore retrieval

`lore-semantic-index.js` + `lore-retrieval.js` use ST's vector backend.

- stable vector collection per Lorebook/version;
- passage chunking/overlap and stable hashes;
- incremental vector list/insert/delete sync;
- semantic query with configured embedding source, default `transformers`;
- exact identity/tag rescue;
- reciprocal-rank fusion;
- Always active bypass;
- match/budget limits;
- typed native wrappers;
- generation-time retrieval on awaited `GENERATION_AFTER_COMMANDS`, including newest user draft;
- exact-only fallback if vectors fail;
- detailed Lore View Context receipt.

Still missing: Character-card <-> Codex Character shared-document identity/dedup and advanced embedding-source UI.

## Story Memory + Memory Maker

`memory-store.js`, `memory-maker.js`, `memory-integrity.js`, `memory-ui.js` and `memory-recovery.js` implement native accepted Memories, reviewed proposals and reviewed recovery.

Ownership/storage:

- Story chats share one Story Memory file;
- stand-alone chats use a chat-local Memory file;
- substantial state lives in authenticated ST user files;
- accepted Memories, pending proposals, revisions, settings and review state are versioned together;
- manual add/edit/delete is supported;
- Memory records can carry lineage metadata for continuity forks.

Memory Maker:

- uses the current ST model through `generateRaw`;
- automatic cadence defaults to five completed assistant replies;
- manual review available;
- strict JSON create/edit/merge/delete proposals, max six;
- never auto-saves proposals;
- source evidence uses SnowBunny message ids/revisions/fingerprints;
- acceptance fails if Memory state or source evidence changed;
- strict evidence boundary: visible story + accepted Memories + pending proposals + explicit correction, with no tracker/Scenario/Lore/support-state/unchosen-choice leak.

Changed-source handling:

- accepted Memory source validation scans the full active source chat;
- edited/swiped/hidden/deleted source evidence marks accepted Memory `Needs review` at its Story/chat owner level;
- other chats in the same Story share that invalid set without falsely treating cross-chat source as stale merely because another Story chat is open;
- source-changed Memories are visibly marked and excluded from Recall;
- Memory Maker receives `sourceChanged: true` and is told to verify/correct/reconnect rather than guess;
- source-validity changes during a Memory Maker review invalidate that result.

Proposal review:

- Saved Memories / Suggestions screen;
- one non-blocking in-chat proposal at a time;
- operation-specific Create/Edit/Merge/Delete presentation;
- Yes / No / Later;
- Yes+note and No+note both request a revised proposal;
- proposal batches rebase unaffected sibling proposals after one approval, while siblings whose expected targets changed remain blocked for review.

Recovery:

- Memory History is available from the Memory screen;
- recoverable edits/deletes/accepted changes are shown chronologically;
- `Review restore` creates normal Memory proposals instead of silently mutating history;
- restoring a deleted/older Memory becomes create/edit review as appropriate;
- undoing an accepted Memory Maker creation becomes a delete proposal;
- the normal Yes / No review path remains authoritative.

See `SNOWBUNNY_MEMORY_IMPLEMENTATION_REFERENCE.md`.

## Memory Recall

`memory-recall.js` routes relevant accepted Memories to Story Writer before generation.

- awaited `GENERATION_AFTER_COMMANDS` so it sees the newest user draft;
- recent visible story + pending user turn;
- current valid Story Tracker state is a relevance hint only;
- bounded candidate pass for large Memory pools;
- active model chooses at most five existing Memory ids with reasons;
- familiar names alone are explicitly insufficient relevance;
- resolved conflicts are not resurrected as current conflict;
- source-changed Memories are excluded;
- cache key includes Memory version, message fingerprints, user draft, tracker revision and source-validity set;
- AI-selection failure falls back conservatively rather than blocking Story Writer;
- selected accepted Memory text uses native `<recalled-memories>` wrappers;
- per-reply View Context receipt records selection mode, invalid exclusions, tracker hint revision and selected reasons.

See `SNOWBUNNY_MEMORY_RECALL_IMPLEMENTATION_REFERENCE.md`.

## Story Tracker / rich Story State

`tracker-store.js`, `story-tracker.js`, `tracker-ui.js` and `agents-ui.js` implement the native Story Tracker path.

- substantial state stored in an authenticated chat-specific tracker file;
- each snapshot binds to producing assistant identity plus its exact visible evidence window;
- snapshots form a previous-state dependency chain;
- edit/delete/swipe/history changes mark affected snapshots stale and propagate through descendants;
- stale state is removed from writer routing while historical panels remain readable;
- deep branch changes rebuild chronologically from the latest valid chain point;
- historical replay windows stop at the reply being rebuilt, preventing future-story leakage;
- queued group/multi-speaker replies are processed in order;
- failed rebuild stops at the broken continuity point;
- current state is hidden writer context, never rewritten into visible user prose;
- Time & Place + rich Story State render on the producing reply;
- current valid state is editable with generated pre-edit restoration.

See `SNOWBUNNY_TRACKER_IMPLEMENTATION_REFERENCE.md`.

## Custom Agents

`agent-store.js`, `custom-agent-engine.js`, `custom-agent-results-ui.js`, `custom-agents-ui.js` and Agents drawer integration implement native Custom Agents alongside Story Tracker.

Implemented:

- per-chat Agent definitions and substantial result/history state;
- template route for Custom Agent while Story Tracker/Time & Place remain built-in;
- simple normal controls with Advanced hidden underneath;
- On/Off;
- manual or automatic cadence after completed story replies;
- configurable visible result placement: header, above reply, below reply or hidden;
- optional latest-valid result feedback to next Story Writer;
- dependency graph with cycle/missing-dependency validation;
- optional accepted-Memory evidence;
- strict visible-story evidence and unchosen-CYOA exclusion;
- source fingerprints and stale-result reconciliation;
- failure state without destroying the previous valid result;
- import/export of Custom Agent definitions;
- reader-facing historical result projection attached to the producing reply;
- View Context guidance receipt when Agent feedback reached Story Writer.

Pocket Phone Upkeep remains intentionally locked until the native Phone subsystem exists. It is not being faked as an ordinary Custom Agent.

## Native Regex

`regex-native.js` provides the dedicated SnowBunny Regex destination while ST's mature Regex engine remains canonical.

Implemented:

- true `This chat` scope stored in SnowBunny chat state;
- `All chats` over ST global Regex rules;
- global rules execute before chat rules through one small direct core adapter;
- enable/disable and touch reorder;
- Message display vs AI input phases;
- User / Assistant targets;
- Replace / Erase;
- live sample preview through ST's actual Regex compiler/replacement behavior;
- regex flags, depth, capture trimming, macro substitution and edit behavior under Advanced;
- import/export;
- built-in `Context Saver — States + CYOA` helper;
- compatibility guard preserves extra ST placements on existing global rules.

Canonical saved chat prose is not rewritten by SnowBunny-authored chat rules.

See `SNOWBUNNY_REGEX_IMPLEMENTATION_REFERENCE.md` and `SNOWBUNNY_DIRECT_CORE_CHANGES.md`.

## View Context / final-request audit

`context-view.js` provides the SnowBunny audit sheet plus raw ST itemized-prompt access.

Receipt producers now include:

- Lore/Codex retrieval;
- recalled Memories;
- current Story Tracker state;
- Custom Agent writer feedback;
- selected model/provider/API/preset;
- Scenario/CYOA/Narrator/Members/Regex guidance summary;
- final outgoing request capture for Chat Completion and Text Completion;
- final request message-role counts and character count;
- visible canonical history matched against the final outgoing request, including an omitted/unmatched list;
- fitting warning when visible canonical messages did not survive as directly matchable final-request text;
- whether raw `<choicecard>` markup survived into the final request.

The History match is intentionally labelled as text matching rather than pretending formatting transforms can always be mapped with mathematical certainty.

Phone receipt evidence is still pending because the native Phone subsystem is not yet present.

## Current-chat utilities

Reset Chat, Search in Chat and Chat Statistics are live through the real ST chat data.

## SnowBunny state + message identity

`state.js` keeps lightweight global/chat namespaced state.

`message-identity.js` persists stable SnowBunny message ids, revisions and source fingerprints across prose/swipe/hidden/media changes. This underpins CYOA expiry, Tracker validity, Memory proposals, Memory Recall, Custom Agents and View Context.

## Development validation

`SnowBunny.bat` updates `snowbunny-mobile`, checks packages and starts the server without the earlier repeated PowerShell command sequence. It remains a development launcher, not the final Android package.

`.github/workflows/snowbunny-static-check.yml` syntax-checks every SnowBunny JavaScript file plus the deliberate Regex core adapter on branch pushes. It has already caught and forced a fix for one duplicate declaration. The current native Preset editor build passes this check.

The upstream merge-conflict workflow may show red on the fork because its GitHub App token cannot be minted. That workflow fails before its actual conflict check and is not a SnowBunny runtime/static result.

## Visual validation status

The first narrow/mobile-width pass validated the original chat-shell layer and caught the fixed stock-control/composer overlap bugs.

The newer navigation, AI Response, Members, Narrator, No Persona, Model, Preset editor, Scenario, CYOA, Stories, Story Settings, ownership reconciliation, Recent Chats, Codex/semantic retrieval, Memory/Recovery/Recall, Regex, Agents, Story State and expanded View Context work is implemented/wired but has **not yet received the next visual/device validation pass**. Do not call those newer surfaces visually approved until they are run.

## Still not complete

- Narrator independent-speaker dispatch and Narrator-only new-chat fallback;
- native Pocket Phone state/conversations + Pocket Phone Upkeep Agent and Phone context receipts;
- Memory Maker cross-chat source validation without opening the source chat;
- Character <-> Codex Character stable shared-document identity/dedup;
- advanced Lore embedding-source UI;
- selective multi-connection/profile switching in Model;
- native full preset editors for non-Chat-Completion backend families;
- final extension quick-action tray in composer;
- safe historical Retry semantics;
- message multi-select behavior;
- native SnowBunny Character/Persona global libraries/editors;
- full brand-new-chat flow with no existing Character/Members context;
- Android packaging and true-device polish.

## Next implementation focus

The strongest remaining continuity seam is the native Pocket Phone subsystem because Memory Maker, Agents and View Context already have explicit places waiting for real Phone evidence. Character/Codex shared identity and native Character/Persona library editors are the other major data-model seam. A fresh narrow/mobile visual pass is due soon so layout/keyboard/drag issues in the newly added surfaces are caught before more presentation work stacks on top.
