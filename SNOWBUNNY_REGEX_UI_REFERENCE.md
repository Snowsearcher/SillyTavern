# SnowBunny Regex UI Reference

This file records Regex as its own SnowBunny system. It must not be merged with CYOA merely because some built-in/imported Regex rules can target CYOA or tracker markup.

## Core separation

Regex is a transformation engine for chat presentation and AI input.

It owns:
- global / all-chat rules;
- per-chat rules;
- rule ordering;
- display-phase transformations;
- AI-input transformations;
- targeting user, assistant or both;
- Regex flags and message-depth limits;
- capture trimming / replacement behavior;
- previewing a rule against sample text;
- import/export of Regex rules;
- optional interactive-message scripting controls.

CYOA remains a separate per-chat story-choice system with its own toggle, parser and selection behavior.

## Screenshot / UI baseline

Use Snow's supplied Regex screenshots as the baseline interaction direction, then refine the visual treatment to match the final SnowBunny frontend.

The old Regex screen already has several useful distinctions to preserve:
- clear `This chat` / `All chats` scope switch;
- global rules run first, then chat rules;
- draggable ordering;
- quick enable/disable per rule;
- visible indication of whether a rule changes `AI input` or `display`;
- create/import/export;
- optional Interactive messages section;
- dedicated rule editor with preview.

The final fork should keep those capabilities while reducing ugly settings-form feeling and using the same polished SnowBunny visual language as the rest of the app.

## Rule editor

A Regex rule needs a capable editor, but technical controls should be grouped sensibly.

Core/default controls:
- Name
- Find pattern
- Replace vs Erase
- Replacement text when applicable
- Apply to: Message display or AI input
- Messages: User / Assistant / Both
- live/sample preview

Advanced / collapsible controls:
- Regex flags: global, ignore case, multiline, dot-all, Unicode
- minimum / maximum depth
- capture trimming
- any compatibility-only fields needed for imports

The old preview concept is worth preserving: let the user paste sample text and see the transformed result before saving.

## Original-message safety

Regex transformations must not silently mutate canonical stored chat prose.

- Display rules alter presentation only.
- AI-input rules alter what is sent to the model for that generation.
- Original messages remain stored intact.
- Reapplying display rules after edits/rerendering should be deterministic.

## Built-in / special rules

SnowBunny already uses important Regex rules for things such as:
- `Context Saver — States + CYOA`
- diegetic-graphics context saving
- CYOA display helpers / compatibility transforms
- other rich presentation / context-saving behavior imported from the old setup.

Preserve these concepts. Do not dismiss Regex as merely a word-replacement feature.

Context Saver is especially important because it can strip presentation/state markup from older AI-input history without deleting the original message itself.

## Interactive messages

The old Regex screen exposes an `Interactive messages` area with an explicit chat-level toggle allowing HTML/JavaScript message content to keep UI state and fill the composer while preserving original chat text.

Treat this as an advanced rich-message capability associated with Regex/presentation, not as CYOA itself.

Native SnowBunny features such as CYOA should not require arbitrary user scripts to perform their core behavior, but compatibility with rich scripted messages remains valuable.

## Relationship to CYOA

There is intentional overlap at the boundary:
- Regex can hide raw `<choicecard>` markup from display or AI input.
- Regex can provide legacy/custom CYOA card presentation.
- Context Saver can remove old CYOA card markup from back-catalogue AI input.

That does **not** make Regex and CYOA one system.

The native CYOA subsystem owns enablement, prompt control, parsing, active-state validation and path selection. Regex only transforms text/presentation around it.

## Guardrails

Future implementation sessions must not:
- merge Regex and CYOA into one menu;
- remove global-versus-chat scope;
- conflate display rules with AI-input rules;
- mutate stored original message text;
- remove preview-before-save;
- throw every technical field into the default view when it can live under Advanced;
- remove import/export or ordering;
- strip out Context Saver / rich-presentation use cases because they are more sophisticated than simple replacements;
- require native CYOA to depend on user-managed Regex rules.
