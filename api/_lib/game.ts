import { randomBytes, randomInt } from 'node:crypto';
import {
  AD, AD_GEMS, BOOSTS, BOOST_MAX, CARDS, CARD_MAX, DAILY, ENERGY_BASE, ENERGY_STEP, GEMS, MAX_OFFLINE_S,
  MAX_TAPS_PER_S, REGEN_EVERY_S, REF_STEPS, TASKS, boostCost, cardCost, type BoostKind,
  LEVELS, LEVEL_ENERGY, REF, SKINS, levelOf, DAILY_TASKS, DAILY_TASKS_BONUS, OFFLINE, TURBO, DAILY_TASK_COOLDOWN_S, MATCH, BONUS_AD,
} from './config.js';
import { HttpError, type Player } from './db.js';
import { GEM_IDS, goalsMet, levelInfo, newRound, trySwap } from './matchEngine.js';

const iso = (ms: number) => new Date(ms).toISOString();
export const day = (ms: number) => iso(ms).slice(0, 10);

export const maxEnergy = (p: Player) =>
  ENERGY_BASE + (p.energy_level - 1) * ENERGY_STEP + (levelOf(p.total_earned).lvl - 1) * LEVEL_ENERGY;
// Energy that comes back every REGEN_EVERY_S seconds (grows with the Recharge speed boost).
export const regenPerTick = (p: Player) => p.regen_level;

export function newPlayer(user: { id: number; first_name?: string; username?: string }, now: number) {
  return {
    tg_id: user.id,
    first_name: (user.first_name || 'Player').slice(0, 40),
    username: user.username ? user.username.slice(0, 40) : null,
    coins: 0,
    total_earned: 0,
    energy: ENERGY_BASE,
    energy_updated_at: iso(now),
    last_collect: iso(now),
    last_sync_at: iso(now),
  };
}

// Brings energy regen (one step every 5 s) and passive (offline) income up to date.
export function settle(p: Player, now: number): Player {
  const q = { ...p, gems: { ...(p.gems || {}) } };
  const max = maxEnergy(q);
  const stepMs = REGEN_EVERY_S * 1000;
  if (q.energy >= max) {
    q.energy = max;
    q.energy_updated_at = iso(now);
  } else {
    const ticks = Math.floor(Math.max(0, now - Date.parse(q.energy_updated_at)) / stepMs);
    if (ticks > 0) {
      q.energy = Math.min(max, q.energy + ticks * regenPerTick(q));
      q.energy_updated_at = iso(q.energy >= max ? now : Date.parse(q.energy_updated_at) + ticks * stepMs);
    }
  }
  const dtc = Math.max(0, (now - Date.parse(q.last_collect)) / 1000);
  const gain = Math.floor((q.pph * Math.min(dtc, MAX_OFFLINE_S)) / 3600);
  if (gain > 0 || dtc > MAX_OFFLINE_S || q.pph === 0) {
    if (dtc > OFFLINE.afterS && gain > 0) {
      // The player was away: the income waits in the offline pool until it is claimed (50% free, 100% with one optional ad).
      const cap = Math.floor((q.pph * MAX_OFFLINE_S) / 3600);
      q.claimed = { ...q.claimed, pend: Math.min(cap, Number(q.claimed?.pend || 0) + gain) };
    } else {
      q.coins += gain;
      q.total_earned += gain;
    }
    q.last_collect = iso(now);
  }
  return q;
}

const earn = (p: Player, n: number) => {
  p.coins += n;
  p.total_earned += n;
};

const addGem = (p: Player, id: string, n = 1) => {
  if (!GEMS.some((g) => g.id === id)) return;
  p.gems = { ...(p.gems || {}), [id]: ((p.gems || {})[id] || 0) + n };
};

