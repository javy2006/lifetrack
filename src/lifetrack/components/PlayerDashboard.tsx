/**
 * Four-player dashboard: every player at a glance (2x2 on desktop and tablet, one compact row on
 * phones). All figures are read from the game state on each render, so they update as soon as a
 * decision is made; nothing here changes the game.
 *  - Savings:   emergency savings (the player's only asset besides cash; the game has no debt).
 *  - Debt:      the engine's unpaid shortfall (costs a player could not cover from cash or savings).
 *  - Net worth: cash + emergency savings (the engine's financial position used for scoring).
 */
import { useEffect, useRef, useState } from 'react';
import type { CharacterId, GameState } from '../game/types.ts';
import { getCharacter } from '../game/characters.ts';
import { formatRM } from '../game/format.ts';
import { POLICY_ORDER } from '../game/policies.ts';
import { getTurnOrder } from '../board/turnOrder.ts';
import { CharacterPortrait } from './CharacterPortrait.tsx';
import { useI18n } from '../i18n/I18nProvider.tsx';

/**
 * Floating "+RM3,500 / −RM2,500" chip when a figure changes (presentation only). Decorative: the
 * figure itself is the accessible value, so the chip is hidden from assistive tech.
 */
function DeltaChip({ value }: { value: number }) {
  const prev = useRef(value);
  const [delta, setDelta] = useState<{ amount: number; key: number } | null>(null);
  useEffect(() => {
    const diff = value - prev.current;
    prev.current = value;
    if (diff === 0) return;
    setDelta((d) => ({ amount: diff, key: (d?.key ?? 0) + 1 }));
    const id = window.setTimeout(() => setDelta(null), 1600);
    return () => window.clearTimeout(id);
  }, [value]);
  if (!delta) return null;
  return <span key={delta.key} className={`pd-delta ${delta.amount > 0 ? 'up' : 'down'}`} aria-hidden="true">{delta.amount > 0 ? '+' : '−'}{formatRM(Math.abs(delta.amount))}</span>;
}

export function PlayerDashboard({ state, positions, activeId }: { state: GameState; positions: Record<CharacterId, number>; activeId: CharacterId | null }) {
  const { t } = useI18n();
  // Mats follow the game's seeded turn order (1st to 4th), the same order the pawns move in.
  const order = getTurnOrder(state.seed, state.players.map((p) => p.id));
  const ordered = [...state.players].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return <section className="player-dashboard" aria-label={t('dashboard.aria')}>
    {ordered.map((p) => {
      const c = getCharacter(p.id), you = p.id === state.humanId, active = p.id === activeId;
      return <article key={p.id} className={`pd-card pd-${p.id} ${you ? 'pd-you' : ''} ${active ? 'pd-active' : ''}`} aria-current={active ? 'true' : undefined}>
        <header>
          <span className="pd-order" aria-label={t('turnOrder.position', { n: order.indexOf(p.id) + 1 })}>{order.indexOf(p.id) + 1}</span>
          <CharacterPortrait id={p.id} name={c.name} size={30}/>
          <div className="pd-name"><b>{c.name}</b><small>{t(you ? 'dashboard.youSpace' : 'dashboard.aiSpace', { n: (positions[p.id] ?? 0) + 1 })}</small></div>
          <span className="pd-cover" role="img" aria-label={t('dashboard.coverCount', { n: p.policies.length })}>{POLICY_ORDER.map((id) => <i key={id} className={p.policies.some((x) => x.policyId === id) ? 'on' : ''}/>)}</span>
          {active && <span className="pd-turn">{t(you ? 'dashboard.yourTurn' : 'dashboard.moving')}</span>}
        </header>
        <dl>
          <div className="pd-cash"><dt>{t('common.cash')}</dt><dd>{formatRM(p.cash)}</dd><DeltaChip value={p.cash}/></div>
          <div className="pd-savings"><dt>{t('common.savings')}</dt><dd>{formatRM(p.savings)}</dd><DeltaChip value={p.savings}/></div>
          <div className="pd-worth"><dt>{t('common.netWorth')}</dt><dd>{formatRM(p.cash + p.savings)}</dd></div>
          <div className={`pd-debt ${p.unpaidShortfall > 0 ? 'has-debt' : ''}`}><dt>{t('dashboard.debt')}</dt><dd>{p.unpaidShortfall > 0 ? `−${formatRM(p.unpaidShortfall)}` : formatRM(0)}</dd></div>
        </dl>
      </article>;
    })}
  </section>;
}
