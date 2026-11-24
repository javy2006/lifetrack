import { ArrowRight, BookOpen, Building2, HeartHandshake, MonitorPlay, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { HeroBoard } from '../board3d/HeroBoard.tsx';
import { AudioControls, useAudio } from '../components/AudioControls.tsx';
import { Brand, Button, Disclaimer, Eyebrow } from '../components/ui.tsx';
import { LanguageSelect, useI18n } from '../i18n/I18nProvider.tsx';

export function MainMenu({ onPlay, onNew, onHowToPlay, onLearning, onDemo, canResume }: { onPlay: () => void; onNew: () => void; onHowToPlay: () => void; onLearning: () => void; onDemo: () => void; canResume: boolean }) {
  const { t } = useI18n();
  const { startMusic } = useAudio();
  return <main className="landing-page">
    <header className="landing-nav"><Brand/><span className="nav-note"><ShieldCheck size={15}/> {t('menu.navNote')}</span><div className="nav-tools"><LanguageSelect/><AudioControls/></div></header>
    <section className="hero-grid">
      <div className="hero-copy"><Eyebrow>{t('menu.eyebrow')}</Eyebrow><h1>{t('menu.title1')}<br/><span>{t('menu.title2')}</span></h1><p className="hero-lead">{t('menu.lead')}</p>
        <div className="hero-actions"><Button onClick={()=>{startMusic();(canResume?onPlay:onNew)();}}>{canResume?t('menu.continueSaved'):t('menu.play')} <ArrowRight size={17}/></Button>{canResume&&<Button variant="secondary" onClick={onNew}>{t('menu.newGame')}</Button>}</div>
        <div className="hero-links"><button onClick={onHowToPlay}><BookOpen size={16}/> {t('menu.howToPlay')}</button><button onClick={onLearning}><HeartHandshake size={16}/> {t('menu.learning')}</button><button onClick={onDemo} className="demo-link"><MonitorPlay size={16}/> {t('menu.demo')}</button></div><p className="hero-meta"><Sparkles size={15}/> {t('menu.meta')}</p>
      </div>
      <div className="city-scene hero-board-frame"><HeroBoard/><div className="scene-caption"><Building2 size={16}/> {t('menu.cityCaption')}</div></div>
    </section>
    <section className="value-row"><div><span className="value-icon green"><Building2 size={18}/></span><p><b>{t('menu.value1')}</b><small>{t('menu.value1Text')}</small></p></div><div><span className="value-icon red"><ShieldCheck size={18}/></span><p><b>{t('menu.value2')}</b><small>{t('menu.value2Text')}</small></p></div><div><span className="value-icon blue"><Sparkles size={18}/></span><p><b>{t('menu.value3')}</b><small>{t('menu.value3Text')}</small></p></div></section>
    <footer className="landing-footer"><Disclaimer compact/><span>{t('menu.footer')}</span></footer>
  </main>;
}

export function InfoModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useI18n();
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="surface-card modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label={t('common.close')}>×</button><Eyebrow>{t('menu.guide')}</Eyebrow><h2 id="modal-title">{title}</h2>{children}<Button onClick={onClose}>{t('common.gotIt')}</Button></section></div>;
}
