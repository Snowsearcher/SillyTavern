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
- Reuse mature SillyTavern machinery when it already does the job well. Port SnowBunny machinery where it is meaningfully different or better.
- Keep the clean `release` branch for upstream syncing. Product work lives off it.

## Identity and visible ordering

- Never expose database sequence numbers as user-facing identities.
- Resources keep stable opaque internal IDs while visible title, image and sort order are independent.
- Deleting a resource must never make another resource appear to “become” a different one.
- User-facing lists show recognizable names/artwork, never `Lorebook 4`, `Story 7`, etc.

## Main navigation model

### Top menu

The top menu is a clean Novelcrafter-inspired horizontal strip rather than SillyTavern’s stock icon pile.

Settled order:

1. **Round book button** — leaves the current Story/chat workspace and returns to the visual Stories selector. This intentionally duplicates a route available through the left drawer, like Novelcrafter.
2. **Cog / AI Response Configuration** — opens response-generation configuration.
3. **API** — global API/provider/connection/model-catalog management. The right drawer’s Model row is only the fast current-chat model selector.
4. **Codex** — opens the Novelcrafter-style workspace for the Lorebook(s) bound to the current Story/chat.
5. **Appearance / Backgrounds & Themes** — owns backgrounds and useful UI/theme styling controls rather than duplicating those in the right drawer.
6. **Extensions** — extension management/settings. Individual extension actions used while writing remain reachable from the composer/text bar.

Characters and Personas do **not** belong in the top strip. Their global libraries are on the left and current-chat selection belongs on the right.

Additional rules:

- Do not turn the top menu into a dumping ground for every feature.
- It should retract while reading when appropriate so it does not waste vertical space.

### Left drawer = global Library

The left drawer is for global navigation/resources, not current-chat setup.

Main content, top to bottom:

- **Recent Chats** — exactly the three most recently used chats as visual quick-access cards. If a chat belongs to a Story, quietly show that Story identity.
- **Stories** — opens the visual Story selector/browser.
- **Lorebooks** — global Lorebook library, not merely the Lorebooks bound to the current Story.
- **Stand-alone Chats** — only chats that genuinely do not belong to a Story.
- Prominent **Create** action.

Bottom quick-action row, left to right:

1. **Creator assistant** — far-left small button. Creator is an assistant/workflow, not a library resource or normal navigation row.
2. **Characters** — global Character library and editing.
3. **Personas** — global Persona library and editing.
4. **…** — app/settings. This opens the SnowBunny settings area inherited/refined from the app. Do not label it `More`.

API is not duplicated here; API lives in the top strip.

Important rules:

- Do **not** expose every Story chat globally from the left drawer.
- To reach an older chat that belongs to a Story, open that Story and browse its chats there.
- Global Lorebooks belong above Characters because they are broader library-level resources.
- No separate `Switch Story` item is needed if Stories already opens the Story browser and the round book also returns there.

Create sheet resources:

- Story
- Chat
- Lorebook
- Lore Entry
- Character
- Persona

Do not put Creator, Agents, Memories, Regex or other assistants/setup/system objects in the global Create sheet.

Contextual Chat creation direction: while inside a Story, New Chat should default to that Story. Outside a Story, ownership must be explicit rather than silently guessed.

### Right drawer = current chat setup

The right drawer is a Tavo-inspired launchpad for the current chat. It should favor fast selectors and purpose-built sheets over deep settings pages.

#### Top area: Members + Persona

- Show a compact **Members (N)** section first.
- Put **Add** at the right of the Members header.
- Each current member appears as one clean portrait/name row with only the small per-member controls that are actually useful.
- Do not duplicate the cast as chips, a second Characters row, or header-avatar clutter elsewhere.
- Tapping **Add** opens the visual multi-select Character picker with current members already selected.
- **Persona** is a separate compact selector row immediately below Members.
- Narrator appears through the Members flow as a protected built-in special identity, but keeps its dedicated Narrator editor/semantics rather than becoming a fake ordinary person card.

#### Settled row order

After Members + Persona:

1. **Model**
2. **Preset**
3. **Lorebooks**
4. **Scenario**
5. **Regex**
6. **Memory**
7. **Agents**
8. **CYOA**
9. **AI Tools**

Pinned/separate bottom utilities:

- Reset Chat
- Chat Statistics
- Search in Chat

There is **no separate Prompts row**. Preset and prompt/module configuration are the same area.

