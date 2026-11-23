/**
 * Profession tokens: collectible board-game pieces for the four characters (replacing human figures).
 *  - Alex (Junior Accountant, The Saver): a navy calculator standing on a red ledger.
 *  - Mei Ling (UX Designer, The Balanced Planner): a purple design tablet on a stand, with a stylus.
 *  - Vikram (Site Engineer, Protection First): a yellow safety helmet resting on a rolled blueprint.
 *  - Aisyah (Marketing Executive, The Adaptable): a coral megaphone with a smartphone.
 * Each stands on a cream base (radius 0.19, so four tokens fit on one tile) with a rim in the player's colour. ~0.65 tall, facing +Z.
 */
import type { CharacterId } from '../game/types.ts';
import { PLAYER_COLOR } from './boardWorld.ts';
import { geo, mat } from './kit3d.ts';

type V3 = [number, number, number];
type Shape = keyof ReturnType<typeof geo>;
export function Part({ g, m, p, s, r, gloss = false }: { g: Shape; m: string; p: V3; s: V3; r?: V3; gloss?: boolean }) {
  return <mesh geometry={geo()[g]} material={mat(m, gloss ? { roughness: 0.35, metalness: 0.15 } : {})} position={p} scale={s} rotation={r} castShadow/>;
}

/** Height of the top of the tallest token, for the turn marker. */
export const TOKEN_TOP = 0.66;
const BASE_TOP = 0.07;

function Base({ id }: { id: CharacterId }) {
  const c = PLAYER_COLOR[id];
  return <>
    <Part g="cyl" m="#f6f1e6" p={[0, 0.03, 0]} s={[0.38, 0.06, 0.38]} gloss/>
    <Part g="ring" m={c} p={[0, 0.06, 0]} s={[0.36, 0.36, 0.3]} r={[Math.PI / 2, 0, 0]} gloss/>
    <Part g="cyl" m={c} p={[0, 0.062, 0]} s={[0.25, 0.008, 0.25]}/>
  </>;
}

function Calculator() {
  const keys: V3[] = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) keys.push([-0.07 + col * 0.07, 0.035 - row * 0.055, 0.044]);
  return <>
    {/* Ledger */}
    <Part g="box" m="#9b2f35" p={[0, BASE_TOP + 0.03, 0]} s={[0.32, 0.06, 0.24]} gloss/>
    <Part g="box" m="#f4efe2" p={[0.006, BASE_TOP + 0.03, 0.004]} s={[0.3, 0.044, 0.235]}/>
    <Part g="box" m="#d6a44b" p={[-0.12, BASE_TOP + 0.061, 0.0]} s={[0.012, 0.004, 0.24]}/>
    {/* Calculator, leaning back slightly */}
    <group position={[0, BASE_TOP + 0.26, -0.02]} rotation={[-0.22, 0, 0]}>
      <Part g="box" m="#27324f" p={[0, 0, 0]} s={[0.27, 0.38, 0.08]} gloss/>
      <Part g="box" m="#cfe3d4" p={[0, 0.12, 0.042]} s={[0.21, 0.08, 0.008]}/>
      <Part g="box" m="#3a4b44" p={[0.04, 0.12, 0.047]} s={[0.1, 0.02, 0.002]}/>
      {keys.map((k, i) => <Part key={i} g="box" m={i === 11 ? '#c8102e' : '#f4f1ea'} p={[k[0], k[1] - 0.05, k[2]]} s={[0.05, 0.038, 0.014]}/>)}
    </group>
  </>;
}

function Tablet() {
  return <>
    {/* Stand */}
    <Part g="box" m="#e6e0f0" p={[0, BASE_TOP + 0.02, 0.04]} s={[0.26, 0.04, 0.12]}/>
    <group position={[0, BASE_TOP + 0.26, -0.01]} rotation={[-0.28, 0, 0]}>
      <Part g="box" m="#5b4b7a" p={[0, 0, 0]} s={[0.32, 0.42, 0.03]} gloss/>
      <Part g="box" m="#f3f0f8" p={[0, 0, 0.016]} s={[0.28, 0.37, 0.004]}/>
      {/* A simple wireframe on screen */}
      <Part g="box" m="#7d68a6" p={[0, 0.13, 0.019]} s={[0.22, 0.05, 0.003]}/>
      <Part g="box" m="#cdbfe6" p={[-0.06, 0.02, 0.019]} s={[0.1, 0.1, 0.003]}/>
      <Part g="box" m="#9fd3c7" p={[0.065, 0.045, 0.019]} s={[0.09, 0.05, 0.003]}/>
      <Part g="box" m="#cdbfe6" p={[0.065, -0.02, 0.019]} s={[0.09, 0.04, 0.003]}/>
      <Part g="box" m="#d6a44b" p={[0, -0.12, 0.019]} s={[0.12, 0.035, 0.003]}/>
    </group>
    {/* Stylus leaning on the tablet */}
    <group position={[0.17, BASE_TOP + 0.17, 0.05]} rotation={[0, 0, -0.32]}>
      <Part g="cylLow" m="#d6c8ee" p={[0, 0, 0]} s={[0.022, 0.3, 0.022]} gloss/>
      <Part g="cone" m="#5b4b7a" p={[0, -0.165, 0]} s={[0.022, 0.035, 0.022]} r={[Math.PI, 0, 0]}/>
    </group>
  </>;
}

