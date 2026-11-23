/**
 * Procedural miniature city and board tiles for the 3D board (presentation only).
 * Built from the shared unit shapes in kit3d so the whole scene stays light.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import { CATEGORY_COLOR, SPACE_WORLD, TILE_SIZE, spaceCategory, tileCaption } from './boardWorld.ts';
import { captionTexture, geo, mat, windowTexture } from './kit3d.ts';

type V3 = [number, number, number];
type Shape = keyof ReturnType<typeof geo>;
function P({ g = 'box', c, p, s, r, shadow = true }: { g?: Shape; c: string; p: V3; s: V3; r?: V3; shadow?: boolean }) {
  return <mesh geometry={geo()[g]} material={mat(c)} position={p} scale={s} rotation={r} castShadow={shadow} receiveShadow/>;
}

/** Ink colour for captions: the category colour, darkened for contrast on cream. */
const INK: Record<string, string> = { salary: '#8a6418', medical: '#a50d26', accident: '#b5521f', family: '#5c4987', savings: '#1b6a48', protection: '#2f5d7a', lucky: '#9c6512', rest: '#4f6466' };

export function Tile({ index, active, highlighted, reducedMotion }: { index: number; active: boolean; highlighted: boolean; reducedMotion: boolean }) {
  const p = SPACE_WORLD[index]!;
  const category = spaceCategory(index);
  const color = CATEGORY_COLOR[category];
  const { width: w, depth: d, height: h } = TILE_SIZE;
  // Tiles never lift (pawns stand on them); the active and event spaces glow and get a ring instead.
  const top = h;
  return <group position={[p.x, 0, p.z]}>
    {/* Plinth, coloured frame, cream inset with painted caption */}
    <mesh geometry={geo().box} material={mat('#d8d0bf')} position={[0, h / 2 - 0.01, 0]} scale={[w + 0.04, h, d + 0.04]} receiveShadow castShadow/>
    <mesh geometry={geo().box} material={mat(color, active || highlighted ? { emissive: color, emissiveIntensity: active ? 0.35 : 0.2 } : {})} position={[0, top + 0.01, 0]} scale={[w, 0.02, d]} receiveShadow/>
    <mesh geometry={geo().box} material={mat(active || highlighted ? '#fffdf6' : '#f7f3e8')} position={[0, top + 0.022, 0]} scale={[w - 0.1, 0.008, d - 0.1]} receiveShadow/>
    <mesh position={[0, top + 0.0275, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w - 0.16, (w - 0.16) * 0.3125]}/>
      <meshBasicMaterial map={captionTexture(tileCaption(index), INK[category]!)} transparent depthWrite={false} toneMapped={false}/>
    </mesh>
    {/* Start marker on the first space */}
    {index === 0 && <P c="#c8102e" p={[-w / 2 + 0.1, top + 0.05, -d / 2 + 0.1]} s={[0.06, 0.05, 0.06]} g="cyl"/>}
    {(active || highlighted) && <PulseRing color={color} y={0.012} animate={active && !reducedMotion}/>}
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
    <ringGeometry args={[0.52, 0.6, 40]}/>
    <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false}/>
  </mesh>;
}

function Tree({ x, z, s = 1, tone = '#588b70' }: { x: number; z: number; s?: number; tone?: string }) {
  return <group position={[x, 0.04, z]} scale={s}>
    <P g="cylLow" c="#886d55" p={[0, 0.1, 0]} s={[0.05, 0.2, 0.05]}/>
    <P g="cone" c={tone} p={[0, 0.33, 0]} s={[0.3, 0.36, 0.3]}/>
    <P g="cone" c={tone} p={[0, 0.5, 0]} s={[0.22, 0.26, 0.22]}/>
  </group>;
}

function Lamp({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.04, z]}>
    <P g="cylLow" c="#4b5a63" p={[0, 0.17, 0]} s={[0.018, 0.34, 0.018]}/>
    <mesh geometry={geo().sphere} material={mat('#fff3c4', { emissive: '#ffd77a', emissiveIntensity: 0.6 })} position={[0, 0.36, 0]} scale={0.05}/>
  </group>;
}

/** Tower with window facades on the four sides and a plain roof. */
function Tower({ x, z, w, h, d, c }: { x: number; z: number; w: number; h: number; d: number; c: string }) {
  const win = mat(c, { map: windowTexture() }), roof = mat('#e9e4d8');
  return <group position={[x, 0.04, z]}>
    <mesh geometry={geo().box} material={[win, win, roof, roof, win, win]} position={[0, h / 2, 0]} scale={[w, h, d]} castShadow receiveShadow/>
    <P c="#cfc8b8" p={[0, h + 0.03, 0]} s={[w * 0.5, 0.06, d * 0.5]}/>
    <P c="#9aa7ad" p={[w * 0.18, h + 0.09, -d * 0.1]} s={[0.08, 0.08, 0.08]}/>
  </group>;
}

