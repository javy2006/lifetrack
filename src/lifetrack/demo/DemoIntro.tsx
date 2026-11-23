/**
 * Short presentation intro shown before the demo (about 6.5 s, skippable): LifeTrack branding over
 * the live miniature city (the homepage's HeroBoard, with its slow camera drift; static with
 * reduced motion), the four players with their professions, and a one-line description.
 * Only used by the presentation demo; normal games never show it.
 */
import { useEffect, useRef, useState } from 'react';
import { SkipForward } from 'lucide-react';
import { HeroBoard } from '../board3d/HeroBoard.tsx';
import { Brand } from '../components/ui.tsx';
import { CharacterPortrait } from '../components/CharacterPortrait.tsx';
import { CHARACTERS } from '../game/characters.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { characterText } from '../i18n/content.ts';

export const INTRO_MS = 6500;
const FADE_MS = 450;

export function DemoIntro({ onDone }: { onDone: () => void }) {
  const { t, content } = useI18n();
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true; setLeaving(true);
    window.setTimeout(onDone, FADE_MS);
  };
  useEffect(() => { const id = window.setTimeout(finish, INTRO_MS); return () => window.clearTimeout(id); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className={`demo-intro ${leaving ? 'is-leaving' : ''}`} aria-label={t('demo.title')}>
    <div className="demo-intro-scene"><HeroBoard/></div>
    <div className="demo-intro-copy">
      <div className="demo-intro-brand"><Brand/><span className="demo-badge">{t('demo.badge')}</span></div>
      <h1>{t('menu.title1')} <span>{t('menu.title2')}</span></h1>
      <p>{t('demo.introLead')}</p>
      <ul className="demo-intro-players">
        {CHARACTERS.map((c, i) => { const tx = characterText(c.id, content); return <li key={c.id} style={{ animationDelay: `${600 + i * 180}ms` }}><CharacterPortrait id={c.id} name={tx.name} size={40}/><span><b>{tx.name}</b><small>{tx.occupation}</small></span></li>; })}
      </ul>
    </div>
    <button type="button" className="demo-intro-skip" onClick={finish}>{t('demo.skipIntro')} <SkipForward size={16}/></button>
    <span className="demo-intro-progress" style={{ animationDuration: `${INTRO_MS}ms` }} aria-hidden="true"/>
  </section>;
}
