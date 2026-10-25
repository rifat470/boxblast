// Game economy + rules. Everything here is enforced on the server.
export const ENERGY_BASE = 500;
export const ENERGY_STEP = 100; // per energy-tank level
export const REGEN_EVERY_S = 5; // energy comes back in steps, one step every 5 seconds
export const LEVEL_ENERGY = 50; // extra max energy for every level above 1
export const MAX_OFFLINE_S = 3 * 3600; // passive income collects up to 3h while away
export const MAX_TAPS_PER_S = 12;
export const BOOST_MAX = 20;
export const CARD_MAX = 30;

export type Card = { id: string; name: string; desc: string; baseCost: number; pph: number };
export const CARDS: Card[] = [
  { id: 'forklift', name: 'Forklift', desc: 'Moves crates all day', baseCost: 300, pph: 20 },
  { id: 'conveyor', name: 'Conveyor belt', desc: 'Keeps boxes flowing', baseCost: 800, pph: 50 },
  { id: 'scanner', name: 'Barcode scanner', desc: 'No more lost parcels', baseCost: 2000, pph: 120 },
  { id: 'drone', name: 'Delivery drone', desc: 'Last-mile speed', baseCost: 5000, pph: 300 },
  { id: 'sorter', name: 'Auto-sorter', desc: 'Sorts 1000 boxes an hour', baseCost: 12000, pph: 700 },
  { id: 'depot', name: 'Local depot', desc: 'A base for your crews', baseCost: 30000, pph: 1600 },
  { id: 'hub', name: 'Regional hub', desc: 'Connects whole cities', baseCost: 80000, pph: 4000 },
  { id: 'freight', name: 'Air freight', desc: 'Overnight, anywhere', baseCost: 200000, pph: 9000 },
];
export const cardCost = (c: Card, level: number) => Math.floor(c.baseCost * Math.pow(1.45, level));

export const BOOSTS = {
  tap: { name: 'Blast power', desc: '+2 coins on every blast', base: 500 },
  energy: { name: 'Energy tank', desc: '+100 max energy', base: 300 },
  regen: { name: 'Recharge speed', desc: '+1 energy every 5 seconds', base: 400 },
} as const;
export type BoostKind = keyof typeof BOOSTS;
export const boostCost = (k: BoostKind, level: number) => Math.floor(BOOSTS[k].base * Math.pow(1.9, level - 1));

export const DAILY = [100, 200, 300, 500, 800, 1200, 2000];
export const REF = { inviter: 2500, invitee: 1000 };

// Optional rewarded ads. Always the player's choice, never required.
export const AD = { reward: 5000, perDay: 30, cooldownS: 35, confirmWindowS: 300 };

// Offline earnings: when a player was away longer than afterS, the income waits in a pool.
// Claim = 50% for free, or 100% after one optional ad.
export const OFFLINE = { afterS: 600, freeRatio: 0.5 };
// Turbo Blast: one optional ad = 60 seconds with x3 coins per hit and no energy cost.
export const TURBO = { seconds: 60, mult: 3 };

// ---- Daily Tasks: three optional ads per day. Each row has its own ad network and its own reward. ----
export type DailyTaskDef = { slot: number; network: 'adsgram' | 'monetag' | 'tads'; coins: number; energy: boolean; gem: string | null };
export const DAILY_TASKS: DailyTaskDef[] = [
  { slot: 1, network: 'adsgram', coins: 400, energy: false, gem: null },
  { slot: 2, network: 'monetag', coins: 800, energy: true, gem: null },
  { slot: 3, network: 'tads', coins: 1500, energy: false, gem: null },
];
// Finish all three rows in one day and a bonus gem is added to the collection.
export const DAILY_TASKS_BONUS = { coins: 2000, gem: 'white' };
// After a Daily Task ad is finished the row waits this long before it can be watched again.
export const DAILY_TASK_COOLDOWN_S = 3 * 3600;
// The special "Bonus coins" ad (Earn tab). Adjust perDay if you want it more often.
export const BONUS_AD = { coins: 5000, gem: 'blue', perDay: 1 };
export const AD_NETWORKS = ['adsgram', 'monetag', 'tads'] as const;

