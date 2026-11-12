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
    text: 'First things first — is the number you typed the big lottery check before taxes, or what is actually left after them?',
    why: 'The lottery withholds tax before it pays you, so a $100 million check is not $100 million to spend. The result just needs to know which number it is starting from.',
    options: [
      { label: 'The lottery check, before tax', note: 'Tax still comes off. Only what is left can pay for the life.', weights: {} },
      { label: 'What is already left after tax', note: 'Nothing more is taken off for prize tax.', weights: {} },
      { label: 'I honestly don\'t know which one I typed', note: 'The result assumes the number is before tax, which is the cautious guess. You can flip it any time.', weights: {} },
    ],
  },
  {
    id: 'filing', group: 'short',
    text: 'When you file taxes on this money, is it just you on the return, or you and someone else?',
    why: 'Two people on one return get wider tax brackets before the rates climb. This is only about the tax paperwork, not who you live with or support.',
    options: [
      { label: 'Only me', note: 'The estimate uses one person.', weights: {} },
      { label: 'Me and another person', note: 'The estimate uses two people on the return.', weights: {} },
      { label: 'I don\'t know how I\'ll file yet', note: 'The estimate treats it as one person for now. Easy to change once you know.', weights: {} },
    ],
  },
  {
    id: 'worry', group: 'short',
    text: 'When you lie awake thinking about this money, which worry shows up first?',
    why: 'Your answer tells the result what to double-check: running out, staying private, the tax bill, or care costs.',
    options: [
      { label: 'That I will run out, or spend it faster than I mean to', note: 'The result checks whether the yearly amount can be paid without the money running out.', weights: { income: 1 } },
      { label: 'That people will find out, ask, or target me', note: 'Keeping your name off a house, a car, and accounts makes you harder to find. It does not stop a lawsuit or hide money from the tax office.', weights: { protection: 1 } },
      { label: 'The tax bill', note: 'The tax on the lottery check is set by the amount and the state you live in when you receive it. Moving later does not change that tax.', weights: {} },
      { label: 'A health cost', note: 'The yearly amount has to cover care as well as the life. Type a yearly amount that includes it.', weights: {} },
      { label: 'Nothing in particular', note: 'No extra step is added by this answer.', weights: {} },
      { label: 'Honestly, a few of these at once', note: 'A mix is normal. The result leans on both the running-out check and the privacy steps.', weights: { income: 0.5, protection: 0.5 } },
    ],
  },
  {
    id: 'live', group: 'middle',
    text: 'So — where do you picture yourself living over the next decade?',
    why: 'The check itself is taxed by the state you live in when you receive it, and that part never changes. Future investment income follows wherever you actually live — and Puerto Rico only counts if you are really there more than half the year.',
    options: [
      { label: 'Where I am now', note: 'State tax on later income stays where you are. The lottery check is taxed there either way.', weights: { mobility: 0 } },
      { label: 'A different US state', note: 'A state with no income tax changes the tax on later income.', weights: { mobility: 0.5 } },
      { label: 'Puerto Rico, and present there more than half the year', note: 'Later investment gains can use the Puerto Rico path. You have to actually be there.', weights: { mobility: 1 } },
      { label: 'Another country', note: 'Living abroad does not end US tax. US tax continues until you give up US citizenship.', weights: { mobility: 0.7 } },
      { label: 'A couple of places — still deciding', note: 'The result assumes you stay put until you pick. Moving only changes the tax on income you earn after the move.', weights: { mobility: 0.3 } },
    ],
  },
  {
    id: 'time', group: 'middle',
    text: 'Day to day, how do you want the next ten years to look?',
    why: 'However you live is what the yearly amount has to pay for. Quitting work or constant travel both raise that number; the tax math stays the same either way.',
    options: [
      { label: 'Stop working, and live on this money', note: 'The yearly amount has to cover living costs. The result checks that it can be paid without the money running out.', weights: { income: 1 } },
      { label: 'Travel, or live in more than one place', note: 'The yearly amount has to cover the travel and the places. The result checks that number.', weights: { mobility: 0.5 } },
      { label: 'I have not decided', note: 'The result uses the yearly amount you typed. You can change it later.', weights: {} },
      { label: 'A mix — work less, travel some', note: 'The yearly amount still has to cover the life. The result checks that it can be paid.', weights: { income: 0.5, mobility: 0.3 } },
    ],
  },
  {
    id: 'market', group: 'middle',
    text: 'Say markets have a rough few years. Which payments absolutely have to keep going out?',
    why: 'If the yearly amount cannot flex, more of the money has to sit in steadier things that drop less — which leaves less to grow. This answer shapes the split, not the tax.',
    options: [
      { label: 'The yearly amount has to keep coming', note: 'More of the money is in things that do not drop as much. The yearly amount is more likely to be paid. Less is left to grow.', weights: { income: 1, growth: 0 } },
      { label: 'I can cut the yearly amount for a while', note: 'More of the money can stay in things that grow. The yearly amount may be smaller for a few years.', weights: { growth: 1, income: 0 } },
      { label: 'I do not know', note: 'The result uses a middle split. You can change it later.', weights: {} },
      { label: 'A mix — keep it coming, but I could trim it', note: 'The result uses a middle split: enough steady money to keep the check coming, enough left over to grow.', weights: { income: 0.5, growth: 0.5 } },
    ],
  },
  {
    id: 'give', group: 'middle',
    text: 'Any plans to give some of this away in the next ten years?',
    why: 'Gifts come straight off the pile that pays for your life, so the result subtracts whatever you type. Gifts to people and gifts to charity get different tax treatment.',
    options: [
      { label: 'No', note: 'Nothing is given.', weights: {} },
      { label: 'Yes. To a person', note: 'Type the amount. It is taken out of the pile. It can use the estate tax exclusion.', weights: { legacy: 0.5 } },
      { label: 'Yes. To charity', note: 'Type the amount. It is taken out of the pile. It can reduce income tax in the year you give it.', weights: { legacy: 0.3 } },
      { label: 'Not sure yet', note: 'Nothing is given until you type an amount.', weights: {} },
      { label: 'Yes — some to people, some to charity', note: 'Both come out of the pile. Type the amounts; each kind of gift gets its own tax treatment.', weights: { legacy: 0.5 } },
    ],
  },
  {
    id: 'sue', group: 'protect',
    text: 'Does it worry you that someone might sue you simply because the money is there?',
    why: 'Anyone can file a lawsuit; what matters is how hard you are to collect from. Insurance protects you, and a trust funded before any claim can protect the assets.',
    options: [
      { label: 'No', note: 'Nothing is added.', weights: {} },
      { label: 'Yes', note: 'Insurance protects you. An irrevocable trust funded before any claim can make the assets harder to reach. Answering here does not create either.', weights: { protection: 1 } },
      { label: 'I have not thought about it', note: 'Nothing is added until you do.', weights: {} },
      { label: 'Maybe — winners seem to attract that', note: 'Insurance is the cheap first step. A trust only counts if it is funded before any claim exists.', weights: { protection: 0.5 } },
    ],
  },
  {
    id: 'stolen', group: 'protect',
    text: 'What about the quieter kind of trouble — theft, or someone pressuring you into handing money over?',
    why: 'Insurance can cover theft, but no document stops a pushy relative. Keeping your name off property and accounts makes both problems harder to find you.',
    options: [
      { label: 'No', note: 'Nothing is added.', weights: {} },
      { label: 'Yes. Theft', note: 'Insurance can cover theft. Keeping your name off property makes you harder to find.', weights: { protection: 0.5 } },
      { label: 'Yes. Someone pressuring me', note: 'A trust does not stop pressure. Keeping your name off property and accounts makes you harder to find.', weights: { protection: 0.5 } },
      { label: 'Both', note: 'Insurance for theft. Keeping your name off property and accounts for pressure.', weights: { protection: 1 } },
      { label: 'I\'m not sure what to worry about here', note: 'Nothing is added. The steps below walk through what actually helps.', weights: {} },
    ],
  },
  {
    id: 'who', group: 'protect',
    text: 'If someone did come after the money, who do you picture?',
    why: 'Different people need different defenses: privacy slows a stranger, and a trust funded after a creditor\'s claim can be undone. There is no wrong answer here.',
    options: [
      { label: 'No one in particular', note: 'Nothing is added.', weights: {} },
      { label: 'A stranger', note: 'Keeping your name off property and accounts makes you harder to find.', weights: { protection: 0.5 } },
      { label: 'A family member or friend', note: 'They may already know. A trust does not stop them from asking. It can make the assets harder to take if it is irrevocable and funded before any claim.', weights: { protection: 0.5 } },
      { label: 'A business partner or creditor', note: 'A trust funded after a claim, or to dodge a creditor, can be undone. Insurance protects you, the person.', weights: { protection: 1 } },
      { label: 'All of the above', note: 'Insurance protects you. Keeping your name off property and accounts makes you harder to find. An irrevocable trust funded before any claim can make assets harder to reach.', weights: { protection: 1 } },
      { label: 'I haven\'t thought about it in this much detail', note: 'Nothing is added. The privacy steps work no matter who shows up later.', weights: {} },
    ],
  },
  {
    id: 'hold', group: 'protect',
    text: 'Would you want at least some assets parked where a lawsuit would have a hard time reaching them?',
    why: 'That is the irrevocable trust: you give up ownership, someone else is trustee, and it only works if funded before any claim exists. Answering here creates nothing.',
    options: [
      { label: 'No', note: 'Nothing is moved.', weights: {} },
      { label: 'Yes. A revocable trust', note: 'You can change it. It does not protect assets from your own creditors while you are alive.', weights: { protection: 0.3 } },
      { label: 'Yes. An irrevocable trust', note: 'It has to be funded before any claim. You no longer own what you put in. Answering here does not create it.', weights: { protection: 1 } },
      { label: 'Yes. Both. A revocable trust and an irrevocable trust', note: 'The revocable one you can change. The irrevocable one protects what you put in, if it is funded before any claim.', weights: { protection: 1 } },
      { label: 'I do not know yet', note: 'Nothing is moved until you decide.', weights: {} },
      { label: 'What is the difference between the two?', note: 'Revocable: you keep control, but it shields nothing from your own creditors. Irrevocable: you give up ownership, and that is exactly why it shields.', weights: {} },
    ],
  },
  {
    id: 'last', group: 'long',
    text: 'How long does this money need to hold out?',
    why: 'Your age sets what "long" really means. Money that must last a lifetime needs a yearly amount that can be sustained; a shorter stretch lets you spend more now.',
    options: [
      { label: 'My whole life', note: 'The yearly amount has to be sustainable for the long stretch set by your age.', weights: { growth: 0.5 } },
      { label: 'About the next 10 years', note: 'More can be spent now. Less has to be left for later.', weights: { income: 1 } },
      { label: 'I do not know', note: 'The result uses the long stretch set by your age. You can change it later.', weights: {} },
      { label: 'Longer than me — I want it to reach my kids', note: 'Then growth and the estate questions below matter more. The yearly amount still has to be sustainable.', weights: { legacy: 0.5 } },
    ],
  },
  {
    id: 'renounce', group: 'long',
    text: 'Would you ever give up US citizenship over taxes?',
    why: 'It is the only step that ends US tax on money from anywhere — and it comes with an exit tax on your gains, as if you had sold everything. Puerto Rico does not do this; it keeps US citizenship.',
    options: [
      { label: 'No', note: 'US tax on worldwide income continues.', weights: {} },
      { label: 'Yes', note: 'The exit tax applies to the gain in your assets. You may not be able to live in the US again. Answering here does not renounce.', weights: { mobility: 1 } },
      { label: 'I do not know yet', note: 'Nothing changes until you decide.', weights: {} },
      { label: 'I didn\'t know that was even an option', note: 'Most people say no, and that is fine. It is only here because it is the one step that ends US tax for good.', weights: {} },
    ],
  },
  {
    id: 'gone', group: 'long',
    text: 'If something happened to you, what would you want to be true about the money?',
    why: 'What is left, and who can touch it, is the whole estate question. Above roughly $15 million per person still in your name, the federal estate tax can take up to 40%.',
    options: [
      { label: 'I have not decided', note: 'The result still shows what would be left. No further step is added.', weights: { legacy: 0.2 } },
      { label: 'Someone else should receive what is left', note: 'A trust can be written for that. Amounts above $15 million per person can face estate tax if the money is still in your estate.', weights: { legacy: 1 } },
      { label: 'I want the estate harder for a lawsuit or a claim to reach', note: 'An irrevocable trust funded during life can do this. A revocable trust does not protect assets from your own creditors while you are alive.', weights: { protection: 1 } },
      { label: 'I want as much as possible already used on the life I chose', note: 'The priority is the life, not a pile left over. The result checks the yearly amount.', weights: { income: 1 } },
      { label: 'A mix — some to people I love, some spent on the life', note: 'The result still shows what would be left at the end. You can fine-tune the split later.', weights: { legacy: 0.5, income: 0.5 } },
    ],
  },
  {
    id: 'later', group: 'long',
    text: 'Do you think your later years will cost more than your early ones?',
    why: 'Care and the people you support tend to get pricier over time. If you type a later amount, the model uses it from year 11 through 25; otherwise every year uses the first number.',
    options: [
      { label: 'No. The yearly amount stays the same', note: 'Years 2 through 25 use the yearly amount you typed.', weights: {} },
      { label: 'Yes. Later years cost more', note: 'Type the later amount under this question. From year 11 on, that amount replaces the first one.', weights: {} },
      { label: 'I have not decided', note: 'The yearly amount stays what you typed until you type a later amount.', weights: {} },
      { label: 'Probably — care and family get expensive', note: 'Same as saying yes: type the later amount, and from year 11 it replaces the first one.', weights: {} },
    ],
  },
  {
    id: 'family', group: 'short',
    text: 'Besides you, who else will be leaning on this money?',
    why: 'Every person relying on it is another life the yearly amount has to cover. It also changes what "leaving something behind" should mean.',
    options: [
      { label: 'Just me', note: 'The yearly amount only has to cover you.', weights: {} },
      { label: 'A partner or kids', note: 'The yearly amount has to cover the household. It also makes the estate question worth answering below.', weights: { legacy: 0.5 } },
      { label: 'Parents, or other people too', note: 'Include their support in the yearly amount. If later care costs more, answer "later years cost more" below.', weights: { legacy: 0.5, income: 0.3 } },
      { label: 'Just me for now, but that could change', note: 'The yearly amount covers you. The estate questions below are still worth a minute.', weights: { legacy: 0.3 } },
    ],
  },
  {
    id: 'team', group: 'short',
    text: 'Who is in your corner on this money right now?',
    why: 'A lottery-sized check usually calls for three hires: a tax attorney, a CPA, and a fee-only advisor. Your answer changes nothing in the math — it tells you whether hiring is your next step.',
    options: [
      { label: 'Nobody yet', note: 'The usual first three hires: a tax attorney, a CPA, and a fee-only fiduciary advisor. In that order.', weights: {} },
      { label: 'Friends and family', note: 'Useful for support. The tax and trust work still needs licensed professionals.', weights: {} },
      { label: 'I have professionals already', note: 'Show them the result. The assumptions are editable, so they can argue with the rates.', weights: {} },
      { label: 'People keep pitching me — does that count?', note: 'A pitch is not advice. The three hires above work for you, not for a commission.', weights: {} },
    ],
  },
  {
    id: 'discipline', group: 'short',
    text: 'Be honest with yourself for a second: the check clears — what happens first?',
    why: 'Most lottery fortunes do not die from tax or markets; they die from spending. This answer only decides how much the result leans on guardrails.',
    options: [
      { label: 'I have a plan and I will follow it', note: 'No guardrails added. The yearly amount you type drives everything.', weights: { income: 0.5 } },
      { label: 'I will figure it out as I go', note: 'Consider starting with a smaller yearly amount. You can raise it later.', weights: {} },
      { label: 'I might overspend', note: 'Guardrails help: keep the yearly amount modest, and read the annuity comparison — 30 years of checks is a built-in guardrail.', weights: { income: 0.3 } },
      { label: 'All three, depending on the day', note: 'Then cheap guardrails are your friend: start with a modest yearly amount and raise it later if all goes well.', weights: { income: 0.3 } },
    ],
  },
  {
    id: 'risk', group: 'middle',
    text: 'The market drops 30%. What do you actually do — not what you are supposed to do?',
    why: 'This is about your behavior, not the plan. Selling in a panic is how compounding dies, so an honest answer shapes how much stays in stocks.',
    options: [
      { label: 'Sell everything and hide', note: 'If that is likely, keep more in bonds and the insurance wrapper, and less in stocks.', weights: { income: 0.8, protection: 0.3 } },
      { label: 'Get nervous but hold', note: 'Normal. The balanced split is built for this.', weights: {} },
      { label: 'Barely look at it', note: 'More can stay in stocks. Compounding does the work.', weights: { growth: 0.5 } },
      { label: 'Call someone before I do anything', note: 'Good instinct. A fee-only advisor\'s real job is to be the person you call that day.', weights: {} },
    ],
  },
  {
    id: 'spendpattern', group: 'middle',
    text: 'Would you rather have the same dollar amount every year, or a bit more each year to keep up with prices?',
    why: 'A flat amount means your buying power slowly shrinks; growing it with prices keeps your lifestyle but leaves less compounding. Both are fine — this just sets the draw schedule.',
    options: [
      { label: 'The same amount every year (flat)', note: 'The model uses a flat draw. More stays compounding. Later years buy less.', weights: {} },
      { label: 'Grow it with prices (inflation-linked)', note: 'The model grows the draw each year. Your lifestyle stays constant in real terms.', weights: {} },
      { label: 'I do not know', note: 'The model uses inflation-linked. You can flip it on the calculator.', weights: {} },
      { label: 'A mix — steady now, more room later', note: 'The model defaults to inflation-linked. You can flip it on the calculator and watch the difference.', weights: {} },
    ],
  },
  {
    id: 'reinvest', group: 'middle',
    text: 'If you ever take out more than you spend in a year, where should the extra go?',
    why: 'Idle cash earns taxable interest and sits in your estate. Back into the stack is the default; a business or property can earn its place with tax shelters of its own.',
    options: [
      { label: 'Back into the stack', note: 'Best default: pay down policy loans, buy more ladder, or reinvest in the stock engine.', weights: { growth: 0.5 } },
      { label: 'Into a business or venture', note: 'Read the QSBS card: startup stock can exclude up to $15M of gain after 5 years.', weights: {} },
      { label: 'Keep it as cash for a while', note: 'Park it in Treasuries or a tax-exempt money market, not a 0% checking account.', weights: { simplicity: 0.5 } },
      { label: 'All of the above, depending on the year', note: 'The stack stays the default home. The other two are detours you take on purpose.', weights: { growth: 0.3 } },
    ],
  },
  {
    id: 'business', group: 'middle',
    text: 'Any itch to start or buy a business with some of this?',
    why: 'A business can beat everything else here — or lose it all. Done right (a C-corporation held 5+ years), up to $15 million of its gain can be federally tax-free, so business money gets its own box.',
    options: [
      { label: 'No', note: 'Nothing is set aside for a business.', weights: {} },
      { label: 'Yes, or maybe', note: 'Type the amount in the business box. Read the QSBS card before choosing the legal form.', weights: {} },
      { label: 'I already have one', note: 'If it is a C-corp, ask your CPA about QSBS before any sale or restructure.', weights: {} },
      { label: 'Someone already brought me a "deal"', note: 'Slow down. A big check attracts bad deals — have your CPA read any offer before you answer.', weights: {} },
    ],
  },
  {
    id: 'umbrella', group: 'protect',
    text: 'Quick practical one: do you have umbrella liability insurance?',
    why: 'Trusts make assets hard to grab; insurance is what actually pays when you are sued. Dollar for dollar, a big umbrella policy is usually the cheapest protection you can buy.',
    options: [
      { label: 'Yes', note: 'Check the limit against your new net worth. Many winners carry $5M or more.', weights: { protection: 0.5 } },
      { label: 'No', note: 'Worth pricing before any complex structure. It is usually the cheapest protection there is.', weights: { protection: 0.5 } },
      { label: 'I do not know what that is', note: 'Umbrella insurance pays legal costs and judgments above your home and auto policies. Ask an insurance broker, not a trust promoter.', weights: { protection: 0.3 } },
      { label: 'Not yet, but I\'ll price it this week', note: 'That is the right next step. Bring your new net-worth number so the limit actually matches.', weights: { protection: 0.3 } },
    ],
  },
  {
    id: 'foreign', group: 'protect',
    text: 'Has anyone pitched you a foreign (offshore) trust as a way to dodge taxes?',
    why: 'For a US citizen, every gain inside a foreign trust you fund is still taxed to you personally. It can be an asset-protection tool, but it is not a tax tool.',
    options: [
      { label: 'Yes, or I saw a video about it', note: 'Read the Foreign Trust Reality Check in the Strategy Library. Protection yes, tax savings no.', weights: { protection: 0.3 } },
      { label: 'No', note: 'Nothing to unlearn.', weights: {} },
      { label: 'I am not a US citizen', note: 'Different rules. Your home country decides the tax. This page uses US federal and state rules.', weights: {} },
      { label: 'Not yet, but my feed definitely knows I won', note: 'The pitch usually starts as a video. The Reality Check card in the library covers the actual rules.', weights: {} },
    ],
  },
  {
    id: 'estate', group: 'long',
    text: 'Think your estate could end up worth more than $15 million per person?',
    why: 'That is roughly the 2026 federal exemption; above it, the estate tax rate reaches 40%. The fixes work best when set up while the assets are still small.',
    options: [
      { label: 'Yes, clearly', note: 'Talk to an estate attorney about the dynasty layer early. Moving growth assets out now is the point.', weights: { legacy: 1 } },
      { label: 'Possibly, with growth', note: 'Worth a review once a year, not a structure on day one.', weights: { legacy: 0.5 } },
      { label: 'No', note: 'The estate layer can wait.', weights: {} },
      { label: 'I have no idea how to estimate that', note: 'A rough guess is fine: prize plus house plus investments, grown for a decade. The result shows you the number it uses.', weights: {} },
    ],
  },
  {
    id: 'giving', group: 'long',
    text: 'If you give to charity, how would you want to do it?',
    why: 'A donor-advised fund gives one big deduction in the big tax year and lets you grant it out over time. A charitable remainder trust can sell appreciated assets tax-free and pay you income for life.',
    options: [
      { label: 'A fund now, grants over time', note: 'That is a donor-advised fund. It fits the big-tax-year deduction.', weights: { legacy: 0.4 } },
      { label: 'Give assets but keep an income', note: 'That is a charitable remainder trust. Part goes to charity, so it is not an income maximizer.', weights: { legacy: 0.6, income: 0.3 } },
      { label: 'No giving planned', note: 'Nothing is added.', weights: {} },
      { label: 'I\'d rather just hand money to people directly', note: 'That counts as personal gifts, not charity, and different limits apply. The two structures above are the ones that get the tax break.', weights: {} },
    ],
  },
  {
    id: 'retire', group: 'long',
    text: 'When do you want working to become optional?',
    why: 'This is what "long term" really means. Sooner means the yearly amount has to be reliable now; later gives compounding more time to work first.',
    options: [
      { label: 'Immediately', note: 'The yearly amount has to be reliable from month 13 on.', weights: { income: 0.8 } },
      { label: 'In about 10 years', note: 'A decade of compounding first. The growth-leaning settings fit.', weights: { growth: 0.6 } },
      { label: 'I do not want to stop', note: 'The stack can be all growth. Take income only if you want it.', weights: { growth: 0.8 } },
      { label: 'It already is — I won the lottery', note: 'Fair point. The yearly amount still has to be reliable, so the income settings do the work.', weights: { income: 0.5 } },
    ],
  },

  {
    id: 'never', group: 'long',
    text: 'Of the big tax moves, which would you genuinely be willing to do?',
    why: 'A tax strategy you will not actually follow through on is not a plan. Pick what you would really do — the rest stays off the table.',
    options: [
      { label: 'I would move to another state', note: 'Later income can be taxed in that state. The lottery check is taxed where you live when you receive it.', weights: { mobility: 0.5 } },
      { label: 'I would live in Puerto Rico more than half the year', note: 'Later investment gains can use that path. You have to actually be there.', weights: { mobility: 1 } },
      { label: 'I would give up US citizenship', note: 'That is the step that ends US tax on money from anywhere. It has its own tax.', weights: { mobility: 1 } },
      { label: 'None of these', note: 'You stay where you are. US tax on money from anywhere continues.', weights: { mobility: 0 } },
      { label: 'Any of them, if the savings were big enough', note: 'In order of effort: another state first, Puerto Rico second, citizenship last. Each step is a bigger life change than the one before.', weights: { mobility: 1 } },
      { label: 'Maybe one of these — ask me in a year', note: 'Nothing changes until you actually do it. Staying put is the default.', weights: {} },
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
