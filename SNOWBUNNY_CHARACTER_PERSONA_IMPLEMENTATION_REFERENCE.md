# SnowBunny Character / Persona Implementation Reference

This file records the live implementation contract for native SnowBunny Character and Persona authoring on `snowbunny-mobile`.

It complements `SNOWBUNNY_CHARACTERS_PERSONAS_REFERENCE.md` and `SNOWBUNNY_ENTITY_CONTEXT_REFERENCE.md`. Those files define the intended experience and entity semantics; this file records what the current branch actually does.

## Core rule

SnowBunny does not maintain a second Character or Persona database beside SillyTavern.

- a Character remains a real ST Character card;
- a Persona remains a real ST Persona/avatar record;
- SnowBunny stores its richer authoring document inside the real canonical resource;
- compatibility projections are written back to the ordinary ST fields that existing presets/extensions understand;
- the SnowBunny UI is a new authoring/library surface over those resources, not a parallel collection.

## Character authored document

`character-authoring.js` stores SnowBunny Character authoring data under:

`Character.data.extensions.snowbunny`

The SnowBunny extension record contains:

- stable `entityId`;
- schema version;
- canonical author document;
- SnowBunny management metadata such as category, aliases, favorite and source.

The canonical document contains:

- `structured` or `freeform` editor mode;
- main freeform content;
- stable ordered fields;
- field roles for ordinary content, dialogue examples and Character-only First Message;
- custom fields.

The current starter structured fields are the field set settled in the Character/Persona reference, including Age, Race/Species, Sex, appearance fields, Personality, Sexuality, Likes/Dislikes, Speech, Voice Lines, Skills, Background and Character-only First Message.

### Legacy Character adoption

Existing ST Character cards are not blanked or duplicated.

When a Character has no SnowBunny authored document yet:

- ST description becomes the document's main content;
- ST Personality becomes the Personality field;
- ST example dialogue becomes Voice Lines;
- ST First Message becomes the Character-only First Message field.

A stable SnowBunny `entityId` is created only when SnowBunny actually needs to persist the richer record/linkage.

### Compatibility projection

When the SnowBunny Character editor saves, the canonical document is also projected into ST-compatible fields:

- structured/freeform authored context -> ST description;
- Personality -> ST personality;
- Voice Lines -> ST example dialogue;
- First Message -> ST first message;
- tags/creator/version/notes stay in their established ST fields.

Other Character extensions are preserved. SnowBunny adds its own extension namespace rather than replacing the `extensions` object.

Character artwork and safe Character rename still use ST's canonical card ownership path. The SnowBunny authoring adapter deliberately does not invent a filename/chat-owner rename shortcut.

## Character library and editor

`character-library.js` replaces the temporary Characters shortcut with a SnowBunny-owned mobile workspace.

Library behavior currently includes:

- Visual / Compact switch;
- artwork-forward cards;
- search by name/category/aliases/tags;
- favorites;
- tag filter;
- linked-Lorebook filter;
- name/recent/oldest sorting;
- category grouping with collapse;
- protected Narrator discovery card;
- Create route through ST's real Character creation control.

The Character editor has the settled three tabs:

- Details;
- Writing;
- Preview.

Details currently includes favorite, category, aliases, tags, creator/version/source/notes and linked Lorebooks.

Writing provides:

- Structured / Freeform switch without destructive conversion;
- main Description;
- collapsible structured fields;
- custom field add/remove/reorder/clear controls;
- Voice Lines retained as dialogue-example content;
- First Message retained as startup content rather than permanent context.

Preview hides empty fields and reads the same canonical authored data that the compatibility projection uses.

Import/export, full safe delete/replace flows, artwork replacement and dedicated safe rename are not yet ported into this new Character workspace. Those existing ST operations remain canonical until their SnowBunny surfaces are implemented.

## Character <-> Codex shared identity

