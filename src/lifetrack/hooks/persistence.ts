import { isValidGameState } from '../game/gameReducer.ts';
import type { GameState } from '../game/types.ts';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const GAME_STORAGE_KEY = 'lifetrack.game.v1';

export function loadSavedGame(storage: StorageLike, key = GAME_STORAGE_KEY): GameState | null {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    const candidate: unknown = JSON.parse(raw);
    if (isValidGameState(candidate)) return candidate;
  } catch {
    // Malformed or unavailable storage is treated like an empty save.
  }
  try { storage.removeItem(key); } catch { /* Storage can be disabled by the browser. */ }
  return null;
}

export function persistGame(storage: StorageLike, state: GameState | null, key = GAME_STORAGE_KEY): void {
  try {
    if (state) storage.setItem(key, JSON.stringify(state));
    else storage.removeItem(key);
  } catch {
    // Persistence is optional; a storage quota or privacy setting must not block play.
  }
}
