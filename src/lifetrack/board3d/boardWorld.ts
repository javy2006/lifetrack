/**
 * Pure 3D board layout. The board lies on the XZ plane (Y is up). It is presentation-only: no
 * game state, randomness or financial data is derived here.
 */
import type { CharacterId } from '../game/types.ts';
import { BOARD_ROUTE, type BoardCategory } from '../board/boardTypes.ts';

export interface WorldPoint { x: number; y: number; z: number }

/** SVG units per world unit (used only by `svgToWorld`). */
export const WORLD_SCALE = 100;
const SVG_CENTER = { x: 500, y: 380 };
/** Square tiles, large enough to read their icon and caption at board zoom. */
export const TILE_SIZE = { width: 1, depth: 1, height: 0.12 } as const;
/** Centre-to-centre distance between neighbouring tiles. */
export const TILE_PITCH = 1.08;
/** Pawns stand on the tile's painted top (plinth + frame + inset). */
export const PAWN_BASE_Y = TILE_SIZE.height + 0.028;

export function svgToWorld(point: { x: number; y: number }, y = 0): WorldPoint {
  return { x: (point.x - SVG_CENTER.x) / WORLD_SCALE, y, z: (point.y - SVG_CENTER.y) / WORLD_SCALE };
}

/** Spaces per side of the square loop; corners are shared, so 4 * 6 = 24 spaces. */
const SIDE_STEPS = 6;
/** Half the loop's side length (corner tile centres sit at ±RING_HALF). */
export const RING_HALF = (SIDE_STEPS / 2) * TILE_PITCH;

/**
 * The 3D board is a square ring of equal tiles in route order: the far row left to right,
 * the right column toward the viewer, the near row right to left, then the left column
 * away from the viewer (the same clockwise direction as the 2D board).
 */
export const SPACE_WORLD: readonly WorldPoint[] = BOARD_ROUTE.map((_, i) => {
  const side = Math.floor(i / SIDE_STEPS), k = (i % SIDE_STEPS) * TILE_PITCH;
  const x = side === 0 ? -RING_HALF + k : side === 1 ? RING_HALF : side === 2 ? RING_HALF - k : -RING_HALF;
  const z = side === 0 ? -RING_HALF : side === 1 ? -RING_HALF + k : side === 2 ? RING_HALF : RING_HALF - k;
  return { x, y: 0, z };
});

/** World position of a space; out-of-range indexes wrap around the 24-space loop. */
export function spaceWorld(index: number): WorldPoint {
  const n = SPACE_WORLD.length;
  return SPACE_WORLD[((Math.trunc(index) % n) + n) % n] ?? SPACE_WORLD[0]!;
}

/** Spread radius (world units) for pawns sharing a tile. */
const PAWN_SPREAD = 0.27;

/** Pawn position on a space: centred when alone, otherwise spread around the tile centre without overlapping. */
export function pawnWorld(index: number, playerId: CharacterId, positions: Record<CharacterId, number>): WorldPoint {
  const base = spaceWorld(index);
  const sharing = (Object.keys(positions) as CharacterId[]).filter((id) => positions[id] === index);
  if (sharing.length <= 1 || !sharing.includes(playerId)) return { x: base.x, y: PAWN_BASE_Y, z: base.z };
  const slot = sharing.indexOf(playerId), angle = (Math.PI * 2 * slot) / Math.max(4, sharing.length) + Math.PI / 4;
  return { x: base.x + Math.cos(angle) * PAWN_SPREAD, y: PAWN_BASE_Y, z: base.z + Math.sin(angle) * PAWN_SPREAD };
}

/** Spaces a pawn will cross for a roll (route preview), in order and wrapping round the loop. */
export function routeSpaces(from: number, roll: number): number[] {
  if (!Number.isInteger(from) || !Number.isInteger(roll) || roll < 1) return [];
  const n = SPACE_WORLD.length;
  return Array.from({ length: Math.min(roll, n) }, (_, k) => (((from + k + 1) % n) + n) % n);
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

/** Default seconds a pawn takes to hop one space; the scene passes the controller's step timing. */
export const PAWN_STEP_SECONDS = 0.27;
/** Hop height for a pawn step: tall enough to read each step at board zoom. */
export const PAWN_HOP_PEAK = 0.32;

export interface PawnTween { from: WorldPoint; to: WorldPoint; t: number }

/** Advances a pawn tween by `delta` seconds. Returns the new tween and the point to render (with hop). */
export function stepPawnTween(tween: PawnTween, delta: number, duration = PAWN_STEP_SECONDS, reducedMotion = false): { tween: PawnTween; point: WorldPoint; done: boolean } {
  const t = reducedMotion || duration <= 0 ? 1 : Math.min(1, tween.t + Math.max(0, delta) / duration);
  const flat = lerpWorld(tween.from, tween.to, t);
  const moved = Math.hypot(tween.to.x - tween.from.x, tween.to.z - tween.from.z) > 1e-6;
  return { tween: { ...tween, t }, point: { ...flat, y: flat.y + (moved && !reducedMotion ? hopHeight(t, PAWN_HOP_PEAK) : 0) }, done: t >= 1 };
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

/** Yaw (radians about +Y) that faces a pawn from `from` toward `to`; keeps `fallback` when there is no horizontal movement. */
export function headingTowards(from: WorldPoint, to: WorldPoint, fallback = 0): number {
  const dx = to.x - from.x, dz = to.z - from.z;
  return Math.hypot(dx, dz) < 1e-6 ? fallback : Math.atan2(dx, dz);
}

/** Shortest-path angle interpolation (handles the -PI/PI wrap), k clamped to [0, 1]. */
export function lerpAngle(a: number, b: number, k: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * Math.min(1, Math.max(0, k));
}

/** Short squash-and-stretch on landing: returns [horizontal, vertical] scale for progress t of a step. */
export function landingSquash(t: number): [number, number] {
  if (!(t > 0.82 && t < 1)) return [1, 1];
  const k = Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.08;
  return [1 + k, 1 - k];
}

/** Short tile caption painted on the 3D board (mirrors the SVG labels). */
export function tileCaption(index: number): string {
  const space = BOARD_ROUTE[((index % BOARD_ROUTE.length) + BOARD_ROUTE.length) % BOARD_ROUTE.length]!;
  return space.label === 'CHECKPOINT' ? 'CHECK' : space.label;
}
