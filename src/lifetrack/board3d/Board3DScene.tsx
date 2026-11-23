/**
 * Isometric 3D board (presentation only). Loaded lazily; renders positions it is
 * given and never decides dice, events, money or turn order.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, Euler, Quaternion, SRGBColorSpace, Vector3, type Mesh } from 'three';
import type { CharacterId } from '../game/types.ts';
import type { BoardCategory } from '../board/boardTypes.ts';
import { DIE_FACE_ORDER, PLAYER_COLOR, RING_HALF, SPACE_WORLD, TILE_SIZE, dieRestRotation, spaceCategory } from './boardWorld.ts';
import { CityBlock, TileBase, TileGlow } from './City3D.tsx';
import { StaticBatch } from './StaticBatch.tsx';
import { Pawn3D } from './Pawn3D.tsx';
import { disposeKit, geo, mat } from './kit3d.ts';

export interface Board3DView {
  playerIds: readonly CharacterId[];
  humanId: CharacterId;
  /** Display positions (already include any in-flight movement step). */
  positions: Record<CharacterId, number>;
  activePlayer: CharacterId | null;
  currentSpace: number;
  highlightCategory: BoardCategory | null;
  /** Spaces the moving pawn is about to cross (shown once its roll is revealed), and who is moving. */
  route: readonly number[];
  routeOwner: CharacterId | null;
  /** Face decided by the seeded board die (never by this scene); null when no roll is shown. */
  dieValue: number | null;
  /** True only while the decided value is still hidden (the tumble phase). */
  dieRolling: boolean;
  /** Seconds a pawn spends hopping one space (from the controller's step timing). */
  stepSeconds: number;
}

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Board table half extents (x, z) and vertical range, used to fit the camera. */
/** Table half size: ring of tiles plus a margin and the wooden rim. */
const TABLE_HALF = RING_HALF + TILE_SIZE.width / 2 + 0.3;
const BOARD_HALF = { x: TABLE_HALF + 0.15, z: TABLE_HALF + 0.15, yMin: -0.31, yMax: 0.3 } as const;
const FIT_MARGIN = 1.04;

/** Fits the whole board table into the canvas for the fixed isometric camera (projects its corners). */
function FitCamera() {
  const { camera, size } = useThree();
  const span = useMemo(() => {
    camera.lookAt(0, 0, 0); // idempotent; also applied in onCreated
    camera.updateMatrixWorld();
    let x = 0, y = 0;
    const v = new Vector3();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const cy of [BOARD_HALF.yMin, BOARD_HALF.yMax]) {
      v.set(sx * BOARD_HALF.x, cy, sz * BOARD_HALF.z).applyMatrix4(camera.matrixWorldInverse);
      x = Math.max(x, Math.abs(v.x)); y = Math.max(y, Math.abs(v.y));
    }
    return { x: 2 * x * FIT_MARGIN, y: 2 * y * FIT_MARGIN };
  }, [camera]);
  const zoom = Math.max(12, Math.min(size.width / span.x, size.height / span.y));
  if (camera.zoom !== zoom) { camera.zoom = zoom; camera.updateProjectionMatrix(); }
  return null;
}

const PIPS: Record<number, [number, number][]> = { 1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]], 4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]], 5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]], 6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]] };
function faceTexture(value: number): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#b51f35';
  for (const [x, y] of PIPS[value] ?? []) { g.beginPath(); g.arc(x * 128, y * 128, 12, 0, Math.PI * 2); g.fill(); }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
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
  return <mesh ref={mesh} position={[DIE_SPOT.x, 0.42, DIE_SPOT.z]} castShadow>
    <boxGeometry args={[0.5, 0.5, 0.5]}/>
    {textures.map((t, i) => <meshStandardMaterial key={i} attach={`material-${i}`} map={t}/>)}
  </mesh>;
}

/**
 * Front-facing three-quarter view (no yaw, 42° pitch). The square board then projects at its
 * side length rather than its diagonal, so tiles are ~40% larger on portrait phones, and the
 * captions read straight across.
 */
const CAMERA_PITCH = (42 * Math.PI) / 180;
const CAMERA_POSITION: [number, number, number] = [0, 10 * Math.sin(CAMERA_PITCH), 10 * Math.cos(CAMERA_PITCH)];

