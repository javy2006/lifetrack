/**
 * Dynamic content in every language: plays many seeded games through the real engine (every
 * character as the human, all 24 events reached) and renders every generated text the player can
 * see: event cards, claim outcome reasons, financial insights, AI decision descriptions. Checks that
 * nothing falls back to English and that every RM figure in the English text appears unchanged.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import en from './en.ts';
import ms from './ms.ts';
import zh from './zh.ts';
import ta from './ta.ts';
import { translate, type Dict, type Lang } from './core.ts';
import { aiTurnText, eventText, insightText, outcomeReason, type T } from './content.ts';
import { createNewGame, gameReducer, getAiTurnsForRound } from '../game/gameReducer.ts';
import { EVENT_CARDS } from '../game/events.ts';
import { CHARACTERS } from '../game/characters.ts';
import { getRoundSummary } from '../game/calculations.ts';
import { nextDemoStep } from '../demo/demoScript.ts';
import type { GameState } from '../game/types.ts';

const EN = en as unknown as Dict;
const PACKS = { ms, zh, ta } as const;
const tFor = (lang: Lang, ui?: Dict): T => (k, v) => translate(lang, ui, EN, k, v);
const tEn = tFor('en');
// Latin words allowed inside Chinese/Tamil text: names, currency, acronyms and proper nouns.
const ALLOW = /^(RM|AI|LRT|IV|UX|ER|LifeTrack|Alex|Mei|Ling|Vikram|Aisyah|Ipoh|KL|Kuala|Lumpur|vs)$/;
const money = (s: string) => (s.match(/RM\d(?:[\d,]*\d)?/g) ?? []).sort();

function playAll(): GameState[] {
  const games: GameState[] = [];
  for (const c of CHARACTERS) for (let seed = 1; seed <= 30; seed++) {
    let s = createNewGame(c.id, seed * 7919 + c.id.length);
    for (let guard = 0; guard < 500 && s.status !== 'complete'; guard++) {
      const step = nextDemoStep(s, null);
      if (step.kind !== 'dispatch') break;
      for (const a of step.actions) s = gameReducer(s, a)!;
    }
    assert.equal(s.status, 'complete');
    games.push(s);
  }
  return games;
}
const GAMES = playAll();

test('the sample covers all 24 events', () => {
  const seen = new Set(GAMES.flatMap((g) => g.players[0]!.history.map((r) => r.eventId)));
  for (const e of EVENT_CARDS) assert.ok(seen.has(e.id), `event ${e.id} reached`);
});

for (const [lang, pack] of Object.entries(PACKS) as [Lang, (typeof PACKS)[keyof typeof PACKS]][]) {
  test(`${lang}: every generated text is translated and keeps its RM figures`, () => {
    const t = tFor(lang, pack.ui), o = pack.content;
    const texts: { en: string; tr: string; where: string }[] = [];
    for (const g of GAMES) for (let round = 1; round <= 6; round++) {
      for (const turn of getAiTurnsForRound(g, round)) {
        const a = aiTurnText(turn, null, tEn), b = aiTurnText(turn, o, t);
        texts.push({ en: a.message, tr: b.message, where: `AI message ${turn.playerId} m${round}` });
        if (a.rationale) texts.push({ en: a.rationale, tr: b.rationale, where: `AI rationale "${a.rationale}"` });
      }
      for (const p of g.players) {
        const r = p.history[round - 1]!, ev = EVENT_CARDS.find((e) => e.id === r.eventId)!, claim = r.claim!;
        const premiums = getRoundSummary(p, round)?.premiums ?? 0;
        const ie = insightText(claim, ev, premiums, null), it = insightText(claim, ev, premiums, o);
        for (const k of ['title', 'explanation', 'example', 'takeaway'] as const) if (ie[k]) texts.push({ en: ie[k]!, tr: it[k] ?? '', where: `insight ${k} (${ev.id})` });
        for (const oc of claim.outcomes) texts.push({ en: outcomeReason(oc, ev, null, tEn), tr: outcomeReason(oc, ev, o, t), where: `outcome ${oc.policyId}/${oc.status} (${ev.id})` });
      }
    }
    for (const e of EVENT_CARDS) {
      const a = eventText(e, null), b = eventText(e, o);
      texts.push({ en: a.story, tr: b.story, where: `event story ${e.id}` }, { en: a.title, tr: b.title, where: `event title ${e.id}` });
      e.expenses.forEach((_, i) => texts.push({ en: a.expense(i), tr: b.expense(i), where: `event expense ${e.id}` }));
    }
    const problems = new Set<string>();
    for (const x of texts) {
      if (!x.tr.trim()) { problems.add(`empty: ${x.where}`); continue; }
      if (x.tr === x.en && /[a-z]{4,}/.test(x.en)) problems.add(`English: ${x.where}: ${x.en}`);
      if (lang !== 'ms') { const latin = (x.tr.match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !ALLOW.test(w)); if (latin.length) problems.add(`Latin words ${latin.join(',')}: ${x.where}`); }
      assert.deepEqual(money(x.tr), money(x.en), `${lang} figures changed in ${x.where}: "${x.en}" → "${x.tr}"`);
    }
    assert.deepEqual([...problems].slice(0, 10), [], `${problems.size} untranslated texts`);
    assert.ok(texts.length > 5000, `checked ${texts.length} texts`);
  });
}
