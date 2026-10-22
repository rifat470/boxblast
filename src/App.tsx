import { useEffect, useRef, useState, type JSX } from 'react';
import { call, fmt, tg, type State } from './api';
import { watchAd } from './ads';
import Play from './Play';
import Mine from './Mine';
import Earn from './Earn';
import Friends from './Friends';
import Profile from './Profile';
import GemIcon from './GemIcon';
import { applyTheme, getLevelConfig } from './theme';
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

// One entry per TAP. Every tap (hit or miss) costs 1 energy; only hits earn coins.
type B = { hit: boolean; perfect: boolean; pts: number };
const sum = (a: B[]) => a.reduce((s, b) => s + b.pts, 0);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BOT_LINK: string = String((import.meta as any).env?.VITE_BOT_LINK || '').trim();

export type AdKind = 'coins' | 'energy' | 'daily';
export type Ctx = {
  s: State;
  nowMs: number;
  act: (action: string, extra?: object) => Promise<any | null>;
  flash: (m: string) => void;
  adFor: (kind: AdKind) => Promise<void>;
  adBusy: boolean;
  showGem: (id: string) => void;
};

export default function App() {
  const inTelegram = !!tg()?.initData;
  const [s, setS] = useState<State | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [tab, setTab] = useState<Tab>('play');
  const [toast, setToast] = useState('');
  const [pend, setPend] = useState({ coins: 0, n: 0 });
  const [nowMs, setNowMs] = useState(Date.now());
  const [adBusy, setAdBusy] = useState(false);
  const [lvlUp, setLvlUp] = useState<number | null>(null);
  const [gemWin, setGemWin] = useState<string | null>(null);
  const [coinPillBump, setCoinPillBump] = useState(false);

  const q = useRef<B[]>([]);
  const inflight = useRef<B[]>([]);
  const flying = useRef<Promise<void> | null>(null);
  const toastT = useRef(0);
  const lastLvl = useRef(0);

  const put = (st: State) => setS({ ...st, clientAt: Date.now() });

  const flash = (m: string) => {
    setToast(m);
    clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(''), 2600);
  };

  const updPend = () =>
    setPend({ coins: sum(q.current) + sum(inflight.current), n: q.current.length + inflight.current.length });

  const flush = (): Promise<void> => {
    if (flying.current) return flying.current;
    if (!q.current.length) return Promise.resolve();
    inflight.current = q.current.splice(0, 60);
    updPend();
    flying.current = (async () => {
      try {
        const r = await call('sync', { blasts: inflight.current.map((b) => ({ hit: b.hit, perfect: b.perfect })) });
        if (r.state) put(r.state);
        inflight.current = [];
      } catch {
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
    for (let i = 0; i < 6 && (q.current.length || flying.current); i++) await flush();
  };

  const onTap = (hit: boolean, perfect: boolean, pts: number) => {
    q.current.push({ hit, perfect, pts: hit ? pts : 0 });
    updPend();
    if (q.current.length >= 8) void flush();
  };

  const loadGame = () => {
    setLoadErr('');
    call('init')
      .then((r) => put(r.state))
      .catch((e: any) => setLoadErr(e?.message || 'Could not load the game'));
  };

  useEffect(() => {
    const w = tg();
    try {
      w?.ready?.();
      w?.expand?.();
      w?.disableVerticalSwipes?.();
    } catch {
      /* ignore */
    }
    if (!w?.initData) return;
    loadGame();
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

  // The theme and the level-up popup follow the REAL level that the server calculates from total coins earned.
  const lvl = s?.level.lvl || 1;
  useEffect(() => {
    applyTheme(lvl);
  }, [lvl]);
  useEffect(() => {
    if (!s) return;
    if (lastLvl.current && s.level.lvl > lastLvl.current) {
      setLvlUp(s.level.lvl);
      sound.playLevelUp();
      triggerConfetti(window.innerWidth / 2, 160, ['#ffc93c', '#ffffff', '#22c55e']);
    }
    lastLvl.current = s.level.lvl;
  }, [s?.level.lvl]); // eslint-disable-line react-hooks/exhaustive-deps

  const showGem = (id: string) => {
    setGemWin(id);
    sound.playLevelUp();
    triggerConfetti(window.innerWidth / 2, 200, ['#ffffff', '#8fd0ff', '#ffc93c', '#c084fc']);
  };

  const act = async (action: string, extra: object = {}) => {
    await flushAll();
    try {
      const r = await call(action, extra);
      if (r.state) put(r.state);
      return r;
    } catch (e: any) {
      flash(e.message);
      return null;
    }
  };

  // Rewarded ads: Adsgram shows the ad, then OUR SERVER checks Adsgram's confirmation and pays the reward.
  const adFor = async (kind: AdKind) => {
    if (adBusy || !s) return;
    if (s.ads.left <= 0) return flash('Daily ad limit reached. Come back tomorrow.');
    setAdBusy(true);
    try {
      sound.playTap();
      const r = await watchAd();
      if (r === 'unavailable') return flash('Ads are not available right now. Please try again later.');
      if (r === 'noad') return flash('No ad available right now. Try again in a minute.');
      if (r === 'skipped') return flash('Watch the full ad to get the reward.');
      await flushAll();
      let res: any = null;
      for (let i = 0; i < 7; i++) {
        try {
          res = kind === 'daily' ? await call('claimDaily', { double: true }) : await call('adClaim', { kind });
          break;
        } catch (e: any) {
          if (e.message === 'ad_not_confirmed' && i < 6) {
            await sleep(1200);
            continue;
          }
          throw e;
        }
      }
      if (!res) return;
      put(res.state);
      sound.playLevelUp();
      triggerConfetti(window.innerWidth / 2, window.innerHeight / 2, ['#ffc93c', '#22c55e', '#ffffff']);
      if (kind === 'energy') flash('⚡ Energy fully refilled!');
      else if (kind === 'daily') flash(`Daily reward doubled: +${fmt(res.result.reward)} coins`);
      else flash(`+${fmt(res.state.ads.reward)} bonus coins`);
      if (res.result?.gem) setTimeout(() => showGem(res.result.gem), 500);
    } catch (e: any) {
      flash(e.message === 'ad_not_confirmed' ? 'Ad reward not confirmed yet. Please try again in a moment.' : e.message);
    } finally {
      setAdBusy(false);
    }
  };

  // ---------- Not inside Telegram ----------
  if (!inTelegram) {
    return (
      <div className="landing">
        <div className="landing-card">
          <div className="landing-logo">📦</div>
          <h1>BoxBlast</h1>
          <p>Find the hidden box, blast it, level up your warehouse and collect rare gems. BoxBlast is a Telegram Mini App.</p>
          {BOT_LINK ? (
            <a className="btn" href={BOT_LINK}>Open in Telegram</a>
          ) : (
            <p className="small muted">Open this game from our Telegram bot.</p>
          )}
        </div>
      </div>
    );
  }

  // ---------- Loading / error ----------
  if (!s) {
    return (
      <div className="landing">
        <div className="landing-card">
          <div className="landing-logo spin">📦</div>
          {loadErr ? (
            <>
              <p>{loadErr}</p>
              <button className="btn" onClick={loadGame}>Try again</button>
            </>
          ) : (
            <p className="muted">Loading your warehouse…</p>
          )}
        </div>
      </div>
    );
  }

  // Live values between server syncs
  const secs = Math.max(0, (nowMs - s.clientAt) / 1000);
  const liveCoins = s.coins + pend.coins + Math.floor((s.pph * Math.min(secs, 10800)) / 3600);
  const regenned = Math.floor(secs / s.regenEveryS) * s.regenPerTick;
  const liveEnergy = Math.max(0, Math.min(s.maxEnergy, s.energy + regenned) - pend.n);

  const curCfg = getLevelConfig(lvl);
  const next = s.level.next;
  const nextCfg = next ? getLevelConfig(next.lvl) : null;
  const liveEarned = s.totalEarned + pend.coins;
  const lvlPct = next
    ? Math.min(100, Math.max(3, ((liveEarned - s.level.at) / Math.max(1, next.at - s.level.at)) * 100))
    : 100;
  const skinLvl = Math.min(lvl, Math.max(1, Number(/^lv(\d+)$/.exec(s.skin)?.[1] || lvl)));

  const ctx: Ctx = { s, nowMs, act, flash, adFor, adBusy, showGem };

  return (
    <div className="relative min-h-screen text-[#f4efe6] overflow-x-hidden">
      <ParticleBackground level={lvl} />

      <div className="app">
        <header className="top" role="banner">
          <div className="who">
            <span className="avatar" aria-hidden="true">{(s.name || 'P').slice(0, 1).toUpperCase()}</span>
            <div>
              <b className="mark">{s.name || 'Player'}</b>
              <div className="sub">Lv {lvl} · {curCfg.name} · +{fmt(s.pph)} / hour</div>
            </div>
          </div>
          <div id="coin-counter-pill" className={`chip ${coinPillBump ? 'bump' : ''}`} aria-label="Coins">
            <svg className="w-5 h-5 text-amber-950 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M9 9h6M9 15h6" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{fmt(liveCoins)}</span>
          </div>
        </header>

        <div className="lvlbar" aria-label="Level progress">
          <div className="lvlfill" style={{ width: `${lvlPct}%`, background: curCfg.barGradient }} />
          <span>
            <span>{nextCfg ? `Level ${nextCfg.lvl} ${nextCfg.name}:` : 'Max level reached'}</span>
            <span>{next ? `${fmt(liveEarned)} / ${fmt(next.at)}` : fmt(liveEarned)}</span>
          </span>
        </div>

        <main>
          {tab === 'play' && (
            <Play
              energy={liveEnergy}
              maxEnergy={s.maxEnergy}
              regenEveryS={s.regenEveryS}
              regenPerTick={s.regenPerTick}
              tapLevel={s.tapLevel}
              onTap={onTap}
              ctx={ctx}
              currentLevel={skinLvl}
              onCoinHit={() => {
                setCoinPillBump(true);
                setTimeout(() => setCoinPillBump(false), 350);
              }}
            />
          )}
          {tab === 'mine' && <Mine ctx={ctx} coins={liveCoins} />}
          {tab === 'earn' && <Earn ctx={ctx} />}
          {tab === 'friends' && <Friends ctx={ctx} />}
          {tab === 'profile' && <Profile ctx={ctx} />}
        </main>

        {toast && <div className="toast" role="status">{toast}</div>}

        {lvlUp && (
          <div className="modal" role="dialog" aria-modal="true">
            <div className="card">
              <div className="burst" aria-hidden="true">LEVEL UP</div>
              <h2 className="text-2xl font-black text-white">Level {lvlUp}: {getLevelConfig(lvlUp).name}</h2>
              <p className="text-sm text-slate-400 mt-2">
                You unlocked the <b className="text-amber-400">{getLevelConfig(lvlUp).rank}</b> box design. Claim your level reward in Profile.
              </p>
              <div className="stack">
                <button className="btn" onClick={() => { setLvlUp(null); setTab('profile'); }}>Go to rewards</button>
                <button className="btn ghost" onClick={() => setLvlUp(null)}>Continue</button>
              </div>
            </div>
          </div>
        )}

        {gemWin && (
          <div className="modal" role="dialog" aria-modal="true">
            <div className="card gem-card">
              <div className="gem-pop"><GemIcon id={gemWin} size={110} /></div>
              <h2 className="text-2xl font-black text-white">New gem!</h2>
              <p className="text-sm text-slate-300 mt-2">
                <b className="text-amber-300">{s.gems.find((g) => g.id === gemWin)?.name}</b> was added to your collection in Profile.
              </p>
              <div className="stack">
                <button className="btn" onClick={() => setGemWin(null)}>Awesome</button>
              </div>
            </div>
          </div>
        )}

        <nav className="nav" aria-label="Bottom Navigation">
          {TABS.map(([k, label, Icon]) => (
            <button
              key={k}
              className={tab === k ? 'on' : ''}
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
          ))}
        </nav>
      </div>
    </div>
  );
}
