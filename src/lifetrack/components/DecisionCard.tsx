/**
 * The month's decision card. Choices are a draft held in the UI: the player can pick, unpick and
 * change moves freely, and nothing touches the money until "Confirm my moves". Then each move is
 * dispatched exactly once (guarded by a lock), unused moves become passes, and the month is
 * confirmed. Availability and the projected cash come from running the real reducer on a copy of
 * the state, so no game rule is duplicated here.
 */
import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, HeartPulse, Landmark, RotateCcw, Shield, Sparkles, X } from 'lucide-react';
import type { GameState, PolicyId } from '../game/types.ts';
import { gameReducer, getHumanPlayer, type GameAction } from '../game/gameReducer.ts';
import { getRoundRecord } from '../game/calculations.ts';
import { GAME_CONFIG } from '../game/constants.ts';
import { POLICIES, POLICY_ORDER } from '../game/policies.ts';
import { formatRM } from '../game/format.ts';
import { useAudio } from './AudioControls.tsx';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { policyText } from '../i18n/content.ts';
import { canAdd, confirmActions, previewDraft, sameMove, toAction, type DraftMove } from './decisionDraft.ts';
import { Button, Disclaimer, LearnMore } from './ui.tsx';

const POLICY_ICON: Record<PolicyId, typeof HeartPulse> = { medical: HeartPulse, accident: Shield, critical: Sparkles };



