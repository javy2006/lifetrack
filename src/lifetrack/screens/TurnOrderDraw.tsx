/**
 * Turn-order draw: a short tabletop ceremony shown once when a new game starts.
 *
 * The order itself is NOT decided here: it is `getTurnOrder(seed)` (board/turnOrder.ts), fixed for the
 * game. This screen only reveals it, so skipping, replaying or reloading can never change it, and it
 * never dispatches a game action. A resumed save goes straight to the board (no second draw).
 *
 * Rhythm (~4.6 s): four face-down cards are dealt (0.6 s), each player's card flips in turn (0.8 s
 * apiece), then the players line up in their final order with a small celebration. Reduced motion shows
 * the final order at once. "Skip" jumps to the final order; "Start the game" continues.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FastForward } from 'lucide-react';
import { CHARACTERS } from '../game/characters.ts';
import type { CharacterId } from '../game/types.ts';
import { getTurnOrder } from '../board/turnOrder.ts';
import { prefersReducedMotion } from '../board/boardTiming.ts';
import { CharacterPortrait } from '../components/CharacterPortrait.tsx';
import { useAudio } from '../components/AudioControls.tsx';
import { Button } from '../components/ui.tsx';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { characterText } from '../i18n/content.ts';

const DEAL_MS = 600, FLIP_MS = 800;

export function TurnOrderDraw({ seed, humanId, playerIds, onDone }: { seed: number; humanId: CharacterId; playerIds: readonly CharacterId[]; onDone: () => void }) {
  const { t, content } = useI18n();
  const { playEffect } = useAudio();
  const order = useMemo(() => getTurnOrder(seed, playerIds), [seed, playerIds]);
  // Players are introduced in the character-list order; each flips to reveal their place.
  const seats = useMemo(() => CHARACTERS.map((c) => c.id).filter((id) => playerIds.includes(id)), [playerIds]);
  const [revealed, setRevealed] = useState(() => prefersReducedMotion() ? seats.length : 0);
  const [dealt, setDealt] = useState(() => prefersReducedMotion());
  const done = revealed >= seats.length;

  useEffect(() => {
    if (done) return;
    const id = window.setTimeout(() => {
      if (!dealt) { setDealt(true); return; }
      setRevealed((n) => n + 1);
      playEffect('card');
    }, dealt ? FLIP_MS : DEAL_MS);
    return () => window.clearTimeout(id);
  }, [dealt, revealed, done, playEffect]);
  useEffect(() => { if (done) playEffect('month'); }, [done, playEffect]);

  const place = (id: CharacterId) => order.indexOf(id) + 1;
  return <main className="setup-page turn-draw" aria-labelledby="turn-draw-title">
    <div className="setup-heading">
      <p className="eyebrow">{t('turnOrder.eyebrow')}</p>
      <h1 id="turn-draw-title">{t('turnOrder.title')}</h1>
      <p>{t('turnOrder.subtitle')}</p>
    </div>
    <ol className={`td-table ${done ? 'is-done' : ''}`} aria-live="polite">
      {seats.map((id, i) => {
        const c = characterText(id, content), shown = i < revealed, n = place(id);
        return <li key={id} className={`td-seat td-place-${n} ${shown ? 'is-revealed' : ''} ${id === humanId ? 'is-you' : ''}`}
          style={{ '--i': i, '--order': done ? n : i + 1 } as React.CSSProperties}>
          <span className="td-player"><CharacterPortrait id={id} name={c.name} size={64}/><b>{c.name}</b>{id === humanId && <em>{t('common.you')}</em>}</span>
          <span className={`td-card ${dealt ? 'is-dealt' : ''}`} aria-label={shown ? `${c.name}: ${t(`turnOrder.place.${n}`)}` : undefined}>
            <span className="td-face td-back" aria-hidden="true"/>
            <span className="td-face td-front" aria-hidden={!shown}><strong>{n}</strong><small>{t(`turnOrder.place.${n}`)}</small></span>
          </span>
        </li>;
      })}
    </ol>
    {done && <div className="td-burst" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--k': i } as React.CSSProperties}/>)}</div>}
    <p className="td-note">{t('turnOrder.note')}</p>
    <div className="td-actions">
      {done
        ? <Button className="td-start" onClick={onDone} autoFocus>{t('turnOrder.start')} <ArrowRight size={18}/></Button>
        : <Button variant="secondary" className="td-skip" onClick={() => { setDealt(true); setRevealed(seats.length); }}><FastForward size={16}/> {t('turnOrder.skip')}</Button>}
    </div>
  </main>;
}
