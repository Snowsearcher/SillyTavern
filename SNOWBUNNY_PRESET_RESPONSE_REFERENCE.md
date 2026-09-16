# SnowBunny Preset / AI Response Configuration Reference

This file records the settled UX and ownership rules for model-generation controls and prompt presets in the SnowBunny SillyTavern fork.

## Core separation

Keep two concepts distinct:

1. **AI Response Configuration (top Cog)** = SillyTavern's normal model-generation controls, presented in a better mobile UI.
2. **Preset (right drawer)** = the selected writing/prompt preset for the current chat, with a fast selector and direct access to edit its modules.

Do not merge these concepts.

## Top Cog: use SillyTavern's controls

The fork should use SillyTavern's established generation/model-control semantics as the source of truth rather than rebuilding SnowBunny's old custom control stack.

Reason: the old SnowBunny model-control implementation became hard to track and previously had reliability problems where values could fail to save or fail to reach the model request.

### Ownership

Generation/model controls are **global settings**.

- Do not build chat-specific copies/overrides of temperature, Top P, penalties, reply limit, reasoning, streaming, etc.
- Do not build Story-level copies/overrides either.
- There is one ordinary global set of generation controls, using SillyTavern's established behavior.
- Changing a control in the top Cog changes the global setting used where that control applies.

The current-chat **model selector** remains a separate right-drawer concern. This rule is about model-generation controls, not which model is selected for a chat.

### UI direction

Keep the SillyTavern control set and behavior, but redesign the surface for SnowBunny/mobile.

Requirements:

- phone-first layout;
- larger touch targets;
- readable labels and plain-language help;
- good grouping/sections instead of a PC-style control dump;
- sliders/toggles/selectors where they genuinely suit the underlying ST control;
- advanced or provider-specific controls may collapse into secondary sections rather than disappearing;
- reasoning selector should remain easy to find where supported;
- do not invent a second SnowBunny persistence/request pipeline for these controls.

The priority is reliability: the value shown in the UI must be the value SillyTavern actually stores and sends through its generation request path.

## Right-drawer Preset row

The Preset row is for fast current-chat preset selection.

Normal interaction:

- tap Preset row -> open fast mobile preset selector;
- selected preset is clearly highlighted;
- search is available when useful;
- selecting returns directly to the right drawer;
- a small pencil/edit action on the selected preset opens its full editor;
- do not make the quick selector itself into the full editor.

## Full Preset editor

Keep the capabilities from the old SnowBunny/SillyTavern-compatible preset editor, but make the experience purpose-built for phone.

Each prompt/module should be shown as a clear mobile row/card with:

- name;
- enabled/disabled state;
- tap to edit;
- drag/reorder affordance;
- concise indication of special placement/source only where useful.

Support:

- enable/disable individual prompt modules;
- reorder modules;
- edit module text;
- add modules;
- copy/rename/delete presets where applicable;
- import/export;
- preserve warnings/import notes;
- preserve prompt-source rows such as chat history, Character/Persona/Lore/Scenario bindings where compatible.

Technical placement controls such as role, depth, position and action scope remain available for compatibility and advanced editing, but should not dominate the normal editing view.

## Prompt order and compatibility

Snow does not want to manually reason about internal prompt order/placement. SnowBunny should preserve correct behavior automatically.

Rules:

- Imported SillyTavern/Fabled presets retain their authored prompt order and placement semantics.
- Do not silently reorder or rewrite imported prompt text in the name of simplification.
- New SnowBunny presets should start from a sensible known-good order.
- When the user manually drags prompt rows, respect that explicit order.
- Prompt-source placement/depth semantics must follow the underlying SillyTavern-compatible behavior rather than an invented approximation.
- If compatibility requires technical fields, preserve them even when the normal UI hides them under Advanced.

## Utility prompts

Utility prompts stay.

Some extensions and actions depend on them, so they are part of preset compatibility rather than disposable extras.

Preserve per-preset utility/action prompts such as Continue, impersonation/write-as-user helpers, group/reply nudges, formatting helpers and other action-specific prompts supported by the active preset/import format.

They should be reachable from the preset editor in a clean mobile section such as **Utility prompts** or **Action prompts**, with reset-to-default behavior where appropriate.

Utility prompts travel with preset import/export when the source format supports them.

## Mobile quality bar

Do not turn the old PC-oriented editor into a narrow phone column.

The final interface should:

- use SnowBunny's unified visual language;
- avoid rows of tiny icons;
- avoid deep modal stacks;
- make toggling/reordering/editing modules easy with one hand;
- keep long prompt editing comfortable;
- handle keyboard/safe-area correctly;
- keep advanced placement/settings accessible without forcing ordinary users through them.

## Guardrails

Future implementation sessions must not:

- recreate SnowBunny's old custom generation-control pipeline when ST already has a reliable one;
- create chat-specific or Story-specific generation-control overrides;
- confuse the top Cog with the right-drawer Preset selector;
- remove utility prompts;
- rewrite imported preset prose;
- reorder imported prompts without an explicit user action or a format-mandated conversion;
- flatten all advanced placement semantics away and thereby break ST/Fabled preset compatibility;
- expose every placement/depth field in the ordinary phone editing path;
- copy a desktop preset editor 1:1 onto mobile.
