import { db } from './_lib/db.js';

// Open https://YOUR-APP.vercel.app/api/health in a browser to check the setup.
// Shows only true/false for env vars and ok/error for the database. No secrets are returned.
export default async function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const has = (k: string) => !!process.env[k];
  const out: Record<string, unknown> = {
    BOT_TOKEN: has('BOT_TOKEN'),
    SUPABASE_URL: has('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: has('SUPABASE_SERVICE_ROLE_KEY'),
    AD_REWARD_SECRET: has('AD_REWARD_SECRET'),
    players_table: 'skipped',
    ad_events_table: 'skipped',
  };
  try {
    if (out.SUPABASE_URL && out.SUPABASE_SERVICE_ROLE_KEY) {
      const a = await db().from('players').select('tg_id', { head: true, count: 'exact' }).limit(1);
      out.players_table = a.error ? `error ${a.error.code || ''}: ${String(a.error.message || '').slice(0, 140)}` : 'ok';
      const c = await db().from('players').select('skin,total_blasts,gems', { head: true, count: 'exact' }).limit(1);
      out.migration_v4 = c.error ? 'MISSING - run supabase/migration_v4.sql in Supabase SQL Editor' : 'ok';
      const b = await db().from('ad_events').select('id,network,ymid', { head: true, count: 'exact' }).limit(1);
      out.migration_v5 = b.error ? 'MISSING - run supabase/migration_v5.sql in Supabase SQL Editor' : 'ok';
    }
  } catch (e: any) {
    out.players_table = 'exception: ' + String(e?.message || e).slice(0, 140);
  }
  res.status(200).json(out);
}
