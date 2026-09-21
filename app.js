// Algo Viz — Day 1 (sorting) + Day 2 (pathfinding) + Day 3 (race mode)
// All modes share the same pattern: pull one "step" at a time off a
// generator (from algorithms.js) on a speed-controlled clock, apply it to
// shared state, and paint. Sorting drives bars from a shared array; Day 2
// drives a grid the same way; Day 3 runs two sorting generators side by
// side off one shared clock so their progress is directly comparable. A
// mode switch just picks which branch of the combined driver loop advances
// each frame.

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const algoSelect = document.getElementById("algo-select");
const speedInput = document.getElementById("speed");
const startBtn = document.getElementById("btn-start");
const stepBtn = document.getElementById("btn-step");
const shuffleBtn = document.getElementById("btn-shuffle");
const comparesEl = document.getElementById("stat-compares");
const swapsEl = document.getElementById("stat-swaps");
const stepsEl = document.getElementById("stat-steps");
const statusEl = document.getElementById("stat-status");

const ARRAY_SIZE = 70;
const MAX_VALUE = 400;

let arr = [];
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
    const barHeight = (val / MAX_VALUE) * (H - 10);
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
  resetRun();
  draw();
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

// --- Mode switching ----------------------------------------------------

let mode = "sorting";
const tabButtons = document.querySelectorAll(".tab-btn");
const stageWrap = document.getElementById("stage-wrap");
const sortingPanel = document.getElementById("panel-sorting");
const pathfindingPanel = document.getElementById("panel-pathfinding");
const racePanel = document.getElementById("panel-race");
const raceStageWrap = document.getElementById("race-stage-wrap");

function setMode(newMode) {
  mode = newMode;
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  sortingPanel.classList.toggle("hidden", mode !== "sorting");
  pathfindingPanel.classList.toggle("hidden", mode !== "pathfinding");
  racePanel.classList.toggle("hidden", mode !== "race");
  stageWrap.classList.toggle("hidden", mode === "race");
  canvas.classList.toggle("hidden", mode !== "sorting");
  gridCanvas.classList.toggle("hidden", mode !== "pathfinding");
  raceStageWrap.classList.toggle("hidden", mode !== "race");
}

tabButtons.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));

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
  } else {
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
  requestAnimationFrame(frame);
}

arr = randomArray(ARRAY_SIZE);
renderRoadmap();
generateMaze();
raceNewArray();
draw();
drawGrid();
drawRace();
requestAnimationFrame(frame);
