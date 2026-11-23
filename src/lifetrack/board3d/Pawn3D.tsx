/**
 * Low-poly character pawn in each character's illustrated palette (CharacterArt).
 * Presentation only: eases toward the position it is given using refs, never React state.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import type { CharacterId } from '../game/types.ts';
import { CHARACTER_LOOKS } from '../components/CharacterArt.tsx';
import { PLAYER_COLOR, headingTowards, landingSquash, lerpAngle, pawnWorld, stepPawnTween, type PawnTween } from './boardWorld.ts';
import { geo, mat } from './kit3d.ts';

/** Resting pawns turn to face the isometric camera so faces stay readable. */
const REST_YAW = Math.PI / 4;
const FIGURE_SCALE = 1.3;
/** Height of the active-turn marker above the base. */
const MARKER_Y = 0.8;

type V3 = [number, number, number];
function Part({ g, m, p, s, r }: { g: keyof ReturnType<typeof geo>; m: string; p: V3; s: V3; r?: V3 }) {
  return <mesh geometry={geo()[g]} material={mat(m)} position={p} scale={s} rotation={r} castShadow/>;
}

/** The figure itself, ~0.65 units tall, facing +Z. */
function Figure({ id, human }: { id: CharacterId; human: boolean }) {
  const look = CHARACTER_LOOKS[id];
  const ink = '#24333b';
  return <group>
    {/* Base: player colour disc; the human player gets a red rim. */}
    <Part g="cyl" m={PLAYER_COLOR[id]} p={[0, 0.02, 0]} s={[0.22, 0.04, 0.22]}/>
    <Part g="ring" m={human ? '#c8102e' : '#ffffff'} p={[0, 0.042, 0]} s={[0.21, 0.21, 0.21]} r={[Math.PI / 2, 0, 0]}/>
    {/* The figure is scaled up from the base so characters read clearly at board zoom. */}
    <group scale={FIGURE_SCALE}>
    {/* Legs and shoes */}
    <Part g="box" m={look.pants} p={[-0.03, 0.105, 0]} s={[0.038, 0.13, 0.045]}/>
    <Part g="box" m={look.pants} p={[0.03, 0.105, 0]} s={[0.038, 0.13, 0.045]}/>
    <Part g="box" m="#263744" p={[-0.03, 0.05, 0.01]} s={[0.042, 0.022, 0.065]}/>
    <Part g="box" m="#263744" p={[0.03, 0.05, 0.01]} s={[0.042, 0.022, 0.065]}/>
    {/* Torso with accent collar/tie, and sleeves */}
    <Part g="cylLow" m={look.shirt} p={[0, 0.25, 0]} s={[0.14, 0.17, 0.11]}/>
    <Part g="box" m={look.accent} p={[0, 0.27, 0.052]} s={[0.022, 0.11, 0.012]}/>
    <Part g="box" m={look.shirt} p={[-0.082, 0.24, 0]} s={[0.032, 0.14, 0.04]} r={[0, 0, -0.18]}/>
    <Part g="box" m={look.shirt} p={[0.082, 0.24, 0]} s={[0.032, 0.14, 0.04]} r={[0, 0, 0.18]}/>
    <Part g="sphere" m={look.skin} p={[-0.094, 0.16, 0]} s={[0.034, 0.034, 0.034]}/>
    <Part g="sphere" m={look.skin} p={[0.094, 0.16, 0]} s={[0.034, 0.034, 0.034]}/>
    {/* Head and face */}
    <Part g="cylLow" m={look.skin} p={[0, 0.345, 0]} s={[0.04, 0.03, 0.04]}/>
    <Part g="sphere" m={look.skin} p={[0, 0.405, 0]} s={[0.15, 0.15, 0.145]}/>
    <Part g="sphere" m={ink} p={[-0.026, 0.41, 0.066]} s={[0.016, 0.02, 0.01]}/>
    <Part g="sphere" m={ink} p={[0.026, 0.41, 0.066]} s={[0.016, 0.02, 0.01]}/>
    {/* Hair per character */}
    {look.hairStyle === 'helmet' ? <>
      <Part g="dome" m="#e2ba58" p={[0, 0.425, 0]} s={[0.168, 0.15, 0.168]}/>
      <Part g="cyl" m="#e2ba58" p={[0, 0.43, 0.01]} s={[0.2, 0.012, 0.2]}/>
      <Part g="box" m="#f0d48b" p={[0, 0.49, 0]} s={[0.02, 0.012, 0.15]}/>
    </> : <Part g="dome" m={look.hair} p={[0, 0.418, -0.006]} s={[0.158, 0.13, 0.158]} r={[-0.25, 0, 0]}/>}
    {look.hairStyle === 'long' && <Part g="box" m={look.hair} p={[0, 0.35, -0.045]} s={[0.14, 0.16, 0.06]}/>}
    {look.hairStyle === 'wave' && <>
      <Part g="box" m={look.hair} p={[0, 0.37, -0.05]} s={[0.13, 0.1, 0.05]}/>
      <Part g="ring" m="#c8102e" p={[0, 0.445, 0]} s={[0.155, 0.155, 0.155]} r={[Math.PI / 2 - 0.25, 0, 0]}/>
    </>}
    {look.accessory === 'glasses' && <>
      <Part g="ring" m="#40535c" p={[-0.027, 0.41, 0.07]} s={[0.034, 0.03, 0.03]}/>
      <Part g="ring" m="#40535c" p={[0.027, 0.41, 0.07]} s={[0.034, 0.03, 0.03]}/>
    </>}
    {look.accessory === 'badge' && <Part g="cyl" m="#ffffff" p={[0.04, 0.29, 0.054]} s={[0.03, 0.006, 0.03]} r={[Math.PI / 2, 0, 0]}/>}
    {id === 'meiling' && <Part g="box" m="#f3d59f" p={[0, 0.322, 0.04]} s={[0.07, 0.014, 0.02]}/>}
    </group>
  </group>;
}

