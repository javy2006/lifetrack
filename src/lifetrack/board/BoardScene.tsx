import { useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Board3DView } from '../board3d/Board3DScene.tsx';
import { Activity, Banknote, BedDouble, Dices, Heart, PartyPopper, Shield, Users, Wallet } from 'lucide-react';
import type { GameState } from '../game/types.ts';
import { CHARACTERS } from '../game/characters.ts';
import { getAiTurnsForRound, getCurrentEvent } from '../game/gameReducer.ts';
import { CityScene } from '../components/CityScene.tsx';
import { characterPortraitUrl } from '../components/CharacterPortrait.tsx';
import { PlayerDashboard } from '../components/PlayerDashboard.tsx';
import { STEP_HOP_SHARE } from './boardTiming.ts';
import { routeSpaces } from '../board3d/boardWorld.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { aiTurnText } from '../i18n/content.ts';
import { BOARD_POINTS, BOARD_ROUTE, tileKey, getBoardSpaceIndex, getEventBoardCategory, tokenOffset, type BoardCategory, type BoardProgress } from './boardTypes.ts';

const categoryColor:Record<BoardCategory,string>={salary:'#d6a44b',medical:'#c8102e',accident:'#e77c43',family:'#7d68a6',savings:'#24845b',protection:'#457a9b',lucky:'#df9c3e',rest:'#748b8d'};
const icons={salary:Banknote,medical:Heart,accident:Activity,family:Users,savings:Wallet,protection:Shield,lucky:PartyPopper,rest:BedDouble};
const pipMap:Record<number,string[]>={1:['center'],2:['top-left','bottom-right'],3:['top-left','center','bottom-right'],4:['top-left','top-right','bottom-left','bottom-right'],5:['top-left','top-right','center','bottom-left','bottom-right'],6:['top-left','top-right','mid-left','mid-right','bottom-left','bottom-right']};
function DiceFace({value,rolling=false}:{value:number|null;rolling?:boolean}){const {t}=useI18n();return <div className={`dice-cube ${rolling?'dice-result-rolling':''}`} role="img" aria-label={value?t('board.diceShowing',{n:value}):t('board.diceRolling')}>{value?(pipMap[value]??[]).map(pip=><i key={pip} className={pip}/>):<i className="center"/>}</div>}

