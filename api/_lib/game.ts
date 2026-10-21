import { randomInt } from 'node:crypto';
import {
  AD, BOOSTS, BOOST_MAX, CARDS, CARD_MAX, DAILY, ENERGY_BASE, ENERGY_STEP, MAX_OFFLINE_S,
  MAX_TAPS_PER_S, REGEN_BASE, REGEN_STEP, TASKS, boostCost, cardCost, type BoostKind,
} from './config.js';
import { HttpError, type Player } from './db.js';

const iso = (ms: number) => new Date(ms).toISOString();
export const day = (ms: number) => iso(ms).slice(0, 10);

export const maxEnergy = (p: Player) => ENERGY_BASE + (p.energy_level - 1) * ENERGY_STEP;
export const regenRate = (p: Player) => REGEN_BASE + (p.regen_level - 1) * REGEN_STEP;

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

// Brings energy regen and passive (offline) income up to date.
export function settle(p: Player, now: number): Player {
  const q = { ...p };
  const max = maxEnergy(q);
  const rate = regenRate(q);
  const dt = Math.max(0, (now - Date.parse(q.energy_updated_at)) / 1000);
  if (q.energy >= max) {
    q.energy = max;
    q.energy_updated_at = iso(now);
  } else {
    const add = Math.floor(dt * rate);
    if (add > 0) {
      q.energy = Math.min(max, q.energy + add);
      const leftoverMs = ((dt * rate - add) / rate) * 1000;
      q.energy_updated_at = iso(q.energy >= max ? now : now - leftoverMs);
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

export function blast(p: Player, list: { perfect?: boolean }[], now: number) {
  const elapsed = Math.min(30, Math.max(0, (now - Date.parse(p.last_sync_at)) / 1000));
  const rateCap = Math.floor(elapsed * MAX_TAPS_PER_S) + 8;
  const n = Math.min(list.length, p.energy, rateCap);
  let gain = 0;
  for (let i = 0; i < n; i++) {
    const gold = randomInt(100) < 12;
    const base = gold ? 15 : 1 + randomInt(9);
    gain += base + (list[i]?.perfect ? 2 : 0) + (p.tap_level - 1) * 2;
  }
  p.energy -= n;
  earn(p, gain);
  p.last_sync_at = iso(now);
  return { player: p, result: { counted: n, gained: gain } };
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

export function claimDaily(p: Player, now: number) {
  const today = day(now);
  if (p.last_daily === today) throw new HttpError(409, 'Already claimed today');
  const prev = p.last_daily === day(now - 86400000) ? p.streak : 0;
  const reward = DAILY[prev % 7];
  p.streak = prev + 1;
  p.last_daily = today;
  earn(p, reward);
  return { player: p, result: { reward } };
}

export function claimTask(p: Player, id: string, now: number) {
  const t = TASKS.find((x) => x.id === id);
  if (!t) throw new HttpError(400, 'Unknown task');
  if (p.claimed[id]) throw new HttpError(409, 'Already claimed');
  if (t.kind === 'refs' && p.ref_count < t.target) throw new HttpError(409, 'Not completed yet');
  if (t.kind === 'earn' && p.total_earned < t.target) throw new HttpError(409, 'Not completed yet');
  p.claimed = { ...p.claimed, [id]: now };
  earn(p, t.reward);
  return { player: p, result: { reward: t.reward } };
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

export function grantAd(p: Player, kind: string, now: number) {
  checkAdAllowed(p, now);
  const l = adLimits(p, now);
  p.ads_date = day(now);
  p.ads_today = l.used + 1;
  p.last_ad_at = iso(now);
  if (kind === 'energy') p.energy = maxEnergy(p);
  else earn(p, AD.reward);
  return { player: p };
}

export function taskList(p: Player, channelUrl: string | null) {
  return TASKS.filter((t) => t.kind !== 'channel' || channelUrl).map((t) => ({
    id: t.id,
    title: t.title,
    reward: t.reward,
    kind: t.kind,
    target: t.target,
    progress: t.kind === 'refs' ? p.ref_count : t.kind === 'earn' ? p.total_earned : 0,
    claimed: !!p.claimed[t.id],
    url: t.kind === 'channel' ? channelUrl : null,
  }));
}

export function view(p: Player, now: number) {
  const today = day(now);
  const claimedToday = p.last_daily === today;
  const alive = claimedToday || p.last_daily === day(now - 86400000);
  const eff = alive ? p.streak : 0;
  const ch = (process.env.CHANNEL_USERNAME || '').replace('@', '');
  const l = adLimits(p, now);
  const lvlOf = (k: BoostKind) => (k === 'tap' ? p.tap_level : k === 'energy' ? p.energy_level : p.regen_level);
  return {
    id: p.tg_id,
    name: p.first_name,
    coins: p.coins,
    totalEarned: p.total_earned,
    energy: p.energy,
    maxEnergy: maxEnergy(p),
    regen: regenRate(p),
    pph: p.pph,
    tapLevel: p.tap_level,
    boosts: (Object.keys(BOOSTS) as BoostKind[]).map((k) => ({
      id: k,
      name: BOOSTS[k].name,
      desc: BOOSTS[k].desc,
      level: lvlOf(k),
      cost: boostCost(k, lvlOf(k)),
      max: BOOST_MAX,
    })),
    cards: CARDS.map((c) => {
      const level = p.cards[c.id] || 0;
      return { id: c.id, name: c.name, desc: c.desc, level, pph: c.pph, cost: cardCost(c, level), max: CARD_MAX };
    }),
    daily: {
      rewards: DAILY,
      claimedToday,
      filled: claimedToday ? ((eff - 1) % 7) + 1 : eff % 7,
    },
    ads: { left: l.left, nextAt: l.nextAt, reward: AD.reward },
    refCount: p.ref_count,
    refReward: { inviter: 2500, invitee: 1000 },
    tasks: taskList(p, ch ? `https://t.me/${ch}` : null),
    now,
  };
}
