/**
 * Chibi board-game miniatures for the four characters, in the palettes of their
 * illustrations (CharacterArt). Built from shared unit shapes; each figure is static
 * and batched by its pawn. Each character has its own silhouette:
 * Alex glasses and a piggy bank (The Saver), Mei Ling a bun, skirt and planner tablet,
 * Daniel a hard hat and hi-vis vest, Aisyah big wavy hair with a red headband.
 */
import type { CharacterId } from '../game/types.ts';
import { CHARACTER_LOOKS } from '../components/CharacterArt.tsx';
import { PLAYER_COLOR } from './boardWorld.ts';
import { geo, mat } from './kit3d.ts';

/** Figure scale over its base; the figure is ~0.6 units tall before scaling. */
export const FIGURE_SCALE = 1.35;
/** Top of the tallest figure (with hat or bun), in pawn space. */
export const FIGURE_TOP = 0.62 * FIGURE_SCALE;

const INK = '#25333b', LIPS = '#a2564f', BLUSH = '#ec9f94', SHOE = '#263744';

type V3 = [number, number, number];
function Part({ g, m, p, s, r }: { g: keyof ReturnType<typeof geo>; m: string; p: V3; s: V3; r?: V3 }) {
  return <mesh geometry={geo()[g]} material={mat(m)} position={p} scale={s} rotation={r} castShadow/>;
}

/** Head and face shared by all characters (head centre y 0.44, radius ~0.1, facing +Z). */
function Face({ skin, brow, smile }: { skin: string; brow: string; smile: boolean }) {
  return <>
    <Part g="sphere" m={skin} p={[0, 0.44, 0]} s={[0.21, 0.2, 0.2]}/>
    <Part g="sphere" m={skin} p={[-0.104, 0.435, -0.005]} s={[0.04, 0.05, 0.03]}/>
    <Part g="sphere" m={skin} p={[0.104, 0.435, -0.005]} s={[0.04, 0.05, 0.03]}/>
    <Part g="sphere" m={INK} p={[-0.04, 0.445, 0.092]} s={[0.026, 0.034, 0.014]}/>
    <Part g="sphere" m={INK} p={[0.04, 0.445, 0.092]} s={[0.026, 0.034, 0.014]}/>
    <Part g="sphere" m="#ffffff" p={[-0.035, 0.452, 0.099]} s={[0.008, 0.008, 0.004]}/>
    <Part g="sphere" m="#ffffff" p={[0.045, 0.452, 0.099]} s={[0.008, 0.008, 0.004]}/>
    <Part g="box" m={brow} p={[-0.042, 0.482, 0.09]} s={[0.04, 0.008, 0.008]} r={[0, 0, 0.12]}/>
    <Part g="box" m={brow} p={[0.042, 0.482, 0.09]} s={[0.04, 0.008, 0.008]} r={[0, 0, -0.12]}/>
    {smile
      ? <Part g="ring" m={LIPS} p={[0, 0.413, 0.093]} s={[0.034, 0.026, 0.03]} r={[0, 0, Math.PI]}/>
      : <Part g="box" m={LIPS} p={[0, 0.403, 0.097]} s={[0.032, 0.007, 0.006]}/>}
    <Part g="sphere" m={BLUSH} p={[-0.068, 0.418, 0.078]} s={[0.032, 0.016, 0.01]}/>
    <Part g="sphere" m={BLUSH} p={[0.068, 0.418, 0.078]} s={[0.032, 0.016, 0.01]}/>
  </>;
}

/** Sleeves and hands; `holdRight` bends the right arm forward to carry a prop. */
function Arms({ sleeve, skin, wide = 1, holdRight = false }: { sleeve: string; skin: string; wide?: number; holdRight?: boolean }) {
  const x = 0.088 * wide;
  return <>
    <Part g="capsule" m={sleeve} p={[-x, 0.25, 0]} s={[0.042, 0.055, 0.042]} r={[0, 0, -0.16]}/>
    <Part g="sphere" m={skin} p={[-x - 0.016, 0.172, 0]} s={[0.04, 0.04, 0.04]}/>
    {holdRight ? <>
      <Part g="capsule" m={sleeve} p={[x, 0.26, 0.03]} s={[0.042, 0.05, 0.042]} r={[-0.9, 0, 0.1]}/>
      <Part g="sphere" m={skin} p={[x + 0.004, 0.215, 0.085]} s={[0.04, 0.04, 0.04]}/>
    </> : <>
      <Part g="capsule" m={sleeve} p={[x, 0.25, 0]} s={[0.042, 0.055, 0.042]} r={[0, 0, 0.16]}/>
      <Part g="sphere" m={skin} p={[x + 0.016, 0.172, 0]} s={[0.04, 0.04, 0.04]}/>
    </>}
  </>;
}

