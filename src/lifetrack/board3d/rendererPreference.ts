/**
 * Board renderer preference. Stored under its own key so it can never affect
 * `lifetrack.game.v1` or `lifetrack.board.v1`. A `?renderer=svg|3d` URL
 * parameter overrides it for QA without being persisted.
 */
export type BoardRenderer = 'svg' | '3d';
export const RENDERER_STORAGE_KEY = 'lifetrack.renderer.v1';
export const DEFAULT_RENDERER: BoardRenderer = 'svg';

interface ReadableStorage { getItem(key: string): string | null }
interface WritableStorage { setItem(key: string, value: string): void }

const isRenderer = (value: unknown): value is BoardRenderer => value === 'svg' || value === '3d';

export function readRendererPreference(storage: ReadableStorage | null, search = ''): BoardRenderer {
  try {
    const fromUrl = new URLSearchParams(search).get('renderer');
    if (isRenderer(fromUrl)) return fromUrl;
  } catch { /* Ignore malformed query strings. */ }
  try {
    const stored = storage?.getItem(RENDERER_STORAGE_KEY);
    if (isRenderer(stored)) return stored;
  } catch { /* Storage may be disabled. */ }
  return DEFAULT_RENDERER;
}

export function writeRendererPreference(storage: WritableStorage | null, renderer: BoardRenderer): void {
  try { storage?.setItem(RENDERER_STORAGE_KEY, renderer); } catch { /* Preference is optional. */ }
}
