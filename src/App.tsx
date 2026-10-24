import { useEffect, useRef, useState, type JSX } from 'react';
import { call, fmt, tg, type State } from './api';
import { watchAd, type Net } from './ads';
import Play from './Play';
import Mine from './Mine';
import Earn from './Earn';
import Friends from './Friends';
import Profile from './Profile';
import GemIcon from './GemIcon';
import Avatar from './Avatar';
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
// Which network goes first for each button; the next one is used only if the first has no ad within 5 seconds.
const ORDER: Record<AdKind, Net[]> = { energy: ['monetag', 'adsgram'], coins: ['adsgram', 'monetag'], daily: ['tads', 'adsgram'] };
const TASK_ORDER: Record<number, Net[]> = { 1: ['adsgram'], 2: ['monetag', 'adsgram'], 3: ['tads', 'adsgram'] };
const BONUS_ORDER: Net[] = ['adsgram', 'monetag'];
export type Ctx = {
  s: State;
  nowMs: number;
  act: (action: string, extra?: object) => Promise<any | null>;
  flash: (m: string) => void;
  adFor: (kind: AdKind) => Promise<void>;
  adBusy: boolean;
  showGem: (id: string) => void;
  dailyTask: (slot: number) => Promise<void>;
  dailyBonus: (double: boolean) => Promise<void>;
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
  const [away, setAway] = useState(0);

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
      .then((r) => {
        put(r.state);
        if (r.away >= 20) setAway(r.away);
      })
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

  // Rewarded ads: the ad network shows the ad, then OUR SERVER checks that network's confirmation and pays the reward.
  const NOAD = 'No ad available right now. Please try again in a minute.';
  const confirmed = async (fn: (net: Net) => Promise<any>, net: Net) => {
    for (let i = 0; i < 8; i++) {
      try {
        return await fn(net);
      } catch (e: any) {
        if (e.message === 'ad_not_confirmed' && i < 7) {
          await sleep(1200);
          continue;
        }
        throw e;
      }
    }
    return null;
  };
  const celebrate = () => {
    sound.playLevelUp();
    triggerConfetti(window.innerWidth / 2, window.innerHeight / 2, ['#ffc93c', '#22c55e', '#ffffff']);
  };
  const adErr = (e: any) => flash(e.message === 'ad_not_confirmed' ? 'Ad reward not confirmed yet. Please try again in a moment.' : e.message);

  const adFor = async (kind: AdKind) => {
    if (adBusy || !s) return;
    if (s.ads.left <= 0) return flash('Daily ad limit reached. Come back tomorrow.');
    setAdBusy(true);
    try {
      sound.playTap();
      const r = await watchAd(ORDER[kind], `${kind}_btn`);
      if (r.status === 'unavailable' || r.status === 'noad') return flash(NOAD);
      if (r.status === 'skipped') return flash('Watch the full ad to get the reward.');
      await flushAll();
      const res = await confirmed(
        (net) => (kind === 'daily' ? call('claimDaily', { double: true, network: net }) : call('adClaim', { kind, network: net })),
        r.network,
      );
      if (!res) return;
      put(res.state);
      celebrate();
      if (kind === 'energy') flash('⚡ Energy fully refilled!');
      else if (kind === 'daily') flash(`Daily reward doubled: +${fmt(res.result.reward)} coins`);
      else flash(`+${fmt(res.state.ads.reward)} bonus coins`);
      if (res.result?.gem) setTimeout(() => showGem(res.result.gem), 500);
    } catch (e: any) {
      adErr(e);
    } finally {
      setAdBusy(false);
    }
  };

  // Daily Tasks (3 rows): row 1 Adsgram, row 2 Monetag, row 3 TADS. Row 2 and 3 use Adsgram if their own network has no ad in 5 s.
  const dailyTask = async (slot: number) => {
    if (adBusy || !s) return;
    if (s.ads.left <= 0) return flash('Daily ad limit reached. Come back tomorrow.');
    setAdBusy(true);
    try {
      sound.playTap();
      const r = await watchAd(TASK_ORDER[slot] || ['adsgram'], `task_${slot}`);
      if (r.status === 'unavailable' || r.status === 'noad') return flash(NOAD);
      if (r.status === 'skipped') return flash('Watch the full ad to get the reward.');
      await flushAll();
      const res = await confirmed((net) => call('dailyTask', { slot, network: net }), r.network);
      if (!res) return;
      put(res.state);
      celebrate();
      const x = res.result;
      flash(`Task ${slot}/3 done: +${fmt(x.coins)} coins${x.energy ? ' and full energy' : ''}${x.allDone ? '. Now open your bonus chest!' : ''}`);
      if (x.gem) setTimeout(() => showGem(x.gem), 700);
    } catch (e: any) {
      adErr(e);
    } finally {
      setAdBusy(false);
    }
  };

  // "Finish all 3 tasks" chest: normal claim, or one optional ad doubles the coins and the gem.
  const dailyBonus = async (double: boolean) => {
    if (adBusy || !s) return;
    setAdBusy(true);
    try {
      if (!double) {
        const r = await act('dailyBonus', { double: false });
        if (r) {
          celebrate();
          flash(`Bonus chest: +${fmt(r.result.coins)} coins`);
          setTimeout(() => showGem(r.result.gem), 500);
        }
        return;
      }
      if (s.ads.left <= 0) return flash('Daily ad limit reached. Come back tomorrow.');
      sound.playTap();
      const r = await watchAd(BONUS_ORDER, 'task_bonus');
      if (r.status === 'unavailable' || r.status === 'noad') return flash(NOAD);
      if (r.status === 'skipped') return flash('Watch the full ad to double the bonus.');
      await flushAll();
      const res = await confirmed((net) => call('dailyBonus', { double: true, network: net }), r.network);
      if (!res) return;
      put(res.state);
      celebrate();
      flash(`Bonus chest doubled: +${fmt(res.result.coins)} coins and ${res.result.gemCount} gems`);
      setTimeout(() => showGem(res.result.gem), 500);
    } catch (e: any) {
      adErr(e);
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

  const ctx: Ctx = { s, nowMs, act, flash, adFor, adBusy, showGem, dailyTask, dailyBonus };

  return (
    <div className="relative min-h-screen text-[#f4efe6] overflow-x-hidden">
      <ParticleBackground level={lvl} />

      <div className="app">
        <header className="top" role="banner">
          <div className="who">
            <Avatar name={s.name} className="avatar" />
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
          {tab === 'play' && (
            <button className="dt-teaser" onClick={() => setTab('earn')}>
              <span className="dt-teaser-ico" aria-hidden="true">🎁</span>
              <span className="dt-teaser-txt">
                <b>Daily tasks {s.dailyTasks.done.length}/{s.dailyTasks.rows.length}</b>
                <small>
                  {s.dailyTasks.done.length >= s.dailyTasks.rows.length
                    ? 'All done today. See you tomorrow!'
                    : `Earn up to ${fmt(s.dailyTasks.rows.reduce((a, r) => a + r.coins, 0) + s.dailyTasks.bonus.coins)} coins + a gem`}
                </small>
              </span>
              <span className="dt-teaser-go">›</span>
            </button>
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

        {away > 0 && (
          <div className="modal" role="dialog" aria-modal="true">
            <div className="card gem-card">
              <div className="away-ico" aria-hidden="true">🏭</div>
              <h2 className="text-2xl font-black text-white">Welcome back!</h2>
              <p className="text-sm text-slate-300 mt-2">
                Your warehouse kept working while you were away and earned <b className="text-amber-300">+{fmt(away)} coins</b>.
              </p>
              <div className="stack">
                <button className="btn" onClick={() => { setAway(0); sound.playLevelUp(); }}>Collect</button>
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
