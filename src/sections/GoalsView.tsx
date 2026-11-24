import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { computeStack, fmt, fmtCompact, HORIZON, type Assumptions, type Inputs } from '../lib/calc';
import { STATES } from '../lib/taxdata';
import { Chips, Stat } from '../components/widgets';
import { TaxBreakdown, type ScenarioSlot } from './CalculatorView';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
  scenarios: (ScenarioSlot | null)[];
  saveScenario: (i: number, override?: Inputs) => void;
  loadScenario: (i: number) => void;
  onApplyScenario: () => void;
  onCompareScenario: () => void;
  onStartOver: () => void;
  onOpenLibrary: () => void;
}

type Risk = 'steady' | 'balanced' | 'growth';
type Legacy = 'yes' | 'no' | 'unsure';
type PpliChoice = 'not_now' | 'explore';
type Purchase = 'now' | 'later';
type Charge = '0.005' | '0.008' | '0.012' | 'fixed';
interface Choices { risk: Risk | null; legacy: Legacy | null; ppli: PpliChoice | null; purchase: Purchase | null; charge: Charge | null }
const EMPTY_CHOICES: Choices = { risk: null, legacy: null, ppli: null, purchase: null, charge: null };

function loadChoices(): Choices {
  try {
    const saved = JSON.parse(localStorage.getItem('lotteryStack.startChoices') ?? 'null');
    return saved ? { ...EMPTY_CHOICES, ...saved } : EMPTY_CHOICES;
  } catch { return EMPTY_CHOICES; }
}

