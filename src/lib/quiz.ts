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
    id: 'spend', text: 'How much yearly spending money do you want from the stack?',
    options: [
      { label: 'Very little — I have other income', hint: 'Let it compound', weights: { income: 0.1, growth: 1 } },
      { label: 'A comfortable salary', weights: { income: 0.5, growth: 0.7 } },
      { label: 'A generous lifestyle', weights: { income: 0.85, growth: 0.4 } },
      { label: 'As much as sustainably possible', weights: { income: 1, growth: 0.15 } },
    ],
  },
  {
    id: 'horizon', text: 'When should the money work hardest?',
    options: [
      { label: 'Right now — income first', weights: { income: 1 } },
      { label: 'Both, in balance', weights: { income: 0.6, growth: 0.6 } },
      { label: 'In 20+ years — growth first', weights: { growth: 1 } },
    ],
  },
  {
    id: 'risk', text: 'Markets drop 30% next year. You…',
    options: [
      { label: 'Sell everything and hide', weights: { growth: 0.1, simplicity: 0.8, income: 0.6 } },
      { label: 'Get nervous but hold on', weights: { growth: 0.5 } },
      { label: 'Barely look at it', weights: { growth: 1 } },
    ],
  },
  {
    id: 'move', text: 'Would you move to a 0% income-tax state (WY, TX, FL…)?',
    options: [
      { label: 'No — staying put', weights: { mobility: 0 } },
      { label: 'Maybe, for the right savings', weights: { mobility: 0.5 } },
      { label: 'Yes, happily', weights: { mobility: 1 } },
    ],
  },
  {
    id: 'pr', text: 'And Puerto Rico — real move, 183+ days a year?',
    options: [
      { label: 'Not for me', weights: {} },
      { label: 'Curious, tell me more', weights: { mobility: 0.75 } },
      { label: 'I could genuinely live there', weights: { mobility: 1.2 } },
    ],
  },
  {
    id: 'privacy', text: 'How much does keeping your name off public records matter?',
    options: [
      { label: 'Not much', weights: { protection: 0.2, simplicity: 0.7 } },
      { label: 'Somewhat', weights: { protection: 0.6 } },
      { label: 'A lot — I want to be invisible', weights: { protection: 1 } },
    ],
  },
  {
    id: 'lawsuit', text: 'Do you worry about lawsuits or people coming after the money?',
    options: [
      { label: 'Not really', weights: { protection: 0.2 } },
      { label: 'A little', weights: { protection: 0.6 } },
      { label: 'Yes — protect everything', weights: { protection: 1 } },
    ],
  },
  {
    id: 'legacy', text: 'How important is leaving wealth to family or future generations?',
    options: [
      { label: 'Not a priority', weights: { legacy: 0.1, income: 0.4 } },
      { label: 'Nice to have', weights: { legacy: 0.5 } },
      { label: 'Very — think generations', weights: { legacy: 1, growth: 0.5 } },
    ],
  },
  {
    id: 'charity', text: 'Do you plan meaningful charitable giving?',
    options: [
      { label: 'No', weights: {} },
      { label: 'Some, occasionally', weights: { legacy: 0.3 } },
      { label: 'Yes — it is a core goal', weights: { legacy: 0.8 } },
    ],
  },
  {
    id: 'property', text: 'Planning to buy a home, land, or vehicles soon?',
    options: [
      { label: 'No', weights: { simplicity: 0.4 } },
      { label: 'One primary home', weights: { protection: 0.4 } },
      { label: 'Several properties / big toys', weights: { protection: 0.7, income: 0.2 } },
    ],
  },
  {
    id: 'complexity', text: 'How do you feel about lawyers, trustees, and paperwork?',
    options: [
      { label: 'Keep it as simple as possible', weights: { simplicity: 1, protection: 0.3 } },
      { label: 'Fine, if it saves real money', weights: { simplicity: 0.4, protection: 0.6 } },
      { label: 'Bring on the structures', weights: { simplicity: 0, protection: 0.8 } },
    ],
  },
  {
    id: 'discipline', text: 'Honest check: a windfall lands. Your spending discipline is…',
    options: [
      { label: 'A risk — guardrails, please', weights: { income: 0.3, simplicity: 0.6 } },
      { label: 'Average', weights: { income: 0.5 } },
      { label: 'Rock solid', weights: { income: 0.8, growth: 0.3 } },
    ],
  },
];

export function profileFromAnswers(answers: Record<string, number>): GoalProfile {
  const acc: GoalProfile = { income: 0, growth: 0, protection: 0, mobility: 0, legacy: 0, simplicity: 0 };
  let n = 0;
  for (const q of QUIZ) {
    const idx = answers[q.id];
    if (idx === undefined) continue;
    n++;
    const w = q.options[idx].weights;
    for (const k of Object.keys(acc) as (keyof GoalProfile)[]) {
      acc[k] += w[k] ?? 0;
    }
  }
  const div = Math.max(1, n);
  for (const k of Object.keys(acc) as (keyof GoalProfile)[]) acc[k] = acc[k] / div;
  return acc;
}

export interface Recommendation {
  dial: number;
  residency: Inputs['residency'];
  notes: string[];
}

export function recommend(p: GoalProfile): Recommendation {
  const total = p.income + p.growth || 1;
  let dial = Math.round((p.income / total) * 100);
  dial = Math.max(0, Math.min(100, dial));
  let residency: Inputs['residency'] = 'stay';
  if (p.mobility >= 0.9) residency = 'pr';
  else if (p.mobility >= 0.45) residency = 'move';
  const notes: string[] = [];
  notes.push(
    dial > 66
      ? 'Income-leaning dial: the engines are tuned to maximize tax-free cash now.'
      : dial < 34
        ? 'Growth-leaning dial: minimal draws, maximum 25-year compounding.'
        : 'Balanced dial: steady tax-free income while the stack keeps compounding.'
  );
  if (residency === 'pr') notes.push('Your answers point at Puerto Rico — check the Act 60 module and the Dec 31, 2026 filing deadline.');
  else if (residency === 'move') notes.push('You seem open to relocating — a 0% income-tax state removes state drag on everything unshielded.');
  if (p.protection >= 0.6) notes.push('Protection matters to you: keep the DAPT funded, use Entity #4 for property, and read the foreign-trust reality check before going offshore.');
  if (p.legacy >= 0.6) notes.push('Legacy matters: once the stack exceeds the $15M federal exclusion, the dynasty-trust layer becomes the priority conversation with your attorney.');
  if (p.simplicity >= 0.7) notes.push('You value simplicity: a leaner stack (Trust #1 + DAPT, skip PPLI) trades some tax-free capacity for far less paperwork.');
  return { dial, residency, notes };
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
