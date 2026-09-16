# SnowBunny UI Reference Notes

This file records visual/interaction decisions taken from screenshots and UI references while the main architecture is still being settled. It is a companion to `SNOWBUNNY_PLAN.md`, not implementation code.

## Right drawer / Current Chat panel

### Settled top area: Members + Persona

Use the supplied Tavo member-management screenshots as the reference for current-cast handling. Do **not** duplicate the cast as portrait chips in the chat UI or as another generic `Characters` settings row.

At the top of the right drawer:

1. Show a compact **Members (N)** section.
2. Put **Add** on the right side of that section header.
3. Each selected member appears as one clean row with portrait and name.
4. Each member row may expose a small per-member participation/reply control and a remove `×` action. The exact semantics of Tavo's speech-bubble / crossed-bubble control still need to be verified before copying that behavior; do not invent its meaning.
5. Immediately below Members, show the current **Persona** as its own compact selector row.

This is the only right-drawer cast summary. Do not add a second Characters row, cast chips, header avatars, or other redundant member list.

### Add / Select Characters interaction

Tapping **Add** opens a Tavo-style character-selection bottom sheet:

- title such as `Select Characters`;
- Cancel and Apply/OK actions;
- current chat members preselected;
- large portrait + name rows;
- clear circular selected/unselected state;
- multi-select;
- search/filtering/favorites may be added in SnowBunny's richer version without slowing the basic interaction;
- applying returns directly to the Current Chat drawer.

SnowBunny's selector can be prettier and more capable than Tavo's, but the interaction should stay this quick.

Global Character management remains in the left Library bottom quick-action row. This Members section is only for the cast attached to the current chat.

### Narrator

The original SnowBunny Narrator is **not** merely an ordinary Character card. In the handoff source it is a dedicated global Narrator resource stored under `settings/narrator`, with its own displayed name, portrait, `Narrator instructions`, and `Voice and style` fields. Prompt assembly used it as the writer identity when no normal Character card was selected.

The Tavo reference adds an important UX clue: Narrator can be shown and selected as a visible **member** alongside ordinary characters.

Recommended fork translation:

- Keep Narrator as a **protected built-in special identity**, not a fake normal person card.
- Preserve its dedicated authored fields: displayed name, portrait, Narrator instructions, and Voice and style.
- Expose Narrator through the same **Add / Select Characters** sheet so it behaves naturally in the Members UI.
- Allow Narrator to be an explicit current-chat member. Do not make hidden fallback behavior the only way to use it.
- Narrator may coexist with other selected members when a chat needs that arrangement; this is a deliberate adaptation beyond the old SnowBunny fallback-only prompt path.
- Keep Narrator editable but protected from accidental deletion.
- Do not pad Narrator with irrelevant Character fields such as Age, Appearance, Sexuality, etc.
- AI serialization should identify it as Narrator rather than pretending it is a normal person card. Exact wrapper syntax remains part of the later wrapper-format decision.
- Whether Narrator is automatically added to brand-new chats by default is still open; do not assume that behavior yet.

### Settled right-drawer order

After the Members section and Persona row, the main rows are:

1. **Model**
2. **Preset**
3. **Lorebooks**
4. **Scenario**
5. **Regex**
6. **Memory**
7. **Agents**
8. **CYOA**
9. **AI Tools**

There is **no separate Prompts row**. Prompt editing/configuration belongs to Preset.

There is **no separate State / Tracker Summaries row**. Tracker state/output belongs with the Agent/tracker system and/or the places where that state is actually displayed or audited, rather than becoming another right-drawer category.

Bottom utilities such as **Reset Chat**, **Chat Statistics** and **Search in Chat** remain conceptually separate/pinned at the bottom.

### Model row behavior

Model is a fast current-chat selector, not the full global API management screen.

- One tap opens the model selector.
- Show the user's **favorite models first** for fast switching.
- Include search so the user can choose any other model available through the configured API/provider connections.
- Selection applies to the current chat's model choice.
- Full provider/API/key/catalog management remains in the top-menu API workspace.

### Preset row behavior

Preset is the current chat's writing/prompt preset.

- One tap opens the preset selector/manager.
- Preset contains the prompt/module configuration. Do not create a second `Prompts` row.
- Preserve the richer SnowBunny preset editing direction: modules/toggles, editing controls, reorderability where supported, and import/export compatibility.
- The quick row should still make changing the active preset fast; deeper editing can open from the selector/manager.

### Lorebooks row behavior and Story relationship

Lorebooks can be assigned at Story level, but an individual chat may need additional Lorebooks.

Therefore the Current Chat Lorebooks row remains useful even when the Story already has bound Lorebooks.

