/** Audio preferences: master switch, independent music and effects switches and volumes. */
export type AudioPrefs = { enabled: boolean; musicOn: boolean; effectsOn: boolean; musicVolume: number; effectsVolume: number };
// v3: music and effects on at 100% by default (v2 had music off for everyone, so it is not carried over).
export const PREFS_KEY = 'lifetrack.audio.v3';
export const DEFAULT_PREFS: AudioPrefs = { enabled: true, musicOn: true, effectsOn: true, musicVolume: 1, effectsVolume: 1 };

function clamp(value: unknown, fallback: number) { return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback; }
const bool = (v: unknown, f: boolean) => typeof v === 'boolean' ? v : f;

/** Reads saved preferences; anything missing or invalid falls back to the default. */
export function readPrefs(raw: string | null): AudioPrefs {
  try {
    const p = JSON.parse(raw ?? 'null') as Partial<AudioPrefs> | null;
    if (!p || typeof p !== 'object') return DEFAULT_PREFS;
    return { enabled: bool(p.enabled, true), musicOn: bool(p.musicOn, true), effectsOn: bool(p.effectsOn, true), musicVolume: clamp(p.musicVolume, 1), effectsVolume: clamp(p.effectsVolume, 1) };
  } catch { return DEFAULT_PREFS; }
}
