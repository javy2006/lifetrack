/**
 * Presentation demo UI: autopilot hook, control panel and narration. (The isolated demo game
 * itself is DemoGame.tsx.) Runs an isolated game (its own reducer, nothing persisted: the player's
 * saved game and board are never touched) driven by an autopilot that follows demoScript through
 * the real engine. Speed only scales animation and pacing delays; it never changes a number.
 */
import { useEffect, useState } from 'react';
import { FastForward, Pause, Play, RotateCcw, SkipForward, Trophy, X } from 'lucide-react';
import type { GameState } from '../game/types.ts';
import type { GameAction } from '../game/gameReducer.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { nextDemoStep } from './demoScript.ts';
import type { useBoardController } from '../board/useBoardController.ts';

export const DEMO_SPEEDS = [1, 2, 4, 8] as const;
export const FAST_FORWARD_SPEED = 40;
type Board = ReturnType<typeof useBoardController>;

export interface DemoSession {
  speed: number;
  paused: boolean;
  fastForward: boolean;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  nextMilestone: () => void;
  toResults: () => void;
  restart: () => void;
  exit: () => void;
}

/** Drives the demo game: one scheduled step at a time, re-planned whenever state or board stage changes. */
export function useDemoAutopilot(session: DemoSession | undefined, state: GameState, dispatch: (a: GameAction) => void, board: Board) {
  const stage = board.progress?.stage ?? null;
  useEffect(() => {
    if (!session || session.paused) return;
    const step = nextDemoStep(state, stage);
    if (step.kind === 'done' || step.kind === 'wait') return;
    if (step.kind === 'roll' && board.rolling) return;
    const id = window.setTimeout(() => {
      if (step.kind === 'roll') void board.rollHuman();
      else for (const a of step.actions) dispatch(a);
    }, step.delayMs / Math.max(1, session.speed));
    return () => window.clearTimeout(id);
  }, [session?.paused, session?.speed, state, stage, board.rolling, board.rollHuman, dispatch, session]);
}

/** Compact presentation controls, docked bottom-left. */
export function DemoPanel({ session, onSkip }: { session: DemoSession; onSkip: () => void }) {
  const { t } = useI18n();
  return <aside className="demo-panel" aria-label={t('demo.controls')}>
    <span className="demo-badge">{t('demo.badge')}</span>
    <button type="button" className="demo-btn" onClick={() => session.setPaused(!session.paused)} aria-label={session.paused ? t('demo.play') : t('demo.pause')} title={session.paused ? t('demo.play') : t('demo.pause')}>{session.paused ? <Play size={16}/> : <Pause size={16}/>}</button>
    <div className="demo-speeds" role="group" aria-label={t('demo.speed')}>
      {DEMO_SPEEDS.map((s) => <button type="button" key={s} className="demo-speed" aria-pressed={!session.fastForward && session.speed === s} onClick={() => session.setSpeed(s)}>{s}×</button>)}
    </div>
    <button type="button" className="demo-btn" onClick={onSkip} aria-label={t('demo.skip')} title={t('demo.skip')}><SkipForward size={16}/></button>
    <button type="button" className="demo-btn" onClick={session.nextMilestone} aria-label={t('demo.next')} title={t('demo.next')}><FastForward size={16}/></button>
    <button type="button" className="demo-btn" onClick={session.toResults} aria-label={t('demo.results')} title={t('demo.results')}><Trophy size={16}/></button>
    <button type="button" className="demo-btn" onClick={session.restart} aria-label={t('demo.restart')} title={t('demo.restart')}><RotateCcw size={16}/></button>
    <button type="button" className="demo-btn demo-exit" onClick={session.exit} aria-label={t('demo.exit')} title={t('demo.exit')}><X size={16}/></button>
    {session.paused && <span className="demo-state" aria-live="polite">{t('demo.paused')}</span>}
  </aside>;
}

/** Short narration for the audience at the key moments of month 1 and at the end. */
export function DemoTip({ state, stage, speed }: { state: GameState; stage: string | null; speed: number }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState<string | null>(null);
  let key: string | null = null;
  if (state.status === 'complete') key = 'demo.tipResults';
  else if (state.status === 'playing' && state.round === 1) {
    if (state.phase === 'income' || state.phase === 'expenses') key = 'demo.tipStart';
    else if (state.phase === 'decisions' && stage === 'human-landed') key = 'demo.tipDecide';
    else if (state.phase === 'event') key = 'demo.tipEvent';
    else if (state.phase === 'claims') key = 'demo.tipClaim';
  }
  // Each note shows for a few seconds (shorter at higher speeds), then gets out of the way.
  useEffect(() => {
    if (!key) return;
    const id = window.setTimeout(() => setHidden(key), Math.max(1500, 5200 / Math.max(1, speed)));
    return () => window.clearTimeout(id);
  }, [key, speed]);
  if (!key || hidden === key) return null;
  return <div className="demo-tip" role="status" key={key}><span className="demo-tip-badge">{t('demo.title')}</span><p>{t(key)}</p></div>;
}
