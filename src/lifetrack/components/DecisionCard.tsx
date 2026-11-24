/**
 * The month's decision card, presented as a hand of printed choice cards. Choices are a draft
 * held in the UI: the player can pick, unpick and change moves freely, and nothing touches the
 * money until "Confirm my moves". Then each move is dispatched exactly once (guarded by a lock),
 * unused moves become passes, and the month is confirmed. Availability and the projected cash,
 * savings and monthly cover come from running the real reducer on a copy of the state, so no game
 * rule or figure is duplicated here.
 */
import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, HeartPulse, Info, Landmark, RotateCcw, Shield, Sparkles, X, type LucideIcon } from 'lucide-react';
import type { GameState, PolicyId } from '../game/types.ts';
import { getHumanPlayer, type GameAction } from '../game/gameReducer.ts';
import { getMonthlyPremiumTotal, getRoundRecord } from '../game/calculations.ts';
import { GAME_CONFIG } from '../game/constants.ts';
import { POLICIES, POLICY_ORDER } from '../game/policies.ts';
import { formatRM } from '../game/format.ts';
import { useAudio } from './AudioControls.tsx';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { policyText } from '../i18n/content.ts';
import { canAdd, confirmActions, previewDraft, sameMove, type DraftMove } from './decisionDraft.ts';
import { Button, Disclaimer } from './ui.tsx';
import { CardMast, TableCard, type CardKind } from './TableCard.tsx';

const POLICY_ICON: Record<PolicyId, LucideIcon> = { medical: HeartPulse, accident: Shield, critical: Sparkles };

type Option = { move: DraftMove; className: string; kind: CardKind | 'neutral'; icon: LucideIcon; title: string; detail: string; price: string; priceNote?: string; details?: React.ReactNode };

