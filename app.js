// Algo Viz — Day 1 (sorting) + Day 2 (pathfinding) + Day 3 (race mode) +
// Day 4 (manual stepping) + Day 5 (custom input)
// All modes share the same pattern: pull one "step" at a time off a
// generator (from algorithms.js) on a speed-controlled clock, apply it to
// shared state, and paint. Sorting drives bars from a shared array; Day 2
// drives a grid the same way; Day 3 runs two sorting generators side by
// side off one shared clock so their progress is directly comparable. A
// mode switch just picks which branch of the combined driver loop advances
// each frame. Day 5 adds user-supplied input alongside the random
// generators: a typed array for sorting, and click-to-paint walls for the
// grid.

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const algoSelect = document.getElementById("algo-select");
const speedInput = document.getElementById("speed");
const startBtn = document.getElementById("btn-start");
const stepBtn = document.getElementById("btn-step");
const shuffleBtn = document.getElementById("btn-shuffle");
const arrayInput = document.getElementById("array-input");
const applyArrayBtn = document.getElementById("btn-apply-array");
const arrayErrorEl = document.getElementById("array-input-error");
const comparesEl = document.getElementById("stat-compares");
const swapsEl = document.getElementById("stat-swaps");
const stepsEl = document.getElementById("stat-steps");
const statusEl = document.getElementById("stat-status");
const complexityCanvas = document.getElementById("complexity-canvas");
const complexityCtx = complexityCanvas.getContext("2d");
const complexityLabelEl = document.getElementById("complexity-label");

const ARRAY_SIZE = 70;
const MAX_VALUE = 400;

let arr = [];
// Draw scale for the sorting bars. Random arrays always fit under
// MAX_VALUE, but a custom array can contain larger values, so the scale
// grows to fit whatever the user typed in.
let drawMax = MAX_VALUE;
let gen = null;
let running = false;
let comparisons = 0;
let swaps = 0;
let sortSteps = 0;
let lastTime = 0;
let acc = 0;

let compareSet = new Set();
let swapSet = new Set();
let sortedSet = new Set();

// Live (steps, comparisons) trace for the Day 6 complexity overlay.
let sortComplexityHistory = [];

function randomArray(n) {
  return Array.from({ length: n }, () => 10 + Math.floor(Math.random() * (MAX_VALUE - 10)));
}

function resetRun() {
  gen = null;
  running = false;
  comparisons = 0;
  swaps = 0;
  sortSteps = 0;
  compareSet.clear();
  swapSet.clear();
  sortedSet.clear();
  comparesEl.textContent = "0";
  swapsEl.textContent = "0";
  stepsEl.textContent = "0";
  statusEl.textContent = "Idle";
  startBtn.textContent = "Start";
  algoSelect.disabled = false;
  sortComplexityHistory = [];
  drawComplexityChart(complexityCanvas, complexityCtx, sortComplexityHistory, arr.length, SORT_COMPLEXITY_INFO[algoSelect.value].expected);
}

// Creates a fresh generator and resets per-run counters. Shared by Start
// (first click) and Step (when nothing is running yet) so neither
// duplicates the other's init logic.
function startSortGen() {
  gen = ALGORITHMS[algoSelect.value](arr);
  comparisons = 0;
  swaps = 0;
  sortSteps = 0;
  sortedSet.clear();
  comparesEl.textContent = "0";
  swapsEl.textContent = "0";
  stepsEl.textContent = "0";
  algoSelect.disabled = true;
  sortComplexityHistory = [];
  updateComplexityLabel();
}

// Pulls exactly one step off the sorting generator and applies it. This is
// the single code path both auto-play (in frame()) and the manual Step
// button use, so neither duplicates the other's step-handling logic.
// Returns true once the generator has finished.
function advanceSortStep() {
  if (!gen) return true;
  const { value, done } = gen.next();
  if (done) {
    finishRun();
    return true;
  }
  sortSteps++;
  stepsEl.textContent = sortSteps;
  applyStep(value);
  sortComplexityHistory.push({ x: sortSteps, y: comparisons });
  drawComplexityChart(complexityCanvas, complexityCtx, sortComplexityHistory, arr.length, SORT_COMPLEXITY_INFO[algoSelect.value].expected);
  return false;
}

function speedToInterval(s) {
  const minMs = 4, maxMs = 140;
  const t = (s - 1) / 9;
  return maxMs - t * (maxMs - minMs);
}

