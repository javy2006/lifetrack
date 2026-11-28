import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.tsx';

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section className={`surface-card ${className}`} {...props}>{children}</section>;
}

export function Brand({ light = false }: { light?: boolean }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><img src="/logo/lifetrack-logo-128.png" alt="" width={128} height={128} decoding="async" /></span><span>LIFETRACK</span></div>;
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return <p className={`disclaimer ${compact ? 'disclaimer-compact' : ''}`}>{t(compact ? 'common.disclaimerShort' : 'common.disclaimer')}</p>;
}

/** Optional detail, closed by default: keeps screens short while the full explanation stays one tap away. */
export function LearnMore({ children, label, className = '' }: { children: ReactNode; label?: string; className?: string }) {
  const { t } = useI18n();
  return <details className={`learn-more ${className}`}><summary>{label ?? t('common.learnMore')}</summary><div className="learn-more-body">{children}</div></details>;
}

export function Eyebrow({ children }: { children: ReactNode }) { return <p className="eyebrow">{children}</p>; }
export function ArrowLink({ children }: { children: ReactNode }) { return <span className="button-content">{children}<ArrowRight size={17} /></span>; }

