import { fmt } from './api';
import type { Ctx } from './App';

export default function Mine({ ctx, coins }: { ctx: Ctx; coins: number }) {
  const { s, act, flash } = ctx;
  const buy = async (action: 'buyCard' | 'buyBoost', id: string) => {
    const r = await act(action, { id });
    if (r) flash('Upgraded');
  };
  return (
    <section>
      <h2>Boosts</h2>
      {s.boosts.map((b) => (
        <div className="item" key={b.id}>
          <div>
            <b>{b.name}</b> <span className="lvl">Lv {b.level}</span>
            <div className="small muted">{b.desc}</div>
          </div>
          <button className="btn sm" disabled={coins < b.cost || b.level >= b.max} onClick={() => buy('buyBoost', b.id)}>
            {b.level >= b.max ? 'Max' : fmt(b.cost)}
          </button>
        </div>
      ))}
      <h2>Warehouse</h2>
      <p className="small muted">Each upgrade earns coins every hour, even while you are away (up to 3 hours at a time).</p>
      {s.cards.map((c) => (
        <div className="item" key={c.id}>
          <div>
            <b>{c.name}</b> <span className="lvl">Lv {c.level}</span>
            <div className="small muted">{c.desc} · +{fmt(c.pph)}/hour per level</div>
          </div>
          <button className="btn sm" disabled={coins < c.cost || c.level >= c.max} onClick={() => buy('buyCard', c.id)}>
            {c.level >= c.max ? 'Max' : fmt(c.cost)}
          </button>
        </div>
      ))}
    </section>
  );
}
