import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, CircleHelp, Coins, HeartPulse, Maximize2, Minimize2, Shield, Sparkles, Users, Wallet } from 'lucide-react';
import { getTurnOrder } from '../board/turnOrder.ts';
import { getCharacter } from '../game/characters.ts';
import { GAME_CONFIG } from '../game/constants.ts';
import { getMonthlyPremiumTotal, getRoundRecord, getRoundSummary } from '../game/calculations.ts';
import { getAiTurnsForRound, getAiPlayers, getCurrentEvent, getHumanPlayer, type GameAction } from '../game/gameReducer.ts';
import { formatRM } from '../game/format.ts';
import { POLICY_ORDER } from '../game/policies.ts';
import { getFinalStandings } from '../game/scoring.ts';
import { countCorrectAnswers } from '../game/quiz.ts';
import { getQuizProgress } from '../hooks/quizProgress.ts';
import type { CharacterId, GameState } from '../game/types.ts';
import { BOARD_ROUTE } from '../board/boardTypes.ts';
import { Button, Card, Disclaimer, Eyebrow, LearnMore } from '../components/ui.tsx';
import { GameHeader } from '../components/GameHeader.tsx';
import { CharacterPortrait } from '../components/CharacterPortrait.tsx';
import { HowToPlay } from '../components/HowToPlay.tsx';
import { DecisionCard } from '../components/DecisionCard.tsx';
import { PlayerDashboard } from '../components/PlayerDashboard.tsx';
import { CardArt, eventArt, sceneUrl } from '../components/art.tsx';
import { NetWorthChart, RecapChart } from '../components/Charts.tsx';
import { CardMast, TableCard, eventKind } from '../components/TableCard.tsx';
import { BoardScene } from '../board/BoardScene.tsx';
import { useBoardController } from '../board/useBoardController.ts';
import { getActionLayerMode, getEventDrawBoardStep } from '../board/boardTypes.ts';
import { useAudio } from '../components/AudioControls.tsx';
import { Board3DSlot } from '../board3d/Board3DSlot.tsx';
import { readRendererOverride } from '../board3d/rendererPreference.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { aiTurnText, characterText, conceptLabel, eventText, insightText, outcomeReason, policyText, quizText } from '../i18n/content.ts';
import { DemoPanel, DemoTip, useDemoAutopilot, type DemoSession } from '../demo/demoUi.tsx';

type Dispatch = (a: GameAction) => void;

function PhaseButton({ label, onClick }: { label: string; onClick: () => void }) { return <Button onClick={onClick}>{label}<ArrowRight size={16}/></Button>; }

function FinancialOverview({ state }: { state: GameState }) {
  const { t } = useI18n();
  const human = getHumanPlayer(state);
  const record = getRoundRecord(human, state.round);
  const items = [
    { label: t('drawer.monthlyIncome'), value: formatRM(GAME_CONFIG.monthlyIncome), icon: Coins, tone: 'green', detail: t('drawer.received') },
    { label: t('drawer.essentials'), value: formatRM(GAME_CONFIG.essentialExpenses), icon: Wallet, tone: 'rose', detail: t('drawer.housing') },
    { label: t('drawer.premiums'), value: formatRM(getMonthlyPremiumTotal(human)), icon: HeartPulse, tone: 'blue', detail: record?.premiumCharges.length ? t('drawer.paidThisMonth') : t('drawer.commitment') },
  ];
  return <div className="overview-grid">{items.map(({ label, value, icon: Icon, tone, detail }) => <Card className="overview-card" key={label}><div className={`metric-icon ${tone}`}><Icon size={17}/></div><span>{label}</span><b>{value}</b><small>{detail}</small></Card>)}</div>;
}

