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

## Persona

`persona-selector.js` uses ST's real Persona records and selection machinery.

- searchable portrait/name selector;
- default Persona favorite;
- current-chat Persona lock/reapply;
- real per-chat `No Persona` suppression without persisting global ST Persona position as NONE;
- Persona context is restored correctly when leaving a No Persona chat.

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
- edit route temporarily bridges to ST's full controls.

Scenario:

- settled four fields;
- per-chat toggle and Reset;
- chat metadata storage;
- writer routing through ST extension-prompt plumbing with World Info scanning disabled.

Still missing: selective multi-connection/profile switching and the final phone-first Preset editor/Utility prompts.

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

## Stories and stand-alone chats

`stories-library.js` implements the first real Stories workspace.

- top Book and left Stories routes;
- Visual/Compact browsing and search;
- create/rename Story;
- Story interior is a chat browser;
- add/remove/open Story chats;
- Stand-alone Chats browser;
- real ST Character/group chat discovery;
- stable owner + chat-id refs;
- Story id stored in chat metadata with global Story index reconciliation.

`story-lorebooks.js` makes Story-owned Lorebook assignment real. Story Lorebooks are mandatory/effective across that Story while chat-specific extras remain separate.

Still missing: one full Story Settings surface combining Story Lorebooks, Story Memories and Story chat membership management.

## Create sheet

The settled six entries are live: Story, Chat, Lorebook, Lore Entry, Character, Persona.

`create-codex-bridge.js` provides native Lorebook/Lore Entry creation. Character and Persona still bridge to ST managers until native SnowBunny global editors are ported.

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

## Semantic + exact Lore retrieval

`lore-semantic-index.js` + `lore-retrieval.js` now use ST's vector backend.

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

`memory-store.js`, `memory-maker.js` and `memory-ui.js` implement native accepted Memories and reviewed proposals.

Ownership/storage:

- Story chats share one Story Memory file;
- stand-alone chats use a chat-local Memory file;
- accepted Memories, pending proposals, revisions, settings and review state are versioned together;
- manual add/edit/delete is supported.

Memory Maker:

- uses the current ST model through `generateRaw`;
- automatic cadence defaults to five completed assistant replies;
- manual review available;
- strict JSON create/edit/merge/delete proposals, max six;
- never auto-saves proposals;
- source evidence uses SnowBunny message ids/revisions/fingerprints;
- acceptance fails if Memory state or source evidence changed;
- strict evidence boundary: visible story + accepted Memories + pending proposals + explicit correction, with no tracker/Scenario/Lore/support-state/unchosen-choice leak.

Review UI:

- Saved Memories / Suggestions sheet;
- search and manual Memory editing;
- automatic-check settings;
- one non-blocking in-chat proposal at a time;
- operation-specific presentation;
- Yes / No / Later;
- Yes+note and No+note both route through revised proposal review instead of silently saving/discarding the note.

`memory-integrity.js` now maintains a Story/chat-owner invalid set for accepted Memories whose original source story was edited/swiped/deleted in the actual source chat. Other chats in the same Story see the same invalid set without falsely declaring Memories stale merely because they came from another Story chat.

See `SNOWBUNNY_MEMORY_IMPLEMENTATION_REFERENCE.md`.

## Memory Recall

`memory-recall.js` now routes relevant accepted Memories to Story Writer before generation.

- runs at awaited `GENERATION_AFTER_COMMANDS` so it sees the newest user draft;
- uses recent visible story + pending user turn;
- current valid Story Tracker state is a relevance hint only;
- large Memory pools get a conservative bounded candidate pass;
- active model chooses at most five existing Memory ids with reasons;
- familiar names alone are explicitly rejected as sufficient relevance;
- resolved conflicts are not resurrected as current conflict;
- source-changed Memories are excluded before selection;
- cache key includes Memory version, message fingerprints, user draft, tracker revision and source-validity set;
- AI-selection failure falls back conservatively rather than blocking Story Writer;
- selected accepted Memory text is injected through native `<recalled-memories>` wrappers;
- per-reply View Context receipt records selection mode, invalid exclusions, tracker hint revision and selected Memory reasons.

See `SNOWBUNNY_MEMORY_RECALL_IMPLEMENTATION_REFERENCE.md`.

## Story Tracker / rich Story State

`tracker-store.js`, `story-tracker.js`, `tracker-ui.js` and `agents-ui.js` implement the first native Story Tracker path.

