# SnowBunny Writer Tools Reference

This file records the decision for the old SnowBunny `AI Tools` system after reviewing the handoff implementation. The old screen exposed too many low-level switches and made a useful capability feel like a separate subsystem the user had to understand.

## Core decision

Keep the **useful writer-tool engine**, but do **not** keep `AI Tools` as a prominent ordinary right-drawer row in the fork.

The user should not need to understand tool calling, native-vs-JSON compatibility, raw definitions, phone lookup internals, or several overlapping read-context toggles in order to get good writing.

The old `WriterTools` implementation is still valuable because it gives the Story Writer optional capabilities it can invoke before writing when supplied context is insufficient. Preserve that machinery where it genuinely adds something, but move routine behavior behind SnowBunny's normal context architecture.

Any older planning note that lists `AI Tools` as a mandatory visible right-drawer row is stale after this decision.

## What is worth keeping

### Deep continuity lookup

Keep the ability for the Story Writer to search:

- earlier visible chat history beyond the current back-catalogue window;
- already-approved Memories when the supplied recalled set is not enough.

This is the strongest reason to preserve writer tools. It gives the writer a way to recover a specific old exchange or event instead of inventing around missing context.

Normal UX should not expose separate `search_history` and `search_memories` switches. Treat them as one understandable capability such as **Deep continuity lookup** and let SnowBunny route the correct source internally.

The writer should use it only when the supplied context is insufficient. Most replies should need no lookup.

### Dice / true randomness

Keep the secure dice roller as an optional specialist capability for RPG, game, chance, or uncertainty-driven chats.

It should be off by default and surfaced only where it makes sense. Do not force ordinary fiction users to see or configure dice controls.

### Writing / graphics guidance

The old `use_graphics` tool returns writing-format guidance rather than an image. Preserve the underlying capability when SnowBunny rich/diegetic graphics actually need it, but do not present it as a mysterious general AI tool switch.

Prefer enabling this automatically as part of the relevant rich-graphics/presentation feature or preset module.

## What should not remain as ordinary writer tools

### `read_trackers`

Do not expose this as a normal tool.

Current tracker state is already routed directly into the Story Writer's context. Asking the model to call a second tool to read information it should already have is redundant, adds complexity, and creates a risk of drift between routed state and looked-up state.

### `read_phone`

Do not expose this as a normal tool when relevant Pocket Phone continuity is already supplied through the Story Writer context routing.

Phone-specific workflows may keep their own validated internal lookups. That is different from making `read_phone` another visible writer toggle.

### Phone lookup switches

The old AI Tools screen also exposed phone-side lookup permissions. These belong inside Pocket Phone / phone workflow settings or internal workflow defaults, not in a generic writer-tools screen.

### Raw tool compatibility controls

Native vs JSON tool mode, raw definitions, instruction dumps and similar compatibility controls should be hidden in advanced/developer/provider compatibility settings. They are not ordinary story setup.

## User-facing UX

There should be no confusing full-page `AI Tools` screen in the ordinary SnowBunny flow.

Preferred behavior:

- Deep continuity lookup works as an internal Story Writer capability, with one simple advanced on/off control only if Snow needs to disable it.
- Dice is an optional specialist feature, not default clutter.
- Graphics guidance is owned by the graphics/presentation feature that needs it.
- Phone tools are owned by Pocket Phone.
- Tool activity remains available for audit through View Context / AI Activity when troubleshooting, not as a day-to-day destination.

If a future UI exposes writer abilities, use plain language describing the user-visible effect. Never expose function names such as `search_history`, `read_trackers`, or `read_phone` as the primary UX.

## Context relationship

Writer tools supplement context; they do not replace SnowBunny's normal context routing.

The Story Writer still receives its normal routed context first: preset, identities, Scenario, current trackers, retrieved Lore, recalled Memories, relevant phone continuity, guidance and fitted chat history.

A tool lookup is for the exceptional case where the writer needs a detail outside that supplied packet.

Do not make the writer call tools merely to retrieve context SnowBunny already intentionally supplied.

## Guardrails

Future implementation sessions must not:

- restore the old wall of AI-tool switches as a prominent chat setup screen;
- require Snow to understand tool-calling modes to use the app;
- keep `read_trackers` or `read_phone` as redundant user-facing controls when their context is already routed;
- conflate Writer Tools with Agents, Regex, Memory Maker or Pocket Phone;
- let tool calls silently create Memories, update trackers, send phone messages or advance fictional time;
- remove deep-history / approved-memory lookup merely because the old UI was confusing;
- show raw tool definitions outside an explicit advanced/developer area.

The goal is to preserve the useful intelligence while removing the old conceptual clutter.
