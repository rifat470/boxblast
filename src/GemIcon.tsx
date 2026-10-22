import { useId } from 'react';

// Hand-drawn faceted gems. White Moonstone, Radiant Onyx, Silver Star, Royal Ruby, Sapphire, Eternal Diamond.
const PAL: Record<string, { a: string; b: string; c: string; glow: string }> = {
  white: { a: '#ffffff', b: '#dfe7f5', c: '#aebbd6', glow: 'rgba(255,255,255,.65)' },
  black: { a: '#5b5b73', b: '#1b1b26', c: '#050509', glow: 'rgba(168,140,255,.55)' },
  silver: { a: '#f4f6fa', b: '#b9c0cc', c: '#7b8494', glow: 'rgba(200,210,230,.6)' },
  red: { a: '#ff8aa0', b: '#e0193f', c: '#80051f', glow: 'rgba(255,60,90,.65)' },
  blue: { a: '#8fd0ff', b: '#1f6fe0', c: '#0a2c7a', glow: 'rgba(60,150,255,.65)' },
  diamond: { a: '#ffffff', b: '#a8e8ff', c: '#7aa8ff', glow: 'rgba(160,230,255,.85)' },
};

export default function GemIcon({ id, size = 44, dim = false }: { id: string; size?: number; dim?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const p = PAL[id] || PAL.white;
  const g = `g${uid}`;
  const s = `s${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ filter: dim ? 'grayscale(1) brightness(.45)' : `drop-shadow(0 0 8px ${p.glow})`, opacity: dim ? 0.8 : 1 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.a} />
          <stop offset=".55" stopColor={p.b} />
          <stop offset="1" stopColor={p.c} />
        </linearGradient>
        <linearGradient id={s} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {id === 'silver' ? (
        <path d="M32 3l8.5 17.5L60 23l-14 13.5L49.5 56 32 46.5 14.5 56 18 36.5 4 23l19.5-2.5z" fill={`url(#${g})`} stroke="#ffffff55" strokeWidth="1.2" />
      ) : id === 'white' ? (
        <ellipse cx="32" cy="33" rx="22" ry="25" fill={`url(#${g})`} stroke="#ffffff66" strokeWidth="1.2" />
      ) : (
        <>
          <path d="M16 8h32l14 17-30 33L2 25z" fill={`url(#${g})`} stroke="#ffffff55" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M2 25h60M16 8l10 17 6 33M48 8L38 25l-6 33M26 25h12" fill="none" stroke="#ffffff55" strokeWidth="1" />
          <path d="M16 8l10 17H2z" fill="#ffffff2a" />
          <path d="M48 8l-10 17h24z" fill="#00000022" />
        </>
      )}
      <ellipse cx="24" cy="20" rx="9" ry="5" fill={`url(#${s})`} transform="rotate(-25 24 20)" />
      {(id === 'diamond' || id === 'silver') && (
        <g fill="#fff">
          <path d="M52 8l1.6 4.4L58 14l-4.4 1.6L52 20l-1.6-4.4L46 14l4.4-1.6z" />
          <path d="M10 44l1.1 3L14 48l-2.9 1.1L10 52l-1.1-2.9L6 48l2.9-1z" opacity=".8" />
        </g>
      )}
    </svg>
  );
}
