// Comprehensive questions for short, middle, and long term planning.
// Age sets the stretches. Protection and estate are their own section.
// Each answer states the outcome. No plan names. No allocation splits.
import { computeStack, PPLI_QP_MIN, type Assumptions, type Inputs, type StackResult } from './calc';

export interface GoalProfile {
  income: number;
  growth: number;
  protection: number;
  mobility: number;
  legacy: number;
  simplicity: number;
}

export type TimeGroup = 'short' | 'middle' | 'long' | 'protect';

export interface QuizQuestion {
  id: string;
  group: TimeGroup;
  text: string;
  why: string;
  options: Array<{ label: string; note: string; weights: Partial<GoalProfile> }>;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'claim', group: 'short',
    text: 'The amount you typed. Is that the lottery check before tax, or what is already left after tax?',
    why: 'The result cannot be calculated until this is known.',
    options: [
      { label: 'The lottery check, before tax', note: 'Tax still comes off. Only what is left can pay for the life.', weights: {} },
      { label: 'What is already left after tax', note: 'Nothing more is taken off for prize tax.', weights: {} },
    ],
  },
  {
    id: 'filing', group: 'short',
    text: 'Who is on the tax return?',
    why: 'The tax estimate changes if another person is on it.',
    options: [
      { label: 'Only me', note: 'The estimate uses one person.', weights: {} },
      { label: 'Me and another person', note: 'The estimate uses two people on the return.', weights: {} },
    ],
  },
  {
    id: 'worry', group: 'short',
    text: 'What worries you about this money in the next few years?',
    why: 'The worry is part of the decision. The result has to answer it.',
    options: [
      { label: 'That I will run out, or spend it faster than I mean to', note: 'The result checks whether the yearly amount you want can be paid without the money running out.', weights: { income: 1 } },
      { label: 'That people will find out, ask, or target me', note: 'Keeping your name off a house, a car, and accounts makes you harder to find. It does not stop a lawsuit. It does not hide money from the tax office.', weights: { protection: 1 } },
      { label: 'The tax bill', note: 'The tax on the lottery check is set by the amount and the state you live in when you receive it. Moving later does not change that tax.', weights: {} },
      { label: 'A health cost', note: 'The yearly amount has to cover care as well as the life. Type a yearly amount that includes it.', weights: {} },
      { label: 'Nothing in particular', note: 'No extra step is added by this answer.', weights: {} },
    ],
  },
  {
    id: 'depend', group: 'short',
    text: 'In the next few years, will you pay for anyone else\'s living costs, school, or care from this money?',
    why: 'A spouse, partner, child, parent, or anyone else you support. If yes, the yearly amount has to include what they need. The question does not assume you have any of them.',
    options: [
      { label: 'No one else', note: 'The yearly amount is only for you.', weights: {} },
      { label: 'Yes. I support someone', note: 'Include their living costs, school, or care in the yearly amount. The result uses that number.', weights: {} },
      { label: 'Not sure yet', note: 'You can change this later. Until you do, the result uses only the yearly amount you typed.', weights: {} },
    ],
  },
  {
    id: 'health', group: 'short',
    text: 'Is there a health issue that changes what you need the money for in the next few years?',
    why: 'Care costs change how much has to be available. You do not have to describe the issue.',
    options: [
      { label: 'No', note: 'No extra amount is added.', weights: {} },
      { label: 'Yes', note: 'Put the care cost into the yearly amount. The result checks that number.', weights: {} },
      { label: 'I would rather not say, but the money has to cover care', note: 'Same as yes. The yearly amount should include care. No detail is stored.', weights: {} },
    ],
  },
  {
    id: 'live', group: 'middle',
    text: 'Where do you want to live?',
    why: 'Where you live can change the tax on money you earn later. It does not change the tax on the lottery check.',
    options: [
      { label: 'The state I live in now', note: 'Later investment income stays taxed there. The lottery check is taxed there either way.', weights: { mobility: 0 } },
      { label: 'A different state', note: 'Only income after you actually move is affected. The lottery check is still taxed in the state you live in now.', weights: { mobility: 1 } },
      { label: 'Puerto Rico, and I would actually live there more than half the year', note: 'Later investment gains can be treated under the Puerto Rico rules. The lottery check is still taxed. A house you do not live in does not count.', weights: { mobility: 1 } },
      { label: 'A Puerto Rico address, but I would be traveling or on a boat most of the year', note: 'That does not qualify. Days on a boat or in other places do not count as days in Puerto Rico. The tax break does not apply. The lottery check is taxed the same either way.', weights: { mobility: 0.2 } },
      { label: 'Another country, and I would keep my US passport', note: 'You still pay US tax. The lottery money and later investment gains are not treated like wages from a job overseas. The state you leave can still tax you if you have not really moved your life.', weights: { mobility: 0.6 } },
      { label: 'I do not want one home. I want to move around', note: 'No single place becomes your tax home. Puerto Rico treatment does not apply. US tax continues.', weights: { mobility: 0.4 } },
    ],
  },
  {
    id: 'time', group: 'middle',
    text: 'How do you want to spend your time?',
    why: 'The way you live is the thing the money has to pay for.',
    options: [
      { label: 'Mostly in one place', note: 'The yearly amount is for a settled life.', weights: {} },
      { label: 'Traveling for long stretches', note: 'The yearly amount should include travel. A mailing address somewhere does not change your tax by itself.', weights: {} },
      { label: 'On a boat, or without one home, for most of the year', note: 'The yearly amount should include the boat and the travel. This does not create a Puerto Rico tax home.', weights: {} },
      { label: 'I have not decided', note: 'You can change this. The result uses the yearly amount you typed.', weights: {} },
    ],
  },
  {
    id: 'market', group: 'middle',
    text: 'If markets are bad for several years, what do you want to hold up?',
    why: 'A bad stretch is when the worry of running out shows up.',
    options: [
      { label: 'The yearly amount I live on', note: 'The result favors keeping that amount available. It does not promise the markets will cooperate.', weights: { income: 1 } },
      { label: 'I can accept a smaller year if the money is still there later', note: 'A smaller year is allowed. The money lasting is the priority.', weights: {} },
      { label: 'I have not decided', note: 'The result still checks the yearly amount you typed.', weights: {} },
    ],
  },
  {
    id: 'cbi', group: 'middle',
    text: 'Do you want a passport from another country?',
    why: 'People want this for two different reasons. Only one of them is real.',
    options: [
      { label: 'No', note: 'Nothing changes.', weights: {} },
      { label: 'Yes. I want another place I am allowed to live, and easier travel', note: 'That can be real. It does not change the tax you owe the United States. The lottery money is still taxed.', weights: {} },
      { label: 'Yes. I think it will lower my US tax', note: 'It will not. A new passport does not turn off US tax. The tax continues until you give up US citizenship. That is a different decision.', weights: {} },
    ],
  },
  {
    id: 'give', group: 'middle',
    text: 'Do you want to give some of the money away in the next 10 years?',
    why: 'A gift is cash that is not invested. You type the amount. Nothing moves until you do.',
    options: [
      { label: 'No', note: 'Nothing is given.', weights: {} },
      { label: 'Some. I will type the amount', note: 'Type it with the other dollar amounts. It comes out of what is invested.', weights: { legacy: 0.5 } },
      { label: 'I have not decided', note: 'Nothing is given until you type an amount.', weights: {} },
    ],
  },
  {
    id: 'sue', group: 'protect',
    text: 'Are you worried someone will sue you because of the lottery money?',
    why: 'A lawsuit can still be filed. What changes is how hard it is to collect.',
    options: [
      { label: 'No', note: 'No protection step is added.', weights: { protection: 0 } },
      { label: 'I want to know what can and cannot be done', note: 'Insurance protects you, the person. An irrevocable trust can protect assets moved into it before any claim, because you no longer own them. A revocable trust does not do that while you are alive. Neither hides money from the tax office.', weights: { protection: 0.6 } },
      { label: 'Yes. I want the money harder for a lawsuit to reach', note: 'Insurance is what protects you. An irrevocable trust, funded before any claim, can make collection harder because you gave up ownership. A transfer after you know about a claim can be undone. Answering here does not create the trust.', weights: { protection: 1 } },
    ],
  },
  {
    id: 'stolen', group: 'protect',
    text: 'Are you worried the money, a house, or other property could be stolen, or taken by someone who pressures you?',
    why: 'Theft and pressure are not the same problem as a lawsuit.',
    options: [
      { label: 'No', note: 'No extra step is added.', weights: {} },
      { label: 'Somewhat', note: 'Who can sign, who has access, and who knows are the practical controls. A trust does not stop someone you trust from pressuring you.', weights: { protection: 0.5 } },
      { label: 'Yes', note: 'Limit who can sign and who knows. A trust can hold title so your name is not on the asset. It does not stop pressure from people close to you.', weights: { protection: 1 } },
    ],
  },
  {
    id: 'who', group: 'protect',
    text: 'Who are you worried about?',
    why: 'The answer changes what actually helps.',
    options: [
      { label: 'No one in particular', note: 'No named risk.', weights: {} },
      { label: 'People I know', note: 'A trust does not stop pressure from people close to you. Who can sign and who knows matters more.', weights: { protection: 0.6 } },
      { label: 'People I do not know', note: 'Keeping your name off public records and having insurance are the practical steps.', weights: { protection: 0.6 } },
      { label: 'Both', note: 'Insurance and a name kept off records for strangers. Limits on access and signing for people you know.', weights: { protection: 1 } },
    ],
  },
  {
    id: 'hold', group: 'protect',
    text: 'Do you want assets held so a lawsuit has a harder time reaching them?',
    why: 'This is the irrevocable trust decision. It is not created by answering.',
    options: [
      { label: 'No', note: 'Assets stay in your name or in a revocable trust. A lawsuit can reach them while you are alive.', weights: {} },
      { label: 'I want to see what that changes before I decide', note: 'An irrevocable trust means you cannot take it back and cannot change it on your own. Someone else is the trustee. You can still be allowed money under the rules. Because you no longer own the assets, a later lawsuit has a harder time taking them. It fails if you move the money after you know about a claim. A revocable trust does none of this while you are alive.', weights: { protection: 0.7 } },
      { label: 'Yes', note: 'That means an irrevocable trust, funded before any claim, in a state that allows it. You give up control. Answering here does not set it up. It does not hide the money from the tax office. A foreign trust does not hide it either, and it can create extra reporting.', weights: { protection: 1 } },
    ],
  },
  {
    id: 'last', group: 'long',
    text: 'How long does this money need to last?',
    why: 'Your age sets what long term means. A fixed year 25 is not the finish line.',
    options: [
      { label: 'For the rest of my life', note: 'The result uses your age. It checks the short and middle stretches, not a fixed year 25.', weights: {} },
      { label: 'Past my life, for someone else', note: 'What is left at the end of the middle stretch is what someone else could receive. Estate tax can apply above $15 million per person if it is still in your estate.', weights: { legacy: 1 } },
      { label: 'I do not know yet', note: 'The result still shows the short and middle stretches for your age.', weights: {} },
    ],
  },
  {
    id: 'renounce', group: 'long',
    text: 'Do you want to give up US citizenship?',
    why: 'This is the step that ends US tax on money from anywhere. It has its own tax.',
    options: [
      { label: 'No', note: 'US tax continues.', weights: {} },
      { label: 'I want to see the cost before I decide', note: 'The cost can be estimated once you type what your assets would sell for and what you paid. It is not treated as something you undo.', weights: {} },
      { label: 'Yes', note: 'Type what the assets would sell for and what you paid. The tax is on the gain above the exclusion. Later gifts to people in the United States can also be taxed.', weights: {} },
    ],
  },
  {
    id: 'gone', group: 'long',
    text: 'If you died, what do you want to be true about the money?',
    why: 'You may not live to the end of the long stretch. What is left, and who can reach it, is the question.',
    options: [
      { label: 'I have not decided', note: 'The result still shows what would be left. No further step is added.', weights: { legacy: 0.2 } },
      { label: 'Someone else should receive what is left', note: 'A trust can be written for that. Answering here does not write it. Amounts above $15 million per person can face estate tax if the money is still in your estate.', weights: { legacy: 1 } },
      { label: 'I want the estate harder for a lawsuit or a claim to reach', note: 'An irrevocable trust funded during life can do this. A revocable trust does not protect assets from your own creditors while you are alive. Neither hides money from the tax office.', weights: { protection: 1 } },
      { label: 'I want as much as possible already used on the life I chose', note: 'The priority is the life, not a pile left over. The result checks the yearly amount.', weights: { income: 1 } },
    ],
  },
  {
    id: 'aging', group: 'long',
    text: 'Are you worried about the cost of aging, care, or a long illness?',
    why: 'Care late in life can use the money the life was supposed to run on.',
    options: [
      { label: 'No', note: 'No extra reserve is added.', weights: {} },
      { label: 'Yes', note: 'The yearly amount in later years should include care. The result uses the number you typed.', weights: {} },
      { label: 'I have not thought about it', note: 'Nothing is added until you do.', weights: {} },
    ],
  },
  {
    id: 'never', group: 'long',
    text: 'What will you not do, even if it would lower a future tax?',
    why: 'A tax saving you will not actually do is not a plan.',
    options: [
      { label: 'I will not move', note: 'State tax on later income stays where you are. The lottery check is taxed there either way.', weights: { mobility: 0 } },
      { label: 'I will not live in Puerto Rico', note: 'The Puerto Rico tax treatment is off the table.', weights: {} },
      { label: 'I will not live in another country', note: 'Living abroad is off the table. US tax is unchanged by this.', weights: {} },
      { label: 'I will not give up US citizenship', note: 'US tax on worldwide income continues.', weights: {} },
      { label: 'None of these are off the table', note: 'All of the options above stay open.', weights: { mobility: 0.5 } },
    ],
  },
];

export const QUIZ_SHORT = ['claim', 'filing', 'worry', 'depend', 'health'] as const;
export const QUIZ_MIDDLE = ['live', 'time', 'market', 'cbi', 'give'] as const;
export const QUIZ_PROTECT = ['sue', 'stolen', 'who', 'hold'] as const;
export const QUIZ_LONG = ['last', 'renounce', 'gone', 'aging', 'never'] as const;

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
    { label: 'Still there through the middle stretch', score: dry, weight: 0.6 },
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
