# SnowBunny Characters / Personas Reference

This file records the settled direction for Characters and Personas in the SnowBunny SillyTavern fork. It combines **Tavo's outer library presentation** with the richer menus, authoring, linking and management features already present in the SnowBunny handoff source.

Companion docs:

- `SNOWBUNNY_PLAN.md`
- `SNOWBUNNY_UI_REFERENCE.md`
- `SNOWBUNNY_CODEX_REFERENCE.md`

Primary SnowBunny handoff source:

- `SNOWBUNNY_HANDOFF/source/app/lib/cards/card_library.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/cards/card_selectors.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/cards/portrait_selector.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/cards/narrator_screen.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/lore/lore_editors.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/data/author_document.dart`

## Core UI rule

Use **Tavo's Characters library outer presentation** as the visual baseline.

The supplied Tavo screenshots show the desired library shell:

- simple back navigation;
- centered Characters/Personas title;
- compact Visual/Compact switch control in the header;
- prominent `+ Create` button;
- large search field;
- filter button;
- **Visual mode** with tall artwork-forward cards, title overlay and small overflow control;
- **Compact mode** with circular/small portrait, title, useful metadata/description and an overflow control.

Do not copy Tavo's weaker internal management/editor if SnowBunny already has richer behavior. The intended combination is:

**Tavo outside, SnowBunny inside.**

## Visual / Compact library behavior

Keep the reusable SnowBunny Visual/Compact library preference.

### Visual

- Portrait/artwork is the dominant element.
- Cards are easy to recognize at a glance.
- Character/Persona name remains readable over/below the artwork.
- Small overflow control is available without filling the card with permanent buttons.
- Favourite state may be visible with a subtle star treatment, but do not clutter the artwork.

### Compact

- Denser vertical list.
- Portrait remains visible.
- Name is primary.
- Secondary line(s) may show useful category/tag/description-style metadata.
- Overflow menu remains one tap away.

Changing view is presentation only. It must not change filtering, selection, category grouping, favorites, or stored card data.

## Library features to preserve from SnowBunny

The existing SnowBunny card library already includes useful upgrades that must survive the Tavo visual reskin:

- separate global Character and Persona libraries;
- Visual / Compact presentation with remembered preference;
- search across name, category, aliases and tags;
- Favorites;
- tag filtering;
- Character filtering by linked Lorebook;
- sorting including name/recent/oldest;
- category grouping;
- collapsible category groups;
- Expand all / Collapse all groups;
- import;
- export;
- create new;
- edit;
- delete from library when safe;
- usage checks before destructive deletion;
- long-press/overflow action menu instead of permanent button sprawl.

Normal user-facing UI must not expose numeric database IDs such as `Character #4`, `Book #7`, or `Source #12`. The old source still contains some of those diagnostic labels. They are implementation leftovers, not part of the fork's intended UX.

## Filters

The Tavo-style filter button should open SnowBunny's richer mobile sheet rather than a stripped-down Tavo filter.

Useful filters include:

- Favorites only;
- tags;
- Character-linked Lorebook;
- category/group where useful.

Search and filter are global-library concerns. Current-chat membership selection remains a separate right-drawer flow.

## Categories / grouping

SnowBunny cards have an optional Category value.

Preserve category grouping in the library, with an `Ungrouped` fallback when needed.

- Category headings show counts.
- Groups can collapse individually.
- Expand all / Collapse all remains available.
- Categories are organizational metadata, not AI personality fields unless explicitly serialized for another reason.

## Card actions

Use a clean overflow / long-press action surface.

Existing SnowBunny actions worth preserving:

- Edit shared card;
- Export Character/Persona;
- Add/remove Favorite;
- Delete from library when unused.

Story-level add/remove actions from the old app are **obsolete under the new architecture**. Story no longer owns Character or Persona defaults.

Current-chat Character membership and Persona selection belong in the right Current Chat drawer.

## Current-chat selectors

The global Tavo-style library and the current-chat selectors are separate jobs.

### Characters

- Right drawer shows `Members (N)` and `Add`.
- `Add` opens the portrait/name multi-select sheet.
- Search and tag filtering remain available.
- Existing members are preselected.
- Apply returns directly to the current-chat drawer.

### Persona

- Persona is a separate single-select row below Members.
- Persona selector uses the same polished portrait/name language, but is single-select.
- `No Persona` remains a valid explicit state where appropriate.

Do **not** restore the old Story inheritance controls from `portrait_selector.dart` / `card_selectors.dart`. Those belong to the abandoned Story-default model.

## Character / Persona editor

Keep SnowBunny's existing shared authoring editor rather than adopting a plain Tavo/ST card form.

The editor uses three tabs:

1. **Details**
2. **Writing**
3. **Preview**

