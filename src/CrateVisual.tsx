import React from 'react';

interface CrateVisualProps {
  level: number;
  isGlinting?: boolean;
  isFloating?: boolean;
  delayIndex?: number;
}

export const CrateVisual: React.FC<CrateVisualProps> = ({
  level,
  isGlinting = false,
  isFloating = true,
  delayIndex = 0,
}) => {
  const lvl = Math.max(1, Math.min(10, level || 1));
  const floatDelay = `${(delayIndex * 0.18).toFixed(2)}s`;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none ${
        isFloating ? 'animate-crate-float' : ''
      }`}
      style={{
        animationDelay: floatDelay,
      }}
    >
      {/* Dynamic Ambient Ground Glow / Shadow */}
      <div
        className="absolute -bottom-2 inset-x-2 h-5 rounded-full blur-md opacity-90 transition-colors duration-500 pointer-events-none"
        style={{
          background:
            lvl === 1
              ? 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.45) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)'
              : lvl === 5
              ? 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.55) 0%, rgba(16, 185, 129, 0.25) 50%, transparent 100%)'
              : lvl === 10
              ? 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.65) 0%, rgba(217, 119, 6, 0.35) 60%, transparent 100%)'
              : 'var(--box-glow, rgba(255, 193, 7, 0.45))',
        }}
      />

      {/* SVG Container for crisp high-resolution isometric crate */}
      <svg
        viewBox="0 0 160 160"
        className="w-full h-full overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* ======================= LEVEL 1: KRAFT GRADIENTS & SHADOWS ======================= */}
          <linearGradient id="kraft-top" x1="80" y1="24" x2="80" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e5ab70" />
            <stop offset="45%" stopColor="#d5995d" />
            <stop offset="100%" stopColor="#bf8347" />
          </linearGradient>
          <linearGradient id="kraft-left" x1="22" y1="53" x2="80" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a76e37" />
            <stop offset="50%" stopColor="#8d5927" />
            <stop offset="100%" stopColor="#6f4219" />
          </linearGradient>
          <linearGradient id="kraft-right" x1="80" y1="82" x2="138" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ba8046" />
            <stop offset="50%" stopColor="#9e6730" />
            <stop offset="100%" stopColor="#7c4c1e" />
          </linearGradient>

          {/* Yellow Packing Tape Gradient */}
          <linearGradient id="tape-yellow-main" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff388" />
            <stop offset="25%" stopColor="#facc15" />
            <stop offset="75%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id="tape-yellow-left" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="tape-yellow-right" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* ======================= LEVEL 2: SKY BLUE ======================= */}
          <linearGradient id="sky-top" x1="80" y1="24" x2="80" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c5e8fd" />
            <stop offset="100%" stopColor="#9ed1f5" />
          </linearGradient>
          <linearGradient id="sky-left" x1="22" y1="53" x2="80" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#72aedb" />
            <stop offset="100%" stopColor="#4688ba" />
          </linearGradient>
          <linearGradient id="sky-right" x1="80" y1="82" x2="138" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5d9ccb" />
            <stop offset="100%" stopColor="#3b79a7" />
          </linearGradient>

          {/* ======================= LEVEL 3: ADEPT STEEL ======================= */}
          <linearGradient id="adept-top" x1="80" y1="24" x2="80" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3d5c80" />
            <stop offset="100%" stopColor="#22374e" />
          </linearGradient>
          <linearGradient id="adept-left" x1="22" y1="53" x2="80" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1a2b3f" />
            <stop offset="100%" stopColor="#0e1925" />
          </linearGradient>
          <linearGradient id="adept-right" x1="80" y1="82" x2="138" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#152435" />
            <stop offset="100%" stopColor="#0b131e" />
          </linearGradient>
          <linearGradient id="steel-plate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* ======================= LEVEL 4: PURPLE SATIN ======================= */}
          <linearGradient id="satin-top" x1="80" y1="24" x2="80" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
          <linearGradient id="satin-left" x1="22" y1="53" x2="80" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6b21a8" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
          <linearGradient id="satin-right" x1="80" y1="82" x2="138" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#581c87" />
            <stop offset="100%" stopColor="#3b0764" />
          </linearGradient>

          {/* ======================= LEVEL 5: EMERALD ELITE ======================= */}
          <linearGradient id="emerald-top" x1="80" y1="24" x2="80" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="emerald-left" x1="22" y1="53" x2="80" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="60%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <linearGradient id="emerald-right" x1="80" y1="82" x2="138" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="60%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#033d2f" />
          </linearGradient>
          <linearGradient id="gold-filigree" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="30%" stopColor="#fde047" />
            <stop offset="65%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          <radialGradient id="emerald-gem-rad" cx="40%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="40%" stopColor="#34d399" />
            <stop offset="80%" stopColor="#059669" />
            <stop offset="100%" stopColor="#064e3b" />
          </radialGradient>
          <radialGradient id="green-fire-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
            <stop offset="45%" stopColor="#10b981" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#047857" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* ======================= LEVEL 6: VETERAN RUBY ======================= */}
          <linearGradient id="ruby-top" x1="80" y1="24" x2="80" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="ruby-left" x1="22" y1="53" x2="80" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
          <linearGradient id="ruby-right" x1="80" y1="82" x2="138" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="100%" stopColor="#350606" />
          </linearGradient>
          <radialGradient id="ruby-gem" cx="35%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="45%" stopColor="#ef4444" />
            <stop offset="90%" stopColor="#881337" />
          </radialGradient>

          {/* ======================= LEVEL 7: MASTER CYBER ======================= */}
          <linearGradient id="cyber-top" x1="80" y1="24" x2="80" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e1b2e" />
            <stop offset="100%" stopColor="#12101e" />
          </linearGradient>
          <linearGradient id="cyber-left" x1="22" y1="53" x2="80" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f0d19" />
            <stop offset="100%" stopColor="#07060c" />
          </linearGradient>
          <linearGradient id="cyber-right" x1="80" y1="82" x2="138" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0b0a13" />
            <stop offset="100%" stopColor="#040308" />
          </linearGradient>

          {/* ======================= LEVEL 8: CHAMPION MARBLE ======================= */}
          <linearGradient id="marble-top" x1="80" y1="24" x2="80" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2d3340" />
            <stop offset="100%" stopColor="#1c212a" />
          </linearGradient>
          <linearGradient id="marble-left" x1="22" y1="53" x2="80" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#171b23" />
            <stop offset="100%" stopColor="#0b0d12" />
          </linearGradient>
          <linearGradient id="marble-right" x1="80" y1="82" x2="138" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#13161d" />
            <stop offset="100%" stopColor="#08090d" />
          </linearGradient>

          {/* ======================= LEVEL 9: LEGEND DIAMOND ======================= */}
          <linearGradient id="dia-center" x1="80" y1="18" x2="80" y2="142" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#e0f2fe" />
            <stop offset="70%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="dia-facet-left" x1="20" y1="68" x2="80" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#a5f3fc" />
          </linearGradient>
          <linearGradient id="dia-facet-right" x1="80" y1="92" x2="140" y2="68" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* ======================= LEVEL 10: BOSS TREASURE CHEST ======================= */}
          <linearGradient id="chest-wood-arch" x1="80" y1="14" x2="80" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="40%" stopColor="#78350f" />
            <stop offset="80%" stopColor="#542407" />
            <stop offset="100%" stopColor="#381503" />
          </linearGradient>
          <linearGradient id="chest-wood-front" x1="80" y1="58" x2="80" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#592809" />
            <stop offset="100%" stopColor="#371503" />
          </linearGradient>
          <linearGradient id="gold-boss" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="55%" stopColor="#facc15" />
            <stop offset="85%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <radialGradient id="blue-diamond-gem" cx="35%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="35%" stopColor="#7dd3fc" />
            <stop offset="75%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0c4a6e" />
          </radialGradient>
          <radialGradient id="chest-radiance" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="85%" stopColor="#b45309" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Glint Shimmer Filter & Gradient */}
          <linearGradient id="glint-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="40%" stopColor="rgba(255, 255, 255, 0.25)" />
            <stop offset="50%" stopColor="rgba(255, 240, 150, 0.95)" />
            <stop offset="60%" stopColor="rgba(255, 255, 255, 0.25)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* ======================================================================= */}
        {/* LEVEL 1: ROOKIE - EXACT 3D BROWN KRAFT CARDBOARD BOX WITH YELLOW TAPE  */}
        {/* ======================================================================= */}
        {lvl === 1 && (
          <g>
            {/* Realistic Soft Contact Shadow Below Box */}
            <ellipse cx="80" cy="138" rx="44" ry="11" fill="rgba(0,0,0,0.55)" filter="blur(6px)" />
            <ellipse cx="80" cy="136" rx="34" ry="7" fill="rgba(0,0,0,0.7)" filter="blur(3px)" />

            {/* Base Isometric Crate Facets */}
            {/* Top Face */}
            <polygon points="80,24 138,53 80,82 22,53" fill="url(#kraft-top)" />

            {/* Top Seam - Center Flap Slit of real cardboard box */}
            <line x1="80" y1="24" x2="80" y2="82" stroke="#683d16" strokeWidth="1.2" opacity="0.65" />

            {/* Top Flap Crease & Highlight Bevels */}
            <line x1="22" y1="53" x2="80" y2="24" stroke="#f6cca0" strokeWidth="1.2" opacity="0.75" />
            <line x1="80" y1="24" x2="138" y2="53" stroke="#e0aa75" strokeWidth="1" opacity="0.5" />
            <line x1="22" y1="53" x2="80" y2="82" stroke="#f0bd8a" strokeWidth="1.2" opacity="0.8" />
            <line x1="80" y1="82" x2="138" y2="53" stroke="#683d16" strokeWidth="1.2" opacity="0.7" />

            {/* Left Face */}
            <polygon points="22,53 80,82 80,136 22,107" fill="url(#kraft-left)" />

            {/* Right Face */}
            <polygon points="80,82 138,53 138,107 80,136" fill="url(#kraft-right)" />

            {/* Vertical Seams & Edge Highlights */}
            <line x1="80" y1="82" x2="80" y2="136" stroke="#48270c" strokeWidth="1.8" />
            <line x1="22" y1="53" x2="22" y2="107" stroke="#77451a" strokeWidth="1" />
            <line x1="138" y1="53" x2="138" y2="107" stroke="#48270c" strokeWidth="1" />
            {/* Base rim shadows */}
            <line x1="22" y1="107" x2="80" y2="136" stroke="#3b1d06" strokeWidth="1" opacity="0.7" />
            <line x1="80" y1="136" x2="138" y2="107" stroke="#2c1403" strokeWidth="1" opacity="0.8" />

            {/* Cardboard Corrugation Grain Lines (Horizontal ribs) */}
            <line x1="24" y1="66" x2="78" y2="93" stroke="#5a310f" strokeWidth="0.8" opacity="0.22" />
            <line x1="24" y1="78" x2="78" y2="105" stroke="#5a310f" strokeWidth="0.8" opacity="0.22" />
            <line x1="24" y1="90" x2="78" y2="117" stroke="#5a310f" strokeWidth="0.8" opacity="0.22" />
            <line x1="24" y1="102" x2="78" y2="129" stroke="#5a310f" strokeWidth="0.8" opacity="0.22" />

            <line x1="82" y1="93" x2="136" y2="66" stroke="#5a310f" strokeWidth="0.8" opacity="0.22" />
            <line x1="82" y1="105" x2="136" y2="78" stroke="#5a310f" strokeWidth="0.8" opacity="0.22" />
            <line x1="82" y1="117" x2="136" y2="90" stroke="#5a310f" strokeWidth="0.8" opacity="0.22" />
            <line x1="82" y1="129" x2="136" y2="102" stroke="#5a310f" strokeWidth="0.8" opacity="0.22" />

            {/* Back Overhangs of Tape (visible at rear top edges) */}
            <polygon points="45,41 57,35 57,30 45,36" fill="#ca8a04" opacity="0.7" />
            <polygon points="103,35 115,41 115,36 103,30" fill="#a16207" opacity="0.7" />

            {/* Side Overhangs of Tape Wrapping Down The Front Facets */}
            {/* Left face tape overhang */}
            <polygon points="45,65 57,71 57,94 45,88" fill="url(#tape-yellow-left)" />
            <line x1="45" y1="88" x2="57" y2="94" stroke="#a16207" strokeWidth="0.8" />
            {/* Right face tape overhang */}
            <polygon points="103,71 115,65 115,88 103,94" fill="url(#tape-yellow-right)" />
            <line x1="103" y1="94" x2="115" y2="88" stroke="#854d0e" strokeWidth="0.8" />

            {/* Thick Yellow Packing Tape Cross (+) on Top Face */}
            {/* Tape Strip 1: Top-Left to Bottom-Right */}
            <polygon points="45,41 57,35 115,65 103,71" fill="url(#tape-yellow-main)" />
            {/* Specular gloss line along tape 1 */}
            <polygon points="49,39 53,37 111,67 107,69" fill="#ffffff" opacity="0.4" />

            {/* Tape Strip 2: Top-Right to Bottom-Left */}
            <polygon points="115,41 103,35 45,65 57,71" fill="url(#tape-yellow-main)" />
            {/* Specular gloss line along tape 2 */}
            <polygon points="111,39 107,37 49,67 53,69" fill="#ffffff" opacity="0.4" />

            {/* Tape Center Intersection Overlap Square */}
            <polygon points="80,48 86,51 80,54 74,51" fill="#eab308" opacity="0.5" />
            <circle cx="80" cy="51" r="1.5" fill="#ffffff" opacity="0.8" />

            {/* Floating Golden Dust Sparkle Particles (Matching Image 1) */}
            {/* Sparkle 1: Top Right */}
            <path
              d="M136,32 L137.5,35 L140.5,35 L138,37 L139,40 L136,38 L133,40 L134,37 L131.5,35 L134.5,35 Z"
              fill="#fde047"
              filter="drop-shadow(0 0 3px #facc15)"
              className="animate-pulse"
            />
            {/* Sparkle 2: Top Left */}
            <circle cx="28" cy="34" r="2" fill="#fde047" filter="drop-shadow(0 0 2px #facc15)" className="animate-pulse" />
            {/* Sparkle 3: Top Center High */}
            <circle cx="78" cy="14" r="1.6" fill="#fef08a" opacity="0.85" />
            {/* Sparkle 4: Mid Left */}
            <path
              d="M16,84 L17.5,86.5 L20.5,86.5 L18,88.5 L19,91 L16,89.5 L13,91 L14,88.5 L11.5,86.5 L14.5,86.5 Z"
              fill="#fbbf24"
              opacity="0.9"
            />
            {/* Sparkle 5: Mid Right */}
            <circle cx="144" cy="88" r="2.2" fill="#fde047" filter="drop-shadow(0 0 3px #facc15)" className="animate-pulse" />
            {/* Sparkle 6: Bottom Right */}
            <circle cx="128" cy="122" r="1.8" fill="#f59e0b" opacity="0.8" />
            {/* Sparkle 7: Bottom Left */}
            <circle cx="32" cy="120" r="1.5" fill="#fde047" opacity="0.75" />
          </g>
        )}

        {/* ======================================================================= */}
        {/* LEVEL 2: NOVICE - LIGHT SKY-BLUE MATTE BOX, CLEAN MINIMAL               */}
        {/* ======================================================================= */}
        {lvl === 2 && (
          <g>
            <ellipse cx="80" cy="138" rx="42" ry="10" fill="rgba(0,0,0,0.5)" filter="blur(6px)" />
            <polygon points="80,24 138,53 80,82 22,53" fill="url(#sky-top)" />
            <polygon points="22,53 80,82 80,136 22,107" fill="url(#sky-left)" />
            <polygon points="80,82 138,53 138,107 80,136" fill="url(#sky-right)" />

            {/* Clean minimal bevel lines */}
            <line x1="80" y1="82" x2="80" y2="136" stroke="#255e86" strokeWidth="1.6" />
            <line x1="22" y1="53" x2="80" y2="82" stroke="#e0f2fe" strokeWidth="1.5" opacity="0.85" />
            <line x1="80" y1="82" x2="138" y2="53" stroke="#2a6894" strokeWidth="1.2" opacity="0.6" />
            <line x1="22" y1="53" x2="80" y2="24" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />

            {/* Soft blue dust particles */}
            <circle cx="134" cy="38" r="2.2" fill="#93c5fd" className="animate-pulse" />
            <circle cx="26" cy="74" r="1.8" fill="#bfdbfe" />
            <circle cx="140" cy="94" r="1.8" fill="#60a5fa" />
          </g>
        )}

        {/* ======================================================================= */}
        {/* LEVEL 3: ADEPT - DARK BLUE METAL CRATE WITH SILVER STEEL CORNERS       */}
        {/* ======================================================================= */}
        {lvl === 3 && (
          <g>
            <ellipse cx="80" cy="138" rx="44" ry="11" fill="rgba(0,0,0,0.55)" filter="blur(6px)" />
            <polygon points="80,24 138,53 80,82 22,53" fill="url(#adept-top)" />
            <polygon points="22,53 80,82 80,136 22,107" fill="url(#adept-left)" />
            <polygon points="80,82 138,53 138,107 80,136" fill="url(#adept-right)" />

            {/* Heavy Reinforced Silver Steel Corners and Bevel Edges */}
            <polygon points="80,24 138,53 131,56 80,30 29,56 22,53" fill="url(#steel-plate)" opacity="0.9" />
            <polygon points="77,82 83,82 83,136 77,136" fill="url(#steel-plate)" opacity="0.85" />
            <polygon points="22,53 28,56 28,105 22,107" fill="url(#steel-plate)" opacity="0.8" />
            <polygon points="132,56 138,53 138,107 132,105" fill="url(#steel-plate)" opacity="0.75" />

            {/* Industrial laser-etched plates */}
            <polygon points="32,60 72,80 72,126 32,104" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 2" fill="none" opacity="0.4" />
            <polygon points="88,80 128,60 128,104 88,126" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 2" fill="none" opacity="0.35" />

            {/* Silver Rivets */}
            <circle cx="80" cy="82" r="3.5" fill="url(#steel-plate)" stroke="#0f172a" strokeWidth="0.8" />
            <circle cx="28" cy="56" r="2.5" fill="url(#steel-plate)" />
            <circle cx="132" cy="56" r="2.5" fill="url(#steel-plate)" />
            <circle cx="80" cy="132" r="2.5" fill="url(#steel-plate)" />
            <circle cx="27" cy="103" r="2.5" fill="url(#steel-plate)" />
            <circle cx="133" cy="103" r="2.5" fill="url(#steel-plate)" />
          </g>
        )}

        {/* ======================================================================= */}
        {/* LEVEL 4: SKILLED - PURPLE PREMIUM SATIN WRAP BOX                       */}
        {/* ======================================================================= */}
        {lvl === 4 && (
          <g>
            <ellipse cx="80" cy="138" rx="44" ry="11" fill="rgba(0,0,0,0.55)" filter="blur(6px)" />
            <polygon points="80,24 138,53 80,82 22,53" fill="url(#satin-top)" />
            <polygon points="22,53 80,82 80,136 22,107" fill="url(#satin-left)" />
            <polygon points="80,82 138,53 138,107 80,136" fill="url(#satin-right)" />

            {/* Specular Diagonal Sheen */}
            <polygon points="65,31 98,47 78,57 45,41" fill="#f3e8ff" opacity="0.35" />
            <polygon points="28,58 48,68 48,118 28,107" fill="#e9d5ff" opacity="0.25" />

            {/* Crisp origami folds */}
            <line x1="80" y1="82" x2="80" y2="136" stroke="#2e0854" strokeWidth="1.6" />
            <line x1="22" y1="53" x2="80" y2="82" stroke="#f3e8ff" strokeWidth="1.5" opacity="0.8" />
            <line x1="80" y1="82" x2="138" y2="53" stroke="#4a044e" strokeWidth="1.2" opacity="0.6" />
          </g>
        )}

        {/* ======================================================================= */}
        {/* LEVEL 5: ELITE - EMERALD GREEN BOX + GOLD TAPE + GREEN FIRE AURA       */}
        {/* ======================================================================= */}
        {lvl === 5 && (
          <g>
            {/* Green Fire Smoke Aura Around Bottom (From Image 2 & 4 reference) */}
            <ellipse cx="80" cy="134" rx="58" ry="20" fill="url(#green-fire-aura)" filter="blur(14px)" />
            <ellipse cx="80" cy="120" rx="46" ry="14" fill="#22c55e" filter="blur(8px)" opacity="0.45" />

            {/* Rising Green Flame Smoke Wisps */}
            <g className="animate-pulse" opacity="0.75">
              <path
                d="M36,128 Q44,104 38,90 Q46,106 50,122 Z"
                fill="#4ade80"
                filter="blur(3px)"
              />
              <path
                d="M124,128 Q116,104 122,90 Q114,106 110,122 Z"
                fill="#4ade80"
                filter="blur(3px)"
              />
              <path
                d="M74,136 Q80,108 76,98 Q84,112 86,132 Z"
                fill="#86efac"
                filter="blur(2.5px)"
              />
            </g>

            {/* Base Emerald Jewel Crate Facets */}
            {/* Top Face */}
            <polygon points="80,24 138,53 80,82 22,53" fill="url(#emerald-top)" />
            {/* Left Face */}
            <polygon points="22,53 80,82 80,136 22,107" fill="url(#emerald-left)" />
            {/* Right Face */}
            <polygon points="80,82 138,53 138,107 80,136" fill="url(#emerald-right)" />

            {/* Ornate Gold Filigree Inset Borders */}
            <polygon
              points="78,30 130,55 80,76 30,55"
              stroke="url(#gold-filigree)"
              strokeWidth="1.8"
              fill="none"
              opacity="0.85"
            />
            <polygon
              points="28,58 74,81 74,128 28,104"
              stroke="url(#gold-filigree)"
              strokeWidth="1.6"
              fill="none"
              opacity="0.8"
            />
            <polygon
              points="86,81 132,58 132,104 86,128"
              stroke="url(#gold-filigree)"
              strokeWidth="1.6"
              fill="none"
              opacity="0.8"
            />

            {/* Corner Ornate Gold Brackets */}
            <polygon points="22,53 30,53 30,60 25,60 22,56" fill="url(#gold-filigree)" />
            <polygon points="138,53 130,53 130,60 135,60 138,56" fill="url(#gold-filigree)" />
            <polygon points="80,24 86,27 80,30 74,27" fill="url(#gold-filigree)" />
            <polygon points="80,82 86,79 80,86 74,79" fill="url(#gold-filigree)" />

            {/* Thick Gold Ribbon Cross (+) */}
            {/* Strip 1: Top-Left to Bottom-Right */}
            <polygon points="46,42 58,36 114,64 102,70" fill="url(#gold-filigree)" />
            <polygon points="50,40 54,38 110,66 106,68" fill="#fffbeb" opacity="0.6" />

            {/* Strip 2: Top-Right to Bottom-Left */}
            <polygon points="114,42 102,36 46,64 58,70" fill="url(#gold-filigree)" />
            <polygon points="110,40 106,38 50,66 54,68" fill="#fffbeb" opacity="0.6" />

            {/* Gold Ribbon Wrapping Down Left & Right Faces */}
            <polygon points="46,64 58,70 58,92 46,86" fill="url(#gold-filigree)" />
            <polygon points="102,70 114,64 114,86 102,92" fill="url(#gold-filigree)" />

            {/* Center Emerald Gem Brooch with Gold Bezel (Reference: Lv5) */}
            {/* Gold Bezel Frame */}
            <polygon points="80,45 88,49 88,57 80,61 72,57 72,49" fill="url(#gold-filigree)" stroke="#78350f" strokeWidth="0.8" />
            {/* Faceted Emerald Gemstone */}
            <polygon points="80,47 86,50 86,56 80,59 74,56 74,50" fill="url(#emerald-gem-rad)" />
            {/* Gem facet reflections */}
            <polygon points="80,47 86,50 80,53 74,50" fill="#a7f3d0" opacity="0.85" />
            <circle cx="78" cy="50" r="1.2" fill="#ffffff" />

            {/* Magic Green Fire Sparkles & Embers */}
            <path
              d="M32,40 L34,44 L38,44 L35,47 L36,51 L32,48 L28,51 L29,47 L26,44 L30,44 Z"
              fill="#86efac"
              filter="drop-shadow(0 0 4px #4ade80)"
              className="animate-pulse"
            />
            <circle cx="128" cy="42" r="2.8" fill="#4ade80" filter="drop-shadow(0 0 4px #22c55e)" className="animate-pulse" />
            <circle cx="80" cy="12" r="2.4" fill="#bbf7d0" filter="drop-shadow(0 0 3px #4ade80)" />
            <circle cx="138" cy="92" r="2" fill="#86efac" />
            <circle cx="20" cy="90" r="2" fill="#86efac" />
          </g>
        )}

        {/* ======================================================================= */}
        {/* LEVEL 6: VETERAN - RUBY RED BOX WITH RED GEMS ON CORNERS                */}
        {/* ======================================================================= */}
        {lvl === 6 && (
          <g>
            <ellipse cx="80" cy="138" rx="44" ry="11" fill="rgba(0,0,0,0.55)" filter="blur(6px)" />
            <polygon points="80,24 138,53 80,82 22,53" fill="url(#ruby-top)" />
            <polygon points="22,53 80,82 80,136 22,107" fill="url(#ruby-left)" />
            <polygon points="80,82 138,53 138,107 80,136" fill="url(#ruby-right)" />

            <line x1="80" y1="82" x2="80" y2="136" stroke="#250404" strokeWidth="2" />
            <line x1="22" y1="53" x2="80" y2="82" stroke="#fca5a5" strokeWidth="1.5" opacity="0.8" />
            <line x1="80" y1="82" x2="138" y2="53" stroke="#7f1d1d" strokeWidth="1.5" opacity="0.6" />

            {/* Gold Stud Brackets Holding Faceted Red Ruby Gems */}
            {/* Center vertex gem */}
            <rect x="74" y="76" width="12" height="12" rx="3" fill="url(#gold-filigree)" />
            <circle cx="80" cy="82" r="4" fill="url(#ruby-gem)" stroke="#ffe4e6" strokeWidth="0.8" />

            {/* Left corner gem */}
            <rect x="18" y="48" width="10" height="10" rx="2" fill="url(#gold-filigree)" />
            <circle cx="23" cy="53" r="3.2" fill="url(#ruby-gem)" stroke="#ffe4e6" strokeWidth="0.6" />

            {/* Right corner gem */}
            <rect x="132" y="48" width="10" height="10" rx="2" fill="url(#gold-filigree)" />
            <circle cx="137" cy="53" r="3.2" fill="url(#ruby-gem)" stroke="#ffe4e6" strokeWidth="0.6" />

            {/* Top vertex gem */}
            <rect x="75" y="19" width="10" height="10" rx="2" fill="url(#gold-filigree)" />
            <circle cx="80" cy="24" r="3.2" fill="url(#ruby-gem)" />

            {/* Bottom corner gems */}
            <rect x="75" y="129" width="10" height="10" rx="2" fill="url(#gold-filigree)" />
            <circle cx="80" cy="134" r="3.2" fill="url(#ruby-gem)" />
          </g>
        )}

        {/* ======================================================================= */}
        {/* LEVEL 7: MASTER - OBSIDIAN BLACK BOX WITH PURPLE NEON GLOWING EDGES    */}
        {/* ======================================================================= */}
        {lvl === 7 && (
          <g>
            <ellipse cx="80" cy="138" rx="46" ry="12" fill="rgba(217, 70, 239, 0.3)" filter="blur(10px)" />
            <polygon points="80,24 138,53 80,82 22,53" fill="url(#cyber-top)" />
            <polygon points="22,53 80,82 80,136 22,107" fill="url(#cyber-left)" />
            <polygon points="80,82 138,53 138,107 80,136" fill="url(#cyber-right)" />

            {/* Neon Glowing Edges */}
            <polygon
              points="80,24 138,53 80,82 22,53"
              stroke="#d946ef"
              strokeWidth="2.5"
              fill="none"
              filter="drop-shadow(0 0 6px #d946ef)"
            />
            <line x1="80" y1="82" x2="80" y2="136" stroke="#d946ef" strokeWidth="2.5" filter="drop-shadow(0 0 6px #d946ef)" />
            <line x1="22" y1="53" x2="22" y2="107" stroke="#a855f7" strokeWidth="2" filter="drop-shadow(0 0 4px #a855f7)" />
            <line x1="138" y1="53" x2="138" y2="107" stroke="#a855f7" strokeWidth="2" filter="drop-shadow(0 0 4px #a855f7)" />
            <line x1="22" y1="107" x2="80" y2="136" stroke="#c026d3" strokeWidth="2" />
            <line x1="80" y1="136" x2="138" y2="107" stroke="#c026d3" strokeWidth="2" />

            {/* Circuit traces */}
            <polygon points="34,62 74,82 74,124 34,104" stroke="#f472b6" strokeWidth="1" fill="none" opacity="0.6" strokeDasharray="12 4 4 4" />
            <polygon points="86,82 126,62 126,104 86,124" stroke="#f472b6" strokeWidth="1" fill="none" opacity="0.6" strokeDasharray="12 4 4 4" />
          </g>
        )}

        {/* ======================================================================= */}
        {/* LEVEL 8: CHAMPION - BLACK MARBLE BOX WITH GOLD KING CORNERS             */}
        {/* ======================================================================= */}
        {lvl === 8 && (
          <g>
            <ellipse cx="80" cy="138" rx="44" ry="11" fill="rgba(0,0,0,0.6)" filter="blur(6px)" />
            <polygon points="80,24 138,53 80,82 22,53" fill="url(#marble-top)" />
            <polygon points="22,53 80,82 80,136 22,107" fill="url(#marble-left)" />
            <polygon points="80,82 138,53 138,107 80,136" fill="url(#marble-right)" />

            {/* Marble Veins */}
            <path d="M40,34 Q65,47 75,40 T95,57" stroke="#94a3b8" strokeWidth="0.8" fill="none" opacity="0.35" />
            <path d="M35,74 Q55,84 50,109 T65,124" stroke="#eab308" strokeWidth="0.7" fill="none" opacity="0.35" />

            {/* Regal Ornate Gold King Corner Brackets */}
            <path d="M72,76 L80,70 L88,76 L88,90 L80,96 L72,90 Z" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="1" />
            <path d="M18,48 L26,45 L26,59 L18,65 Z" fill="url(#gold-boss)" />
            <path d="M134,45 L142,48 L142,65 L134,59 Z" fill="url(#gold-boss)" />
            <path d="M74,128 L80,124 L86,128 L86,138 L80,141 L74,138 Z" fill="url(#gold-boss)" />

            {/* Gold trims */}
            <polygon points="80,24 136,52 80,80 24,52" stroke="url(#gold-boss)" strokeWidth="1.4" fill="none" opacity="0.8" />
          </g>
        )}

        {/* ======================================================================= */}
        {/* LEVEL 9: LEGEND - GIANT PURE CUT DIAMOND CRYSTAL WITH INTENSE SPARKLES  */}
        {/* ======================================================================= */}
        {lvl === 9 && (
          <g>
            <ellipse cx="80" cy="80" rx="60" ry="60" fill="url(#dia-center)" opacity="0.25" filter="blur(16px)" />

            {/* Brilliant Diamond Octahedron Facets */}
            {/* Top Table Facet */}
            <polygon points="80,18 115,45 80,72 45,45" fill="#ffffff" />
            {/* Kite Facets */}
            <polygon points="45,45 80,18 20,68" fill="url(#dia-facet-left)" />
            <polygon points="80,18 115,45 140,68" fill="url(#dia-facet-right)" />
            {/* Upper Star Facets */}
            <polygon points="80,72 45,45 20,68 80,92" fill="#d9f2fe" />
            <polygon points="80,72 115,45 140,68 80,92" fill="#bae6fd" />
            {/* Lower Pavilion Facets */}
            <polygon points="20,68 80,92 80,142" fill="url(#dia-facet-left)" />
            <polygon points="140,68 80,92 80,142" fill="url(#dia-facet-right)" />

            {/* Prismatic Shimmer Facet Lines */}
            <line x1="80" y1="18" x2="80" y2="142" stroke="#ffffff" strokeWidth="2" opacity="0.95" />
            <line x1="20" y1="68" x2="140" y2="68" stroke="#ffffff" strokeWidth="1.5" opacity="0.85" />
            <line x1="45" y1="45" x2="115" y2="45" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />

            {/* Brilliant Diamond Star Sparkles */}
            <g className="animate-pulse">
              <path
                d="M80,8 L83,16 L91,16 L85,21 L87,29 L80,24 L73,29 L75,21 L69,16 L77,16 Z"
                fill="#ffffff"
                filter="drop-shadow(0 0 5px #bae6fd)"
              />
              <circle cx="136" cy="66" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 3px #bae6fd)" />
              <circle cx="24" cy="66" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 3px #bae6fd)" />
            </g>
          </g>
        )}

        {/* ======================================================================= */}
        {/* LEVEL 10: BOSS - GOLDEN PIRATE TREASURE CHEST + DIAMONDS & GOLD COINS   */}
        {/* ======================================================================= */}
        {lvl === 10 && (
          <g>
            {/* Golden Radiance Aura Behind Chest */}
            <ellipse cx="80" cy="85" rx="66" ry="46" fill="url(#chest-radiance)" filter="blur(16px)" />
            <ellipse cx="80" cy="136" rx="54" ry="16" fill="rgba(245, 158, 11, 0.4)" filter="blur(10px)" />

            {/* Arched Domed Barrel Lid (Curved 3D Wood Planks) */}
            <path
              d="M26,38 C26,20 52,14 80,14 C108,14 134,20 134,38 L136,58 C108,48 52,48 24,58 Z"
              fill="url(#chest-wood-arch)"
              stroke="url(#gold-boss)"
              strokeWidth="2.2"
            />

            {/* Horizontal Wood Grain Creases on Lid */}
            <path d="M25,48 C52,38 108,38 135,48" stroke="#381503" strokeWidth="1.2" opacity="0.6" />
            <path d="M27,34 C52,24 108,24 133,34" stroke="#381503" strokeWidth="1.2" opacity="0.6" />

            {/* Arched Studded Gold Straps across Domed Lid */}
            {/* Left Strap */}
            <path d="M48,22 C46,34 44,46 42,56" stroke="url(#gold-boss)" strokeWidth="6" strokeLinecap="round" />
            <circle cx="47" cy="28" r="1.6" fill="#ffffff" />
            <circle cx="44" cy="42" r="1.6" fill="#ffffff" />
            <circle cx="42" cy="54" r="1.6" fill="#ffffff" />

            {/* Center Strap */}
            <path d="M80,14 L80,52" stroke="url(#gold-boss)" strokeWidth="6.5" strokeLinecap="round" />
            <circle cx="80" cy="22" r="1.8" fill="#ffffff" />
            <circle cx="80" cy="36" r="1.8" fill="#ffffff" />

            {/* Right Strap */}
            <path d="M112,22 C114,34 116,46 118,56" stroke="url(#gold-boss)" strokeWidth="6" strokeLinecap="round" />
            <circle cx="113" cy="28" r="1.6" fill="#ffffff" />
            <circle cx="116" cy="42" r="1.6" fill="#ffffff" />
            <circle cx="118" cy="54" r="1.6" fill="#ffffff" />

            {/* Lid Rim Gold Molding */}
            <path d="M24,58 C52,48 108,48 136,58" stroke="url(#gold-boss)" strokeWidth="3" />

            {/* Lower Main Box Body (Rich Mahogany Planks) */}
            <polygon points="26,58 134,58 126,124 34,124" fill="url(#chest-wood-front)" stroke="url(#gold-boss)" strokeWidth="2" />

            {/* Horizontal Plank Seams */}
            <line x1="28" y1="80" x2="132" y2="80" stroke="#2a0d01" strokeWidth="1.4" />
            <line x1="31" y1="102" x2="129" y2="102" stroke="#2a0d01" strokeWidth="1.4" />

            {/* Heavy Studded Gold Vertical Straps on Body */}
            <rect x="42" y="58" width="10" height="66" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="0.8" />
            <rect x="108" y="58" width="10" height="66" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="0.8" />
            <rect x="26" y="116" width="108" height="8" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="0.8" />

            {/* Corner Gold Studded Reinforcements */}
            <polygon points="26,58 36,58 34,74 27,74" fill="url(#gold-boss)" />
            <polygon points="134,58 124,58 126,74 133,74" fill="url(#gold-boss)" />

            {/* Gold Stud Rivets along Straps */}
            <circle cx="47" cy="68" r="1.8" fill="#fef08a" stroke="#78350f" strokeWidth="0.4" />
            <circle cx="47" cy="90" r="1.8" fill="#fef08a" stroke="#78350f" strokeWidth="0.4" />
            <circle cx="47" cy="110" r="1.8" fill="#fef08a" stroke="#78350f" strokeWidth="0.4" />

            <circle cx="113" cy="68" r="1.8" fill="#fef08a" stroke="#78350f" strokeWidth="0.4" />
            <circle cx="113" cy="90" r="1.8" fill="#fef08a" stroke="#78350f" strokeWidth="0.4" />
            <circle cx="113" cy="110" r="1.8" fill="#fef08a" stroke="#78350f" strokeWidth="0.4" />

            {/* Center Ornate Gold Escutcheon with Keyhole & Blue Diamond Gem */}
            <path
              d="M71,58 L89,58 L86,88 L80,94 L74,88 Z"
              fill="url(#gold-boss)"
              stroke="#78350f"
              strokeWidth="1.2"
            />
            {/* Dark Keyhole */}
            <circle cx="80" cy="82" r="3" fill="#1c0a02" />
            <polygon points="79,84 81,84 81.5,88 78.5,88" fill="#1c0a02" />

            {/* Center Faceted Blue Diamond Gemstone on Escutcheon (Reference: Boss Chest) */}
            <polygon points="80,62 86,68 80,76 74,68" fill="url(#blue-diamond-gem)" stroke="#e0f2fe" strokeWidth="1" />
            <polygon points="80,62 86,68 80,71 74,68" fill="#bae6fd" opacity="0.8" />
            <circle cx="78" cy="66" r="1" fill="#ffffff" />

            {/* Secondary Blue Diamond Gems on Left & Right Brackets */}
            <polygon points="47,72 50,76 47,81 44,76" fill="url(#blue-diamond-gem)" stroke="#fef08a" strokeWidth="0.6" />
            <polygon points="113,72 116,76 113,81 110,76" fill="url(#blue-diamond-gem)" stroke="#fef08a" strokeWidth="0.6" />

            {/* Cascading Golden Pirate Coins Overflowing at Base */}
            <ellipse cx="38" cy="128" rx="8" ry="4" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="0.6" />
            <ellipse cx="52" cy="130" rx="8" ry="4" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="0.6" />
            <ellipse cx="68" cy="129" rx="8.5" ry="4.5" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="0.6" />
            <ellipse cx="86" cy="130" rx="8" ry="4" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="0.6" />
            <ellipse cx="104" cy="128" rx="8" ry="4" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="0.6" />
            <ellipse cx="120" cy="126" rx="7" ry="3.5" fill="url(#gold-boss)" stroke="#78350f" strokeWidth="0.6" />

            {/* Foreground Glistening Gold Coins */}
            <ellipse cx="60" cy="134" rx="7.5" ry="4" fill="#fef08a" stroke="#b45309" strokeWidth="0.6" />
            <ellipse cx="94" cy="135" rx="7.5" ry="4" fill="#fef08a" stroke="#b45309" strokeWidth="0.6" />
            <ellipse cx="78" cy="136" rx="8" ry="4" fill="#facc15" stroke="#b45309" strokeWidth="0.6" />

            {/* Spilled Blue Diamond at Base */}
            <polygon points="112,132 116,128 120,132 116,136" fill="url(#blue-diamond-gem)" stroke="#ffffff" strokeWidth="0.6" />

            {/* Golden Star Sparkles & Gleams */}
            <path
              d="M80,6 L82,12 L88,12 L83,16 L85,22 L80,18 L75,22 L77,16 L72,12 L78,12 Z"
              fill="#fef08a"
              filter="drop-shadow(0 0 4px #facc15)"
              className="animate-pulse"
            />
            <circle cx="132" cy="46" r="2.5" fill="#fde047" className="animate-pulse" />
            <circle cx="28" cy="46" r="2.5" fill="#fde047" className="animate-pulse" />
          </g>
        )}

        {/* ======================================================================= */}
        {/* YELLOW GLINT ANIMATION SWEEP OVERLAY                                    */}
        {/* ======================================================================= */}
        {isGlinting && (
          <g className="animate-glint-sweep pointer-events-none">
            <rect x="0" y="0" width="160" height="160" fill="url(#glint-grad)" />
            {/* Sparkle star at glint peak */}
            <path
              d="M80,45 L83,55 L93,58 L83,61 L80,71 L77,61 L67,58 L77,55 Z"
              fill="#ffffff"
              filter="drop-shadow(0 0 6px #fde047)"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

export default CrateVisual;
