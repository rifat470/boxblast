import confetti from 'canvas-confetti';

// ---------------- Audio Synthesizer via Web Audio API ----------------
class SoundEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  playTap() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      /* ignore */
    }
  }

  playBlast(isGold: boolean = false) {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const notes = isGold ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isGold ? 'triangle' : 'sine';
        const startTime = this.ctx.currentTime + idx * 0.04;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch {
      /* ignore */
    }
  }

  playCoinDing() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, this.ctx.currentTime);
      osc.frequency.setValueAtTime(2093, this.ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch {
      /* ignore */
    }
  }

  playMiss() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      /* ignore */
    }
  }

  playLevelUp() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const chords = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      chords.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = this.ctx.currentTime + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.45);
      });
    } catch {
      /* ignore */
    }
  }
}

export const sound = new SoundEngine();

// ---------------- Confetti Burst ----------------
export function triggerConfetti(x: number, y: number, colors: string[]) {
  const normX = Math.max(0.1, Math.min(0.9, x / window.innerWidth));
  const normY = Math.max(0.1, Math.min(0.9, y / window.innerHeight));

  try {
    confetti({
      particleCount: 28,
      spread: 60,
      startVelocity: 25,
      origin: { x: normX, y: normY },
      colors: colors.length > 0 ? colors : ['#ffc107', '#ff9800', '#ffffff'],
      ticks: 120,
      gravity: 0.9,
      scalar: 0.8,
      disableForReducedMotion: true,
    });
  } catch {
    /* ignore */
  }
}

// ---------------- Flying Coins Animation ----------------
export function spawnFlyingCoins(
  fromX: number,
  fromY: number,
  targetEl: HTMLElement | null,
  onHit: () => void,
  coinCount: number = 4
) {
  if (!targetEl) {
    onHit();
    return;
  }

  const targetRect = targetEl.getBoundingClientRect();
  const destX = targetRect.left + targetRect.width / 2;
  const destY = targetRect.top + targetRect.height / 2;

  for (let i = 0; i < coinCount; i++) {
    const coin = document.createElement('div');
    coin.className = 'fixed z-50 pointer-events-none select-none';
    coin.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 border border-amber-200 shadow-[0_0_12px_rgba(250,204,21,0.85)] flex items-center justify-center text-amber-950 font-black text-[10px]">
        ★
      </div>
    `;

    // Start with slight random jitter
    const jitterX = (Math.random() - 0.5) * 28;
    const jitterY = (Math.random() - 0.5) * 28;
    const startX = fromX + jitterX;
    const startY = fromY + jitterY;

    coin.style.left = `${startX}px`;
    coin.style.top = `${startY}px`;
    coin.style.transform = 'translate(-50%, -50%) scale(0.6)';
    coin.style.opacity = '1';
    coin.style.transition = 'none';

    document.body.appendChild(coin);

    const delay = i * 65;
    setTimeout(() => {
      coin.style.transition = 'all 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2)';
      coin.style.left = `${destX}px`;
      coin.style.top = `${destY}px`;
      coin.style.transform = 'translate(-50%, -50%) scale(1)';

      setTimeout(() => {
        sound.playCoinDing();
        if (i === 0) onHit();
        coin.style.transition = 'all 0.15s ease-out';
        coin.style.opacity = '0';
        coin.style.transform = 'translate(-50%, -50%) scale(1.3)';
        setTimeout(() => coin.remove(), 160);
      }, 550);
    }, delay);
  }
}
