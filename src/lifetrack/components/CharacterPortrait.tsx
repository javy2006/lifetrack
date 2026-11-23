import type { CharacterId } from '../game/types.ts';

/**
 * Official character imagery, cropped from the reference images by
 * scripts/assets/build_character_assets.py and served from public/assets/characters.
 */
export function characterAssetUrl(kind: 'portraits' | 'busts', id: CharacterId): string {
  return `${import.meta.env.BASE_URL}assets/characters/${kind}/${id}.webp`;
}

/** Round face portrait for the HUD, rosters and standings (192 px source, ~4 KB). */
export function CharacterPortrait({ id, name, size = 32, className = '' }: { id: CharacterId; name: string; size?: number; className?: string }) {
  return <img className={`character-portrait ${className}`} src={characterAssetUrl('portraits', id)} alt={name} width={size} height={size} decoding="async" draggable={false}/>;
}

/** Head-to-waist image of the official character for the selection cards. */
export function CharacterBust({ id, name, className = '' }: { id: CharacterId; name: string; className?: string }) {
  return <img className={`character-bust ${className}`} src={characterAssetUrl('busts', id)} alt={name} width={360} height={480} decoding="async" draggable={false}/>;
}
