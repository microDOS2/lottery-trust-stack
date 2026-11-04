// Questions that explain where, when, why, how, what, and who before asking.
// Age sets the stretches. Protection and estate are their own section.
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
    text: 'Is the amount you typed the lottery check before tax, or what is left after tax?',
    why: 'The lottery withholds tax when it pays you. If you typed the check amount, tax still comes off and only the rest can pay for the life. If you typed what is already in hand after tax, nothing more is taken for the prize. The result uses one or the other. It cannot use both.',
    options: [
      { label: 'The lottery check, before tax', note: 'Tax still comes off. Only what is left can pay for the life.', weights: {} },
      { label: 'What is already left after tax', note: 'Nothing more is taken off for prize tax.', weights: {} },
    ],
  },
  {
    id: 'filing', group: 'short',
    text: 'Who is on the tax return that will include this money?',
    why: 'The tax estimate uses one set of brackets for one person, and a wider set if another person is on the return with you. This is only about the return. It does not ask who you live with or who you support.',
    options: [
      { label: 'Only me', note: 'The estimate uses one person.', weights: {} },
      { label: 'Me and another person', note: 'The estimate uses two people on the return.', weights: {} },
    ],
  },
  {
    id: 'worry', group: 'short',
    text: 'What is the main worry about this money in the next few years?',
    why: 'The worry decides what the result has to check. Running out means the yearly amount has to be sustainable. Being found means keeping your name off property and accounts. The tax bill is fixed by the check and the state you live in when you receive it. A health cost means the yearly amount has to include care.',
    options: [
      { label: 'That I will run out, or spend it faster than I mean to', note: 'The result checks whether the yearly amount can be paid without the money running out.', weights: { income: 1 } },
      { label: 'That people will find out, ask, or target me', note: 'Keeping your name off a house, a car, and accounts makes you harder to find. It does not stop a lawsuit. It does not hide money from the tax office.', weights: { protection: 1 } },
      { label: 'The tax bill', note: 'The tax on the lottery check is set by the amount and the state you live in when you receive it. Moving later does not change that tax.', weights: {} },
      { label: 'A health cost', note: 'The yearly amount has to cover care as well as the life. Type a yearly amount that includes it.', weights: {} },
      { label: 'Nothing in particular', note: 'No extra step is added by this answer.', weights: {} },
    ],
  },
  {
    id: 'depend', group: 'short',
    text: 'Will the yearly amount also have to pay for someone else in the next few years?',
    why: 'If you support a spouse, partner, child, parent, or anyone else, their living costs, school, or care have to come out of the yearly amount. A larger yearly amount leaves less to invest, so the money runs out sooner. The question does not assume you have any of them. If the answer is yes, type a yearly amount that includes what they need.',
    options: [
      { label: 'No. The yearly amount is only for me', note: 'Nothing is added for anyone else.', weights: {} },
      { label: 'Yes. I support someone', note: 'Include their living costs, school, or care in the yearly amount. The result uses that number.', weights: {} },
      { label: 'Not sure yet', note: 'You can change this later. Until you do, the result uses only the yearly amount you typed.', weights: {} },
    ],
  },
  {
    id: 'health', group: 'short',
    text: 'Is there a health or care cost that has to come out of the yearly amount in the next few years?',
    why: 'Care costs are cash that is not invested. If they are not in the yearly amount, the result will show the money lasting longer than it actually will. You do not have to name the issue. If yes, type a yearly amount that includes the care.',
    options: [
      { label: 'No', note: 'No extra amount is added.', weights: {} },
      { label: 'Yes', note: 'Put the care cost into the yearly amount. The result checks that number.', weights: {} },
      { label: 'I would rather not say, but the money has to cover care', note: 'Same as yes. The yearly amount should include care. No detail is stored.', weights: {} },
    ],
  },
  {
    id: 'live', group: 'middle',
    text: 'Where do you want to live for most of the year in the next 10 years?',
    why: 'State tax on money you earn later depends on where you actually live. The lottery check is taxed in the state you live in when you receive it. Moving later does not change that tax. Puerto Rico can change the tax on later investment gains if you are present there more than half the year. A mailing address does not count.',
    options: [
      { label: 'Where I am now', note: 'State tax on later income stays where you are. The lottery check is taxed there either way.', weights: { mobility: 0 } },
      { label: 'A different US state', note: 'A state with no income tax changes the tax on later income.', weights: { mobility: 0.5 } },
      { label: 'Puerto Rico, and present there more than half the year', note: 'Later investment gains can use the Puerto Rico path. You have to actually be there.', weights: { mobility: 1 } },
      { label: 'Another country', note: 'Living abroad does not end US tax. US tax continues until you give up US citizenship.', weights: { mobility: 0.7 } },
    ],
  },
  {
    id: 'time', group: 'middle',
    text: 'How do you want to spend your time in the next 10 years?',
    why: 'The way you live is what the yearly amount has to pay for. Working less means the yearly amount has to cover more of your living costs. Traveling or living in more than one place means the yearly amount has to cover those costs. The answer does not change the tax. It changes how large the yearly amount needs to be.',
    options: [
      { label: 'Keep working, and this money is extra', note: 'The yearly amount can be smaller. The result still checks that it can be paid.', weights: { simplicity: 0.5 } },
      { label: 'Stop working, and live on this money', note: 'The yearly amount has to cover living costs. The result checks that it can be paid without the money running out.', weights: { income: 1 } },
      { label: 'Travel, or live in more than one place', note: 'The yearly amount has to cover the travel and the places. The result checks that number.', weights: { mobility: 0.5 } },
      { label: 'I have not decided', note: 'The result uses the yearly amount you typed. You can change it later.', weights: {} },
    ],
  },
  {
    id: 'market', group: 'middle',
    text: 'If markets are bad for several years, what has to keep being paid?',
    why: 'A bad stretch is when the worry of running out shows up. If the yearly amount has to be paid even when markets are down, more of the money has to be in things that do not drop as much. That means less left to grow. The answer does not change the tax. It changes how the money is split.',
    options: [
      { label: 'The yearly amount has to keep coming', note: 'More of the money is in things that do not drop as much. The yearly amount is more likely to be paid. Less is left to grow.', weights: { income: 1, growth: 0 } },
      { label: 'I can cut the yearly amount for a while', note: 'More of the money can stay in things that grow. The yearly amount may be smaller for a few years.', weights: { growth: 1, income: 0 } },
      { label: 'I do not know', note: 'The result uses a middle split. You can change it later.', weights: {} },
    ],
  },
  {
    id: 'cbi', group: 'middle',
    text: 'Do you want a passport from another country?',
    why: 'A second passport can change travel, banking, and where you are allowed to live. It does not lower US tax. US tax continues until you give up US citizenship. Buying citizenship is not a tax cut.',
    options: [
      { label: 'No', note: 'Nothing changes.', weights: {} },
      { label: 'Yes. I want easier travel and another place I am allowed to live', note: 'A second passport can do that. It does not lower US tax.', weights: { mobility: 0.5 } },
      { label: 'Yes. I think a second passport will lower my US tax', note: 'It will not. US tax continues until you give up US citizenship. A second passport is not a tax cut.', weights: {} },
    ],
  },
  {
    id: 'give', group: 'middle',
    text: 'Do you want to give some of the money away in the next 10 years?',
    why: 'A gift is cash that is not invested. It reduces the pile that can pay the yearly amount. You type the amount. Nothing moves until you do. A gift to a person can use the estate tax exclusion. A gift to charity can reduce income tax in the year you give it.',
    options: [
      { label: 'No', note: 'Nothing is given.', weights: {} },
      { label: 'Yes. To a person', note: 'Type the amount. It is taken out of the pile. It can use the estate tax exclusion.', weights: { legacy: 0.5 } },
      { label: 'Yes. To charity', note: 'Type the amount. It is taken out of the pile. It can reduce income tax in the year you give it.', weights: { legacy: 0.3 } },
      { label: 'Not sure yet', note: 'Nothing is given until you type an amount.', weights: {} },
    ],
  },
  {
    id: 'sue', group: 'protect',
    text: 'Are you worried someone will sue you because of the lottery money?',
    why: 'A lawsuit can still be filed. What changes is how hard it is to collect. Insurance protects you, the person. An irrevocable trust funded before any claim can make it harder for a lawsuit to take the assets. A revocable trust does not. Answering here does not create a trust or buy insurance.',
    options: [
      { label: 'No', note: 'Nothing is added.', weights: {} },
      { label: 'Yes', note: 'Insurance protects you. An irrevocable trust funded before any claim can make the assets harder to reach. A revocable trust does not. Answering here does not create either.', weights: { protection: 1 } },
      { label: 'I have not thought about it', note: 'Nothing is added until you do.', weights: {} },
    ],
  },
  {
    id: 'stolen', group: 'protect',
    text: 'Are you worried the money, a house, or other property could be stolen, or taken by someone who pressures you?',
    why: 'Theft and pressure are not the same problem as a lawsuit. Insurance can cover theft. A trust does not stop someone from pressuring you. Keeping your name off property and accounts makes you harder to find. It does not hide money from the tax office.',
    options: [
      { label: 'No', note: 'Nothing is added.', weights: {} },
      { label: 'Yes. Theft', note: 'Insurance can cover theft. Keeping your name off property makes you harder to find.', weights: { protection: 0.5 } },
      { label: 'Yes. Someone pressuring me', note: 'A trust does not stop pressure. Keeping your name off property and accounts makes you harder to find.', weights: { protection: 0.5 } },
      { label: 'Both', note: 'Insurance for theft. Keeping your name off property and accounts for pressure.', weights: { protection: 1 } },
    ],
  },
  {
    id: 'who', group: 'protect',
    text: 'Who are you worried about?',
    why: 'The answer changes what helps. A stranger is harder to reach if your name is off property. A family member or friend may already know where the money is. A business partner or creditor may have a claim that a trust cannot block if it was funded after the claim. The question does not assume you have any of them.',
    options: [
      { label: 'No one in particular', note: 'Nothing is added.', weights: {} },
      { label: 'A stranger', note: 'Keeping your name off property and accounts makes you harder to find.', weights: { protection: 0.5 } },
      { label: 'A family member or friend', note: 'They may already know. A trust does not stop them from asking. It can make the assets harder to take if it is irrevocable and funded before any claim.', weights: { protection: 0.5 } },
      { label: 'A business partner or creditor', note: 'A trust funded after a claim, or to dodge a creditor, can be undone. Insurance protects you, the person.', weights: { protection: 1 } },
      { label: 'All of the above', note: 'Insurance protects you. Keeping your name off property and accounts makes you harder to find. An irrevocable trust funded before any claim can make assets harder to reach.', weights: { protection: 1 } },
    ],
  },
  {
    id: 'hold', group: 'protect',
    text: 'Do you want assets held so a lawsuit has a harder time reaching them?',
    why: 'This is the irrevocable trust decision. An irrevocable trust cannot be taken back, and you cannot change it on your own. Someone else is the trustee. You no longer own what you put in. That is why a later lawsuit has a harder time taking those assets. It has to be funded before any claim. A revocable trust does not protect assets from your own creditors while you are alive. Answering here does not create a trust.',
    options: [
      { label: 'No', note: 'Nothing is moved.', weights: {} },
      { label: 'Yes. A revocable trust', note: 'You can change it. It does not protect assets from your own creditors while you are alive.', weights: { protection: 0.3 } },
      { label: 'Yes. An irrevocable trust', note: 'It has to be funded before any claim. You no longer own what you put in. Answering here does not create it.', weights: { protection: 1 } },
      { label: 'Yes. Both. A revocable trust and an irrevocable trust', note: 'The revocable one you can change. The irrevocable one protects what you put in, if it is funded before any claim.', weights: { protection: 1 } },
      { label: 'I do not know yet', note: 'Nothing is moved until you decide.', weights: {} },
    ],
  },
  {
    id: 'last', group: 'long',
    text: 'How long does this money need to last?',
    why: 'Your age sets what long term means. A fixed year 25 is not the finish line. If the money has to last your whole life, the yearly amount has to be sustainable for that long. If it only has to last a shorter stretch, more can be spent now. The result checks the yearly amount against the stretch you choose.',
    options: [
      { label: 'My whole life', note: 'The yearly amount has to be sustainable for the long stretch set by your age.', weights: { growth: 0.5 } },
      { label: 'About the next 10 years', note: 'More can be spent now. Less has to be left for later.', weights: { income: 1 } },
      { label: 'I do not know', note: 'The result uses the long stretch set by your age. You can change it later.', weights: {} },
    ],
  },
  {
    id: 'renounce', group: 'long',
    text: 'Do you want to give up US citizenship?',
    why: 'This is the step that ends US tax on money from anywhere. It has its own tax, called the exit tax, on the gain in your assets as if you sold them. It also means you may not be able to live in the US again. A second passport does not do this. Living in Puerto Rico does not do this. Puerto Rico keeps US citizenship.',
    options: [
      { label: 'No', note: 'US tax on worldwide income continues.', weights: {} },
      { label: 'Yes', note: 'The exit tax applies to the gain in your assets. You may not be able to live in the US again. Answering here does not renounce.', weights: { mobility: 1 } },
      { label: 'I do not know yet', note: 'Nothing changes until you decide.', weights: {} },
    ],
  },
  {
    id: 'gone', group: 'long',
    text: 'If you died, what do you want to be true about the money?',
    why: 'You may not live to the end of the long stretch. What is left, and who can reach it, is the question. A trust can be written so someone else receives what is left. An irrevocable trust funded during life can make the estate harder for a lawsuit to reach. Amounts above $15 million per person can face estate tax if the money is still in your estate. Answering here does not write a trust.',
    options: [
      { label: 'I have not decided', note: 'The result still shows what would be left. No further step is added.', weights: { legacy: 0.2 } },
      { label: 'Someone else should receive what is left', note: 'A trust can be written for that. Answering here does not write it. Amounts above $15 million per person can face estate tax if the money is still in your estate.', weights: { legacy: 1 } },
      { label: 'I want the estate harder for a lawsuit or a claim to reach', note: 'An irrevocable trust funded during life can do this. A revocable trust does not protect assets from your own creditors while you are alive. Neither hides money from the tax office.', weights: { protection: 1 } },
      { label: 'I want as much as possible already used on the life I chose', note: 'The priority is the life, not a pile left over. The result checks the yearly amount.', weights: { income: 1 } },
    ],
  },
  {
    id: 'aging', group: 'long',
    text: 'Is there a cost of aging, care, or a long illness that has to come out of the money later?',
    why: 'Care late in life can use the money the life was supposed to run on. If it is not in the yearly amount for the later years, the result will show the money lasting longer than it actually will. You do not have to name the issue. If yes, the yearly amount in later years should include the care.',
    options: [
      { label: 'No', note: 'No extra reserve is added.', weights: {} },
      { label: 'Yes', note: 'The yearly amount in later years should include care. The result uses the number you typed.', weights: {} },
      { label: 'I have not thought about it', note: 'Nothing is added until you do.', weights: {} },
    ],
  },
  {
    id: 'never', group: 'long',
    text: 'What will you not do, even if it would lower a future tax?',
    why: 'A tax saving you will not actually do is not a plan. If you will not move, state tax on later income stays where you are. If you will not live in Puerto Rico, that path is off the table. If you will not give up US citizenship, US tax on worldwide income continues. The lottery check is taxed where you live when you receive it either way.',
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
