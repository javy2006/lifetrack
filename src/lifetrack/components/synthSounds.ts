/**
 * Web Audio sound player: a tiny synth for the board sounds (dice, step, landing; no files) and a
 * cache for the short effect files, which are fetched and decoded once instead of streamed per play. The AudioContext is created lazily on the first sound, which only
 * happens after the player has interacted with the page, so browser autoplay rules are respected.
 */
export type SynthId = 'dice' | 'step' | 'land';

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** One soft tone with a quick attack and exponential decay. */
function tone(a: AudioContext, at: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', glideTo?: number) {
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(a.destination);
  osc.start(at); osc.stop(at + dur + 0.02);
}

/** A short filtered noise click (dice hitting the table). */
function click(a: AudioContext, at: number, gain: number) {
  const len = Math.floor(a.sampleRate * 0.03), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; // audio texture only, never game logic
  const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.2; g.gain.value = gain;
  src.connect(bp).connect(g).connect(a.destination);
  src.start(at);
}

export function playSynth(id: SynthId, volume: number): void {
  const a = audio();
  if (!a || volume <= 0) return;
  const t = a.currentTime + 0.01, v = Math.min(1, volume);
  if (id === 'dice') {
    // A handful of decelerating rattles over ~0.8 s.
    [0, 0.09, 0.19, 0.31, 0.46, 0.64, 0.82].forEach((dt, i) => click(a, t + dt, 0.22 * v * (1 - i * 0.09)));
  } else if (id === 'step') {
    tone(a, t, 520, 0.09, 0.07 * v, 'triangle', 420);
  } else {
    tone(a, t, 392, 0.22, 0.09 * v, 'sine');
    tone(a, t + 0.07, 587, 0.28, 0.07 * v, 'sine');
  }
}

/** Decoded sound files, fetched once on first use (after a user gesture) and replayed from memory. */
const samples = new Map<string, Promise<AudioBuffer | null>>();
let warned = false;
export function playSample(url: string, volume: number): void {
  const a = audio();
  if (!a || volume <= 0) return;
  let buffer = samples.get(url);
  if (!buffer) {
    buffer = fetch(url).then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.arrayBuffer(); }).then((data) => a.decodeAudioData(data)).catch((error: unknown) => {
      if (!warned) { warned = true; console.warn('LifeTrack: a sound effect could not be loaded; the game continues without it.', error); }
      return null;
    });
    samples.set(url, buffer);
  }
  void buffer.then((b) => {
    if (!b) return;
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = b; g.gain.value = Math.min(1, volume);
    src.connect(g).connect(a.destination);
    src.start();
  });
}
