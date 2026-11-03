// Ads: Adsgram (block 55501) and Monetag (zone 12108818).
// An ad is ONLY started by an explicit tap. The reward is NEVER granted here: the app server pays only after the
// ad network's own server confirmation (Adsgram reward URL, Monetag postback) or the signed ticket.
const env = (import.meta as any).env || {};
const ADSGRAM_BLOCK: string = String(env.VITE_ADSGRAM_BLOCK_ID || '55501').replace(/\D/g, '');
const MONETAG_ZONE: string = String(env.VITE_MONETAG_ZONE_ID || '12108818').replace(/\D/g, '');
const START_TIMEOUT_MS = 5000; // if a network cannot start its ad within 5 seconds, we move on

export type Net = 'adsgram' | 'monetag';
export type AdStatus = 'ok' | 'noad' | 'skipped' | 'unavailable';
export type AdResult = { status: AdStatus; network: Net };

const w = window as any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | 'timeout'> =>
  Promise.race([p, sleep(ms).then(() => 'timeout' as const)]);

// ---------- Adsgram ----------
let adsgram: any;
async function showAdsgram(): Promise<AdStatus> {
  if (!adsgram && w.Adsgram && ADSGRAM_BLOCK) adsgram = w.Adsgram.init({ blockId: ADSGRAM_BLOCK });
  if (!adsgram) return 'unavailable';
  try {
    const r = await adsgram.show();
    return r && r.done === false ? 'skipped' : 'ok';
  } catch (e: any) {
    return /no.?ad|not found|no banner/i.test(String(e?.description || '')) ? 'noad' : 'skipped';
  }
}

// ---------- Monetag ----------
// The ad is preloaded first. If it is not ready within 5 seconds (or the feed is empty) we report 'noad'.
const makeYmid = (tag = '') => {
  const id = w.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0;
  return `${id}_${tag}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
};
async function showMonetag(placement: string): Promise<AdStatus> {
  const fn = w[`show_${MONETAG_ZONE}`];
  if (typeof fn !== 'function') return 'unavailable';
  const ymid = makeYmid();
  try {
    const pre = await withTimeout(fn({ type: 'preload', ymid, requestVar: placement }), START_TIMEOUT_MS);
    if (pre === 'timeout') return 'noad';
  } catch {
    return 'noad';
  }
  try {
    const r: any = await fn({ ymid, requestVar: placement });
    // A closed-early ad resolves too: only a paid ("valued") view counts, and the server double-checks it.
    return r && r.reward_event_type && r.reward_event_type !== 'valued' ? 'skipped' : 'ok';
  } catch {
    return 'skipped';
  }
}

// Safety net: no matter what an ad network does, the app is never stuck waiting longer than this.
const WATCHDOG_MS = 4 * 60 * 1000;

async function run(net: Net, placement: string): Promise<AdStatus> {
  const job = net === 'adsgram' ? showAdsgram() : showMonetag(placement);
  const r = await withTimeout(job, WATCHDOG_MS);
  return r === 'timeout' ? 'skipped' : r;
}

/**
 * Shows an ad from the first network in `order`. If that network has no ad within 5 seconds (or none at all),
 * the next network in the list is tried. A skipped (closed early) ad is never replaced by another ad.
 */
export async function watchAd(order: Net[], placement: string): Promise<AdResult> {
  let last: AdResult = { status: 'unavailable', network: order[0] };
  for (const net of order) {
    const status = await run(net, placement);
    last = { status, network: net };
    if (status === 'ok' || status === 'skipped') return last;
  }
  return last;
}

