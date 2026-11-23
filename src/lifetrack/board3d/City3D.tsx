/**
 * Procedural miniature city and board tiles for the 3D board (presentation only).
 * Built from the shared unit shapes in kit3d so the whole scene stays light.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import { CATEGORY_COLOR, SPACE_WORLD, TILE_SIZE, spaceCategory, tileCaption } from './boardWorld.ts';
import { captionTexture, decal, geo, mat } from './kit3d.ts';

type V3 = [number, number, number];
type Shape = keyof ReturnType<typeof geo>;
function P({ g = 'box', c, p, s, r, shadow = true }: { g?: Shape; c: string; p: V3; s: V3; r?: V3; shadow?: boolean }) {
  return <mesh geometry={geo()[g]} material={mat(c)} position={p} scale={s} rotation={r} castShadow={shadow} receiveShadow/>;
}

/** Ink colour for captions: the category colour, darkened for contrast on cream. */
const INK: Record<string, string> = { salary: '#8a6418', medical: '#a50d26', accident: '#b5521f', family: '#5c4987', savings: '#1b6a48', protection: '#2f5d7a', lucky: '#9c6512', rest: '#4f6466' };

/** Static part of a tile (batched): plinth, category frame, cream inset, painted caption. */
export function TileBase({ index }: { index: number }) {
  const p = SPACE_WORLD[index]!;
  const category = spaceCategory(index);
  const { width: w, depth: d, height: h } = TILE_SIZE;
  const captionWidth = w - 0.2;
  return <group position={[p.x, 0, p.z]}>
    <mesh geometry={geo().box} material={mat('#d8d0bf')} position={[0, h / 2 - 0.01, 0]} scale={[w + 0.04, h, d + 0.04]} receiveShadow castShadow/>
    <mesh geometry={geo().box} material={mat(CATEGORY_COLOR[category])} position={[0, h + 0.01, 0]} scale={[w, 0.02, d]} receiveShadow/>
    <mesh geometry={geo().box} material={mat('#f7f3e8')} position={[0, h + 0.022, 0]} scale={[w - 0.1, 0.008, d - 0.1]} receiveShadow/>
    <mesh geometry={geo().plane} material={decal(captionTexture(tileCaption(index), INK[category]!, category))} position={[0, h + 0.0275, 0]} scale={[captionWidth, 1, captionWidth]}/>
    {/* Start flag on the first space */}
    {index === 0 && <group position={[-w / 2 + 0.12, h + 0.03, -d / 2 + 0.12]}>
      <P g="cylLow" c="#4b5a63" p={[0, 0.2, 0]} s={[0.025, 0.4, 0.025]}/>
      <P c="#c8102e" p={[0.09, 0.33, 0]} s={[0.17, 0.11, 0.012]}/>
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
    <mesh geometry={geo().box} material={mat(color, { emissive: color, emissiveIntensity: active ? 0.45 : 0.25 })} position={[0, h + 0.0105, 0]} scale={[w + 0.006, 0.0215, d + 0.006]}/>
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

function Tree({ x, z, s = 1, tone = '#588b70' }: { x: number; z: number; s?: number; tone?: string }) {
  return <group position={[x, 0.04, z]} scale={s}>
    <P g="cylLow" c="#886d55" p={[0, 0.09, 0]} s={[0.05, 0.18, 0.05]}/>
    <P g="sphere" c={tone} p={[0, 0.3, 0]} s={[0.3, 0.28, 0.3]}/>
    <P g="sphere" c={tone} p={[0.05, 0.42, 0.02]} s={[0.2, 0.18, 0.2]}/>
  </group>;
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

/** Tinted ground for a district, so the four areas read at a glance. */
function District({ x, z, color }: { x: number; z: number; color: string }) {
  return <P c={color} p={[x, 0.044, z]} s={[1.72, 0.006, 1.72]} shadow={false}/>;
}

/** Road from the plaza edge to the lot edge, with a dashed centre line. */
function Road({ axis, dir }: { axis: 'x' | 'z'; dir: 1 | -1 }) {
  const from = 1.02, to = 2.5, mid = dir * (from + to) / 2, len = to - from;
  const pos = (u: number): [number, number, number] => axis === 'x' ? [u, 0.047, 0] : [0, 0.047, u];
  const size: [number, number, number] = axis === 'x' ? [len, 0.006, 0.34] : [0.34, 0.006, len];
  return <group>
    <P c="#b8bec1" p={pos(mid)} s={size} shadow={false}/>
    {[0.25, 0.65, 1.05].map((k) => <P key={k} c="#f4f2ea" p={[...pos(dir * (from + k + 0.1))].map((v, i) => i === 1 ? 0.051 : v) as [number, number, number]} s={axis === 'x' ? [0.18, 0.004, 0.03] : [0.03, 0.004, 0.18]} shadow={false}/>)}
  </group>;
}

/**
 * Calm centre with a clear layout: a paved central plaza (fountain and the die's landing spot),
 * four roads, and four tinted districts, one per money theme: finance (bank), health (clinic),
 * homes (family) and shops (cover office). Buildings stay low and set back from the tile ring,
 * so decoration never hides a space or a pawn.
 */
export function CityBlock() {
  const lot = 5.1;
  return <group>
    <P c="#d6e6d2" p={[0, 0.02, 0]} s={[lot, 0.04, lot]} shadow={false}/>
    <District x={-1.62} z={-1.62} color="#cfe3cf"/>
    <District x={1.62} z={-1.62} color="#d5e4ec"/>
    <District x={-1.62} z={1.62} color="#eadfcc"/>
    <District x={1.62} z={1.62} color="#e6dde6"/>
    <Road axis="x" dir={1}/><Road axis="x" dir={-1}/><Road axis="z" dir={1}/><Road axis="z" dir={-1}/>
    {/* Central plaza */}
    <P g="cyl" c="#ece6d8" p={[0, 0.05, 0]} s={[2.1, 0.02, 2.1]} shadow={false}/>
    <P g="ring" c="#d6a44b" p={[0, 0.062, 0]} s={[2.06, 2.06, 0.35]} r={[Math.PI / 2, 0, 0]} shadow={false}/>
    <P g="cyl" c="#e6dfd0" p={[-0.25, 0.08, -0.25]} s={[0.62, 0.06, 0.62]}/>
    <P g="cyl" c="#8cc0d6" p={[-0.25, 0.112, -0.25]} s={[0.5, 0.01, 0.5]} shadow={false}/>
    <P g="cylLow" c="#e6dfd0" p={[-0.25, 0.19, -0.25]} s={[0.08, 0.18, 0.08]}/>
    <P g="cyl" c="#e6dfd0" p={[-0.25, 0.28, -0.25]} s={[0.22, 0.025, 0.22]}/>
    {/* Finance */}
    <Bank x={-1.6} z={-1.5}/>
    <Tree x={-2.2} z={-0.75} s={0.7}/>
    {/* Health */}
    <Clinic x={1.6} z={-1.5}/>
    <P c="#9b7a5b" p={[1.0, 0.08, -0.82]} s={[0.3, 0.03, 0.08]}/>
    <Tree x={2.2} z={-0.75} s={0.7} tone="#6d9e72"/>
    {/* Homes */}
    <House x={-1.95} z={1.25} wall="#f0d9bc" roof="#b5523b"/>
    <House x={-1.15} z={1.95} wall="#f8f7f0" roof="#7d68a6" ry={0.2}/>
    <Tree x={-2.2} z={2.15} s={0.65} tone="#4f7f63"/>
    {/* Shops */}
    <CoverOffice x={1.75} z={1.85}/>
    <Shop x={2.0} z={1.0}/>
    <Tree x={1.0} z={2.2} s={0.65}/>
  </group>;
}
