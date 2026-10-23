import { fmt, tg } from './api';
import type { Ctx } from './App';
import GemIcon from './GemIcon';
import DailyTasks from './DailyTasks';

export default function Earn({ ctx }: { ctx: Ctx }) {
  const { s, act, flash, adFor, adBusy, nowMs, showGem } = ctx;
  const wait = Math.max(0, Math.ceil((s.ads.nextAt - nowMs) / 1000));
  const adOff = adBusy || s.ads.left <= 0 || wait > 0;
  const base = s.daily.next;

  const claimDaily = async () => {
    const r = await act('claimDaily');
    if (r) flash(`Daily reward +${fmt(r.result.reward)} coins`);
  };
  const claimTask = async (id: string) => {
    const r = await act('claimTask', { id });
    if (r) flash(`+${fmt(r.result.reward)} coins`);
  };
  const open = (url: string) => {
    const w = tg();
    if (w?.openTelegramLink) w.openTelegramLink(url);
    else window.open(url, '_blank');
  };
  const gemOf = (id: string) => s.gems.find((g) => g.id === id);
  const steps = Object.entries(s.ads.gemSteps).map(([n, id]) => ({ n: Number(n), id }));
  void showGem;

  return (
    <section>
      <DailyTasks ctx={ctx} />

      <h2>Daily reward</h2>
      <div className="days">
        {s.daily.rewards.map((r, i) => (
          <div key={i} className={'day' + (i < s.daily.filled ? ' done' : '')}>
            <small>Day {i + 1}</small>
            <b>{fmt(r)}</b>
          </div>
        ))}
      </div>
      {s.daily.claimedToday ? (
        <button className="btn" disabled>Come back tomorrow</button>
      ) : (
        <div className="stack-row">
          <button className="btn" onClick={claimDaily}>Claim +{fmt(base)}</button>
          <button className="btn gold" disabled={adOff} onClick={() => adFor('daily')}>
            {adBusy ? 'Loading ad…' : wait > 0 ? `Ad ready in ${wait}s` : `Watch ad · Claim ×2 (+${fmt(base * 2)})`}
            <em className="ad-pill">AD</em>
          </button>
        </div>
      )}
      <p className="small muted">The ad is optional. Without it you still get the normal daily reward.</p>

      <h2>Bonus coins</h2>
      <div className="item">
        <div>
          <b>Watch a short ad</b>
          <div className="small muted">+{s.ads.reward} coins · {s.ads.left} left today · optional</div>
        </div>
        <button className="btn sm" disabled={adOff} onClick={() => adFor('coins')}>
          {adBusy ? '…' : wait > 0 ? `${wait}s` : 'Watch'}
          <em className="ad-pill">AD</em>
        </button>
      </div>

      <h2>Daily ad gems</h2>
      <div className="panel">
        <div className="small muted">Optional ads you watch today ({s.ads.used} / {s.ads.perDay}). Gems go straight into your collection.</div>
        <div className="progress"><i style={{ width: `${Math.min(100, (s.ads.used / s.ads.perDay) * 100)}%` }} /></div>
        <div className="gem-goals">
          {steps.map((st) => (
            <div key={st.n} className={'gem-goal' + (s.ads.used >= st.n ? ' got' : '')}>
              <GemIcon id={st.id} size={40} dim={s.ads.used < st.n} />
              <b>{gemOf(st.id)?.name}</b>
              <small>{s.ads.used >= st.n ? 'Collected today' : `Watch ${st.n} ads`}</small>
            </div>
          ))}
        </div>
      </div>

      <h2>Tasks</h2>
      {s.tasks.map((t) => {
        const ready = t.kind === 'channel' || t.progress >= t.target;
        return (
          <div className="item" key={t.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{t.title}</b>
              <div className="small muted">
                +{fmt(t.reward)} coins{t.kind !== 'channel' ? ` · ${fmt(Math.min(t.progress, t.target))} / ${fmt(t.target)}` : ''}
              </div>
              {t.kind !== 'channel' && !t.claimed && (
                <div className="progress sm"><i style={{ width: `${Math.min(100, (t.progress / t.target) * 100)}%` }} /></div>
              )}
            </div>
            <div className="row">
              {t.url && !t.claimed && <button className="btn sm ghost" onClick={() => open(t.url!)}>Open</button>}
              <button className="btn sm" disabled={t.claimed || !ready} onClick={() => claimTask(t.id)}>
                {t.claimed ? 'Done' : 'Claim'}
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
