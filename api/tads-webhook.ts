import { recordAdEvent } from './_lib/adEvents.js';

// TADS webhook (Fullscreen widget: called when the user viewed the ad). In the TADS dashboard, widget 12842,
// set the Webhook URL to:  https://YOUR-APP.vercel.app/api/tads-webhook?secret=YOUR_SECRET
// TADS sends JSON: { telegram_id, widget_id }.
export default async function handler(req: any, res: any) {
  const expected = process.env.AD_REWARD_SECRET;
  if (!expected || req.query?.secret !== expected) return res.status(403).json({ ok: false });
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const tid = String(body.telegram_id ?? req.query?.telegram_id ?? '');
  const wid = String(body.widget_id ?? req.query?.widget_id ?? '');
  const widget = process.env.TADS_WIDGET_ID || '12842';
  if (wid && wid !== widget) return res.status(200).json({ ok: true, ignored: true });
  const id = Number(tid);
  if (!/^\d{3,15}$/.test(tid) || !Number.isSafeInteger(id)) return res.status(200).json({ ok: true, ignored: true });
  try {
    const { error } = await recordAdEvent(id, 'tads');
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
}
function safeJson(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    return {};
  }
}
