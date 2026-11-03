import { db, HttpError } from './_lib/db.js';
import { reminderReason, settle } from './_lib/game.js';
import type { Player } from './_lib/db.js';

// One gentle reminder per player per day, sent by Vercel Cron (see vercel.json: every day 13:00 UTC).
// Rules (all of them are kept):
//  - only players who left their reminders ON (Profile -> Reminders) and who were last seen 8 hours to 3 days ago
//  - at most one message per 20 hours, and only for a real reason: hearts are back, the daily reward waits, or the warehouse earned coins
//  - a player who blocked the bot is switched off for good (no more tries)
// Auth: Vercel Cron sends "Authorization: Bearer CRON_SECRET". For a manual test: /api/cron-remind?secret=AD_REWARD_SECRET
const TEXT: Record<string, string> = {
  hearts: '❤️ Your hearts are back! A few Box Match levels are waiting for you.',
  daily: '🎁 Your daily reward is waiting in BoxBlast.',
  offline: '🏭 Your warehouse kept working and earned coins while you were away.',
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req: any, res: any) {
  const cron = process.env.CRON_SECRET;
  const manual = process.env.AD_REWARD_SECRET;
  const auth = String(req.headers?.authorization || '');
  const ok = (cron && auth === `Bearer ${cron}`) || (manual && req.query?.secret === manual);
  if (!ok) return res.status(403).json({ ok: false });
  const token = process.env.BOT_TOKEN;
  if (!token) return res.status(200).json({ ok: true, skipped: 'BOT_TOKEN is not set' });
  const link = String(process.env.VITE_APP_LINK || process.env.VITE_BOT_LINK || '').trim();
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  try {
    const { data, error } = await db()
      .from('players')
      .select('*')
      .eq('remind_on', true)
      .lt('last_collect', iso(now - 8 * 3600 * 1000))
      .gt('last_collect', iso(now - 3 * 86400 * 1000))
      .lt('remind_last', iso(now - 20 * 3600 * 1000))
      .order('last_collect', { ascending: false })
      .limit(300);
    if (error) throw new HttpError(409, 'Run supabase/migration_v6.sql first');
    let sent = 0, skipped = 0, blocked = 0;
    for (const row of (data || []) as Player[]) {
      const p = settle(row, now);
      const why = reminderReason(p, now);
      if (!why) {
        skipped++;
        continue;
      }
      const body: any = {
        chat_id: row.tg_id,
        text: `${TEXT[why]}\n\nYou can turn these reminders off in Profile → Reminders.`,
      };
      if (link) body.reply_markup = { inline_keyboard: [[{ text: '📦 Open BoxBlast', url: link }]] };
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j: any = await r.json().catch(() => ({}));
      if (j?.ok) {
        sent++;
        await db().from('players').update({ remind_last: iso(now) }).eq('tg_id', row.tg_id);
      } else if (r.status === 403 || r.status === 400) {
        blocked++; // the player never started the bot or blocked it: stop trying
        await db().from('players').update({ remind_on: false }).eq('tg_id', row.tg_id);
      }
      await sleep(50); // Telegram allows about 30 messages a second
    }
    return res.status(200).json({ ok: true, checked: (data || []).length, sent, skipped, blocked });
  } catch (e: any) {
    console.error(e);
    return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 160) });
  }
}
