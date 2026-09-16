# SnowBunny Pocket Phone Implementation Reference

This document is the Pocket Phone source-of-truth for the active SnowBunny project.

## Repository guardrail

The active project is **`Snowsearcher/SillyTavern`**, branch **`snowbunny-mobile`**. SnowBunny is a SillyTavern fork that runs through the Android launcher.

The old Flutter application is legacy reference material only. It can be consulted to recover an already-settled behavior, but Flutter architecture, widgets, storage assumptions and later experiments are not authoritative. When the old implementation and the settled SnowBunny contract disagree, this contract wins.

Do not add features to the Flutter app. Translate intended behavior into SillyTavern's existing state, generation, extension and UI architecture.

## Product contract

Pocket Phone is an in-story parallel interface. It is not another settings panel and it is not a substitute for the main Story Writer.

The home screen is built around:

- the current Persona / player identity;
- Story time;
- Inbox status;
- Messages;
- the Story's own public/social network;
- Settings;
- Gallery.

Opening, reading or browsing the Phone does **not** advance fictional time by itself.

Phone events may affect later story continuity when they actually happened. The Story Writer can receive relevant Phone continuity, but private Phone information is never automatically known by every Character.

The UI remains mobile-first. Do not turn Phone into a wall of tiny controls. Prefer a few clear views and contextual actions over permanent button rows.

## Story-specific public network

There is **no universal SnowBunny social app called Nightowl**.

Every Story owns its own public/social network identity. The AI designs that identity from the Story's setting, era, technology or magic, Scenario, Lore/Codex and established fiction, then keeps it stable for that Story.

Different Stories may naturally receive very different systems, for example:

- a short-post public stream;
- a threaded forum or community system;
- a friends/groups/community network;
- an image-first social system;
- a guild board, public notice network or rumor board in a low-tech setting;
- a magical, psychic, holographic or otherwise setting-native public medium;
- a hybrid when the fiction genuinely supports one.

The AI must not default every setting to a modern phone clone. A fantasy world may use a diegetic magical/public medium. A historical or low-tech world may use boards, notices or correspondence. A futuristic world can invent something native to that world.

The generated Story-level network identity includes:

- fictional network name;
- concise description;
- interaction mode (`microblog`, `forum`, `community`, `image`, `bulletin`, or `hybrid`);
- one allowed semantic stock-icon id;
- setting-appropriate terminology for the network's home/feed, posts, replies, profiles, spaces/groups, reactions, reshares, following and saved items.

The icon identity is semantic and stable. The current implementation renders those ids with Font Awesome fallbacks until dedicated SnowBunny image assets are added. Artwork can replace the visual without rewriting the saved fictional network identity.

Do not use real product names such as Reddit, X or Facebook unless that real service is explicitly part of the Story canon.

A Story's network identity is shared across that Story's chats. A stand-alone chat may have a local network identity instead of inheriting another Story's network.

The chosen mode must affect real structure and interaction. A forum should feel thread/board based; an image network should be image-first; a bulletin should feel like notices/sections. Renaming one generic feed is not sufficient.

## Public/social world

The public network should contain more than the current cast or current scene. Persistent background identities can include ordinary users, local media, businesses, fandoms, workplaces, organizations, guilds, clubs and other setting-appropriate accounts.

Persistent background identities belong to the Story where appropriate. Current activity remains branch-aware so one chat branch does not silently rewrite another branch's present.

The current venue or plot point must not dominate the network through repetitive pseudo-advertising.

A public post exists publicly, but the system must not assume every Character has read it.

Character/Codex actor identity is shared when available. The same fictional person must not become unrelated duplicate actors merely because they appear in Messages, Story context and the public network.

Existing public identities are canonical. Routine public-world generation may add activity or new plausible accounts, but it must not silently rename or replace an established account.

Public-world generation may use broad Story and Lore/Codex context to understand the setting. That writer context is **not** automatically public knowledge. Story-dependent public claims carry exact message evidence so edits, deletes, hides or swipes can invalidate them when the branch changes.

Public-world maintenance follows fictional Story progress and Phone Upkeep. Merely opening the public network does not advance time. Initial empty-network preparation may populate a bounded first view, but browsing is not a real-time background clock.

Do not add a generic "refresh reality" button that repeatedly manufactures new public events at the same Story moment. Explicit manual maintenance can be reconsidered later only if it has a clear continuity rule.

## Player public activity

The player may have a public profile and may publish public posts/replies when the Story's generated network supports those concepts.

Public profile presentation is separate from the Persona's canonical Character/personality data. Editing a display name, handle or bio must not rewrite the Persona or private contacts.

Publishing public activity records a public Phone action at the current Story anchor/time. It does not advance Story time by itself.

Mode-specific requirements matter. For example, a forum thread or bulletin notice may require a title/space where a microblog post would not.

## Contact acquisition

A Character appearing in the story, existing in a Lorebook, or having a public profile does **not** automatically make them a private contact.

A contact becomes available only when the player's Persona actually acquires private contact access in established story evidence, such as:

- an explicit exchange of numbers/contact details;
- an already-established private route the Persona is shown to possess;
- a Character actually sharing private contact access.

Discovery carries exact source evidence tied to stable SnowBunny message identity. Name matching alone is never sufficient.

A public profile is not a universal permission to DM. If a generated network later supports public-to-private messaging, that capability must be modeled explicitly rather than assumed for every setting.

## Private Messages

Private Messages are a separate fictional conversation surface.

Required behavior:

- multiple separate text bubbles when the Character would naturally split a thought;
- silence is a valid response;
- unanswered messages may remain pending;
- incoming messages may remain unread until the user opens the thread;
- proactive contact is optional, occasional and motivated;
- availability follows fictional Story time and established circumstances, never elapsed wall-clock time;
- invitations, travel plans and promises remain active continuity until Story events resolve or cancel them;
- saying that somebody is coming over does not teleport them into the main scene.