// EVERY tap costs 1 energy (hit or miss). Only hits earn coins. The server decides the coin amount.
export function blast(p: Player, list: { hit?: boolean; perfect?: boolean }[], now: number) {
  const elapsed = Math.min(30, Math.max(0, (now - Date.parse(p.last_sync_at)) / 1000));
  const rateCap = Math.floor(elapsed * MAX_TAPS_PER_S) + 12;
  const turbo = Number(p.claimed?.turbo || 0) > Date.parse(p.last_sync_at);
  const n = Math.min(list.length, turbo ? Infinity : p.energy, rateCap);
  const taps = list.slice(0, n);
  // A player cannot hit more often than is humanly plausible in a 9-crate game.
  const hitCap = Math.floor(n * 0.7) + 2;
  let hits = 0;
  let gain = 0;
  for (const t of taps) {
    if (!t.hit || hits >= hitCap) continue;
    hits++;
    const gold = randomInt(100) < 15;
    const base = gold ? 20 : 2 + randomInt(9);
    gain += (base + (t.perfect ? 3 : 0) + (p.tap_level - 1) * 2) * (turbo ? TURBO.mult : 1);
  }
  if (!turbo) p.energy -= n; // Turbo Blast: taps are free
  p.total_blasts = (p.total_blasts || 0) + hits;
  earn(p, gain);
  p.last_sync_at = iso(now);
  return { player: p, result: { taps: n, hits, gained: gain } };
}

export function buyCard(p: Player, id: string) {
  const card = CARDS.find((c) => c.id === id);
  if (!card) throw new HttpError(400, 'Unknown upgrade');
  const lvl = p.cards[id] || 0;
  if (lvl >= CARD_MAX) throw new HttpError(409, 'Max level reached');
  const cost = cardCost(card, lvl);
  if (p.coins < cost) throw new HttpError(409, 'Not enough coins');
  p.coins -= cost;
  p.cards = { ...p.cards, [id]: lvl + 1 };
  p.pph = CARDS.reduce((s, c) => s + c.pph * (p.cards[c.id] || 0), 0);
  return { player: p };
}

export function buyBoost(p: Player, kind: string) {
  if (!(kind in BOOSTS)) throw new HttpError(400, 'Unknown boost');
  const k = kind as BoostKind;
  const key = (k === 'tap' ? 'tap_level' : k === 'energy' ? 'energy_level' : 'regen_level') as
    | 'tap_level' | 'energy_level' | 'regen_level';
  const lvl = p[key];
  if (lvl >= BOOST_MAX) throw new HttpError(409, 'Max level reached');
  const cost = boostCost(k, lvl);
  if (p.coins < cost) throw new HttpError(409, 'Not enough coins');
  p.coins -= cost;
  p[key] = lvl + 1;
  return { player: p };
}

export function dailyInfo(p: Player, now: number) {
  const today = day(now);
  const claimedToday = p.last_daily === today;
  const alive = claimedToday || p.last_daily === day(now - 86400000);
  const eff = alive ? p.streak : 0;
  return { claimedToday, eff, next: DAILY[(claimedToday ? eff : eff) % 7] };
}

export function claimDaily(p: Player, now: number, double = false) {
  const today = day(now);
  if (p.last_daily === today) throw new HttpError(409, 'Already claimed today');
  const prev = p.last_daily === day(now - 86400000) ? p.streak : 0;
  const base = DAILY[prev % 7];
  const reward = double ? base * 2 : base;
  p.streak = prev + 1;
  p.last_daily = today;
  earn(p, reward);
  const gem = double ? registerAd(p, now) : null;
  return { player: p, result: { reward, doubled: double, gem } };
}

export function claimTask(p: Player, id: string, now: number) {
  const t = TASKS.find((x) => x.id === id);
  if (!t) throw new HttpError(400, 'Unknown task');
  if (p.claimed[id]) throw new HttpError(409, 'Already claimed');
  // The channel task is verified by the server against Telegram before this function is called.
  if (t.kind !== 'channel' && taskProgress(p, t.kind) < t.target) throw new HttpError(409, 'Not completed yet');
  p.claimed = { ...p.claimed, [id]: now };
  earn(p, t.reward);
  return { player: p, result: { reward: t.reward } };
}

function taskProgress(p: Player, kind: string) {
  if (kind === 'earn') return p.total_earned;
  if (kind === 'blasts') return p.total_blasts || 0;
  if (kind === 'level') return levelOf(p.total_earned).lvl;
  return 0;
}

