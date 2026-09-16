# SnowBunny Codex / Lorebook Reference

This file is the implementation reference for the SnowBunny Codex/Lorebook experience. It records the screenshots supplied by Snow plus the behavior already present in the SnowBunny handoff source. **Do not redesign this system from scratch. Port and refine it.**

Companion documents:

- `SNOWBUNNY_PLAN.md` — project source of truth.
- `SNOWBUNNY_UI_REFERENCE.md` — broader navigation/UI reference.

Primary handoff source to consult before Codex work:

- `SNOWBUNNY_HANDOFF/source/app/lib/lore/chat_codex_panel.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/lore/lore_library.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/lore/lore_editors.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/lore/lore_selectors.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/lore/lorebook_picker.dart`
- retrieval files under `SNOWBUNNY_HANDOFF/source/app/lib/lore/`

## Core rule

**Codex and Lorebook are the same underlying system.**

The top-menu **Codex** button opens a polished working view of the Lorebooks already bound to the current chat/Story. It is not the global Lorebook library and it is not where assignment is primarily managed.

- Global Lorebook collection/management lives in the left Library.
- Story Lorebook assignment lives in Story Settings.
- Chat-specific extra Lorebook assignment lives in the right Current Chat drawer.
- Codex is for **browsing, reading, creating and editing entries in the bound Lorebooks**.

## Bound-Lorebook switcher

The old SnowBunny chat Codex combined entries from every effective Lorebook into one surface. For the fork, change that presentation.

**Show one Lorebook at a time.**

At the top of Codex, provide a simple list/dropdown-style selector for the currently displayed Lorebook.

- The choices are the current chat's effective Lorebooks: mandatory Story-bound books plus any chat-specific additions.
- Selecting another book changes only which Codex is being viewed/edited. It does **not** change assignment.
- Do not build a horizontal tab pile for many Lorebooks.
- If only one Lorebook is bound, simply show it as the current book; the selector may still be available without wasting space.
- If no Lorebooks are bound, show a clean empty state and a shortcut to the correct assignment surface rather than inventing a blank fake Lorebook.
- Remember the last viewed Lorebook for the current chat where practical.

## Codex toolbar

Use the supplied Codex screenshots as the visual baseline.

The header/current-book area supports:

- current Lorebook title;
- back/close navigation;
- export/share action for the current Lorebook where appropriate;
- `+` to create a new entry in the current Lorebook;
- overflow menu for secondary Lorebook actions.

Do not overload this toolbar with assignment controls or unrelated Story/chat settings.

## Visual and Compact views

Keep the existing **Visual / Compact** segmented switch.

This is the same reusable SnowBunny library pattern used for Stories, Characters and other image-heavy resources.

- **Visual** gives artwork more presence and uses roomier entry cards.
- **Compact** gives denser rows for scanning a large Codex.
- Switching mode changes presentation only. It must not change filtering, grouping, entry order, selection or saved content.
- Remember the chosen mode where practical.

The supplied screenshots show both views as image-forward lists rather than tiny database rows. Even Compact keeps a useful thumbnail, title and readable excerpt.

## Search, filters and sections

Keep the existing Codex search/filter interaction.

### Search

The search box is prominent near the top (`Search your Codex`). Search should cover at least:

- entry name;
- entry type;
- aliases/keywords;
- tags.

This behavior already exists in the handoff source and should be preserved.

### Filter sheet

The filter icon opens a mobile bottom sheet rather than a dense permanent filter bar.

The supplied screenshots show:

- `Filters` heading;
- `Done` action;
- **Entry type** selector;
- **Filter by tag** selector;
- `Clear filters`.

Built-in entry types shown in the current UI:

- Character
- Location
- Object/Item
- Lore
- Concept
- Faction
- Event
- Other

Custom tags remain independent from entry type.

### Sections

Entries are grouped into collapsible type sections such as `Character (10)` or `Concept (5)`.

- Each section has its type icon, label and count.
- Each section can collapse/expand individually.
- The `Sections` menu controls **Expand all / Collapse all**. Do not reinterpret it as sorting or another settings menu.
- Preserve the user's reading position and avoid large scroll jumps when toggling sections or Visual/Compact mode.

## Entry cards

The supplied screenshots are the target family of presentation.

Each entry row/card can show:

- image/thumbnail or a type icon fallback;
- entry name;
- short description/content excerpt;
- overflow action menu.

Keep type groups visually distinct without turning each row into a status dashboard.

Artwork is useful recognition/navigation and should remain easy to see on a phone.

## New/Edit Lore Entry flow

Preserve the three-tab editor:

1. **Details**
2. **Writing**
3. **Preview**

The tabs are one editor for one canonical entry. They are not separate copies of the data.

### Details tab

The screenshots show the intended mobile hierarchy:

- entry image/artwork picker;
- entry name;
- tags;
- `What does this entry describe?` / entry-type selector;
- aliases / keywords;
- `Write description` shortcut into the Writing tab;
- **Enabled** toggle;
- **Always active** toggle with a plain-language explanation.