State/validity:

- substantial state stored in an authenticated chat-specific tracker file;
- each snapshot binds to producing assistant message identity plus the whole visible evidence window used for the update;
- snapshots form a dependency chain through previous-snapshot id;
- edit/delete/swipe history changes mark directly affected snapshots stale and propagate staleness through descendants;
- stale state is removed from writer routing while historical panels remain visible for audit;
- automatic rebuild starts again from the latest valid chain point.

Generation/routing:

- runs after completed assistant story replies, not when the user merely types;
- previous valid current state + bounded visible story are used;
- unchosen `<choicecard>` paths are stripped from tracker evidence;
- strict JSON state is validated before commit;
- invalid tracker output keeps the previous state;
- current state is inserted as hidden depth-zero `<current-state>` context for the next Story Writer reply;
- canonical visible user prose is never modified;
- View Context records the exact tracker snapshot/revision supplied and whether Snow edited it.

Reader experience:

- Time & Place projected near the producing reply;
- rich Story State panel below that reply;
- Thoughts, Relationships, Scene, Threads, Secrets, Conditions, Inventory, Offscreen Characters and GM Notes sections;
- section-specific visual treatment/icons and remembered expand/collapse state;
- Markdown through ST's established formatter when available;
- current state has Edit, Restore generated and Regenerate controls;
- manual edits become the exact next-writer state and next tracker starting point while preserving the generated pre-edit revision.

Agents:

- right-drawer Agents row is live;
- dedicated mobile Agents surface currently exposes the Story Tracker card in plain language;
- On/Off, section toggles, Update now, Open current state and a small Advanced area;
- no giant generic Run Enabled control and no raw sidecar/depth/execution jargon in normal use.

See `SNOWBUNNY_TRACKER_IMPLEMENTATION_REFERENCE.md`.

## Current-chat utilities

Reset Chat, Search in Chat and Chat Statistics are live through the real ST chat data.

## SnowBunny state + message identity

`state.js` keeps lightweight global/chat namespaced state.

`message-identity.js` persists stable SnowBunny message ids, revisions and source fingerprints across prose/swipe/hidden/media changes. This now underpins CYOA expiry, Tracker validity, Memory proposals, Memory Recall and View Context.

## View Context

`context-view.js` provides the SnowBunny mobile audit sheet plus raw ST itemized prompt access.

Live SnowBunny receipt producers now include:

- Lore/Codex retrieval;
- recalled Memories;
- current Story Tracker state.

Full History/Phone/Guidance/fitting receipt aggregation is still incomplete.

## Development launcher

`SnowBunny.bat` updates `snowbunny-mobile`, checks packages and starts the server without the earlier repeated PowerShell command sequence. It is still a development launcher, not the final Android package.

## Visual validation status

The first narrow/mobile-width pass validated the original chat-shell layer and caught the fixed stock-control/composer overlap bugs.

The newer navigation, Members, Narrator, No Persona, Model, Scenario, CYOA, Stories, Recent Chats, Codex/semantic retrieval, Memory, Memory Recall, Agents and Story State work is implemented/wired but has **not yet received the next visual/device validation pass**. Do not call those newer surfaces visually tested until they are run.

## Still not complete

- Narrator independent-speaker dispatch and Narrator-only new-chat fallback;
- full Story Settings surface and Story <-> stand-alone continuity reconciliation;
- Memory Maker changed-source review presentation/recovery UI and Pocket Phone evidence after Phone is ported;
- Character <-> Codex Character shared-document identity/dedup;
- generic Custom Agents / Pocket Phone Upkeep engine and full import/export/dependency tooling;
- Regex destination and native display/input integration;
- selective multi-connection/profile switching in Model;
- full mobile Preset editor + Utility prompts;
- final extension quick-action tray in composer;
- full History/Phone/Guidance/fitting View Context receipts;
- safe historical Retry semantics;
- message multi-select behavior;
- native SnowBunny Character/Persona global libraries/editors;
- full brand-new-chat flow with no existing Character/Members context;
- Android packaging and true-device polish.

## Next implementation focus

The immediate quality seam is now to connect Story Settings/ownership reconciliation and finish the remaining context-audit/invalidation edges around Memory Maker. After that, Regex + the general Agent engine and the phone-first Preset editor can replace more temporary ST bridges. A fresh mobile-width visual pass is also due before claiming the newer UI polish is correct.