// Referral ladder: coins + gem are credited to the account the moment the player claims a step.
export function claimRef(p: Player, id: string, now: number) {
  const st = REF_STEPS.find((x) => x.id === id);
  if (!st) throw new HttpError(400, 'Unknown referral reward');
  if (p.claimed[id]) throw new HttpError(409, 'Already claimed');
  if (p.ref_count < st.at) throw new HttpError(409, `Invite ${st.at} friends to unlock this`);
  p.claimed = { ...p.claimed, [id]: now };
  earn(p, st.coins);
  if (st.gem) addGem(p, st.gem);
  return { player: p, result: { reward: st.coins, gem: st.gem } };
}

export function claimLevel(p: Player, lvl: number, now: number, double = false) {
  const L = LEVELS.find((x) => x.lvl === lvl);
  if (!L || L.lvl < 2) throw new HttpError(400, 'Unknown level');
  if (levelOf(p.total_earned).lvl < L.lvl) throw new HttpError(409, 'Level not reached yet');
  const key = `lvl_${L.lvl}`;
  if (p.claimed[key]) throw new HttpError(409, 'Already claimed');
  const adGem = double ? registerAd(p, now) : null;
  const reward = L.reward * (double ? 2 : 1);
  p.claimed = { ...p.claimed, [key]: now };
  earn(p, reward);
  return { player: p, result: { reward, doubled: double, gem: adGem } };
}

// Offline pool: 50% for free, 100% after one optional ad.
export function claimOffline(p: Player, double: boolean, now: number) {
  const pend = Math.floor(Number(p.claimed?.pend || 0));
  if (pend <= 0) throw new HttpError(409, 'Nothing to claim');
  const adGem = double ? registerAd(p, now) : null;
  const reward = double ? pend : Math.floor(pend * OFFLINE.freeRatio);
  p.claimed = { ...p.claimed, pend: 0 };
  earn(p, reward);
  return { player: p, result: { reward, full: pend, doubled: double, gem: adGem } };
}

export function grantTurbo(p: Player, now: number) {
  checkAdAllowed(p, now);
  const gem = registerAd(p, now);
  const cur = Number(p.claimed?.turbo || 0);
  p.claimed = { ...p.claimed, turbo: Math.max(now, cur) + TURBO.seconds * 1000 };
  return { player: p, result: { gem, until: p.claimed.turbo } };
}

export function setSkin(p: Player, id: string) {
  const sk = SKINS.find((x) => x.id === id);
  if (!sk) throw new HttpError(400, 'Unknown box design');
  if (levelOf(p.total_earned).lvl < sk.level) throw new HttpError(409, `Unlocks at level ${sk.level}`);
  p.skin = sk.id;
  return { player: p };
}

export function adLimits(p: Player, now: number) {
  const today = day(now);
  const used = p.ads_date === today ? p.ads_today : 0;
  const nextAt = (p.last_ad_at ? Date.parse(p.last_ad_at) : 0) + AD.cooldownS * 1000;
  return { used, left: Math.max(0, AD.perDay - used), nextAt };
}

export function checkAdAllowed(p: Player, now: number) {
  const l = adLimits(p, now);
  if (l.left <= 0) throw new HttpError(409, 'Daily ad limit reached. Come back tomorrow.');
  if (now < l.nextAt) throw new HttpError(409, 'Please wait a moment before the next ad.');
}

// Counts one watched ad for today and pays the daily ad gem when a milestone (5 / 10 ads) is reached.
function registerAd(p: Player, now: number): string | null {
  const l = adLimits(p, now);
  p.ads_date = day(now);
  p.ads_today = l.used + 1;
  p.last_ad_at = iso(now);
  const gem = AD_GEMS[p.ads_today] || null;
  if (gem) addGem(p, gem);
  return gem;
}

export function grantAd(p: Player, kind: string, now: number) {
  checkAdAllowed(p, now);
  const gems: string[] = [];
  if (kind === 'coins' && bonusAdLeft(p, now).left <= 0) throw new HttpError(409, 'Special bonus already collected today. Come back tomorrow.');
  const adGem = registerAd(p, now);
  if (kind === 'energy') {
    p.energy = maxEnergy(p);
  } else {
    earn(p, BONUS_AD.coins);
    addGem(p, BONUS_AD.gem);
    gems.push(BONUS_AD.gem);
    const u = bonusAdLeft(p, now).used + 1;
    p.claimed = { ...p.claimed, bonusAd: { d: day(now), n: u } };
  }
  if (adGem) gems.push(adGem);
  return { player: p, result: { gem: gems[0] || null, gems, kind, coins: kind === 'coins' ? BONUS_AD.coins : 0 } };
}