export function Pawn3D({ id, index, positions, human, active, reducedMotion }: { id: CharacterId; index: number; positions: Record<CharacterId, number>; human: boolean; active: boolean; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const marker = useRef<Group>(null);
  const target = pawnWorld(index, id, positions);
  const tween = useRef<PawnTween>({ from: target, to: target, t: 1 });
  const yaw = useRef(REST_YAW);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const g = group.current;
    const current = g ? { x: g.position.x, y: target.y, z: g.position.z } : target;
    tween.current = { from: current, to: target, t: 0 };
    invalidate();
  }, [target.x, target.z, target.y, invalidate]);
  useEffect(() => { invalidate(); }, [active, invalidate]);
  useFrame((state, delta) => {
    const g = group.current, b = body.current;
    if (!g || !b) return;
    let busy = false;
    let wantYaw = REST_YAW;
    if (tween.current.t < 1) {
      const { from, to } = tween.current;
      const r = stepPawnTween(tween.current, delta, undefined, reducedMotion);
      tween.current = r.tween;
      g.position.set(r.point.x, r.point.y, r.point.z);
      const [h, v] = reducedMotion ? [1, 1] : landingSquash(r.tween.t);
      b.scale.set(h, v, h);
      wantYaw = headingTowards(from, to, yaw.current);
      busy = !r.done;
    } else if (b.scale.y !== 1) b.scale.set(1, 1, 1);
    const nextYaw = reducedMotion ? wantYaw : lerpAngle(yaw.current, wantYaw, Math.min(1, delta * 14));
    if (Math.abs(nextYaw - yaw.current) > 1e-4) busy = true;
    yaw.current = nextYaw;
    b.rotation.y = nextYaw;
    const m = marker.current;
    if (m) {
      m.visible = active;
      if (active && !reducedMotion) {
        const t = state.clock.elapsedTime;
        m.position.y = MARKER_Y + Math.sin(t * 4) * 0.03;
        m.rotation.y = t * 1.6;
        busy = true;
      }
    }
    if (busy) invalidate();
  });
  return <group ref={group} position={[target.x, target.y, target.z]}>
    <group ref={body} rotation={[0, REST_YAW, 0]}><Figure id={id} human={human}/></group>
    <group ref={marker} position={[0, MARKER_Y, 0]} visible={active}>
      <mesh geometry={geo().gem} material={mat(PLAYER_COLOR[id], { emissive: PLAYER_COLOR[id], emissiveIntensity: 0.35 })} scale={[0.09, 0.12, 0.09]}/>
    </group>
  </group>;
}
