import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateResilienceScore, getResilienceStatus, rankScores } from '../scoring.ts';
import { getAiQuizCorrect } from '../quiz.ts';

const base = { id: 'aisyah' as const, controller: 'human' as const };

test('score = wealth x 0.60 + savings x 0.25 + learning x 0.15', () => {
  const s = calculateResilienceScore({ ...base, cash: 3000, savings: 3000 }, 3, 3);
  assert.equal(s.wealthScore, 75);
  assert.equal(s.wealthPoints, 45);
  assert.equal(s.savingsScore, 40);
  assert.equal(s.savingsPoints, 10);
  assert.equal(s.learningPoints, 15);
  assert.equal(s.total, 70);
});

test('component scores are capped at 100', () => {
  const s = calculateResilienceScore({ ...base, cash: 9000, savings: 8000 }, 3, 3);
  assert.equal(s.wealthPoints, 60);
  assert.equal(s.savingsPoints, 25);
  assert.equal(s.total, 100);
});

test('each correct answer adds one third of the learning score', () => {
  assert.deepEqual(
    [0, 1, 2, 3].map((n) => calculateResilienceScore({ ...base, cash: 0, savings: 0 }, n, 3).learningPoints),
    [0, 5, 10, 15],
  );
});

test('there is no bonus for owning insurance', () => {
  const insured = calculateResilienceScore({ ...base, cash: 2500, savings: 1800 }, 2, 3);
  const uninsured = calculateResilienceScore({ id: 'alex', controller: 'saver', cash: 2500, savings: 1800 }, 2, 3);
  assert.equal(insured.total, uninsured.total);
});

test('ranking breaks ties by financial position, then savings', () => {
  const a = calculateResilienceScore({ id: 'alex', controller: 'saver', cash: 1000, savings: 3000 }, 2, 3);
  const b = calculateResilienceScore({ id: 'meiling', controller: 'balanced', cash: 3000, savings: 3000 }, 2, 3);
  const ranked = rankScores([a, b]);
  assert.equal(ranked[0].playerId, 'meiling');
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2]);
});

test('each AI persona answers two of three review questions correctly', () => {
  assert.equal(getAiQuizCorrect('saver'), 2);
  assert.equal(getAiQuizCorrect('balanced'), 2);
  assert.equal(getAiQuizCorrect('protection'), 2);
});

test('resilience status grows with cash and savings', () => {
  assert.equal(getResilienceStatus({ ...base, cash: 2000, savings: 0 }).label, 'Getting started');
  assert.equal(getResilienceStatus({ ...base, cash: 5000, savings: 2400 }).label, 'Strong');
});
