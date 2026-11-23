/**
 * Mounts the lazy 3D board. The SVG board is used only as an automatic fallback when WebGL is
 * unavailable, the 3D chunk fails to load, the scene throws, or the GPU context is lost.
 *
 * While the 3D chunk downloads, a neutral board-shaped placeholder is shown, never the SVG
 * board: using the SVG board as the Suspense fallback made the old 2.5D board flash (or sit for
 * seconds on slow connections) every time a game was started or resumed.
 */
import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import type { Board3DView } from './Board3DScene.tsx';
import { useI18n } from '../i18n/I18nProvider.tsx';

const loadScene = () => import('./Board3DScene.tsx');
const Board3DScene = lazy(loadScene);

/** Starts downloading the 3D board early (from the menu), so the game opens straight onto it. */
export function preloadBoard3D(): void {
  if (isWebGLAvailable()) void loadScene().catch(() => { /* The slot handles a failed load. */ });
}

let webglSupport: boolean | null = null;
export function isWebGLAvailable(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

class Board3DBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn('LifeTrack 3D board unavailable, using the 2D board.', error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Board-shaped placeholder shown for the moment the 3D chunk is still loading. */
function BoardLoading() {
  const { t } = useI18n();
  return <div className="board-3d board-3d-loading" data-renderer="3d-loading" role="status">
    <span className="board-loading-table" aria-hidden="true"/>
    <span className="board-loading-label">{t('board.loading')}</span>
  </div>;
}

export function Board3DSlot({ view, fallback, label }: { view: Board3DView; fallback: ReactNode; label: string }) {
  const [webgl] = useState(isWebGLAvailable);
  const [contextLost, setContextLost] = useState(false);
  if (!webgl || contextLost) return <>{fallback}</>;
  return <Board3DBoundary fallback={fallback}>
    <Suspense fallback={<BoardLoading/>}>
      <div className="board-3d" data-renderer="3d">
        <p className="sr-only">{label}</p>
        <Board3DScene view={view} onContextLost={() => setContextLost(true)}/>
      </div>
    </Suspense>
  </Board3DBoundary>;
}