export function DecisionCard({ state, dispatch, landed }: { state: GameState; dispatch: (a: GameAction) => void; landed?: { roll: number; label: string } | null }) {
  const { playEffect } = useAudio();
  const { t, content } = useI18n();
  const moveLabel = (m: DraftMove) => m.kind === 'save' ? t('decision.save', { amount: formatRM(GAME_CONFIG.saveAmount) }) : m.kind === 'pass' ? t('decision.pass') : policyText(m.policyId, content).shortName;
  const human = getHumanPlayer(state);
  const slots = human.actionPoints;
  const applied = getRoundRecord(human, state.round)?.actions ?? [];
  const [draft, setDraft] = useState<DraftMove[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const lock = useRef(false);
  const preview = useMemo(() => previewDraft(state, draft), [state, draft]);
  const after = getHumanPlayer(preview.state);
  const count = (m: DraftMove) => draft.filter((d) => sameMove(d, m)).length;

  const toggle = (m: DraftMove) => {
    if (confirmed) return;
    const i = draft.findIndex((d) => sameMove(d, m));
    // Policies are one-off: picking a selected policy again removes it. Save/pass can repeat until moves run out, then a tap removes one.
    if (i >= 0 && (m.kind === 'buy' || draft.length >= slots || !canAdd(state, draft, m))) { setDraft(draft.filter((_, j) => j !== i)); return; }
    if (draft.length >= slots) {
      // Moves are full: swap the most recent choice for this one, if the engine allows it.
      const trimmed = draft.slice(0, -1);
      if (canAdd(state, trimmed, m)) { setDraft([...trimmed, m]); playEffect('select'); }
      return;
    }
    if (canAdd(state, draft, m)) { setDraft([...draft, m]); playEffect('select'); }
  };

  const confirm = () => {
    if (lock.current || confirmed) return;
    lock.current = true;
    const actions = confirmActions(state, draft);
    const moves = draft.slice(0, previewDraft(state, draft).accepted);
    // Each chosen move is applied once; any unused move is a pass. The month is confirmed after a short "locked in" beat.
    for (const action of actions.slice(0, -1)) dispatch(action);
    setConfirmed(true);
    playEffect(moves.some((m) => m.kind === 'buy') ? 'purchase' : moves.some((m) => m.kind === 'save') ? 'save' : 'confirm');
    window.setTimeout(() => dispatch(actions[actions.length - 1]!), 650);
  };

  const options: { move: DraftMove; className: string; icon: typeof Landmark; title: string; detail: string; cost: number; extra?: React.ReactNode }[] = [
    { move: { kind: 'save' }, className: 'save-action', icon: Landmark, title: t('decision.save', { amount: formatRM(GAME_CONFIG.saveAmount) }), detail: t('decision.saveDetail'), cost: GAME_CONFIG.saveAmount },
    ...POLICY_ORDER.map((id) => {
      const p = POLICIES[id], tx = policyText(id, content);
      const benefit = p.benefit.kind === 'reimbursement' ? t('decision.benefitReimbursement', { amount: formatRM(p.benefit.coverageLimit) }) : t(p.benefit.kind === 'fixed' ? 'decision.benefitFixed' : 'decision.benefitLump', { amount: formatRM(p.benefit.amount) });
      return { move: { kind: 'buy', policyId: id } as DraftMove, className: `buy-action policy-${id}`, icon: POLICY_ICON[id], title: tx.name, detail: t('decision.perMonth', { benefit, premium: formatRM(p.monthlyPremium) }), cost: p.monthlyPremium,
        extra: <LearnMore><p className="policy-type">{tx.type}</p>{p.benefit.kind === 'reimbursement' && <p>{t('decision.payFirst', { deductible: formatRM(p.benefit.deductible), limit: formatRM(p.benefit.coverageLimit) })}</p>}<div className="policy-explain"><b>{t('decision.respondsTo')}</b><span>{tx.covered}</span><b>{t('decision.exclusions')}</b><span>{tx.exclusions.join(' · ')}</span></div><p>{tx.explanation}</p></LearnMore> };
    }),
    { move: { kind: 'pass' }, className: 'pass-action', icon: ArrowRight, title: t('decision.pass'), detail: t('decision.passDetail'), cost: 0 },
  ];

  return <section className={`game-card decision-card-v2 ${confirmed ? 'is-confirmed' : ''}`} aria-labelledby="decision-title">
    <header className="game-card-band band-decide">
      <span className="game-card-icon"><Landmark size={22}/></span>
      <div><p className="eyebrow">{landed ? t('decision.rolledLanded', { roll: landed.roll, space: landed.label }) : t('decision.yourMoves')}</p><h2 id="decision-title">{confirmed ? t('decision.locked') : slots === 0 ? t('decision.allSet') : t('decision.choose', { count: slots })}</h2></div>
    </header>
    {applied.length > 0 && <p className="decision-applied"><Check size={14}/> {t('decision.alreadyMade', { list: applied.map((a) => a.kind === 'save' ? t('decision.saveShort') : a.kind === 'buy' ? policyText(a.policyId, content).shortName : t('decision.pass')).join(', ') })}{state.decisionSnapshot && slots > 0 && <button type="button" className="link-button" onClick={() => dispatch({ type: 'decision/reset' })}><RotateCcw size={12}/> {t('decision.undo')}</button>}</p>}
    <div className="decision-options" role="group" aria-label={t('decision.group')}>
      {options.map(({ move, className, icon: Icon, title, detail, cost, extra }) => {
        const n = count(move);
        const owned = move.kind === 'buy' && human.policies.some((p) => p.policyId === move.policyId);
        // Selectable if already picked (tap to change), or if the engine accepts it now (or as a swap for the latest pick when all moves are used).
        const available = !confirmed && !owned && (n > 0 || canAdd(state, draft.length < slots ? draft : draft.slice(0, -1), move));
        const reason = owned ? t('decision.alreadyCovered') : !available && cost > after.cash ? t('decision.notEnoughCash') : null;
        return <div key={title} className={`decision-option ${n > 0 ? 'is-selected' : ''} ${owned ? 'is-owned' : ''}`}>
          <button type="button" data-sound="own" className={`decision-pick ${className}`} aria-pressed={n > 0} disabled={!available && n === 0} onClick={() => toggle(move)}>
            <span className="decision-option-icon"><Icon size={18}/></span>
            <span className="decision-option-text"><b>{title}</b><small>{reason ?? detail}</small></span>
            <span className="decision-option-mark" aria-hidden="true">{n > 1 ? `×${n}` : n === 1 ? <Check size={14}/> : owned ? <Check size={14}/> : null}</span>
          </button>
          {extra}
        </div>;
      })}
    </div>
    <footer className="decision-summary">
      <div className="decision-slots" aria-live="polite">
        {Array.from({ length: slots }, (_, i) => draft[i]
          ? <button type="button" key={i} className="decision-slot is-filled" onClick={() => !confirmed && setDraft(draft.filter((_, j) => j !== i))} aria-label={t('decision.remove', { move: moveLabel(draft[i]!) })}>{moveLabel(draft[i]!)}{!confirmed && <X size={12}/>}</button>
          : <span key={i} className="decision-slot">{i >= draft.length && draft.length > 0 ? t('decision.slotPass', { n: i + 1 }) : t('decision.slot', { n: i + 1 })}</span>)}
      </div>
      <div className="decision-cash"><small>{t('decision.cashAfter')}</small><b>{formatRM(after.cash)}</b>{after.savings !== human.savings && <small>{t('decision.savingsAfter', { amount: formatRM(after.savings) })}</small>}</div>
      <Button className="decision-confirm" onClick={confirm} disabled={confirmed}>{confirmed ? <><Check size={16}/> {t('decision.lockedIn')}</> : <>{t('decision.confirm')} <ArrowRight size={16}/></>}</Button>
    </footer>
    <Disclaimer compact/>
  </section>;
}
