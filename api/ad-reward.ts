import { db, getPlayer } from './_lib/db.js';

// Adsgram "Reward URL": https://YOUR-APP.vercel.app/api/ad-reward?userid=[userId]&secret=YOUR_SECRET
// Called by Adsgram servers after a user finishes watching a rewarded ad.
export default async function handler(req: any, res: any) {
  const expected = process.env.AD_REWARD_SECRET;
  const { userid, secret } = req.query || {};
  if (!expected || secret !== expected) return res.status(403).json({ ok: false });
  const id = Number(userid);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ ok: false });
  try {
    if (!(await getPlayer(id))) return res.status(404).json({ ok: false });
    const { error } = await db().from('ad_events').insert({ tg_id: id });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
}
