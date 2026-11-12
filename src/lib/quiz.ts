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
    id: 'later', group: 'long',
    text: 'Do later years cost more than the yearly amount?',
    why: 'The yearly amount you typed is what the early years use. If later years cost more, because of care or anyone you support, type that amount under this question. From year 11 through year 25, the page uses that amount instead. If you say no, every year uses the first amount.',
    options: [
      { label: 'No. The yearly amount stays the same', note: 'Years 2 through 25 use the yearly amount you typed.', weights: {} },
      { label: 'Yes. Later years cost more', note: 'Type the later amount under this question. From year 11 on, that amount replaces the first one.', weights: {} },
      { label: 'I have not decided', note: 'The yearly amount stays what you typed until you type a later amount.', weights: {} },
    ],
  },
  {
    id: 'family', group: 'short',
    text: 'Who else relies on this money besides you?',
    why: 'More people relying on the money means the yearly amount has to cover more lives. It also changes what "leaving something" should mean later. The result does not judge the number. It checks whether it can be paid.',
    options: [
      { label: 'Just me', note: 'The yearly amount only has to cover you.', weights: {} },
      { label: 'A partner or kids', note: 'The yearly amount has to cover the household. It also makes the estate question worth answering below.', weights: { legacy: 0.5 } },
      { label: 'Parents, or other people too', note: 'Include their support in the yearly amount. If later care costs more, answer "later years cost more" below.', weights: { legacy: 0.5, income: 0.3 } },
    ],
  },
  {
    id: 'team', group: 'short',
    text: 'Who is helping you with this money right now?',
    why: 'A lottery-sized check usually needs a tax attorney, a CPA, and a fee-only advisor. This answer changes nothing in the math. It tells you whether the next step is hiring them.',
    options: [
      { label: 'Nobody yet', note: 'The usual first three hires: a tax attorney, a CPA, and a fee-only fiduciary advisor. In that order.', weights: {} },
      { label: 'Friends and family', note: 'Useful for support. The tax and trust work still needs licensed professionals.', weights: {} },
      { label: 'I have professionals already', note: 'Show them the result. The assumptions are editable, so they can argue with the rates.', weights: {} },
    ],
  },
  {
    id: 'discipline', group: 'short',
    text: 'Be honest: a very large check lands. What happens first?',
    why: 'The most common way lottery money dies is not tax or markets. It is spending. This answer does not judge you. It only affects whether the result emphasizes guardrails.',
    options: [
      { label: 'I have a plan and I will follow it', note: 'No guardrails added. The yearly amount you type drives everything.', weights: { income: 0.5 } },
      { label: 'I will figure it out as I go', note: 'Consider starting with a smaller yearly amount. You can raise it later.', weights: {} },
      { label: 'I might overspend', note: 'Guardrails help: keep the yearly amount modest, and read the annuity comparison — 30 years of checks is a built-in guardrail.', weights: { income: 0.3 } },
    ],
  },
  {
    id: 'risk', group: 'middle',
    text: 'The market drops 30%. What do you actually do?',
    why: 'This is different from the bad-stretch question above. That one is about whether the yearly check must continue. This one is about your behavior. Selling in a panic is how compounding dies.',
    options: [
      { label: 'Sell everything and hide', note: 'If that is likely, keep more in bonds and the insurance wrapper, and less in stocks.', weights: { income: 0.8, protection: 0.3 } },
      { label: 'Get nervous but hold', note: 'Normal. The balanced split is built for this.', weights: {} },
      { label: 'Barely look at it', note: 'More can stay in stocks. Compounding does the work.', weights: { growth: 0.5 } },
    ],
  },
  {
    id: 'spendpattern', group: 'middle',
    text: 'Do you want the same dollar amount every year, or more later to keep up with prices?',
    why: 'A flat amount means your buying power slowly shrinks as prices rise. An amount that grows with inflation keeps your lifestyle but leaves less compounding. Both are valid. This answer changes the draw schedule in the model.',
    options: [
      { label: 'The same amount every year (flat)', note: 'The model uses a flat draw. More stays compounding. Later years buy less.', weights: {} },
      { label: 'Grow it with prices (inflation-linked)', note: 'The model grows the draw each year. Your lifestyle stays constant in real terms.', weights: {} },
      { label: 'I do not know', note: 'The model uses inflation-linked. You can flip it on the calculator.', weights: {} },
    ],
  },
  {
    id: 'reinvest', group: 'middle',
    text: 'If you take out more than you spend in a year, what should happen to the rest?',
    why: 'Cash sitting outside the stack earns taxable interest and sits in your estate. The stack is usually the best place to reinvest it. A business, an Opportunity Zone fund, or property can justify taking it out — those have their own tax shelters.',
    options: [
      { label: 'Back into the stack', note: 'Best default: pay down policy loans, buy more ladder, or reinvest in the stock engine.', weights: { growth: 0.5 } },
      { label: 'Into a business or venture', note: 'Read the QSBS card: startup stock can exclude up to $15M of gain after 5 years.', weights: {} },
      { label: 'Keep it as cash for a while', note: 'Park it in Treasuries or a tax-exempt money market, not a 0% checking account.', weights: { simplicity: 0.5 } },
    ],
  },
  {
    id: 'business', group: 'middle',
    text: 'Do you plan to start or buy a business?',
    why: 'A business can beat anything the stack offers — or lose everything. If it is a C-corporation, startup stock can carry a $15M federal gain exclusion after 5 years. That is why the business dollars get their own box instead of being mixed with the investments.',
    options: [
      { label: 'No', note: 'Nothing is set aside for a business.', weights: {} },
      { label: 'Yes, or maybe', note: 'Type the amount in the business box. Read the QSBS card before choosing the legal form.', weights: {} },
      { label: 'I already have one', note: 'If it is a C-corp, ask your CPA about QSBS before any sale or restructure.', weights: {} },
    ],
  },
  {
    id: 'umbrella', group: 'protect',
    text: 'Do you have umbrella liability insurance?',
    why: 'Trusts make assets harder to take. Insurance pays when you are sued. They solve different problems. A large umbrella policy is usually the cheapest protection you can buy.',
    options: [
      { label: 'Yes', note: 'Check the limit against your new net worth. Many winners carry $5M or more.', weights: { protection: 0.5 } },
      { label: 'No', note: 'Worth pricing before any complex structure. It is usually the cheapest protection there is.', weights: { protection: 0.5 } },
      { label: 'I do not know what that is', note: 'Umbrella insurance pays legal costs and judgments above your home and auto policies. Ask an insurance broker, not a trust promoter.', weights: { protection: 0.3 } },
    ],
  },
  {
    id: 'foreign', group: 'protect',
    text: 'Has anyone suggested a foreign (offshore) trust to save on taxes?',
    why: 'For a US citizen, a foreign trust you fund and benefit from is a grantor trust: every gain inside is taxed to you personally. It is an asset-protection tool, not a tax tool. This answer adds a warning, not a structure.',
    options: [
      { label: 'Yes, or I saw a video about it', note: 'Read the Foreign Trust Reality Check in the Strategy Library. Protection yes, tax savings no.', weights: { protection: 0.3 } },
      { label: 'No', note: 'Nothing to unlearn.', weights: {} },
      { label: 'I am not a US citizen', note: 'Different rules. Your home country decides the tax. This page uses US federal and state rules.', weights: {} },
    ],
  },
  {
    id: 'estate', group: 'long',
    text: 'Will your estate be worth more than $15 million per person?',
    why: 'That is the 2026 federal estate exclusion. Above it, the top estate tax rate is 40%. The dynasty-trust layer exists for this. It works best when funded while the assets are still small.',
    options: [
      { label: 'Yes, clearly', note: 'Talk to an estate attorney about the dynasty layer early. Moving growth assets out now is the point.', weights: { legacy: 1 } },
      { label: 'Possibly, with growth', note: 'Worth a review once a year, not a structure on day one.', weights: { legacy: 0.5 } },
      { label: 'No', note: 'The estate layer can wait.', weights: {} },
    ],
  },
  {
    id: 'giving', group: 'long',
    text: 'How do you want to give to charity?',
    why: 'A donor-advised fund gives a deduction in the big tax year and lets you grant over time. A charitable remainder trust can sell appreciated assets tax-free and pay you income for life. Both beat writing checks from a taxable account.',
    options: [
      { label: 'A fund now, grants over time', note: 'That is a donor-advised fund. It fits the big-tax-year deduction.', weights: { legacy: 0.4 } },
      { label: 'Give assets but keep an income', note: 'That is a charitable remainder trust. Part goes to charity, so it is not an income maximizer.', weights: { legacy: 0.6, income: 0.3 } },
      { label: 'No giving planned', note: 'Nothing is added.', weights: {} },
    ],
  },
  {
    id: 'retire', group: 'long',
    text: 'When do you want work to be optional?',
    why: 'This is the real "long term." If work must be optional soon, the yearly amount has to be reliable now. If it can wait, more can compound before the draws begin.',
    options: [
      { label: 'Immediately', note: 'The yearly amount has to be reliable from month 13 on.', weights: { income: 0.8 } },
      { label: 'In about 10 years', note: 'A decade of compounding first. The growth-leaning settings fit.', weights: { growth: 0.6 } },
      { label: 'I do not want to stop', note: 'The stack can be all growth. Take income only if you want it.', weights: { growth: 0.8 } },
    ],
  },

  {
    id: 'never', group: 'long',
    text: 'Which of these are you willing to do?',
    why: 'A tax change you will not actually do is not a plan. Pick the one you would do. If you would not move, later income stays taxed where you are. If you would not live in Puerto Rico, that path is off. If you would not give up US citizenship, US tax on money from anywhere continues.',
    options: [
      { label: 'I would move to another state', note: 'Later income can be taxed in that state. The lottery check is taxed where you live when you receive it.', weights: { mobility: 0.5 } },
      { label: 'I would live in Puerto Rico more than half the year', note: 'Later investment gains can use that path. You have to actually be there.', weights: { mobility: 1 } },
      { label: 'I would give up US citizenship', note: 'That is the step that ends US tax on money from anywhere. It has its own tax.', weights: { mobility: 1 } },
      { label: 'None of these', note: 'You stay where you are. US tax on money from anywhere continues.', weights: { mobility: 0 } },
    ],
  },
];

export const QUIZ_SHORT = ['claim', 'filing', 'worry', 'family', 'team', 'discipline'] as const;
export const QUIZ_MIDDLE = ['live', 'time', 'market', 'give', 'risk', 'spendpattern', 'reinvest', 'business'] as const;
export const QUIZ_PROTECT = ['sue', 'stolen', 'who', 'hold', 'umbrella', 'foreign'] as const;
export const QUIZ_LONG = ['last', 'renounce', 'gone', 'later', 'never', 'estate', 'giving', 'retire'] as const;

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
