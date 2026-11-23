import { ArrowLeft, ArrowRight, CalendarDays, Check, Compass, Shield, Wallet } from 'lucide-react';
import { GAME_CONFIG } from '../game/constants.ts';
import { formatRM } from '../game/format.ts';
import { useState } from 'react';
import { CHARACTERS } from '../game/characters.ts';
import { CharacterPortrait } from '../components/CharacterPortrait.tsx';
import { useAudio } from '../components/AudioControls.tsx';
import { Button, Card, Disclaimer, Eyebrow } from '../components/ui.tsx';

const colors = ['avatar-coral', 'avatar-lilac', 'avatar-blue', 'avatar-mint'];
const strategyIcons = [Wallet, Shield, Shield, Compass];

export function CharacterSelection({ onBack, onContinue }: { onBack: () => void; onContinue: (id: (typeof CHARACTERS)[number]['id']) => void }) {
  const [selected, setSelected] = useState<(typeof CHARACTERS)[number]['id'] | null>(null);
  const {playEffect}=useAudio();
  return <main className="setup-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back to home</button><div className="setup-heading"><Eyebrow>STEP 1 OF 2</Eyebrow><h1>Pick your player</h1><p>The other three play against you.</p></div><div className="character-grid">{CHARACTERS.map((c, i) => { const Icon = strategyIcons[i]; return <button className={`character-option ${selected === c.id ? 'selected' : ''}`} onClick={() => {setSelected(c.id);playEffect('select')}} aria-pressed={selected === c.id} key={c.id}><Card className="character-card"><div className={`character-art ${colors[i]}`}><div className="portrait-halo"/><CharacterPortrait id={c.id} name={`${c.name}, ${c.age}, ${c.occupation}`} size={124} className="character-card-art"/><span className="character-age">{c.age} years</span>{selected === c.id && <span className="selected-check"><Check size={16}/></span>}</div><div className="character-info"><div className="character-title-row"><h2>{c.name}</h2><span className="strategy-icon"><Icon size={15}/></span></div><p className="character-job">{c.occupation}</p><span className="character-role">{c.title}</span></div></Card></button>; })}</div><div className="selection-footer"><p/><Button disabled={!selected} onClick={() => selected && onContinue(selected)}>Continue <ArrowRight size={16}/></Button></div><Disclaimer compact/></main>;
}

export function GameIntroduction({ characterId, onBack, onBegin }: { characterId: (typeof CHARACTERS)[number]['id']; onBack: () => void; onBegin: () => void }) {
  const character = CHARACTERS.find((c) => c.id === characterId)!;
  const facts = [
    { icon: Wallet, big: formatRM(GAME_CONFIG.startingCash), small: 'to start' },
    { icon: CalendarDays, big: `${GAME_CONFIG.totalRounds} months`, small: `+${formatRM(GAME_CONFIG.monthlyIncome)} pay · −${formatRM(GAME_CONFIG.essentialExpenses)} bills` },
    { icon: Compass, big: `${GAME_CONFIG.actionPointsPerRound} moves`, small: 'a month: save, buy cover or pass' },
    { icon: Shield, big: 'Life events', small: 'hit all 4 players alike' },
  ];
  return <main className="setup-page intro-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Change player</button><div className="setup-heading"><Eyebrow>STEP 2 OF 2</Eyebrow><h1>Ready, {character.name}?</h1><p>Highest score after six months wins.</p></div><div className="intro-facts">{facts.map(({ icon: Icon, big, small }) => <Card className="intro-fact" key={big}><Icon size={20}/><b>{big}</b><small>{small}</small></Card>)}</div><div className="selection-footer"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back</button><Button onClick={onBegin}>Begin month one <ArrowRight size={16}/></Button></div><Disclaimer compact/></main>;
}
