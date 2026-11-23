import { useState } from 'react';
import type { CharacterId } from '../game/types.ts';

/**
 * Official character portraits: face-centred crops of the reference images, built by
 * scripts/assets/build_character_assets.py into public/assets/characters/portraits and served
 * relative to Vite's base URL (never an absolute file path). They are stored as plain git blobs,
 * not LFS pointers (see public/.gitattributes), so deployments serve the real images.
 */
export function characterPortraitUrl(id: CharacterId): string {
  return `${import.meta.env.BASE_URL}assets/characters/portraits/${id}.webp`;
}

const FALLBACK_TONE: Record<CharacterId, string> = { alex: '#27324f', meiling: '#6f8a6f', daniel: '#c9a01e', aisyah: '#c8554b' };

/**
 * Round face portrait (object-fit: cover). If the image genuinely fails to load, it shows the
 * character's initial on their colour instead of a broken-image icon, keeps the name as the
 * accessible label and logs which file failed, rather than hiding the problem.
 */
export function CharacterPortrait({ id, name, size = 32, className = '' }: { id: CharacterId; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={`character-portrait character-portrait-fallback ${className}`} role="img" aria-label={name} style={{ width: size, height: size, background: FALLBACK_TONE[id], fontSize: Math.max(10, size * 0.42) }}>{name.trim().charAt(0)}</span>;
  return <img className={`character-portrait ${className}`} src={characterPortraitUrl(id)} alt={name} width={size} height={size} decoding="async" draggable={false}
    onError={() => { console.warn(`LifeTrack: character portrait failed to load: ${characterPortraitUrl(id)}`); setFailed(true); }}/>;
}
