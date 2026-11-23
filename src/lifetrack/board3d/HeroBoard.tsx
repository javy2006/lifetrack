/**
 * Homepage illustration: the live 3D city board (lazy, same chunk as the game board, so visiting
 * the menu also warms the game). A still image of the same scene is shown while it loads and is
 * the fallback when WebGL is unavailable or fails.
 */
import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { isWebGLAvailable } from './Board3DSlot.tsx';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { BOARD_ROUTE, tileKey } from '../board/boardTypes.ts';

const HeroScene = lazy(() => import('./Board3DScene.tsx').then((m) => ({ default: m.HeroScene })));

function Poster() {
  const [ok, setOk] = useState(true);
  return ok ? <img className="hero-poster" src={`${import.meta.env.BASE_URL}assets/hero/city.webp`} alt="" width={960} height={600} decoding="async" onError={() => setOk(false)}/> : <div className="hero-poster hero-poster-empty"/>;
}

class HeroBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn('LifeTrack homepage 3D view unavailable, showing the still image.', error); }
  render() { return this.state.failed ? <Poster/> : this.props.children; }
}

export function HeroBoard() {
  const [webgl] = useState(isWebGLAvailable);
  const { t, lang } = useI18n();
  const captions = lang === 'en' ? undefined : BOARD_ROUTE.map((_, i) => t(`tiles.${tileKey(i)}`));
  return <div className="hero-board" role="img" aria-label={t('menu.heroAria')}>
    {webgl ? <HeroBoundary><Suspense fallback={<Poster/>}><HeroScene captions={captions}/></Suspense></HeroBoundary> : <Poster/>}
  </div>;
}
