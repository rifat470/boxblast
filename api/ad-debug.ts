import { db } from './_lib/db.js';

// Owner-only ad diagnostics. Open it in a browser:
//   https://YOUR-APP.vercel.app/api/ad-debug?secret=YOUR_AD_REWARD_SECRET            (last 30 ad confirmations of everybody)
//   https://YOUR-APP.vercel.app/api/ad-debug?secret=YOUR_AD_REWARD_SECRET&id=123456  (only one Telegram user id)
// If you watch an ad and NO new row appears here, the ad network did not call your server (Reward URL / postback / webhook).
export default async function handler(req: any, res: any) {
  const expected = process.env.AD_REWARD_SECRET;
  const q = req.query || {};
  if (!expected || q.secret !== expected) return res.status(403).json({ ok: false });
  try {
    let query = db().from('ad_events').select('*').order('id', { ascending: false }).limit(30);
    if (/^\d{3,15}$/.test(String(q.id || ''))) query = query.eq('tg_id', Number(q.id));
    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json({
      now: new Date().toISOString(),
      note: 'claimed=false means the network confirmed an ad that the game has not paid yet. A confirmation older than 5 minutes is no longer usable.',
      events: (data || []).map((e: any) => ({ id: e.id, tg_id: e.tg_id, network: e.network, claimed: e.claimed, at: e.created_at, ymid: e.ymid })),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e).slice(0, 200) });
  }
}