There is **no State / Tracker Summaries row**. Tracker state belongs with Agents and with the places where tracker output is actually displayed/audited.

Appearance/backgrounds/themes stay out of the right drawer because the top Appearance workspace owns that job.

#### Model row

- One tap opens a fast model selector.
- Show favorite models first.
- Include search for any other model available through configured provider/API connections.
- This chooses the model for the current chat.
- Full API/provider/key/catalog management stays in the top API workspace.

#### Preset row

- Preset is the current writing/prompt preset.
- It owns the prompt/module configuration, toggles, editing and reordering behavior.
- The row makes switching presets fast; deeper editing opens from its selector/manager.

#### Lorebooks row

- A Story can have bound Lorebooks.
- A chat inside that Story may add **additional Lorebooks** for itself.
- Story-bound Lorebooks are mandatory for chats in that Story and cannot be disabled locally from the right drawer.
- To remove/deactivate a Story-bound Lorebook, change the Story's Lorebook selection in Story Settings.
- The right-drawer Lorebooks row manages the effective set for the current chat while clearly distinguishing Story-bound read-only books from chat-added books.

#### Tavo-style selector behavior

For rows whose normal job is selection/assignment, use the supplied Tavo screenshots as the interaction reference:

- tap row → bottom sheet;
- large touch targets;
- current selections visibly highlighted;
- search where useful;
- `Apply` for grouped/multi-selection;
- optional pencil/edit shortcut for editable resources;
- return directly to the right drawer after applying;
- no deep modal stacks.

SnowBunny can make these sheets richer than Tavo, especially for Characters, Personas and image-bearing resources, without sacrificing speed.

## Story-level data versus chat-level data

This is settled and intentionally narrow.

A **Story owns only two shared fiction systems**:

1. **Lorebooks** — Story bindings form the mandatory/shared Lorebook set for every chat in the Story. A chat may add extra Lorebooks, but cannot disable Story-bound ones locally.
2. **Memories** — accepted MemoryMaker history belongs to the Story as a whole and is shared across that Story’s chats.

A **stand-alone chat** has no Story memory pool. Its accepted MemoryMaker memories belong only to that one chat.

Everything else is **chat-dependent**. It is not inherited from the Story and the Story does not provide defaults for it:

- Persona
- Members / added Characters
- Model
- Preset
- Scenario
- Regex
- Agents
- CYOA
- AI Tools

Do **not** build a generic `Story default → chat override` system for those features. The Story is not a settings preset for its chats. Its shared continuity is the Story Lorebooks plus the Story-wide Memory collection; the rest belongs to each chat.

This is an underlying data rule, not another menu section.

## Stories

### Story selector

- Stories are browsable visual homes for related chats, not invisible ownership records.
- Use the supplied SnowBunny Story screenshots as the visual baseline.
- A Story needs strong user-facing representation: cover artwork, title, chat count and recent/last-updated information.
- **Stand-alone Chats** remains a prominent route near the top of the Stories surface.
- Include Story search plus filter/sort controls.
- Keep both **Visual / big-cover** and **Compact / list** browsing modes. The existing view-switch icon is for this purpose.
- Story cover art is functional navigation, not decoration.
- The left drawer still gives quick access only to the three most recent chats. Older Story chats are intentionally reached by opening the Story.

### Story interior / chat browser

- Opening a Story enters its own browsable chat space.
- Preserve the image-forward Story header with title/cover and an easy Edit Story Details action.
- Search within the Story's chats.
- Chat cards show artwork, title, last-message preview and date/time without unnecessary status noise.
- Keep a prominent **New Chat** action.
- Archived chats stay collected/collapsed at the bottom.
- Keep the Visual/Compact switch for the Story chat browser where useful.
- Do **not** restore the old Story-interior `Chats / Codex` tab. Codex now belongs in the top menu.

The Story interior is primarily a **chat browser**, not a settings dashboard.

### Story Settings

`Story Settings` has three concrete jobs:

1. **Assign Story Lorebooks**
   - choose/remove the Lorebooks shared across every chat in the Story;
   - this is where a Story-bound Lorebook is deactivated.
2. **Story-wide Memories**
   - inspect/manage the accepted MemoryMaker history owned by the Story;
   - these memories are available across chats in that Story.
3. **Manage Story chats / membership**
   - add eligible chats into the Story;
   - let/remove a chat from the Story;
   - support converting a Story chat into a **stand-alone chat** when needed.

