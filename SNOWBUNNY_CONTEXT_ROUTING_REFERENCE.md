# SnowBunny Context Routing Reference

This file records how SnowBunny's story-writing and support systems should share context. It is based on the original SnowBunny handoff source plus Snow's corrections for the fork.

The goal is **not** to give every subsystem everything. Each subsystem gets only the evidence that helps it perform its own job.

## Core principle

Treat context as a routing graph with explicit YES/NO links rather than one giant shared prompt.

A fact may be useful to the Story Writer, Lore retrieval, Memory Recall or a tracker while being intentionally hidden from Memory Maker. The same source can therefore have different permissions depending on the consumer.

## Old SnowBunny flow worth preserving

The handoff already had a strong execution order:

1. Story Writer generates a Character/Narrator reply.
2. Only after a successful completed reply, inline tracker extraction and automatic sidecar Agents run.
3. Phone reply/background maintenance runs when due.
4. Ongoing guides refresh when due.
5. Memory Maker reviews when due.

This means tracker state is normally updated **after** the assistant reply that established the new state and is available before the next Story Writer generation.

Do not run ordinary automatic story trackers merely because the user typed a new message. Their canonical update point is after a successful Character/Narrator reply, because they summarize the state established by that completed story response.

## Story Writer: what it should receive

The Story Writer is the main consumer. Its job is to write the next scene/reply.

It may receive:

- the allowed visible chat back-catalogue/history, fitted to context size;
- active Character/Persona/Narrator authored data;
- Scenario;
- retrieved Lorebook/Codex entries;
- recalled accepted Memories that are relevant to the current scene;
- the **current editable tracker state**;
- relevant Pocket Phone continuity;
- ongoing Guides;
- current one-shot Guided/CYOA instructions and other reply-local guidance;
- normal preset/writing instructions.

### Tracker placement for the Story Writer

Current tracker state must be close enough to the newest turn that the writer actually uses it.

Functionally, trackers travel with the next user turn, but **do not modify the canonical text of the user's message** and do not become visible chat history.

Preferred native layout:

```text
<current-state>
...current tracker text...
</current-state>

[user's newest message remains the real user message]
```

Implementation may render this as a hidden system/current-state block immediately adjacent to the newest user turn, or through the active preset's compatible insertion mechanism. The important behavior is:

- Story Writer sees the latest tracker state on the next generation;
- user-visible message text stays untouched;
- Memory Maker and other history-only consumers do not accidentally inherit tracker prose as if it were story canon;
- private tracker material remains context for writing, not proof that the user/character knows it.

The old handoff already injected tracker feedback into Story Writer prompt assembly with role/depth controls. Preserve the capability while simplifying the normal SnowBunny path.

## Trackers / story-state Agents

Automatic trackers run after a successful Character/Narrator reply.

They should normally receive:

- their own previous tracker state;
- the newly completed story reply and an appropriate recent visible-story window;
- other current trackers when relevant/dependent;
- relevant Pocket Phone continuity;
- optional explicit history/memory lookups when that Agent is configured to use them.

They should not write the next scene. Their output is current state.

The consolidated Story Tracker remains responsible for present-state material such as Thoughts, Relationships, Scene, Threads, Secrets, Conditions, Inventory (optional), Offscreen Characters and GM Notes.

### Editable tracker state

The fork must make current tracker output editable.

Editing a tracker should:

- immediately change the current state supplied to the next Story Writer request;
- become the previous state that the tracker starts from on its next update;
- keep the generated pre-edit text available for audit/undo rather than silently destroying it;
- create a manual revision/source marker so View Context can show that the writer saw a user-edited tracker;
- remain subject to normal source/history invalidation if the story branch it belongs to is later changed.

The old Agents screen displayed the latest tracker as read-only text. This is an intentional fork improvement.

## Memory Maker: strict evidence boundary

Memory Maker preserves **historical events**. It must not consume hidden current-state tracker prose.

Memory Maker should receive:

- actual visible story messages/events within its configured review window;
- existing accepted Memories needed for comparison/edit/merge decisions;
- pending Memory proposals needed to avoid duplicates;
- relevant Pocket Phone events because those are real fictional events even when the narrator did not repeat them;
- explicit user correction supplied to Memory Maker;
- optional lookups into actual story history / accepted Memories when enabled.

Memory Maker should **NOT** receive:

- current tracker results;
- historical tracker snapshots;
- hidden Thoughts/Relationships/Threads/etc merely because a tracker inferred or preserved them;
- Scenario;
- Lorebook/Codex world facts as a substitute for an event;
- Guided/CYOA instructions;
- unchosen choices;
- other generated support-state that did not itself occur in the fiction.

This is a deliberate correction from the handoff source. The old `memory_maker.dart` explicitly included `Current trackers`, and `tracker_history.dart` embedded tracker snapshots alongside recent story for Memory Maker review. The fork should remove both links.

