import type { EventCard, PolicyId } from './types.ts';

const NOT_MEDICAL = 'Not a medical event.';
const NO_INJURY = 'Nobody was injured in an accident.';
const NOT_ILLNESS = 'Not the defined critical illness.';

function quietNotes(): Record<PolicyId, string> {
  return { medical: 'No claim this month.', accident: 'No claim this month.', critical: 'No claim this month.' };
}

const NO_TRIGGERS = { hospitalAdmission: false, specifiedAccidentalInjury: false, definedCriticalIllness: false };

/**
 * The LifeTrack event deck. Every cost, trigger and coverage condition is
 * configured here; the engine derives payouts from these values.
 */
export const EVENT_CARDS: readonly EventCard[] = [
  {
    id: 'dengue-admission',
    title: 'Dengue Fever',
    category: 'medical',
    riskLabel: 'Health risk',
    story:
      'After a week of heavy rain, a fever spikes and will not break. The clinic confirms dengue and you are admitted for three nights of monitoring and IV fluids.',
    expenses: [{ label: 'Hospital bill (3-night admission)', amount: 2500, kind: 'hospital' }],
    triggers: { ...NO_TRIGGERS, hospitalAdmission: true },
    coverageNotes: {
      medical: 'A hospital admission: eligible bills are reimbursed after the deductible, up to the coverage limit.',
      accident: 'An illness, not an accident.',
      critical: 'Dengue is not the defined critical illness in this game.',
    },
    lesson: {
      concept: 'coverage-limit',
      title: 'Deductibles and limits work together',
      text: 'Medical reimbursement starts after the deductible and stops at the coverage limit. Anything outside that range comes from your own money.',
    },
  },
  {
    id: 'road-accident',
    title: 'Road Accident',
    category: 'accident',
    riskLabel: 'Accident risk',
    story:
      'A car cuts into your lane on the morning commute. Your motorcycle skids and you fracture your forearm, which means an overnight hospital stay and minor surgery.',
    expenses: [{ label: 'Hospital treatment for the injury', amount: 2000, kind: 'hospital' }],
    triggers: { ...NO_TRIGGERS, hospitalAdmission: true, specifiedAccidentalInjury: true },
    coverageNotes: {
      medical: 'Hospital treatment for the injury is reimbursed under the usual deductible and limit.',
      accident: 'A specified accidental injury: the fixed benefit is paid on top of any reimbursement.',
      critical: 'An injury is not a critical illness.',
    },
    lesson: {
      concept: 'fixed-benefit',
      title: 'Two policies, two different jobs',
      text: 'Medical Protection reimburses part of the bill. Personal Accident pays a fixed amount because the accident happened. Both can respond to the same event.',
    },
  },
  {
    id: 'critical-illness',
    title: 'Critical Illness Diagnosis',
    category: 'critical-illness',
    riskLabel: 'Major illness risk',
    story:
      'Weeks of fatigue lead to tests, and the results confirm the critical illness defined in this game. Treatment goes well, but recovery means reduced hours and extra costs.',
    expenses: [
      { label: 'Recovery costs', amount: 800, kind: 'recovery' },
      { label: 'Reduced income during recovery', amount: 1200, kind: 'income-loss' },
    ],
    triggers: { ...NO_TRIGGERS, definedCriticalIllness: true },
    coverageNotes: {
      medical: 'These are recovery costs and lost income, not a hospital bill to reimburse.',
      accident: 'An illness, not an accident.',
      critical: 'The defined critical illness: a one-off lump sum is paid on diagnosis.',
    },
    lesson: {
      concept: 'lump-sum',
      title: 'Lump sum versus reimbursement',
      text: 'A critical illness benefit is paid as one amount on diagnosis. You decide how to use it, whether for recovery, rent or replacing lost income.',
    },
  },
  {
    id: 'family-emergency',
    title: 'Family Emergency',
    category: 'family',
    riskLabel: 'Family responsibility',
    story:
      'A flash flood swamps your parents’ kitchen back home. You send money straight away to help with urgent repairs and the clean-up.',
    expenses: [{ label: 'Urgent help for your family', amount: 1200, kind: 'family' }],
    triggers: NO_TRIGGERS,
    coverageNotes: { medical: NOT_MEDICAL, accident: NO_INJURY, critical: NOT_ILLNESS },
    lesson: {
      concept: 'emergency-savings',
      title: 'Why savings still matter',
      text: 'No policy in this game covers helping family. A cash buffer is what absorbs costs like this.',
    },
  },
  {
    id: 'job-loss',
    title: 'Temporary Job Loss',
    category: 'income',
    riskLabel: 'Income risk',
    story:
      'Your company pauses a big project and your contract hours are cut for the month. Rent and bills do not pause, so you cover the gap yourself.',
    expenses: [{ label: 'Lost income this month', amount: 1500, kind: 'income-loss' }],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: NOT_MEDICAL,
      accident: 'Not an accident.',
      critical: 'Not an illness. This game has no income-protection policy.',
    },
    lesson: {
      concept: 'emergency-savings',
      title: 'Income can stop, bills do not',
      text: 'There is no income-protection policy in this game. Emergency savings keep you steady when pay is disrupted.',
    },
  },
  {
    id: 'quiet-month',
    title: 'No Major Incident',
    category: 'calm',
    riskLabel: 'Steady month',
    story: 'Work is steady, everyone stays healthy and nothing breaks. A quiet month: the best kind.',
    expenses: [],
    triggers: NO_TRIGGERS,
    coverageNotes: quietNotes(),
    lesson: {
      concept: 'recurring-premium',
      title: 'Premiums keep running',
      text: 'Premiums are paid every month, even when nothing happens. Insurance manages uncertain risks; it is not a guaranteed return.',
    },
  },
  {
    id: 'food-poisoning',
    title: 'Food Poisoning',
    category: 'medical',
    riskLabel: 'Medical emergency',
    story:
      'A late-night seafood supper goes badly wrong. You end up in the emergency department and are admitted overnight on a drip.',
    expenses: [{ label: 'Hospital bill (overnight admission)', amount: 800, kind: 'hospital' }],
    triggers: { ...NO_TRIGGERS, hospitalAdmission: true },
    coverageNotes: {
      medical: 'A hospital admission: the deductible is paid first, then eligible costs are reimbursed.',
      accident: 'An illness, not an accident.',
      critical: NOT_ILLNESS,
    },
    lesson: {
      concept: 'deductible',
      title: 'You pay the first part',
      text: 'The deductible is the share of an eligible bill you cover before reimbursement starts. On smaller bills it makes up a big part of the cost.',
    },
  },
  {
    id: 'futsal-sprain',
    title: 'Futsal Sprain',
    category: 'accident',
    riskLabel: 'Minor accident',
    story:
      'A hard tackle at Thursday-night futsal and your ankle twists badly. The clinic straps it up, prescribes rest and sends you home.',
    expenses: [{ label: 'Clinic visit, X-ray and strapping (outpatient)', amount: 380, kind: 'outpatient' }],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: 'Outpatient treatment without a hospital admission is not covered by this game’s Medical Protection.',
      accident: 'A sprain is not one of the specified injuries in this game’s Personal Accident policy.',
      critical: 'An injury is not a critical illness.',
    },
    lesson: {
      concept: 'exclusions',
      title: 'Specified means specified',
      text: 'Personal Accident only pays for the injuries it lists. An accident alone is not enough; the injury must match the definition.',
    },
  },
  {
    id: 'family-clinic',
    title: 'Helping Mum',
    category: 'family',
    riskLabel: 'Family responsibility',
    story: 'Your mum needs a series of specialist clinic visits. You cover the cost so she does not have to delay treatment.',
    expenses: [{ label: 'Mum’s specialist visits', amount: 600, kind: 'family' }],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: 'Your policies protect you, the insured person, not family members.',
      accident: 'Not an accident.',
      critical: 'Not your illness.',
    },
    lesson: {
      concept: 'exclusions',
      title: 'Know who is covered',
      text: 'A policy only covers the insured person and the events it defines. Helping family comes from your own budget.',
    },
  },
  {
    id: 'motorcycle-repair',
    title: 'Motorcycle Breakdown',
    category: 'repair',
    riskLabel: 'Unexpected repair',
    story: 'Your motorcycle’s clutch gives out in the middle of rush-hour traffic. One tow and one repair later, your wallet is lighter.',
    expenses: [{ label: 'Tow and clutch repair', amount: 650, kind: 'repair' }],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: 'Health policies do not pay for vehicle repairs.',
      accident: NO_INJURY,
      critical: NOT_ILLNESS,
    },
    lesson: {
      concept: 'emergency-savings',
      title: 'Not every surprise is medical',
      text: 'Repairs are not covered by health or accident protection. Savings handle everyday surprises like this.',
    },
  },
  {
    id: 'wisdom-tooth',
    title: 'Wisdom Tooth Surgery',
    category: 'recovery',
    riskLabel: 'Recovery expenses',
    story: 'An impacted wisdom tooth finally has to go. Surgery, painkillers and three days of bubur later, the bill arrives.',
    expenses: [{ label: 'Dental surgery and recovery', amount: 700, kind: 'dental' }],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: 'Dental treatment is excluded from this game’s Medical Protection.',
      accident: 'Not an accident.',
      critical: NOT_ILLNESS,
    },
    lesson: {
      concept: 'exclusions',
      title: 'Read the exclusions',
      text: 'Medical Protection excludes dental treatment, so this bill is paid in full by you, even with a policy.',
    },
  },
  {
    id: 'festive-month',
    title: 'Festive Open House',
    category: 'calm',
    riskLabel: 'Steady month',
    story: 'Open houses, kuih and catching up with old friends. No surprises this month, just good food.',
    expenses: [],
    triggers: NO_TRIGGERS,
    coverageNotes: quietNotes(),
    lesson: {
      concept: 'recurring-premium',
      title: 'No claim, premiums still paid',
      text: 'Protection costs the same in calm months. Its value is in the months you cannot predict.',
    },
  },
  {
    id: 'aircond-repair',
    title: 'Aircond Breakdown',
    category: 'repair',
    riskLabel: 'Unexpected repair',
    story:
      'Halfway through a heatwave, the aircond in your rented room gives up. Your landlord splits the cost of a new compressor with you.',
    expenses: [{ label: 'Your share of the repair', amount: 450, kind: 'repair' }],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: 'Health policies do not pay for home repairs.',
      accident: NO_INJURY,
      critical: NOT_ILLNESS,
    },
    lesson: {
      concept: 'emergency-savings',
      title: 'Small shocks add up',
      text: 'A few hundred ringgit here and there is exactly what an emergency fund is for.',
    },
  },
  {
    id: 'back-strain',
    title: 'Back Strain Recovery',
    category: 'recovery',
    riskLabel: 'Recovery expenses',
    story: 'Months of hunching over a laptop catch up with you. Your doctor recommends six physiotherapy sessions.',
    expenses: [{ label: 'Physiotherapy sessions (outpatient)', amount: 480, kind: 'outpatient' }],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: 'Outpatient physiotherapy without a hospital admission is not covered.',
      accident: 'A gradual strain is not a specified accident.',
      critical: NOT_ILLNESS,
    },
    lesson: {
      concept: 'exclusions',
      title: 'Conditions matter',
      text: 'Medical Protection here only reimburses eligible hospital admissions. Outpatient therapy comes from your own budget.',
    },
  },
  {
    id: 'steady-month',
    title: 'Smooth Sailing',
    category: 'calm',
    riskLabel: 'Steady month',
    story: 'Your LRT commute runs on time, your team ships a project and nothing goes wrong. A calm month to catch your breath.',
    expenses: [],
    triggers: NO_TRIGGERS,
    coverageNotes: quietNotes(),
    lesson: {
      concept: 'recurring-premium',
      title: 'Calm months still cost premiums',
      text: 'Insurance is paid for in advance, month after month. Calm months are part of the deal.',
    },
  },
  {
    id: 'sibling-fees',
    title: 'Sister’s University Fees',
    category: 'family',
    riskLabel: 'Family responsibility',
    story: 'Your younger sister starts university. You chip in for her registration fees and first-semester books.',
    expenses: [{ label: 'Registration fees and books', amount: 500, kind: 'family' }],
    triggers: NO_TRIGGERS,
    coverageNotes: { medical: NOT_MEDICAL, accident: 'Not an accident.', critical: NOT_ILLNESS },
    lesson: {
      concept: 'emergency-savings',
      title: 'Family costs come from your budget',
      text: 'Supporting family is a common money commitment for young Malaysians. Savings let you help without strain.',
    },
  },
  {
    id: 'phone-screen',
    title: 'Cracked Phone Screen',
    category: 'repair',
    riskLabel: 'Unexpected repair',
    story:
      'Your phone slips out of your hand at the LRT station and lands face-down. Work chats, maps and banking all live on it, so the repair cannot wait.',
    expenses: [{ label: 'Screen replacement', amount: 350, kind: 'repair' }],
    triggers: NO_TRIGGERS,
    coverageNotes: { medical: 'Health policies do not pay for gadget repairs.', accident: NO_INJURY, critical: NOT_ILLNESS },
    lesson: {
      concept: 'emergency-savings',
      title: 'Everyday breakages',
      text: 'Small, frequent costs are the most common emergencies. Savings handle them without stress.',
    },
  },
  {
    id: 'wedding-season',
    title: 'Wedding Season',
    category: 'family',
    riskLabel: 'Social commitments',
    story:
      'Three friends get married in the same month. Between angpow, duit salam, new outfits and a road trip to Ipoh, the costs stack up.',
    expenses: [{ label: 'Gifts, outfits and travel', amount: 400, kind: 'family' }],
    triggers: NO_TRIGGERS,
    coverageNotes: { medical: NOT_MEDICAL, accident: 'Not an accident.', critical: NOT_ILLNESS },
    lesson: {
      concept: 'emergency-savings',
      title: 'Costs you can see coming',
      text: 'Some costs are predictable but irregular. Setting money aside makes them painless.',
    },
  },
  {
    id: 'moving-out',
    title: 'Moving Out',
    category: 'repair',
    riskLabel: 'Housing cost',
    story:
      'Your landlord sells the unit and gives you a month of notice. A deposit top-up and a lorry for the move are not optional.',
    expenses: [{ label: 'Deposit top-up and movers', amount: 900, kind: 'household' }],
    triggers: NO_TRIGGERS,
    coverageNotes: { medical: NOT_MEDICAL, accident: NO_INJURY, critical: NOT_ILLNESS },
    lesson: {
      concept: 'emergency-savings',
      title: 'Housing surprises',
      text: 'Rental changes can bring sudden costs. A buffer gives you choices instead of pressure.',
    },
  },
  {
    id: 'bad-flu',
    title: 'Bad Flu',
    category: 'recovery',
    riskLabel: 'Recovery expenses',
    story:
      'A nasty flu flattens you for a week. Clinic visits and medicine add up, and your weekend freelance gig pauses while you recover.',
    expenses: [
      { label: 'Clinic visits and medicine (outpatient)', amount: 180, kind: 'outpatient' },
      { label: 'Missed freelance income', amount: 200, kind: 'income-loss' },
    ],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: 'Outpatient clinic visits without a hospital admission are not covered.',
      accident: 'An illness, not an accident.',
      critical: NOT_ILLNESS,
    },
    lesson: {
      concept: 'exclusions',
      title: 'Not every illness is a claim',
      text: 'This game’s Medical Protection only responds to hospital admissions. Everyday illness is paid from your own budget.',
    },
  },
  {
    id: 'er-visit',
    title: 'Late-Night ER Visit',
    category: 'medical',
    riskLabel: 'Medical emergency',
    story:
      'Sharp stomach pain sends you to the emergency department at 2am. Tests rule out anything serious and you are discharged before sunrise.',
    expenses: [{ label: 'Emergency department visit (no admission)', amount: 350, kind: 'outpatient' }],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: 'You were treated and discharged without an admission, so this game’s Medical Protection does not apply.',
      accident: 'An illness, not an accident.',
      critical: NOT_ILLNESS,
    },
    lesson: {
      concept: 'exclusions',
      title: 'Conditions decide the claim',
      text: 'Medical Protection here needs a hospital admission. Being treated and sent home is paid by you.',
    },
  },
  {
    id: 'unpaid-leave',
    title: 'Caring for Grandma',
    category: 'income',
    riskLabel: 'Income risk',
    story:
      'Your grandmother needs help at home after a fall, so you take a week of unpaid leave to look after her.',
    expenses: [{ label: 'Unpaid leave', amount: 700, kind: 'income-loss' }],
    triggers: NO_TRIGGERS,
    coverageNotes: {
      medical: 'Your policies cover you, not family members.',
      accident: 'The fall was not your injury.',
      critical: NOT_ILLNESS,
    },
    lesson: {
      concept: 'exclusions',
      title: 'Policies cover the insured person',
      text: 'Caring for family can cost you income, and none of your policies respond to someone else’s injury.',
    },
  },
  {
    id: 'appendicitis',
    title: 'Appendicitis',
    category: 'medical',
    riskLabel: 'Medical emergency',
    story:
      'A dull ache turns sharp by evening. Scans confirm appendicitis and you are rushed into keyhole surgery, followed by two nights on the ward.',
    expenses: [{ label: 'Surgery and 2-night admission', amount: 1800, kind: 'hospital' }],
    triggers: { ...NO_TRIGGERS, hospitalAdmission: true },
    coverageNotes: {
      medical: 'A hospital admission: eligible bills are reimbursed after the deductible, up to the coverage limit.',
      accident: 'An illness, not an accident.',
      critical: 'Appendicitis is not the defined critical illness in this game.',
    },
    lesson: {
      concept: 'deductible',
      title: 'Within the limit, after the deductible',
      text: 'When a bill sits under the coverage limit, the deductible is the only part of the eligible bill you pay.',
    },
  },
  {
    id: 'healthy-month',
    title: 'Healthy Habits',
    category: 'calm',
    riskLabel: 'Steady month',
    story: 'You finally stick to a gym routine and cook at home more often. No surprises, just a good month.',
    expenses: [],
    triggers: NO_TRIGGERS,
    coverageNotes: quietNotes(),
    lesson: {
      concept: 'recurring-premium',
      title: 'Nothing to claim, by design',
      text: 'Most months bring no claim at all. Premiums are the price of being prepared for the months that do.',
    },
  },
];

const EVENTS_BY_ID: ReadonlyMap<string, EventCard> = new Map(EVENT_CARDS.map((card) => [card.id, card]));

export function getEvent(eventId: string): EventCard {
  const card = EVENTS_BY_ID.get(eventId);
  if (!card) throw new Error(`Unknown LifeTrack event: ${eventId}`);
  return card;
}

export function hasEvent(eventId: string): boolean {
  return EVENTS_BY_ID.has(eventId);
}
