# SnowBunny Memory Recall Implementation Reference

This file records how accepted Memories are selected for the Story Writer in the current `snowbunny-mobile` implementation.

It is separate from Memory Maker.

- **Memory Maker** proposes historical Memory changes for Snow to review.
- **Memory Recall** selects already accepted Memories that may help the next Story Writer reply.

Recall never creates, edits, merges, or deletes a Memory.

## Routing point

`memory-recall.js` runs during ST's awaited `GENERATION_AFTER_COMMANDS` seam, before normal prompt assembly clears the current draft.

That lets Recall see:

- the latest canonical visible story;
- the user's pending newest turn;
- the currently valid Story Tracker snapshot as a relevance hint;
- the accepted Memory pool.

The resulting selected Memories are placed in a hidden system prompt using native wrappers:

```text
<recalled-memories>
<memory id="..." title="...">
...
</memory>
</recalled-memories>
```

Only accepted Memory text is inserted. Tracker hints influence selection only and are never copied into Memory content.

## Selection quality

Recall uses two stages.

### Candidate fitting

When the accepted Memory pool is large, SnowBunny first builds a bounded candidate set using conservative lexical overlap plus recent-memory coverage. This is only a context-fit step; it is not the final relevance decision.

### Relevance review

The active chat model receives:

- the candidate accepted Memories;
- the recent conversation and pending user turn;
- current tracker state clearly labeled as a relevance hint only.

It returns JSON containing at most five existing Memory IDs with a concrete reason each would help this scene.

The prompt explicitly rejects weak selection based on a familiar character name alone and warns against reviving resolved conflict as if it were current.

If that side review fails, SnowBunny does not block the Story Writer. It falls back to a conservative direct-overlap selection and records that fallback in View Context.

## Cache and freshness

A recall result is cached only while all of these remain the same:

- accepted Memory version;
- recent message ids/revisions/source fingerprints;
- pending user draft;
- current Story Tracker id/revision;
- changed-source Memory exclusion set.

Changing any of those invalidates the cache.

The result is revalidated after the side review. If story history, accepted Memories, tracker state, or Memory source-validity changed while selection was running, that result is discarded/falls back rather than being silently trusted.

## Changed-source Memories

`memory-integrity.js` tracks accepted Memories whose original source story in the currently edited source chat no longer matches its stored SnowBunny message fingerprints.

The invalid set is stored per Memory owner:

- Story owner for Story-wide Memories;
- chat owner for stand-alone Memories.

That means an edit in one Story chat can invalidate a Memory for recall in the other chats of the same Story.

Recall excludes those changed-source Memories until their evidence is reviewed/reconnected.

Accepted Memories from another Story chat are not incorrectly declared stale merely because the current chat is different. Validation is performed when the actual source chat is active and changes.

## View Context receipt

Each generated assistant reply can record a `Memories` receipt with:

- accepted Memory version;
- selection mode (`AI relevance review`, cache, or conservative fallback);
- any changed-source Memory IDs excluded;
- tracker snapshot/revision used only as a relevance hint;
- selected Memory IDs/titles and specific selection reasons.

This allows Snow to inspect why an old event influenced a particular reply without turning Recall into visible story prose.

## Evidence boundaries

Memory Recall may use current tracker state as relevance evidence because it cannot create new historical facts.

Memory Recall must not:

- save tracker text into Memory;
- modify accepted Memories;
- treat Scenario or Lorebook text as historical events;
- select unchosen CYOA paths as if they happened;
- silently use a Memory known to have changed source evidence;
- force a Memory into every reply merely because one exists.