function RivalPanel({ state }: { state: GameState }) {
  const { t, content } = useI18n();
  const human = getHumanPlayer(state);
  const players = [human, ...getAiPlayers(state)];
  const turns = getAiTurnsForRound(state, state.round);
  return <Card className="rivals-card"><div className="section-heading"><div><Eyebrow>{t('drawer.table')}</Eyebrow><h2>{t('drawer.everyone')}</h2></div><span className="tiny-count">{t('drawer.players', { n: players.length })}</span></div><div className="rival-list">{players.map((p) => {
    const c = characterText(p.id, content); const turn = turns.find((x) => x.playerId === p.id); const turnText = turn ? aiTurnText(turn, content, t) : null;
    return <div className={`rival-row ${p.controller === 'human' ? 'rival-you' : ''}`} key={p.id}><CharacterPortrait id={p.id} name={c.name} size={34} className="character-rival-art"/><div className="rival-name"><b>{c.name}{p.controller === 'human' && <em>{t('common.you')}</em>}</b><small>{p.controller === 'human' ? t('drawer.yourStrategy') : c.title}</small>{turnText && <small className="rival-rationale">{turnText.rationale || turnText.message}</small>}</div><div className="rival-amount"><b>{formatRM(p.cash)}</b><small>{t('common.cash')}</small></div><div className="rival-amount savings-amount"><b>{formatRM(p.savings)}</b><small>{t('common.savings')}</small></div><div className="rival-protection"><Shield size={13}/><small>{p.policies.length ? p.policies.map((x) => policyText(x.policyId, content).shortName).join(', ') : t('drawer.noCover')}</small></div></div>;
  })}</div></Card>;
}

