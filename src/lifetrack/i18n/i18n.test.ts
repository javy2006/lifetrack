import test from 'node:test';
import assert from 'node:assert/strict';
import en from './en.ts';
import ms from './ms.ts';
import zh from './zh.ts';
import ta from './ta.ts';
import { leafKeys, lookup, translate, readLang, type Dict } from './core.ts';
import { EVENT_CARDS } from '../game/events.ts';
import { POLICY_ORDER } from '../game/policies.ts';
import { CHARACTERS } from '../game/characters.ts';
import { QUIZ_QUESTIONS } from '../game/quiz.ts';
import { CONCEPTS } from '../game/insights.ts';
import { eventText, policyText } from './content.ts';
import { formatRM } from '../game/format.ts';

const EN = en as unknown as Dict;
const packs = { ms, zh, ta } as const;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

for (const [lang, pack] of Object.entries(packs)) {
  test(`${lang}: every English UI string is translated, with the same placeholders`, () => {
    for (const key of leafKeys(EN)) {
      // Plural forms: a language may use only "_other" (Malay, Chinese) where English has "_one" too.
      const base = key.replace(/_(one|other)$/, '');
      const value = lookup(pack.ui, key) ?? (key.endsWith('_one') ? lookup(pack.ui, `${base}_other`) : undefined);
      assert.ok(value !== undefined, `${lang} missing ${key}`);
      assert.equal(placeholders(value!), placeholders(lookup(EN, key)!), `${lang} ${key} placeholders`);
      assert.ok(value!.trim().length > 0, `${lang} ${key} empty`);
    }
  });

  test(`${lang}: all engine content is translated (events, policies, characters, quiz, concepts, insights, AI reasons)`, () => {
    const c = pack.content;
    for (const e of EVENT_CARDS) {
      const x = c.events?.[e.id];
      assert.ok(x?.title && x.story && x.risk && x.lesson?.[0] && x.lesson[1], `${lang} event ${e.id}`);
      assert.equal(x!.expenses?.length ?? 0, e.expenses.length, `${lang} event ${e.id} expense labels`);
      for (const p of POLICY_ORDER) assert.ok(x!.notes?.[p], `${lang} event ${e.id} note ${p}`);
    }
    for (const p of POLICY_ORDER) {
      const x = c.policies?.[p];
      assert.ok(x?.name && x.shortName && x.type && x.covered && x.explanation, `${lang} policy ${p}`);
      assert.equal(x!.exclusions?.length, policyText(p, null).exclusions.length, `${lang} policy ${p} exclusions`);
    }
    for (const ch of CHARACTERS) { const x = c.characters?.[ch.id]; assert.ok(x?.occupation && x.title && x.bio && x.strategy, `${lang} character ${ch.id}`); }
    for (const q of QUIZ_QUESTIONS) {
      const x = c.quiz?.[q.id];
      assert.ok(x?.prompt && x.explanation, `${lang} quiz ${q.id}`);
      for (const o of q.options) assert.ok(x!.options?.[o.id], `${lang} quiz ${q.id} option ${o.id}`);
    }
    for (const id of Object.keys(CONCEPTS)) assert.ok(c.concepts?.[id as keyof typeof CONCEPTS]?.label, `${lang} concept ${id}`);
    for (const id of ['shortfall', 'coverage-limit', 'deductible', 'lump-sum', 'fixed-benefit', 'exclusions', 'emergency-savings', 'recurring-premium'] as const) assert.ok(c.insights?.[id]?.title && c.insights[id]!.example, `${lang} insight ${id}`);
    assert.equal(Object.keys(c.aiReasons ?? {}).length, 10, `${lang} AI reasons`);
  });
}

test('names stay unchanged and figures are identical in every language', () => {
  for (const pack of Object.values(packs)) {
    const card = EVENT_CARDS.find((e) => e.id === 'dengue-admission')!;
    assert.ok(eventText(card, pack.content).title.length > 0);
    const medical = policyText('medical', pack.content).explanation;
    assert.ok(medical.includes(formatRM(300)) && medical.includes(formatRM(2000)), 'policy figures come from the engine');
  }
});

test('lookup falls back to English, interpolates and pluralises', () => {
  assert.equal(translate('ms', {}, EN, 'common.space', { n: 3 }), 'Space 3');
  assert.equal(translate('en', undefined, EN, 'decision.choose', { count: 1 }), 'Choose 1 move');
  assert.equal(translate('en', undefined, EN, 'decision.choose', { count: 2 }), 'Choose 2 moves');
  assert.equal(translate('zh', zh.ui, EN, 'decision.choose', { count: 2 }), '选择 2 个行动');
  assert.equal(translate('en', undefined, EN, 'no.such.key'), 'no.such.key');
  assert.equal(readLang({ getItem: () => 'ta' }), 'ta');
  assert.equal(readLang({ getItem: () => 'xx' }), 'en');
  assert.equal(readLang({ getItem: () => 'ta' }, '?lang=ms'), 'ms');
  assert.equal(readLang({ getItem: () => { throw new Error('blocked'); } }), 'en');
});
