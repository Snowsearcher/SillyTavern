# SnowBunny Story Tracker Implementation Reference

This file records the live implementation contract for the native Story Tracker on `snowbunny-mobile`. It complements `SNOWBUNNY_TRACKER_UI_REFERENCE.md` and `SNOWBUNNY_CONTEXT_ROUTING_REFERENCE.md`.

## Core state model

Story Tracker state is chat-specific and lives outside visible chat prose.

`tracker-store.js` stores the substantial tracker state in an authenticated SnowBunny user file. Chat metadata keeps only the file path and lightweight pointers.

A tracker snapshot contains:

- a stable SnowBunny snapshot id;
- its own revision;
- the producing assistant message id/revision/source fingerprint;
- the visible-story evidence fingerprints used for the update;
- a previous-snapshot id so validity forms a chain rather than isolated rows;
- Time & Place;
- the canonical Story Tracker sections;
- generated timestamp/update timestamp;
- manual-edit marker;
- generated pre-edit state when Snow changes the current result;
- stale/source-change state for historical audit.

The current writer-facing state is always one of these snapshots. The pretty panel and the writer therefore read the same canonical data.

## Sections

The consolidated Story Tracker keeps:

- Thoughts
- Relationships
- Scene
- Threads
- Secrets
- Conditions
- Inventory
- Offscreen Characters
- GM Notes

Inventory remains off by default in section settings.

Time & Place is generated alongside the consolidated update and projected separately near the message header so SnowBunny does not spend a second model request to maintain the same immediate continuity.

## Update timing

`story-tracker.js` runs after a completed assistant Character/Narrator story reply.

It does not run because the user merely typed a message.

A tracker update receives:

- the previous valid current Story State;
- a bounded recent visible-story window including the completed reply;
- no Lorebook/Scenario prompt dump;
- no Memory Maker proposal machinery;
- no unchosen CYOA result as an event.

Raw `<choicecard>` markup is removed from tracker evidence before the tracker reads the story. The prompt explicitly treats unchosen choices as unhappened.

The result is strict JSON that is validated before replacing current state. Invalid or incomplete output leaves the previous state intact.

## Next-writer routing

Before the next normal Story Writer generation, the latest valid current tracker snapshot is routed through ST's extension-prompt path as a hidden depth-zero system/current-state block:

```text
<current-state revision="..." edited="true|false">
Time & Place: ...

Thoughts:
...

Relationships:
...
</current-state>
```

The canonical visible user message is never modified.

If Story Tracker is turned off, its hidden current-state prompt is cleared. Historical panels remain readable.

A View Context receipt is attached to replies that received current tracker state. It records the snapshot id/revision, whether Snow manually edited it, Time & Place, and which sections were present.

## Source invalidation

Tracker validity is chained, not message-local only.

Each snapshot records both its direct evidence fingerprints and the previous snapshot it depended on.

When edit/delete/swipe history events occur:

1. SnowBunny compares stored evidence ids/revisions/source fingerprints against current canonical messages.
2. A snapshot becomes stale if its own evidence changed.
3. Descendant snapshots become stale when the previous state they depended on became stale.
4. Stale state is immediately removed from writer routing.
5. Historical stale panels remain visible for audit with a source-changed warning.
6. When automatic tracking is active, SnowBunny rebuilds current state from the latest valid chain point and the current visible story.

This is intentionally stricter than simply checking whether the producing assistant message still exists.

## Manual editing

The latest valid Story State panel is editable.

Saving an edit:

- changes the canonical current tracker snapshot;
- increments its tracker revision;
- marks it manually edited;
- makes it the exact state supplied to the next writer;
- makes it the next tracker update's starting point;
- stores the generated pre-edit version for restore/audit;
- stores a manual revision record instead of silently destroying old state.

`Restore generated` returns the latest current snapshot to its pre-edit generated version while preserving the revision trail.

`Regenerate state` asks the tracker to rebuild current state from canonical visible evidence.

## Reader-facing projection

`tracker-ui.js` projects snapshots back onto the real ST message DOM without replacing canonical messages.

- Time & Place appears near the producing reply header/body boundary.
- Rich Story State appears below the producing reply.
- sections have distinct visual treatments/icons and independent disclosure state;
- disclosure state survives rerenders;
- Markdown is rendered through ST's established message formatting path when available;
- historical snapshots stay attached to their producing reply;
- only the current valid snapshot exposes Edit;
- stale snapshots remain readable but are visibly non-authoritative.

## Agents surface

`agents-ui.js` makes Story Tracker the first live native Agent card in the right-drawer Agents destination.

Normal controls show plain-language behavior:

- On / Off;
- updates after story replies;
- result appears below the reply;
- current state helps the next reply;
- section toggles;
- Update now;
- Open current state.

Advanced controls currently expose only Story-Tracker-relevant settings: recent-story window, tracker reply limit, and additional tracker instructions.

This is intentionally not a port of the old developer-form Agents screen. Pocket Phone Upkeep and generic Custom Agents still need their native engines before they join the same surface.

## Guardrails

Do not:

- append tracker text into visible user prose;
- send a different hidden state than the panel shows;
- let Memory Maker consume tracker state;
- treat unchosen CYOA paths as events;
- silently keep using stale state after history changes;
- rewrite historical panels when the current state changes later;
- discard generated pre-edit state when Snow edits current continuity;
- flatten the rich Story State panel into debug text or a tiny utility chip.
