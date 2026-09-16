# SnowBunny Chat Implementation Map

This file maps the already-settled Tavo-like SnowBunny chat experience onto the current SillyTavern fork. It is an implementation map, not a new chat redesign.

## Core decision

The fork should **not** port the old standalone SnowBunny `ChatScreen` + Flutter composer + Tavo WebView renderer as a second chat frontend inside SillyTavern.

That architecture was useful when SnowBunny was its own Android app. In the SillyTavern fork it would create two competing chat states, two composers and a bridge that could drift away from SillyTavern's real generation/history state.

Use SillyTavern's actual chat/messages/composer/generation state as the authority and build the SnowBunny mobile presentation directly around it.

In short:

- SillyTavern owns the real chat array, generation, swipes, edits, attachments, extension hooks and composer state.
- SnowBunny owns the visible shell, message presentation, drawers, action menus, rich panels and mobile interaction.
- Do not create a parallel renderer truth.

## Current implementation status

The disposable tap-to-reveal experiment has now been replaced by the first real SnowBunny chat-shell layer in `public/scripts/extensions/snowbunny-mobile/`.

Implemented on the `snowbunny-mobile` branch:

- mobile message cards are restyled directly over SillyTavern's real `.mes` DOM rather than rendered in a second WebView;
- user and system messages receive SnowBunny presentation classes without changing canonical message text;
- SillyTavern's permanent visible message-button pile is hidden in normal mobile reading mode while the underlying nodes remain available for compatibility;
- tapping a message opens a SnowBunny anchored action menu rather than revealing the stock button strip;
- current mapped actions include Copy, Edit, Use as Draft, Delete, Retry where safely applicable, Hide/Show, Collapse/Expand, View Context when ST has a saved prompt receipt, and Replies when swipes exist;
- extension-added message actions from `.extraMesButtons` remain reachable through the menu's secondary `More` area;
- standalone Retry / Continue controls now live after the latest assistant reply and call SillyTavern's actual generation controls;
- the live SillyTavern `#send_textarea` remains the composer; SnowBunny only skins/re-lays it;
- a SnowBunny attachment `+` calls the real SillyTavern file input;
- the stock options control remains available as the tools/extensions affordance;
- reconciliation is observer-driven and idempotent so SnowBunny-added tail controls do not create a mutation loop.

This is still an implementation slice, not the finished chat shell. It deliberately does **not** yet claim to provide the final SnowBunny drawers, tracker/Memory Maker surfaces, native CYOA/rich rendering, final View Context receipt, or stable SnowBunny message identity.

## What current SillyTavern already gives us

The current fork exposes enough real machinery to avoid DOM-command hacks for most core behavior.

`SillyTavern.getContext()` already exposes, among other things:

- current chat/messages;
- generation and stop-generation;
- `deleteMessage`;
- save/update message helpers;
- message formatting;
- swipe left/right/to/refresh state;
- event source + event types;
- attachments/media helpers;
- current chat identity;
- extension/prompt hooks.

`script.js` also exports `messageEdit`, `Generate`, `deleteMessage`, swipe functions and related chat operations directly.

Current event coverage is useful for SnowBunny source validity and UI reconciliation. Events include message sent/received/edited/deleted/updated/swiped, swipe deletion, more-history loaded, generation started/stopped/ended, chat changed, rendered-message events, model/provider changes and more.

## Keep SillyTavern's live DOM contract

Current SillyTavern messages are rendered as `.mes` elements containing the avatar wrapper, speaker/name area, `.mes_text`, reasoning, message buttons and swipe controls.

Extensions and core code expect many of those nodes/classes to exist.

Therefore SnowBunny should **restyle/rearrange/wrap** the existing message structure while preserving the important compatibility nodes. Do not replace the message body with a Shadow DOM or a completely unrelated renderer that makes extension selectors stop working.

Normal SnowBunny reading mode should hide SillyTavern's visible button clutter and swipe arrows, but the compatibility nodes may stay present underneath.

