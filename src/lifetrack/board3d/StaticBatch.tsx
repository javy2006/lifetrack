/**
 * Merges the static meshes under it into one mesh per material (and shadow flags),
 * cutting the board's draw calls from hundreds to a few dozen. The original meshes
 * stay in the tree, hidden, so React still owns them. Children must be static: no
 * props that change after mount and no per-frame animation.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { Matrix4, Mesh, type BufferGeometry, type Group, type Material } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const KEPT_ATTRIBUTES = ['position', 'normal', 'uv'] as const;

/** Copy of a mesh geometry in batch space, reduced to the shared attribute set. */
function bakedPart(mesh: Mesh, toBatch: Matrix4): BufferGeometry | null {
  const part = mesh.geometry.clone();
  for (const name of Object.keys(part.attributes)) if (!KEPT_ATTRIBUTES.includes(name as never)) part.deleteAttribute(name);
  if (!KEPT_ATTRIBUTES.every((name) => part.getAttribute(name))) { part.dispose(); return null; }
  part.morphAttributes = {};
  part.clearGroups();
  return part.applyMatrix4(new Matrix4().multiplyMatrices(toBatch, mesh.matrixWorld));
}

export function StaticBatch({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const toBatch = group.matrixWorld.clone().invert();
    const buckets = new Map<string, { material: Material; cast: boolean; receive: boolean; parts: BufferGeometry[]; sources: Mesh[] }>();
    group.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material) || !mesh.visible) return;
      const key = `${mesh.material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${mesh.geometry.index ? 'i' : 'n'}`;
      const part = bakedPart(mesh, toBatch);
      if (!part) return;
      let bucket = buckets.get(key);
      if (!bucket) { bucket = { material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, parts: [], sources: [] }; buckets.set(key, bucket); }
      bucket.parts.push(part); bucket.sources.push(mesh);
    });
    const merged: Mesh[] = [], hidden: Mesh[] = [];
    for (const bucket of buckets.values()) {
      const geometry = bucket.parts.length > 1 ? mergeGeometries(bucket.parts, false) : null;
      bucket.parts.forEach((p) => p.dispose());
      if (!geometry) continue; // A single mesh (or an incompatible set) simply stays as it is.
      const mesh = new Mesh(geometry, bucket.material);
      mesh.castShadow = bucket.cast; mesh.receiveShadow = bucket.receive;
      mesh.matrixAutoUpdate = false;
      group.add(mesh); merged.push(mesh);
      bucket.sources.forEach((m) => { m.visible = false; hidden.push(m); });
    }
    invalidate();
    return () => {
      merged.forEach((m) => { group.remove(m); m.geometry.dispose(); });
      hidden.forEach((m) => { m.visible = true; });
    };
  }, [invalidate]);
  return <group ref={root}>{children}</group>;
}
