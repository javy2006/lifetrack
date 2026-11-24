/**
 * Pure camera maths for the angled perspective board camera (no three.js, unit-tested).
 * The camera looks at a target from a direction given by yaw (around +Y, 0 = from +Z) and pitch
 * (elevation above the table). `fitDistance` finds the closest distance at which every given
 * point is inside the view frustum with a margin.
 */
export interface Vec3 { x: number; y: number; z: number }

/** Unit vector from the target toward the camera. */
export function cameraDirection(yaw: number, pitch: number): Vec3 {
  const c = Math.cos(pitch);
  return { x: Math.sin(yaw) * c, y: Math.sin(pitch), z: Math.cos(yaw) * c };
}

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };

/** True when every point projects inside the frustum (with `margin` > 1 leaving a border). */
export function pointsFit(points: readonly Vec3[], target: Vec3, dir: Vec3, distance: number, fovY: number, aspect: number, margin = 1): boolean {
  const eye = { x: target.x + dir.x * distance, y: target.y + dir.y * distance, z: target.z + dir.z * distance };
  const forward = norm({ x: -dir.x, y: -dir.y, z: -dir.z });
  const right = norm(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = cross(right, forward);
  const tanV = Math.tan(fovY / 2) / margin, tanH = tanV * aspect;
  return points.every((p) => {
    const v = sub(p, eye), z = dot(v, forward);
    return z > 0.01 && Math.abs(dot(v, right)) <= z * tanH && Math.abs(dot(v, up)) <= z * tanV;
  });
}

/** Smallest camera distance (within [min, max]) at which all points fit; binary search. */
export function fitDistance(points: readonly Vec3[], target: Vec3, dir: Vec3, fovY: number, aspect: number, margin = 1.06, min = 1, max = 200): number {
  if (!(aspect > 0) || points.length === 0) return max;
  let lo = min, hi = max;
  if (!pointsFit(points, target, dir, hi, fovY, aspect, margin)) return max;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (pointsFit(points, target, dir, mid, fovY, aspect, margin)) hi = mid; else lo = mid;
  }
  return hi;
}

/** View angles by screen shape: a strong diagonal on wide screens, gentler on portrait phones so the board stays large. */
export function viewAngles(aspect: number): { yaw: number; pitch: number } {
  if (aspect < 0.85) return { yaw: 0.3, pitch: 0.98 };
  if (aspect < 1.3) return { yaw: 0.5, pitch: 0.86 };
  return { yaw: 0.5, pitch: 0.76 };
}

/** Exponential smoothing factor for `dt` seconds at `rate` per second (frame-rate independent). */
export function damp(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * Math.max(0, dt));
}
