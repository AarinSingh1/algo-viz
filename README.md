# 📊 Algo Viz

Watch classic algorithms think, one step at a time. No dependencies, no
build step — open `index.html` and press Start.

This project grows for real, too: one new capability gets added each day
for a week.

## 7-day build log

- [x] **Day 1** — Sorting visualizer: bubble, selection, insertion, merge,
      and quick sort, animated bar-by-bar with live comparison/swap counts.
- [x] **Day 2** — Pathfinding on a grid: BFS, DFS, Dijkstra, A*.
- [ ] **Day 3** — Race mode: two algorithms side by side on the same input.
- [ ] **Day 4** — Manual stepping + step/comparison counters.
- [ ] **Day 5** — Custom input: type your own array, draw your own maze.
- [ ] **Day 6** — Complexity overlay: live counts vs Big-O reference curves.
- [ ] **Day 7** — Home dashboard: every algorithm, one gallery view.

Progress is also tracked in [`roadmap.js`](roadmap.js), which drives the
build-log panel shown in the app itself.

## Running it

Just open `index.html` in a browser. Everything is plain HTML/CSS/JS.

## How it works (so far)

- Each sort is a JS generator (see [`algorithms.js`](algorithms.js)) that
  mutates a shared array and `yield`s small step descriptions
  (`compare`, `swap`, `overwrite`, `sorted`).
- A single driver loop in [`app.js`](app.js) pulls steps off the generator
  on a speed-controlled clock and repaints the bars — the renderer knows
  nothing about the algorithm, so future algorithm families (pathfinding,
  etc.) can plug into the same loop.
- Pathfinding mode (BFS, DFS, Dijkstra, A*) runs on a grid maze using the
  same generator/step pattern — cells yield `frontier`, `visit`, and `path`
  steps instead of `compare`/`swap`/`sorted`. Switch modes with the
  Sorting/Pathfinding tabs above the canvas; each mode keeps its own panel,
  canvas, and driver state so neither interferes with the other.
