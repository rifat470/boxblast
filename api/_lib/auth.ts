import { createHmac, timingSafeEqual } from 'node:crypto';

export type TgUser = { id: number; first_name?: string; username?: string };

// Validates Telegram Mini App initData (HMAC-SHA256 with the bot token).
export function verifyInitData(raw: string, botToken: string, maxAgeS = 86400) {
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const check = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = createHmac('sha256', secret).update(check).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== calc.length || !timingSafeEqual(given, calc)) return null;
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeS) return null;
  const userJson = params.get('user');
  if (!userJson) return null;
  const user = JSON.parse(userJson) as TgUser;
  if (!user?.id) return null;
  return { user, startParam: params.get('start_param') || '' };
}