function applyStep(step) {
  compareSet.clear();
  swapSet.clear();
  if (step.type === "compare") {
    compareSet.add(step.i);
    compareSet.add(step.j);
    comparisons++;
    comparesEl.textContent = comparisons;
  } else if (step.type === "swap") {
    swapSet.add(step.i);
    swapSet.add(step.j);
    swaps++;
    swapsEl.textContent = swaps;
  } else if (step.type === "overwrite") {
    swapSet.add(step.i);
    swaps++;
    swapsEl.textContent = swaps;
  } else if (step.type === "sorted") {
    sortedSet.add(step.i);
  }
}

function finishRun() {
  running = false;
  gen = null;
  compareSet.clear();
  swapSet.clear();
  for (let i = 0; i < arr.length; i++) sortedSet.add(i);
  statusEl.textContent = "Sorted!";
  startBtn.textContent = "Start";
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const barWidth = W / arr.length;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    const barHeight = (val / drawMax) * (H - 10);
    let color;
    if (sortedSet.has(i)) color = getCss("--bar-sorted");
    else if (swapSet.has(i)) color = getCss("--bar-swap");
    else if (compareSet.has(i)) color = getCss("--bar-compare");
    else color = getCss("--bar");
    ctx.fillStyle = color;
    ctx.fillRect(i * barWidth + 1, H - barHeight, barWidth - 2, barHeight);
  }
}

let cssCache = {};
function getCss(varName) {
  if (!cssCache[varName]) {
    cssCache[varName] = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }
  return cssCache[varName];
}

startBtn.addEventListener("click", () => {
  if (!gen) {
    startSortGen();
    statusEl.textContent = "Running";
    running = true;
    startBtn.textContent = "Pause";
  } else if (running) {
    running = false;
    statusEl.textContent = "Paused";
    startBtn.textContent = "Resume";
  } else {
    running = true;
    statusEl.textContent = "Running";
    startBtn.textContent = "Pause";
  }
});

stepBtn.addEventListener("click", () => {
  if (!gen) startSortGen();
  const finished = advanceSortStep();
  if (!finished) {
    running = false;
    acc = 0;
    lastTime = 0;
    statusEl.textContent = "Paused";
    startBtn.textContent = "Resume";
  }
  draw();
});

shuffleBtn.addEventListener("click", () => {
  arr = randomArray(ARRAY_SIZE);
  drawMax = MAX_VALUE;
  arrayErrorEl.textContent = "";
  resetRun();
  draw();
});

// Parses a comma-separated list of numbers for the custom-array field.
// Non-numeric or non-positive tokens are silently dropped rather than
// rejecting the whole input, so a stray typo doesn't block the rest.
function parseCustomArray(text) {
  const tokens = text.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
  const values = [];
  let invalidCount = 0;
  for (const tok of tokens) {
    const n = Number(tok);
    if (Number.isFinite(n) && n > 0) values.push(n);
    else invalidCount++;
  }
  return { values, invalidCount };
}

function applyCustomArray() {
  const { values, invalidCount } = parseCustomArray(arrayInput.value);
  if (values.length < 2) {
    arrayErrorEl.textContent = "Enter at least 2 positive numbers, separated by commas.";
    return;
  }
  arr = values;
  drawMax = Math.max(MAX_VALUE, ...values);
  resetRun();
  draw();
  arrayErrorEl.textContent = invalidCount > 0
    ? `Used ${values.length} value(s); ignored ${invalidCount} invalid ${invalidCount === 1 ? "entry" : "entries"}.`
    : "";
}

applyArrayBtn.addEventListener("click", applyCustomArray);
arrayInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") applyCustomArray();
});

function updateComplexityLabel() {
  const info = SORT_COMPLEXITY_INFO[algoSelect.value];
  complexityLabelEl.textContent = `${info.name}: ${info.note}`;
}

algoSelect.addEventListener("change", () => {
  updateComplexityLabel();
  drawComplexityChart(complexityCanvas, complexityCtx, sortComplexityHistory, arr.length, SORT_COMPLEXITY_INFO[algoSelect.value].expected);
});

function renderRoadmap() {
  const list = document.getElementById("roadmap-list");
  list.innerHTML = "";
  for (const item of ROADMAP) {
    const li = document.createElement("li");
    li.textContent = `Day ${item.day}: ${item.title}`;
    li.className = item.done ? "done" : "pending";
    list.appendChild(li);
  }
}

// --- Day 2: Pathfinding mode -----------------------------------------------
// Mirrors the sorting driver above: pulls one step at a time off a grid
// generator (from PATHFINDING_ALGORITHMS in algorithms.js) on the same
// speed-controlled clock, applies it to shared visited/frontier/path sets,
// and paints the grid. Only one mode is ever advancing at a time; switching
// tabs just changes which canvas/panel/loop branch is active.

const gridCanvas = document.getElementById("grid-stage");
const gctx = gridCanvas.getContext("2d");
const GW = gridCanvas.width;
const GH = gridCanvas.height;

