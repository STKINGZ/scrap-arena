# Scrap Arena

Server-authoritative Node.js + Socket.io arena shooter for 2–15 pilots. Includes Free-for-All, Team Deathmatch, shared zero-G physics, fifteen maps, anomalies, Scrap Overdrive, radar, parallax space, and neon impact effects.

## Run in VS Code

Open this folder and select Terminal → New Terminal:

```sh
npm ci
npm start
```

Open http://localhost:3000. If that port is busy on macOS/Linux:

```sh
PORT=3001 npm start
```

Open http://localhost:3001. Keep the terminal running; Control + C stops it. Other devices on your Wi-Fi use your computer's LAN IP and the same port. Allow Node.js through your firewall if prompted.

Updating an existing copy: replace server.js and the entire public folder, including physics.js. Restart the server and refresh every player tab. Package dependencies are unchanged.

## Rooms and controls

Enter a callsign, select Create a room, choose Free-for-All or Team Deathmatch, select a map, and confirm. Share the room code. The host starts with at least two connected pilots. Show Code reopens the invite popup. Leave Room immediately removes your pilot; host control transfers to another player. Unexpected disconnections retain a 15-second reconnect window. The host can end a match immediately or launch a rematch.

Desktop: Move the mouse to aim the ship at the cursor. WASD/arrows accelerate; left click fires, and Space fires Overdrive. Hold Shift or right mouse to display a laser sight. Touch: left stick accelerates, right stick aims/fires, Overdrive button fires the special shot. Releasing movement lets the ship drift and slow down.

## Scoring and Overdrive

Three-minute matches. Eliminations earn 100 points. Each scrap earns 10 points and adds one upgrade level: +5% base ship radius and +10% base bullet damage, capped at ten levels. Ships have 100 health and 20 base bullet damage. Destroyed ships drop three scrap plus half their upgrade count rounded down. Scrap expires after 15 seconds. Death preserves score, resets upgrades, and respawns after three seconds. The one-second shield ends on firing.

Overdrive spends exactly two upgrade levels to fire a radius-10, 50-damage shot at 960 units/second. Normal bullets use radius 4 and speed 640. The server validates player state, aim, cost, weapon cooldown, and bullet limits. Overdrive does not spend score.

FFA ties use eliminations, then fewer deaths, then shared victory.

## Team Deathmatch

Joining players are assigned to the smaller Red or Blue team, with a maximum of eight per team and fifteen total. In the lobby, the Switch Team button beside your own name swaps sides. Switching is server-validated, cannot target another pilot, and is locked once a match starts. Starting requires a connected pilot on each team.

Normal shots and Overdrive pass through teammates without damage. Server-created bullets carry their team identity; clients cannot choose a bullet's team, damage, or cost. Ships, bullets, roster rows, and effects use Red or Cyan team colors.

Team totals use the existing elimination and scrap points. Earned team points survive a pilot leaving. At results, higher team score wins; equal scores use team eliminations, then a draw. Team and individual totals reset on rematch. FFA scoring is unchanged.

The roster scrolls vertically to support fifteen pilots.

## Exact fifteen-map catalog

All maps are 2000×2000 with axis-aligned rectangular obstacles.

| Map | Layout |
| --- | --- |
| The Void | Empty space |
| Asteroid Belt | Scattered rectangular cover |
| Crossfire | Massive central cross |
| The Trenches | Three horizontal walls creating four lanes |
| Four Corners | Four corner strongholds |
| Event Horizon | One large central gravity well |
| Portal Kombat | Opposite-corner wormhole pairs |
| Gravity Pinball | Six scattered gravity wells |
| The Meat Grinder | Narrow central lane with outward-pulling wells near its edges |
| Swiss Cheese | Twenty seeded tiny walls |
| Bermuda Triangle | Three central black holes |
| Snipe City | Two segmented vertical walls with narrow firing gaps |
| Ping Pong | Left and right gravity wells |
| Peekaboo | Six walls with portals behind cover |
| Quantum Spaghetti | Walls, four gravity wells, and four portal pairs |

