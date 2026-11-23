/**
 * A character on the board: the reference-based 3D model (CharacterModels) standing directly on the
 * tile. There is no display pedestal; a thin ring at the feet marks the player's colour (red for you).
 */
import type { CharacterId } from '../game/types.ts';
import { PLAYER_COLOR } from './boardWorld.ts';
import { AisyahModel, AlexModel, MeiLingModel, Part, VikramModel } from './CharacterModels.tsx';

/** Models are 1 unit tall; this sets their height on the board (a tile is 1 unit wide). */
export const MODEL_SCALE = 0.9;
/** Top of the tallest figure (Vikram's hard hat) in pawn space. */
export const FIGURE_TOP = 1.04 * MODEL_SCALE;

const MODELS: Record<CharacterId, () => React.JSX.Element> = { alex: AlexModel, meiling: MeiLingModel, daniel: VikramModel, aisyah: AisyahModel };

export function Figure({ id, human }: { id: CharacterId; human: boolean }) {
  const Model = MODELS[id];
  return <group>
    <Part g="ring" m={human ? '#c8102e' : PLAYER_COLOR[id]} p={[0, 0.006, 0]} s={[0.3, 0.3, 0.14]} r={[Math.PI / 2, 0, 0]}/>
    <group scale={MODEL_SCALE}><Model/></group>
  </group>;
}
