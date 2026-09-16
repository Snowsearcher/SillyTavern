# SnowBunny Narrator Implementation Reference

This file records the protected Narrator resource as implemented on `snowbunny-mobile` and the remaining special-speaker work.

## Identity model

Narrator is a SnowBunny special identity, not a normal SillyTavern Character.

Rules:

- built in and protected from deletion;
- globally editable resource;
- selectable per chat through Members;
- may coexist with ordinary Character members;
- never stored in `group.members`;
- never converted into a fake Character card merely to satisfy ST group generation;
- serialized for the writer as Narrator, not Character.

## Current storage

`narrator.js` stores the canonical Narrator record as an authenticated SnowBunny user file using ST's existing `/api/files/upload` path.

The record currently contains:

- schema version;
- displayed name;
- portrait data;
- Narrator instructions;
- Voice/style;
- update timestamp.

Only the saved file path is kept in lightweight SnowBunny global state (`narratorFilePath`).

This follows the same principle as native SnowBunny Lorebooks: substantial authored content lives outside `extension_settings.snowbunny`, while lightweight references/state stay there.

## Current editor

The dedicated mobile Narrator editor exposes:

- displayed name;
- portrait choose/remove;
- Narrator instructions;
- Voice and style;
- Reset fields;
- Save.

It is opened from the protected Narrator row in Members.

The editor is intentionally Narrator-specific rather than reusing the ordinary Character editor shell, because Narrator has different semantics and cannot be deleted.

## Chat membership

Per-chat selection is stored as `narratorMember` under SnowBunny chat state.

The Members picker contains a special Narrator option alongside ordinary Character options. Apply persists Narrator selection separately from the ordinary Character set.

When selected:

- Members count includes Narrator;
- a protected Narrator row appears in the Current Chat drawer;
- its global editor is reachable from that row;
- ordinary Character membership remains backed by ST group machinery independently.

When a legacy single-Character chat is promoted to a group-backed multi-member copy, the existing SnowBunny chat metadata snapshot carries the Narrator selection into the promoted copy.

## Writer routing

When Narrator is selected, SnowBunny routes the saved resource to the Story Writer through ST's extension-prompt mechanism.

The native wrapper direction is:

```text
<narrator name="Narrator">
Narrator instructions:
...

Voice and style:
...
</narrator>
```

World Info scanning is disabled for this injection.

This preserves the settled entity-context rule that Narrator must be distinguishable from Character context.

## Important current limitation

The current adapter makes Narrator a real selectable/configurable writer identity, but **does not yet dispatch Narrator as an independent message speaker through ST's generation machinery**.

Ordinary Character replies continue to use ST's group member generation path. Selecting Narrator currently makes its narration rules available to that Story Writer request so narration can coexist with Character writing, but it does not create a separate Narrator-labelled generated message by itself.

Therefore the following are still pending and must not be faked:

- explicit `Generate as Narrator` / special-speaker dispatch;
- Narrator-only brand-new chat backend;
- automatic Narrator fallback when a new chat has no ordinary Characters;
- separate Narrator message speaker/avatar output when the Narrator itself is the response identity.

## Future dispatch direction

The eventual dispatch layer should:

1. keep Narrator outside ST Character storage;
2. use the normal SnowBunny writer/context route rather than a second prompt engine;
3. explicitly set the generated reply identity to Narrator;
4. write canonical message metadata identifying the special Narrator source;
5. preserve Retry/Continue/swipe/history semantics;
6. allow Narrator to coexist with ordinary Character members without contaminating ST group member arrays;
7. keep View Context receipts aware of whether the reply was generated as Narrator or as an ordinary Character.

Do not solve this by creating a hidden Character card named Narrator.

## Guardrails

Future work must not:

- make Narrator deletable;
- treat Narrator as Persona;
- store it inside a Lorebook merely because entity wrappers look similar;
- insert it into ST `group.members`;
- duplicate Narrator instructions into every Character card;
- make users edit raw XML/wrappers;
- claim separate Narrator-speaker dispatch is complete until generated messages actually carry Narrator identity.
