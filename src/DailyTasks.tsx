import { fmt } from './api';
import type { Ctx } from './App';
import GemIcon from './GemIcon';

const pad = (n: number) => String(n).padStart(2, '0');

// Gamee-style daily tasks: three optional ads, each with its own reward, plus a bonus chest for finishing all three.
export default function DailyTasks({ ctx, compact = false }: { ctx: Ctx; compact?: boolean }) {
  const { s, nowMs, adBusy, dailyTask } = ctx;
  const dt = s.dailyTasks;
  const total = dt.rows.length;
  const doneN = dt.done.length;
  const wait = Math.max(0, Math.ceil((s.ads.nextAt - nowMs) / 1000));
  const limit = s.ads.left <= 0;

  // Tasks reset at 00:00 UTC (the same moment as the daily reward).
  const d = new Date(nowMs);
  const nextReset = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const left = Math.max(0, Math.floor((nextReset - nowMs) / 1000));
  const timer = `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
  const gemName = s.gems.find((g) => g.id === dt.bonus.gem)?.name;

  return (
    <div className={'dt' + (compact ? ' dt-compact' : '')}>
      <div className="dt-head">
        <div>
          <h2 className="dt-title">DAILY TASKS</h2>
          <div className="dt-sub">Resets in {timer}</div>
        </div>
        <div className="dt-count" aria-label={`${doneN} of ${total} done`}>
          <b>{doneN}</b>/{total}
        </div>
      </div>

      <div className="dt-bar"><i style={{ width: `${(doneN / total) * 100}%` }} /></div>

      {dt.rows.map((r) => {
        const done = dt.done.includes(r.slot);
        const disabled = done || adBusy || limit || wait > 0;
        return (
          <div key={r.slot} className={'dt-row' + (done ? ' done' : '')}>
            <div className="dt-ico" aria-hidden="true">{done ? '✓' : '▶'}</div>
            <div className="dt-info">
              <b>Watch an ad today {r.slot}/{total}</b>
              <div className="dt-rew">
                <span className="dt-pill">+{fmt(r.coins)} coins</span>
                {r.energy && <span className="dt-pill energy">⚡ Full energy</span>}
              </div>
            </div>
            <button className={'btn sm' + (done ? ' ghost' : '')} disabled={disabled} onClick={() => dailyTask(r.slot)}>
              {done ? 'Done' : adBusy ? '…' : wait > 0 && !limit ? `${wait}s` : 'Watch'}
              {!done && <em className="ad-pill">AD</em>}
            </button>
          </div>
        );
      })}

      <div className={'dt-chest' + (dt.bonusGot ? ' got' : doneN === total ? ' ready' : '')}>
        <GemIcon id={dt.bonus.gem} size={40} dim={!dt.bonusGot} />
        <div className="dt-info">
          <b>{dt.bonusGot ? 'Bonus collected today' : `Finish all ${total} tasks`}</b>
          <div className="dt-rew">
            <span className="dt-pill">+{fmt(dt.bonus.coins)} coins</span>
            <span className="dt-pill gem">{gemName}</span>
          </div>
        </div>
        <span className="dt-chest-state">{dt.bonusGot ? '✓' : `${doneN}/${total}`}</span>
      </div>
      <p className="dt-note">Ads are optional. The game works fully without them.</p>
    </div>
  );
}
