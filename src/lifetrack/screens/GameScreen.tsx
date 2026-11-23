import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, CircleHelp, Coins, HeartPulse, Landmark, RotateCcw, Shield, Sparkles, Wallet } from 'lucide-react';
import { CHARACTERS, getCharacter } from '../game/characters.ts';
import { GAME_CONFIG, MONTH_NAMES } from '../game/constants.ts';
import { checkPurchase, checkSave, getMonthlyPremiumTotal, getRoundRecord, getRoundSummary } from '../game/calculations.ts';
import { getAiTurnsForRound, getAiPlayers, getCurrentEvent, getHumanPlayer } from '../game/gameReducer.ts';
import { formatRM } from '../game/format.ts';
import { CONCEPTS, getClaimInsight as claimInsightContent } from '../game/insights.ts';
import { POLICY_ORDER, POLICIES } from '../game/policies.ts';
import { getFinalStandings } from '../game/scoring.ts';
import { countCorrectAnswers } from '../game/quiz.ts';
import { getQuizProgress } from '../hooks/quizProgress.ts';
import type { GameState } from '../game/types.ts';
import type { GameAction } from '../game/gameReducer.ts';
import { Button, Card, Disclaimer, Eyebrow, LearnMore } from '../components/ui.tsx';
import { GameHeader } from '../components/GameHeader.tsx';
import { CharacterArt } from '../components/CharacterArt.tsx';
import { EventIllustration } from '../components/EventIllustration.tsx';
import { CityScene } from '../components/CityScene.tsx';
import { BoardScene } from '../board/BoardScene.tsx';
import { useBoardController } from '../board/useBoardController.ts';
import { getActionLayerMode, getEventDrawBoardStep } from '../board/boardTypes.ts';
import { useAudio } from '../components/AudioControls.tsx';
import { Board3DSlot } from '../board3d/Board3DSlot.tsx';
import { readRendererOverride } from '../board3d/rendererPreference.ts';


function PhaseButton({ label, onClick }: { label: string; onClick: () => void }) { return <Button onClick={onClick}>{label}<ArrowRight size={16}/></Button>; }

function FinancialOverview({ state }: { state: GameState }) {
  const human = getHumanPlayer(state);
  const record = getRoundRecord(human, state.round);
  const items = [
    { label: 'Monthly income', value: formatRM(GAME_CONFIG.monthlyIncome), icon: Coins, tone: 'green', detail: 'Received each month' },
    { label: 'Essential expenses', value: formatRM(GAME_CONFIG.essentialExpenses), icon: Wallet, tone: 'rose', detail: 'Housing, food and bills' },
    { label: 'Policy premiums', value: formatRM(getMonthlyPremiumTotal(human)), icon: HeartPulse, tone: 'blue', detail: record?.premiumCharges.length ? 'Paid this month' : 'Monthly commitment' },
  ];
  return <div className="overview-grid">{items.map(({label,value,icon:Icon,tone,detail})=><Card className="overview-card" key={label}><div className={`metric-icon ${tone}`}><Icon size={17}/></div><span>{label}</span><b>{value}</b><small>{detail}</small></Card>)}</div>;
}

function RivalPanel({ state }: { state: GameState }) {
  const human = getHumanPlayer(state);
  const players = [human, ...getAiPlayers(state)];
  const turns = getAiTurnsForRound(state, state.round);
  return <Card className="rivals-card"><div className="section-heading"><div><Eyebrow>THE TABLE</Eyebrow><h2>Everyone’s money journey</h2></div><span className="tiny-count">4 players</span></div><div className="rival-list">{players.map((p) => { const c = getCharacter(p.id); const turn = turns.find((t) => t.playerId === p.id); return <div className={`rival-row ${p.controller === 'human' ? 'rival-you' : ''}`} key={p.id}><CharacterArt characterId={p.id} className="character-rival-art" title={`${c.name} portrait`}/><div className="rival-name"><b>{c.name}{p.controller === 'human' && <em>You</em>}</b><small>{p.controller === 'human' ? 'Your strategy' : c.title}</small>{turn && <small className="rival-rationale">{turn.rationale || turn.message}</small>}</div><div className="rival-amount"><b>{formatRM(p.cash)}</b><small>cash</small></div><div className="rival-amount savings-amount"><b>{formatRM(p.savings)}</b><small>savings</small></div><div className="rival-protection"><Shield size={13}/><small>{p.policies.length ? p.policies.map((x) => POLICIES[x.policyId].shortName).join(', ') : 'No cover'}</small></div></div>; })}</div></Card>;
}

