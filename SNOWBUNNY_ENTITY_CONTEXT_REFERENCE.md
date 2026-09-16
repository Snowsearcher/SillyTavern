# SnowBunny Entity Context / AI Wrapper Reference

This file records the settled contract between SnowBunny's authored resources and prompt/context assembly. It is implementation plumbing, not a user-facing authoring format.

The goal is simple: Snow can keep using the polished Character, Persona and Codex editors, while the AI receives clearly bounded entities that do not bleed into one another.

Companion references:

- `SNOWBUNNY_PLAN.md`
- `SNOWBUNNY_CODEX_REFERENCE.md`
- `SNOWBUNNY_CHARACTERS_PERSONAS_REFERENCE.md`
- existing handoff source under `SNOWBUNNY_HANDOFF/source/app/lib/data/author_document.dart` and `prompts/prompt_assembly.dart`

## Core design

SnowBunny should build one **canonical entity packet** from authored data first, then render that packet differently depending on the consumer.

Do not make the editor, SillyTavern compatibility layer and AI prompt each maintain separate drifting copies of the same Character/Persona/Codex text.

A canonical packet contains, as applicable:

- stable hidden entity identity/linkage;
- entity kind/type;
- display name;
- Lorebook identity when relevant;
- freeform main text;
- ordered structured fields;
- field roles such as normal content, dialogue examples and first message;
- custom fields;
- linkage to another representation of the same authored entity where explicitly established.

Internal IDs/link metadata may exist in the packet for deduplication, but **must not be shown to the AI or user as numeric database identities**.

## Native SnowBunny AI rendering

Use boring, explicit XML-like boundaries. These avoid collisions with SillyTavern `{{...}}` macros and make entity boundaries obvious to the model.

Examples:

```text
<character name="Ruby Rose">
Age: 18
Height: 1.57 m

Personality:
...

Speech:
...
</character>
```

```text
<persona name="Gray Wright" role="user">
Age: ...
Personality:
...
</persona>
```

```text
<narrator name="Narrator">
Instructions:
...

Voice and Style:
...
</narrator>
```

