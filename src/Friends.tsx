import { useEffect, useState } from 'react';
import { call, fmt, haptic, tg } from './api';
import type { Ctx } from './App';
import GemIcon from './GemIcon';

const env = (import.meta as any).env || {};
const APP_LINK: string = String(env.VITE_APP_LINK || '').trim().replace(/\/+$/, '');
const BOT_LINK: string = String(env.VITE_BOT_LINK || 'https://t.me/BoxBlastGame_bot').trim().replace(/\/+$/, '');

type Row = { first_name: string; username?: string; total_earned: number; lvl?: number };

export default function Friends({ ctx }: { ctx: Ctx }) {
  const { s, flash, act, showGem } = ctx;
  const [friends, setFriends] = useState<Row[]>([]);
  const [top, setTop] = useState<Row[]>([]);
  const [rank, setRank] = useState(0);

  useEffect(() => {
    call('friends').then((r) => setFriends(r.friends)).catch(() => {});
    call('leaderboard').then((r) => { setTop(r.top); setRank(r.rank); }).catch(() => {});
  }, [s.refCount]);

  // Mini App link: it MUST open the Mini App itself (startapp). A plain ?start= link only opens the bot chat,
  // so the invite code would never reach the game and the referral would not be counted.
  const link = APP_LINK
    ? `${APP_LINK}${APP_LINK.includes('?') ? '&' : '?'}startapp=ref_${s.id}`
    : `${BOT_LINK}?startapp=ref_${s.id}`;

  const share = () => {
    haptic('medium');
    const text = 'Find the hidden box and blast it. Join me in BoxBlast!';
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    const w = tg();
    try {
      if (w?.openTelegramLink) w.openTelegramLink(url);
      else if (w?.openLink) w.openLink(url);
      else window.open(url, '_blank');
    } catch {
      window.open(url, '_blank');
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      flash('Invite link copied');
    } catch {
      flash('Link: ' + link);
    }
  };
  const claim = async (id: string) => {
    const r = await act('claimRef', { id });
    if (!r) return;
    flash(`+${fmt(r.result.reward)} coins`);
    if (r.result.gem) setTimeout(() => showGem(r.result.gem), 400);
  };

  const nextStep = s.refSteps.find((x) => !x.reached);
  const gemName = (id: string | null) => s.gems.find((g) => g.id === id)?.name;

  return (
    <section>
      <h2>Your personal invite link</h2>
      <div className="linkbox" onClick={copy} role="button" tabIndex={0}>{link}</div>
      <p className="small muted">
        You get {fmt(s.refReward.inviter)} coins for every friend who joins with your link. They start with {fmt(s.refReward.invitee)} coins.
        Friends invited so far: <b className="text-amber-300">{s.refCount}</b>.
      </p>
      <div className="row">
        <button className="btn" onClick={share}>Share invite</button>
        <button className="btn ghost" onClick={copy}>Copy link</button>
      </div>

      <h2>Invite rewards · 1 to 100 friends</h2>
      <div className="panel">
        <div className="small muted">
          {nextStep
            ? `${nextStep.at - s.refCount} more friend${nextStep.at - s.refCount === 1 ? '' : 's'} to the next reward.`
            : 'You unlocked every invite reward. Amazing!'}
        </div>
        <div className="progress"><i style={{ width: `${Math.min(100, s.refCount)}%` }} /></div>
      </div>
      <div className="ladder">
        {s.refSteps.map((st) => (
          <div key={st.id} className={'rung' + (st.reached ? ' reached' : '') + (st.claimed ? ' claimed' : '')}>
            <div className="rung-n"><b>{st.at}</b><small>friends</small></div>
            <div className="rung-body">
              <b>+{fmt(st.coins)} coins</b>
              {st.gem ? (
                <div className="rung-gem">
                  <GemIcon id={st.gem} size={26} dim={!st.reached} />
                  <span>{gemName(st.gem)}</span>
                </div>
              ) : (
                <small className="muted">Coin bonus</small>
              )}
            </div>
            <button className="btn sm" disabled={!st.reached || st.claimed} onClick={() => claim(st.id)}>
              {st.claimed ? 'Done' : st.reached ? 'Claim' : `${Math.min(s.refCount, st.at)}/${st.at}`}
            </button>
          </div>
        ))}
      </div>

      {friends.length > 0 && (
        <>
          <h2>Your friends</h2>
          {friends.map((f, i) => (
            <div className="item" key={i}><b>{f.first_name}</b><span className="muted">{fmt(f.total_earned)}</span></div>
          ))}
        </>
      )}

      <h2>Leaderboard</h2>
      {rank > 0 && <p className="small muted">Your rank: #{rank}</p>}
      {top.map((p, i) => (
        <div className="item" key={i}>
          <div><span className="lvl">#{i + 1}</span> <b>{p.first_name}</b> {p.lvl ? <span className="lvl">Lv {p.lvl}</span> : null}</div>
          <span className="muted">{fmt(p.total_earned)}</span>
        </div>
      ))}
      <p className="small muted center-t">Coins and gems are in-game items with no cash value.</p>
    </section>
  );
}
