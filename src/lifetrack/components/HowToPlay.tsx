/**
 * Four illustrated steps (Roll, Move, Decide, Finish). Each step has a number, a small shaded
 * illustration in the board's palette and one sentence; illustrations are decorative (aria-hidden)
 * and animate gently unless the player prefers reduced motion.
 */
import { GAME_CONFIG } from '../game/constants.ts';

function DieArt() {
  return <svg viewBox="0 0 120 90" className="htp-art htp-die" aria-hidden="true">
    <ellipse cx="60" cy="80" rx="30" ry="5" fill="#18364b" opacity=".14"/>
    <g className="htp-die-body">
      <path d="M60 14 88 28 60 42 32 28Z" fill="#fffdf8" stroke="#d9d2c4"/>
      <path d="M32 28 60 42V74L32 60Z" fill="#efe9dd" stroke="#d9d2c4"/>
      <path d="M88 28 60 42V74L88 60Z" fill="#e3dccd" stroke="#d9d2c4"/>
      <circle cx="60" cy="28" r="3.6" fill="#c8102e"/>
      <circle cx="40" cy="42" r="3" fill="#c8102e"/><circle cx="52" cy="60" r="3" fill="#c8102e"/>
      <circle cx="68" cy="47" r="3" fill="#c8102e"/><circle cx="74" cy="51" r="3" fill="#c8102e"/><circle cx="80" cy="55" r="3" fill="#c8102e"/>
    </g>
    <path d="M14 30q6-4 12 0M10 44q7-4 14 0M98 30q6-4 12 0" stroke="#d6a44b" strokeWidth="3" strokeLinecap="round" fill="none"/>
  </svg>;
}

function MoveArt() {
  const tiles = [['#24845b', 18], ['#457a9b', 48], ['#7d68a6', 78]] as const;
  return <svg viewBox="0 0 120 90" className="htp-art htp-move" aria-hidden="true">
    {tiles.map(([c, x]) => <g key={x}><rect x={x} y="56" width="26" height="18" rx="4" fill="#d8d0bf"/><rect x={x} y="52" width="26" height="18" rx="4" fill={c}/><rect x={x + 3} y="55" width="20" height="12" rx="2" fill="#f7f3e8"/></g>)}
    <path d="M31 48q15-20 30 0M61 48q15-20 30 0" stroke="#c8102e" strokeWidth="2.5" strokeDasharray="3 5" strokeLinecap="round" fill="none"/>
    <g className="htp-pawn">
      <ellipse cx="91" cy="60" rx="8" ry="2.5" fill="#c8102e" opacity=".5"/>
      <rect x="86" y="40" width="10" height="18" rx="5" fill="#27324f"/>
      <circle cx="91" cy="34" r="7" fill="#d29973"/>
      <path d="M84 33q1-9 7-9t7 9q-3-4-7-4t-7 4Z" fill="#1b1c21"/>
    </g>
  </svg>;
}

function DecideArt() {
  return <svg viewBox="0 0 120 90" className="htp-art htp-decide" aria-hidden="true">
    <g className="htp-card-a"><rect x="14" y="18" width="42" height="56" rx="8" fill="#fff" stroke="#d6e6d2" strokeWidth="2"/><circle cx="35" cy="40" r="11" fill="#e3f1e9"/><text x="35" y="45" textAnchor="middle" fontSize="13" fontWeight="800" fill="#24845b">RM</text><rect x="22" y="58" width="26" height="6" rx="3" fill="#24845b"/></g>
    <g className="htp-card-b"><rect x="64" y="18" width="42" height="56" rx="8" fill="#fff" stroke="#d3e2ec" strokeWidth="2"/><path d="M85 29l11 4q-1 14-11 19-10-5-11-19Z" fill="#457a9b"/><rect x="72" y="58" width="26" height="6" rx="3" fill="#457a9b"/></g>
    <circle cx="98" cy="20" r="9" fill="#c8102e"/><path d="M94 20l3 3 6-6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

function FinishArt() {
  return <svg viewBox="0 0 120 90" className="htp-art htp-finish" aria-hidden="true">
    <ellipse cx="60" cy="80" rx="42" ry="5" fill="#18364b" opacity=".12"/>
    {([[22, 50, '#d9d2c4'], [48, 34, '#d6a44b'], [74, 58, '#e3dccd']] as const).map(([x, top, c]) => <rect key={x} x={x} y={top} width="24" height={78 - top} rx="4" fill={c}/>)}
    <path className="htp-crown" d="M50 24l4-10 6 7 6-7 4 10Z" fill="#d6a44b" stroke="#b9862f" strokeWidth="1.5" strokeLinejoin="round"/>
    <text x="60" y="62" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">1</text>
  </svg>;
}

const STEPS = [
  { label: 'Roll', text: 'Roll the dice to see how far you move.', Art: DieArt },
  { label: 'Move', text: 'Watch your character travel round the city board.', Art: MoveArt },
  { label: 'Decide', text: `Save, buy cover or pass with your ${GAME_CONFIG.actionPointsPerRound} moves.`, Art: DecideArt },
  { label: 'Finish', text: `Play ${GAME_CONFIG.totalRounds} months, then compare everyone's results.`, Art: FinishArt },
] as const;

export function HowToPlay() {
  return <ol className="how-to-play">
    {STEPS.map(({ label, text, Art }, i) => <li className="htp-step" key={label}>
      <span className="htp-number" aria-hidden="true">{i + 1}</span>
      <Art/>
      <b>{label}</b>
      <span>{text}</span>
    </li>)}
  </ol>;
}
