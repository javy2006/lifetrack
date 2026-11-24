import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterId, GameState } from '../game/types.ts';
import { getBoardTiming, prefersReducedMotion, type TurnTiming } from './boardTiming.ts';
import { createBoardProgress, isValidBoardProgress, moveBoardPlayer, movePosition, reconcileBoardProgress, rollBoardDie, type BoardProgress } from './boardTypes.ts';

import { getTurnOrder, remainingRivalTurns, turnsBeforeHuman } from './turnOrder.ts';

export const BOARD_SAVE_KEY='lifetrack.board.v1';
const wait=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms));

export function readBoardSave(raw:string|null,seed:number,round:number,ids:readonly CharacterId[]):BoardProgress {
  try { const parsed:unknown=raw===null?null:JSON.parse(raw);if(isValidBoardProgress(parsed,seed,ids))return parsed; } catch { /* Discard malformed board-only saves. */ }
  return createBoardProgress(seed,round,ids);
}

/**
 * Options: `persist: false` keeps board progress in memory only (presentation demo, so a demo can
 * never touch the player's saved board); `speed` divides every animation delay (presentation
 * speed). Neither affects the seeded rolls, positions or anything financial.
 */
export interface BoardControllerOptions { persist?:boolean; speed?:number }

export function useBoardController(state:GameState|null, options:BoardControllerOptions={}) {
  const persist=options.persist!==false;
  const speedRef=useRef(options.speed??1);speedRef.current=Math.max(0.25,options.speed??1);
  // While true, the remaining delays of the current turn are skipped (demo "skip animation").
  const skipRef=useRef(false);
  const pace=useCallback((ms:number)=>skipRef.current?0:Math.round(ms/speedRef.current),[]);
  const seed=state?.seed??0,round=state?.round??1;
  const ids=useMemo(()=>state?.players.map(p=>p.id)??[],[state?.players]);
  /** Fixed for the whole game: derived from the seed, so a reload gets the same order (no redraw). */
  const order=useMemo(()=>getTurnOrder(seed,ids),[seed,ids]);
  const [progress,setProgress]=useState<BoardProgress|null>(()=>{
    if(!state)return null;
    if(!persist)return createBoardProgress(state.seed,state.round,state.players.map(p=>p.id));
    try{return readBoardSave(localStorage.getItem(BOARD_SAVE_KEY),state.seed,state.round,state.players.map(p=>p.id));}catch{return createBoardProgress(state.seed,state.round,state.players.map(p=>p.id));}
  });
  const [rolling,setRolling]=useState(false);
  /** Die shown on the board: tumbling with its value hidden, then the decided value. */
  const [dieTumbling,setDieTumbling]=useState(false);
  const [dieValue,setDieValue]=useState<number|null>(null);
  /** Space the last mover landed on; drives landing feedback until the next roll. */
  const [landing,setLanding]=useState<{playerId:CharacterId;space:number}|null>(null);
  const [stepMs,setStepMs]=useState(getBoardTiming(false).human.stepMs);
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
    if(!progress||!persist)return;
    try{localStorage.setItem(BOARD_SAVE_KEY,JSON.stringify(progress));}catch{/* Game remains playable without board progress storage. */}
  },[progress,persist]);
  /**
   * Shows one already-decided roll: tumble, reveal, one hop per space, then a rest on the
   * landing space. Progress is committed by the caller only after this resolves, so a reload
   * mid-animation simply replays the same seeded roll instead of moving twice.
   */
  const animateTurn=useCallback(async(id:CharacterId,from:number,roll:number,timing:TurnTiming)=>{
    setStepMs(pace(timing.stepMs));setLanding(null);setDieValue(null);
    if(timing.tumbleMs>0&&pace(timing.tumbleMs)>0){setDieTumbling(true);await wait(pace(timing.tumbleMs));}
    setDieTumbling(false);setDieValue(roll);
    await wait(pace(timing.revealMs));
    let position=from;
    for(let step=0;step<roll;step++){position=movePosition(position,1);setMovementStep({playerId:id,position});await wait(pace(timing.stepMs));}
    setLanding({playerId:id,space:position});
    await wait(pace(timing.landMs));
    skipRef.current=false;
  },[pace]);
  /** Finishes the turn currently animating immediately (positions are still applied step by step). */
  const skipAnimation=useCallback(()=>{skipRef.current=true;},[]);
  /** Rivals who still have to move before the human may roll this month. */
  const pendingBefore=state&&progress?turnsBeforeHuman(order,state.humanId,progress.moved??[]):[];
  const rollHuman=useCallback(async()=>{
    if(!state||state.status!=='playing'||state.phase!=='decisions'||!progress||progress.stage!=='human-roll'||rollLock.current)return;
    if(turnsBeforeHuman(order,state.humanId,progress.moved??[]).length>0)return; // not the human's turn yet
    rollLock.current=true;setRolling(true);
    const id=state.humanId,roll=rollBoardDie(state.seed,state.round,id);
    await animateTurn(id,progress.positions[id],roll,getBoardTiming(prefersReducedMotion()).human);
    setProgress(p=>p?{...moveBoardPlayer(p,id,roll),stage:'human-landed',activePlayer:null}:p);
    setMovementStep(null);setRolling(false);rollLock.current=false;
  },[state,progress,animateTurn,order]);
  /** Moves the rivals who come before the human in the turn order (decisions phase, before the human's roll). */
  const runPreTurns=useCallback(async()=>{
    if(!state||state.status!=='playing'||state.phase!=='decisions'||!progress||!['human-roll','pre-turns'].includes(progress.stage)||aiLock.current)return;
    let queue=turnsBeforeHuman(order,state.humanId,progress.moved??[]);
    if(!queue.length){if(progress.stage==='pre-turns')setProgress(p=>p?{...p,stage:'human-roll',activePlayer:null}:p);return;}
    aiLock.current=true;
    const timing=getBoardTiming(prefersReducedMotion()).ai;
    setProgress(p=>p?{...p,stage:'pre-turns',aiQueue:queue}:p);
    while(queue.length){
      const id=queue[0]!;setProgress(p=>p?{...p,activePlayer:id}:p);
      const roll=rollBoardDie(state.seed,state.round,id);
      await animateTurn(id,progress.positions[id],roll,timing);
      setProgress(p=>p?{...moveBoardPlayer(p,id,roll),stage:'pre-turns',aiQueue:queue.slice(1),activePlayer:null}:p);
      setMovementStep(null);
      queue=queue.slice(1);
    }
    setProgress(p=>p?{...p,stage:'human-roll',aiQueue:[],activePlayer:null}:p);
    aiLock.current=false;
  },[state,progress,animateTurn,order]);
  const runAiTurns=useCallback(async()=>{
    if(!state||!progress||!['pre-turns','human-roll','human-landed','ai-turns'].includes(progress.stage)||aiLock.current)return;
    aiLock.current=true;
    const timing=getBoardTiming(prefersReducedMotion()).ai;
    // Every rival who has not moved this month, in turn order (after the human; or all of them if the board save was lost).
    let queue=progress.stage==='ai-turns'&&progress.aiQueue.length?progress.aiQueue:remainingRivalTurns(order,state.humanId,progress.moved??[]);
    setProgress(p=>p?{...p,stage:'ai-turns',aiQueue:queue}:p);
    while(queue.length){
      const id=queue[0]!;setProgress(p=>p?{...p,activePlayer:id}:p);
      const roll=rollBoardDie(state.seed,state.round,id);
      await animateTurn(id,progress.positions[id],roll,timing);
      setProgress(p=>p?{...moveBoardPlayer(p,id,roll),stage:'ai-turns',aiQueue:queue.slice(1),activePlayer:null}:p);
      setMovementStep(null);
      queue=queue.slice(1);
    }
    setProgress(p=>p?{...p,stage:'complete',aiQueue:[],activePlayer:null}:p);
    aiLock.current=false;
  },[state,progress,animateTurn,order]);
  return {progress,rolling,movementStep,dieTumbling,dieValue,landing,stepMs,rollHuman,runAiTurns,runPreTurns,pendingBefore:pendingBefore.length,order,skipAnimation};
}
