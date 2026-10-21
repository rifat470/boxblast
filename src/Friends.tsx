import { useEffect, useState } from 'react';
import { call, fmt, haptic, tg } from './api';
import type { Ctx } from './App';

const env = (import.meta as any).env || {};
const APP_LINK: string = String(env.VITE_APP_LINK || '').trim().replace(/\/+$/, '');
const BOT_LINK: string = String(env.VITE_BOT_LINK || 'https://t.me/BoxBlastGame_bot').trim().replace(/\/+$/, '');

type Row = { first_name: string; username?: string; total_earned: number; lvl?: number };

export default function Friends({ ctx }: { ctx: Ctx }) {
  const { s, flash } = ctx;
  const [friends, setFriends] = useState<Row[]>([]);
  const [top, setTop] = useState<Row[]>([]);
  const [rank, setRank] = useState(0);

  useEffect(() => {
    call('friends').then((r) => setFriends(r.friends)).catch(() => {});
    call('leaderboard').then((r) => { setTop(r.top); setRank(r.rank); }).catch(() => {});
  }, []);

  const link = APP_LINK
    ? `${APP_LINK}${APP_LINK.includes('?') ? '&' : '?'}startapp=ref_${s.id}`
    : `${BOT_LINK}?start=ref_${s.id}`;

  const share = () => {
    haptic('medium');
    const text = 'Find the hidden box and blast it. Join me in BoxBlast!';
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    const w = tg();
    try {
      if (w?.openTelegramLink) {
        w.openTelegramLink(url);
      } else if (w?.openLink) {
        w.openLink(url);
      } else {
        window.open(url, '_blank');
      }
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

  return (
    <section>
      <h2>Your personal invite link</h2>
      <div className="linkbox" onClick={copy} role="button" tabIndex={0}>{link}</div>
      <p className="small muted">
        You get {fmt(s.refReward.inviter)} coins for every friend who joins. They start with {fmt(s.refReward.invitee)} coins.
        You have invited {s.refCount}.
      </p>
      <div className="row">
        <button className="btn" onClick={share}>Share invite</button>
        <button className="btn ghost" onClick={copy}>Copy link</button>
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
      <p className="small muted center-t">Coins are in-game points with no cash value.</p>
    </section>
  );
}
