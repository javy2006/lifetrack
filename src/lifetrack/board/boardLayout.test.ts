import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoardSave } from './useBoardController.ts';
import { BOARD_ROUTE, createBoardProgress, getAiTurnOrder, getBoardSpaceIndex, getEventBoardCategory, isValidBoardProgress, moveBoardPlayer, movePosition, rollBoardDie, tokenOffset } from './boardTypes.ts';

test('board route has 24 spaces with all eight categories',()=>{
  assert.equal(BOARD_ROUTE.length,24);
  assert.deepEqual(new Set(BOARD_ROUTE.map(s=>s.category)),new Set(['salary','medical','accident','family','savings','protection','lucky','rest']));
});
test('phase mapping advances through the four monthly waypoints and wraps',()=>{
  assert.equal(getBoardSpaceIndex(1,'income'),0);
  assert.equal(getBoardSpaceIndex(1,'decisions'),1);
  assert.equal(getBoardSpaceIndex(1,'event'),2);
  assert.equal(getBoardSpaceIndex(1,'claims'),3);
  assert.equal(getBoardSpaceIndex(6,'summary'),23);
});
test('movement wraps the loop without changing route length',()=>{
  assert.equal(movePosition(22,4),2);
  assert.equal(movePosition(2,-3),23);
  assert.equal(movePosition(Number.NaN,2),0);
});
test('events map visually without altering the event model',()=>{
  assert.equal(getEventBoardCategory('critical-illness'),'medical');
  assert.equal(getEventBoardCategory('repair'),'accident');
  assert.equal(getEventBoardCategory('income'),'salary');
});
test('each player has an independent persisted board position',()=>{
  const ids=['alex','meiling','daniel','aisyah'] as const;
  const initial=createBoardProgress(712,1,ids);
  const moved=moveBoardPlayer(initial,'alex',4);
  assert.equal(moved.positions.alex,4);
  assert.equal(moved.positions.meiling,0);
  assert.equal(isValidBoardProgress(JSON.parse(JSON.stringify(moved)),712,ids),true);
  assert.equal(isValidBoardProgress(moved,13,ids),false);
});
test('seeded die stays within d6 and result equals movement distance',()=>{
  for(let seed=0;seed<100;seed++){
    const roll=rollBoardDie(seed,3,'alex');
    assert.ok(roll>=1&&roll<=6);
    const moved=moveBoardPlayer(createBoardProgress(seed,3,['alex','meiling','daniel','aisyah']), 'alex',roll);
    assert.equal(moved.positions.alex,roll);
    assert.equal(moved.lastMovement?.roll,roll);
  }
});
test('AI turn sequence contains each opponent once and excludes human',()=>{
  assert.deepEqual(getAiTurnOrder(['alex','aisyah','meiling','daniel'],'alex'),['aisyah','meiling','daniel']);
});
test('players sharing a space receive separate token offsets',()=>{
  const positions={alex:2,meiling:2,daniel:0,aisyah:2};
  const points=['alex','meiling','aisyah'].map(id=>tokenOffset(2,id as keyof typeof positions,positions));
  assert.equal(new Set(points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`)).size,3);
});
test('board progress resumes a completed human interaction without repeating finance',()=>{
  const ids=['alex','meiling','daniel','aisyah'] as const;
  const landed={...moveBoardPlayer(createBoardProgress(8,2,ids),'alex',5),stage:'human-landed' as const};
  const resumed=readBoardSave(JSON.stringify(landed),8,2,ids);
  assert.equal(resumed.positions.alex,5);
  assert.equal(resumed.stage,'human-landed');
  assert.equal(resumed.lastDiceRoll.alex,5);
});
