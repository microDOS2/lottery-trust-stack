// Questions about the life, the worries, and the options. Now, soon, and later.
// Each answer states the outcome of that choice. No plan names. No allocation splits.
import { computeStack, PPLI_QP_MIN, type Assumptions, type Inputs, type StackResult } from './calc';

export interface GoalProfile {
  income: number;
  growth: number;
  protection: number;
  mobility: number;
  legacy: number;
  simplicity: number;
}

export type TimeGroup = 'now' | 'soon' | 'later';

export interface QuizQuestion {
  id: string;
  group: TimeGroup;
  text: string;
  why: string;
  options: Array<{ label: string; note: string; weights: Partial<GoalProfile> }>;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'claim', group: 'now',
    text: 'The amount you typed. Is that the lottery check before tax, or what is already left after tax?',
    why: 'The result cannot be calculated until this is known.',
    options: [
      { label: 'The lottery check, before tax', note: 'Tax still comes off. Only what is left can pay for the life.', weights: {} },
      { label: 'What is already left after tax', note: 'Nothing more is taken off for prize tax.', weights: {} },
    ],
  },
  {
    id: 'filing', group: 'now',
    text: 'Who is on the tax return?',
    why: 'The tax estimate changes if another person is on it.',
    options: [
      { label: 'Only me', note: 'The estimate uses one person.', weights: {} },
      { label: 'Me and another person', note: 'The estimate uses two people on the return.', weights: {} },
    ],
  },
  {
    id: 'worry', group: 'now',
    text: 'What worries you about this money right now?',
    why: 'The worry is part of the decision. The result has to answer it, not ignore it.',
    options: [
      { label: 'That I will run out, or spend it faster than I mean to', note: 'The result checks whether the yearly amount you want can be paid without the money running out.', weights: { income: 1 } },
      { label: 'That people will find out, ask, or target me', note: 'A trust can keep a name off a house, a car, or a court paper. It does not hide the money from the tax office.', weights: { protection: 1 } },
      { label: 'The tax bill', note: 'The tax on the lottery check is calculated from the amount you typed and the state you live in. Moving later does not change that tax.', weights: {} },
      { label: 'Nothing in particular', note: 'No extra step is added by this answer.', weights: {} },
    ],
  },
  {
    id: 'live', group: 'soon',
    text: 'Where do you want to live?',
    why: 'Where you live can change the tax on money you earn later. It does not change the tax on the lottery check.',
    options: [
      { label: 'The state I live in now', note: 'Later investment income stays taxed there. The lottery check is taxed there either way.', weights: { mobility: 0 } },
      { label: 'A different state', note: 'Only income after you actually move is affected. The lottery check is still taxed in the state you live in now.', weights: { mobility: 1 } },
      { label: 'Puerto Rico, and I would actually live there more than half the year', note: 'Later investment gains can be treated under the Puerto Rico rules. The lottery check is still taxed. A house you do not live in does not count.', weights: { mobility: 1 } },
      { label: 'A Puerto Rico address, but I would be traveling or on a boat most of the year', note: 'That does not qualify. Days on a boat or in other places do not count as days in Puerto Rico. The tax break does not apply. The lottery check is taxed the same either way.', weights: { mobility: 0.2 } },
      { label: 'Another country, and I would keep my US passport', note: 'You still pay US tax. The lottery money and later investment gains are not treated like wages from a job overseas. The state you leave can still tax you if you have not really moved your life.', weights: { mobility: 0.6 } },
    ],
  },
  {
    id: 'piece', group: 'soon',
    text: 'Is there something you want to pay for from this money in the next stretch of time?',
    why: 'A home, a boat, a business, or a rental is cash that is not invested. You type the dollars. Nothing moves until you do.',
    options: [
      { label: 'No', note: 'Nothing extra is taken out.', weights: {} },
      { label: 'A home', note: 'Type the dollars in the home box. That amount is not invested.', weights: {} },
      { label: 'A business, a rental, or something else', note: 'Type the dollars in the box below. That amount is not invested.', weights: {} },
    ],
  },
  {
    id: 'cbi', group: 'later',
    text: 'Do you want a passport from another country?',
    why: 'People want this for two different reasons. Only one of them is real.',
    options: [
      { label: 'No', note: 'Nothing changes.', weights: {} },
      { label: 'Yes. I want another place I am allowed to live, and easier travel', note: 'That can be real. It does not change the tax you owe the United States. The lottery money is still taxed.', weights: {} },
      { label: 'Yes. I think it will lower my US tax', note: 'It will not. A new passport does not turn off US tax. The tax continues until you give up US citizenship. That is a different decision.', weights: {} },
    ],
  },
  {
    id: 'renounce', group: 'later',
    text: 'Do you want to give up US citizenship?',
    why: 'This is the step that ends US tax on money from anywhere. It has its own tax.',
    options: [
      { label: 'No', note: 'US tax continues.', weights: {} },
      { label: 'I want to see the cost before I decide', note: 'The cost can be estimated once you type what your assets would sell for and what you paid. It is not treated as something you undo.', weights: {} },
      { label: 'Yes', note: 'Type what the assets would sell for and what you paid. The tax is on the gain above the exclusion. Later gifts to people in the United States can also be taxed.', weights: {} },
    ],
  },
  {
    id: 'gone', group: 'later',
    text: 'If you were not here in 10 years, what do you want to be true about the money?',
    why: 'You may not be alive in 10 years. A larger amount in 25 years is not the result that matters.',
    options: [
      { label: 'I have not decided', note: 'The result still shows what would be left at 10 years. No further step is added.', weights: { legacy: 0.2 } },
      { label: 'Someone else should receive what is left', note: 'A trust can be written for that. Answering here does not write it. Amounts above $15 million per person can face estate tax if the money is still in your estate.', weights: { legacy: 1 } },
      { label: 'I want it harder for a lawsuit, or for people asking, to reach what is left', note: 'A trust in the United States can slow a lawsuit and keep a name off a deed. It does not hide the money from the tax office. A foreign trust does not either.', weights: { protection: 1 } },
    ],
  },
];

