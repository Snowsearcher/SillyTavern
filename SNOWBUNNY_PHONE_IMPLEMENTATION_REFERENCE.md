# SnowBunny Pocket Phone Implementation Reference

This document records the Pocket Phone contract for `snowbunny-mobile`, based on the recovered SnowBunny handoff source and the settled Phone discussions. It is both a parity checklist and an implementation guardrail.

Primary recovered source reviewed:

- `SNOWBUNNY_HANDOFF/source/app/lib/chat/phone_engine.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/chat/phone_evidence.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/chat/phone_world.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/chat/phone_design.dart`
- `SNOWBUNNY_HANDOFF/source/app/lib/chat/phone_tools.dart`
- prior Phone dashboard / SnowBunny planning material covering Messages, Story-specific social media, Settings, Gallery, Story time, contact acquisition, upkeep and artwork/profile behavior.

## Product contract

Pocket Phone is an in-story parallel interface, not another settings panel and not a substitute for the main Story Writer.

The home screen is built around:

- the current Persona / player identity;
- Story time;
- Inbox status;
- Messages;
- the Story's own public/social network;
- Settings;
- Gallery.

Opening, reading or browsing the Phone does **not** advance fictional time by itself.

Phone events may affect later story continuity when they actually happened. The Story Writer can receive relevant Phone continuity, but private phone information is not automatically known by every character.

## Story-specific social network

There is **no universal SnowBunny social app called Nightowl**.

Every Story owns its own public/social network identity. The AI designs that identity from the Story's setting, era, technology or magic, Scenario, Lore/Codex and established fiction, then keeps it stable for that Story.

Different Stories may naturally receive very different systems, for example:

- a short-post public stream analogous to a microblog;
- a threaded forum/community system analogous to a Reddit-like structure;
- a friends/groups/community network analogous to a Facebook-like structure;
- an image-first social system;
- a guild board, public notice network or rumor board in a low-tech setting;
- a magical, psychic, holographic or otherwise setting-native public medium;
- a hybrid when the fiction genuinely supports one.

The AI must not default every setting to a modern phone clone. A fantasy world can have a diegetic magical/public medium. A historical or low-tech world can use boards/notices/community correspondence. A futuristic world can invent something native to that world.

The generated Story-level network identity includes:

- fictional network name;
- concise description;
- interaction mode (`microblog`, `forum`, `community`, `image`, `bulletin`, or `hybrid`);
- one allowed stock icon id;
- simple terminology for feed/home, posts, replies, profiles and communities.

The icon is selected from SnowBunny's stock icon catalog. The current implementation uses Font Awesome fallbacks for those semantic icon ids until the dedicated stock image assets are added. Later artwork can replace the fallback without changing the saved network identity.

Do not use real product names such as Reddit/X/Facebook/etc. unless that real service is explicitly part of the Story's canon.

A Story's network identity is shared across that Story's chats. A stand-alone chat may have a local network identity rather than inheriting another Story's network.

## Contact acquisition

A Character appearing in the story, existing in a Lorebook, or having a public social profile does not automatically make them a private contact.

A contact becomes available only when the player's Persona actually acquires contact access in established story evidence, such as:

- an explicit exchange of numbers / contact details;
- an already-established number the Persona is shown to possess;
- a Character actually sharing a private contact route.

Discovery must carry exact source evidence tied to stable SnowBunny message identity. Name matching alone is never sufficient.

Character / Codex shared identity is used when available so the same fictional person remains the same actor across Messages, the Story's public network and Story context.

## Private Messages

Private Messages are a separate fictional conversation surface.

Required behavior:

- multiple separate text bubbles when the Character would naturally split a thought;
- silence is a valid response;
- unanswered messages may remain pending;
- incoming messages may remain unread until the user opens the thread;
- proactive contact is optional, occasional and motivated;
- availability follows fictional Story time and established circumstances, never elapsed real-world time;
- invitations, travel plans and promises remain active continuity until Story events resolve or cancel them;
- saying that somebody is coming over does not teleport them into the main scene.

`privateState` is a concise continuity note for that Phone actor. It is support context, not a Story Memory and not something the Character must reveal.

## Texting style boundary

Texting preferences are **writing conventions only**.

They may affect:

- spelling;
- capitalization;
- punctuation;
- abbreviations;
- vocabulary habits;
- emoji / text-face use;
- typical message length;
- how a thought is split into separate messages.

They may **not** manufacture personality, mood, flirting, hostility, teasing, knowledge, goals or relationship behavior. Those come from canonical Character/Codex authoring plus the actual conversation and circumstances.

If an imported old preference mixes behavioral instructions with formatting conventions, only the writing convention is honored.

Phone presentation metadata is likewise display/presentation only and cannot secretly alter Character identity or knowledge.

## Knowledge boundary

The Phone writer may receive broad Story context for consistency, but each fictional person knows only what they plausibly learned.

An absent Character cannot automatically:

