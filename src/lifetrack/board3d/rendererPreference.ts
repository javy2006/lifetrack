/**
 * Board renderer selection. The 3D board is the primary experience on every device;
 * the SVG board is only an automatic fallback (no WebGL, load/scene error, context
 * loss — see Board3DSlot). A `?renderer=svg|3d` URL parameter forces one for QA.
 * Earlier builds stored a manual choice under `lifetrack.renderer.v1`; it is ignored
 * so players who once picked 2D are not left without the 3D board.
 */
export type BoardRenderer = 'svg' | '3d';
export const DEFAULT_RENDERER: BoardRenderer = '3d';

export function readRendererOverride(search = ''): BoardRenderer {
  try {
    const fromUrl = new URLSearchParams(search).get('renderer');
    if (fromUrl === 'svg' || fromUrl === '3d') return fromUrl;
  } catch { /* Ignore malformed query strings. */ }
  return DEFAULT_RENDERER;
}
