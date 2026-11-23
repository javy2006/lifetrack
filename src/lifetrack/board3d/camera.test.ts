import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraDirection, damp, fitDistance, pointsFit, viewAngles } from './camera.ts';

const corners = [-4, 4].flatMap((x) => [-4, 4].flatMap((z) => [-0.3, 0.3].map((y) => ({ x, y, z }))));
const origin = { x: 0, y: 0, z: 0 };

test('camera direction is a unit vector pointing up and toward +Z at yaw 0', () => {
  const d = cameraDirection(0, 0.8);
  assert.ok(Math.abs(Math.hypot(d.x, d.y, d.z) - 1) < 1e-12);
  assert.ok(d.y > 0 && d.z > 0 && Math.abs(d.x) < 1e-12);
});

test('fitDistance returns the tightest distance that still shows every board corner', () => {
  for (const aspect of [0.46, 1, 1.6, 2.4]) {
    const { yaw, pitch } = viewAngles(aspect);
    const dir = cameraDirection(yaw, pitch), fov = (32 * Math.PI) / 180;
    const d = fitDistance(corners, origin, dir, fov, aspect);
    assert.ok(pointsFit(corners, origin, dir, d, fov, aspect, 1.06), `fits at aspect ${aspect}`);
    assert.ok(!pointsFit(corners, origin, dir, d * 0.97, fov, aspect, 1.06), `tight at aspect ${aspect}`);
  }
});

test('portrait screens need the camera further away than wide screens', () => {
  const fov = 0.56;
  const near = fitDistance(corners, origin, cameraDirection(0.72, 0.82), fov, 1.8);
  const far = fitDistance(corners, origin, cameraDirection(0.36, 0.98), fov, 0.46);
  assert.ok(far > near);
});

test('degenerate input is safe and damping is bounded', () => {
  assert.equal(fitDistance([], origin, cameraDirection(0, 1), 0.5, 1), 200);
  assert.equal(fitDistance(corners, origin, cameraDirection(0, 1), 0.5, 0), 200);
  assert.equal(damp(3, 0), 0);
  assert.ok(damp(3, 10) > 0.99 && damp(3, 10) <= 1);
});
