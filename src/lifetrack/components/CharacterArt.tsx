import type { CharacterId } from '../game/types.ts';

const looks: Record<CharacterId, { skin: string; hair: string; shirt: string; pants: string; accent: string; hairStyle: 'short'|'long'|'helmet'|'wave'; accessory?: 'glasses'|'badge' }> = {
  alex: { skin:'#D9A783', hair:'#263844', shirt:'#E7ECE9', pants:'#253D54', accent:'#C8102E', hairStyle:'short', accessory:'glasses' },
  meiling: { skin:'#E5B79C', hair:'#25333A', shirt:'#A85F65', pants:'#263E4C', accent:'#E4C38E', hairStyle:'long' },
  daniel: { skin:'#C88F6D', hair:'#273941', shirt:'#3F7890', pants:'#41534F', accent:'#E5BD61', hairStyle:'helmet' },
  aisyah: { skin:'#D7A486', hair:'#263541', shirt:'#D1E2D7', pants:'#344D62', accent:'#C8102E', hairStyle:'wave', accessory:'badge' },
};

export function CharacterArt({ characterId, className = '', title }: { characterId: CharacterId; className?: string; title?: string }) {
  const x=looks[characterId];
  return <svg className={`character-illustration ${className}`} viewBox="0 0 180 220" role="img" aria-label={title ?? `${characterId} character illustration`} xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={`shirt-${characterId}`} x2="0" y2="1"><stop stopColor={x.shirt}/><stop offset="1" stopColor={x.accent}/></linearGradient></defs>
    {/* Shoes and legs */}
    <path d="m63 171-2 28q-1 7-9 8l-16 2q-5 2-2 6h38q7-2 6-8l4-33Zm44 0 4 28q1 6 8 8l15 3q6 2 2 6H99q-7-2-6-8l-3-35Z" fill={x.pants}/>
    <path d="M37 210h39q4 1 2 5H35q-4-2 2-5Zm76 1h39q5 2 2 5h-42q-4-2 1-5Z" fill="#263744"/>
    {/* Jacket / torso */}
    <path d="M63 95q-13 4-18 17l-8 46q16 11 31 6l5-31 3 39q20 8 42 0l-1-44 11 36q15 1 25-8l-15-48q-5-11-19-14Z" fill={`url(#shirt-${characterId})`}/>
    <path d="M54 117q8 4 16 1m-22 34 17 6m64-37 10 30m-57 16 1-26m24-34-7 55" fill="none" stroke="#17344b" strokeOpacity=".18" strokeWidth="2" strokeLinecap="round"/>
    <path d="M48 137h12m61 3 11-3" stroke="#fff" strokeOpacity=".34" strokeWidth="2" strokeLinecap="round"/>
    <path d="m76 96 12 18 12-18 9 4-8 62H78l-7-62Z" fill="#F7F4EC" opacity=".94"/>
    <path d="m88 114 4 7 4-7-2 41h-4Z" fill={x.accent}/>
    {/* Neck */}
    <path d="M81 83h22v21q-10 12-22 0Z" fill={x.skin}/>
    {/* Arms and hands */}
    <path d="M48 111q-9 0-11 11l-8 30q-2 8 5 10t10-7l10-26m78-17q10 0 14 11l12 27q3 8-4 11t-11-6l-14-23" fill="none" stroke={x.skin} strokeWidth="11" strokeLinecap="round"/>
    {/* Ears, face, hair */}
    <ellipse cx="64" cy="62" rx="7" ry="10" fill={x.skin}/><ellipse cx="116" cy="62" rx="7" ry="10" fill={x.skin}/>
    <path d="M66 48q1-26 24-29 26 0 27 30l-3 27q-8 17-23 18-18-2-24-20Z" fill={x.skin}/>
    <path d="M73 48q5-18 18-20 16 1 20 18" fill="none" stroke="#F5D5C1" strokeOpacity=".52" strokeWidth="4" strokeLinecap="round"/>
    {x.hairStyle==='helmet'?<><path d="M57 48q1-31 32-34 31 1 34 31l-8 4H63Z" fill={x.hair}/><path d="M52 49q4-10 14-11h49q9 2 13 11v7H52Z" fill="#E2BA58"/><path d="M63 45h54" stroke="#F0D48B" strokeWidth="3"/></>:x.hairStyle==='long'?<><path d="M59 68q-8-44 24-52 28-8 38 20 4 12 0 34l-5-4-3-26q-12-2-23-12-7 13-26 17l-1 28Z" fill={x.hair}/><path d="M63 63q-2 39 10 49l-13 4q-11-19-9-41Zm59-4q8 26-2 50l-10-4 5-43Z" fill={x.hair}/></>:x.hairStyle==='wave'?<><path d="M59 66q-10-41 22-51 30-4 40 23 4 10-1 27l-6-4-3-23q-20 1-34-11-6 13-17 16l2 22Z" fill={x.hair}/><path d="M63 40q23 9 48-5" fill="none" stroke="#C8102E" strokeWidth="4"/></>:<path d="M61 54q-4-32 23-38 27-2 34 26l-4 8q-11-4-20-15-10 12-32 16Z" fill={x.hair}/>}
    {/* Expression */}
    <ellipse cx="80" cy="66" rx="5" ry="4" fill="#FFF9F2"/><ellipse cx="105" cy="66" rx="5" ry="4" fill="#FFF9F2"/><ellipse cx="81" cy="67" rx="2.1" ry="2.8" fill="#253641"/><ellipse cx="104" cy="67" rx="2.1" ry="2.8" fill="#253641"/><circle cx="81.5" cy="66" r=".8" fill="#fff"/><circle cx="104.5" cy="66" r=".8" fill="#fff"/>
    <path d={characterId==='daniel'?'M74 58q5-4 11 0m19 0q6-4 11 0':characterId==='alex'?'M74 57q5-3 11 0m19 0q6-3 11 0':'M74 58q5-4 11-1m19 0q6-4 11 0'} fill="none" stroke="#293A43" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M92 68q-2 7-4 10 3 2 6 0" fill="none" stroke="#B87568" strokeWidth="1.6" strokeLinecap="round"/>
    <ellipse cx="72" cy="75" rx="5" ry="2.5" fill="#D98078" opacity=".2"/><ellipse cx="112" cy="75" rx="5" ry="2.5" fill="#D98078" opacity=".2"/>
    <path d={characterId==='daniel'?'M86 81h14':characterId==='meiling'?'M85 80q7 8 15 0':'M86 79q7 7 14 0'} fill="none" stroke="#985A54" strokeWidth="2.4" strokeLinecap="round"/>
    {x.accessory==='glasses'&&<g fill="none" stroke="#40535C" strokeWidth="2"><rect x="70" y="57" width="19" height="15" rx="5"/><rect x="97" y="57" width="19" height="15" rx="5"/><path d="M89 63h8m-28-1-4-2m51 2 4-2"/></g>}
    {x.accessory==='badge'&&<><circle cx="121" cy="118" r="9" fill="#FFF" opacity=".9"/><path d="M121 113v10m-5-5h10" stroke={x.accent} strokeWidth="2"/></>}
    {characterId==='meiling'&&<path d="M90 104h12" stroke="#F3D59F" strokeWidth="3" strokeLinecap="round"/>}
  </svg>;
}
