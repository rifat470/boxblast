// BoxBlast Match: the swap puzzle. One engine, used by the browser (to play) AND by the server (to replay and verify every round).
// No imports on purpose, so it runs anywhere. Everything is deterministic from (seed, level).
export const COLS = 7;
export const ROWS = 7;
export const GEM_IDS = ['white', 'black', 'silver', 'red', 'blue', 'diamond'];
const GEM_WEIGHTS = [60, 22, 10, 6, 2, 0]; // the Eternal Diamond never drops from a box
const GEM_CHANCE = 0.03; // chance that a new box hides a gem

// c = colour 0..5 (-1 for a rainbow box), g = gem index or -1, sp = special box: 0 none, 1 bomb (clears 3x3 when it bursts), 2 rainbow (swap it with a box: all boxes of that colour burst)
export type Cell = { id: number; c: number; g: number; sp: number };
export type Board = (Cell | null)[][];
export type Goal = { color: number; n: number };
export type LevelInfo = { level: number; colors: number; moves: number; goals: Goal[] };
export type Step =
  | { kind: 'swap'; board: Board }
  | {
      kind: 'clear';
      board: Board;
      cleared: { id: number; r: number; c: number; col: number; g: number; sp: number }[];
      chain: number;
      spawned: { id: number; r: number; c: number; sp: number; col: number }[]; // new special boxes born in this step (they stay on the board)
      booms: { r: number; c: number; kind: 'bomb' | 'rainbow' }[]; // where a special box went off
    }
  | { kind: 'fall'; board: Board }
  | { kind: 'shuffle'; board: Board };
export type State = {
  a: number; // random generator state
  nextId: number;
  colors: number;
  board: Board;
  goals: Goal[];
  collected: number[]; // boxes burst per colour
  gems: number[]; // gems found per gem type
  score: number;
  movesLeft: number;
  used: number;
};

export function levelInfo(level: number): LevelInfo {
  const L = Math.max(1, Math.floor(level) || 1);
  const colors = L <= 3 ? 5 : 6;
  const moves = L <= 2 ? 24 : L <= 10 ? 22 : L <= 30 ? 21 : 20;
  // Total boxes to collect. Gentle start, then a steady climb. Every 5th level is an easier "breather", every 10th a harder "boss".
  let total = L === 1 ? 14 : L === 2 ? 26 : L === 3 ? 36 : Math.min(68, 40 + Math.floor(L * 0.9));
  if (L > 3 && L % 10 === 0) total = Math.round(total * 1.15);
  else if (L > 3 && L % 5 === 0) total = Math.round(total * 0.84);
  const kinds = L === 1 ? 1 : L < 12 ? 2 : 3;
  const goals: Goal[] = [];
  let left = total;
  for (let k = 0; k < kinds; k++) {
    const n = k === kinds - 1 ? left : Math.round(total / kinds);
    goals.push({ color: (L + k * 2) % colors, n });
    left -= n;
  }
  return { level: L, colors, moves, goals };
}

function rnd(s: { a: number }) {
  s.a = (s.a + 0x6d2b79f5) | 0;
  let t = Math.imul(s.a ^ (s.a >>> 15), 1 | s.a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pickGem(s: State): number {
  if (rnd(s) >= GEM_CHANCE) return -1;
  const total = GEM_WEIGHTS.reduce((a, b) => a + b, 0);
  let x = rnd(s) * total;
  for (let i = 0; i < GEM_WEIGHTS.length; i++) {
    x -= GEM_WEIGHTS[i];
    if (x < 0) return i;
  }
  return 0;
}

const makeCell = (s: State, c: number): Cell => ({ id: s.nextId++, c, g: pickGem(s), sp: 0 });
const copyBoard = (b: Board): Board => b.map((row) => row.slice());

function wouldMatch(board: Board, r: number, c: number, col: number) {
  const at = (rr: number, cc: number) => (board[rr] && board[rr][cc] ? board[rr][cc]!.c : -1);
  return (at(r, c - 1) === col && at(r, c - 2) === col) || (at(r - 1, c) === col && at(r - 2, c) === col);
}

export function newRound(seed: number, level: number, extraMoves = 0): State {
  const info = levelInfo(level);
  const s: State = {
    a: seed >>> 0,
    nextId: 1,
    colors: info.colors,
    board: [],
    goals: info.goals,
    collected: new Array(6).fill(0),
    gems: new Array(6).fill(0),
    score: 0,
    movesLeft: info.moves + extraMoves,
    used: 0,
  };
  fillFresh(s);
  return s;
}

function fillFresh(s: State) {
  const board: Board = [];
  for (let r = 0; r < ROWS; r++) {
    board.push(new Array(COLS).fill(null));
    for (let c = 0; c < COLS; c++) {
      let col = Math.floor(rnd(s) * s.colors);
      let guard = 0;
      while (wouldMatch(board, r, c, col) && guard++ < 20) col = (col + 1) % s.colors;
      board[r][c] = makeCell(s, col);
    }
  }
  s.board = board;
  if (!hasMoves(s.board)) fillFresh(s);
}

type Run = { cells: [number, number][]; col: number; horiz: boolean };

/** Every straight run of 3 or more boxes of the same colour (a rainbow box never makes a run). */
export function findRuns(board: Board): Run[] {
  const runs: Run[] = [];
  const same = (a: Cell | null, b: Cell | null) => !!a && !!b && a.c >= 0 && a.c === b.c;
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && same(board[r][c], board[r][c - 1])) run++;
      else {
        if (run >= 3) {
          const cells: [number, number][] = [];
          for (let k = c - run; k < c; k++) cells.push([r, k]);
          runs.push({ cells, col: board[r][c - 1]!.c, horiz: true });
        }
        run = 1;
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && same(board[r][c], board[r - 1][c])) run++;
      else {
        if (run >= 3) {
          const cells: [number, number][] = [];
          for (let k = r - run; k < r; k++) cells.push([k, c]);
          runs.push({ cells, col: board[r - 1][c]!.c, horiz: false });
        }
        run = 1;
      }
    }
  }
  return runs;
}

