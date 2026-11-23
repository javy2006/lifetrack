import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_ROUTE } from '../board/boardTypes.ts';
import { SPACE_WORLD, TILE_SIZE, hopHeight, lerpWorld, pawnWorld, spaceCategory, spaceWorld, svgToWorld } from './boardWorld.ts';
import { DEFAULT_RENDERER, RENDERER_STORAGE_KEY, readRendererPreference, writeRendererPreference } from './rendererPreference.ts';

test('every route space has a distinct world position centred on the origin', () => {
  assert.equal(SPACE_WORLD.length, BOARD_ROUTE.length);
  assert.equal(new Set(SPACE_WORLD.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`)).size, 24);
  const cx = SPACE_WORLD.reduce((n, p) => n + p.x, 0) / 24, cz = SPACE_WORLD.reduce((n, p) => n + p.z, 0) / 24;
  assert.ok(Math.abs(cx) < 0.05 && Math.abs(cz) < 0.05, `centre ${cx},${cz}`);
  assert.ok(SPACE_WORLD.every((p) => p.y === 0 && Math.abs(p.x) < 4.5 && Math.abs(p.z) < 3.2));
});

test('mapping preserves the SVG loop order and orientation', () => {
  assert.deepEqual(svgToWorld({ x: 500, y: 380 }), { x: 0, y: 0, z: 0 });
  // Top row (SVG y=112) is far (negative z) and runs left to right.
  assert.ok(spaceWorld(0).z < 0 && spaceWorld(5).x > spaceWorld(0).x);
  // Consecutive spaces are close; no tile overlaps its neighbour.
  for (let i = 0; i < 24; i++) {
    const a = spaceWorld(i), b = spaceWorld(i + 1);
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    assert.ok(d < 1.5, `gap ${i}->${i + 1} = ${d}`);
    if (i % 6 !== 5) assert.ok(d >= Math.min(TILE_SIZE.width, TILE_SIZE.depth), `tiles ${i},${i + 1} overlap`);
  }
  assert.deepEqual(spaceWorld(24), spaceWorld(0));
  assert.deepEqual(spaceWorld(-1), spaceWorld(23));
  assert.equal(spaceCategory(26), BOARD_ROUTE[2]!.category);
});

test('pawns sharing a space are separated and sit on the tile', () => {
  const positions = { alex: 3, meiling: 3, daniel: 3, aisyah: 3 };
  const pts = (['alex', 'meiling', 'daniel', 'aisyah'] as const).map((id) => pawnWorld(3, id, positions));
  assert.equal(new Set(pts.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`)).size, 4);
  assert.ok(pts.every((p) => p.y === TILE_SIZE.height));
});

test('animation helpers are bounded and deterministic', () => {
  const a = { x: 0, y: 0, z: 0 }, b = { x: 2, y: 0, z: -2 };
  assert.deepEqual(lerpWorld(a, b, 0.5), { x: 1, y: 0, z: -1 });
  assert.deepEqual(lerpWorld(a, b, 7), b);
  assert.deepEqual(lerpWorld(a, b, Number.NaN), b);
  assert.equal(hopHeight(0), 0);
  assert.equal(hopHeight(1), 0);
  assert.ok(Math.abs(hopHeight(0.5) - 0.22) < 1e-9);
});

test('renderer preference defaults to svg, honours storage and URL override, ignores junk', () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  assert.equal(DEFAULT_RENDERER, 'svg');
  assert.equal(readRendererPreference(storage), 'svg');
  writeRendererPreference(storage, '3d');
  assert.equal(store.get(RENDERER_STORAGE_KEY), '3d');
  assert.equal(readRendererPreference(storage), '3d');
  assert.equal(readRendererPreference(storage, '?renderer=svg'), 'svg', 'URL wins for QA');
  store.set(RENDERER_STORAGE_KEY, 'webgpu');
  assert.equal(readRendererPreference(storage, '?renderer=nope'), 'svg');
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.equal(readRendererPreference(broken), 'svg');
  assert.doesNotThrow(() => writeRendererPreference(broken, '3d'));
  assert.equal(readRendererPreference(null), 'svg');
});
