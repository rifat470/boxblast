import { useEffect, useMemo, useRef, useState } from 'react';
import { call, fmt, haptic } from './api';
import type { Ctx } from './App';
import GemIcon from './GemIcon';
import { sound } from './effects';
import {
  COLS, ROWS, GEM_IDS, cloneState, findMatches, goalsMet, levelInfo, listMoves, newRound, trySwap, type Board, type Cell, type State, type Step,
} from '../api/_lib/matchEngine';

// The swap puzzle. The browser plays it; the server hands out the seed and later REPLAYS every move, so nothing can be faked.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad = (n: number) => String(n).padStart(2, '0');
type Move = [number, number, number, number];
type Phase = 'lobby' | 'playing' | 'busy' | 'won' | 'lost' | 'stuck';
const BOX_COLORS = ['#e0a561', '#8ec5ff', '#6d8fd0', '#b27dff', '#3ddc84', '#ff5468'];
type Hint = { a: [number, number]; b: [number, number]; also: [number, number][] };

const TUT_KEY = 'bbMatchGuide1';
let tutMemory = false;
const tutDone = () => {
  try {
    return tutMemory || localStorage.getItem(TUT_KEY) === '1';
  } catch {
    return tutMemory;
  }
};
const tutSave = () => {
  tutMemory = true;
  try {
    localStorage.setItem(TUT_KEY, '1');
  } catch {
    /* ignore */
  }
};

/** The road of levels: the 2 levels behind you, the one you are on, and the next 5. Every 10th level is a boss level. */
function LevelMap({ level }: { level: number }) {
  const from = Math.max(1, level - 2);
  const nodes = Array.from({ length: level - from + 6 }, (_, i) => from + i);
  return (
    <div className="m-map" data-testid="level-map" aria-label="Level map">
      {nodes.map((n) => {
        const boss = n % 10 === 0;
        const st = n < level ? 'done' : n === level ? 'now' : 'next';
        return (
          <div key={n} className={`m-node ${st}${boss ? ' boss' : ''}`} data-testid={st === 'now' ? 'node-current' : undefined}>
            <i>{st === 'done' ? '✓' : boss ? '👑' : n}</i>
            <small>{boss ? 'BOSS' : st === 'now' ? 'YOU' : ''}</small>
          </div>
        );
      })}
    </div>
  );
}