const GRID_COLS = 41;
const GRID_ROWS = 21;
const CELL = 20;
const START_ROW = Math.floor(GRID_ROWS / 2);
const startIdx = START_ROW * GRID_COLS + 0;
const endIdx = START_ROW * GRID_COLS + (GRID_COLS - 1);

const gridAlgoSelect = document.getElementById("grid-algo-select");
const gridSpeedInput = document.getElementById("grid-speed");
const gridStartBtn = document.getElementById("grid-btn-start");
const gridStepBtn = document.getElementById("grid-btn-step");
const gridMazeBtn = document.getElementById("grid-btn-maze");
const visitedEl = document.getElementById("stat-visited");
const pathLenEl = document.getElementById("stat-pathlen");
const gridStepsEl = document.getElementById("stat-gridsteps");
const gridStatusEl = document.getElementById("stat-gridstatus");
const gridComplexityCanvas = document.getElementById("grid-complexity-canvas");
const gridComplexityCtx = gridComplexityCanvas.getContext("2d");
const gridComplexityLabelEl = document.getElementById("grid-complexity-label");

let wallSet = new Set();
let pathGen = null;
let pathRunning = false;
let gridAcc = 0;
let gridLastTime = 0;
let visitedCount = 0;
let gridSteps = 0;

let frontierSet = new Set();
let visitedSet = new Set();
let pathSet = new Set();

// Live (steps, visited) trace for the Day 6 complexity overlay.
let gridComplexityHistory = [];

function randomWalls(density) {
  const walls = new Set();
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const i = r * GRID_COLS + c;
      if (i === startIdx || i === endIdx) continue;
      if (Math.random() < density) walls.add(i);
    }
  }
  return walls;
}

function hasPath(walls) {
  const grid = makeGrid(GRID_COLS, GRID_ROWS, walls, startIdx, endIdx);
  const seen = new Set([startIdx]);
  const queue = [startIdx];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === endIdx) return true;
    for (const n of grid.neighbors(cur)) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return false;
}

function generateMaze() {
  let walls;
  let attempts = 0;
  do {
    walls = randomWalls(0.28);
    attempts++;
  } while (!hasPath(walls) && attempts < 40);
  wallSet = hasPath(walls) ? walls : new Set();
}

function resetGridRun() {
  pathGen = null;
  pathRunning = false;
  frontierSet.clear();
  visitedSet.clear();
  pathSet.clear();
  visitedCount = 0;
  gridSteps = 0;
  visitedEl.textContent = "0";
  pathLenEl.textContent = "0";
  gridStepsEl.textContent = "0";
  gridStatusEl.textContent = "Idle";
  gridStartBtn.textContent = "Start";
  gridAlgoSelect.disabled = false;
  gridComplexityHistory = [];
  drawComplexityChart(gridComplexityCanvas, gridComplexityCtx, gridComplexityHistory, GRID_COLS * GRID_ROWS, PATH_COMPLEXITY_INFO[gridAlgoSelect.value].expected);
}

// Mirrors startSortGen(): creates a fresh grid generator and resets
// per-run counters, shared by Start and Step.
function startPathGen() {
  const grid = makeGrid(GRID_COLS, GRID_ROWS, wallSet, startIdx, endIdx);
  pathGen = PATHFINDING_ALGORITHMS[gridAlgoSelect.value](grid);
  frontierSet.clear();
  visitedSet.clear();
  pathSet.clear();
  visitedCount = 0;
  gridSteps = 0;
  visitedEl.textContent = "0";
  pathLenEl.textContent = "0";
  gridStepsEl.textContent = "0";
  gridAlgoSelect.disabled = true;
  gridComplexityHistory = [];
  updateGridComplexityLabel();
}

// Mirrors advanceSortStep(): the single code path both auto-play and the
// manual Step button use to pull one step off the grid generator.
function advancePathStep() {
  if (!pathGen) return true;
  const { value, done } = pathGen.next();
  if (done) {
    finishGridRun();
    return true;
  }
  gridSteps++;
  gridStepsEl.textContent = gridSteps;
  applyGridStep(value);
  gridComplexityHistory.push({ x: gridSteps, y: visitedCount });
  drawComplexityChart(gridComplexityCanvas, gridComplexityCtx, gridComplexityHistory, GRID_COLS * GRID_ROWS, PATH_COMPLEXITY_INFO[gridAlgoSelect.value].expected);
  return false;
}

function applyGridStep(step) {
  if (step.type === "frontier") {
    frontierSet.add(step.i);
  } else if (step.type === "visit") {
    frontierSet.delete(step.i);
    visitedSet.add(step.i);
    visitedCount++;
    visitedEl.textContent = visitedCount;
  } else if (step.type === "path") {
    pathSet.add(step.i);
  }
}

