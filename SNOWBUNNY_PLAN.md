# SnowBunny / SillyTavern Fork — Planning Source of Truth

This document records decisions Snow and ChatGPT have actually settled before implementation. It exists so the project does not depend on chat memory. Update it whenever a design decision is confirmed or corrected.

## Planning rules

- Do not resume substantial implementation until the architecture and navigation are planned end to end.
- Do not call work phases “milestones.”
- Do not accept a lesser mobile experience merely because something technically works.
- The current `snowbunny-mobile` branch contains only a small experimental tap-message hook. Treat it as disposable until the plan is frozen.
- Keep `release` clean as the upstream SillyTavern base.

## Product goal

Fork the current stable SillyTavern release and turn it into SnowBunny: SillyTavern’s mature engine, compatibility and ecosystem underneath, with SnowBunny’s refined mobile-first interface and custom fiction systems on top.

Target quality is the polished SnowBunny/Tavo direction already discussed: smooth animated drawers, clean reading space, mobile-first controls, visual libraries, strong touch/keyboard behavior, rich cards/images, and no exposed implementation clutter.

## Core architecture direction

- Prefer a thin set of direct SillyTavern core changes plus a well-isolated SnowBunny layer instead of scattering custom logic through unrelated upstream files.
- Use adapters around SillyTavern chat, messages, characters, personas, models/API, presets, attachments, extensions, regex, generation and metadata so SnowBunny screens do not depend on random globals or DOM details everywhere.
- Keep a record of every upstream SillyTavern file modified directly and why.
- Reuse mature SillyTavern machinery where it already does the job well. Port SnowBunny machinery where it is meaningfully different or better.
- Keep the clean `release` branch for upstream syncing. Product work lives off it.

## Identity and visible ordering

- Never expose database sequence numbers as user-facing identities.
- Resources keep stable opaque internal IDs while visible title, image and sort order are independent.
- Deleting a resource must never make another resource appear to “become” a different one.
- User-facing lists show recognizable names/artwork, never `Lorebook 4`, `Story 7`, etc.

## Main navigation model

### Top menu

The top menu is a clean Novelcrafter-inspired horizontal strip. It reorganizes useful top-level SillyTavern destinations instead of reproducing the stock icon pile.

Settled order:

1. **Round book button** — leaves the current Story/chat workspace and returns to the visual Stories selector. This intentionally duplicates a route available through the left drawer, like Novelcrafter.
2. **Cog / AI Response Configuration** — opens the response-generation configuration. Keep the cog metaphor rather than replacing it with a vague “Generation” label.
3. **API** — global API/provider/connection/model-catalog management. This belongs up top rather than in the left Library. The right drawer’s Model row remains the fast current-chat model selector; that is not the same job.
4. **Codex** — opens the Novelcrafter-style workspace for the lorebook(s) bound to the current Story/chat.
5. **Appearance / Backgrounds & Themes** — top-level appearance workspace. It may combine the useful parts of SillyTavern’s Backgrounds and UI-theme/styling surfaces into one SnowBunny presentation workspace.
6. **Extensions** — extension management/settings. Individual extension actions that belong during writing remain reachable from the composer/text bar.

Characters and Personas do **not** belong in the top strip. Their global libraries are on the left and their current-chat selection belongs on the right.

Additional rules:

- Do not turn the top menu into a dumping ground for every SnowBunny feature.
- The top menu should retract while reading when appropriate so it does not waste vertical space.

### Left drawer = global Library

This is global navigation/resources, not current-chat setup.

- **Recent Chats** at the top: exactly the three most recently used chats as visual quick-access cards. If a recent chat belongs to a Story, quietly show the Story identity so its origin is obvious.
- **Stories**: opens the visual Story selector/browser.
- **Lorebooks**: global lorebook library. This is the whole collection, not only what the current Story uses.
- **Stand-alone Chats**: only chats that genuinely do not belong to a Story.
- Prominent **Create** action.
- Lower/global resources: **Characters**, **Personas**, **Creator**, **More**.
- API is not duplicated here; API lives in the top strip.

