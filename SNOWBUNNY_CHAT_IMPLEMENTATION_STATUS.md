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
- Stock options control remains reachable as the current tools/extensions fallback.
- Observer reconciliation is idempotent; SnowBunny-added tail controls are not recreated in a mutation loop.

### SnowBunny compatibility namespace

`bootstrap.js` now initializes one `globalThis.SnowBunny` namespace instead of letting custom systems invent unrelated globals.

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

`message-identity.js` now gives each real ST message a persisted `extra.snowbunny` identity:

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

## Deliberately not claimed complete yet

- Left Library drawer.
- Right Current Chat drawer.
- Retractable top menu.
- Final extension quick-action tray in the composer.
- Tracker / Story State panels in the ST DOM.
- Memory Maker proposal popups.
- Native CYOA rendering and expiry.
- Rich graphics sandbox / display Regex integration.
- Full SnowBunny View Context receipt production.
- Safe historical Retry semantics.
- Message multi-select behavior.
- Final phone spacing/theme polish after a real-device visual pass.

## Immediate validation need

Before stacking the sliding shell and custom rich systems on top of this pass, verify the live branch on the target mobile/Android environment for:

1. message cards and speaker/avatar layout;
2. tap-to-open anchored message menu;
3. Copy/Edit/Delete/Hide/Collapse behavior;
4. Retry/Continue beneath the latest assistant reply;
5. attachment `+` opening the actual picker;
6. composer staying usable when the keyboard opens and when text grows;
7. View Context opening without also opening the stock prompt popup;
8. ordinary extensions still seeing the real ST message/composer nodes.

Any visual/interaction correction from that pass should be fixed before building the left/right drawer shell over it.