Preserve the activation meaning already in SnowBunny:

- **Enabled** controls whether the entry may be used by AI retrieval.
- **Always active** means the selected Lorebook may include the entry without requiring a keyword/vector match, subject to the entry fitting the context allowance.

Do not expose low-level retrieval internals here unless they genuinely belong to an Advanced surface.

### Writing tab

This is the Novelcrafter-like authoring surface and should remain one of SnowBunny's distinguishing features.

The screenshots show:

- a main **Description** writing box;
- comfortable, resizable writing areas;
- `Choose suggested sections`;
- `Add your own section`;
- the existing **Writing preference** control;
- optional structured sections displayed as expandable/collapsible writing blocks.

Suggested sections are type-aware. The screenshot example for a Character shows grouped suggestions such as:

- **Identity:** Age, Race/Species, Sex;
- **Appearance:** Face;
- and the existing broader Character fields from the authoring system should remain available where appropriate.

The selection sheet supports `Select all`, `Deselect all` and an explicit `Add selected` action.

Once fields are added:

- each section keeps its visible label and icon;
- empty/collapsed sections stay lightweight (`Tap to write`);
- opened sections get a proper large writing box;
- section text areas may be resized;
- field actions from the existing source remain available, including rename for custom fields, clear/reset, remove and order movement where supported;
- `Add your own section` creates a real custom authored field, not an unstructured note hidden from serialization.

Do not flatten structured entries into one giant Description blob internally. The individual fields are canonical authored data.

### Preview tab

Preserve the Preview surface.

Its purpose is to show how the authored entry reads after composition:

- empty sections are hidden;
- populated sections appear in the same stable authored order;
- the preview comes from the canonical entry data, not a second manually maintained text copy.

When the final AI wrapper format is frozen, keep Preview faithful to the same field content/order used for AI serialization. Do not allow the editor preview and the actual AI-facing card to silently disagree.

## Structured fields are AI-facing data

This is critical.

Fields such as Age, Height, Sexuality, Personality, Appearance, Voice, Backstory, custom sections, etc. are **not merely editor decorations**. They must survive as structured authored data and serialize clearly for the AI.

Directional example only; final wrapper syntax is still to be frozen:

```text
<codex-character name="Ruby Rose" lorebook="RWBY">
Age: 18
Height: 1.57 m
Personality:
...
Sexuality:
...
</codex-character>
```

Requirements already settled elsewhere still apply:

- strong entity boundaries;
- explicit entity identity/type;
- stable field order;
- empty fields omitted;
- custom fields preserved;
- no visible database IDs;
- aliases/keywords remain available for retrieval without being confused with authored prose;
- linked forms of the same Character must not be injected twice as competing full cards.

The Authoring Guide must be corrected once the final wrapper/import/export schema is frozen.

## Lorebook-level retrieval

Keep the current per-Lorebook retrieval choice exposed through assignment/setup:

- **Keywords**
- **Meaning** / vectorized retrieval

Codex entry editing itself should not become cluttered with a second duplicate Lorebook-assignment UI.

Entry-level `Always active` remains its separate activation rule.

Preserve the SnowBunny retrieval machinery from the handoff rather than replacing it wholesale with stock SillyTavern World Info/vector behavior.

## Characters shared with Codex

Preserve the existing ability for a Character resource and a Character-type Lorebook entry to share the same authored document/representation when deliberately linked.

- Editing the shared authored Character should not create two drifting copies.
- Do not infer links merely from equal names.
- Use stable hidden identity/link metadata.
- Context assembly must avoid injecting the same full Character twice when both the chat Character system and bound Codex can refer to that same authored entity.

## Things not to regress

Future implementation sessions must not:

- replace Codex with stock SillyTavern World Info UI;
- merge all bound Lorebooks into one giant unreadable Codex when Snow explicitly wants a current-book switcher;
- add/remove Lorebook assignment from the Codex selector itself;
- throw away Visual/Compact mode;
- remove images from entries or turn them into tiny decorative afterthoughts;
- remove entry grouping/counts/collapse behavior;
- lose type/tag filtering or alias-aware search;
- flatten structured fields into one prose blob;
- hide custom fields from AI serialization;
- turn `Sections` into an unrelated sort control;
- duplicate the same linked Character through multiple prompt sources;
- show internal numeric IDs such as `Book #4` in normal UI or AI context.

## Screenshot-derived target summary

The screenshots supplied by Snow show the desired family of UI:

- dark mobile Codex workspace over the story shell;
- current Lorebook title in the header;
- export/share, add-entry and overflow actions;
- Visual/Compact segmented control;
- prominent search;
- filter bottom sheet for type/tag;
- collapsible type sections with counts;
- image-forward entry cards with excerpts;
- three-tab Details/Writing/Preview editor;
- structured section picker;
- expandable/resizable writing fields;
- Preview that hides empty sections.

Treat those screenshots plus the existing SnowBunny source as the starting point. The fork should preserve or improve this experience, not replace it with a generic settings list.
