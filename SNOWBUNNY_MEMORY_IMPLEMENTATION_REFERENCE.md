# SnowBunny Memory Implementation Reference

This file records the native Memory + Memory Maker implementation on `snowbunny-mobile` and the remaining continuity/recall work.

## Ownership model

Memory ownership follows the settled SnowBunny rule:

- a chat inside a Story reads/writes the Story's shared Memory file;
- a stand-alone chat reads/writes its own chat-local Memory file;
- moving between ownership scopes must not silently inject private Memories into a Story or silently discard Story history.

The current store implements the first two bullets. Cross-scope reconciliation is still pending and must remain explicit.

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

This avoids placing large authored/proposal/revision payloads directly inside `extension_settings.snowbunny` or `chat_metadata.snowbunny`.

## Accepted Memory model

Accepted Memories currently contain:

- stable id;
- title;
- details;
- optional source evidence;
- story order;
- created/updated timestamps.

Manual add/edit/delete is supported from the Memory screen. Manual changes increment the accepted-Memory version and produce revision entries so stale AI proposals cannot be accepted later.

## Proposal model

A pending proposal contains:

- stable proposal id;
- accepted-Memory base version;
- action: `create`, `edit`, `merge`, or `delete`;
- target Memory ids;
- expected-before snapshots for targeted Memories;
- proposed title/details;
- concrete reason;
- source story evidence;
- order/timestamps;
- optional revised-from proposal id.

Acceptance validates both the accepted-Memory state and the story source before committing.

## Story-source validation

Memory Maker source evidence is based on SnowBunny message identity rather than mutable message indexes alone.

The proposal source stores the reviewed chat reference and recent visible messages as:

- stable SnowBunny message id;
- message revision;
- source fingerprint.

Before acceptance, each reviewed message still has to exist with the same revision/fingerprint in the source chat. If the user edited, swiped, hid/changed, or removed relevant source history, the stale proposal is refused and must be reviewed again.

The current first implementation requires the source chat to be open when accepting a proposal from that source. Cross-chat source validation for Story-wide pending proposals is future work; unsafe acceptance is not used as a shortcut.

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

The fork deliberately corrected the old handoff routing.

Memory Maker receives:

- recent visible story messages;
- accepted Memories for comparison;
- already pending proposals for de-duplication;
- explicit user correction when revising one proposal.

Memory Maker does **not** receive:

- current trackers;
- historical tracker snapshots;
- Scenario;
- Lorebook/Codex facts as event evidence;
- hidden Thoughts/Relationships/etc.;
- Guided/CYOA instructions;
- unchosen CYOA paths;
- other support-state that did not occur in the fiction.

Pocket Phone event evidence is not supplied yet because the Pocket Phone subsystem is not ported. When it is, real phone events may be added according to `SNOWBUNNY_CONTEXT_ROUTING_REFERENCE.md`.

## Proposal parsing and validation

Memory Maker is instructed to return JSON only:

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
- optional `allowEdits=false` suppresses non-create proposals.

Duplicate pending proposals are not added again.

## Yes / No / feedback behavior

The in-chat proposal card implements the settled review behavior:

- Yes, no note -> accept current proposal;
- Yes + note -> ask Memory Maker to revise this proposal, show the revised version, do **not** save yet;
- No, no note -> reject the proposal;
- No + note -> reject the current version as final and ask Memory Maker to reconsider, returning one revised proposal or none;
- Later -> leave the proposal pending and snooze it in the current chat.

A revision replaces the same pending proposal slot conceptually rather than creating a second independent suggestion.

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
- errors such as stale source evidence are shown directly on the card rather than silently accepting unsafe history.

Pending work remains pending until explicitly handled.

## Full Memory screen

The right-drawer Memory row opens the native SnowBunny Memory screen with:

- Saved Memories tab;
- Suggestions tab;
- Saved Memory search;
- manual add/edit/delete;
- Ask Memory Maker;
- automatic-review toggle;
- review frequency;
- extra Memory Maker instructions.

The Suggestions tab may show the queue, while the in-chat card remains the primary one-at-a-time review experience.

## Automatic reviews

Automatic review is triggered after the configured number of completed assistant replies since the last review.

A review may legitimately return zero proposals. No memory is saved merely because a review ran.

Automatic failures are non-blocking to ordinary story writing and are surfaced through Memory UI/status rather than interrupting the Story Writer.

## Revisions

The store already records revisions for:

- manual edit;
- manual delete;
- accepted proposal;
- rejected proposal marker.

The historical recovery UI that turns a prior revision into a fresh reviewed proposal is still pending. Recovery must use the same approval path rather than silently mutating history.

## Memory Recall is separate

Memory Maker creates/changes reviewed historical Memories.

Memory Recall is a different subsystem. It will choose already-approved Memory ids relevant to the next Story Writer request and must not create new facts.

Memory Recall is still pending. When implemented it may use current tracker/phone excerpts as relevance hints only, as defined in `SNOWBUNNY_CONTEXT_ROUTING_REFERENCE.md`.

## Remaining work

Still pending:

- Memory Recall into Story Writer context;
- source validation for a Story proposal while a different Story chat is open;
- Pocket Phone evidence integration;
- revision/recovery UI;
- Story -> stand-alone snapshot behavior;
- stand-alone -> Story review/reconciliation behavior;
- Memory routing receipts in View Context;
- final mobile/device visual validation.

## Guardrails

Future work must not:

- auto-save Memory Maker proposals;
- give Memory Maker tracker state or Lore/Scenario as event evidence;
- accept stale proposals after source history changed;
- treat unchosen CYOA paths as historical events;
- silently merge stand-alone private Memories into a Story;
- delete Story history just because a chat leaves the Story;
- confuse Memory Recall with Memory Maker;
- turn the feature into a generic rolling summary.
