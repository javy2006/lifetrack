import { useState, type ReactNode } from 'react';
import { GameProvider, useGame } from './lifetrack/hooks/useGame.tsx';
import { createSeed } from './lifetrack/game/rng.ts';
import type { CharacterId } from './lifetrack/game/types.ts';
import { MainMenu, InfoModal } from './lifetrack/screens/MainMenu.tsx';
import { CharacterSelection, GameIntroduction } from './lifetrack/screens/CharacterSelection.tsx';
import { GameScreen } from './lifetrack/screens/GameScreen.tsx';
import { Disclaimer } from './lifetrack/components/ui.tsx';
import { AudioProvider } from './lifetrack/components/AudioControls.tsx';

type SetupScreen = 'home' | 'characters' | 'introduction';
function Application() {
  const { state, dispatch } = useGame();
  const [screen, setScreen] = useState<SetupScreen>('home');
  const [selected, setSelected] = useState<CharacterId>('aisyah');
  // Always land on the menu first; a validated save is resumed only on request.
  const [paused, setPaused] = useState(true);
  const [modal, setModal] = useState<'how'|'learning'|null>(null);

  const startNew = () => {
    if (state && state.status !== 'complete' && !window.confirm('Starting a new game will replace your saved progress. Continue?')) return;
    if (state) dispatch({type:'game/clear'});
    setPaused(true);
    setScreen('characters');
  };
  const beginGame = () => { dispatch({type:'game/new',humanId:selected,seed:createSeed()}); setPaused(false); setScreen('home'); };
  let content: ReactNode;
  if (state && !paused) content = <GameScreen key={`${state.seed}-${state.status}`} state={state} dispatch={dispatch} onExit={()=>{setScreen('home');setPaused(true)}}/>;
  else if (screen === 'characters') content = <CharacterSelection onBack={()=>setScreen('home')} onContinue={(id)=>{setSelected(id);setScreen('introduction')}}/>;
  else if (screen === 'introduction') content = <GameIntroduction characterId={selected} onBack={()=>setScreen('characters')} onBegin={beginGame}/>;
  else content = <MainMenu canResume={Boolean(state)} onPlay={()=>setPaused(false)} onNew={startNew} onHowToPlay={()=>setModal('how')} onLearning={()=>setModal('learning')}/>;

  return <>{content}{modal&&<InfoModal title={modal==='how'?'How to play LifeTrack':'Insurance, in plain language'} onClose={()=>setModal(null)}>{modal==='how'?<><p>Move through six months, one decision at a time. Each month starts with income and essential expenses, then two action points for your choices.</p><ul className="modal-list"><li>Save RM300 to build your emergency cushion.</li><li>Explore fictional cover with clearly defined conditions and exclusions.</li><li>Confirm your decisions, reveal the shared event and review what each policy paid.</li><li>After month six, answer three questions and compare your financial resilience score.</li></ul></>:<><p>LifeTrack uses simplified fictional examples to show how different types of insurance benefits work.</p><div className="learning-guide"><div><b>Reimbursement</b><span>Pays eligible bills after a deductible, up to a limit.</span></div><div><b>Fixed benefit</b><span>Pays a set amount when the defined event occurs.</span></div><div><b>Lump sum</b><span>Pays one defined amount that can be used flexibly.</span></div></div><p>Policies only respond to what they define. Emergency savings remain useful for costs that are excluded or unrelated.</p></>}<Disclaimer/></InfoModal>}</>;
}

export default function App() { return <AudioProvider><GameProvider><Application/></GameProvider></AudioProvider>; }
