/**
 * Deterministic AI rivals. Each strategy only sees its own public financial
 * state (never the event deck) and acts through the same engine functions and
 * affordability checks as the human player.
 */
import type { AiTurn, CharacterId, PlayerAction, PlayerState, PolicyId, StrategyId } from './types.ts';
import { AI_TUNING, GAME_CONFIG } from './constants.ts';
import { POLICIES } from './policies.ts';
import {
  applyPass,
  applyPurchase,
  applySave,
  checkPurchase,
  checkSave,
  getMonthlyPremiumTotal,
  getRoundRecord,
  hasPolicy,
  lockDecisions,
  sumMoney,
} from './calculations.ts';
import { getCharacter } from './characters.ts';
import { formatRM, joinWithAnd } from './format.ts';

export type AiIntent = { kind: 'save' } | { kind: 'buy'; policyId: PolicyId } | { kind: 'pass' };

export interface AiChoice {
  intent: AiIntent;
  reason: string;
}

export interface AiStrategyDefinition {
  id: StrategyId;
  title: string;
  summary: string;
  rules: readonly string[];
  choose(player: PlayerState, round: number): AiChoice;
}

const SAVE = GAME_CONFIG.saveAmount;
const saverTuning = AI_TUNING.saver;
const balancedTuning = AI_TUNING.balanced;
const protectionTuning = AI_TUNING.protection;

const saver: AiStrategyDefinition = {
  id: 'saver',
  title: 'The Saver',
  summary: 'Savings first. Adds only low-cost protection once a cash cushion is in place.',
  rules: [
    `Moves ${formatRM(SAVE)} into emergency savings whenever cash allows.`,
    `From month ${saverTuning.earliestPurchaseRound}, adds ${POLICIES[saverTuning.policy].name} once savings reach ${formatRM(saverTuning.minSavingsBeforePurchase)}, but only if total premiums stay at or below ${formatRM(saverTuning.maxMonthlyPremiums)} a month.`,
    'Keeps cash when neither is possible.',
  ],
  choose(player, round) {
    const policyId: PolicyId = saverTuning.policy;
    const premium = POLICIES[policyId].monthlyPremium;
    const manageable = getMonthlyPremiumTotal(player) + premium <= saverTuning.maxMonthlyPremiums;
    if (
      round >= saverTuning.earliestPurchaseRound &&
      player.savings >= saverTuning.minSavingsBeforePurchase &&
      manageable &&
      checkPurchase(player, policyId, round).allowed
    ) {
      return {
        intent: { kind: 'buy', policyId },
        reason: `With ${formatRM(player.savings)} saved, a ${formatRM(premium)} premium barely dents the monthly budget.`,
      };
    }
    if (checkSave(player, round).allowed) return { intent: { kind: 'save' }, reason: 'Building the emergency cushion comes first.' };
    return { intent: { kind: 'pass' }, reason: 'Not enough spare cash to save this time.' };
  },
};

const balanced: AiStrategyDefinition = {
  id: 'balanced',
  title: 'The Balanced Planner',
  summary: 'Basic medical protection early, steady savings, and low-cost extra cover once savings are on track.',
  rules: [
    `Buys ${POLICIES[balancedTuning.policy].name} as soon as the premium is affordable with ${formatRM(SAVE)} left to save.`,
    `From month ${balancedTuning.followUpFromRound}, adds ${POLICIES[balancedTuning.followUpPolicy].name} once savings reach ${formatRM(balancedTuning.followUpMinSavings)}, keeping total premiums at or below ${formatRM(balancedTuning.maxMonthlyPremiums)} a month.`,
    `Otherwise moves ${formatRM(SAVE)} into emergency savings.`,
  ],
  choose(player, round) {
    const policyId: PolicyId = balancedTuning.policy;
    const premium = POLICIES[policyId].monthlyPremium;
    if (!hasPolicy(player, policyId) && player.cash >= premium + SAVE && checkPurchase(player, policyId, round).allowed) {
      return { intent: { kind: 'buy', policyId }, reason: 'A big hospital bill is the shock to cover first.' };
    }
    const followUp: PolicyId = balancedTuning.followUpPolicy;
    if (
      hasPolicy(player, policyId) &&
      round >= balancedTuning.followUpFromRound &&
      player.savings >= balancedTuning.followUpMinSavings &&
      getMonthlyPremiumTotal(player) + POLICIES[followUp].monthlyPremium <= balancedTuning.maxMonthlyPremiums &&
      checkPurchase(player, followUp, round).allowed
    ) {
      return { intent: { kind: 'buy', policyId: followUp }, reason: 'Savings are on track, so low-cost accident cover fits the budget.' };
    }
    if (checkSave(player, round).allowed) {
      return {
        intent: { kind: 'save' },
        reason: hasPolicy(player, policyId) ? 'Basic cover is in place, so savings grow steadily.' : 'Saving while keeping options open.',
      };
    }
    return { intent: { kind: 'pass' }, reason: 'Keeping cash available this month.' };
  },
};

