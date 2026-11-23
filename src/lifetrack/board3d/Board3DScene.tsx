/**
 * Isometric 3D board (presentation only). Loaded lazily; renders positions it is
 * given and never decides dice, events, money or turn order.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, Euler, Quaternion, SRGBColorSpace, type Fog, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import type { CharacterId } from '../game/types.ts';
import type { BoardCategory } from '../board/boardTypes.ts';
import { DIE_FACE_ORDER, PLAYER_COLOR, RING_HALF, SPACE_WORLD, TILE_SIZE, dieRestRotation, pawnWorld, spaceCategory, type WorldPoint } from './boardWorld.ts';
import { CityBlock, GROUND_Y, OUTER_ROAD_CENTER, OuterCity, TileBase, TileGlow } from './City3D.tsx';
import { cameraDirection, damp, fitDistance, viewAngles, type Vec3 } from './camera.ts';
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
  /** Player whose token the camera follows during a turn (null: show the whole board). */
  focus: CharacterId | null;
  /** Space a pawn has just landed on (during the landing pause), for the landing effect. */
  landingSpace: number | null;
  routeOwner: CharacterId | null;
  /** Translated short tile labels (24), painted on the tiles; defaults to the English captions. */
  /** Month of the challenge (1-6): sets a gentle light mood, from crisp morning to warm late afternoon. */
  month?: number;
  captions?: readonly string[];
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

/** Table half size: ring of tiles plus a margin and the wooden rim. */
const TABLE_HALF = RING_HALF + TILE_SIZE.width / 2 + 0.3;
const FOV_DEG = 32;
/** Points the overview must keep on screen: the table's corners (top and underside). */
const BOARD_CORNERS: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => [-0.31, 0.3].map((y) => ({ x: sx * (TABLE_HALF + 0.15), y, z: sz * (TABLE_HALF + 0.15) }))));
const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Angled perspective camera. At rest it frames the whole board (every space readable); while a
 * token is moving it eases in to follow that token, then eases back out. Reduced motion keeps the
 * overview. Presentation only.
 */
function CameraRig({ focus, reducedMotion }: { focus: WorldPoint | null; reducedMotion: boolean }) {
  const { camera, size, invalidate, scene } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const pose = useMemo(() => {
    const { yaw, pitch } = viewAngles(aspect);
    const dir = cameraDirection(yaw, pitch);
    return { dir, distance: fitDistance(BOARD_CORNERS, ORIGIN, dir, (FOV_DEG * Math.PI) / 180, aspect) };
  }, [aspect]);
  // Fog starts beyond the board at any camera distance (portrait phones sit further back), so only the outer city fades.
  useEffect(() => { const fog = scene.fog as Fog | null; if (fog) { fog.near = pose.distance * 1.1; fog.far = pose.distance * 2.4; invalidate(); } }, [scene, pose.distance, invalidate]);
  const follow = focus !== null && !reducedMotion;
  const goal = follow
    ? { target: { x: focus!.x * 0.9, y: 0.25, z: focus!.z * 0.9 }, distance: Math.max(6, pose.distance * 0.58) }
    : { target: ORIGIN, distance: pose.distance };
  const current = useRef<{ target: Vec3; distance: number } | null>(null);
  useEffect(() => { invalidate(); }, [goal.target.x, goal.target.z, goal.distance, invalidate]);
  useFrame((_, dt) => {
    const c = current.current ?? (current.current = { target: { ...goal.target }, distance: goal.distance });
    const k = reducedMotion ? 1 : damp(follow ? 3.2 : 2.4, dt);
    c.target.x += (goal.target.x - c.target.x) * k; c.target.y += (goal.target.y - c.target.y) * k; c.target.z += (goal.target.z - c.target.z) * k;
    c.distance += (goal.distance - c.distance) * k;
    camera.position.set(c.target.x + pose.dir.x * c.distance, c.target.y + pose.dir.y * c.distance, c.target.z + pose.dir.z * c.distance);
    camera.lookAt(c.target.x, c.target.y, c.target.z);
    const settling = Math.abs(goal.distance - c.distance) > 0.005 || Math.hypot(goal.target.x - c.target.x, goal.target.z - c.target.z) > 0.005;
    if (settling) invalidate();
  });
  return null;
}

/**
 * Two small cars driving round the outer ring road. Drawn at ~15 fps only on devices with a fine
 * pointer (desktops/laptops) and never with reduced motion, so phones stay idle between turns.
 */
