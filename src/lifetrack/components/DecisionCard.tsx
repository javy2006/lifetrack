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
import { canAdd, confirmActions, previewDraft, sameMove, toAction, type DraftMove } from './decisionDraft.ts';
import { Button, Disclaimer, LearnMore } from './ui.tsx';

const POLICY_ICON: Record<PolicyId, typeof HeartPulse> = { medical: HeartPulse, accident: Shield, critical: Sparkles };

function moveLabel(m: DraftMove): string {
  return m.kind === 'save' ? `Save ${formatRM(GAME_CONFIG.saveAmount)}` : m.kind === 'pass' ? 'Pass' : POLICIES[m.policyId].shortName;
}

export function DecisionCard({ state, dispatch, landed }: { state: GameState; dispatch: (a: GameAction) => void; landed?: { roll: number; label: string } | null }) {
  const { playEffect } = useAudio();
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
    playEffect(moves.some((m) => m.kind === 'buy') ? 'purchase' : moves.some((m) => m.kind === 'save') ? 'coins' : 'select');
    window.setTimeout(() => dispatch(actions[actions.length - 1]!), 650);
  };

  const options: { move: DraftMove; className: string; icon: typeof Landmark; title: string; detail: string; cost: number; extra?: React.ReactNode }[] = [
    { move: { kind: 'save' }, className: 'save-action', icon: Landmark, title: `Save ${formatRM(GAME_CONFIG.saveAmount)}`, detail: 'Into emergency savings', cost: GAME_CONFIG.saveAmount },
    ...POLICY_ORDER.map((id) => {
      const p = POLICIES[id];
      const benefit = p.benefit.kind === 'reimbursement' ? `Up to ${formatRM(p.benefit.coverageLimit)} reimbursement` : `${formatRM(p.benefit.amount)} ${p.benefit.kind === 'fixed' ? 'fixed benefit' : 'lump sum'}`;
      return { move: { kind: 'buy', policyId: id } as DraftMove, className: `buy-action policy-${id}`, icon: POLICY_ICON[id], title: p.name, detail: `${benefit} · ${formatRM(p.monthlyPremium)}/month`, cost: p.monthlyPremium,
        extra: <LearnMore><p className="policy-type">{p.protectionType}</p>{p.benefit.kind === 'reimbursement' && <p>You pay the first {formatRM(p.benefit.deductible)} · pays up to {formatRM(p.benefit.coverageLimit)}</p>}<div className="policy-explain"><b>Responds to</b><span>{p.coveredEvent}</span><b>Exclusions</b><span>{p.exclusions.join(' · ')}</span></div><p>{p.explanation}</p></LearnMore> };
    }),
    { move: { kind: 'pass' }, className: 'pass-action', icon: ArrowRight, title: 'Pass', detail: 'Keep the cash', cost: 0 },
  ];

  return <section className={`game-card decision-card-v2 ${confirmed ? 'is-confirmed' : ''}`} aria-labelledby="decision-title">
    <header className="game-card-band band-decide">
      <span className="game-card-icon"><Landmark size={22}/></span>
      <div><p className="eyebrow">{landed ? `ROLLED ${landed.roll} · LANDED ON ${landed.label}` : 'YOUR MOVES'}</p><h2 id="decision-title">{confirmed ? 'Moves locked in' : slots === 0 ? 'All set' : `Choose ${slots} move${slots === 1 ? '' : 's'}`}</h2></div>
    </header>
    {applied.length > 0 && <p className="decision-applied"><Check size={14}/> Already made: {applied.map((a) => a.kind === 'save' ? 'Save' : a.kind === 'buy' ? POLICIES[a.policyId].shortName : 'Pass').join(', ')}{state.decisionSnapshot && slots > 0 && <button type="button" className="link-button" onClick={() => dispatch({ type: 'decision/reset' })}><RotateCcw size={12}/> Undo</button>}</p>}
    <div className="decision-options" role="group" aria-label="Choose your moves">
      {options.map(({ move, className, icon: Icon, title, detail, cost, extra }) => {
        const n = count(move);
        const owned = move.kind === 'buy' && human.policies.some((p) => p.policyId === move.policyId);
        // Selectable if already picked (tap to change), or if the engine accepts it now (or as a swap for the latest pick when all moves are used).
        const available = !confirmed && !owned && (n > 0 || canAdd(state, draft.length < slots ? draft : draft.slice(0, -1), move));
        const reason = owned ? 'Already covered' : !available && cost > after.cash ? 'Not enough cash' : null;
        return <div key={title} className={`decision-option ${n > 0 ? 'is-selected' : ''} ${owned ? 'is-owned' : ''}`}>
          <button type="button" className={`decision-pick ${className}`} aria-pressed={n > 0} disabled={!available && n === 0} onClick={() => toggle(move)}>
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
          ? <button type="button" key={i} className="decision-slot is-filled" onClick={() => !confirmed && setDraft(draft.filter((_, j) => j !== i))} aria-label={`Remove ${moveLabel(draft[i]!)}`}>{moveLabel(draft[i]!)}{!confirmed && <X size={12}/>}</button>
          : <span key={i} className="decision-slot">Move {i + 1}{i >= draft.length && draft.length > 0 ? ' · pass' : ''}</span>)}
      </div>
      <div className="decision-cash"><small>Cash after moves</small><b>{formatRM(after.cash)}</b>{after.savings !== human.savings && <small>Savings {formatRM(after.savings)}</small>}</div>
      <Button className="decision-confirm" onClick={confirm} disabled={confirmed}>{confirmed ? <><Check size={16}/> Locked in</> : <>Confirm my moves <ArrowRight size={16}/></>}</Button>
    </footer>
    <Disclaimer compact/>
  </section>;
}