export default function GoalsView({ inputs, setInputs, asm, saveScenario, onApplyScenario, onCompareScenario, onStartOver, onOpenLibrary }: Props) {
  const [choices, setChoices] = useState<Choices>(loadChoices);
  const [spendTouched, setSpendTouched] = useState(inputs.spend > 0);
  const [isSample] = useState(() => inputs.amount === 100_000_000 && localStorage.getItem('lotteryStack.age') === '55');

  useEffect(() => {
    try { localStorage.setItem('lotteryStack.startChoices', JSON.stringify(choices)); } catch { /* ignore */ }
  }, [choices]);

  const choose = <K extends keyof Choices>(key: K, value: Choices[K]) => setChoices((prev) => ({ ...prev, [key]: value }));
  const setNum = (key: 'amount' | 'spend' | 'entity4' | 'ppliFee', value: number) => setInputs((prev) => ({ ...prev, [key]: value }));
  const taxResult = useMemo(() => computeStack(inputs, asm), [inputs, asm]);

  const candidateInputs = useMemo<Inputs>(() => {
    const next = { ...inputs };
    if (choices.risk) {
      next.dial = choices.risk === 'steady' ? 100 : choices.risk === 'growth' ? 0 : 50;
      next.mode = 'balanced';
    }
    if (choices.purchase === 'later') next.entity4 = 0;
    if (choices.ppli === 'not_now') {
      next.ppliEnabled = false;
      next.ppliFeeMode = 'none';
      next.ppliFee = 0;
    } else if (choices.ppli === 'explore') {
      next.ppliEnabled = true;
      if (choices.charge === 'fixed') {
        next.ppliFeeMode = 'fixed';
      } else if (choices.charge) {
        next.ppliFeeMode = 'rate';
        next.ppliFeeRate = Number(choices.charge);
        next.ppliFee = 0;
      } else {
        next.ppliFeeMode = 'none';
        next.ppliFee = 0;
      }
    }
    return next;
  }, [inputs, choices]);
  const candidate = useMemo(() => computeStack(candidateInputs, asm), [candidateInputs, asm]);

  const missing = [
    inputs.amount <= 0 ? 'your winning amount' : null,
    !spendTouched ? 'your yearly spending choice' : null,
    !choices.risk ? 'your market-comfort choice' : null,
    !choices.purchase ? 'your purchase-timing choice' : null,
    choices.purchase === 'now' && inputs.entity4 <= 0 ? 'the year-1 purchase amount' : null,
    !choices.legacy ? 'your answer about money after death' : null,
    !choices.ppli ? 'your PPLI choice' : null,
    choices.ppli === 'explore' && !choices.charge ? 'an insurance-charge scenario' : null,
    choices.ppli === 'explore' && choices.charge === 'fixed' && inputs.ppliFee <= 0 ? 'your quoted insurance charge' : null,
  ].filter(Boolean) as string[];
  const complete = missing.length === 0;

  const apply = () => setInputs(() => candidateInputs);
  const usePlan = () => {
    if (!complete) return;
    apply();
    saveScenario(0, candidateInputs);
    onApplyScenario();
  };
  const comparePlan = () => {
    if (!complete) return;
    apply();
    saveScenario(0, candidateInputs);
    onCompareScenario();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <p className="eyebrow">A guided starting point</p>
        <h2 className="mt-3 font-display text-3xl font-semibold">Start with the life you want. <span className="sig-italic">We’ll show you how the money could support it.</span></h2>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-muted-foreground">Answer only what you know. Nothing is selected or applied automatically. You can review the numbers, compare alternatives, or fine-tune every assumption before deciding.</p>
        {isSample && <p className="mt-3 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">Example loaded. Change anything to make it yours; the plan is not applied until you choose a button at the end.</p>}
        <button type="button" onClick={onStartOver} className="mt-4 rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary cursor-pointer">Clear and start over</button>
      </header>

      <StartSection step="1" title="Your winnings" purpose="Only the facts needed for the first tax estimate. No products or strategies yet.">
        <div className="hairline-card space-y-4 p-5">
          <label className="block text-sm font-medium">Winning amount
            <input type="number" min={0} step={100000} value={inputs.amount || ''} onChange={(e) => setNum('amount', +e.target.value || 0)} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          </label>
          <Chips chips={[{ label: '$5M', value: 5000000 }, { label: '$18M', value: 18000000 }, { label: '$100M', value: 100000000 }]} value={inputs.amount} onChange={(v) => setNum('amount', v)} hint="Use the cash option, not the advertised annuity jackpot." />
          <div className="flex gap-2">
            <button type="button" onClick={() => setInputs((p) => ({ ...p, basis: 'gross' }))} className={`flex-1 rounded-md border px-3 py-2 text-sm cursor-pointer ${inputs.basis === 'gross' ? 'border-primary bg-accent font-medium' : 'border-input text-muted-foreground'}`}>Before tax</button>
            <button type="button" onClick={() => setInputs((p) => ({ ...p, basis: 'net' }))} className={`flex-1 rounded-md border px-3 py-2 text-sm cursor-pointer ${inputs.basis === 'net' ? 'border-primary bg-accent font-medium' : 'border-input text-muted-foreground'}`}>Already after tax</button>
          </div>
          <label className="block text-sm font-medium">State where you live now
            <select value={inputs.state} onChange={(e) => setInputs((p) => ({ ...p, state: e.target.value }))} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal">{STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
          </label>
          <label className="block text-sm font-medium">Tax filing status
            <select value={inputs.filing} onChange={(e) => setInputs((p) => ({ ...p, filing: e.target.value as Inputs['filing'] }))} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal"><option value="single">Single</option><option value="mfj">Married filing jointly</option></select>
          </label>
        </div>
        <TaxBreakdown inp={inputs} r={taxResult} />
      </StartSection>

      <StartSection step="2" title="The life you want the money to support" purpose="A few high-impact choices. There is no long questionnaire and no automatic recommendation.">
        <div className="hairline-card space-y-4 p-5">
          <label className="block text-sm font-medium">How much would you like to spend each year?
            <input type="number" min={0} step={1000} value={inputs.spend || ''} onChange={(e) => { setSpendTouched(true); setNum('spend', +e.target.value || 0); }} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          </label>
          <Chips chips={[{ label: '$0 for now', value: 0 }, { label: '$100K/yr', value: 100000 }, { label: '$400K/yr', value: 400000 }, { label: '$1M/yr', value: 1000000 }]} value={inputs.spend} onChange={(v) => { setSpendTouched(true); setNum('spend', v); }} hint="This is a target, not a forced withdrawal. Enter $0 deliberately if you want to let it grow." />
          <ChoicePrompt title="Do you have a major purchase planned within the next 12 months?">
            <ChoiceButton selected={choices.purchase === 'later'} onClick={() => choose('purchase', 'later')}>No, or it is later — keep the money invested</ChoiceButton>
            <ChoiceButton selected={choices.purchase === 'now'} onClick={() => choose('purchase', 'now')}>Yes, within 12 months — set cash aside now</ChoiceButton>
          </ChoicePrompt>
          {choices.purchase === 'now' && <label className="block text-sm font-medium">Cash needed for that year-1 purchase
            <input type="number" min={0} step={50000} value={inputs.entity4 || ''} onChange={(e) => setNum('entity4', +e.target.value || 0)} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
            <span className="mt-1 block text-[13px] text-muted-foreground">Only this amount is removed from the investment core now. Later purchases belong in the draw schedule or Entities &amp; Assets.</span>
          </label>}
          <fieldset>
            <legend className="text-sm font-medium">If $10 million fell to $7 million temporarily, what would matter most?</legend>
            <div className="mt-2 space-y-2">
              <ChoiceButton selected={choices.risk === 'steady'} onClick={() => choose('risk', 'steady')}><strong>Protect my income.</strong> I would accept lower expected growth for a steadier plan.</ChoiceButton>
              <ChoiceButton selected={choices.risk === 'balanced'} onClick={() => choose('risk', 'balanced')}><strong>Stay balanced.</strong> I can accept some swings if income and growth both get attention.</ChoiceButton>
              <ChoiceButton selected={choices.risk === 'growth'} onClick={() => choose('risk', 'growth')}><strong>Keep growing.</strong> I have a long horizon and can tolerate larger drops.</ChoiceButton>
            </div>
          </fieldset>
          <ChoicePrompt title="Do you want money or a death benefit available for other people after you die?">
            <ChoiceButton selected={choices.legacy === 'yes'} onClick={() => choose('legacy', 'yes')}>Yes — beneficiaries matter to me</ChoiceButton>
            <ChoiceButton selected={choices.legacy === 'no'} onClick={() => choose('legacy', 'no')}>No — this money is mainly for my lifetime</ChoiceButton>
            <ChoiceButton selected={choices.legacy === 'unsure'} onClick={() => choose('legacy', 'unsure')}>Not sure — show me the options without deciding for me</ChoiceButton>
          </ChoicePrompt>
        </div>
      </StartSection>

      <StartSection step="3" title="Understand life insurance before choosing it" purpose="PPLI is life insurance on a person, not insurance for the lottery money. It is optional here.">
        <div className="hairline-card p-5">
          <h3 className="font-display text-xl font-semibold">Private Placement Life Insurance (PPLI)</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">A life-insurance contract with an investment wrapper. It may provide tax-advantaged investment growth and tax-advantaged access through withdrawals and policy loans when the contract remains compliant.</p>
          <dl className="mt-4 divide-y divide-border/60">
            <RoleRow label="Who is insured?" value="Usually you, the lottery winner, or sometimes another person with an insurable interest." />
            <RoleRow label="Who owns the policy?" value="Often an irrevocable trust rather than you personally." />
            <RoleRow label="Who is financially protected?" value="Primarily your named beneficiaries, through the death benefit. The policy owner may also benefit from the policy’s tax treatment during your life." />
            <RoleRow label="What does it cost?" value="Carrier charges, plus separate legal, trustee, tax, and investment costs. An active policy is not free." />
            <RoleRow label="What can go wrong?" value="Medical underwriting can fail. Premium and investor-control rules can be violated. An over-loaned policy can lapse and create a large tax bill." />
          </dl>
          <p className="mt-4 rounded-md bg-secondary px-3 py-2 text-sm leading-relaxed text-muted-foreground"><strong>It does not:</strong> insure the lottery principal, prevent lawsuits, stop market losses, or automatically shield assets from creditors.</p>
          <ChoicePrompt title="Do you want to include this in the starting plan?">
            <ChoiceButton selected={choices.ppli === 'not_now'} onClick={() => choose('ppli', 'not_now')}>Not for this plan — no policy or carrier charge</ChoiceButton>
            <ChoiceButton selected={choices.ppli === 'explore'} onClick={() => choose('ppli', 'explore')}>Explore PPLI — show me the cost and allocation</ChoiceButton>
          </ChoicePrompt>
          {choices.ppli === 'explore' && (
            <div className="mt-4 rounded-md border border-input p-4">
              <h4 className="text-sm font-semibold">Choose an illustrative carrier-charge scenario</h4>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">These are planning allowances, not quotes. You can replace them with a carrier illustration in Fine-tune.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['0.005', '0.008', '0.012'] as const).map((rate) => <button key={rate} type="button" onClick={() => choose('charge', rate)} className={`rounded-full border px-3 py-1.5 text-sm cursor-pointer ${choices.charge === rate ? 'border-primary bg-accent font-medium' : 'border-input text-muted-foreground'}`}>{(Number(rate) * 100).toFixed(1)}% of policy per year</button>)}
                <button type="button" onClick={() => choose('charge', 'fixed')} className={`rounded-full border px-3 py-1.5 text-sm cursor-pointer ${choices.charge === 'fixed' ? 'border-primary bg-accent font-medium' : 'border-input text-muted-foreground'}`}>Use a fixed quote</button>
              </div>
              {choices.charge === 'fixed' && <label className="mt-3 block text-sm font-medium">Quoted charge, dollars per year<input type="number" min={0} step={1000} value={inputs.ppliFee || ''} onChange={(e) => setNum('ppliFee', +e.target.value || 0)} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 font-num" /></label>}
              {candidate.ppli < 5_000_000 && <p className="mt-3 text-[13px] leading-relaxed text-destructive">The current candidate allocates {fmtCompact(candidate.ppli)} to PPLI, below this model’s $5 million policy-allocation threshold. You can change the mix in Fine-tune; actual eligibility requires professional review.</p>}
            </div>
          )}
        </div>
      </StartSection>

      <StartSection step="4" title="Review the starting plan" purpose="This is a preview only. Your current plan does not change until you deliberately apply it.">
        <div data-tour="result" className="hairline-card p-5">
          {!complete ? (
            <div>
              <h3 className="font-display text-lg font-semibold">A few choices are still needed</h3>
              <p className="mt-1 text-sm text-muted-foreground">Nothing is filled in for you. Still to choose:</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{missing.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-display text-xl font-semibold">Your candidate plan</h3><p className="mt-1 text-sm text-muted-foreground">Review the numbers, then choose what to do. This is not yet your active plan.</p></div>
                <span className="rounded-full bg-accent px-3 py-1 text-[12px] font-medium text-accent-foreground">Preview only</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Stat label="Money invested" value={fmtCompact(candidate.core)} sub={candidate.housePaid > 0 ? `${fmtCompact(candidate.housePaid)} held for a year-1 purchase` : 'after tax and reserves'} tone="good" />
                <Stat label="Estimated yearly capacity" value={fmtCompact(candidate.capacity)} sub={`your target: ${fmtCompact(candidateInputs.spend)}/yr`} tone="warm" />
                <Stat label={`Projected at year ${HORIZON}`} value={fmtCompact(candidate.stackEnd)} sub="using editable assumptions, not a forecast" />
                <Stat label="Life insurance" value={candidateInputs.ppliEnabled === false ? 'Not included' : fmtCompact(candidate.ppli)} sub={candidateInputs.ppliEnabled === false ? 'no insured person or death benefit modeled' : choices.charge === 'fixed' ? `${fmt(candidateInputs.ppliFee)}/yr fixed quote` : `${(candidateInputs.ppliFeeRate! * 100).toFixed(1)}% yearly charge scenario`} />
              </div>
              <dl className="mt-4 divide-y divide-border/60 text-sm">
                <RoleRow label="Professional costs included so far" value={candidateInputs.annualAdmin > 0 ? `${fmt(candidateInputs.annualAdmin)}/yr` : '$0 — choose a planning allowance in Fine-tune'} />
                <RoleRow label="Market approach" value={choices.risk === 'steady' ? 'Income-focused' : choices.risk === 'growth' ? 'Growth-focused' : 'Balanced'} />
                <RoleRow label="Beneficiary purpose" value={choices.legacy === 'yes' ? 'You want money or a death benefit for others' : choices.legacy === 'no' ? 'Mainly lifetime spending' : 'Undecided; no beneficiary strategy is forced'} />
              </dl>
              {candidate.depletedYear && <p className="mt-3 rounded-md bg-destructive/5 px-3 py-2 text-sm text-destructive">At this spending schedule, the candidate runs dry around year {candidate.depletedYear}. Lower the draw or adjust the mix before using it.</p>}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={usePlan} className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground cursor-pointer">Use this starting plan</button>
                <button type="button" onClick={comparePlan} className="flex-1 rounded-md border border-primary bg-primary/10 px-4 py-3 text-sm font-medium text-primary cursor-pointer">Compare alternatives</button>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Both buttons apply the candidate. <strong>Use this starting plan</strong> opens Fine-tune with every assumption editable. <strong>Compare alternatives</strong> saves it as Scenario A and opens the comparison page.</p>
              <button type="button" onClick={onOpenLibrary} className="mt-3 text-sm font-medium text-primary underline cursor-pointer">Explore advanced strategies before deciding</button>
            </>
          )}
        </div>
      </StartSection>
    </div>
  );
}

function StartSection({ step, title, purpose, children }: { step: string; title: string; purpose: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-num text-sm font-semibold text-accent-foreground">{step}</span>
        <div><h2 className="font-display text-2xl font-semibold">{title}</h2><p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">{purpose}</p></div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function ChoicePrompt({ title, children }: { title: string; children: ReactNode }) {
  return <div><h3 className="text-sm font-medium">{title}</h3><div className="mt-2 space-y-2">{children}</div></div>;
}

function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`block w-full rounded-md border px-4 py-3 text-left text-sm leading-relaxed cursor-pointer ${selected ? 'border-primary bg-accent font-medium' : 'border-input bg-card text-muted-foreground hover:border-primary/50'}`}>{children}</button>;
}

function RoleRow({ label, value }: { label: string; value: string }) {
  return <div className="py-3"><dt className="text-[13px] font-medium text-foreground">{label}</dt><dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{value}</dd></div>;
}
