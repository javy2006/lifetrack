import type { EventCard } from '../game/types.ts';

const colors: Record<EventCard['category'], { sky:string; ground:string; accent:string; label:string }> = {
  medical:{sky:'#E6F0F2',ground:'#D5E3DB',accent:'#C8102E',label:'Medical care scene'},
  accident:{sky:'#E8ECE9',ground:'#CEDAD4',accent:'#C8102E',label:'Road safety scene'},
  'critical-illness':{sky:'#E9EAF2',ground:'#D8D9E6',accent:'#896A9C',label:'Recovery and care scene'},
  family:{sky:'#F2E9DD',ground:'#DCE4D4',accent:'#C8102E',label:'Family home scene'},
  income:{sky:'#E7EEF1',ground:'#D8E1DD',accent:'#D0A148',label:'Work and income scene'},
  repair:{sky:'#ECE9E1',ground:'#D7DED0',accent:'#C67C4A',label:'Home repair scene'},
  recovery:{sky:'#E5EFF0',ground:'#D8E5DB',accent:'#648DA0',label:'Recovery scene'},
  calm:{sky:'#F5EBD6',ground:'#D9E6D5',accent:'#D1A644',label:'Calm neighborhood scene'},
};

export function EventIllustration({ event, className = '' }: { event: EventCard; className?: string }) {
  const c=colors[event.category];
  const medical=event.category==='medical'||event.category==='critical-illness'||event.category==='recovery';
  const road=event.category==='accident';
  const work=event.category==='income';
  const repair=event.category==='repair';
  return <svg className={`event-illustration ${className}`} viewBox="0 0 520 360" aria-hidden="true" focusable="false" data-scene={c.label} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={`eventSky-${event.id}`} x2="0" y2="1"><stop stopColor={c.sky}/><stop offset="1" stopColor="#F8F3E9"/></linearGradient><filter id={`eventShadow-${event.id}`} x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#29485A" floodOpacity=".13"/></filter></defs>
    <rect width="520" height="360" rx="22" fill={`url(#eventSky-${event.id})`}/><circle cx="423" cy="66" r="27" fill="#F2D8AA" opacity=".75"/>
    <path d="M0 229 250 168l270 73v119H0Z" fill={c.ground}/><path d="m0 267 250-64 270 76v81H0Z" fill="#C7D9CD"/>
    {/* Isometric neighborhood silhouettes */}
    <g filter={`url(#eventShadow-${event.id})`}><path d="M32 234V119l69-24v115Z" fill="#E4CFB1"/><path d="m101 210 38-14V80l-38 15Z" fill="#BA9781"/><path d="m32 119 69-24 38-15-69 27Z" fill="#F0DFC8"/><g fill="#7D9BA0"><path d="M42 136h18v19H42zm33-11h18v19H75zm-33 43h18v19H42zm33-11h18v19H75z"/></g></g>
    <g filter={`url(#eventShadow-${event.id})`}><path d="M391 224V127l58-20v102Z" fill="#C6D8D2"/><path d="m449 209 37-13V96l-37 11Z" fill="#89A8A3"/><path d="m391 127 58-20 37-11-58 22Z" fill="#E3ECE5"/><g fill="#F5F1E5"><path d="M401 142h15v16h-15zm25-9h15v16h-15zm-25 41h15v16h-15zm25-9h15v16h-15z"/></g></g>
    {/* Event-specific scene vignette */}
    {road?<><path d="m116 295 165-61 183 55v71l-183-60-165 61Z" fill="#687881"/><path d="m147 292 43-16m67-25 43-16m64 32 43 14" stroke="#F1E3C8" strokeWidth="4" strokeLinecap="round"/><g filter={`url(#eventShadow-${event.id})`}><path d="m214 261 71-25 61 20-71 25Z" fill="#C8102E"/><path d="m214 261 61 20v32l-61-21Z" fill="#98263A"/><path d="m275 281 71-25v31l-71 26Z" fill="#762D3A"/><path d="m235 259 39-14 36 12-40 14Z" fill="#AFCBD0"/><circle cx="245" cy="306" r="11" fill="#35434B"/><circle cx="319" cy="309" r="11" fill="#35434B"/></g></>:null}
    {medical?<><path d="M181 241v-91l109-32v91Z" fill="#FBFAF2"/><path d="m290 209 46-16v-90l-46 15Z" fill="#BDD4CE"/><path d="M194 158h83v9h-83Z" fill="#C8102E"/><path d="M219 144h28v33h-28Z" fill="#EDF4EC"/><path d="M228 151h10v19h-10Z" fill="#C8102E"/><path d="M222 158h23v7h-23Z" fill="#C8102E"/><g><path d="M353 247v-48" stroke="#516B76" strokeWidth="4"/><circle cx="353" cy="190" r="15" fill="#D9A989"/><path d="M333 247q3-36 20-36t21 36Z" fill="#C8102E"/><path d="M340 247v23m26-23v23" stroke="#435A66" strokeWidth="7" strokeLinecap="round"/></g></>:null}
    {repair?<><path d="M170 240V139l97-29 95 35v93l-95-33Z" fill="#E8D4B5"/><path d="m267 110 95 35-96 32-96-38Z" fill="#F4E7D0"/><path d="m267 177 95-32v93l-95 32Z" fill="#C49E82"/><path d="m224 198 43-14 0 60-43-15Z" fill="#7798A0"/><path d="m289 187 48-17v48l-48 17Z" fill="#7D9CA0"/><g><path d="M393 249v-45" stroke="#84684F" strokeWidth="4"/><circle cx="393" cy="191" r="14" fill="#D7A787"/><path d="M372 249q4-34 21-34t21 34Z" fill="#3D748A"/><path d="m381 223-15 22m44-22 13 19" stroke="#D7A787" strokeWidth="7" strokeLinecap="round"/><path d="m362 231 22-8m18 14 18-10" stroke="#B4773E" strokeWidth="4" strokeLinecap="round"/></g></>:null}
    {work?<><path d="M184 240V126l78-25v114Z" fill="#9DBAB9"/><path d="m262 215 50-17V83l-50 18Z" fill="#668A91"/><g fill="#E9F0E7"><path d="M197 142h18v20h-18zm31-10h18v20h-18zm-31 47h18v20h-18zm31-10h18v20h-18z"/></g><path d="M344 240v-57m-13-22h26l-4 21h-18Z" fill="#D7A787"/><path d="M324 243q3-35 20-35t21 35Z" fill="#C8102E"/><path d="M335 243v30m19-30v30" stroke="#344C60" strokeWidth="7" strokeLinecap="round"/><rect x="360" y="217" width="30" height="34" rx="4" fill="#E6D4B5"/></>:null}
    {!road&&!medical&&!repair&&!work?<><path d="m190 239 83-65 92 39-86 68Z" fill="#E5CDA9"/><path d="m190 239 89 42v48l-89-43Z" fill="#C79A77"/><path d="m279 281 86-68v50l-86 66Z" fill="#A97D68"/><path d="m180 239 95-73 100 42-96 73Z" fill="#F3DFC0"/><path d="m214 241 30-23 31 13-31 23Z" fill="#819DA1"/><path d="m300 240 32-24 27 12-31 24Z" fill="#819DA1"/><path d="M253 274v-42l23 10v42Z" fill="#68574B"/><g fill="#608C6E"><circle cx="132" cy="231" r="22"/><circle cx="125" cy="247" r="17"/><circle cx="385" cy="258" r="23"/></g><path d="M132 250v26m253 1v26" stroke="#826C55" strokeWidth="6"/></>:null}
    {/* Small landscape markers */}
    <path d="M64 296v31m434-35v31" stroke="#6E9277" strokeWidth="5"/><circle cx="64" cy="291" r="15" fill="#72A17D"/><circle cx="498" cy="287" r="16" fill="#588B70"/>
    <g fill="#D7BD87"><circle cx="98" cy="287" r="3"/><circle cx="117" cy="280" r="3"/><circle cx="444" cy="277" r="3"/><circle cx="463" cy="283" r="3"/></g>
  </svg>;
}