- Story-bound Lorebooks form the Story's shared/base Lorebook set and are active in every chat in that Story.
- A chat inside that Story may add **additional** Lorebooks for that specific chat.
- **A chat cannot disable a Story-bound Lorebook from the right drawer.** To deactivate/remove one of the Story Lorebooks, the user must change the Story's Lorebook selection from the Story menu.
- The chat Lorebook selector should make Story-bound Lorebooks visibly distinct/read-only while allowing extra chat-specific Lorebooks to be selected or removed.
- The selector must make the effective Lorebooks for the chat understandable without pretending the Story-level bindings do not exist.

### Story-wide data versus chat-specific data

This is now settled and should remain deliberately simple.

A **Story owns only two shared fiction systems**:

1. **Lorebooks** — Story-bound Lorebooks apply across the Story's chats. An individual chat may add extra Lorebooks for itself, but cannot disable the Story-bound set locally.
2. **Memories** — accepted MemoryMaker history belongs to the Story as a whole and is shared across that Story's chats.

A **stand-alone chat** has no shared Story memory pool. Its accepted MemoryMaker memories belong only to that one chat.

Everything else is **chat-dependent**. It is not inherited from the Story, and the Story does not provide defaults for it:

- Persona
- Members / added Characters
- Model
- Preset
- Scenario
- Regex
- Agents / trackers
- CYOA
- AI Tools

Do **not** build a generic `Story default → chat override` system for those features. The Story is not a settings preset for its chats. Its shared continuity is the Story Lorebooks plus the Story-wide Memory collection; the rest belongs to each chat.

This also means the Story browser should not become a settings dashboard for Model, Preset, Persona, Scenario, Regex, Agents, CYOA or AI Tools.

### Tavo selector interaction to preserve

The supplied Tavo screenshots are the interaction reference for quick selection from the right drawer.

The important pattern is:

1. The right drawer shows compact setting/resource rows with the current value on the right and a chevron when opening a selector makes sense.
2. Tapping a row opens a **bottom sheet** over the drawer instead of navigating through deep settings pages.
3. The sheet keeps context visible/dimmed behind it and provides large touch targets.
4. The sheet has a clear title, search when useful, and an **Apply** action when selection should be committed as a group.
5. Selected entries are immediately recognizable through an accent/highlighted state.
6. Editable selected resources can expose a pencil/edit action without turning the selector itself into the editor.
7. Single-select and multi-select are chosen by the resource's actual meaning rather than forcing one behavior everywhere.
8. Closing/applying returns directly to the Current Chat drawer. No deep modal stacks.

### Concrete screenshot examples

**Lorebooks**

- Tap the Lorebooks row in the right drawer.
- A bottom sheet shows the available Lorebooks.
- Story-bound Lorebooks are visibly marked as Story-owned and cannot be toggled off from this chat sheet.
- Additional chat-specific Lorebooks may be selected/deselected.
- Selected Lorebooks are visibly highlighted.
- Search is available.
- `Apply` commits the chat-specific additions.
- A pencil on selected/editable Lorebooks may jump to editing that Lorebook, while the sheet's main job remains assignment/selection.

**Regex**

- Tap the Regex row.
- Open the same style of bottom sheet.
- Show available Regex resources/presets clearly.
- Active selection is visibly highlighted.
- Search and Apply behave consistently with the Lorebooks sheet.
- Editing a Regex resource is a secondary action, not the default result of tapping the row.

### General right-drawer selector rule

Use this Tavo-style quick-sheet interaction for things whose normal job is primarily **selecting or assigning something to the current chat**, for example:

- Persona
- Members / Character addition
- Model
- Preset
- assigned Lorebooks
- Regex
- Agents or Agent sets where selection is the normal action
- other future selectable resources when the same interaction genuinely fits

Do **not** mechanically force every complex system into this pattern. Scenario, Memory, Agents, CYOA and AI Tools may open their own purpose-built screens/sheets where their job is more than simple selection.

## Story selector and Story interior

Use the supplied SnowBunny Story screenshots as the primary visual reference for Story browsing. This is much closer to the intended design than a newly invented generic library screen.

### Story selector / Stories library

Preserve the interaction and information hierarchy shown in the screenshots:

- Header labeled **Stories** with a back action and compact secondary actions.
- Intro/library area may keep the friendly `Your Library` presentation and short explanation rather than looking like a database table.
- **Stand-alone chats** remains a prominent route near the top of the Stories surface.
- Search field for Stories.
- Filter and sort controls.
- Support both **visual grid** and **compact list** browsing. Grid is important because Story cover art is a core recognition/navigation feature, while list mode is useful when the library grows.
- The view-switch icon shown in the Story screenshots is specifically the **visual/compact view toggle**. It switches between large cover-focused cards and the smaller compact list presentation; it is not a people/group/cast control.
- Story cards show recognizable cover art, Story title, chat count and recent/last-updated information.
- Keep a prominent **Create** action.
- Do not expose every chat from every Story here. Opening a Story is how the user reaches its older chats.

