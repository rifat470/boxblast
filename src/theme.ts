import type { CSSProperties } from 'react';

// The whole app changes colour by itself when the player reaches a new level.
export type Theme = { bg1: string; bg2: string; acc: string; acc2: string; panel: string; line: string };

export const THEMES: Theme[] = [
  { bg1: '#12151c', bg2: '#1c2230', acc: '#ffc93c', acc2: '#ff5b2e', panel: '#1e2430', line: '#323b4c' }, // 1 Rookie
  { bg1: '#0c1823', bg2: '#12304a', acc: '#4cc9f0', acc2: '#4361ee', panel: '#14283a', line: '#24425e' }, // 2 Packer
  { bg1: '#0b1a15', bg2: '#10392b', acc: '#3ddc97', acc2: '#1b9e6b', panel: '#12291f', line: '#1f4a39' }, // 3 Loader
  { bg1: '#1d120d', bg2: '#42241a', acc: '#ff9f43', acc2: '#ee5a24', panel: '#2e1c14', line: '#553425' }, // 4 Driver
  { bg1: '#150f27', bg2: '#2b1f58', acc: '#b79cff', acc2: '#7c4dff', panel: '#211a3d', line: '#3b2f6b' }, // 5 Supervisor
  { bg1: '#210e18', bg2: '#4a1a33', acc: '#ff8fb1', acc2: '#e0487a', panel: '#321626', line: '#5a2842' }, // 6 Manager
  { bg1: '#061418', bg2: '#08323a', acc: '#00f5d4', acc2: '#00bbf9', panel: '#0c262c', line: '#14515a' }, // 7 Director
  { bg1: '#1e0a0a', bg2: '#4a1414', acc: '#ff6b4a', acc2: '#d62828', panel: '#2f1111', line: '#5a2121' }, // 8 Tycoon
  { bg1: '#1a1506', bg2: '#3d300a', acc: '#ffd700', acc2: '#c9971c', panel: '#2b2209', line: '#59461a' }, // 9 Mogul
  { bg1: '#0a0a1f', bg2: '#2a1458', acc: '#e0aaff', acc2: '#ff6bd6', panel: '#1a1236', line: '#3d2a73' }, // 10 Legend
];

export function applyTheme(lvl: number) {
  const t = THEMES[Math.min(THEMES.length, Math.max(1, lvl)) - 1];
  const r = document.documentElement;
  r.style.setProperty('--bg1', t.bg1);
  r.style.setProperty('--bg2', t.bg2);
  r.style.setProperty('--acc', t.acc);
  r.style.setProperty('--acc2', t.acc2);
  r.style.setProperty('--panel', t.panel);
  r.style.setProperty('--line', t.line);
  r.dataset.level = String(lvl);
  try {
    const w = (window as any).Telegram?.WebApp;
    w?.setHeaderColor?.(t.bg1);
    w?.setBackgroundColor?.(t.bg1);
  } catch { /* ignore */ }
}

// Box designs. k = box colour, kd = shadow/edge, kt = tape colour.
export type SkinStyle = { k: string; kd: string; kt: string; fx?: string };
export const SKIN_STYLES: Record<string, SkinStyle> = {
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
