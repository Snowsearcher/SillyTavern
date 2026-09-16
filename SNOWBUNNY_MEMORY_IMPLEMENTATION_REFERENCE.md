# SnowBunny Memory Implementation Reference

This file records the native Memory + Memory Maker implementation on `snowbunny-mobile` and the remaining ownership/recovery work.

## Ownership model

Memory ownership follows the settled SnowBunny rule:

- a chat inside a Story reads/writes the Story's shared Memory file;
- a stand-alone chat reads/writes its own chat-local Memory file;
- moving between ownership scopes must not silently inject private Memories into a Story or silently discard Story history.

The current store implements the first two bullets. Cross-scope reconciliation is still pending and must remain explicit.

## Storage

`memory-store.js` keeps substantial Memory state in authenticated ST user files through `/api/files/upload`.

A Memory state file contains accepted Memories, pending proposals, revision records, accepted-Memory version, last Memory Maker review source and settings.

Story records carry a lightweight `memoryFilePath`. Stand-alone chats carry a chat-state `memoryFilePath`.

## Accepted Memory model

Accepted Memories contain stable id, title, details, optional source evidence, story order and timestamps.

Manual add/edit/delete is supported. Manual changes increment the accepted-Memory version and produce revision entries so stale AI proposals cannot be accepted later.

## Proposal model

A pending proposal contains:

- stable proposal id;
- accepted-Memory base version;
- action: `create`, `edit`, `merge`, or `delete`;
- target Memory ids;
- expected-before snapshots;
- proposed title/details;
- reason;
- source story evidence;
- order/timestamps;
- optional revised-from id.

Acceptance validates accepted-Memory state and source evidence before committing.

## Source validation and changed-source Memories

SnowBunny uses stable message identity rather than mutable message indexes.

Proposal/accepted-Memory source evidence records visible reviewed messages as:

- stable SnowBunny message id;
- message revision;
- source fingerprint.

`memory-integrity.js` checks accepted Memories against the **full current source chat**, not only a short recent window. If the actual source story is edited, hidden, swiped away or deleted after a Memory was accepted, that Memory is marked `sourceChanged` for its Memory owner.

The invalid set is owner-wide:

- Story-wide for Story Memories;
- chat-local for stand-alone Memories.

This means another chat in the same Story can see that a shared Memory needs review without falsely invalidating Memories merely because their source is a different Story chat.

Changed-source Memories:

- remain visible in Saved Memories with a clear `Needs review` warning;
- are excluded from Memory Recall until re-reviewed;
- are supplied to Memory Maker with `sourceChanged: true`;
- are not blindly trusted by Memory Maker;
- can be reconnected/corrected through a reviewed edit proposal using current visible evidence.

The current acceptance path still requires the relevant source evidence to be safely verifiable; unsafe cross-chat acceptance is not used as a shortcut.

## Memory Maker model use

`memory-maker.js` uses ST's currently selected API/model through `generateRaw`; it does not create a second connection stack.

Default settings:

- automatic checks on;
- every 5 completed assistant replies;
- recent visible history window: 40;
- edits/merges/deletes allowed;
- reply limit: 4096;
- optional user extra instructions.

Manual `Ask Memory Maker` is also available.

## Strict evidence routing

Memory Maker receives:

- recent visible story messages;
- accepted Memories for comparison, including explicit `sourceChanged` flags;
- pending proposals for de-duplication;
- explicit user correction when revising one proposal.

Memory Maker does **not** receive current/historical tracker state, Scenario, Lorebook/Codex facts as event evidence, hidden Thoughts/Relationships, Guided/CYOA instructions, unchosen paths, or other support state that did not occur in the fiction.

Pocket Phone evidence is not supplied yet because Pocket Phone is not ported. When it is, real phone events may be added according to `SNOWBUNNY_CONTEXT_ROUTING_REFERENCE.md`.

## Proposal validation

Memory Maker returns JSON-only proposals. Validation enforces max six proposals, valid actions/targets, bounded non-empty content, no duplicate target ids, and optional create-only mode when edits are disabled.

Duplicate pending proposals are not added again.

## Yes / No / feedback behavior

The in-chat proposal card implements:

- Yes, no note -> accept;
- Yes + note -> revise and show again before save;
- No, no note -> reject;
- No + note -> reconsider current version and return one revised proposal or none;
- Later -> keep pending and snooze in current chat.

A revision replaces the proposal conceptually rather than creating a confusing duplicate queue item.

## In-chat and full Memory UI

`memory-ui.js` provides:

- one non-blocking proposal at a time above the composer;
- queue position;
- Create/Update/Merge/Delete presentation;
- current-target comparison;
- proposed title/details and Reason;
- correction box;
- Yes / No / Later;
- inline errors when evidence is stale;
- changed-source warnings on accepted Memories and proposals touching them;
- right-drawer status such as `N need review` when accepted source evidence changed.

The full Memory screen has Saved Memories / Suggestions, search, manual add/edit/delete, Ask Memory Maker, automatic-check settings and extra instructions.

## Automatic reviews

Automatic review runs after the configured number of completed assistant replies since the last review. A review may correctly return zero proposals.

Automatic failures never block ordinary Story Writer generation.

## Memory Recall

`memory-recall.js` is now live and remains separate from Memory Maker.

Recall:

- selects only already accepted Memories;
- runs before Story Writer prompt assembly while the newest user draft is still available;
- may use current Story Tracker state only as a relevance hint;
- excludes changed-source Memories;
- selects at most five existing Memory ids with specific reasons;
- injects only accepted Memory text through `<recalled-memories>` wrappers;
- records the selection in View Context;
- falls back conservatively if the side relevance review fails rather than blocking the story.

See `SNOWBUNNY_MEMORY_RECALL_IMPLEMENTATION_REFERENCE.md`.

## Revisions

The store records manual edit/delete and accepted/rejected proposal revisions.

The recovery UI that turns a prior revision into a fresh reviewed proposal is still pending. Recovery must use the same approval path rather than silently rewriting history.

## Remaining work

Still pending:

- source validation/review UX when a pending Story proposal was created in another Story chat;
- Pocket Phone evidence;
- revision/recovery UI;
- Story -> stand-alone Memory snapshot behavior;
- stand-alone -> Story review/reconciliation behavior;
- final mobile/device visual validation.

## Guardrails

Future work must not auto-save proposals, give Memory Maker tracker/Lore/Scenario state as event evidence, recall source-changed Memories as trustworthy history, accept stale proposals, treat unchosen CYOA paths as events, silently merge private Memories into a Story, delete Story history because a chat leaves, confuse Recall with Maker, or turn Memory into a rolling summary.