function finishGridRun() {
  pathRunning = false;
  pathGen = null;
  gridStatusEl.textContent = pathSet.size > 0 ? "Path found!" : "No path found";
  pathLenEl.textContent = pathSet.size;
  gridStartBtn.textContent = "Start";
  gridAlgoSelect.disabled = false;
}

function drawGrid() {
  gctx.clearRect(0, 0, GW, GH);
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const i = r * GRID_COLS + c;
      let color;
      if (i === startIdx) color = getCss("--cell-start");
      else if (i === endIdx) color = getCss("--cell-end");
      else if (pathSet.has(i)) color = getCss("--cell-path");
      else if (wallSet.has(i)) color = getCss("--cell-wall");
      else if (frontierSet.has(i)) color = getCss("--cell-frontier");
      else if (visitedSet.has(i)) color = getCss("--cell-visited");
      else color = getCss("--cell-open");
      gctx.fillStyle = color;
      gctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
    }
  }
}

gridStartBtn.addEventListener("click", () => {
  if (!pathGen) {
    startPathGen();
    gridStatusEl.textContent = "Running";
    pathRunning = true;
    gridStartBtn.textContent = "Pause";
    gridAcc = 0;
    gridLastTime = 0;
  } else if (pathRunning) {
    pathRunning = false;
    gridStatusEl.textContent = "Paused";
    gridStartBtn.textContent = "Resume";
  } else {
    pathRunning = true;
    gridStatusEl.textContent = "Running";
    gridStartBtn.textContent = "Pause";
  }
});

gridStepBtn.addEventListener("click", () => {
  if (!pathGen) startPathGen();
  const finished = advancePathStep();
  if (!finished) {
    pathRunning = false;
    gridAcc = 0;
    gridLastTime = 0;
    gridStatusEl.textContent = "Paused";
    gridStartBtn.textContent = "Resume";
  }
  drawGrid();
});

gridMazeBtn.addEventListener("click", () => {
  generateMaze();
  resetGridRun();
  drawGrid();
});

// Lets the user paint their own maze by hand: click or drag across cells to
// toggle walls on/off, on top of (or instead of) the random "New Maze"
// layout. Painting cancels any in-progress run, same as New Maze does,
// since the grid it was searching no longer matches what's drawn.
let isPaintingWalls = false;
let wallPaintValue = true;

function cellIndexFromEvent(e) {
  const rect = gridCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (GW / rect.width);
  const y = (e.clientY - rect.top) * (GH / rect.height);
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);
  if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) return null;
  return r * GRID_COLS + c;
}

function paintWallAt(idx, adding) {
  if (idx === null || idx === startIdx || idx === endIdx) return;
  if (adding) wallSet.add(idx);
  else wallSet.delete(idx);
}

gridCanvas.addEventListener("mousedown", (e) => {
  const idx = cellIndexFromEvent(e);
  if (idx === null || idx === startIdx || idx === endIdx) return;
  e.preventDefault();
  isPaintingWalls = true;
  wallPaintValue = !wallSet.has(idx);
  paintWallAt(idx, wallPaintValue);
  resetGridRun();
  drawGrid();
});

window.addEventListener("mousemove", (e) => {
  if (!isPaintingWalls) return;
  paintWallAt(cellIndexFromEvent(e), wallPaintValue);
  drawGrid();
});

window.addEventListener("mouseup", () => {
  isPaintingWalls = false;
});

function updateGridComplexityLabel() {
  const info = PATH_COMPLEXITY_INFO[gridAlgoSelect.value];
  gridComplexityLabelEl.textContent = `${info.name}: ${info.note}`;
}

gridAlgoSelect.addEventListener("change", () => {
  updateGridComplexityLabel();
  drawComplexityChart(gridComplexityCanvas, gridComplexityCtx, gridComplexityHistory, GRID_COLS * GRID_ROWS, PATH_COMPLEXITY_INFO[gridAlgoSelect.value].expected);
});

// --- Day 6: Complexity overlay ------------------------------------------
// A small live chart per mode (sorting, pathfinding) that plots the run's
// own (steps, count) trace against O(n)/O(n log n)/O(n^2) reference curves.
// The curves share one scale factor `k`, chosen so the algorithm's own
// expected class passes through the run's current point — so if the trace
// hugs that curve across the whole chart (not just at the anchor), that's
// the visual confirmation the run is behaving like its expected class.
// Fed straight from the existing per-step counters (advanceSortStep /
// advancePathStep) rather than a separate timer.
const REF_CURVES = {
  n: (x) => x,
  nlogn: (x) => x * Math.log2(x + 1),
  n2: (x) => x * x,
};

