import type { CSSProperties } from 'react';

export interface LevelConfig {
  lvl: number;
  name: string;
  rank: string;
  minXp: number;
  maxXp: number;
  boxBg: string;
  boxGlow: string;
  particleColor: string;
  levelColor: string;
  auraType: 'gold-dust' | 'blue-soft' | 'steel-sparks' | 'purple-satin' | 'green-fire' | 'ruby-sparkles' | 'cyber-smoke' | 'gold-marble' | 'diamond-rays' | 'treasure-radiance';
  accentGradient: string;
  barGradient: string;
  description: string;
}

export const LEVELS_CONFIG: LevelConfig[] = [
  {
    lvl: 1,
    name: 'Rookie',
    rank: 'ROOKIE',
    minXp: 0,
    maxXp: 1999,
    boxBg: '#c98f54',
    boxGlow: 'rgba(255, 193, 7, 0.45)',
    particleColor: '#ffc107',
    levelColor: '#f59e0b',
    auraType: 'gold-dust',
    accentGradient: 'linear-gradient(135deg, #ffc107, #f59e0b)',
    barGradient: 'linear-gradient(90deg, #ff7e40, #ffc107)',
    description: 'Simple brown kraft box with yellow tape cross, soft golden glow under, gold dust particles',
  },
  {
    lvl: 2,
    name: 'Novice',
    rank: 'NOVICE',
    minXp: 2000,
    maxXp: 3999,
    boxBg: '#8dc2e8',
    boxGlow: 'rgba(56, 189, 248, 0.45)',
    particleColor: '#38bdf8',
    levelColor: '#38bdf8',
    auraType: 'blue-soft',
    accentGradient: 'linear-gradient(135deg, #38bdf8, #2563eb)',
    barGradient: 'linear-gradient(90deg, #0284c7, #38bdf8)',
    description: 'Light sky-blue matte box, clean minimal, blue soft shadow',
  },
  {
    lvl: 3,
    name: 'Adept',
    rank: 'ADEPT',
    minXp: 4000,
    maxXp: 6999,
    boxBg: '#273c58',
    boxGlow: 'rgba(96, 165, 250, 0.4)',
    particleColor: '#93c5fd',
    levelColor: '#60a5fa',
    auraType: 'steel-sparks',
    accentGradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    barGradient: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
    description: 'Dark blue metal crate with silver steel corners, futuristic sci-fi',
  },
  {
    lvl: 4,
    name: 'Skilled',
    rank: 'SKILLED',
    minXp: 7000,
    maxXp: 9999,
    boxBg: '#6d3b9e',
    boxGlow: 'rgba(168, 85, 247, 0.45)',
    particleColor: '#c084fc',
    levelColor: '#a855f7',
    auraType: 'purple-satin',
    accentGradient: 'linear-gradient(135deg, #c084fc, #9333ea)',
    barGradient: 'linear-gradient(90deg, #7e22ce, #c084fc)',
    description: 'Purple premium satin wrap box, luxury feel',
  },
  {
    lvl: 5,
    name: 'Elite',
    rank: 'ELITE',
    minXp: 10000,
    maxXp: 14999,
    boxBg: '#1b6b47',
    boxGlow: 'rgba(34, 197, 94, 0.7)',
    particleColor: '#4ade80',
    levelColor: '#22c55e',
    auraType: 'green-fire',
    accentGradient: 'linear-gradient(135deg, #4ade80, #16a34a)',
    barGradient: 'linear-gradient(90deg, #15803d, #4ade80)',
    description: 'Emerald Green box with thick gold tape + green fire aura + sparkles',
  },
  {
    lvl: 6,
    name: 'Veteran',
    rank: 'VETERAN',
    minXp: 15000,
    maxXp: 19999,
    boxBg: '#991b1b',
    boxGlow: 'rgba(239, 68, 68, 0.55)',
    particleColor: '#f87171',
    levelColor: '#ef4444',
    auraType: 'ruby-sparkles',
    accentGradient: 'linear-gradient(135deg, #f87171, #dc2626)',
    barGradient: 'linear-gradient(90deg, #b91c1c, #f87171)',
    description: 'Ruby Red box with red gems on corners, shiny reflective',
  },
  {
    lvl: 7,
    name: 'Master',
    rank: 'MASTER',
    minXp: 20000,
    maxXp: 27999,
    boxBg: '#14141e',
    boxGlow: 'rgba(192, 38, 211, 0.7)',
    particleColor: '#e879f9',
    levelColor: '#c026d3',
    auraType: 'cyber-smoke',
    accentGradient: 'linear-gradient(135deg, #e879f9, #a21caf)',
    barGradient: 'linear-gradient(90deg, #86198f, #e879f9)',
    description: 'Black box with purple neon glowing edges, cyberpunk, purple smoke',
  },
  {
    lvl: 8,
    name: 'Champion',
    rank: 'CHAMPION',
    minXp: 28000,
    maxXp: 36999,
    boxBg: '#1a1f29',
    boxGlow: 'rgba(234, 179, 8, 0.6)',
    particleColor: '#facc15',
    levelColor: '#eab308',
    auraType: 'gold-marble',
    accentGradient: 'linear-gradient(135deg, #facc15, #ca8a04)',
    barGradient: 'linear-gradient(90deg, #a16207, #facc15)',
    description: 'Black marble box with gold king corners, obsidian + gold luxury',
  },
  {
    lvl: 9,
    name: 'Legend',
    rank: 'LEGEND',
    minXp: 37000,
    maxXp: 49999,
    boxBg: '#e0f2fe',
    boxGlow: 'rgba(186, 230, 253, 0.8)',
    particleColor: '#bae6fd',
    levelColor: '#38bdf8',
    auraType: 'diamond-rays',
    accentGradient: 'linear-gradient(135deg, #ffffff, #7dd3fc)',
    barGradient: 'linear-gradient(90deg, #0284c7, #bae6fd)',
    description: 'Giant pure diamond shape, white with intense sparkles and light rays',
  },
  {
    lvl: 10,
    name: 'Boss',
    rank: 'BOSS',
    minXp: 50000,
    maxXp: 100000,
    boxBg: '#b45309',
    boxGlow: 'rgba(245, 158, 11, 0.85)',
    particleColor: '#fbbf24',
    levelColor: '#f59e0b',
    auraType: 'treasure-radiance',
    accentGradient: 'linear-gradient(135deg, #fde047, #d97706)',
    barGradient: 'linear-gradient(90deg, #b45309, #fde047)',
    description: 'Golden treasure chest open, full of diamonds, golden coins falling, most premium',
  },
];

