import { createClient } from '@supabase/supabase-js';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let client: any;
export const db = (): any => {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new HttpError(500, 'Supabase env vars missing');
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
};

export type Player = {
  tg_id: number;
  first_name: string | null;
  username: string | null;
  coins: number;
  total_earned: number;
  energy: number;
  energy_updated_at: string;
  tap_level: number;
  energy_level: number;
  regen_level: number;
  pph: number;
  last_collect: string;
  cards: Record<string, number>;
  claimed: Record<string, number>;
  streak: number;
  last_daily: string | null;
  referred_by: number | null;
  ref_count: number;
  ads_date: string | null;
  ads_today: number;
  last_ad_at: string | null;
  last_sync_at: string;
  skin: string;
  total_blasts: number;
  version: number;
};

const WRITABLE = [
  'first_name', 'username', 'coins', 'total_earned', 'energy', 'energy_updated_at', 'tap_level',
  'energy_level', 'regen_level', 'pph', 'last_collect', 'cards', 'claimed', 'streak', 'last_daily',
  'ref_count', 'ads_date', 'ads_today', 'last_ad_at', 'last_sync_at', 'skin', 'total_blasts',
] as const;

export async function getPlayer(id: number): Promise<Player | null> {
  const { data, error } = await db().from('players').select('*').eq('tg_id', id).maybeSingle();
  if (error) throw error;
  return data as Player | null;
}

// Optimistic-concurrency update: retries if another request changed the row in between.
export async function mutate<R = void>(
  id: number,
  fn: (p: Player) => { player: Player; result?: R }
): Promise<{ player: Player; result: R }> {
  for (let i = 0; i < 6; i++) {
    const current = await getPlayer(id);
    if (!current) throw new HttpError(404, 'Player not found');
    const out = fn(structuredClone(current));
    const patch: Record<string, unknown> = {};
    for (const k of WRITABLE) patch[k] = (out.player as any)[k];
    patch.version = current.version + 1;
    const { data, error } = await db()
      .from('players')
      .update(patch)
      .eq('tg_id', id)
      .eq('version', current.version)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return { player: data as Player, result: out.result as R };
  }
  throw new HttpError(409, 'Busy, please try again');
}
