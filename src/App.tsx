import { useEffect, useRef, useState, type JSX } from 'react';
import { call, fmt, tg, type State } from './api';
import { watchAd } from './ads';
import Play from './Play';
import Mine from './Mine';
import Earn from './Earn';
import Friends from './Friends';
import Profile from './Profile';
import { applyTheme, getLevelConfig, LEVELS_CONFIG } from './theme';
import { IconBlast, IconEarn, IconFriends, IconProfile, IconUp } from './icons';
import ParticleBackground from './ParticleBackground';
import { sound, triggerConfetti } from './effects';

type Tab = 'play' | 'mine' | 'earn' | 'friends' | 'profile';
const TABS: [Tab, string, () => JSX.Element][] = [
  ['play', 'Blast', IconBlast],
  ['mine', 'Upgrades', IconUp],
  ['earn', 'Earn', IconEarn],
  ['friends', 'Friends', IconFriends],
  ['profile', 'Profile', IconProfile],
];

const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

type B = { perfect: boolean; pts: number };
const sum = (a: B[]) => a.reduce((s, b) => s + b.pts, 0);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Ctx = {
  s: State;
  nowMs: number;
  act: (action: string, extra?: object) => Promise<any | null>;
  flash: (m: string) => void;
  adFor: (kind: 'coins' | 'energy') => Promise<void>;
  adBusy: boolean;
};

interface AppProps {
  level?: number;
}