export function findMatches(board: Board): [number, number][] {
  const seen = new Set<number>();
  const out: [number, number][] = [];
  for (const run of findRuns(board))
    for (const [r, c] of run.cells) {
      const k = r * COLS + c;
      if (!seen.has(k)) {
        seen.add(k);
        out.push([r, c]);
      }
    }
  out.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return out;
}

function swapped(board: Board, r1: number, c1: number, r2: number, c2: number): Board {
  const b = board.map((row) => row.slice());
  const t = b[r1][c1];
  b[r1][c1] = b[r2][c2];
  b[r2][c2] = t;
  return b;
}

export function hasMoves(board: Board): boolean {
  return listMoves(board).length > 0;
}

/** Every swap that creates a match, as [r1,c1,r2,c2]. */
export function listMoves(board: Board): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const rb = (rr: number, cc: number) => !!board[rr][cc] && board[rr][cc]!.sp === 2;
      if (c + 1 < COLS && (rb(r, c) || rb(r, c + 1) || findMatches(swapped(board, r, c, r, c + 1)).length)) out.push([r, c, r, c + 1]);
      if (r + 1 < ROWS && (rb(r, c) || rb(r + 1, c) || findMatches(swapped(board, r, c, r + 1, c)).length)) out.push([r, c, r + 1, c]);
    }
  return out;
}

function fall(s: State) {
  for (let c = 0; c < COLS; c++) {
    const col: Cell[] = [];
    for (let r = ROWS - 1; r >= 0; r--) if (s.board[r][c]) col.push(s.board[r][c]!);
    const empty = ROWS - col.length;
    for (let r = ROWS - 1; r >= empty; r--) s.board[r][c] = col[ROWS - 1 - r];
    for (let r = 0; r < empty; r++) s.board[r][c] = makeCell(s, Math.floor(rnd(s) * s.colors));
  }
}

function reshuffle(s: State) {
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push(s.board[r][c]!);
  for (let attempt = 0; attempt < 40; attempt++) {
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rnd(s) * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const b: Board = [];
    for (let r = 0; r < ROWS; r++) b.push(cells.slice(r * COLS, r * COLS + COLS));
    if (!findMatches(b).length && hasMoves(b)) {
      s.board = b;
      return;
    }
  }
  fillFresh(s); // extremely rare: brand new boxes
}

export function goalsMet(s: State): boolean {
  return s.goals.every((g) => s.collected[g.color] >= g.n);
}

type Info = { id: number; r: number; c: number; col: number; g: number; sp: number };

/** Bursts a set of cells: counts the boxes and gems, removes them, and sets off every bomb in the set (a bomb clears the 3x3 around it). */
function burst(s: State, set: Map<number, [number, number]>, keep: Set<number>, booms: { r: number; c: number; kind: 'bomb' | 'rainbow' }[]): Info[] {
  const done = new Set<number>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [k, [r, c]] of Array.from(set.entries())) {
      const cell = s.board[r][c];
      if (cell && cell.sp === 1 && !done.has(k)) {
        done.add(k);
        booms.push({ r, c, kind: 'bomb' });
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr, cc = c + dc, kk = rr * COLS + cc;
            if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS || !s.board[rr][cc] || keep.has(kk) || set.has(kk)) continue;
            set.set(kk, [rr, cc]);
            grew = true;
          }
      }
    }
  }
  const out: Info[] = [];
  const keys = Array.from(set.keys()).sort((x, y) => x - y);
  for (const k of keys) {
    const [r, c] = set.get(k)!;
    const cell = s.board[r][c]!;
    if (cell.c >= 0) s.collected[cell.c]++;
    if (cell.g >= 0) s.gems[cell.g]++;
    out.push({ id: cell.id, r, c, col: cell.c, g: cell.g, sp: cell.sp });
    s.board[r][c] = null;
  }
  return out;
}