function Legs({ pants }: { pants: string }) {
  return <>
    <Part g="capsule" m={pants} p={[-0.034, 0.125, 0]} s={[0.05, 0.05, 0.05]}/>
    <Part g="capsule" m={pants} p={[0.034, 0.125, 0]} s={[0.05, 0.05, 0.05]}/>
    <Part g="sphere" m={SHOE} p={[-0.034, 0.058, 0.014]} s={[0.058, 0.04, 0.085]}/>
    <Part g="sphere" m={SHOE} p={[0.034, 0.058, 0.014]} s={[0.058, 0.04, 0.085]}/>
  </>;
}

function Alex() {
  const look = CHARACTER_LOOKS.alex;
  return <>
    <Legs pants={look.pants}/>
    <Part g="capsule" m={look.shirt} p={[0, 0.255, 0]} s={[0.128, 0.05, 0.098]}/>
    <Part g="box" m={look.accent} p={[0, 0.262, 0.05]} s={[0.026, 0.1, 0.01]}/>
    <Part g="box" m="#f7f4ec" p={[0, 0.315, 0.044]} s={[0.07, 0.022, 0.012]}/>
    <Arms sleeve={look.shirt} skin={look.skin} holdRight/>
    <Face skin={look.skin} brow={look.hair} smile/>
    <Part g="dome" m={look.hair} p={[0, 0.458, -0.012]} s={[0.218, 0.15, 0.212]} r={[-0.25, 0, 0]}/>
    <Part g="box" m={look.hair} p={[0.025, 0.522, 0.062]} s={[0.15, 0.035, 0.06]} r={[0.3, 0, -0.18]}/>
    <Part g="ring" m="#3b4c55" p={[-0.04, 0.445, 0.1]} s={[0.062, 0.056, 0.05]}/>
    <Part g="ring" m="#3b4c55" p={[0.04, 0.445, 0.1]} s={[0.062, 0.056, 0.05]}/>
    <Part g="box" m="#3b4c55" p={[0, 0.448, 0.102]} s={[0.022, 0.006, 0.006]}/>
    {/* Piggy bank */}
    <group position={[0.098, 0.21, 0.12]}>
      <Part g="sphere" m="#f2a7b5" p={[0, 0, 0]} s={[0.085, 0.07, 0.1]}/>
      <Part g="cyl" m="#e48b9c" p={[0, 0, 0.05]} s={[0.035, 0.016, 0.035]} r={[Math.PI / 2, 0, 0]}/>
      <Part g="cone" m="#e48b9c" p={[-0.022, 0.035, 0.02]} s={[0.02, 0.025, 0.02]}/>
      <Part g="cone" m="#e48b9c" p={[0.022, 0.035, 0.02]} s={[0.02, 0.025, 0.02]}/>
      <Part g="box" m="#a3566a" p={[0, 0.036, -0.01]} s={[0.006, 0.004, 0.03]}/>
    </group>
  </>;
}

function MeiLing() {
  const look = CHARACTER_LOOKS.meiling;
  return <>
    <Legs pants={look.skin}/>
    <Part g="frustum" m={look.pants} p={[0, 0.165, 0]} s={[0.25, 0.11, 0.22]}/>
    <Part g="capsule" m={look.shirt} p={[0, 0.262, 0]} s={[0.118, 0.045, 0.092]}/>
    <Part g="ring" m={look.accent} p={[0, 0.322, 0.008]} s={[0.085, 0.085, 0.06]} r={[Math.PI / 2 - 0.35, 0, 0]}/>
    <Arms sleeve={look.shirt} skin={look.skin} holdRight/>
    <Face skin={look.skin} brow={look.hair} smile/>
    <Part g="dome" m={look.hair} p={[0, 0.455, -0.012]} s={[0.225, 0.16, 0.218]} r={[-0.3, 0, 0]}/>
    <Part g="capsule" m={look.hair} p={[0, 0.4, -0.07]} s={[0.2, 0.06, 0.07]}/>
    <Part g="sphere" m={look.hair} p={[0, 0.575, -0.06]} s={[0.1, 0.09, 0.1]}/>
    <Part g="ring" m={look.accent} p={[0, 0.545, -0.055]} s={[0.07, 0.07, 0.06]} r={[Math.PI / 2 + 0.4, 0, 0]}/>
    {/* Planner tablet */}
    <Part g="box" m="#2f3d46" p={[0.1, 0.235, 0.11]} s={[0.075, 0.1, 0.012]} r={[-0.5, 0, 0]}/>
    <Part g="box" m="#cfe3ea" p={[0.1, 0.238, 0.117]} s={[0.06, 0.082, 0.004]} r={[-0.5, 0, 0]}/>
  </>;
}

