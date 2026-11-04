// Goals questionnaire → goal profile → recommended configuration + scenario scoring.
import { computeStack, PPLI_QP_MIN, type Assumptions, type Inputs, type StackResult } from './calc';

export interface GoalProfile {
  income: number;      // want tax-free cash now
  growth: number;      // maximize 25-year compounding
  protection: number;  // privacy + lawsuit protection
  mobility: number;    // willing to relocate (incl. Puerto Rico)
  legacy: number;      // leave wealth to family/charity
  simplicity: number;  // prefer fewer moving parts
}

export interface QuizQuestion {
  id: string;
  text: string;
  why: string;
  options: Array<{ label: string; weights: Partial<GoalProfile> }>;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'claim', text: 'Has the tax on this cash already been paid?',
    why: 'We ask because one number can mean two things: tax still to pay, or tax already paid.',
    options: [
      { label: 'No. I have not claimed it yet', weights: {} },
      { label: 'No. I will take the cash, and the tax is not paid', weights: {} },
      { label: 'Yes. The number I typed is what I have left', weights: {} },
    ],
  },
  {
    id: 'filing', text: 'Who files the tax return?',
    why: 'We ask because the tax on a prize is different if you file alone or with a spouse.',
    options: [
      { label: 'Just me', weights: {} },
      { label: 'Married, filing together', weights: {} },
    ],
  },
  {
    id: 'work', text: 'Will you keep earning a paycheck?',
    why: 'We ask because money you need for living has a different job than money you can leave alone.',
    options: [
      { label: 'I need this prize to live on', weights: { income: 1, growth: 0.1 } },
      { label: 'I will keep working', weights: { income: 0.4, growth: 0.5 } },
      { label: 'I have other income. This can sit', weights: { income: 0.1, growth: 1 } },
    ],
  },
  {
    id: 'house', text: 'What about a home?',
    why: 'We ask because a house is cash that does not stay invested.',
    options: [
      { label: 'I have the home I want', weights: { simplicity: 0.2 } },
      { label: 'I rent, or I will sell', weights: {} },
      { label: 'I want to buy a home with some of this', weights: { protection: 0.3, simplicity: 0.2 } },
    ],
  },
  {
    id: 'horizon', text: 'When do you need the money to pay you?',
    why: 'We ask because money that has to pay you soon cannot also be the money left to grow for 25 years.',
    options: [
      { label: 'I need the check soon', weights: { income: 1 } },
      { label: 'I want a check, and money left later', weights: { income: 0.5, growth: 0.5 } },
      { label: 'I can wait. Leave more for year 25', weights: { growth: 1 } },
    ],
  },
  {
    id: 'risk', text: 'If stocks fall, what should stay steady?',
    why: 'We ask because bonds pay interest and do not jump with the stock market, and stocks are what can make a much bigger pile in 25 years and can fall. You are choosing which of those matters more.',
    options: [
      { label: 'The yearly check', weights: { income: 1, growth: 0.1 } },
      { label: 'Both, as much as one mix can', weights: { income: 0.5, growth: 0.5 } },
      { label: 'The money left in 25 years', weights: { growth: 1, income: 0.1 } },
    ],
  },
  {
    id: 'move', text: 'Would you move to a state with no income tax?',
    why: 'We ask because moving can change the state tax on future investment income. It does not change the tax on the prize.',
    options: [
      { label: 'No. I am staying', weights: { mobility: 0 } },
      { label: 'Maybe. Show me the dollars', weights: { mobility: 0.5 } },
      { label: 'Yes. I would move', weights: { mobility: 1 } },
    ],
  },
  {
    id: 'pr', text: 'Would you live in Puerto Rico?',
    why: 'We ask because Puerto Rico can change the tax on later investment gains, and only if you live there.',
    options: [
      { label: 'No', weights: { mobility: 0 } },
      { label: 'Show me the dollars. I am not moving yet', weights: { mobility: 0.35 } },
      { label: 'Yes. I could live there more than half the year', weights: { mobility: 1 } },
    ],
  },
  {
    id: 'privacy', text: 'How much does it matter that your name stays off public records?',
    why: 'We ask because a trust can keep a name off a deed. It does not hide money from the tax office.',
    options: [
      { label: 'Not much', weights: { protection: 0.2, simplicity: 0.6 } },
      { label: 'Somewhat', weights: { protection: 0.6 } },
      { label: 'A lot', weights: { protection: 1 } },
    ],
  },
  {
    id: 'lawsuit', text: 'Are you worried someone will sue you for the money?',
    why: 'We ask because some plans put the investments inside a trust. That is a legal structure, not a promise that a lawsuit cannot reach the money.',
    options: [
      { label: 'No', weights: { protection: 0.2 } },
      { label: 'A little', weights: { protection: 0.6 } },
      { label: 'Yes. I want that considered', weights: { protection: 1 } },
    ],
  },
  {
    id: 'legacy', text: 'Do you want to leave this money to your family?',
    why: 'We ask because leaving money to family is about what is left in 25 years. This does not write a will.',
    options: [
      { label: 'Not a priority', weights: { legacy: 0.1, income: 0.3 } },
      { label: 'Some of it', weights: { legacy: 0.5 } },
      { label: 'Yes, for the next generation', weights: { legacy: 1, growth: 0.4 } },
    ],
  },
  {
    id: 'charity', text: 'Do you want to give money to charity in the year you claim the prize?',
    why: 'We ask because a gift is a decision you make with your tax preparer. The numbers on each answer show whether that gift changes these plans.',
    options: [
      { label: 'No', weights: { legacy: 0 } },
      { label: 'Some', weights: { legacy: 0.4 } },
      { label: 'Yes. It is a main goal', weights: { legacy: 1 } },
    ],
  },
  {
    id: 'business', text: 'Do you want to start or buy a business with some of this?',
    why: 'We ask because money put into a business is money that is not paying you from the investments.',
    options: [
      { label: 'No', weights: { simplicity: 0.3 } },
      { label: 'Yes, a slice. Not the whole plan', weights: { growth: 0.4, legacy: 0.2 } },
      { label: 'Yes. That is a main goal', weights: { growth: 0.7, legacy: 0.4, simplicity: 0 } },
    ],
  },
  {
    id: 'complexity', text: 'How much paperwork will you accept?',
    why: 'We ask because the insurance policy is extra paperwork, and it is only used when enough money is left to invest.',
    options: [
      { label: 'As little as possible', weights: { simplicity: 1, protection: 0.2 } },
      { label: 'Some, if it pays me more', weights: { simplicity: 0.45, protection: 0.55 } },
      { label: 'I will do the full setup', weights: { simplicity: 0, protection: 0.8 } },
    ],
  },
];