function AmbientCars({ enabled }: { enabled: boolean }) {
  const cars = useRef<(Group | null)[]>([]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') invalidate(); }, 66);
    return () => window.clearInterval(id);
  }, [enabled, invalidate]);
  useFrame((state) => {
    const r = OUTER_ROAD_CENTER, perimeter = 8 * r;
    cars.current.forEach((g, i) => {
      if (!g) return;
      const t = enabled ? state.clock.elapsedTime : 0;
      let d = ((t * 0.55 + i * perimeter * 0.5) % perimeter + perimeter) % perimeter;
      const side = Math.floor(d / (2 * r)); d -= side * 2 * r;
      const lane = i === 0 ? -0.17 : 0.17;
      const [x, z, yaw] = side === 0 ? [-r + d, -r - lane, Math.PI / 2] : side === 1 ? [r + lane, -r + d, 0] : side === 2 ? [r - d, r + lane, -Math.PI / 2] : [-r - lane, r - d, Math.PI];
      g.position.set(x, GROUND_Y + 0.07, z); g.rotation.y = yaw;
    });
  });
  return <>{['#c8102e', '#457a9b'].map((color, i) => <group key={i} ref={(g) => { cars.current[i] = g; }}>
    <mesh geometry={geo().box} material={mat(color, { roughness: 0.4 })} scale={[0.2, 0.1, 0.38]} position={[0, 0.04, 0]} castShadow/>
    <mesh geometry={geo().box} material={mat('#dfe9ef')} scale={[0.17, 0.08, 0.2]} position={[0, 0.12, -0.02]} castShadow/>
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} geometry={geo().cyl} material={mat('#262a2e')} scale={[0.07, 0.04, 0.07]} position={[sx * 0.1, -0.01, sz * 0.12]} rotation={[0, 0, Math.PI / 2]}/>))}
  </group>)}</>;
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


/** Spot on the central plaza where the die lands (matches City3D). */
const DIE_SPOT = { x: 0.85, z: 0.75 } as const;

/** Landing effect: a ring in the mover's colour that expands and fades on the landing space. */
function LandingBurst({ space, owner, reducedMotion }: { space: number | null; owner: CharacterId | null; reducedMotion: boolean }) {
  const ring = useRef<Mesh>(null);
  const started = useRef<number | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { started.current = null; invalidate(); }, [space, invalidate]);
  useFrame((state) => {
    const r = ring.current;
    if (!r || space === null) return;
    const material = r.material as MeshBasicMaterial;
    if (reducedMotion) { r.scale.setScalar(1); material.opacity = 0.55; return; }
    started.current ??= state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - started.current) / 0.7);
    const ease = 1 - (1 - t) * (1 - t);
    r.scale.setScalar(0.55 + ease * 0.75);
    material.opacity = 0.85 * (1 - t);
    if (t < 1) invalidate();
  });
  if (space === null || !owner) return null;
  const p = SPACE_WORLD[space]!;
  return <mesh ref={ring} position={[p.x, TILE_SIZE.height + 0.04, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[0.42, 0.5, 48]}/>
    <meshBasicMaterial color={PLAYER_COLOR[owner]} transparent opacity={0.85} depthWrite={false} toneMapped={false}/>
  </mesh>;
}

/**
 * Light mood per month: the sun swings slowly across the sky and warms over the six months.
 * Static per month (no per-frame cost) and subtle, so tiles and tokens always read clearly.
 */
const MONTH_MOOD: readonly { sun: [number, number, number]; color: string; sky: string; intensity: number }[] = [
  { sun: [-5.5, 9.5, 1.5], color: '#fff8ee', sky: '#fbfbf4', intensity: 1.7 },
  { sun: [-5.2, 9.3, 2.0], color: '#fff6e8', sky: '#fffaf0', intensity: 1.72 },
  { sun: [-5.0, 9.0, 2.5], color: '#fff4e2', sky: '#fff9ec', intensity: 1.74 },
  { sun: [-4.6, 8.6, 3.0], color: '#fff0d8', sky: '#fff7e6', intensity: 1.75 },
  { sun: [-4.2, 8.1, 3.4], color: '#ffead0', sky: '#fff4e0', intensity: 1.76 },
  { sun: [-3.8, 7.6, 3.8], color: '#ffe4c4', sky: '#fff1da', intensity: 1.78 },
];

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
  const mood = MONTH_MOOD[Math.min(5, Math.max(0, (view.month ?? 1) - 1))]!;
  const tiles = useMemo(() => SPACE_WORLD.map((_, i) => i), []);
  const reducedMotion = useMemo(prefersReducedMotion, []);
  const ambient = useMemo(() => { try { return !reducedMotion && window.matchMedia('(pointer: fine)').matches; } catch { return false; } }, [reducedMotion]);
  return <Canvas
    className="board-3d-canvas"
    frameloop="demand"
    dpr={[1, 2]}
    shadows="percentage"
    gl={{ antialias: true, powerPreference: 'low-power' }}
    camera={{ position: [0, 12, 12], fov: FOV_DEG, near: 0.5, far: 80 }}
    onCreated={({ camera, gl }) => {
      camera.lookAt(0, 0, 0);
      // A lost GPU context (common on mobile) hands the board back to the SVG renderer.
      gl.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); onContextLost?.(); }, { once: true });
    }}
    aria-hidden="true"
  >
    <KitLifetime/>
    <CameraRig focus={view.focus ? pawnWorld(view.positions[view.focus] ?? 0, view.focus, view.positions) : null} reducedMotion={reducedMotion}/>
    <color attach="background" args={['#dcead0']}/>
    <fog attach="fog" args={['#dcead0', 22, 44]}/>
    <hemisphereLight args={[mood.sky, '#b7cfa6', 1.0]}/>
    {/* Key light from the upper left of the screen so shadows fall toward the viewer's lower right. */}
    <directionalLight
      position={mood.sun}
      intensity={mood.intensity}
      color={mood.color}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
      shadow-camera-near={1}
      shadow-camera-far={25}
    />
    <directionalLight position={[6, 4, 6]} intensity={0.35} color="#dfeaf2"/>
    <StaticBatch key={view.captions?.join('|') ?? 'en'}>
      <OuterCity/>
      <BoardBase/>
      <CityBlock/>
      {tiles.map((i) => <TileBase key={i} index={i} caption={view.captions?.[i]}/>)}
    </StaticBatch>
    {tiles.filter((i) => i === view.currentSpace || (view.highlightCategory !== null && spaceCategory(i) === view.highlightCategory)).map((i) => <TileGlow key={i} index={i} active={i === view.currentSpace} reducedMotion={reducedMotion}/>)}
    <RouteDots route={view.route} owner={view.routeOwner}/>
    <LandingBurst key={view.landingSpace ?? 'none'} space={view.landingSpace} owner={view.routeOwner} reducedMotion={reducedMotion}/>
    {view.playerIds.map((id) => <Pawn3D key={id} id={id} index={view.positions[id] ?? 0} positions={view.positions} human={id === view.humanId} active={view.activePlayer === id} stepSeconds={view.stepSeconds} reducedMotion={reducedMotion}/>)}
    <Die value={view.dieValue} rolling={view.dieRolling} reducedMotion={reducedMotion}/>
    <AmbientCars enabled={ambient}/>
  </Canvas>;
}

