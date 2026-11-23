/**
 * Mounts the lazy 3D board with automatic fallback to the SVG board when WebGL
 * is unavailable, the chunk fails to load, or the scene throws.
 */
import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import type { Board3DView } from './Board3DScene.tsx';

const Board3DScene = lazy(() => import('./Board3DScene.tsx'));

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

class Board3DBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn('LifeTrack 3D board unavailable, using the 2D board.', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function Board3DSlot({ view, fallback, label }: { view: Board3DView; fallback: ReactNode; label: string }) {
  const [webgl] = useState(isWebGLAvailable);
  if (!webgl) return <>{fallback}</>;
  return <Board3DBoundary fallback={fallback}>
    <Suspense fallback={fallback}>
      <div className="board-3d" data-renderer="3d">
        <p className="sr-only">{label}</p>
        <Board3DScene view={view}/>
      </div>
    </Suspense>
  </Board3DBoundary>;
}