export const QUIZ_NOW = ['claim', 'filing', 'work', 'house'] as const;

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
  for (const k of Object.keys(acc) as (keyof GoalProfile)[]) acc[k] = max[k] > 0 ? acc[k] / max[k] : 0;
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
  const total = p.income + p.growth || 1;
  let dial = Math.round((p.income / total) * 100);
  dial = Math.max(0, Math.min(100, dial));

  const prYes = answers.pr === 2;
  const moveYes = answers.move === 2;
  const residency: Inputs['residency'] = prYes ? 'pr' : moveYes ? 'move' : 'stay';

  const filing: Inputs['filing'] | null = answers.filing === undefined ? null : answers.filing === 1 ? 'mfj' : 'single';
  const basis: Inputs['basis'] | null = answers.claim === undefined ? null : answers.claim === 2 ? 'net' : 'gross';

  const notes: string[] = [];
  notes.push(
    dial > 66
      ? 'The mix leans toward income: more cash each year, less left to grow.'
      : dial < 34
        ? 'The mix leans toward growth: take less now so more is left in 25 years.'
        : 'The mix stays in the middle: some cash each year, and the rest keeps growing.'
  );
  if (prYes) notes.push('You said you could live in Puerto Rico. That is a real move, not a mailing address. Read the Act 60 note and the December 31, 2026 filing deadline before you treat it as a plan.');
  else if (answers.pr === 1) notes.push('You wanted to learn about Puerto Rico, so the calculator stays where you live. Open the library item when you are ready. It does not change the chart.');
  else if (moveYes) notes.push('You said you would move to a no-income-tax state. The calculator uses that for tax on future investment income, not for the prize itself.');
  else if (answers.move === 1) notes.push('You might move. The calculator leaves you where you live until you say yes.');
  if (p.protection >= 0.6) notes.push('Privacy or lawsuits matter to you. The trust that holds the investments, and the company that holds a house or cars, are the pieces that keep your name off the records. A foreign trust does not hide the money from U.S. tax.');
  if (p.legacy >= 0.6) notes.push('Leaving money to family or charity matters. Once the pile is past the $15 million federal estate exclusion, that is the conversation to have with your lawyer. Charity can also lower the tax in the year you claim the prize.');
  if (p.simplicity >= 0.7) notes.push('You want this simple. Two trusts and no insurance policy means less paperwork and less tax-free cash. Apply does not remove the insurance sleeve. Turn that dial only if you and your lawyer agree.');
  return { dial, residency, spend: null, filing, basis, notes };
}