function PolicyMarketplace({ state, dispatch }: { state: GameState; dispatch: (a: GameAction) => void }) {
  const player = getHumanPlayer(state);
  const {playEffect}=useAudio();
  return <Card className="market-card"><div className="section-heading"><div><Eyebrow>OPTIONAL · 1 ACTION EACH</Eyebrow><h2>Buy protection</h2></div><span className="fiction-pill">Fictional</span></div><div className="policy-grid">{POLICY_ORDER.map((id) => { const p = POLICIES[id]; const owned = player.policies.some((x) => x.policyId === id); const permitted = checkPurchase(player, id, state.round); const benefit = p.benefit.kind === 'reimbursement' ? `Up to ${formatRM(p.benefit.coverageLimit)} reimbursement` : `${formatRM(p.benefit.amount)} ${p.benefit.kind === 'fixed' ? 'fixed benefit' : 'lump sum'}`; return <article className={`policy-card policy-${id} ${owned ? 'policy-owned' : ''}`} key={id}><div className="policy-top"><span className={`policy-symbol policy-symbol-${id}`}>{id === 'medical' ? <HeartPulse size={18}/> : id === 'accident' ? <Shield size={18}/> : <Sparkles size={18}/>}</span>{owned ? <span className="owned-tag"><Check size={13}/> Active</span> : <span className="premium-tag">{formatRM(p.monthlyPremium)} / month</span>}</div><h3>{p.name}</h3><b className="policy-benefit">{benefit}</b><LearnMore><p className="policy-type">{p.protectionType}</p>{p.benefit.kind === 'reimbursement' && <p className="policy-detail">You pay the first {formatRM(p.benefit.deductible)} · pays up to {formatRM(p.benefit.coverageLimit)}</p>}<div className="policy-explain"><b>Responds to</b><span>{p.coveredEvent}</span><b>Exclusions</b><span>{p.exclusions.join(' · ')}</span></div><p className="policy-explanation">{p.explanation}</p></LearnMore><Button variant={owned || !permitted.allowed ? 'secondary' : 'primary'} disabled={owned || !permitted.allowed || player.actionPoints <= 0} onClick={() => {dispatch({type:'decision/buy',policyId:id});playEffect('purchase')}}>{owned ? 'Already active' : permitted.reason === 'insufficient-cash' ? 'Not enough cash' : player.actionPoints === 0 ? 'No actions left' : 'Buy cover'}</Button></article>; })}</div><Disclaimer compact/></Card>;
}

function RoundDecision({ state, dispatch }: { state: GameState; dispatch: (a: GameAction) => void }) {
  const player = getHumanPlayer(state);
  const {playEffect}=useAudio();
  const canSave = checkSave(player, state.round).allowed;
  const points = player.actionPoints;
  return <Card className="decision-card"><div className="section-heading"><div><Eyebrow>YOUR MOVES</Eyebrow><h2>{points===0?'All set':`Pick ${points} more`}</h2></div><div className="action-pips" aria-label={`${points} action points remaining`}>{Array.from({length:GAME_CONFIG.actionPointsPerRound},(_,i)=><span className={i<points?'pip-active':''} key={i}/>)}</div></div><div className="decision-actions"><button className="decision-action save-action" disabled={!canSave||points===0} onClick={()=>{dispatch({type:'decision/save'});playEffect('coins')}}><span><Landmark size={18}/></span><b>Save {formatRM(GAME_CONFIG.saveAmount)}</b><small>Into emergency savings</small></button><button className="decision-action pass-action" disabled={points===0} onClick={()=>dispatch({type:'decision/pass'})}><span><ArrowRight size={18}/></span><b>Pass</b><small>Keep the cash</small></button></div>{points===0?<div className="decision-footer"><p><Check size={15}/> Ready</p><Button onClick={()=>dispatch({type:'decision/confirm'})}>Confirm decisions <ArrowRight size={16}/></Button></div>:<div className="decision-footer"><p>{state.round===1?'Save, buy cover or pass. You can reset before confirming.':`${points} left`}</p>{getHumanPlayer(state).history[state.round-1]?.actions.length>0&&<Button variant="quiet" onClick={()=>dispatch({type:'decision/reset'})}><RotateCcw size={14}/> Reset choices</Button>}</div>}</Card>;
}

