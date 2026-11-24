/**
 * Procedural miniature city and board tiles for the 3D board (presentation only).
 * Built from the shared unit shapes in kit3d so the whole scene stays light.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import { CATEGORY_COLOR, SPACE_WORLD, TILE_SIZE, spaceCategory, tileCaption } from './boardWorld.ts';
import { captionTexture, decal, geo, mat, windowTexture } from './kit3d.ts';
import { RING_HALF } from './boardWorld.ts';

type V3 = [number, number, number];
type Shape = keyof ReturnType<typeof geo>;
function P({ g = 'box', c, p, s, r, shadow = true }: { g?: Shape; c: string; p: V3; s: V3; r?: V3; shadow?: boolean }) {
  return <mesh geometry={geo()[g]} material={mat(c)} position={p} scale={s} rotation={r} castShadow={shadow} receiveShadow/>;
}

/** Ink colour for captions: the category colour, darkened for contrast on cream. */
const INK: Record<string, string> = { salary: '#8a6418', medical: '#a50d26', accident: '#b5521f', family: '#5c4987', savings: '#1b6a48', protection: '#2f5d7a', lucky: '#9c6512', rest: '#4f6466' };

/** Inner edge of each side (toward the park), as an x/z unit direction. */
function innerDir(index: number): [number, number] {
  const side = Math.floor(index / 6) % 4;
  return side === 0 ? [0, 1] : side === 1 ? [-1, 0] : side === 2 ? [0, -1] : [1, 0];
}
/** Width of the printed category stripe on the inner edge of a tile. */
const STRIPE = 0.22;

/**
 * Static part of a tile (batched), printed like a board-game space: a card-stock plinth, a cream
 * face with the category colour as a stripe along the inner edge, and the painted icon + caption.
 * Corner spaces are fully printed in their colour with a cream inset, so the four corners read
 * as landmarks of the loop.
 */
export function TileBase({ index, caption }: { index: number; caption?: string }) {
  const p = SPACE_WORLD[index]!;
  const category = spaceCategory(index);
  const color = CATEGORY_COLOR[category];
  const corner = index % 6 === 0;
  const { width: w, depth: d, height: h } = TILE_SIZE;
  const [ix, iz] = innerDir(index);
  const off = w / 2 - 0.03 - STRIPE / 2;
  const shift = corner ? 0 : -0.1;
  const captionWidth = corner ? w - 0.2 : w - 0.28;
  return <group position={[p.x, 0, p.z]}>
    <mesh geometry={geo().box} material={mat('#d6c7a6')} position={[0, h / 2 - 0.01, 0]} scale={[w + 0.03, h, d + 0.03]} receiveShadow castShadow/>
    <mesh geometry={geo().box} material={mat(corner ? color : '#fbf6e8', { roughness: 0.85 })} position={[0, h + 0.008, 0]} scale={[w - 0.01, 0.016, d - 0.01]} receiveShadow/>
    {corner
      ? <mesh geometry={geo().box} material={mat('#fbf6e8', { roughness: 0.85 })} position={[0, h + 0.018, 0]} scale={[w - 0.16, 0.006, d - 0.16]} receiveShadow/>
      : <mesh geometry={geo().box} material={mat(color)} position={[ix * off, h + 0.018, iz * off]} scale={[ix !== 0 ? STRIPE : w - 0.06, 0.006, iz !== 0 ? STRIPE : d - 0.06]} receiveShadow/>}
    <mesh geometry={geo().plane} material={decal(captionTexture(caption ?? tileCaption(index), INK[category]!, category))} position={[ix * shift, h + 0.0225, iz * shift]} scale={[captionWidth, 1, captionWidth]}/>
    {/* Start flag on the first space */}
    {index === 0 && <group position={[-w / 2 + 0.14, h + 0.03, -d / 2 + 0.14]}>
      <P g="cylLow" c="#4b5a63" p={[0, 0.22, 0]} s={[0.025, 0.44, 0.025]}/>
      <P c="#c8102e" p={[0.1, 0.37, 0]} s={[0.19, 0.12, 0.012]}/>
    </group>}
  </group>;
}

