import { SOUNDS } from '../core/soundDefs.js';

// WebAudio synthesizer for the game's procedural sound effects.
// The AudioContext is created lazily on the first user gesture (browser
// autoplay policy); every play() before that is silently dropped.

export class SoundPlayer {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.playCount = 0; // for tests / debugging
  }

  /** Create/resume the AudioContext. Call from a user-gesture handler. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      // 1s of shared white noise, looped slices for every noise burst.
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  play(name) {
    const def = SOUNDS[name];
    if (!def || !this.ctx || this.muted) return;
    this.playCount++;
    const t0 = this.ctx.currentTime;
    const jitter = 1 + (Math.random() - 0.5) * 2 * (def.jitter ?? 0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(def.volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + def.duration);
    gain.connect(this.master);

    if (def.type === 'tone') {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(def.freq * jitter, t0);
      if (def.slideTo) {
        osc.frequency.exponentialRampToValueAtTime(def.slideTo * jitter, t0 + def.duration);
      }
      osc.connect(gain);
      osc.start(t0);
      osc.stop(t0 + def.duration);
    } else {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      src.playbackRate.value = jitter;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = def.freq * jitter;
      filter.Q.value = def.q ?? 1;
      src.connect(filter);
      filter.connect(gain);
      src.start(t0, Math.random()); // random offset into the noise buffer
      src.stop(t0 + def.duration);
    }
  }
}
