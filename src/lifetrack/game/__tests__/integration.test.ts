import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, gameReducer } from '../gameReducer.ts';
import { QUIZ_QUESTIONS } from '../quiz.ts';
import { getQuizProgress } from '../../hooks/quizProgress.ts';
import { loadSavedGame, persistGame, type StorageLike } from '../../hooks/persistence.ts';
import { playFullGame } from './helpers.ts';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

test('integration: a complete reducer-driven game closes six rounds and finishes the quiz', () => {
  const { final } = playFullGame(20261122, 'meiling');
  assert.equal(final.status, 'complete');
  assert.equal(final.round, 6);
  assert.equal(final.players.length, 4);
  for (const player of final.players) {
    assert.equal(player.history.length, 6);
    assert.ok(player.history.every((month) => month.stage === 'closed' && month.eventId && month.claim));
  }
  assert.equal(Object.keys(final.quizAnswers).length, QUIZ_QUESTIONS.length);
});

test('save and resume restore the exact reducer phase and state', () => {
  const storage = new MemoryStorage();
  let state = createNewGame('aisyah', 42);
  state = gameReducer(state, { type: 'round/collect-income' })!;
  persistGame(storage, state);
  const resumed = loadSavedGame(storage);
  assert.deepEqual(resumed, state);
  assert.equal(resumed?.phase, 'expenses');
  assert.deepEqual(gameReducer(resumed, { type: 'round/pay-bills' })?.phase, 'decisions');
});

test('corrupt or invalid saves are discarded without blocking a new game', () => {
  const storage = new MemoryStorage();
  storage.setItem('lifetrack.game.v1', '{not-json');
  assert.equal(loadSavedGame(storage), null);
  assert.equal(storage.getItem('lifetrack.game.v1'), null);
  storage.setItem('lifetrack.game.v1', JSON.stringify({ schemaVersion: 999 }));
  assert.equal(loadSavedGame(storage), null);
  assert.equal(storage.getItem('lifetrack.game.v1'), null);
});

test('quiz resume shows submitted answers and continues at the first unanswered question', () => {
  const first = QUIZ_QUESTIONS[0]!;
  const third = QUIZ_QUESTIONS[2]!;
  const partial = getQuizProgress({ [first.id]: first.correctOptionId, [third.id]: 'a' });
  assert.equal(partial.answered.length, 2);
  assert.equal(partial.answered[0]?.selectedOption?.id, first.correctOptionId);
  assert.equal(partial.answered[0]?.question.explanation, first.explanation);
  assert.equal(partial.currentQuestion?.id, QUIZ_QUESTIONS[1]?.id);
  assert.equal(partial.allAnswered, false);

  const complete = getQuizProgress(Object.fromEntries(QUIZ_QUESTIONS.map((q) => [q.id, q.correctOptionId])));
  assert.equal(complete.currentQuestion, null);
  assert.equal(complete.allAnswered, true);
});
