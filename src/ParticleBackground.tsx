import React, { useEffect, useRef } from 'react';
import { getLevelConfig } from './theme';

interface ParticleBackgroundProps {
  level: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  fadeSpeed: number;
  pulse: number;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ level }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const cfg = getLevelConfig(level);
    const particleCount = 28;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.8 + 1.2,
        speedY: -(Math.random() * 0.45 + 0.15),
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.2,
        fadeSpeed: (Math.random() * 0.008 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render subtle ambient level glow at bottom
      const gradient = ctx.createRadialGradient(
        width / 2,
        height * 0.6,
        10,
        width / 2,
        height * 0.6,
        width * 0.75
      );
      gradient.addColorStop(0, cfg.boxGlow);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Render particles
      ctx.fillStyle = cfg.particleColor;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;
        p.pulse += 0.03;

        // Wrap around bounds
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentOpacity = Math.max(
          0.1,
          Math.min(0.7, p.opacity + Math.sin(p.pulse) * 0.2)
        );

        ctx.save();
        ctx.globalAlpha = currentOpacity;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = cfg.particleColor;
        ctx.beginPath();

        if (cfg.lvl === 9) {
          // Diamond star shape
          const s = p.size * 1.5;
          ctx.moveTo(p.x, p.y - s);
          ctx.lineTo(p.x + s * 0.4, p.y);
          ctx.lineTo(p.x + s, p.y);
          ctx.lineTo(p.x + s * 0.5, p.y + s * 0.4);
          ctx.lineTo(p.x + s * 0.7, p.y + s);
          ctx.lineTo(p.x, p.y + s * 0.6);
          ctx.lineTo(p.x - s * 0.7, p.y + s);
          ctx.lineTo(p.x - s * 0.5, p.y + s * 0.4);
          ctx.lineTo(p.x - s, p.y);
          ctx.lineTo(p.x - s * 0.4, p.y);
          ctx.closePath();
          ctx.fill();
        } else if (cfg.lvl === 5) {
          // Flame wisp tear shape
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Ambient soft glowing circle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
      style={{
        background: '#0F1219',
      }}
    />
  );
};

export default ParticleBackground;