This should remain consistent with Codex Character editing so the app feels like one authoring system.

### Details

Preserve:

- portrait/image picker;
- name;
- tags;
- aliases / keywords;
- Library settings;
- category;
- Favorite toggle;
- Character-only linked Lorebooks;
- credits and notes metadata;
- import/export compatibility metadata where useful.

Existing Credits and Notes fields include:

- Creator;
- Card version;
- Source / attribution;
- Creator notes.

These are management/compatibility metadata, not normal prompt content unless a future explicit rule says otherwise.

### Linked Lorebooks

Character cards may deliberately share their authored Character document with one or more Character-type Codex entries.

Preserve this.

- Selecting linked Lorebooks does not make duplicate prose copies.
- The same authored Character can be visible as a global Character card and as a Character entry inside selected Lorebooks.
- Editing the shared authoring data updates the linked representation.
- Never infer a link from matching names alone.
- Context assembly must deduplicate the same linked authored Character if both Character membership and Codex retrieval refer to it.

Personas do not need Character-to-Codex linking by default.

## Writing tab

Preserve the richer SnowBunny writing system.

- Main Description box.
- Resizable writing fields.
- Suggested sections.
- Custom sections.
- Expand/collapse individual sections.
- Rename custom field.
- Move up/down.
- Clear/reset.
- Remove.
- Freeform / Structured writing preference without destroying text.

Suggested Character/Persona fields already defined in the handoff include:

### Identity

- Age
- Race/Species
- Sex

### Appearance

- Face
- Eyes
- Hair
- Body/Build
- Skin
- Height
- Notable Features
- Visual Impression
- Sexual Features
- Clothing Style
- Important Pieces

### Personality / life

- Personality
- Sexuality
- Likes
- Dislikes
- Speech
- Voice Lines
- Skills
- Background

### Character-only chat opening

- First Message

Persona uses the same general authored-document system, but **First Message is Character-only**.

Do not invent Persona fields merely for symmetry. Persona can use the shared structured authoring system without pretending it needs every Character-specific chat behavior.

## Preview

Keep Preview as a real generated view of the canonical authored data.

- Empty sections hidden.
- Stable authored order.
- Main prose and populated structured fields visible.
- Character First Message included only where appropriate.
- Preview must eventually match the same field content/order used by AI-facing serialization.

## AI-facing structure

Character and Persona structured fields are canonical data, not decoration.

The final wrapper syntax is still to be frozen, but the intended distinction remains:

```text
<character name="Ruby Rose">
...
</character>
```

```text
<persona name="Gray Wright" role="user">
...
</persona>
```

Requirements:

- strong boundaries;
- explicit entity type;
- stable field order;
- empty fields omitted;
- custom fields preserved;
- internal DB IDs hidden;
- no `{{...}}` wrapper collision with ST macros;
- linked Character/Codex representation deduplicated.

## Narrator

Narrator remains a special built-in identity, not a normal Character card.

In the new outer Characters library it may visually appear alongside Character resources for discoverability, matching the Tavo-style screenshot direction, but:

- mark it as built-in/special;
- keep its dedicated editor;
- preserve displayed name, portrait, Narrator instructions, Voice and style;
- protect it from accidental deletion;
- do not force normal person fields such as Age/Appearance/Sexuality onto it;
- it remains selectable through current-chat Members.

## Import / export

Preserve both:

- full-fidelity SnowBunny structured-card export/import;
- SillyTavern-compatible Character/Persona import/export where practical.

Conflict handling should preserve the existing direction:

- Keep Both;
- Replace Existing;
- Skip;
- Rename.

Do not rewrite approved authored prose during conversion.

## Do not port obsolete old-app behavior

The handoff source still contains some earlier architecture that no longer matches the current plan. Do **not** preserve these merely because they exist in code:

- Story-level Character defaults;
- Story-level Persona defaults;
- chat `inherit Character/Persona from Story` controls;
- Story Character management pages as an ownership layer;
- visible numeric IDs used to disambiguate cards/books.

The current ownership is:

- global Character/Persona libraries;
- current-chat Members;
- current-chat Persona;
- Story owns only Lorebooks + Memories.

## Implementation summary

When building the fork:

1. Use Tavo's supplied Characters screenshots for the **outer library look and density**.
2. Keep SnowBunny's richer library filters, favorites, categories, linked-Lorebook filtering, import/export and action menus.
3. Keep SnowBunny's structured Details/Writing/Preview editor.
4. Keep Character↔Codex shared-author-document linking.
5. Keep Narrator special.
6. Remove obsolete Story Character/Persona inheritance.
7. Do not expose numeric IDs.

The goal is not "copy Tavo Characters." It is **Tavo's clean exterior with SnowBunny's stronger authoring and management underneath**.