const SORT_COMPLEXITY_INFO = {
  bubble: { name: "Bubble Sort", note: "avg/worst O(n²), best O(n)", expected: "n2" },
  selection: { name: "Selection Sort", note: "avg/worst/best O(n²)", expected: "n2" },
  insertion: { name: "Insertion Sort", note: "avg/worst O(n²), best O(n)", expected: "n2" },
  merge: { name: "Merge Sort", note: "avg/worst/best O(n log n)", expected: "nlogn" },
  quick: { name: "Quick Sort", note: "avg O(n log n), worst O(n²)", expected: "nlogn" },
};

const PATH_COMPLEXITY_INFO = {
  bfs: { name: "Breadth-First Search", note: "O(V + E)", expected: "n" },
  dfs: { name: "Depth-First Search", note: "O(V + E)", expected: "n" },
  dijkstra: { name: "Dijkstra's Algorithm", note: "O((V+E) log V)", expected: "nlogn" },
  astar: { name: "A* Search", note: "O(E), heuristic-dependent", expected: "n" },
};

function drawComplexityChart(canvas, cctx, history, n, expectedClass) {
  const w = canvas.width, h = canvas.height;
  cctx.clearRect(0, 0, w, h);

  const last = history[history.length - 1];
  const anchorX = Math.max(last ? last.x : 0, 1);
  const anchorY = Math.max(last ? last.y : 0, 1);
  const k = anchorY / Math.max(REF_CURVES[expectedClass](anchorX), 1e-6);
  const xMax = Math.max(n, anchorX, 1);
  const yMax = anchorY * 1.3;

  const pad = 6;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;
  const sx = (x) => pad + (x / xMax) * plotW;
  const sy = (y) => pad + plotH - (Math.min(y, yMax) / yMax) * plotH;

  function strokeCurve(fn, color, lineWidth) {
    cctx.beginPath();
    cctx.strokeStyle = color;
    cctx.lineWidth = lineWidth;
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * xMax;
      const px = sx(x), py = sy(k * fn(x));
      if (i === 0) cctx.moveTo(px, py); else cctx.lineTo(px, py);
    }
    cctx.stroke();
  }

  strokeCurve(REF_CURVES.n, getCss("--muted"), 1.25);
  strokeCurve(REF_CURVES.nlogn, getCss("--bar-compare"), 1.25);
  strokeCurve(REF_CURVES.n2, getCss("--bar-swap"), 1.25);
  strokeCurve(REF_CURVES[expectedClass], getCss("--accent"), 2.5);

  if (history.length > 1) {
    cctx.beginPath();
    cctx.strokeStyle = getCss("--text");
    cctx.lineWidth = 2;
    history.forEach((p, i) => {
      const px = sx(p.x), py = sy(p.y);
      if (i === 0) cctx.moveTo(px, py); else cctx.lineTo(px, py);
    });
    cctx.stroke();
  }
}

// --- Day 3: Race mode -------------------------------------------------
// Runs two ALGORITHMS generators side by side on identical starting
// arrays, both advanced by one shared clock (exactly one step per side per
// tick) so their progress is genuinely comparable. Each side is just a
// bundle of the same per-run state Day 1 keeps in module-level variables,
// so nothing about the sorters themselves is duplicated.

const raceLeftCanvas = document.getElementById("race-stage-left");
const raceRightCanvas = document.getElementById("race-stage-right");
const raceLeftCtx = raceLeftCanvas.getContext("2d");
const raceRightCtx = raceRightCanvas.getContext("2d");
const RW = raceLeftCanvas.width;
const RH = raceLeftCanvas.height;

const RACE_ARRAY_SIZE = 50;

const raceAlgoLeftSelect = document.getElementById("race-algo-left");
const raceAlgoRightSelect = document.getElementById("race-algo-right");
const raceLabelLeftEl = document.getElementById("race-label-left");
const raceLabelRightEl = document.getElementById("race-label-right");
const raceSpeedInput = document.getElementById("race-speed");
const raceStartBtn = document.getElementById("race-btn-start");
const raceStepBtn = document.getElementById("race-btn-step");
const raceShuffleBtn = document.getElementById("race-btn-shuffle");
const raceStatusEl = document.getElementById("race-status");

function makeRaceSide(label, ctx, select, labelEl, comparesEl, swapsEl, stepsEl, statusEl) {
  return {
    label, ctx, select, labelEl, comparesEl, swapsEl, stepsEl, statusEl,
    arr: [],
    gen: null,
    comparisons: 0,
    swaps: 0,
    steps: 0,
    done: false,
    compareSet: new Set(),
    swapSet: new Set(),
    sortedSet: new Set(),
  };
}