Do not put Model, Preset, Persona, Members, Scenario, Regex, Agents, CYOA, AI Tools, Appearance or API defaults in Story Settings.

#### Detaching a Story chat: continuity fork

Turning a Story chat into a stand-alone chat is a **continuity fork**, not a destructive move.

- The original Story keeps its Story-wide Memories unchanged. A memory remains part of that Story's history even if the chat that originally supplied its evidence later leaves. This matches the old SnowBunny memory design, which already allowed accepted Story memories to outlive a removed source chat.
- At the moment of detachment, the new stand-alone chat receives a **private snapshot copy of the Story's current accepted Memory pool**. The chat therefore remembers the shared continuity it actually knew before leaving, including useful history that may have originated in sibling chats.
- The snapshot is independent after the fork. Future Story-memory edits do not change the stand-alone copy, and future stand-alone memory edits do not change the Story.
- Copied memories receive stand-alone-local IDs plus lineage metadata such as the source Story, source memory ID and source memory version. This lets SnowBunny recognize an unchanged fork later without treating the two pools as one mutable record.
- Provenance that points to the detached chat's own messages may continue to use normal source-fingerprint validation. Provenance that points to other chats in the old Story becomes **frozen historical origin** in the stand-alone copy so later edits to sibling Story chats cannot silently invalidate or mutate the detached branch.
- The chat also keeps the same effective Lorebook context it had at detachment: the Story-bound Lorebooks are converted into ordinary chat-owned Lorebook assignments and unioned with any Lorebooks that were already chat-specific. Detaching a chat must not suddenly make its world knowledge disappear.
- The confirmation UI should explain the result plainly: the chat keeps a private copy of the current Story lore/memory continuity; the Story keeps its own copies; the two stop syncing after the move.

#### Adding a stand-alone chat to a Story

Joining a Story is intentionally more conservative because it can introduce history into a shared memory pool.

- The destination Story's Memory pool becomes the active shared memory source for the joined chat.
- Do **not** silently dump the stand-alone chat's private Memories into the Story.
- If the chat has local Memories, convert them into a **reviewed MemoryMaker import/reconciliation batch** for the destination Story. MemoryMaker may propose create/edit/merge changes so duplicates and connected events are reconciled instead of copied blindly.
- Import/reconciliation must not silently delete destination Story memories. Destructive changes require the normal explicit MemoryMaker review.
- A forked memory whose lineage shows that it is an unchanged copy of a memory already present in the same Story is skipped automatically rather than proposed again.
- Local memories that are not accepted into the Story remain archived with the chat as inactive migration history. They are not fed to generation while the chat belongs to the Story, but they remain available for export/recovery or for a later detach.
- Moving a chat directly from Story A to Story B follows the same model: first create the independent continuity snapshot from Story A, then join Story B and reconcile that snapshot through reviewed import. Never silently merge two Story histories.

The chat itself is never recreated during these moves. Its message history, title/artwork, Persona, Members, Model, Preset, Scenario, Regex, Agents, CYOA, AI Tools and other chat-owned data stay attached to the chat.

### Story overflow / management

The Story overflow/menu may include:

- Rename, tags & cover / Edit Story Details
- Story Settings
- Statistics
- Export
- Archive Story
- Delete Story

Story Settings should stay narrow and explicit rather than becoming a generic project-settings dump.

### Reusable Visual / Compact library pattern

Keep the same browsing-mode switch in other image-heavy libraries when useful, including Characters, Personas and Lorebooks/Codex:

- Visual mode emphasizes artwork/recognition.
- Compact mode emphasizes denser scanning.
- Switching view changes presentation only, not the underlying collection, filters, sort order or selection.
- Remember the user's chosen view per library where practical.

## Lorebooks / Codex

**Codex and Lorebook are one and the same system.** Do not design them as separate stores or duplicate concepts.

There are three access contexts for the same underlying Lorebook data:

1. **Global Lorebooks in the left Library** — manage the whole collection.
2. **Assigned/bound Lorebooks in the right drawer** — manage what the current chat effectively uses, including mandatory Story bindings plus chat additions.
3. **Codex in the top menu** — the Novelcrafter-style workspace for seeing and editing the Lorebook(s) bound to the current Story/chat.

Codex is the polished working surface: visual cards, images, entry types, previews, search, grouping, good editing, and Visual/Compact views where useful.

Do not reduce SnowBunny Lorebooks to SillyTavern World Info. ST World Info may be an import/export compatibility source, but SnowBunny’s Lorebook/Codex data model and retrieval behavior remain their own system.