export default function Match({ ctx }: { ctx: Ctx }) {
  const { s, nowMs, flash, adAction, adBusy, showGem, gateAd } = ctx;
  const m = s.match;
  const [phase, setPhase] = useState<Phase>('lobby');
  const [roundId, setRoundId] = useState('');
  const [board, setBoard] = useState<Board>([]);
  const [pop, setPop] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [view, setView] = useState({ moves: 0, score: 0, collected: [0, 0, 0, 0, 0, 0], gems: [0, 0, 0, 0, 0, 0], chain: 0 });
  const [goals, setGoals] = useState<{ color: number; n: number }[]>([]);
  const [level, setLevel] = useState(m.level);
  const [result, setResult] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [bursts, setBursts] = useState<{ k: number; r: number; c: number; col: number; gem: boolean }[]>([]);
  const [combo, setCombo] = useState<{ k: number; n: number } | null>(null);
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [tick, setTick] = useState(0);
  const [bad, setBad] = useState<[number, number, number, number] | null>(null);
  const [tut, setTut] = useState(0); // 0 = no guide, 1..3 = the three guide steps (first round of a new player only)
  const [booms, setBooms] = useState<{ k: number; r: number; c: number; kind: 'bomb' | 'rainbow' }[]>([]);
  const [born, setBorn] = useState<Set<number>>(new Set());
  const curBoard = useRef<Board>([]);
  const burstKey = useRef(1);
  const st = useRef<State | null>(null);
  const moves = useRef<Move[]>([]);
  const lock = useRef(false);
  const down = useRef<{ x: number; y: number; r: number; c: number; id: number } | null>(null);
  const boardEl = useRef<HTMLDivElement>(null);

  const showBoard = (b: Board) => {
    curBoard.current = b;
    setBoard(b);
  };

  const sync = () => {
    const x = st.current!;
    setView({ moves: x.movesLeft, score: x.score, collected: x.collected.slice(), gems: x.gems.slice(), chain: 0 });
  };

  // ---------- start / resume a round ----------
  const start = async () => {
    if (lock.current) return;
    lock.current = true;
    try {
      const r = await ctx.act('matchStart');
      if (!r) return;
      const info = r.result.round;
      const x = newRound(info.seed, info.level, info.extra);
      st.current = x;
      moves.current = [];
      setRoundId(info.id);
      setLevel(info.level);
      setGoals(x.goals);
      showBoard(x.board.map((row) => row.slice()));
      setResult(null);
      setSel(null);
      setMsg(r.result.resumed ? 'Your unfinished round is back. Same board, no extra heart used.' : '');
      setTut(!tutDone() && info.level === 1 ? 1 : 0);
      sync();
      setPhase('playing');
    } finally {
      lock.current = false;
    }
  };

  // ---------- one swap ----------
  const attempt = async (r1: number, c1: number, r2: number, c2: number) => {
    const x = st.current;
    if (!x || lock.current || phase !== 'playing') return;
    if (x.movesLeft <= 0 || goalsMet(x)) return;
    lock.current = true;
    const res = trySwap(x, r1, c1, r2, c2);
    if (!res.valid) {
      sound.playMiss();
      setMsg('Those two boxes make no match. Try another swap. This does not cost a move.');
      setBad([r1, c1, r2, c2]);
      setTimeout(() => setBad(null), 360);
      haptic('light');
      lock.current = false;
      return;
    }
    setMsg('');
    moves.current.push([r1, c1, r2, c2]);
    setTut((t) => (t > 0 && t < 3 ? t + 1 : t));
    haptic('light');
    sound.playTap();
    await play(res.steps);
    sync();
    lock.current = false;
    // end of the round?
    if (goalsMet(x)) return void (await finish());
    if (x.movesLeft <= 0) setPhase('stuck'); // out of moves: watch an ad for +5 moves, or give up
  };

  // Blast effect: every cleared box throws coloured sparks and a ring; chains shake the board and show a "CHAIN" label.
  const blast = (cleared: { id: number; c: number; g: number }[], chain: number, extra?: { spawned: { id: number }[]; booms: { r: number; c: number; kind: 'bomb' | 'rainbow' }[] }) => {
    const where = new Map<number, [number, number]>();
    curBoard.current.forEach((row, r) => row.forEach((cell, c) => { if (cell) where.set(cell.id, [r, c]); }));
    const add = cleared.flatMap((cl) => {
      const p = where.get(cl.id);
      return p ? [{ k: burstKey.current++, r: p[0], c: p[1], col: cl.c, gem: cl.g >= 0 }] : [];
    });
    setBursts((b) => [...b, ...add]);
    const keys = new Set(add.map((x) => x.k));
    setTimeout(() => setBursts((b) => b.filter((x) => !keys.has(x.k))), 650);
    if (extra && extra.booms.length) {
      const bm = extra.booms.map((x) => ({ k: burstKey.current++, ...x }));
      setBooms((b) => [...b, ...bm]);
      setTimeout(() => setBooms((b) => b.filter((x) => !bm.some((y) => y.k === x.k))), 900);
    }
    if (extra && extra.spawned.length) {
      const ids = extra.spawned.map((x) => x.id);
      setTimeout(() => {
        setBorn((b) => {
          const n = new Set<number>();
          b.forEach((v) => n.add(v));
          ids.forEach((v) => n.add(v));
          return n;
        });
        setTimeout(() => {
          setBorn((b) => {
            const n = new Set<number>();
            b.forEach((v) => {
              if (!ids.includes(v)) n.add(v);
            });
            return n;
          });
        }, 700);
      }, 300);
    }
    if (chain > 1 || (extra && extra.booms.length)) {
      setCombo(chain > 1 ? { k: burstKey.current++, n: chain } : null);
      setShake(true);
      setTimeout(() => setShake(false), extra && extra.booms.length ? 480 : 340);
      setTimeout(() => setCombo(null), 900);
    }
  };

  const play = async (steps: Step[]) => {
    for (const step of steps) {
      if (step.kind === 'swap') {
        showBoard(step.board);
        await wait(150);
      } else if (step.kind === 'clear') {
        setPop(new Set(step.cleared.map((c) => c.id)));
        blast(step.cleared, step.chain, { spawned: step.spawned, booms: step.booms });
        const hasRainbow = step.booms.some((x) => x.kind === 'rainbow');
        const hasBomb = step.booms.some((x) => x.kind === 'bomb');
        if (hasRainbow) sound.playRainbow();
        else if (hasBomb) sound.playBomb();
        else if (step.cleared.some((c) => c.g >= 0)) sound.playLevelUp();
        else sound.playChain(step.chain);
        if (step.spawned.length) setTimeout(() => sound.playSpawn(), 260);
        haptic(hasRainbow || hasBomb || step.chain >= 3 ? 'heavy' : step.chain === 2 ? 'medium' : 'light');
        const gemFound = step.cleared.find((c) => c.g >= 0);
        if (step.spawned.some((x) => x.sp === 2)) setMsg('Rainbow box! Swap it with any box and every box of that colour bursts.');
        else if (step.spawned.some((x) => x.sp === 1)) setMsg('Bomb box! Match it and it blasts the 3 x 3 around it.');
        else if (hasRainbow) setMsg('Rainbow blast!');
        else if (hasBomb) setMsg('Boom!');
        else if (gemFound) setMsg(`A ${GEM_IDS[gemFound.g]} gem was hidden in a box!`);
        await wait(hasRainbow || hasBomb ? 420 : 300);
        setPop(new Set());
        showBoard(step.board);
      } else if (step.kind === 'fall') {
        showBoard(step.board);
        await wait(250);
      } else {
        setMsg('No moves left on the board. It was shuffled for you.');
        showBoard(step.board);
        await wait(420);
      }
    }
  };

  // ---------- hint: after a few quiet seconds, shine on the swap that makes a match ----------
  const findHint = (x: State): Hint | null => {
    let best: [number, number, number, number] | null = null;
    let bv = -1;
    for (const mv of listMoves(x.board)) {
      const c = cloneState(x);
      if (!trySwap(c, ...mv).valid) continue;
      let v = c.score - x.score;
      for (const g of x.goals) v += 400 * (Math.min(g.n, c.collected[g.color]) - Math.min(g.n, x.collected[g.color]));
      if (v > bv) {
        bv = v;
        best = mv;
      }
    }
    if (!best) return null;
    const b = x.board.map((row) => row.slice());
    const t = b[best[0]][best[1]];
    b[best[0]][best[1]] = b[best[2]][best[3]];
    b[best[2]][best[3]] = t;
    const also = findMatches(b).filter(([r, c]) => !((r === best![0] && c === best![1]) || (r === best![2] && c === best![3])));
    return { a: [best[0], best[1]], b: [best[2], best[3]], also };
  };
  useEffect(() => {
    setHint(null);
    if (phase !== 'playing') return;
    const t = setTimeout(() => {
      const x = st.current;
      if (x && !lock.current && x.movesLeft > 0 && !goalsMet(x)) setHint(findHint(x));
    }, moves.current.length < 6 ? 1100 : 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, view.moves, tick]);

  // ---------- finish: the server replays the moves ----------
  const finish = async () => {
    setPhase('busy');
    const r = await ctx.act('matchFinish', { id: roundId, moves: moves.current });
    if (!r) {
      setPhase('lost');
      return;
    }
    setResult(r.result);
    setPhase(r.result.win ? 'won' : 'lost');
    if (r.result.win) {
      sound.playLevelUp();
      (r.result.gems || []).forEach((g: string, i: number) => setTimeout(() => showGem(g), 600 + i * 150));
    }
  };

  // ---------- ads (always optional) ----------
  const extra = async () => {
    const r = await adAction('match_moves', 'matchExtra', { id: roundId });
    if (r && st.current) {
      st.current.movesLeft += r.result.added;
      sync();
      setPhase('playing');
      setMsg(`+${r.result.added} moves. Good luck!`);
    }
  };
  const doubleWin = async () => {
    const r = await adAction('match_double', 'matchDouble', { id: result?.winId || roundId });
    if (r) {
      setResult({ ...result, doubled: true, coins: result.coins * 2 });
      flash(`+${fmt(r.result.coins)} extra coins!`);
    }
  };
  const getHeart = async () => {
    await adAction('match_heart', 'matchHeart');
  };

  // ---------- touch / mouse: drag a box onto its neighbour, or tap two neighbours ----------
  const cellAt = (e: React.PointerEvent) => {
    const rect = boardEl.current!.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
    return { r: Math.max(0, Math.min(ROWS - 1, r)), c: Math.max(0, Math.min(COLS - 1, c)), w: rect.width / COLS };
  };
  const swipeFrom = (d: { r: number; c: number }, dx: number, dy: number) => {
    const horiz = Math.abs(dx) > Math.abs(dy);
    const r2 = d.r + (horiz ? 0 : dy > 0 ? 1 : -1);
    const c2 = d.c + (horiz ? (dx > 0 ? 1 : -1) : 0);
    setSel(null);
    if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) void attempt(d.r, d.c, r2, c2);
  };
  const onDown = (e: React.PointerEvent) => {
    if (phase !== 'playing' || lock.current || down.current) return;
    const { r, c } = cellAt(e);
    down.current = { x: e.clientX, y: e.clientY, r, c, id: e.pointerId };
    setHint(null);
    try {
      boardEl.current?.setPointerCapture(e.pointerId); // keep receiving the finger even if it leaves the board
    } catch {
      /* ignore */
    }
  };
  // The swap happens the moment the finger has dragged far enough, no need to lift it: feels instant.
  const onMove = (e: React.PointerEvent) => {
    const d = down.current;
    if (!d || e.pointerId !== d.id || lock.current || phase !== 'playing') return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const { w } = cellAt(e);
    if (Math.max(Math.abs(dx), Math.abs(dy)) > w * 0.42) {
      down.current = null;
      swipeFrom(d, dx, dy);
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    setTick((t) => t + 1);
    if (!d || e.pointerId !== d.id || phase !== 'playing' || lock.current) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const { w } = cellAt(e);
    if (Math.max(Math.abs(dx), Math.abs(dy)) > w * 0.3) {
      swipeFrom(d, dx, dy);
    } else if (sel && Math.abs(sel[0] - d.r) + Math.abs(sel[1] - d.c) === 1) {
      const [a, b] = sel;
      setSel(null);
      void attempt(a, b, d.r, d.c);
    } else {
      setSel([d.r, d.c]);
    }
  };

  // ---------- next level: one short Monetag ad opens it (the server checks it) ----------
  const nextLevel = async () => {
    if (adBusy) return;
    if (phase === 'won' && m.gate) {
      const ok = await gateAd();
      if (!ok) return; // ad closed early or not confirmed: the next level stays locked, the player can try again
    }
    setPhase('lobby');
  };
  const unlockLevel = async () => {
    if (adBusy) return;
    await gateAd();
  };

  // ---------- hearts timer ----------
  const left = m.nextHeartAt ? Math.max(0, Math.floor((m.nextHeartAt - nowMs) / 1000)) : 0;
  const timer = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`;
  const preview = useMemo(() => levelInfo(m.level), [m.level]);
  const boxImg = (c: number) => `/boxes/lv${Math.max(0, c) + 1}.webp`;
  const hearts = (
    <div className="m-hearts" data-testid="hearts" aria-label={`${m.hearts} hearts`}>
      {Array.from({ length: m.maxHearts }).map((_, i) => (
        <span key={i} className={i < m.hearts ? 'on' : ''}>♥</span>
      ))}
      {m.hearts < m.maxHearts && <small>next {timer}</small>}
    </div>
  );
  const goalRow = (g: { color: number; n: number }, got: number) => (
    <div key={g.color} className={'m-goal' + (got >= g.n ? ' ok' : '')} data-testid="goal">
      <img src={boxImg(g.color)} alt="" draggable={false} />
      <b>{Math.min(got, g.n)}/{g.n}</b>
    </div>
  );

  // ================= LOBBY =================
  if (phase === 'lobby') {
    const resume = !!m.round;
    return (
      <section className="m-wrap" data-testid="match-lobby">
        <div className="m-top">
          <div><small>BOX MATCH</small><h2>Level {m.level}</h2></div>
          {hearts}
        </div>
        <LevelMap level={m.level} />
        <div className="panel">
          <b>Your order</b>
          <div className="m-goals">{preview.goals.map((g) => goalRow(g, 0))}</div>
          <p className="small muted">
            Drag a box onto its neighbour to line up 3 or more of the same colour. They burst, new boxes fall, and chains give bonus points.
            You have <b>{preview.moves}</b> moves. Some boxes hide gems: burst them to collect the gem.
          </p>
        </div>
        {m.gate ? (
          <div className="panel m-locked" data-testid="gate-panel">
            <b>Level {m.level} is locked</b>
            <p className="small muted">Watch one short ad to open the next level.</p>
            <button className="btn gold" disabled={adBusy} onClick={unlockLevel} data-testid="gate-ad">
              {adBusy ? 'Loading ad…' : `Open level ${m.level}`}
              <em className="ad-pill">AD</em>
            </button>
          </div>
        ) : (
          <button className="btn gold m-start" disabled={ctx.adBusy || (m.hearts < 1 && !resume)} onClick={start} data-testid="match-start">
            {resume ? 'Continue your round' : m.hearts < 1 ? 'No hearts yet' : 'Play (uses 1 heart)'}
          </button>
        )}
        {!m.gate && m.hearts < 1 && !resume && (
          <div className="panel">
            <b>Out of hearts</b>
            <p className="small muted">A heart comes back every 30 minutes (next in {timer}). A win gives your heart back.</p>
            <button className="btn" disabled={adBusy || s.ads.left <= 0 || nowMs < s.ads.nextAt} onClick={getHeart} data-testid="heart-ad">
              {nowMs < s.ads.nextAt ? `Ad ready in ${Math.ceil((s.ads.nextAt - nowMs) / 1000)}s` : 'Watch ad · +1 heart'}
              <em className="ad-pill">AD</em>
            </button>
            <p className="small muted">Ads are optional. You can also play Classic Blast meanwhile.</p>
          </div>
        )}
        <p className="small muted center-t">Gems found in boxes today: {m.gemsToday}/{m.gemCap}</p>
      </section>
    );
  }

  // ================= PLAYING (and overlays) =================
  const cells: Cell[] = [];
  const pos = new Map<number, [number, number]>();
  board.forEach((row, r) => row.forEach((cell, c) => { if (cell) { cells.push(cell); pos.set(cell.id, [r, c]); } }));

  return (
    <section className="m-wrap" data-testid="match-play">
      <div className="m-top">
        <div><small>LEVEL {level}</small><h2 data-testid="moves">{view.moves} moves</h2></div>
        {hearts}
      </div>
      <div className="m-goals">{goals.map((g) => goalRow(g, view.collected[g.color]))}
        <div className="m-score"><small>Score</small><b data-testid="score">{fmt(view.score)}</b></div>
      </div>
      {tut > 0 && (
        <div className="m-tut" data-testid="tutorial" data-step={tut}>
          <div className="m-tut-dots">
            {[1, 2, 3].map((i) => (
              <span key={i} className={i === tut ? 'on' : i < tut ? 'done' : ''} />
            ))}
          </div>
          {tut === 1 && <p><b>1.</b> Drag a shining box onto its neighbour.</p>}
          {tut === 2 && <p><b>2.</b> Three or more boxes of one colour in a row burst. Make <b>4</b> for a bomb and <b>5</b> for a rainbow box.</p>}
          {tut === 3 && <p><b>3.</b> Fill the order at the top before your moves run out. Some boxes hide gems!</p>}
          <div className="m-tut-btns">
            {tut === 3 && (
              <button className="btn sm" data-testid="tut-done" onClick={() => { tutSave(); setTut(0); }}>Got it</button>
            )}
            <button className="btn sm ghost" data-testid="tut-skip" onClick={() => { tutSave(); setTut(0); }}>Skip guide</button>
          </div>
        </div>
      )}
      <div
        className={'m-board' + (shake ? ' shake' : '')}
        ref={boardEl}
        data-testid="board"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => (down.current = null)}
      >
        {cells.map((cell) => {
          const [r, c] = pos.get(cell.id)!;
          const isA = hint && hint.a[0] === r && hint.a[1] === c;
          const isB = hint && hint.b[0] === r && hint.b[1] === c;
          const isAlso = hint && hint.also.some(([hr, hc]) => hr === r && hc === c);
          const dir = isA && hint ? (hint.b[1] > c ? 'r' : hint.b[1] < c ? 'l' : hint.b[0] > r ? 'd' : 'u') : undefined;
          return (
            <div
              key={cell.id}
              className={'m-cell' + (cell.sp === 1 ? ' sp-bomb' : cell.sp === 2 ? ' sp-rainbow' : '') + (born.has(cell.id) ? ' born' : '') + (pop.has(cell.id) ? ' pop' : '') + (sel && sel[0] === r && sel[1] === c ? ' sel' : '') + (isA || isB ? ' hint' : '') + (isAlso ? ' hint2' : '') + (bad && ((bad[0] === r && bad[1] === c) || (bad[2] === r && bad[3] === c)) ? ' bad' : '')}
              style={{ transform: `translate(${c * 100}%, ${r * 100}%)` }}
              data-r={r}
              data-c={c}
              data-col={cell.c}
              data-sp={cell.sp || undefined}
              data-dir={dir}
              data-gem={cell.g >= 0 ? GEM_IDS[cell.g] : undefined}
            >
              <div className="m-in">
                {cell.sp === 2 ? <div className="m-orb" /> : <img src={boxImg(cell.c)} alt="" draggable={false} />}
                {cell.sp === 1 && (
                  <svg className="m-bombicon" viewBox="0 0 32 32" aria-hidden="true">
                    <circle cx="15" cy="19" r="9" fill="#12151f" stroke="#ff5a3c" strokeWidth="2" />
                    <path d="M20 11l4-5" stroke="#d9c7a0" strokeWidth="2.4" strokeLinecap="round" />
                    <circle className="m-fuse" cx="25" cy="5" r="2.6" fill="#ffd65a" />
                    <ellipse cx="12" cy="16" rx="3" ry="2" fill="#fff" opacity=".35" />
                  </svg>
                )}
                {cell.g >= 0 && <span className="m-gem"><GemIcon id={GEM_IDS[cell.g]} size={26} /></span>}
              </div>
            </div>
          );
        })}
        {booms.map((b) => (
          <div
            key={b.k}
            data-testid="boom"
            className={'m-boom ' + b.kind}
            style={{ left: `${((b.c + 0.5) / COLS) * 100}%`, top: `${((b.r + 0.5) / ROWS) * 100}%` }}
          />
        ))}
        {bursts.map((b) => (
          <div
            key={b.k}
            className={'m-burst' + (b.gem ? ' gem' : '')}
            style={{ left: `${((b.c + 0.5) / COLS) * 100}%`, top: `${((b.r + 0.5) / ROWS) * 100}%`, ['--col' as any]: b.gem ? '#ffe08a' : BOX_COLORS[b.col % 6] }}
            data-testid="burst"
          >
            <b />
            <em />
            {Array.from({ length: 12 }).map((_, i) => (
              <i key={i} style={{ ['--a' as any]: `${i * 30 + (b.k % 4) * 7}deg`, ['--d' as any]: `${52 + ((i * 7 + b.k) % 5) * 12}px` }} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <u key={i} style={{ ['--a' as any]: `${i * 60 + 20 + (b.k % 5) * 6}deg`, ['--d' as any]: `${40 + ((i * 5 + b.k) % 4) * 14}px`, ['--rot' as any]: `${(i % 2 ? 1 : -1) * (180 + i * 40)}deg` }} />
            ))}
          </div>
        ))}
        {combo && <div key={combo.k} className="m-combo" data-testid="combo">CHAIN ×{combo.n}!</div>}
        {hint && (
          <div
            className="m-finger"
            aria-hidden="true"
            style={{
              left: `${((hint.a[1] + 0.5) / COLS) * 100}%`,
              top: `${((hint.a[0] + 0.5) / ROWS) * 100}%`,
              ['--dx' as any]: `${(hint.b[1] - hint.a[1]) * (100 / COLS) * 3.6}px`,
              ['--dy' as any]: `${(hint.b[0] - hint.a[0]) * (100 / ROWS) * 3.6}px`,
            }}
          >👆</div>
        )}
        {hint && <div className="m-hint-tip" data-testid="hint">Swap these shining boxes</div>}
      </div>
      <div className="m-gems" data-testid="found-gems">
        {view.gems.map((n, i) => n > 0 && <span key={i} className="m-chip"><GemIcon id={GEM_IDS[i]} size={20} /> x{n}</span>)}
      </div>
      {msg && <p className="m-msg" role="status">{msg}</p>}

      {phase === 'busy' && <div className="m-overlay"><div className="m-card"><p>Checking your moves…</p></div></div>}

      {phase === 'stuck' && (
        <div className="m-overlay" data-testid="stuck">
          <div className="m-card">
            <h3>Out of moves</h3>
            <p className="small muted">You are close! Orders left: {goals.map((g) => Math.max(0, g.n - view.collected[g.color])).join(' + ')} boxes.</p>
            <button className="btn gold" disabled={adBusy || s.ads.left <= 0 || nowMs < s.ads.nextAt} onClick={extra} data-testid="extra-ad">
              {nowMs < s.ads.nextAt ? `Ad ready in ${Math.ceil((s.ads.nextAt - nowMs) / 1000)}s` : `Watch ad · +${m.extraMoves} moves`}
              <em className="ad-pill">AD</em>
            </button>
            <button className="btn ghost" onClick={finish} data-testid="give-up">Give up</button>
            <p className="small muted">The ad is optional.</p>
          </div>
        </div>
      )}

      {(phase === 'won' || phase === 'lost') && (
        <div className="m-overlay" data-testid={phase === 'won' ? 'won' : 'lost'}>
          <div className="m-card">
            {phase === 'won' ? (
              <>
                <h3>Level complete!</h3>
                <p className="m-big" data-testid="win-coins">+{fmt(result?.coins || 0)} coins{result?.doubled ? ' (doubled)' : ''}</p>
                <p className="small muted">Score {fmt(result?.score || 0)} · {result?.leftover || 0} moves left</p>
                {(result?.gems || []).length > 0 && (
                  <p className="small">Gems found: {(result.gems as string[]).map((g, i) => <span key={i} style={{ display: 'inline-block', marginRight: 4 }}><GemIcon id={g} size={22} /></span>)}</p>
                )}
                {result?.limited && (
                  <p className="small muted">Today's reward limit for Match is reached. Your level still counts. Come back tomorrow for more rewards.</p>
                )}
                {m.canDouble && !result?.doubled && !result?.limited && (
                  <button className="btn gold" disabled={adBusy || s.ads.left <= 0 || nowMs < s.ads.nextAt} onClick={doubleWin} data-testid="double-ad">
                    {nowMs < s.ads.nextAt ? `Ad ready in ${Math.ceil((s.ads.nextAt - nowMs) / 1000)}s` : `Watch ad · Double (+${fmt(m.canDouble.coins)})`}
                    <em className="ad-pill">AD</em>
                  </button>
                )}
              </>
            ) : (
              <>
                <h3>Not this time</h3>
                <p className="small muted">The boxes were not all collected. Try the same level again.</p>
              </>
            )}
            <button className={'btn' + (phase === 'won' && m.gate ? ' gold' : '')} disabled={adBusy} onClick={nextLevel} data-testid="continue">
              {adBusy ? 'Loading ad…' : phase === 'won' ? 'Next level' : 'Back'}
              {phase === 'won' && m.gate && !adBusy && <em className="ad-pill">AD</em>}
            </button>
            {phase === 'won' && m.gate && <p className="small muted">One short ad opens the next level.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
