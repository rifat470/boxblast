// Game economy + rules. Everything here is enforced on the server.
export const ENERGY_BASE = 500;
export const ENERGY_STEP = 100; // per energy level
export const REGEN_BASE = 1; // energy per second
export const REGEN_STEP = 0.5;
export const LEVEL_ENERGY = 50; // extra max energy for every level above 1
export const MAX_OFFLINE_S = 3 * 3600; // passive income collects up to 3h while away
export const MAX_TAPS_PER_S = 5;
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
  regen: { name: 'Recharge speed', desc: '+0.5 energy per second', base: 400 },
} as const;
export type BoostKind = keyof typeof BOOSTS;
export const boostCost = (k: BoostKind, level: number) => Math.floor(BOOSTS[k].base * Math.pow(1.9, level - 1));

export const DAILY = [100, 200, 300, 500, 800, 1200, 2000];
export const REF = { inviter: 2500, invitee: 1000 };

// Optional rewarded ads. Always the player's choice, never required.
export const AD = { reward: 250, perDay: 10, cooldownS: 60, confirmWindowS: 300 };

export type TaskDef = { id: string; title: string; reward: number; kind: 'channel' | 'refs' | 'earn'; target: number };
export const TASKS: TaskDef[] = [
  { id: 'channel', title: 'Join the BoxBlast channel', reward: 1500, kind: 'channel', target: 1 },
  { id: 'ref1', title: 'Invite 1 friend', reward: 1000, kind: 'refs', target: 1 },
  { id: 'ref3', title: 'Invite 3 friends', reward: 3000, kind: 'refs', target: 3 },
  { id: 'ref10', title: 'Invite 10 friends', reward: 10000, kind: 'refs', target: 10 },
  { id: 'earn10k', title: 'Earn 10,000 coins in total', reward: 1000, kind: 'earn', target: 10000 },
  { id: 'earn100k', title: 'Earn 100,000 coins in total', reward: 5000, kind: 'earn', target: 100000 },
];

// ---- Levels: derived from total_earned, so they can never be lost or reset. ----
export type LevelDef = { lvl: number; name: string; at: number; reward: number };
export const LEVELS: LevelDef[] = [
  { lvl: 1, name: 'Rookie', at: 0, reward: 0 },
  { lvl: 2, name: 'Packer', at: 2000, reward: 1000 },
  { lvl: 3, name: 'Loader', at: 10000, reward: 3000 },
  { lvl: 4, name: 'Driver', at: 40000, reward: 8000 },
  { lvl: 5, name: 'Supervisor', at: 120000, reward: 20000 },
  { lvl: 6, name: 'Manager', at: 350000, reward: 50000 },
  { lvl: 7, name: 'Director', at: 1000000, reward: 120000 },
  { lvl: 8, name: 'Tycoon', at: 3000000, reward: 300000 },
  { lvl: 9, name: 'Mogul', at: 8000000, reward: 700000 },
  { lvl: 10, name: 'Legend', at: 20000000, reward: 1500000 },
];
export const levelOf = (totalEarned: number): LevelDef => {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (totalEarned >= l.at) cur = l;
  return cur;
};

// ---- Box designs: one unlocks at every level. The look is chosen on the client. ----
export const SKINS = [
  { id: 'classic', name: 'Kraft Classic', level: 1 },
  { id: 'ocean', name: 'Ocean Blue', level: 2 },
  { id: 'emerald', name: 'Emerald', level: 3 },
  { id: 'sunset', name: 'Sunset', level: 4 },
  { id: 'royal', name: 'Royal Purple', level: 5 },
  { id: 'rose', name: 'Rose', level: 6 },
  { id: 'neon', name: 'Neon Night', level: 7 },
  { id: 'lava', name: 'Lava', level: 8 },
  { id: 'gold', name: 'Pure Gold', level: 9 },
  { id: 'diamond', name: 'Diamond', level: 10 },
] as const;