export interface ScenarioScore {
  total: number;
  parts: Array<{ label: string; score: number; weight: number }>;
}

/** Score a saved scenario 0–100 against the goal profile. `allResults` normalizes the growth axis. */
export function scoreScenario(
  inputs: Inputs,
  result: StackResult,
  profile: GoalProfile,
  allResults: StackResult[],
): ScenarioScore {
  // Income fit: capacity vs. spending target (meeting it = full marks; wild excess is fine but not extra credit)
  const spend = Math.max(1, inputs.spend);
  const incomeFit = Math.min(1, result.capacity / spend);
  // Growth fit: 25-year ending balance, normalized across the compared scenarios
  const ends = allResults.map((r) => r.stackEnd);
  const maxEnd = Math.max(...ends, 1);
  const minEnd = Math.min(...ends);
  const growthFit = maxEnd === minEnd ? 1 : (result.stackEnd - minEnd) / (maxEnd - minEnd);
  // Protection: DAPT always present; PPLI trust + LLC reserve add layers
  const protectionFit =
    0.4 + (result.weights.b > 0 ? 0.35 : 0) + (inputs.entity4 > 0 ? 0.25 : 0);
  // Mobility: does the scenario's residency match the willingness to move?
  const mobilityFit =
    profile.mobility < 0.3
      ? inputs.residency === 'stay' ? 1 : 0.6
      : inputs.residency === 'pr' ? (profile.mobility >= 0.9 ? 1 : 0.8)
      : inputs.residency === 'stay' ? 0.35 : 0.9;
  // Legacy: growth compounds outside the estate — proxied by PPLI presence + end balance
  const legacyFit = 0.3 + (result.weights.b > 0 ? 0.3 : 0) + 0.4 * growthFit;
  // Simplicity: fewer engines and no relocation score higher
  const simplicityFit =
    1 - (result.weights.b > 0 ? 0.3 : 0) - (inputs.residency !== 'stay' ? 0.2 : 0) - (inputs.entity4 > 0 ? 0.1 : 0) - (inputs.residency === 'pr' ? 0.15 : 0);

  const dims: Array<{ label: string; score: number; weight: number }> = [
    { label: 'Income now', score: incomeFit, weight: profile.income },
    { label: 'Compounding', score: growthFit, weight: profile.growth },
    { label: 'Protection', score: protectionFit, weight: profile.protection },
    { label: 'Relocation fit', score: mobilityFit, weight: profile.mobility },
    { label: 'Legacy', score: legacyFit, weight: profile.legacy },
    { label: 'Simplicity', score: Math.max(0, simplicityFit), weight: profile.simplicity },
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
