/**
 * The isolated presentation demo game: its own reducer, nothing persisted, so the player's saved
 * game and board are never touched. Speed only scales pacing; restart replays the same seed.
 */
import { useCallback, useEffect, useReducer, useState } from 'react';
import { gameReducer } from '../game/gameReducer.ts';
import { GameScreen } from '../screens/GameScreen.tsx';
import { DEMO_HUMAN, DEMO_SEED, createDemoGame } from './demoScript.ts';
import { FAST_FORWARD_SPEED, type DemoSession } from './demoUi.tsx';

export function DemoGame({ onExit }: { onExit: () => void }) {
  const [state, dispatch] = useReducer(gameReducer, null, () => createDemoGame());
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [ff, setFf] = useState<null | { target: 'milestone' | 'results'; fromRound: number }>(null);
  useEffect(() => {
    if (!ff || !state) return;
    if (ff.target === 'results' && state.status === 'complete') setFf(null);
    if (ff.target === 'milestone' && ((state.phase === 'summary' && state.round > ff.fromRound) || state.status !== 'playing')) { setFf(null); setPaused(true); }
  }, [ff, state]);
  const restart = useCallback(() => { dispatch({ type: 'game/new', humanId: DEMO_HUMAN, seed: DEMO_SEED }); setFf(null); setPaused(false); setRun((r) => r + 1); }, []);
  if (!state) return null;
  const session: DemoSession = {
    speed: ff ? FAST_FORWARD_SPEED : speed, paused, fastForward: Boolean(ff), setPaused, setSpeed,
    nextMilestone: () => { setFf({ target: 'milestone', fromRound: state.phase === 'summary' ? state.round : state.round - 1 }); setPaused(false); },
    toResults: () => { setFf({ target: 'results', fromRound: state.round }); setPaused(false); },
    restart, exit: onExit,
  };
  return <GameScreen key={run} state={state} dispatch={dispatch} onExit={onExit} demo={session}/>;
}