function HardHat() {
  return <>
    {/* Rolled blueprint */}
    <Part g="cyl" m="#3c6e9e" p={[0, BASE_TOP + 0.075, 0]} s={[0.15, 0.36, 0.15]} r={[0, 0, Math.PI / 2]}/>
    <Part g="cyl" m="#f4f4f0" p={[0.181, BASE_TOP + 0.075, 0]} s={[0.12, 0.004, 0.12]} r={[0, 0, Math.PI / 2]}/>
    <Part g="cyl" m="#f4f4f0" p={[-0.181, BASE_TOP + 0.075, 0]} s={[0.12, 0.004, 0.12]} r={[0, 0, Math.PI / 2]}/>
    <Part g="box" m="#dfe9f2" p={[0, BASE_TOP + 0.14, 0.02]} s={[0.16, 0.004, 0.06]} r={[-0.5, 0, 0]}/>
    {/* Helmet */}
    <group position={[0, BASE_TOP + 0.15, 0]}>
      <Part g="cyl" m="#e8b52a" p={[0, 0.02, 0.02]} s={[0.4, 0.022, 0.42]} gloss/>
      <Part g="dome" m="#f2c22e" p={[0, 0.03, 0]} s={[0.32, 0.32, 0.34]} gloss/>
      <Part g="cyl" m="#27324f" p={[0, 0.05, 0]} s={[0.325, 0.03, 0.345]}/>
      <Part g="box" m="#f6d66a" p={[0, 0.19, 0]} s={[0.05, 0.03, 0.27]} gloss/>
    </group>
  </>;
}

function Megaphone() {
  return <>
    {/* Smartphone leaning against the base */}
    <Part g="box" m="#1f2328" p={[-0.12, BASE_TOP + 0.1, 0.08]} s={[0.1, 0.2, 0.014]} r={[-0.3, 0.3, 0]} gloss/>
    <Part g="box" m="#f0a040" p={[-0.118, BASE_TOP + 0.103, 0.088]} s={[0.084, 0.17, 0.002]} r={[-0.3, 0.3, 0]}/>
    {/* Megaphone pointing up and out */}
    <group position={[0.03, BASE_TOP + 0.24, 0]} rotation={[0.85, 0, -0.2]}>
      <Part g="cylLow" m="#2f3540" p={[0, -0.2, 0]} s={[0.07, 0.07, 0.07]}/>
      <mesh geometry={geo().frustum} material={mat('#e06a55', { roughness: 0.4, metalness: 0.1 })} position={[0, 0, 0]} rotation={[Math.PI, 0, 0]} scale={[0.34, 0.34, 0.34]} castShadow/>
      <Part g="ring" m="#f0a040" p={[0, 0.17, 0]} s={[0.34, 0.34, 0.5]} r={[Math.PI / 2, 0, 0]} gloss/>
      <Part g="cyl" m="#fbe5d6" p={[0, 0.168, 0]} s={[0.3, 0.004, 0.3]}/>
      <Part g="box" m="#2f3540" p={[0, -0.06, 0.09]} s={[0.04, 0.12, 0.04]} r={[0.3, 0, 0]}/>
    </group>
  </>;
}

const TOKENS: Record<CharacterId, () => React.JSX.Element> = { alex: Calculator, meiling: Tablet, daniel: HardHat, aisyah: Megaphone };

export function Token({ id, human }: { id: CharacterId; human: boolean }) {
  const Body = TOKENS[id];
  return <group>
    {/* Thin ring on the tile: red for you, the player's colour for rivals. */}
    <Part g="ring" m={human ? '#c8102e' : PLAYER_COLOR[id]} p={[0, 0.004, 0]} s={[0.44, 0.44, 0.12]} r={[Math.PI / 2, 0, 0]}/>
    <Base id={id}/>
    <Body/>
  </group>;
}
