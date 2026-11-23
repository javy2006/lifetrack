import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export type SoundId = 'click'|'select'|'purchase'|'coins'|'event'|'claim'|'quiz-correct'|'quiz-wrong'|'month'|'winner';
type AudioPrefs = { enabled: boolean; musicVolume: number; effectsVolume: number };
type AudioApi = AudioPrefs & { setEnabled: (enabled:boolean)=>void; setMusicVolume:(value:number)=>void; setEffectsVolume:(value:number)=>void; playEffect:(id:SoundId)=>void };
const PREFS_KEY='lifetrack.audio.v1';
const defaults:AudioPrefs={enabled:false,musicVolume:.22,effectsVolume:.42};
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
  useEffect(()=>{
    const track=new Audio('/audio/lifetrack-ambience.wav');track.loop=true;track.volume=0;music.current=track;
    return()=>{window.clearInterval(fadeTimer.current);track.pause();music.current=null;};
  },[]);
  useEffect(()=>{
    const track=music.current;if(!track)return;
    window.clearInterval(fadeTimer.current);
    if(prefs.enabled&&prefs.musicVolume>0){
      void track.play().catch(()=>{});
      fadeTimer.current=window.setInterval(()=>{if(!music.current)return;const next=Math.min(prefs.musicVolume,track.volume+.035);track.volume=next;if(next>=prefs.musicVolume)window.clearInterval(fadeTimer.current);},45);
    } else {
      fadeTimer.current=window.setInterval(()=>{if(!music.current)return;const next=Math.max(0,track.volume-.04);track.volume=next;if(next<=0){track.pause();window.clearInterval(fadeTimer.current);}},45);
    }
  },[prefs.enabled,prefs.musicVolume]);
  const setEnabled=useCallback((enabled:boolean)=>setPrefs(p=>({...p,enabled})),[]);
  const setMusicVolume=useCallback((musicVolume:number)=>setPrefs(p=>({...p,musicVolume})),[]);
  const setEffectsVolume=useCallback((effectsVolume:number)=>setPrefs(p=>({...p,effectsVolume})),[]);
  const playEffect=useCallback((id:SoundId)=>{if(!prefs.enabled||prefs.effectsVolume<=0)return;const audio=new Audio(`/audio/${id}.wav`);audio.volume=prefs.effectsVolume;void audio.play().catch(()=>{});},[prefs.enabled,prefs.effectsVolume]);
  const handleClick=useCallback((event:React.MouseEvent<HTMLDivElement>)=>{const target=event.target;if(target instanceof Element&&target.closest('button,[role="button"],summary'))playEffect('click');},[playEffect]);
  const value=useMemo(()=>({...prefs,setEnabled,setMusicVolume,setEffectsVolume,playEffect}),[prefs,setEnabled,setMusicVolume,setEffectsVolume,playEffect]);
  return <AudioContext.Provider value={value}><div className="audio-root" onClickCapture={handleClick}>{children}</div></AudioContext.Provider>;
}

export function useAudio(){const value=useContext(AudioContext);if(!value)throw new Error('useAudio must be used inside AudioProvider');return value;}

export function AudioControls(){
  const {enabled,musicVolume,effectsVolume,setEnabled,setMusicVolume,setEffectsVolume}=useAudio();
  const onRange=(setter:(n:number)=>void)=>(event:ChangeEvent<HTMLInputElement>)=>setter(Number(event.target.value)/100);
  return <details className="audio-settings"><summary aria-label="Sound settings" title="Sound settings">{enabled?<Volume2 size={16}/>:<VolumeX size={16}/>}<span>{enabled?'Sound on':'Sound off'}</span></summary><div className="audio-panel"><div className="audio-heading"><b>Sound settings</b><label className="sound-toggle"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/><span>{enabled?'On':'Off'}</span></label></div><label className="audio-range">Music volume <span>{Math.round(musicVolume*100)}%</span><input aria-label="Music volume" type="range" min="0" max="100" value={Math.round(musicVolume*100)} onChange={onRange(setMusicVolume)} disabled={!enabled}/></label><label className="audio-range">Sound effects <span>{Math.round(effectsVolume*100)}%</span><input aria-label="Sound effects volume" type="range" min="0" max="100" value={Math.round(effectsVolume*100)} onChange={onRange(setEffectsVolume)} disabled={!enabled}/></label><small>Original local audio · muted by default</small></div></details>;
}
