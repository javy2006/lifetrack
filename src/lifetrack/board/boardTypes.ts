import type { EventCategory, GameState } from '../game/types.ts';

export type BoardCategory = 'salary' | 'medical' | 'accident' | 'family' | 'savings' | 'protection' | 'lucky' | 'rest';
export interface BoardSpace { index: number; label: string; category: BoardCategory }
export interface Point { x: number; y: number }
export type BoardTurnStage='human-roll'|'human-landed'|'ai-turns'|'complete';
export interface BoardMovement { playerId:import('../game/types.ts').CharacterId; from:number; to:number; roll:number }
export interface BoardProgress { version:1; seed:number; round:number; positions:Record<import('../game/types.ts').CharacterId,number>; lastDiceRoll:Record<import('../game/types.ts').CharacterId,number|null>; stage:BoardTurnStage; aiQueue:import('../game/types.ts').CharacterId[]; activePlayer:import('../game/types.ts').CharacterId|null; lastMovement:BoardMovement|null }

export const BOARD_ROUTE: readonly BoardSpace[] = [
  ['SALARY','salary'],['SAVE','savings'],['MEDICAL','medical'],['REST','rest'],['COVER','protection'],['FAMILY','family'],
  ['ACCIDENT','accident'],['SAVE','savings'],['LUCKY','lucky'],['MEDICAL','medical'],['SALARY','salary'],['COVER','protection'],
  ['REST','rest'],['FAMILY','family'],['ACCIDENT','accident'],['SAVE','savings'],['MEDICAL','medical'],['LUCKY','lucky'],
  ['COVER','protection'],['FAMILY','family'],['REST','rest'],['SALARY','salary'],['ACCIDENT','accident'],['CHECKPOINT','salary'],
].map(([label,category],index)=>({index,label,category:category as BoardCategory}));

export const BOARD_POINTS: readonly Point[] = BOARD_ROUTE.map((_,i)=>{
  const side=Math.floor(i/6), step=i%6;
  const t=step/5;
  return side===0?{x:150+t*700,y:112}:side===1?{x:888,y:155+t*450}:side===2?{x:850-t*700,y:648}:{x:112,y:605-t*450};
});

export function getBoardSpaceIndex(round:number, phase:GameState['phase']):number {
  const phaseOffset:Record<GameState['phase'],number>={income:0,expenses:0,decisions:1,'event-draw':2,event:2,claims:3,summary:3};
  return (((Math.max(1,Math.min(6,round))-1)*4+phaseOffset[phase])%BOARD_ROUTE.length);
}

export function movePosition(position:number,steps:number,spaceCount=BOARD_ROUTE.length):number {
  if(!Number.isInteger(position)||!Number.isInteger(steps)||spaceCount<1)return 0;
  return ((position+steps)%spaceCount+spaceCount)%spaceCount;
}

export function createBoardProgress(seed:number,round:number,playerIds:readonly import('../game/types.ts').CharacterId[]):BoardProgress {
  const positions=Object.fromEntries(playerIds.map(id=>[id,0])) as Record<import('../game/types.ts').CharacterId,number>;
  const lastDiceRoll=Object.fromEntries(playerIds.map(id=>[id,null])) as Record<import('../game/types.ts').CharacterId,number|null>;
  return {version:1,seed,round,positions,lastDiceRoll,stage:'human-roll',aiQueue:[],activePlayer:null,lastMovement:null};
}

/** Seeded board-only d6. It never feeds event selection or financial logic. */
export function rollBoardDie(seed:number,round:number,playerId:string):number {
  let value=(seed^Math.imul(round,0x9e3779b1))>>>0;
  for(let i=0;i<playerId.length;i++)value=Math.imul(value^playerId.charCodeAt(i),0x45d9f3b)>>>0;
  value^=value>>>16;value=Math.imul(value,0x7feb352d)>>>0;value^=value>>>15;
  return (value>>>0)%6+1;
}

export function moveBoardPlayer(progress:BoardProgress,playerId:import('../game/types.ts').CharacterId,roll:number):BoardProgress {
  if(!Number.isInteger(roll)||roll<1||roll>6||!(playerId in progress.positions))return progress;
  const from=progress.positions[playerId],to=movePosition(from,roll);
  return {...progress,positions:{...progress.positions,[playerId]:to},lastDiceRoll:{...progress.lastDiceRoll,[playerId]:roll},lastMovement:{playerId,from,to,roll}};
}

export function isValidBoardProgress(value:unknown,seed:number,playerIds:readonly import('../game/types.ts').CharacterId[]):value is BoardProgress {
  if(!value||typeof value!=='object')return false;
  const p=value as Partial<BoardProgress>;
  const positions=p.positions;
  return p.version===1&&p.seed===seed&&Number.isInteger(p.round)&&typeof positions==='object'&&positions!==null&&playerIds.every(id=>Number.isInteger(positions[id])&&positions[id]>=0&&positions[id]<BOARD_ROUTE.length)&&Array.isArray(p.aiQueue)&&typeof p.lastDiceRoll==='object'&&p.lastDiceRoll!==null&&playerIds.every(id=>p.lastDiceRoll?.[id]===null||Number.isInteger(p.lastDiceRoll?.[id]))&&['human-roll','human-landed','ai-turns','complete'].includes(p.stage??'');
}

export function tokenOffset(position:number,playerId:import('../game/types.ts').CharacterId,all:Record<import('../game/types.ts').CharacterId,number>):Point {
  const occupying=Object.entries(all).filter(([,p])=>p===position).map(([id])=>id as import('../game/types.ts').CharacterId);
  const offset=Math.max(0,occupying.indexOf(playerId));
  const angle=(Math.PI*2*offset)/Math.max(4,occupying.length);
  return {x:Math.cos(angle)*12,y:Math.sin(angle)*10};
}

export function getAiTurnOrder(playerIds:readonly import('../game/types.ts').CharacterId[],humanId:import('../game/types.ts').CharacterId) {
  return playerIds.filter(id=>id!==humanId);
}

export function getEventBoardCategory(category:EventCategory):BoardCategory {
  if(category==='medical'||category==='critical-illness')return 'medical';
  if(category==='accident'||category==='repair')return 'accident';
  if(category==='family')return 'family';
  if(category==='income')return 'salary';
  if(category==='calm'||category==='recovery')return 'rest';
  return 'lucky';
}
