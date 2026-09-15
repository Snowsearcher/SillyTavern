# SnowBunny UI Reference Notes

This file records visual/interaction decisions taken from screenshots and UI references while the main architecture is still being settled. It is a companion to `SNOWBUNNY_PLAN.md`, not implementation code.

## Right drawer / Current Chat panel

### Settled top area

- The top of the right drawer is **not** Model.
- Put the current **Persona selector** at the top-right area, using SnowBunny's own proper visual Persona selector rather than Tavo's plain text `User` row.
- Place a **+** button beside the Persona selector. This opens the Character/cast selector and adds Characters to the current chat.
- The Character selector should preserve SnowBunny's intended visual picker: artwork/cards, search/filtering/favorites where useful, and multi-select/add-to-chat behavior.
- Global Character/Persona management remains in the left Library bottom quick-action row. The right-drawer controls are for choosing what the current Story/chat uses.

### Narrator

Narrator is **not** a separate right-drawer system/settings row.

Narrator is intended to be a **stock Character** that can be used for chats where the actual cast already lives in Lorebook/Codex Character entries. It gives the chat a neutral assistant/speaking identity without requiring one of the lorebook characters to be the primary SillyTavern Character.

Direction:

- Treat Narrator through the Character/cast architecture rather than inventing a separate narrator subsystem.
- Make Narrator available from the normal Character-add flow.
- Keep its authored card minimal and neutral so it does not compete with the Lorebook characters it is narrating.
- Exact visibility/default behavior of the stock Narrator in the global Character library is still to be settled.

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

- Story-bound Lorebooks form the Story's shared/base Lorebook set.
- A chat inside that Story may add **additional** Lorebooks for that specific chat.
- The selector must make the effective Lorebooks for the chat understandable without pretending the Story-level bindings do not exist.
- This is the one Story-to-chat inheritance/addition behavior that is currently confirmed.

### What "Story inheritance versus chat overrides" means

This phrase is only shorthand for a data-ownership question: when a Story contains several chats, does a setting chosen on the Story automatically become the default/shared value for those chats, and can an individual chat then change or add to it?

Do **not** assume that every right-drawer setting works that way.

Current status:

- **Lorebooks:** confirmed. A Story can bind Lorebooks and a chat can add extra Lorebooks on top.
- **Model:** not yet defined as inherited from Story.
- **Preset:** not yet defined as inherited from Story.
- **Persona:** not yet defined as inherited from Story.
- **Scenario:** ownership/relationship to Story versus standalone chat still needs to be settled.
- **Regex:** not yet defined as inherited from Story.
- **Memory:** its Story/chat ownership follows the MemoryMaker design and still needs exact integration rules.
- **Agents, CYOA, AI Tools:** do not assume Story inheritance until explicitly decided.

This is **not** another menu section or UI row. It is an underlying rule we still need to define per feature so the app knows what belongs to the Story, what belongs to one chat, and what the right drawer should show.

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
- Multiple Lorebooks may be selected for the current Story/chat.
- Selected Lorebooks are visibly highlighted.
- Search is available.
- `Apply` commits the selection.
- A pencil on selected/editable Lorebooks may jump to editing that Lorebook, while the sheet's main job remains assignment/selection.

**Regex**

- Tap the Regex row.
- Open the same style of bottom sheet.
- Show available Regex resources/presets clearly.
- Active selection is visibly highlighted.
- Search and Apply behave consistently with the Lorebooks sheet.
- Editing a Regex resource is a secondary action, not the default result of tapping the row.

### General right-drawer selector rule

Use this Tavo-style quick-sheet interaction for things whose normal job is primarily **selecting or assigning something to the current Story/chat**, for example:

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
- Bottom sheets should feel deliberate and native on mobile: rounded top corners, strong hierarchy, obvious selected state, smooth slide animation and dimmed background context.
- Selection should be fast enough that changing a Lorebook, Regex resource, Persona, Model, Preset or similar current-chat resource feels like a couple of taps, not configuration work.
- SnowBunny can make the selectors visually richer than Tavo, especially for Characters, Personas and image-bearing resources, while preserving Tavo's speed and simplicity.