/** Homepage camera: the overview pose with a slow, gentle drift (static with reduced motion). */
function HeroCamera({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size, invalidate } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const base = useMemo(() => {
    const { yaw, pitch } = viewAngles(Math.max(aspect, 1.3));
    return { yaw, pitch, distance: fitDistance(BOARD_CORNERS, ORIGIN, cameraDirection(yaw, pitch), (FOV_DEG * Math.PI) / 180, aspect, 0.92) };
  }, [aspect]);
  // Same as the game camera: fog follows the camera distance, so a tall (portrait) view that pulls far back is not washed out.
  const { scene } = useThree();
  useEffect(() => { const fog = scene.fog as Fog | null; if (fog) { fog.near = base.distance * 1.1; fog.far = base.distance * 2.4; invalidate(); } }, [scene, base.distance, invalidate]);
  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') invalidate(); }, 50);
    return () => window.clearInterval(id);
  }, [reducedMotion, invalidate]);
  useFrame((state) => {
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    const dir = cameraDirection(base.yaw + Math.sin(t * 0.12) * 0.16, base.pitch);
    camera.position.set(dir.x * base.distance, dir.y * base.distance, dir.z * base.distance);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

const HERO_POSITIONS: Record<CharacterId, number> = { alex: 2, meiling: 8, daniel: 14, aisyah: 20 };

/** Homepage illustration: the real 3D city board with the four profession tokens (decorative). */
export function HeroScene({ captions }: { captions?: readonly string[] }) {
  const reducedMotion = useMemo(prefersReducedMotion, []);
  const tiles = useMemo(() => SPACE_WORLD.map((_, i) => i), []);
  return <Canvas className="hero-3d-canvas" frameloop="demand" dpr={[1, 2]} shadows="percentage" gl={{ antialias: true, powerPreference: 'low-power' }} camera={{ position: [0, 12, 12], fov: FOV_DEG, near: 0.5, far: 80 }} aria-hidden="true">
    <KitLifetime/>
    <HeroCamera reducedMotion={reducedMotion}/>
    <color attach="background" args={['#dcead0']}/>
    <fog attach="fog" args={['#dcead0', 22, 44]}/>
    <hemisphereLight args={['#fffaf0', '#b7cfa6', 1.0]}/>
    <directionalLight position={[-5, 9, 2.5]} intensity={1.7} color="#fff6e8" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-camera-near={1} shadow-camera-far={25}/>
    <directionalLight position={[6, 4, 6]} intensity={0.35} color="#dfeaf2"/>
    <StaticBatch key={captions?.join('|') ?? 'en'}>
      <OuterCity/>
      <BoardBase/>
      <CityBlock/>
      {tiles.map((i) => <TileBase key={i} index={i} caption={captions?.[i]}/>)}
    </StaticBatch>
    {(Object.keys(HERO_POSITIONS) as CharacterId[]).map((id) => <Pawn3D key={id} id={id} index={HERO_POSITIONS[id]} positions={HERO_POSITIONS} human={false} active={false} stepSeconds={0.3} reducedMotion={reducedMotion}/>)}
    <AmbientCars enabled={!reducedMotion}/>
  </Canvas>;
}
