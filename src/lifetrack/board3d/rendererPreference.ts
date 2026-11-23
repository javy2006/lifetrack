/**
 * Board renderer preference. Stored under its own key so it can never affect
 * `lifetrack.game.v1` or `lifetrack.board.v1`. A `?renderer=svg|3d` URL
 * parameter overrides it for QA without being persisted.
 */
export type BoardRenderer = 'svg' | '3d';
export const RENDERER_STORAGE_KEY = 'lifetrack.renderer.v1';
/** Safe default when nothing is known about the device. */
export const DEFAULT_RENDERER: BoardRenderer = 'svg';
/**
 * Smallest viewport side that defaults to the 3D board. Below it (phones, in either
 * orientation) the fixed isometric board is too small for its tile captions, while the
 * SVG board pans and stays readable, so phones default to 2D and can still switch.
 */
export const MIN_3D_DEFAULT_SIDE = 641;

export function defaultRendererForViewport(width: number, height: number): BoardRenderer {
  const side = Math.min(width, height);
  return Number.isFinite(side) && side >= MIN_3D_DEFAULT_SIDE ? '3d' : DEFAULT_RENDERER;
}

interface ReadableStorage { getItem(key: string): string | null }
interface WritableStorage { setItem(key: string, value: string): void }

const isRenderer = (value: unknown): value is BoardRenderer => value === 'svg' || value === '3d';

export function readRendererPreference(storage: ReadableStorage | null, search = '', fallback: BoardRenderer = DEFAULT_RENDERER): BoardRenderer {
  try {
    const fromUrl = new URLSearchParams(search).get('renderer');
    if (isRenderer(fromUrl)) return fromUrl;
  } catch { /* Ignore malformed query strings. */ }
  try {
    const stored = storage?.getItem(RENDERER_STORAGE_KEY);
    if (isRenderer(stored)) return stored;
  } catch { /* Storage may be disabled. */ }
  return fallback;
}

export function writeRendererPreference(storage: WritableStorage | null, renderer: BoardRenderer): void {
  try { storage?.setItem(RENDERER_STORAGE_KEY, renderer); } catch { /* Preference is optional. */ }
}
