import React from 'react';

interface CrateVisualProps {
  level: number;
  isGlinting?: boolean;
  isFloating?: boolean;
  delayIndex?: number;
}

// The crate shown in the game uses the real box artwork (public/boxes/lv1..lv10.webp), the same as Box Designs.
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
      style={{ animationDelay: floatDelay }}
    >
      <div
        className="absolute -bottom-1 inset-x-3 h-4 rounded-full blur-md opacity-90 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, var(--box-glow, rgba(255,193,7,.45)) 0%, rgba(0,0,0,.55) 70%, transparent 100%)' }}
      />
      <img
        src={`/boxes/lv${lvl}.webp`}
        alt=""
        draggable={false}
        className="relative w-full h-full object-contain pointer-events-none"
        style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.55))' }}
      />
      {isGlinting && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="absolute w-3/4 h-3/4 rounded-full animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(253,224,71,.55) 0%, rgba(253,224,71,.18) 45%, transparent 70%)' }}
          />
          <svg viewBox="0 0 160 160" className="absolute w-full h-full">
            <path
              d="M80,45 L83,55 L93,58 L83,61 L80,71 L77,61 L67,58 L77,55 Z"
              fill="#ffffff"
              filter="drop-shadow(0 0 6px #fde047)"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default CrateVisual;