/**
 * Glow for the active space and the spaces of the revealed event's category. Tiles never lift
 * (pawns stand on them): a glowing frame overlay and a ring mark them instead.
 */
export function TileGlow({ index, active, reducedMotion }: { index: number; active: boolean; reducedMotion: boolean }) {
  const p = SPACE_WORLD[index]!;
  const color = CATEGORY_COLOR[spaceCategory(index)];
  const { width: w, depth: d, height: h } = TILE_SIZE;
  return <group position={[p.x, 0, p.z]}>
    <mesh geometry={geo().box} material={mat(color, { emissive: color, emissiveIntensity: active ? 0.5 : 0.3 })} position={[0, h + 0.0085, 0]} scale={[w + 0.02, 0.019, d + 0.02]}/>
    <PulseRing color={color} y={0.012} animate={active && !reducedMotion}/>
  </group>;
}

/** Ring around a tile. The active-space ring pulses for a couple of seconds, then rests (keeps the GPU idle). */
function PulseRing({ color, y, animate }: { color: string; y: number; animate: boolean }) {
  const ring = useRef<Mesh>(null);
  const started = useRef<number | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { started.current = null; invalidate(); }, [animate, invalidate]);
  useFrame((state) => {
    const r = ring.current;
    if (!r || !animate) return;
    const now = state.clock.elapsedTime;
    started.current ??= now;
    const t = now - started.current;
    if (t > 2.4) { r.scale.set(1, 1, 1); return; }
    const k = 1 + Math.sin(t * Math.PI * 2.5) * 0.06 * (1 - t / 2.4);
    r.scale.set(k, k, 1);
    invalidate();
  });
  return <mesh ref={ring} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[0.66, 0.74, 48]}/>
    <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false}/>
  </mesh>;
}

/**
 * LifeTrack Tower: the city's landmark at the centre of the park. A stepped stone plinth in a
 * fountain basin, a white clock-tower shaft with the red shield emblem on two faces, a gold
 * cupola and a flag. Tall enough to anchor the board, slim enough never to hide a space.
 */
function Landmark() {
  return <group>
    {/* Fountain basin and water */}
    <P g="cyl" c="#e4dac6" p={[0, 0.09, 0]} s={[1.3, 0.08, 1.3]}/>
    <P g="cyl" c="#6fb4d0" p={[0, 0.132, 0]} s={[1.14, 0.012, 1.14]} shadow={false}/>
    {/* Stepped plinth */}
    <P g="cylLow" c="#efe6d4" p={[0, 0.18, 0]} s={[0.62, 0.12, 0.62]}/>
    <P g="cylLow" c="#e2d6bf" p={[0, 0.27, 0]} s={[0.48, 0.08, 0.48]}/>
    {/* Shaft with corner pilasters */}
    <P c="#fbf8f1" p={[0, 0.78, 0]} s={[0.3, 0.98, 0.3]}/>
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <P key={`${sx}${sz}`} c="#e7dcc7" p={[sx * 0.15, 0.78, sz * 0.15]} s={[0.05, 0.98, 0.05]}/>))}
    {/* Shield emblems facing the two camera sides */}
    {[0, Math.PI / 2].map((ry) => <group key={ry} position={[0, 0.86, 0]} rotation={[0, ry, 0]}>
      <group position={[0, 0, 0.155]}>
        <P c="#c8102e" p={[0, 0.03, 0]} s={[0.2, 0.17, 0.02]}/>
        <P g="cone" c="#c8102e" p={[0, -0.1, 0]} s={[0.2, 0.1, 0.02]} r={[Math.PI, 0, 0]}/>
        <P c="#fbf8f2" p={[0, 0.03, 0.012]} s={[0.035, 0.12, 0.006]} shadow={false}/>
        <P c="#fbf8f2" p={[0, 0.055, 0.012]} s={[0.1, 0.035, 0.006]} shadow={false}/>
      </group>
    </group>)}
    {/* Clock band */}
    <P c="#e7dcc7" p={[0, 1.3, 0]} s={[0.38, 0.06, 0.38]}/>
    {[0, Math.PI / 2].map((ry) => <group key={ry} rotation={[0, ry, 0]}><P g="cyl" c="#fffaf0" p={[0, 1.44, 0.17]} s={[0.17, 0.012, 0.17]} r={[Math.PI / 2, 0, 0]}/><P c="#27324f" p={[0, 1.46, 0.178]} s={[0.012, 0.06, 0.004]} shadow={false}/></group>)}
    <P c="#fbf8f1" p={[0, 1.44, 0]} s={[0.34, 0.22, 0.34]}/>
    {/* Gold cupola and flag */}
    <P c="#e7dcc7" p={[0, 1.57, 0]} s={[0.4, 0.04, 0.4]}/>
    <P g="dome" c="#d9a93f" p={[0, 1.59, 0]} s={[0.32, 0.3, 0.32]}/>
    <P g="cylLow" c="#5b4a2e" p={[0, 1.86, 0]} s={[0.018, 0.28, 0.018]}/>
    <P c="#c8102e" p={[0.08, 1.94, 0]} s={[0.15, 0.09, 0.01]}/>
  </group>;
}

