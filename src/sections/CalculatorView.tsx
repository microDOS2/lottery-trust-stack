import { useState } from 'react';
import { STATES } from '../lib/taxdata';
import {
  fmt, fmtCompact, pct, PPLI_QP_MIN, SLEEVE_MATH, SLEEVE_PCT_MAX,
  type Inputs, type Assumptions, type StackResult,
} from '../lib/calc';
import { Stat, Field, SectionTitle, Tip, Explainer, Limit } from '../components/widgets';
import { downloadPlan } from '../lib/download';
import { useExplain } from '../explainNav';
import { AllocationDonut, ProjectionChart, FlowDiagram } from '../components/viz';
import { ScenarioLines, ScenarioBars, useScenarioResults } from '../components/CompareCharts';
import { STRATEGIES } from '../lib/content';
import DrawSchedule from './DrawSchedule';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Link2, Check, RotateCcw, Settings2, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';

export interface ScenarioSlot {
  name: string;
  inputs: Inputs;
  result: { net: number; core: number; capacity: number; stackEnd: number; advantage: number; alloc: string };
}

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
  setAsm: (a: Assumptions) => void;
  result: StackResult;
  scenarios: (ScenarioSlot | null)[];
  saveScenario: (i: number) => void;
  loadScenario: (i: number) => void;
  clearScenarios: () => void;
  resetAll: () => void;
  notice: { text: string; undo?: () => void } | null;
  dismissNotice: () => void;
  undoNotice: () => void;
  onOpenLibrary: () => void;
}

const LETTERS = 'ABCDE';

const SECTION_META: Array<{ id: string; title: string }> = [
  { id: 'charts', title: 'Charts' },
  { id: 'projection', title: '25-year projection' },
  { id: 'schedule', title: 'Custom draw schedule' },
  { id: 'realestate', title: 'Real estate' },
  { id: 'flow', title: 'Money flow' },
  { id: 'compare', title: 'Scenario comparison' },
];

interface Layout { order: string[]; hidden: string[] }
const DEFAULT_LAYOUT: Layout = { order: SECTION_META.map((s) => s.id), hidden: [] };

function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem('lotteryStack.layout');
    if (raw) {
      const parsed = JSON.parse(raw) as Layout;
      const valid = parsed.order.filter((id) => SECTION_META.some((m) => m.id === id));
      for (const m of SECTION_META) if (!valid.includes(m.id)) valid.push(m.id);
      return { order: valid, hidden: (parsed.hidden ?? []).filter((id) => valid.includes(id)) };
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT;
}

