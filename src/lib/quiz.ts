// Questions that help a person decide what they want now, soon, and later.
// The score ranks approaches by whether they pay for that life without running out.
// A larger pile at year 25 is not a win. The person may not be alive in 10 years.
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
    id: 'claim', group: 'now', text: 'Is the amount you typed the lottery check before tax, or the money already left after tax?',
    why: 'The same number can mean two different things. The tax estimate depends on which one it is.',
    options: [
      { label: 'The lottery check, before tax', note: 'Tax still comes off. What is left after tax is what can be used.', weights: {} },
      { label: 'The money already left after tax', note: 'No more prize tax is taken off this number.', weights: {} },
    ],
  },
  {
    id: 'filing', group: 'now', text: 'Will the tax return be yours alone, or will another person be on it with you?',
    why: 'The tax estimate is different if another person is on the return.',
    options: [
      { label: 'Mine alone', note: 'The estimate uses a single filer.', weights: {} },
      { label: 'Another person will be on it with me', note: 'The estimate uses married filing jointly.', weights: {} },
    ],
  },
  {
    id: 'known', group: 'now', text: 'Are you worried that people already know, or will soon know, about the lottery money?',
    why: 'Once people know, the money can attract requests, attention, and risk. This does not hide the money from the tax office.',
    options: [
      { label: 'No', note: 'This answer does not add privacy steps.', weights: { protection: 0.1 } },
      { label: 'I do not want my name on a house, a car, or a court paper', note: 'A trust can keep a name off a deed. It does not hide the money from the tax office.', weights: { protection: 0.7 } },
      { label: 'I am worried about being asked for money, targeted, or followed', note: 'Distance and a name kept off public records are the practical steps. Neither hides the money from the tax office.', weights: { protection: 1 } },
    ],
  },
  {
    id: 'housing', group: 'soon', text: 'What do you want to happen with housing?',
    why: 'A home you buy with this money is cash that is not invested. You type the amount. Nothing is set aside until you do.',
    options: [
      { label: 'I want to keep the home I have', note: 'No home amount is required by this answer.', weights: {} },
      { label: 'I want to buy a home', note: 'Type the dollars under this question. That amount is not invested.', weights: {} },
      { label: 'I do not want to own a home', note: 'No home amount is set aside.', weights: {} },
    ],
  },
  {
    id: 'move', group: 'soon', text: 'Do you want to keep living in the state you live in now?',
    why: 'Moving can change the state tax on future investment income. It does not change the tax on the lottery check.',
    options: [
      { label: 'Yes. I am not moving', note: 'Future investment income stays taxed in the state you live in now. The lottery check is taxed there either way.', weights: { mobility: 0 } },
      { label: 'I might move. Show me the difference before I decide', note: 'This is a look at the tax difference. It is not a decision to move. The lottery check is taxed in the state you live in now.', weights: { mobility: 0.5 } },
      { label: 'I want to live in a state that does not tax income', note: 'Only income after a real move is affected. The lottery check is still taxed where you live when you receive it.', weights: { mobility: 1 } },
    ],
  },
  {
    id: 'pr', group: 'soon', text: 'Do you want Puerto Rico to be the place you actually live?',
    why: 'Puerto Rico can change the tax on later investment gains, and only if you actually live there.',
    options: [
      { label: 'No', note: 'The tax treatment does not apply.', weights: { mobility: 0 } },
      { label: 'Yes. I would be in Puerto Rico more than half the year, with my life based there', note: 'Later investment gains can be treated under the Puerto Rico rules. The lottery check is still taxed. A house you do not live in does not count.', weights: { mobility: 1 } },
      { label: 'I would use a Puerto Rico address, but I would be traveling or on a boat most of the year', note: 'Days on a boat, in other countries, or back in the state you left do not count as days in Puerto Rico. If most of the year is spent away, Puerto Rico is an address. The tax treatment does not apply. The lottery check is taxed the same either way.', weights: { mobility: 0.2 } },
    ],
  },
  {
    id: 'abroad', group: 'later', text: 'Do you want to live in a country other than the United States and keep your US passport?',
    why: 'Living abroad does not turn off US tax.',
    options: [
      { label: 'No', note: 'US tax is unchanged by this answer.', weights: {} },
      { label: 'I might, for a few years', note: 'A US citizen still pays US tax on income from anywhere. The lottery money and investment gains are not treated like wages earned abroad. The state you leave can still tax you if you have not actually moved your life.', weights: { mobility: 0.4 } },
      { label: 'Yes', note: 'You still pay US tax. The lottery money and the investment gains are not treated like wages from a job overseas. The state you leave can still tax you if you have not really moved your life.', weights: { mobility: 0.6 } },
    ],
  },
  {
    id: 'cbi', group: 'later', text: 'Do you want a passport from another country?',
    why: 'People want this for two different reasons. They are not the same.',
    options: [
      { label: 'No', note: 'This answer changes nothing.', weights: {} },
      { label: 'Yes. I want to travel more easily, and I want another country where I am allowed to live', note: 'That can be real. It does not change what you owe the United States.', weights: {} },
      { label: 'Yes. I want to pay less tax to the United States', note: 'A new passport does not lower US tax. The United States taxes you because you are a US citizen. That continues for as long as you keep the citizenship. The lottery money is still taxed. The tax ends only if you give up American citizenship. That is a separate decision.', weights: {} },
    ],
  },
  {
    id: 'renounce', group: 'later', text: 'Do you want to give up US citizenship?',
    why: 'This is the only step that ends US tax on worldwide income. It has its own tax, and it is not treated as reversible.',
    options: [
      { label: 'No', note: 'US tax continues.', weights: {} },
      { label: 'I want to see the cost before I decide', note: 'The page can estimate the exit tax once you type what your assets would sell for and what you paid. Gifts you later make to people in the United States can also be taxed.', weights: {} },
      { label: 'Yes', note: 'Type what your assets would sell for and what you paid. The exit tax is on the gain above the exclusion. Later gifts to people in the United States can be taxed. This is not treated as something you undo.', weights: {} },
    ],
  },
  {
    id: 'after', group: 'later', text: 'When you die, do you want the lottery money to go to someone else?',
    why: 'You may not be alive in 10 years. What is left at that point, and who can receive it, is the question. A larger pile in 25 years is not a win.',
    options: [
      { label: 'I have not decided', note: 'No estate step is added. What is left if you die is still shown.', weights: { legacy: 0.2 } },
      { label: 'No. I am not deciding that now', note: 'No estate step is added.', weights: { legacy: 0 } },
      { label: 'Yes', note: 'A trust can be written so someone else receives what is left. It has to be drafted and funded. Answering here does not do that. The federal exclusion used on this site is $15 million per person. Amounts above that can face estate tax if the money is still in your estate.', weights: { legacy: 1 } },
    ],
  },
  {
    id: 'reach', group: 'later', text: 'Are you worried that a lawsuit, or people asking for money, could reach what is left years from now?',
    why: 'A trust can make a lawsuit slower and keep a name off a deed. It does not hide the money from the tax office.',
    options: [
      { label: 'No', note: 'No extra protection step is added by this answer.', weights: { protection: 0.1 } },
      { label: 'I want to know what a trust changes', note: 'A trust can keep a name off a deed and slow a lawsuit. It does not hide the money from the tax office. A trust in another country does not hide it either.', weights: { protection: 0.6 } },
      { label: 'Yes. I want the money harder for a lawsuit to reach', note: 'The practical step is a trust in the United States. A foreign trust does not lower US tax and does not hide the money from the tax office.', weights: { protection: 1 } },
    ],
  },
];

