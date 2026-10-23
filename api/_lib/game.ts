import { randomInt } from 'node:crypto';
import {
  AD, AD_GEMS, BOOSTS, BOOST_MAX, CARDS, CARD_MAX, DAILY, ENERGY_BASE, ENERGY_STEP, GEMS, MAX_OFFLINE_S,
  MAX_TAPS_PER_S, REGEN_EVERY_S, REF_STEPS, TASKS, boostCost, cardCost, type BoostKind,
  LEVELS, LEVEL_ENERGY, REF, SKINS, levelOf, DAILY_TASKS, DAILY_TASKS_BONUS,
} from './config.js';
import { HttpError, type Player } from './db.js';

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
    q.coins += gain;
    q.total_earned += gain;
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
  const n = Math.min(list.length, p.energy, rateCap);
  const taps = list.slice(0, n);
  // A player cannot hit more often than is humanly plausible in a 9-crate game.
  const hitCap = Math.floor(n * 0.7) + 2;
  let hits = 0;
  let gain = 0;
  for (const t of taps) {
    if (!t.hit || hits >= hitCap) continue;
    hits++;
    const gold = randomInt(100) < 15;
    const base = gold ? 15 : 1 + randomInt(9);
    gain += base + (t.perfect ? 2 : 0) + (p.tap_level - 1) * 2;
  }
  p.energy -= n;
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
  if (taskProgress(p, t.kind) < t.target) throw new HttpError(409, 'Not completed yet');
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

export function claimLevel(p: Player, lvl: number, now: number) {
  const L = LEVELS.find((x) => x.lvl === lvl);
  if (!L || L.lvl < 2) throw new HttpError(400, 'Unknown level');
  if (levelOf(p.total_earned).lvl < L.lvl) throw new HttpError(409, 'Level not reached yet');
  const key = `lvl_${L.lvl}`;
  if (p.claimed[key]) throw new HttpError(409, 'Already claimed');
  p.claimed = { ...p.claimed, [key]: now };
  earn(p, L.reward);
  return { player: p, result: { reward: L.reward } };
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
  const gem = registerAd(p, now);
  if (kind === 'energy') p.energy = maxEnergy(p);
  else earn(p, AD.reward);
  return { player: p, result: { gem, kind } };
}

// ---- Daily Tasks: progress lives in claimed.dt = { d: 'YYYY-MM-DD', done: [slots] } and resets every UTC day ----
export function dailyTaskState(p: Player, now: number) {
  const dt: any = p.claimed?.dt;
  const done: number[] = dt && dt.d === day(now) && Array.isArray(dt.done) ? dt.done : [];
  return { done, bonusGot: !!(dt && dt.d === day(now) && dt.bonus) };
}

export function claimDailyTask(p: Player, slot: number, network: string, now: number) {
  const def = DAILY_TASKS.find((x) => x.slot === slot);
  if (!def) throw new HttpError(400, 'Unknown daily task');
  // The row's own network, or Adsgram when that network had no ad within 5 seconds.
  if (network !== def.network && network !== 'adsgram') throw new HttpError(400, 'Wrong ad network');
  const st = dailyTaskState(p, now);
  if (st.done.includes(slot)) throw new HttpError(409, 'Already completed today');
  checkAdAllowed(p, now);
  const done = [...st.done, slot].sort();
  const gem = registerAd(p, now);
  earn(p, def.coins);
  if (def.energy) p.energy = maxEnergy(p);
  let bonus = false;
  if (done.length === DAILY_TASKS.length) {
    bonus = true;
    earn(p, DAILY_TASKS_BONUS.coins);
    addGem(p, DAILY_TASKS_BONUS.gem);
  }
  p.claimed = { ...p.claimed, dt: { d: day(now), done, bonus } };
  return { player: p, result: { slot, coins: def.coins, energy: def.energy, gem, bonus, bonusCoins: bonus ? DAILY_TASKS_BONUS.coins : 0, bonusGem: bonus ? DAILY_TASKS_BONUS.gem : null } };
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
    refCount: p.ref_count,
    refReward: { inviter: REF.inviter, invitee: REF.invitee },
    refSteps: REF_STEPS.map((x) => ({ ...x, claimed: !!p.claimed[x.id], reached: p.ref_count >= x.at })),
    dailyTasks: {
      done: dailyTaskState(p, now).done,
      bonusGot: dailyTaskState(p, now).bonusGot,
      rows: DAILY_TASKS.map((x) => ({ slot: x.slot, network: x.network, coins: x.coins, energy: x.energy })),
      bonus: DAILY_TASKS_BONUS,
    },
    tasks: taskList(p, ch ? `https://t.me/${ch}` : null),
    now,
  };
}
