import { useEffect, useRef, useState } from 'react';
import { fmt, haptic } from './api';
import type { Ctx } from './App';
import { SKIN_STYLES, skinVars } from './theme';

const TRIES = 3;
type Props = {
  energy: number; maxEnergy: number; regen: number; tapLevel: number;
  onBlast: (perfect: boolean, pts: number) => void; ctx: Ctx;
};

export default function Play({ energy, maxEnergy, regen, tapLevel, onBlast, ctx }: Props) {
  const energyRef = useRef(energy);
  energyRef.current = energy;
  const boxRef = useRef(Math.floor(Math.random() * 9));
  const triesRef = useRef(TRIES);
  const moveT = useRef(0);
  const lastTap = useRef(0);
  const alive = useRef(true);
  const [tries, setTries] = useState(TRIES);
  const [glim, setGlim] = useState<{ cell: number; id: number } | null>(null);
  const [pop, setPop] = useState<{ cell: number; pts: number; gold: boolean; id: number } | null>(null);
  const [shake, setShake] = useState<{ cell: number; id: number } | null>(null);
  const [combo, setCombo] = useState(0);

  // The hidden box keeps changing crates; a glint shows where it went (not always truthfully).
  const move = () => {
    clearTimeout(moveT.current);
    moveT.current = window.setTimeout(() => {
      if (!alive.current) return;
      if (energyRef.current > 0) {
        let c = Math.floor(Math.random() * 9);
        if (c === boxRef.current) c = (c + 1 + Math.floor(Math.random() * 8)) % 9;
        boxRef.current = c;
        setGlim({ cell: Math.random() < 0.4 ? c : Math.floor(Math.random() * 9), id: Date.now() });
      }
      move();
    }, 800);
  };
  useEffect(() => {
    alive.current = true;
    move();
    return () => {
      alive.current = false;
      clearTimeout(moveT.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (i: number) => {
    const now = Date.now();
    if (now - lastTap.current < 110) return;
    lastTap.current = now;
    if (energyRef.current <= 0) return;
    if (i === boxRef.current) {
      const perfect = triesRef.current === TRIES;
      const gold = Math.random() < 0.12;
      const pts = (gold ? 15 : 1 + Math.floor(Math.random() * 9)) + (perfect ? 2 : 0) + (tapLevel - 1) * 2;
      onBlast(perfect, pts);
      haptic('medium');
      setPop({ cell: i, pts, gold, id: now });
      setCombo((c) => (perfect ? c + 1 : 0));
      triesRef.current = TRIES;
      setTries(TRIES);
      boxRef.current = (i + 1 + Math.floor(Math.random() * 8)) % 9;
      move();
    } else {
      triesRef.current -= 1;
      setTries(triesRef.current);
      setShake({ cell: i, id: now });
      haptic('light');
      if (triesRef.current <= 0) {
        triesRef.current = TRIES;
        setTries(TRIES);
        setCombo(0);
        ctx.flash('The box slipped away. A new one is hiding.');
        boxRef.current = Math.floor(Math.random() * 9);
      }
    }
  };

  const out = energy <= 0;
  const canAd = ctx.s.ads.left > 0 && !ctx.adBusy && energy < maxEnergy;

  return (
    <section>
      <p className="hint">Find the crate hiding the box and tap it. A yellow glint shows where it went, but not every glint is honest.</p>
      <div className="meter" aria-label="Energy">
        <div className="fill" style={{ width: `${(energy / maxEnergy) * 100}%` }} />
        <span>{Math.floor(energy)} / {maxEnergy} energy</span>
      </div>
      <div className="row between small">
        <span className="tapes" aria-label="Tries left">
          {Array.from({ length: TRIES }, (_, i) => <i key={i} className={i < tries ? 'on' : ''} />)}
        </span>
        <span>{combo > 1 ? `${combo} first-try blasts in a row` : 'Each blast uses 1 energy'}</span>
      </div>

      <div className={'grid ' + (SKIN_STYLES[ctx.s.skin]?.fx || '')} style={skinVars(ctx.s.skin)}>
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i + ':' + (shake?.cell === i ? shake.id : 0)}
            className={'crate' + (shake?.cell === i ? ' shake' : '')}
            aria-label={`Crate ${i + 1}`}
            onPointerDown={(e) => { e.preventDefault(); tap(i); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(i); } }}
          >
            {glim?.cell === i && <span key={glim.id} className="gleam" />}
            {pop?.cell === i && <span key={pop.id} className={'pop' + (pop.gold ? ' gold' : '')}>+{pop.pts}</span>}
          </button>
        ))}
      </div>

      {out && <p className="notice">Out of energy. It recharges {regen} per second, or refill it now with an optional ad.</p>}
      <button className="btn ghost" disabled={!canAd} onClick={() => ctx.adFor('energy')}>
        {ctx.adBusy ? 'Loading ad…' : `Watch an ad to refill energy (${ctx.s.ads.left} left today)`}
      </button>
      <p className="small muted center-t">Ads are optional. The game works fully without them. Total earned: {fmt(ctx.s.totalEarned)}</p>
    </section>
  );
}