Reason: Memory Maker should remember what happened, not promote support-state/inference into historical fact.

## Memory Recall is different from Memory Maker

Memory Recall does **not** create or rewrite Memories. It selects already-approved Memories that may help the Story Writer right now.

Because it cannot invent new historical facts, it may use current-state hints to judge relevance.

Recommended inputs:

- recent visible conversation;
- current tracker excerpts as **selection hints only**;
- relevant Pocket Phone excerpts as **selection hints only**;
- the pool of valid accepted Memories.

Its output is only a list of existing Memory IDs/reasons. It does not turn tracker text into Memory content.

This matches a useful distinction already present in the handoff: tracker/phone excerpts helped Memory Recall decide which approved Memories mattered to the next scene.

## Lorebook retrieval

Keyword/vector Lorebook retrieval selects existing authored Lorebook entries. It does not create new canon.

Recommended search inputs:

- the relevant recent visible story/back-catalogue;
- the newest user turn;
- reply-local guidance when its `scan` behavior explicitly allows that;
- current tracker excerpts as supporting query context;
- relevant Pocket Phone excerpts as supporting query context.

Tracker/phone excerpts are search evidence only. They are **not** inserted into the retrieved Lore entry text and do not become dialogue.

This preserves the handoff behavior in `retrieval_context.dart`, where current tracker and phone excerpts helped choose relevant Lore.

## Pocket Phone routing

Pocket Phone events belong to the same fiction, but each consumer receives them for a different responsibility.

- Story Writer: YES, so significant exchanges can naturally affect the scene while respecting who knows what.
- Trackers: YES, so current relationships/knowledge/plans can update even when the narrator did not restate the phone event.
- Memory Maker: YES, because a meaningful message/exchange can itself be a historical event.
- Memory Recall: YES as relevance evidence.
- Lore retrieval: YES as retrieval/search support where useful.
- Phone upkeep: YES, for its own maintenance job.

Reading/browsing the phone UI never advances story time or invents a player action.

## Recommended routing matrix

| Source / evidence | Story Writer | Trackers | Memory Maker | Memory Recall | Lore retrieval |
| --- | --- | --- | --- | --- | --- |
| Visible story messages | YES | YES | YES | YES, recent | YES, recent/query |
| Current tracker state | YES | YES, previous/dependencies | **NO** | YES, relevance only | YES, query support only |
| Historical tracker snapshots | normally NO; current state is enough | only when rebuilding | **NO** | NO by default | NO by default |
| Accepted Memories | YES, recalled relevant subset | optional lookup when configured | YES, comparison/history | YES, source pool | NO by default |
| Lorebook/Codex | YES, retrieved entries | NO by default | **NO** | NO | YES, source pool |
| Pocket Phone events | YES | YES | YES, event evidence | YES, relevance only | YES, query support only |
| Character/Persona/Narrator | YES | only if an Agent specifically needs it | NO | NO | normally NO |
| Scenario | YES | NO by default | **NO** | NO | NO by default |
| Ongoing/one-shot guidance | YES | NO | **NO** | NO | only when explicitly allowed to scan |
| Unchosen CYOA options | NO as happened events | NO | **NO** | NO | NO |

Advanced/custom Agents may request extra sources through explicit tools/dependencies, but the normal path should follow this table.

## Back-catalogue / context fitting

Keep Story Writer history separate from other systems' review windows.

- Story Writer gets the amount of visible chat history the active preset/context allowance permits.
- Oldest removable history is the first thing trimmed when the model cannot fit everything, while the newest turn remains protected.
- Retrieved Lore can then be reduced by priority/relevance if necessary.
- Memory Maker has its own review-window setting and should not inherit the Story Writer's context fit decisions.
- Trackers have their own history window.
- Memory Recall has its own small recent-conversation window plus accepted Memory candidates.

One subsystem's context window must not silently become every subsystem's context window.

## View Context / audit

For every Story Writer reply, save the exact routing result:

- which history messages were included/omitted;
- which current tracker revision was supplied, including manual edits;
- which Memories were recalled;
- which Lore entries were selected and why;
- which Phone evidence/guidance was supplied;
- model/preset/settings used;
- source fingerprints/versions needed to prove the receipt still describes that historical generation.

Later edits to trackers, Lore, Memories, presets or history must not rewrite an old reply's receipt.

## Guardrails

- Do not append tracker text permanently to the user's visible message.
- Do not let Memory Maker learn hidden tracker state.
- Do not make current tracker state useless by updating it after a reply and then withholding it from the next Story Writer request.
- Do not treat Memory Recall and Memory Maker as the same consumer.
- Do not let retrieval-support excerpts become new dialogue/canon merely because they helped select a Memory or Lore entry.
- Do not give every subsystem the full Story Writer prompt.
- Do not remove the handoff's source-fingerprint/history-validation model when porting this routing.