`privateState` is a concise continuity note for that Phone actor. It is support context, not a Story Memory and not something the Character must reveal.

## Texting-style boundary

Texting preferences are **writing conventions only**.

They may affect spelling, capitalization, punctuation, abbreviations, vocabulary habits, emoji/text-face use, typical message length and how a thought is split into separate messages.

They may **not** manufacture personality, mood, flirting, hostility, teasing, knowledge, goals or relationship behavior. Those come from canonical Character/Codex authoring plus the actual conversation and circumstances.

If imported legacy preferences mix behavioral instructions with formatting conventions, only the writing convention is honored.

Presentation metadata is likewise display-only and cannot secretly alter Character identity or knowledge.

## Knowledge boundary

The Phone writer may receive broad Story context for consistency, but each fictional person knows only what they plausibly learned.

An absent Character cannot automatically:

- see the current main scene;
- read somebody else's private DM;
- know hidden thoughts;
- learn a secret merely because it exists in Lore, Tracker or writer context;
- know the player's current location unless that information was established for them.

A visitor uses the destination/address they plausibly know. Story Writer knowledge cannot silently correct their private knowledge.

## Story ownership vs chat ownership

Preserve this split unless a later explicit sharing rule changes it:

- Story-level: generated public-network identity; persistent background public identities; reusable Story/world presentation or artwork where appropriate.
- Chat-level: private contacts; message threads; pending discoveries; current Phone settings; branch-specific public activity/current state where chronology can diverge.
- Shared actor identity links the same Character/Codex person across surfaces without making private state global.
- Imported artwork does not create contacts or silently wire fictional relationships.

## Gallery and media

Photos/voice are proposals first, not automatically delivered facts.

A media request becomes factual Phone evidence only after fulfillment is ready. Settings gate whether photo or voice proposals are allowed.

Gallery shows delivered Phone media.

The fuller artwork system still needs to restore Profiles & pictures, Artwork folders, image-bundle import, Character/profile picture assignment, Story-network app-image assignment and reusable background/profile artwork without inventing social relationships.

## Memory and context routing

Story Writer may receive selectively relevant factual Phone continuity and gets an explicit knowledge boundary. View Context records the Phone material that actually reached the request.

Memory Maker may use actual delivered Phone events as factual evidence when sharing/consent allows it. It must not treat `privateState`, Tracker inference or undelivered media proposals as historical events. Accepted Memory stores exact Phone evidence fingerprints for validation.

Memory Recall may use Phone continuity as a relevance hint only. Phone hints cannot create or rewrite historical Memory facts.

## History mutation safety

Phone-derived continuity is tied to stable SnowBunny message identities and Story anchors.

Editing, deleting, hiding or swiping Story history must not leave invalid derived Phone facts feeding future generation. Historical data may remain recoverable/readable, but invalid branch-derived material is excluded from current evidence/routing until rebuilt or re-established.

## Implemented on `snowbunny-mobile`

- authenticated chat-specific Phone state store;
- stable Character/Codex/custom actor identities;
- Story anchors and evidence fingerprints;
- Messages/contact/profile/post/action data models;
- pending/unread private thread state;
- Story-time-aware private reply generation;
- silence and proactive-reply semantics;
- texting-style/presentation boundary;
- separate private-reply and upkeep output limits;
- photo/voice proposal gating;
- factual Phone evidence projection;
- Memory Maker Phone evidence + fingerprint validation;
- Memory Recall Phone relevance hints;
- selective Story Writer Phone routing with knowledge boundary;
- per-reply Phone View Context receipt;
- native Phone dashboard with Persona, Story time and Inbox;
- native Messages list/thread/composer;
- native Settings for functional Phone controls;
- native Gallery for delivered Phone media;
- composer Phone quick action when Phone is enabled;
- evidence-backed automatic contact discovery;
- Pocket Phone Upkeep tied to completed Story replies and fictional Story time;
- proactive-contact selector that may choose nobody;
- Story-specific public-network identity designer;
- Story-level saved network name, mode, terminology and semantic icon identity;
- mode-specific public UI for streams, forums/threads, communities, image-first networks, bulletins and hybrids;
- generated terminology carried into public tabs/actions rather than one fixed modern vocabulary;
- Story-persistent background public accounts;
- public-world generation/maintenance with strict public-knowledge boundaries;
- Character/Codex actor linking for public profiles;
- source-evidence validation for Story-derived public activity;
- follow, react, save, public profile and thread interactions;
- public post/reply composer with mode-specific validation;
- editable player public profile presentation;
- regression checks for social schema, mode normalization and Story ownership;
- native `social` Phone view; legacy `Nightowl` survives only as a compatibility alias for older callers.

## Still required for full Phone parity

Do not mark Pocket Phone complete until these are real and tested:

- Profiles & pictures management for public/private Phone identities;
- Artwork folders and image-bundle import;
- Character/profile picture assignment and reusable Story artwork;
- dedicated stock social-app image assets replacing temporary Font Awesome visual fallbacks;
- full media request fulfillment pipeline for generated photos/voice;
- richer public-network interactions only where they make sense for the generated mode (for example reshare/quote behavior if supported by that network), without turning the UI into a permanent button wall;
- efficient long-feed handling/paging for large public histories;
- user-facing review/status for stale branch-derived Phone material;
- final quick-tray integration once the shared composer extension tray replaces isolated quick actions;
- narrow/mobile and true-device visual validation.

Implement these from the contract above and the original SnowBunny discussions. Legacy Flutter code can answer "how did we once attempt this?" It does not answer "what should SnowBunny be?"
