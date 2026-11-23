import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { gameReducer, type GameAction } from '../game/gameReducer.ts';
import type { GameState } from '../game/types.ts';
import { loadSavedGame, persistGame, GAME_STORAGE_KEY } from './persistence.ts';

type GameContextValue = { state: GameState | null; dispatch: (action: GameAction) => void; hasSavedGame: boolean };
const GameContext = createContext<GameContextValue | null>(null);

function readSavedGame(): GameState | null {
  try { return loadSavedGame(localStorage, GAME_STORAGE_KEY); }
  catch { return null; }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readSavedGame, []);
  const [state, rawDispatch] = useReducer(gameReducer, initial);
  const dispatch = useCallback((action: GameAction) => rawDispatch(action), []);

  useEffect(() => {
    try { persistGame(localStorage, state, GAME_STORAGE_KEY); }
    catch { /* The game remains playable if browser storage is unavailable. */ }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, hasSavedGame: state !== null }), [state, dispatch]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside GameProvider');
  return value;
}