function resolve(s: State, first?: { a: [number, number]; b: [number, number] }, rainbow?: Map<number, [number, number]>): Step[] {
  const steps: Step[] = [];
  let chain = 0;
  // A rainbow box that was swapped: it bursts every box of one colour (and itself) before the normal matches.
  if (rainbow && rainbow.size) {
    chain++;
    const booms: { r: number; c: number; kind: 'bomb' | 'rainbow' }[] = [{ r: first!.a[0], c: first!.a[1], kind: 'rainbow' }];
    const cleared = burst(s, rainbow, new Set(), booms);
    s.score += cleared.length * 12 * chain + 120;
    steps.push({ kind: 'clear', board: copyBoard(s.board), cleared, chain, spawned: [], booms });
    fall(s);
    steps.push({ kind: 'fall', board: copyBoard(s.board) });
  }
  for (;;) {
    const runs = findRuns(s.board);
    if (!runs.length) break;
    chain++;
    const set = new Map<number, [number, number]>();
    const keep = new Set<number>();
    const spawnList: { r: number; c: number; sp: number; col: number }[] = [];
    for (const run of runs) {
      for (const [r, c] of run.cells) set.set(r * COLS + c, [r, c]);
      if (run.cells.length >= 4) {
        // the new special box sits where the player moved a box (first move), otherwise in the middle of the run
        let anchor = run.cells[Math.floor(run.cells.length / 2)];
        if (chain === 1 && first) {
          const hit = run.cells.find(([r, c]) => (r === first.a[0] && c === first.a[1]) || (r === first.b[0] && c === first.b[1]));
          if (hit) anchor = hit;
        }
        const k = anchor[0] * COLS + anchor[1];
        if (!keep.has(k)) {
          keep.add(k);
          spawnList.push({ r: anchor[0], c: anchor[1], sp: run.cells.length >= 5 ? 2 : 1, col: run.col });
        }
      }
    }
    for (const k of keep) set.delete(k);
    const booms: { r: number; c: number; kind: 'bomb' | 'rainbow' }[] = [];
    const cleared = burst(s, set, keep, booms);
    const spawned = spawnList.map((p) => {
      // a NEW cell object (same id): boards are copied shallowly, so a cell is never changed in place
      const cell = s.board[p.r][p.c]!;
      s.board[p.r][p.c] = { id: cell.id, g: cell.g, sp: p.sp, c: p.sp === 2 ? -1 : cell.c };
      return { id: cell.id, r: p.r, c: p.c, sp: p.sp, col: p.col };
    });
    s.score += cleared.length * 10 * chain + (cleared.length > 3 ? (cleared.length - 3) * 15 : 0) + spawned.length * 40 + booms.length * 60;
    steps.push({ kind: 'clear', board: copyBoard(s.board), cleared, chain, spawned, booms });
    fall(s);
    steps.push({ kind: 'fall', board: copyBoard(s.board) });
  }
  if (!hasMoves(s.board)) {
    reshuffle(s);
    steps.push({ kind: 'shuffle', board: copyBoard(s.board) });
  }
  return steps;
}

/** Try to swap two neighbouring boxes. A swap that makes no match (and does not use a rainbow box) changes nothing and costs no move. */
export function trySwap(
  s: State,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): { valid: boolean; steps: Step[] } {
  const ints = [r1, c1, r2, c2].every((v) => Number.isInteger(v));
  if (!ints || r1 < 0 || r2 < 0 || c1 < 0 || c2 < 0 || r1 >= ROWS || r2 >= ROWS || c1 >= COLS || c2 >= COLS)
    return { valid: false, steps: [] };
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return { valid: false, steps: [] };
  const A = s.board[r1][c1], B = s.board[r2][c2];
  if (!A || !B) return { valid: false, steps: [] };
  const b = swapped(s.board, r1, c1, r2, c2);
  const rainbowSwap = A.sp === 2 || B.sp === 2;
  if (!rainbowSwap && !findMatches(b).length) return { valid: false, steps: [] };
  s.board = b;
  s.movesLeft--;
  s.used++;
  const steps: Step[] = [{ kind: 'swap', board: copyBoard(s.board) }];
  let rainbow: Map<number, [number, number]> | undefined;
  let where: [number, number] = [r1, c1];
  if (rainbowSwap) {
    // after the swap the rainbow box sits where the other box was; its target colour is the colour of the box it was swapped with
    const rainbowCell = A.sp === 2 ? A : B;
    const other = A.sp === 2 ? B : A;
    const pos: [number, number] = A.sp === 2 ? [r2, c2] : [r1, c1];
    where = pos;
    rainbow = new Map();
    rainbow.set(pos[0] * COLS + pos[1], pos);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cell = s.board[r][c];
        if (!cell || cell === rainbowCell) continue;
        if (other.sp === 2 || (other.c >= 0 && cell.c === other.c)) rainbow.set(r * COLS + c, [r, c]);
      }
  }
  steps.push(...resolve(s, { a: where, b: [r2, c2] }, rainbow));
  return { valid: true, steps };
}

export function cloneState(s: State): State {
  return { ...s, board: copyBoard(s.board), goals: s.goals, collected: s.collected.slice(), gems: s.gems.slice() };
}
