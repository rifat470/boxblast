import { useState } from 'react';
import { fmt } from './api';
import type { Ctx } from './App';
import { SKIN_STYLES, skinVars } from './theme';
import { IconLock } from './icons';
import Guide, { Privacy } from './Guide';

type Sub = 'me' | 'guide' | 'privacy';

export default function Profile({ ctx }: { ctx: Ctx }) {
  const { s, act, flash } = ctx;
  const [sub, setSub] = useState<Sub>('me');

  const claim = async (lvl: number) => {
    const r = await act('claimLevel', { lvl });
    if (r) flash(`Level ${lvl} reward +${fmt(r.result.reward)}`);
  };
  const equip = async (id: string) => {
    const r = await act('setSkin', { id });
    if (r) flash('Box design changed');
  };

  return (
    <section>
      <div className="seg" role="tablist">
        {([['me', 'My profile'], ['guide', 'How to play'], ['privacy', 'Privacy']] as [Sub, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'on' : ''} onClick={() => setSub(k)}>{l}</button>
        ))}
      </div>

      {sub === 'guide' && <Guide />}
      {sub === 'privacy' && <Privacy />}

      {sub === 'me' && (
        <>
          <div className="hero">
            <span className="avatar big" aria-hidden="true">{(s.name || '?').slice(0, 1).toUpperCase()}</span>
            <div>
              <b className="mark">{s.name}</b>
              <div className="small muted">Level {s.level.lvl} · {s.level.name}</div>
            </div>
          </div>
          <div className="stats">
            <div><b>{fmt(s.totalEarned)}</b><small>Total earned</small></div>
            <div><b>{fmt(s.totalBlasts)}</b><small>Boxes blasted</small></div>
            <div><b>{s.refCount}</b><small>Friends invited</small></div>
          </div>

          <h2>Box designs</h2>
          <p className="small muted">A new design unlocks at every level. Tap an unlocked one to use it.</p>
          <div className="skins">
            {s.skins.map((k) => (
              <button
                key={k.id}
                className={'skin' + (s.skin === k.id ? ' on' : '') + (k.unlocked ? '' : ' locked')}
                disabled={!k.unlocked}
                onClick={() => equip(k.id)}
                aria-label={`${k.name}${k.unlocked ? '' : ', unlocks at level ' + k.level}`}
              >
                <span className={'mini ' + (SKIN_STYLES[k.id]?.fx || '')} style={skinVars(k.id)} />
                <b>{k.name}</b>
                <small>{k.unlocked ? (s.skin === k.id ? 'In use' : 'Unlocked') : <><IconLock /> Level {k.level}</>}</small>
              </button>
            ))}
          </div>

          <h2>Levels</h2>
          <p className="small muted">Your level comes from the coins you have earned in total. Spending coins never lowers it.</p>
          {s.levels.map((l) => (
            <div className="item" key={l.lvl}>
              <div>
                <b>Level {l.lvl}: {l.name}</b>
                <div className="small muted">
                  {l.at === 0 ? 'Starting level' : `Earn ${fmt(l.at)} coins in total`}
                  {l.reward > 0 ? ` · reward ${fmt(l.reward)}` : ''}
                </div>
              </div>
              {l.lvl > 1 && (
                <button className="btn sm" disabled={!l.reached || l.claimed} onClick={() => claim(l.lvl)}>
                  {l.claimed ? 'Done' : l.reached ? 'Claim' : 'Locked'}
                </button>
              )}
            </div>
          ))}

          <h2>Your account is safe</h2>
          <p className="small muted">
            Your progress is saved on our server under your Telegram account (ID {s.id}). If you delete the app, log out, or
            open it from someone else’s invite link, you will get the same account and the same balance back.
          </p>
        </>
      )}
    </section>
  );
}
