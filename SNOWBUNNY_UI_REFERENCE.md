# SnowBunny UI Reference Notes

This file records visual/interaction decisions taken from screenshots and UI references while the main architecture is still being settled. It is a companion to `SNOWBUNNY_PLAN.md`, not implementation code.

## Right drawer / Current Chat panel

### Settled top area

- The top of the right drawer is **not** Model.
- Put the current **Persona selector** at the top-right area, using SnowBunny's own proper visual Persona selector rather than Tavo's plain text `User` row.
- Place a **+** button beside the Persona selector. This opens the Character/cast selector and adds Characters to the current chat.
- The Character selector should preserve SnowBunny's intended visual picker: artwork/cards, search/filtering/favorites where useful, and multi-select/add-to-chat behavior.
- **Do not display the active cast as portrait chips, avatars, a Characters row, or another cast summary inside the right drawer.** The right drawer stays uncluttered. Tavo has a separate interaction/presentation for current cast; wait for that reference before designing where active Characters are shown/managed after selection.
- Global Character/Persona management remains in the left Library bottom quick-action row. The right-drawer controls are for choosing what the current chat uses.

### Narrator

Narrator is **not** a separate right-drawer system/settings row.

The original SnowBunny Narrator is also **not merely an ordinary Character card**. In the handoff source it is a dedicated global Narrator resource stored under `settings/narrator`, with its own displayed name, portrait, `Narrator instructions`, and `Voice and style` fields. Prompt assembly uses it as the writer identity specifically when the chat has no selected Character cards.

For the SillyTavern fork, preserve that useful behavior while adapting it to ST's Character-oriented chat model:

- Narrator should appear to the user as a **built-in / stock Character option** for chats whose actual cast lives in Lorebook/Codex Character entries.
- Keep Narrator's dedicated semantics and editor. Do **not** pad it with normal Character fields such as age, appearance, sexuality, etc.
- Preserve the useful authored fields from SnowBunny: displayed name, portrait, Narrator instructions, and Voice and style.
- Treat Narrator as a special built-in fallback/system Character in the adapter layer, rather than flattening it into a generic user-created Character card.
- Faithful fallback behavior is desirable: when a chat has no explicit Character card selected because its cast is supplied through Lorebook/Codex entries, Narrator can serve as the assistant/writer identity.
- If Narrator is exposed in Character selection/library UI, mark it clearly as built-in and keep it editable but protected from accidental deletion. Exact library presentation can be refined later.
- AI serialization should identify it as Narrator rather than pretending it is a normal person card. Exact wrapper syntax remains part of the later wrapper-format decision.

### Settled right-drawer order

After the Persona selector + `+` Add Character top area, the main rows are:

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
- Added Characters / cast
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
- Character/cast addition
- Model
- Preset
- assigned Lorebooks
- Regex
- Agents or Agent sets where selection is the normal action
- other future selectable resources when the same interaction genuinely fits

Do **not** mechanically force every complex system into this pattern. Scenario, Memory, Agents, CYOA and AI Tools may open their own purpose-built screens/sheets where their job is more than simple selection.

## Visual quality notes from the reference

- Favor large rows/cards over tiny controls.
- Use clear spacing and section separators rather than dense ST-style control piles.
- Do not add current-cast chips/avatars to the right drawer merely because the cast needs to be visible somewhere else.
- Bottom sheets should feel deliberate and native on mobile: rounded top corners, strong hierarchy, obvious selected state, smooth slide animation and dimmed background context.
- Selection should be fast enough that changing a Lorebook, Regex resource, Persona, Model, Preset or similar current-chat resource feels like a couple of taps, not configuration work.
- SnowBunny can make the selectors visually richer than Tavo, especially for Characters, Personas and image-bearing resources, while preserving Tavo's speed and simplicity.