Seeded cover ensures identical layouts for every client and room. Portal exit clearance is tested for fully upgraded ships. The map picker has three columns (two on phones), internal scrolling, and a confirmation button outside the map grid.

## Shared physics and gravity

The authoritative server simulates at 30 Hz and broadcasts at 20 Hz. Client prediction imports the same public/physics.js module, runs fixed steps, and reconciles position and velocity. Thruster acceleration stays 600 units/second squared with a 0.95 velocity-friction multiplier each tick. Short substeps preserve rectangular collision checks and arena boundaries.

Ship and meteor gravity uses a pull radius 1.5 times each well's original radius, capped at 600 units. It is zero at and beyond this radius, falls off linearly, and is three times stronger before the combined 1710-unit acceleration cap. Bullet gravity retains its original 400-unit maximum radius and 570 cap. Core contact still deals 30 hull damage per second after spawn protection.

Ships and meteors use the stronger gravity; bullets keep their original gravity. Core contact retains the existing 30 hull damage/second after spawn protection. Environmental deaths drop scrap and count as deaths without giving another player a kill. Spawns avoid cover, gravity wells, portals, and nearby players.

Wormholes preserve velocity, exit beyond the destination rim, and use a 750 ms cooldown. Warp markers prevent interpolation across the arena. Overdrive cost, damage, radius, validation, and scoring remain intact.

## Visual effects and HUD

Full-screen camera follows the local swept-wing fighter. Left HUD shows scores, teams, and roster; destroyed rows dim until respawn. Right HUD shows map, four colored kill-feed slots, room code, and Leave Room. The host's End Match control is beside the timer.

The 800-unit circular radar shows nearby cover, scrap, pilots, anomalies, and arena bounds. Distant enemies get directional edge arrows; distant teammates do not masquerade as enemy arrows. Three parallax star layers, faint nebulae, and occasional shooting stars sit behind readable dark HUD panels.

Ships, lasers, and scrap glow. Engine flames render only while accelerating. Short movement trails and 500 ms spawn easing remain cosmetic. The respawn shield is a pulsing neon bubble. Server-confirmed bullet impacts create 3–5 short line sparks, including close-range hits that occur between snapshots. Death produces a fading 500 ms expanding shockwave. Local death or a successful Overdrive causes up to 5 pixels of camera shake for 300 ms. Effects use capped client-only particle pools and do not alter hitboxes or authority.

## Verification

```sh
npm test
```

Fifteen test groups cover real fifteen-player Socket.io rooms, the cap and reconnects, all fifteen map creations and exact names, layout bounds and portal clearance, combat/scoring, impact data, Overdrive cost/damage/hitbox, room controls, portals, gravity and core damage, shared browser/server drift, radar bearings, hard gravity cutoff and falloff, aggregate pull cap, escape under exaggerated overlapping gravity, balanced team assignment, lobby switches, friendly-fire immunity for normal shots and Overdrive, and persistent team points.

Rooms are held in server memory and reset on restart. Real-device and internet-latency playtesting remain useful for tuning game feel.

## Procedural sound design

All audio is generated in public/audio.js using the Web Audio API. No external audio files, network audio requests, or audio dependencies are used. AudioContext is created only after a trusted UI click, including Create Room, Join Room, buttons, and map/mode cards. Enter-to-join is also supported. Synthetic clicks and render/state updates do not initialize audio. Unsupported or blocked audio leaves the game playable. The HUD Sound On/Off control mutes smoothly and remembers the preference on that device.

The world-coordinate playAt helper applies inverse-distance attenuation, 1 / (1 + distance/240)^1.4, plus gentle horizontal stereo panning. Near sounds are strong; opposite-map sounds remain faint. Master gain and a dynamics compressor keep a busy fifteen-player arena under control. One-shot voices are capped, and audio graphs are disconnected after their envelopes and echo tails finish.

