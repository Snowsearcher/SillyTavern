# SnowBunny Members Implementation Reference

This file records how SnowBunny's settled Current Chat **Members** UX maps onto the SillyTavern fork. It is an implementation contract, not a redesign of the Members experience.

## Core decision

Use SillyTavern's mature **group-chat member/generation machinery** as the backend primitive for SnowBunny chats with multiple ordinary Character members.

This does **not** mean SnowBunny adopts SillyTavern's group-chat UI or treats a SnowBunny Story as a SillyTavern group.

- SnowBunny owns the visible `Members (N) + Add` experience.
- SillyTavern group storage/generation owns the ordinary Character member array and per-member participation state for a multi-member chat.
- SnowBunny Story ownership remains separate. A Story owns shared Lorebooks + Memories; it is not an ST group.
- Narrator is a separate protected SnowBunny identity and is never inserted into `group.members`.

## Canonical ordinary Character members

For a group-backed SnowBunny chat:

- `group.members` is the canonical list of ordinary Character members.
- Character identity is the real ST Character avatar/card identity, not display-name matching.
- `group.disabled_members` is SnowBunny's current participation/mute state for automatic replies.
- Removing a member changes the real group member array rather than hiding a UI chip only.

This lets the existing ST group-generation path continue to select a real speaking Character, use real Character cards, preserve group chat history, and emit established generation/chat events.

## Per-member participation control

The small control shown on an ordinary member row currently maps to ST's `disabled_members` behavior:

- active: the member may participate in automatic group reply selection;
- muted: the member remains part of the chat/cast but is excluded from automatic reply selection;
- at least one ordinary Character remains active.

This is a SnowBunny behavior mapping. **Do not claim it reproduces the exact meaning of Tavo's speech-bubble / crossed-bubble icon.** That Tavo semantic was never verified.

## Multi-member generation mode

When SnowBunny promotes a legacy single-Character ST chat into a multi-member chat, the created backend group currently uses:

- natural group activation for choosing who replies;
- APPEND card mode so the writer can receive the ordinary cast's Character-card context through ST's established group-card combination path;
- self-responses allowed so the same Character is not artificially forbidden when story flow needs it.

These are backend implementation choices. They remain subordinate to SnowBunny's prompt/context routing.

## Legacy single-Character chat promotion

A normal existing ST Character chat is not destructively converted in place when a second ordinary Character is added.

Current SnowBunny behavior:

1. Save the current Character chat.
2. Snapshot its canonical message history and chat metadata.
3. Create a new ST group-backed chat with the selected ordinary Character members.
4. Copy the existing history/metadata into that new group chat.
5. Record hidden SnowBunny provenance showing which Character chat it was promoted from.
6. Open the new multi-member chat.
7. Leave the original single-Character chat untouched.

The copied chat is a new chat identity. It is not a silent in-place mutation of the old file.

## Member picker

The right-drawer `Add` action opens SnowBunny's own mobile Members picker:

- portrait + name rows;
- search;
- favorites first for ordinary Characters;
- current members preselected;
- multi-select;
- Apply commits the result.

For an existing group-backed chat, Apply edits the existing real Character member array.

For a legacy single-Character chat, changing the ordinary Character selection triggers the safe promotion/copy flow above.

The same sheet also contains the protected Narrator option. Narrator selection is stored as SnowBunny chat metadata and therefore survives a legacy-chat promotion because the metadata snapshot is copied into the new group-backed chat.

## Narrator adapter

`narrator.js` implements the first real protected Narrator resource.

Current behavior:

- Narrator is shown/selectable inside the Members picker rather than as a second generic Character row.
- Its membership flag is chat-specific (`narratorMember` under SnowBunny chat state).
- It may coexist with ordinary Character members.
- It is never inserted into `group.members` and therefore never masquerades as an ST Character.
- When selected, a protected Narrator row appears inside the Members section.
- The Narrator row has an editor action but no destructive delete action.
- The global Narrator record has displayed name, portrait, Narrator instructions, and Voice/style.
- The canonical Narrator payload is stored as a SnowBunny user file rather than bloating lightweight global state.
- During generation, selected Narrator instructions are routed through ST's extension-prompt mechanism inside a native `<narrator name="...">...</narrator>` wrapper with World Info scanning disabled.

Current limitation: the adapter supplies Narrator identity/instructions to the Story Writer, but it does **not yet dispatch Narrator as its own independent ST message speaker**. Ordinary Character speaking selection still uses ST group generation. Narrator-only new-chat creation and explicit Narrator-speaker generation require the next special-speaker dispatch layer and must not be faked through a Character card.

See `SNOWBUNNY_NARRATOR_IMPLEMENTATION_REFERENCE.md`.

## Single-member new SnowBunny chats

A future native SnowBunny new-chat flow may choose to create a group-backed chat even when it starts with one ordinary Character, so adding a second Character does not require promotion later.

That is an implementation direction, not a requirement to rewrite existing ST single-Character chats. Existing chats remain compatible and are promoted only when the user actually changes them into a multi-member chat.

Narrator-only starts require the special-speaker dispatch layer and must not be forced through a fake Character card.

## Story relationship

Members are chat-specific.

Moving a chat into or out of a Story does not change its member list merely because the Story changes. Story ownership remains limited to shared Lorebooks and Memories.

The ST group used underneath a multi-member chat is therefore **not** the SnowBunny Story and must never become the owner of Story-wide Lorebooks or Memories by accident.

## Guardrails

Future implementation work must not:

- restore a duplicate generic `Characters` row below Members;
- display a second cast-chip strip elsewhere in the chat shell;
- infer ordinary Character identity by name when stable Character identity is available;
- call an ST group a SnowBunny Story;
- apply Story-wide ownership to Members;
- flatten Narrator into a normal Character card;
- persist Narrator inside `group.members` merely to reuse ST generation;
- claim the ordinary-member mute/participation icon is a verified copy of Tavo's unknown control semantics;
- destructively rewrite an existing legacy Character chat merely to add another member.
