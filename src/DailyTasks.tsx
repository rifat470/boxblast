import { fmt } from './api';
import type { Ctx } from './App';
import GemIcon from './GemIcon';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (sec: number) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;

// Gamee-style daily tasks. Each ad row gives its reward right after the ad is finished, then waits 3 hours.
// Finish all three and the bonus chest opens (coins + gem, doubled with one optional ad).
export default function DailyTasks({ ctx }: { ctx: Ctx; compact?: boolean }) {
  const { s, nowMs, adBusy, dailyTask, dailyBonus } = ctx;
  const dt = s.dailyTasks;
  const total = dt.rows.length;
  const doneN = dt.rows.filter((r) => r.until > nowMs).length;
  const wait = Math.max(0, Math.ceil((s.ads.nextAt - nowMs) / 1000));
  const limit = s.ads.left <= 0;
  const gemName = s.gems.find((g) => g.id === dt.bonus.gem)?.name;

  return (
    <div className="dt">
      <div className="dt-head">
        <div>
          <h2 className="dt-title">DAILY TASKS</h2>
          <div className="dt-sub">Each task is ready again {Math.round(dt.cooldownS / 3600)} hours after you finish it</div>
        </div>
        <div className="dt-count" aria-label={`${doneN} of ${total} done`}>
          <b>{doneN}</b>/{total}
        </div>
      </div>

      <div className="dt-bar"><i style={{ width: `${(doneN / total) * 100}%` }} /></div>

      {dt.rows.map((r) => {
        const left = Math.max(0, Math.ceil((r.until - nowMs) / 1000));
        const done = left > 0;
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
              {done && <div className="dt-wait">Ready again in {clock(left)}</div>}
            </div>
            <button className={'btn sm' + (done ? ' ghost' : '')} disabled={disabled} onClick={() => dailyTask(r.slot)}>
              {done ? 'Done' : adBusy ? '…' : wait > 0 && !limit ? `${wait}s` : 'Watch'}
              {!done && <em className="ad-pill">AD</em>}
            </button>
          </div>
        );
      })}

      <div className={'dt-chest' + (dt.bonusGot ? ' got' : dt.bonusReady ? ' ready' : '')}>
        <GemIcon id={dt.bonus.gem} size={44} dim={!dt.bonusGot && !dt.bonusReady} />
        <div className="dt-info">
          <b>{dt.bonusGot ? 'Bonus collected today' : `Finish all ${total} tasks`}</b>
          <div className="dt-rew">
            <span className="dt-pill">+{fmt(dt.bonus.coins)} coins</span>
            <span className="dt-pill gem">{gemName}</span>
          </div>
        </div>
        {dt.bonusGot ? (
          <span className="dt-chest-state">Done</span>
        ) : !dt.bonusReady ? (
          <span className="dt-chest-state">{doneN}/{total}</span>
        ) : null}
      </div>
      {dt.bonusReady && (
        <div className="stack-row" style={{ marginTop: 10 }}>
          <button className="btn" disabled={adBusy} onClick={() => dailyBonus(false)}>
            Claim +{fmt(dt.bonus.coins)} coins + 1 gem
          </button>
          <button className="btn gold" disabled={adBusy || limit || wait > 0} onClick={() => dailyBonus(true)}>
            {adBusy ? 'Loading ad…' : wait > 0 && !limit ? `Ad ready in ${wait}s` : `Watch ad · Claim ×2 (+${fmt(dt.bonus.coins * 2)} coins + 2 gems)`}
            <em className="ad-pill">AD</em>
          </button>
        </div>
      )}
      <p className="dt-note">Ads are optional. The game works fully without them. The bonus chest can be collected once a day.</p>
    </div>
  );
}
