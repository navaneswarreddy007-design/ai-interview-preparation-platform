/**
 * PrepForge Web Audio API Sound Effects Synthesizer
 * Zero-dependency, 100% royalty-free synthesized audio telemetry.
 * Subtle, cinematic, and non-intrusive.
 */

class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try {
      const savedMute = localStorage.getItem('prepforge_audio_muted');
      this.muted = savedMute === 'true';
    } catch (e) {
      this.muted = false;
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    try {
      localStorage.setItem('prepforge_audio_muted', String(this.muted));
    } catch (e) {}
  }

  isMuted() {
    return this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.04) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay restriction or unsupported
    }
  }

  // Soft high tech blip on button click / focus
  playClick() {
    this.playTone(1200, 'sine', 0.04, 0.02);
  }

  // Dual tone ascending chime when microphone turns on
  playMicStart() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [440, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.04, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.09);
      });
    } catch (e) {}
  }

  // Descending dual chime when microphone stops
  playMicStop() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [780, 390].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.035, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.09);
      });
    } catch (e) {}
  }

  // Technical acknowledgment chirp
  playAcknowledge() {
    this.playTone(980, 'triangle', 0.07, 0.03);
  }

  // Harmonious completion chord when interview completes or evaluation finishes
  playSuccess() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      });
    } catch (e) {}
  }

  // Low subtle caution alert
  playAlert() {
    this.playTone(280, 'sawtooth', 0.12, 0.025);
  }
}

export const soundFX = new SoundFX();
