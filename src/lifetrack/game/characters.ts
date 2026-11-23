import type { CharacterId, Controller, StrategyId } from './types.ts';

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  pronouns: { subject: string; possessive: string };
  age: number;
  occupation: string;
  title: string;
  personality: string;
  bio: string;
  /** Strategy used when this character is an AI rival. Null means "adopts whichever strategy is left open". */
  nativeStrategy: StrategyId | null;
  strategyDescription: string;
}

export const CHARACTERS: readonly CharacterDefinition[] = [
  {
    id: 'alex',
    name: 'Alex',
    pronouns: { subject: 'he', possessive: 'his' },
    age: 24,
    occupation: 'Junior accountant',
    title: 'The Saver',
    personality: 'Careful and financially conservative.',
    bio: 'Tracks every ringgit and sleeps better with a cash cushion.',
    nativeStrategy: 'saver',
    strategyDescription: 'Builds emergency savings first and avoids recurring premiums unless they barely dent his cashflow.',
  },
  {
    id: 'meiling',
    name: 'Mei Ling',
    pronouns: { subject: 'she', possessive: 'her' },
    age: 26,
    occupation: 'UX designer',
    title: 'The Balanced Planner',
    personality: 'Practical and balanced.',
    bio: 'Plans ahead, but still leaves room for teh tarik with friends.',
    nativeStrategy: 'balanced',
    strategyDescription: 'Buys basic medical protection early, grows her savings every month and adds low-cost accident cover once savings are on track.',
  },
  {
    id: 'daniel',
    name: 'Vikram',
    pronouns: { subject: 'he', possessive: 'his' },
    age: 27,
    occupation: 'Site engineer',
    title: 'The Protection First',
    personality: 'Risk-conscious.',
    bio: 'Spots hazards on site every day, and plans for them at home too.',
    nativeStrategy: 'protection',
    strategyDescription: 'Buys protection against big shocks early and accepts having less cash on hand.',
  },
  {
    id: 'aisyah',
    name: 'Aisyah',
    pronouns: { subject: 'she', possessive: 'her' },
    age: 23,
    occupation: 'Marketing executive',
    title: 'The Adaptable',
    personality: 'Curious, quick-thinking and adaptable.',
    bio: 'New to working life and keen to find her own money style.',
    nativeStrategy: null,
    strategyDescription: 'Your call. As an AI rival, she takes on whichever strategy the others leave open.',
  },
];

export const STRATEGY_ORDER: readonly StrategyId[] = ['saver', 'balanced', 'protection'];

export function getCharacter(id: CharacterId): CharacterDefinition {
  const character = CHARACTERS.find((c) => c.id === id);
  if (!character) throw new Error(`Unknown LifeTrack character: ${id}`);
  return character;
}

/**
 * The human controls the chosen character. Every other character keeps its own
 * strategy, and a character without one adopts the strategy left open, so the
 * three AI strategies are always all present.
 */
export function assignControllers(humanId: CharacterId): Record<CharacterId, Controller> {
  const result = {} as Record<CharacterId, Controller>;
  const taken = new Set<StrategyId>();
  for (const character of CHARACTERS) {
    if (character.id === humanId) {
      result[character.id] = 'human';
    } else if (character.nativeStrategy) {
      result[character.id] = character.nativeStrategy;
      taken.add(character.nativeStrategy);
    }
  }
  const open = STRATEGY_ORDER.filter((strategy) => !taken.has(strategy));
  for (const character of CHARACTERS) {
    if (result[character.id]) continue;
    const strategy = open.shift();
    if (!strategy) throw new Error('No AI strategy available to assign');
    result[character.id] = strategy;
  }
  return result;
}
