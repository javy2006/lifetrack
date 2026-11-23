import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PREFS, PREFS_KEY, readPrefs } from './audioPrefs.ts';

test('first visit: music and effects on at 100%', () => {
  assert.deepEqual(readPrefs(null), { enabled: true, musicOn: true, effectsOn: true, musicVolume: 1, effectsVolume: 1 });
  assert.equal(PREFS_KEY, 'lifetrack.audio.v3');
});

test('saved choices are kept; invalid values fall back to defaults', () => {
  const saved = { enabled: true, musicOn: false, effectsOn: true, musicVolume: 0.4, effectsVolume: 0.7 };
  assert.deepEqual(readPrefs(JSON.stringify(saved)), saved);
  assert.deepEqual(readPrefs(JSON.stringify({ musicVolume: 7, effectsVolume: 'loud', musicOn: 'no' })), { ...DEFAULT_PREFS, musicVolume: 1 });
  assert.deepEqual(readPrefs('{broken'), DEFAULT_PREFS);
});
