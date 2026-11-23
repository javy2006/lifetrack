import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { DISCLAIMER } from '../game/constants.ts';

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section className={`surface-card ${className}`} {...props}>{children}</section>;
}

export function Brand({ light = false }: { light?: boolean }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><ShieldCheck size={19} /></span><span>LIFETRACK</span></div>;
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return <p className={`disclaimer ${compact ? 'disclaimer-compact' : ''}`}>{compact ? 'Fictional educational examples. Not financial advice.' : DISCLAIMER}</p>;
}

export function Eyebrow({ children }: { children: ReactNode }) { return <p className="eyebrow">{children}</p>; }
export function ArrowLink({ children }: { children: ReactNode }) { return <span className="button-content">{children}<ArrowRight size={17} /></span>; }

