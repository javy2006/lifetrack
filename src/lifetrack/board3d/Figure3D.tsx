/**
 * A player's piece on the board: the profession token (Tokens3D). Kept as a thin module so the pawn
 * logic (Pawn3D) does not depend on how the piece is modelled.
 */
import type { CharacterId } from '../game/types.ts';
import { TOKEN_TOP, Token } from './Tokens3D.tsx';

/** Top of the tallest token, in pawn space (for the turn marker). */
export const FIGURE_TOP = TOKEN_TOP;

export function Figure({ id, human }: { id: CharacterId; human: boolean }) {
  return <Token id={id} human={human}/>;
}
