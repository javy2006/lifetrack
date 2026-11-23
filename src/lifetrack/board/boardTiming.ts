/**
 * Presentation timing for board turns. Only decides how long things are shown;
 * the roll itself always comes from `rollBoardDie` before any of these delays.
 */
export interface TurnTiming {
  /** Die tumbles with its value hidden. */
  tumbleMs: number;
  /** Rolled value is shown before the pawn starts moving. */
  revealMs: number;
  /** One space: hop plus a short rest so each step reads separately. */
  stepMs: number;
  /** Pawn rests on its landing space before the next window opens. */
  landMs: number;
}

export interface BoardTiming { human: TurnTiming; ai: TurnTiming }

const FULL: BoardTiming = {
  human: { tumbleMs: 950, revealMs: 650, stepMs: 380, landMs: 1100 },
  ai: { tumbleMs: 550, revealMs: 450, stepMs: 300, landMs: 650 },
};

/** Reduced motion: no tumble and no hops (pawns snap), but every step and the result stay visible. */
const REDUCED: BoardTiming = {
  human: { tumbleMs: 0, revealMs: 600, stepMs: 220, landMs: 900 },
  ai: { tumbleMs: 0, revealMs: 350, stepMs: 160, landMs: 450 },
};

export function getBoardTiming(reducedMotion: boolean): BoardTiming {
  return reducedMotion ? REDUCED : FULL;
}

/** Share of a step spent hopping; the rest is a pause on the tile. */
export const STEP_HOP_SHARE = 0.72;

/** Total time a turn is on screen for a given roll. */
export function turnDurationMs(timing: TurnTiming, roll: number): number {
  return timing.tumbleMs + timing.revealMs + timing.stepMs * Math.max(0, roll) + timing.landMs;
}

export function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