/** Plaza in the city centre where the die lands (matches City3D). */
const DIE_SPOT = { x: 1.45, z: 1.5 } as const;

/** Route preview: a dot in the mover's colour on each space the pawn is about to cross. */
function RouteDots({ route, owner }: { route: readonly number[]; owner: CharacterId | null }) {
  if (!owner || route.length === 0) return null;
  const color = PLAYER_COLOR[owner];
  return <group>
    {route.map((space, i) => {
      const p = SPACE_WORLD[space]!;
      const last = i === route.length - 1;
      return <mesh key={space} geometry={geo().cyl} material={mat(color, { emissive: color, emissiveIntensity: 0.35 })} position={[p.x - 0.34, TILE_SIZE.height + 0.034, p.z - 0.34]} scale={last ? [0.16, 0.012, 0.16] : [0.09, 0.012, 0.09]}/>;
    })}
  </group>;
}

/** Release the shared city geometries, materials and textures when the board unmounts. */
function KitLifetime() {
  useEffect(() => disposeKit, []);
  return null;
}

/** Board table: a wooden rim under the cream play surface. */
function BoardBase() {
  return <group>
    <mesh geometry={geo().box} material={mat('#b99a72')} position={[0, -0.2, 0]} scale={[2 * TABLE_HALF + 0.3, 0.22, 2 * TABLE_HALF + 0.3]} receiveShadow/>
    <mesh geometry={geo().box} material={mat('#f3efe4')} position={[0, -0.07, 0]} scale={[2 * TABLE_HALF, 0.1, 2 * TABLE_HALF]} receiveShadow/>
  </group>;
}

export default function Board3DScene({ view, onContextLost }: { view: Board3DView; onContextLost?: () => void }) {
  const tiles = useMemo(() => SPACE_WORLD.map((_, i) => i), []);
  const reducedMotion = useMemo(prefersReducedMotion, []);
  return <Canvas
    className="board-3d-canvas"
    orthographic
    frameloop="demand"
    dpr={[1, 2]}
    shadows="percentage"
    gl={{ antialias: true, powerPreference: 'low-power' }}
    camera={{ position: CAMERA_POSITION, zoom: 60, near: 0.1, far: 100 }}
    onCreated={({ camera, gl }) => {
      camera.lookAt(0, 0, 0);
      // A lost GPU context (common on mobile) hands the board back to the SVG renderer.
      gl.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); onContextLost?.(); }, { once: true });
    }}
    aria-hidden="true"
  >
    <KitLifetime/>
    <FitCamera/>
    <color attach="background" args={['#e7eee5']}/>
    <hemisphereLight args={['#ffffff', '#b9c8b4', 0.95]}/>
    {/* Key light from the upper left of the screen so shadows fall toward the viewer's lower right. */}
    <directionalLight
      position={[-5, 9, 2.5]}
      intensity={1.7}
      color="#fff6e8"
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-6}
      shadow-camera-right={6}
      shadow-camera-top={6}
      shadow-camera-bottom={-6}
      shadow-camera-near={1}
      shadow-camera-far={25}
    />
    <directionalLight position={[6, 4, 6]} intensity={0.35} color="#dfeaf2"/>
    <StaticBatch>
      <BoardBase/>
      <CityBlock/>
      {tiles.map((i) => <TileBase key={i} index={i}/>)}
    </StaticBatch>
    {tiles.filter((i) => i === view.currentSpace || (view.highlightCategory !== null && spaceCategory(i) === view.highlightCategory)).map((i) => <TileGlow key={i} index={i} active={i === view.currentSpace} reducedMotion={reducedMotion}/>)}
    <RouteDots route={view.route} owner={view.routeOwner}/>
    {view.playerIds.map((id) => <Pawn3D key={id} id={id} index={view.positions[id] ?? 0} positions={view.positions} human={id === view.humanId} active={view.activePlayer === id} stepSeconds={view.stepSeconds} reducedMotion={reducedMotion}/>)}
    <Die value={view.dieValue} rolling={view.dieRolling} reducedMotion={reducedMotion}/>
  </Canvas>;
}
