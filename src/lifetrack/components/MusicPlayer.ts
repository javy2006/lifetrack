/**
 * Background music: one looping track (default "Cheery Monday", Kevin MacLeod, CC BY 4.0; see
 * docs/AUDIO_CREDITS.md), streamed from public/audio and routed through Web Audio gain nodes so
 * volume and fades work everywhere (iOS ignores HTMLAudioElement.volume).
 *
 * Seamless loop: at the loop point the song returns to its opening material, so a second element starts
 * from the top exactly there and the two overlap for a second while the first fades out; both
 * play the same notes, so the hand-over is inaudible. Only these two elements ever exist, and only
 * one plays outside that one-second overlap, so music never doubles up.
 *
 * Autoplay: nothing plays until `start()` is called from a user gesture; if the browser still
 * refuses, `blocked` is set and the next gesture retries (no error spam).
 */
import { audio } from './synthSounds.ts';

const OVERLAP = 1.0;
const FADE_IN = 1.6;
const FADE_OUT = 0.9;

export type MusicState = 'off' | 'waiting' | 'playing';

export class MusicPlayer {
  private els: HTMLAudioElement[] = [];
  private gains: GainNode[] = [];
  private active = 0;
  private level = 0;
  private duckUntil = 0;
  private wanted = false;
  private hidden = false;
  private timer: number | undefined;
  private handover: number | undefined;
  private stopTimer: number | undefined;
  state: MusicState = 'off';
  onState: (s: MusicState) => void = () => {};

  /** `loopEnd`: seconds where the track returns to its opening material (see scripts/assets/build_audio.py). */
  constructor(private url: string, private loopEnd: number) {}

  private setState(s: MusicState) { if (this.state !== s) { this.state = s; this.onState(s); } }

  private ensure(): AudioContext | null {
    const ctx = audio();
    if (!ctx) return null;
    if (this.els.length === 0) {
      for (let i = 0; i < 2; i++) {
        const el = new Audio(this.url);
        el.preload = i === 0 ? 'auto' : 'none';
        const g = ctx.createGain(); g.gain.value = 0;
        ctx.createMediaElementSource(el).connect(g).connect(ctx.destination);
        this.els.push(el); this.gains.push(g);
      }
    }
    return ctx;
  }

  private target() { return this.hidden ? 0 : this.level * (performance.now() < this.duckUntil ? 0.35 : 1); }

  private ramp(g: GainNode, to: number, seconds: number) {
    const ctx = audio(); if (!ctx) return;
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(to, now + seconds);
  }

  /** Desired music level (0 = off). Fades rather than jumping; starts playback only if already allowed. */
  setLevel(level: number) {
    this.level = level;
    this.wanted = level > 0;
    if (!this.wanted) { this.fadeOutAndPause(); this.setState('off'); return; }
    if (this.state === 'playing') this.ramp(this.gains[this.active]!, this.target(), FADE_IN / 2);
    else this.setState('waiting');
  }

  /** Call from a user gesture. Starts (or resumes) the music if it is wanted; safe to call repeatedly. */
  start() {
    if (!this.wanted || this.hidden) return;
    const ctx = this.ensure(); if (!ctx) return;
    window.clearTimeout(this.stopTimer);
    void ctx.resume().catch(() => {});
    const el = this.els[this.active]!;
    if (!el.paused && this.state === 'playing') return;
    el.play().then(() => {
      this.ramp(this.gains[this.active]!, this.target(), FADE_IN);
      this.setState('playing');
      this.schedule();
    }).catch(() => { this.setState('waiting'); /* blocked: the next gesture retries */ });
  }

  /** Briefly lowers the music under a jingle, then restores it. */
  duck(ms = 1500) {
    if (this.state !== 'playing') return;
    this.duckUntil = performance.now() + ms;
    this.ramp(this.gains[this.active]!, this.target(), 0.2);
    window.setTimeout(() => { if (this.state === 'playing') this.ramp(this.gains[this.active]!, this.target(), 0.8); }, ms);
  }

  /** Tab hidden: fade out and pause; visible again: resume with a fade (if still wanted). */
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) this.fadeOutAndPause(true);
    else if (this.wanted && this.els.length) this.start();
  }

  private fadeOutAndPause(keepWanted = false) {
    window.clearTimeout(this.timer); window.clearTimeout(this.handover);
    if (!this.els.length) return;
    for (const g of this.gains) this.ramp(g, 0, FADE_OUT);
    window.clearTimeout(this.stopTimer);
    this.stopTimer = window.setTimeout(() => {
      this.els.forEach((el) => el.pause());
      if (keepWanted && this.wanted) this.setState('waiting');
    }, FADE_OUT * 1000 + 50);
  }

  /** For QA: how many music elements are playing, which is active and its position. */
  debug() { return { state: this.state, playing: this.els.filter((e) => !e.paused).length, active: this.active, time: this.els[this.active]?.currentTime ?? 0, gains: this.gains.map((g) => Math.round(g.gain.value * 100) / 100) }; }
  /** For QA: jump close to the loop point to check the hand-over. */
  seekForTest(secondsBeforeLoop: number) { const el = this.els[this.active]; if (el) { el.currentTime = this.loopEnd - secondsBeforeLoop; this.schedule(); } }

  /** Waits for the loop point, then hands over to the other element (see the class comment). */
  private schedule() {
    window.clearTimeout(this.timer);
    const el = this.els[this.active]!;
    const remaining = this.loopEnd - el.currentTime;
    if (remaining > 0.6) { this.timer = window.setTimeout(() => this.schedule(), Math.min(5000, (remaining - 0.5) * 1000)); return; }
    this.timer = window.setTimeout(() => this.loop(), Math.max(0, remaining * 1000));
  }

  private loop() {
    if (this.state !== 'playing') return;
    const from = this.active, to = 1 - from;
    const a = this.els[from]!, b = this.els[to]!;
    b.currentTime = Math.max(0, a.currentTime - this.loopEnd);
    this.gains[to]!.gain.value = 0;
    void b.play().then(() => {
      this.ramp(this.gains[to]!, this.target(), OVERLAP);
      this.ramp(this.gains[from]!, 0, OVERLAP);
      this.active = to;
      this.handover = window.setTimeout(() => { a.pause(); a.currentTime = 0; }, OVERLAP * 1000 + 100);
      this.schedule();
    }).catch(() => { this.setState('waiting'); });
  }
}
