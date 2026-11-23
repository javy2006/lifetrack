/**
 * Minimal i18n core (no dependencies): nested dictionaries, `{var}` interpolation, plural keys
 * (`key_one` / `key_other` via Intl.PluralRules) and an English fallback for any missing key.
 * Money is always formatted by the engine's own formatRM, so every language shows identical
 * figures in Malaysian Ringgit.
 */
export type Lang = 'en' | 'ms' | 'zh' | 'ta';
export const LANGS: readonly { id: Lang; label: string; htmlLang: string }[] = [
  { id: 'en', label: 'English', htmlLang: 'en-MY' },
  { id: 'ms', label: 'Bahasa Melayu', htmlLang: 'ms-MY' },
  { id: 'zh', label: '简体中文', htmlLang: 'zh-Hans-MY' },
  { id: 'ta', label: 'தமிழ்', htmlLang: 'ta-MY' },
];
export const LANG_STORAGE_KEY = 'lifetrack.lang.v1';

export type Dict = { [key: string]: string | Dict };
export type Vars = Record<string, string | number>;

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'ms' || value === 'zh' || value === 'ta';
}

export function readLang(storage: Pick<Storage, 'getItem'> | null, search = ''): Lang {
  try { const q = new URLSearchParams(search).get('lang'); if (isLang(q)) return q; } catch { /* ignore */ }
  try { const s = storage?.getItem(LANG_STORAGE_KEY); if (isLang(s)) return s; } catch { /* storage may be blocked */ }
  return 'en';
}

export function lookup(dict: Dict | undefined, key: string): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (!node || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/**
 * Translates `key` using `dict`, falling back to `fallback` (English) and finally to the key.
 * With a numeric `count`, `key_one` / `key_other` (etc.) are tried first.
 */
export function translate(lang: Lang, dict: Dict | undefined, fallback: Dict, key: string, vars?: Vars): string {
  const candidates: string[] = [];
  if (vars && typeof vars.count === 'number') {
    let category = 'other';
    try { category = new Intl.PluralRules(lang).select(vars.count); } catch { /* keep "other" */ }
    candidates.push(`${key}_${category}`, `${key}_other`);
  }
  candidates.push(key);
  for (const k of candidates) { const v = lookup(dict, k); if (v !== undefined) return interpolate(v, vars); }
  for (const k of candidates) { const v = lookup(fallback, k); if (v !== undefined) return interpolate(v, vars); }
  return key;
}

/** Every leaf key of a dictionary (for completeness tests). */
export function leafKeys(dict: Dict, prefix = ''): string[] {
  return Object.entries(dict).flatMap(([k, v]) => typeof v === 'string' ? [`${prefix}${k}`] : leafKeys(v, `${prefix}${k}.`));
}
