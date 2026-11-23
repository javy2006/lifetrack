import { ArrowRight, BookOpen, Building2, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { CityScene } from '../components/CityScene.tsx';
import { AudioControls } from '../components/AudioControls.tsx';
import { Brand, Button, Disclaimer, Eyebrow } from '../components/ui.tsx';

export function MainMenu({ onPlay, onNew, onHowToPlay, onLearning, canResume }: { onPlay: () => void; onNew: () => void; onHowToPlay: () => void; onLearning: () => void; canResume: boolean }) {
  return <main className="landing-page">
    <header className="landing-nav"><Brand/><span className="nav-note"><ShieldCheck size={15}/> A financial life simulation</span><AudioControls/></header>
    <section className="hero-grid">
      <div className="hero-copy"><Eyebrow>YOUR MONEY. YOUR NEXT MOVE.</Eyebrow><h1>Make smart choices.<br/><span>Protect your tomorrow.</span></h1><p className="hero-lead">Six months. A few big decisions. One life that keeps moving. Build your financial resilience in a game made for real life in Malaysia.</p>
        <div className="hero-actions"><Button onClick={canResume?onPlay:onNew}>{canResume?'Continue saved game':'Play the game'} <ArrowRight size={17}/></Button>{canResume&&<Button variant="secondary" onClick={onNew}>Start a new game</Button>}</div>
        <div className="hero-links"><button onClick={onHowToPlay}><BookOpen size={16}/> How to play</button><button onClick={onLearning}><HeartHandshake size={16}/> Insurance learning</button></div><p className="hero-meta"><Sparkles size={15}/> A six-month challenge · About 8–12 minutes</p>
      </div>
      <div className="city-scene"><CityScene/><div className="scene-label label-cafe"><Building2 size={12}/> Kopi &amp; Co.</div><div className="scene-label label-clinic"><span className="clinic-plus">+</span> Care clinic</div><div className="scene-caption"><Building2 size={16}/> Kuala Lumpur · Your story starts here</div></div>
    </section>
    <section className="value-row"><div><span className="value-icon green"><Building2 size={18}/></span><p><b>Build a buffer</b><small>Learn how small savings grow into resilience.</small></p></div><div><span className="value-icon red"><ShieldCheck size={18}/></span><p><b>Choose your cover</b><small>Explore what fictional policies can and cannot do.</small></p></div><div><span className="value-icon blue"><Sparkles size={18}/></span><p><b>Learn as you go</b><small>Life events turn money concepts into decisions.</small></p></div></section>
    <footer className="landing-footer"><Disclaimer compact/><span>Designed for learning in Malaysia · RM currency</span></footer>
  </main>;
}

export function InfoModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="surface-card modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="Close dialog">×</button><Eyebrow>LIFETRACK GUIDE</Eyebrow><h2 id="modal-title">{title}</h2>{children}<Button onClick={onClose}>Got it</Button></section></div>;
}