## Message presentation

The approved SnowBunny/Tavo direction remains the target:

- story-first reading space;
- visually distinct user messages;
- integrated semi-transparent speaker header;
- character/Narrator identity and portrait behavior from the approved design;
- readable type, spacing and message width;
- no permanent mini-button strip on every message;
- rich Story State/Tracker panels attached to the reply that produced them;
- CYOA, graphics and other rich display elements remain part of the message flow.

The old handoff's `snowbunny_host.js` is a useful behavior reference because it already adapted a Tavo renderer to use one stable surface behind speaker + prose and attached tracker slots to the same message. Do not port that renderer wholesale; reproduce the useful behavior directly in the ST message shell.

## Message actions

Final behavior:

- tap/hold a message -> SnowBunny action menu anchored to that message;
- menu does not force a scroll jump;
- core actions include the already-settled Copy, Edit, Use as Draft, Delete, Retry, Hide/Show, Select, Collapse/Expand, View Context and Replies where applicable;
- mutating actions disable while generation makes them unsafe;
- no permanent action row in normal reading mode.

For core actions, call SillyTavern's real functions/adapters rather than pretending to click coordinates when a stable API exists.

For extension-added message actions, preserve compatibility with the existing hidden `.extraMesButtons` / extension hooks. SnowBunny can surface those as a secondary `More` / tools section and forward to the real registered handler when no cleaner extension API exists. Do not lose extension message actions merely because the stock button row is hidden.

Current implementation note: `Select` and safe historical Retry semantics still need their final behavior. Do not fake either merely to fill a menu slot.

## Retry / Continue / Replies

Keep the settled Tavo-like presentation:

- `Retry` and `Continue` are separate standalone controls after the latest assistant message;
- they are not embedded into every message bubble;
- older messages can still be targeted through their message menu where supported;
- generation state controls whether these actions are available.

Use SillyTavern's real generation/swipe machinery underneath.

Current ST already stores response alternatives as swipes and ships a swipe picker that can inspect historical AI-message swipes and branch from them. SnowBunny's `Replies` surface should wrap that capability in the SnowBunny phone UI rather than recreate response-version storage.

Exact safe behavior for generating a brand-new alternate from a non-tail historical reply should be implemented conservatively against ST's branch/swipe semantics. Never silently destroy later history just to imitate the old app.

## Composer

Do **not** port the old Flutter `StoryComposer` as a second text input.

Keep SillyTavern's real `#send_textarea` as the live input field because slash commands, macros, extensions, draft/focus handling and generation already depend on it.

SnowBunny should re-layout/skin the actual composer into the approved mobile form:

- large `+` for attachments/media;
- central writing field that grows without becoming a tiny slit;
- integrated extension quick actions;
- Send becomes Stop while generating;
- keyboard/safe-area aware;
- Memory Maker proposals/notices may appear gracefully around the composer without replacing it;
- optional resize/grow behavior may borrow the useful interaction ideas from the old `StoryComposer`.

Preserve one stable textarea node while its layout changes so mobile IME/focus does not reset.

## Extension quick actions

The old SnowBunny composer had a dedicated extension gesture/tray concept. Preserve the **goal**, not the Flutter implementation.

Installed/pinned extension actions should remain directly reachable from the composer in the new fork. Do not send Snow through a settings panel for routine Guided Generations / extension actions.

The large `+` remains attachments. Extension actions get their own compact integrated affordance.

## Drawers and shell

Do not rely on current SillyTavern mobile CSS as the final navigation shell. Current mobile ST turns many drawers into nearly full-screen fixed panels and retains desktop-oriented information architecture.

SnowBunny owns the visible shell:

- left sliding Library drawer;
- right sliding Current Chat drawer;
- retractable top menu;
- story remains visually stable underneath;
- smooth swipe/open/close transitions;
- bottom sheets for quick selectors.

Stock ST drawers/settings may remain underneath as backend/fallback surfaces where useful, but they are not the normal SnowBunny route.

