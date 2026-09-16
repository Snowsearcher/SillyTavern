# SnowBunny Preset Implementation Reference

This file records the live phone-first Chat Completion Preset editor on `snowbunny-mobile`. It complements `SNOWBUNNY_PRESET_RESPONSE_REFERENCE.md`.

## Canonical state

SnowBunny does not create a second preset format.

For Chat Completion, SillyTavern's current `oai_settings.prompts`, `oai_settings.prompt_order`, utility-prompt fields, preset selector and preset-management controls remain canonical.

The SnowBunny editor changes those exact objects/controls and lets SillyTavern perform the established persistence/update path.

Imported ST/Fabled prompt objects are not rewritten into a reduced SnowBunny schema. Unknown prompt fields remain on their original objects when a module is edited.

## Quick selector vs full editor

The right-drawer `Preset` row remains a quick per-chat selector.

Its pencil now opens the SnowBunny full editor on Chat Completion APIs. Other backend families continue to fall back to the established ST controls until equivalent native editors are mapped safely.

## Prompt modules

The full editor reads the actual global Prompt Manager order record (`character_id: 100000`).

Each ordered module keeps:

- exact identifier;
- exact order;
- enabled state;
- name;
- role;
- authored content;
- marker/system flags;
- relative vs absolute injection position;
- injection depth/order;
- generation triggers;
- forbid-overrides flag;
- any additional imported fields already carried by the original prompt object.

Modules can be reordered by touch/drag and toggled where ST's own Prompt Manager semantics allow it.

SnowBunny does not invent a replacement prompt order when ST has not initialized one. The editor shows a warning instead, because guessing an order could damage an imported preset.

## Marker/source modules

Prompt Manager markers such as Chat History, Character Description, Character Personality, Scenario, Persona Description, Lore/World Info before/after and Dialogue Examples remain source rows.

They can participate in ordering/toggling according to ST semantics, but SnowBunny does not pretend their dynamic content is ordinary editable prompt prose.

## New/custom modules

SnowBunny can add a normal custom prompt module with a stable UUID. It is appended to the canonical prompt list/order and can then be edited, moved, toggled or deleted.

System prompts are protected from deletion, matching ST behavior. User-authored prompt objects remain deletable.

## Utility prompts

The native editor exposes the established ST utility prompt fields:

- Impersonation;
- Lore/World Info format;
- Scenario format;
- Personality format;
- Group reply nudge;
- New chat;
- New group chat;
- New example chat;
- Continue nudge;
- Replace empty message.

Saving writes through the real ST control and `oai_settings` field. Where ST exposes a default-restore action, SnowBunny invokes that same canonical reset rather than maintaining another copy of defaults.

## Preset management

Import, export, Save as, rename and delete delegate to ST's established preset-management actions. The large prompt/module editing surface is native SnowBunny; small naming/file actions are intentionally reused rather than reimplemented with a second storage path.

Named presets are updated through ST's canonical `update_oai_preset` action after SnowBunny edits. The built-in GUI/Default state remains usable as current settings, while `Save as` is the route to a reusable named preset.

## AI Response separation

`response-config.js` owns global generation/sampling controls such as response/context length, temperature, Top P/K, Min P, penalties, reasoning effort, verbosity and streaming.

`preset-editor.js` owns the selected Chat Completion preset's prompt modules and utility prompts.

The right drawer still owns which preset a chat selects. The Cog/Response surface does not become a second per-chat preset override.

## Guardrails

Do not:

- flatten imported presets into a SnowBunny-only format;
- reorder modules unless the user does so;
- silently enable disabled modules;
- turn source markers into fake authored prose;
- create a second preset persistence stack;
- make Story own Preset selection;
- save API connection/model secrets inside Preset state;
- hide ST provider-specific capability merely because the SnowBunny editor has not mapped it yet.

## Validation status

The SnowBunny static JavaScript check passes with the native Preset editor wired.

The surface has not yet received the next narrow/mobile visual validation pass. Do not call its spacing, drag ergonomics or keyboard behavior visually approved until that pass is performed.
