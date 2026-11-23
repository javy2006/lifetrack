/**
 * Four-player dashboard: every player at a glance (2x2 on desktop and tablet, one compact row on
 * phones). All figures are read from the game state on each render, so they update as soon as a
 * decision is made; nothing here changes the game.
 *  - Income:    monthly income (the same for every player).
 *  - Expenses:  monthly essentials plus that player's active premiums.
 *  - Net worth: cash + emergency savings (the engine's financial position used for scoring).
 */
import type { CharacterId, GameState } from '../game/types.ts';
import { GAME_CONFIG } from '../game/constants.ts';
import { getCharacter } from '../game/characters.ts';
import { getMonthlyPremiumTotal } from '../game/calculations.ts';
import { formatRM } from '../game/format.ts';
import { CharacterPortrait } from './CharacterPortrait.tsx';

export function PlayerDashboard({ state, positions, activeId }: { state: GameState; positions: Record<CharacterId, number>; activeId: CharacterId | null }) {
  const ordered = [...state.players].sort((a, b) => (a.id === state.humanId ? -1 : b.id === state.humanId ? 1 : 0));
  return <section className="player-dashboard" aria-label="All players">
    {ordered.map((p) => {
      const c = getCharacter(p.id), you = p.id === state.humanId, active = p.id === activeId;
      const expenses = GAME_CONFIG.essentialExpenses + getMonthlyPremiumTotal(p);
      return <article key={p.id} className={`pd-card pd-${p.id} ${you ? 'pd-you' : ''} ${active ? 'pd-active' : ''}`} aria-current={active ? 'true' : undefined}>
        <header>
          <CharacterPortrait id={p.id} name={c.name} size={30}/>
          <div className="pd-name"><b>{c.name}</b><small>{you ? 'You' : 'AI'} · Space {(positions[p.id] ?? 0) + 1}</small></div>
          {active && <span className="pd-turn">{you ? 'Your turn' : 'Moving'}</span>}
        </header>
        <dl>
          <div className="pd-cash"><dt>Cash</dt><dd>{formatRM(p.cash)}</dd></div>
          <div className="pd-worth"><dt>Net worth</dt><dd>{formatRM(p.cash + p.savings)}</dd></div>
          <div className="pd-in"><dt>Income</dt><dd>+{formatRM(GAME_CONFIG.monthlyIncome)}</dd></div>
          <div className="pd-out"><dt>Expenses</dt><dd>−{formatRM(expenses)}</dd></div>
        </dl>
      </article>;
    })}
  </section>;
}