const raceLeft = makeRaceSide(
  "left", raceLeftCtx, raceAlgoLeftSelect, raceLabelLeftEl,
  document.getElementById("race-compares-left"),
  document.getElementById("race-swaps-left"),
  document.getElementById("race-steps-left"),
  document.getElementById("race-status-left")
);
const raceRight = makeRaceSide(
  "right", raceRightCtx, raceAlgoRightSelect, raceLabelRightEl,
  document.getElementById("race-compares-right"),
  document.getElementById("race-swaps-right"),
  document.getElementById("race-steps-right"),
  document.getElementById("race-status-right")
);
const raceSides = [raceLeft, raceRight];

let raceRunning = false;
let raceAcc = 0;
let raceLastTime = 0;

function raceNewArray() {
  const base = randomArray(RACE_ARRAY_SIZE);
  for (const side of raceSides) side.arr = base.slice();
  resetRaceRun();
}

function resetRaceRun() {
  raceRunning = false;
  raceAcc = 0;
  raceLastTime = 0;
  raceStatusEl.textContent = "Idle";
  raceStartBtn.textContent = "Start";
  raceAlgoLeftSelect.disabled = false;
  raceAlgoRightSelect.disabled = false;
  for (const side of raceSides) {
    side.gen = null;
    side.comparisons = 0;
    side.swaps = 0;
    side.steps = 0;
    side.done = false;
    side.compareSet.clear();
    side.swapSet.clear();
    side.sortedSet.clear();
    side.comparesEl.textContent = "0";
    side.swapsEl.textContent = "0";
    side.stepsEl.textContent = "0";
    side.statusEl.textContent = "Idle";
  }
}

// Mirrors startSortGen()/startPathGen(): creates fresh generators for both
// sides and resets per-run counters, shared by Start and Step.
function startRaceGen() {
  raceLeft.gen = ALGORITHMS[raceAlgoLeftSelect.value](raceLeft.arr);
  raceRight.gen = ALGORITHMS[raceAlgoRightSelect.value](raceRight.arr);
  for (const side of raceSides) {
    side.comparisons = 0;
    side.swaps = 0;
    side.steps = 0;
    side.done = false;
    side.sortedSet.clear();
    side.comparesEl.textContent = "0";
    side.swapsEl.textContent = "0";
    side.stepsEl.textContent = "0";
    side.statusEl.textContent = "Running";
  }
  raceAlgoLeftSelect.disabled = true;
  raceAlgoRightSelect.disabled = true;
}

// Mirrors advanceSortStep()/advancePathStep(): the single code path both
// auto-play and the manual Step button use to advance both racers by
// exactly one generator step each. Returns true once both sides are done.
function advanceRaceStep() {
  for (const side of raceSides) {
    if (side.done || !side.gen) continue;
    const { value, done } = side.gen.next();
    if (done) {
      finishRaceSide(side);
    } else {
      side.steps++;
      side.stepsEl.textContent = side.steps;
      applyRaceStep(side, value);
    }
  }
  return raceLeft.done && raceRight.done;
}

function applyRaceStep(side, step) {
  side.compareSet.clear();
  side.swapSet.clear();
  if (step.type === "compare") {
    side.compareSet.add(step.i);
    side.compareSet.add(step.j);
    side.comparisons++;
    side.comparesEl.textContent = side.comparisons;
  } else if (step.type === "swap") {
    side.swapSet.add(step.i);
    side.swapSet.add(step.j);
    side.swaps++;
    side.swapsEl.textContent = side.swaps;
  } else if (step.type === "overwrite") {
    side.swapSet.add(step.i);
    side.swaps++;
    side.swapsEl.textContent = side.swaps;
  } else if (step.type === "sorted") {
    side.sortedSet.add(step.i);
  }
}

function finishRaceSide(side) {
  side.done = true;
  side.compareSet.clear();
  side.swapSet.clear();
  for (let i = 0; i < side.arr.length; i++) side.sortedSet.add(i);
  side.statusEl.textContent = `Finished (${side.steps} steps)`;
  checkRaceFinish();
}

function checkRaceFinish() {
  if (!raceLeft.done || !raceRight.done) return;
  raceRunning = false;
  raceStartBtn.textContent = "Start";
  raceAlgoLeftSelect.disabled = false;
  raceAlgoRightSelect.disabled = false;
  if (raceLeft.steps === raceRight.steps) {
    raceStatusEl.textContent = "Tie!";
  } else {
    const winner = raceLeft.steps < raceRight.steps ? raceLeft : raceRight;
    const loser = winner === raceLeft ? raceRight : raceLeft;
    const winnerName = winner.select.selectedOptions[0].textContent;
    raceStatusEl.textContent = `${winnerName} (${winner.label}) wins by ${loser.steps - winner.steps} steps!`;
  }
}

