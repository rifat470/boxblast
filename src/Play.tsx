import { useEffect, useRef, useState } from 'react';
import { fmt, haptic } from './api';
import type { Ctx } from './App';
import { getLevelConfig } from './theme';
import CrateVisual from './CrateVisual';
import { sound, triggerConfetti, spawnFlyingCoins } from './effects';

const TRIES = 3;

interface PlayProps {
  energy: number;
  maxEnergy: number;
  regenEveryS: number;
  regenPerTick: number;
  tapLevel: number;
  onTap: (hit: boolean, perfect: boolean, pts: number) => void;
  ctx: Ctx;
  currentLevel: number;
  onCoinHit: () => void;
}

export default function Play({
  energy,
  maxEnergy,
  regenEveryS,
  regenPerTick,
  tapLevel,
  onTap,
  ctx,
  currentLevel,
  onCoinHit,
}: PlayProps) {
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

  const levelCfg = getLevelConfig(currentLevel);

  // The hidden box shifts crates; a yellow glint indicates where it went
  const scheduleMove = () => {
    clearTimeout(moveT.current);
    moveT.current = window.setTimeout(() => {
      if (!alive.current) return;
      if (energyRef.current > 0) {
        let c = Math.floor(Math.random() * 9);
        if (c === boxRef.current) c = (c + 1 + Math.floor(Math.random() * 8)) % 9;
        boxRef.current = c;

        // 45% truthful glint, 55% decoy glint
        const glintCell = Math.random() < 0.45 ? c : Math.floor(Math.random() * 9);
        setGlim({ cell: glintCell, id: Date.now() });
      }
      scheduleMove();
    }, 1100);
  };

  useEffect(() => {
    alive.current = true;
    scheduleMove();
    return () => {
      alive.current = false;
      clearTimeout(moveT.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (i: number, e?: React.PointerEvent<HTMLButtonElement>) => {
    const now = Date.now();
    if (now - lastTap.current < 90) return;
    lastTap.current = now;

    if (energyRef.current <= 0 && Date.now() >= ctx.s.turbo.until) {
      sound.playMiss();
      ctx.flash(`Out of energy! +${regenPerTick} energy every ${regenEveryS}s, or watch an optional ad to refill.`);
      return;
    }

    if (i === boxRef.current) {
      // HIT!
      const perfect = triesRef.current === TRIES;
      const isGold = Math.random() < 0.15;
      const pts = (isGold ? 15 : 1 + Math.floor(Math.random() * 9)) + (perfect ? 2 : 0) + (tapLevel - 1) * 2;

      onTap(true, perfect, pts);
      haptic('medium');
      sound.playBlast(isGold);

      setPop({ cell: i, pts, gold: isGold, id: now });
      setCombo((c) => (perfect ? c + 1 : 0));
      triesRef.current = TRIES;
      setTries(TRIES);

      // Trigger Confetti Burst & Flying Coins
      const targetBtn = e?.currentTarget;
      let startX = window.innerWidth / 2;
      let startY = window.innerHeight / 2;
      if (targetBtn) {
        const rect = targetBtn.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }

      triggerConfetti(startX, startY, [levelCfg.particleColor, '#ffffff', '#ffc107', levelCfg.levelColor]);
      const coinCounterPill = document.getElementById('coin-counter-pill');
      spawnFlyingCoins(startX, startY, coinCounterPill, onCoinHit, isGold ? 6 : 4);

      // Shift hidden box to a new crate
      boxRef.current = (i + 1 + Math.floor(Math.random() * 8)) % 9;
      scheduleMove();
    } else {
      // MISS: a missed tap still costs 1 energy
      onTap(false, false, 0);
      triesRef.current -= 1;
      setTries(triesRef.current);
      setShake({ cell: i, id: now });
      haptic('light');
      sound.playMiss();

      if (triesRef.current <= 0) {
        triesRef.current = TRIES;
        setTries(TRIES);
        setCombo(0);
        ctx.flash('The box slipped away! A new one is hiding.');
        boxRef.current = Math.floor(Math.random() * 9);
      }
    }
  };

  const turboLeft = Math.max(0, Math.ceil((ctx.s.turbo.until - ctx.nowMs) / 1000));
  const turboOn = turboLeft > 0;
  const out = energy <= 0 && !turboOn;
  const adWait = Math.max(0, Math.ceil((ctx.s.ads.nextAt - ctx.nowMs) / 1000));
  const canAd = ctx.s.ads.left > 0 && !ctx.adBusy && energy < maxEnergy && ctx.nowMs >= ctx.s.ads.nextAt;

  return (
    <section className="relative z-10">
      {/* Instruction Box */}
      <div className="instruction-box">
        <p className="instruction-text">
          Find the crate hiding the box and tap it. A yellow glint shows where it went, but not every glint is honest.
        </p>
      </div>

      {/* Energy Bar */}
      <div className="meter" aria-label="Energy" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
        <div
          className="fill"
          style={{
            width: `${Math.min(100, (energy / maxEnergy) * 100)}%`,
            background: 'linear-gradient(90deg, #ff7e40, #ff5b2e)',
          }}
        />
        <span>
          {Math.floor(energy)} / {maxEnergy} energy
        </span>
      </div>

      {/* Energy Sub-Row: 3 Try Segments + Subtext */}
      <div className="tapes-row">
        <div className="tapes" aria-label="Tries left">
          {Array.from({ length: TRIES }, (_, i) => (
            <i key={i} className={i < tries ? 'on' : ''} />
          ))}
        </div>
        <span className="energy-subtext">
          {combo > 1 ? `${combo} perfect blasts in a row!` : 'Every tap uses 1 energy'}
        </span>
      </div>

      {/* Yard Header */}
      <div className="yard-header">
        <h1 className="yard-title">Packing Yard</h1>
        <p className="yard-subtitle">
          Pack 9 boxes to earn coins • Progress through levels to unlock premium crates
        </p>
      </div>

      {/* 3x3 Grid of 9 Crates */}
      <div className="grid-container">
        {Array.from({ length: 9 }, (_, i) => {
          const isShaking = shake?.cell === i && Date.now() - shake.id < 400;
          const isGlinting = glim?.cell === i && Date.now() - glim.id < 800;
          const isPopping = pop?.cell === i && Date.now() - pop.id < 800;

          return (
            <button
              key={i}
              className={`crate-btn ${isShaking ? 'shake' : ''}`}
              aria-label={`Box ${i + 1}`}
              onPointerDown={(e) => {
                e.preventDefault();
                tap(i, e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  tap(i);
                }
              }}
            >
              <CrateVisual
                level={currentLevel}
                isGlinting={isGlinting}
                isFloating={!isShaking}
                delayIndex={i}
              />

              {/* Point rise popup animation */}
              {isPopping && pop && (
                <span key={pop.id} className={`pop ${pop.gold ? 'gold' : ''}`}>
                  +{pop.pts}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Out of energy notice if zero */}
      {out && (
        <div className="p-3 mb-3 bg-red-950/40 border-l-4 border-amber-500 rounded text-[13px] text-amber-200">
          Out of energy. You get +{regenPerTick} energy every {regenEveryS} seconds, or refill instantly with an optional ad.
        </div>
      )}

      {/* Turbo Blast: optional ad = 60 s of x3 coins and free taps */}
      {turboOn ? (
        <div className="turbo-banner" role="status">
          <b>⚡ TURBO x{ctx.s.turbo.mult}</b>
          <span>Free taps · {turboLeft}s left</span>
        </div>
      ) : (
        <button
          className="btn gold turbo-btn"
          disabled={ctx.adBusy || ctx.s.ads.left <= 0 || adWait > 0}
          onClick={() => ctx.turbo()}
        >
          ⚡ Turbo Blast: x{ctx.s.turbo.mult} coins, free taps for {ctx.s.turbo.seconds}s
          <em className="ad-pill">AD</em>
        </button>
      )}

      {/* Ad Refill Button with Glow Border */}
      <button
        className="btn-ad-refill"
        disabled={!canAd}
        onClick={() => ctx.adFor('energy')}
        style={{
          borderColor: 'var(--level-color, #ffc93c)',
          boxShadow: '0 0 16px var(--box-glow, rgba(255, 201, 60, 0.35))',
        }}
      >
        <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm6 3v6l5-3-5-3z" />
        </svg>
        <span>
          {ctx.adBusy
            ? 'Loading ad…'
            : adWait > 0 && ctx.s.ads.left > 0
            ? `Next ad ready in ${adWait}s`
            : `Watch an ad to refill energy (${ctx.s.ads.left} left today)`}
        </span>
        <em className="ad-pill">AD</em>
      </button>

      {/* Disclaimer */}
      <p className="disclaimer-text">
        Ads are optional. The game works fully without them. Total earned: {fmt(ctx.s.totalEarned)}
      </p>
    </section>
  );
}
