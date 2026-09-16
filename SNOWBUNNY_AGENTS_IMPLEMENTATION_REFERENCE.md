# SnowBunny Agents Implementation Reference

This file records the live Agents implementation on `snowbunny-mobile`.

It complements `SNOWBUNNY_AGENTS_UI_REFERENCE.md` and `SNOWBUNNY_TRACKER_IMPLEMENTATION_REFERENCE.md`.

## Architecture

SnowBunny now has two native Agent paths that share the same user-facing Agents workspace but keep different responsibilities:

1. **Story Tracker**: the purpose-built continuity engine for current Story State and Time & Place.
2. **Custom Agents**: user-defined focused jobs with optional visible results, automatic schedules, dependencies and writer feedback.

Pocket Phone Upkeep remains deliberately locked in the template picker until the native Phone system itself is connected. SnowBunny does not fake a Phone Agent with nowhere trustworthy to store/use its continuity.

## Storage

`agent-store.js` keeps Custom Agent definitions, result history and run status in an authenticated chat-specific SnowBunny user file.

Chat metadata stores only the lightweight `agentFilePath` pointer.

A Custom Agent definition contains:

- stable id;
- name;
- short purpose;
- authored task/instructions;
- On / Off;
- automatic / manual mode;
- automatic frequency in completed assistant replies;
- reader-facing placement: Message header / Above reply / Below reply / Hidden;
- whether the latest valid result helps the next Story Writer reply;
- recent visible-story window;
- reply limit;
- dependency Agent ids;
- optional accepted-Memory evidence permission;
- `record` vs `suggest` mode;
- created/updated timestamps.

The substantial definition/result payload is not stored directly in chat metadata.

## Result snapshots

Every Custom Agent result is historical evidence, not an app-global mutable text box.

A result snapshot stores:

- stable result id;
- Agent id;
- result text;
- source chat reference;
- producing assistant message id/revision/source fingerprint;
- the visible-story evidence window used for that result;
- previous result id for this Agent;
- dependency result ids actually used;
- generated timestamp;
- stale flag/reason.

The store keeps a generous bounded audit history per Agent instead of growing forever.

## Source invalidation

`agent-store.js` reconciles results against SnowBunny message identity.

A result becomes stale when:

- its visible story evidence changed;
- its previous-result chain became stale;
- one of the dependency result snapshots it used became stale.

Stale results:

- remain visible on their historical producing reply for audit;
- receive a source-changed warning;
- are not used as current Agent state;
- are not routed to the Story Writer.

This prevents a hidden support Agent from quietly surviving a story-branch edit with obsolete assumptions.

## Dependency graph

Custom Agent dependencies are explicit stable Agent ids.

The store validates the graph before saving:

- dependency ids must exist;
- cycles are rejected;
- duplicate Agent ids are rejected.

Execution is topologically ordered.

If an Agent dependency fails during the same story-reply processing cycle, downstream Agents are marked `Waiting` rather than silently consuming that dependency's older result as though the failed update succeeded.

If a dependency is switched Off, a dependent Agent cannot pretend it still has a live dependency just because an old result exists.

Manual `Update now` on an Agent also updates its dependency chain first.

## Automatic execution

`custom-agent-engine.js` runs automatic Custom Agents only after completed assistant story replies.

It does **not** run because the user typed a message.

Frequency is measured in completed assistant replies since that Agent's latest valid result.

A run receives:

- its previous valid result;
- current valid dependency results;
- a bounded recent visible-story window ending at the reply being processed;
- optional accepted Memories only when the Agent explicitly enables that source.

Unchosen CYOA markup is removed from story evidence before Custom Agents read it.

The engine uses ST's currently selected model through `generateRaw`. It does not create a second model/connection stack.

## Optional accepted Memories

Accepted Memory evidence is Advanced and opt-in per Agent.

Before supplying it:

- Memory source integrity is reconciled;
- Memories marked source-changed are excluded;
- a bounded relevance pass selects candidate accepted Memories rather than dumping the whole historical archive into every custom task.

This source is separate from Memory Maker. Custom Agents cannot silently create/accept Memories merely because they were allowed to read some.

## Record vs Suggest

Custom Agents have a lightweight semantic mode:

- `record`: treat output as an evidence-based current/analytical result and do not invent developments for interest;
- `suggest`: output may propose ideas, but must keep suggestions clearly separate from established fictional facts.

This avoids one generic prompt encouraging a brainstorming Agent to masquerade as canon, or a continuity Agent to invent developments.

## Writer feedback

A Custom Agent may optionally let its latest valid result help the next Story Writer response.

`custom-agent-engine.js` collects only the latest valid feedback-enabled results into:

```text
<agent-context>
  <agent-result id="..." name="...">
  ...
  </agent-result>
</agent-context>
```

The context is routed through ST's extension-prompt machinery and never appended to visible user prose.

A per-reply View Context receipt is saved under `guidance.customAgents`, identifying:

- Agent id/name;
- exact result id;
- producing story message id;
- total routed character count.

## Reader-facing result projection

`custom-agent-results-ui.js` projects visible result snapshots onto the real producing ST message.

Placements:

- Message header;
- Above reply;
- Below reply;
- Hidden.

Rendered text uses ST's established message formatter when available.

Historical result panels stay attached to the reply that produced them. A stale panel stays readable with a warning instead of being silently removed or rewritten.

This is deliberately different from Story Tracker's large crafted Story State panel. A generic Custom Agent can have a polished smaller result surface without flattening the major Story Tracker feature into the same generic component.

## Agents workspace

`custom-agents-ui.js` augments the existing native Agents workspace rather than creating another Agents destination.

Header actions:

- `+ New Agent`;
- secondary Import / Export.

Template picker:

- Story Tracker;
- Time & Place (maintained inside Story Tracker so it does not cost a second model call);
- Pocket Phone Upkeep (locked until Phone is native);
- Custom Agent.

Custom Agent cards show:

- name;
- purpose/status;
- On / Off;
- automatic frequency or Manual;
- result placement;
- whether it helps the next reply;
- current failure/up-to-date state.

The right-drawer Agents row counts active Story Tracker + Custom Agents and surfaces failures.

## Custom Agent editor

Normal controls:

- Name;
- short purpose;
- task/instructions;
- On / Off;
- automatic updates;
- frequency;
- reader-facing placement;
- Story Writer feedback.

Advanced controls:

- recent-story window;
- reply limit;
- accepted-Memory evidence permission;
- Record vs Suggest mode;
- dependencies.

Actions:

- Save;
- Update now;
- Duplicate;
- Delete.

## Import / export safety

Custom Agent export saves native definitions.

Imported Agents:

- receive new stable ids;
- start disabled;
- start with automatic execution Off;
- dependency ids are cleared because foreign ids cannot safely be trusted in the new chat;
- remain fully reviewable/editable before activation.

## Current limitations

Still pending:

- Pocket Phone Upkeep native engine once Phone is ported;
- richer imported-Agent conflict/update-existing flow;
- advanced history/Memory lookup tools rather than the current explicit bounded Memory evidence source;
- optional model override per Agent;
- final mobile/device visual validation.

## Guardrails

Do not:

- let automatic Agents run merely because the user typed;
- feed stale Agent results to the Story Writer;
- silently use a failed dependency's older result as though the current dependency update succeeded;
- give every Custom Agent all Memories by default;
- turn suggestions into established fictional facts;
- make Story Tracker use the generic Custom Agent renderer/editor;
- port the old giant developer-form Agents screen;
- expose `sidecar`, raw role/depth/execution jargon in normal setup;
- add a fake Pocket Phone Upkeep Agent before there is a trustworthy native Phone system.