function EventView({ state, dispatch }: { state: GameState; dispatch:(a:GameAction)=>void }) {
  const event = getCurrentEvent(state);
  if(state.phase==='event-draw') return <Card className="phase-card event-reveal"><div className="event-icon">✦</div><Eyebrow>MONTH {state.round} · WHAT’S AHEAD?</Eyebrow><h2>What happens this month?</h2><PhaseButton label="Reveal life event" onClick={()=>dispatch({type:'event/draw'})}/></Card>;
  if(!event) return <Card className="phase-card"><h2>Event unavailable</h2><p>The current game state does not contain an event card for this stage.</p></Card>;
  const player=getHumanPlayer(state);
  const total=event.expenses.reduce((n,e)=>n+e.amount,0);
  return <Card className="event-card"><div className={`event-art category-${event.category}`}><EventIllustration event={event}/><span className="event-risk">{event.riskLabel}</span></div><div className="event-copy"><Eyebrow>{MONTH_NAMES[state.round-1]} · SHARED LIFE EVENT</Eyebrow><h2 className="event-title-enter">{event.title}</h2><p className="event-story">{event.story}</p>{event.expenses.length>0&&<div className="event-expenses">{event.expenses.map((e)=><div key={e.label}><span>{e.label}</span><b>{formatRM(e.amount)}</b></div>)}<div className="event-total"><b>Total event costs</b><b>{formatRM(total)}</b></div></div>}<details className="event-coverage"><summary>Will my cover help?</summary>{POLICY_ORDER.map(id=><div key={id}><b>{POLICIES[id].shortName} · {player.policies.some(p=>p.policyId===id)?'Owned':'Not owned'}</b><span>{event.coverageNotes[id]}</span></div>)}</details><LearnMore label="Why it matters"><div className="lesson-snippet"><Sparkles size={17}/><div><b>{event.lesson.title}</b><p>{event.lesson.text}</p></div></div></LearnMore><PhaseButton label="Resolve this month" onClick={()=>dispatch({type:'event/resolve'})}/></div></Card>;
}

