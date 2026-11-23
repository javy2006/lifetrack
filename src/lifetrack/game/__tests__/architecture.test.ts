import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const sources = (dir: string) => fs.readdirSync(path.join(root, dir)).filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts')).map((f) => path.join(root, dir, f));
const importsOf = (file: string) => [...fs.readFileSync(file, 'utf8').matchAll(/(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);

test('the financial engine stays independent of every presentation layer', () => {
  for (const file of sources('game')) {
    for (const spec of importsOf(file)) {
      assert.ok(spec.startsWith('./'), `${path.basename(file)} imports ${spec}: game/ may only import game/`);
    }
  }
});

test('3D presentation never imports the reducer function or dispatches financial actions', () => {
  for (const file of sources('board3d')) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!/\bgameReducer\b/.test(text), `${path.basename(file)} references gameReducer`);
    assert.ok(!/dispatch\s*\(/.test(text), `${path.basename(file)} dispatches an action`);
    assert.ok(!/\brollBoardDie\b|Math\.random/.test(text), `${path.basename(file)} must not roll dice or use randomness`);
  }
});
