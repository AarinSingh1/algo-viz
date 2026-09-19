// Algo Viz — Day 1 (sorting) + Day 2 (pathfinding)
// Both modes share the same pattern: pull one "step" at a time off a
// generator (from algorithms.js) on a speed-controlled clock, apply it to
// shared state, and paint. Sorting drives bars from a shared array; the
// Day 2 section below drives a grid the same way. A mode switch just picks
// which half of the combined driver loop advances each frame.

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const algoSelect = document.getElementById("algo-select");
const speedInput = document.getElementById("speed");
const startBtn = document.getElementById("btn-start");
const shuffleBtn = document.getElementById("btn-shuffle");
const comparesEl = document.getElementById("stat-compares");
const swapsEl = document.getElementById("stat-swaps");
const statusEl = document.getElementById("stat-status");

const ARRAY_SIZE = 70;
const MAX_VALUE = 400;

let arr = [];
let gen = null;
let running = false;
let comparisons = 0;
let swaps = 0;
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
  compareSet.clear();
  swapSet.clear();
  sortedSet.clear();
  comparesEl.textContent = "0";
  swapsEl.textContent = "0";
  statusEl.textContent = "Idle";
  startBtn.textContent = "Start";
  algoSelect.disabled = false;
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
    gen = ALGORITHMS[algoSelect.value](arr);
    comparisons = 0;
    swaps = 0;
    sortedSet.clear();
    comparesEl.textContent = "0";
    swapsEl.textContent = "0";
    algoSelect.disabled = true;
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
const gridMazeBtn = document.getElementById("grid-btn-maze");
const visitedEl = document.getElementById("stat-visited");
const pathLenEl = document.getElementById("stat-pathlen");
const gridStatusEl = document.getElementById("stat-gridstatus");

let wallSet = new Set();
let pathGen = null;
let pathRunning = false;
let gridAcc = 0;
let gridLastTime = 0;
let visitedCount = 0;

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
  visitedEl.textContent = "0";
  pathLenEl.textContent = "0";
  gridStatusEl.textContent = "Idle";
  gridStartBtn.textContent = "Start";
  gridAlgoSelect.disabled = false;
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
    const grid = makeGrid(GRID_COLS, GRID_ROWS, wallSet, startIdx, endIdx);
    pathGen = PATHFINDING_ALGORITHMS[gridAlgoSelect.value](grid);
    frontierSet.clear();
    visitedSet.clear();
    pathSet.clear();
    visitedCount = 0;
    visitedEl.textContent = "0";
    pathLenEl.textContent = "0";
    gridAlgoSelect.disabled = true;
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

gridMazeBtn.addEventListener("click", () => {
  generateMaze();
  resetGridRun();
  drawGrid();
});

// --- Mode switching ----------------------------------------------------

let mode = "sorting";
const tabButtons = document.querySelectorAll(".tab-btn");
const sortingPanel = document.getElementById("panel-sorting");
const pathfindingPanel = document.getElementById("panel-pathfinding");

function setMode(newMode) {
  mode = newMode;
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  sortingPanel.classList.toggle("hidden", mode !== "sorting");
  pathfindingPanel.classList.toggle("hidden", mode !== "pathfinding");
  canvas.classList.toggle("hidden", mode !== "sorting");
  gridCanvas.classList.toggle("hidden", mode !== "pathfinding");
}

tabButtons.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));

// --- Combined driver loop ------------------------------------------------
// Dispatches to whichever mode is active, so both the Day 1 sorting loop
// and the Day 2 pathfinding loop share one requestAnimationFrame clock.

function frame(ts) {
  if (mode === "sorting") {
    if (running && gen) {
      if (!lastTime) lastTime = ts;
      acc += ts - lastTime;
      lastTime = ts;
      const interval = speedToInterval(Number(speedInput.value));
      let stepsThisFrame = 0;
      while (acc >= interval && stepsThisFrame < 500) {
        const { value, done } = gen.next();
        acc -= interval;
        stepsThisFrame++;
        if (done) {
          finishRun();
          break;
        }
        applyStep(value);
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
        const { value, done } = pathGen.next();
        gridAcc -= interval;
        stepsThisFrame++;
        if (done) {
          finishGridRun();
          break;
        }
        applyGridStep(value);
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
draw();
drawGrid();
requestAnimationFrame(frame);
