export type Boost = { id: string; name: string; desc: string; level: number; cost: number; max: number };
export type CardT = { id: string; name: string; desc: string; level: number; pph: number; cost: number; max: number };
export type TaskT = {
  id: string; title: string; reward: number; kind: string; target: number;
  progress: number; claimed: boolean; url: string | null;
};
export type LevelInfo = { lvl: number; name: string; at: number; reward: number; reached: boolean; claimed: boolean };
export type SkinInfo = { id: string; name: string; level: number; unlocked: boolean };
export type GemInfo = { id: string; name: string; rank: number; count: number };
export type RefStep = { id: string; at: number; coins: number; gem: string | null; claimed: boolean; reached: boolean };
export type State = {
  level: { lvl: number; name: string; at: number; next: { lvl: number; name: string; at: number } | null };
  levels: LevelInfo[]; skin: string; skins: SkinInfo[]; totalBlasts: number;
  id: number; name: string; coins: number; totalEarned: number; energy: number; maxEnergy: number;
  regenEveryS: number; regenPerTick: number; pph: number; tapLevel: number; boosts: Boost[]; cards: CardT[];
  daily: { rewards: number[]; claimedToday: boolean; filled: number; next: number };
  ads: { left: number; used: number; perDay: number; nextAt: number; reward: number; gemSteps: Record<string, string> };
  gems: GemInfo[]; refCount: number; refReward: { inviter: number; invitee: number }; refSteps: RefStep[];
  dailyTasks: { done: number[]; bonusGot: boolean; rows: { slot: number; network: 'adsgram' | 'monetag' | 'tads'; coins: number; energy: boolean }[]; bonus: { coins: number; gem: string } };
  tasks: TaskT[]; now: number; clientAt: number;
};

export const tg = (): any => (window as any).Telegram?.WebApp;
export const haptic = (k: 'light' | 'medium' = 'light') => {
  try { tg()?.HapticFeedback?.impactOccurred(k); } catch { /* ignore */ }
};

export async function call(action: string, extra: object = {}): Promise<any> {
  const r = await fetch('/api/game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'tma ' + (tg()?.initData || '') },
    body: JSON.stringify({ action, ...extra }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

export const fmt = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.floor(n).toLocaleString('en-US');
