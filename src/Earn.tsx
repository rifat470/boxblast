import { fmt, tg } from './api';
import type { Ctx } from './App';

export default function Earn({ ctx }: { ctx: Ctx }) {
  const { s, act, flash, adFor, adBusy, nowMs } = ctx;
  const wait = Math.max(0, Math.ceil((s.ads.nextAt - nowMs) / 1000));
  const claimDaily = async () => {
    const r = await act('claimDaily');
    if (r) flash(`Daily reward +${fmt(r.result.reward)}`);
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

  return (
    <section>
      <h2>Daily reward</h2>
      <div className="days">
        {s.daily.rewards.map((r, i) => (
          <div key={i} className={'day' + (i < s.daily.filled ? ' done' : '')}>
            <small>Day {i + 1}</small>
            <b>{fmt(r)}</b>
          </div>
        ))}
      </div>
      <button className="btn" disabled={s.daily.claimedToday} onClick={claimDaily}>
        {s.daily.claimedToday ? 'Come back tomorrow' : 'Claim today’s reward'}
      </button>

      <h2>Bonus coins</h2>
      <div className="item">
        <div>
          <b>Watch a short ad</b>
          <div className="small muted">+{s.ads.reward} coins · {s.ads.left} left today · optional</div>
        </div>
        <button className="btn sm" disabled={adBusy || s.ads.left <= 0 || wait > 0} onClick={() => adFor('coins')}>
          {adBusy ? '…' : wait > 0 ? `${wait}s` : 'Watch'}
        </button>
      </div>

      <h2>Tasks</h2>
      {s.tasks.map((t) => {
        const ready = t.kind === 'channel' || t.progress >= t.target;
        return (
          <div className="item" key={t.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{t.title}</b>
              <div className="small muted">+{fmt(t.reward)} coins{t.kind !== 'channel' ? ` · ${fmt(Math.min(t.progress, t.target))} / ${fmt(t.target)}` : ''}</div>
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
