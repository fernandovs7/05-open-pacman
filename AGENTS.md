# Repository Guide

## Run And Verify

- This is a dependency-free static app; there is no package manager, build step, automated test suite, linter, or formatter configured.
- Serve the app with `python3 -m http.server 8000 --directory src`, then open `http://localhost:8000`.
- Run `node --check src/js/*.js` for a focused syntax check. Verify gameplay changes manually in the browser, including the console, movement, tunnel wrapping, collisions/lives, win, and restart states as relevant.

## Runtime Wiring

- `src/index.html` is the entrypoint and loads classic scripts in dependency order: `maze.js`, `game.js`, `render.js`, then `main.js`. They communicate through `window` globals; reordering them or converting one file to an ES module requires updating the whole chain.
- `maze.js` owns immutable board geometry and spawn constants. `game.js` owns mutable state and rules, copying `MAZE` into `game.grid` for every new game. `render.js` draws that mutable grid. `main.js` owns DOM input, overlays, and the animation loop.
- Grid coordinates use a top-left origin and whole-cell movement decisions. Speeds are chosen to land exactly on cell boundaries; preserve that alignment when changing movement.
- The board is 28 by 31 cells at 20 pixels per cell, matching the canvas and `#game-wrap` dimensions of 560 by 620. Coordinate or maze-size changes must keep `maze.js`, `render.js`, `index.html`, and CSS dimensions consistent.
- Maze tile values are `0` walkable, `1` wall, `2` dot, and `3` ghost-pen door. Pac-Man treats `3` as blocked; ghosts do not. Tunnel wrapping is restricted to `TUNNEL_ROW`.

## Spec Workflow

- This repository is intended for spec-driven development. For a large feature, use the tracked `spec` skill before coding; implement only an approved spec with `spec-impl`. The authoritative workflow is in `.agents/skills/spec/` and `.agents/skills/spec-impl/`.