function Daniel() {
  const look = CHARACTER_LOOKS.daniel;
  return <>
    <Legs pants={look.pants}/>
    <Part g="capsule" m={look.shirt} p={[0, 0.255, 0]} s={[0.15, 0.05, 0.11]}/>
    {/* Hi-vis vest with a reflective band */}
    <Part g="capsule" m="#f08c2e" p={[0, 0.258, 0.002]} s={[0.156, 0.042, 0.115]}/>
    <Part g="cyl" m="#f4f1e6" p={[0, 0.24, 0.002]} s={[0.158, 0.018, 0.118]}/>
    <Part g="box" m={look.shirt} p={[0, 0.3, 0.056]} s={[0.035, 0.05, 0.01]}/>
    <Arms sleeve={look.shirt} skin={look.skin} wide={1.12}/>
    <Face skin={look.skin} brow={look.hair} smile={false}/>
    {/* Hard hat */}
    <Part g="dome" m="#e8b93f" p={[0, 0.475, 0]} s={[0.232, 0.17, 0.232]}/>
    <Part g="cyl" m="#e8b93f" p={[0, 0.478, 0.012]} s={[0.27, 0.014, 0.27]}/>
    <Part g="box" m="#f3d27a" p={[0, 0.555, 0]} s={[0.026, 0.018, 0.2]}/>
  </>;
}

function Aisyah() {
  const look = CHARACTER_LOOKS.aisyah;
  return <>
    <Legs pants={look.pants}/>
    <Part g="capsule" m={look.shirt} p={[0, 0.255, 0]} s={[0.124, 0.05, 0.096]}/>
    <Part g="box" m={look.accent} p={[0, 0.262, 0.049]} s={[0.022, 0.09, 0.008]}/>
    <Part g="cyl" m="#ffffff" p={[0.045, 0.285, 0.047]} s={[0.032, 0.006, 0.032]} r={[Math.PI / 2, 0, 0]}/>
    <Part g="box" m={look.accent} p={[0.045, 0.285, 0.051]} s={[0.006, 0.02, 0.004]}/>
    <Arms sleeve={look.shirt} skin={look.skin}/>
    <Face skin={look.skin} brow={look.hair} smile/>
    {/* Big wavy hair with a red headband */}
    <Part g="dome" m={look.hair} p={[0, 0.462, -0.008]} s={[0.236, 0.17, 0.228]} r={[-0.2, 0, 0]}/>
    <Part g="sphere" m={look.hair} p={[-0.105, 0.39, -0.03]} s={[0.1, 0.16, 0.12]}/>
    <Part g="sphere" m={look.hair} p={[0.105, 0.39, -0.03]} s={[0.1, 0.16, 0.12]}/>
    <Part g="sphere" m={look.hair} p={[0, 0.38, -0.085]} s={[0.22, 0.2, 0.1]}/>
    <Part g="ring" m="#c8102e" p={[0, 0.505, 0.004]} s={[0.21, 0.21, 0.2]} r={[Math.PI / 2 - 0.32, 0, 0]}/>
  </>;
}

const BODIES: Record<CharacterId, () => React.JSX.Element> = { alex: Alex, meiling: MeiLing, daniel: Daniel, aisyah: Aisyah };

export function Figure({ id, human }: { id: CharacterId; human: boolean }) {
  const Body = BODIES[id];
  return <group>
    {/* Base: player colour disc; the human player gets a red rim. */}
    <Part g="cyl" m={PLAYER_COLOR[id]} p={[0, 0.02, 0]} s={[0.26, 0.04, 0.26]}/>
    <Part g="ring" m={human ? '#c8102e' : '#ffffff'} p={[0, 0.042, 0]} s={[0.25, 0.25, 0.25]} r={[Math.PI / 2, 0, 0]}/>
    <group scale={FIGURE_SCALE}><Body/></group>
  </group>;
}
