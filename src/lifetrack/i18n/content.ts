/**
 * Localised views of engine content. For English the engine's own strings are returned unchanged;
 * other languages overlay them by stable id (event id, policy id, question id, concept id), falling
 * back to English field by field. Every number comes from the engine (formatRM on engine values),
 * so figures are identical in every language. Nothing here changes game state.
 */
import type { AiTurn, CharacterId, ClaimResult, ConceptId, EventCard, PolicyId, PolicyOutcome } from '../game/types.ts';
import { formatRM } from '../game/format.ts';
import { POLICIES } from '../game/policies.ts';
import { getCharacter } from '../game/characters.ts';
import { CONCEPTS, getClaimInsight, type InsightContent } from '../game/insights.ts';
import { QUIZ_QUESTIONS } from '../game/quiz.ts';
import { calculateReimbursement } from '../game/calculations.ts';
import { interpolate, type Vars } from './core.ts';

export interface ContentOverlay {
  events?: Record<string, { title?: string; risk?: string; story?: string; expenses?: string[]; notes?: Partial<Record<PolicyId, string>>; lesson?: [string, string] }>;
  policies?: Partial<Record<PolicyId, { name?: string; shortName?: string; type?: string; covered?: string; exclusions?: string[]; explanation?: string }>>;
  characters?: Partial<Record<CharacterId, { occupation?: string; title?: string; personality?: string; bio?: string; strategy?: string }>>;
  quiz?: Record<string, { prompt?: string; options?: Record<string, string>; explanation?: string }>;
  concepts?: Partial<Record<ConceptId, { label?: string; summary?: string }>>;
  insights?: Partial<Record<ConceptId, { title?: string; explanation?: string; example?: string; exampleNone?: string; takeaway?: string }>>;
  /** Fixed AI rationale sentences, keyed by the engine's English sentence. */
  aiReasons?: Record<string, string>;
}

export type T = (key: string, vars?: Vars) => string;

export function eventText(event: EventCard, o: ContentOverlay | null) {
  const x = o?.events?.[event.id];
  return {
    title: x?.title ?? event.title,
    risk: x?.risk ?? event.riskLabel,
    story: x?.story ?? event.story,
    expense: (i: number) => x?.expenses?.[i] ?? event.expenses[i]?.label ?? '',
    note: (p: PolicyId) => x?.notes?.[p] ?? event.coverageNotes[p],
    lessonTitle: x?.lesson?.[0] ?? event.lesson.title,
    lessonText: x?.lesson?.[1] ?? event.lesson.text,
  };
}

export function policyText(id: PolicyId, o: ContentOverlay | null) {
  const p = POLICIES[id], x = o?.policies?.[id];
  const vars: Vars = p.benefit.kind === 'reimbursement'
    ? { deductible: formatRM(p.benefit.deductible), limit: formatRM(p.benefit.coverageLimit) }
    : { amount: formatRM(p.benefit.amount) };
  return {
    name: x?.name ?? p.name, shortName: x?.shortName ?? p.shortName, type: x?.type ?? p.protectionType, covered: x?.covered ?? p.coveredEvent,
    exclusions: x?.exclusions ?? p.exclusions, explanation: x?.explanation ? interpolate(x.explanation, vars) : p.explanation,
  };
}

export function characterText(id: CharacterId, o: ContentOverlay | null) {
  const c = getCharacter(id), x = o?.characters?.[id];
  return { name: c.name, occupation: x?.occupation ?? c.occupation, title: x?.title ?? c.title, personality: x?.personality ?? c.personality, bio: x?.bio ?? c.bio, strategy: x?.strategy ?? c.strategyDescription };
}

export function conceptLabel(id: ConceptId, o: ContentOverlay | null): string {
  return o?.concepts?.[id]?.label ?? CONCEPTS[id].label;
}

/** Quiz question text; explanation numbers come from the engine's policy values. */
export function quizText(questionId: string, o: ContentOverlay | null) {
  const q = QUIZ_QUESTIONS.find((x) => x.id === questionId)!;
  const x = o?.quiz?.[questionId];
  const medical = POLICIES.medical.benefit, accident = POLICIES.accident.benefit, critical = POLICIES.critical.benefit;
  const ex = medical.kind === 'reimbursement' ? calculateReimbursement(800, medical.deductible, medical.coverageLimit) : null;
  const vars: Vars = {
    deductible: formatRM(ex?.deductibleApplied ?? 0), bill: formatRM(800), payout: formatRM(ex?.payout ?? 0),
    accident: formatRM(accident.kind === 'fixed' ? accident.amount : 0), critical: formatRM(critical.kind === 'lump-sum' ? critical.amount : 0),
  };
  return {
    prompt: x?.prompt ?? q.prompt,
    option: (id: string) => x?.options?.[id] ?? q.options.find((op) => op.id === id)?.text ?? '',
    explanation: x?.explanation ? interpolate(x.explanation, vars) : q.explanation,
  };
}

