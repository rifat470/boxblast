// OPTIONAL Telegram bot webhook. It makes old-style invite links (https://t.me/BOT?start=ref_123) work too:
// the bot replies with a button that opens the Mini App with the invite code attached.
// Setup (once):  https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://YOUR-APP.vercel.app/api/bot&secret_token=<WEBHOOK_SECRET>
// Needs env: BOT_TOKEN, WEBHOOK_SECRET, VITE_APP_LINK (e.g. https://t.me/BoxBlastGame_bot/app)
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || req.headers['x-telegram-bot-api-secret-token'] !== secret) return res.status(403).json({ ok: false });
  try {
    const msg = req.body?.message;
    const text: string = String(msg?.text || '');
    const token = process.env.BOT_TOKEN;
    const app = String(process.env.VITE_APP_LINK || '').replace(/\/+$/, '');
    if (msg?.chat?.id && token && app && text.startsWith('/start')) {
      const m = /^\/start\s+(ref_\d{3,15})$/.exec(text.trim());
      const url = m ? `${app}?startapp=${m[1]}` : app;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: msg.chat.id,
          text: 'Welcome to BoxBlast! Find the hidden box, blast it and collect rare gems.',
          reply_markup: { inline_keyboard: [[{ text: '📦 Play BoxBlast', url }]] },
        }),
      });
    }
  } catch (e) {
    console.error(e);
  }
  return res.status(200).json({ ok: true });
}
