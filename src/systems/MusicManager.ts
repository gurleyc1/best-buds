/**
 * MusicManager — Web Audio API based music and SFX system.
 * No external files required. Everything generated procedurally.
 */
export class MusicManager {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static musicGain: GainNode | null = null;
  private static sfxGain: GainNode | null = null;
  private static scheduledNodes: AudioNode[] = [];
  private static musicInterval: ReturnType<typeof setInterval> | null = null;
  private static currentTheme: string = '';
  private static beatIndex = 0;
  private static isPlaying = false;
  private static musicVolume = 0.35;
  private static sfxVolume = 0.6;

  // ─── Note frequencies ─────────────────────────────────────────────────────
  private static readonly NOTES: Record<string, number> = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50,
    R: 0, // rest
  };

  // ─── Init ──────────────────────────────────────────────────────────────────
  static init(): void {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);
  }

  static resume(): void {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  // ─── Music themes ──────────────────────────────────────────────────────────

  static playTheme(theme: string): void {
    if (!this.ctx) this.init();
    if (this.currentTheme === theme && this.isPlaying) return;
    this.stopMusic();
    this.currentTheme = theme;
    this.isPlaying = true;
    this.beatIndex = 0;

    const BPM = 128;
    const beatMs = (60 / BPM) * 1000;

    const sequence = this.getThemeSequence(theme);
    if (!sequence) return;

    const tick = () => {
      if (!this.isPlaying) return;
      const step = this.beatIndex % sequence.length;
      this.playStep(sequence[step]);
      this.beatIndex++;
    };

    tick();
    this.musicInterval = setInterval(tick, beatMs / 2); // 16th notes at BPM/2
  }

  static stopMusic(): void {
    this.isPlaying = false;
    this.currentTheme = '';
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // ─── Theme sequences ───────────────────────────────────────────────────────
  // Each step is { melody?, bass?, chord? } with note names
  // Progression: C major pop (I-V-vi-IV = C-G-Am-F)

  private static getThemeSequence(theme: string): Array<{
    melody?: string; bass?: string; chord?: string[]; arp?: string;
  }> | null {
    if (theme === 'hub') {
      // Upbeat, cheerful neighborhood theme — bouncy pop feel
      return [
        // Bar 1 — C major
        { melody: 'E5', bass: 'C3', chord: ['C4','E4','G4'] },
        { melody: 'R',  arp: 'G4' },
        { melody: 'G5', bass: 'C3' },
        { melody: 'R',  arp: 'E4' },
        { melody: 'E5', bass: 'G3', chord: ['G3','B3','D4'] },
        { melody: 'R',  arp: 'D4' },
        { melody: 'D5', bass: 'G3' },
        { melody: 'R',  arp: 'B3' },
        // Bar 2 — Am
        { melody: 'C5', bass: 'A3', chord: ['A3','C4','E4'] },
        { melody: 'R',  arp: 'E4' },
        { melody: 'E5', bass: 'A3' },
        { melody: 'R',  arp: 'C4' },
        // Bar 3 — F major
        { melody: 'F5', bass: 'F3', chord: ['F3','A3','C4'] },
        { melody: 'R',  arp: 'A3' },
        { melody: 'E5', bass: 'F3' },
        { melody: 'D5', arp: 'C4' },
        // Bar 4 — back to C
        { melody: 'C5', bass: 'C3', chord: ['C4','E4','G4'] },
        { melody: 'B4', arp: 'G4' },
        { melody: 'A4', bass: 'C3' },
        { melody: 'G4', arp: 'E4' },
        { melody: 'A4', bass: 'G3', chord: ['G3','B3','D4'] },
        { melody: 'R',  arp: 'D4' },
        { melody: 'B4', bass: 'G3' },
        { melody: 'R',  arp: 'B3' },
        // Repeat
        { melody: 'C5', bass: 'A3', chord: ['A3','C4','E4'] },
        { melody: 'R',  arp: 'E4' },
        { melody: 'D5', bass: 'A3' },
        { melody: 'R',  arp: 'C4' },
        { melody: 'E5', bass: 'F3', chord: ['F3','A3','C4'] },
        { melody: 'F5', arp: 'A3' },
        { melody: 'E5', bass: 'F3' },
        { melody: 'D5', arp: 'C4' },
      ];
    }

    if (theme === 'tennis') {
      // Energetic, driving — faster feel
      return [
        { melody: 'G5', bass: 'G3', chord: ['G3','B3','D4'] },
        { melody: 'R',  arp: 'D4' },
        { melody: 'A5', bass: 'G3' },
        { melody: 'R',  arp: 'B3' },
        { melody: 'G5', bass: 'C3', chord: ['C4','E4','G4'] },
        { melody: 'E5', arp: 'G4' },
        { melody: 'D5', bass: 'C3' },
        { melody: 'C5', arp: 'E4' },
        { melody: 'D5', bass: 'D3', chord: ['D4','F4','A4'] },
        { melody: 'R',  arp: 'A4' },
        { melody: 'E5', bass: 'D3' },
        { melody: 'F5', arp: 'F4' },
        { melody: 'G5', bass: 'G3', chord: ['G3','B3','D4'] },
        { melody: 'A5', arp: 'D4' },
        { melody: 'G5', bass: 'G3' },
        { melody: 'R',  arp: 'B3' },
      ];
    }

    if (theme === 'soccer') {
      // Exciting, stadium feel
      return [
        { melody: 'C5', bass: 'C3', chord: ['C4','E4','G4'] },
        { melody: 'E5', arp: 'G4' },
        { melody: 'G5', bass: 'C3' },
        { melody: 'R',  arp: 'E4' },
        { melody: 'F5', bass: 'F3', chord: ['F3','A3','C4'] },
        { melody: 'E5', arp: 'C4' },
        { melody: 'D5', bass: 'F3' },
        { melody: 'C5', arp: 'A3' },
        { melody: 'E5', bass: 'G3', chord: ['G3','B3','D4'] },
        { melody: 'G5', arp: 'D4' },
        { melody: 'A5', bass: 'G3' },
        { melody: 'G5', arp: 'B3' },
        { melody: 'F5', bass: 'C3', chord: ['C4','E4','G4'] },
        { melody: 'E5', arp: 'G4' },
        { melody: 'D5', bass: 'G3' },
        { melody: 'C5', arp: 'B3' },
      ];
    }

    if (theme === 'marble') {
      // Gentle, curious, playful — xylophone feel
      return [
        { melody: 'C5', bass: 'C4' },
        { melody: 'E5' },
        { melody: 'G5', bass: 'G3' },
        { melody: 'E5' },
        { melody: 'D5', bass: 'F3' },
        { melody: 'F5' },
        { melody: 'A5', bass: 'A3' },
        { melody: 'F5' },
        { melody: 'E5', bass: 'C3' },
        { melody: 'G5' },
        { melody: 'C6', bass: 'G3' },
        { melody: 'G5' },
        { melody: 'A5', bass: 'F3' },
        { melody: 'F5' },
        { melody: 'G5', bass: 'G3' },
        { melody: 'E5' },
      ];
    }

    if (theme === 'keepy') {
      // Light, bouncy, fun
      return [
        { melody: 'G4', bass: 'C3', chord: ['C4','E4','G4'] },
        { melody: 'A4', arp: 'E4' },
        { melody: 'B4', bass: 'C3' },
        { melody: 'C5', arp: 'G4' },
        { melody: 'D5', bass: 'G3', chord: ['G3','D4','B3'] },
        { melody: 'C5', arp: 'D4' },
        { melody: 'B4', bass: 'G3' },
        { melody: 'A4', arp: 'B3' },
        { melody: 'C5', bass: 'A3', chord: ['A3','C4','E4'] },
        { melody: 'B4', arp: 'E4' },
        { melody: 'A4', bass: 'A3' },
        { melody: 'G4', arp: 'C4' },
        { melody: 'A4', bass: 'F3', chord: ['F3','A3','C4'] },
        { melody: 'B4', arp: 'A3' },
        { melody: 'C5', bass: 'F3' },
        { melody: 'D5', arp: 'C4' },
      ];
    }

    return null;
  }

  // ─── Play a sequencer step ─────────────────────────────────────────────────

  private static playStep(step: {
    melody?: string; bass?: string; chord?: string[]; arp?: string;
  }): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const bps = 128 / 60;
    const dur = 1 / bps / 2; // 16th note duration

    if (step.melody && step.melody !== 'R') {
      this.playNote(this.NOTES[step.melody], dur * 0.9, 0.18, 'triangle', now, this.musicGain!);
    }
    if (step.bass) {
      this.playNote(this.NOTES[step.bass], dur * 1.8, 0.12, 'sine', now, this.musicGain!);
    }
    if (step.chord) {
      for (const n of step.chord) {
        this.playNote(this.NOTES[n], dur * 1.5, 0.055, 'sine', now + 0.005, this.musicGain!);
      }
    }
    if (step.arp) {
      this.playNote(this.NOTES[step.arp], dur * 0.7, 0.09, 'square', now + 0.008, this.musicGain!);
    }
  }

  private static playNote(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    startTime: number,
    destination: GainNode
  ): void {
    if (!this.ctx || freq === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // ADSR-like envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(volume * 0.7, startTime + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // ─── Sound effects ─────────────────────────────────────────────────────────

  static sfx(name: string): void {
    if (!this.ctx) this.init();
    this.resume();
    const ctx = this.ctx!;
    const out = this.sfxGain!;
    const now = ctx.currentTime;

    switch (name) {
      case 'hit':       return this.sfxHit(ctx, out, now);
      case 'bounce':    return this.sfxBounce(ctx, out, now);
      case 'goal':      return this.sfxGoal(ctx, out, now);
      case 'saved':     return this.sfxSaved(ctx, out, now);
      case 'point':     return this.sfxPoint(ctx, out, now);
      case 'miss':      return this.sfxMiss(ctx, out, now);
      case 'celebrate': return this.sfxCelebrate(ctx, out, now);
      case 'marble':    return this.sfxMarble(ctx, out, now);
      case 'balloon':   return this.sfxBalloon(ctx, out, now);
      case 'select':    return this.sfxSelect(ctx, out, now);
      case 'start':     return this.sfxStart(ctx, out, now);
      case 'wind':      return this.sfxWind(ctx, out, now);
    }
  }

  private static sfxHit(ctx: AudioContext, out: GainNode, t: number): void {
    // Tennis/volleyball hit — sharp thwack
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + 0.12);
  }

  private static sfxBounce(ctx: AudioContext, out: GainNode, t: number): void {
    // Ball bounce — soft thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + 0.18);
  }

  private static sfxGoal(ctx: AudioContext, out: GainNode, t: number): void {
    // GOAL! — ascending fanfare
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const st = t + i * 0.1;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.4, st + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
      osc.connect(gain); gain.connect(out);
      osc.start(st); osc.stop(st + 0.4);
    });
  }

  private static sfxSaved(ctx: AudioContext, out: GainNode, t: number): void {
    // Saved — descending short
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + 0.2);
  }

  private static sfxPoint(ctx: AudioContext, out: GainNode, t: number): void {
    // Score a point — cheerful ding
    [523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const st = t + i * 0.12;
      gain.gain.setValueAtTime(0.3, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
      osc.connect(gain); gain.connect(out);
      osc.start(st); osc.stop(st + 0.28);
    });
  }

  private static sfxMiss(ctx: AudioContext, out: GainNode, t: number): void {
    // Miss — descending sad tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.linearRampToValueAtTime(220, t + 0.2);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + 0.28);
  }

  private static sfxCelebrate(ctx: AudioContext, out: GainNode, t: number): void {
    // Milestone celebration — sparkle arpeggio
    const freqs = [523, 659, 784, 1047, 1319];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const st = t + i * 0.07;
      gain.gain.setValueAtTime(0.22, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
      osc.connect(gain); gain.connect(out);
      osc.start(st); osc.stop(st + 0.35);
    });
  }

  private static sfxMarble(ctx: AudioContext, out: GainNode, t: number): void {
    // Marble clinking through a piece — light xylophone hit
    const freq = 800 + Math.random() * 400;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + 0.2);
  }

  private static sfxBalloon(ctx: AudioContext, out: GainNode, t: number): void {
    // Balloon hit — soft poof
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(240, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.18);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + 0.22);
  }

  private static sfxSelect(ctx: AudioContext, out: GainNode, t: number): void {
    // Menu select — light click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain); gain.connect(out);
    osc.start(t); osc.stop(t + 0.08);
  }

  private static sfxStart(ctx: AudioContext, out: GainNode, t: number): void {
    // Game start — ascending 3-note fanfare
    [392, 523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const st = t + i * 0.13;
      gain.gain.setValueAtTime(0.3, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
      osc.connect(gain); gain.connect(out);
      osc.start(st); osc.stop(st + 0.3);
    });
  }

  private static sfxWind(ctx: AudioContext, out: GainNode, t: number): void {
    // Wind whoosh — noise
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    src.connect(filter); filter.connect(gain); gain.connect(out);
    src.start(t); src.stop(t + 0.32);
  }

  // ─── Volume controls ───────────────────────────────────────────────────────
  static setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }
  static setSfxVolume(v: number): void {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }
  static setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = v;
  }
}
