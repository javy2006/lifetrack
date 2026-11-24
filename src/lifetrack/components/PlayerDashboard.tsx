/**
 * Four-player dashboard: every player at a glance (2x2 on desktop and tablet, one compact row on
 * phones). All figures are read from the game state on each render, so they update as soon as a
 * decision is made; nothing here changes the game.
 *  - Savings:   emergency savings (the player's only asset besides cash; the game has no debt).
 *  - Expenses:  monthly essentials plus that player's active premiums.
 *  - Net worth: cash + emergency savings (the engine's financial position used for scoring).
 */
import type { CharacterId, GameState } from '../game/types.ts';
import { GAME_CONFIG } from '../game/constants.ts';
import { getCharacter } from '../game/characters.ts';
import { getMonthlyPremiumTotal } from '../game/calculations.ts';
import { formatRM } from '../game/format.ts';
import { POLICY_ORDER } from '../game/policies.ts';
import { CharacterPortrait } from './CharacterPortrait.tsx';
import { useI18n } from '../i18n/I18nProvider.tsx';

export function PlayerDashboard({ state, positions, activeId }: { state: GameState; positions: Record<CharacterId, number>; activeId: CharacterId | null }) {
  const { t } = useI18n();
  const ordered = [...state.players].sort((a, b) => (a.id === state.humanId ? -1 : b.id === state.humanId ? 1 : 0));
  return <section className="player-dashboard" aria-label={t('dashboard.aria')}>
    {ordered.map((p) => {
      const c = getCharacter(p.id), you = p.id === state.humanId, active = p.id === activeId;
      const expenses = GAME_CONFIG.essentialExpenses + getMonthlyPremiumTotal(p);
      return <article key={p.id} className={`pd-card pd-${p.id} ${you ? 'pd-you' : ''} ${active ? 'pd-active' : ''}`} aria-current={active ? 'true' : undefined}>
        <header>
          <CharacterPortrait id={p.id} name={c.name} size={30}/>
          <div className="pd-name"><b>{c.name}</b><small>{t(you ? 'dashboard.youSpace' : 'dashboard.aiSpace', { n: (positions[p.id] ?? 0) + 1 })}</small></div>
          <span className="pd-cover" role="img" aria-label={t('dashboard.coverCount', { n: p.policies.length })}>{POLICY_ORDER.map((id) => <i key={id} className={p.policies.some((x) => x.policyId === id) ? 'on' : ''}/>)}</span>
          {active && <span className="pd-turn">{t(you ? 'dashboard.yourTurn' : 'dashboard.moving')}</span>}
        </header>
        <dl>
          <div className="pd-cash"><dt>{t('common.cash')}</dt><dd>{formatRM(p.cash)}</dd></div>
          <div className="pd-savings"><dt>{t('common.savings')}</dt><dd>{formatRM(p.savings)}</dd></div>
          <div className="pd-worth"><dt>{t('common.netWorth')}</dt><dd>{formatRM(p.cash + p.savings)}</dd></div>
          <div className="pd-out"><dt>{t('common.expenses')}</dt><dd>−{formatRM(expenses)}</dd></div>
        </dl>
      </article>;
    })}
  </section>;
}