- Standard shots use a sharp noise transient, a rapid low-frequency pitch drop, and a distorted midrange tail for a punchy plasma crack.
- Overdrive uses a rising filtered-noise windup followed by distorted bass and a noise boom.
- Shield contact retains its high-frequency tink. Wall impacts use low-pass noise and a bass thud; hull impacts use high-pass metallic sizzle and sharp resonant tones. Classification follows authoritative impact positions and nearby cover/ship geometry without modifying the server.
- Destruction layers a heavy sub-bass drop, rapid digital square-wave shards, distorted band-pass noise, a bright white-noise splash, and filtered feedback echoes.
- Local active thrust adds a continuous sub-bass/noise rumble; it fades smoothly to silence while drifting.
- The nearest black hole uses detuned, slowly modulated sub-bass. Its hum and radar-like click are anchored to its coordinates. The click interval drops from approximately 1.8 seconds to 0.3 seconds as proximity increases, with distance attenuation and stereo panning.
- Local scrap collection produces an ascending chime. Consecutive pickups within two seconds rise by a semitone each (capped at one octave). Multiple pickups in one state update are lightly staggered so the reward chain remains distinct.

Combat sounds follow authoritative shot timestamps, impact IDs, and death transitions. This includes short-lived shots which disappear between snapshots and avoids replaying old sounds on reconnect. Shield contact is cosmetic: a swept proximity check generates a tink without changing the existing shield, bullet, or damage behavior. Pickup sounds follow the local collected counter. Continuous loops follow current acceleration input and predicted local position. Hidden/unfocused tabs, leaving, disconnecting, results, and muted audio fade or stop the scene's sound. No server or shared-physics changes were required.

The audio tests verify lazy context initialization, spatial gain, oscillator/noise/distortion/echo graph construction, bounded voices, graph cleanup, loop fading, state-event deduplication, increasing pickup pitches and their two-second reset, and immutable snapshots. Browser checks verify gesture unlock, mute/unmute, and a live match without game-side audio errors.

For this sound-only update, replacing the entire public folder and refreshing the browser is sufficient. Keep the new audio.js script with the other public files. To run the additional audio tests, also update audio.test.js and package.json from this archive.

## SFX v2 and dual-track music

Every button and dynamic map/mode card uses one capture-phase UI handler for a soft glassy sine/marimba tap. Label/input duplicate clicks are suppressed. Pointer and keyboard button activation work without adding gameplay input events.

Ship and bullet warp changes trigger a clean low-pass woop sweep with a low sine pitch bend; no crystalline or high-pitched portal chimes remain. All combat and environmental one-shots share the world-coordinate playAt helper. The audio listener follows the local camera; local teleports snap its listener to the new position. UI sounds and music are centered, while combat and anomaly sounds retain inverse-distance volume and gentle stereo direction.

Two distinct music tracks are synthesized into looping Web Audio buffers after user interaction: a relaxed 88 BPM lobby score and a rhythmic 132 BPM battle score. The map picker, lobby, and results use the lobby track. A live match crossfades to battle, and ending a round crossfades back. No external music files are required. Buffers and sources are reused, with a separate Music On/Off toggle and volume slider. The master Sound control silences all audio; Music can be muted independently. Preferences are stored locally. Hidden tabs fade music and scene audio.

The changed frontend source is public/audio.js, public/client.js, public/index.html, and public/style.css. Replace the entire public folder to update. Server and shared physics files are unchanged. Additional tests cover procedural music buffers, finite samples, track reuse and crossfades, music mute/volume, nearest-hole click timing, portal deduplication, and camera-based attenuation. The browser check confirms first-click unlock, music controls, the LOBBY/BATTLE label transition, and no game-side errors.

## Client refinement: strict audio radius and hold-to-aim

Only public/client.js, public/audio.js, and public/style.css change for this refinement. Server code, shared drift/collision physics, Socket.io event contracts, and index.html are unchanged.

A black-hole drone and its radar click can sound only while the local ship is strictly inside that hole's radius (distance < r). At the boundary and outside, the loop gain is set to exactly zero immediately, pending automation is canceled, and active radar-click voices are stopped. This check happens before the loop's 30 Hz update throttle, so crossing the radius cannot leak a fading hum or click tail. If several holes are present, the nearest containing hole is selected. Music and other environmental effects are unaffected.

