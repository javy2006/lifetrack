/**
 * Card and scene artwork (presentation only). Every image is an optimised WebP built from the
 * owner's art by scripts/assets/build_overhaul_assets.py (decisions in docs/ASSET_REVIEW.md) and
 * served relative to Vite's base URL. Art never carries numbers: amounts always come from the engine.
 */
import { useState, type CSSProperties } from 'react';
import type { CharacterId, EventCard, PolicyId } from '../game/types.ts';

const base = () => import.meta.env.BASE_URL;

export type ArtSlug = 'savings' | 'medical' | 'accident' | 'critical' | 'income' | 'bills' | 'emergency-fund'
  | 'event-repair' | 'event-family' | 'event-income-shock' | 'event-home' | 'event-calm' | 'learning';
export type IconSlug = 'income' | 'protection' | 'growth' | 'savings' | 'event' | 'expense';

export const artUrl = (slug: ArtSlug) => `${base()}assets/art/${slug}.webp`;
export const iconUrl = (slug: IconSlug) => `${base()}assets/icons/${slug}.webp`;
export const characterFullUrl = (id: CharacterId) => `${base()}assets/characters/full/${id}.webp`;
export const sceneUrl = (slug: 'home-city' | 'results-plaza', small = false) => `${base()}assets/scenes/${slug}${small ? '-sm' : ''}.webp`;

export const POLICY_ART: Record<PolicyId, ArtSlug> = { medical: 'medical', accident: 'accident', critical: 'critical' };

/** Pedestal illustrations (transparent) vs. framed scenes (opaque, shown cover-cropped). */
export const CUTOUT_ART = new Set<ArtSlug>(['event-repair', 'event-family', 'event-income-shock', 'event-home', 'event-calm', 'learning']);

/** The artwork for a life event, chosen from the engine's own category (one specific override for moving out). */
export function eventArt(event: Pick<EventCard, 'id' | 'category'>): ArtSlug {
  if (event.id === 'moving-out') return 'event-home';
  switch (event.category) {
    case 'medical': case 'recovery': return 'medical';
    case 'accident': return 'accident';
    case 'critical-illness': return 'critical';
    case 'family': return 'event-family';
    case 'income': return 'event-income-shock';
    case 'repair': return 'event-repair';
    case 'calm': return 'event-calm';
  }
}

/**
 * Decorative card artwork. Hidden from assistive tech (the card's text carries the meaning); if a
 * file fails to load the frame simply shows its tinted backdrop instead of a broken-image icon.
 */
export function CardArt({ slug, className = '', style }: { slug: ArtSlug; className?: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false);
  return <span className={`card-art ${CUTOUT_ART.has(slug) ? 'card-art-cutout' : 'card-art-scene'} ${failed ? 'card-art-failed' : ''} ${className}`} style={style} aria-hidden="true">
    {!failed && <img src={artUrl(slug)} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)}/>}
  </span>;
}

export function CategoryIcon({ slug, size = 40, className = '' }: { slug: IconSlug; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img className={`category-icon ${className}`} src={iconUrl(slug)} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)}/>;
}