export default function CalculatorView(p: Props) {
  const openExplain = useExplain();
  const { inputs: inp, result: r, asm } = p;
  const [copied, setCopied] = useState(false);
  const [realDollars, setRealDollars] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [layout, setLayoutRaw] = useState<Layout>(loadLayout);
  const [more, setMore] = useState(false);
  const setLayout = (l: Layout) => {
    setLayoutRaw(l);
    try { localStorage.setItem('lotteryStack.layout', JSON.stringify(l)); } catch { /* ignore */ }
  };
  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => p.setInputs((prev) => ({ ...prev, [k]: v }));
  const st = STATES.find((s) => s.code === inp.state)!;
  const tg = STATES.find((s) => s.code === inp.target)!;

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${btoa(JSON.stringify({ v: 3, inputs: inp, assumptions: asm }))}`;
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const w = r.weights;
  const deflate = (v: number, year: number) => (realDollars ? v / Math.pow(1 + asm.inflation, year) : v);
  const projStack = r.projection.map((row) => ({ ...row, end: deflate(row.end, row.year) }));
  const projBase = r.baseline.map((row) => ({ ...row, end: deflate(row.end, row.year) }));

  const savedScenarios = p.scenarios
    .map((s, i) => (s ? { letter: LETTERS[i], inputs: s.inputs } : null))
    .filter((s): s is { letter: string; inputs: Inputs } => !!s);
  const scenarioResults = useScenarioResults(savedScenarios, asm);

  const move = (id: string, dir: -1 | 1) => {
    const order = [...layout.order];
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setLayout({ ...layout, order });
  };
  const toggleHide = (id: string) =>
    setLayout({
      ...layout,
      hidden: layout.hidden.includes(id) ? layout.hidden.filter((h) => h !== id) : [...layout.hidden, id],
    });

  const sectionNode = (id: string) => {
    switch (id) {
      case 'charts':
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="hairline-card p-5">
              <h3 className="font-display text-lg font-semibold">Where the core sits</h3>
              <p className="mt-1 text-sm text-muted-foreground">Trust #2 holds Engines A + C · Trust #3 holds Engine B · Entity #4 holds property cash.</p>
              <AllocationDonut muni={r.muni} ppli={r.ppli} equity={r.equity} reserve={inp.entity4} sleeve={r.sleeveAmount} sleeveName={STRATEGIES.find((s) => s.id === r.sleeveId)?.name ?? 'Sleeve'} />
            </div>
            <div className="hairline-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-semibold">The compounding race</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Same engines, same returns, same cash to you — but unshielded. The stack's line even carries its admin fees; the baseline pays none.
                    Gap at year 25: <span className="font-num font-semibold stat-good">{fmtCompact(r.advantage)}</span>
                  </p>
                </div>
                <button title={realDollars ? 'Showing later years in today’s dollars. Click for the raw future amounts.' : 'Showing raw future dollars. Click to shrink later years for inflation.'} onClick={() => setRealDollars(!realDollars)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors cursor-pointer ${realDollars ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {realDollars ? "Today's $" : 'Nominal $'}
                </button>
              </div>
              <ProjectionChart stack={projStack} baseline={projBase} />
            </div>
          </div>
        );
      case 'projection':
        return <ProjectionTable r={r} inp={inp} asm={asm} scenarios={p.scenarios} />;
      case 'schedule':
        return <DrawSchedule inputs={inp} setInputs={p.setInputs} result={r} asm={asm} />;
      case 'realestate':
        return <RealEstateLazy inputs={inp} result={r} />;
      case 'flow':
        return (
          <div className="hairline-card p-5">
            <h3 className="font-display text-lg font-semibold">The money flow</h3>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">One wire in, four destinations. Everything after Trust #1 is engineered to be tax-free or tax-deferred.</p>
            <FlowDiagram />
          </div>
        );
      case 'compare':
        return <ScenarioCompare {...p} scenarioResults={scenarioResults} />;
      default:
        return null;
    }
  };

  const scenarioButtons = (
    <div className="hairline-card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-[15px] font-medium">
          Save or download
          <Explainer text="Save keeps this setup in this browser as A, B, C, D, or E. Open puts a saved setup back on the page. Download writes a spreadsheet of the numbers on screen and every saved setup." />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Tip key={i} text={p.scenarios[i] ? `Replace saved setup ${LETTERS[i]} with the numbers on screen.` : `Save the numbers on screen as setup ${LETTERS[i]}.`}>
            <button type="button" onClick={() => p.saveScenario(i)}
              className="rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary cursor-pointer">
              {p.scenarios[i] ? 'Overwrite ' : 'Save as '}{LETTERS[i]}
            </button>
          </Tip>
        ))}
        {p.scenarios.some(Boolean) && p.scenarios.map((s, i) => s ? (
          <Tip key={`open-${i}`} text={`Put saved setup ${LETTERS[i]} back on the page.`}>
            <button type="button" onClick={() => p.loadScenario(i)}
              className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary cursor-pointer">
              Open {LETTERS[i]}
            </button>
          </Tip>
        ) : null)}
        <Tip text="Downloads a spreadsheet of the numbers on screen, the 25-year line, the fees, and any setups you saved.">
          <button type="button" onClick={() => downloadPlan(inp, asm, r, p.scenarios)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground cursor-pointer">
            Download plan
          </button>
        </Tip>
      </div>
    </div>
  );

  const headline = (
    <div className="space-y-4">
      <div>
        <SectionTitle
          num="03"
          title={<>Your after-tax pool, <span className="sig-italic">working for you</span></>}
          blurb={`${st.name} prize, ${inp.basis === 'gross' ? 'starting from the gross cash option' : 'starting from money already after tax'}, ${inp.filing === 'mfj' ? 'married filing jointly' : 'single'} — 2026 rates.`}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Federal tax on prize" tip="Federal income tax on the cash option, at 2026 rates. The line under it is the state tax." more="assumptions" value={fmtCompact(r.fedTax)} sub={`+ ${fmtCompact(r.stateTax)} state`} />
          <Stat label="Net after-tax pool" tip="What is left after federal and state tax. This is the money the rest of the page invests." more="trade" value={fmtCompact(r.net)} sub="after federal + state" tone="good" />
          <Stat label="Year-1 reserve" tip="The first year of spending, plus setup cost, held back. The investments are not touched in year 1." more="trade" value={fmtCompact(r.yr1Reserve)} sub="spending + setup, in Trust #1" />
          <Stat label="Investable core" tip="What is left to invest after tax, the first year of spending, setup cost, and anything you set aside. The policy is not used unless this is at least $5,000,000." more="trade" value={fmtCompact(r.core)} sub={r.qpOk ? 'At least $5,000,000, so the policy can be used' : `Under ${fmtCompact(PPLI_QP_MIN)}. The policy is not used.`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {scenarioButtons}
      {p.notice && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-primary/40 bg-accent px-4 py-3 text-sm">
          <p>{p.notice.text}</p>
          <div className="flex gap-2">
            {p.notice.undo && (
              <button type="button" title="Puts the previous mix back." onClick={p.undoNotice} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground cursor-pointer">Undo</button>
            )}
            <button type="button" title="Hides this note. Your numbers stay as they are." onClick={p.dismissNotice} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">Dismiss</button>
          </div>
        </div>
      )}
      <div className="lg:hidden">{headline}</div>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      {/* ---------- Controls ---------- */}
      <div className="hairline-card h-fit space-y-4 p-5 no-print lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Your numbers</h3>
          <Tip text="Clears the prize and puts every input back to the start.">
          <button onClick={p.resetAll} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
          </Tip>
        </div>

        <Field label="Where you live now" tip="The state that taxes the prize, and future income if you stay." more="move" help="Sets the state tax on the prize — and on future income if you stay.">
          <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.state} onChange={(e) => set('state', e.target.value)}>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </Field>
        {st.code === 'CA' && (
          <p className="-mt-2 text-[12.5px] leading-snug text-muted-foreground">
            State tax on the prize is $0 only for a California Lottery prize — the ticket was bought in California (Gov. Code § 8880.68). An out-of-state ticket is taxed. Income earned after you invest the prize is still taxed.
          </p>
        )}

        <Field label="Prize amount ($)" tip="The cash option, or what is left if tax is already paid. Not the advertised jackpot." more="assumptions" help={inp.basis === 'gross' ? 'The cash amount before tax.' : 'Money already in hand after tax.'}>
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.amount || ''} min={0} step={100000} onChange={(e) => set('amount', +e.target.value || 0)} />
        </Field>

        <div className="flex gap-2">
          {(['gross', 'net'] as const).map((b) => (
            <Tip key={b} text={b === 'gross' ? 'The number is the cash option before tax. The calculator subtracts tax.' : 'The number is money you already have. Tax is not subtracted again.'} more="assumptions">
            <button onClick={() => set('basis', b)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer ${inp.basis === b ? 'border-primary bg-accent text-accent-foreground font-medium' : 'border-input bg-card text-muted-foreground hover:border-primary/50'}`}>
              {b === 'gross' ? 'Before tax' : 'After tax'}
            </button>
            </Tip>
          ))}
        </div>

        <Field label="Debt to pay before investing ($)" tip="Subtracted after tax and before anything is invested. Zero subtracts nothing. It does not change the tax." more="not-included" help="The exact amount. If it is larger than the cash left after tax, only the cash left is subtracted.">
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.debt || ''} min={0} step={1} onChange={(e) => set('debt', +e.target.value || 0)} />
        </Field>

        <Field label="How much you want to spend each year" tip="The check you want from year 2 on. If it is bigger than what the investments can pay, the pile gets spent." more="trade" help="The exact amount, in dollars.">
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.spend || ''} min={0} step={1} onChange={(e) => set('spend', +e.target.value || 0)} />
        </Field>

        <p className="rounded-md bg-secondary px-3 py-2 text-[13.5px] leading-relaxed">
          {inp.amount <= 0
            ? 'Enter a prize amount. Everything on the right stays at zero until you do.'
            : `You keep ${fmtCompact(r.net)} after tax. You could take about ${fmtCompact(r.capacity)} a year with no tax on that cash. In 25 years this setup would be about ${fmtCompact(r.stackEnd)}, versus ${fmtCompact(r.baselineEnd)} in a normal taxable account.`}
        </p>

        <Tip text={more ? 'Hide the extra inputs. State, prize, and spending stay visible.' : 'Move, reserves, fees, the income-or-growth slider, and the rate assumptions.'} more="assumptions">
        <button type="button" onClick={() => setMore((v) => !v)} className="text-left text-sm font-medium text-primary hover:underline cursor-pointer">
          {more ? 'Hide extra inputs' : 'More inputs'}
        </button>
        </Tip>

        {more && (
        <>
        <Field label="State you might move to" help="Pick a 0% income-tax state (WY, NV, TX, FL…) if you plan to relocate.">
          <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.target} onChange={(e) => set('target', e.target.value)}>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}{s.noTax ? ' — 0% tax' : ''}</option>)}
          </select>
        </Field>

        <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2">
          <span className="text-[14px]">Grow draw with inflation</span>
          <button title={inp.flatDraw ? 'Spending stays the same dollar amount every year. Click to let it rise with inflation.' : 'Spending rises each year with inflation. Click for a flat dollar amount.'} onClick={() => set('flatDraw', !inp.flatDraw)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors cursor-pointer ${inp.flatDraw ? 'bg-card border border-input text-muted-foreground hover:border-primary/50' : 'bg-primary text-primary-foreground'}`}>
            {inp.flatDraw ? 'Off — flat draw' : 'On'}
          </button>
        </div>

        <Field label="Entity #4 property / vehicle reserve" help={inp.residency === 'pr' ? "LLC can hold investment property — but not your PR primary residence (2026 rules require direct/trust ownership)." : "Cash carved out for the anonymous LLC to buy a home or vehicles. $0 if none."}>
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.entity4 || ''} min={0} step={50000} onChange={(e) => set('entity4', +e.target.value || 0)} />
        </Field>

        <Field label="Structure setup costs ($)" help="One-time year-1 legal and professional work: trusts drafted, PPLI placed, LLC formed, custody opened. Realistic range $50–150K.">
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.setupCost || ''} min={0} step={5000} onChange={(e) => set('setupCost', +e.target.value || 0)} />
        </Field>

        <Field label="Yearly fees to keep it running" tip="Trustee, accountant, and similar fees. Nothing is taken until you type it. This is not the insurance charge." help="Leave blank for no yearly fee.">
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.annualAdmin || ''} min={0} step={1000} onChange={(e) => set('annualAdmin', +e.target.value || 0)} />
        </Field>
        <Field label="Insurance charge, dollars a year" tip="Taken out of the pile each year. Nothing is taken until you type it. The policy growth rate is before this charge." help="Leave blank for no charge. A common carrier charge is about 0.8% of the policy. This box does not apply that unless you type it.">
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.ppliFee || ''} min={0} step={1000} onChange={(e) => set('ppliFee', +e.target.value || 0)} />
        </Field>
        {!r.qpOk && inp.amount > 0 && inp.mode !== 'manual' && <Limit>The insurance policy is not used unless at least {fmtCompact(PPLI_QP_MIN)} is invested. That is the Qualified Purchaser rule. This page has {fmtCompact(r.core)} invested.</Limit>}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[14px] font-medium">Income ↔ Growth dial</span>
            <span className="font-mono text-sm text-muted-foreground">{inp.mode === 'manual' ? 'manual' : inp.dial < 34 ? 'growth' : inp.dial > 66 ? 'income' : 'balanced'}</span>
          </div>
          <Slider
            value={[inp.dial]}
            min={0} max={100} step={1}
            disabled={inp.mode === 'manual'}
            onValueChange={([v]) => p.setInputs((prev) => ({ ...prev, dial: v, mode: v === 0 ? 'growth' : v === 100 ? 'income' : v === 50 ? 'balanced' : prev.mode === 'manual' ? 'balanced' : prev.mode }))}
          />
          <div className="mt-1 flex justify-between text-[12.5px] text-muted-foreground">
            <span>Compound for 25 yrs</span><span>Max tax-free income</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2">
          <span className="text-[14px]">Manual allocation</span>
          <button title={inp.mode === 'manual' ? 'You are setting the split yourself. Click to let the slider set it.' : 'The slider sets the split. Click to type your own mix.'} onClick={() => set('mode', inp.mode === 'manual' ? 'balanced' : 'manual')}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors cursor-pointer ${inp.mode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-card border border-input text-muted-foreground hover:border-primary/50'}`}>
            {inp.mode === 'manual' ? 'On' : 'Off'}
          </button>
        </div>

        {inp.mode === 'manual' && (
          <ManualAlloc inputs={inp} setInputs={p.setInputs} />
        )}

        <Field label="Residency plan" help="Controls which state taxes your future investment income.">
          <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.residency} onChange={(e) => set('residency', e.target.value as Inputs['residency'])}>
            <option value="stay">Stay put in {st.name}</option>
            <option value="second">Second home + domicile in {tg.name} (&lt;183 days)</option>
            <option value="move">Full move to {tg.name}</option>
            <option value="pr">Move to Puerto Rico (Act 60 decree)</option>
          </select>
        </Field>

        <Field label="Filing status" help="Used only for the federal estimate on the prize.">
          <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.filing} onChange={(e) => set('filing', e.target.value as Inputs['filing'])}>
            <option value="single">Single</option>
            <option value="mfj">Married filing jointly</option>
          </select>
        </Field>

        <details className="rounded-md border border-input" open>
          <summary className="cursor-pointer px-3 py-2 text-[14px] font-medium text-muted-foreground hover:text-foreground">Assumptions (editable)</summary>
          <p className="px-3 pb-2 text-[15px] leading-snug text-muted-foreground">
            These are the middle, not a forecast and not a quote. Change any of them. The chart uses the number in the box.
          </p>
          <button type="button" onClick={() => openExplain('assumptions')} className="px-3 pb-2 text-left text-[12.5px] font-medium text-primary underline cursor-pointer">Why these rates, in full (new tab)</button>
          <div className="space-y-3 px-3 pb-3">
            {([
              ['muniYield', 'Muni yield', 'The tax-free interest the bond ladder pays. That cash is the first money you can spend. In early November 2026 a 10-year AAA municipal bond yielded about 3.4%, and a 30-year AAA bond about 4.5% to 4.8%. A ladder spread across those years is about 4%. The old 4.25% was a round number, a bit high for a mixed ladder. The model holds 4% flat for 25 years. Real coupons will move.'],
              ['ppliGrowth', 'Policy growth, before the insurance charge', 'How fast the policy investments grow before the dollar charge you type. 7% is the middle of published 2026 long-run stock forecasts. The old 6.2% had already subtracted 0.8% for insurance. That subtraction is no longer hidden. Type the dollars in Insurance charge if you want them taken out. This is not a quote from an insurance company.'],
              ['ppliDraw', 'PPLI draw', 'How much of the policy you can take each year with no tax, first by withdrawing what you paid in, then by borrowing. 4.5% sits under the 6.2% growth, so one bad stretch does not empty the policy on the chart. The old 6.5% was a sales figure. A very cautious illustration is closer to 3%. A real policy can still lapse if the loans and the charges run ahead of this.'],
              ['eqGrowth', 'Equity growth', 'How fast the stocks grow before you take anything out. 7% is the middle of published 2026 long-run forecasts. Vanguard’s 30-year median was about 5.9%. J.P. Morgan’s large-cap forecast in October 2026 was 7.5%. The old 9% was close to the past average, which is the high end. It is not a prediction for any single year.'],
              ['eqDraw', 'Equity draw', 'How much of the stocks the model lets you spend each year. With stocks expected to grow at 7%, spending 3.5% leaves the pile growing. The model treats this whole amount as tax-free, using basis, harvested losses, and loans. That tax-free part is the generous piece: it is easier in the early years than in year 20. The old 4.5% assumed it stayed tax-free for the full 25 years.'],
              ['divYield', 'Equity dividends', 'Used only on the normal taxable account, which pays tax on these dividends every year. The trust stack does not. 1.5% is about what the broad U.S. market pays. This one was already in the middle, so it did not change.'],
              ['inflation', 'Inflation', 'Raises your spending each year, and powers the “today’s dollars” switch. The Federal Reserve’s target is 2%. 2.5% allows for inflation staying a bit above that. It is not a forecast for one year. This one was already in the middle, so it did not change.'],
            ] as const).map(([k, label, why]) => (
              <label key={k} className="block text-[12.5px] text-muted-foreground">
                <span className="font-medium text-foreground/90">{label}</span>
                <input type="number" step={0.25} min={0} max={20}
                  className="mt-0.5 w-full rounded border border-input bg-card px-2 py-1 text-sm font-num text-foreground"
                  value={(asm[k] * 100).toFixed(2)}
                  onChange={(e) => p.setAsm({ ...asm, [k]: (+e.target.value || 0) / 100 })} />
                <span className="mt-1 block leading-snug">{why}</span>
              </label>
            ))}
            <p className="text-[12.5px] leading-snug text-muted-foreground">
              The normal taxable account also pays 23.8% federal tax on stock gains. That is the real top rate: 20% plus the 3.8% net-investment surtax. It is not a guess, so it is not a box you edit.
            </p>
          </div>
        </details>

        <div className="rounded-md border border-input p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-medium">Optional sleeve</div>
            <button type="button" title="Opens the list of extra ideas. Each row says whether it changes the chart." onClick={p.onOpenLibrary} className="text-[12.5px] text-primary hover:underline cursor-pointer">
              Strategy library
            </button>
          </div>
          {!inp.sleeve ? (
            <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
              None. One sleeve at a time — choosing another replaces it. OZ, QSBS, and real estate change the projection. Other items do not.
            </p>
          ) : (
            <SleeveCard inp={inp} setInputs={p.setInputs} amount={r.sleeveAmount} />
          )}
        </div>

        <button title="Copies a link that reopens these exact numbers." onClick={share} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-95 cursor-pointer">
          {copied ? <><Check className="h-4 w-4" /> Link copied</> : <><Link2 className="h-4 w-4" /> Copy shareable link</>}
        </button>
        </>
        )}
      </div>

      {/* ---------- Results ---------- */}
      <div className="min-w-0 space-y-6">
        <div className="hidden lg:block">{headline}</div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Bonds" tip="The bond ladder. It pays the bond rate, tax-free, and the principal does not grow." more="bonds" value={fmtCompact(r.muni)} sub={`${pct(w.a)} of what is invested · ${fmtCompact(r.muni * asm.muniYield)}/yr`} />
          <Stat label="Insurance policy" tip="The life insurance policy. It is not used under $5,000,000 invested. Carriers usually want $2,500,000 inside it. This page does not move money to hit that." more="policy" value={fmtCompact(r.ppli)} sub={`${pct(w.b)} · ${fmtCompact(r.ppli * asm.ppliDraw)}/yr from this piece`} />
          <Stat label="Stocks" tip="Stocks. The growth rate and the spendable slice are the rates in the assumptions." more="stocks" value={fmtCompact(r.equity)} sub={r.sleeveAmount > 0 ? `${pct(r.core > 0 ? r.equity / r.core : 0)} after anything you moved out · ${fmtCompact(r.equity * asm.eqDraw)}/yr` : `${pct(w.c)} of what is invested · ${fmtCompact(r.equity * asm.eqDraw)}/yr`} />
          <Stat label="Tax-free cash capacity" tip="The most the mix can pay each year without selling the pile. Spending more than this eats principal." more="trade" value={fmtCompact(r.capacity)} sub={r.plannedDrawY2 > 0 ? `drawing ${fmtCompact(r.plannedDrawY2)}/yr · ${fmtCompact(Math.max(0, r.capacity - r.plannedDrawY2))} untapped${r.reinvestY2 > 1 ? ` (+${fmtCompact(r.reinvestY2)} coupons swept)` : ''}` : `available from month 13 · blended ${pct(r.blendedDraw)}`} tone="warm" />
        </div>

        {inp.amount > 0 && !r.sustainable && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <strong>Your spending target outruns the engines.</strong> You want {fmt(inp.spend)}/yr but the stack can sustainably pay {fmt(r.capacity)}/yr tax-free. Either lower the target, move the dial toward income, or grow the core — at this draw mix you'd need a core of roughly <span className="font-num font-semibold">{fmt(r.requiredCore)}</span>.
            </div>
          </div>
        )}

        {inp.amount > 0 && r.depletedYear && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <strong>The stack runs dry around year {r.depletedYear}.</strong> At this draw schedule the engines can't keep up, so the projection dips into principal and eventually empties. Lower the target, raise the dial toward income, or grow the core first.
            </div>
          </div>
        )}

        {inp.residency === 'pr' && <PRLazy inputs={inp} setInputs={p.setInputs} result={r} />}

        <div className="flex justify-end no-print">
          <button
            title={customizing ? 'Close the layout controls. The order is saved on this browser.' : 'Show, hide, or reorder the charts below.'}
            onClick={() => setCustomizing(!customizing)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer ${customizing ? 'border-primary bg-accent text-accent-foreground' : 'border-input text-muted-foreground hover:text-foreground'}`}
          >
            <Settings2 className="h-3.5 w-3.5" /> {customizing ? 'Done customizing' : 'Customize sections'}
          </button>
        </div>

        {customizing && layout.hidden.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Hidden:
            {layout.hidden.map((id) => (
              <button key={id} title={`Show ${SECTION_META.find((m) => m.id === id)?.title ?? 'this section'} again.`} onClick={() => toggleHide(id)} className="rounded-full border border-dashed border-input px-3 py-1 hover:border-primary hover:text-primary cursor-pointer">
                Restore {SECTION_META.find((m) => m.id === id)?.title}
              </button>
            ))}
          </div>
        )}

        {layout.order.filter((id) => !layout.hidden.includes(id)).map((id, idx, arr) => {
          const meta = SECTION_META.find((m) => m.id === id)!;
          return (
            <div key={id}>
              {customizing && (
                <div className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="font-mono uppercase tracking-wider">{meta.title}</span>
                  <button title="Move this section up." onClick={() => move(id, -1)} disabled={idx === 0} className="rounded p-1 hover:bg-secondary disabled:opacity-30 cursor-pointer" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button title="Move this section down." onClick={() => move(id, 1)} disabled={idx === arr.length - 1} className="rounded p-1 hover:bg-secondary disabled:opacity-30 cursor-pointer" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button title="Hide this section. You can restore it from the list above." onClick={() => toggleHide(id)} className="rounded p-1 hover:bg-secondary cursor-pointer" aria-label="Hide section"><EyeOff className="h-3.5 w-3.5" /></button>
                </div>
              )}
              {sectionNode(id)}
            </div>
          );
        })}
      </div>

      {/* ---------- Explanation rail ---------- */}
      <aside className="hidden h-fit space-y-4 lg:col-span-2 xl:col-span-1 xl:block">
        <ExplainRail inp={inp} r={r} />
      </aside>
    </div>
    </div>
  );
}

// Lazy wrappers keep imports tidy
import PRPanel from './PRPanel';
import RealEstatePanel from './RealEstatePanel';
function PRLazy(props: { inputs: Inputs; setInputs: Props['setInputs']; result: StackResult }) {
  return <PRPanel {...props} />;
}
function RealEstateLazy({ inputs, result }: { inputs: Inputs; result: StackResult }) {
  return <RealEstatePanel suggestedPrice={inputs.entity4} marginalRate={0.37 + result.futureStateRate} />;
}

function ManualAlloc({ inputs, setInputs }: { inputs: Inputs; setInputs: Props['setInputs'] }) {
  const upd = (key: 'a' | 'b' | 'c', v: number) => {
    setInputs((prev) => {
      const m = { ...prev.manual, [key]: v };
      const t = m.a + m.b + m.c || 1;
      return { ...prev, manual: { a: m.a / t, b: m.b / t, c: m.c / t } };
    });
  };
  const m = inputs.manual;
  return (
    <div className="space-y-3 rounded-md bg-secondary p-3">
      {([
        ['a', 'Bonds', m.a],
        ['b', 'Insurance policy', m.b],
        ['c', 'Stocks', m.c],
      ] as const).map(([k, label, v]) => (
        <div key={k}>
          <div className="flex justify-between text-sm"><span>{label}</span><span className="font-num">{Math.round(v * 100)}%</span></div>
          <Slider value={[Math.round(v * 100)]} min={0} max={100} step={1} onValueChange={([x]) => upd(k, x / 100)} />
        </div>
      ))}
      <p className="text-[15px] text-muted-foreground">The three sliders are forced to add to 100%. A handmade mix is left as you set it.</p>
    </div>
  );
}

function SleeveCard({ inp, setInputs, amount }: { inp: Inputs; setInputs: Props['setInputs']; amount: number }) {
  const spec = inp.sleeve ? SLEEVE_MATH[inp.sleeve] : undefined;
  const name = STRATEGIES.find((s) => s.id === inp.sleeve)?.name ?? inp.sleeve;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span>{name}</span>
        <button type="button" title="Clears this extra idea. If it was changing the chart, that cash goes back to the stocks." onClick={() => setInputs((p) => ({ ...p, sleeve: null }))} className="text-[12.5px] text-muted-foreground hover:text-destructive cursor-pointer">Remove</button>
      </div>
      {spec ? (
        <>
          <label className="block text-[12.5px] text-muted-foreground">
            Carve {Math.round(inp.sleevePct * 100)}% of the invested money from stocks ({fmtCompact(amount)}). Maximum {Math.round(SLEEVE_PCT_MAX * 100)}%.
            <input type="range" min={0} max={SLEEVE_PCT_MAX * 100} step={1} value={Math.round(inp.sleevePct * 100)}
              onChange={(e) => setInputs((p) => ({ ...p, sleevePct: (+e.target.value || 0) / 100 }))}
              className="mt-1 w-full" />
          </label>
          <p className="text-[12px] leading-snug text-muted-foreground">
            Model rates, not forecasts. OZ 6% growth and no draw. QSBS 4% expected growth and no draw. Real estate 3% appreciation and 4% cash draw. The taxable baseline uses the same rates, so the gap stays a tax gap.
          </p>
        </>
      ) : (
        <p className="text-[12.5px] leading-snug text-muted-foreground">Does not change the three-engine math.</p>
      )}
    </div>
  );
}

function ProjectionTable({ r, inp, asm, scenarios }: { r: StackResult; inp: Inputs; asm: Assumptions; scenarios: (ScenarioSlot | null)[] }) {
  return (
    <details className="hairline-card p-5">
      <summary className="cursor-pointer font-display text-lg font-semibold">25-year projection, year by year</summary>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Year 1 is the seasoning year — you live on the reserve and nothing comes out. From year 2 you draw your spending target
          (or your custom schedule); automatic muni coupons beyond that sweep back into equities. Fees = admin drag. Overspending dips into principal.
        </p>
        <button type="button" title="Downloads a spreadsheet of these inputs, the fees, and the 25-year line." onClick={() => downloadPlan(inp, asm, r, scenarios)} className="shrink-0 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary cursor-pointer">
          Download plan
        </button>
      </div>
      <div className="mt-3 max-h-96 overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-secondary">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-3 py-2 font-medium">Year</th>
              <th className="px-3 py-2 text-right font-medium">Beginning</th>
              <th className="px-3 py-2 text-right font-medium">Cash to you</th>
              <th className="px-3 py-2 text-right font-medium">Reinvested</th>
              <th className="px-3 py-2 text-right font-medium">Fees</th>
              <th className="px-3 py-2 text-right font-medium">Growth</th>
              <th className="px-3 py-2 text-right font-medium">Ending</th>
            </tr>
          </thead>
          <tbody>
            {r.projection.map((row) => (
              <tr key={row.year} className="border-t border-border/60 font-num text-[14px]">
                <td className="px-3 py-1.5">{row.year}</td>
                <td className="px-3 py-1.5 text-right">{fmt(row.begin)}</td>
                <td className="px-3 py-1.5 text-right stat-warm">{fmt(row.cash)}</td>
                <td className="px-3 py-1.5 text-right">{row.reinvested > 1 ? fmt(row.reinvested) : '—'}</td>
                <td className="px-3 py-1.5 text-right text-muted-foreground">{row.fees > 1 ? fmt(row.fees) : '—'}</td>
                <td className="px-3 py-1.5 text-right stat-good">{fmt(row.growth)}</td>
                <td className="px-3 py-1.5 text-right font-semibold">{fmt(row.end)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ScenarioCompare(p: Props & { scenarioResults: ReturnType<typeof useScenarioResults> }) {
  const filled = p.scenarios.filter(Boolean).length;
  return (
    <div className="hairline-card p-5 no-print">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Scenario comparison</h3>
          <p className="text-sm text-muted-foreground">Save up to five snapshots to compare. Each button stores the current numbers in that slot. Overwrite replaces that slot. Then take the Goals & Fit quiz to see which one fits.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <button key={i} title={p.scenarios[i] ? `Replace saved setup ${LETTERS[i]} with the numbers on screen.` : `Save the numbers on screen as setup ${LETTERS[i]}.`} onClick={() => p.saveScenario(i)}
              className="rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary cursor-pointer">
              {p.scenarios[i] ? 'Overwrite ' : 'Save as '}{LETTERS[i]}
            </button>
          ))}
          {filled > 0 && (
            <button title="Deletes every saved setup. The numbers on screen stay." onClick={p.clearScenarios} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-destructive cursor-pointer">Clear</button>
          )}
        </div>
      </div>
      {filled > 0 && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Outcome</th>
                  {p.scenarios.map((s, i) => <th key={i} className="py-2 pr-3 text-right font-medium">{s ? `Scenario ${LETTERS[i]}` : '—'}</th>)}
                </tr>
              </thead>
              <tbody className="font-num text-[14px]">
                {([
                  ['Net after-tax pool', (s: ScenarioSlot) => fmtCompact(s.result.net)],
                  ['Investable core', (s: ScenarioSlot) => fmtCompact(s.result.core)],
                  ['Allocation A/B/C', (s: ScenarioSlot) => s.result.alloc],
                  ['Tax-free capacity /yr', (s: ScenarioSlot) => fmtCompact(s.result.capacity)],
                  ['Net worth @ 25 yrs', (s: ScenarioSlot) => fmtCompact(s.result.stackEnd)],
                  ['Edge over taxable', (s: ScenarioSlot) => fmtCompact(s.result.advantage)],
                ] as const).map(([label, fn]) => (
                  <tr key={label} className="border-t border-border/60">
                    <td className="py-2 pr-3 font-sans text-muted-foreground">{label}</td>
                    {p.scenarios.map((s, i) => (
                      <td key={i} className="py-2 pr-3 text-right">{s?.result ? fn(s) : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="font-display text-base font-semibold">25-year race</h4>
              <ScenarioLines scenarios={p.scenarioResults} />
            </div>
            <div>
              <h4 className="font-display text-base font-semibold">Headline metrics</h4>
              <ScenarioBars scenarios={p.scenarioResults} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExplainRail({ inp, r }: { inp: Inputs; r: StackResult }) {
  const st = STATES.find((s) => s.code === inp.state)!;
  const tg = STATES.find((s) => s.code === inp.target)!;
  return (
    <>
      <div className="hairline-card p-5">
        <h4 className="font-display text-base font-semibold">What just happened to your money</h4>
        <ul className="mt-3 space-y-3 text-[14px] leading-relaxed text-muted-foreground">
          <li><strong className="text-foreground">Taxes came out first.</strong> The lottery withholds 24% federal, but the real bill is ~37% — the difference is due April 15, which is why Trust #1 parks it in T-Bills.</li>
          <li><strong className="text-foreground">Year 1 is a seasoning year.</strong> You live on the reserve while the PPLI and loss-harvesting engines warm up. Patience here is worth real money.</li>
          <li><strong className="text-foreground">From month 13, the tap opens — but you choose the flow.</strong> Up to {fmtCompact(r.capacity)}/yr is available tax-free. You plan to draw {fmtCompact(r.plannedDrawY2)}, and the surplus keeps compounding.</li>
        </ul>
      </div>
      <div className="hairline-card p-5">
        <h4 className="font-display text-base font-semibold">Your residency math</h4>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          {inp.residency === 'stay' && <>Staying in {st.name} means future unshielded income faces {pct(st.rate)} state tax. The stack's engines are designed so that number touches as little of your money as possible.</>}
          {inp.residency === 'pr' && <>As a bona fide Puerto Rico resident with an Act 60 decree, federal tax on post-move investment <em>gains</em> drops to <span className="font-num stat-good font-semibold">{pct(r.prRate, 0)}</span> under IRC §933 — the strongest legal rate available to a US person who keeps their citizenship. Details and the filing deadline are in the PR module above.</>}
          {(inp.residency === 'second' || inp.residency === 'move') && <>Domiciled in {tg.name} ({tg.noTax ? '0% income tax' : `${pct(tg.rate)} top rate`}), your future investment income faces <span className="font-num stat-good font-semibold">{pct(r.futureStateRate)}</span> state tax. Keep a day-count log — {st.name} will check.</>}
        </p>
      </div>
      <div className="rounded-lg border border-gold/40 bg-[hsl(var(--gold-tint))] p-4 text-[14px] leading-relaxed text-[hsl(var(--espresso-soft))]">
        <strong>Honest math, not advice.</strong> This is an educational model with simplified 2026 rates. Real trust drafting, PPLI underwriting, and residency law are fact-specific — run everything past a licensed attorney and CPA before acting.
      </div>
    </>
  );
}