Shots use a square oscillator dropping rapidly from 580 Hz to 42 Hz, a low sine punch, and a short white-noise transient. Portals use filtered noise and a low sine sweep through a low-pass filter: just a clean woop without the prior chime layers.

Without Shift or right-click, ship heading follows movement input first, then current velocity while drifting. A stationary ship retains its last heading. Holding Shift or right-click aims at the cursor and draws a subtle neon sight from the ship's nose to the cursor in world coordinates. Left click remains firing only; right click remains aiming only. Combined mouse-button presses work independently. Blur, pointer cancellation, leaving, and disconnection clear held controls. Context menus are suppressed in the room. Touch aiming retains its existing right-stick behavior.

The roster is now 184 px wide on desktop, with 11×12 px padding and 12 px player text. Phones use a 132 px panel and 11 px text. Team-switch controls and vertical scrolling remain available.

Additional tests cover exact black-hole silence at/outside the radius even between updates, selection among overlapping radii, square-wave shot envelopes, removal of portal chimes, movement and drift headings, Shift/right-click override, independent chorded mouse buttons, and context-menu suppression. The browser check confirms compact roster dimensions and updated control text.

To update, replace public/client.js, public/audio.js, and public/style.css, then refresh every player tab. No server restart or dependency install is required for these frontend-only files.

## Rendering optimization of your uploaded version

This release starts from the user-uploaded scrap-arena(1).zip, preserving its always-on mouse aiming, immediate fire input sends, deeper/louder black-hole thuds, 570 gravity cap, and stronger map pulls. server.js, public/physics.js, public/audio.js, public/index.html, and public/style.css remain byte-for-byte identical to that upload.

Runtime changes are limited to public/client.js:

- Build previous-player and previous-bullet lookup maps once per state update, then use them for interpolation. Warp and respawn checks remain intact.
- Skip expensive Canvas drawing for off-screen objects, with margins for glow, laser tails, shields, and labels. State updates, collision authority, remote snapshots, trail aging, and local prediction still run normally.
- Cache static black-hole glow textures by radius. Animated cores, gravity rings, portal effects, shields, stars, and sound remain active.
- Remove redundant full-screen clearing/filling before the existing opaque space background.
- Cache DOM elements and HTML output. HUD updates are keyed only on displayed state, so position-only packets do not rebuild scores, stats, feed, or results. Health, scores, deaths, team changes, timers, and connection state still update immediately.
- Avoid drawing the hidden arena behind the landing screen while music/menu behavior continues.

To update an existing copy of your uploaded version, replace only public/client.js and refresh all player tabs. No dependency installation or server restart is needed. The full archive also includes the unchanged server and physics in case you want a clean project copy.

`npm test` now runs 18 tests, including rendering checks for indexed snapshots, teleport/respawn snap behavior, immutable server snapshots, live HUD changes without unnecessary DOM writes, and continued local prediction with off-screen culling. `render-fixture.js` is a test-only fake DOM/Canvas harness and is never loaded by the browser. `benchmark-render.js` measures mock-renderer CPU/Canvas-command work; it is not a GPU or network benchmark.

See PERFORMANCE.md for the focused measurements and their limits.

## MP3 lobby and match music

Place your own interstellar.mp3 and space-theme.mp3 directly in public/. They are intentionally not included in this archive. index.html now includes the requested bgm-lobby and bgm-match audio elements with loop and preload="auto", without visible native controls.

The new ScrapAudio.MusicManager in public/audio.js handles native MP3 playback independently of the unchanged procedural SFX engine. The client no longer selects generated music tracks. Lobby/results use interstellar.mp3 at default volume 1.0; playing uses space-theme.mp3 with a hard 0.3 cap. Existing Music mute/volume controls can reduce either track, but can never raise match music above 0.3. A new MP3 volume preference defaults to 100%, so the old generated-music default does not accidentally lower the lobby track.

A 400 ms crossfade pauses the outgoing track once silent. The manager first calls play() only in a trusted click handler anywhere on the page (or the Enter-to-join gesture), priming both media elements silently for later phase changes. Before interaction it only records the desired phase. Browser rejections and missing files are caught and do not interrupt gameplay or cause a play() retry every frame. Another trusted click allows a retry. Hidden/unfocused tabs pause the tracks.

