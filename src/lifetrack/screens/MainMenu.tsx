import { BookOpen, HeartHandshake, MonitorPlay, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { preloadBoard3D } from '../board3d/Board3DSlot.tsx';
import { CHARACTERS } from '../game/characters.ts';
import type { CharacterId } from '../game/types.ts';
import { CharacterPortrait } from '../components/CharacterPortrait.tsx';
import { CategoryIcon, characterFullUrl, sceneUrl } from '../components/art.tsx';
import { characterText } from '../i18n/content.ts';
import { AudioControls, useAudio } from '../components/AudioControls.tsx';
import { Brand, Button, Disclaimer, Eyebrow } from '../components/ui.tsx';
import { LanguageSelect, useI18n } from '../i18n/I18nProvider.tsx';

export function MainMenu({ onPlay, onNew, onHowToPlay, onLearning, onDemo, canResume }: { onPlay: () => void; onNew: () => void; onHowToPlay: () => void; onLearning: () => void; onDemo: () => void; canResume: boolean }) {
  const { t, content } = useI18n();
  const { startMusic } = useAudio();
  // Start fetching the 3D board while the player reads the menu, so the game opens straight onto it.
  useEffect(() => { const id = window.setTimeout(preloadBoard3D, 1200); return () => window.clearTimeout(id); }, []);
  const scene = { '--home-scene': `url(${sceneUrl('home-city')})`, '--home-scene-sm': `url(${sceneUrl('home-city', true)})` } as CSSProperties;
  return <main className="landing-page home-v2" style={scene}>
    <div className="home-backdrop" aria-hidden="true"/>
    <header className="landing-nav"><Brand light/><div className="nav-tools"><LanguageSelect/><AudioControls/></div></header>
    <section className="hero-grid home-hero">
      <div className="hero-copy home-copy">
        <Eyebrow>{t('menu.eyebrow')}</Eyebrow>
        <h1>{t('menu.title1')}<br/><span>{t('menu.title2')}</span></h1>
        <p className="hero-lead">{t('menu.lead')}</p>
        <div className="hero-actions"><Button className="home-play" onClick={()=>{startMusic();(canResume?onPlay:onNew)();}}><Play size={20} fill="currentColor"/> {canResume?t('menu.continueSaved'):t('menu.play')}</Button>{canResume&&<Button variant="secondary" onClick={onNew}>{t('menu.newGame')}</Button>}</div>
        <nav className="hero-links home-tiles" aria-label={t('menu.guide')}>
          <button onClick={onHowToPlay}><BookOpen size={18}/> {t('menu.howToPlay')}</button>
          <button onClick={onLearning}><HeartHandshake size={18}/> {t('menu.learning')}</button>
          <button onClick={onDemo} className="demo-link"><MonitorPlay size={18}/> {t('menu.demo')}</button>
        </nav>
        <p className="hero-meta"><Sparkles size={15}/> {t('menu.meta')}</p>
      </div>
      <ul className="home-cast" aria-label={t('menu.castAria')}>
        {CHARACTERS.map((ch, i) => { const c = characterText(ch.id, content); return <li key={ch.id} className={`cast-card cast-${ch.id}`} style={{ '--i': i } as CSSProperties}>
          <CastImage id={ch.id}/>
          <span className="cast-plate"><b>{c.name}</b><small>{c.occupation}</small></span>
        </li>; })}
      </ul>
    </section>
    <section className="value-row"><div><span className="value-icon green"><CategoryIcon slug="savings" size={40}/></span><p><b>{t('menu.value1')}</b><small>{t('menu.value1Text')}</small></p></div><div><span className="value-icon red"><CategoryIcon slug="protection" size={40}/></span><p><b>{t('menu.value2')}</b><small>{t('menu.value2Text')}</small></p></div><div><span className="value-icon blue"><CategoryIcon slug="growth" size={40}/></span><p><b>{t('menu.value3')}</b><small>{t('menu.value3Text')}</small></p></div></section>
    <footer className="landing-footer"><Disclaimer compact/><span><ShieldCheck size={14}/> {t('menu.footer')}</span></footer>
  </main>;
}

/** Full-body character art; falls back to the round portrait if the image is missing. */
function CastImage({ id }: { id: CharacterId }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="cast-fallback"><CharacterPortrait id={id} name="" size={96}/></span>
    : <img className="cast-img" src={characterFullUrl(id)} alt="" width={440} height={800} decoding="async" draggable={false} onError={() => setFailed(true)}/>;
}

export function InfoModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useI18n();
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="surface-card modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label={t('common.close')}>×</button><Eyebrow>{t('menu.guide')}</Eyebrow><h2 id="modal-title">{title}</h2>{children}<Button onClick={onClose}>{t('common.gotIt')}</Button></section></div>;
}