function drawRaceSide(side) {
  const ctx = side.ctx;
  ctx.clearRect(0, 0, RW, RH);
  const barWidth = RW / side.arr.length;
  for (let i = 0; i < side.arr.length; i++) {
    const val = side.arr[i];
    const barHeight = (val / MAX_VALUE) * (RH - 10);
    let color;
    if (side.sortedSet.has(i)) color = getCss("--bar-sorted");
    else if (side.swapSet.has(i)) color = getCss("--bar-swap");
    else if (side.compareSet.has(i)) color = getCss("--bar-compare");
    else color = getCss("--bar");
    ctx.fillStyle = color;
    ctx.fillRect(i * barWidth + 1, RH - barHeight, barWidth - 2, barHeight);
  }
}

function drawRace() {
  drawRaceSide(raceLeft);
  drawRaceSide(raceRight);
}

raceStartBtn.addEventListener("click", () => {
  if (!raceLeft.gen) {
    startRaceGen();
    raceStatusEl.textContent = "Racing...";
    raceRunning = true;
    raceStartBtn.textContent = "Pause";
    raceAcc = 0;
    raceLastTime = 0;
  } else if (raceRunning) {
    raceRunning = false;
    raceStatusEl.textContent = "Paused";
    raceStartBtn.textContent = "Resume";
  } else {
    raceRunning = true;
    raceStatusEl.textContent = "Racing...";
    raceStartBtn.textContent = "Pause";
  }
});

raceStepBtn.addEventListener("click", () => {
  if (!raceLeft.gen) startRaceGen();
  const finished = advanceRaceStep();
  if (!finished) {
    raceRunning = false;
    raceAcc = 0;
    raceLastTime = 0;
    raceStatusEl.textContent = "Paused";
    raceStartBtn.textContent = "Resume";
  }
  drawRace();
});

raceShuffleBtn.addEventListener("click", () => {
  raceNewArray();
  drawRace();
});

raceAlgoLeftSelect.addEventListener("change", () => {
  raceLabelLeftEl.textContent = raceAlgoLeftSelect.selectedOptions[0].textContent;
});
raceAlgoRightSelect.addEventListener("change", () => {
  raceLabelRightEl.textContent = raceAlgoRightSelect.selectedOptions[0].textContent;
});

// --- Day 7: Home dashboard -----------------------------------------------
// A landing view listing every algorithm built this week (both families)
// as a clickable card. Picking one switches to the right mode, selects
// that algorithm, and resets the run so it starts from a clean state —
// purely additive on top of the existing per-mode panels/canvases.

const HOME_CARDS = {
  sorting: [
    { key: "bubble", name: "Bubble Sort", desc: "Repeatedly swaps adjacent out-of-order pairs until the array settles." },
    { key: "selection", name: "Selection Sort", desc: "Finds the smallest remaining value and moves it into place each pass." },
    { key: "insertion", name: "Insertion Sort", desc: "Grows a sorted prefix by inserting each new value where it belongs." },
    { key: "merge", name: "Merge Sort", desc: "Splits the array in half recursively, then merges the sorted halves back together." },
    { key: "quick", name: "Quick Sort", desc: "Partitions around a pivot and recursively sorts each side." },
  ],
  pathfinding: [
    { key: "bfs", name: "Breadth-First Search", desc: "Explores the grid ring by ring, guaranteeing the shortest path in steps." },
    { key: "dfs", name: "Depth-First Search", desc: "Dives down one path as far as it can before backtracking." },
    { key: "dijkstra", name: "Dijkstra's Algorithm", desc: "Always expands the cheapest known path first, guaranteeing a shortest route." },
    { key: "astar", name: "A* Search", desc: "Like Dijkstra, but steered by a heuristic toward the goal for fewer visits." },
  ],
};

function makeHomeCard(family, card) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "home-card";
  const nameEl = document.createElement("span");
  nameEl.className = "home-card-name";
  nameEl.textContent = card.name;
  const descEl = document.createElement("span");
  descEl.className = "home-card-desc";
  descEl.textContent = card.desc;
  el.appendChild(nameEl);
  el.appendChild(descEl);
  el.addEventListener("click", () => launchFromHome(family, card.key));
  return el;
}

function renderHome() {
  const sortingGrid = document.getElementById("home-grid-sorting");
  const pathGrid = document.getElementById("home-grid-pathfinding");
  for (const card of HOME_CARDS.sorting) sortingGrid.appendChild(makeHomeCard("sorting", card));
  for (const card of HOME_CARDS.pathfinding) pathGrid.appendChild(makeHomeCard("pathfinding", card));
}

