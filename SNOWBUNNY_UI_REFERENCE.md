# SnowBunny UI Reference Notes

This file records visual/interaction decisions taken from screenshots and UI references while the main architecture is still being settled. It is a companion to `SNOWBUNNY_PLAN.md`, not implementation code.

## Right drawer / Current Chat panel

### Settled top area

- The top of the right drawer is **not** Model.
- Put the current **Persona selector** at the top-right area, using SnowBunny's own proper visual Persona selector rather than Tavo's plain text `User` row.
- Place a **+** button beside the Persona selector. This opens the Character/cast selector and adds Characters to the current chat.
- The Character selector should preserve SnowBunny's intended visual picker: artwork/cards, search/filtering/favorites where useful, and multi-select/add-to-chat behavior.
- Global Character/Persona management remains in the left Library bottom quick-action row. The right-drawer controls are for choosing what the current Story/chat uses.
- Narrator treatment is **unresolved**. Do not force the old SnowBunny Narrator control into the layout until its role is designed properly for this fork.

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
- current model where appropriate
- Preset
- assigned Lorebooks
- Regex
- Agents or Agent sets where selection is the normal action
- other future selectable resources when the same interaction genuinely fits

Do **not** mechanically force every complex system into this pattern. Some destinations may need their own full editor/workspace after the quick selection step.

### Right-drawer ordering status

Only the following placement is currently settled:

- Top area: Persona selector + adjacent `+` Add Character button.
- Bottom utilities remain conceptually separate/pinned where appropriate.
- Appearance/background/theme controls stay out of the right drawer because Appearance is a top-menu workspace.
- Global API/provider management stays in the top menu. A current-chat model selector may still exist in the drawer, but its exact position is **not** settled.
- The order of Preset, Lorebooks, Regex, MemoryMaker, Scenario, Agents, AI tools, CYOA and other Current Chat rows is still being discussed.

## Visual quality notes from the reference

- Favor large rows/cards over tiny controls.
- Use clear spacing and section separators rather than dense ST-style control piles.
- Bottom sheets should feel deliberate and native on mobile: rounded top corners, strong hierarchy, obvious selected state, smooth slide animation and dimmed background context.
- Selection should be fast enough that changing a Lorebook, Regex resource, Persona or similar current-chat resource feels like a couple of taps, not configuration work.
- SnowBunny can make the selectors visually richer than Tavo, especially for Characters, Personas and image-bearing resources, while preserving Tavo's speed and simplicity.