// ---- Gems: in-game collectibles with NO cash value. ----
export type GemDef = { id: string; name: string; rank: number };
export const GEMS: GemDef[] = [
  { id: 'white', name: 'Moonstone', rank: 1 },
  { id: 'black', name: 'Radiant Onyx', rank: 2 },
  { id: 'silver', name: 'Silver Star', rank: 3 },
  { id: 'red', name: 'Royal Ruby', rank: 4 },
  { id: 'blue', name: 'Sapphire', rank: 5 },
  { id: 'diamond', name: 'Eternal Diamond', rank: 6 },
];
// Daily optional-ad gems: total ads watched today -> gem.
export const AD_GEMS: Record<number, string> = { 5: 'blue', 10: 'diamond' };

// ---- Referral ladder (1..100 friends). Claim keys ref1/ref3/ref10 are the same as in older versions. ----
export type RefStep = { id: string; at: number; coins: number; gem: string | null };
export const REF_STEPS: RefStep[] = [
  { id: 'ref1', at: 1, coins: 1000, gem: null },
  { id: 'ref3', at: 3, coins: 3000, gem: null },
  { id: 'ref5', at: 5, coins: 6000, gem: null },
  { id: 'ref10', at: 10, coins: 10000, gem: 'white' },
  { id: 'ref20', at: 20, coins: 25000, gem: 'black' },
  { id: 'ref30', at: 30, coins: 45000, gem: 'silver' },
  { id: 'ref50', at: 50, coins: 100000, gem: 'red' },
  { id: 'ref70', at: 70, coins: 160000, gem: 'blue' },
  { id: 'ref100', at: 100, coins: 300000, gem: 'diamond' },
];

export type TaskDef = {
  id: string; title: string; reward: number; kind: 'channel' | 'earn' | 'blasts' | 'level'; target: number;
};
export const TASKS: TaskDef[] = [
  { id: 'channel', title: 'Join the BoxBlast channel', reward: 1500, kind: 'channel', target: 1 },
  { id: 'blast100', title: 'Blast 100 boxes', reward: 1000, kind: 'blasts', target: 100 },
  { id: 'blast1000', title: 'Blast 1,000 boxes', reward: 4000, kind: 'blasts', target: 1000 },
  { id: 'lvl3', title: 'Reach level 3', reward: 2000, kind: 'level', target: 3 },
  { id: 'lvl5', title: 'Reach level 5', reward: 6000, kind: 'level', target: 5 },
  { id: 'earn10k', title: 'Earn 10,000 coins in total', reward: 1000, kind: 'earn', target: 10000 },
  { id: 'earn100k', title: 'Earn 100,000 coins in total', reward: 5000, kind: 'earn', target: 100000 },
];

// ---- Levels: derived from total_earned, so they can never be lost or reset. ----
export type LevelDef = { lvl: number; name: string; at: number; reward: number };
export const LEVELS: LevelDef[] = [
  { lvl: 1, name: 'Rookie', at: 0, reward: 0 },
  { lvl: 2, name: 'Novice', at: 2000, reward: 1000 },
  { lvl: 3, name: 'Adept', at: 10000, reward: 3000 },
  { lvl: 4, name: 'Skilled', at: 40000, reward: 8000 },
  { lvl: 5, name: 'Elite', at: 120000, reward: 20000 },
  { lvl: 6, name: 'Veteran', at: 350000, reward: 50000 },
  { lvl: 7, name: 'Master', at: 1000000, reward: 120000 },
  { lvl: 8, name: 'Champion', at: 3000000, reward: 300000 },
  { lvl: 9, name: 'Legend', at: 8000000, reward: 700000 },
  { lvl: 10, name: 'Boss', at: 20000000, reward: 1500000 },
];
export const levelOf = (totalEarned: number): LevelDef => {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (totalEarned >= l.at) cur = l;
  return cur;
};

// ---- Box designs: one per level (lv1..lv10). Locked until the level is really reached. ----
export const SKINS = LEVELS.map((l) => ({ id: `lv${l.lvl}`, name: l.name, level: l.lvl }));
