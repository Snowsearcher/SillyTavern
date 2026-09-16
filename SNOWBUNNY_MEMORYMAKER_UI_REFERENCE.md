# SnowBunny Memory Maker UI Reference

This file records the intended Memory Maker experience for the SillyTavern fork. The old SnowBunny implementation already contains the right underlying concept: Memory Maker is a reviewed proposal system, not a silent summarizer. The fork should preserve the machinery and substantially improve the reader-facing experience.

Primary old-source references:

- `SNOWBUNNY_HANDOFF/source/app/lib/agents/memory_maker.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/agents/story_memory.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/agents/memory_screen.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/agents/memory_proposal_card.dart`
- Chat/composer integration in `SNOWBUNNY_HANDOFF/source/app/lib/chat/chat_screen.dart` and `ui/story_composer.dart`

## Core product idea

Memory Maker is a collaborative editor of long-term story history.

It periodically reads the actual fiction and proposes only memories worth preserving. A proposal is never saved automatically. Snow reviews it in the chat and can accept it, reject it, or explain what is wrong so Memory Maker can reconsider and return a revised proposal.

The in-chat proposal interaction is a major part of the feature. Do not reduce Memory Maker to a settings page, background summarizer, notification badge, or hidden database process.

## What the old engine already supports

The old implementation already has a strong proposal model:

- automatic checks after a configured number of completed Character/Narrator replies; default frequency is 5;
- manual `Ask Memory Maker` review;
- no proposal is required when nothing is worth saving;
- at most six focused proposals per review;
- proposal actions: `create`, `edit`, `merge`, `delete`;
- title, details and a concrete reason for every proposal;
- existing-memory comparison for edits/merges/deletes;
- proposal/version validation so stale changes cannot be accepted after their source changed;
- accepted-change revision history;
- reviewed recovery/undo through the same proposal flow.

This capability should be preserved.

## Existing in-chat concept

The old chat already surfaces pending Memory Maker work without forcing Snow into the Memory screen:

- the composer can show `A memory is ready to review` / `N memories are ready to review`;
- Snow can dismiss that notice with `Later` without rejecting the proposal;
- tapping it opens a review-only bottom sheet;
- the review surface uses the same `MemoryProposalCard` as the full Memory library;
- pending suggestions remain pending until explicitly handled.

The fork should keep this non-intrusive philosophy but make the review interaction much prettier and more direct.

## Desired in-chat proposal popup

When Memory Maker finds something worth proposing after a background review, surface a beautiful, non-blocking in-chat popup/card above the composer or otherwise anchored to the current chat chrome.

It should not steal the entire screen, interrupt reading, or force immediate action. Snow can keep reading/writing and return to it.

The proposal should clearly communicate, in natural language:

- **what Memory Maker wants to do**;
- the proposed memory title/details or the proposed change;
- **Reason:** why Memory Maker thinks this should be saved/changed;
- clear **Yes / No** actions;
- an optional response/correction box where Snow can explain agreement, rejection, missing detail, wording, or context.

The presentation should feel like Snow is reviewing an intelligent assistant's suggestion, not approving a database transaction.

## Yes / No + feedback behavior

This is an intentional refinement beyond the old UI.

The old `MemoryProposalCard` supports a correction box, but correction is only sent when Snow explicitly requests a corrected preview; plain `No, skip` simply discards the proposal.

The fork should make Snow's written response meaningful with either decision:

- **Yes, no note:** accept the current proposal.
- **Yes + note:** ask Memory Maker to apply the note and show the revised proposal before final save unless the UI explicitly offers an unambiguous direct-edit/save path.
- **No, no note:** reject/dismiss this proposal.
- **No + note:** reject the current version but send Snow's explanation back to Memory Maker for reconsideration. Memory Maker may return a corrected/reframed proposal or decide that no memory should be made.

A rejection with explanation is therefore not a dead end. It is feedback.

The updated proposal should replace/refresh the same review card rather than spawning confusing duplicate proposals.

## Action-specific presentation

The popup must explain the actual operation rather than treating every proposal as `new memory`.

### Create

Show:

- `Memory Maker wants to save a new memory`
- proposed title
- proposed details
- reason
- Yes / No / response box

### Edit

Show:

- `Memory Maker wants to update this memory`
- current memory
- proposed replacement
- reason for the change
- Yes / No / response box

This is important when later context reveals that an earlier accepted memory was incomplete or wrong.

### Merge

Show the memories being combined and the proposed merged result. Make it easy to understand what information will survive.

### Delete

Show the existing memory, explain why Memory Maker believes it should be removed, and require explicit approval. Deletion stays reversible through revision/recovery history.

## One-at-a-time review

When several proposals are pending, do not dump six dense cards into the chat at once.

Preferred behavior:

- show one proposal at a time in the in-chat review surface;
- indicate `1 of N` or otherwise make the queue understandable;
- after Snow handles one, smoothly advance to the next;
- the full Memory screen can still show/manage the entire pending queue.

This keeps the popup genuinely non-intrusive.

## Saved Memories / full Memory screen

The dedicated Memory screen still matters for browsing and management. It should be redesigned later, but retain these capabilities:

- Saved memories in chronological/story order;
- search;
- Suggestions queue;
- automatic-check settings;
- revision/history recovery;
- changed-source warnings and re-review;
- Story-wide ownership for Story chats and chat-local ownership for standalone chats;
- timeline/alternate-period controls where still applicable to the final architecture.

The in-chat popup is the primary review experience; the full screen is the library/management experience.

## Context View relationship

Memories may also be visible through View Context on individual Story Writer replies. That is an audit surface showing which recalled memories influenced that reply.

Do not confuse View Context with Memory Maker review:

- View Context answers `what memory context did this generation receive?`
- Memory Maker popup answers `should this proposed historical memory/change be saved?`

Both are valuable and should remain available.

## Evidence boundary

Follow `SNOWBUNNY_CONTEXT_ROUTING_REFERENCE.md` for what Memory Maker is allowed to read.

For the fork, Memory Maker should base proposals on actual story/phone events and accepted historical memories, not hidden tracker inference. The old handoff fed tracker state/snapshots into Memory Maker; that link is intentionally removed in the new routing design so inferred current state does not become historical fact by accident.

## Visual quality bar

The proposal popup should be unmistakably SnowBunny:

- elegant rounded/layered card or sheet treatment;
- attractive iconography and accent treatment for Create / Edit / Merge / Delete;
- excellent mobile typography;
- comfortable reading of the proposed memory;
- clear current-versus-proposed comparison when changing an old memory;
- response field that feels natural to use;
- subtle animation when a proposal appears, is revised, accepted, rejected, or advances to the next proposal;
- never a blocking modal alert unless a destructive confirmation truly needs one.

## Guardrails

Future implementation sessions must not:

- auto-save Memory Maker proposals;
- hide all proposals inside the Memory settings screen;
- replace the in-chat review with a tiny badge only;
- make `No` with an explanation discard the explanation;
- treat edits/merges/deletes as if they were new-memory proposals;
- flood the chat with every pending proposal simultaneously;
- turn Memory Maker into a generic rolling summary;
- promote tracker inference, Lorebook facts or unchosen CYOA paths into historical memories;
- lose revision/recovery history;
- accept a stale proposal after its source history has changed.

The target experience is a cooperative memory editor that occasionally taps Snow on the shoulder with a thoughtful, attractive suggestion, then waits for a real answer.