function ClaimView({state,dispatch}:{state:GameState;dispatch:(a:GameAction)=>void}) {
  const player=getHumanPlayer(state);const record=getRoundRecord(player,state.round);const claim=record?.claim;const event=getCurrentEvent(state);
  if(!claim||!event)return <Card className="phase-card"><h2>Claim details unavailable</h2><p>Return to the month flow and try again.</p></Card>;
  const insight=claimInsightContent(claim,event,getRoundSummary(player,state.round)?.premiums??0);
  const lines=[['Total event expense',claim.totalExpense],['Eligible hospital expense',claim.eligibleMedicalExpense],['Medical reimbursement',claim.reimbursement],['Fixed and lump-sum benefits',claim.fixedBenefits],['Out of pocket',claim.outOfPocket],['Paid from cash',claim.paidFromCash],['Paid from savings',claim.paidFromSavings],['Unpaid shortfall',claim.shortfall]] as const;
  return <div className="claim-layout"><Card className="claim-card"><div className="section-heading"><div><Eyebrow>MONTH {state.round} · CLAIM BREAKDOWN</Eyebrow><h2>{event.title}</h2></div></div><div className="claim-lines">{lines.filter(([label,value])=>value!==0||label==='Total event expense'||label==='Out of pocket').map(([label,value])=><div className={['Medical reimbursement','Fixed and lump-sum benefits'].includes(label)?'claim-positive':['Out of pocket','Unpaid shortfall'].includes(label)?'claim-negative':''} key={label}><span>{label}</span><b>{formatRM(value)}</b></div>)}</div><div className="policy-outcomes"><h3>Your cover</h3>{(()=>{const outcomeRow=(o:typeof claim.outcomes[number])=><div className="outcome-row" key={o.policyId}><span className={`outcome-status status-${o.status}`}>{o.status}</span><div><b>{POLICIES[o.policyId].name}</b><LearnMore label="Why"><p>{o.reason}</p>{o.eligibleAmount!==undefined&&<small>Eligible bill {formatRM(o.eligibleAmount)} · Deductible {formatRM(o.deductibleApplied??0)} · After deductible {formatRM(o.amountAfterDeductible??0)}{o.coverageLimit!==undefined?` · Limit ${formatRM(o.coverageLimit)}`:''}</small>}</LearnMore></div><strong>{formatRM(o.payout)}</strong></div>;const owned=claim.outcomes.filter(o=>o.status!=='not-owned'),others=claim.outcomes.filter(o=>o.status==='not-owned');return <>{owned.length?owned.map(outcomeRow):<p className="outcome-none">No cover owned. You paid this yourself.</p>}{others.length>0&&<LearnMore label="What other cover would do">{others.map(outcomeRow)}</LearnMore>}</>;})()}</div></Card><Card className="claim-learning"><span className="learning-icon"><Sparkles size={20}/></span><Eyebrow>WHAT THIS TEACHES</Eyebrow><h2>{insight.title}</h2><div className="takeaway"><b>Takeaway</b><span>{insight.takeaway}</span></div><LearnMore><p>{insight.explanation}</p>{insight.example&&<p className="learning-example">{insight.example}</p>}</LearnMore><PhaseButton label="Continue to month recap" onClick={()=>dispatch({type:'claims/continue'})}/></Card></div>;
}

function MonthSummary({state,dispatch}:{state:GameState;dispatch:(a:GameAction)=>void}) {
  const player=getHumanPlayer(state);const record=getRoundRecord(player,state.round);const summary=getRoundSummary(player,state.round);const event=record?.eventId?getCurrentEvent(state):null;const claim=record?.claim;
  const saved=(record?.actions??[]).filter(a=>a.kind==='save').reduce((n,a)=>n+a.amount,0);
  return <Card className="summary-card"><div className="summary-banner"><span className="summary-check"><Check size={21}/></span><div><Eyebrow>MONTH {state.round} COMPLETE</Eyebrow><h2>{MONTH_NAMES[state.round-1]} done</h2></div></div><div className="summary-progress"><div><span>Six-month journey</span><b>{state.round} of {GAME_CONFIG.totalRounds}</b></div><span className="summary-progress-track"><i style={{width:`${Math.min(100,state.round/GAME_CONFIG.totalRounds*100)}%`}}/></span></div><div className="summary-grid"><div><small>Starting cash</small><b>{formatRM(record?.cashAtStart??0)}</b></div><div><small>Income received</small><b className="positive">+{formatRM(record?.income??0)}</b></div><div><small>Essential expenses</small><b>−{formatRM(record?.essentials??0)}</b></div><div><small>Premiums paid</small><b>−{formatRM(summary?.premiums??0)}</b></div><div><small>Moved to savings</small><b className="positive">+{formatRM(saved)}</b></div><div><small>Event costs</small><b>−{formatRM(claim?.outOfPocket??0)}</b></div><div><small>Benefits received</small><b className="positive">+{formatRM(claim?.fixedBenefits??0)}</b></div></div><div className="summary-balances"><div><span>Ending cash</span><b>{formatRM(player.cash)}</b></div><div><span>Emergency savings</span><b>{formatRM(player.savings)}</b></div></div><PhaseButton label={state.round===GAME_CONFIG.totalRounds?'Go to learning review':'Continue to next month'} onClick={()=>dispatch({type:'round/next'})}/></Card>;
}