export function BoardScene({state,progress,rolling,movementStep,dieTumbling,dieValue,landing,stepMs,onRoll,rollControl=true,renderBoard}:{rollControl?:boolean;renderBoard?:(svgBoard:ReactNode,view:Board3DView,label:string)=>ReactNode;state:GameState;progress:BoardProgress|null;rolling:boolean;movementStep:{playerId:import('../game/types.ts').CharacterId;position:number}|null;dieTumbling:boolean;dieValue:number|null;landing:{playerId:import('../game/types.ts').CharacterId;space:number}|null;stepMs:number;onRoll:()=>void}) {
  const {t,content}=useI18n();
  const tile=(i:number)=>t(`tiles.${tileKey(i)}`);
  const captions=useMemo(()=>BOARD_ROUTE.map((_,i)=>tile(i)),[t]);
  const activePosition=progress?.positions[progress.activePlayer??state.humanId];
  // The highlighted space follows the moving pawn one step at a time, then marks where it landed.
  const current=movementStep?.position??activePosition??getBoardSpaceIndex(state.round,state.phase);
  const mover=movementStep?.playerId??progress?.activePlayer??(rolling?state.humanId:null);
  const shownRoll=dieValue??progress?.lastMovement?.roll??null;
  const event=getCurrentEvent(state);
  const activeAiTurn=progress?.activePlayer?getAiTurnsForRound(state,state.round).find(turn=>turn.playerId===progress.activePlayer):undefined;
  const highlight=state.phase==='event'&&event?getEventBoardCategory(event.category):BOARD_ROUTE[current].category;
  const players=useMemo(()=>state.players.map(p=>({player:p,character:CHARACTERS.find(c=>c.id===p.id)!,index:movementStep?.playerId===p.id?movementStep.position:progress?.positions[p.id]??0})),[state.players,progress,movementStep]);
  const humanCanRoll=state.phase==='decisions'&&progress?.stage==='human-roll';
  return <section className="board-card" aria-label={t('board.title')}>
    <div className="board-heading"><div><span className="eyebrow">{t('board.title')}</span><h2>{t('common.month',{n:state.round})}{state.status==='playing'?` · ${t(`phase.${state.phase}`)}`:''}</h2></div><span className="board-key"><i/> {t('board.currentStop',{space:tile(current)})}</span></div>
    <div className="board-viewport">{(()=>{const boardLabel=t('board.aria',{space:tile(current)});const svgBoard=<svg className="life-board" style={{"--step-ms":`${Math.round(stepMs*STEP_HOP_SHARE)}ms`} as CSSProperties} viewBox="0 0 1000 760" role="img" aria-label={boardLabel}>
      <defs><linearGradient id="boardGround" x2="0" y2="1"><stop stopColor="#f8f5ed"/><stop offset="1" stopColor="#dce8dc"/></linearGradient><filter id="tileShadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#16334a" floodOpacity=".16"/></filter></defs>
      <rect x="12" y="12" width="976" height="736" rx="34" fill="url(#boardGround)" stroke="#e2e6df" strokeWidth="3"/>
      <path d="M122 146h756v468H122Z" fill="#d8e5d6" stroke="#fff" strokeWidth="9"/>
      <path d="M133 157h734v446H133Z" fill="none" stroke="#97b4a1" strokeWidth="2" strokeDasharray="7 10"/>
      <svg x="235" y="216" width="530" height="330" viewBox="0 0 960 560" preserveAspectRatio="xMidYMid slice"><CityScene decorative/></svg>
      <g className="board-center"><rect x="380" y="560" width="240" height="45" rx="22" fill="#fff" opacity=".94"/><text x="500" y="588" textAnchor="middle">{t('board.city')}</text></g>
      {BOARD_ROUTE.map((space,i)=>{const p=BOARD_POINTS[i],Icon=icons[space.category],isActive=i===current,isEvent=state.phase==='event'&&space.category===highlight;return <g key={space.index} transform={`translate(${p.x} ${p.y})`} className={`board-space ${isActive||isEvent?'board-space-active':''}`}>
        <rect x="-45" y="-31" width="90" height="62" rx="12" fill="#fff" stroke={isActive||isEvent?categoryColor[space.category]:'#d8ddd8'} strokeWidth={isActive||isEvent?3:1.5} filter="url(#tileShadow)"/>
        <rect x="-45" y="-31" width="90" height="8" rx="5" fill={categoryColor[space.category]}/><foreignObject x="-10" y="-17" width="20" height="20"><Icon size={17} color={categoryColor[space.category]}/></foreignObject>
        <text className="space-label" x="0" y="19" textAnchor="middle">{captions[i]}</text>
        {isActive&&<circle className="active-ring" r="49" fill="none" stroke={categoryColor[space.category]} strokeWidth="2"/>}
      </g>})}
      {players.map(({player,character,index})=>{const p=BOARD_POINTS[index],offset=tokenOffset(index,player.id,progress?.positions??({} as Record<typeof player.id,number>));const x=p.x+offset.x,y=p.y+offset.y;return <g key={player.id} transform={`translate(${x} ${y})`} className={`board-token ${player.id===state.humanId?'board-token-human':''} ${mover===player.id?'board-token-moving':''}`} aria-label={t('board.tokenAria',{name:character.name,who:t(player.controller==='human'?'board.youParen':'board.aiParen'),n:index+1})}>
        <ellipse cy="-5" rx="13" ry="5" fill="#173247" opacity=".22"/><circle cy="-20" r="14" fill={categoryColor[character.id==='alex'?'savings':character.id==='meiling'?'family':character.id==='daniel'?'protection':'salary']} stroke="#fff" strokeWidth="2"/><clipPath id={`token-clip-${player.id}`}><circle cy="-20" r="12"/></clipPath><image href={characterPortraitUrl(player.id)} x="-12" y="-32" width="24" height="24" clipPath={`url(#token-clip-${player.id})`} preserveAspectRatio="xMidYMid slice"/>
      </g>})}
    </svg>;if(!renderBoard)return svgBoard;const positions=Object.fromEntries(players.map(({player,index})=>[player.id,index])) as Board3DView["positions"];return renderBoard(svgBoard,{playerIds:state.players.map(p=>p.id),humanId:state.humanId,positions,activePlayer:mover,currentSpace:current,highlightCategory:state.phase==="event"&&event?highlight:null,dieValue:dieTumbling?null:shownRoll,dieRolling:dieTumbling,stepSeconds:(stepMs*STEP_HOP_SHARE)/1000,route:mover&&!dieTumbling&&dieValue!==null&&progress?routeSpaces(progress.positions[mover],dieValue):[],routeOwner:mover,focus:mover,landingSpace:landing&&movementStep?landing.space:null,captions,month:state.round},boardLabel);})()}
      {/* Main action, integrated into the board: the big Roll button on your turn, a turn pill otherwise. */}
      {(humanCanRoll||rolling)&&rollControl?<div className="board-main-action"><span className="board-turn-label" aria-hidden="true">{dieTumbling?t('board.rolling'):landing&&rolling?t('board.landedShort',{space:tile(landing.space)}):rolling&&dieValue!==null?t('board.rolledShort',{n:dieValue}):t('board.yourTurnName',{name:CHARACTERS.find(c=>c.id===state.humanId)?.name??''})}</span><button type="button" data-sound="own" className={`roll-main ${rolling?'is-rolling':''}`} onClick={onRoll} disabled={rolling} aria-label={t('board.rollAria')}><Dices size={30} aria-hidden="true"/><span>{rolling?t('board.rollingBtn'):t('board.roll')}</span></button></div>
       :mover&&mover!==state.humanId?<div className="board-main-action"><span className="board-turn-label board-turn-ai">{(()=>{const name=CHARACTERS.find(c=>c.id===mover)?.name??'';return dieTumbling?t('board.isRolling',{name}):landing?t('board.nameLandedShort',{name,space:tile(landing.space)}):dieValue!==null?t('board.nameRolledShort',{name,n:dieValue}):t('board.isMoving',{name});})()}</span></div>:null}
</div>
    {(()=>{const move=progress?.lastMovement;const name=(id:string|null|undefined)=>CHARACTERS.find(c=>c.id===id)?.name??'';const isYou=(id:string|null|undefined)=>id===state.humanId;
      // One short status line that follows the turn: rolling → rolled → landed.
      const landed=(id:string,space:number)=>isYou(id)?t('board.youLanded',{space:tile(space)}):t('board.nameLanded',{name:name(id),space:tile(space)});
      const status=dieTumbling?(isYou(mover)?t('board.rolling'):`${t('board.isRolling',{name:name(mover)})}…`)
        :landing?landed(landing.playerId,landing.space)
        :movementStep||dieValue!==null&&mover?(isYou(mover)?t('board.youRolled',{n:dieValue??''}):t('board.nameRolled',{name:name(mover),n:dieValue??''}))
        :humanCanRoll?t('board.yourTurnRoll'):progress?.stage==='complete'?t('board.allMoved'):state.phase==='event-draw'?t('board.rivalsMoving'):move?landed(move.playerId,move.to):t('board.rollToMove');
      const aiText=activeAiTurn?aiTurnText(activeAiTurn,content,t):null;
      const detail=aiText&&!movementStep&&!dieTumbling?(aiText.rationale||aiText.message):t('board.oneRoll');
      return <div className="board-controls"><div className={`board-die ${landing&&!movementStep?'board-die-landed':''}`}><DiceFace value={dieTumbling?null:shownRoll} rolling={dieTumbling}/><div aria-live="polite"><b>{status}</b><small>{detail}</small></div></div></div>})()}
    {/* Four-player dashboard: whose turn it is, positions and key money figures for everyone. */}
    <PlayerDashboard state={state} positions={Object.fromEntries(players.map(({player,index})=>[player.id,index])) as Record<import('../game/types.ts').CharacterId,number>} activeId={mover??(state.status==='playing'&&state.phase==='decisions'?state.humanId:null)}/>
  </section>;
}
