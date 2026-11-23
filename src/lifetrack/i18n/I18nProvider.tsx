/**
 * Language state for the whole app. The choice is stored under its own key (never in the game
 * save), so switching language never touches game progress; it persists across refreshes, new
 * games and resumed games. Non-English packs are loaded on demand to keep the main bundle small.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Languages } from 'lucide-react';
import en from './en.ts';
import { LANGS, LANG_STORAGE_KEY, readLang, translate, type Dict, type Lang, type Vars } from './core.ts';
import type { ContentOverlay } from './content.ts';

export interface LanguagePack { ui: Dict; content: ContentOverlay }
const loaders: Record<Exclude<Lang, 'en'>, () => Promise<{ default: LanguagePack }>> = {
  ms: () => import('./ms.ts'),
  zh: () => import('./zh.ts'),
  ta: () => import('./ta.ts'),
};

interface I18nValue { lang: Lang; setLang: (lang: Lang) => void; t: (key: string, vars?: Vars) => string; content: ContentOverlay | null; ready: boolean }
const I18nContext = createContext<I18nValue | null>(null);
const EN = en as unknown as Dict;

function storage(): Storage | null { try { return window.localStorage; } catch { return null; } }

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readLang(storage(), typeof location !== 'undefined' ? location.search : ''));
  const [pack, setPack] = useState<LanguagePack | null>(null);
  useEffect(() => {
    document.documentElement.lang = LANGS.find((l) => l.id === lang)?.htmlLang ?? 'en';
    if (lang === 'en') { setPack(null); return; }
    let live = true;
    loaders[lang]().then((m) => { if (live) setPack(m.default); }).catch((error: unknown) => { console.warn(`LifeTrack: the ${lang} language pack failed to load; showing English.`, error); });
    return () => { live = false; };
  }, [lang]);
  const setLang = useCallback((next: Lang) => {
    try { storage()?.setItem(LANG_STORAGE_KEY, next); } catch { /* preference is optional */ }
    setLangState(next);
  }, []);
  const ready = lang === 'en' || pack !== null;
  const t = useCallback((key: string, vars?: Vars) => translate(lang, lang === 'en' ? undefined : pack?.ui, EN, key, vars), [lang, pack]);
  const value = useMemo<I18nValue>(() => ({ lang, setLang, t, content: lang === 'en' ? null : pack?.content ?? null, ready }), [lang, setLang, t, pack, ready]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useI18n must be used inside I18nProvider');
  return v;
}

/** Compact language selector (native select: keyboard and screen-reader friendly). */
/** `short`: option text is the short code (EN, BM, 中文, தமிழ்), for tight bars; the full name stays in the tooltip/label. */
export function LanguageSelect({ className = '', short = false }: { className?: string; short?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return <label className={`language-select ${className}`} title={t('lang.label')}>
    <Languages size={15} aria-hidden="true"/>
    <span className="sr-only">{t('lang.label')}</span>
    <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t('lang.label')}>
      {LANGS.map((l) => <option key={l.id} value={l.id} lang={l.htmlLang} title={l.label}>{short ? l.short : l.label}</option>)}
    </select>
  </label>;
}
