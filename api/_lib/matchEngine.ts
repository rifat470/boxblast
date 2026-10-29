// BoxBlast Match: the swap puzzle. One engine, used by the browser (to play) AND by the server (to replay and verify every round).
// No imports on purpose, so it runs anywhere. Everything is deterministic from (seed, level).
export const COLS = 7;
export const ROWS = 7;
export const GEM_IDS = ['white', 'black', 'silver', 'red', 'blue', 'diamond'];
const GEM_WEIGHTS = [60, 22, 10, 6, 2, 0]; // the Eternal Diamond never drops from a box
const GEM_CHANCE = 0.03; // chance that a new box hides a gem

export type Cell = { id: number; c: number; g: number }; // c = colour 0..5, g = gem index or -1
export type Board = (Cell | null)[][];
export type Goal = { color: number; n: number };
export type LevelInfo = { level: number; colors: number; moves: number; goals: Goal[] };
export type Step =
  | { kind: 'swap'; board: Board }
  | { kind: 'clear'; board: Board; cleared: { id: number; r: number; c: number; col: number; g: number }[]; chain: number }
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
  let total = L === 1 ? 14 : L === 2 ? 24 : L === 3 ? 32 : Math.min(56, 32 + Math.floor(L * 0.8));
  if (L > 3 && L % 10 === 0) total = Math.round(total * 1.12);
  else if (L > 3 && L % 5 === 0) total = Math.round(total * 0.82);
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

const makeCell = (s: State, c: number): Cell => ({ id: s.nextId++, c, g: pickGem(s) });
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

export function findMatches(board: Board): [number, number][] {
  const mark: boolean[][] = board.map((row) => row.map(() => false));
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const same = c < COLS && board[r][c] && board[r][c - 1] && board[r][c]!.c === board[r][c - 1]!.c;
      if (same) run++;
      else {
        if (run >= 3) for (let k = c - run; k < c; k++) mark[r][k] = true;
        run = 1;
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const same = r < ROWS && board[r][c] && board[r - 1][c] && board[r][c]!.c === board[r - 1][c]!.c;
      if (same) run++;
      else {
        if (run >= 3) for (let k = r - run; k < r; k++) mark[k][c] = true;
        run = 1;
      }
    }
  }
  const out: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (mark[r][c]) out.push([r, c]);
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
      if (c + 1 < COLS && findMatches(swapped(board, r, c, r, c + 1)).length) out.push([r, c, r, c + 1]);
      if (r + 1 < ROWS && findMatches(swapped(board, r, c, r + 1, c)).length) out.push([r, c, r + 1, c]);
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

function resolve(s: State): Step[] {
  const steps: Step[] = [];
  let chain = 0;
  for (;;) {
    const m = findMatches(s.board);
    if (!m.length) break;
    chain++;
    const cleared = m.map(([r, c]) => {
      const cell = s.board[r][c]!;
      s.collected[cell.c]++;
      if (cell.g >= 0) s.gems[cell.g]++;
      return { id: cell.id, r, c, col: cell.c, g: cell.g };
    });
    for (const [r, c] of m) s.board[r][c] = null;
    s.score += m.length * 10 * chain + (m.length > 3 ? (m.length - 3) * 15 : 0);
    steps.push({ kind: 'clear', board: copyBoard(s.board), cleared, chain });
    fall(s);
    steps.push({ kind: 'fall', board: copyBoard(s.board) });
  }
  if (!hasMoves(s.board)) {
    reshuffle(s);
    steps.push({ kind: 'shuffle', board: copyBoard(s.board) });
  }
  return steps;
}

/** Try to swap two neighbouring boxes. Invalid swaps (no match) change nothing and cost no move. */
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
  if (!s.board[r1][c1] || !s.board[r2][c2]) return { valid: false, steps: [] };
  const b = swapped(s.board, r1, c1, r2, c2);
  if (!findMatches(b).length) return { valid: false, steps: [] };
  s.board = b;
  s.movesLeft--;
  s.used++;
  return { valid: true, steps: [{ kind: 'swap', board: copyBoard(s.board) }, ...resolve(s)] };
}

export function cloneState(s: State): State {
  return { ...s, board: copyBoard(s.board), goals: s.goals, collected: s.collected.slice(), gems: s.gems.slice() };
}
