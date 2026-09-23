# 📊 Algo Viz

Watch classic algorithms think, one step at a time. No dependencies, no
build step — open `index.html` and press Start.

This project grows for real, too: one new capability gets added each day
for a week.

## 7-day build log

- [x] **Day 1** — Sorting visualizer: bubble, selection, insertion, merge,
      and quick sort, animated bar-by-bar with live comparison/swap counts.
- [x] **Day 2** — Pathfinding on a grid: BFS, DFS, Dijkstra, A*.
- [x] **Day 3** — Race mode: two algorithms side by side on the same input.
- [x] **Day 4** — Manual stepping + step/comparison counters.
- [x] **Day 5** — Custom input: type your own array, draw your own maze.
- [x] **Day 6** — Complexity overlay: live counts vs Big-O reference curves.
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
- Race mode (the Race tab) picks up the same sorting generators and runs
  two of them side by side — one per canvas, one algorithm selector each —
  advanced by a single shared clock that steps both generators exactly once
  per tick, so their progress is directly comparable. Each side tracks its
  own live comparison/swap counts, and once both finish, the total steps
  each generator needed decide the winner and the margin.
- A Step button next to Start in every mode's panel advances the active
  generator by exactly one step and pauses, whether or not auto-play was
  running — it calls the same `advance*Step()` function the auto-play
  clock uses, so nothing about step handling is duplicated per mode. A
  running step counter (separate from comparisons/swaps/visited) shows
  exactly how many discrete steps have elapsed.
- Custom input (Day 5) sits alongside the random generators instead of
  replacing them. In Sorting mode, a text field takes a comma-separated
  list of numbers, skips anything that isn't a positive number, and shows
  an inline message rather than crashing if the input can't be used; the
  bar scale adapts to fit whatever values are typed in. In Pathfinding
  mode, clicking or dragging across the grid toggles walls on and off to
  hand-paint a maze, on top of whatever the random layout left behind.
  New Array / New Maze still work as one-click random resets.
- The complexity overlay (Day 6) adds a small chart to the Sorting and
  Pathfinding panels that plots the live (steps, comparisons/visited)
  trace against O(n), O(n log n), and O(n²) reference curves, scaled so
  the algorithm's own expected class lines up with the run's current
  point — letting you see whether the live trace actually hugs that curve
  or bends toward another class. It's fed by the same `advance*Step()`
  functions the auto-play clock and Step button already call, and each
  panel shows a short static label (e.g. "Quick Sort: avg O(n log n),
  worst O(n²)") naming the algorithm's theoretical complexity.
