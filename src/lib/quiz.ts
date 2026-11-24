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
    text: 'First things first — is the number you typed the big check before taxes, or what\'s actually left after them?',
    why: 'A $100 million check isn\'t $100 million to spend, so the math needs to know which number it\'s starting from.',
    options: [
      { label: 'The big check, before taxes', note: 'The tax still has to come off — so only part of that number is actually yours to spend.', weights: {} },
      { label: 'What\'s left after taxes', note: 'The tax is already taken care of, so the whole number is yours.', weights: {} },
      { label: 'Honestly, I\'m not sure which one I typed', note: 'No problem — the result guesses it\'s the before-tax number just to be safe, and you can flip it anytime.', weights: {} },
    ],
  },
  {
    id: 'filing', group: 'short',
    text: 'When you file taxes on this money, is it just you on the return, or you and a spouse?',
    why: 'Two people on one return get more room in the lower tax brackets, so this one answer changes the estimate a lot.',
    options: [
      { label: 'Just me', note: 'The estimate uses the tax rates for one person.', weights: {} },
      { label: 'Me and my spouse', note: 'The estimate uses the tax rates for a married couple filing together.', weights: {} },
      { label: 'I don\'t know yet', note: 'No worries — it assumes just you for now, and it\'s easy to change later.', weights: {} },
    ],
  },
  {
    id: 'worry', group: 'short',
    text: 'When you think about this money late at night, what\'s the first worry that pops up?',
    why: 'Your answer tells the result what to double-check first.',
    options: [
      { label: 'Running out of money', note: 'The result double-checks that your yearly amount can actually be paid without the pile running dry.', weights: { income: 1 } },
      { label: 'People finding out I won', note: 'Keeping your name off the house, the car, and your accounts makes you much harder to find — and the result walks you through it.', weights: { protection: 1 } },
      { label: 'A giant tax bill', note: 'The tax on the check is set by the amount and the state you live in when you get it — moving later doesn\'t change it.', weights: {} },
      { label: 'A big health or care cost', note: 'Make sure the yearly amount you type includes it, so the plan covers care as well as the fun stuff.', weights: {} },
      { label: 'Nothing, honestly', note: 'Then nothing extra is added for this answer.', weights: {} },
      { label: 'A few of these at once', note: 'Totally normal — the result leans on both the running-out check and the privacy steps together.', weights: { income: 0.5, protection: 0.5 } },
    ],
  },
  {
    id: 'live', group: 'middle',
    text: 'Where do you picture yourself living most of the time?',
    why: 'The place you actually live sets the tax on your future income, so it changes the numbers.',
    options: [
      { label: 'Right where I am now', note: 'Your state taxes keep working the way they do today. The lottery check itself is taxed here no matter what.', weights: { mobility: 0 } },
      { label: 'A different US state', note: 'Moving to a no-income-tax state lowers the tax on money you earn after the move.', weights: { mobility: 0.5 } },
      { label: 'Puerto Rico — and I\'d really be there most of the year', note: 'It only counts if you actually live there more than half the year. Then later investment gains get the Puerto Rico treatment.', weights: { mobility: 1 } },
      { label: 'Another country', note: 'US tax follows you abroad. It only ends if you give up US citizenship.', weights: { mobility: 0.7 } },
      { label: 'A couple of places — I haven\'t decided yet', note: 'The result assumes you stay put until you pick. Moving only changes the tax on income you earn after the move.', weights: { mobility: 0.3 } },
    ],
  },
  {
    id: 'time', group: 'middle',
    text: 'Day to day, what do you want the next decade to look like?',
    why: 'Whatever that life costs is the yearly number the money has to cover.',
    options: [
      { label: 'Quit working and live off this money', note: 'The yearly amount has to cover everything, so the result checks it can keep being paid without running out.', weights: { income: 1 } },
      { label: 'Travel a lot, maybe split time between places', note: 'The yearly amount has to cover the travel and the places, so the result checks that number.', weights: { mobility: 0.5 } },
      { label: 'Honestly, I haven\'t decided', note: 'The result uses the yearly amount you typed. You can change it later.', weights: {} },
      { label: 'A bit of both — work less, travel some', note: 'The yearly amount still has to cover the life. The result checks that it can be paid.', weights: { income: 0.5, mobility: 0.3 } },
    ],
  },
  {
    id: 'market', group: 'middle',
    text: 'If markets have a rough few years, what absolutely has to keep getting paid?',
    why: 'Bills that can\'t wait push more of your money into steadier things that drop less.',
    options: [
      { label: 'My yearly spending money — that has to keep coming', note: 'More of the money sits in steadier things so the checks keep coming, even in a bad stretch. Less is left to grow.', weights: { income: 1, growth: 0 } },
      { label: 'Nothing fixed — I could tighten my belt for a while', note: 'More of the money can stay invested for growth. Your yearly amount just shrinks for a few years.', weights: { growth: 1, income: 0 } },
      { label: 'I really don\'t know', note: 'The result splits the difference. You can change it later.', weights: {} },
      { label: 'A bit of both — keep it coming, but I could trim it', note: 'The result splits the difference: enough steady money to keep the check coming, enough left over to grow.', weights: { income: 0.5, growth: 0.5 } },
    ],
  },
  {
    id: 'give', group: 'middle',
    text: 'Any plans to give some of this away?',
    why: 'Gifts come straight off the pile that pays for your life, and gifts to people and to charity are taxed differently.',
    options: [
      { label: 'No, not really', note: 'Nothing is given away.', weights: {} },
      { label: 'Yes — to family or friends', note: 'Type the amount. It comes off your pile, and it can count against your estate tax exclusion.', weights: { legacy: 0.5 } },
      { label: 'Yes — to charity', note: 'Type the amount. It comes off your pile, and it can cut your income tax in the year you give it.', weights: { legacy: 0.3 } },
      { label: 'I haven\'t decided yet', note: 'Nothing is given away until you type an amount.', weights: {} },
      { label: 'Yes — some to people, some to charity', note: 'Both come off your pile. Type the amounts; each kind of gift gets its own tax treatment.', weights: { legacy: 0.5 } },
    ],
  },
  {
    id: 'archetype', group: 'middle',
    text: 'Which of these sounds most like you?',
    why: 'This one answer does the most to shape how your money is split between paying you now and growing for later.',
    options: [
      { label: 'I want to enjoy the money now', note: 'The plan leans steadier so your yearly amount keeps coming, even in a rough market — with less left growing for later.', weights: { income: 1 } },
      { label: 'A bit of both', note: 'The plan splits the difference: enough steady money to keep the check coming, enough left over to grow.', weights: { income: 0.5, growth: 0.5 } },
      { label: 'I\'d rather let it grow for later', note: 'The plan leans toward growing the money; the yearly amount may have to flex in a rough patch, but more builds up for later.', weights: { growth: 1 } },
    ],
  },
  {
    id: 'threats', group: 'protect',
    text: 'When you think about this money, what keeps you up at night?',
    why: 'Whatever scares you most is the thing the plan should protect against first.',
    options: [
      { label: 'Getting sued or owing someone', note: 'Good liability insurance is the cheap first step. A trust set up before anyone has a claim can make the money harder to grab.', weights: { protection: 1 } },
      { label: 'Strangers finding me or my family', note: 'Keeping your name off the house, the car, and your accounts makes you a lot harder to track down.', weights: { protection: 1 } },
      { label: 'The stock market tanking', note: 'That is about how the money is invested, not paperwork — steadier investments simply drop less in a crash.', weights: {} },
      { label: 'The tax bill', note: 'The tax on the prize is set by the amount and the state you live in when you get it, so there is nothing to dodge — only to plan for.', weights: {} },
      { label: 'Honestly, none of these', note: 'That is a good place to be. No extra protection step gets added.', weights: {} },
    ],
  },
  {
    id: 'renounce', group: 'long',
    text: 'Would you ever give up your US citizenship just to end the taxes?',
    why: 'It is the only move that truly ends US tax, but it comes with a steep exit toll — so most people answer no.',
    options: [
      { label: 'No way — I am staying American', note: 'US tax keeps applying to you, and that is fine. The rest of the plan is built to work with it.', weights: {} },
      { label: 'Honestly, yes — I would consider it', note: 'You would owe an exit tax as if you had sold everything, and living in the US again gets hard. Answering here changes nothing.', weights: { mobility: 1 } },
      { label: 'I have no idea yet', note: 'Totally fair. Nothing changes until you actually decide.', weights: {} },
      { label: 'Wait — people actually do that?', note: 'They do, but most winners skip it. It is only here because it is the one step that ends US tax for good.', weights: {} },
    ],
  },
  {
    id: 'gone', group: 'long',
    text: 'If you died tomorrow, what should be true about the money?',
    why: 'Whatever is still in your name above roughly $15 million per person can lose up to 40% to estate tax before your people see a dime.',
    options: [
      { label: 'Honestly, I have not thought about it', note: 'No problem — the result still shows what would be left over, and you can come back to this.', weights: { legacy: 0.2 } },
      { label: 'It should go to the people I love', note: 'A trust can make sure of that, and setting one up early keeps more of the money out of the estate tax zone.', weights: { legacy: 1 } },
      { label: 'It should be nearly impossible to sue and grab', note: 'A trust you fund while you are alive can do that. One you can still change freely does not shield the money from your own creditors.', weights: { protection: 1 } },
      { label: 'I want it mostly spent on the life I chose', note: 'Fair enough — the result focuses on the yearly amount that funds your life, not the leftovers.', weights: { income: 1 } },
      { label: 'A mix — some for my people, some spent on living', note: 'The most common answer. The result shows what would be left, and you can fine-tune the split later.', weights: { legacy: 0.5, income: 0.5 } },
    ],
  },
  {
    id: 'later', group: 'long',
    text: 'Do you expect your later years to cost more than your early ones?',
    why: 'Care and family tend to get pricier over time, so the plan needs to know if your yearly amount should step up later.',
    options: [
      { label: 'No — my spending should stay about the same', note: 'Every year just uses the yearly amount you typed.', weights: {} },
      { label: 'Yes — later years will cost more', note: 'Type the later amount under this question, and the plan switches to it in the later years.', weights: {} },
      { label: 'I haven\'t decided yet', note: 'The plan keeps using your first yearly amount until you add a later one.', weights: {} },
      { label: 'Probably — care and family add up', note: 'That counts as a yes: type the later amount and the plan switches to it later on.', weights: {} },
    ],
  },
  {
    id: 'family', group: 'short',
    text: 'Who else is counting on this money besides you?',
    why: 'The more people it has to carry, the bigger the yearly amount needs to be.',
    options: [
      { label: 'Just me — I\'m on my own with this', note: 'Then the yearly amount only needs to cover your life.', weights: {} },
      { label: 'My partner and/or kids', note: 'The yearly amount has to carry the whole household, and it\'s worth answering the "if something happens to you" question below.', weights: { legacy: 0.5 } },
      { label: 'Them plus parents or other family', note: 'Add their support into the yearly amount. If their care gets pricier later, answer "later years cost more" below.', weights: { legacy: 0.5, income: 0.3 } },
      { label: 'Nobody yet, but that could change', note: 'Fine — cover yourself for now. The questions below about leaving money behind are still worth a minute.', weights: { legacy: 0.3 } },
    ],
  },
  {
    id: 'team', group: 'short',
    text: 'Who\'s in your corner on this?',
    why: 'A check this size is too big to handle alone, so this just checks whether hiring help is your next step.',
    options: [
      { label: 'Honestly? Nobody yet', note: 'The usual first three hires: a tax attorney, a CPA, and a fee-only advisor. In that order.', weights: {} },
      { label: 'Friends and family have my back', note: 'That support matters. The tax and trust paperwork, though, still needs licensed pros.', weights: {} },
      { label: 'I already have professionals I trust', note: 'Great — show them the result. The assumptions are editable, so they can argue with the rates.', weights: {} },
      { label: 'Mostly people pitching me "opportunities"', note: 'A pitch is not advice. The three hires above work for you, not for a commission.', weights: {} },
    ],
  },
  {
    id: 'discipline', group: 'short',
    text: 'Be honest — a huge check lands. What happens first?',
    why: 'Fortunes like this usually die from spending, not taxes, so this decides how many guardrails the result suggests.',
    options: [
      { label: 'I stick to the plan I made', note: 'Then no guardrails are needed — the yearly amount you type drives everything.', weights: { income: 0.5 } },
      { label: 'I\'ll figure it out as I go', note: 'Then start with a smaller yearly amount. You can always raise it later.', weights: {} },
      { label: 'I probably blow through some of it', note: 'Guardrails help: keep the yearly amount modest, and read the annuity comparison — 30 years of checks is a built-in guardrail.', weights: { income: 0.3 } },
      { label: 'A little of all three, depending on the day', note: 'Then cheap guardrails are your friend: start with a modest yearly amount and raise it later if all goes well.', weights: { income: 0.3 } },
    ],
  },
  {
    id: 'risk', group: 'middle',
    text: 'The market drops 30%. What do you actually do?',
    why: 'How you react on a bad day decides how much of the money can safely stay in stocks.',
    options: [
      { label: 'Sell everything before it gets worse', note: 'That is how fortunes stall out. If this sounds like you, more of the money should sit in steadier things from the start.', weights: { income: 0.8, protection: 0.3 } },
      { label: 'Worry a lot, but ride it out', note: 'That is most people. A middle split is built exactly for this.', weights: {} },
      { label: 'Shrug and barely check it', note: 'More of the money can stay in stocks, which is where the real growth happens over the long run.', weights: { growth: 0.5 } },
      { label: 'Call my advisor before touching anything', note: 'Good instinct — being the person you call that day is a big part of what a good advisor is for.', weights: {} },
    ],
  },
  {
    id: 'spendpattern', group: 'middle',
    text: 'Same dollar amount every year, or a bit more each year to keep up with prices?',
    why: 'Prices creep up, so a flat amount quietly buys you less each year — but leaving more money alone lets it grow.',
    options: [
      { label: 'Same amount every year, keep it simple', note: 'Easy to plan around, and more money stays invested. Just know it will buy a little less each year.', weights: {} },
      { label: 'Give myself a small raise as prices rise', note: 'Your lifestyle stays the same in real terms, though a bit less is left compounding.', weights: {} },
      { label: 'No idea — pick for me', note: 'We will go with the small yearly raise. You can flip it on the calculator any time.', weights: {} },
      { label: 'Steady now, more room later', note: 'That is close to the small yearly raise, so that is what we will use. You can fine-tune it later.', weights: {} },
    ],
  },
  {
    id: 'reinvest', group: 'middle',
    text: 'If you take out more than you spend in a year, what should happen to the rest?',
    why: 'Leftover cash that just sits around earns little and gets taxed, so it helps to know where you would want it to go.',
    options: [
      { label: 'Put it back to work in the plan', note: 'The safest habit: extra goes back into your investments and keeps compounding.', weights: { growth: 0.5 } },
      { label: 'Use it for a business idea', note: 'Worth doing on purpose, not by accident. A business set up the right way gets its own tax breaks.', weights: {} },
      { label: 'Hold onto it as cash for a while', note: 'Fine for a stretch — just park it somewhere that pays interest, not a checking account.', weights: { simplicity: 0.5 } },
      { label: 'Depends on the year, honestly', note: 'Totally fair. We will treat the plan as the default home and you can detour when you feel like it.', weights: { growth: 0.3 } },
    ],
  },
  {
    id: 'business', group: 'middle',
    text: 'Planning to start or buy a business?',
    why: 'A business can be the best or worst use of this money, so it gets its own line in the plan instead of hiding in the pile.',
    options: [
      { label: 'No, not interested', note: 'Nothing gets set aside, and all of the money stays in the main plan.', weights: {} },
      { label: 'Yes, or at least thinking about it', note: 'We will give it its own box so it never quietly eats the rest of the plan.', weights: {} },
      { label: 'I already own one', note: 'Before you sell or restructure anything, have your accountant look at it — there are big tax breaks hiding here.', weights: {} },
      { label: 'Someone is already pitching me a deal', note: 'Slow down — a big check attracts bad deals. Let your accountant read any offer before you answer.', weights: {} },
    ],
  },
  {
    id: 'foreign', group: 'protect',
    text: 'Has anyone tried to sell you on an offshore trust yet?',
    why: 'An offshore trust can shield money from lawsuits, but for a US citizen it saves zero tax — and the pitch usually skips that part.',
    options: [
      { label: 'Yes, someone pitched me one', note: 'Read the Foreign Trust Reality Check first: it can protect your assets, but every dollar of gain inside is still taxed to you.', weights: { protection: 0.3 } },
      { label: 'No, never come up', note: 'Good — nothing to unlearn, then.', weights: {} },
      { label: 'I am not a US citizen', note: 'Different rules apply to you. Your home country sets the tax; this page uses US federal and state rules.', weights: {} },
      { label: 'Not yet, but my feed definitely knows I won', note: 'The pitch usually starts as a slick video. The Reality Check card in the library has the actual rules.', weights: {} },
    ],
  },
  {
    id: 'estate', group: 'long',
    text: 'Do you think your estate could top $15 million per person?',
    why: 'Above roughly that amount, the federal estate tax can take up to 40% — and the fixes work best when they are set up early.',
    options: [
      { label: 'Yes, definitely', note: 'Then it is worth talking to an estate attorney early, while everything is still growing.', weights: { legacy: 1 } },
      { label: 'Maybe — it depends how things grow', note: 'Worth checking once a year rather than building anything on day one.', weights: { legacy: 0.5 } },
      { label: 'No — I doubt it gets that big', note: 'Then this can wait.', weights: {} },
      { label: 'Honestly, I have no idea', note: 'A rough guess is fine: prize, plus house, plus investments, grown for a decade. The result shows the number it uses.', weights: {} },
    ],
  },
  {
    id: 'retire', group: 'long',
    text: 'When do you want work to be optional?',
    why: 'The sooner work is optional, the sooner the money has to pay you reliably — later gives it more time to grow first.',
    options: [
      { label: 'Right away', note: 'Then the yearly amount has to be reliable from the start.', weights: { income: 0.8 } },
      { label: 'In about ten years', note: 'That gives the money a decade to grow before it has to pay you.', weights: { growth: 0.6 } },
      { label: 'I don\'t want to stop working', note: 'Then the money can focus on growing; take from it only if you feel like it.', weights: { growth: 0.8 } },
      { label: 'It already is — I won the lottery', note: 'Fair point. The yearly amount still has to be reliable, so the plan treats this like "right away."', weights: { income: 0.5 } },
    ],
  },
];

