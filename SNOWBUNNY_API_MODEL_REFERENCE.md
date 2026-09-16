# SnowBunny API + Model Reference

This document records the settled direction for API/provider management and model selection in the SnowBunny SillyTavern fork.

## Core rule

Use SillyTavern's mature API/provider/model machinery as the backend source of truth. Do **not** port old SnowBunny's standalone `ConnectionEntity` / `CompatibleApi` / credential-vault stack as a second competing API system.

SnowBunny should replace the experience around that machinery, not duplicate it.

The old SnowBunny API/model implementation can still teach us which **behaviors** were useful, such as searchable catalogs, favorites/pins, provider identity and a quick phone-sized model selector. Its actual API/model UI was itself clumsy, confusing and visually poor. Do **not** use the old SnowBunny API/model screens as the visual or structural design baseline.

## Neither old UI is the frontend baseline

Reuse of SillyTavern here means **backend/provider machinery only**. Its existing API and model-management interface is not a design target for SnowBunny.

Likewise, the old SnowBunny API/model frontend is not a design target either. Snow explicitly considers that UI unsuccessful. Preserve useful capabilities, not its screen composition, card treatment, information hierarchy or settings flow.

The new API/model experience must be designed fresh in the same polished mobile-first visual language as the rest of the rebuilt frontend, informed primarily by the settled SnowBunny/Tavo interaction direction and the quality bar established for the new app.

Use deliberate cards/sheets, large touch targets, clear hierarchy, search, favorites, smooth navigation, relevant fields only, and no wall of implementation controls.

## What current SillyTavern already gives us

Current SillyTavern supports a broad provider matrix under its API/Chat Completion machinery, including OpenAI, custom OpenAI-compatible endpoints, Claude, OpenRouter, Google, Mistral, Cohere, Perplexity, Groq, Chutes, NanoGPT, DeepSeek, xAI, Fireworks, Z.AI, SiliconFlow, MiniMax and others, plus its non-Chat-Completion API families.

Its model pipeline already handles provider-specific model lists and capabilities rather than treating every model as a raw string. For example, current NanoGPT/OpenRouter handling supports model sorting/grouping, provider routing, pricing/context metadata where supplied, and capability checks such as vision.

SillyTavern also already ships a built-in **Connection Profiles** extension. A profile can capture and apply API, server URL, model, secret, proxy and other provider-related settings. It can also capture unrelated things such as presets and Regex, which SnowBunny must handle carefully rather than blindly applying everything.

## Do not create two truths

Future implementation must avoid this old failure mode:

- SnowBunny UI stores one model/connection choice;
- SillyTavern internally has another active provider/model;
- the UI looks correct but generation sends something else.

There must be one authoritative path from the SnowBunny selector to the actual SillyTavern generation request.

Changing a SnowBunny connection or model must change the real SillyTavern provider/model state used by generation. View Context should record the actual provider/profile/model applied for that reply.

## Top API workspace

The top-menu **API** destination is global management, not the quick writing selector.

It should expose a newly designed SnowBunny connection library while wrapping SillyTavern's provider/secret/model infrastructure.

Normal flow:

1. Open API.
2. See saved connections/profiles in a clean mobile library.
3. Add or edit a connection.
4. Choose the provider/API family.
5. Enter only the fields actually required by that provider.
6. Connect/test using SillyTavern's real connection path.
7. Load/refresh the provider's real model catalog where supported.
8. Browse/favorite models.

OpenAI-compatible providers should remain especially simple: endpoint/base URL, key/secret, connect/test, then use the discovered model list. Manual model ID remains an advanced/fallback path when an endpoint cannot enumerate models.

Do not flatten all SillyTavern providers into fake OpenAI-compatible connections. Preserve provider-specific support when SillyTavern already has it.

## Connection Profiles integration

Use SillyTavern's Connection Profiles machinery as the main reusable basis for saved connection state rather than recreating profile application from scratch.

However, SnowBunny's ordinary connection profile must not silently switch unrelated writing systems.

In particular, selecting a connection/model from SnowBunny must **not** unexpectedly change:

- SnowBunny Preset / prompt modules;
- Regex preset/rules;
- Scenario;
- Agents;
- CYOA;
- other current-chat fiction systems.

The Connection Profiles implementation can store/apply more than connection data, so the SnowBunny adapter must either exclude those unrelated profile fields or apply only the connection/provider subset needed for the selected backend.