function House({ x, z, wall, roof, ry = 0 }: { x: number; z: number; wall: string; roof: string; ry?: number }) {
  return <group position={[x, 0.04, z]} rotation={[0, ry, 0]}>
    <P c={wall} p={[0, 0.15, 0]} s={[0.46, 0.3, 0.38]}/>
    <P g="prism" c={roof} p={[0, 0.3, 0]} s={[0.52, 0.2, 0.44]}/>
    <P c="#6b4f3c" p={[0.06, 0.09, 0.192]} s={[0.09, 0.15, 0.01]} shadow={false}/>
    <P c="#cfe3ea" p={[-0.12, 0.17, 0.192]} s={[0.09, 0.08, 0.01]} shadow={false}/>
  </group>;
}

function Clinic({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.04, z]}>
    <P c="#f8f7f0" p={[0, 0.32, 0]} s={[1.0, 0.64, 0.72]}/>
    <P c="#dfe9ec" p={[0, 0.2, 0.362]} s={[0.84, 0.12, 0.01]} shadow={false}/>
    <P c="#dfe9ec" p={[0, 0.44, 0.362]} s={[0.84, 0.12, 0.01]} shadow={false}/>
    <P c="#9fc3cf" p={[0, 0.07, 0.37]} s={[0.24, 0.14, 0.02]} shadow={false}/>
    {/* Red cross on the roof and over the door */}
    <P c="#c8102e" p={[0, 0.655, 0]} s={[0.36, 0.025, 0.1]}/>
    <P c="#c8102e" p={[0, 0.655, 0]} s={[0.1, 0.025, 0.36]}/>
    <P c="#c8102e" p={[0.36, 0.53, 0.37]} s={[0.12, 0.035, 0.01]} shadow={false}/>
    <P c="#c8102e" p={[0.36, 0.53, 0.37]} s={[0.035, 0.12, 0.01]} shadow={false}/>
  </group>;
}

/** "Savings" bank with columns and a pediment. */
function Bank({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.04, z]}>
    <P c="#e6dcc6" p={[0, 0.03, 0.02]} s={[0.98, 0.06, 0.8]}/>
    <P c="#f2ebdb" p={[0, 0.3, -0.06]} s={[0.84, 0.48, 0.56]}/>
    {[-0.33, -0.11, 0.11, 0.33].map((cx) => <P key={cx} g="cylLow" c="#fbf7ee" p={[cx, 0.3, 0.3]} s={[0.07, 0.48, 0.07]}/>)}
    <P c="#e6dcc6" p={[0, 0.56, 0.02]} s={[0.94, 0.05, 0.72]}/>
    <P g="prism" c="#24845b" p={[0, 0.585, 0.02]} s={[0.94, 0.18, 0.72]}/>
  </group>;
}

function Cafe({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.04, z]}>
    <P c="#f0d9bc" p={[0, 0.2, 0]} s={[0.7, 0.4, 0.48]}/>
    <P c="#6b4f3c" p={[0, 0.42, 0]} s={[0.74, 0.04, 0.52]}/>
    {[0, 1, 2, 3, 4].map((i) => <P key={i} c={i % 2 ? '#fbf8f2' : '#c8102e'} p={[-0.28 + i * 0.14, 0.31, 0.3]} s={[0.14, 0.03, 0.16]} r={[0.45, 0, 0]}/>)}
    <P c="#cfe3ea" p={[0, 0.15, 0.242]} s={[0.5, 0.16, 0.01]} shadow={false}/>
    {[-0.18, 0.18].map((tx) => <group key={tx} position={[tx, 0, 0.52]}>
      <P g="cylLow" c="#4b5a63" p={[0, 0.06, 0]} s={[0.02, 0.12, 0.02]}/>
      <P g="cyl" c="#fbf8f2" p={[0, 0.125, 0]} s={[0.12, 0.012, 0.12]}/>
    </group>)}
  </group>;
}

/** Small insurance office ("cover"): blue with a shield sign. */
function CoverOffice({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0.04, z]}>
    <P c="#c9dbe6" p={[0, 0.27, 0]} s={[0.56, 0.54, 0.5]}/>
    <P c="#457a9b" p={[0, 0.56, 0]} s={[0.6, 0.04, 0.54]}/>
    <P g="cylLow" c="#457a9b" p={[0, 0.36, 0.255]} s={[0.16, 0.18, 0.01]} r={[Math.PI / 2, 0, 0]} shadow={false}/>
    <P c="#9fc3cf" p={[0, 0.08, 0.255]} s={[0.16, 0.16, 0.01]} shadow={false}/>
  </group>;
}

