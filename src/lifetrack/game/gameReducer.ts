/**
 * Central LifeTrack state machine. Every action is validated against the
 * current status and phase; invalid or repeated actions return the same state,
 * so double clicks can never pay salary, bills, premiums or claims twice.
 */
import type { AiTurn, CharacterId, ConceptId, EventCard, GameState, PlayerState, PolicyId, RoundPhase } from './types.ts';
import { GAME_CONFIG } from './constants.ts';
import { CHARACTERS, STRATEGY_ORDER, assignControllers } from './characters.ts';
import { createEventDeck } from './deck.ts';
import { getEvent, hasEvent } from './events.ts';
import {
  applyEventOutcome,
  applyIncome,
  applyMonthlyBills,
  applyPass,
  applyPurchase,
  applySave,
  closeRound,
  createPlayer,
  getRoundRecord,
  getRoundSummary,
  lockDecisions,
} from './calculations.ts';
import { playAiTurn } from './aiStrategies.ts';
import { getClaimInsight } from './insights.ts';
import { QUIZ_QUESTIONS, getQuestion } from './quiz.ts';

export type GameAction =
  | { type: 'game/new'; humanId: CharacterId; seed: number }
  | { type: 'game/load'; state: GameState }
  | { type: 'game/clear' }
  | { type: 'round/collect-income' }
  | { type: 'round/pay-bills' }
  | { type: 'decision/save' }
  | { type: 'decision/buy'; policyId: PolicyId }
  | { type: 'decision/pass' }
  | { type: 'decision/reset' }
  | { type: 'decision/confirm' }
  | { type: 'event/draw' }
  | { type: 'event/resolve' }
  | { type: 'claims/continue' }
  | { type: 'round/next' }
  | { type: 'quiz/answer'; questionId: string; optionId: string }
  | { type: 'quiz/finish' }
  | { type: 'insight/dismiss' };