Install this update by replacing public/index.html, public/client.js, and public/audio.js, then adding the two MP3 files and refreshing every player tab. No dependencies or server restart are needed. Do not overwrite your MP3s when replacing the folder.

Twenty test groups now pass, including gesture-gated media playback, lobby/results volume, phase crossfades and outgoing pauses, a strict 0.3 match cap, mute, and blocked/missing-file handling. The browser check verifies both audio tags and a working room-creation flow with the files absent. Actual MP3 playback can be checked once your files are installed. Server code, shared physics, aiming behavior, procedural SFX, and rendering optimizations are preserved.


### Destructible space meteors

During matches, one meteor attempts to spawn every 1.5 seconds, up to 15 per room. Small rocks take one bullet hit and drop one scrap; large rocks take three hits and drop three scrap. Overdrive takes one rock HP per hit. Meteors share the ship friction, gravity and portal rules, bounce off cover and arena edges, and crumble instantly in black-hole cores. Grey radar dots mark nearby meteors. Rock damage and destruction use spatial procedural audio. Meteor farming awards points through the existing scrap collection rules, with no player kill credit. New rounds and lobby map changes reset the meteor field.


### Ship classes, collision damage and chat

Choose your class in the lobby or between matches. Class selection is server-validated and locked during play. All classes share 100 hull and the same circular collision radius, growing with upgrades.

| Class | Speed multiplier | Weapon | Magazine | Reload | Bullet speed | Base damage | Lifetime |
|---|---:|---|---:|---:|---:|---:|---:|
| Striker | 1.1 | Laser | 3 | 1s | 640 | 20 | 1.8s |
| Heavy | 0.65 | Flak Cannon | 1 | 1.5s | 360 | 55 | 1.8s |
| Scout | 1.55 | Rapid Blaster | 6 | 0.5s | 950 | 9 | 1.2s |
| Spread | 1.05 | Shotgun | 2 | 1s | 600 | 16 per pellet | 0.5s |
| Sniper | 0.9 | Railgun | 1 | 2s | 1800 | 45 | 1.6s |

Shotgun fires three pellets spanning 30 degrees per ammo. Sniper turns at 1.1 radians per second on both server and client; its railgun penetrates ships and meteors, damaging each entity at most once per projectile, but stops at walls. Overdrive still costs two upgrade levels and triggers a one-second standard weapon lockout, independent of ammo; Sniper Overdrive follows the actual barrel angle.

Shared ship acceleration is 1800 with 0.85 drag per 30Hz tick, multiplied by class speed. Velocity is capped at 340 times that multiplier. Wall contacts cost 2 hull, meteor contacts 3, and ship rams 10 to each vulnerable ship, with bounce and a shared 500ms collision damage immunity window. Spawn shields also protect against collision damage; bullets and black-hole damage retain their existing rules. Enemy ram eliminations use existing kill scoring; friendly rams do not grant teammate kill credit.

Press Enter to focus room chat, Enter again to send, or Escape to close the input. Chat is limited to 50 characters, five messages, and one message per 700ms per pilot. Names and messages are escaped in the UI. Gameplay controls clear while typing and on blur. The gear icon opens Sound, Music and volume controls. Background music continues when switching tabs, still requiring a first user interaction.


### Public rooms, exclusive colors and advanced maps

Create Room now offers Public or Private (default Private). The landing page Server Browser refreshes every five seconds and shows public rooms with their host, map, connected player count and phase. Click an open room to join without typing a code. Playing rooms are excluded entirely. Full lobby/results rooms remain visible with joining disabled. Private room codes are never returned in browser listings. The host can change Public/Private with the lobby visibility button before starting a match or from results; the server rejects changes from other pilots or during play.

The lobby has ten selectable neon swatches, claimed exclusively by server validation. Every pilot starts with a unique color, including in Team Deathmatch. Five reserved overflow colors keep all 15 slots unique when the ten swatches are occupied. Selected colors remain reserved during the existing reconnect window and are released on leaving or expiry. Team glow still uses Red/Cyan; each ship keeps its selected body color when changing teams.

