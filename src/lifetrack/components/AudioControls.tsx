import { useI18n } from '../i18n/I18nProvider.tsx';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Music, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { playSample, playSynth, preloadSamples, type SynthId } from './synthSounds.ts';
import { MusicPlayer, type MusicState } from './MusicPlayer.ts';
import { DEFAULT_PREFS, PREFS_KEY, readPrefs, type AudioPrefs } from './audioPrefs.ts';

/**
 * Sound set: natural tabletop sounds (dice, wooden token, cards, coins) and short pizzicato jingles
 * from Kenney's CC0 packs, plus the background music, all stored locally in public/audio as MP3s
 * (see docs/AUDIO_CREDITS.md). Ids with several files pick one at random for natural variation.
 * dice/step/land fall back to Web Audio synthesis if their files cannot be loaded.
 */
export type SoundId = 'click'|'select'|'purchase'|'save'|'confirm'|'card'|'coins'|'pay'|'event'|'claim'|'warning'|'quiz-correct'|'quiz-wrong'|'month'|'winner'|'results'|'dice-land'|'land-key'|SynthId;
const FILES:Record<SoundId,readonly string[]>={
  click:['click'],select:['select-1','select-2','select-3'],purchase:['purchase'],save:['save-1','save-2'],confirm:['confirm'],card:['card-1','card-2','card-3'],
  coins:['coins-1','coins-2'],pay:['pay'],event:['event'],claim:['claim'],warning:['warning'],'quiz-correct':['quiz-correct'],'quiz-wrong':['quiz-wrong'],
  month:['month'],winner:['winner'],results:['results'],'dice-land':['dice-land-1','dice-land-2','dice-land-3'],dice:['dice-shake-1','dice-shake-2','dice-shake-3'],
  step:['step-1','step-2','step-3','step-4'],land:['land-1','land-2'],'land-key':['land-key'],
};
const SYNTH:ReadonlySet<SoundId>=new Set<SoundId>(['dice','step','land']);
/** Jingles: the music dips briefly under them. */
const JINGLES:ReadonlySet<SoundId>=new Set<SoundId>(['claim','month','winner','results','quiz-correct','quiz-wrong']);
/** Decoded right after the first user gesture so the dice and board sounds play without delay. */
const ESSENTIAL:SoundId[]=['click','select','dice','dice-land','step','land','coins','card','confirm'];

type AudioApi = AudioPrefs & { musicState: MusicState; setEnabled: (enabled:boolean)=>void; setMusicOn:(on:boolean)=>void; setEffectsOn:(on:boolean)=>void; setMusicVolume:(value:number)=>void; setEffectsVolume:(value:number)=>void; playEffect:(id:SoundId)=>void };
/** Music sits a little under the effects at equal slider settings. */
const MUSIC_MIX=0.8;
const audioUrl=(name:string)=>`${import.meta.env.BASE_URL}audio/${name}.mp3`;
/** True once the page has had a real user gesture (browsers block audio before that). */
function userHasInteracted(){try{const ua=(navigator as Navigator&{userActivation?:{hasBeenActive:boolean}}).userActivation;return ua?ua.hasBeenActive:true;}catch{return true;}}
/** Throttle per sound and cap simultaneous sounds so effects never pile up. */
const MIN_GAP_MS:Partial<Record<SoundId,number>>={click:90,step:70,select:60};
const MAX_ACTIVE=4;
const AudioContext=createContext<AudioApi|null>(null);

function loadPrefs(){try{return readPrefs(localStorage.getItem(PREFS_KEY));}catch{return DEFAULT_PREFS;}}

