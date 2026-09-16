# SnowBunny Direct Core Changes

This file is the explicit log of direct changes to upstream SillyTavern files on `snowbunny-mobile`.

The default rule remains: SnowBunny should live in its own layer and use ST's public APIs/events. A direct core edit is justified only when one small stable seam prevents duplicated state, backend-specific hacks, or fragile DOM simulation.

## `public/scripts/extensions/regex/engine.js`

### Why

SnowBunny requires **true current-chat Regex scope**. ST natively has global, preset and Character-scoped rule stores, but Character scope is not chat scope.

Implementing current-chat rules outside the canonical Regex engine would force SnowBunny to duplicate Regex behavior or post-process backend-specific prompt structures. It would also risk different User/Assistant/depth semantics between display, Text Completion and Chat Completion.

### Change

`getRegexScripts()` now optionally asks:

`globalThis.SnowBunny?.regex?.getChatScriptsForEngine?.()`

and resolves rule order as:

1. ST global rules;
2. SnowBunny current-chat rules;
3. ST preset rules;
4. ST Character/scoped rules.

If SnowBunny is absent, the adapter returns no rules and ST behavior continues normally.

### Guardrails

- the ST replacement/compiler implementation remains canonical;
- no SnowBunny data is stored by the core Regex extension;
- no second Regex engine is introduced;
- no temporary global-rule mutation is used;
- SnowBunny-authored chat rules use display/prompt ephemerality and do not rewrite canonical message prose.

## Current count

One deliberate upstream file seam is currently recorded here.

Styling, shell, Memory, Story ownership, Codex, Tracker, Agents, CYOA and other SnowBunny systems remain isolated under `public/scripts/extensions/snowbunny-mobile/` or SnowBunny documentation unless added to this file later.
