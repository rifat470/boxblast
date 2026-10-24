import { useId } from 'react';

// Realistic gems drawn as layered SVG: facet-by-facet shading, glossy highlights and sparkle.
// Moonstone and Silver Star are polished cabochons; Onyx, Ruby, Sapphire and Diamond are faceted brilliant cuts.
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// factor < 1 darkens, factor > 1 lightens toward white
const shade = (h: string, f: number) => {
  const c = hex(h);
  const out = c.map((v) => (f <= 1 ? v * f : v + (255 - v) * (f - 1)));
  return `rgb(${out.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(',')})`;
};

type Cut = { base: string; glow: string; tint?: string[]; edge?: string };
const CUTS: Record<string, Cut> = {
  black: { base: '#23232f', glow: 'rgba(150,120,255,.55)', tint: ['#6a5acd', '#2b2b44', '#4b3f8f'], edge: '#b8a6ff' },
  red: { base: '#d3123a', glow: 'rgba(255,50,90,.7)', edge: '#ffc2cf' },
  blue: { base: '#1b63d8', glow: 'rgba(60,150,255,.7)', edge: '#c4e0ff' },
  diamond: { base: '#d9f3ff', glow: 'rgba(170,235,255,.9)', tint: ['#ffd6f5', '#cfe9ff', '#dcffe9', '#fff2c9'], edge: '#ffffff' },
};

// Crown: 6 facets, pavilion: 4 facets. [points, light-factor]
const FACETS: [string, number][] = [
  ['32,14 68,14 60,27 40,27', 1.55],
  ['32,14 40,27 28,38 8,38', 1.25],
  ['40,27 28,38 50,38', 0.95],
  ['40,27 60,27 50,38', 1.35],
  ['60,27 50,38 72,38', 0.8],
  ['60,27 68,14 92,38 72,38', 1.05],
  ['8,38 28,38 50,92', 0.72],
  ['28,38 50,38 50,92', 1.08],
  ['50,38 72,38 50,92', 0.62],
  ['72,38 92,38 50,92', 0.86],
];

export default function GemIcon({ id, size = 44, dim = false }: { id: string; size?: number; dim?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const filter = dim ? 'grayscale(1) brightness(.5)' : undefined;
  const glow = (CUTS[id]?.glow) || (id === 'silver' ? 'rgba(210,220,240,.7)' : 'rgba(210,225,255,.7)');
  const wrap = {
    width: size,
    height: size,
    filter: dim ? filter : `drop-shadow(0 2px 6px ${glow})`,
    opacity: dim ? 0.85 : 1,
  } as const;

  // ---------- Moonstone: milky cabochon with a blue adularescent sheen ----------
  if (id === 'white') {
    return (
      <svg viewBox="0 0 100 100" style={wrap} aria-hidden="true">
        <defs>
          <radialGradient id={`m${uid}`} cx=".4" cy=".35" r=".8">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".45" stopColor="#e9eefb" />
            <stop offset=".8" stopColor="#bcc6e0" />
            <stop offset="1" stopColor="#8f9bbd" />
          </radialGradient>
          <radialGradient id={`s${uid}`} cx=".62" cy=".7" r=".55">
            <stop offset="0" stopColor="#7fb2ff" stopOpacity=".75" />
            <stop offset="1" stopColor="#7fb2ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="54" rx="33" ry="40" fill={`url(#m${uid})`} />
        <ellipse cx="50" cy="54" rx="33" ry="40" fill={`url(#s${uid})`} />
        <ellipse cx="50" cy="54" rx="33" ry="40" fill="none" stroke="#ffffff88" strokeWidth="1.4" />
        <ellipse cx="38" cy="32" rx="13" ry="7.5" fill="#fff" opacity=".85" transform="rotate(-28 38 32)" />
        <ellipse cx="62" cy="82" rx="9" ry="3.2" fill="#fff" opacity=".35" />
      </svg>
    );
  }

  // ---------- Silver Star: silver star-cabochon with a six-ray asterism ----------
  if (id === 'silver') {
    return (
      <svg viewBox="0 0 100 100" style={wrap} aria-hidden="true">
        <defs>
          <radialGradient id={`m${uid}`} cx=".38" cy=".32" r=".85">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".4" stopColor="#d7dce6" />
            <stop offset=".8" stopColor="#8d96a8" />
            <stop offset="1" stopColor="#5b6475" />
          </radialGradient>
          <linearGradient id={`r${uid}`} x1="0" y1=".5" x2="1" y2=".5">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".95" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="54" rx="38" ry="38" fill={`url(#m${uid})`} />
        <ellipse cx="50" cy="54" rx="38" ry="38" fill="none" stroke="#ffffff99" strokeWidth="1.4" />
        <g transform="translate(50 54)">
          {[0, 60, 120].map((a) => (
            <rect key={a} x="-34" y="-1.8" width="68" height="3.6" rx="1.8" fill={`url(#r${uid})`} transform={`rotate(${a + 8})`} />
          ))}
          <circle r="4.5" fill="#fff" />
        </g>
        <ellipse cx="36" cy="30" rx="13" ry="7" fill="#fff" opacity=".7" transform="rotate(-30 36 30)" />
      </svg>
    );
  }

  // ---------- Faceted cuts: Radiant Onyx, Royal Ruby, Sapphire, Eternal Diamond ----------
  const cut = CUTS[id] || CUTS.diamond;
  const isDiamond = id === 'diamond';
  return (
    <svg viewBox="0 0 100 100" style={wrap} aria-hidden="true">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".35" />
        </linearGradient>
      </defs>
      {FACETS.map(([pts, f], i) => {
        const base = cut.tint ? cut.tint[i % cut.tint.length] : cut.base;
        return <polygon key={i} points={pts} fill={isDiamond ? shade('#e8f6ff', 0.78 + (f - 0.6) * 0.3) : shade(base, f)} />;
      })}
      {isDiamond &&
        FACETS.map(([pts], i) => <polygon key={`t${i}`} points={pts} fill={cut.tint![i % 4]} opacity=".35" />)}
      <g stroke={cut.edge || '#fff'} strokeOpacity=".5" strokeWidth=".9" strokeLinejoin="round" fill="none">
        {FACETS.map(([pts], i) => (
          <polygon key={`e${i}`} points={pts} />
        ))}
      </g>
      <polygon points="32,14 68,14 92,38 50,92 8,38" fill={`url(#g${uid})`} />
      <polygon points="35,16 52,16 44,25 38,25" fill="#fff" opacity={isDiamond ? 0.95 : 0.7} />
      <polygon points="14,37 26,37 30,30" fill="#fff" opacity=".35" />
      <g fill="#fff">
        <path d="M80 12l2.2 6.2L88.5 20l-6.3 1.8L80 28l-2.2-6.2L71.5 20l6.3-1.8z" opacity={isDiamond ? 1 : 0.85} />
        {isDiamond && <path d="M16 64l1.4 4L21.5 69.4l-4.1 1.4L16 75l-1.4-4.2L10.5 69.4l4.1-1.4z" opacity=".9" />}
      </g>
    </svg>
  );
}
