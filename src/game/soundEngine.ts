/**
 * Zero-latency Web Audio engine for Dino Runner friend profiles
 */

import { FriendProfile } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private currentBuffers: Map<string, AudioBuffer> = new Map();
  private loadedProfileId: string | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.85;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.85, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Generates crisp synthesized AudioBuffer presets for friends
   */
  private generateSynthBuffer(
    type: 'jump' | 'duck' | 'gameover' | 'milestone',
    preset: FriendProfile['soundPreset']
  ): AudioBuffer {
    const ctx = this.initContext();
    const sampleRate = ctx.sampleRate;

    if (type === 'milestone') {
      // Classic Chrome dino milestone double-beep (100 pts)
      const duration = 0.35;
      const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        if (t < 0.12) {
          // First beep 659.25Hz (E5)
          const env = Math.sin((t / 0.12) * Math.PI);
          data[i] = Math.sin(2 * Math.PI * 659.25 * t) * env * 0.45;
        } else if (t > 0.15 && t < 0.32) {
          // Second higher beep 880Hz (A5)
          const localT = t - 0.15;
          const env = Math.sin((localT / 0.17) * Math.PI);
          data[i] = Math.sin(2 * Math.PI * 880 * localT) * env * 0.55;
        }
      }
      return buffer;
    }

    if (preset === 'cartoon-boing') {
      if (type === 'jump') {
        // Spring boing jump
        const duration = 0.28;
        const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 9);
          const freq = 220 + 360 * Math.sin(t * 32) + t * 450;
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
        }
        return buffer;
      } else if (type === 'duck') {
        // Comical slide-down whistle
        const duration = 0.22;
        const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const env = Math.min(1, t * 20) * (1 - t / duration);
          const freq = 520 - 320 * (t / duration);
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.4;
        }
        return buffer;
      } else {
        // Cartoon slide down + splat gameover
        const duration = 0.65;
        const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          if (t < 0.35) {
            const freq = 440 - 280 * (t / 0.35);
            data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / 0.35) * 0.45;
          } else {
            // Splat noise
            const noise = (Math.random() * 2 - 1) * Math.exp(-(t - 0.35) * 12);
            data[i] = noise * 0.5;
          }
        }
        return buffer;
      }
    }

    if (preset === 'synth-wave') {
      if (type === 'jump') {
        // Modern punchy synth pop
        const duration = 0.24;
        const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 12);
          const freq = 340 + 480 * Math.exp(-t * 24);
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
        }
        return buffer;
      } else if (type === 'duck') {
        // Resonant bass thud
        const duration = 0.18;
        const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 18);
          const freq = 160 - 80 * (t / duration);
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.6;
        }
        return buffer;
      } else {
        // Dramatic low descending synth crash
        const duration = 0.7;
        const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 4);
          const osc1 = Math.sin(2 * Math.PI * (180 - 120 * t) * t);
          const osc2 = Math.sin(2 * Math.PI * (135 - 90 * t) * t);
          const noise = (Math.random() * 2 - 1) * 0.15 * Math.exp(-t * 8);
          data[i] = (osc1 * 0.3 + osc2 * 0.3 + noise) * env;
        }
        return buffer;
      }
    }

    // Default 'retro-arcade' or '8bit-hero' (Alex)
    if (type === 'jump') {
      // Classic 8-bit rising square chirp
      const duration = 0.18;
      const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = 280 + 520 * (t / duration);
        const env = 1 - t / duration;
        // Square wave
        const raw = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.35 : -0.35;
        data[i] = raw * env;
      }
      return buffer;
    } else if (type === 'duck') {
      // Quick pitch drop click
      const duration = 0.15;
      const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = 360 - 200 * (t / duration);
        const env = Math.exp(-t * 22);
        const raw = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.28 : -0.28;
        data[i] = raw * env;
      }
      return buffer;
    } else {
      // Retro crash noise + descending tones
      const duration = 0.55;
      const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 5.5);
        const noise = (Math.random() * 2 - 1) * 0.35;
        const toneFreq = 260 - 180 * (t / duration);
        const tone = Math.sin(2 * Math.PI * toneFreq * t) > 0 ? 0.25 : -0.25;
        data[i] = (noise * 0.6 + tone * 0.4) * env;
      }
      return buffer;
    }
  }

  /**
   * Preloads and decodes sound assets for a friend profile.
   * If a custom sound file / URL is present, it attempts to fetch and decode it;
   * otherwise, it generates the pre-rendered synthesized buffer so zero latency is guaranteed.
   */
  public async preloadProfileAssets(profile: FriendProfile): Promise<void> {
    const ctx = this.initContext();
    this.loadedProfileId = profile.id;
    this.currentBuffers.clear();

    // Cache milestone sound
    this.currentBuffers.set('milestone', this.generateSynthBuffer('milestone', profile.soundPreset));

    const events: Array<'jump' | 'duck' | 'gameover'> = ['jump', 'duck', 'gameover'];

    for (const evt of events) {
      const customSound = profile.customSounds?.[evt];
      const soundPath = customSound?.dataUrl || profile.soundPaths[evt];

      let decodedBuffer: AudioBuffer | null = null;

      if (soundPath && (soundPath.startsWith('data:') || soundPath.startsWith('blob:') || soundPath.startsWith('http'))) {
        try {
          const res = await fetch(soundPath);
          const arrayBuffer = await res.arrayBuffer();
          decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        } catch {
          // If decoding custom path fails or is an offline relative path, fall back to synthesized preset
          decodedBuffer = null;
        }
      }

      if (!decodedBuffer) {
        decodedBuffer = this.generateSynthBuffer(evt, profile.soundPreset);
      }

      this.currentBuffers.set(evt, decodedBuffer);
    }
  }

  /**
   * Plays a preloaded sound with ZERO latency
   */
  public play(event: 'jump' | 'duck' | 'gameover' | 'milestone'): void {
    if (this.isMuted) return;

    const ctx = this.initContext();
    const buffer = this.currentBuffers.get(event);
    if (!buffer) return;

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain || ctx.destination);
      source.start(0);
    } catch {
      // Audio node play safe catch
    }
  }

  /**
   * Previews a specific sound event for any profile (useful on profile selector screen)
   */
  public async previewSound(profile: FriendProfile, event: 'jump' | 'duck' | 'gameover'): Promise<void> {
    const ctx = this.initContext();
    if (this.isMuted) return;

    const customSound = profile.customSounds?.[event];
    const soundPath = customSound?.dataUrl || profile.soundPaths[event];

    let buffer: AudioBuffer | null = null;
    if (soundPath && (soundPath.startsWith('data:') || soundPath.startsWith('blob:') || soundPath.startsWith('http'))) {
      try {
        const res = await fetch(soundPath);
        const arrayBuf = await res.arrayBuffer();
        buffer = await ctx.decodeAudioData(arrayBuf);
      } catch {
        buffer = null;
      }
    }

    if (!buffer) {
      buffer = this.generateSynthBuffer(event, profile.soundPreset);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain || ctx.destination);
    source.start(0);
  }
}

export const soundEngine = new SoundEngine();
