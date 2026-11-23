/**
 * Character pawn: a board-game miniature (Figure3D) that hops along the route.
 * Presentation only: eases toward the position it is given using refs, never React state.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import type { CharacterId } from '../game/types.ts';
import { PLAYER_COLOR, headingTowards, landingSquash, lerpAngle, pawnWorld, stepPawnTween, type PawnTween } from './boardWorld.ts';
import { geo, mat } from './kit3d.ts';
import { StaticBatch } from './StaticBatch.tsx';
import { viewAngles } from './camera.ts';
import { FIGURE_TOP, Figure } from './Figure3D.tsx';


/** Height of the turn marker above the base (just over the tallest figure). */
const MARKER_Y = FIGURE_TOP + 0.16;

export function Pawn3D({ id, index, positions, human, active, stepSeconds, reducedMotion }: { id: CharacterId; index: number; positions: Record<CharacterId, number>; human: boolean; active: boolean; stepSeconds: number; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const marker = useRef<Group>(null);
  const target = pawnWorld(index, id, positions);
  const tween = useRef<PawnTween>({ from: target, to: target, t: 1 });
  // Resting tokens turn to face the camera, whose angle depends on the screen shape.
  const size = useThree((state) => state.size);
  const restYaw = viewAngles(size.width / Math.max(1, size.height)).yaw;
  const yaw = useRef(restYaw);
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
    let wantYaw = restYaw;
    if (tween.current.t < 1) {
      const { from, to } = tween.current;
      const r = stepPawnTween(tween.current, delta, stepSeconds, reducedMotion);
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
    <group ref={body} rotation={[0, restYaw, 0]}><StaticBatch key={`${id}|${human}`}><Figure id={id} human={human}/></StaticBatch></group>
    <group ref={marker} position={[0, MARKER_Y, 0]} visible={active}>
      <mesh geometry={geo().gem} material={mat(PLAYER_COLOR[id], { emissive: PLAYER_COLOR[id], emissiveIntensity: 0.35 })} scale={[0.09, 0.12, 0.09]}/>
    </group>
  </group>;
}
