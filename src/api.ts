export type Boost = { id: string; name: string; desc: string; level: number; cost: number; max: number };
export type CardT = { id: string; name: string; desc: string; level: number; pph: number; cost: number; max: number };
export type TaskT = {
  id: string; title: string; reward: number; kind: string; target: number;
  progress: number; claimed: boolean; url: string | null;
};
export type State = {
  id: number; name: string; coins: number; totalEarned: number; energy: number; maxEnergy: number;
  regen: number; pph: number; tapLevel: number; boosts: Boost[]; cards: CardT[];
  daily: { rewards: number[]; claimedToday: boolean; filled: number };
  ads: { left: number; nextAt: number; reward: number };
  refCount: number; refReward: { inviter: number; invitee: number };
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