/** Why a policy did or did not pay, rebuilt from the outcome data in the current language. */
export function outcomeReason(outcome: PolicyOutcome, event: EventCard, o: ContentOverlay | null, t: T): string {
  if (!o) return outcome.reason;
  const note = eventText(event, o).note(outcome.policyId);
  if (outcome.status === 'not-owned') return t('claim.reasonNotOwned');
  if (outcome.status === 'not-covered' || outcome.status === 'excluded') return note;
  const p = POLICIES[outcome.policyId].benefit;
  if (p.kind === 'reimbursement') {
    const vars = { bill: formatRM(outcome.eligibleAmount ?? 0), deductible: formatRM(outcome.deductibleApplied ?? 0), after: formatRM(outcome.amountAfterDeductible ?? 0), limit: formatRM(p.coverageLimit), payout: formatRM(outcome.payout) };
    if (outcome.status === 'below-deductible') return t('claim.reasonBelow', { bill: vars.bill, deductible: formatRM(p.deductible) });
    return t(outcome.limitReached ? 'claim.reasonLimit' : 'claim.reasonPaid', vars);
  }
  return t(p.kind === 'fixed' ? 'claim.reasonFixed' : 'claim.reasonLump', { note, amount: formatRM(p.amount) });
}

/** The claim insight in the current language, using the same engine branch and the same figures. */
export function insightText(claim: ClaimResult, event: EventCard, premiums: number, o: ContentOverlay | null): InsightContent {
  const base = getClaimInsight(claim, event, premiums);
  const x = o?.insights?.[base.concept];
  if (!o || !x) return base;
  const medical = claim.outcomes.find((r) => r.policyId === 'medical');
  const accident = claim.outcomes.find((r) => r.policyId === 'accident');
  const critical = claim.outcomes.find((r) => r.policyId === 'critical');
  const notPaying = claim.outcomes.filter((r) => r.status === 'excluded' || r.status === 'not-covered');
  const excluded = notPaying.find((r) => r.status === 'excluded') ?? notPaying[0];
  const vars: Vars = {
    shortfall: formatRM(claim.shortfall), cash: formatRM(claim.paidFromCash), savings: formatRM(claim.paidFromSavings), total: formatRM(claim.totalExpense),
    outOfPocket: formatRM(claim.outOfPocket), net: formatRM(claim.netCashImpact, 'always'), premiums: formatRM(premiums),
    bill: formatRM(medical?.eligibleAmount ?? 0), deductible: formatRM(medical?.deductibleApplied ?? 0), after: formatRM(medical?.amountAfterDeductible ?? 0),
    limit: formatRM(medical?.coverageLimit ?? 0), reimbursed: formatRM(medical?.payout ?? 0),
    lump: formatRM(critical?.payout ?? 0), fixed: formatRM(accident?.payout ?? 0),
    policy: excluded ? policyText(excluded.policyId, o).name : '', reason: excluded ? outcomeReason(excluded, event, o, (k) => k) : '',
  };
  const exampleTemplate = base.concept === 'recurring-premium' && premiums <= 0 ? x.exampleNone ?? x.example : x.example;
  return {
    concept: base.concept,
    title: x.title ?? base.title,
    explanation: x.explanation ?? base.explanation,
    example: exampleTemplate ? interpolate(exampleTemplate, vars) : base.example,
    takeaway: base.concept === 'emergency-savings' ? eventText(event, o).lessonText : x.takeaway ?? base.takeaway,
  };
}

/** AI turn summary (what they did) and rationale (why), in the current language. */
export function aiTurnText(turn: AiTurn, o: ContentOverlay | null, t: T): { message: string; rationale: string } {
  if (!o) return { message: turn.message, rationale: turn.rationale };
  const name = getCharacter(turn.playerId).name;
  const bought = turn.actions.flatMap((a) => (a.kind === 'buy' ? [policyText(a.policyId, o).name] : []));
  const saved = turn.actions.reduce((n, a) => n + (a.kind === 'save' ? a.amount : 0), 0);
  const join = (items: string[]) => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(t('ai.listSep'))}${t('ai.and')}${items[items.length - 1]}`;
  const parts: string[] = [];
  if (bought.length) parts.push(t('ai.bought', { list: join(bought) }));
  if (saved > 0) parts.push(t('ai.saved', { amount: formatRM(saved) }));
  const message = parts.length ? t('ai.did', { name, actions: join(parts) }) : t('ai.kept', { name });
  // Rationale: the engine joins fixed sentences with spaces; translate each known sentence.
  let rationale = turn.rationale;
  for (const [en, tr] of Object.entries(o.aiReasons ?? {})) rationale = rationale.split(en).join(tr);
  rationale = rationale.replace(/With (RM[\d,]+) saved, a (RM[\d,]+) premium barely dents the monthly budget\./g, (_m, s: string, p: string) => t('ai.reasonBarely', { saved: s, premium: p }));
  return { message, rationale };
}