export function getLevelConfig(lvl: number): LevelConfig {
  const clamped = Math.max(1, Math.min(10, lvl || 1));
  return LEVELS_CONFIG[clamped - 1];
}

export function applyTheme(lvl: number) {
  const cfg = getLevelConfig(lvl);
  const r = document.documentElement;

  // Always keep clean dark theme background #0F1219 as requested
  r.style.setProperty('--bg1', '#0F1219');
  r.style.setProperty('--bg2', '#141824');
  r.style.setProperty('--box-bg', cfg.boxBg);
  r.style.setProperty('--box-glow', cfg.boxGlow);
  r.style.setProperty('--particle-color', cfg.particleColor);
  r.style.setProperty('--level-color', cfg.levelColor);

  r.style.setProperty('--acc', cfg.levelColor);
  r.style.setProperty('--acc2', '#ff5b2e');
  r.style.setProperty('--panel', '#151b27');
  r.style.setProperty('--line', '#263044');
  r.dataset.level = String(cfg.lvl);

  try {
    const w = (window as any).Telegram?.WebApp;
    w?.setHeaderColor?.('#0F1219');
    w?.setBackgroundColor?.('#0F1219');
  } catch {
    /* ignore */
  }
}

// Backward compatibility helper for existing subcomponents
export const SKIN_STYLES: Record<string, { k: string; kd: string; kt: string; fx?: string }> = {
  classic: { k: '#c98f54', kd: '#8f5f31', kt: '#ffc93c' },
  ocean: { k: '#3f8fd2', kd: '#25608f', kt: '#bfe6ff' },
  emerald: { k: '#35b07a', kd: '#1f7a52', kt: '#d6ffe9' },
  sunset: { k: '#f08a4b', kd: '#b5532a', kt: '#ffe08a' },
  royal: { k: '#8a63d2', kd: '#5a3d99', kt: '#ffd86b' },
  rose: { k: '#e66f98', kd: '#a8426a', kt: '#fff0c2' },
  neon: { k: '#16222e', kd: '#070d13', kt: '#00f5d4', fx: 'neon' },
  lava: { k: '#d8432b', kd: '#8a1f12', kt: '#ffb703', fx: 'lava' },
  gold: { k: '#e5b93a', kd: '#a5791a', kt: '#fff4c2', fx: 'shine' },
  diamond: { k: '#9fe3ff', kd: '#5aa9c9', kt: '#ffffff', fx: 'shine' },
};

export const skinVars = (id: string) => {
  const s = SKIN_STYLES[id] || SKIN_STYLES.classic;
  return { '--k': s.k, '--kd': s.kd, '--kt': s.kt } as CSSProperties;
};