function Tree({ x, z, s = 1, tone = '#5f9a4f' }: { x: number; z: number; s?: number; tone?: string }) {
  return <group position={[x, 0.04, z]} scale={s}>
    <P g="cylLow" c="#7d5d43" p={[0, 0.1, 0]} s={[0.06, 0.2, 0.06]}/>
    <P g="sphere" c={tone} p={[0, 0.34, 0]} s={[0.36, 0.32, 0.36]}/>
    <P g="sphere" c={tone} p={[0.06, 0.48, 0.03]} s={[0.24, 0.22, 0.24]}/>
  </group>;
}

/** Low clipped hedge (park borders). */
function Hedge({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return <P g="box" c="#4f8a45" p={[x, 0.09, z]} s={[w, 0.1, d]}/>;
}

function House({ x, z, wall, roof, ry = 0 }: { x: number; z: number; wall: string; roof: string; ry?: number }) {
  return <group position={[x, 0.04, z]} rotation={[0, ry, 0]}>
    <P c={wall} p={[0, 0.17, 0]} s={[0.62, 0.34, 0.5]}/>
    <P g="prism" c={roof} p={[0, 0.34, 0]} s={[0.7, 0.24, 0.58]}/>
    <P c="#6b4f3c" p={[0.1, 0.1, 0.252]} s={[0.12, 0.18, 0.01]} shadow={false}/>
    <P c="#cfe3ea" p={[-0.15, 0.2, 0.252]} s={[0.13, 0.1, 0.01]} shadow={false}/>
  </group>;
}

function Clinic({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.04, z]}>
    <P c="#f8f7f0" p={[0, 0.25, 0]} s={[0.86, 0.5, 0.66]}/>
    <P c="#dfe9ec" p={[0, 0.27, 0.332]} s={[0.7, 0.12, 0.01]} shadow={false}/>
    <P c="#9fc3cf" p={[0, 0.08, 0.335]} s={[0.22, 0.16, 0.01]} shadow={false}/>
    <P c="#c8102e" p={[0, 0.51, 0]} s={[0.34, 0.025, 0.1]}/>
    <P c="#c8102e" p={[0, 0.51, 0]} s={[0.1, 0.025, 0.34]}/>
  </group>;
}