export function createNewGame(humanId: CharacterId, seed: number): GameState {
  const controllers = assignControllers(humanId);
  const seat = (id: CharacterId) => {
    const controller = controllers[id];
    return controller === 'human' ? -1 : STRATEGY_ORDER.indexOf(controller);
  };
  const players = CHARACTERS.map((character) => createPlayer(character.id, controllers[character.id])).sort(
    (a, b) => seat(a.id) - seat(b.id),
  );
  return {
    schemaVersion: 1,
    seed,
    status: 'playing',
    round: 1,
    phase: 'income',
    deck: createEventDeck(seed),
    currentEventId: null,
    humanId,
    players,
    decisionSnapshot: null,
    aiTurns: [],
    quizAnswers: {},
    conceptsSeen: [],
    insight: null,
    insightCounter: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export function getHumanPlayer(state: GameState): PlayerState {
  const human = state.players.find((player) => player.id === state.humanId);
  if (!human) throw new Error('LifeTrack state has no human player');
  return human;
}

export function getAiPlayers(state: GameState): PlayerState[] {
  return state.players.filter((player) => player.controller !== 'human');
}

export function getCurrentEvent(state: GameState): EventCard | null {
  return state.currentEventId ? getEvent(state.currentEventId) : null;
}

export function getAiTurnsForRound(state: GameState, round: number): AiTurn[] {
  return state.aiTurns.filter((turn) => turn.round === round);
}

export function isFinalRound(state: GameState): boolean {
  return state.round >= GAME_CONFIG.totalRounds;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function inPhase(state: GameState, phase: RoundPhase): boolean {
  return state.status === 'playing' && state.phase === phase;
}

function replacePlayer(state: GameState, player: PlayerState): GameState {
  return { ...state, players: state.players.map((p) => (p.id === player.id ? player : p)) };
}

function addConcepts(list: readonly ConceptId[], concepts: readonly ConceptId[]): ConceptId[] {
  const result = list.slice();
  for (const concept of concepts) if (!result.includes(concept)) result.push(concept);
  return result;
}

function withInsight(state: GameState, concept: ConceptId, policyId?: PolicyId): GameState {
  const key = state.insightCounter + 1;
  return {
    ...state,
    insight: { key, concept, round: state.round, policyId },
    insightCounter: key,
    conceptsSeen: addConcepts(state.conceptsSeen, [concept]),
  };
}

function updateHuman(state: GameState, update: (player: PlayerState) => PlayerState): GameState | null {
  if (!inPhase(state, 'decisions')) return null;
  const human = getHumanPlayer(state);
  const next = update(human);
  return next === human ? null : replacePlayer(state, next);
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  switch (action.type) {
    case 'game/new':
      return createNewGame(action.humanId, action.seed);
    case 'game/load':
      return isValidGameState(action.state) ? action.state : state;
    case 'game/clear':
      return null;
    default:
      break;
  }
  if (!state) return state;
  const round = state.round;

  switch (action.type) {
    case 'round/collect-income': {
      if (!inPhase(state, 'income')) return state;
      return { ...state, players: state.players.map((p) => applyIncome(p, round)), phase: 'expenses' };
    }

    case 'round/pay-bills': {
      if (!inPhase(state, 'expenses')) return state;
      const players = state.players.map((p) => applyMonthlyBills(p, round));
      const human = players.find((p) => p.id === state.humanId) ?? null;
      return { ...state, players, phase: 'decisions', decisionSnapshot: human };
    }

    case 'decision/save': {
      const next = updateHuman(state, (p) => applySave(p, round));
      if (!next) return state;
      return state.conceptsSeen.includes('emergency-savings') ? next : withInsight(next, 'emergency-savings');
    }

    case 'decision/buy': {
      const next = updateHuman(state, (p) => applyPurchase(p, action.policyId, round));
      return next ? withInsight(next, 'premium', action.policyId) : state;
    }

    case 'decision/pass':
      return updateHuman(state, (p) => applyPass(p, round)) ?? state;

    case 'decision/reset': {
      if (!inPhase(state, 'decisions') || !state.decisionSnapshot) return state;
      if (getHumanPlayer(state) === state.decisionSnapshot) return state;
      return { ...replacePlayer(state, state.decisionSnapshot), insight: null };
    }

    case 'decision/confirm': {
      if (!inPhase(state, 'decisions') || getHumanPlayer(state).actionPoints > 0) return state;
      const turns: AiTurn[] = [];
      const players = state.players.map((player) => {
        if (player.controller === 'human') return lockDecisions(player, round);
        const result = playAiTurn(player, round);
        turns.push(result.turn);
        return result.player;
      });
      return { ...state, players, aiTurns: [...state.aiTurns, ...turns], decisionSnapshot: null, phase: 'event-draw' };
    }

    case 'event/draw': {
      if (!inPhase(state, 'event-draw')) return state;
      const eventId = state.deck[round - 1];
      if (!eventId) return state;
      return { ...state, currentEventId: eventId, phase: 'event' };
    }

    case 'event/resolve': {
      if (!inPhase(state, 'event') || !state.currentEventId) return state;
      const event = getEvent(state.currentEventId);
      const players = state.players.map((player) => applyEventOutcome(player, event, round));
      const human = players.find((p) => p.id === state.humanId);
      const claim = human ? getRoundRecord(human, round)?.claim : null;
      const premiums = human ? (getRoundSummary(human, round)?.premiums ?? 0) : 0;
      const learned: ConceptId[] = [event.lesson.concept];
      if (claim) learned.push(getClaimInsight(claim, event, premiums).concept);
      return { ...state, players, phase: 'claims', insight: null, conceptsSeen: addConcepts(state.conceptsSeen, learned) };
    }

    case 'claims/continue': {
      if (!inPhase(state, 'claims')) return state;
      return { ...state, players: state.players.map((p) => closeRound(p, round)), phase: 'summary' };
    }

    case 'round/next': {
      if (!inPhase(state, 'summary')) return state;
      if (round >= GAME_CONFIG.totalRounds) return { ...state, status: 'review', insight: null };
      return { ...state, round: round + 1, phase: 'income', currentEventId: null, insight: null };
    }

    case 'quiz/answer': {
      if (state.status !== 'review' || state.quizAnswers[action.questionId] !== undefined) return state;
      const question = getQuestion(action.questionId);
      if (!question || !question.options.some((option) => option.id === action.optionId)) return state;
      return { ...state, quizAnswers: { ...state.quizAnswers, [action.questionId]: action.optionId } };
    }

    case 'quiz/finish': {
      if (state.status !== 'review') return state;
      if (!QUIZ_QUESTIONS.every((question) => state.quizAnswers[question.id] !== undefined)) return state;
      return { ...state, status: 'complete', conceptsSeen: addConcepts(state.conceptsSeen, QUIZ_QUESTIONS.map((q) => q.concept)) };
    }

    case 'insight/dismiss':
      return state.insight ? { ...state, insight: null } : state;

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Saved-game validation                                               */
/* ------------------------------------------------------------------ */

const PHASES: readonly RoundPhase[] = ['income', 'expenses', 'decisions', 'event-draw', 'event', 'claims', 'summary'];
const STATUSES: readonly GameState['status'][] = ['playing', 'review', 'complete'];

function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Structural check for a saved game so a corrupted or outdated save is never loaded. */
export function isValidGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<GameState>;
  if (state.schemaVersion !== 1) return false;
  if (!STATUSES.includes(state.status as GameState['status'])) return false;
  if (!PHASES.includes(state.phase as RoundPhase)) return false;
  if (typeof state.round !== 'number' || state.round < 1 || state.round > GAME_CONFIG.totalRounds) return false;
  if (!Array.isArray(state.deck) || state.deck.length < GAME_CONFIG.totalRounds || !state.deck.every((id) => hasEvent(id))) return false;
  if (!Array.isArray(state.players) || state.players.length !== CHARACTERS.length) return false;
  if (!state.players.some((p) => p.id === state.humanId && p.controller === 'human')) return false;
  return state.players.every(
    (p) => isMoney(p.cash) && isMoney(p.savings) && Array.isArray(p.history) && Array.isArray(p.policies) && p.history.length <= state.round!,
  );
}