export const QUIZ_SHORT = ['claim', 'filing', 'worry', 'family', 'team', 'discipline'] as const;
export const QUIZ_MIDDLE = ['live', 'time', 'market', 'give', 'risk', 'spendpattern', 'reinvest', 'business', 'archetype'] as const;
export const QUIZ_PROTECT = ['threats', 'foreign'] as const;
export const QUIZ_LONG = ['renounce', 'gone', 'later', 'estate', 'retire'] as const;

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

export function profileFromStartChoices(choices: { risk?: 'steady' | 'balanced' | 'growth' | null; legacy?: 'yes' | 'no' | 'unsure' | null }): GoalProfile {
  const profile: GoalProfile = { income: 0.5, growth: 0.5, protection: 0, mobility: 0, legacy: 0.5, simplicity: 1 };
  if (choices.risk === 'steady') { profile.income = 1; profile.growth = 0; }
  if (choices.risk === 'growth') { profile.income = 0; profile.growth = 1; }
  if (choices.legacy === 'yes') profile.legacy = 1;
  if (choices.legacy === 'no') profile.legacy = 0;
  return profile;
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
  const desiredDial = profile.growth > profile.income ? 0 : profile.income > profile.growth ? 100 : 50;
  const riskFit = inputs.mode === 'manual' ? 0.8 : 1 - Math.abs(inputs.dial - desiredDial) / 100;
  const maxEnd = Math.max(1, ..._allResults.map((r) => r.stackEnd));
  const growthFit = Math.max(0, result.stackEnd / maxEnd);
  const legacyFit = profile.legacy >= 0.75
    ? (inputs.ppliEnabled !== false ? 1 : 0.35)
    : profile.legacy <= 0.25
      ? (inputs.ppliEnabled === false ? 1 : 0.8)
      : 0.9;
  const dims: Array<{ label: string; score: number; weight: number }> = [
    { label: 'Pays for the life', score: sustainFit, weight: 1 + profile.income * 0.4 },
    { label: 'Still there through the middle stretch', score: dry, weight: 0.6 },
    { label: 'Matches your market comfort', score: riskFit, weight: 0.5 },
    { label: 'Long-term compounding', score: growthFit, weight: 0.4 + profile.growth * 0.4 },
    { label: 'Matches your beneficiary choice', score: legacyFit, weight: 0.4 },
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
