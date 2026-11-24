/**
 * Printed tabletop cards: one visual language for every card the player handles (decision,
 * life event, payday, bills, claim, recap, quiz, results). Presentation only: a card shows the
 * engine's data it is given and never computes money.
 *
 * Each kind has its own ink colour, seal icon and printed label, so a card is recognisable
 * before it is read. Cards "deal" onto the table with a short animation (none with reduced motion).
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { Banknote, CalendarHeart, Coins, Gem, Receipt, ShieldCheck, Siren, Sprout, type LucideIcon } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.tsx';
import type { CardKind } from './cardKinds.ts';

export { eventKind, type CardKind } from './cardKinds.ts';

export const KIND_ICON: Record<CardKind, LucideIcon> = {
  event: CalendarHeart, opportunity: Sprout, investment: Coins, protection: ShieldCheck, expense: Receipt, emergency: Siren, income: Banknote, special: Gem,
};

/** The printed masthead: seal with the kind's icon, the kind label and an optional line, then the title. */
export function CardMast({ kind, label, eyebrow, title, titleId, icon, corner }: { kind: CardKind; label?: ReactNode; eyebrow?: ReactNode; title: ReactNode; titleId?: string; icon?: LucideIcon; corner?: ReactNode }) {
  const { t } = useI18n();
  const Icon = icon ?? KIND_ICON[kind];
  return <header className="tc-mast">
    <span className="tc-seal" aria-hidden="true"><Icon size={20} strokeWidth={2.2}/></span>
    <div className="tc-mast-text">
      <p className="tc-kind"><span>{label ?? t(`card.kind.${kind}`)}</span>{eyebrow && <><i aria-hidden="true">·</i><span className="tc-eyebrow">{eyebrow}</span></>}</p>
      <h2 id={titleId}>{title}</h2>
    </div>
    {corner !== undefined && <span className="tc-corner" aria-hidden="true">{corner}</span>}
  </header>;
}

/** A physical card surface. Keeps any extra classes the screens and QA rely on. */
export function TableCard({ kind, className = '', children, deal = true, ...props }: HTMLAttributes<HTMLElement> & { kind: CardKind; children: ReactNode; deal?: boolean }) {
  return <section className={`surface-card table-card kind-${kind} ${deal ? 'tc-deal' : ''} ${className}`} {...props}>{children}</section>;
}
