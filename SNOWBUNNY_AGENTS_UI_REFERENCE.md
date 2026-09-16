# SnowBunny Agents UI Reference

This file records the intended redesign of SnowBunny's Agents management UI for the `snowbunny-mobile` fork.

The old Agent engine is worth preserving. The old Agent screen is not.

Primary source reference:

- `Snowsearcher/Snowbunny-`
- `SNOWBUNNY_HANDOFF/source/app/lib/agents/agents_screen.dart`
- Agent engine/configuration under `SNOWBUNNY_HANDOFF/source/app/lib/agents/`
- Tracker presentation requirements in `SNOWBUNNY_TRACKER_UI_REFERENCE.md`

## Core direction

The fork should keep the old system's power while replacing its developer-form presentation with a polished mobile-first SnowBunny experience.

The old screen exposed too much implementation machinery at once: generic switch tiles, a large global Run button, raw status text, nested expansion tiles, model text fields, placement/execution jargon, lookup controls, dependency checkboxes, numeric limits and prompt editing all in one long form.

Do **not** recreate that screen with prettier colors. Redesign the experience around the jobs Snow actually performs.

Normal Agent use should feel simple and visual. Advanced/custom Agent work must remain possible without dominating the default path.

## Entry point

Agents remains a current-chat system opened from the **Agents** row in the right drawer.

Opening Agents should enter a dedicated polished Agents surface for the current chat. Do not make the right drawer itself carry the full editor.

## Agents home screen

The home screen should prioritize recognition and current status.

### Header

- Back
- `Agents`
- clear `+ New Agent` action
- overflow for secondary operations such as Import / Export

Do not repeat the old collection of unexplained app-bar icons.

### Agent cards

Each configured Agent is shown as a deliberate visual card rather than a stack of generic settings rows.

A card should communicate at a glance:

- Agent name
- recognizable icon / type
- short human-readable purpose
- On / Off state
- when it updates, if automatic
- where its reader-facing result appears, when visible
- whether it contributes to the next Story Writer generation
- useful error/waiting state only when there actually is one

Examples of human-readable status:

- `Updates after every story reply`
- `Appears below the reply`
- `Helps the next story reply`
- `Header tracker`
- `Background job · every 5 replies`

Avoid exposing raw engine terms such as `sidecar`, `feedback`, `execution`, `depth`, or `placement` on the normal card.

### Card interaction

- tap card → Agent detail/editor
- quick On / Off toggle available without entering the editor
- optional overflow for secondary actions such as Duplicate, Export, Remove
- `Run now` exists when meaningful but is not the visual focus of every card

There should **not** be a giant global `Run enabled agents` control dominating the page. Automatic Agents should normally take care of themselves.

### Current result

The primary reader-facing tracker result still lives in the chat, attached to the Character/Narrator reply that produced it.

The Agents screen may provide a `Current state` / `Open latest result` route for convenience, but it must not replace or demote the rich Story State panel in chat.

## New Agent flow

The normal creation path should be short:

`New Agent → choose a template → create / lightly customize`

Use a visual template picker with large touch targets and a short explanation for each option.

### Default templates

#### Story Tracker

Purpose: maintain the rich current Story State used by Snow and by the next Story Writer generation.

Default output: rich bottom Story State panel attached to the completed reply.

Default behavior: automatic after successful Character/Narrator replies.

#### Time & Place

Purpose: maintain a tight current date/time/place/presence header without scene-setting prose.

Default output: message header tracker.

Default behavior: automatic after successful Character/Narrator replies.

#### Pocket Phone Upkeep

Purpose: background maintenance for established phone/contact/profile continuity.

Default output: hidden/background.

Default behavior: automatic on its configured interval, currently 5 completed replies by default.

#### Custom Agent

Purpose: user-defined task with the full Agent engine available underneath.

Custom Agents may use visible header/top/bottom output or remain hidden depending on their job.

### Secondary creation routes

Keep useful advanced portability without crowding the primary flow:

- Add/copy from another chat where appropriate
- Import Agent file
- imported SillyBunny/upstream templates where compatible

These are secondary actions, not the main `New Agent` experience.

## Agent detail screen

The detail screen should separate ordinary controls from advanced machinery.

### Top / identity

- icon/type
- Agent name
- short purpose/status
- On / Off
- Save is clear and persistent enough for mobile use

### Normal controls

Show only controls that are understandable and commonly useful for that Agent type.

Possible normal controls:

- automatic updating On / Off
- update frequency when frequency is meaningful
- visible result On / Off for custom visible trackers
- display location using plain labels such as `Message header`, `Above reply`, `Below reply`, `Hidden`
- whether the result helps the next Story Writer reply when this is genuinely optional
- current model: `Use chat model` by default with optional override

