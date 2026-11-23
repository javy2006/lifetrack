import type { CSSProperties } from 'react';

/** Shared isometric Kuala Lumpur inspired neighborhood used across the game. */
export function CityScene({ className = '', style, decorative = false }: { className?: string; style?: CSSProperties; decorative?: boolean }) {
  return <svg className={`city-illustration ${className}`} style={style} viewBox="0 0 960 560" role={decorative?undefined:'img'} aria-hidden={decorative||undefined} aria-labelledby={decorative?undefined:'city-title city-desc'} xmlns="http://www.w3.org/2000/svg">
    {!decorative&&<><title id="city-title">A neighborhood in Kuala Lumpur</title><desc id="city-desc">Apartments, offices, a clinic, cafe, small shops and pedestrians along a quiet city street.</desc></>}
    <defs>
      <linearGradient id="citySky" x2="0" y2="1"><stop stopColor="#E6F0F4"/><stop offset="1" stopColor="#F6EDE4"/></linearGradient>
      <linearGradient id="towerFront" x2="0" y2="1"><stop stopColor="#B8D0D4"/><stop offset="1" stopColor="#87A9B1"/></linearGradient>
      <linearGradient id="towerSide" x2="0" y2="1"><stop stopColor="#73959E"/><stop offset="1" stopColor="#567986"/></linearGradient>
      <linearGradient id="apartmentFront" x2="0" y2="1"><stop stopColor="#F0D9BC"/><stop offset="1" stopColor="#D8B99C"/></linearGradient>
      <linearGradient id="apartmentSide" x2="0" y2="1"><stop stopColor="#BC967E"/><stop offset="1" stopColor="#9E7968"/></linearGradient>
      <filter id="cityShadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#29485A" floodOpacity=".13"/></filter>
      <pattern id="roadTexture" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 18 18 0" stroke="#FFFFFF" strokeOpacity=".035"/></pattern>
    </defs>
    <rect width="960" height="560" rx="26" fill="url(#citySky)"/>
    <circle cx="782" cy="93" r="49" fill="#F6DDB7" opacity=".8"/><circle cx="782" cy="93" r="68" stroke="#F6DDB7" strokeOpacity=".28" strokeWidth="15" fill="none"/>
    <g className="city-clouds" fill="#FFF" opacity=".72"><path d="M91 104c5-13 25-16 34-5 10-12 32-6 33 10h-70c-7 0-4-5 3-5Z"/><path d="M450 79c5-12 23-14 31-4 10-10 28-5 29 9h-62c-6 0-4-5 2-5Z"/></g>
    {/* Far skyline */}
    <g opacity=".48"><path d="M54 284V174h61v110Z" fill="#9DB5B9"/><path d="M115 284V198l31-22v108Z" fill="#718F98"/><path d="M178 284V136h71v148Z" fill="#B3B7AC"/><path d="M249 284V159l30-18v143Z" fill="#858D87"/><path d="M726 284V167h60v117Z" fill="#A4B8B6"/><path d="M786 284V131h58v153Z" fill="#79949B"/><path d="M844 284V183l32-17v118Z" fill="#B8A895"/>
      <g stroke="#ECF3EE" strokeWidth="4" opacity=".8"><path d="M67 194h34m-34 19h34m-34 19h34m-34 19h34M191 158h39m-39 19h39m-39 19h39m-39 19h39M798 153h31m-31 18h31m-31 18h31m-31 18h31"/></g>
    </g>
    <path d="M0 306 480 249l480 63v248H0Z" fill="#E7E8D9"/>
    <path d="M0 367 480 294l480 81v185H0Z" fill="#D9E2D5"/>
    {/* Main isometric boulevard */}
    <path d="m-45 468 525-191 546 193v90L475 362-45 552Z" fill="#687781"/><path d="m-45 468 525-191 546 193v90L475 362-45 552Z" fill="url(#roadTexture)"/>
    <path d="m-15 456 495-180 512 180" fill="none" stroke="#F5E5C6" strokeWidth="12" opacity=".92"/>
    <path d="m100 462 58-21m100-39 58-21m102-37 58-20m117 22 59 22m100 37 58 21m99 37 54 20" stroke="#F5E8CC" strokeWidth="5" strokeLinecap="round" opacity=".9"/>
    <path d="m0 385 481-74 479 77" fill="none" stroke="#C5CDBB" strokeWidth="20" opacity=".85"/>
    {/* Office tower */}
    <g filter="url(#cityShadow)"><path d="M331 297V119l86-27v191Z" fill="url(#towerFront)"/><path d="m417 283 52-20V91l-52 28Z" fill="url(#towerSide)"/><path d="m331 119 87-27 51 18-52 17Z" fill="#D0E0DF"/>
      <g fill="#E8F1E9"><path d="M344 135h18v20h-18zm30-9h18v20h-18zm30-9h5v20h-5zM344 172h18v20h-18zm30-9h18v20h-18zm30-9h5v20h-5zM344 209h18v20h-18zm30-9h18v20h-18zm30-9h5v20h-5zM344 246h18v20h-18zm30-9h18v20h-18zm30-9h5v20h-5z"/></g>
      <path d="M363 104V64h5V39h3v25h5v40" fill="#C8102E"/><path d="M365 44h10l-3 10h-7Z" fill="#C8102E"/>
    </g>
    {/* Apartment block */}
    <g filter="url(#cityShadow)"><path d="M79 351V231l99-34v128Z" fill="url(#apartmentFront)"/><path d="m178 325 55-21V185l-55 12Z" fill="url(#apartmentSide)"/><path d="m79 231 99-34 55-12-55 34Z" fill="#F5E3CA"/>
      <g fill="#7795A0"><path d="M93 247h24v22H93zm42-14h24v22h-24zm-42 52h24v22H93zm42-14h24v22h-24zm-42 52h24v22H93zm42-14h24v22h-24z"/><path d="M188 218h19v22h-19zm0 42h19v22h-19zm0 42h19v15h-19z"/></g>
      <g fill="#E6C69F"><path d="M89 275h33v4H89zm42-14h33v4h-33zm-42 52h33v4H89zm42-14h33v4h-33z"/></g>
    </g>
    {/* Clinic and cafe row */}
    <g filter="url(#cityShadow)"><path d="M546 342v-90l106-27v91Z" fill="#F8F7F0"/><path d="m652 316 50-17v-90l-50 16Z" fill="#C6D7D0"/><path d="m546 252 106-27 50-16-100 37Z" fill="#FFF"/><path d="M558 266h84v10h-84Z" fill="#C8102E"/><path d="M588 257h24v28h-24Z" fill="#E4F0ED"/><path d="M594 263h12v16h-12Z" fill="#C8102E"/><path d="M612 265h17v16h-17Z" fill="#84AAB2"/><text x="561" y="247" fill="#0F294A" fontSize="12" fontWeight="700" fontFamily="sans-serif">CLINIC</text></g>
    <g filter="url(#cityShadow)"><path d="M269 383v-64l93-31v68Z" fill="#E7BE9E"/><path d="m362 356 45-18v-64l-45 14Z" fill="#B9856C"/><path d="m269 319 93-31 45-14-94 35Z" fill="#F3D5B6"/><path d="M280 326h70v21h-70Z" fill="#F7F2E9"/><path d="M276 321h79v7h-79Z" fill="#C8102E"/><path d="M288 350h25v29h-25Z" fill="#7A9DA1"/><path d="M324 345h25v34h-25Z" fill="#A7C5C2"/><path d="M292 310h54" stroke="#0F294A" strokeWidth="3"/><text x="289" y="307" fill="#0F294A" fontSize="10" fontWeight="700" fontFamily="sans-serif">KOPI &amp; CO.</text></g>
    {/* Pocket park and isometric trees */}
    <path d="m735 355 102-28 97 38-103 31Z" fill="#B8CDB5"/><path d="m745 356 88-24 78 31-83 26Z" fill="#C8DABF"/>
    <g className="city-trees"><path d="M767 352v35m42-49v42m49-29v32" stroke="#886D55" strokeWidth="5"/><circle cx="767" cy="344" r="18" fill="#588B70"/><circle cx="753" cy="350" r="11" fill="#70A17F"/><circle cx="778" cy="351" r="12" fill="#77A682"/><circle cx="809" cy="337" r="18" fill="#4F8268"/><circle cx="797" cy="343" r="11" fill="#76A783"/><circle cx="821" cy="347" r="12" fill="#6B9B79"/><circle cx="858" cy="356" r="17" fill="#5A8C70"/><circle cx="847" cy="361" r="10" fill="#77A783"/></g>
    {/* People on the sidewalk */}
    <g stroke="#0F294A" strokeLinecap="round" strokeWidth="4"><circle cx="489" cy="357" r="8" fill="#D8A888" stroke="none"/><path d="M489 367v21m0-12-9 9m9-9 9 7m-9 5-7 11m7-11 7 9" stroke="#C8102E"/><circle cx="527" cy="367" r="7" fill="#B98267" stroke="none"/><path d="M527 376v17m0-10-8 5m8-5 7 5m-7 5-6 10m6-10 6 9" stroke="#0F294A"/></g>
    {/* Street lights */}
    <g fill="none" stroke="#5F7380" strokeWidth="4" strokeLinecap="round"><path d="M238 332v-63l-14-7m14 7 9-2"/><path d="M717 362v-73l14-8m-14 8-9-2"/></g><g fill="#F5D990"><circle cx="223" cy="261" r="5"/><circle cx="732" cy="281" r="5"/></g>
    <g fill="#AFC0AE"><circle cx="51" cy="351" r="4"/><circle cx="60" cy="359" r="3"/><circle cx="704" cy="347" r="4"/><circle cx="715" cy="350" r="3"/></g>
  </svg>;
}