Important rules:

- Do **not** expose every Story chat globally from the left drawer.
- To reach an older chat that belongs to a Story, open that Story and browse its chats there.
- Global Lorebooks belong above Characters because they are broader library-level resources.
- No separate “Switch Story” item is needed if Stories already opens the Story browser and the round book also returns there.

Create sheet resources:

- Story
- Chat
- Lorebook
- Lore Entry
- Character
- Persona

Do not put Agents, Memories, Regex or other setup/system objects in the global Create sheet.

Contextual Chat creation direction: while inside a Story, New Chat should default to that Story. Outside a Story, ownership must be explicit rather than silently guessed.

### Right drawer = current chat / Story setup

This is where the current chat’s active setup lives.

- Model remains at the top.
- Assigned/bound Lorebooks belong above Characters because they are broader context.
- Characters / cast.
- Persona.
- Preset / prompts.
- Memory.
- Regex.
- Agents / trackers.
- AI tools.
- CYOAs.
- Scenario.
- Preserve bottom utilities such as Reset Chat, Chat Statistics and Search in Chat.
- Sections below Model remain reorderable where appropriate.

Appearance / backgrounds / themes do **not** need a duplicate right-drawer entry because the top Appearance workspace owns that job.

Do not move Story setup into the Story browser itself. Current Story/chat setup belongs here.

## Stories

- Stories are browsable visual homes for related chats, not just invisible ownership records.
- A Story needs strong user-facing representation: cover artwork, title and easy visual recognition.
- Opening a Story is how the user browses all chats that belong to it.
- Story chats should be visual/easy on the eyes, using artwork/cards rather than anonymous numbered rows.
- Archived chats should be collapsible/kept out of the normal path.
- Search/tags should be available if useful for a large Story.
- The left drawer gives quick access only to the three most recent chats. Older Story chats are intentionally reached through the Story.
- Stand-alone chats remain separate from Story chats.
- Story setup itself stays in the right drawer, not on the Story browsing page.

Open design item: exact Story card/chat-card layout and what lightweight metadata is shown on the Story page.

## Lorebooks / Codex

**Codex and Lorebook are one and the same system.** Do not design them as separate stores or duplicate concepts.

There are three access contexts for the same underlying Lorebook data:

1. **Global Lorebooks in the left Library** — manage the whole collection.
2. **Assigned/bound Lorebooks in the right drawer** — choose which lorebooks the current Story/chat uses.
3. **Codex in the top menu** — the Novelcrafter-style workspace for seeing and editing the lorebook(s) bound to the current Story/chat.

Codex is the nice working surface: visual cards, images, entry types, previews, search, suitable grouping, good editing, and Visual/Compact style views where useful.

Do not reduce SnowBunny Lorebooks to SillyTavern World Info. ST World Info may be an import/export compatibility source, but SnowBunny’s Lorebook/Codex data model and retrieval behavior remain their own system.

## Characters and Personas

- Keep SillyTavern compatibility underneath where practical rather than inventing duplicate copies of the same character/persona.
- Build SnowBunny’s visual selector, profile/view and editor on top.
- Selectors should be image-forward, readable and mobile-first: large artwork/cards, search, filters, favorites, good selection UX.
- Editors keep SnowBunny’s structured/freeform authoring modes and custom fields.
- A character/persona is not merely one giant description blob. Structured fields are canonical authored data.
- Global browse/edit belongs in the left Library; selection for the current Story/chat belongs in the right drawer.

## Structured authoring and AI-facing wrappers

This is a core requirement, not just an editor preference.

Characters, Personas and Character-type Lorebook entries can contain fields such as Age, Race/Species, Sex, Height, Face, Eyes, Hair, Body/Build, Notable Features, Visual Impression, Sexual Features, Clothing Style, Personality, Sexuality, Likes, Dislikes, Speech, Voice Lines, Skills, Background and custom fields.