## View Context

SillyTavern's `itemizedPrompts` system is useful evidence for View Context because it already records per-message prompt material and can report actual API/model/preset/token information.

SnowBunny should combine that with its own context-routing receipt:

- exact provider/model actually used;
- active preset/config;
- included/omitted history;
- Lore retrieval;
- recalled Memories;
- tracker revision;
- Phone/guidance evidence;
- fitting decisions;
- final request/prompt evidence where available.

Do not rely on mutable ST array position as SnowBunny's only long-term identity. Add a stable namespaced SnowBunny message identity/fingerprint in message metadata and use ST message events to reconcile edits/deletes/swipes with derived state and receipts.

## Rich presentation / Regex / CYOA

Canonical chat prose remains SillyTavern's stored message text.

- display Regex transforms presentation, not the saved original;
- AI-input Regex transforms model input, not the saved original;
- native CYOA renders choices from the reply and sends only the chosen path as the next user message;
- rich graphics can use a sandboxed message surface where necessary;
- Story State tracker panels are attached UI/state, not rewritten into the visible prose.

The old `snowbunny_rich.js` is useful as a safety/behavior reference for sandboxed rich HTML and CYOA, but its Flutter bridge is obsolete in the ST fork. Replace bridge calls with direct SnowBunny/ST adapters.

## Old renderer: what to salvage vs discard

Salvage as behavior/reference:

- Tavo-like message surface and speaker integration;
- anchored message context menu;
- latest-message Retry/Continue controls;
- tracker slots bound to the producing reply;
- rich-message sandbox safety ideas;
- CYOA card lifecycle/expiry behavior;
- context-menu fit around mobile chrome;
- keyboard-aware interaction lessons.

Discard as architecture:

- Flutter owning a second message repository;
- WebView projection snapshots as the canonical chat display;
- JS <-> Flutter bridge for ordinary chat actions;
- separate Flutter text composer;
- duplicate generation controller/API stack;
- porting the compiled Tavo renderer bundle into the fork as a parallel frontend.

## Direct-core-change budget

Prefer the SnowBunny extension/layer plus public ST APIs/events.

A small direct ST change is justified when it creates a stable hook that avoids fragile DOM simulation, for example exposing an existing internal action through the public context API. Record every such change and why.

Do not fork large chunks of `script.js` merely to achieve styling/navigation.

## Implementation order for the chat shell

1. Establish the SnowBunny shell and compatibility namespace without changing generation behavior.
2. Restyle/restructure message presentation while preserving `.mes`, `.mes_text`, avatar/speaker and extension compatibility nodes. **First pass implemented.**
3. Replace the experimental message-action reveal with the SnowBunny anchored action menu wired to real ST actions. **First pass implemented.**
4. Re-layout the real ST composer into the approved SnowBunny composer while preserving `#send_textarea` identity. **First pass implemented.**
5. Add latest-message Retry/Continue and SnowBunny Replies/swipe UI. **Retry/Continue first pass implemented; Replies currently delegates to ST's real swipe picker.**
6. Attach Tracker/Story State and Memory Maker proposal surfaces.
7. Integrate CYOA/rich graphics/display Regex into the same message shell.
8. Wire View Context receipts and stable message identity/source invalidation.
9. Finish drawer/top-menu animation, keyboard/safe-area/orientation behavior and extension-action polish.

## Guardrails

- Do not redesign the already-settled Tavo-like chat UX from scratch.
- Do not port old SnowBunny's dual Flutter/WebView chat architecture into ST.
- Do not replace ST's real textarea with a fake parallel composer.
- Do not remove message DOM hooks that extensions depend on without an adapter.
- Do not reveal ST's permanent message-button pile in the final UI.
- Do not make Retry/Continue global footer controls; they belong to the latest reply presentation.
- Do not let display transformations mutate canonical saved prose.
- Do not trust mutable message index alone for custom derived-state validity.
- Do not sacrifice extension compatibility merely to make the DOM prettier.