`character-codex-links.js`, `lorebook-store.js`, `lore-semantic-index.js`, `lore-retrieval.js` and `codex-linked-character-ui.js` implement the first complete shared-identity path.

A linked Codex Character entry stores only stable linkage plus retrieval/library metadata:

- `kind: character`;
- Character `entityId`;
- real Character avatar/card identifier;
- Lore entry identity/order/tags/aliases/activation metadata.

It does not store a second copy of the Character's authored prose.

At retrieval/index time, the linked Codex entry is materialized from the live Character authored document. Character edits therefore change the semantic-index/retrieval content without creating a drifting duplicate Lore document.

Linked Character edits also wake semantic indexing even when the Lorebook JSON itself did not need to change.

### Deduplication

If the same stable Character entity is both:

- an active chat Member; and
- retrieved through a linked Codex Character entry,

Lore routing suppresses the linked Codex copy before token fitting. The active Character representation wins.

This is based on stable `entityId`, never display-name equality.

The Lore View Context receipt records linked Character entries suppressed for this reason.

Semantic retrieval temporarily widens its candidate window when linked active Characters are being suppressed so a duplicate Character hit does not crowd out another useful Lore entry.

### Codex editing route

`codex-linked-character-ui.js` marks linked Character entries as `Shared Character` and routes their edit action back to the Character editor instead of encouraging a second prose copy inside Codex.

Independent Character-type Codex entries remain ordinary independent Lore entries.

## Persona authored document

`persona-authoring.js` stores SnowBunny Persona authoring inside the existing ST Persona descriptor under its `snowbunny` namespace.

It preserves ST Persona placement/depth/role/Lorebook/connection metadata while adding:

- stable Persona entity id;
- Structured / Freeform canonical author document;
- ordered built-in/custom fields;
- SnowBunny category/aliases/tags/favorite metadata.

Persona deliberately has no First Message field.

On save, the authored document is projected back to the ST Persona description so existing Persona injection remains compatible. Editing the currently active Persona also refreshes ST's in-memory Persona context values.

SnowBunny `Favorite` is separate from ST's single default Persona flag. The editor also exposes the real default-Persona state.

## Persona library and editor

`persona-library.js` replaces the left-drawer Personas shortcut with a SnowBunny-owned mobile workspace.

Implemented:

- Visual / Compact views;
- portrait-forward cards;
- search across name/title/category/aliases/tags;
- favorites-first/default-first ordering;
- Details / Writing / Preview editor;
- title/category/aliases/tags;
- Favorite and real default-Persona controls;
- Structured / Freeform writing without destructive conversion;
- custom fields;
- Preview from canonical authored data.

Avatar creation/import/replacement and advanced ST Persona placement/connection management currently remain available through the native Persona management route rather than being duplicated prematurely.

## Context compatibility

Character and Persona SnowBunny documents are authored once, then adapted for consumers.

Current ST-compatible generation continues to receive established Character/Persona source fields, so imported ST/Fabled presets keep working.

The new stable entity ids and canonical documents are now available for stronger SnowBunny-native wrappers and context auditing without forcing imported presets to understand a new format.

## Validation status

The JavaScript static check passes with the Character/Persona authoring, libraries, shared Codex linkage and dedup routing wired.

The new Character/Persona visual surfaces have not yet received the next narrow/mobile visual pass. Treat their layout, keyboard behavior and touch polish as implemented-but-unapproved until that pass is performed.

## Next work around this seam

Still to finish here:

- direct SnowBunny Character import/export and safe delete/replace/rename/artwork flows;
- direct SnowBunny Persona create/import/avatar replacement/delete flows;
- Character/Persona native-wrapper routing where a SnowBunny-native preset explicitly wants it;
- final mobile visual/device polish;
- verify every legacy/imported card edge case against the compatibility projection.

Do not regress to duplicate Character records or deduplicate by name. The real ST resource plus stable SnowBunny identity remains the authoritative model.