// ---- Daily Tasks: progress lives in claimed.dt = { d: 'YYYY-MM-DD', done: [slots] } and resets every UTC day ----
const dtRaw = (p: Player): any => (p.claimed?.dt && typeof p.claimed.dt === 'object' ? p.claimed.dt : {});

// Daily Tasks: each row waits 3 hours after its ad is finished. Finishing all three rows (all waiting at the same time)
// opens the "Finish all 3 tasks" chest, which can be collected once per UTC day.
export function dailyTaskState(p: Player, now: number) {
  const dt = dtRaw(p);
  const slots = dt.slots || {};
  const until: Record<number, number> = {};
  const done: number[] = [];
  for (const d of DAILY_TASKS) {
    const u = Number(slots[d.slot] || 0) + DAILY_TASK_COOLDOWN_S * 1000;
    until[d.slot] = u;
    if (u > now) done.push(d.slot);
  }
  const bonusGot = dt.bonusDay === day(now);
  return { done, until, bonusGot, ready: !!dt.ready && !bonusGot };
}

export function claimDailyTask(p: Player, slot: number, network: string, now: number) {
  const def = DAILY_TASKS.find((x) => x.slot === slot);
  if (!def) throw new HttpError(400, 'Unknown daily task');
  // The row's own network, or Adsgram when that network had no ad within 5 seconds.
  if (network !== def.network && network !== 'adsgram') throw new HttpError(400, 'Wrong ad network');
  const st = dailyTaskState(p, now);
  if (st.done.includes(slot)) throw new HttpError(409, 'This task is ready again in a few hours');
  checkAdAllowed(p, now);
  const dt = dtRaw(p);
  const slots = { ...(dt.slots || {}), [slot]: now };
  const gem = registerAd(p, now);
  earn(p, def.coins);
  if (def.energy) p.energy = maxEnergy(p);
  const allDone = DAILY_TASKS.every((d) => Number(slots[d.slot] || 0) + DAILY_TASK_COOLDOWN_S * 1000 > now);
  const ready = (!!dt.ready || allDone) && dt.bonusDay !== day(now);
  p.claimed = { ...p.claimed, dt: { slots, ready, bonusDay: dt.bonusDay || null } };
  return { player: p, result: { slot, coins: def.coins, energy: def.energy, gem, allDone } };
}

// "Finish all 3 tasks" chest. Normal claim = coins + gem. With one optional ad the coins and the gem are doubled.
export function claimDailyBonus(p: Player, double: boolean, now: number) {
  const st = dailyTaskState(p, now);
  if (st.bonusGot) throw new HttpError(409, 'Bonus already collected today');
  if (!st.ready) throw new HttpError(409, 'Finish all 3 tasks first');
  const coins = DAILY_TASKS_BONUS.coins * (double ? 2 : 1);
  const gemCount = double ? 2 : 1;
  const adGem = double ? registerAd(p, now) : null;
  earn(p, coins);
  addGem(p, DAILY_TASKS_BONUS.gem, gemCount);
  const dt = dtRaw(p);
  p.claimed = { ...p.claimed, dt: { slots: dt.slots || {}, ready: false, bonusDay: day(now) } };
  return { player: p, result: { coins, gem: DAILY_TASKS_BONUS.gem, gemCount, doubled: double, adGem } };
}

// Special "Bonus coins" ad: big coin reward + a gem, limited per day.
export function bonusAdLeft(p: Player, now: number) {
  const b: any = p.claimed?.bonusAd;
  const used = b && b.d === day(now) ? Number(b.n) || 0 : 0;
  return { used, left: Math.max(0, BONUS_AD.perDay - used) };
}

