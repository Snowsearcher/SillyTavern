# SnowBunny Memory Implementation Reference

This file records the live native Memory + Memory Maker + Memory Recall implementation on `snowbunny-mobile`.

## Ownership model

Memory ownership follows the settled SnowBunny rule:

- a chat inside a Story reads/writes the Story's shared Memory file;
- a stand-alone chat reads/writes its own chat-local Memory file;
- Story -> stand-alone creates a continuity fork instead of losing shared history;
- stand-alone -> Story keeps the destination Story authoritative and stages local history for review instead of silently merging it.

Cross-scope behavior is implemented through `story-ownership.js` and documented in `SNOWBUNNY_STORY_OWNERSHIP_IMPLEMENTATION_REFERENCE.md`.

## Storage

`memory-store.js` keeps substantial Memory state in authenticated ST user files through `/api/files/upload`.

A Memory state file contains:

- schema version;
- accepted Memories;
- pending proposals;
- revision records;
- accepted-Memory version counter;
- last Memory Maker review source;
- Memory Maker settings.

Story records carry a lightweight `memoryFilePath`. Stand-alone chats carry a lightweight chat-state `memoryFilePath`.

The store now also exposes explicit Story and stand-alone read/write helpers so Story Settings and ownership transitions can work without pretending the currently-open owner is the only valid destination.

## Accepted Memory model

Accepted Memories contain:

- stable id;
- title;
- details;
- optional source evidence;
- optional continuity lineage metadata;
- story order;
- created/updated timestamps.

Lineage is used when a Story Memory is forked into stand-alone continuity so SnowBunny can later recognize that local copy when rejoining the same Story.

Manual add/edit/delete increments the accepted-Memory version and records revisions.

## Proposal model

A pending proposal contains:

- stable proposal id;
- accepted-Memory base version;
- optional batch id;
- action: `create`, `edit`, `merge`, or `delete`;
- target Memory ids;
- expected-before snapshots for targeted Memories;
- proposed title/details;
- concrete reason;
- optional source story evidence;
- optional origin metadata for reconciliation/recovery;
- order/timestamps;
- revised-from id;
- needs-review/stale reason when another accepted proposal changed its target.

Acceptance validates both accepted-Memory state and source evidence when source evidence exists.

## Proposal-batch rebasing

Approving one proposal used to increment the Memory version and make every sibling proposal from the same review stale, even when their targets were untouched.

The current store fixes that:

- after accepting one proposal, unaffected siblings whose expected targets still match are rebased to the new Memory version;
- siblings whose targets changed stay blocked and are marked as needing review;
- manual Memory edits/deletes remain conservative and still invalidate old proposal versions rather than guessing that old analysis is safe.

This is important for Memory Maker batches, Story-join reconciliation batches and revision-recovery batches.

## Source evidence and invalidation

Memory Maker source evidence uses SnowBunny message identity rather than mutable message indexes.

A source stores:

- source chat reference;
- stable SnowBunny message ids;
- message revisions;
- source fingerprints.

`memory-integrity.js` maintains owner-level invalid ids for accepted Memories whose source changed.

Current behavior:

- source validation scans the full active source chat;
- edit/swipe/hide/delete changes can invalidate accepted Memory evidence;
- a Story shares the same invalid set across its chats;
- opening a different Story chat does not falsely mark a Memory stale merely because its source was another chat;
- invalid Memories are marked `Needs review` in Memory UI;
- invalid Memories are excluded from Memory Recall;
- Memory Maker is told when a saved Memory's source changed and must verify/correct/reconnect it from current visible evidence rather than blindly trusting it.

Acceptance of a source-bound proposal still requires its source chat to be open when validation is needed. Safe cross-chat source inspection without opening the source chat remains future work.

## Memory Maker model use

`memory-maker.js` uses ST's currently selected API/model through `generateRaw`.

It does not create a second connection/profile stack.

Default settings:

- automatic checks on;
- frequency: every 5 completed assistant replies;
- recent visible history window: 40 messages;
- edits/merges/deletes allowed;
- reply limit: 4096;
- optional user-authored extra instructions.

Manual `Ask Memory Maker` is also available.

## Strict evidence routing

Memory Maker receives:

- recent visible story messages;
- accepted Memories for comparison;
- already pending proposals for de-duplication;
- explicit user correction when revising one proposal;
- a `sourceChanged` marker on accepted Memories whose original source evidence no longer matches.

Memory Maker does **not** receive:

- current trackers;
- historical tracker snapshots;
- Scenario;
- Lorebook/Codex facts as event evidence;
- hidden Thoughts/Relationships/etc.;
- Guided/CYOA instructions;
- unchosen CYOA paths;
- other support-state that did not occur in the fiction.

Pocket Phone event evidence is not supplied yet because Pocket Phone is not ported. When it is, real phone events may be added according to `SNOWBUNNY_CONTEXT_ROUTING_REFERENCE.md`.

