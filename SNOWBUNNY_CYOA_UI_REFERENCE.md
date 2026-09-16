# SnowBunny CYOA UI Reference

This file records the CYOA / story-choice system as its own SnowBunny feature. It must not be folded into Regex merely because some Regex rules can help present or trim CYOA markup.

## Core separation

CYOA and Regex are separate systems.

CYOA owns:
- whether story choices are enabled for the current chat;
- the Story Writer prompt/instruction that allows choice cards;
- parsing a completed assistant reply for one valid choice card;
- deciding whether that choice card is still active;
- turning a selected path into the user's next message;
- keeping unchosen paths out of story history.

Regex owns display/input transformations and may contain helper rules related to CYOA, but it does not own CYOA enablement, choice validity, or selection semantics.

The right drawer therefore keeps distinct rows for **CYOA** and **Regex**.

## Screenshot / UI baseline

Use Snow's supplied CYOA screenshots as the baseline interaction direction, refined to match the final SnowBunny frontend.

The old screen is intentionally simple:
- title `CYOAs`;
- Story Choices heading;
- one clear per-chat Story choices toggle;
- short explanation of how it works;
- no pile of low-level configuration.

The final fork should preserve that simplicity while upgrading visual polish to match the rest of SnowBunny.

## Existing behavior to preserve

The old handoff source in `chat/cyoa.dart` already establishes useful behavior:

- CYOA enablement is stored per chat.
- A recognized CYOA prompt row can be controlled by the CYOA toggle.
- A valid assistant result contains exactly one `<choicecard>`.
- The card contains 2 to 5 `<path>` choices.
- Each path contains an `<act>` with type `dialogue`, `action`, or `direction`.
- Dialogue choices are sent quoted.
- Actions and directions are sent as plain text.
- The card is active only on the latest visible completed assistant reply.
- Old cards become inactive automatically when the story moves on.
- Selecting a card validates that the underlying reply has not changed before returning the selected text.

## Reader interaction

The story can offer a small set of choices at meaningful moments.

The user may:
- tap one path and send it as the next user message;
- ignore the card entirely and write their own reply;
- keep reading old choice cards as presentation/history, while only the current latest card remains actionable.

Unchosen paths are never treated as events that happened.

## Presentation quality

Choice cards should be attractive story UI, not plain debug buttons.

Requirements:
- visually attached to the reply that produced them;
- polished SnowBunny card styling;
- large mobile touch targets;
- clear selected/disabled states;
- dialogue/action/direction can have distinct visual cues when useful;
- stale/older cards remain readable but not accidentally tappable;
- no intrusive full-screen modal is needed for ordinary use.

## Relationship to Regex

Regex may provide helper rules such as:
- hiding raw CYOA markup from display;
- removing old CYOA markup from AI input through Context Saver;
- styling or transforming legacy CYOA markup for compatibility.

Those are supporting transformations only.

Do not make CYOA dependent on the user manually enabling a Regex preset in order to function in the native SnowBunny fork. Native CYOA should own its own parser, active-state logic and selection behavior.

## Guardrails

Future implementation sessions must not:
- merge CYOA and Regex into one menu/system;
- treat Regex as the owner of CYOA state;
- send unchosen paths into canonical chat history;
- leave old cards actionable after the story has moved on;
- require the user to understand XML/markup to use CYOA;
- clutter the CYOA settings screen with Regex-level technical controls;
- downgrade the card presentation to plain text buttons.
