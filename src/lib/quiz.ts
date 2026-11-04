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
  options: Array<{ label: string; hint?: string; weights: Partial<GoalProfile> }>;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'claim', text: 'Where is the prize right now?',
    options: [
      { label: 'I have not claimed it yet', weights: {} },
      { label: 'I will take the cash amount, and tax is not paid yet', weights: {} },
      { label: 'The tax is already paid. This is what I have left', weights: {} },
    ],
  },
  {
    id: 'filing', text: 'Who files the tax return?',
    options: [
      { label: 'Just me', weights: {} },
      { label: 'Married, filing together', weights: {} },
    ],
  },
  {
    id: 'work', text: 'Will you keep earning a paycheck?',
    options: [
      { label: 'I need this prize to live on', hint: 'The plans lean toward cash you can spend.', weights: { income: 1, growth: 0.1 } },
      { label: 'I will keep working', hint: 'A middle answer. The prize does not have to pay all the bills.', weights: { income: 0.4, growth: 0.5 } },
      { label: 'I have other income. This can sit', hint: 'The plans can leave more invested.', weights: { income: 0.1, growth: 1 } },
    ],
  },
  {
    id: 'debts', text: 'Do you have debts you would clear before investing?',
    options: [
      { label: 'No', hint: 'Nothing is set aside for a payoff.', weights: {} },
      { label: 'Some. The first year can cover them', hint: 'A note only. The chart does not subtract a specific balance.', weights: { income: 0.2 } },
      { label: 'A lot. Clearing them comes first', hint: 'The cash-now plan is there so a payoff has a source. The chart still does not subtract the balance.', weights: { income: 0.5, simplicity: 0.3 } },
    ],
  },
  {
    id: 'house', text: 'What about a home?',
    options: [
      { label: 'I have the home I want', hint: 'No cash is pulled out for a house.', weights: { simplicity: 0.2 } },
      { label: 'I rent, or I will sell', hint: 'No house is added to the plan.', weights: {} },
      { label: 'I want to buy a home with some of this', hint: 'One plan sets cash aside for a house, outside the investments.', weights: { protection: 0.3, simplicity: 0.2 } },
    ],
  },
  {
    id: 'horizon', text: 'When should this money work hardest?',
    options: [
      { label: 'This year — I need income', weights: { income: 1 } },
      { label: 'Both income and growth', weights: { income: 0.5, growth: 0.5 } },
      { label: 'In 20 or more years — let it grow', weights: { growth: 1 } },
    ],
  },
  {
    id: 'risk', text: 'The market drops 30% next year. What do you do?',
    options: [
      { label: 'Sell', weights: { growth: 0.1, income: 0.5, simplicity: 0.8 } },
      { label: 'Hold, but worry', weights: { growth: 0.5 } },
      { label: 'Leave it alone', weights: { growth: 1 } },
    ],
  },
  {
    id: 'move', text: 'Would you move to a state with no income tax, such as Wyoming, Texas, or Florida?',
    options: [
      { label: 'No. I am staying', weights: { mobility: 0 } },
      { label: 'Maybe', weights: { mobility: 0.5 } },
      { label: 'Yes', weights: { mobility: 1 } },
    ],
  },
  {
    id: 'pr', text: 'Would you live in Puerto Rico for more than half the year?',
    options: [
      { label: 'No', weights: { mobility: 0 } },
      { label: 'I want to learn more, but not move yet', weights: { mobility: 0.35 } },
      { label: 'Yes. I could live there', weights: { mobility: 1 } },
    ],
  },
  {
    id: 'privacy', text: 'How much does it matter that your name stays off public records?',
    options: [
      { label: 'Not much', weights: { protection: 0.2, simplicity: 0.6 } },
      { label: 'Somewhat', weights: { protection: 0.6 } },
      { label: 'A lot', weights: { protection: 1 } },
    ],
  },
  {
    id: 'lawsuit', text: 'Are you worried someone will sue you for the money?',
    options: [
      { label: 'No', weights: { protection: 0.2 } },
      { label: 'A little', weights: { protection: 0.6 } },
      { label: 'Yes. Protect it', weights: { protection: 1 } },
    ],
  },
  {
    id: 'legacy', text: 'Do you want to leave this money to your family?',
    options: [
      { label: 'Not a priority', weights: { legacy: 0.1, income: 0.3 } },
      { label: 'Some of it', weights: { legacy: 0.5 } },
      { label: 'Yes, for the next generation', weights: { legacy: 1, growth: 0.4 } },
    ],
  },
  {
    id: 'charity', text: 'Do you plan to give a meaningful amount to charity?',
    options: [
      { label: 'No', weights: { legacy: 0 } },
      { label: 'Some', weights: { legacy: 0.4 } },
      { label: 'Yes. It is a main goal', weights: { legacy: 1 } },
    ],
  },
  {
    id: 'business', text: 'Do you want to start or buy a business with some of this?',
    options: [
      { label: 'No', hint: 'No business slice.', weights: { simplicity: 0.3 } },
      { label: 'A small slice, not the main plan', hint: 'One plan may set aside a small piece. It pays you nothing in the model.', weights: { growth: 0.4, legacy: 0.2 } },
      { label: 'Yes. That is a main goal', hint: 'A business plan stays on the list even if the score is lower.', weights: { growth: 0.7, legacy: 0.4, simplicity: 0 } },
    ],
  },
  {
    id: 'complexity', text: 'How do you feel about lawyers, trusts, and paperwork?',
    options: [
      { label: 'Keep it as simple as possible', weights: { simplicity: 1, protection: 0.2 } },
      { label: 'Fine, if it saves real money', weights: { simplicity: 0.45, protection: 0.55 } },
      { label: 'I want the full setup', weights: { simplicity: 0, protection: 0.8 } },
    ],
  },
];

export const QUIZ_NOW = ['claim', 'filing', 'work', 'debts', 'house'] as const;

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
