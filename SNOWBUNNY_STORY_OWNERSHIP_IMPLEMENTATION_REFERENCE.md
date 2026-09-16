# SnowBunny Story Ownership Implementation Reference

This file records the live Story ownership / continuity rules on `snowbunny-mobile`.

It exists because moving a chat between Stand-alone and Story ownership is not a cosmetic folder operation. Story ownership changes which Lorebooks and Memories are shared, so the transition must preserve continuity without silently contaminating another Story.

## Story ownership boundary

A SnowBunny Story owns only shared fiction continuity:

- Story Lorebooks;
- accepted Story Memories;
- membership of chats in that Story.

The following remain chat-specific when a chat joins, leaves, or moves between Stories:

- Persona;
- Members / Narrator selection;
- Model;
- Preset;
- Scenario;
- Regex;
- Agents / tracker state;
- CYOA.

## Story Settings

`story-settings.js` is the dedicated Story Settings surface.

It manages only the shared Story layer:

- Story Lorebook assignment;
- accepted Story Memories;
- Story chat membership.

It deliberately does not grow into another generic settings screen.

The Story interior receives a gear action that opens this surface.

## Story -> Stand-alone

`story-ownership.js` implements the continuity fork.

When the current chat leaves a Story:

1. Save the current chat first.
2. Read the current Story's accepted Memory state.
3. Snapshot every accepted Story Memory into a **new stand-alone Memory file**.
4. Give every copied Memory a new local Memory id.
5. Preserve lineage metadata back to the originating Story + originating Memory id.
6. Copy the Story Memory settings, but do not copy pending Story proposals as accepted/private history.
7. Remove the chat from the Story index.
8. Remove the chat's `storyId` metadata.
9. Convert the chat's entire currently-effective Lorebook set into chat-specific Lorebook bindings.
10. Record ownership-lineage metadata on the chat.

A fresh local Memory file is always created during this fork. SnowBunny does not revive an older stand-alone Memory pointer by accident.

The original Story Memories remain untouched and continue to belong to the Story.

## Stand-alone -> Story

The destination Story is authoritative.

When the current stand-alone chat joins a Story:

1. Read the chat's local accepted Memories.
2. Read the destination Story's accepted Memories and pending proposals.
3. Do **not** merge any local accepted Memory directly into the Story.
4. Skip exact duplicates already present in the Story.
5. If a local Memory carries lineage showing it was forked from this same Story and the original Story Memory still exists, stage an **edit proposal** when the local copy differs.
6. Otherwise stage a **create proposal** for explicit review.
7. Preserve the old local Memory file path as an archive pointer on the chat.
8. Add the chat to the destination Story only after the reconciliation proposals were safely written.
9. Switch the chat to the Story's Memory owner.

The staged proposals use the normal Memory review path. They are not auto-accepted merely because the user chose to join a Story.

## Story A -> Story B

This is intentionally implemented as:

`Story A -> stand-alone continuity fork -> Story B join/review`

That means:

- Story A's continuity is first preserved locally with new local Memory ids;
- Story A's effective Lorebooks become chat bindings;
- Story B then becomes authoritative;
- the local accepted Memories are staged for review against Story B rather than silently copied into it.

This makes the ownership change explainable and reversible instead of treating Stories as labels on the same invisible state.

## Lorebook behavior

Leaving a Story preserves the chat's current continuity by turning the whole effective Story + chat Lorebook union into chat-specific bindings.

Joining another Story does not delete those chat-specific bindings. The destination Story's mandatory Lorebooks are added by normal effective-union behavior.

The user can then remove unwanted chat-specific books explicitly.

## Memory reconciliation proposals

Join-review proposals carry origin metadata describing:

- source chat reference;
- source local Memory id;
- prior Story-fork lineage when present;
- archived local Memory file path;
- destination Story id.

They intentionally have no fabricated story-source receipt. The evidence is an already-accepted local Memory plus explicit user review of whether it should enter the shared destination Story.

## Proposal-batch safety

`memory-store.js` now rebases unaffected sibling proposals after one proposal in the same accepted-Memory version is approved.

Before this correction, approving one proposal incremented the Memory version and could make every other proposal from the same review batch stale even when their targets were untouched.

Now:

- unaffected sibling proposals are rebased to the new Memory version;
- a sibling whose expected target changed remains marked as requiring review;
- unrelated manual Memory edits still invalidate old proposal versions conservatively.

This lets multi-proposal Memory Maker / reconciliation queues work without weakening conflict safety.

## Non-current chat removal

A Story chat should not be detached blindly while another chat is open, because SnowBunny would be unable to safely write that chat's local fork metadata/file through the normal current-chat state APIs.

The Story Settings UI therefore:

- lets the **current** Story chat become stand-alone safely;
- lets other Story chats be opened first;
- does not pretend a non-current remove succeeded by editing only the Story index.

The Story browser's old direct remove/add controls are replaced at runtime with the same continuity-safe ownership path.

## Story creation guard

The old Story creation sheet offered `Add the current chat to this Story` as a direct checkbox. That path bypassed Memory/Lore continuity reconciliation.

`story-create-safety.js` disables that unsafe shortcut. The Story is created first; the chat is then added through Story Settings / the continuity-safe join path.

## Guardrails

Do not:

- silently inject stand-alone Memories into a Story;
- silently discard Story Memories when a chat leaves;
- reuse stale local Memory files when leaving a Story;
- remove a non-current Story chat by editing only the Story index;
- make Persona/Model/Preset/etc. Story-owned during a move;
- delete the originating Story's Memories after a fork;
- treat pending Memory proposals as accepted history during a fork;
- collapse Story A -> Story B into a direct pointer change.
