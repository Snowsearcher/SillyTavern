# SnowBunny Chat Implementation Status

This file records what is actually implemented on `snowbunny-mobile`, separate from the design/reference documents.

## Implemented in the current pass

### Live SillyTavern chat shell

`public/scripts/extensions/snowbunny-mobile/index.js` now works directly on SillyTavern's real chat DOM and real composer.

- SnowBunny mobile message-card presentation over `.mes` / `.mes_block`.
- Distinct user/system presentation classes without rewriting stored prose.
- Stock permanent message-action clutter hidden in normal reading mode while the original nodes remain for extension/core compatibility.
- Tap message -> anchored SnowBunny action menu.
- Mapped actions: Copy, Edit, Use as Draft, Delete, latest-safe Retry, Hide/Show, Collapse/Expand, View Context and Replies where applicable.
- Existing extension-added `.extraMesButtons` remain reachable under the menu's secondary `More` area.
- Latest assistant reply gets standalone Retry and Continue controls beneath it.
- The actual ST `#send_textarea` remains the text input.
- Added attachment `+` invokes ST's actual file input.
- Stock options/extension controls remain compatible with the real composer.
- Observer reconciliation is idempotent; SnowBunny-added tail controls are not recreated in a mutation loop.
- A visual-width bug where an extra composer control (for example the magic-wand action) could overlap the writing field was fixed by measuring the real left-control cluster instead of assuming one fixed-width button.

### First real SnowBunny navigation shell

`shell.js` now replaces the stock SillyTavern mobile icon parade with the first SnowBunny-owned outer shell.

Implemented behavior:

- retractable top strip in the settled order: Stories, Response, API, Codex, Look, Extensions;
- stock top icon parade hidden only in SnowBunny mobile mode while ST's real drawers remain alive underneath for temporary bridge routes;
- Response routes to ST's real AI Response Configuration backend;
- API routes to ST's real API/connection backend;
- Look opens a SnowBunny bottom sheet that routes to the current Background and Theme controls while the dedicated Appearance editor is ported;
- Extensions routes to ST's real extension management surface;
- Stories and Codex are visibly present in their settled positions but intentionally disabled until their actual SnowBunny surfaces are wired, rather than being falsely mapped to unrelated ST pages;
- left and right SnowBunny drawers slide over the story with a dimmed backdrop;
- both drawers can be opened with small edge handles or an edge swipe;
- left drawer establishes the settled Library hierarchy and bottom quick-action row;
- right drawer establishes Members + Persona followed by Model, Preset, Lorebooks, Scenario, Regex, Memory, Agents and CYOA, plus the three pinned chat utilities;
- current Character/speaker, Persona name, active model and active preset are read from the real ST state where available;
- unfinished SnowBunny-owned resources are deliberately disabled instead of pretending stock World Info/other ST systems are the same thing;
- top-strip collapsed state persists through the namespaced SnowBunny global state adapter.

This is the outer-shell foundation, not the final Stories/Codex/Current Chat implementation. The important structural change is that the stock mobile chrome is no longer the intended user-facing navigation layer.

### SnowBunny compatibility namespace

`bootstrap.js` initializes one `globalThis.SnowBunny` namespace instead of letting custom systems invent unrelated globals.

Current namespaces:

- `SnowBunny.state`
- `SnowBunny.identity`

The namespace has an API version so later adapters can evolve deliberately.

### Namespaced state adapters

`state.js` establishes:

- global lightweight SnowBunny state under `extension_settings.snowbunny`;
- current-chat lightweight SnowBunny state under `chat_metadata.snowbunny`;
- schema versioning;
- read/patch/delete helpers using SillyTavern's own save functions.

This is intended for lightweight configuration and pointers, not giant Lorebook/Memory payloads.

### Stable message identity/source revision

`message-identity.js` gives each real ST message a persisted `extra.snowbunny` identity:

- stable opaque `id`;
- `revision`;
- current `source` fingerprint;
- `originId` when a duplicate inside the same chat needs a new local identity.

The fingerprint currently includes role, speaker name, canonical message prose, selected swipe, hidden state and media identity. Editing, changing the active swipe, hiding/showing or changing relevant content therefore changes the source revision while keeping the logical message ID stable.

The reconciler listens to ST chat/message events and persists only when identity/source data actually changed.

This is the base needed for tracker validity, Memory evidence, CYOA expiry and historical View Context receipts.

### View Context shell

`context-view.js` adds a SnowBunny mobile View Context bottom sheet without destroying or altering SillyTavern's native prompt button state.

- A hidden SnowBunny proxy action makes View Context available on assistant replies.
- Shows actual model/API metadata already stored on the message when available.
- Shows SnowBunny message revision.
- Can render future SnowBunny receipt sections for History, Lorebook/Codex, Memories, Current State, Phone, Guidance and fitting decisions.
- If ST has native itemized prompt details for the reply, `Raw prompt details` still opens ST's real prompt inspector.
- The native `.mes_prompt` remains untouched so compatibility/state is not falsified.

The custom routing receipt producer is not wired yet; the sheet is ready for it.

## Visual validation completed

The first narrow/mobile-width visual pass confirmed:

- the SnowBunny extension loads on the fork;
- message cards render without replacing ST's canonical message DOM;
- tap-message menu opens in place;
- Retry / Continue appear beneath the latest reply;
- the live composer remains usable;
- two concrete layout bugs were caught from the screenshots and fixed: stock message header controls leaking through, and the extra composer magic-wand control colliding with the writing field.

## Deliberately not claimed complete yet

- Actual Stories library/interior behind the top Book action and left Library row.
- Actual SnowBunny Lorebook library and top Codex workspace.
- Current-chat Members multi-select and Persona quick selector.
- Current-chat Model and Preset quick sheets.
- Lorebooks / Scenario / Regex / Memory / Agents / CYOA right-drawer destinations.
- Reset Chat / Chat Statistics / Search in Chat utility behavior in the SnowBunny drawer.
- Final extension quick-action tray in the composer.
- Tracker / Story State panels in the ST DOM.
- Memory Maker proposal popups.
- Native CYOA rendering and expiry.
- Rich graphics sandbox / display Regex integration.
- Full SnowBunny View Context receipt production.
- Safe historical Retry semantics.
- Message multi-select behavior.
- Final phone spacing/theme polish on a true Android viewport after the shell becomes more complete.

## Next implementation focus

Port the actual SnowBunny Library and Current Chat destinations into the new shell rather than mapping them to stock ST lookalikes. The first priorities are Stories/Stand-alone Chats on the left and the current-chat selector plumbing on the right, while preserving the already-settled ownership rules from the reference documents.