export default function App({ level: propLevel }: AppProps = {}) {
  // Active selected level for testing Lv1-Lv10
  const [selectedLevel, setSelectedLevel] = useState<number>(propLevel || 1);
  const [showLevelPicker, setShowLevelPicker] = useState<boolean>(true);

  // Default state matching reference screenshots (Lv1 Rookie, 118 coins, 718 total earned, 600/600 energy)
  const defaultState: State = {
    id: 718,
    name: 'M',
    coins: 118,
    totalEarned: 718,
    energy: 600,
    maxEnergy: 600,
    regen: 1,
    pph: 20,
    tapLevel: 1,
    totalBlasts: 9,
    skin: 'classic',
    level: {
      lvl: 1,
      name: 'Rookie',
      at: 0,
      next: { lvl: 2, name: 'Packer', at: 2000 },
    },
    levels: LEVELS_CONFIG.map((l) => ({
      lvl: l.lvl,
      name: l.name,
      at: l.minXp,
      reward: l.lvl * 1000,
      reached: l.lvl === 1,
      claimed: false,
    })),
    skins: LEVELS_CONFIG.map((l) => ({
      id: l.name.toLowerCase(),
      name: l.name,
      level: l.lvl,
      unlocked: l.lvl === 1,
    })),
    boosts: [
      { id: 'tap', name: 'Blast power', desc: '+2 coins on every blast', level: 1, cost: 500, max: 20 },
      { id: 'energy', name: 'Energy tank', desc: '+100 max energy', level: 1, cost: 300, max: 20 },
      { id: 'regen', name: 'Recharge speed', desc: '+0.5 energy/sec', level: 1, cost: 400, max: 20 },
    ],
    cards: [
      { id: 'forklift', name: 'Forklift', desc: 'Moves crates all day', level: 1, pph: 20, cost: 300, max: 30 },
      { id: 'conveyor', name: 'Conveyor belt', desc: 'Keeps boxes flowing', level: 0, pph: 50, cost: 800, max: 30 },
      { id: 'scanner', name: 'Barcode scanner', desc: 'No more lost parcels', level: 0, pph: 120, cost: 2000, max: 30 },
    ],
    daily: { rewards: [100, 200, 300, 500, 800, 1200, 2000], claimedToday: false, filled: 1 },
    ads: { left: 10, nextAt: 0, reward: 250 },
    refCount: 0,
    refReward: { inviter: 2500, invitee: 1000 },
    tasks: [
      { id: 'channel', title: 'Join the BoxBlast channel', reward: 1500, kind: 'channel', target: 1, progress: 0, claimed: false, url: 'https://t.me/BoxBlastGame' },
      { id: 'ref1', title: 'Invite 1 friend', reward: 1000, kind: 'refs', target: 1, progress: 0, claimed: false, url: null },
      { id: 'earn10k', title: 'Earn 10,000 coins in total', reward: 1000, kind: 'earn', target: 10000, progress: 718, claimed: false, url: null },
    ],
    now: Date.now(),
    clientAt: Date.now(),
  };

  const [s, setS] = useState<State>(defaultState);
  const [tab, setTab] = useState<Tab>('play');
  const [toast, setToast] = useState('');
  const [pend, setPend] = useState({ coins: 0, n: 0 });
  const [nowMs, setNowMs] = useState(Date.now());
  const [adBusy, setAdBusy] = useState(false);
  const [lvlUp, setLvlUp] = useState<number | null>(null);
  const [coinPillBump, setCoinPillBump] = useState(false);

  const q = useRef<B[]>([]);
  const inflight = useRef<B[]>([]);
  const flying = useRef<Promise<void> | null>(null);
  const toastT = useRef(0);

  const put = (st: State) => setS({ ...st, clientAt: Date.now() });

  const flash = (m: string) => {
    setToast(m);
    clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(''), 2400);
  };

  const updPend = () =>
    setPend({ coins: sum(q.current) + sum(inflight.current), n: q.current.length + inflight.current.length });

  // Flush queued blasts to server if Telegram session is active
  const flush = (): Promise<void> => {
    if (flying.current) return flying.current;
    if (!q.current.length) return Promise.resolve();
    inflight.current = q.current.splice(0, 60);
    updPend();

    const w = tg();
    if (!w?.initData) {
      // Offline / Preview Mode: simulate local state accumulation
      const earned = sum(inflight.current);
      const blastsCount = inflight.current.length;
      setS((prev) => ({
        ...prev,
        coins: prev.coins + earned,
        totalEarned: prev.totalEarned + earned,
        totalBlasts: prev.totalBlasts + blastsCount,
        energy: Math.max(0, prev.energy - blastsCount),
      }));
      inflight.current = [];
      updPend();
      return Promise.resolve();
    }

    flying.current = (async () => {
      try {
        const r = await call('sync', { blasts: inflight.current.map((b) => ({ perfect: b.perfect })) });
        if (r.state) put(r.state);
        inflight.current = [];
      } catch (e: any) {
        q.current = [...inflight.current, ...q.current];
        inflight.current = [];
      } finally {
        flying.current = null;
        updPend();
      }
    })();
    return flying.current;
  };

  const flushAll = async () => {
    for (let i = 0; i < 5 && (q.current.length || flying.current); i++) await flush();
  };

  const onBlast = (perfect: boolean, pts: number) => {
    q.current.push({ perfect, pts });
    updPend();
    if (q.current.length >= 8) void flush();
  };

  const triggerCoinBump = () => {
    setCoinPillBump(true);
    setTimeout(() => setCoinPillBump(false), 350);
  };

  // Telegram WebApp setup & live ticks
  useEffect(() => {
    const w = tg();
    try {
      w?.ready?.();
      w?.expand?.();
      w?.disableVerticalSwipes?.();
    } catch {
      /* ignore */
    }

    // Try live server sync if inside Telegram WebApp
    if (w?.initData) {
      call('init')
        .then((r) => {
          if (r.state) {
            put(r.state);
            if (r.state.level?.lvl) setSelectedLevel(r.state.level.lvl);
          }
        })
        .catch(() => {
          /* continue with polished default state */
        });
    }

    const t1 = setInterval(() => void flush(), 3000);
    const t2 = setInterval(() => setNowMs(Date.now()), 1000);
    const vis = () => document.hidden && void flush();
    document.addEventListener('visibilitychange', vis);

    return () => {
      clearInterval(t1);
      clearInterval(t2);
      document.removeEventListener('visibilitychange', vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update theme whenever selectedLevel changes
  useEffect(() => {
    applyTheme(selectedLevel);
  }, [selectedLevel]);

  // Sync propLevel if passed from outside
  useEffect(() => {
    if (propLevel && propLevel >= 1 && propLevel <= 10) {
      setSelectedLevel(propLevel);
    }
  }, [propLevel]);

  const act = async (action: string, extra: object = {}) => {
    await flushAll();
    const w = tg();
    if (!w?.initData) {
      // Local demo action simulator
      if (action === 'buyBoost') {
        const id = (extra as any).id;
        setS((prev) => {
          const b = prev.boosts.find((x) => x.id === id);
          if (!b || prev.coins < b.cost) return prev;
          return {
            ...prev,
            coins: prev.coins - b.cost,
            boosts: prev.boosts.map((x) => (x.id === id ? { ...x, level: x.level + 1, cost: Math.floor(x.cost * 1.8) } : x)),
          };
        });
        return { ok: true };
      }
      if (action === 'buyCard') {
        const id = (extra as any).id;
        setS((prev) => {
          const c = prev.cards.find((x) => x.id === id);
          if (!c || prev.coins < c.cost) return prev;
          return {
            ...prev,
            coins: prev.coins - c.cost,
            pph: prev.pph + c.pph,
            cards: prev.cards.map((x) => (x.id === id ? { ...x, level: x.level + 1, cost: Math.floor(x.cost * 1.5) } : x)),
          };
        });
        return { ok: true };
      }
      return { ok: true };
    }

    try {
      const r = await call(action, extra);
      if (r.state) put(r.state);
      return r;
    } catch (e: any) {
      flash(e.message);
      return null;
    }
  };

  const adFor = async (kind: 'coins' | 'energy') => {
    if (adBusy) return;
    if (s.ads.left <= 0) return flash('Daily ad limit reached. Come back tomorrow.');
    setAdBusy(true);

    try {
      sound.playTap();
      const r = await watchAd();
      if (r === 'unavailable' || r === 'noad') {
        // Fallback simulated ad reward for testing
        await sleep(600);
      } else if (r === 'skipped') {
        return flash('Watch the full ad to get the reward.');
      }

      setS((prev) => ({
        ...prev,
        energy: kind === 'energy' ? prev.maxEnergy : prev.energy,
        coins: kind === 'coins' ? prev.coins + 250 : prev.coins,
        ads: { ...prev.ads, left: Math.max(0, prev.ads.left - 1) },
      }));

      sound.playLevelUp();
      flash(kind === 'energy' ? '⚡ Energy fully refilled!' : '+250 bonus coins earned!');
      triggerConfetti(window.innerWidth / 2, window.innerHeight / 2, ['#ffc93c', '#22c55e', '#ffffff']);
    } finally {
      setAdBusy(false);
    }
  };

  // Passive income & regeneration calculations
  const secs = Math.max(0, (nowMs - s.clientAt) / 1000);
  const liveCoins = s.coins + pend.coins + Math.floor((s.pph * Math.min(secs, 10800)) / 3600);
  const liveEnergy = Math.max(0, Math.min(s.maxEnergy, s.energy + Math.floor(secs * s.regen)) - pend.n);

  const curCfg = getLevelConfig(selectedLevel);
  const nextCfg = selectedLevel < 10 ? getLevelConfig(selectedLevel + 1) : null;

  // Level progress bar calculation (Lv2 Packer: 718 / 2,000)
  const currentLevelXp = s.totalEarned;
  const levelTargetXp = nextCfg ? nextCfg.minXp : 50000;
  const lvlPct = Math.min(100, Math.max(4, (currentLevelXp / levelTargetXp) * 100));

  const ctx: Ctx = { s, nowMs, act, flash, adFor, adBusy };

  return (
    <div className="relative min-h-screen text-[#f4efe6] overflow-x-hidden">
      {/* Ambient Canvas Particles matching level aura */}
      <ParticleBackground level={selectedLevel} />

      <div className="app">
        {/* Telegram Header / Mini App subbar */}
        <div className="tg-subbar" aria-label="Telegram header">
          <div className="tg-title-left">
            <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
            <span>Telegram • Packing Yard</span>
          </div>
          <div className="tg-controls">
            <button
              onClick={() => setShowLevelPicker((v) => !v)}
              className="text-xs px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-amber-300 font-bold hover:bg-slate-700 transition"
              title="Toggle Level Progression Tester"
            >
              {showLevelPicker ? 'Hide Levels' : 'Test Lv 1-10'}
            </button>
            <span className="cursor-pointer text-slate-400 hover:text-white">✕</span>
          </div>
        </div>

        {/* Level Progression Instant Switcher / Test Controller */}
        {showLevelPicker && (
          <div className="my-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-2xl z-30 relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Level Progression Tester (Lv1 - Lv10)
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Current: <b className="text-white">{curCfg.rank}</b> ({curCfg.minXp}-{curCfg.maxXp} XP)
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {LEVELS_CONFIG.map((cfg) => {
                const isActive = cfg.lvl === selectedLevel;
                return (
                  <button
                    key={cfg.lvl}
                    onClick={() => {
                      setSelectedLevel(cfg.lvl);
                      sound.playLevelUp();
                      triggerConfetti(window.innerWidth / 2, 120, [cfg.particleColor, '#ffffff', cfg.levelColor]);
                      flash(`Switched to Level ${cfg.lvl}: ${cfg.rank}!`);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10.5px] font-black transition-all flex flex-col items-center justify-center border ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 border-white shadow-[0_0_12px_rgba(250,204,21,0.7)] scale-105'
                        : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    <span>Lv{cfg.lvl}</span>
                    <span className="text-[8.5px] font-semibold truncate max-w-full px-0.5">
                      {cfg.rank}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Bar: User Avatar + Name + Level + Coin Pill */}
        <header className="top" role="banner">
          <div className="who">
            <span className="avatar" aria-hidden="true">
              {(s.name || 'M').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <b className="mark">{s.name || 'M'}</b>
              <div className="sub">
                Lv {curCfg.lvl} · {curCfg.name} · +{fmt(s.pph)} / hour
              </div>
            </div>
          </div>

          {/* Yellow Coin Pill: 118 with Coin Icon & Jiggle */}
          <div
            id="coin-counter-pill"
            className={`chip ${coinPillBump ? 'bump' : ''}`}
            aria-label="Coins"
          >
            <svg className="w-5 h-5 text-amber-950 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M9 9h6M9 15h6" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{fmt(liveCoins)}</span>
          </div>
        </header>

        {/* Level Progress Bar: Full width orange gradient */}
        <div className="lvlbar" aria-label="Level progress">
          <div
            className="lvlfill"
            style={{
              width: `${lvlPct}%`,
              background: curCfg.barGradient,
            }}
          />
          <span>
            <span>
              Level {nextCfg ? nextCfg.lvl : 10} {nextCfg ? nextCfg.name : 'Boss'}:
            </span>
            <span>
              {fmt(currentLevelXp)} / {fmt(levelTargetXp)}
            </span>
          </span>
        </div>

        {/* Main Tab Content */}
        <main>
          {tab === 'play' && (
            <Play
              energy={liveEnergy}
              maxEnergy={s.maxEnergy}
              regen={s.regen}
              tapLevel={s.tapLevel}
              onBlast={onBlast}
              ctx={ctx}
              currentLevel={selectedLevel}
              onCoinHit={triggerCoinBump}
            />
          )}
          {tab === 'mine' && <Mine ctx={ctx} coins={liveCoins} />}
          {tab === 'earn' && <Earn ctx={ctx} />}
          {tab === 'friends' && <Friends ctx={ctx} />}
          {tab === 'profile' && <Profile ctx={ctx} />}
        </main>

        {/* Toast notifications */}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}

        {/* Level-Up Modal */}
        {lvlUp && (
          <div className="modal" role="dialog" aria-modal="true">
            <div className="card">
              <div className="burst" aria-hidden="true">
                LEVEL UP
              </div>
              <h2 className="text-2xl font-black text-white">
                Level {lvlUp}: {getLevelConfig(lvlUp).name}
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Congratulations! You unlocked the{' '}
                <b className="text-amber-400">{getLevelConfig(lvlUp).rank}</b> box crate!
              </p>
              <div className="stack">
                <button
                  className="btn"
                  onClick={() => {
                    setSelectedLevel(lvlUp);
                    setLvlUp(null);
                    setTab('play');
                    sound.playLevelUp();
                  }}
                >
                  Use New Crates
                </button>
                <button className="btn ghost" onClick={() => setLvlUp(null)}>
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation: 5 tabs Blast (active yellow), Upgrades, Earn, Friends, Profile */}
        <nav className="nav" aria-label="Bottom Navigation">
          {TABS.map(([k, label, Icon]) => {
            const isActive = tab === k;
            return (
              <button
                key={k}
                className={isActive ? 'on' : ''}
                aria-label={label}
                onClick={() => {
                  sound.playTap();
                  void flush();
                  setTab(k);
                }}
              >
                <Icon />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
