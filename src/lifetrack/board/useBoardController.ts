import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterId, GameState } from '../game/types.ts';
import { createBoardProgress, getAiTurnOrder, isValidBoardProgress, moveBoardPlayer, movePosition, reconcileBoardProgress, rollBoardDie, type BoardProgress } from './boardTypes.ts';

export const BOARD_SAVE_KEY='lifetrack.board.v1';
const wait=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms));

export function readBoardSave(raw:string|null,seed:number,round:number,ids:readonly CharacterId[]):BoardProgress {
  try { const parsed:unknown=raw===null?null:JSON.parse(raw);if(isValidBoardProgress(parsed,seed,ids))return parsed; } catch { /* Discard malformed board-only saves. */ }
  return createBoardProgress(seed,round,ids);
}

export function useBoardController(state:GameState|null) {
  const seed=state?.seed??0,round=state?.round??1;
  const ids=useMemo(()=>state?.players.map(p=>p.id)??[],[state?.players]);
  const [progress,setProgress]=useState<BoardProgress|null>(()=>{
    if(!state)return null;
    try{return readBoardSave(localStorage.getItem(BOARD_SAVE_KEY),state.seed,state.round,state.players.map(p=>p.id));}catch{return createBoardProgress(state.seed,state.round,state.players.map(p=>p.id));}
  });
  const [rolling,setRolling]=useState(false);
  const [landingNotice,setLandingNotice]=useState(false);
  const [revealedRoll,setRevealedRoll]=useState<number|null>(null);
  const [activeRoll,setActiveRoll]=useState<number|null>(null);
  const [movementStep,setMovementStep]=useState<{playerId:CharacterId;position:number}|null>(null);
  const rollLock=useRef(false),aiLock=useRef(false);
  useEffect(()=>{
    if(!state)return;
    setProgress(old=>{
      if(!old||old.seed!==seed)return createBoardProgress(seed,round,ids);
      return reconcileBoardProgress(old,round,state.phase);
    });
  },[seed,round,state,ids]);
  useEffect(()=>{
    if(!progress)return;
    try{localStorage.setItem(BOARD_SAVE_KEY,JSON.stringify(progress));}catch{/* Game remains playable without board progress storage. */}
  },[progress]);
  const rollHuman=useCallback(async()=>{
    if(!state||state.status!=='playing'||state.phase!=='decisions'||!progress||progress.stage!=='human-roll'||rollLock.current)return;
    rollLock.current=true;setRolling(true);setLandingNotice(false);
    const id=state.humanId,roll=rollBoardDie(state.seed,state.round,id);
    await wait(520);
    setRevealedRoll(roll);
    let position=progress.positions[id];
    for(let step=0;step<roll;step++){position=movePosition(position,1);setMovementStep({playerId:id,position});await wait(135);}
    setProgress(p=>p?{...moveBoardPlayer(p,id,roll),stage:'human-landed',activePlayer:null}:p);
    setMovementStep(null);setRolling(false);setLandingNotice(true);rollLock.current=false;
  },[state,progress]);
  const runAiTurns=useCallback(async()=>{
    if(!state||!progress||!['human-roll','human-landed','ai-turns'].includes(progress.stage)||aiLock.current)return;
    aiLock.current=true;
    let queue=progress.stage==='ai-turns'?progress.aiQueue:getAiTurnOrder(state.players.map(p=>p.id),state.humanId);
    setProgress(p=>p?{...p,stage:'ai-turns',aiQueue:queue}:p);
    while(queue.length){
      const id=queue[0];setProgress(p=>p?{...p,activePlayer:id}:p);
      const roll=rollBoardDie(state.seed,state.round,id);
      setActiveRoll(roll);
      let position=progress.positions[id];
      for(let step=0;step<roll;step++){position=movePosition(position,1);setMovementStep({playerId:id,position});await wait(135);}
      setProgress(p=>p?{...moveBoardPlayer(p,id,roll),stage:'ai-turns',aiQueue:queue.slice(1),activePlayer:null}:p);
      setMovementStep(null);
      setActiveRoll(null);
      queue=queue.slice(1);
    }
    setProgress(p=>p?{...p,stage:'complete',aiQueue:[],activePlayer:null}:p);
    aiLock.current=false;
  },[state,progress]);
  const dismissLanding=useCallback(()=>{setLandingNotice(false);setRevealedRoll(null);},[]);
  return {progress,rolling,movementStep,landingNotice,revealedRoll,activeRoll,dismissLanding,rollHuman,runAiTurns};
}
