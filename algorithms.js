// Each sorter is a generator over a shared `arr`. It mutates `arr` directly
// and yields small step descriptions so the renderer can animate and count
// without knowing anything about the algorithm itself.
//
// Step shapes:
//   { type: "compare", i, j }   — comparing two indices
//   { type: "swap", i, j }      — arr[i] and arr[j] have just been swapped
//   { type: "overwrite", i, value } — arr[i] was set directly (merge sort)
//   { type: "sorted", i }       — index i is now in its final position

function* bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      yield { type: "compare", i: j, j: j + 1 };
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
        yield { type: "swap", i: j, j: j + 1 };
      }
    }
    yield { type: "sorted", i: n - 1 - i };
    if (!swapped) break;
  }
  for (let i = 0; i < n; i++) yield { type: "sorted", i };
}

function* selectionSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      yield { type: "compare", i: min, j };
      if (arr[j] < arr[min]) min = j;
    }
    if (min !== i) {
      [arr[i], arr[min]] = [arr[min], arr[i]];
      yield { type: "swap", i, j: min };
    }
    yield { type: "sorted", i };
  }
}

function* insertionSort(arr) {
  const n = arr.length;
  yield { type: "sorted", i: 0 };
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      yield { type: "compare", i: j - 1, j };
      if (arr[j - 1] > arr[j]) {
        [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
        yield { type: "swap", i: j - 1, j };
        j--;
      } else {
        break;
      }
    }
    for (let k = 0; k <= i; k++) yield { type: "sorted", i: k };
  }
}

function* mergeSort(arr) {
  function* sort(lo, hi) {
    if (hi - lo <= 1) return;
    const mid = Math.floor((lo + hi) / 2);
    yield* sort(lo, mid);
    yield* sort(mid, hi);

    const left = arr.slice(lo, mid);
    const right = arr.slice(mid, hi);
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      yield { type: "compare", i: lo + i, j: mid + j };
      if (left[i] <= right[j]) {
        arr[k] = left[i++];
      } else {
        arr[k] = right[j++];
      }
      yield { type: "overwrite", i: k, value: arr[k] };
      k++;
    }
    while (i < left.length) {
      arr[k] = left[i++];
      yield { type: "overwrite", i: k, value: arr[k] };
      k++;
    }
    while (j < right.length) {
      arr[k] = right[j++];
      yield { type: "overwrite", i: k, value: arr[k] };
      k++;
    }
    for (let m = lo; m < hi; m++) yield { type: "sorted", i: m };
  }
  yield* sort(0, arr.length);
}

function* quickSort(arr) {
  function* partition(lo, hi) {
    const pivot = arr[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      yield { type: "compare", i: j, j: hi };
      if (arr[j] < pivot) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        if (i !== j) yield { type: "swap", i, j };
        i++;
      }
    }
    [arr[i], arr[hi]] = [arr[hi], arr[i]];
    if (i !== hi) yield { type: "swap", i, j: hi };
    yield { type: "sorted", i };
    return i;
  }

  function* sort(lo, hi) {
    if (lo >= hi) {
      if (lo === hi) yield { type: "sorted", i: lo };
      return;
    }
    const p = yield* partition(lo, hi);
    yield* sort(lo, p - 1);
    yield* sort(p + 1, hi);
  }

  yield* sort(0, arr.length - 1);
}

const ALGORITHMS = {
  bubble: bubbleSort,
  selection: selectionSort,
  insertion: insertionSort,
  merge: mergeSort,
  quick: quickSort,
};

// --- Pathfinding (Day 2) ---------------------------------------------------
// Same generator pattern as the sorters above, but operating on a grid
// instead of an array. Each cell is addressed by a flat index
// `i = row * cols + col` so steps stay simple values, exactly like the
// sorters' array indices.
//
// Step shapes:
//   { type: "frontier", i } — cell i was added to the frontier/open set
//   { type: "visit", i }    — cell i was dequeued/settled and examined
//   { type: "path", i }     — cell i is part of the reconstructed path

