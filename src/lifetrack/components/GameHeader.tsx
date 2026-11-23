import { ArrowLeft, CircleHelp, Coins, HeartPulse, Landmark, Shield } from 'lucide-react';
import { CHARACTERS, getCharacter } from '../game/characters.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { characterText } from '../i18n/content.ts';
import { GAME_CONFIG } from '../game/constants.ts';
import { getHumanPlayer } from '../game/gameReducer.ts';
import { formatRM } from '../game/format.ts';
import { POLICIES } from '../game/policies.ts';
import type { GameState } from '../game/types.ts';
import { Button, Brand } from './ui.tsx';
import { CharacterPortrait } from './CharacterPortrait.tsx';
import { AudioControls } from './AudioControls.tsx';
import { LanguageSelect } from '../i18n/I18nProvider.tsx';
import { AnimatedMoney } from './AnimatedMoney.tsx';

const STAGE_COUNT = 6;
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
  const { t, content } = useI18n();
  const character = characterText(player.id, content);
  const stages = Array.from({ length: STAGE_COUNT }, (_, i) => t(`header.stages.${i}`));
  const progress = state.status === 'complete' ? 100 : state.status === 'review' ? 94 : ((state.round - 1) / GAME_CONFIG.totalRounds) * 100;
  return <header className="game-header">
    <div className="game-topbar"><Brand /><div className="topbar-right"><span className="round-pill">{state.status === 'review' ? t('header.learningReview') : state.status === 'complete' ? t('header.complete') : t('header.monthPill', { month: t(`months.${state.round - 1}`), n: state.round })}</span><LanguageSelect className="language-select-compact" short/><AudioControls/><Button variant="quiet" className="exit-button" onClick={onExit} aria-label={t('common.exitGame')}><ArrowLeft size={16} /><span>{t('common.exit')}</span></Button></div></div>
    <div className="game-progress"><div className="progress-meta"><span>{t('header.challenge')}</span><span>{t('common.monthOf', { n: state.status === 'complete' ? GAME_CONFIG.totalRounds : state.round, total: GAME_CONFIG.totalRounds })}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><nav className="stage-track" aria-label={t('header.progress')}>{stages.map((label, i) => <div key={label} className={`stage-dot ${i === activeStage(state) ? 'is-current' : ''} ${i < activeStage(state) ? 'is-done' : ''}`}><span className="stage-number">{i < activeStage(state) ? '✓' : i + 1}</span><span>{label}</span></div>)}</nav></div>
    {state.status === 'playing' && <div className="resource-strip"><div className="resource-player"><CharacterPortrait id={player.id} name={getCharacter(player.id).name} size={36} className="character-mini-art"/><div><b>{character.name}</b><small>{character.title}</small></div></div><div className="resource-item"><Coins size={16}/><span><small>{t('common.cash')}</small><b><AnimatedMoney amount={player.cash}/></b></span></div><div className="resource-item"><Landmark size={16}/><span><small><span className="lbl-long">{t('common.emergencySavings')}</span><span className="lbl-short">{t('common.savings')}</span></small><b><AnimatedMoney amount={player.savings}/></b></span></div><div className="resource-item"><HeartPulse size={16}/><span><small><span className="lbl-long">{t('common.monthlyPremiums')}</span><span className="lbl-short">{t('common.premiums')}</span></small><b><AnimatedMoney amount={player.policies.reduce((n, p) => n + POLICIES[p.policyId].monthlyPremium, 0)}/></b></span></div><div className="resource-item action-resource"><Shield size={16}/><span><small>{t('common.actionPoints')}</small><b>{player.actionPoints}</b></span></div><div className="resource-help"><CircleHelp size={16}/><span>{t('common.playersMonths', { players: CHARACTERS.length, months: GAME_CONFIG.totalRounds })}</span></div></div>}
  </header>;
}
