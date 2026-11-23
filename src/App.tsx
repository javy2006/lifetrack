import { useEffect, useState, type ReactNode } from 'react';
import { GameProvider, useGame } from './lifetrack/hooks/useGame.tsx';
import { createSeed } from './lifetrack/game/rng.ts';
import type { CharacterId } from './lifetrack/game/types.ts';
import { MainMenu, InfoModal } from './lifetrack/screens/MainMenu.tsx';
import { CharacterSelection, GameIntroduction } from './lifetrack/screens/CharacterSelection.tsx';
import { GameScreen } from './lifetrack/screens/GameScreen.tsx';
import { HowToPlay } from './lifetrack/components/HowToPlay.tsx';
import { Disclaimer } from './lifetrack/components/ui.tsx';
import { AudioProvider } from './lifetrack/components/AudioControls.tsx';
import { preloadBoard3D } from './lifetrack/board3d/Board3DSlot.tsx';
import { I18nProvider, useI18n } from './lifetrack/i18n/I18nProvider.tsx';
import { DemoGame } from './lifetrack/demo/DemoGame.tsx';

type SetupScreen = 'home' | 'characters' | 'introduction' | 'demo';
function Application() {
  const { state, dispatch } = useGame();
  const { t } = useI18n();
  const [screen, setScreen] = useState<SetupScreen>('home');
  const [selected, setSelected] = useState<CharacterId>('aisyah');
  // Always land on the menu first; a validated save is resumed only on request.
  const [paused, setPaused] = useState(true);
  const [modal, setModal] = useState<'how'|'learning'|null>(null);
  // Fetch the 3D board while the player is on the menu, so the game opens straight onto it.
  useEffect(()=>{const w=window as Window&{requestIdleCallback?:(cb:()=>void)=>number};const id=w.requestIdleCallback?w.requestIdleCallback(preloadBoard3D):window.setTimeout(preloadBoard3D,800);return()=>{if(!w.requestIdleCallback)window.clearTimeout(id);};},[]);

  const startNew = () => {
    if (state && state.status !== 'complete' && !window.confirm(t('menu.confirmNew'))) return;
    if (state) dispatch({type:'game/clear'});
    setPaused(true);
    setScreen('characters');
  };
  const beginGame = () => { dispatch({type:'game/new',humanId:selected,seed:createSeed()}); setPaused(false); setScreen('home'); };
  let content: ReactNode;
  if (screen === 'demo') content = <DemoGame onExit={()=>setScreen('home')}/>;
  else if (state && !paused) content = <GameScreen key={`${state.seed}-${state.status}`} state={state} dispatch={dispatch} onExit={()=>{setScreen('home');setPaused(true)}}/>;
  else if (screen === 'characters') content = <CharacterSelection onBack={()=>setScreen('home')} onContinue={(id)=>{setSelected(id);setScreen('introduction')}}/>;
  else if (screen === 'introduction') content = <GameIntroduction characterId={selected} onBack={()=>setScreen('characters')} onBegin={beginGame}/>;
  else content = <MainMenu canResume={Boolean(state)} onPlay={()=>setPaused(false)} onNew={startNew} onHowToPlay={()=>setModal('how')} onLearning={()=>setModal('learning')} onDemo={()=>{setPaused(true);setScreen('demo');}}/>;

  return <>{content}{modal&&<InfoModal title={modal==='how'?t('howto.title'):t('menu.learningTitle')} onClose={()=>setModal(null)}>{modal==='how'?<HowToPlay/>:<><p>{t('menu.learningIntro')}</p><div className="learning-guide"><div><b>{t('menu.reimbursement')}</b><span>{t('menu.reimbursementText')}</span></div><div><b>{t('menu.fixedBenefit')}</b><span>{t('menu.fixedBenefitText')}</span></div><div><b>{t('menu.lumpSum')}</b><span>{t('menu.lumpSumText')}</span></div></div><p>{t('menu.learningOutro')}</p></>}<Disclaimer/></InfoModal>}</>;
}

export default function App() { return <I18nProvider><AudioProvider><GameProvider><Application/></GameProvider></AudioProvider></I18nProvider>; }