/** Centre of the board: roads, blocks and landmarks for each board category. */
export function CityBlock() {
  return <group>
    {/* Lot, pavements and roads */}
    <P c="#d8e5d6" p={[0, 0.02, 0]} s={[6.5, 0.04, 4.3]} shadow={false}/>
    <P c="#e4e0d6" p={[0, 0.045, 0.2]} s={[6.5, 0.012, 0.66]} shadow={false}/>
    <P c="#e4e0d6" p={[0.3, 0.045, 0]} s={[0.66, 0.012, 4.3]} shadow={false}/>
    <P c="#687781" p={[0, 0.053, 0.2]} s={[6.5, 0.006, 0.42]} shadow={false}/>
    <P c="#687781" p={[0.3, 0.054, 0]} s={[0.42, 0.006, 4.3]} shadow={false}/>
    {[-2.8, -2.2, -1.6, -1.0, -0.4, 1.0, 1.6, 2.2, 2.8].map((x) => <P key={`dx${x}`} c="#f3f1e8" p={[x, 0.058, 0.2]} s={[0.22, 0.004, 0.03]} shadow={false}/>)}
    {[-1.8, -1.2, -0.6, 0.9, 1.5].map((z) => <P key={`dz${z}`} c="#f3f1e8" p={[0.3, 0.058, z]} s={[0.03, 0.004, 0.22]} shadow={false}/>)}
    {/*
      Isometric occlusion rule: a building of height h at (x, z) hides the ground up to (x - h, z - h).
      Tall towers therefore stand in the front-right block, and only low buildings sit near the
      back rows, so no building ever covers a board tile or pawn.
    */}
    {/* Back-left: park (rest) and family homes */}
    <P c="#a9cf9c" p={[-2.05, 0.05, -1.2]} s={[1.75, 0.02, 1.35]} shadow={false}/>
    <P g="cyl" c="#7fb4c9" p={[-2.25, 0.065, -1.15]} s={[0.7, 0.015, 0.46]} shadow={false}/>
    <P c="#9b7a5b" p={[-1.6, 0.1, -0.7]} s={[0.32, 0.03, 0.08]}/>
    <Tree x={-2.55} z={-1.55} s={0.7}/><Tree x={-1.55} z={-1.6} s={0.8} tone="#6d9e72"/><Tree x={-1.4} z={-1.05} s={0.7} tone="#4f7f63"/><Tree x={-2.65} z={-0.75} s={0.65}/>
    <House x={-0.62} z={-1.5} wall="#e7be9e" roof="#b5523b"/>
    <House x={-0.62} z={-0.72} wall="#f8f7f0" roof="#7d68a6"/>
    {/* Back-right: bank (savings) and clinic (medical) */}
    <Bank x={1.15} z={-1.15}/>
    <Clinic x={2.5} z={-1.1}/>
    {/* Front-left: plaza where the die lands, café and cover office */}
    <P g="cyl" c="#efe9dc" p={[-2.3, 0.05, 1.25]} s={[1.0, 0.02, 1.0]} shadow={false}/>
    <P g="ring" c="#d6a44b" p={[-2.3, 0.062, 1.25]} s={[0.92, 0.92, 0.4]} r={[Math.PI / 2, 0, 0]} shadow={false}/>
    <Cafe x={-0.95} z={0.95}/>
    <CoverOffice x={-0.95} z={1.72}/>
    {/* Front-right: office towers */}
    <Tower x={1.3} z={0.95} w={0.56} h={1.05} d={0.56} c="#c6d7d0"/>
    <Tower x={1.45} z={1.72} w={0.6} h={1.4} d={0.5} c="#b8d0d4"/>
    <Tower x={2.55} z={1.3} w={0.7} h={1.9} d={0.7} c="#87a9b1"/>
    {/* Street furniture */}
    <Lamp x={-1.45} z={-0.25}/><Lamp x={0.9} z={-0.25}/><Lamp x={-1.6} z={0.65}/><Lamp x={2.0} z={0.65}/><Lamp x={0.75} z={-1.9}/>
    <Tree x={-0.05} z={-1.85} s={0.7}/><Tree x={1.9} z={-0.5} s={0.65} tone="#6d9e72"/><Tree x={3.0} z={0.65} s={0.7}/>
  </group>;
}
