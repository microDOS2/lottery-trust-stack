import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QUIZ, QUIZ_LONG, QUIZ_MIDDLE, QUIZ_PROTECT, QUIZ_SHORT, type QuizQuestion } from '../lib/quiz';
import { computeStack, fmtCompact, type Assumptions, type Inputs } from '../lib/calc';
import { STATES } from '../lib/taxdata';
import { buildBestPlans } from '../lib/plans';
import { Explainer, Limit, SectionTitle, Tip, Chips } from '../components/widgets';
import { downloadPlan } from '../lib/download';
import type { ScenarioSlot } from './CalculatorView';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
  scenarios: (ScenarioSlot | null)[];
  saveScenario: (i: number) => void;
  loadScenario: (i: number) => void;
  onApplyScenario: () => void;
  onStartOver: () => void;
  onOpenLibrary: () => void;
}

const SHORT = new Set<string>(QUIZ_SHORT);
const MIDDLE = new Set<string>(QUIZ_MIDDLE);
const PROTECT = new Set<string>(QUIZ_PROTECT);
const LONG = new Set<string>(QUIZ_LONG);

function stretches(age: number): { short: string; middle: string; long: string } {
  if (age <= 0) return { short: 'the next few years', middle: 'the next 10 years', long: 'the years after that' };
  if (age >= 75) return { short: `the next 2 years, until you are ${age + 2}`, middle: `the next 5 years, until you are ${age + 5}`, long: `the years after you are ${age + 5}` };
  if (age >= 60) return { short: `the next 3 years, until you are ${age + 3}`, middle: `the next 8 years, until you are ${age + 8}`, long: `the years after you are ${age + 8}` };
  return { short: `the next 3 years, until you are ${age + 3}`, middle: `the next 10 years, until you are ${age + 10}`, long: `the years after you are ${age + 10}` };
}