export function taskList(p: Player, channelUrl: string | null) {
  return TASKS.filter((t) => t.kind !== 'channel' || channelUrl).map((t) => ({
    id: t.id,
    title: t.title,
    reward: t.reward,
    kind: t.kind,
    target: t.target,
    progress: t.kind === 'channel' ? 0 : taskProgress(p, t.kind),
    claimed: !!p.claimed[t.id],
    url: t.kind === 'channel' ? channelUrl : null,
  }));
}

export function view(p: Player, now: number) {
  const dl = dailyInfo(p, now);
  const ch = (process.env.CHANNEL_USERNAME || '').replace('@', '');
  const l = adLimits(p, now);
  const lvlOf = (k: BoostKind) => (k === 'tap' ? p.tap_level : k === 'energy' ? p.energy_level : p.regen_level);
  const cur = levelOf(p.total_earned);
  const nxt = LEVELS.find((x) => x.lvl === cur.lvl + 1) || null;
  const skinOk = SKINS.some((x) => x.id === p.skin && x.level <= cur.lvl);
  const gems = p.gems || {};
  return {
    id: p.tg_id,
    name: p.first_name,
    level: { lvl: cur.lvl, name: cur.name, at: cur.at, next: nxt ? { lvl: nxt.lvl, name: nxt.name, at: nxt.at } : null },
    levels: LEVELS.map((x) => ({
      lvl: x.lvl, name: x.name, at: x.at, reward: x.reward,
      reached: cur.lvl >= x.lvl, claimed: x.lvl < 2 || !!p.claimed[`lvl_${x.lvl}`],
    })),
    skin: skinOk ? p.skin : `lv${cur.lvl}`,
    skins: SKINS.map((x) => ({ id: x.id, name: x.name, level: x.level, unlocked: cur.lvl >= x.level })),
    totalBlasts: p.total_blasts || 0,
    coins: p.coins,
    totalEarned: p.total_earned,
    energy: p.energy,
    maxEnergy: maxEnergy(p),
    regenEveryS: REGEN_EVERY_S,
    regenPerTick: regenPerTick(p),
    pph: p.pph,
    tapLevel: p.tap_level,
    boosts: (Object.keys(BOOSTS) as BoostKind[]).map((k) => ({
      id: k, name: BOOSTS[k].name, desc: BOOSTS[k].desc, level: lvlOf(k), cost: boostCost(k, lvlOf(k)), max: BOOST_MAX,
    })),
    cards: CARDS.map((c) => {
      const level = p.cards[c.id] || 0;
      return { id: c.id, name: c.name, desc: c.desc, level, pph: c.pph, cost: cardCost(c, level), max: CARD_MAX };
    }),
    daily: {
      rewards: DAILY,
      claimedToday: dl.claimedToday,
      filled: dl.claimedToday ? ((dl.eff - 1) % 7) + 1 : dl.eff % 7,
      next: DAILY[(dl.claimedToday ? dl.eff : dl.eff) % 7],
    },
    ads: { left: l.left, used: l.used, perDay: AD.perDay, nextAt: l.nextAt, reward: AD.reward, gemSteps: AD_GEMS },
    gems: GEMS.map((g) => ({ id: g.id, name: g.name, rank: g.rank, count: gems[g.id] || 0 })),
    offline: { pending: Math.floor(Number(p.claimed?.pend || 0)), freeRatio: OFFLINE.freeRatio },
    turbo: { until: Number(p.claimed?.turbo || 0), seconds: TURBO.seconds, mult: TURBO.mult },
    match: matchView(p, now),
    refCount: p.ref_count,
    refReward: { inviter: REF.inviter, invitee: REF.invitee },
    refSteps: REF_STEPS.map((x) => ({ ...x, claimed: !!p.claimed[x.id], reached: p.ref_count >= x.at })),
    dailyTasks: (() => {
      const st = dailyTaskState(p, now);
      return {
        done: st.done,
        bonusGot: st.bonusGot,
        bonusReady: st.ready,
        cooldownS: DAILY_TASK_COOLDOWN_S,
        rows: DAILY_TASKS.map((x) => ({ slot: x.slot, network: x.network, coins: x.coins, energy: x.energy, until: st.until[x.slot] > now ? st.until[x.slot] : 0 })),
        bonus: DAILY_TASKS_BONUS,
      };
    })(),
    bonusAd: { coins: BONUS_AD.coins, gem: BONUS_AD.gem, perDay: BONUS_AD.perDay, left: bonusAdLeft(p, now).left },
    tasks: taskList(p, ch ? `https://t.me/${ch}` : null),
    now,
  };
}