const protection: AiStrategyDefinition = {
  id: 'protection',
  title: 'The Protection First',
  summary: 'Covers the biggest financial shocks early and accepts less cash on hand.',
  rules: [
    `Buys policies in this order: ${protectionTuning.priority.map((id) => POLICIES[id].name).join(', ')}.`,
    `Keeps total premiums at or below ${formatRM(protectionTuning.maxMonthlyPremiums)} a month and only buys when cash covers the first premium.`,
    `Saves ${formatRM(SAVE)} when no suitable policy is left to buy.`,
  ],
  choose(player, round) {
    for (const policyId of protectionTuning.priority) {
      if (hasPolicy(player, policyId)) continue;
      if (getMonthlyPremiumTotal(player) + POLICIES[policyId].monthlyPremium > protectionTuning.maxMonthlyPremiums) continue;
      if (!checkPurchase(player, policyId, round).allowed) continue;
      return { intent: { kind: 'buy', policyId }, reason: 'Large financial shocks get covered first.' };
    }
    if (checkSave(player, round).allowed) {
      return { intent: { kind: 'save' }, reason: 'Chosen protection is active, so the rest goes to savings.' };
    }
    return { intent: { kind: 'pass' }, reason: 'Keeping cash for upcoming premiums.' };
  },
};

export const AI_STRATEGIES: Record<StrategyId, AiStrategyDefinition> = { saver, balanced, protection };

function applyIntent(player: PlayerState, intent: AiIntent, round: number): PlayerState {
  switch (intent.kind) {
    case 'save':
      return applySave(player, round);
    case 'buy':
      return applyPurchase(player, intent.policyId, round);
    case 'pass':
      return applyPass(player, round);
  }
}

export function describeAiTurn(playerId: CharacterId, actions: readonly PlayerAction[]): string {
  const character = getCharacter(playerId);
  const bought = actions.flatMap((action) => (action.kind === 'buy' ? [POLICIES[action.policyId].name] : []));
  const saved = sumMoney(actions.filter((action) => action.kind === 'save').map((action) => action.amount));
  const parts: string[] = [];
  if (bought.length > 0) parts.push(`purchased ${joinWithAnd(bought)}`);
  if (saved > 0) parts.push(`moved ${formatRM(saved)} into emergency savings`);
  if (parts.length === 0) return `${character.name} kept ${character.pronouns.possessive} cash this month.`;
  return `${character.name} ${joinWithAnd(parts)}.`;
}

/** Plays every action point for an AI player, then locks its decisions. */
export function playAiTurn(player: PlayerState, round: number): { player: PlayerState; turn: AiTurn } {
  if (player.controller === 'human') throw new Error('playAiTurn called for the human player');
  const strategy = AI_STRATEGIES[player.controller];
  const reasons: string[] = [];
  let current = player;
  for (let guard = 0; current.actionPoints > 0 && guard < 10; guard++) {
    const choice = strategy.choose(current, round);
    let next = applyIntent(current, choice.intent, round);
    // Defensive: a rejected intent falls back to passing so the turn always completes.
    if (next === current) next = applyPass(current, round);
    if (next === current) break;
    if (!reasons.includes(choice.reason)) reasons.push(choice.reason);
    current = next;
  }
  current = lockDecisions(current, round);
  const actions = getRoundRecord(current, round)?.actions ?? [];
  return {
    player: current,
    turn: {
      playerId: player.id,
      round,
      strategy: strategy.id,
      actions,
      message: describeAiTurn(player.id, actions),
      rationale: reasons.join(' '),
    },
  };
}