Connection-oriented state includes things such as API/source, server URL where applicable, model, secret/key reference, proxy/provider-routing state and provider compatibility settings that are genuinely required to make that backend work.

Prompt/preset and Regex ownership stay with their dedicated SnowBunny systems.

## Right-drawer Model row

The right-drawer **Model** row is the fast current-chat writing selector. It is intentionally separate from the top API manager.

Tap Model -> polished phone-sized selector sheet.

Normal presentation:

- currently selected model is obvious;
- favorites/pinned models first;
- provider/connection identity visible but quiet;
- search across available models;
- browse the full catalog when needed;
- pin/unpin without leaving the picker;
- tap a model to select it;
- no requirement to manually type a codename during normal use.

These behaviors were useful in the old app, but the old `ModelPicker` layout itself is not to be copied. Rebuild the selector in the new frontend's visual language.

Favorites are connection/provider-level user preferences, not chat-specific fiction state.

## Per-chat selection versus global API management

API connections, provider credentials and model catalogs are managed globally.

The chosen writing connection/model remains **chat-specific**, consistent with the settled right-drawer architecture. Story does not own API/model defaults.

Implementation should store the chat's selected SnowBunny connection/profile identity and selected model identity in chat-owned metadata. Before generation, the SnowBunny adapter must activate/apply the corresponding real SillyTavern connection/model state, then generate.

Switching chats should therefore restore the selected connection/model for that chat without inventing Story inheritance.

This is separate from AI Response Configuration/model controls: those sampling/generation controls are global, as settled elsewhere.

## Model catalog

Do not throw away SillyTavern's richer model information.

Where a provider supplies it, the SnowBunny model browser may use:

- model ID/name;
- provider/vendor grouping;
- context length;
- pricing metadata;
- capability badges such as vision;
- provider-routing availability;
- any other reliable metadata already exposed by SillyTavern.

The normal picker should stay visually clean. Rich metadata can appear as small secondary text/badges or in a model detail sheet rather than turning every row into a spec table.

For very large catalogs such as NanoGPT/OpenRouter, search and favorites are essential, not optional polish.

## API screen visual direction

Design this surface fresh. Do not reuse either SillyTavern's desktop API drawer or the old SnowBunny API/model screens as a visual template.

The rebuilt version should follow the same polished frontend language as Characters, Codex, Agents, Scenario and the rest of SnowBunny:

- large touch targets;
- clear, attractive connection cards/rows;
- provider icon/name and useful status;
- obvious Edit / Models routes;
- simple add-connection flow;
- searchable model library with favorites;
- advanced provider-specific fields only when relevant;
- no wall of unrelated selectors;
- smooth sheets/transitions consistent with the rest of the app.

For OpenAI-compatible connections, the useful behavioral idea remains a simple sequence of endpoint/base URL -> key -> test/connect -> discovered models. That does not imply copying the old screen's layout or styling.

## Secrets / keys

Use SillyTavern's existing secret/key handling. Do not create another SnowBunny credential store unless a later implementation constraint proves it necessary.

The frontend should display safe states such as `Key saved`, `Key needed`, or provider-specific connection errors without exposing the secret itself.

## Reliability guardrails

Future implementation must verify, with generation/request inspection rather than only UI state, that:

- selecting a model actually changes the model sent to the provider;
- switching connection profiles actually changes the API/source used;
- saved selections survive restart/reopen;
- switching chats restores the correct chat-owned model/profile;
- preset/Regex do not get silently changed by a connection switch;
- failed profile application does not leave the UI claiming a different model than the generation backend;
- View Context records the actual provider/profile/model used.

This reliability is more important than reproducing the old SnowBunny connection implementation literally.

## Guardrails

Do not:

- build a second API stack beside SillyTavern's;
- reduce SillyTavern's provider support to OpenAI-compatible only;
- make ordinary model selection require manual IDs;
- put full API/key management in the right drawer;
- move model selection to Story ownership;
- let Connection Profiles silently switch Preset or Regex when the user only selected a model/connection;
- lose favorites/search for large catalogs;
- trust only what the selector displays; generation must use the same authoritative state;
- reuse SillyTavern's current desktop API/model UI as SnowBunny's frontend;
- reuse the old SnowBunny API/model UI as SnowBunny's new frontend;
- treat an old screen as a design baseline merely because some of its behaviors were useful.