/** Savings bank with columns and a pediment. */
function Bank({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.04, z]}>
    <P c="#e6dcc6" p={[0, 0.03, 0.02]} s={[0.9, 0.06, 0.74]}/>
    <P c="#f2ebdb" p={[0, 0.25, -0.06]} s={[0.76, 0.4, 0.5]}/>
    {[-0.28, -0.09, 0.09, 0.28].map((cx) => <P key={cx} g="cylLow" c="#fbf7ee" p={[cx, 0.25, 0.27]} s={[0.065, 0.4, 0.065]}/>)}
    <P c="#e6dcc6" p={[0, 0.47, 0.02]} s={[0.86, 0.05, 0.66]}/>
    <P g="prism" c="#24845b" p={[0, 0.495, 0.02]} s={[0.86, 0.16, 0.66]}/>
  </group>;
}

/** Insurance office ("cover"): blue roof and a shield sign. */
function CoverOffice({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.04, z]}>
    <P c="#dbe7ee" p={[0, 0.22, 0]} s={[0.62, 0.44, 0.52]}/>
    <P c="#457a9b" p={[0, 0.46, 0]} s={[0.68, 0.05, 0.58]}/>
    <P g="cylLow" c="#457a9b" p={[0, 0.3, 0.262]} s={[0.17, 0.2, 0.012]} r={[Math.PI / 2, 0, 0]} shadow={false}/>
    <P c="#9fc3cf" p={[0, 0.08, 0.262]} s={[0.16, 0.16, 0.01]} shadow={false}/>
  </group>;
}

/** Small corner shop with a striped awning (commercial district). */
function Shop({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.04, z]}>
    <P c="#f3e7d3" p={[0, 0.17, 0]} s={[0.56, 0.34, 0.42]}/>
    <P c="#8a6b52" p={[0, 0.36, 0]} s={[0.6, 0.04, 0.46]}/>
    {[0, 1, 2, 3].map((i) => <P key={i} c={i % 2 ? '#fbf8f2' : '#d6a44b'} p={[-0.21 + i * 0.14, 0.27, 0.25]} s={[0.14, 0.03, 0.14]} r={[0.45, 0, 0]}/>)}
    <P c="#cfe3ea" p={[0, 0.13, 0.212]} s={[0.38, 0.14, 0.01]} shadow={false}/>
  </group>;
}

/** Sand footpath from the plaza toward one side of the park, edged in a darker sand. */
function Path({ axis, dir }: { axis: 'x' | 'z'; dir: 1 | -1 }) {
  const from = 1.05, to = 2.55, mid = dir * (from + to) / 2, len = to - from;
  const at = (u: number, y: number): [number, number, number] => axis === 'x' ? [u, y, 0] : [0, y, u];
  return <group>
    <P c="#d6bd85" p={at(mid, 0.046)} s={axis === 'x' ? [len, 0.006, 0.5] : [0.5, 0.006, len]} shadow={false}/>
    <P c="#ead7a8" p={at(mid, 0.05)} s={axis === 'x' ? [len, 0.006, 0.4] : [0.4, 0.006, len]} shadow={false}/>
  </group>;
}

/**
 * The park in the middle of the board: striped lawn, sand paths to each side, a paved plaza
 * around LifeTrack Tower (the die lands on the plaza), and four small districts, one per money
 * theme: finance (bank), health (clinic), homes (family) and shops (cover office). Buildings stay
 * low and set back from the tile ring, so decoration never hides a space or a pawn.
 */