export const QUIZ_NOW = ['claim', 'filing', 'worry'] as const;
export const QUIZ_SOON = ['live', 'piece'] as const;
export const QUIZ_LATER = ['cbi', 'renounce', 'gone'] as const;

export function profileFromAnswers(answers: Record<string, number>): GoalProfile {
  const acc: GoalProfile = { income: 1, growth: 0, protection: 0, mobility: 0, legacy: 0, simplicity: 0 };
  const max: GoalProfile = { income: 1, growth: 0, protection: 0, mobility: 0, legacy: 0, simplicity: 0 };
  for (const q of QUIZ) {
    const idx = answers[q.id];
    if (idx === undefined) continue;
    const chosen = q.options[idx]?.weights ?? {};
    const peak: GoalProfile = { income: 0, growth: 0, protection: 0, mobility: 0, legacy: 0, simplicity: 0 };
    for (const opt of q.options) {
      for (const k of Object.keys(peak) as (keyof GoalProfile)[]) peak[k] = Math.max(peak[k], opt.weights[k] ?? 0);
    }
    for (const k of Object.keys(acc) as (keyof GoalProfile)[]) {
      acc[k] += chosen[k] ?? 0;
      max[k] += peak[k];
    }
  }
  for (const k of Object.keys(acc) as (keyof GoalProfile)[]) acc[k] = max[k] > 0 ? acc[k] / max[k] : 0;
  acc.growth = 0;
  return acc;
}

export interface Recommendation {
  dial: number;
  residency: Inputs['residency'];
  spend: number | null;
  filing: Inputs['filing'] | null;
  basis: Inputs['basis'] | null;
  notes: string[];
}

export function recommend(_p: GoalProfile, answers: Record<string, number> = {}): Recommendation {
  const live = answers.live;
  const residency: Inputs['residency'] = live === 2 ? 'pr' : live === 1 ? 'move' : 'stay';
  const filing: Inputs['filing'] | null = answers.filing === undefined ? null : answers.filing === 1 ? 'mfj' : 'single';
  const basis: Inputs['basis'] | null = answers.claim === undefined ? null : answers.claim === 1 ? 'net' : 'gross';
  return { dial: 50, residency, spend: null, filing, basis, notes: [] };
}

export interface ScenarioScore {
  total: number;
  parts: Array<{ label: string; score: number; weight: number }>;
}

export function scoreScenario(
  inputs: Inputs,
  result: StackResult,
  profile: GoalProfile,
  _allResults: StackResult[],
): ScenarioScore {
  const spend = Math.max(1, inputs.spend);
  const sustainFit = result.capacity >= spend ? 1 : result.capacity / spend;
  const dry = result.depletedYear !== null && result.depletedYear <= 10 ? 0 : 1;
  const dims: Array<{ label: string; score: number; weight: number }> = [
    { label: 'Pays for the life', score: sustainFit, weight: 1 },
    { label: 'Still there if you die in 10 years', score: dry, weight: 0.6 },
    { label: 'Matches where you said you would live', score: inputs.residency === 'stay' && profile.mobility < 0.3 ? 1 : 0.8, weight: 0.3 },
  ];
  const wSum = dims.reduce((s, d) => s + d.weight, 0) || 1;
  const total = Math.round((dims.reduce((s, d) => s + d.score * d.weight, 0) / wSum) * 100);
  return { total, parts: dims };
}

export interface ScoredScenario {
  letter: string;
  inputs: Inputs;
  result: StackResult;
  score: ScenarioScore;
}

export function scoreAll(
  scenarios: Array<{ letter: string; inputs: Inputs }>,
  profile: GoalProfile,
  asm: Assumptions,
): ScoredScenario[] {
  const withResults = scenarios.map((s) => ({ ...s, result: computeStack(s.inputs, asm) }));
  const allResults = withResults.map((s) => s.result);
  return withResults
    .map((s) => ({ ...s, score: scoreScenario(s.inputs, s.result, profile, allResults) }))
    .sort((a, b) => b.score.total - a.score.total);
}

export { PPLI_QP_MIN };