function QuizView({state,dispatch}:{state:GameState;dispatch:(a:GameAction)=>void}) {
  const {playEffect}=useAudio();
  const progress = getQuizProgress(state.quizAnswers);
  if(progress.allAnswered)return <Card className="quiz-card quiz-finished"><span className="quiz-finished-icon"><Check size={23}/></span><Eyebrow>LEARNING COMPLETE</Eyebrow><h2>{countCorrectAnswers(state.quizAnswers)} of {progress.total} correct</h2><Button onClick={()=>dispatch({type:'quiz/finish'})}>See final results <ArrowRight size={16}/></Button></Card>;
  const question = progress.currentQuestion!;
  const questionNumber = progress.answered.length + 1;
  return <Card className="quiz-card"><div className="quiz-top"><div><Eyebrow>LEARNING REVIEW · {questionNumber} OF {progress.total}</Eyebrow><h2>{question.prompt}</h2></div><span className="quiz-progress">{progress.answered.length}/{progress.total} complete</span></div>{progress.answered.length>0&&<details className="answered-review" open><summary>Review {progress.answered.length} answered question{progress.answered.length===1?'':'s'}</summary><div className="answered-review-list">{progress.answered.map(item=><article className="answered-review-item" key={item.question.id}><span className={`answer-mark ${item.isCorrect?'answer-right':'answer-wrong'}`} aria-label={item.isCorrect?'Correct':'Incorrect'}>{item.isCorrect?'✓':'!'}</span><div><b>{item.question.prompt}</b><p>Your answer: {item.selectedOption?.text??'Unavailable'}</p>{!item.isCorrect&&<p>Correct answer: {item.correctOption.text}</p>}<small>{item.question.explanation}</small></div></article>)}</div></details>}<div className="quiz-options">{question.options.map(o=><button key={o.id} className="quiz-option" onClick={()=>{dispatch({type:'quiz/answer',questionId:question.id,optionId:o.id});playEffect(o.id===question.correctOptionId?'quiz-correct':'quiz-wrong')}}><span className="option-letter">{o.id.toUpperCase()}</span><span>{o.text}</span></button>)}</div><div className="quiz-footer"><span>Concept · {CONCEPTS[question.concept].label}</span></div></Card>;
}

function ResultsView({state,dispatch}:{state:GameState;dispatch:(a:GameAction)=>void}) {
  const standings=getFinalStandings(state);const human=getHumanPlayer(state);const winner=standings[0];const character=(id:string)=>CHARACTERS.find(c=>c.id===id)!;
  return <div className="results-layout"><Card className="results-hero"><span className="winner-crown">✦</span><Eyebrow>SIX MONTHS, MANY SMART MOVES</Eyebrow><h2>{winner.playerId===human.id?'You built your tomorrow.':`${character(winner.playerId).name} takes the lead.`}</h2><div className="final-score"><b>{standings.find(s=>s.playerId===human.id)?.total.toFixed(1)}</b><span>Your Financial Resilience Score</span></div></Card><Card className="standings-card"><div className="section-heading"><div><Eyebrow>FINAL STANDINGS</Eyebrow><h2>Four journeys, one challenge</h2></div><span className="score-chip">Score out of 100</span></div><div className="standing-list">{standings.map((s,i)=>{const c=character(s.playerId);return <div className={`standing-row ${s.playerId===human.id?'standing-you':''}`} key={s.playerId}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><span className={`mini-avatar ${s.playerId}`}>{c.name.slice(0,1)}</span><div className="standing-name"><b>{c.name}{s.playerId===human.id&&<em>You</em>}</b><small>{c.title}</small></div><div className="score-breakdown"><span>Wealth <b>{s.wealthPoints.toFixed(1)}</b></span><span>Savings <b>{s.savingsPoints.toFixed(1)}</b></span><span>Learning <b>{s.learningPoints.toFixed(1)}</b></span></div><div className="standing-total"><b>{s.total.toFixed(1)}</b><small>points</small></div></div>})}</div><div className="results-note"><Shield size={17}/><span>Owning a policy does not add score points. Your score reflects wealth, savings and what you learned.</span></div></Card><Card className="replay-card"><div><Eyebrow>TAKE WHAT YOU LEARNED FORWARD</Eyebrow><h2>Play again?</h2><p>Try another character.</p></div><Button onClick={()=>dispatch({type:'game/clear'})}>Play again <ArrowRight size={16}/></Button></Card><Disclaimer/></div>;
}