```text
<codex-character name="Ruby Rose" lorebook="RWBY">
Age: 18
Appearance:
...
Personality:
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

Other Codex entry kinds follow the same principle with explicit type wrappers, for example `concept`, `faction`, `event`, `lore`, `object-item`, or a safe generic `entry`/`other` wrapper when needed.

Exact escaping is an implementation detail, but names and field text must never be able to accidentally break the wrapper structure.

## Field rules

- Preserve the authored field order.
- Omit empty fields.
- Preserve custom fields and their user-authored labels.
- Preserve the main freeform body when present.
- Freeform resources remain freeform. Do not invent fake sections merely to satisfy the serializer.
- Structured resources keep their structured fields; do not flatten them into one giant prose blob.
- Do not silently rewrite approved authored prose during serialization.

The current SnowBunny structured field set already includes Character/Persona fields such as Age, Race/Species, Sex, Face, Eyes, Hair, Body/Build, Skin, Height, Notable Features, Visual Impression, Sexual Features, Clothing Style, Important Pieces, Personality, Sexuality, Likes, Dislikes, Speech, Voice Lines, Skills, Background and custom fields.

## Metadata versus authored context

Not everything stored on a resource belongs in AI prose.

Normally **do not inject** these as authored content:

- database IDs;
- library sequence/order values;
- favorite state;
- editor categories;
- import/export version bookkeeping;
- enabled/disabled switches;
- retrieval mode;
- vector settings;
- source fingerprints;
- ordinary tags;
- aliases/keywords solely used for retrieval.

Aliases may be included only when they are genuinely useful for identity clarification. They are not automatically dumped into every entity block.

Lorebook name may be present on Codex wrappers because it helps distinguish otherwise unrelated world entities and gives the model useful provenance without exposing internal IDs.

## Voice Lines / dialogue examples

`Voice Lines` are authored example dialogue, not generic biography text.

Keep their special role in the canonical packet.

SnowBunny-native context may render them clearly inside the entity or in a dedicated example-dialogue portion of context, but presets that have a dedicated dialogue-example slot should continue receiving them there.

Do not duplicate the same Voice Lines in both Character description and dialogue-example slots unless a specific preset intentionally requests that.

## First Message

`First Message` is Character-only authored startup content.

It is **not permanent Character context** and should not be injected into every generation.

Use it when creating/opening the appropriate new chat/greeting flow or when a compatible SillyTavern card operation explicitly needs the greeting field.

Persona and ordinary Codex Character entries do not gain a First Message merely because Character cards have one.

## Narrator

Narrator uses its own packet/wrapper, not a fake ordinary Character packet.

Preserve the dedicated Narrator fields already present in SnowBunny:

- displayed name;
- portrait (UI only unless separately relevant);
- Narrator instructions;
- Voice and style.

Do not fabricate Age, Appearance, Sexuality, etc. for Narrator.

## Linked Character + Codex identity

A normal Character resource and a Character-type Codex entry may deliberately share the same authored document/entity.

When that explicit link exists:

- edits update the shared authored source rather than producing drifting copies;
- context assembly deduplicates them;
- if the Character is an active chat Member and the same authored entity is also found through Codex retrieval, prefer one full Character representation and suppress the duplicate full Codex representation for that generation;
- same-name entities are **not** considered the same unless stable linkage says so.

Do not deduplicate by display name alone.

## Compatibility rendering for SillyTavern presets

Do **not** require imported/legacy SillyTavern presets to understand SnowBunny's new XML-like wrappers.

The Context Broker/prompt adapter should be able to render the same canonical entity packets into the compatibility sources existing presets expect, including where relevant:

- `charDescription`;
- `charPersonality`;
- `dialogueExamples`;
- `personaDescription`;
- `{{char}}`;
- `{{user}}`;
- existing scenario/world-info style slots.

This lets SnowBunny improve its internal data model without degrading Fabled presets, ordinary SillyTavern presets, or imported prompt layouts.

SnowBunny-native presets can use the bounded entity rendering directly. Legacy/compatible presets can keep the established source-slot behavior.

## Precedence / deduplication direction

The Context Broker will decide final placement, but the entity layer should make deduplication possible before token fitting.

General direction:

1. Active explicit Character Member representation wins over a duplicate linked Codex Character representation.
2. Explicit Persona is kept as its own user identity block.
3. Narrator is its own special identity.
4. Retrieved Codex entities remain independent unless explicit stable linkage says otherwise.
5. Same names never imply identity.

Deduplication must happen before token-budget trimming so duplicate cards do not waste context and accidentally crowd out useful lore.

## Preview consistency

The editor's Preview should use the same canonical authored data and stable field order that AI serialization uses.

Preview does not need to display the literal XML wrapper, but it must not silently show different text/order than the packet the AI will receive.

Empty fields remain hidden in Preview and in native AI serialization.

## Import/export relationship

Full-fidelity SnowBunny import/export preserves:

- freeform body;
- ordered structured fields;
- custom field IDs/labels/roles;
- aliases;
- tags;
- images/references;
- resource type;
- deliberate Character↔Codex linkage;
- relevant compatibility metadata.

SillyTavern import/export adapters map these resources to compatible ST fields where practical without replacing the canonical SnowBunny authored document.

Do not use export conversion as an excuse to rewrite the user's prose.

## Authoring Guide follow-up

The existing SnowBunny Authoring Guide predates this finalized entity/context contract.

Update the Authoring Guide after the import/export mapping is finalized so it explains the real format once, rather than accumulating contradictory intermediate instructions.

## Future-self guardrails

- Do not make Snow design or edit XML wrappers manually. They are generated plumbing.
- Do not flatten structured data into one description field internally.
- Do not expose internal DB IDs to the AI.
- Do not dump tags, activation switches or vector settings into character prose.
- Do not treat First Message as permanent context.
- Do not lose the special dialogue-example role of Voice Lines.
- Do not duplicate an explicitly linked Character through both Member and Codex context.
- Do not infer identity from equal names.
- Do not break legacy SillyTavern/Fabled presets merely because SnowBunny-native prompts use stronger wrappers.
- Build one canonical entity packet and adapt/render it for the consumer.