export default function GoalsView({ inputs, setInputs, asm, scenarios, saveScenario, loadScenario, onApplyScenario, onStartOver, onOpenLibrary }: Props) {
  const [answers, setAnswersRaw] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('lotteryStack.quizAnswers') ?? '{}'); } catch { return {}; }
  });
  const setAnswers = (fn: (a: Record<string, number>) => Record<string, number>) => {
    setAnswersRaw((prev) => {
      const next = fn(prev);
      try { localStorage.setItem('lotteryStack.quizAnswers', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const [age, setAge] = useState(0);
  useEffect(() => {
    if (answers.market === undefined || inputs.mode === 'manual') return;
    const dial = answers.market === 0 ? 100 : answers.market === 1 ? 0 : 50;
    if (inputs.dial !== dial) setInputs((p) => ({ ...p, dial, mode: 'balanced' }));
  }, [answers.market, inputs.mode, inputs.dial, setInputs]);
  const answered = Object.keys(answers).length;
  const ready = inputs.amount > 0 && age > 0 && answered === QUIZ.length;
  const set = useMemo(
    () => (ready ? buildBestPlans(answers, inputs, asm) : null),
    [ready, answers, inputs, asm],
  );
  const preview = useMemo(() => computeStack(inputs, asm), [inputs, asm]);
  const moveStates = STATES.filter((s) => s.noTax || s.code === inputs.target);
  const outcome = set?.plans[0];
  const span = stretches(age);

  const setNum = (key: 'amount' | 'spend' | 'debt' | 'entity4' | 'venture' | 'rental' | 'gift' | 'laterSpend' | 'ppliFee' | 'setupCost' | 'annualAdmin' | 'state' | 'target', value: number | string) => {
    setInputs((p) => ({ ...p, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SectionTitle
        num="01"
        title={<>Plan the life, <span className="sig-italic">short, middle, and long</span></>}
        blurb="One page. Age first, because a 40-year-old and a 75-year-old do not mean the same thing by later. The result is whether the money can pay for the life without running out. A pile at a fixed year 25 is not the finish line."
      />
      <button
        type="button"
        onClick={onStartOver}
        className="mb-4 rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 cursor-pointer"
      >
        Clear and start over
      </button>

      <div className="hairline-card space-y-3 p-4">
        <span className="flex items-center gap-1 text-[15px] font-medium">
          Save or download
          <Explainer text="Save keeps this setup in this browser as A, B, C, D, or E. Open puts a saved setup back on the page. Download writes a spreadsheet of the numbers on screen and every saved setup." />
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Tip key={i} text={scenarios[i] ? `Replace saved setup ${'ABCDE'[i]} with the numbers on this page.` : `Save the numbers on this page as setup ${'ABCDE'[i]}.`}>
              <button type="button" onClick={() => saveScenario(i)} className="rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary cursor-pointer">
                {scenarios[i] ? 'Overwrite ' : 'Save as '}{'ABCDE'[i]}
              </button>
            </Tip>
          ))}
          {scenarios.map((s, i) => s ? (
            <Tip key={`open-${i}`} text={`Put saved setup ${'ABCDE'[i]} back on the page.`}>
              <button type="button" onClick={() => loadScenario(i)} className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary cursor-pointer">
                Open {'ABCDE'[i]}
              </button>
            </Tip>
          ) : null)}
          <Tip text="Downloads a spreadsheet of the numbers on this page, the fees, the 25-year line, and any setups you saved.">
            <button type="button" onClick={() => downloadPlan(inputs, asm, preview, scenarios)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground cursor-pointer">
              Download plan
            </button>
          </Tip>
        </div>
      </div>

      <div className="hairline-card p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">How old are you? <Explainer text="Age sets what short, middle, and long mean. It is not a range." more="trade" /></span>
            <input type="number" min={0} max={120} step={1} value={age || ''} onChange={(e) => setAge(+e.target.value || 0)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
            <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
              {age > 0 ? `Short is ${span.short}. Middle is ${span.middle}. Long is ${span.long}.` : 'Type your age. The three stretches are set from it.'}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">Lottery cash amount <Explainer text="The check you could take, or what is left if the tax is already paid. Not the advertised jackpot." more="trade" /></span>
            <input type="number" min={0} step={100000} value={inputs.amount || ''} onChange={(e) => setNum('amount', +e.target.value || 0)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <Chips chips={[{label:'$5M',value:5000000},{label:'$18M',value:18000000},{label:'$100M',value:100000000}]} value={inputs.amount} onChange={(v)=>setNum('amount',v)} hint="The check you could take, or what is left after tax. Examples: $5M, $18M, $100M." />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">State you live in now <Explainer text="This state taxes the lottery check. Moving later does not change that." more="move" /></span>
            <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inputs.state} onChange={(e) => setNum('state', e.target.value)}>
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <Group heading={`First, the basics — ${span.short}`} questions={QUIZ.filter((q) => SHORT.has(q.id))} answers={answers} setAnswers={setAnswers} />

      <label className="hairline-card block p-6">
        <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">How much do you want available each year to live the way you want? <Explainer text="This is the check the result tests. Include anyone you support and any care cost. A bigger number runs out sooner." /></span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">This is the amount that buys freedom from the worry. Include anyone who depends on you, and any care cost. The result checks whether the money can pay it without running out.</p>
        <input type="number" min={0} step={1} value={inputs.spend || ''} onChange={(e) => setNum('spend', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <Chips chips={[{label:'$100K/yr',value:100000},{label:'$400K/yr',value:400000},{label:'$1M/yr',value:1000000}]} value={inputs.spend} onChange={(v)=>setNum('spend',v)} hint="What you want to live on each year. The page checks whether the money can pay it without running out." />
        <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
          {inputs.amount <= 0 ? 'Enter a cash amount first.' : `As things stand, the money can pay ${fmtCompact(preview.capacity)} a year.`}
        </span>
      </label>

      <label className="hairline-card block p-6">
        <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">Debts to clear before anything else <Explainer text="Paid from the cash after tax, before anything is invested. Nothing is paid until you type it. It does not change the tax." /></span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the dollars. Nothing is paid until you do.</p>
        <input type="number" min={0} step={1} value={inputs.debt || ''} onChange={(e) => setNum('debt', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <Chips chips={[{label:'None',value:0},{label:'$250K',value:250000},{label:'$1M',value:1000000}]} value={inputs.debt} onChange={(v)=>setNum('debt',v)} hint="Paid off first, before anything is invested. Leave blank if you have no debts to clear." />
      </label>

      <label className="hairline-card block p-6">
        <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">Dollars for a home, a boat, or anything else you want to pay for soon <Explainer text="Set aside and not invested. Nothing is set aside until you type it. There is no automatic home amount." /></span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the amount. Nothing is set aside until you do. That cash is not invested.</p>
        <input type="number" min={0} step={1} value={inputs.entity4 || ''} onChange={(e) => setNum('entity4', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <Chips chips={[{label:'$500K',value:500000},{label:'$1.5M',value:1500000},{label:'$3M',value:3000000}]} value={inputs.entity4} onChange={(v)=>setNum('entity4',v)} hint="Cash set aside for a home, a boat, or a big purchase soon. This money is not invested." />
      </label>

      <Group heading={`Your everyday life — ${span.middle}`} questions={QUIZ.filter((q) => MIDDLE.has(q.id))} answers={answers} setAnswers={setAnswers} extra={{
        give: answers.give === 1 || answers.give === 2 ? (
          <label className="mt-3 block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">Dollars for the gift <Explainer text="Taken out before investing. Nothing is given until you type it. A gift to a person can use the $15,000,000 estate exclusion. A gift to charity can reduce income tax in the year you give it. This page does not compute that tax cut." /></span>
            <input type="number" min={0} step={1} value={inputs.gift || ''} onChange={(e) => setNum('gift', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          </label>
        ) : null,
      }} />

      <label className="hairline-card block p-6">
        <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">If you would move, which state? <Explainer text="Used only if you said a different state. It changes tax on later income, not the tax on the lottery check." /></span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Used only if you said a different state. The lottery check is still taxed where you live now.</p>
        <select className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm" value={inputs.target} onChange={(e) => setNum('target', e.target.value)}>
          {moveStates.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </label>

      <label className="hairline-card block p-6">
        <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">Dollars for a business <Explainer text="Money you plan to put into a business you start or buy — set aside before the rest gets invested, so the calculator never pretends it is still compounding in the stack.

Why it is separate: a business is not an S&P index fund. It is illiquid, can go to zero, and can also out-return everything else you own. It deserves its own line item, not a hiding place inside the stock engine.

The tax angle worth knowing: if the business is a C-corporation, its stock may qualify as QSBS — after 5 years, up to $15 million of gain per company can be federally tax-free. That is one of the few outcomes that can beat leaving the money in the stack.

What to type: only what you can genuinely afford to lose — for most winners that is 5–10% of the after-tax pool, not half of it. Example: on $60 million after tax, type $3,000,000–$6,000,000 for a serious venture, $500,000 for a first experiment.

Common mistake: funding the dream business with the whole pile and then needing to sell stocks to live on." /></span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the amount. Nothing is taken out until you do.</p>
        <input type="number" min={0} step={1} value={inputs.venture || ''} onChange={(e) => setNum('venture', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <Chips chips={[{label:'$250K',value:250000},{label:'$1M',value:1000000},{label:'$5M',value:5000000}]} value={inputs.venture} onChange={(v)=>setNum('venture',v)} hint="Only what you can genuinely afford to lose — 5–10% of the pool is a sensible cap for most winners." />
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">Dollars for a rental <Explainer text="Money for an investment property — a rental house, a duplex, a small building. It comes out before investing, so it does not count as part of the stack that pays you every year.

Why it is separate: a rental is not a stock. It pays rent, it appreciates slowly, and it has three quiet tax benefits the stack does not give equities: depreciation that shelters the rent on paper, 1031 exchanges that roll gains into the next property without tax, and a basis step-up at death.

How it fits: this is the job of Entity #4 — the anonymous LLC owns the property, so your name stays off the county records. If you move to Puerto Rico, note the LLC cannot hold your PR primary residence; that one has to be owned directly or by a trust.

What to type: the full purchase price plus closing costs. Example: a $600,000 rental house plus ~$25,000 in closing and repairs — type $625,000. If you mean your own home, not a rental, use the home/boat box above instead.

Common mistake: typing the property price but forgetting the carrying costs — taxes, insurance, and repairs run roughly 1% of the property value a year." /></span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the amount. Nothing is taken out until you do.</p>
        <input type="number" min={0} step={1} value={inputs.rental || ''} onChange={(e) => setNum('rental', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <Chips chips={[{label:'$500K',value:500000},{label:'$1M',value:1000000},{label:'$2.5M',value:2500000}]} value={inputs.rental} onChange={(v)=>setNum('rental',v)} hint="Full purchase price plus closing costs. If you mean your own home, use the home box above instead." />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">One-time setup cost <Explainer text="The one-time cost of building the structure properly: the attorney who drafts the trusts, the insurance work to place the PPLI policy, forming the anonymous LLC, and opening institutional custody accounts.

Customary amounts: about $50,000 for a simple setup (one revocable trust and a DAPT), $75,000 for the full 4-entity stack, $125,000 or more for a very large prize with multiple entities and a policy to underwrite. The number on this page is already filled with the tier that matches your prize.

Why you should not cheap out: the drafting is the protection. A badly drafted trust is just expensive paper — no asset protection, no estate benefit, possibly a tax mess. This is the one place where the cheap quote is the most expensive option.

What to type: the estimate already shown, or the real quote from your attorney. It is paid once, out of the prize, before the engines are funded.

Common mistake: leaving it at $0, which tells the model the structure is free — and quietly makes every later number too optimistic." /></span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Legal, trustee, and professional fees to set up the trusts. Nothing is taken until you type it.</p>
        <input type="number" min={0} step={1} value={inputs.setupCost || ''} onChange={(e) => setNum('setupCost', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <Chips chips={[{label:'$50K',value:50000},{label:'$75K',value:75000},{label:'$125K',value:125000}]} value={inputs.setupCost} onChange={(v)=>setNum('setupCost',v)} hint="Already set to the customary tier for your prize. Change it only if you have a real quote from your attorney." />
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">Yearly fees to keep it running <Explainer text="What it costs to keep the structure alive every year: the trustee company that administers the DAPT, the CPA who files the trust returns, the registered agent for the LLC, and small account fees.

Customary amounts: a corporate trustee runs about $3,000–$10,000 a year flat, or 0.25%–1% of the trust assets. A CPA for a household plus trust returns is another $5,000–$25,000 a year. A registered agent is $100–$300. A sensible default for a full stack is about 0.25% of the invested core per year, with a floor of about $15,000 — that is what this page prefills for you.

Why it matters: these fees come out of the stack every year and slow compounding, exactly like a fund expense ratio. A normal taxable account pays none of them, so the comparison chart charges them only to the stack. That is the honest price of the structure.

What to type: the prefilled estimate, or your actual quotes. If you keep it simple — just a revocable trust and a brokerage account — a much smaller number is fair.

Common mistake: forgetting that a 0.25% fee on a $60 million core is $150,000 a year, not a rounding error." /></span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Trustee, CPA, and carrier fees each year. Nothing is taken until you type it.</p>
        <input type="number" min={0} step={1} value={inputs.annualAdmin || ''} onChange={(e) => setNum('annualAdmin', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <Chips chips={[{label:'$15K/yr',value:15000},{label:'$25K/yr',value:25000},{label:'$50K/yr',value:50000}]} value={inputs.annualAdmin} onChange={(v)=>setNum('annualAdmin',v)} hint="Trustee + CPA + agent, typically about 0.25% of the invested core per year. The prefilled number is that estimate." />
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">Insurance charge, dollars a year <Explainer text="The insurance company's annual charge for holding your PPLI policy — the cost of insurance and the administrative load. It is the price of the tax-free compounding the policy gives you.

Customary amount: roughly 0.5%–1.5% of the policy value a year, depending on age, health, and carrier. This page prefills 0.8%, which is a typical institutional charge. On a $15 million policy that is about $120,000 a year.

Why it is separate from the yearly fees: the trustee and CPA keep the structure alive; this charge keeps the policy alive. They are different bills from different people.

The thing that actually matters more than the charge: never let the policy lapse with loans outstanding. If it lapses over-loaned, every dollar of deferred gain can become taxable at once — that is the real catastrophe, not the 0.8%.

What to type: the prefilled estimate, or the actual charge from the carrier's illustration. Leave it blank only if you want the model to pretend the policy is free.

Common mistake: comparing a policy's charges to a brokerage account without also counting the 23.8% plus state tax the account pays on every gain." /></span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Leave this blank if you do not want a charge taken out. The policy growth rate is before this charge.</p>
        <input type="number" min={0} step={1} value={inputs.ppliFee || ''} onChange={(e) => setNum('ppliFee', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <Chips chips={[{label:'0% (no policy)',value:0},{label:'0.5% of policy',value:Math.round(preview.ppli*0.005)},{label:'0.8% (typical)',value:Math.round(preview.ppli*0.008)},{label:'1.2% of policy',value:Math.round(preview.ppli*0.012)}]} value={inputs.ppliFee} onChange={(v)=>setNum('ppliFee',v)} hint="Typical: 0.8% of your policy — on a $15M policy that is $120K/yr. Leave blank only if you are not using the insurance wrapper at all." />
        <Limit>Minimum: $5,000,000 in the insurance box. If this result is under that, the box still shows its number. The number is not erased.</Limit>
      </label>

      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold">Protecting you and the estate</h3>
        <div className="hairline-card border-primary/30 bg-accent/40 p-5 text-[14.5px] leading-relaxed">
          <strong>The 10-second version:</strong> a trust makes it harder to <em>take</em> the money, not harder to sue you.
          Revocable = you keep control, no protection. Irrevocable = someone else is trustee, real protection — but only if funded before any claim.
        </div>
        <details className="hairline-card p-5 text-[14.5px] leading-relaxed text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">The full explanation</summary>
          <p className="mt-3">A trust does not stop you from being sued. You can still be sued. Insurance is what protects you, the person.</p>
          <p className="mt-3">You can have more than one trust at the same time. A revocable trust and one or more irrevocable trusts can exist together. You can be the only beneficiary of all of them.</p>
          <p className="mt-3">A revocable trust can be changed or cancelled by you. You still control it, so a lawsuit can reach it while you are alive. It is for who gets the money after you die. It is not asset protection.</p>
          <p className="mt-3">An irrevocable trust cannot be taken back, and you cannot change it on your own. Someone else is the trustee. You no longer own what you put in. That is why a later lawsuit has a harder time taking those assets. It has to be funded before any claim. A transfer after you know about a lawsuit, or made to dodge a creditor, can be undone.</p>
          <p className="mt-3">If you are the only beneficiary of an irrevocable trust you created, most states give little or no asset protection. Nevada, South Dakota, Delaware, and Alaska allow a domestic asset protection trust where you can be a beneficiary and still have some protection. It is not absolute. A foreign trust can be harder for a US court to reach. It does not hide the money from the IRS, and it can create extra reporting.</p>
          <p className="mt-3">A trustee has a legal duty to follow the trust terms and act for the beneficiary. You choose the trustee. You can name a co-trustee. You can name a trust protector who can remove the trustee. You can write distribution standards that require the trustee to pay you for living costs, care, or other needs. You can require accountings. What you cannot do is keep the power to force distributions or to remove and replace the trustee at will. That power can make the protection fail and can make the IRS treat the assets as still yours.</p>
          <p className="mt-3">Neither kind hides money from the tax office. Answering a question does not create a trust. A lawyer has to draft it.</p>
        </details>
        <Group heading="" questions={QUIZ.filter((q) => PROTECT.has(q.id))} answers={answers} setAnswers={setAnswers} />
      </div>

      <Group heading={`Down the road — ${span.long}`} questions={QUIZ.filter((q) => LONG.has(q.id))} answers={answers} setAnswers={setAnswers} extra={{
        later: answers.later === 1 ? (
          <label className="mt-3 block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">Yearly amount from year 11 on <Explainer text="Replaces the first yearly amount from year 11 through year 25. Years 2 through 10 keep the first amount. Nothing changes until you type it." /></span>
            <input type="number" min={0} step={1} value={inputs.laterSpend || ''} onChange={(e) => setNum('laterSpend', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
            <Limit>From year 11 through year 30. Years 2 through 10 stay on the first yearly amount.</Limit>
          </label>
        ) : null,
      }} />

      {answered > 0 && (
        <div className="sticky bottom-4 z-30 no-print">
          <div className="hairline-card flex flex-wrap items-center justify-between gap-3 border-primary/40 bg-card/95 p-4 shadow-lg backdrop-blur">
            <div className="text-sm text-muted-foreground">
              {ready ? (
                <span><strong className="text-foreground">All questions answered.</strong> Next: fine-tune the plan, or save it and compare.</span>
              ) : (
                <span>
                  Still to go: {[
                    age <= 0 ? 'your age' : null,
                    inputs.amount <= 0 ? 'the cash amount' : null,
                    answered < QUIZ.length ? `${QUIZ.length - answered} more question${QUIZ.length - answered === 1 ? '' : 's'}` : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={!ready}
              onClick={() => { if (outcome) setInputs(() => outcome.inputs); onApplyScenario(); }}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Continue to Fine-tune →
            </button>
          </div>
        </div>
      )}

      {outcome && (
        <article data-tour="result" className="hairline-card border-success/40 p-6">
          <h3 className="font-display text-xl font-semibold">The result</h3>
          <p className="mt-2 text-[14.5px] text-muted-foreground">Age {age}. Short is {span.short}. Middle is {span.middle}.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
            {set?.preface.map((line) => <li key={line}>{line}</li>)}
            {outcome.whys.map((w) => <li key={w}>{w}</li>)}
          </ul>

          {set?.mix && (
            <div className="mt-5 rounded-lg border border-primary/30 bg-accent/40 p-4">
              <h4 className="font-display text-base font-semibold">How your answers shaped the mix</h4>
              <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-muted-foreground">
                {set.mix.rationale.map((line) => <li key={line}>→ {line}</li>)}
              </ul>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {set.mix.chosen.map((id) => (
                  <span key={id} className="rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[11px] font-medium text-primary">
                    {id === 'engine-a' ? 'Munis' : id === 'engine-b' ? 'PPLI' : id === 'engine-c' ? 'Stocks' : id}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setInputs(() => ({ ...outcome.inputs, chosen: set.mix!.chosen })); onOpenLibrary(); }}
                className="mt-3 text-sm font-medium text-primary hover:underline cursor-pointer"
              >
                See this mix in the Strategy Library →
              </button>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setInputs(() => outcome.inputs); onApplyScenario(); }}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-95 cursor-pointer"
            >
              Fine-tune this plan
            </button>
            <button
              type="button"
              onClick={() => { const i = scenarios.findIndex((s) => !s); if (i >= 0) { saveScenario(i); } }}
              className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 cursor-pointer"
            >
              Save & compare it
            </button>
          </div>
        </article>
      )}
    </div>
  );
}

function Group({
  heading, questions, answers, setAnswers, extra,
}: {
  heading: string;
  questions: QuizQuestion[];
  answers: Record<string, number>;
  setAnswers: (fn: (a: Record<string, number>) => Record<string, number>) => void;
  extra?: Record<string, ReactNode>;
}) {
  return (
    <div className="space-y-6">
      {heading ? <h3 className="font-display text-lg font-semibold">{heading}</h3> : null}
      {questions.map((q) => (
        <fieldset key={q.id} className="hairline-card p-5">
          <legend className="mb-1 text-[15px] font-medium">{q.text}</legend>
          <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">{q.why}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((o, oi) => (
              <Tip key={oi} text={o.note}>
              <button
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                className={`rounded-lg border px-4 py-3 text-left cursor-pointer ${
                  answers[q.id] === oi ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card hover:border-primary/50'
                }`}
              >
                <span className="block text-[15px] font-medium">{o.label}</span>
                <span className={`mt-1 block text-[15px] leading-snug ${answers[q.id] === oi ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                  {o.note}
                </span>
              </button>
              </Tip>
            ))}
          </div>
          {extra?.[q.id]}
        </fieldset>
      ))}
    </div>
  );
}