function EventView({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const { t, content } = useI18n();
  const event = getCurrentEvent(state);
  if (state.phase === 'event-draw') return <TableCard kind="event" className="phase-card event-reveal"><CardMast kind="event" eyebrow={t('event.whatsAhead', { n: state.round })} title={t('event.whatHappens')}/><div className="tc-deck" aria-hidden="true"><span/><span/><span/></div><PhaseButton label={t('event.reveal')} onClick={() => dispatch({ type: 'event/draw' })}/></TableCard>;
  if (!event) return <Card className="phase-card"><h2>{t('event.unavailableTitle')}</h2><p>{t('event.unavailable')}</p></Card>;
  const player = getHumanPlayer(state);
  const tx = eventText(event, content);
  const total = event.expenses.reduce((n, e) => n + e.amount, 0);
  const kind = eventKind(event);
  return <TableCard kind={kind} className="event-card"><div className={`event-art category-${event.category}`}><CardArt slug={eventArt(event)} className="event-art-img"/><span className="event-risk">{tx.risk}</span></div><div className="event-copy"><CardMast kind={kind} eyebrow={t(`months.${state.round - 1}`)} title={<span className="event-title-enter">{tx.title}</span>}/><p className="event-story">{tx.story}</p><p className="event-shared"><Users size={15}/> {t('shared.note')}</p>
    {event.expenses.length > 0 && <div className="event-expenses">{event.expenses.map((e, i) => <div key={e.label}><span>{tx.expense(i)}</span><b>{formatRM(e.amount)}</b></div>)}<div className="event-total"><b>{t('event.totalCosts')}</b><b>{formatRM(total)}</b></div></div>}
    <details className="event-coverage"><summary>{t('event.coverHelp')}</summary>{POLICY_ORDER.map((id) => <div key={id}><b>{policyText(id, content).shortName} · {player.policies.some((p) => p.policyId === id) ? t('event.owned') : t('event.notOwned')}</b><span>{tx.note(id)}</span></div>)}</details>
    <LearnMore label={t('event.whyMatters')}><div className="lesson-snippet"><Sparkles size={17}/><div><b>{tx.lessonTitle}</b><p>{tx.lessonText}</p></div></div></LearnMore>
    <PhaseButton label={t('event.resolve')} onClick={() => dispatch({ type: 'event/resolve' })}/></div></TableCard>;
}

function ClaimView({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const { t, content } = useI18n();
  const player = getHumanPlayer(state); const record = getRoundRecord(player, state.round); const claim = record?.claim; const event = getCurrentEvent(state);
  if (!claim || !event) return <Card className="phase-card"><h2>{t('claim.unavailableTitle')}</h2><p>{t('claim.unavailable')}</p></Card>;
  const insight = insightText(claim, event, getRoundSummary(player, state.round)?.premiums ?? 0, content);
  const lines = [['total', claim.totalExpense], ['eligible', claim.eligibleMedicalExpense], ['reimbursement', claim.reimbursement], ['benefits', claim.fixedBenefits], ['outOfPocket', claim.outOfPocket], ['fromCash', claim.paidFromCash], ['fromSavings', claim.paidFromSavings], ['shortfall', claim.shortfall]] as const;
  const outcomeRow = (o: typeof claim.outcomes[number]) => <div className="outcome-row" key={o.policyId}><span className={`outcome-status status-${o.status}`}>{t(`claim.status.${o.status}`)}</span><div><b>{policyText(o.policyId, content).name}</b><LearnMore label={t('claim.why')}><p>{outcomeReason(o, event, content, t)}</p>{o.eligibleAmount !== undefined && <small>{t('claim.detail', { bill: formatRM(o.eligibleAmount), deductible: formatRM(o.deductibleApplied ?? 0), after: formatRM(o.amountAfterDeductible ?? 0) })}{o.coverageLimit !== undefined ? t('claim.detailLimit', { limit: formatRM(o.coverageLimit) }) : ''}</small>}</LearnMore></div><strong>{formatRM(o.payout)}</strong></div>;
  const owned = claim.outcomes.filter((o) => o.status !== 'not-owned'), others = claim.outcomes.filter((o) => o.status === 'not-owned');
  return <div className="claim-layout"><TableCard kind="protection" className="claim-card"><CardMast kind="protection" eyebrow={t('claim.eyebrow', { n: state.round })} title={eventText(event, content).title}/><CardArt slug={eventArt(event)} className="claim-art"/>
    <div className="claim-lines">{lines.filter(([key, value]) => value !== 0 || key === 'total' || key === 'outOfPocket').map(([key, value]) => <div className={key === 'reimbursement' || key === 'benefits' ? 'claim-positive' : key === 'outOfPocket' || key === 'shortfall' ? 'claim-negative' : ''} key={key}><span>{t(`claim.${key}`)}</span><b>{formatRM(value)}</b></div>)}</div>
    <div className="policy-outcomes"><h3>{t('claim.yourCover')}</h3>{owned.length ? owned.map(outcomeRow) : <p className="outcome-none">{t('claim.noCover')}</p>}{others.length > 0 && <LearnMore label={t('claim.otherCover')}>{others.map(outcomeRow)}</LearnMore>}</div>
    <EveryoneOutcome state={state}/></TableCard>
    <TableCard kind="special" className="claim-learning"><CardMast kind="special" icon={Sparkles} eyebrow={t('claim.teaches')} title={insight.title}/><div className="takeaway"><b>{t('claim.takeaway')}</b><span>{insight.takeaway}</span></div><LearnMore><p>{insight.explanation}</p>{insight.example && <p className="learning-example">{insight.example}</p>}</LearnMore><PhaseButton label={t('claim.continue')} onClick={() => dispatch({ type: 'claims/continue' })}/></TableCard></div>;
}

/** Each player's own result for this month's shared event, read from that player's own round record. */
function EveryoneOutcome({ state }: { state: GameState }) {
  const { t, content } = useI18n();
  const order = getTurnOrder(state.seed, state.players.map((p) => p.id));
  const rows = [...state.players].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)).map((p) => ({ p, claim: getRoundRecord(p, state.round)?.claim }));
  return <div className="everyone-outcome"><h3>{t('shared.everyone')}</h3><ul>{rows.map(({ p, claim }) => { const paid = (claim?.reimbursement ?? 0) + (claim?.fixedBenefits ?? 0); const c = characterText(p.id, content); return <li key={p.id} className={`eo-row eo-${p.id} ${p.id === state.humanId ? 'eo-you' : ''}`} data-player={p.id}>
    <CharacterPortrait id={p.id} name={c.name} size={26}/><b>{c.name}{p.id === state.humanId && <em>{t('common.you')}</em>}</b>
    <span className="eo-paid">{t('shared.paid', { amount: formatRM(claim?.outOfPocket ?? 0) })}</span>
    {paid > 0 && <span className="eo-cover">{t('shared.coverPaid', { amount: formatRM(paid) })}</span>}
  </li>; })}</ul></div>;
}

