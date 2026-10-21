import { verifyInitData } from './_lib/auth.js';
import { db, getPlayer, HttpError, mutate, type Player } from './_lib/db.js';
import { AD, REF, TASKS } from './_lib/config.js';
import {
  blast, buyBoost, buyCard, checkAdAllowed, claimDaily, claimTask, grantAd, newPlayer, settle, view,
} from './_lib/game.js';

const bad = (m: string) => new HttpError(400, m);

async function isChannelMember(userId: number) {
  const token = process.env.BOT_TOKEN;
  const chat = process.env.CHANNEL_USERNAME;
  if (!token || !chat) throw new HttpError(409, 'Channel task is not available');
  const r = await fetch(
    `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(chat)}&user_id=${userId}`
  );
  const j: any = await r.json().catch(() => ({}));
  return j?.ok && ['member', 'administrator', 'creator'].includes(j.result?.status);
}

async function init(auth: { user: any; startParam: string }, now: number) {
  const { user, startParam } = auth;
  let p = await getPlayer(user.id);
  if (!p) {
    const base: any = { ...newPlayer(user, now) };
    const m = /^ref_(\d{3,15})$/.exec(startParam);
    const refId = m ? Number(m[1]) : 0;
    let referrerOk = false;
    if (refId && refId !== user.id && (await getPlayer(refId))) {
      base.referred_by = refId;
      base.coins = REF.invitee;
      base.total_earned = REF.invitee;
      referrerOk = true;
    }
    const { data, error } = await db().from('players').insert(base).select().maybeSingle();
    if (error) {
      if (error.code !== '23505') throw error;
      p = await getPlayer(user.id);
    } else {
      p = data as Player;
      if (referrerOk) {
        await mutate(refId, (r) => {
          r.coins += REF.inviter;
          r.total_earned += REF.inviter;
          r.ref_count += 1;
          return { player: r };
        });
      }
    }
  }
  const out = await mutate(user.id, (cur) => {
    const s = settle(cur, now);
    s.first_name = (user.first_name || s.first_name || 'Player').slice(0, 40);
    s.username = user.username ? String(user.username).slice(0, 40) : null;
    return { player: s };
  });
  return { state: view(out.player, now) };
}

async function route(auth: { user: any; startParam: string }, body: any) {
  const id: number = auth.user.id;
  const now = Date.now();
  const act = async <R,>(fn: (s: Player) => { player: Player; result?: R }) => {
    const out = await mutate<R>(id, (cur) => fn(settle(cur, now)));
    return { state: view(out.player, now), result: out.result };
  };

  switch (body.action) {
    case 'init':
      return init(auth, now);
    case 'sync': {
      const list = Array.isArray(body.blasts) ? body.blasts.slice(0, 60) : [];
      return act((s) => blast(s, list, now));
    }
    case 'buyCard':
      return act((s) => buyCard(s, String(body.id)));
    case 'buyBoost':
      return act((s) => buyBoost(s, String(body.id)));
    case 'claimDaily':
      return act((s) => claimDaily(s, now));
    case 'claimTask': {
      const t = TASKS.find((x) => x.id === body.id);
      if (!t) throw bad('Unknown task');
      if (t.kind === 'channel' && !(await isChannelMember(id)))
        throw new HttpError(409, 'Join the channel first, then tap Claim.');
      return act((s) => claimTask(s, t.id, now));
    }
    case 'adClaim': {
      const kind = body.kind === 'energy' ? 'energy' : 'coins';
      const cur = await getPlayer(id);
      if (!cur) throw new HttpError(404, 'Player not found');
      checkAdAllowed(settle(cur, now), now);
      if (process.env.AD_SERVER_CONFIRM !== 'false') {
        // Adsgram calls /api/ad-reward after a completed ad; one confirmation = one reward.
        const since = new Date(now - AD.confirmWindowS * 1000).toISOString();
        const { data } = await db()
          .from('ad_events')
          .select('id')
          .eq('tg_id', id)
          .eq('claimed', false)
          .gte('created_at', since)
          .order('id', { ascending: true })
          .limit(1);
        const ev = data?.[0];
        if (!ev) throw new HttpError(409, 'ad_not_confirmed');
        const { data: upd } = await db()
          .from('ad_events')
          .update({ claimed: true })
          .eq('id', ev.id)
          .eq('claimed', false)
          .select('id');
        if (!upd?.length) throw new HttpError(409, 'ad_not_confirmed');
      }
      return act((s) => grantAd(s, kind, now));
    }
    case 'leaderboard': {
      const me = await getPlayer(id);
      const { data } = await db()
        .from('players')
        .select('first_name,username,total_earned')
        .order('total_earned', { ascending: false })
        .limit(50);
      const { count } = await db()
        .from('players')
        .select('tg_id', { count: 'exact', head: true })
        .gt('total_earned', me?.total_earned ?? 0);
      return { top: data || [], rank: (count ?? 0) + 1 };
    }
    case 'friends': {
      const { data } = await db()
        .from('players')
        .select('first_name,total_earned')
        .eq('referred_by', id)
        .order('total_earned', { ascending: false })
        .limit(50);
      return { friends: data || [] };
    }
    default:
      throw bad('Unknown action');
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const token = process.env.BOT_TOKEN;
    if (!token) throw new HttpError(500, 'BOT_TOKEN missing');
    const raw = String(req.headers.authorization || '').replace(/^tma\s+/i, '');
    const auth = verifyInitData(raw, token);
    if (!auth) throw new HttpError(401, 'Session expired. Reopen the app from Telegram.');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    return res.status(200).json(await route(auth, body));
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    const msg = e instanceof HttpError ? e.message : `Server error${e?.code ? ' (' + e.code + ')' : ''}`;
    return res.status(status).json({ error: msg });
  }
}