Template-specific defaults should remove needless configuration. A Story Tracker should not make Snow rebuild its expected behavior from generic switches.

## Story Tracker editor

Story Tracker deserves a purpose-built configuration surface rather than one giant expansion tile inside a generic Agent form.

### Sections

Preserve the existing carefully developed Story Tracker sections:

- Thoughts
- Relationships
- Scene
- Threads
- Secrets
- Conditions
- Inventory
- Offscreen Characters
- GM Notes

Inventory remains off by default.

Present these as clear section rows/cards with their own icon and short explanation. Each section can be enabled/disabled individually.

Do not show every section's full prompt by default.

A secondary `Customize instructions` action may expose the actual section prompt when Snow wants to edit it.

### Prompt editing

Preserve all refined Story Tracker prompts and output rules from the old app.

The default user should never need to touch them for the tracker to work well.

Customizing a section prompt is an intentional advanced authoring action, not ordinary setup.

## Current tracker editing

Current tracker state must be editable, as specified in `SNOWBUNNY_TRACKER_UI_REFERENCE.md`.

The main edit path should be available directly from the latest rich Story State panel in chat.

The Agent detail screen may also provide `Edit current state` as a secondary route.

Editing current state is distinct from editing Agent instructions:

- **Current state** = what is true / being tracked now and what the next Story Writer receives.
- **Agent instructions** = how future tracker updates should be generated.

Never merge those two concepts into one editor.

Preserve generated pre-edit state for undo/audit and keep historical tracker snapshots attached to the replies they describe.

## Advanced controls

The old system's advanced capabilities remain available, but should live behind a clearly labeled Advanced area.

Potential advanced controls include:

- full Agent instructions
- model override
- recent-history window
- output/reply limit
- earlier-history and Memory lookups
- allowed lookup tools
- Agent dependencies / run order
- record vs develop behavior for custom trackers
- imported/upstream execution mode
- exact injection role/depth/position when required for compatibility

Do not expose these merely because the engine has fields for them.

Only show controls that are valid for the current Agent type.

## Status and activity

Translate engine state into useful language.

Examples:

- `Up to date`
- `Waiting for the next reply`
- `Updates every 5 completed replies`
- `Last update failed` with a clear retry/details action
- `Phone conversation in progress · will try again after the next story reply`

Avoid dumping implementation status records into the main card.

For background jobs such as Phone Upkeep, recent activity can have its own readable history/details surface.

## Import / export

Keep Agent import/export support.

Imported Agents should remain safe by default where the old app already behaved conservatively:

- new imported copies begin disabled when appropriate;
- automatic execution / external lookup permissions are not silently enabled;
- user can choose update-existing versus add-copy where stable IDs make that safe;
- imported instructions are reviewable before use.

The UI should explain conflicts in plain language rather than surfacing internal IDs.

## Relationship with tracker presentation

Agent configuration and tracker presentation are two halves of the same feature, but they are not the same screen.

- **Agents UI** manages the engines/jobs.
- **Story State / tracker panels in chat** are the beautiful reader-facing results attached to story replies.

Do not hide reader-facing tracker output inside Agents settings.

Do not turn the rich Story State panel into a small preview merely because Agents has its own management screen.

## Visual quality bar

The Agents area must look like SnowBunny, not default Flutter settings.

Direction:

- deliberate cards and spacing
- recognizable icons
- restrained accent colors by Agent type
- clear status hierarchy
- large mobile touch targets
- smooth sheet/page transitions
- no giant walls of toggles
- no raw field names
- no numeric database IDs
- no endless one-page form

The redesign should feel consistent with the visual Characters, Stories, Codex and right-drawer direction already documented.

## Guardrails

Future implementation sessions must not:

- port the old `agents_screen.dart` layout as the new UI;
- solve the redesign by merely restyling `SwitchListTile` / `ExpansionTile` components;
- require Snow to understand `sidecar`, `feedback`, `depth`, `execution`, or similar internal terms for ordinary use;
- make `Run enabled agents` the center of the experience;
- duplicate the entire rich Story State output inside the management screen;
- hide advanced capability by deleting it from the engine;
- expose all advanced capability in the normal setup path;
- make Story Tracker use the same generic editor as every custom Agent;
- confuse current-state editing with prompt/instruction editing;
- treat Phone Upkeep as a visible tracker when it is a background job;
- remove import/export, dependencies, lookups, custom tasks or other mature engine capabilities merely to simplify the screen.

## Summary rule

**Keep the old Agent engine. Replace the old Agent experience.**

Normal setup should be visual, obvious and fast. Story Tracker and Time & Place should feel like first-class SnowBunny features. Custom/advanced Agents should remain powerful without forcing that complexity onto every user action.
