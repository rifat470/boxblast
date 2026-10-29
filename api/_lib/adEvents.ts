import { db } from './db.js';

/**
 * Stores "the ad network says this player finished an ad".
 * If the player's phone already claimed the same ad with a signed ticket (client proof) a moment ago, the reward was
 * already paid: the ticket claim is marked as paired and this event is stored as already used, so ONE ad never pays TWICE.
 */
export async function recordAdEvent(id: number, network: string, ymid?: string | null): Promise<{ error: any }> {
  const since = new Date(Date.now() - 180000).toISOString();
  const { data } = await db()
    .from('ad_events')
    .select('id,ymid')
    .eq('tg_id', id)
    .eq('network', network)
    .eq('claimed', true)
    .gte('created_at', since)
    .order('id', { ascending: false })
    .limit(8);
  const ticket = (data || []).find((r: any) => String(r.ymid || '').startsWith('a'));
  if (ticket) {
    await db().from('ad_events').update({ ymid: 'm' + String(ticket.ymid).slice(1) }).eq('id', ticket.id);
    const { error } = await db().from('ad_events').insert({ tg_id: id, network, ymid: ymid || null, claimed: true });
    return { error };
  }
  const { error } = await db().from('ad_events').insert({ tg_id: id, network, ymid: ymid || null });
  return { error };
}