export function AudioProvider({children}:{children:ReactNode}) {
  const [prefs,setPrefs]=useState<AudioPrefs>(loadPrefs);
  const [musicState,setMusicState]=useState<MusicState>('off');
  const music=useRef<MusicPlayer|null>(null);
  // Default track: "Cheery Monday" (loop point 65.88 s). "Sunshine" (music-sunshine.mp3, loop 163.63 s) is kept as a backup and not played.
  if(!music.current){music.current=new MusicPlayer(audioUrl('music-cheery-monday'),65.88);}
  useEffect(()=>{music.current!.onState=setMusicState;(window as Window&{__lifetrackMusic?:MusicPlayer}).__lifetrackMusic=music.current!;},[]);
  // Preferences persist only once the player changes them (defaults stay defaults until then).
  const changed=useRef(false);
  useEffect(()=>{if(!changed.current)return;try{localStorage.setItem(PREFS_KEY,JSON.stringify(prefs));}catch{/* optional */}},[prefs]);
  const update=useCallback((patch:Partial<AudioPrefs>)=>{changed.current=true;setPrefs(p=>({...p,...patch}));},[]);
  const musicLevel=prefs.enabled&&prefs.musicOn?prefs.musicVolume*MUSIC_MIX:0;
  const effectsLevel=prefs.enabled&&prefs.effectsOn?prefs.effectsVolume:0;
  useEffect(()=>{const m=music.current!;m.setLevel(musicLevel);if(musicLevel>0&&userHasInteracted())m.start();},[musicLevel]);
  // First (and any later) user gesture starts the music if it is wanted but not yet playing; a blocked attempt retries on the next gesture.
  useEffect(()=>{
    const onGesture=()=>{const m=music.current!;if(m.state!=='playing')m.start();};
    const onVisibility=()=>music.current!.setHidden(document.visibilityState==='hidden');
    window.addEventListener('pointerdown',onGesture,true);window.addEventListener('keydown',onGesture,true);document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.removeEventListener('pointerdown',onGesture,true);window.removeEventListener('keydown',onGesture,true);document.removeEventListener('visibilitychange',onVisibility);music.current?.setLevel(0);};
  },[]);
  const lastPlayed=useRef<Partial<Record<SoundId,number>>>({});
  const active=useRef(0);
  const playEffect=useCallback((id:SoundId)=>{
    if(effectsLevel<=0||!userHasInteracted())return;
    const now=performance.now(),gap=MIN_GAP_MS[id]??120;
    if(now-(lastPlayed.current[id]??-Infinity)<gap||active.current>=MAX_ACTIVE)return;
    lastPlayed.current[id]=now;
    if(JINGLES.has(id))music.current?.duck(1400);
    const files=FILES[id],file=files[Math.floor(Math.random()*files.length)]!;
    active.current++;window.setTimeout(()=>{active.current=Math.max(0,active.current-1);},id==='step'?250:600);
    void playSample(audioUrl(file),effectsLevel).then((played)=>{if(!played&&SYNTH.has(id))playSynth(id as SynthId,effectsLevel);});
  },[effectsLevel]);
  // Generic click for buttons; controls with their own sound (picks, dice, answers) skip it so sounds never double up.
  const handleClick=useCallback((event:React.MouseEvent<HTMLDivElement>)=>{const target=event.target;if(target instanceof Element&&target.closest('button,[role="button"],summary')&&!target.closest('[data-sound]'))playEffect('click');},[playEffect]);
  const preloaded=useRef(false);
  const warm=useCallback(()=>{if(preloaded.current||effectsLevel<=0)return;preloaded.current=true;preloadSamples(ESSENTIAL.flatMap(id=>FILES[id]).map(audioUrl));},[effectsLevel]);
  const value=useMemo<AudioApi>(()=>({...prefs,musicState,
    setEnabled:(enabled)=>update({enabled}),setMusicOn:(musicOn)=>update({musicOn}),setEffectsOn:(effectsOn)=>update({effectsOn}),
    setMusicVolume:(musicVolume)=>update({musicVolume}),setEffectsVolume:(effectsVolume)=>update({effectsVolume}),playEffect}),[prefs,musicState,update,playEffect]);
  return <AudioContext.Provider value={value}><div className="audio-root" onClickCapture={handleClick} onPointerDownCapture={warm} onKeyDownCapture={warm}>{children}</div></AudioContext.Provider>;
}

export function useAudio(){const value=useContext(AudioContext);if(!value)throw new Error('useAudio must be used inside AudioProvider');return value;}

export function AudioControls(){
  const { t } = useI18n();
  const a=useAudio();
  const onRange=(setter:(n:number)=>void)=>(event:ChangeEvent<HTMLInputElement>)=>setter(Number(event.target.value)/100);
  const waiting=a.enabled&&a.musicOn&&a.musicState==='waiting';
  return <div className="audio-controls">
    <button type="button" className={`audio-toggle ${waiting?'is-waiting':''}`} aria-pressed={a.enabled} onClick={()=>a.setEnabled(!a.enabled)} title={a.enabled?(waiting?t('audio.blocked'):t('audio.mute')):t('audio.turnOn')}>{a.enabled?<Volume2 size={16}/>:<VolumeX size={16}/>}<span>{a.enabled?t('audio.on'):t('audio.muted')}</span>{a.enabled&&a.musicOn&&<Music size={12} className={`audio-music-dot ${a.musicState==='playing'?'is-playing':''}`} aria-hidden="true"/>}</button>
    <details className="audio-settings"><summary aria-label={t('audio.settings')} title={t('audio.settings')}><SlidersHorizontal size={14}/></summary><div className="audio-panel">
      <div className="audio-heading"><b>{t('audio.settings')}</b></div>
      <label className="audio-switch"><input type="checkbox" checked={a.musicOn} onChange={(e)=>a.setMusicOn(e.target.checked)} disabled={!a.enabled}/>{t('audio.music')}<span>{Math.round(a.musicVolume*100)}%</span></label>
      <input className="audio-slider" aria-label={t('audio.music')} type="range" min="0" max="100" value={Math.round(a.musicVolume*100)} onChange={onRange(a.setMusicVolume)} disabled={!a.enabled||!a.musicOn}/>
      <label className="audio-switch"><input type="checkbox" checked={a.effectsOn} onChange={(e)=>a.setEffectsOn(e.target.checked)} disabled={!a.enabled}/>{t('audio.effects')}<span>{Math.round(a.effectsVolume*100)}%</span></label>
      <input className="audio-slider" aria-label={t('audio.effects')} type="range" min="0" max="100" value={Math.round(a.effectsVolume*100)} onChange={onRange(a.setEffectsVolume)} disabled={!a.enabled||!a.effectsOn}/>
      {waiting&&<small className="audio-waiting">{t('audio.blocked')}</small>}
      <small>{t('audio.note')}</small>
      <small className="audio-credit">{t('audio.credit',{credit:'“Cheery Monday”, Kevin MacLeod (incompetech.com), CC BY 4.0'})}</small>
    </div></details>
  </div>;
}