// =====================================================================================================
// MATCH (swap puzzle). The server owns the seed, hearts, extra moves and rewards, and REPLAYS every
// round with the same engine the browser uses, so a faked "I won" can never pay anything.
// State lives in claimed.m = { lvl, h, ht, r: round, w: last win, gd: gems found today }.
// =====================================================================================================
type MatchRound = { id: string; seed: number; lvl: number; t: number; extra: number; done: boolean };
const getM = (p: Player): any => ({
  lvl: 1, h: MATCH.heartsMax, ht: 0, r: null, w: null, gd: { d: '', n: 0 },
  ...(p.claimed?.m ? JSON.parse(JSON.stringify(p.claimed.m)) : {}),
});
const putM = (p: Player, m: any) => {
  p.claimed = { ...p.claimed, m };
};

/** Hearts with the 30-minute regeneration applied. */
export function heartsNow(m: any, now: number) {
  let n = Math.max(0, Math.min(MATCH.heartsMax, Number(m.h)));
  let t = Number(m.ht) || now;
  if (n >= MATCH.heartsMax) return { n: MATCH.heartsMax, t: now };
  const k = Math.floor((now - t) / (MATCH.heartRegenS * 1000));
  if (k > 0) {
    n = Math.min(MATCH.heartsMax, n + k);
    t = n >= MATCH.heartsMax ? now : t + k * MATCH.heartRegenS * 1000;
  }
  return { n, t };
}

export const matchReward = (level: number, leftover: number) =>
  MATCH.coinsBase + MATCH.coinsPerLevel * level + MATCH.coinsPerLeftover * Math.max(0, leftover);

const roundInfo = (r: MatchRound) => ({
  id: r.id,
  seed: r.seed,
  level: r.lvl,
  extra: r.extra,
  moves: levelInfo(r.lvl).moves + r.extra,
});

export function matchStart(p: Player, now: number) {
  const m = getM(p);
  const h = heartsNow(m, now);
  // An unfinished round is resumed (same board, no extra heart) for a while, so closing the app is never punished.
  if (m.r && !m.r.done && now - m.r.t < MATCH.resumeS * 1000) {
    m.h = h.n;
    m.ht = h.t;
    putM(p, m);
    return { player: p, result: { round: roundInfo(m.r), resumed: true } };
  }
  if (h.n < 1) throw new HttpError(409, 'no_hearts');
  const round: MatchRound = { id: randomBytes(6).toString('hex'), seed: randomInt(1, 2147483647), lvl: Number(m.lvl) || 1, t: now, extra: 0, done: false };
  m.h = h.n - 1;
  m.ht = h.n >= MATCH.heartsMax ? now : h.t; // the regeneration clock starts when the first heart is spent
  m.r = round;
  putM(p, m);
  return { player: p, result: { round: roundInfo(round), resumed: false } };
}