function launchFromHome(family, algoKey) {
  if (family === "sorting") {
    resetRun();
    algoSelect.value = algoKey;
    updateComplexityLabel();
    drawComplexityChart(complexityCanvas, complexityCtx, sortComplexityHistory, arr.length, SORT_COMPLEXITY_INFO[algoSelect.value].expected);
    setMode("sorting");
    draw();
  } else {
    resetGridRun();
    gridAlgoSelect.value = algoKey;
    updateGridComplexityLabel();
    drawComplexityChart(gridComplexityCanvas, gridComplexityCtx, gridComplexityHistory, GRID_COLS * GRID_ROWS, PATH_COMPLEXITY_INFO[gridAlgoSelect.value].expected);
    setMode("pathfinding");
    drawGrid();
  }
}

// --- Mode switching ----------------------------------------------------

let mode = "home";
const tabButtons = document.querySelectorAll(".tab-btn");
const homeWrap = document.getElementById("home-wrap");
const stageWrap = document.getElementById("stage-wrap");
const sortingPanel = document.getElementById("panel-sorting");
const pathfindingPanel = document.getElementById("panel-pathfinding");
const racePanel = document.getElementById("panel-race");
const raceStageWrap = document.getElementById("race-stage-wrap");
const homeButtons = document.querySelectorAll("[data-home]");

function setMode(newMode) {
  mode = newMode;
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  homeWrap.classList.toggle("hidden", mode !== "home");
  sortingPanel.classList.toggle("hidden", mode !== "sorting");
  pathfindingPanel.classList.toggle("hidden", mode !== "pathfinding");
  racePanel.classList.toggle("hidden", mode !== "race");
  stageWrap.classList.toggle("hidden", mode === "race" || mode === "home");
  canvas.classList.toggle("hidden", mode !== "sorting");
  gridCanvas.classList.toggle("hidden", mode !== "pathfinding");
  raceStageWrap.classList.toggle("hidden", mode !== "race");
}

tabButtons.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
homeButtons.forEach((btn) => btn.addEventListener("click", () => setMode("home")));

// --- Combined driver loop ------------------------------------------------
// Dispatches to whichever mode is active, so both the Day 1 sorting loop
// and the Day 2 pathfinding loop share one requestAnimationFrame clock.

function frame(ts) {
  if (mode === "race") {
    if (raceRunning) {
      if (!raceLastTime) raceLastTime = ts;
      raceAcc += ts - raceLastTime;
      raceLastTime = ts;
      const interval = speedToInterval(Number(raceSpeedInput.value));
      let stepsThisFrame = 0;
      while (raceAcc >= interval && stepsThisFrame < 500) {
        raceAcc -= interval;
        stepsThisFrame++;
        if (advanceRaceStep()) break;
      }
    } else {
      raceLastTime = ts;
    }
    drawRace();
  } else if (mode === "sorting") {
    if (running && gen) {
      if (!lastTime) lastTime = ts;
      acc += ts - lastTime;
      lastTime = ts;
      const interval = speedToInterval(Number(speedInput.value));
      let stepsThisFrame = 0;
      while (acc >= interval && stepsThisFrame < 500) {
        acc -= interval;
        stepsThisFrame++;
        if (advanceSortStep()) break;
      }
    } else {
      lastTime = ts;
    }
    draw();
  } else if (mode === "pathfinding") {
    if (pathRunning && pathGen) {
      if (!gridLastTime) gridLastTime = ts;
      gridAcc += ts - gridLastTime;
      gridLastTime = ts;
      const interval = speedToInterval(Number(gridSpeedInput.value));
      let stepsThisFrame = 0;
      while (gridAcc >= interval && stepsThisFrame < 500) {
        gridAcc -= interval;
        stepsThisFrame++;
        if (advancePathStep()) break;
      }
    } else {
      gridLastTime = ts;
    }
    drawGrid();
  }
  // mode === "home": nothing to step or paint, canvases are hidden.
  requestAnimationFrame(frame);
}

arr = randomArray(ARRAY_SIZE);
renderRoadmap();
renderHome();
generateMaze();
raceNewArray();
draw();
drawGrid();
drawRace();
updateComplexityLabel();
drawComplexityChart(complexityCanvas, complexityCtx, sortComplexityHistory, arr.length, SORT_COMPLEXITY_INFO[algoSelect.value].expected);
updateGridComplexityLabel();
drawComplexityChart(gridComplexityCanvas, gridComplexityCtx, gridComplexityHistory, GRID_COLS * GRID_ROWS, PATH_COMPLEXITY_INFO[gridAlgoSelect.value].expected);
setMode("home");
requestAnimationFrame(frame);
