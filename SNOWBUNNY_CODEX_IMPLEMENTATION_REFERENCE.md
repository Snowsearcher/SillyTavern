# SnowBunny Codex Implementation Reference

This file records the concrete storage/routing mapping used by the new fork for SnowBunny Lorebooks and Codex. It supplements `SNOWBUNNY_CODEX_REFERENCE.md`, which remains the UI/behavior design authority.

## Core decision

SnowBunny Lorebooks are **not SillyTavern World Info files**.

World Info remains useful for compatibility import/export later, but the canonical authored SnowBunny Lorebook document lives in SnowBunny's own JSON format.

The fork also does **not** put large Lorebook bodies into `extension_settings.snowbunny` or `chat_metadata.snowbunny`. Those namespaced records remain lightweight configuration/index state.

## Durable file storage

The current implementation reuses SillyTavern's authenticated user-file storage endpoint instead of adding a second custom server or modifying the World Info store.

Each Lorebook is written as a JSON file through the existing `/api/files/upload` path using an opaque SnowBunny id in the filename:

`snowbunny-lorebook-<stable-id>.json`

SillyTavern therefore continues to own the physical per-user file location, permissions and server-side atomic write behavior.

SnowBunny keeps only a lightweight global index under its namespaced extension settings. Index records contain fields such as:

- stable Lorebook id;
- display name;
- description/tags summary;
- retrieval summary;
- saved ST user-file path;
- entry count;
- created/updated timestamps.

The large entries/sections remain in the JSON file.

## Canonical Lorebook document

Current schema version: `1`.

A Lorebook contains:

- `id`
- `name`
- `description`
- `tags`
- `retrieval`
- `entries`
- created/updated timestamps

Retrieval currently records:

- mode: `keywords` or `meaning`
- scan depth
- maximum matched entries
- threshold
- Lore character budget

An entry contains:

- stable id
- name
- type
- aliases
- tags
- Enabled
- Always active
- main Description
- ordered structured/custom sections
- optional image metadata slot
- created/updated timestamps
- order

The supported entry type vocabulary follows the settled Codex UI:

- Character
- Location
- Object/Item
- Lore
- Concept
- Faction
- Event
- Other

This is canonical SnowBunny authored data. The UI may become richer without changing that principle.

## Assignment storage

Lorebook content and Lorebook assignment are deliberately separate.

Global Lorebook files/index do not imply activation.

For a current chat:

- Story-owned mandatory Lorebook ids come from the Story record's `lorebookIds`.
- Chat-specific extra Lorebook ids live in `chat_metadata.snowbunny.chatLorebookIds`.
- Effective Lorebooks are the stable-id union of Story ids + chat extra ids.
- The chat selector cannot remove Story-owned ids; it only changes chat extras.

The top Codex workspace reads the same effective-id set. Switching which bound Lorebook is being viewed never changes assignment.

## Current UI mapping

`codex.js` currently wires three access contexts to the same native Lorebook store:

1. left Library `Lorebooks` -> global Lorebook library;
2. right Current Chat `Lorebooks` -> assignment sheet;
3. top `Codex` -> effective current-chat Lorebook workspace.

The top Codex:

- shows one effective Lorebook at a time;
- remembers the last viewed effective Lorebook per chat;
- offers a simple selector when more than one is effective;
- provides search;
- groups entries by type;
- supports Visual/Compact presentation;
- exposes Lorebook and Lore Entry editing.

The first editor pass already writes canonical fields instead of UI-only decoration. More of the old SnowBunny/Novelcrafter-style section suggestions and richer image management can layer onto the same stored document.

## Current Story Writer routing

`lore-retrieval.js` routes effective SnowBunny Lorebooks into the actual writer prompt through ST's extension-prompt mechanism. World Info scanning is disabled for this block.

Keyword mode currently supports:

- Enabled filtering;
- Always active entries;
- exact name/alias whole-word rescue;
- tag signals;
- scan-depth window;
- maximum matches;
- per-book character budget.

Selected entries serialize into directional native wrappers such as:

- `<character ...>`
- `<location ...>`
- `<concept ...>`
- `<faction ...>`
- `<event ...>`
- `<object ...>`
- generic `<entry ...>` fallback

Empty authored fields are omitted from the body.

The current routing receipt records selected Lorebook/entry ids, display names, match reason and retrieval mode for View Context.

## Meaning mode status

The dedicated SnowBunny semantic/vector index from the old app is **not fully ported yet**.

Until it is, Meaning mode does only:

- exact name/alias identity rescue;
- a clearly temporary lexical-overlap fallback over authored prose.

The routing receipt explicitly records that the semantic vector index is not ready. Do not describe that fallback as vector similarity.

The target remains the settled SnowBunny retrieval design: local embedding cache, passage splitting, semantic recent-history query, exact identity rescue, exact+semantic fusion, thresholds, limits and fitting.

## Linked Character/Codex dedup status

Stable Character <-> Codex Character shared-document identity and one-copy context dedup remain to be wired.

Until that identity bridge exists, do not infer linkage from matching names and do not claim Character entries are automatically deduplicated against ordinary Character cards.

## Why not World Info

Using ST World Info as canonical would lose or distort several SnowBunny requirements:

- Novelcrafter-style typed entries;
- canonical structured fields;
- linked Character authored-document identity;
- Keywords/Meaning retrieval choice with SnowBunny semantics;
- future vector cache/passages/fusion rules;
- Story-bound mandatory books + chat additions as SnowBunny ownership;
- SnowBunny import/export fidelity.

Therefore World Info stays an adapter/compatibility destination, not the internal truth.

## Direct-core-change budget

No new server endpoint was required for this first native store. The implementation deliberately reused ST's existing authenticated user-file API and kept SnowBunny's index in extension settings.

A briefly explored custom `/api/snowbunny` endpoint was discarded before being wired because the existing user-file machinery already provides the necessary durable per-user file primitive without another server API surface.

## Guardrails

Future work must not:

- silently migrate SnowBunny Lorebooks into World Info;
- store full Lorebook bodies in lightweight chat/global settings;
- treat viewing a different Codex book as changing assignment;
- let a chat locally disable Story-owned Lorebooks;
- deduplicate Character and Codex entries by display name alone;
- call the temporary Meaning fallback vector retrieval;
- mutate canonical authored entry text merely to fit display formatting.
