# +1 Speed Wheel Chair Escape — client

React + React Three Fiber + Rapier, Bloxity SDK for login/avatars, Colyseus for multiplayer.

## Run locally

```bash
# terminal 1 (server repo)
npm start
# terminal 2 (this repo)
npm install
npm run dev          # http://localhost:5173  (.env.development points at ws://localhost:2567)
```

## Controls

| Key | Action |
| --- | --- |
| W / S | Drive forward / back |
| A / D | Turn (camera follows) |
| Space | Jump |
| E | Interact (buy chair, hatch egg, unlock treadmill, daily chest, portal) |
| R T P U I G | Rebirth, Trails, Teleport, Auras, Inventory, Daily gift |
| B / X / C | Store, x2 Speed, Custom speed |
| 1 2 3 | Speed packs |
| M | Mute |
| F2 | Dev tool (stage teleport, free wins) |

## Where things are

- `src/shared/gameData.js` — every number in the game: chairs, pets, eggs, treadmills,
  trails, auras, 15 stage layouts, XP curve, level cap. Shared with the server
  (`npm run sync-shared` in the server repo after editing).
- `src/game/` — 3D scene: `Player.jsx` (controls, hazards, gates), `world/` (lobby,
  stages, hazards), `Wheelchair.jsx`, `Pets.jsx`, `effects/` (auras, level-up glow,
  trails, speed popups).
- `src/ui/` — HUD, menus, overlays, dev panel.
- `src/net/net.js` — matchmaker + Colyseus connection.
- `src/audio/sfx.js` — synthesized sound effects and music (no audio files).
- `src/dev/PoseLab.jsx` — dev-only `/?pose` page to tune the seated avatar.

## Deploy

`.github/workflows/deploy.yml` builds, zips `dist/` and uploads it to Bloxity hosting.
Add repo secret **`LEGION_DEPLOY_TOKEN`**, then push to `dev`
(→ https://speed-wheel-chair-escape.dev.play.bloxity.io) or `main`
(→ https://speed-wheel-chair-escape.play.bloxity.io).
