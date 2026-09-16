# SnowBunny Regex Implementation Reference

This file records the native Regex implementation on `snowbunny-mobile`.

It complements `SNOWBUNNY_REGEX_UI_REFERENCE.md` and records the backend seam chosen for current-chat rules.

## Core decision

SnowBunny does **not** build a second Regex execution engine.

SillyTavern's established Regex engine remains canonical for:

- compiling expressions;
- replacement and capture behavior;
- macro substitution;
- display-vs-prompt phases;
- User vs Assistant placement;
- message-depth limits;
- edit handling;
- normal core prompt/display integration.

SnowBunny adds a native mobile management surface and one thin engine adapter for true current-chat scope.

## Thin direct core hook

The only direct upstream Regex-engine seam currently added is in:

`public/scripts/extensions/regex/engine.js`

`getRegexScripts()` now resolves rules in this order:

1. established ST global rules;
2. SnowBunny current-chat rules;
3. preset Regex rules;
4. character/scoped compatibility Regex rules.

The SnowBunny adapter is optional. If `globalThis.SnowBunny.regex` is absent, the upstream engine simply receives an empty current-chat list and continues normally.

This avoids temporary global-setting mutation, duplicate prompt interceptors, and role guessing.

## Why current-chat rules use the core engine

A separate post-processing hook would have to rediscover which prompt text came from User vs Assistant messages and would behave differently across Chat Completion and Text Completion backends.

By supplying current-chat rule objects to ST's existing `getRegexedString()` path, SnowBunny automatically gets the same role/depth semantics across:

- message display formatting;
- outgoing prompt formatting;
- edited messages;
- ordinary ST generation backends.

Canonical `message.mes` text remains unchanged for SnowBunny-authored rules because the native editor requires Display, AI input, or both. It does not create direct-mutation rules.

## Scope

### This chat

Current-chat rules live in lightweight chat metadata under SnowBunny state.

They are not stored as Character-scoped Regex rules because Character scope is not chat scope. A Character may participate in many chats with different Regex needs.

### All chats

All-chat rules use ST's real global Regex list and persistence.

Existing global compatibility rules are preserved. When an existing legacy rule is edited through SnowBunny, the SnowBunny editor requires an explicit non-destructive phase before saving.

## Native Regex workspace

The right-drawer `Regex` row opens `regex-native.js`.

The workspace includes:

- `This chat` / `All chats` scope switch;
- search;
- current enabled-rule count in the drawer;
- quick per-rule On / Off;
- touch/pointer reordering through a dedicated grip;
- New rule;
- Import;
- Export;
- built-in `Context Saver — States + CYOA` helper for the current chat;
- a clear note that Interactive messages are advanced compatibility rather than native CYOA.

The normal list card shows human-readable badges for:

- Display;
- AI input;
- User;
- Assistant;
- built-in status where applicable.

## Native rule editor

Default controls:

- Name;
- Find pattern;
- Replace / Erase;
- Replacement text;
- Apply to Message display and/or AI input;
- User and/or Assistant messages;
- live sample preview.

Advanced controls:

- Global / Ignore case / Multiline / Dot-all / Unicode flags;
- minimum and maximum message depth;
- capture-trim strings;
- macro substitution mode for Find;
- Run after message edits.

The preview uses the same ST `runRegexScript()` implementation used during real execution rather than a separate JavaScript replacement approximation.

## Original-message safety

SnowBunny-authored rules are always ephemeral transformations:

- `markdownOnly=true` for display rules;
- `promptOnly=true` for AI-input rules;
- both may be enabled together.

The editor refuses to save a rule with neither phase selected.

Therefore SnowBunny's current-chat Regex path never needs to rewrite canonical stored message prose.

Existing legacy global ST rules that were authored as direct mutation remain compatibility data until explicitly edited/migrated. SnowBunny does not silently rewrite a user's existing global rule library on startup.

## CYOA relationship

Native CYOA remains independent.

CYOA's prose renderer already calls ST's canonical `messageFormatting()` path, so SnowBunny display Regex applies to the prose naturally through the same engine hook.

The native CYOA system removes/parses its own valid `<choicecard>` before formatting the visible prose. Regex therefore does not own native CYOA activation, stale-card checks, or choice selection.

For AI input, the optional Context Saver can remove old raw choice/state markup without changing the saved assistant message.

## Context Saver

The first built-in helper is chat-scoped and AI-input-only.

It removes older stored markup for:

- `<choicecard>...</choicecard>`;
- `<current-state>...</current-state>`;
- legacy `<story_state>...</story_state>`;
- legacy `<tracker>...</tracker>`.

It starts at depth 1 so it acts as a back-catalogue/context-cleaning tool rather than a display mutation.

This is intentionally a deterministic Regex helper. It does not replace SnowBunny's native Tracker or CYOA engines.

## Import / export

SnowBunny exports a small wrapper containing the scope and scripts.

Import accepts:

- a raw script array;
- `{ "scripts": [...] }`;
- `{ "regex": [...] }` compatibility shapes.

Imported rules receive new ids to avoid accidental identity collision.

Unknown fields on rule objects are preserved where possible because imported ST/SillyBunny rules may contain compatibility metadata beyond SnowBunny's normal editor.

## Still pending

- dedicated Interactive messages safety/compatibility controls;
- richer import-conflict handling instead of always creating copies;
- final visual/mobile validation;
- broader built-in rich-presentation helpers after the native rich-message surfaces are finalized.

## Guardrails

Do not:

- merge Regex and CYOA;
- use Character-scoped Regex as a fake current-chat scope;
- mutate `message.mes` for native SnowBunny rules;
- create a second replacement engine with subtly different capture semantics;
- apply per-chat Regex by temporarily injecting rules into global settings;
- make native CYOA depend on user-managed Regex;
- hide display-vs-AI-input behavior behind technical implementation names;
- reduce Regex to cosmetic word replacement and lose its context-management role.
