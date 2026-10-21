import { useEffect, useRef, useState } from 'react';
import { call, fmt, tg, type State } from './api';
import { watchAd } from './ads';
import Play from './Play';
import Mine from './Mine';
import Earn from './Earn';
import Friends from './Friends';

type Tab = 'play' | 'mine' | 'earn' | 'friends';
const TABS: [Tab, string][] = [['play', 'Blast'], ['mine', 'Upgrades'], ['earn', 'Earn'], ['friends', 'Friends']];
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

export default function App() {
  const [s, setS] = useState<State | null>(null);
  const [tab, setTab] = useState<Tab>('play');
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');
  const [pend, setPend] = useState({ coins: 0, n: 0 });
  const [nowMs, setNowMs] = useState(Date.now());
  const [adBusy, setAdBusy] = useState(false);
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

  // Blasts are batched and sent to the server, which rolls the real rewards.
  const flush = (): Promise<void> => {
    if (flying.current) return flying.current;
    if (!q.current.length) return Promise.resolve();
    inflight.current = q.current.splice(0, 60);
    updPend();
    flying.current = (async () => {
      try {
        const r = await call('sync', { blasts: inflight.current.map((b) => ({ perfect: b.perfect })) });
        put(r.state);
        inflight.current = [];
      } catch (e: any) {
        q.current = [...inflight.current, ...q.current];
        inflight.current = [];
        if (/session/i.test(e.message)) setErr(e.message);
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
    if (q.current.length >= 10) void flush();
  };

  useEffect(() => {
    const w = tg();
    try {
      w?.ready();
      w?.expand();
      w?.disableVerticalSwipes?.();
      w?.setHeaderColor?.('#12151c');
      w?.setBackgroundColor?.('#12151c');
    } catch { /* ignore */ }
    if (!w?.initData) {
      setErr('Open BoxBlast inside Telegram to play.');
      return;
    }
    call('init').then((r) => put(r.state)).catch((e) => setErr(e.message));
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

  const adFor = async (kind: 'coins' | 'energy') => {
    if (adBusy || !s) return;
    if (s.ads.left <= 0) return flash('Daily ad limit reached. Come back tomorrow.');
    if (Date.now() < s.ads.nextAt) return flash('The next ad will be ready in a moment.');
    setAdBusy(true);
    try {
      const r = await watchAd();
      if (r === 'unavailable') return flash('Ads are not available right now.');
      if (r === 'noad') return flash('No ad available right now. Try again later.');
      if (r === 'skipped') return flash('Watch the full ad to get the reward.');
      for (let i = 0; i < 6; i++) {
        try {
          const res = await call('adClaim', { kind });
          put(res.state);
          return flash(kind === 'energy' ? 'Energy refilled' : `+${s.ads.reward} coins`);
        } catch (e: any) {
          if (e.message !== 'ad_not_confirmed') return flash(e.message);
          await sleep(1500);
        }
      }
      flash('Reward could not be confirmed. Try again.');
    } finally {
      setAdBusy(false);
    }
  };

  if (err) {
    return (
      <div className="center">
        <b className="mark">BoxBlast</b>
        <p>{err}</p>
        <button className="btn" style={{ maxWidth: 240, margin: '14px auto 8px' }} onClick={() => location.reload()}>
          Try again
        </button>
        <a
          href="https://t.me/BoxBlastGame_bot"
          target="_blank"
          rel="noreferrer"
          className="btn ghost"
          style={{ maxWidth: 240, margin: '0 auto', textDecoration: 'none', display: 'inline-block' }}
        >
          Open in Telegram
        </a>
      </div>
    );
  }
  if (!s) return <div className="center"><b className="mark">BoxBlast</b><p>Loading your warehouse…</p></div>;

  const secs = Math.max(0, (nowMs - s.clientAt) / 1000);
  const liveCoins = s.coins + pend.coins + Math.floor((s.pph * Math.min(secs, 10800)) / 3600);
  const liveEnergy = Math.max(0, Math.min(s.maxEnergy, s.energy + Math.floor(secs * s.regen)) - pend.n);
  const ctx: Ctx = { s, nowMs, act, flash, adFor, adBusy };

  return (
    <div className="app">
      <header className="top">
        <div>
          <b className="mark">BoxBlast</b>
          <div className="sub">{s.name} · +{fmt(s.pph)} / hour</div>
        </div>
        <div className="chip" aria-label="Coins">{fmt(liveCoins)}</div>
      </header>

      <main>
        {tab === 'play' && (
          <Play
            energy={liveEnergy}
            maxEnergy={s.maxEnergy}
            regen={s.regen}
            tapLevel={s.tapLevel}
            onBlast={onBlast}
            ctx={ctx}
          />
        )}
        {tab === 'mine' && <Mine ctx={ctx} coins={liveCoins} />}
        {tab === 'earn' && <Earn ctx={ctx} />}
        {tab === 'friends' && <Friends ctx={ctx} />}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}

      <nav className="nav">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            className={tab === k ? 'on' : ''}
            onClick={() => {
              void flush();
              setTab(k);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