export function CityBlock() {
  const lot = 5.1, stripes = 8;
  return <group>
    <P c="#8fc46e" p={[0, 0.02, 0]} s={[lot, 0.04, lot]} shadow={false}/>
    {Array.from({ length: stripes / 2 }, (_, i) => <P key={i} c="#9cce7b" p={[-lot / 2 + lot / stripes * (2 * i + 0.5), 0.0415, 0]} s={[lot / stripes, 0.003, lot]} shadow={false}/>)}
    <Path axis="x" dir={1}/><Path axis="x" dir={-1}/><Path axis="z" dir={1}/><Path axis="z" dir={-1}/>
    {/* Plaza: sand ring, paving and a gold inlay */}
    <P g="cyl" c="#d6bd85" p={[0, 0.048, 0]} s={[2.36, 0.012, 2.36]} shadow={false}/>
    <P g="cyl" c="#f1e8d4" p={[0, 0.054, 0]} s={[2.2, 0.014, 2.2]} shadow={false}/>
    <P g="ring" c="#d9a93f" p={[0, 0.064, 0]} s={[2.0, 2.0, 0.3]} r={[Math.PI / 2, 0, 0]} shadow={false}/>
    <Landmark/>
    {/* Finance */}
    <Bank x={-1.6} z={-1.55}/>
    <Hedge x={-1.6} z={-0.95} w={1.1} d={0.1}/>
    <Tree x={-2.25} z={-0.8} s={0.7}/>
    {/* Health */}
    <Clinic x={1.6} z={-1.55}/>
    <Hedge x={1.6} z={-0.95} w={1.1} d={0.1}/>
    <Tree x={2.25} z={-0.8} s={0.7} tone="#6fa35a"/>
    {/* Homes */}
    <House x={-1.95} z={1.3} wall="#f2d9b8" roof="#b5523b"/>
    <House x={-1.15} z={2.0} wall="#fbf6ea" roof="#7d68a6" ry={0.2}/>
    <Tree x={-2.25} z={2.2} s={0.66} tone="#e39b3f"/>
    {/* Shops */}
    <CoverOffice x={1.8} z={1.9}/>
    <Shop x={2.05} z={1.05}/>
    <Tree x={1.0} z={2.25} s={0.66} tone="#e9c046"/>
    <Tree x={-0.75} z={-2.25} s={0.55} tone="#e39b3f"/>
    <Tree x={0.75} z={-2.25} s={0.55}/>
  </group>;
}

/** Office tower with window facades (outer city, behind the board so it never hides a tile). */
function Tower({ x, z, w, h, d, c }: { x: number; z: number; w: number; h: number; d: number; c: string }) {
  const win = mat(c, { map: windowTexture() }), roof = mat('#e9e4d8');
  return <group position={[x, 0, z]}>
    <mesh geometry={geo().box} material={[win, win, roof, roof, win, win]} position={[0, h / 2, 0]} scale={[w, h, d]} castShadow receiveShadow/>
    <P c="#cfc8b8" p={[0, h + 0.04, 0]} s={[w * 0.55, 0.08, d * 0.55]}/>
  </group>;
}

function Lamp({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0, z]}>
    <P g="cylLow" c="#4b5a63" p={[0, 0.24, 0]} s={[0.025, 0.48, 0.025]}/>
    <mesh geometry={geo().sphere} material={mat('#fff3c4', { emissive: '#ffd77a', emissiveIntensity: 0.7 })} position={[0, 0.5, 0]} scale={0.07}/>
  </group>;
}

/** Outer ring road: centre line radius (a square loop) used by the board and by the ambient cars. */
export const OUTER_ROAD = { inner: RING_HALF + 1.15, width: 0.8 } as const;
export const OUTER_ROAD_CENTER = OUTER_ROAD.inner + OUTER_ROAD.width / 2;

/**
 * The city around the board: pavements, a ring road and a sparse band of buildings. Tall towers
 * stand behind the board (the -X/-Z sides, away from the camera) and only low houses, shops and
 * trees stand in front, so the surroundings frame the board without covering any space.
 * Everything sits at ground level (y = GROUND_Y), below the raised board table.
 */
