/**
 * Isometric 3D board (presentation only). Loaded lazily; renders positions it is
 * given and never decides dice, events, money or turn order.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, Euler, Quaternion, type Group, type Mesh } from 'three';
import type { CharacterId } from '../game/types.ts';
import type { BoardCategory } from '../board/boardTypes.ts';
import { CATEGORY_COLOR, DIE_FACE_ORDER, PLAYER_COLOR, SPACE_WORLD, TILE_SIZE, dieRestRotation, pawnWorld, spaceCategory, stepPawnTween, type PawnTween } from './boardWorld.ts';

export interface Board3DView {
  playerIds: readonly CharacterId[];
  humanId: CharacterId;
  /** Display positions (already include any in-flight movement step). */
  positions: Record<CharacterId, number>;
  activePlayer: CharacterId | null;
  currentSpace: number;
  highlightCategory: BoardCategory | null;
  /** Face decided by the seeded board die (never by this scene); null when no roll is shown. */
  dieValue: number | null;
  /** True only while the decided value is still hidden (the tumble phase). */
  dieRolling: boolean;
}

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Fits the board footprint into the canvas for the fixed isometric camera. */
function FitCamera() {
  const { camera, size } = useThree();
  const zoom = Math.max(18, Math.min(size.width / 10.2, size.height / 6.9));
  if (camera.zoom !== zoom) { camera.zoom = zoom; camera.updateProjectionMatrix(); }
  return null;
}

function Tile({ index, active, highlighted }: { index: number; active: boolean; highlighted: boolean }) {
  const p = SPACE_WORLD[index]!;
  const color = CATEGORY_COLOR[spaceCategory(index)];
  const lift = active ? 0.08 : highlighted ? 0.04 : 0;
  return <group position={[p.x, lift, p.z]}>
    <mesh position={[0, TILE_SIZE.height / 2, 0]}>
      <boxGeometry args={[TILE_SIZE.width, TILE_SIZE.height, TILE_SIZE.depth]}/>
      <meshStandardMaterial color={active || highlighted ? '#fffdf6' : '#f7f5ef'} emissive={active ? color : '#000000'} emissiveIntensity={active ? 0.18 : 0}/>
    </mesh>
    <mesh position={[0, TILE_SIZE.height + 0.006, -TILE_SIZE.depth / 2 + 0.07]}>
      <boxGeometry args={[TILE_SIZE.width, 0.012, 0.14]}/>
      <meshStandardMaterial color={color}/>
    </mesh>
    {(active || highlighted) && <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.56, 40]}/>
      <meshBasicMaterial color={color} transparent opacity={0.7}/>
    </mesh>}
  </group>;
}

/** Pawn that hops toward its target space; per-frame motion uses refs only (no React state). */
function Pawn({ id, index, positions, human, active, reducedMotion }: { id: CharacterId; index: number; positions: Record<CharacterId, number>; human: boolean; active: boolean; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const target = pawnWorld(index, id, positions);
  const tween = useRef<PawnTween>({ from: target, to: target, t: 1 });
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const g = group.current;
    const current = g ? { x: g.position.x, y: target.y, z: g.position.z } : target;
    tween.current = { from: current, to: target, t: 0 };
    invalidate();
  }, [target.x, target.z, target.y, invalidate]);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g || tween.current.t >= 1) return;
    const r = stepPawnTween(tween.current, delta, undefined, reducedMotion);
    tween.current = r.tween;
    g.position.set(r.point.x, r.point.y, r.point.z);
    if (!r.done) invalidate();
  });
  const color = PLAYER_COLOR[id];
  return <group ref={group} position={[target.x, target.y, target.z]} scale={0.9}>
    <group position={[0, active ? 0.12 : 0, 0]}>
      <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.13, 0.15, 0.1, 24]}/><meshStandardMaterial color={human ? '#c8102e' : '#ffffff'}/></mesh>
      <mesh position={[0, 0.24, 0]}><cylinderGeometry args={[0.07, 0.11, 0.3, 20]}/><meshStandardMaterial color={color}/></mesh>
      <mesh position={[0, 0.46, 0]}><sphereGeometry args={[0.1, 20, 16]}/><meshStandardMaterial color={color}/></mesh>
    </group>
  </group>;
}

const PIPS: Record<number, [number, number][]> = { 1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]], 4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]], 5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]], 6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]] };
function faceTexture(value: number): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#b51f35';
  for (const [x, y] of PIPS[value] ?? []) { g.beginPath(); g.arc(x * 128, y * 128, 12, 0, Math.PI * 2); g.fill(); }
  return new CanvasTexture(c);
}

