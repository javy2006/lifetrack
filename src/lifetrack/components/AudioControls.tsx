import { useI18n } from '../i18n/I18nProvider.tsx';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { playSample, playSynth, type SynthId } from './synthSounds.ts';

export type SoundId = 'click'|'select'|'purchase'|'coins'|'event'|'claim'|'quiz-correct'|'quiz-wrong'|'month'|'winner'|SynthId;
const SYNTH:ReadonlySet<SoundId>=new Set<SoundId>(['dice','step','land']);
type AudioPrefs = { enabled: boolean; musicVolume: number; effectsVolume: number };
type AudioApi = AudioPrefs & { setEnabled: (enabled:boolean)=>void; setMusicVolume:(value:number)=>void; setEffectsVolume:(value:number)=>void; playEffect:(id:SoundId)=>void };
// v2: subtle effects are on by default and background music is off. v1 had saved "off" for every visitor.
const PREFS_KEY='lifetrack.audio.v2';
const defaults:AudioPrefs={enabled:true,musicVolume:0,effectsVolume:.35};
const audioUrl=(name:string)=>`${import.meta.env.BASE_URL}audio/${name}.wav`;
/** True once the page has had a real user gesture (browsers block audio before that). */
function userHasInteracted(){try{const ua=(navigator as Navigator&{userActivation?:{hasBeenActive:boolean}}).userActivation;return ua?ua.hasBeenActive:true;}catch{return true;}}
/** Throttle per sound and cap simultaneous sounds so effects never pile up. */
const MIN_GAP_MS:Partial<Record<SoundId,number>>={click:90,step:60};
const MAX_ACTIVE=4;
const AudioContext=createContext<AudioApi|null>(null);

function readPrefs():AudioPrefs {
  try { const parsed=JSON.parse(localStorage.getItem(PREFS_KEY)??'null') as Partial<AudioPrefs>|null; return parsed?{enabled:parsed.enabled===true,musicVolume:clamp(parsed.musicVolume,defaults.musicVolume),effectsVolume:clamp(parsed.effectsVolume,defaults.effectsVolume)}:defaults; }
  catch { return defaults; }
}
function clamp(value:number|undefined,fallback:number){return typeof value==='number'&&Number.isFinite(value)?Math.min(1,Math.max(0,value)):fallback;}

export function AudioProvider({children}:{children:ReactNode}) {
  const [prefs,setPrefs]=useState<AudioPrefs>(readPrefs);
  const music=useRef<HTMLAudioElement|null>(null);
  const fadeTimer=useRef<number|undefined>(undefined);
  useEffect(()=>{try{localStorage.setItem(PREFS_KEY,JSON.stringify(prefs));}catch{/* Audio preferences are optional. */}},[prefs]);
  useEffect(()=>()=>{window.clearInterval(fadeTimer.current);music.current?.pause();music.current=null;},[]);
  useEffect(()=>{
    // The 0.5 MB ambience track is only created once music is switched on.
    if(!music.current&&prefs.enabled&&prefs.musicVolume>0){const t=new Audio(audioUrl('lifetrack-ambience'));t.loop=true;t.volume=0;music.current=t;}
    const track=music.current;if(!track)return;
    window.clearInterval(fadeTimer.current);
    if(prefs.enabled&&prefs.musicVolume>0){
      if(userHasInteracted())void track.play().catch(()=>{});
      fadeTimer.current=window.setInterval(()=>{if(!music.current)return;const next=Math.min(prefs.musicVolume,track.volume+.035);track.volume=next;if(next>=prefs.musicVolume)window.clearInterval(fadeTimer.current);},45);
    } else {
      fadeTimer.current=window.setInterval(()=>{if(!music.current)return;const next=Math.max(0,track.volume-.04);track.volume=next;if(next<=0){track.pause();window.clearInterval(fadeTimer.current);}},45);
    }
  },[prefs.enabled,prefs.musicVolume]);
  const setEnabled=useCallback((enabled:boolean)=>setPrefs(p=>({...p,enabled})),[]);
  const setMusicVolume=useCallback((musicVolume:number)=>setPrefs(p=>({...p,musicVolume})),[]);
  const setEffectsVolume=useCallback((effectsVolume:number)=>setPrefs(p=>({...p,effectsVolume})),[]);
  const lastPlayed=useRef<Partial<Record<SoundId,number>>>({});
  const active=useRef(0);
  const playEffect=useCallback((id:SoundId)=>{
    if(!prefs.enabled||prefs.effectsVolume<=0||!userHasInteracted())return;
    const now=performance.now(),gap=MIN_GAP_MS[id]??120;
    if(now-(lastPlayed.current[id]??-Infinity)<gap||active.current>=MAX_ACTIVE)return;
    lastPlayed.current[id]=now;
    if(SYNTH.has(id)){playSynth(id as SynthId,prefs.effectsVolume);return;}
    active.current++;window.setTimeout(()=>{active.current=Math.max(0,active.current-1);},700);
    playSample(audioUrl(id),prefs.effectsVolume);
  },[prefs.enabled,prefs.effectsVolume]);
  const handleClick=useCallback((event:React.MouseEvent<HTMLDivElement>)=>{const target=event.target;if(target instanceof Element&&target.closest('button,[role="button"],summary'))playEffect('click');},[playEffect]);
  const value=useMemo(()=>({...prefs,setEnabled,setMusicVolume,setEffectsVolume,playEffect}),[prefs,setEnabled,setMusicVolume,setEffectsVolume,playEffect]);
  return <AudioContext.Provider value={value}><div className="audio-root" onClickCapture={handleClick}>{children}</div></AudioContext.Provider>;
}

export function useAudio(){const value=useContext(AudioContext);if(!value)throw new Error('useAudio must be used inside AudioProvider');return value;}

export function AudioControls(){
  const { t } = useI18n();
  const {enabled,musicVolume,effectsVolume,setEnabled,setMusicVolume,setEffectsVolume}=useAudio();
  const onRange=(setter:(n:number)=>void)=>(event:ChangeEvent<HTMLInputElement>)=>setter(Number(event.target.value)/100);
  return <div className="audio-controls">
    <button type="button" className="audio-toggle" aria-pressed={enabled} onClick={()=>setEnabled(!enabled)} title={enabled?t('audio.mute'):t('audio.turnOn')}>{enabled?<Volume2 size={16}/>:<VolumeX size={16}/>}<span>{enabled?t('audio.on'):t('audio.muted')}</span></button>
    <details className="audio-settings"><summary aria-label={t('audio.settings')} title={t('audio.settings')}><SlidersHorizontal size={14}/></summary><div className="audio-panel"><div className="audio-heading"><b>{t('audio.settings')}</b></div><label className="audio-range">{t('audio.music')} <span>{Math.round(musicVolume*100)}%</span><input aria-label={t('audio.music')} type="range" min="0" max="100" value={Math.round(musicVolume*100)} onChange={onRange(setMusicVolume)} disabled={!enabled}/></label><label className="audio-range">{t('audio.effects')} <span>{Math.round(effectsVolume*100)}%</span><input aria-label={t('audio.effects')} type="range" min="0" max="100" value={Math.round(effectsVolume*100)} onChange={onRange(setEffectsVolume)} disabled={!enabled}/></label><small>{t('audio.note')}</small></div></details>
  </div>;
}