The 19 anomaly, meat-grinder and new-chaos arenas now double their existing portal-pair and black-hole counts. Previously empty anomaly categories receive two pairs or holes. Added directed networks chain entrances through nextId links; existing pair-only layouts still work. The same shared teleport function handles ships, bullets, Overdrive and meteors, preserving velocity and the 750ms cooldown. Numbered portal labels show directed destinations. Exit areas are checked for maximum-size meteor clearance, while nearby wells demand evasive thrust without placing exits directly inside fatal cores.

All themed layouts gain deterministic extra cover except The Void, which remains empty. The sealed Panic Room and box interiors remain excluded from random spawns. Arena bounds, 30Hz server loop, class physics, weapon stats, audio mix, and the uploaded meteor health/Overdrive behavior are retained.


### Three-second launch sequence

Start and Rematch enter a server-controlled `starting` phase for 3000ms. Players spawn immediately, with all movement and weapons frozen until launch. Loadouts, maps, visibility changes and new joins are locked during this phase; reconnects still work. Starting rooms are excluded from the public browser. At launch the server grants the full 180-second match timer and one second of spawn protection.

Each launch shows a dark arena overlay with a server-clock-based 3–2–1 countdown and one stable, randomly selected phrase below it. The central controls are hidden during the countdown. A three-second procedural turbine spool plays once per launch after the existing audio interaction unlock. It uses a sawtooth oscillator, low-pass filter, linear 50–400Hz pitch sweep and linear gain rise, then fades and disconnects. No audio files or gameplay physics changed.


### Landing-page attract mode

The landing page runs a separate transparent Canvas animation with five local AI ships, one per class, and eight decorative destructible rocks. The ships choose nearby targets and use their class weapons. Decorative entities bounce off the viewport and the Create/Join panel. On a successful room join, all landing-page attract entities are cleared. The room lobby instead shows a dimmed, zoomed-out preview of the selected map, including its obstacles, portals and black holes, with six separate decorative AI ships. This preview clears when a match starts and does not affect multiplayer state. The landing-page scene starts fresh when returning to the landing page.

Ships and rocks use local elastic circle collisions with overlap correction, including rock-to-rock impacts. Impacts produce 5–8 short-lived sparks and a three-frame white flash. These effects never alter server state or multiplayer physics.

The room welcome and configuration panels share a centered flex wrapper with 24px spacing. Match HUD and countdown overlays remain available during play.

Landing-page text and controls sit above the decorative canvas. The attract and preview ships feature glowing cockpits, structural ribs, and speed-pulsed exhaust flames.

Playable ships use a shared 36-unit base collision radius, growing with upgrades, in server logic and client prediction. Their hulls use dark armored fills, color-lit cockpit and struts, glowing nodes, and thrust flames.


### Omega Beam

At levels 2–9, Space fires the existing 50-damage Overdrive blast for two levels. At level 10, Space instead consumes all ten levels and fires a three-second Omega Beam: a 40-by-1500-unit piercing beam dealing 2 damage per server tick and instantly destroying meteors. It respects team friendly-fire and spawn shields, awards normal kill credit, and can be seen by all players. Forward thrust is disabled while active; reverse and lateral thrust still work. Turning is slowed, and local beam, heavy-shot and high-damage camera shake do not affect server state.


### Red Alert and Supernova

The Omega Beam plays a spatial procedural crack and three-second roar. When 30 seconds remain, a three-cycle klaxon and pulsing red vignette signal Red Alert. Meteors spawn every 750 ms up to 30. At the normal timer expiry the game freezes in a two-second Supernova phase, then transitions to results. A white explosion starts at the actual arena center (1500, 1500), fills the display, and fades to the scoreboard; a procedural bass and filtered-noise explosion plays on entry. Match audio still requires initial user interaction. The host's existing End Match action continues to end the match immediately.

In Team Deathmatch, the Switch Team button appears above the pilot list in the lobby and on the results screen. Each player controls their own assignment before the next match. Teams remain limited to eight pilots, and changing teams after a match does not alter the completed match scores.