/** One ledger line: before → after, with the change. */
function LedgerRow({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return <div className={`tc-ledger-row ${delta !== 0 ? 'is-changed' : ''}`}>
    <span>{label}</span>
    <b>{formatRM(after)}</b>
    <small className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>{delta === 0 ? '—' : `${delta > 0 ? '+' : '−'}${formatRM(Math.abs(delta))}`}</small>
  </div>;
}

export function DecisionCard({ state, dispatch, landed }: { state: GameState; dispatch: (a: GameAction) => void; landed?: { roll: number; label: string } | null }) {
  const { playEffect } = useAudio();
  const { t, content } = useI18n();
  const moveLabel = (m: DraftMove) => m.kind === 'save' ? t('decision.save', { amount: formatRM(GAME_CONFIG.saveAmount) }) : m.kind === 'pass' ? t('decision.pass') : policyText(m.policyId, content).shortName;
  const human = getHumanPlayer(state);
  const slots = human.actionPoints;
  const applied = getRoundRecord(human, state.round)?.actions ?? [];
  const [draft, setDraft] = useState<DraftMove[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [inspecting, setInspecting] = useState<number | null>(null);
  const lock = useRef(false);
  const preview = useMemo(() => previewDraft(state, draft), [state, draft]);
  const after = getHumanPlayer(preview.state);
  const count = (m: DraftMove) => draft.filter((d) => sameMove(d, m)).length;

  const toggle = (m: DraftMove) => {
    if (confirmed) return;
    const i = draft.findIndex((d) => sameMove(d, m));
    // Policies are one-off: picking a selected policy again removes it. Save/pass can repeat until moves run out, then a tap removes one.
    if (i >= 0 && (m.kind === 'buy' || draft.length >= slots || !canAdd(state, draft, m))) { setDraft(draft.filter((_, j) => j !== i)); playEffect('card'); return; }
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
    setInspecting(null);
    playEffect(moves.some((m) => m.kind === 'buy') ? 'purchase' : moves.some((m) => m.kind === 'save') ? 'save' : 'confirm');
    // Not cancelled on unmount: the moves are already applied, so the month must still be confirmed.
    window.setTimeout(() => dispatch(actions[actions.length - 1]!), 650);
  };

  const options: Option[] = [
    { move: { kind: 'save' }, className: 'save-action', kind: 'opportunity', icon: Landmark, title: t('decision.save', { amount: formatRM(GAME_CONFIG.saveAmount) }), detail: t('decision.saveDetail'), price: `−${formatRM(GAME_CONFIG.saveAmount)}`, priceNote: t('card.toSavings') },
    ...POLICY_ORDER.map((id): Option => {
      const p = POLICIES[id], tx = policyText(id, content);
      const benefit = p.benefit.kind === 'reimbursement' ? t('decision.benefitReimbursement', { amount: formatRM(p.benefit.coverageLimit) }) : t(p.benefit.kind === 'fixed' ? 'decision.benefitFixed' : 'decision.benefitLump', { amount: formatRM(p.benefit.amount) });
      return { move: { kind: 'buy', policyId: id }, className: `buy-action policy-${id}`, kind: 'protection', icon: POLICY_ICON[id], title: tx.name, detail: benefit, price: `−${formatRM(p.monthlyPremium)}`, priceNote: t('card.perMonth'),
        details: <><p className="policy-type">{tx.type}</p>{p.benefit.kind === 'reimbursement' && <p>{t('decision.payFirst', { deductible: formatRM(p.benefit.deductible), limit: formatRM(p.benefit.coverageLimit) })}</p>}<div className="policy-explain"><b>{t('decision.respondsTo')}</b><span>{tx.covered}</span><b>{t('decision.exclusions')}</b><span>{tx.exclusions.join(' · ')}</span></div><p>{tx.explanation}</p></> };
    }),
    { move: { kind: 'pass' }, className: 'pass-action', kind: 'neutral', icon: ArrowRight, title: t('decision.pass'), detail: t('decision.passDetail'), price: t('card.free') },
  ];

  const states = options.map(({ move, price }) => {
    const n = count(move);
    const owned = move.kind === 'buy' && human.policies.some((p) => p.policyId === move.policyId);
    // Selectable if already picked (tap to change), or if the engine accepts it now (or as a swap for the latest pick when all moves are used).
    const available = !confirmed && !owned && (n > 0 || canAdd(state, draft.length < slots ? draft : draft.slice(0, -1), move));
    const cost = move.kind === 'save' ? GAME_CONFIG.saveAmount : move.kind === 'buy' ? POLICIES[move.policyId].monthlyPremium : 0;
    const reason = owned ? t('decision.alreadyCovered') : !available && n === 0 && cost > after.cash ? t('decision.notEnoughCash') : null;
    const order = draft.findIndex((d) => sameMove(d, move));
    return { n, owned, available, reason, order, price };
  });
  const insp = inspecting === null ? null : options[inspecting]!;
  const inspState = inspecting === null ? null : states[inspecting]!;

  return <TableCard kind="special" className={`game-card decision-card-v2 ${confirmed ? 'is-confirmed' : ''}`} aria-labelledby="decision-title">
    <CardMast kind="special" icon={Landmark} titleId="decision-title" label={t('card.yourMove')}
      eyebrow={landed ? t('decision.rolledLanded', { roll: landed.roll, space: landed.label }) : undefined}
      title={confirmed ? t('decision.locked') : slots === 0 ? t('decision.allSet') : t('decision.choose', { count: slots })}
      corner={slots > 0 ? `${Math.min(draft.length, slots)}/${slots}` : undefined}/>
    {applied.length > 0 && <p className="decision-applied"><Check size={14}/> {t('decision.alreadyMade', { list: applied.map((a) => a.kind === 'save' ? t('decision.saveShort') : a.kind === 'buy' ? policyText(a.policyId, content).shortName : t('decision.pass')).join(', ') })}{state.decisionSnapshot && slots > 0 && <button type="button" className="link-button" onClick={() => dispatch({ type: 'decision/reset' })}><RotateCcw size={12}/> {t('decision.undo')}</button>}</p>}
    <div className="decision-options choice-hand" role="group" aria-label={t('decision.group')}>
      {options.map(({ move, className, kind, icon: Icon, title, detail, price, priceNote, details }, i) => {
        const { n, owned, available, reason, order } = states[i]!;
        return <div key={className} className={`decision-option choice-card ck-${kind} ${details ? 'has-inspect' : ''} ${n > 0 ? 'is-selected' : ''} ${owned ? 'is-owned' : ''} ${!available && n === 0 ? 'is-unavailable' : ''}`} style={{ '--i': i } as React.CSSProperties}>
          <button type="button" data-sound="own" className={`decision-pick ${className}`} aria-pressed={n > 0} disabled={!available && n === 0} onClick={() => toggle(move)}>
            <span className="cc-mast"><span className="cc-icon"><Icon size={17}/></span><span className="cc-kind">{kind === 'neutral' ? t('decision.pass') : t(`card.kind.${kind}`)}</span></span>
            <span className="decision-option-text cc-body"><b>{title}</b><small>{detail}</small></span>
            <span className="cc-price"><b>{price}</b>{priceNote && <small>{priceNote}</small>}</span>
            {reason && <span className="cc-ribbon">{reason}</span>}
            <span className="decision-option-mark cc-stamp" aria-hidden="true">{n > 1 ? `×${n}` : n === 1 ? <><Check size={13}/>{slots > 1 && order >= 0 ? <em>{order + 1}</em> : null}</> : owned ? <Check size={13}/> : null}</span>
          </button>
          {details && <button type="button" className="cc-inspect" onClick={() => setInspecting(i)} aria-label={t('card.inspect', { name: title })}><Info size={14}/></button>}
        </div>;
      })}
    </div>
    <footer className="decision-summary tc-ledger">
      <div className="decision-slots" aria-live="polite">
        {Array.from({ length: slots }, (_, i) => draft[i]
          ? <button type="button" key={i} className="decision-slot is-filled" onClick={() => !confirmed && setDraft(draft.filter((_, j) => j !== i))} aria-label={t('decision.remove', { move: moveLabel(draft[i]!) })}>{moveLabel(draft[i]!)}{!confirmed && <X size={12}/>}</button>
          : <span key={i} className="decision-slot">{i >= draft.length && draft.length > 0 ? t('decision.slotPass', { n: i + 1 }) : t('decision.slot', { n: i + 1 })}</span>)}
      </div>
      <div className="decision-cash tc-ledger-rows" aria-label={t('card.preview')}>
        <LedgerRow label={t('card.ledgerCash')} before={human.cash} after={after.cash}/>
        <LedgerRow label={t('card.ledgerSavings')} before={human.savings} after={after.savings}/>
        <LedgerRow label={t('card.ledgerPremiums')} before={getMonthlyPremiumTotal(human)} after={getMonthlyPremiumTotal(after)}/>
      </div>
      <Button className="decision-confirm" onClick={confirm} disabled={confirmed}>{confirmed ? <><Check size={16}/> {t('decision.lockedIn')}</> : <>{t('decision.confirm')} <ArrowRight size={16}/></>}</Button>
    </footer>
    {confirmed && <span className="tc-locked-stamp" aria-hidden="true"><Check size={18}/> {t('decision.lockedIn')}</span>}
    <Disclaimer compact/>
    {insp && inspState && <div className="cc-inspect-layer" role="dialog" aria-modal="true" aria-label={t('card.details')} onMouseDown={(e) => { if (e.target === e.currentTarget) setInspecting(null); }} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setInspecting(null); } }}>
      <div className={`choice-card cc-zoom ck-${insp.kind}`}>
        <button type="button" className="modal-close" autoFocus onClick={() => setInspecting(null)} aria-label={t('card.close')}>×</button>
        <span className="cc-mast"><span className="cc-icon"><insp.icon size={20}/></span><span className="cc-kind">{insp.kind === 'neutral' ? t('decision.pass') : t(`card.kind.${insp.kind}`)}</span></span>
        <h3>{insp.title}</h3>
        <p className="cc-zoom-detail">{insp.detail}</p>
        <span className="cc-price"><b>{insp.price}</b>{insp.priceNote && <small>{insp.priceNote}</small>}</span>
        <div className="cc-zoom-body">{insp.details}</div>
        <div className="cc-zoom-actions">
          {(inspState.available || inspState.n > 0) && <Button variant={inspState.n > 0 ? 'secondary' : 'primary'} onClick={() => { toggle(insp.move); setInspecting(null); }}>{inspState.n > 0 ? t('card.putBack') : t('card.take')}</Button>}
          <Button variant="quiet" onClick={() => setInspecting(null)}>{t('card.close')}</Button>
        </div>
      </div>
    </div>}
  </TableCard>;
}