function makeGrid(cols, rows, wallSet, start, end) {
  return {
    cols,
    rows,
    start,
    end,
    neighbors(i) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const out = [];
      if (r > 0) out.push(i - cols);
      if (r < rows - 1) out.push(i + cols);
      if (c > 0) out.push(i - 1);
      if (c < cols - 1) out.push(i + 1);
      return out.filter((n) => !wallSet.has(n));
    },
  };
}

function* reconstructPath(cameFrom, end, start) {
  const path = [end];
  let cur = end;
  while (cur !== start) {
    cur = cameFrom.get(cur);
    if (cur === undefined) return;
    path.push(cur);
  }
  path.reverse();
  for (const i of path) yield { type: "path", i };
}

function* bfs(grid) {
  const { start, end } = grid;
  const visited = new Set([start]);
  const queue = [start];
  const cameFrom = new Map();
  yield { type: "frontier", i: start };
  while (queue.length) {
    const current = queue.shift();
    yield { type: "visit", i: current };
    if (current === end) {
      yield* reconstructPath(cameFrom, end, start);
      return;
    }
    for (const next of grid.neighbors(current)) {
      if (!visited.has(next)) {
        visited.add(next);
        cameFrom.set(next, current);
        queue.push(next);
        yield { type: "frontier", i: next };
      }
    }
  }
}

function* dfs(grid) {
  const { start, end } = grid;
  const visited = new Set([start]);
  const stack = [start];
  const cameFrom = new Map();
  yield { type: "frontier", i: start };
  while (stack.length) {
    const current = stack.pop();
    yield { type: "visit", i: current };
    if (current === end) {
      yield* reconstructPath(cameFrom, end, start);
      return;
    }
    for (const next of grid.neighbors(current)) {
      if (!visited.has(next)) {
        visited.add(next);
        cameFrom.set(next, current);
        stack.push(next);
        yield { type: "frontier", i: next };
      }
    }
  }
}

function* dijkstra(grid) {
  const { start, end } = grid;
  const dist = new Map([[start, 0]]);
  const visited = new Set();
  const cameFrom = new Map();
  const frontier = [start];
  yield { type: "frontier", i: start };
  while (frontier.length) {
    let bi = 0;
    for (let k = 1; k < frontier.length; k++) {
      if (dist.get(frontier[k]) < dist.get(frontier[bi])) bi = k;
    }
    const current = frontier.splice(bi, 1)[0];
    if (visited.has(current)) continue;
    visited.add(current);
    yield { type: "visit", i: current };
    if (current === end) {
      yield* reconstructPath(cameFrom, end, start);
      return;
    }
    for (const next of grid.neighbors(current)) {
      const nd = dist.get(current) + 1;
      if (!dist.has(next) || nd < dist.get(next)) {
        dist.set(next, nd);
        cameFrom.set(next, current);
        if (!visited.has(next)) {
          frontier.push(next);
          yield { type: "frontier", i: next };
        }
      }
    }
  }
}

function* astar(grid) {
  const { start, end, cols } = grid;
  const endR = Math.floor(end / cols);
  const endC = end % cols;
  const h = (i) => Math.abs(Math.floor(i / cols) - endR) + Math.abs((i % cols) - endC);

  const gScore = new Map([[start, 0]]);
  const fScore = new Map([[start, h(start)]]);
  const visited = new Set();
  const cameFrom = new Map();
  const open = [start];
  yield { type: "frontier", i: start };
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) {
      if (fScore.get(open[k]) < fScore.get(open[bi])) bi = k;
    }
    const current = open.splice(bi, 1)[0];
    if (visited.has(current)) continue;
    visited.add(current);
    yield { type: "visit", i: current };
    if (current === end) {
      yield* reconstructPath(cameFrom, end, start);
      return;
    }
    for (const next of grid.neighbors(current)) {
      const tentative = gScore.get(current) + 1;
      if (!gScore.has(next) || tentative < gScore.get(next)) {
        gScore.set(next, tentative);
        fScore.set(next, tentative + h(next));
        cameFrom.set(next, current);
        if (!visited.has(next)) {
          open.push(next);
          yield { type: "frontier", i: next };
        }
      }
    }
  }
}

const PATHFINDING_ALGORITHMS = {
  bfs,
  dfs,
  dijkstra,
  astar,
};
