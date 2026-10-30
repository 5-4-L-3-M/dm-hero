# @dm-hero/app

## 1.8.0

### Minor Changes

- Story Board lanes: clusters sit in lanes by storyline, heat, region or status (or one lane for all). Drag a cluster into another lane to change its storyline / heat / place / status. Lanes fold, and cards pack tightly with no gaps.
- Compact switch: clusters show only their title and progress, so you can see and rearrange the whole board at once.
- Filter the board by storylines (click the storyline chips; "No storyline" included). Remembered per campaign.
- Next session is now a band across the top of the board: numbered, drag to reorder, click to edit, Run sheet button right there.
- Sparks look like a sticky-note shelf so they're easy to tell apart from planned beats.
- Clusters have "Who and what is involved". New beats in that cluster start with those entries plus the quest's involved ones; add or remove per beat. Also settable from the MCP (create_story_cluster entityIds).
- Beat, cluster and quest dialogs leave the side panel usable: no dark backdrop, they move left when the panel is open, and links inside them open in the panel.

### Patch Changes

- Quest board: dragging a quest to a new spot in its column sticks instead of snapping back.

## 1.7.4

### Minor Changes

- The side panel shows everything the editor's tabs hold, as foldable sections: images, a player's inventory (with quantities and what's equipped), linked NPCs, players, places, items, factions, lore and quests (each in its own section), NPC notes and documents. Folded sections stay folded.
- "Open full" opens a roomy read-only page of the entry with the same sections; "Edit" is its own button and is the only one that opens the editor.
- Twelve storyline colors per theme (was six), all readable on that theme's background.
- Right-click menu in the desktop app: spelling suggestions for red-underlined words (click one to fix it), "Add to dictionary", and cut / copy / paste / select all.

### Patch Changes

- Picking someone in a multi-pick list (who's involved in a quest, beat or world event; NPC classes) clears what you typed.

## 1.7.3

### Minor Changes

- NPCs in the side panel show everything at a glance: status and type chips, race, class, gender, age (with human age), current location and factions (clickable), then the description and every connection.
- The side panel's "Open full" button is now "Edit" (it always opened the editor).

### Patch Changes

- Fixed the app stalling while linking things or picking a location: the lists of places, NPCs, items and factions multiplied every connection against every other one, so a well-connected city took seconds to load — and while it did, everything else waited. Those lists now load in milliseconds.

## 1.7.2

### Minor Changes

- Human-equivalent age for NPCs and player characters ("Human age"), next to the real age. Shown as "Age 102 (human 27)" on NPC cards, the NPC view, the side panel and the player character header. Can be shared at the game table like the age.
- Type to create: in the pickers for items, NPCs, places, factions and lore (inventories, links, quests, Story Board beats and clusters), typing a name that doesn't exist offers "Create "…" as new …" — one click makes the page and selects it.
- NPC race and class pickers can be typed into; a race or class that doesn't exist yet is added to Reference Data.
- Text formatting guide: a button in the top bar (next to the language) shows how plain text turns into headings, bold labels, bullets and bold, with live examples.

### Patch Changes

- Card grids (NPCs, places, items, factions, lore, players) fit the space the page actually has: with the side panel open or a small window they drop to two or one across instead of squeezing names letter by letter.

## 1.7.1

### Minor Changes

- Quests: link the NPCs, places, items and factions involved ("Who and what is involved"). They show up as connections both ways, so the quest also appears on each of their pages. The AI connector can set them too.
- The quest side panel shows everything: status, storyline, giver, place, reward, who's involved, description, and objectives with a progress bar you can tick off.

### Patch Changes

- Story Board clusters fold and unfold reliably (they could get stuck folded).
- "Color by status" uses three colors that differ in every theme (Active and Dormant matched in Nocturne).
- Quest objectives in the edit dialog use the full row width.
- An open quest side panel updates when the quest is saved elsewhere.

## 1.7.0

### Minor Changes

- Story Board (new in the sidebar, near the top): plan in folding clusters of beats. Color the clusters by storyline, heat, region or status — storyline colors come from the active theme, and a legend says what each color means. Beats have a kind (scene, combat, social, reveal, hook, travel), a status, details with formatting, a place and linked entries; click any linked entry to open it in the side panel without leaving the board.
- Sparks shelf: catch loose ideas on the right and drag them into a cluster when they fit. Clusters and beats reorder by drag & drop.
- Next session tray and run sheet: plan beats for the next session with the calendar button, reorder them, then run the session from the Run sheet tab and mark beats played (logged to a session) or "not now".
- "Party is at": set the party's location to highlight the clusters near them (the place, what's inside it and what it's inside), or show only those.
- Quest board (new in the sidebar): rumors, active, completed, failed. Drag a quest between columns, filter by storyline, set giver, place, reward and objectives. Quests open in the side panel, where objectives can be ticked off.
- World tab: dated world events on the in-game calendar (new "World event" type, also in the calendar), split into coming up / already happened around today's in-game date.
- Faction agendas with progress clocks (4–12 segments, click to fill): on the World tab, in each faction's dialog (new Agendas tab) and in the faction side panel.
- AI connector: read the Story Board, add sparks and beats, move them, plan them for the next session, mark them played, create clusters and storylines, list/create/update quests, manage faction agendas and add world events.
- Story Board, quests and agendas are part of the campaign export and import.

### Patch Changes

- New sidebar entries slot in below their anchor in a saved sidebar layout instead of landing at the bottom.

## 1.6.7

### Minor Changes

- Clickable names: items in inventories, characters and other entries in relation lists, NPC faction badges and shop items open the entry. Inside a dialog it opens as a quick preview on top (with "Open as tab" and "Open full"); anywhere else it opens as a tab in the side panel.
- Player character details: race, classes with levels and subclasses (multiclass), alignment, background, patron god, homeland, phobia, age, height, weight, and AC / HP / speed / initiative / proficiency / passive perception. Set them in the player's details; cards, the player view and the side panel show them like the top of a character sheet. The AI connector can fill them in.
- Formatted text in the side panel and quick preview: short "Label:" lines and ALL-CAPS lines become headings, "Label: text" lines get a bold label, lines starting with - • ▸ become bullets, and **bold** / # headings work too.

### Patch Changes

- The NPC view's empty relations message is no longer in German.

## 1.6.6

### Minor Changes

- Entry tabs: the eye button on NPCs, places, items, factions, lore and players opens the entry as a tab in a side panel that stays open on every page. Click between tabs, close them with the ×, widen the panel, or hide it from the tab button in the top bar. Each tab shows the entry's details, documents and every connection — click a connection to open it as another tab. "Open full" still opens the full view with every tab. Quick-preview popups get an "Open as tab" button.
- Locations page: a view switcher between a tidier list and drill-down cards. The list has slimmer rows (the eye stays, everything else moved into a ⋮ menu), expand/collapse all, and a filter by type. Cards show one level at a time with a breadcrumb trail; click a place to go inside it.
- Carrying capacity bonus per player (in lb, can be negative), set in the player's details. It's added to Strength × 15, shown on the Inventory tab (e.g. "165 + 15 lb"), and the load bar's marks follow the real thresholds.
- AI connector: can link two entries that already exist (e.g. "Sif worships the Matron of Ravens"); the preview lists the links by name and flags ones that already exist. Player carry bonus is part of the connector's contract.

### Patch Changes

- Saving a player's details no longer drops extra details set elsewhere (for example by the AI connector).

## 1.6.5

### Minor Changes

- The quick-preview popup (map markers, pinboard, links) works without leaving the page: shops get a Shop tab right in the popup (selling to players included), and "Open full" opens the entity's full view with every tab on top of the page you're on.
- The dashboard's "+N more" pins line is now a button that goes to the full pinboard on the Sessions page.

## 1.6.4

### Patch Changes

- The quick-preview popup (pinboard, links, search) shows pictures at their real shape instead of cropping them into a wide strip, so square portraits keep their heads.

## 1.6.3

### Minor Changes

- Shop inventories: Shop, tavern and inn locations get a Shop tab. Each item has a name, short description, type, weight, cost (with an optional price note like "a sheet"), and stock. Copy items from your Items list or add custom ones; everything is editable.
- Purse: every character's Inventory tab has a coin purse (pp/gp/sp/cp, following your campaign's currencies) with a running total.
- Sell from a shop: the cart button adds an item to a player's inventory and takes the price out of their purse, making change the way a shopkeeper would. You can change the price (haggling) or skip the charge. Stock goes down, and custom items join your Items list the first time they're sold.

## 1.6.2

### Minor Changes

- Tags now lead somewhere: click a tag chip on a card and the page filters to everything with that tag (it adds `#tag` to the search box). Click more tags to narrow further.
- Tag suggestions while you type: start a word with `#` in any search box (NPCs, Locations, Items, Factions, Lore, Players and the global search) and pick from your existing tags with the arrow keys and Enter.

## 1.6.1

### Minor Changes

- Weight tracker: every character gets an Inventory tab with quantity, weight each, total and an "equipped" toggle. Weights are edited right in the table, and adding an item you already carry just raises the count.
- Carrying capacity from Strength (STR × 15) with the 5e encumbrance levels: encumbered above STR × 5 (speed −10 ft), heavily encumbered above STR × 10 (speed −20 ft, disadvantage), over capacity above STR × 15.
- Party load card on the Players page shows everyone's load side by side; click a character to open their inventory.
- New Units setting (Settings → Units): Imperial (lb, °F, miles) by default, or Metric (kg, °C, km). Item weights, weather and climate-zone temperatures and map scales follow it. Saved data doesn't change: weights stay in pounds and temperatures in °C underneath.

### Patch Changes

- Real-world dates (sessions, campaigns, images, notes) now use the app's language instead of always German, so months read "October" in English.
- The calendar's year-zero name follows the app language instead of always "Jahr 0".
- Editing a player's item link no longer wipes its quantity and "equipped" state.
- Updates for this build come from the 5-4-L-3-M/dm-hero fork.

## 1.6.0

### Minor Changes

- 1a88d4e: Show a map to your players with fog of war: reveal and cover with a brush, live on every player's device. Everyone can ping a spot on the map, and the DM can flash short notes.
- 47a14af: Game table: invite your players to the new player app (table.dm-hero.com) with a game code, personal PINs and a QR code, see who is online, and share NPCs, locations, items, lore and factions with them - live, with images, aliases and reveal moments. Everything is end-to-end encrypted: the player server only ever sees ciphertext, and new player devices need the DM's approval.
- e71b23a: Release 1.6 "Nocturne": new codename in the header, a "what's new" dialog, "New" badges for the game table and a clear pointer to the player app (table.dm-hero.com).
- 9922c7d: New theme "Nocturne (Moonlit Night)": midnight blue with moonlight silver, and a living night sky on the dashboard - crescent moon, aurora, twinkling stars and shooting stars.
- cc5d3a4: Arrange the sidebar: drag entries into your own order and add dividers ("Arrange navigation" at the bottom of the sidebar). Saved in DM Hero's database.
- d429990: Handouts: give documents (text or PDF) to all or chosen players, end-to-end encrypted per device. The game table page has a new "Shared" tab with everything that went out, each with "take back".
- 5d3bca7: Private messages between the DM and each player, end-to-end encrypted. Unread messages show up in the game table chip and on a new "Messages" tab.
- 0874e12: Players see today's in-game weather (active climate zone, else the general one) with a calm background animation.

### Patch Changes

- 0874e12: Headings no longer have an oversized gap above them.
- 87fc309: The "Show to players" button keeps its width when switching, so the map no longer jumps.
- d429990: Joined players see the name of the campaign (end-to-end encrypted like everything else).
- 123d376: An expired game can be reconnected without losing anything: players, PINs and everything shared stay, players join again with the new code.
- e12b46d: Type fixes across counts, calendar, import and map endpoints, plus a CI that runs lint, typecheck and unit tests on every pull request.

## 1.5.5

### Patch Changes

- 8711645: Search results on all entity list pages now respect the "show archived" toggle, and folder counts no longer include hidden archived entities.
- 77cc286: Fix random Docker crashes (`RemoveEnvironmentCleanupHook` assertion) by pinning the image to Node 24.18.0 until Node fixes its 24.19+ regression.
- ec24826: NPC search by location name now reliably finds all NPCs at that location (current location and links in both directions), and the chaos graph of a location shows entities that have it as their current location.
- 03380bb: Update dependencies (Nuxt 4.5.2, Vuetify 4.2.3, Vue 3.5.43, Electron 41.10.7 and more).

## 1.5.4

### Patch Changes

- 25ae730: Reword the 1.5 announcement: the AI integration is "improved optional AI support", not "AI does the whole job".

## 1.5.3

### Patch Changes

- 1fc1ce2: Pin the macOS release builds to the macOS 15 runner – code signing fails on the macOS 26 image.

## 1.5.2

### Patch Changes

- c53df2c: Raise the Node heap limit for `nuxt build` so the release build no longer runs out of memory on the macOS runner.

## 1.5.1

### Patch Changes

- dda9b90: Without an active campaign the sidebar now only offers "Choose a campaign" – campaign-bound entries are disabled instead of doing nothing. Release 1.5 "Bardic Inspiration" announcement dialog.

## 1.5.0

### Minor Changes

- a3613b6: MCP: an AI can now build a whole campaign from a module – images and documents for entities, sessions with summaries, groups, maps with markers and areas, encounters, reading entities back, archive/delete with preview, and a `what_can_i_do` overview. Bulk import resolves `{{ref:npc:1}}` cross-links in descriptions and warns about entities that already exist.
- f2c04ba: Add Italian, French and Spanish translations. The list of supported languages now lives in `types/locale.ts`; missing German keys were added and broken plural strings in the Chinese locale were fixed.
- b873740: Music player: play your own music library during the session. Pick a folder (native dialog in the desktop app), sub-folders become collapsible lists and can be starred as scenes. Two-channel crossfade, folder/track/all loop modes, shuffle, keyboard shortcuts, and a floating mini player that keeps playing while you navigate – draggable, with a queue popup, compact and minimized modes.
- dede6ec: Session music: attach playlist links (YouTube, Spotify, Tabletop Audio, …) to a session. They show as chips on the session card and open in the system browser, so the music keeps playing while you use DM Hero. In the desktop app all external links now open in the system browser instead of the app window.
- 4cad16e: New theme "Music (Sunset Beat)": retro sunset orange and magenta over deep stage blue, with music notes floating across the dashboard.
- 935c7c5: Add Simplified Chinese (zh-CN) localization.

### Patch Changes

- 6878a9e: Bug fixes reported via Discord:

  - Duplicate German location type labels ("Ebene", "Friedhof") in the type dropdown
  - Dashboard calendar widget always showed "sunny" instead of the active climate zone's weather
  - Weather generation now only generates for the selected climate zone (or global) instead of overwriting all zones
  - Clicking a linked entity in the calendar led to a 404 page
  - New stat template fields got duplicate default names and overwrote each other

- dca479f: Custom group colour: the hex field no longer closes on click (Electron). Replaced the popover with an inline hex input plus native colour picker.

## 1.4.2

### Patch Changes

- 7683ecf: fix: UI polish across entity views + 1.4 "What's new" dialog

  - calendar day columns are now equal width regardless of events/sessions
  - entity card action buttons wrap on narrow screens so the delete button is never clipped
  - players list grid aligned with the other entity pages (same column breakpoints)
  - folder cards match the entity-card width; folder name is smaller and stays single-line
  - item view now shows notes, consistent with the NPC view
  - added the 1.4 "What's new" announcement dialog (was still stuck on 1.3)

## 1.4.1

### Patch Changes

- 1a2c0a7: fix: the MCP server is now actually bundled in released builds and reachable at a stable path (#332). The release CI didn't build `@dm-hero/mcp` before packaging, so the shipped app showed "Connect your AI: not built". CI now builds the MCP before electron-builder on all platforms. Additionally, the bundled `mcp.mjs` is copied to userData on startup and that stable path is handed to the dialog — so on AppImage the registered `claude mcp add …` command no longer points at the per-launch `/tmp/.mount_*` directory and survives restarts.

## 1.4.0

### Minor Changes

- 3482ae9: feat: AI bulk-import via MCP (#321) — connect an external AI assistant (Claude, Cursor …) to DM Hero through a small stdio MCP server and let it fill a campaign for you. A self-describing contract endpoint tells the AI exactly what's possible (entity types, relation keys, per-type metadata, available races/classes/item types), so it can build valid payloads without the source. The AI can: list/create campaigns; search existing entities to get their ids; create NPCs/Locations/Items/Factions/Lore with tags, folders and relations; link new content to entities that already exist ("existing:<id>"); and edit existing entities (merge metadata, replace tags, move folder). Every write is strictly validated server-side and previewable as a dry-run before commit. The dashboard gains a "Connect your AI" dialog with copy-paste setup for common assistants, and the app shows a snackbar + refreshes its lists automatically after an AI import or edit (only for AI changes, never manual ones).
- 9a4fa7a: feat: climate zones for weather generation — per-campaign zones with temperature + weather-distribution profiles per season, a per-zone weather generator (zone A sunny while zone B rains on the same day), a zone view-switcher in the calendar, and zones drawn as circles on maps (lockable per circle, weather shown in the hover tooltip). Export/import carries zones, profiles, per-zone weather and map circles — fully backwards compatible (older exports import unchanged). Migration runner hardened against the dev double-init race.
- c0b3579: feat: emily teal "Deep Lagoon" theme (community tribute) with layered radial-gradient page background, coral-accented destructive actions, and a procedural distant-lightning easter egg on the dashboard (every 4–15 s, fresh bolt + branch each strike, screen-blend flash stays behind cards). Reduced-motion + animations toggle respected.
- b13ed45: feat: folders for NPCs, items, factions and lore — flat phase-1 UI on a nesting-ready schema, move menu, folder-open view with drag-pool, easter-egg hover animations (toggle in Settings), backwards-compatible export/import with silent `Name (1)` rename on collision
- 791a7c7: feat: tags for all entities with `#tag` search, color picker, batched store, and export/import preservation
- d28a327: feat: per-theme dashboard ambience (#322) — every theme now has its own fitting background animation on the dashboard. Seven themes use a parameterised particle field with distinct modes (rising embers/bubbles, falling dust, drifting motes, twinkling sparkles, fireflies, diagonal streaks), each in the theme's palette; the "emily" theme keeps its bespoke lightning (now a livelier cadence). All ambience sits behind the cards, is purely decorative, and is gated on the existing "Spielereien" setting + prefers-reduced-motion.
- 09bc84c: feat: upgrade to vuetify 4 with 7 themes, persistent theme switcher and reusable feature-tooltip bubble

### Patch Changes

- dcbccb3: fix: persist uploaded files in docker — `docker-compose.yml` and the dockerfile now use `/app/uploads`, which is where the server actually writes. previously uploads landed in a directory that was not the docker volume mount and were lost on container restart.
- 71d5356: fix: merge-import no longer wipes the target campaign's calendar when the import file carries an "empty" calendar (a default config row but zero months). Both the conflict check and the import step now share one guard (`hasImportableCalendar`), so a calendar is only deleted/replaced when the import actually has months. (#297)
- db60a50: fix: NPC search no longer drops the typed term when it fuzzily matches a race/class (#313). A 5-character query like "Baldu" fuzzily matched the class "barde" (Levenshtein 2) and replaced the search, so the NPC "Balduwan" was never found. Race/class/type expansion now ADDS its variants alongside the literal term prefix instead of replacing it, so name prefix matches always survive.
- ca00b6e: fix: show npc names and use correct id in the npc view relations tab (map api fields `related_npc_name` / `related_npc_id` instead of the non-existent `name` / `id`)
- f8f6041: feat: show a per-release codename in the header — each minor release gets its own name in its own font (1.4 = "The Summoning", Pirata One). Fonts are bundled locally (offline-safe).

## 1.3.4

### Patch Changes

- 6d8b5c0: chore: upgrade archiver to 8 (esm-only release, switched to named `ZipArchive` export)
- 40efe42: fix: drop pnpm version pin from ci workflows so it no longer conflicts with the packageManager field
- 1685eb2: chore: update dependencies across the monorepo, upgrade electron from 39 to 41, pin node 24 and pnpm 10.34

## 1.3.3

### Patch Changes

- 8997822: Linux: replace broken "Restart now" with "Show in folder" after auto-update download, since AppImage can't self-replace
- de575dc: chore: run unit tests against an isolated in-memory database instead of the dev DB

## 1.3.2

### Patch Changes

- b00ce9f: Linux AppImage wrapper for no-sandbox + v1.3 announcement dialog

## 1.3.1

### Patch Changes

- 4c203f1: Fix broken main.js and remove app.setName

## 1.3.0

### Minor Changes

- 232e28b: v1.3.0 release with archive, multi-class, Linux fixes

## 1.3.1

### Patch Changes

- 9995e4e: Fix broken userData path from app.setName

## 1.3.0

### Minor Changes

- 6c7df89: Add archive/unarchive functionality for all entity types
- 2d2f35b: Support multi-class and multi-type for NPCs with i18n search
- d1531ba: Show nested locations in chaos graph and improve relation labels
- 7609bd1: Add notes/info text field to NPC details tab
- ec0f25c: Add textarea field type to stat blocks

### Patch Changes

- d3d4449: Auto-backup database before update download
- 72f2e65: Preserve archived_at in export/import and add app version check
- dd37de4: Fix image not updating in dialog and card after upload
- 3cb595c: Fix Linux and Mac artifact names for auto-update downloads
- 09d751e: Fix Linux sandbox crash and improve icon handling
- f862c29: Fix hardcoded German relation type 'befindet sich in' → 'currentlyAt'
- 1863f94: Fix incorrect relation types between lore and players
- 52d53bf: Show linked NPCs and players in NPC preview dialog
- 0e239d2: Add ship icon for location type 'ship'

## 1.2.0

### Minor Changes

- af11147: Add encounter tracker with full combat flow: initiative, turn tracking, HP management, effects system, dice roller, and 49 unit tests (#247)
- 09293e9: Add multi-provider AI support: OpenAI + Google Gemini with model selection, shared abstraction, and no-text image rules (#249)
- a9668e7: Add stat block template system for NPCs and Players

  - Stat template CRUD with presets (D&D 5e, Pathfinder 2e, DSA 5, Splittermond)
  - Entity stats (assign, edit, change, remove) with all field types
  - Character sheet PDF upload/view/download
  - Export/Import support for stat templates and entity stats
  - Reference data editor with usage tracking and imported badge
  - Character sheets excluded from document counts

### Patch Changes

- cf641cb: Season name and background image are now required fields in calendar settings with validation
- 01d3ed4: Fix text formatting (newlines) being lost in view/preview dialogs
- 56e66ba: Minimize Linux Electron menu bar to match macOS (Edit + Help only)
- 32e9d4f: Add v1.2 welcome dialog announcement and fix missing hasStats in NpcCounts

## 1.1.3

### Patch Changes

- 0beeba9: Add macOS builds to release workflow (arm64 + x64, signed and notarized)

## 1.1.2

### Patch Changes

- 75c6090: fix: add missing 'knows' relation type to NPC_RELATION_TYPES
  fix: add missing 'letter' lore type
  fix: campaign import - calendar conflict detection, group deletion cascade

## 1.1.1

### Patch Changes

- 25250f1: Fix context menu and group functionality:
  - Fix: "Add to Group" in context menu now works correctly
  - Fix: "Create New Group" in context menu creates group and adds entity
  - Fix: Only one context menu can be open at a time
  - Fix: Group entity selection preserved when switching tabs
  - Fix: GroupCard can now be pinned
  - Fix: Player birthday saved to calendar on first save

## 1.1.0

### Minor Changes

- 2d78fdd: ### Features

  - Clickable count badges on entity cards - click to jump directly to the related tab (#214)
  - Character birthday with in-game calendar integration (#213)
  - Quick linking and quick create in dialogs (#208)
  - Item grouping for better organization (#205)

  ### Fixes

  - Fixed map marker placement - markers already inside location area are no longer moved
  - Improved session in-game date picker UX with checkbox pattern (#215)
  - Fixed state loss in entity details when adding relations (#212)
  - Optimized SQLite requests with parallel execution (#209)
  - Fixed Shadar-Kai translation (#206)
  - Fixed update checker download button (#202)
  - Improved calendar weather validation with reset option (#201)
  - Fixed chaos graph view/edit buttons (#198)

  ### Dependencies

  - Upgraded Nuxt to 4.3.0

## 1.0.2

### Patch Changes

- - Fix calendar weather generation validation - button now disabled with tooltip when calendar not configured
  - Add calendar reset functionality with linked data warnings
  - Add weather overwrite confirmation dialog
  - Fix electron-builder artifact naming for auto-updater

## 1.0.1

### Patch Changes

- 5454732: fix: improve image generation safety filter handling

All notable changes to this project will be documented in this file.

## 1.0.0

The first stable release of DM Hero - a personal D&D campaign management tool for Dungeon Masters.

### Core Features

- **Entity Management**: NPCs, Locations, Items, Factions, Lore, Players, Sessions
- **Fuzzy Search**: FTS5 + Levenshtein across all fields including linked entities
- **Bidirectional Relations**: NPCs know Lore, Lore shows NPCs
- **Entity Linking**: `{{npc:123}}` in Markdown for clickable badges with preview
- **Rich Markdown Editor**: Full formatting with entity links and syntax highlighting

### Campaign Tools

- **In-Game Calendar**: Configurable months, seasons, weather per day
- **Interactive Maps**: Upload world maps, place markers, link to entities
- **Chaos Graph**: Force-directed visualization of entity relationships
- **Session Management**: Track sessions with dates, notes, audio recordings

### AI Integration

- **DALL-E Image Generation**: AI portraits for entities and session covers
- **GPT Name Generation**: Context-aware name suggestions

### Platform Support

- **Desktop**: Windows (EXE/Installer) and Linux (AppImage) via Electron
- **Web/Docker**: Self-hosted deployment with SQLite database
- **Auto-Updates**: Built-in update checker with download notifications

### User Experience

- **Dark & Light Themes**: Fantasy-themed color schemes
- **i18n**: German and English language support
- **Local-First**: All data stored locally in SQLite
- **Export/Import**: Full campaign backup and sharing
