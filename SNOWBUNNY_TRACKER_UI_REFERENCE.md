# SnowBunny Tracker / Story State UI Reference

This file records the visual and interaction requirements for SnowBunny tracker output. It exists because tracker output is **not** a minor diagnostic widget and must never be reduced to one during the SillyTavern fork.

Primary references:

- Snow's clarification in planning: Purachina's trackers were an important inspiration for the experience.
- Original SnowBunny handoff tracker renderer:
  - `SNOWBUNNY_HANDOFF/source/app/assets/renderer/dist/js/snowbunny_tracker.js`
  - `SNOWBUNNY_HANDOFF/source/app/assets/renderer/dist/css/story_state.css`
  - tracker projection / placement in `SNOWBUNNY_HANDOFF/source/app/lib/chat/chat_screen.dart`
- Agent / Story Tracker prompts and state engine under `SNOWBUNNY_HANDOFF/source/app/lib/agents/`.

## Core correction

Do **not** describe bottom tracker output as a "compact widget", utility chip, debug block, small footer, or minor AI-only feature.

The tracker panel is a deliberately crafted part of the reading experience.

It has two equally important jobs:

1. **Reader-facing:** give Snow an attractive, enjoyable, legible state panel attached to the story reply, with useful information worth reading in its own right.
2. **Writer-facing:** preserve carefully prompted current state so the next Story Writer generation can use it for continuity, characterization, private thoughts, ongoing threads, conditions, secrets, etc.

Neither job is secondary.

## Message attachment

Tracker state belongs visually to the Character/Narrator reply that produced it.

The original renderer already projects saved tracker snapshots by message ID and creates dedicated tracker slots on that message. Keep that model.

Normal placements remain conceptually distinct:

- **Header trackers**: short state such as Time & Place can appear near the message/speaker header.
- **Top trackers**: when a tracker intentionally belongs before the message body.
- **Bottom trackers**: rich panels immediately beneath the story text inside the same message presentation.
- **Hidden/background agents** such as Phone Upkeep: no reader-facing panel.

The bottom tracker panel is the main rich Story State surface. It is not a floating app-global status box and not a generic panel detached from the reply that established it.

## Story State visual baseline

The handoff's `snowbunny_tracker.js` explicitly calls this an adaptation of the user's **Story State — Visual Novel export**. Preserve that visual-novel / Purachina-inspired spirit rather than flattening it into standard Material cards.

The existing Story State surface includes:

- a polished outer **Continuity Menu / Story State** shell;
- collapsible disclosure behavior;
- nested section panels;
- section-specific icons;
- deliberate accent colors for different kinds of state;
- gradients, borders, glow/shadow and layered translucent surfaces;
- readable rich Markdown content;
- remembered disclosure state so opening/closing sections feels stable while reading.

The supplied CSS is intentionally decorative: pink/violet/blue/gold accents, rounded layered panels, subtle gradients and shadows, and distinct treatment for different sections. These are not accidental prototype flourishes to be stripped out.

The fork may refine this visual language so it matches the final SnowBunny theme, but it must stay **beautiful, expressive and pleasant to read**.

## Story Tracker sections

The consolidated Story Tracker keeps the authored sections already developed in SnowBunny:

- Thoughts
- Relationships
- Scene
- Threads
- Secrets
- Conditions
- Inventory (optional / off by default)
- Offscreen Characters
- GM Notes

The renderer should understand these as meaningful sections, not one giant tracker text blob.

Each section may use its own icon/accent treatment and be independently collapsible. Long sections need comfortable typography and spacing because Snow is expected to actually read them.

## Reader experience

The panel should feel like part of the fiction UI, not system telemetry.

Requirements:

- visually attached to the reply that generated it;
- comfortable mobile width and padding;
- clear hierarchy between overall Story State and individual sections;
- pretty section colors/icons without becoming noisy;
- readable long-form tracker prose;
- smooth expand/collapse animation/behavior;
- disclosure state should remain stable while the chat rerenders;
- no tiny controls scattered through the panel;
- do not hide the whole feature behind an Agents settings screen just because the AI also consumes it.

When collapsed, the panel may become concise enough not to dominate scrolling, but it must remain recognizable as the Story State panel rather than becoming an insignificant one-line chip.

## Editing current tracker state

Current tracker output must be editable in the fork.

Editing is a first-class reader/authoring action, not an advanced debug trick.

Recommended behavior:

- the current/latest Story State panel exposes a clean Edit action without cluttering the normal reading view;
- editing opens a comfortable editor using the same logical sections;
- saving changes makes the edited result the authoritative current state used by the next Story Writer generation;
- the next tracker update starts from that edited current state;
- preserve the generated pre-edit version for undo/audit/history rather than silently destroying it;
- View Context should be able to identify when a manually edited tracker revision was supplied to a generation;
- editing tracker state is separate from editing the Agent's prompt/instructions.

Historical tracker panels remain tied to the message/state snapshot they describe. Do not silently rewrite old panels merely because the current tracker was later edited.

## AI usefulness must remain high

The pretty presentation does not replace the tracker engine. Preserve the strong prompts and current-state semantics underneath it.

Tracker output exists specifically to carry forward state the Story Writer could otherwise lose, including private thoughts, relationship state, immediate scene details, unresolved threads, secrets, conditions, selected inventory, offscreen-character whereabouts and standing GM notes.

After a successful Character/Narrator reply:

1. automatic trackers update from the completed story response;
2. the rich panel appears beneath that response when configured as visible/bottom output;
3. the resulting current state becomes available to the next Story Writer request;
4. Snow may read, expand, collapse and edit it before the next generation.

Do not make the reader-facing panel decorative while sending a different hidden tracker state to the AI. The displayed/editable state and the current writer-facing state should be the same canonical revision unless a specific tracker is configured as hidden.

## Purachina reference

Purachina's tracker work is a design inspiration for the **quality bar and role** of this feature: useful story-state tracking presented as something visually enjoyable and worth reading, not merely invisible prompt plumbing.

Do not mechanically clone an external layout without checking the reference available at implementation time. Preserve the principle: tracker presentation is a major crafted story feature.

## Guardrails

Future implementation sessions must not:

- call bottom tracker output a compact/minor widget and design it accordingly;
- move the Story State panel away from the reply it belongs to;
- replace it with plain debug text;
- strip the section colors, icons, visual hierarchy and disclosure behavior merely for implementation convenience;
- treat reader enjoyment as secondary to AI context;
- treat AI usefulness as secondary to appearance;
- maintain two drifting copies where the pretty panel shows one state but the writer receives another;
- hide all tracker results inside Agents settings;
- confuse editing tracker state with editing Agent instructions;
- rewrite historical tracker panels when the present state changes;
- remove message/source binding and history invalidation from tracker snapshots.

## Refinement direction

The correct approach is **refine what SnowBunny already has**:

- preserve the per-message placement model;
- preserve the rich Story State renderer concept;
- preserve the Story Tracker sections and strong prompts;
- improve polish, animation, typography, section editing and mobile ergonomics;
- integrate it cleanly with the final Tavo/SnowBunny message presentation;
- keep the same state useful to Snow and to the next Story Writer generation.

This is a major SnowBunny feature, not ancillary UI.