The same structured data has different presentations:

- **Snow sees:** the polished structured/freeform editor and visual card.
- **SillyTavern sees:** a compatible character/persona representation where applicable.
- **The AI sees:** a deterministic, strongly bounded serialized block.

Directional wrapper examples:

```text
<character name="Ruby Rose">
Age: 18
Height: 1.57 m
Personality:
...
Sexuality:
...
</character>
```

```text
<persona name="Gray Wright" role="user">
...
</persona>
```

```text
<codex-character name="Ruby Rose" lorebook="RWBY">
...
</codex-character>
```

```text
<location name="Beacon Academy" lorebook="RWBY">
Concept:
...
Visual:
...
Layout:
...
</location>
```

Wrapper syntax is not yet frozen, but the requirements are settled:

- Strong begin/end boundaries.
- Explicit entity type and identity.
- Stable field order.
- Custom fields preserved.
- No collision with SillyTavern `{{...}}` macros.
- No internal database IDs shown to the AI unless there is a genuine technical reason.
- Linked representations of the same authored character must not be injected twice as conflicting full cards.
- Never infer that two entities are the same only because they share a name.

The SnowBunny Authoring Guide must be updated after the final schema/wrapper format is frozen so import/export instructions match the real format.

## Import / export direction

- Preserve full-fidelity SnowBunny import/export for structured fields, custom fields, aliases, tags, images/references, type information and links.
- Maintain import compatibility with the existing SnowBunny package v1 so existing authored material is not stranded.
- Provide SillyTavern-compatible import/export adapters where practical.
- Preserve conflict choices such as Keep Both / Replace Existing / Skip / Rename.
- Approved authored prose must not be silently rewritten during format conversion.

## Context architecture

Custom systems should not all independently elbow their way into the writer prompt.

Use one SnowBunny context-composition layer to assemble clearly separated responsibilities:

- Preset / writing instruction.
- Character and Persona material.
- Scenario / premise.
- Lorebook/Codex retrieval.
- Historical MemoryMaker memories.
- Current-state Agents/trackers.
- Pocket Phone continuity.
- Temporary guidance / Guided Generations / CYOA as appropriate.

Storymaker/main writer owns the actual scene. Supporting systems supply their own category of context without dictating unrelated jobs.

Exact wrapper/order/token-fitting rules are still to be designed before implementation.

## Lore retrieval direction

Preserve SnowBunny’s custom retrieval behavior rather than substituting stock ST vectors:

- Per-lorebook keyword or meaning/vector retrieval.
- Recent-story semantic query window.
- Local embedding cache.
- Exact name/alias rescue alongside semantic ranking.
- Oversized-entry passage splitting without modifying authored text.
- Ranked/limited selection.
- Supporting current tracker/phone context only where explicitly permitted.

Exact implementation against SillyTavern is still to be designed.

## Agents / trackers

- Keep the powerful engine; hide routine machinery.
- Normal creation should be approximately: Agents → New Agent → select a premade template → done.
- Premade Agents carry refined prompts/defaults automatically.
- Advanced controls remain available afterward for custom work.
- Story Tracker, Time and Place and Pocket Phone upkeep are important premade cases already present in the handoff.
- History edits/deletes/regeneration must invalidate stale derived tracker state automatically rather than asking the user to babysit it.

## MemoryMaker

- Preserve the custom reviewed-memory philosophy rather than replacing it with a stock summarizer.
- Memories are historical events, separate from current trackers.
- Support reviewed create/edit/merge/delete proposals and source validation.
- Editing old history must not leave stale memories silently treated as current truth.

## Scenario

- Preserve the four-field concept: premise, focus, writer-only knowledge, important directions.
- Helper remains optional.
- Scope/ownership must follow the final Story vs standalone-chat model rather than inventing hidden fake Stories just to own data.

## View Context