export function GameScreen({state,dispatch,onExit}:{state:GameState;dispatch:(a:GameAction)=>void;onExit:()=>void}) {
  const player=getHumanPlayer(state);const record=getRoundRecord(player,state.round);const [showIntro,setShowIntro]=useState(false);
  const board=useBoardController(state);
  // 3D is primary; Board3DSlot falls back to the SVG board automatically. `?renderer=svg` is for QA only.
  const [renderer]=useState(()=>readRendererOverride(window.location.search));
  const isOverlay=getActionLayerMode(state.status,state.phase,board.progress?.stage??null)==='modal';
  useEffect(()=>{document.body.classList.add('game-session');return()=>document.body.classList.remove('game-session');},[]);
  const {playEffect}=useAudio();
  const previousState=useRef(state);
  useEffect(()=>{
    if(state.status!=='playing'||state.phase!=='event-draw'||!board.progress)return;
    const step=getEventDrawBoardStep(board.progress.stage);
    if(step==='run-ai-turns')void board.runAiTurns();
    else if(step==='draw-event')dispatch({type:'event/draw'});
  },[state.status,state.phase,board.progress?.stage,board.runAiTurns,dispatch]);
  useEffect(()=>{
    const previous=previousState.current;
    if(previous.phase==='income'&&state.phase==='expenses')playEffect('coins');
    if(previous.phase==='event-draw'&&state.phase==='event')playEffect('event');
    if(previous.phase==='event'&&state.phase==='claims'){
      const result=getRoundRecord(getHumanPlayer(state),state.round)?.claim;
      if(result&&(result.reimbursement+result.fixedBenefits)>0)playEffect('claim');
    }
    if(previous.phase==='claims'&&state.phase==='summary')playEffect('month');
    if(previous.status==='review'&&state.status==='complete'&&getFinalStandings(state)[0]?.playerId===state.humanId)playEffect('winner');
    previousState.current=state;
  },[state,playEffect]);
  const title=useMemo(()=>state.status==='review'?'Learning Review':state.status==='complete'?'Your Results':state.phase==='event'||state.phase==='event-draw'?'Life happens. Your choices matter.':state.phase==='claims'?'Here’s how the numbers landed.':state.phase==='summary'?'A month well navigated.':`Your ${MONTH_NAMES[state.round-1]} money plan`,[state]);
  let content;
  if(state.status==='review')content=<QuizView state={state} dispatch={dispatch}/>;
  else if(state.status==='complete')content=<ResultsView state={state} dispatch={dispatch}/>;
  else if(state.phase==='income')content=<Card className="phase-card income-phase"><span className="phase-orbit"><Coins size={25}/></span><Eyebrow>MONTH {state.round} · INCOME DAY</Eyebrow><h2>Payday</h2><div className="income-amount">+{formatRM(GAME_CONFIG.monthlyIncome)}<small>monthly income</small></div><PhaseButton label="Collect monthly income" onClick={()=>dispatch({type:'round/collect-income'})}/></Card>;
  else if(state.phase==='expenses')content=<Card className="phase-card expenses-phase"><span className="phase-orbit"><Wallet size={25}/></span><Eyebrow>MONTH {state.round} · THE ESSENTIALS</Eyebrow><h2>Pay the bills</h2><div className="bill-breakdown"><div><span>Rent, food and bills</span><b>−{formatRM(GAME_CONFIG.essentialExpenses)}</b></div><div><span>Cover premiums</span><b>−{formatRM(getMonthlyPremiumTotal(player))}</b></div><div className="bill-remaining"><span>Cash left</span><b>{formatRM(player.cash-GAME_CONFIG.essentialExpenses-getMonthlyPremiumTotal(player))}</b></div></div><PhaseButton label="Pay monthly essentials" onClick={()=>dispatch({type:'round/pay-bills'})}/></Card>;
  else if(state.phase==='decisions')content=board.progress?.stage==='human-landed'?<><RoundDecision state={state} dispatch={dispatch}/><PolicyMarketplace state={state} dispatch={dispatch}/></>:<Card className="phase-card"><Eyebrow>YOUR TURN</Eyebrow><h2>Roll the dice</h2>{state.round===1&&<p>Move round the board, then make your money moves.</p>}{board.progress?.stage==='human-roll'&&<Button disabled={board.rolling} onClick={()=>void board.rollHuman()}>{board.rolling?'Rolling…':'Roll Dice'}<ArrowRight size={16}/></Button>}</Card>;
  else if(state.phase==='event-draw')content=<Card className="phase-card"><Eyebrow>THE TABLE · AI TURNS</Eyebrow><h2>{board.progress?.activePlayer?`${getCharacter(board.progress.activePlayer).name} is moving`:board.progress?.stage==='complete'?'Everyone has moved':'Rivals are moving'}</h2></Card>;
  else if(state.phase==='event')content=<EventView state={state} dispatch={dispatch}/>;
  else if(state.phase==='claims')content=<ClaimView state={state} dispatch={dispatch}/>;
  else content=<MonthSummary state={state} dispatch={dispatch}/>;
  return <main className="game-page game-fullscreen"><div className="game-city-backdrop"><CityScene decorative/></div><GameHeader state={state} onExit={onExit}/><div className="game-content game-scene-content"><div className="content-heading"><div><Eyebrow>{state.status==='playing'?`MONTH ${state.round} · ${state.phase.replace('-',' ').toUpperCase()}`:'LIFETRACK · YOUR JOURNEY'}</Eyebrow><h1>{title}</h1></div>{state.status==='playing'&&<div className="content-heading-actions"><button className="how-link" onClick={()=>setShowIntro(true)}><CircleHelp size={17}/> How to play</button></div>}</div>{state.status==='playing'&&<BoardScene state={state} progress={board.progress} rolling={board.rolling} movementStep={board.movementStep} dieTumbling={board.dieTumbling} dieValue={board.dieValue} landing={board.landing} stepMs={board.stepMs} onRoll={()=>void board.rollHuman()} rollControl={false} renderBoard={renderer==="3d"?(svgBoard,view,label)=><Board3DSlot view={view} fallback={svgBoard} label={label}/>:undefined}/>}{state.status==='playing'&&<details className="financial-drawer"><summary>Money<span className="drawer-figures"> · {formatRM(player.cash)} cash · {formatRM(player.savings)} savings</span></summary><FinancialOverview state={state}/><RivalPanel state={state}/></details>}<div className={`game-action-layer ${isOverlay?'game-action-modal':'game-action-dock'}`}><div className="primary-column">{content}</div></div><footer className="game-footer"><Disclaimer compact/><span>{state.status==='playing'&&record?`Month ${state.round} · ${record.stage.replace(/-/g,' ')}`:'LifeTrack · learn at your own pace'}</span></footer></div>{showIntro&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowIntro(false)}}><Card className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="how-title"><button className="modal-close" onClick={()=>setShowIntro(false)} aria-label="Close">×</button><Eyebrow>QUICK GUIDE</Eyebrow><h2 id="how-title">How your month works</h2><ol className="how-list"><li>Collect income and pay essential bills.</li><li>Use two actions to save, buy fictional protection or pass.</li><li>Confirm to let AI rivals make their moves.</li><li>Reveal the shared life event, then review each claim.</li><li>Carry your balances and learning into the next month.</li></ol><Disclaimer/><Button onClick={()=>setShowIntro(false)}>Back to the game</Button></Card></div>}</main>;
}
