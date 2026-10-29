import { useEffect, useMemo, useRef, useState } from 'react';
import { call, fmt, haptic } from './api';
import type { Ctx } from './App';
import GemIcon from './GemIcon';
import { sound } from './effects';
import {
  COLS, ROWS, GEM_IDS, cloneState, goalsMet, levelInfo, newRound, trySwap, type Board, type Cell, type State, type Step,
} from '../api/_lib/matchEngine';

// The swap puzzle. The browser plays it; the server hands out the seed and later REPLAYS every move, so nothing can be faked.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pad = (n: number) => String(n).padStart(2, '0');
type Move = [number, number, number, number];
type Phase = 'lobby' | 'playing' | 'busy' | 'won' | 'lost' | 'stuck';

export default function Match({ ctx }: { ctx: Ctx }) {
  const { s, nowMs, flash, adAction, adBusy, showGem } = ctx;
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
  const st = useRef<State | null>(null);
  const moves = useRef<Move[]>([]);
  const lock = useRef(false);
  const down = useRef<{ x: number; y: number; r: number; c: number } | null>(null);
  const boardEl = useRef<HTMLDivElement>(null);

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
      setBoard(x.board.map((row) => row.slice()));
      setResult(null);
      setSel(null);
      setMsg(r.result.resumed ? 'Your unfinished round is back. Same board, no extra heart used.' : '');
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
      lock.current = false;
      return;
    }
    setMsg('');
    moves.current.push([r1, c1, r2, c2]);
    haptic('light');
    sound.playTap();
    await play(res.steps);
    sync();
    lock.current = false;
    // end of the round?
    if (goalsMet(x)) return void (await finish());
    if (x.movesLeft <= 0) setPhase('stuck'); // out of moves: watch an ad for +5 moves, or give up
  };

  const play = async (steps: Step[]) => {
    for (const step of steps) {
      if (step.kind === 'swap') {
        setBoard(step.board);
        await wait(170);
      } else if (step.kind === 'clear') {
        setPop(new Set(step.cleared.map((c) => c.id)));
        step.cleared.some((c) => c.g >= 0) ? sound.playLevelUp() : sound.playBlast(step.chain > 1);
        const gemFound = step.cleared.find((c) => c.g >= 0);
        if (gemFound) setMsg(`A ${GEM_IDS[gemFound.g]} gem was hidden in a box!`);
        await wait(230);
        setPop(new Set());
        setBoard(step.board);
      } else if (step.kind === 'fall') {
        setBoard(step.board);
        await wait(260);
      } else {
        setMsg('No moves left on the board. It was shuffled for you.');
        setBoard(step.board);
        await wait(420);
      }
    }
  };

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
  const onDown = (e: React.PointerEvent) => {
    if (phase !== 'playing' || lock.current) return;
    const { r, c } = cellAt(e);
    down.current = { x: e.clientX, y: e.clientY, r, c };
  };
  const onUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d || phase !== 'playing' || lock.current) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const { w } = cellAt(e);
    if (Math.max(Math.abs(dx), Math.abs(dy)) > w * 0.3) {
      // swipe
      const horiz = Math.abs(dx) > Math.abs(dy);
      const r2 = d.r + (horiz ? 0 : dy > 0 ? 1 : -1);
      const c2 = d.c + (horiz ? (dx > 0 ? 1 : -1) : 0);
      setSel(null);
      if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) void attempt(d.r, d.c, r2, c2);
    } else if (sel && Math.abs(sel[0] - d.r) + Math.abs(sel[1] - d.c) === 1) {
      const [a, b] = sel;
      setSel(null);
      void attempt(a, b, d.r, d.c);
    } else {
      setSel([d.r, d.c]);
    }
  };

  // ---------- hearts timer ----------
  const left = m.nextHeartAt ? Math.max(0, Math.floor((m.nextHeartAt - nowMs) / 1000)) : 0;
  const timer = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`;
  const preview = useMemo(() => levelInfo(m.level), [m.level]);
  const boxImg = (c: number) => `/boxes/lv${c + 1}.webp`;
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
        <div className="panel">
          <b>Your order</b>
          <div className="m-goals">{preview.goals.map((g) => goalRow(g, 0))}</div>
          <p className="small muted">
            Drag a box onto its neighbour to line up 3 or more of the same colour. They burst, new boxes fall, and chains give bonus points.
            You have <b>{preview.moves}</b> moves. Some boxes hide gems: burst them to collect the gem.
          </p>
        </div>
        <button className="btn gold m-start" disabled={ctx.adBusy || (m.hearts < 1 && !resume)} onClick={start} data-testid="match-start">
          {resume ? 'Continue your round' : m.hearts < 1 ? 'No hearts yet' : 'Play (uses 1 heart)'}
        </button>
        {m.hearts < 1 && !resume && (
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
      <div
        className="m-board"
        ref={boardEl}
        data-testid="board"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => (down.current = null)}
      >
        {cells.map((cell) => {
          const [r, c] = pos.get(cell.id)!;
          return (
            <div
              key={cell.id}
              className={'m-cell' + (pop.has(cell.id) ? ' pop' : '') + (sel && sel[0] === r && sel[1] === c ? ' sel' : '')}
              style={{ transform: `translate(${c * 100}%, ${r * 100}%)` }}
              data-r={r}
              data-c={c}
              data-col={cell.c}
              data-gem={cell.g >= 0 ? GEM_IDS[cell.g] : undefined}
            >
              <img src={boxImg(cell.c)} alt="" draggable={false} />
              {cell.g >= 0 && <span className="m-gem"><GemIcon id={GEM_IDS[cell.g]} size={26} /></span>}
            </div>
          );
        })}
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
            <button className="btn" onClick={() => setPhase('lobby')} data-testid="continue">{phase === 'won' ? 'Next level' : 'Back'}</button>
          </div>
        </div>
      )}
    </section>
  );
}
