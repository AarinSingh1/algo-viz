// Algo Viz — Day 1
// Drives the sorting generators from algorithms.js: pulls one "step" at a
// time on a speed-controlled clock, applies it to the shared array, and
// paints the current state as bars. Later days (pathfinding, race mode,
// stepping, custom input, complexity overlay, dashboard) build on this same
// step/draw loop.

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

function frame(ts) {
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
  requestAnimationFrame(frame);
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

arr = randomArray(ARRAY_SIZE);
renderRoadmap();
draw();
requestAnimationFrame(frame);