export function matchFinish(p: Player, id: string, moves: any, now: number) {
  const m = getM(p);
  const r: MatchRound | null = m.r;
  if (!r || r.id !== String(id)) throw new HttpError(409, 'This round is no longer active');
  if (r.done) throw new HttpError(409, 'This round is already finished');
  if (!Array.isArray(moves) || moves.length > 80) throw new HttpError(400, 'Invalid moves');
  if (now - r.t < moves.length * MATCH.minMoveMs) throw new HttpError(409, 'Too fast to be a real game');
  const info = levelInfo(r.lvl);
  const allowed = info.moves + r.extra;
  const s = newRound(r.seed, r.lvl, r.extra);
  for (const mv of moves) {
    if (!Array.isArray(mv) || mv.length !== 4) throw new HttpError(400, 'Invalid move');
    if (s.used >= allowed || goalsMet(s)) throw new HttpError(409, 'Move not allowed');
    const res = trySwap(s, mv[0], mv[1], mv[2], mv[3]);
    if (!res.valid) throw new HttpError(409, 'Invalid move');
  }
  const win = goalsMet(s);
  r.done = true;
  const out: any = { win, score: s.score, collected: s.collected, level: r.lvl, coins: 0, gems: [] as string[], leftover: allowed - s.used };
  if (win) {
    // Only a limited number of wins per day pay coins and gems. The level still goes up.
    const wd = m.wd && m.wd.d === day(now) ? m.wd : { d: day(now), n: 0 };
    const rewarded = wd.n < MATCH.winsPerDay;
    out.limited = !rewarded;
    if (rewarded) {
      wd.n++;
      const coins = matchReward(r.lvl, allowed - s.used);
      earn(p, coins);
      out.coins = coins;
      // gems found inside the boxes, up to a daily limit
      const gd = m.gd && m.gd.d === day(now) ? m.gd : { d: day(now), n: 0 };
      s.gems.forEach((cnt, i) => {
        for (let k = 0; k < cnt && gd.n < MATCH.gemCapPerDay; k++) {
          addGem(p, GEM_IDS[i], 1);
          out.gems.push(GEM_IDS[i]);
          gd.n++;
        }
      });
      m.gd = gd;
      m.w = { id: r.id, coins, dbl: false };
    } else {
      m.w = null;
    }
    m.wd = wd;
    m.lvl = r.lvl + 1;
    const h = heartsNow(m, now);
    m.h = Math.min(MATCH.heartsMax, h.n + 1); // a win gives the heart back
    m.ht = m.h >= MATCH.heartsMax ? now : h.t;
  }
  putM(p, { ...m, r });
  return { player: p, result: out };
}

export function matchExtra(p: Player, id: string, now: number) {
  const m = getM(p);
  const r: MatchRound | null = m.r;
  if (!r || r.id !== String(id) || r.done) throw new HttpError(409, 'No active round');
  if (r.extra >= MATCH.extraMoves * MATCH.maxExtraGrants) throw new HttpError(409, 'No more extra moves for this round');
  checkAdAllowed(p, now);
  const gem = registerAd(p, now);
  r.extra += MATCH.extraMoves;
  putM(p, { ...m, r });
  return { player: p, result: { extra: r.extra, added: MATCH.extraMoves, gem } };
}

export function matchHeart(p: Player, now: number) {
  const m = getM(p);
  const h = heartsNow(m, now);
  if (h.n >= MATCH.heartsMax) throw new HttpError(409, 'Your hearts are already full');
  checkAdAllowed(p, now);
  const gem = registerAd(p, now);
  m.h = h.n + 1;
  m.ht = m.h >= MATCH.heartsMax ? now : h.t;
  putM(p, m);
  return { player: p, result: { hearts: m.h, gem } };
}

export function matchDouble(p: Player, id: string, now: number) {
  const m = getM(p);
  if (!m.w || m.w.id !== String(id)) throw new HttpError(409, 'Nothing to double');
  if (m.w.dbl) throw new HttpError(409, 'Already doubled');
  checkAdAllowed(p, now);
  const gem = registerAd(p, now);
  earn(p, m.w.coins);
  m.w = { ...m.w, dbl: true };
  putM(p, m);
  return { player: p, result: { coins: m.w.coins, gem } };
}

export function matchView(p: Player, now: number) {
  const m = getM(p);
  const h = heartsNow(m, now);
  const r: MatchRound | null = m.r && !m.r.done ? m.r : null;
  const gd = m.gd && m.gd.d === day(now) ? m.gd : { d: day(now), n: 0 };
  return {
    level: Number(m.lvl) || 1,
    hearts: h.n,
    maxHearts: MATCH.heartsMax,
    nextHeartAt: h.n >= MATCH.heartsMax ? 0 : h.t + MATCH.heartRegenS * 1000,
    preview: levelInfo(Number(m.lvl) || 1),
    round: r && now - r.t < MATCH.resumeS * 1000 ? { id: r.id, level: r.lvl, extra: r.extra } : null,
    canDouble: m.w && !m.w.dbl ? { id: m.w.id, coins: m.w.coins } : null,
    gemsToday: gd.n,
    gemCap: MATCH.gemCapPerDay,
    extraMoves: MATCH.extraMoves,
    maxExtra: MATCH.extraMoves * MATCH.maxExtraGrants,
  };
}
