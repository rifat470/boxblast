import { recordAdEvent } from './_lib/adEvents.js';

// Monetag rewarded postback. In the Monetag dashboard set the postback URL to:
// https://YOUR-APP.vercel.app/api/monetag-postback?secret=YOUR_SECRET&ymid={ymid}&event_type={event_type}&reward_event_type={reward_event_type}&telegram_id={telegram_id}&zone_id={zone_id}
// (YOUR_SECRET = the same AD_REWARD_SECRET you already use for Adsgram.)
export default async function handler(req: any, res: any) {
  const q = req.query || {};
  const expected = process.env.AD_REWARD_SECRET;
  if (!expected || q.secret !== expected) return res.status(403).json({ ok: false });
  // Only a paid, rendered ad counts as a completed view.
  if (q.event_type !== 'impression' || q.reward_event_type !== 'valued') return res.status(200).json({ ok: true, ignored: true });
  const zone = process.env.MONETAG_ZONE_ID || '12108818';
  if (q.zone_id && String(q.zone_id) !== zone) return res.status(200).json({ ok: true, ignored: true });
  const ymid = String(q.ymid || '');
  if (!/^[A-Za-z0-9_.-]{4,80}$/.test(ymid)) return res.status(200).json({ ok: true, ignored: true });
  // The player id is Telegram's own id; fall back to the id we put at the start of the ymid.
  const fromYmid = /^(\d{3,15})_/.exec(ymid)?.[1];
  const id = Number(/^\d{3,15}$/.test(String(q.telegram_id || '')) ? q.telegram_id : fromYmid);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(200).json({ ok: true, ignored: true });
  try {
    const { error } = await recordAdEvent(id, 'monetag', ymid);
    // 23505 = this ymid was already stored (Monetag retries or sends impression and click): that is fine.
    if (error && error.code !== '23505') throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
}