## Proposal parsing and validation

Memory Maker returns JSON only:

```json
{"proposals":[{"action":"create|edit|merge|delete","targetIds":[],"title":"...","details":"...","reason":"..."}]}
```

Validation enforces:

- maximum six proposals;
- valid action;
- valid existing target ids;
- create targets none;
- edit targets exactly one;
- merge targets at least two;
- delete targets at least one;
- no repeated target id in one proposal;
- non-empty bounded title/reason;
- non-empty bounded details except delete;
- optional `allowEdits=false` suppresses non-create proposals;
- duplicate pending proposals are not added again.

## Yes / No / feedback behavior

The in-chat proposal card implements the settled review behavior:

- Yes, no note -> accept current proposal;
- Yes + note -> ask Memory Maker to revise this proposal, show the revised version, do **not** save yet;
- No, no note -> reject the proposal;
- No + note -> reject the current version as final and ask Memory Maker to reconsider, returning one revised proposal or none;
- Later -> leave the proposal pending and snooze it in the current chat.

A revision replaces the same review slot conceptually rather than creating a confusing second independent suggestion.

## In-chat proposal UI

`memory-ui.js` renders a non-blocking proposal card above the composer.

- one proposal at a time;
- queue position (`1 of N`);
- action-specific Create/Update/Merge/Delete label;
- current target summary for changes;
- proposed title/details;
- Reason;
- correction/explanation box;
- Yes / No / Later;
- changed-source target warnings;
- stale/conflict errors shown directly instead of silently accepting unsafe history.

Pending work remains pending until explicitly handled.

## Full Memory screen

The right-drawer Memory row opens the native SnowBunny Memory screen with:

- Saved Memories;
- Suggestions;
- History;
- Saved Memory search;
- manual add/edit/delete;
- Ask Memory Maker;
- automatic-review toggle;
- review frequency;
- extra Memory Maker instructions.

## Reviewed recovery

`memory-recovery.js` exposes recoverable revision history without silently rolling state backward.

`Review restore` converts a historical revision into ordinary pending Memory proposals:

- an earlier edited version becomes an edit proposal when the Memory still exists, otherwise a create proposal;
- a deleted Memory becomes a create proposal;
- undoing an accepted Memory Maker creation becomes a delete proposal;
- multi-Memory merge/delete history can stage several related restore proposals in one batch.

The same normal Yes / No review flow remains authoritative.

## Story ownership reconciliation

### Story -> stand-alone

Accepted Story Memories are copied into a **new** local file with new local ids and lineage back to the originating Story/Memory ids.

Pending Story proposals are not copied as accepted local history.

### Stand-alone -> Story

Local accepted Memories are never inserted directly into the destination Story.

Instead:

- exact duplicates are skipped;
- a forked local Memory returning to the same Story can stage an edit proposal against its origin when it differs;
- other local Memories stage create proposals;
- the old local file path remains recorded as an archive pointer on the chat;
- destination Story Memories remain authoritative until each staged proposal is explicitly reviewed.

### Story A -> Story B

Implemented as Story A -> stand-alone fork -> Story B join/review.

## Memory Recall is separate

`memory-recall.js` selects already-approved Memories relevant to the **next** Story Writer request.

It may use current tracker state as a relevance hint only. It cannot turn tracker prose into Memory content.

Current behavior:

- runs on awaited `GENERATION_AFTER_COMMANDS` and includes the newest user draft;
- uses recent visible conversation plus current valid Story State as selection hints;
- excludes source-changed accepted Memories;
- bounds large candidate pools conservatively;
- active model selects at most five existing Memory ids with reasons;
- familiar names alone are explicitly not enough;
- resolved conflict is not treated as new current conflict;
- AI selection failure uses conservative direct-match fallback rather than blocking generation;
- selected accepted Memory text is inserted through `<recalled-memories>` wrappers;
- View Context records selection mode, invalid exclusions, tracker hint revision and selected reasons.

See `SNOWBUNNY_MEMORY_RECALL_IMPLEMENTATION_REFERENCE.md`.

## Remaining work

Still pending:

- cross-chat source validation without opening the source chat;
- Pocket Phone event evidence after Phone is ported;
- richer revision browsing/comparison polish;
- final mobile/device visual validation.

## Guardrails

Future work must not:

- auto-save Memory Maker proposals;
- give Memory Maker tracker state or Lore/Scenario as event evidence;
- accept stale proposals after source history changed;
- treat unchosen CYOA paths as historical events;
- silently merge stand-alone private Memories into a Story;
- delete Story history because a chat leaves the Story;
- restore an old local Memory pointer instead of making a fresh Story fork;
- confuse Memory Recall with Memory Maker;
- turn Memory into a generic rolling summary.
