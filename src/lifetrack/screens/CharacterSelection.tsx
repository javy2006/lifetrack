import { ArrowLeft, ArrowRight, CalendarDays, Check, Compass, Shield, Wallet } from 'lucide-react';
import { GAME_CONFIG } from '../game/constants.ts';
import { formatRM } from '../game/format.ts';
import { useState } from 'react';
import { CHARACTERS } from '../game/characters.ts';
import { CharacterPortrait } from '../components/CharacterPortrait.tsx';
import { useAudio } from '../components/AudioControls.tsx';
import { Button, Card, Disclaimer, Eyebrow } from '../components/ui.tsx';
import { LanguageSelect, useI18n } from '../i18n/I18nProvider.tsx';
import { characterText } from '../i18n/content.ts';

const colors = ['avatar-coral', 'avatar-lilac', 'avatar-blue', 'avatar-mint'];
const strategyIcons = [Wallet, Shield, Shield, Compass];

export function CharacterSelection({ onBack, onContinue }: { onBack: () => void; onContinue: (id: (typeof CHARACTERS)[number]['id']) => void }) {
  const [selected, setSelected] = useState<(typeof CHARACTERS)[number]['id'] | null>(null);
  const {playEffect}=useAudio();
  const { t, content } = useI18n();
  return <main className="setup-page"><div className="setup-topbar"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> {t('select.backHome')}</button><LanguageSelect/></div><div className="setup-heading"><Eyebrow>{t('select.step1')}</Eyebrow><h1>{t('select.title')}</h1><p>{t('select.subtitle')}</p></div><div className="character-grid">{CHARACTERS.map((ch, i) => { const Icon = strategyIcons[i]; const c = { ...ch, ...characterText(ch.id, content) }; return <button className={`character-option ${selected === c.id ? 'selected' : ''}`} onClick={() => {setSelected(c.id);playEffect('select')}} aria-pressed={selected === c.id} key={c.id}><Card className="character-card"><div className={`character-art ${colors[i]}`}><div className="portrait-halo"/><CharacterPortrait id={c.id} name={`${c.name}, ${c.age}, ${c.occupation}`} size={124} className="character-card-art"/><span className="character-age">{t('select.years', { n: c.age })}</span>{selected === c.id && <span className="selected-check"><Check size={16}/></span>}</div><div className="character-info"><div className="character-title-row"><h2>{c.name}</h2><span className="strategy-icon"><Icon size={15}/></span></div><p className="character-job">{c.occupation}</p><span className="character-role">{c.title}</span></div></Card></button>; })}</div><div className="selection-footer"><p/><Button disabled={!selected} onClick={() => selected && onContinue(selected)}>{t('select.continue')} <ArrowRight size={16}/></Button></div><Disclaimer compact/></main>;
}

export function GameIntroduction({ characterId, onBack, onBegin }: { characterId: (typeof CHARACTERS)[number]['id']; onBack: () => void; onBegin: () => void }) {
  const character = CHARACTERS.find((c) => c.id === characterId)!;
  const { t } = useI18n();
  const facts = [
    { icon: Wallet, big: formatRM(GAME_CONFIG.startingCash), small: t('intro.toStart') },
    { icon: CalendarDays, big: t('intro.months', { n: GAME_CONFIG.totalRounds }), small: t('intro.payBills', { pay: formatRM(GAME_CONFIG.monthlyIncome), bills: formatRM(GAME_CONFIG.essentialExpenses) }) },
    { icon: Compass, big: t('intro.moves', { n: GAME_CONFIG.actionPointsPerRound }), small: t('intro.movesText') },
    { icon: Shield, big: t('intro.events'), small: t('intro.eventsText') },
  ];
  return <main className="setup-page intro-page"><div className="setup-topbar"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> {t('intro.changePlayer')}</button><LanguageSelect/></div><div className="setup-heading"><Eyebrow>{t('intro.step2')}</Eyebrow><h1>{t('intro.ready', { name: character.name })}</h1><p>{t('intro.goal')}</p></div><div className="intro-facts">{facts.map(({ icon: Icon, big, small }) => <Card className="intro-fact" key={big}><Icon size={20}/><b>{big}</b><small>{small}</small></Card>)}</div><div className="selection-footer"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> {t('common.back')}</button><Button onClick={onBegin}>{t('intro.begin')} <ArrowRight size={16}/></Button></div><Disclaimer compact/></main>;
}
