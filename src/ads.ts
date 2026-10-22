// Adsgram rewarded ads. Only ever started by an explicit tap on a "Watch ad" button.
// The reward itself is NEVER granted here: the server pays only after Adsgram's own server confirmation.
const BLOCK_ID: string = String((import.meta as any).env?.VITE_ADSGRAM_BLOCK_ID || '').replace(/\D/g, '');
let controller: any;

export type AdResult = 'ok' | 'noad' | 'skipped' | 'unavailable';

export async function watchAd(): Promise<AdResult> {
  const w = window as any;
  if (!controller && w.Adsgram && BLOCK_ID) controller = w.Adsgram.init({ blockId: BLOCK_ID });
  if (!controller) return 'unavailable';
  try {
    const r = await controller.show();
    return r && r.done === false ? 'skipped' : 'ok';
  } catch (e: any) {
    return /no.?ad|not found|no banner/i.test(String(e?.description || '')) ? 'noad' : 'skipped';
  }
}
