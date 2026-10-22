# Basket Blitz

Simplified basketball game built with PlayCanvas — swipe to shoot, score through the hoop.
Playable build hosted on GitHub Pages (`docs/`), editable source scripts in `source/scripts/`.

## Structure

- `docs/` — standalone static build (PlayCanvas "web" export, self-contained). Served by GitHub Pages.
- `source/scripts/` — the editable gameplay scripts (PlayCanvas Editor script attributes):
  - `ballThrower.js` — launch/trajectory/collision/scoring physics + trail
  - `basketNet.js` — net animation on score
  - `cameraFollow.js` — camera tracking
  - `gameManager.js` — menu/HUD state machine + score
  - `playButton.js` — PLAY button
  - `soundManager.js` — SFX + music slots on game events
  - `ledScreens.js` — LED ad screens flipbook animation
  - `scoreReporter.js` — POSTs game result to the REST API

## Result API

After `shotsPerGame` shots (default 10), `scoreReporter` POSTs JSON:

```
POST https://api.wingame.ledpilot.eu/basket/result
{ "game": "basket", "score": 7, "result": "win", "shots": 10 }
```

`result` is `"win"` when `score >= winScore` (default 5). All tunable on the
`scoreReporter` script attributes on the `Game` entity. The API must allow
CORS from the hosting domain.

## Rebuilding

The project is edited in the PlayCanvas Editor (scene 2629051). To produce a
new standalone build: publish/download a static web build and replace `docs/`.