/** Visual die: tumbles while the value is hidden, then settles on the value it is given. */
function Die({ value, rolling, reducedMotion }: { value: number | null; rolling: boolean; reducedMotion: boolean }) {
  const mesh = useRef<Mesh>(null);
  const textures = useMemo(() => DIE_FACE_ORDER.map(faceTexture), []);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  const rest = useMemo(() => new Quaternion().setFromEuler(new Euler(...dieRestRotation(value ?? 2))), [value]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); }, [value, rolling, invalidate]);
  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    if (rolling && !reducedMotion) {
      const t = state.clock.elapsedTime;
      m.rotation.set(t * 9.1, t * 7.3, t * 5.2);
      m.position.y = 0.55 + Math.abs(Math.sin(t * 9)) * 0.25;
      invalidate();
      return;
    }
    const k = reducedMotion ? 1 : Math.min(1, delta * 10);
    m.quaternion.slerp(rest, k);
    m.position.y += (0.42 - m.position.y) * k;
    if (m.quaternion.angleTo(rest) > 0.002 || Math.abs(m.position.y - 0.42) > 0.002) invalidate();
  });
  if (value === null && !rolling) return null;
  return <mesh ref={mesh} position={[2.45, 0.42, 1.15]}>
    <boxGeometry args={[0.5, 0.5, 0.5]}/>
    {textures.map((t, i) => <meshStandardMaterial key={i} attach={`material-${i}`} map={t}/>)}
  </mesh>;
}

/** Simple miniature city block in the board's centre (procedural, no assets). */
function CityBlock() {
  const buildings: [number, number, number, number, number, string][] = [
    [-1.6, -0.6, 0.7, 1.2, 0.7, '#b8d0d4'], [-0.7, -0.9, 0.6, 1.9, 0.6, '#87a9b1'], [0.4, -0.7, 0.8, 0.9, 0.6, '#f0d9bc'],
    [1.5, -0.5, 0.6, 1.4, 0.6, '#c6d7d0'], [-1.2, 0.8, 0.9, 0.5, 0.6, '#e7be9e'], [1.1, 0.8, 0.8, 0.6, 0.6, '#f8f7f0'],
  ];
  return <group>
    <mesh position={[0, 0.02, 0]}><boxGeometry args={[5.6, 0.04, 3.2]}/><meshStandardMaterial color="#d8e5d6"/></mesh>
    <mesh position={[0, 0.045, 0.1]}><boxGeometry args={[5.2, 0.01, 0.38]}/><meshStandardMaterial color="#687781"/></mesh>
    {buildings.map(([x, z, w, h, d, c], i) => <mesh key={i} position={[x, h / 2 + 0.04, z]}><boxGeometry args={[w, h, d]}/><meshStandardMaterial color={c}/></mesh>)}
    {[[0.2, 0.85], [-0.2, 0.95], [2.2, 0.9]].map(([x, z], i) => <group key={`t${i}`} position={[x!, 0.04, z!]}>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.03, 0.03, 0.24, 8]}/><meshStandardMaterial color="#886d55"/></mesh>
      <mesh position={[0, 0.32, 0]}><sphereGeometry args={[0.16, 14, 12]}/><meshStandardMaterial color="#588b70"/></mesh>
    </group>)}
  </group>;
}

export default function Board3DScene({ view }: { view: Board3DView }) {
  const tiles = useMemo(() => SPACE_WORLD.map((_, i) => i), []);
  const reducedMotion = useMemo(prefersReducedMotion, []);
  return <Canvas
    className="board-3d-canvas"
    orthographic
    frameloop="demand"
    dpr={[1, 2]}
    gl={{ antialias: true, powerPreference: 'low-power' }}
    camera={{ position: [8, 8, 8], zoom: 60, near: 0.1, far: 100 }}
    onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    aria-hidden="true"
  >
    <FitCamera/>
    <color attach="background" args={['#e7eee5']}/>
    <hemisphereLight args={['#ffffff', '#b9c8b4', 1.1]}/>
    <directionalLight position={[5, 9, 4]} intensity={1.4}/>
    <mesh position={[0, -0.12, 0]}><boxGeometry args={[9, 0.24, 6.4]}/><meshStandardMaterial color="#f3efe4"/></mesh>
    <CityBlock/>
    {tiles.map((i) => <Tile key={i} index={i} active={i === view.currentSpace} highlighted={view.highlightCategory !== null && spaceCategory(i) === view.highlightCategory}/>)}
    {view.playerIds.map((id) => <Pawn key={id} id={id} index={view.positions[id] ?? 0} positions={view.positions} human={id === view.humanId} active={view.activePlayer === id} reducedMotion={reducedMotion}/>)}
    <Die value={view.dieValue} rolling={view.dieRolling} reducedMotion={reducedMotion}/>
  </Canvas>;
}
