import { ArrowLeft, CircleHelp, Coins, HeartPulse, Landmark, Shield } from 'lucide-react';
import { CHARACTERS, getCharacter } from '../game/characters.ts';
import { GAME_CONFIG, MONTH_NAMES } from '../game/constants.ts';
import { getHumanPlayer } from '../game/gameReducer.ts';
import { formatRM } from '../game/format.ts';
import { POLICIES } from '../game/policies.ts';
import type { GameState } from '../game/types.ts';
import { Button, Brand } from './ui.tsx';
import { CharacterPortrait } from './CharacterPortrait.tsx';
import { AudioControls } from './AudioControls.tsx';
import { AnimatedMoney } from './AnimatedMoney.tsx';

const stages = ['Your month', 'Life event', 'Claim', 'Month recap', 'Learning', 'Results'];
function activeStage(state: GameState) {
  if (state.status === 'review') return 4;
  if (state.status === 'complete') return 5;
  if (state.phase === 'event' || state.phase === 'event-draw') return 1;
  if (state.phase === 'claims') return 2;
  if (state.phase === 'summary') return 3;
  return 0;
}

export function GameHeader({ state, onExit }: { state: GameState; onExit: () => void }) {
  const player = getHumanPlayer(state);
  const character = getCharacter(player.id);
  const progress = state.status === 'complete' ? 100 : state.status === 'review' ? 94 : ((state.round - 1) / GAME_CONFIG.totalRounds) * 100;
  return <header className="game-header">
    <div className="game-topbar"><Brand /><div className="topbar-right"><span className="round-pill">{state.status === 'review' ? 'LEARNING REVIEW' : state.status === 'complete' ? 'CHALLENGE COMPLETE' : `${MONTH_NAMES[state.round - 1]} · MONTH ${state.round}`}</span><AudioControls/><Button variant="quiet" className="exit-button" onClick={onExit} aria-label="Exit game"><ArrowLeft size={16} /><span>Exit</span></Button></div></div>
    <div className="game-progress"><div className="progress-meta"><span>Six-month challenge</span><span>{state.status === 'complete' ? 6 : state.round} of 6 months</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><nav className="stage-track" aria-label="Game progress">{stages.map((label, i) => <div key={label} className={`stage-dot ${i === activeStage(state) ? 'is-current' : ''} ${i < activeStage(state) ? 'is-done' : ''}`}><span className="stage-number">{i < activeStage(state) ? '✓' : i + 1}</span><span>{label}</span></div>)}</nav></div>
    {state.status === 'playing' && <div className="resource-strip"><div className="resource-player"><CharacterPortrait id={player.id} name={getCharacter(player.id).name} size={36} className="character-mini-art"/><div><b>{character.name}</b><small>{character.title}</small></div></div><div className="resource-item"><Coins size={16}/><span><small>Cash</small><b><AnimatedMoney amount={player.cash}/></b></span></div><div className="resource-item"><Landmark size={16}/><span><small>Emergency savings</small><b><AnimatedMoney amount={player.savings}/></b></span></div><div className="resource-item"><HeartPulse size={16}/><span><small>Monthly premiums</small><b><AnimatedMoney amount={player.policies.reduce((n, p) => n + POLICIES[p.policyId].monthlyPremium, 0)}/></b></span></div><div className="resource-item action-resource"><Shield size={16}/><span><small>Action points</small><b>{player.actionPoints}</b></span></div><div className="resource-help"><CircleHelp size={16}/><span>{CHARACTERS.length} players · 6 months</span></div></div>}
  </header>;
}
