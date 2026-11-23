import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../characters.ts';

test('official characters: display names, with internal ids unchanged for save compatibility', () => {
  assert.deepEqual(CHARACTERS.map((c) => [c.id, c.name, c.age]), [['alex', 'Alex', 24], ['meiling', 'Mei Ling', 26], ['daniel', 'Vikram', 27], ['aisyah', 'Aisyah', 23]]);
  assert.ok(!CHARACTERS.some((c) => /daniel/i.test(c.name)), 'no player-facing "Daniel"');
});
