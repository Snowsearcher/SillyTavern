# SnowBunny Scenario UI Reference

This file records the Scenario visual/interaction baseline from Snow's supplied screenshots plus the original SnowBunny source. The goal is to refine the existing Scenario experience rather than redesign it into a generic settings form.

Primary references:

- Snow's supplied Scenario screenshots from the Fazclaire's chat.
- Original source: `SNOWBUNNY_HANDOFF/source/app/lib/prompts/scenario_screen.dart`.

## Visual baseline

The supplied screenshots are the ground truth for the Scenario editor's overall feel.

Preserve:

- Scenario opens as a focused panel/workspace over the chat rather than looking like a database/settings page.
- Header shows the current chat/story context above the large `Scenario` title, with Back, Help and Save actions.
- Dark translucent SnowBunny surface with soft rounded corners and the current story artwork/background still visible around/behind the panel.
- Large readable typography and generous vertical spacing.
- Prominent outlined `Help clarify Scenario` AI-assist action near the top.
- A clear `Use this Scenario` toggle near the top, not buried in advanced settings.
- Large rounded writing fields.
- Each writing field is vertically resizable by the user. Preserve the visible `Drag to resize` affordance.
- Each field has an expand/fullscreen action for comfortable long-form editing on mobile.
- Scenario is intended to hold natural prose. It should not become a dense form full of tiny controls.

## Frontend integration rule

The screenshots are a **baseline, not a frozen skin**.

The fork must refine Scenario so it matches the final SnowBunny frontend language used everywhere else:

- same panel materials, translucency, borders, radii and shadows as the final chat/drawer/workspace surfaces;
- same typography scale and spacing system;
- same icon family and button treatment;
- same accent/theme behavior, including user-selected appearance settings;
- same animation quality for panel entry, field expansion, fullscreen editing and helper review;
- same touch-target sizing and mobile ergonomics as the rest of the app;
- same visual polish as Characters, Codex, Agents, Memory Maker and other first-class SnowBunny systems.

Do not preserve awkward old styling merely because it appears in the screenshot. Preserve the **layout intent and interaction strengths**, then bring the screen up to the final frontend quality bar.

Scenario should feel like it was designed as part of the new SnowBunny app, not like an old Flutter page embedded inside a newer shell.

## Canonical Scenario fields

Keep the four-field design already present in SnowBunny:

1. **What this story is about** — premise / current setup.
2. **Genre and focus** — what kind of story this is and what it should spend attention on.
3. **For the writer to know** — private/background writer knowledge. This does not automatically become character knowledge.
4. **Important directions** — standing instructions, boundaries, things to respect/avoid/handle in a particular way.

All fields may be left empty. Empty fields should not create filler prompt text.

The AI helper may clarify or draft these fields, but the user remains in control and reviews the result before saving.

## Critical architecture correction for the fork

The old screenshot/source says the Scenario is "shared by this Story's chats" and stores it under `story/<id>/scenario`.

That ownership is obsolete in the new SnowBunny architecture.

**Scenario is chat-specific.**

- Every chat owns its own Scenario.
- A Story does not provide a Scenario default and does not propagate Scenario to its chats.
- Stand-alone chats own Scenario directly and must not require a hidden/fake Story record.
- Moving a chat between Story and stand-alone ownership keeps that chat's Scenario with the chat.
- The UI copy must therefore be updated from Story-wide wording to current-chat wording.

Do not reintroduce broad Story inheritance through Scenario.

## Enable/disable behavior

Preserve the idea behind `Use this Scenario`:

- disabling Scenario must not erase any authored Scenario text;
- enabling it makes the Scenario fields participate in the active prompt path;
- disabling it leaves the saved text intact for later reuse;
- the UI should explain this simply.

Exact compatibility behavior with imported SillyTavern presets can be handled by the prompt/context adapter; the user should not need to understand that machinery.

## AI helper

`Help clarify Scenario` is worth keeping and refining.

Desired behavior:

- opens a focused helper flow rather than silently rewriting fields;
- can inspect the current draft and relevant chat context when allowed;
- proposes clearer/fuller text for the four Scenario sections;
- returns the draft for review;
- never overwrites saved Scenario content without explicit acceptance/save.

## Refinement direction

This screen is already much closer to the desired SnowBunny quality bar than the old Agents screen. Refine rather than flatten it.

Possible polish:

- smoother panel opening/closing and field expand animations;
- more intentional section icons or very subtle accent differences without making the editor noisy;
- better fullscreen editor for long fields;
- cleaner resize handle while preserving obvious discoverability;
- autosave/draft protection can be considered, but explicit Save and unsaved-change protection should remain clear;
- helper result review should feel native and conversational, not like a raw AI response page;
- make the final screen visually coherent with the rest of the SnowBunny frontend rather than preserving old component styling one-for-one.

## Guardrails

Future implementation must not:

- turn Scenario into a Story-level shared/default setting;
- remove the four-field structure;
- replace the large writing fields with cramped text boxes;
- remove user-resizable fields or comfortable fullscreen editing;
- bury the enable switch or AI helper in advanced settings;
- expose internal prompt plumbing to the user;
- silently rewrite user-authored Scenario text;
- treat `For the writer to know` as character knowledge;
- add unrelated current-state tracking here. Current trackers and Memories have separate jobs;
- clone the old Scenario visuals literally if they clash with the refined frontend;
- leave Scenario looking like a legacy screen while the rest of SnowBunny uses the newer visual system.

The supplied screenshots are the interaction/layout baseline. The fork should preserve their focused, readable, polished intent, correct the obsolete Story-wide ownership model, and refine the visuals so Scenario feels fully native to the final SnowBunny frontend.