export const GROUND_Y = -0.31;
export function OuterCity() {
  const r0 = OUTER_ROAD.inner, w = OUTER_ROAD.width, rc = OUTER_ROAD_CENTER, len = 2 * (r0 + w) + 0.6;
  const side = (fn: (sx: number, sz: number, rot: boolean) => React.ReactNode) => [[0, -1, false], [0, 1, false], [-1, 0, true], [1, 0, true]].map(([sx, sz, rot], i) => <group key={i}>{fn(sx as number, sz as number, rot as boolean)}</group>);
  return <group position={[0, GROUND_Y, 0]}>
    <P c="#a9cf8a" p={[0, -0.02, 0]} s={[44, 0.04, 44]} shadow={false}/>
    {side((sx, sz, rot) => <>
      {/* Inner pavement, road and outer pavement on each side */}
      <P c="#ece2cc" p={[sx * (r0 - 0.15), 0.005, sz * (r0 - 0.15)]} s={rot ? [0.3, 0.01, len - 1.6] : [len - 1.6, 0.01, 0.3]} shadow={false}/>
      <P c="#7f878d" p={[sx * rc, 0.01, sz * rc]} s={rot ? [w, 0.01, len] : [len, 0.01, w]} shadow={false}/>
      <P c="#ece2cc" p={[sx * (r0 + w + 0.15), 0.005, sz * (r0 + w + 0.15)]} s={rot ? [0.3, 0.01, len + 0.6] : [len + 0.6, 0.01, 0.3]} shadow={false}/>
      {[-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].map((k) => <P key={k} c="#f2efe4" p={rot ? [sx * rc, 0.017, k] : [k, 0.017, sz * rc]} s={rot ? [0.04, 0.004, 0.34] : [0.34, 0.004, 0.04]} shadow={false}/>)}
    </>)}
    {/* Behind the board: a short skyline of offices */}
    <Tower x={-4.6} z={-7.0} w={1.1} h={2.2} d={1.0} c="#e2b08a"/>
    <Tower x={-1.6} z={-7.2} w={1.0} h={1.6} d={1.0} c="#f0d39b"/>
    <Tower x={1.6} z={-7.0} w={1.2} h={2.6} d={1.0} c="#a9c9c0"/>
    <Tower x={4.6} z={-7.1} w={1.0} h={1.8} d={1.0} c="#e9c2a4"/>
    <Tower x={-7.0} z={-3.4} w={1.0} h={1.9} d={1.1} c="#d9a27e"/>
    <Tower x={-7.1} z={0.2} w={1.0} h={1.4} d={1.0} c="#e9c2a4"/>
    <Tower x={-7.0} z={3.6} w={1.0} h={1.2} d={1.1} c="#f0d39b"/>
    {/* In front: low homes, shops and trees */}
    <House x={-3.8} z={6.6} wall="#f0d9bc" roof="#b5523b"/>
    <House x={-1.2} z={6.8} wall="#f8f7f0" roof="#457a9b" ry={0.15}/>
    <Shop x={1.6} z={6.6}/>
    <House x={4.4} z={6.7} wall="#eadfcc" roof="#7d68a6"/>
    <Shop x={6.6} z={3.2}/>
    <House x={6.7} z={0.2} wall="#f0d9bc" roof="#24845b" ry={Math.PI / 2}/>
    <House x={6.6} z={-3.4} wall="#f8f7f0" roof="#b5523b" ry={Math.PI / 2}/>
    {[[-5.9, 5.9], [0.2, 6.3], [3.0, 6.2], [6.0, 6.0], [6.2, -1.6], [6.2, 1.8], [-6.2, 5.8], [6.0, -6.0], [-6.0, -6.1]].map(([x, z], i) => <Tree key={i} x={x!} z={z!} s={0.95} tone={['#5f9a4f', '#e39b3f', '#6fa35a', '#e9c046'][i % 4]}/>)}
    {[-3, 0, 3].flatMap((k) => [[k, -(r0 + w + 0.4)], [k, r0 + w + 0.4], [-(r0 + w + 0.4), k], [r0 + w + 0.4, k]]).map(([x, z], i) => <Lamp key={i} x={x!} z={z!}/>)}
  </group>;
}