### Story interior / Story chat browser

Preserve the old SnowBunny Story interior as the visual baseline:

- Story header with cover art and title.
- Easy **Edit Story details** action for presentation metadata such as title/cover/tags.
- Search specifically within this Story's chats.
- Chat cards with artwork, title, last-message preview, date/time and compact overflow menu.
- Clearly indicate the currently open/selected chat without turning every card into a noisy status panel.
- Prominent **New Chat** action.
- Archived chats remain collected/collapsed at the bottom when present.
- The view-switch control also belongs here where useful, switching the Story's chat browser between a more visual cover/card presentation and a compact list presentation.

The Story interior is primarily a **chat browser**, not a settings dashboard.

### Corrections from the old screenshots for the new fork

Some old SnowBunny controls no longer match the architecture we have now settled:

- The old **Chats / Codex** segmented control should **not** be carried forward as-is. Codex is now a top-menu workspace for the Lorebook(s) bound to the current Story/chat. Do not create a second Story-interior Codex destination.
- Story-wide fiction ownership is only **Lorebooks + Memories**. Old Story-level Characters, Persona, Model, Preset, Agents, Theme, API defaults, etc. are obsolete and must not return through `Story Settings`.
- The Story overflow/menu is the correct place to reach Story-owned configuration. At minimum it can provide presentation management (`Rename, tags & cover` / edit details), Story settings for **Story Lorebooks and Story Memories**, Statistics, Archive and Delete. Export can also live here or in the appropriate Story management surface.
- Exact presentation of Story Lorebooks and Story Memories inside that menu is still open: they may be direct menu entries or live inside a small Story Settings screen. What is fixed is that only those two fiction systems are Story-wide.
- The icon previously misread as a people/group icon is the **view-mode switch**. Preserve that job. Do not repurpose it for Story cast or remove it on the assumption that it represented people.

### Reusable visual / compact view pattern

SnowBunny already used the same basic view switch in other visual libraries, including Characters. Treat this as a reusable browsing pattern rather than a one-off Story control:

- image-heavy resources can offer **Visual / big-cover** mode for quick recognition;
- the same library can offer **Compact / list** mode for denser browsing;
- switching modes changes presentation only, not the underlying resource collection, filters, selection state, or sort order;
- reuse this pattern for Characters, Personas, Lorebooks/Codex and other resource libraries when it genuinely helps;
- remember the user's chosen view per library where practical instead of forcing the same mode every time.

## Visual quality notes from the reference

- Favor large rows/cards over tiny controls.
- Use clear spacing and section separators rather than dense ST-style control piles.
- Show current cast only in the compact Members section; do not duplicate it elsewhere in the drawer or main chat UI.
- Story covers are functional navigation, not decoration. Keep them large enough to recognize in visual mode.
- Preserve the Visual/Compact switch as a recurring SnowBunny library affordance instead of collapsing everything into one list style.
- Bottom sheets should feel deliberate and native on mobile: rounded top corners, strong hierarchy, obvious selected state, smooth slide animation and dimmed background context.
- Selection should be fast enough that changing a Lorebook, Regex resource, Persona, Model, Preset or similar current-chat resource feels like a couple of taps, not configuration work.
- SnowBunny can make the selectors visually richer than Tavo, especially for Characters, Personas and image-bearing resources, while preserving Tavo's speed and simplicity.

## Future-self guardrails

When resuming this project in another chat or implementation session:

- Treat the Tavo screenshots supplied by Snow as the ground truth for right-drawer member UX.
- Treat Snow's Story screenshots as the ground truth for the Story selector/interior visual direction unless Snow deliberately changes them.
- Do **not** misread the Story view-switch icon as a group/people/cast control. It switches between compact and large-cover/visual views, and this pattern is reused in other resource libraries such as Characters.
- Do **not** revert to a `Persona + plus only` header. The settled pattern is **Members (N) + Add**, followed by a separate Persona row.
- Do **not** add cast chips, a duplicate Characters row, or header-avatar clutter elsewhere to compensate. The Members block is the cast surface.
- Do **not** turn Narrator into an ordinary person card just because SillyTavern is Character-oriented. Narrator is a special built-in identity with its own editor and fields, exposed through Members for usability.
- Do **not** invent the meaning of Tavo's per-member speech-bubble / crossed-bubble control. Verify it before implementing an equivalent.
- Do **not** restore the old Story-interior Codex tab. Codex belongs in the top menu in the current design.
- Do **not** restore old broad Story inheritance. Story-level fiction ownership is Story Lorebooks + Story Memories only.
- Keep the distinction between global Character management (left drawer) and current-chat membership (right drawer).