export const QUIZ_NOW = ['claim', 'filing', 'known'] as const;
export const QUIZ_SOON = ['housing', 'move', 'pr'] as const;
export const QUIZ_LATER = ['abroad', 'cbi', 'renounce', 'after', 'reach'] as const;

export function profileFromAnswers(answers: Record<string, number>): GoalProfile {
  const acc: GoalProfile = { income: 0, growth: 0, protection: 0, mobility: 0, legacy: 0, simplicity: 0 };
  const max: GoalProfile = { income: 0, growth: 0, protection: 0, mobility: 0, legacy: 0, simplicity: 0 };
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
  // The life they want is the point. Paying for it without running out outranks a bigger pile.
  acc.income = Math.max(acc.income, 1);
  max.income = Math.max(max.income, 1);
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

export function recommend(p: GoalProfile, answers: Record<string, number> = {}): Recommendation {
  const dial = 50;
  const prYes = answers.pr === 1;
  const moveYes = answers.move === 2;
  const residency: Inputs['residency'] = prYes ? 'pr' : moveYes ? 'move' : 'stay';
  const filing: Inputs['filing'] | null = answers.filing === undefined ? null : answers.filing === 1 ? 'mfj' : 'single';
  const basis: Inputs['basis'] | null = answers.claim === undefined ? null : answers.claim === 1 ? 'net' : 'gross';
  const notes: string[] = [
    'The score looks for the approach that pays for the life you described without the money running out. A larger amount left in 25 years is not a win.',
  ];
  if (answers.pr === 2) notes.push('A Puerto Rico address while you travel or live on a boat does not qualify. The tax treatment requires you to actually be there more than half the year.');
  if (answers.cbi === 2) notes.push('A passport from another country does not lower US tax.');
  if (answers.renounce && answers.renounce > 0) notes.push('Giving up US citizenship has its own tax. It is not treated as reversible.');
  return { dial, residency, spend: null, filing, basis, notes };
}

export interface ScenarioScore {
  total: number;
  parts: Array<{ label: string; score: number; weight: number }>;
}

/** Rank by whether the approach pays for the life without running out. Year-25 pile is not a win. */
export function scoreScenario(
  inputs: Inputs,
  result: StackResult,
  profile: GoalProfile,
  _allResults: StackResult[],
): ScenarioScore {
  const spend = Math.max(1, inputs.spend);
  const sustainFit = result.capacity >= spend ? 1 : result.capacity / spend;
  const dry = result.depletedYear !== null && result.depletedYear <= 10 ? 0 : 1;
  const protectionFit = 0.4 + (result.weights.b > 0 ? 0.35 : 0) + (inputs.entity4 > 0 ? 0.25 : 0);
  const mobilityFit =
    profile.mobility < 0.3
      ? inputs.residency === 'stay' ? 1 : 0.5
      : inputs.residency === 'pr' ? (profile.mobility >= 0.9 ? 1 : 0.7)
      : inputs.residency === 'stay' ? 0.4 : 0.9;
  const dims: Array<{ label: string; score: number; weight: number }> = [
    { label: 'Pays for the life', score: sustainFit, weight: 1 },
    { label: 'Still there if you die in 10 years', score: dry, weight: 0.6 },
    { label: 'Matches where you said you would live', score: mobilityFit, weight: Math.max(0.15, profile.mobility) },
    { label: 'Harder for a lawsuit to reach', score: protectionFit, weight: profile.protection },
  ];
  const wSum = dims.reduce((s, d) => s + d.weight, 0) || 1;
  const total = Math.round((dims.reduce((s, d) => s + d.score * d.weight, 0) / wSum) * 100);
  return { total, parts: dims.filter((d) => d.weight > 0.05) };
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