- Keep it as a first-class per-reply historical receipt/audit view.
- It should explain what that exact reply received, including model/preset/settings, final input, lore retrieval, memories, trackers, helper calls, attachments and fitting/omission decisions where available.
- Later settings changes must not rewrite an old reply’s receipt.

## Main mobile UI quality bar

The target is not “SillyTavern but usable on a phone.” It is the polished SnowBunny/Tavo experience.

Preserve/recreate:

- Story-first reading space.
- Smooth animated left/right drawers and overlays.
- Good swipe/touch behavior.
- Message actions appearing at the tapped message rather than forcing scrolling to tiny controls.
- Separate latest-response Retry/Continue treatment.
- Distinct user-message presentation.
- Speaker presentation and avatar behavior consistent with the approved SnowBunny direction.
- Composer remains based on the useful SillyTavern text-bar concept, visually integrated into the new shell.
- Installed extension actions remain reachable from the composer/text bar rather than duplicated around the app.
- The large `+` in the composer is for attachments/media, not the extensions list.
- Keyboard, safe-area, portrait/landscape and long-message behavior must be intentionally designed.

## Attachments / galleries

- Reuse mature SillyTavern attachment handling where possible.
- Keep SnowBunny’s distinction between chat-owned attachments and a global Saved Gallery.
- “Keep in gallery” creates an independent persistent copy that can survive deletion of the originating chat.
- Pocket Phone/story artwork should not be accidentally mixed into ordinary saved story photographs.

## CYOA / Regex / rich presentation

- CYOA remains a dedicated optional system with source-bound cards; unchosen paths are not history.
- Display Regex and AI-input filtering are separate concerns.
- Context Saver / rich rendering behavior must not silently destroy or alter canonical authored prose.
- Reuse SillyTavern Regex machinery where useful without losing SnowBunny-specific behavior.

## Pocket Phone

- Keep as a dedicated SnowBunny feature, not a generic chat gimmick.
- Same fictional people across Story/Codex/phone identities where linked.
- Contacts require story evidence.
- Browsing the UI does not advance fictional time.
- Phone messages/social/media/upkeep each retain their own responsibility.
- Integrate through the shared context/source-validity design rather than creating a separate competing prompt pipeline.

## Extension strategy

- Keep SillyTavern’s extension ecosystem and composer integration where possible.
- Extensions have a top-level management/settings destination.
- Do not duplicate every extension in drawers/top navigation.
- Quick actions for installed extensions remain in the composer/text bar where appropriate.
- Guided Generations should prefer the real SillyTavern extension/behavior rather than porting SnowBunny’s weaker imitation, with SnowBunny providing the better mobile access/UI.

## History/source validity

Preserve the useful SnowBunny idea that derived state must know the exact story history it came from.

When a message is edited, deleted, hidden/shown, regenerated or switched to another variant, dependent derived state must be able to become stale automatically.

Direction: use stable SnowBunny message identity plus source fingerprints/chain validation, rather than trusting only mutable SillyTavern array positions.

Exact ST integration is still to be designed.

## Still open / to settle before coding resumes

- Exact icons/labels and visual treatment of the now-set top-menu order: Book → Cog → API → Codex → Appearance → Extensions.
- Exact left-drawer visual details and Create sheet behavior.
- Exact right-drawer ordering and Story-vs-chat inheritance presentation.
- Exact Story browsing/card layout.
- Exact Codex workspace behavior when one vs several lorebooks are bound.
- Final Story ownership/inheritance model, especially truly standalone chats versus Story-bound chats.
- Final structured-data schema and exact AI wrapper syntax.
- Final mapping from SnowBunny structured Character/Persona data to standard SillyTavern fields.
- Context Broker ordering, deduplication and fitting rules.
- Storage location/format for SnowBunny-owned metadata and resources inside the SillyTavern fork.
- Upstream-update workflow details and direct-core-change budget.
- Testing plan, migrations and Android launcher validation after the design is frozen.
