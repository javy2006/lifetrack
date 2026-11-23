/**
 * Pure mapping from the SVG board layout (1000x760 viewBox) to 3D world space.
 * The 3D board lies on the XZ plane (Y is up). It is presentation-only: no
 * game state, randomness or financial data is derived here.
 */
import type { CharacterId } from '../game/types.ts';
import { BOARD_POINTS, BOARD_ROUTE, tokenOffset, type BoardCategory } from '../board/boardTypes.ts';

export interface WorldPoint { x: number; y: number; z: number }

/** SVG units per world unit. The board spans roughly 7.8 x 5.4 world units. */
export const WORLD_SCALE = 100;
const SVG_CENTER = { x: 500, y: 380 };
export const TILE_SIZE = { width: 0.86, depth: 0.6, height: 0.12 } as const;
export const PAWN_BASE_Y = TILE_SIZE.height;

export function svgToWorld(point: { x: number; y: number }, y = 0): WorldPoint {
  return { x: (point.x - SVG_CENTER.x) / WORLD_SCALE, y, z: (point.y - SVG_CENTER.y) / WORLD_SCALE };
}

export const SPACE_WORLD: readonly WorldPoint[] = BOARD_POINTS.map((p) => svgToWorld(p));

/** World position of a space; out-of-range indexes wrap around the 24-space loop. */
export function spaceWorld(index: number): WorldPoint {
  const n = SPACE_WORLD.length;
  return SPACE_WORLD[((Math.trunc(index) % n) + n) % n] ?? SPACE_WORLD[0]!;
}

/** Pawn position on a space, spread so players sharing a space do not overlap (reuses the SVG offsets). */
export function pawnWorld(index: number, playerId: CharacterId, positions: Record<CharacterId, number>): WorldPoint {
  const base = spaceWorld(index);
  const offset = tokenOffset(index, playerId, positions);
  return { x: base.x + (offset.x * 1.6) / WORLD_SCALE, y: PAWN_BASE_Y, z: base.z + (offset.y * 1.6) / WORLD_SCALE };
}

export const CATEGORY_COLOR: Record<BoardCategory, string> = {
  salary: '#d6a44b', medical: '#c8102e', accident: '#e77c43', family: '#7d68a6',
  savings: '#24845b', protection: '#457a9b', lucky: '#df9c3e', rest: '#748b8d',
};

export const PLAYER_COLOR: Record<CharacterId, string> = { alex: '#24845b', meiling: '#7d68a6', daniel: '#457a9b', aisyah: '#d6a44b' };

export function spaceCategory(index: number): BoardCategory {
  return BOARD_ROUTE[((index % BOARD_ROUTE.length) + BOARD_ROUTE.length) % BOARD_ROUTE.length]!.category;
}

/** Linear interpolation used by pawn animation; t is clamped to [0, 1]. */
export function lerpWorld(a: WorldPoint, b: WorldPoint, t: number): WorldPoint {
  const k = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 1));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
}

/** Small hop height for a pawn step at progress t (0 at both ends, peak mid-step). */
export function hopHeight(t: number, peak = 0.22): number {
  const k = Math.min(1, Math.max(0, t));
  return 4 * peak * k * (1 - k);
}

/** Seconds a pawn takes to hop one space (matches the controller's 135 ms step cadence). */
export const PAWN_STEP_SECONDS = 0.13;

export interface PawnTween { from: WorldPoint; to: WorldPoint; t: number }

/** Advances a pawn tween by `delta` seconds. Returns the new tween and the point to render (with hop). */
export function stepPawnTween(tween: PawnTween, delta: number, duration = PAWN_STEP_SECONDS, reducedMotion = false): { tween: PawnTween; point: WorldPoint; done: boolean } {
  const t = reducedMotion || duration <= 0 ? 1 : Math.min(1, tween.t + Math.max(0, delta) / duration);
  const flat = lerpWorld(tween.from, tween.to, t);
  const moved = Math.hypot(tween.to.x - tween.from.x, tween.to.z - tween.from.z) > 1e-6;
  return { tween: { ...tween, t }, point: { ...flat, y: flat.y + (moved && !reducedMotion ? hopHeight(t) : 0) }, done: t >= 1 };
}

/**
 * Euler rotation (x, y, z in radians) that puts `value` on top of a die whose
 * BoxGeometry faces are numbered [+x:1, -x:6, +y:2, -y:5, +z:3, -z:4]
 * (opposite faces sum to 7). Invalid values fall back to 2 (identity).
 */
export const DIE_FACE_ORDER = [1, 6, 2, 5, 3, 4] as const;
export function dieRestRotation(value: number): [number, number, number] {
  switch (value) {
    case 1: return [0, 0, Math.PI / 2];
    case 6: return [0, 0, -Math.PI / 2];
    case 3: return [-Math.PI / 2, 0, 0];
    case 4: return [Math.PI / 2, 0, 0];
    case 5: return [Math.PI, 0, 0];
    default: return [0, 0, 0];
  }
}