## Characters and Personas

- Keep SillyTavern compatibility underneath where practical rather than inventing duplicate copies of the same character/persona.
- Build SnowBunny’s visual selector, profile/view and editor on top.
- Selectors should be image-forward, readable and mobile-first: large artwork/cards, search, filters, favorites and good selection UX.
- Editors keep SnowBunny’s structured/freeform authoring modes and custom fields.
- A Character/Persona is not merely one giant description blob. Structured fields are canonical authored data.
- Global browse/edit belongs in the left Library; current-chat membership/Persona selection belongs in the right drawer.
- Reuse the Visual/Compact library switch where useful.

### Built-in Narrator

Narrator remains a special built-in identity rather than a generic user-created Character card.

- Preserve its dedicated authored fields: displayed name, portrait, Narrator instructions, and Voice and style.
- Expose it through the normal Members/Add selector so it is easy to use in chats where the real cast lives in Lorebook/Codex Character entries.
- It may coexist with ordinary selected Members when a chat needs that arrangement.
- Keep it editable but protected from accidental deletion.
- Do not pad it with irrelevant ordinary Character fields such as Age, Appearance or Sexuality.
- AI serialization should identify it as Narrator; exact wrapper syntax is still to be frozen.

## Structured authoring and AI-facing wrappers

This is a core requirement, not just an editor preference.

Characters, Personas and Character-type Lorebook entries can contain fields such as Age, Race/Species, Sex, Height, Face, Eyes, Hair, Body/Build, Notable Features, Visual Impression, Sexual Features, Clothing Style, Personality, Sexuality, Likes, Dislikes, Speech, Voice Lines, Skills, Background and custom fields.

The same structured data has different presentations:

- **Snow sees:** the polished structured/freeform editor and visual card.
- **SillyTavern sees:** a compatible Character/Persona representation where applicable.
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
- Linked representations of the same authored Character must not be injected twice as conflicting full cards.
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

- Per-Lorebook keyword or meaning/vector retrieval.
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
- For Story-bound chats, accepted Memories belong to the **Story-wide Memory collection** and are available across that Story’s chats.
- For a stand-alone chat, accepted Memories belong only to that chat.
- Detaching a Story chat forks the current Story Memory pool into a private stand-alone snapshot while leaving the Story pool unchanged; the two diverge afterward.
- Joining a Story never silently merges private chat memories into shared Story memory. Reconcile them through reviewed MemoryMaker proposals, using lineage to skip unchanged memories that already exist in the destination Story.
- Support reviewed create/edit/merge/delete proposals and source validation.
- Editing old history must not leave stale memories silently treated as current truth.

## Scenario

- Preserve the four-field concept: premise, focus, writer-only knowledge, important directions.
- Helper remains optional.
- **Scenario is chat-dependent.** Do not make it a Story-level default or inherited Story setting.
- Stand-alone chats should not require hidden fake Stories merely to own their Scenario.

## View Context

- Keep it as a first-class per-reply historical receipt/audit view.
- It should explain what that exact reply received, including model/preset/settings, final input, Lorebook retrieval, memories, trackers, helper calls, attachments and fitting/omission decisions where available.
- Later settings changes must not rewrite an old reply’s receipt.

## Main mobile UI quality bar

The target is not `SillyTavern but usable on a phone.` It is the polished SnowBunny/Tavo experience.

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
- `Keep in Gallery` creates an independent persistent copy that can survive deletion of the originating chat.
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
- Exact left-drawer visual details and Create sheet behavior; placement of the bottom quick-action row is settled as Creator → Characters → Personas → `…` Settings.
- Right-drawer order and Members/Persona structure are settled; exact per-row sheet/editor polish can still be refined.
- Story selector/interior direction, Visual/Compact switch, Story Settings responsibilities, and Story↔stand-alone continuity-transfer policy are settled; exact final spacing/card polish can still be refined.
- Exact Codex workspace behavior when one versus several Lorebooks are bound.
- Final structured-data schema and exact AI wrapper syntax.
- Final mapping from SnowBunny structured Character/Persona data to standard SillyTavern fields.
- Context Broker ordering, deduplication and fitting rules.
- Storage location/format for SnowBunny-owned metadata and resources inside the SillyTavern fork.
- Upstream-update workflow details and direct-core-change budget.
- Testing plan, migrations and Android launcher validation after the design is frozen.