- see the current main scene;
- read somebody else's private DM;
- know hidden thoughts;
- learn a secret merely because it exists in Lore / Tracker / writer context;
- know the player's current location unless that information was established for them.

A visitor uses the destination/address they plausibly know. Story Writer knowledge cannot silently correct their private knowledge.

## Public/social world

The public network should contain more than the current cast or current scene. Persistent background accounts can include ordinary users, local media, businesses, fandoms, workplaces, organizations, guilds, clubs and other setting-appropriate identities.

The current venue or plot point must not dominate the network through repetitive pseudo-advertising.

A public post exists publicly, but the system must not assume every Character has read it.

The same actor may have both private Messages and public social activity while retaining one stable fictional identity.

The chosen Story network mode affects presentation and terminology. Forum-like Stories should be able to feel thread/community based; microblogs should feel like streams; community networks should emphasize people/groups; fantasy/low-tech networks should not be forced into modern terminology.

## Story ownership vs chat ownership

The recovered design distinguishes reusable Story/world presentation from current-chat communication state.

Direction to preserve:

- the social-network identity is Story-level;
- persistent background social identities and reusable presentation/artwork can be Story-level where appropriate;
- private contacts, message threads, pending discoveries and current Phone settings remain chat-specific unless a later explicit sharing rule says otherwise;
- imported artwork does not automatically create contacts or silently wire identities.

## Gallery and media

Photos / voice are proposals first, not automatically delivered facts.

A media request only becomes factual Phone evidence after its status is fulfilled/ready.

Settings gate whether photo or voice proposals are allowed.

Gallery shows delivered Phone media. The fuller old artwork system still requires:

- Profiles & pictures;
- Artwork folders;
- image-bundle import;
- Character/profile picture assignment;
- Story-network app icon assignment;
- reusable background/profile artwork without inventing social relationships.

## Memory and context routing

Story Writer:

- may receive selectively relevant factual Phone continuity;
- gets an explicit knowledge boundary;
- View Context records the Phone material that reached the request.

Memory Maker:

- may use actual delivered Phone events as factual evidence when sharing/consent allows it;
- must not treat `privateState`, Tracker inference or undelivered media proposals as historical events;
- accepted Memory stores the exact Phone evidence fingerprints used for validation.

Memory Recall:

- may use Phone continuity as a relevance hint only;
- Phone hints cannot create or rewrite historical Memory facts.

## History mutation safety

Phone-derived continuity is tied to stable SnowBunny message identities and Story anchors.

Editing, deleting, hiding or swiping Story history must not leave invalid derived Phone facts feeding future generation. Historical data may remain recoverable/readable, but invalid branch-derived material is excluded from current evidence/routing until rebuilt or re-established.

## Current implementation

Implemented on `snowbunny-mobile`:

- authenticated chat-specific Phone state store;
- stable Character/Codex/custom actor identities;
- story anchors and evidence fingerprints;
- Messages/contact/profile/post/action data models;
- pending/unread private thread state;
- Story-time-aware private reply generation;
- silence and proactive-reply semantics;
- texting-style/presentation boundary restored from old behavior;
- separate private-reply and upkeep output limits;
- photo/voice proposal gating;
- factual Phone evidence projection;
- Memory Maker Phone evidence + fingerprint validation;
- Memory Recall Phone relevance hints;
- selective Story Writer Phone routing with knowledge boundary;
- per-reply Phone View Context receipt;
- native Phone dashboard with Persona, Story time and Inbox;
- native Messages list/thread/composer;
- native public-social display over stored profiles/posts;
- native Settings for currently functional Phone controls;
- native Gallery showing delivered Phone media;
- composer Phone quick action when Phone is enabled;
- evidence-backed automatic contact discovery from completed Story replies;
- Pocket Phone Upkeep tied to completed Story replies and fictional Story time;
- proactive-contact selector that may choose nobody;
- Story-specific social-network identity designer;
- Story-level saved network name/mode/terminology/stock-icon choice;
- semantic stock-icon catalog with temporary Font Awesome visual fallbacks;
- compatibility bridge that replaces the old temporary `Nightowl` label in the current Phone UI with the generated Story network identity.

## Still required for full parity

Do not mark Pocket Phone complete until these are real:

- public social-world generation/maintenance using the Story-specific network mode;
- Story-persistent background public-network users;
- mode-specific public UI: forum/thread/community vs stream vs image/network vs bulletin/fantasy presentation;
- profile/picture generation and management;
- Profiles & pictures / Artwork folders / image-bundle import;
- actual stock social-app image assets replacing temporary icon fallbacks;
- richer public-network profile/feed/thread interactions;
- full media request fulfillment pipeline for generated photos/voice;
- user-facing review/status for stale branch-derived Phone material;
- final quick-tray integration once the shared composer extension tray replaces isolated quick actions;
- narrow/mobile and true-device visual validation.

These missing pieces should be implemented from the recovered contract above rather than improvised from one fixed modern social-media app.