/**
 * 3D board models of the four official LifeTrack characters, modelled in Three.js geometry after
 * the reference images in public/assets/characters/reference (there is no image-to-3D step:
 * these are hand-built approximations). Each head carries a face texture cropped from the same
 * reference (scripts/assets/build_character_assets.py). All four share one body plan, height
 * and material set, so they read as one family at board scale.
 *
 * Units: a 1-unit-tall figure standing at y = 0, facing +Z (the camera); +X is the figure's left.
 */
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Euler, Quaternion, Vector3 } from 'three';
import type { CharacterId } from '../game/types.ts';
import { faceMaterial, geo, mat } from './kit3d.ts';

type V3 = [number, number, number];
type Shape = keyof ReturnType<typeof geo>;

export function Part({ g, m, p, s, r }: { g: Shape; m: string; p: V3; s: V3; r?: V3 }) {
  return <mesh geometry={geo()[g]} material={mat(m)} position={p} scale={s} rotation={r} castShadow/>;
}

const UP = new Vector3(0, 1, 0);
/** A rounded limb segment (capsule) between two joints. */
export function Limb({ from, to, radius, m }: { from: V3; to: V3; radius: number; m: string }) {
  const { position, rotation, length } = useMemo(() => {
    const a = new Vector3(...from), b = new Vector3(...to), d = b.clone().sub(a);
    const len = d.length();
    const q = new Quaternion().setFromUnitVectors(UP, d.normalize());
    const e = new Euler().setFromQuaternion(q);
    return { position: a.add(b).multiplyScalar(0.5).toArray() as V3, rotation: [e.x, e.y, e.z] as V3, length: len };
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);
  return <mesh geometry={geo().capsule} material={mat(m)} position={position} rotation={rotation} scale={[radius * 2, Math.max(0.001, length / 2), radius * 2]} castShadow/>;
}

/** Shared skin tones sampled from the references by the asset script. */
export const SKIN: Record<CharacterId, string> = { alex: '#d29973', meiling: '#d0afa0', daniel: '#8b513d', aisyah: '#c47a4c' };

const HEAD_Y = 0.905, NECK_Y = 0.8;
/** Board-readability tweaks: heads are a little larger than the references and tilt up toward the camera. */
const HEAD_SCALE = 1.12, HEAD_TILT = -0.2;

/**
 * Neck, head with the textured face, ears and whatever is passed as `children` (hair, headwear),
 * all tilted together from the neck.
 */
function Head({ id, children }: { id: CharacterId; children?: React.ReactNode }) {
  const invalidate = useThree((s) => s.invalidate);
  const face = faceMaterial(id, SKIN[id], invalidate);
  useEffect(() => { invalidate(); }, [invalidate]);
  const skin = SKIN[id];
  return <>
    <Part g="cyl" m={skin} p={[0, 0.81, -0.004]} s={[0.058, 0.07, 0.054]}/>
    <group position={[0, NECK_Y, 0]} rotation={[HEAD_TILT, 0, 0]} scale={HEAD_SCALE}>
      <group position={[0, -NECK_Y, 0]}>
        <Part g="sphere" m={skin} p={[0, HEAD_Y, -0.004]} s={[0.148, 0.178, 0.158]}/>
        <mesh geometry={geo().faceShell} material={face} position={[0, HEAD_Y, -0.004]} scale={[0.1506, 0.181, 0.161]} castShadow/>
        <Part g="sphere" m={skin} p={[-0.073, 0.9, -0.006]} s={[0.026, 0.04, 0.022]}/>
        <Part g="sphere" m={skin} p={[0.073, 0.9, -0.006]} s={[0.026, 0.04, 0.022]}/>
        {children}
      </group>
    </group>
  </>;
}

function Shoes({ color, boot = false }: { color: string; boot?: boolean }) {
  return <>
    <Part g="sphere" m={color} p={[-0.05, boot ? 0.03 : 0.024, 0.022]} s={[0.074, boot ? 0.06 : 0.048, 0.13]}/>
    <Part g="sphere" m={color} p={[0.05, boot ? 0.03 : 0.024, 0.022]} s={[0.074, boot ? 0.06 : 0.048, 0.13]}/>
  </>;
}

function Trousers({ color }: { color: string }) {
  return <>
    <Part g="taper" m={color} p={[-0.05, 0.27, 0]} s={[0.1, 0.44, 0.1]}/>
    <Part g="taper" m={color} p={[0.05, 0.27, 0]} s={[0.1, 0.44, 0.1]}/>
    <Part g="cyl" m={color} p={[0, 0.475, 0]} s={[0.2, 0.06, 0.12]}/>
  </>;
}

/** Torso shell (jacket) in the shared lathe shape; `width` widens it for broader builds. */
function Jacket({ color, width = 1 }: { color: string; width?: number }) {
  return <mesh geometry={geo().torso} material={mat(color)} scale={[width, 1, width]} castShadow/>;
}

// ---------------------------------------------------------------- Alex: The Saver
// Navy two-button blazer, white shirt, red tie, charcoal trousers, black shoes, short side-swept
// black hair, holding a black wallet at his chest in his left hand.
const ALEX = { jacket: '#27324f', lapel: '#1f2942', shirt: '#eef0f2', tie: '#9b2f35', trousers: '#3a3b3e', shoes: '#1b1d20', hair: '#1b1c21', wallet: '#1e1f22' };
export function AlexModel() {
  const c = ALEX, skin = SKIN.alex;
  return <>
    <Shoes color={c.shoes}/>
    <Trousers color={c.trousers}/>
    <Jacket color={c.jacket}/>
    {/* Shirt, tie and lapels in the blazer's V */}
    <Part g="box" m={c.shirt} p={[0, 0.715, 0.069]} s={[0.07, 0.15, 0.012]} r={[-0.14, 0, 0]}/>
    <Part g="box" m={c.tie} p={[0, 0.7, 0.077]} s={[0.022, 0.13, 0.008]} r={[-0.14, 0, 0]}/>
    <Part g="box" m={c.tie} p={[0, 0.776, 0.07]} s={[0.026, 0.02, 0.012]}/>
    <Part g="box" m={c.lapel} p={[-0.03, 0.71, 0.074]} s={[0.022, 0.16, 0.01]} r={[-0.14, 0, -0.32]}/>
    <Part g="box" m={c.lapel} p={[0.03, 0.71, 0.074]} s={[0.022, 0.16, 0.01]} r={[-0.14, 0, 0.32]}/>
    <Part g="box" m={c.shirt} p={[-0.022, 0.795, 0.045]} s={[0.04, 0.025, 0.03]} r={[0, 0.5, 0.2]}/>
    <Part g="box" m={c.shirt} p={[0.022, 0.795, 0.045]} s={[0.04, 0.025, 0.03]} r={[0, -0.5, -0.2]}/>
    <Part g="sphere" m={c.lapel} p={[0, 0.6, 0.066]} s={[0.012, 0.012, 0.006]}/>
    {/* Right arm hangs; left arm bends to hold the wallet */}
    <Limb from={[-0.14, 0.765, 0]} to={[-0.158, 0.58, 0.004]} radius={0.036} m={c.jacket}/>
    <Limb from={[-0.158, 0.58, 0.004]} to={[-0.165, 0.4, 0.018]} radius={0.032} m={c.jacket}/>
    <Part g="cyl" m={c.shirt} p={[-0.165, 0.392, 0.019]} s={[0.058, 0.02, 0.058]}/>
    <Part g="sphere" m={skin} p={[-0.166, 0.355, 0.02]} s={[0.044, 0.07, 0.034]}/>
    <Limb from={[0.14, 0.765, 0]} to={[0.16, 0.59, 0.02]} radius={0.036} m={c.jacket}/>
    <Limb from={[0.16, 0.59, 0.02]} to={[0.06, 0.6, 0.12]} radius={0.032} m={c.jacket}/>
    <Part g="sphere" m={skin} p={[0.045, 0.605, 0.13]} s={[0.05, 0.05, 0.04]}/>
    <Part g="box" m={c.wallet} p={[0.03, 0.635, 0.128]} s={[0.075, 0.05, 0.014]} r={[0.2, 0.3, 0.45]}/>
    <Head id="alex">
      {/* Short black hair: side part, lifted front, trimmed sides */}
      <Part g="dome" m={c.hair} p={[0, 0.956, -0.02]} s={[0.158, 0.1, 0.162]}/>
      <Part g="sphere" m={c.hair} p={[0.01, 0.998, 0.026]} s={[0.13, 0.05, 0.08]} r={[0.35, 0, -0.08]}/>
      <Part g="sphere" m={c.hair} p={[0, 0.92, -0.052]} s={[0.15, 0.13, 0.075]}/>
      <Part g="box" m={c.hair} p={[-0.072, 0.94, -0.004]} s={[0.016, 0.04, 0.05]}/>
      <Part g="box" m={c.hair} p={[0.072, 0.94, -0.004]} s={[0.016, 0.04, 0.05]}/>
    </Head>
  </>;
}

/** Arm hanging at the side. `rolled` shows a rolled cuff and bare forearm (blazer sleeves pushed up). */
function HangingArm({ side, sleeve, skin, cuff, rolled = false, watch }: { side: 1 | -1; sleeve: string; skin: string; cuff?: string; rolled?: boolean; watch?: string }) {
  const x = side * 0.14;
  return <>
    <Limb from={[x, 0.765, 0]} to={[x + side * 0.018, 0.58, 0.004]} radius={0.036} m={sleeve}/>
    {rolled ? <>
      <Limb from={[x + side * 0.018, 0.58, 0.004]} to={[x + side * 0.021, 0.5, 0.01]} radius={0.034} m={sleeve}/>
      <Part g="cyl" m={sleeve} p={[x + side * 0.021, 0.5, 0.01]} s={[0.078, 0.03, 0.078]}/>
      <Limb from={[x + side * 0.021, 0.5, 0.01]} to={[x + side * 0.025, 0.39, 0.018]} radius={0.026} m={skin}/>
    </> : <>
      <Limb from={[x + side * 0.018, 0.58, 0.004]} to={[x + side * 0.025, 0.4, 0.018]} radius={0.032} m={sleeve}/>
      {cuff && <Part g="cyl" m={cuff} p={[x + side * 0.025, 0.392, 0.019]} s={[0.058, 0.02, 0.058]}/>}
    </>}
    {watch && <Part g="cyl" m={watch} p={[x + side * 0.025, 0.405, 0.018]} s={[0.058, 0.016, 0.058]}/>}
    <Part g="sphere" m={skin} p={[x + side * 0.026, 0.355, 0.02]} s={[0.044, 0.07, 0.034]}/>
  </>;
}

/** Slim ankle-length trousers with bare ankles and flat shoes (Mei Ling, Aisyah). */
function SlimTrousers({ color, skin, shoes }: { color: string; skin: string; shoes: string }) {
  return <>
    <Part g="sphere" m={shoes} p={[-0.048, 0.02, 0.02]} s={[0.064, 0.04, 0.12]}/>
    <Part g="sphere" m={shoes} p={[0.048, 0.02, 0.02]} s={[0.064, 0.04, 0.12]}/>
    <Part g="cyl" m={skin} p={[-0.048, 0.06, 0]} s={[0.05, 0.05, 0.05]}/>
    <Part g="cyl" m={skin} p={[0.048, 0.06, 0]} s={[0.05, 0.05, 0.05]}/>
    <Part g="taper" m={color} p={[-0.048, 0.285, 0]} s={[0.094, 0.41, 0.094]}/>
    <Part g="taper" m={color} p={[0.048, 0.285, 0]} s={[0.094, 0.41, 0.094]}/>
    <Part g="cyl" m={color} p={[0, 0.475, 0]} s={[0.19, 0.06, 0.115]}/>
  </>;
}

/** Long black hair: crown, a fall down the back and strands framing the face. `wave` adds waves. */
function LongHair({ color, wave = false }: { color: string; wave?: boolean }) {
  return <>
    <Part g="dome" m={color} p={[0, 0.95, -0.018]} s={[0.165, 0.112, 0.17]}/>
    <Part g="capsule" m={color} p={[0, 0.82, -0.064]} s={[0.2, 0.11, 0.075]}/>
    {([-1, 1] as const).map((side) => wave
      ? <group key={side}>
        <Part g="sphere" m={color} p={[side * 0.078, 0.9, -0.008]} s={[0.044, 0.11, 0.075]}/>
        <Part g="sphere" m={color} p={[side * 0.09, 0.8, -0.012]} s={[0.048, 0.12, 0.07]} r={[0, 0, side * 0.18]}/>
        <Part g="sphere" m={color} p={[side * 0.096, 0.71, -0.01]} s={[0.044, 0.1, 0.065]} r={[0, 0, -side * 0.15]}/>
      </group>
      : <group key={side}>
        <Part g="sphere" m={color} p={[side * 0.078, 0.9, -0.008]} s={[0.04, 0.11, 0.075]}/>
        <Part g="box" m={color} p={[side * 0.09, 0.78, -0.012]} s={[0.034, 0.18, 0.06]} r={[0, 0, side * 0.06]}/>
      </group>)}
  </>;
}

// ---------------------------------------------------------------- Mei Ling: The Balanced Planner
// Sage blazer with pushed-up sleeves, cream blouse, black ankle trousers, black flats, long straight
// black hair, round glasses, a silver laptop held at her left side and a watch.
const MEILING = { jacket: '#8fa68f', lapel: '#7b927c', blouse: '#efe6da', trousers: '#2c2d30', shoes: '#1b1d20', hair: '#17181c', laptop: '#b9bcc1', watch: '#3a3330' };
export function MeiLingModel() {
  const c = MEILING, skin = SKIN.meiling;
  return <>
    <SlimTrousers color={c.trousers} skin={skin} shoes={c.shoes}/>
    <Jacket color={c.jacket} width={0.95}/>
    <Part g="box" m={c.blouse} p={[0, 0.7, 0.066]} s={[0.07, 0.17, 0.012]} r={[-0.14, 0, 0]}/>
    <Part g="box" m={skin} p={[0, 0.77, 0.06]} s={[0.03, 0.045, 0.01]} r={[-0.14, 0, Math.PI / 4]}/>
    <Part g="box" m={c.lapel} p={[-0.032, 0.71, 0.072]} s={[0.022, 0.17, 0.01]} r={[-0.14, 0, -0.3]}/>
    <Part g="box" m={c.lapel} p={[0.032, 0.71, 0.072]} s={[0.022, 0.17, 0.01]} r={[-0.14, 0, 0.3]}/>
    <HangingArm side={-1} sleeve={c.jacket} skin={skin} rolled/>
    {/* Left arm holds the laptop upright against her side */}
    <Limb from={[0.133, 0.765, 0]} to={[0.158, 0.59, 0.01]} radius={0.034} m={c.jacket}/>
    <Limb from={[0.158, 0.59, 0.01]} to={[0.16, 0.52, 0.03]} radius={0.032} m={c.jacket}/>
    <Part g="cyl" m={c.jacket} p={[0.16, 0.52, 0.03]} s={[0.074, 0.028, 0.074]}/>
    <Limb from={[0.16, 0.52, 0.03]} to={[0.158, 0.44, 0.07]} radius={0.025} m={skin}/>
    <Part g="cyl" m={c.watch} p={[0.158, 0.452, 0.064]} s={[0.054, 0.016, 0.054]}/>
    <Part g="box" m={c.laptop} p={[0.19, 0.47, 0.04]} s={[0.016, 0.17, 0.14]}/>
    <Part g="sphere" m={skin} p={[0.172, 0.43, 0.08]} s={[0.04, 0.06, 0.034]}/>
    <Head id="meiling">
      <LongHair color={c.hair}/>
      {/* Round glasses */}
      <Part g="ring" m="#2b2523" p={[-0.034, 0.912, 0.083]} s={[0.05, 0.05, 0.06]}/>
      <Part g="ring" m="#2b2523" p={[0.034, 0.912, 0.083]} s={[0.05, 0.05, 0.06]}/>
      <Part g="box" m="#2b2523" p={[0, 0.915, 0.086]} s={[0.018, 0.005, 0.005]}/>
      <Part g="box" m="#2b2523" p={[-0.066, 0.914, 0.045]} s={[0.004, 0.004, 0.07]}/>
      <Part g="box" m="#2b2523" p={[0.066, 0.914, 0.045]} s={[0.004, 0.004, 0.07]}/>
    </Head>
  </>;
}

// ---------------------------------------------------------------- Vikram: Protection First (internal id 'daniel', kept for save compatibility)
// Yellow hard hat, short beard, navy work jacket with yellow-and-grey reflective shoulder
// stripes, ID badge, radio on the belt, charcoal cargo trousers and black work boots.
const DANIEL = { jacket: '#2c3a5c', band: '#24304d', stripe: '#e6c52c', reflect: '#b9bec4', trousers: '#3a3b3e', boots: '#1b1d20', hat: '#f2c22e', hatRim: '#e0ad1c', hair: '#17181c', tee: '#eef0f2' };
export function VikramModel() {
  const c = DANIEL, skin = SKIN.daniel;
  return <>
    <Shoes color={c.boots} boot/>
    <Trousers color={c.trousers}/>
    <Part g="box" m={c.trousers} p={[-0.098, 0.33, 0.006]} s={[0.022, 0.07, 0.06]}/>
    <Part g="box" m={c.trousers} p={[0.098, 0.33, 0.006]} s={[0.022, 0.07, 0.06]}/>
    <Jacket color={c.jacket} width={1.06}/>
    <Part g="cyl" m={c.band} p={[0, 0.48, 0]} s={[0.222, 0.04, 0.136]}/>
    <Part g="box" m={c.band} p={[0, 0.64, 0.074]} s={[0.012, 0.3, 0.008]}/>
    <Part g="box" m={c.tee} p={[0, 0.785, 0.05]} s={[0.04, 0.025, 0.02]}/>
    {/* Reflective stripes over each shoulder and down the chest */}
    {([-1, 1] as const).map((side) => <group key={side}>
      <Part g="box" m={c.stripe} p={[side * 0.07, 0.788, 0.0]} s={[0.04, 0.014, 0.13]}/>
      <Part g="box" m={c.reflect} p={[side * 0.07, 0.795, 0.0]} s={[0.016, 0.006, 0.132]}/>
      <Part g="box" m={c.stripe} p={[side * 0.068, 0.745, 0.07]} s={[0.04, 0.075, 0.012]} r={[-0.25, 0, 0]}/>
      <Part g="box" m={c.reflect} p={[side * 0.068, 0.745, 0.077]} s={[0.016, 0.075, 0.006]} r={[-0.25, 0, 0]}/>
      <Part g="box" m={c.band} p={[side * 0.065, 0.66, 0.074]} s={[0.05, 0.05, 0.01]}/>
    </group>)}
    <Part g="box" m="#f4f4f2" p={[0.068, 0.655, 0.082]} s={[0.04, 0.03, 0.006]}/>
    <Part g="box" m="#5a6b80" p={[0.06, 0.655, 0.086]} s={[0.012, 0.018, 0.003]}/>
    {/* Radio on the belt */}
    <Part g="box" m="#1e2023" p={[0.115, 0.47, 0.07]} s={[0.03, 0.06, 0.022]}/>
    <Part g="cyl" m="#1e2023" p={[0.118, 0.52, 0.07]} s={[0.008, 0.05, 0.008]}/>
    <HangingArm side={-1} sleeve={c.jacket} skin={skin} cuff={c.band}/>
    <HangingArm side={1} sleeve={c.jacket} skin={skin} cuff={c.band}/>
    <Head id="daniel">
      <Part g="sphere" m="#2a221f" p={[0, 0.858, -0.006]} s={[0.152, 0.1, 0.152]}/>
      <Part g="box" m={c.hair} p={[-0.07, 0.925, 0.0]} s={[0.018, 0.045, 0.05]}/>
      <Part g="box" m={c.hair} p={[0.07, 0.925, 0.0]} s={[0.018, 0.045, 0.05]}/>
      <Part g="dome" m={c.hat} p={[0, 0.952, -0.006]} s={[0.176, 0.13, 0.186]}/>
      <Part g="cyl" m={c.hatRim} p={[0, 0.953, 0.008]} s={[0.192, 0.012, 0.212]}/>
      <Part g="box" m={c.hatRim} p={[0, 1.012, 0]} s={[0.024, 0.016, 0.15]}/>
    </Head>
  </>;
}

// ---------------------------------------------------------------- Aisyah: The Adaptable
// Coral blazer with pushed-up sleeves, cream blouse, lanyard with ID card, black ankle trousers,
// black flats, a cream hijab over a red underscarf, a watch and an open, explaining gesture.
const AISYAH = { jacket: '#d9665b', lapel: '#c3554b', blouse: '#efe6da', trousers: '#2c2d30', shoes: '#1b1d20', hijab: '#ece3d3', band: '#c8323a', lanyard: '#9b3a3a', watch: '#3a3330' };
export function AisyahModel() {
  const c = AISYAH, skin = SKIN.aisyah;
  return <>
    <SlimTrousers color={c.trousers} skin={skin} shoes={c.shoes}/>
    <Jacket color={c.jacket} width={0.95}/>
    <Part g="box" m={c.blouse} p={[0, 0.7, 0.066]} s={[0.07, 0.17, 0.012]} r={[-0.14, 0, 0]}/>
    <Part g="box" m={c.lapel} p={[-0.032, 0.71, 0.072]} s={[0.022, 0.17, 0.01]} r={[-0.14, 0, -0.3]}/>
    <Part g="box" m={c.lapel} p={[0.032, 0.71, 0.072]} s={[0.022, 0.17, 0.01]} r={[-0.14, 0, 0.3]}/>
    {/* Lanyard and ID card */}
    <Part g="box" m={c.lanyard} p={[-0.018, 0.72, 0.078]} s={[0.007, 0.13, 0.004]} r={[-0.14, 0, -0.22]}/>
    <Part g="box" m={c.lanyard} p={[0.018, 0.72, 0.078]} s={[0.007, 0.13, 0.004]} r={[-0.14, 0, 0.22]}/>
    <Part g="box" m="#f4f4f2" p={[0, 0.64, 0.086]} s={[0.036, 0.048, 0.005]}/>
    <Part g="box" m="#6b5a52" p={[0, 0.648, 0.09]} s={[0.014, 0.018, 0.002]}/>
    <HangingArm side={-1} sleeve={c.jacket} skin={skin} rolled/>
    {/* Left forearm forward, palm up, as if explaining */}
    <Limb from={[0.133, 0.765, 0]} to={[0.16, 0.6, 0.02]} radius={0.034} m={c.jacket}/>
    <Limb from={[0.16, 0.6, 0.02]} to={[0.13, 0.6, 0.06]} radius={0.032} m={c.jacket}/>
    <Part g="cyl" m={c.jacket} p={[0.13, 0.6, 0.06]} s={[0.074, 0.028, 0.074]} r={[Math.PI / 2, 0, 0.6]}/>
    <Limb from={[0.13, 0.6, 0.06]} to={[0.07, 0.6, 0.13]} radius={0.025} m={skin}/>
    <Part g="cyl" m={c.watch} p={[0.09, 0.6, 0.11]} s={[0.054, 0.016, 0.054]} r={[Math.PI / 2, 0, 0.8]}/>
    <Part g="sphere" m={skin} p={[0.055, 0.6, 0.145]} s={[0.06, 0.025, 0.05]}/>
    <Head id="aisyah">
      {/* Cream hijab with a red underscarf framing the face */}
      <mesh geometry={geo().hoodBack} material={mat(c.hijab)} position={[0, 0.905, -0.006]} scale={[0.178, 0.208, 0.184]} castShadow/>
      <mesh geometry={geo().hoodTop} material={mat(c.hijab)} position={[0, 0.905, -0.006]} scale={[0.178, 0.208, 0.184]} castShadow/>
      <Part g="ring" m={c.band} p={[0, 0.955, 0.0]} s={[0.165, 0.165, 0.2]} r={[Math.PI / 2 - 0.62, 0, 0]}/>
      <Part g="sphere" m={c.hijab} p={[0, 0.818, -0.004]} s={[0.15, 0.05, 0.12]}/>
    </Head>
    <Part g="frustum" m={c.hijab} p={[0, 0.775, -0.004]} s={[0.3, 0.1, 0.22]}/>
    <Part g="sphere" m={c.hijab} p={[0, 0.73, 0.06]} s={[0.13, 0.11, 0.04]}/>
  </>;
}