function MonthSummary({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const { t } = useI18n();
  const player = getHumanPlayer(state); const record = getRoundRecord(player, state.round); const summary = getRoundSummary(player, state.round); const claim = record?.claim;
  const saved = (record?.actions ?? []).filter((a) => a.kind === 'save').reduce((n, a) => n + a.amount, 0);
  const cells: [string, string, string?][] = [
    [t('summary.start'), formatRM(record?.cashAtStart ?? 0)], [t('summary.income'), `+${formatRM(record?.income ?? 0)}`, 'positive'], [t('summary.essentials'), `−${formatRM(record?.essentials ?? 0)}`],
    [t('summary.premiums'), `−${formatRM(summary?.premiums ?? 0)}`], [t('summary.saved'), `+${formatRM(saved)}`, 'positive'], [t('summary.eventCosts'), `−${formatRM(claim?.outOfPocket ?? 0)}`], [t('summary.benefits'), `+${formatRM(claim?.fixedBenefits ?? 0)}`, 'positive'],
  ];
  return <TableCard kind="special" className="summary-card"><CardMast kind="special" icon={Check} eyebrow={t('summary.eyebrow', { n: state.round })} title={t('summary.done', { month: t(`months.${state.round - 1}`) })}/>
    <div className="summary-progress"><div><span>{t('summary.journey')}</span><b>{t('summary.ofTotal', { n: state.round, total: GAME_CONFIG.totalRounds })}</b></div><span className="summary-progress-track"><i style={{ width: `${Math.min(100, (state.round / GAME_CONFIG.totalRounds) * 100)}%` }}/></span></div>
    <CardArt slug={saved > 0 ? 'savings' : 'emergency-fund'} className="summary-art"/>
    <div className="summary-balances"><div><span>{t('summary.endCash')}</span><b>{formatRM(player.cash)}</b></div><div><span>{t('summary.endSavings')}</span><b>{formatRM(player.savings)}</b></div></div>
    {(saved > 0 || (claim?.fixedBenefits ?? 0) + (claim?.reimbursement ?? 0) > 0) && <div className="summary-rewards">
      {saved > 0 && <span className="reward-chip reward-save"><b>+{formatRM(saved)}</b> {t('summary.saved')}</span>}
      {(claim?.fixedBenefits ?? 0) + (claim?.reimbursement ?? 0) > 0 && <span className="reward-chip reward-cover"><b>+{formatRM((claim?.fixedBenefits ?? 0) + (claim?.reimbursement ?? 0))}</b> {t('claim.yourCover')}</span>}
    </div>}
    <RecapChart player={player}/>
    <LearnMore><div className="summary-grid">{cells.map(([label, value, tone]) => <div key={label}><small>{label}</small><b className={tone}>{value}</b></div>)}</div></LearnMore>
    <PhaseButton label={state.round === GAME_CONFIG.totalRounds ? t('summary.review') : t('summary.next')} onClick={() => dispatch({ type: 'round/next' })}/></TableCard>;
}

function QuizView({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const { t, content } = useI18n();
  const { playEffect } = useAudio();
  const progress = getQuizProgress(state.quizAnswers);
  if (progress.allAnswered) return <TableCard kind="special" className="quiz-card quiz-finished"><CardMast kind="special" icon={Check} eyebrow={t('quiz.complete')} title={t('quiz.score', { correct: countCorrectAnswers(state.quizAnswers), total: progress.total })}/><Button onClick={() => dispatch({ type: 'quiz/finish' })}>{t('quiz.seeResults')} <ArrowRight size={16}/></Button></TableCard>;
  const question = progress.currentQuestion!;
  const q = quizText(question.id, content);
  return <TableCard kind="special" className="quiz-card" deal={false}><CardMast kind="special" icon={CircleHelp} eyebrow={t('quiz.eyebrow', { n: progress.answered.length + 1, total: progress.total })} title={q.prompt} corner={t('quiz.progress', { answered: progress.answered.length, total: progress.total })}/>
    {progress.answered.length > 0 && <details className="answered-review" open><summary>{t('quiz.reviewAnswered', { count: progress.answered.length })}</summary><div className="answered-review-list">{progress.answered.map((item) => { const iq = quizText(item.question.id, content); return <article className="answered-review-item" key={item.question.id}><span className={`answer-mark ${item.isCorrect ? 'answer-right' : 'answer-wrong'}`} aria-label={item.isCorrect ? t('quiz.correct') : t('quiz.incorrect')}>{item.isCorrect ? '✓' : '!'}</span><div><b>{iq.prompt}</b><p>{t('quiz.yourAnswer', { answer: item.selectedOption ? iq.option(item.selectedOption.id) : t('quiz.unavailable') })}</p>{!item.isCorrect && <p>{t('quiz.correctAnswer', { answer: iq.option(item.correctOption.id) })}</p>}<small>{iq.explanation}</small></div></article>; })}</div></details>}
    <div className="quiz-options">{question.options.map((o) => <button key={o.id} className="quiz-option" data-sound="own" onClick={() => { dispatch({ type: 'quiz/answer', questionId: question.id, optionId: o.id }); playEffect(o.id === question.correctOptionId ? 'quiz-correct' : 'quiz-wrong'); }}><span className="option-letter">{o.id.toUpperCase()}</span><span>{q.option(o.id)}</span></button>)}</div>
    <div className="quiz-footer"><span>{t('quiz.concept', { label: conceptLabel(question.concept, content) })}</span></div></TableCard>;
}

function ResultsView({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const { t, content } = useI18n();
  const standings = getFinalStandings(state); const human = getHumanPlayer(state); const winner = standings[0]!;
  return <div className="results-layout"><TableCard kind="special" className="results-hero" style={{ '--results-scene': `url(${sceneUrl('results-plaza', true)})` } as React.CSSProperties}><div className="results-podium" aria-hidden="true">{standings.slice(0, 3).map((s, i) => <span key={s.playerId} className={`podium-step podium-${i + 1}`}><CharacterPortrait id={s.playerId} name="" size={i === 0 ? 76 : 58}/><b>{i + 1}</b></span>)}</div><span className="winner-crown">✦</span><Eyebrow>{t('results.eyebrow')}</Eyebrow><h2>{winner.playerId === human.id ? t('results.youBuilt') : t('results.takesLead', { name: getCharacter(winner.playerId).name })}</h2><div className="final-score"><b>{standings.find((s) => s.playerId === human.id)?.total.toFixed(1)}</b><span>{t('results.score')}</span></div></TableCard>
    <Card className="standings-card"><div className="section-heading"><div><Eyebrow>{t('results.standings')}</Eyebrow><h2>{t('results.fourJourneys')}</h2></div><span className="score-chip">{t('results.outOf')}</span></div>
      <div className="standing-list">{standings.map((s, i) => { const c = characterText(s.playerId, content); return <div className={`standing-row ${s.playerId === human.id ? 'standing-you' : ''}`} key={s.playerId}><span className="rank-number">{String(i + 1).padStart(2, '0')}</span><CharacterPortrait id={s.playerId} name={c.name} size={30} className={`mini-avatar ${s.playerId}`}/><div className="standing-name"><b>{c.name}{s.playerId === human.id && <em>{t('common.you')}</em>}</b><small>{c.title}</small></div><div className="score-breakdown"><span>{t('results.wealth')} <b>{s.wealthPoints.toFixed(1)}</b></span><span>{t('results.savings')} <b>{s.savingsPoints.toFixed(1)}</b></span><span>{t('results.learning')} <b>{s.learningPoints.toFixed(1)}</b></span></div><div className="standing-total"><b>{s.total.toFixed(1)}</b><small>{t('results.points')}</small></div></div>; })}</div>
      <NetWorthChart state={state}/>
      <div className="results-note"><Shield size={17}/><span>{t('results.note')}</span></div></Card>
    <Card className="replay-card"><div><Eyebrow>{t('results.forward')}</Eyebrow><h2>{t('results.playAgain')}</h2><p>{t('results.tryAnother')}</p></div><Button onClick={() => dispatch({ type: 'game/clear' })}>{t('results.playAgainBtn')} <ArrowRight size={16}/></Button></Card><Disclaimer/></div>;
}

/** Focus mode: the board takes the screen. Uses the Fullscreen API where available, a CSS-only immersive layout otherwise. */
function useFocusMode() {
  const [focus, setFocus] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const sync = () => { if (!document.fullscreenElement) setFocus(false); };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggle = useCallback(() => {
    if (focus) { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); setFocus(false); return; }
    setFocus(true);
    const el = ref.current;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => { /* browsers may refuse; the CSS focus layout still applies */ });
  }, [focus]);
  return { focus, toggle, ref };
}

export function GameScreen({ state, dispatch, onExit, demo }: { state: GameState; dispatch: Dispatch; onExit: () => void; demo?: DemoSession }) {
  const { t } = useI18n();
  const player = getHumanPlayer(state); const record = getRoundRecord(player, state.round); const [showIntro, setShowIntro] = useState(false);
  // The demo keeps its board in memory only and runs at the presentation speed.
  const board = useBoardController(state, { persist: !demo, speed: demo?.speed ?? 1 });
  useDemoAutopilot(demo, state, dispatch, board);
  // 3D is primary; Board3DSlot falls back to the SVG board automatically. `?renderer=svg` is for QA only.
  const [renderer] = useState(() => readRendererOverride(window.location.search));
  const { focus, toggle: toggleFocus, ref: pageRef } = useFocusMode();
  const isOverlay = getActionLayerMode(state.status, state.phase, board.progress?.stage ?? null) === 'modal';
  useEffect(() => { document.body.classList.add('game-session'); return () => document.body.classList.remove('game-session'); }, []);
  const { playEffect } = useAudio();
  const previousState = useRef(state);
  // Turn order: rivals drawn before the human move their pawns first, as soon as the month's decisions open.
  useEffect(() => {
    if (state.status !== 'playing' || state.phase !== 'decisions' || !board.progress) return;
    if ((board.progress.stage === 'human-roll' && board.pendingBefore > 0) || board.progress.stage === 'pre-turns') void board.runPreTurns();
  }, [state.status, state.phase, board.progress?.stage, board.pendingBefore, board.runPreTurns]);
  useEffect(() => {
    if (state.status !== 'playing' || state.phase !== 'event-draw' || !board.progress) return;
    const step = getEventDrawBoardStep(board.progress.stage);
    if (step === 'run-ai-turns') void board.runAiTurns();
    else if (step === 'draw-event') dispatch({ type: 'event/draw' });
  }, [state.status, state.phase, board.progress?.stage, board.runAiTurns, dispatch]);
  useEffect(() => {
    const previous = previousState.current;
    if (previous.phase === 'income' && state.phase === 'expenses') playEffect('coins');
    if (previous.phase === 'expenses' && state.phase === 'decisions') playEffect('pay');
    if (demo && previous.phase === 'decisions' && state.phase !== 'decisions') {
      // Demo autopilot confirmed moves (a player's own confirm plays this sound on click, in DecisionCard).
      const actions = getRoundRecord(getHumanPlayer(state), state.round)?.actions ?? [];
      playEffect(actions.some((a) => a.kind === 'buy') ? 'purchase' : actions.some((a) => a.kind === 'save') ? 'save' : 'confirm');
    }
    if (previous.phase === 'event-draw' && state.phase === 'event') playEffect('event');
    if (previous.phase === 'event' && state.phase === 'claims') {
      const result = getRoundRecord(getHumanPlayer(state), state.round)?.claim;
      if (result && (result.reimbursement + result.fixedBenefits) > 0) playEffect('claim');
      else if (result && result.outOfPocket > 0) playEffect('warning');
    }
    if (previous.phase === 'claims' && state.phase === 'summary') playEffect('month');
    if (previous.status === 'review' && state.status === 'complete') playEffect(getFinalStandings(state)[0]?.playerId === state.humanId ? 'winner' : 'results');
    previousState.current = state;
  }, [state, playEffect, demo]);
  // Board sounds follow the turn sequence (presentation only; they never affect the game).
  useEffect(() => { if (board.dieTumbling) playEffect('dice'); }, [board.dieTumbling, playEffect]);
  useEffect(() => { if (board.dieValue !== null && !board.dieTumbling) playEffect('dice-land'); }, [board.dieValue, board.dieTumbling, playEffect]);
  useEffect(() => { if (board.progress?.stage === 'human-landed' && state.phase === 'decisions') playEffect('card'); }, [board.progress?.stage, state.phase, playEffect]);
  useEffect(() => { if (board.movementStep) playEffect('step'); }, [board.movementStep?.playerId, board.movementStep?.position, playEffect]);
  // Landing: a weightier placement on the spaces that matter most (salary, cover, the final checkpoint).
  useEffect(() => {
    if (!board.landing) return;
    const space = BOARD_ROUTE[board.landing.space]!;
    playEffect(space.label === 'CHECKPOINT' || space.category === 'salary' || space.category === 'protection' ? 'land-key' : 'land');
  }, [board.landing, playEffect]);
  const month = t(`months.${state.round - 1}`);
  const title = useMemo(() => state.status === 'review' ? t('game.review') : state.status === 'complete' ? t('game.results') : state.phase === 'event' || state.phase === 'event-draw' ? t('game.lifeHappens') : state.phase === 'claims' ? t('game.numbers') : state.phase === 'summary' ? t('game.navigated') : t('game.plan', { month }), [state, t, month]);
  const lastMove = board.progress?.lastMovement;
  let content: ReactNode = null;
  if (state.status === 'review') content = <QuizView state={state} dispatch={dispatch}/>;
  else if (state.status === 'complete') content = <ResultsView state={state} dispatch={demo ? () => demo.restart() : dispatch}/>;
  else if (state.phase === 'income') content = <TableCard kind="income" className="phase-card income-phase"><CardMast kind="income" icon={Coins} eyebrow={t('game.incomeEyebrow', { n: state.round })} title={t('game.payday')}/><CardArt slug="income" className="phase-art"/><div className="income-amount tc-figure">+{formatRM(GAME_CONFIG.monthlyIncome)}<small>{t('game.monthlyIncome')}</small></div><PhaseButton label={t('game.collect')} onClick={() => dispatch({ type: 'round/collect-income' })}/></TableCard>;
  else if (state.phase === 'expenses') content = <TableCard kind="expense" className="phase-card expenses-phase"><CardMast kind="expense" icon={Wallet} eyebrow={t('game.billsEyebrow', { n: state.round })} title={t('game.payBills')}/><CardArt slug="bills" className="phase-art"/><div className="bill-breakdown"><div><span>{t('game.rentFood')}</span><b>−{formatRM(GAME_CONFIG.essentialExpenses)}</b></div><div><span>{t('game.coverPremiums')}</span><b>−{formatRM(getMonthlyPremiumTotal(player))}</b></div><div className="bill-remaining"><span>{t('game.cashLeft')}</span><b>{formatRM(player.cash - GAME_CONFIG.essentialExpenses - getMonthlyPremiumTotal(player))}</b></div></div><PhaseButton label={t('game.pay')} onClick={() => dispatch({ type: 'round/pay-bills' })}/></TableCard>;
  else if (state.phase === 'decisions') content = board.progress?.stage === 'human-landed' ? <DecisionCard state={state} dispatch={dispatch} landed={lastMove?.playerId === state.humanId ? { roll: lastMove.roll, label: t(`tiles.${BOARD_ROUTE[lastMove.to]!.label === 'CHECKPOINT' ? 'checkpoint' : BOARD_ROUTE[lastMove.to]!.category}`) } : null}/> : null;
  else if (state.phase === 'event-draw') content = null; // rivals' turns are shown on the board itself
  else if (state.phase === 'event') content = <EventView state={state} dispatch={dispatch}/>;
  else if (state.phase === 'claims') content = <ClaimView state={state} dispatch={dispatch}/>;
  else if (state.phase === 'summary') content = <MonthSummary state={state} dispatch={dispatch}/>;
  const positions = { ...(board.progress?.positions ?? {}), ...(board.movementStep ? { [board.movementStep.playerId]: board.movementStep.position } : {}) } as Record<CharacterId, number>;
  return <main ref={pageRef} className={`game-page game-fullscreen ${focus ? "focus-mode" : ""} ${demo ? "demo-mode" : ""}`}>
    <GameHeader state={state} onExit={onExit}/>
    <div className="game-content game-scene-content">
      <div className="content-heading"><div><Eyebrow>{state.status === 'playing' ? t('game.eyebrow', { n: state.round, phase: t(`phase.${state.phase}`) }) : t('game.journey')}</Eyebrow><h1>{title}</h1></div>{state.status === 'playing' && <div className="content-heading-actions">
        <button className="how-link focus-toggle" onClick={toggleFocus} aria-pressed={focus}>{focus ? <Minimize2 size={17}/> : <Maximize2 size={17}/>} {focus ? t('game.exitFullscreen') : t('game.fullscreen')}</button>
        <button className="how-link" onClick={() => setShowIntro(true)}><CircleHelp size={17}/> {t('game.howToPlay')}</button></div>}</div>
      {state.status === 'playing' && <BoardScene state={state} progress={board.progress} rolling={board.rolling} movementStep={board.movementStep} dieTumbling={board.dieTumbling} dieValue={board.dieValue} landing={board.landing} stepMs={board.stepMs} onRoll={() => void board.rollHuman()} waitingFor={board.pendingBefore} rollControl={!demo} renderBoard={renderer === '3d' ? (svgBoard, view, label) => <Board3DSlot view={view} fallback={svgBoard} label={label}/> : undefined}/>}
      {state.status === 'playing' && <details className="financial-drawer"><summary>{t('drawer.money')}<span className="drawer-figures"> · {t('drawer.summary', { cash: formatRM(player.cash), savings: formatRM(player.savings) })}</span></summary><PlayerDashboard state={state} positions={positions} activeId={board.movementStep?.playerId ?? board.progress?.activePlayer ?? (state.phase === 'decisions' ? state.humanId : null)}/><FinancialOverview state={state}/><RivalPanel state={state}/></details>}
      {content && <div className={`game-action-layer ${isOverlay ? 'game-action-modal' : 'game-action-dock'}`}><div className="primary-column">{content}</div></div>}
      <footer className="game-footer"><Disclaimer compact/><span>{state.status === 'playing' && record ? t('game.footerStage', { n: state.round, stage: t(`stage.${record.stage}`) }) : t('game.footerPace')}</span></footer>
    </div>
    {demo && <><DemoTip state={state} stage={board.progress?.stage ?? null} speed={demo.speed}/><DemoPanel session={demo} onSkip={board.skipAnimation}/></>}
    {showIntro && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowIntro(false); }}><Card className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="how-title"><button className="modal-close" onClick={() => setShowIntro(false)} aria-label={t('common.close')}>×</button><Eyebrow>{t('howto.quickGuide')}</Eyebrow><h2 id="how-title">{t('howto.title')}</h2><HowToPlay/><Disclaimer/><Button onClick={() => setShowIntro(false)}>{t('howto.backToGame')}</Button></Card></div>}
  </main>;
}

