import { useState, type ReactNode } from 'react';
import { STATES } from '../lib/taxdata';
import {
  fmt, fmtCompact, pct, PPLI_QP_MIN, HORIZON, solveSpendForTarget, SLEEVE_MATH, SLEEVE_PCT_MAX,
  type Inputs, type Assumptions, type StackResult,
} from '../lib/calc';
import { Stat, Field, SectionTitle, Tip, Explainer, Limit, Chips } from '../components/widgets';
import { downloadPlan } from '../lib/download';
import AssumptionsPanel from '../components/AssumptionsPanel';
import ReportsPanel from '../components/ReportsPanel';

import FlowLive from '../components/FlowLive';
import type { EntityItem } from '../lib/entities';
import { ScenarioLines, ScenarioBars, useScenarioResults } from '../components/CompareCharts';

import { STRATEGIES } from '../lib/content';
import DrawSchedule from './DrawSchedule';
import PRPanel from './PRPanel';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Link2, Check, RotateCcw, Settings2, ArrowUp, ArrowDown } from 'lucide-react';

export interface ScenarioSlot {
  name: string;
  inputs: Inputs;
  result: { net: number; core: number; capacity: number; stackEnd: number; advantage: number; alloc: string };
}

interface Props {
  entities: EntityItem[];
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

const SECTION_META: Array<{ id: string; title: string; purpose: string }> = [
  { id: 'flow', title: 'Money flow', purpose: 'Where the money goes after the lottery pays you: reserves first, then the engines, then the anonymous LLC.' },
  { id: 'compare', title: 'Scenario comparison', purpose: 'Save a few different setups and see which life each one buys — yearly cash, fees, and the pile at the end.' },
];

interface Layout { order: string[] }
const DEFAULT_LAYOUT: Layout = { order: SECTION_META.map((s) => s.id) };

function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem('lotteryStack.layout');
    if (raw) {
      const parsed = JSON.parse(raw) as { order?: string[] };
      const valid = (parsed.order ?? []).filter((id) => SECTION_META.some((m) => m.id === id));
      for (const m of SECTION_META) if (!valid.includes(m.id)) valid.push(m.id);
      return { order: valid };
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT;
}

export default function CalculatorView(p: Props) {
  const { inputs: inp, result: r, asm } = p;
  const [copied, setCopied] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [layout, setLayoutRaw] = useState<Layout>(loadLayout);
  const [reserveNowSelected, setReserveNowSelected] = useState(false);
  const reserveTiming = inp.entity4 > 0 || reserveNowSelected ? 'now' : 'later';

  const setLayout = (l: Layout) => {
    setLayoutRaw(l);
    try { localStorage.setItem('lotteryStack.layout', JSON.stringify(l)); } catch { /* ignore */ }
  };
  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => p.setInputs((prev) => ({ ...prev, [k]: v }));
  const st = STATES.find((s) => s.code === inp.state)!;
  const tg = STATES.find((s) => s.code === inp.target)!;
  const [solvedDraw, setSolvedDraw] = useState<number | null>(null);

  const applyLeaveTarget = (v: string) => {
    if (v !== 'max') {
      const target = v === '0' ? 0 : r.core * (+v / 100);
      setSolvedDraw(solveSpendForTarget({ ...inp, leaveTarget: v }, asm, target));
    } else setSolvedDraw(null);
    p.setInputs((prev) => ({ ...prev, leaveTarget: v }));
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${btoa(JSON.stringify({ v: 3, inputs: inp, assumptions: asm }))}`;
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const w = r.weights;
  const savedScenarios = p.scenarios.map((s, i) => (s ? { letter: LETTERS[i], inputs: s.inputs } : null)).filter((s): s is { letter: string; inputs: Inputs } => !!s);
  const scenarioResults = useScenarioResults(savedScenarios, asm);

  const move = (id: string, dir: -1 | 1) => {
    const order = [...layout.order];
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setLayout({ order });
  };

  const sectionNode = (id: string) => {
    switch (id) {
      case 'flow': return <div className="hairline-card p-5"><h3 className="font-display text-lg font-semibold">The money flow</h3><p className="mt-1 mb-3 text-sm text-muted-foreground">Reserves come out first; only what remains goes into the investment engines.</p><FlowLive result={r} entities={p.entities} /></div>;
      case 'compare': return <ScenarioCompare {...p} scenarioResults={scenarioResults} />;
      default: return null;
    }
  };

  const scenarioButtons = (
    <div className="hairline-card space-y-3 p-4">
      <div className="flex items-center gap-1 text-[15px] font-medium">Save or download<Explainer text="Save keeps this setup in this browser as A, B, C, D, or E. Open puts a saved setup back on the page. Download writes a spreadsheet of the current numbers and every saved setup." /></div>
      <div className="flex flex-wrap items-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Tip key={i} text={p.scenarios[i] ? `Replace saved setup ${LETTERS[i]} with the numbers on screen.` : `Save the numbers on screen as setup ${LETTERS[i]}.`}>
            <button type="button" data-tour={i === 0 ? 'saveA' : undefined} onClick={() => p.saveScenario(i)} className="rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary cursor-pointer">{p.scenarios[i] ? 'Overwrite ' : 'Save as '}{LETTERS[i]}</button>
          </Tip>
        ))}
        {p.scenarios.some(Boolean) && p.scenarios.map((s, i) => s ? (
          <Tip key={`open-${i}`} text={`Put saved setup ${LETTERS[i]} back on the page.`}><button type="button" onClick={() => { setReserveNowSelected(false); p.loadScenario(i); }} className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary cursor-pointer">Open {LETTERS[i]}</button></Tip>
        ) : null)}
        <Tip text={`Downloads a spreadsheet of the current numbers, the ${HORIZON}-year line, fees, and saved setups.`}><button type="button" onClick={() => downloadPlan(inp, asm, r, p.scenarios)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground cursor-pointer">Download plan</button></Tip>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {scenarioButtons}
      {p.notice && <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-primary/40 bg-accent px-4 py-3 text-sm"><p>{p.notice.text}</p><div className="flex gap-2">{p.notice.undo && <button type="button" onClick={p.undoNotice} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground cursor-pointer">Undo</button>}<button type="button" onClick={p.dismissNotice} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground cursor-pointer">Dismiss</button></div></div>}

      <SectionTitle num="01" title={<>Your plan, <span className="sig-italic">one step at a time</span></>} blurb="Edit a choice and watch the outcome strip and full 30-year schedule change immediately. Each group of answers is followed directly by its result." />
      <OutcomeStrip inp={inp} r={r} />

      <FlowSection step="1" title="Start with the winnings" purpose="The prize and the first tax bill come before every other decision.">
        <div className="hairline-card space-y-4 p-5 no-print">
          <div className="flex items-center justify-between"><h3 className="font-display text-lg font-semibold">Your numbers</h3><Tip text="Clears the prize and puts every input back to the start."><button onClick={() => { setReserveNowSelected(false); p.resetAll(); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary cursor-pointer"><RotateCcw className="h-3 w-3" /> Reset</button></Tip></div>
          <Field label="Where you live now" tip="The state that taxes the prize, and future income if you stay." more="move" help="Sets the state tax on the prize — and on future income if you stay.">
            <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.state} onChange={(e) => set('state', e.target.value)}>{STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
          </Field>
          {st.code === 'CA' && <p className="text-[13px] leading-snug text-muted-foreground">State tax is $0 only for a California Lottery prize bought in California. An out-of-state ticket is taxed, and later investment income is still taxed.</p>}
          <div data-tour="amount"><Field label="Prize amount ($)" tip="The cash option, or what is left if tax is already paid. Not the advertised jackpot." more="assumptions" help={inp.basis === 'gross' ? 'The cash amount before tax.' : 'Money already in hand after tax.'}>
            <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.amount || ''} min={0} step={100000} onChange={(e) => set('amount', +e.target.value || 0)} />
            <Chips chips={[{ label: '$5M', value: 5000000 }, { label: '$18M', value: 18000000 }, { label: '$100M', value: 100000000 }]} value={inp.amount} onChange={(v) => set('amount', v)} hint="Examples only. Type the gross cash option or the net pool, matching Before/After tax." />
          </Field></div>
          <div className="flex gap-2">{(['gross', 'net'] as const).map((b) => <Tip key={b} text={b === 'gross' ? 'The number is the cash option before tax. The calculator subtracts tax.' : 'The number is money you already have. Tax is not subtracted again.'} more="assumptions"><button onClick={() => set('basis', b)} className={`flex-1 rounded-md border px-3 py-2 text-sm cursor-pointer ${inp.basis === b ? 'border-primary bg-accent text-accent-foreground font-medium' : 'border-input bg-card text-muted-foreground'}`}>{b === 'gross' ? 'Before tax' : 'After tax'}</button></Tip>)}</div>
          <Field label="Filing status" help="Used only for the federal estimate on the prize."><select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.filing} onChange={(e) => set('filing', e.target.value as Inputs['filing'])}><option value="single">Single</option><option value="mfj">Married filing jointly</option></select></Field>
          <Field label="Debt to pay before investing ($)" tip="Subtracted after tax and before anything is invested. Zero subtracts nothing. It does not change the tax." more="not-included" help="The exact amount. If it is larger than the cash left after tax, only the cash left is subtracted."><input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.debt || ''} min={0} step={1} onChange={(e) => set('debt', +e.target.value || 0)} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat label="Federal tax on prize" tip="Federal income tax on the cash option, at 2026 rates. The line under it is the state tax." more="assumptions" value={fmtCompact(r.fedTax)} sub={`+ ${fmtCompact(r.stateTax)} state`} />
          <Stat label="Net after-tax pool" tip="What is left after federal and state tax." more="trade" value={fmtCompact(r.net)} sub="after federal + state" tone="good" />
        </div>
        <TaxBreakdown inp={inp} r={r} />
      </FlowSection>

      <FlowSection step="2" title="Choose the life it pays for" purpose="Set the spending target and its shape. The answer appears directly below the controls.">
        <div className="hairline-card space-y-4 p-5 no-print">
          <div data-tour="spend"><Field label="How much you want to spend each year" tip="The check you want from year 2 on. If it is bigger than what the investments can pay, the pile gets spent." more="trade" help="The exact amount, in dollars.">
            <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.spend || ''} min={0} step={1} onChange={(e) => set('spend', +e.target.value || 0)} />
            <Chips chips={[{ label: '$100K/yr', value: 100000 }, { label: '$400K/yr', value: 400000 }, { label: '$1M/yr', value: 1000000 }]} value={inp.spend} onChange={(v) => set('spend', v)} hint="What you want to live on each year. This is a target, not a forced withdrawal." />
          </Field></div>
          <Field label="How much should be left at the end?" help="Choose a legacy goal. This does not change your yearly draw unless you deliberately use the solved amount.">
            <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.leaveTarget} onChange={(e) => applyLeaveTarget(e.target.value)}><option value="max">As much as possible</option><option value="75">Leave 75% of the core</option><option value="50">Leave half the core</option><option value="25">Leave 25% of the core</option><option value="0">Spend it all (or close to it)</option></select>
          </Field>
          {inp.leaveTarget !== 'max' && <div className="rounded-md bg-accent px-3 py-2 text-[13.5px] leading-relaxed text-accent-foreground">{solvedDraw !== null ? <>A draw of about <span className="font-num font-semibold">{fmt(solvedDraw)}/yr</span> would reach that goal. Your current draw is <span className="font-num font-semibold">{fmt(inp.spend)}/yr</span>—unchanged unless you choose it.<button type="button" onClick={() => p.setInputs((prev) => ({ ...prev, spend: solvedDraw, flatDraw: true, drawOverrides: {}, drawEvents: {} }))} className="mt-2 block rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground cursor-pointer">Use this as my yearly draw</button></> : <>Your current draw is <span className="font-num font-semibold">{fmt(inp.spend)}/yr</span>—unchanged by the goal.</>}</div>}
          <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2"><span className="text-[14px]">Grow draw with inflation</span><button title={inp.flatDraw ? 'Spending stays the same dollar amount every year. Click to let it rise with inflation.' : 'Spending rises each year with inflation. Click for a flat dollar amount.'} onClick={() => set('flatDraw', !inp.flatDraw)} className={`rounded-full px-3 py-1 text-sm font-medium cursor-pointer ${inp.flatDraw ? 'bg-card border border-input text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>{inp.flatDraw ? 'Off — flat draw' : 'On'}</button></div>
        </div>
        <div data-tour="capacity"><Stat label="Safe to take per year" tip="The most the mix can pay each year without selling the pile. Spending more than this eats principal." more="trade" value={fmtCompact(r.capacity)} sub={r.plannedDrawY2 > 0 ? `your schedule draws ${fmtCompact(r.plannedDrawY2)} in year 2` : `available from month 13 · blended ${pct(r.blendedDraw)}`} tone="warm" /></div>
        {inp.amount > 0 && !r.sustainable && <Warning>Your spending target is more than the stack can safely pay. You want {fmt(inp.spend)}/yr but the estimated capacity is {fmt(r.capacity)}/yr. A similar core would need to be roughly <strong>{fmt(r.requiredCore)}</strong>.</Warning>}
        {inp.amount > 0 && r.depletedYear && <Warning>The stack runs dry around year {r.depletedYear} at this draw schedule. Lower the draw, change the mix, or give the core more time to grow.</Warning>}
      </FlowSection>

      <FlowSection step="3" title="Decide what to set aside now" purpose="A year-1 reserve reduces the invested balance immediately. A later purchase should stay invested until it is needed.">
        <div className="hairline-card space-y-4 p-5 no-print">
          <div><h3 className="font-display text-lg font-semibold">Property or vehicle purchase</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Choose <strong>No year-1 purchase</strong> if the purchase is more than 12 months away. For a later home, boat, or vehicle, use the custom draw schedule or Entities &amp; Assets in the purchase year instead of carving cash out today.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => { setReserveNowSelected(false); set('entity4', 0); }} className={`rounded-md border px-4 py-3 text-left text-sm cursor-pointer ${reserveTiming === 'later' ? 'border-primary bg-accent font-medium' : 'border-input bg-card text-muted-foreground'}`}>No year-1 purchase — keep it invested</button>
            <button type="button" onClick={() => setReserveNowSelected(true)} className={`rounded-md border px-4 py-3 text-left text-sm cursor-pointer ${reserveTiming === 'now' ? 'border-primary bg-accent font-medium' : 'border-input bg-card text-muted-foreground'}`}>Year-1 purchase — set cash aside now</button>
          </div>
          {reserveTiming === 'now' && <Field label="Cash needed in the first 12 months ($)" help="This amount comes out of the after-tax pool now and is held by Entity #4 for the purchase. It is not invested in the three engines."><input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.entity4 || ''} min={0} step={50000} onChange={(e) => set('entity4', +e.target.value || 0)} /><Chips chips={[{ label: '$500K', value: 500000 }, { label: '$1.5M', value: 1500000 }, { label: '$3M', value: 3000000 }]} value={inp.entity4} onChange={(v) => set('entity4', v)} hint="Use only for a purchase expected in year 1. Enter $0 if you are not buying yet." /></Field>}
          {reserveTiming === 'later' && <p className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">Nothing is reserved for property or vehicles now, so this choice does not reduce today’s investment core.</p>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat label="Year-1 living reserve" tip="The first year of spending, plus setup cost, held back. The investments are not touched in year 1." more="trade" value={fmtCompact(r.yr1Reserve)} sub="spending + setup, in Trust #1" />
          <Stat label="Money left to invest" tip="What is left after tax, debt, the first-year reserve, and anything else you deliberately set aside." more="trade" value={fmtCompact(r.core)} sub={inp.entity4 > 0 ? `${fmtCompact(inp.entity4)} is held for the year-1 purchase` : 'no property/vehicle cash carved out'} />
        </div>
      </FlowSection>

      <FlowSection step="4" title="Choose how the rest is invested" purpose="Set the mix and any residency or strategy option. The allocation and compounding pictures are directly underneath.">
        <div className="hairline-card space-y-4 p-5 no-print">
          <div><div className="mb-1.5 flex items-center justify-between"><span className="text-[14px] font-medium">Income ↔ Growth dial</span><span className="font-mono text-sm text-muted-foreground">{inp.mode === 'manual' ? 'manual' : inp.dial < 34 ? 'growth' : inp.dial > 66 ? 'income' : 'balanced'}</span></div><Slider value={[inp.dial]} min={0} max={100} step={1} disabled={inp.mode === 'manual'} onValueChange={([v]) => p.setInputs((prev) => ({ ...prev, dial: v, mode: v === 0 ? 'growth' : v === 100 ? 'income' : v === 50 ? 'balanced' : prev.mode === 'manual' ? 'balanced' : prev.mode }))} /><div className="mt-1 flex justify-between text-[12.5px] text-muted-foreground"><span>More compounding</span><span>More tax-free income</span></div></div>
          <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2"><span className="text-[14px]">Manual allocation</span><button title={inp.mode === 'manual' ? 'You are setting the split yourself. Click to let the slider set it.' : 'The slider sets the split. Click to set your own mix.'} onClick={() => set('mode', inp.mode === 'manual' ? 'balanced' : 'manual')} className={`rounded-full px-3 py-1 text-sm font-medium cursor-pointer ${inp.mode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-card border border-input text-muted-foreground'}`}>{inp.mode === 'manual' ? 'On' : 'Off'}</button></div>
          {inp.mode === 'manual' && <ManualAlloc inputs={inp} setInputs={p.setInputs} />}
          <div className="rounded-md border border-input p-3"><div className="text-[13px] font-medium">Optional residency change</div><p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">No special residency plan is assumed unless you choose one. The prize itself is still taxed where you claimed it.</p><select className="mt-2 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.residency} onChange={(e) => set('residency', e.target.value as Inputs['residency'])}><option value="none">No special residency plan</option><option value="stay">Stay put in {st.name}</option><option value="second">Second home + domicile in {tg.name} (&lt;183 days)</option><option value="move">Full move to {tg.name}</option><option value="pr">Move to Puerto Rico (Act 60 decree)</option></select>
            {(inp.residency === 'second' || inp.residency === 'move') && <Field label="State you might move to" help="This changes the modeled future state-tax drag, not the tax on the original prize."><select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.target} onChange={(e) => set('target', e.target.value)}>{STATES.map((s) => <option key={s.code} value={s.code}>{s.name}{s.noTax ? ' — 0% tax' : ''}</option>)}</select></Field>}
          </div>
          <div className="rounded-md border border-input p-3"><div className="flex items-center justify-between gap-2"><div className="text-[13px] font-medium">Optional strategy sleeve</div><button type="button" onClick={p.onOpenLibrary} className="text-[12.5px] text-primary hover:underline cursor-pointer">Strategy library</button></div>{!inp.sleeve ? <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">None. One sleeve at a time—choosing another replaces it. OZ, QSBS, and real estate can change the projection; other entries are explanatory.</p> : <SleeveCard inp={inp} setInputs={p.setInputs} amount={r.sleeveAmount} />}</div>
        </div>
        <PpliChoice inp={inp} setInputs={p.setInputs} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Bonds" tip="The bond ladder. It pays the bond rate, tax-free, and the principal does not grow." more="bonds" value={fmtCompact(r.muni)} sub={`${pct(w.a)} · ${fmtCompact(r.muni * asm.muniYield)}/yr`} />
          <Stat label="Insurance policy" tip="Life insurance on a person, with an investment wrapper. It is not insurance for the lottery principal." more="policy" value={inp.ppliEnabled === false ? 'Not included' : fmtCompact(r.ppli)} sub={inp.ppliEnabled === false ? 'its share is split between bonds and stocks' : r.qpOk ? `${fmtCompact(r.ppli * asm.ppliDraw)}/yr capacity` : `under the ${fmtCompact(PPLI_QP_MIN)} minimum`} />
          <Stat label="Stocks" tip="The direct-indexed equity allocation and its spendable slice." more="stocks" value={fmtCompact(r.equity)} sub={`${fmtCompact(r.equity * asm.eqDraw)}/yr capacity`} />
        </div>
        {inp.ppliEnabled !== false && <Limit>Insurance-wrapper minimum: {fmtCompact(PPLI_QP_MIN)}. Current allocation: {fmtCompact(r.ppli)}. {r.qpOk ? 'That meets the model minimum.' : 'That is under the minimum; your entered mix was not silently erased.'}</Limit>}
        {inp.residency === 'pr' && <PRPanel inputs={inp} setInputs={p.setInputs} result={r} />}
      </FlowSection>

      <FlowSection step="5" title="Add costs and assumptions" purpose="Nothing is silently filled in. Choose a planning scenario, build your own, or deliberately model $0.">
        <div className="hairline-card space-y-4 p-5 no-print">
          <Field label="One-time structure setup costs ($)" help="Year-1 legal and professional work: trusts drafted, PPLI placed, LLCs formed, and custody opened. These are separate from annual costs."><input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.setupCost || ''} min={0} step={5000} onChange={(e) => set('setupCost', +e.target.value || 0)} /><Chips chips={[{ label: '$0 for now', value: 0 }, { label: '$50K', value: 50000 }, { label: '$75K', value: 75000 }, { label: '$125K', value: 125000 }]} value={inp.setupCost} onChange={(v) => set('setupCost', v)} hint="Planning examples only, not quotes. A typed amount replaces the selection." /></Field>
          <AnnualFeePlanner inp={inp} setInputs={p.setInputs} />
          <InsuranceChargePlanner inp={inp} r={r} setInputs={p.setInputs} />
        </div>
        <AssumptionsPanel inputs={inp} asm={asm} setAsm={p.setAsm} />
        <button title="Copies a link that reopens these exact numbers." onClick={share} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground cursor-pointer">{copied ? <><Check className="h-4 w-4" /> Link copied</> : <><Link2 className="h-4 w-4" /> Copy shareable link</>}</button>
      </FlowSection>

      <DrawSchedule inputs={inp} setInputs={p.setInputs} result={r} asm={asm} />
      <ReportsPanel r={r} inp={inp} asm={asm} scenarios={p.scenarios} />

      <FlowSection step="6" title="Inspect the detailed results" purpose="Reorder these detail sections if you like. Nothing is hidden, and every number above remains editable.">
        <div className="flex justify-end no-print"><button onClick={() => setCustomizing(!customizing)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm cursor-pointer ${customizing ? 'border-primary bg-accent' : 'border-input text-muted-foreground'}`}><Settings2 className="h-3.5 w-3.5" /> {customizing ? 'Done reordering' : 'Reorder detail sections'}</button></div>
        {layout.order.map((id, idx, arr) => {
          const meta = SECTION_META.find((m) => m.id === id)!;
          return <div key={id}>{customizing && <div className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground"><span className="font-mono uppercase tracking-wider">{meta.title}</span><button onClick={() => move(id, -1)} disabled={idx === 0} className="rounded p-1 disabled:opacity-30 cursor-pointer" aria-label={`Move ${meta.title} up`}><ArrowUp className="h-3.5 w-3.5" /></button><button onClick={() => move(id, 1)} disabled={idx === arr.length - 1} className="rounded p-1 disabled:opacity-30 cursor-pointer" aria-label={`Move ${meta.title} down`}><ArrowDown className="h-3.5 w-3.5" /></button></div>}<p className="mb-2 max-w-[75ch] text-[13px] leading-snug text-muted-foreground">{meta.purpose}</p>{sectionNode(id)}</div>;
        })}
      </FlowSection>
    </div>
  );
}

function PpliChoice({ inp, setInputs }: { inp: Inputs; setInputs: Props['setInputs'] }) {
  const enabled = inp.ppliEnabled !== false;
  return (
    <div className="hairline-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Life insurance with an investment wrapper (PPLI)</h3>
          <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
            <strong>Who is insured?</strong> Usually you. <strong>Who benefits?</strong> The beneficiaries you name, through the death benefit. It can also provide tax-advantaged investment growth when structured correctly. It does not insure the lottery principal, prevent lawsuits, or protect against market losses.
          </p>
        </div>
        <button type="button" onClick={() => setInputs((prev) => ({ ...prev, ppliEnabled: !enabled, ...(enabled ? { ppliFeeMode: 'none' as const, ppliFee: 0 } : {}) }))} className={`rounded-full px-4 py-2 text-sm font-medium cursor-pointer ${enabled ? 'bg-primary text-primary-foreground' : 'border border-input bg-card text-muted-foreground'}`}>
          {enabled ? 'Included — remove it' : 'Not included — explore PPLI'}
        </button>
      </div>
      {enabled && <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">The policy owner is often an irrevocable trust. Carrier charges, medical underwriting, premium limits, investor-control rules, and lapse risk all matter. Choose a charge scenario under Costs and assumptions.</p>}
    </div>
  );
}

function FlowSection({ step, title, purpose, children }: { step: string; title: string; purpose: string; children: ReactNode }) {
  return <section className="scroll-mt-24 border-t border-border/60 pt-5 first:border-t-0 first:pt-0"><div className="mb-3 flex items-start gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-num text-[13px] font-semibold text-accent-foreground">{step}</span><div><h2 className="font-display text-xl font-semibold">{title}</h2><p className="mt-0.5 max-w-[72ch] text-[13px] leading-relaxed text-muted-foreground">{purpose}</p></div></div><div className="space-y-4">{children}</div></section>;
}

function Warning({ children }: { children: ReactNode }) {
  return <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div className="text-sm leading-relaxed">{children}</div></div>;
}

type AdminItems = NonNullable<Inputs['adminFeeItems']>;
type AdminMode = NonNullable<Inputs['adminFeeMode']>;
const EMPTY_ADMIN_ITEMS: AdminItems = { trustee: 0, cpa: 0, legal: 0, entity: 0, reporting: 0 };
const ADMIN_PRESETS: Record<'basic' | 'full' | 'complex', { label: string; items: AdminItems }> = {
  basic: { label: 'Basic domestic administration', items: { trustee: 8000, cpa: 4000, legal: 0, entity: 1500, reporting: 1500 } },
  full: { label: 'Full domestic trust stack', items: { trustee: 12000, cpa: 6000, legal: 5000, entity: 2000, reporting: 0 } },
  complex: { label: 'Complex or multiple-entity administration', items: { trustee: 20000, cpa: 10000, legal: 10000, entity: 4000, reporting: 6000 } },
};
const ADMIN_LINES: Array<[keyof AdminItems, string]> = [
  ['trustee', 'Trustee and trust administration'], ['cpa', 'CPA and annual tax preparation'], ['legal', 'Attorney, legal, and compliance'], ['entity', 'LLC and registered-agent costs'], ['reporting', 'Reporting, custody, and other administration'],
];
const adminTotal = (items: AdminItems) => ADMIN_LINES.reduce((sum, [key]) => sum + Math.max(0, items[key] || 0), 0);

export function AnnualFeePlanner({ inp, setInputs }: { inp: Inputs; setInputs: Props['setInputs'] }) {
  const mode: AdminMode = inp.adminFeeMode ?? (inp.annualAdmin > 0 ? 'custom' : 'none');
  const savedItems = { ...EMPTY_ADMIN_ITEMS, ...(inp.adminFeeItems ?? {}) };
  const displayedItems = mode === 'basic' || mode === 'full' || mode === 'complex' ? { ...ADMIN_PRESETS[mode].items, ...savedItems } : savedItems;

  const applyMode = (next: AdminMode) => {
    if (next === 'none') {
      setInputs((prev) => ({ ...prev, adminFeeMode: 'none', annualAdmin: 0 }));
      return;
    }
    if (next === 'custom') {
      const items = { ...displayedItems };
      setInputs((prev) => ({ ...prev, adminFeeMode: 'custom', adminFeeItems: items, annualAdmin: adminTotal(items) }));
      return;
    }
    const items = { ...ADMIN_PRESETS[next].items };
    setInputs((prev) => ({ ...prev, adminFeeMode: next, adminFeeItems: items, annualAdmin: adminTotal(items) }));
  };

  const updateItem = (key: keyof AdminItems, value: number) => {
    const items = { ...savedItems, [key]: Math.max(0, value || 0) };
    setInputs((prev) => ({ ...prev, adminFeeMode: 'custom', adminFeeItems: items, annualAdmin: adminTotal(items) }));
  };

  return (
    <div className="rounded-md border border-input p-4" data-testid="annual-fee-planner">
      <h3 className="font-display text-lg font-semibold">Yearly trustee, tax, legal, and entity costs</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Choose a planning allowance or build your own. These are not provider quotes. They exclude one-time setup costs and the separate insurance-policy charge.</p>
      <label className="mt-3 block text-sm font-medium">Annual-cost scenario
        <select className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal" value={mode} onChange={(e) => applyMode(e.target.value as AdminMode)}>
          <option value="none">Do not include annual administration costs — $0</option>
          <option value="basic">Basic domestic administration — $15,000/yr</option>
          <option value="full">Full domestic trust stack — $25,000/yr</option>
          <option value="complex">Complex or multiple entities — $50,000/yr</option>
          <option value="custom">Build my own itemized estimate</option>
        </select>
      </label>
      {mode !== 'none' && <dl className="mt-4 divide-y divide-border/60">{ADMIN_LINES.map(([key, label]) => <div key={key} className="flex items-center justify-between gap-4 py-2.5"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="shrink-0 text-right font-num text-sm">{mode === 'custom' ? <input aria-label={label} type="number" min={0} step={500} value={savedItems[key] || ''} onChange={(e) => updateItem(key, +e.target.value)} className="w-32 rounded-md border border-input bg-card px-2 py-1 text-right" /> : fmt(displayedItems[key])}</dd></div>)}<div className="flex flex-col gap-1 py-3 font-semibold sm:flex-row sm:items-center sm:justify-between"><dt>Total included each year</dt><dd className="whitespace-nowrap font-num">{fmt(inp.annualAdmin)}</dd></div></dl>}
      {inp.annualAdmin <= 0 && <p className="mt-3 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">Your projection currently excludes trustee, tax, legal, and entity-maintenance costs.</p>}
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">The total shown is the exact amount used in the projection. Fixed-dollar annual costs rise with the inflation assumption. Foreign structures and multi-jurisdiction filings can cost substantially more; replace these allowances with real quotes when you have them.</p>
    </div>
  );
}

export function InsuranceChargePlanner({ inp, r, setInputs }: { inp: Inputs; r: StackResult; setInputs: Props['setInputs'] }) {
  if (inp.ppliEnabled === false) {
    return (
      <div className="rounded-md border border-input p-4" data-testid="insurance-charge-planner">
        <h3 className="font-display text-lg font-semibold">Insurance policy charge</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">No life-insurance policy is selected, so there is no insured person, death benefit, policy allocation, or carrier charge in this plan.</p>
      </div>
    );
  }
  const mode = inp.ppliFeeMode ?? (inp.ppliFee > 0 ? 'fixed' : 'none');
  const rate = inp.ppliFeeRate ?? 0.008;
  const yearlyCharge = mode === 'rate' ? r.ppli * rate : mode === 'fixed' ? inp.ppliFee : 0;

  const applyMode = (next: 'none' | 'rate' | 'fixed') => {
    if (next === 'none') setInputs((prev) => ({ ...prev, ppliFeeMode: 'none', ppliFee: 0 }));
    else if (next === 'rate') setInputs((prev) => ({ ...prev, ppliFeeMode: 'rate', ppliFeeRate: rate, ppliFee: Math.round(r.ppli * rate) }));
    else setInputs((prev) => ({ ...prev, ppliFeeMode: 'fixed', ppliFee: Math.round(mode === 'rate' ? yearlyCharge : prev.ppliFee) }));
  };
  const setRate = (next: number) => setInputs((prev) => ({ ...prev, ppliFeeMode: 'rate', ppliFeeRate: next, ppliFee: Math.round(r.ppli * next) }));

  return (
    <div className="rounded-md border border-input p-4" data-testid="insurance-charge-planner">
      <h3 className="font-display text-lg font-semibold">Insurance policy charge</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">This is the insurance company’s yearly policy charge. It is separate from trustee, attorney, CPA, and LLC costs. If you do not have a quote, choose a planning scenario or deliberately model $0.</p>
      <label className="mt-3 block text-sm font-medium">How should the model handle this charge?
        <select className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal" value={mode} onChange={(e) => applyMode(e.target.value as 'none' | 'rate' | 'fixed')}>
          <option value="none">Choose a charge scenario</option><option value="rate">Percentage of the policy each year</option><option value="fixed">Fixed dollar amount from my quote</option>
        </select>
      </label>
      {mode === 'rate' && <div className="mt-3 space-y-3"><div className="flex flex-wrap gap-2">{[0.005, 0.008, 0.012].map((v) => <button key={v} type="button" onClick={() => setRate(v)} className={`rounded-full border px-3 py-1.5 text-sm cursor-pointer ${rate === v ? 'border-primary bg-accent font-medium' : 'border-input text-muted-foreground'}`}>{pct(v)} planning scenario</button>)}</div><label className="block text-sm text-muted-foreground">Custom percentage per year<div className="mt-1 flex items-center gap-2"><input aria-label="Custom insurance charge percentage" type="number" min={0} step={0.05} value={+(rate * 100).toFixed(2)} onChange={(e) => setRate(Math.max(0, (+e.target.value || 0) / 100))} className="w-32 rounded-md border border-input bg-card px-2 py-1.5 font-num" /><span>%</span></div></label><p className="rounded-md bg-secondary px-3 py-2 text-sm"><strong>{pct(rate, 2)} × {fmt(r.ppli)} current policy balance = {fmt(Math.round(yearlyCharge))}/yr</strong></p></div>}
      {mode === 'fixed' && <label className="mt-3 block text-sm text-muted-foreground">Your quoted charge, dollars per year<input aria-label="Fixed yearly insurance charge" type="number" min={0} step={1000} value={inp.ppliFee || ''} onChange={(e) => setInputs((prev) => ({ ...prev, ppliFeeMode: 'fixed', ppliFee: Math.max(0, +e.target.value || 0) }))} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 font-num" /></label>}
      {mode === 'none' && <p className="mt-3 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">A policy is included, but no charge scenario has been selected. The projection temporarily includes <strong>$0</strong>; choose a percentage or a real quote because an active policy is not free.</p>}
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Modeled charge now: <span className="font-num font-semibold">{fmt(Math.round(yearlyCharge))}/yr</span>. A percentage follows each year’s projected policy balance; a fixed-dollar quote rises with inflation. Explicit $0 always remains $0.</p>
    </div>
  );
}

function ManualAlloc({ inputs, setInputs }: { inputs: Inputs; setInputs: Props['setInputs'] }) {
  const upd = (key: 'a' | 'b' | 'c', v: number) => {
    setInputs((prev) => ({ ...prev, manual: { ...prev.manual, [key]: v } }));
  };
  const m = inputs.manual;
  const sum = Math.round((m.a + m.b + m.c) * 100);
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
      <p className="text-[15px] text-muted-foreground">Each slider stands on its own. Moving one does not change the other two.</p>
      {sum > 100 && <Limit>These three add up to {sum}%. That is over 100%. The chart does not invent money. It fills the insurance box first, then bonds, then stocks, because that order pays the most tax-free income at the rates on this page: insurance 4.5%, bonds 4%, stocks 3.5%. The percents you set are not changed.</Limit>}
      <Limit>Minimum: $5,000,000 in the insurance box.</Limit>
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

export function TaxBreakdown({ inp, r }: { inp: Inputs; r: StackResult }) {
  const st = STATES.find((s) => s.code === inp.state)!;
  const totalTax = r.fedTax + r.stateTax;
  const effectiveRate = r.gross > 0 ? totalTax / r.gross : 0;
  const moneyRow = (label: string, value: string, emphasis = false) => (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${emphasis ? 'border-t border-border font-semibold' : ''}`}>
      <dt className={emphasis ? 'text-sm text-foreground' : 'text-sm text-muted-foreground'}>{label}</dt>
      <dd className="shrink-0 whitespace-nowrap text-right font-num font-medium">{value}</dd>
    </div>
  );

  return (
    <section aria-label="Initial tax breakdown" className="hairline-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Initial tax breakdown</h3>
          <p className="mt-1 text-sm text-muted-foreground">What comes out of the winning amount before debt, reserves, or investing.</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-muted-foreground">
          {inp.basis === 'gross' ? `${pct(effectiveRate)} effective tax` : 'After-tax entry'}
        </span>
      </div>

      {inp.basis === 'gross' ? (
        <>
          <dl className="mt-3 divide-y divide-border/60">
            {moneyRow('Winning cash option, before tax', fmt(r.gross))}
            {moneyRow('Federal income tax', r.fedTax > 0 ? `−${fmt(r.fedTax)}` : fmt(0))}
            {moneyRow(`${st.name} state income tax`, r.stateTax > 0 ? `−${fmt(r.stateTax)}` : fmt(0))}
            {moneyRow('Total estimated tax', totalTax > 0 ? `−${fmt(totalTax)}` : fmt(0), true)}
          </dl>
          <div className="mt-3 flex flex-col gap-1 rounded-md bg-accent px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="text-sm font-semibold">You keep after tax</span>
            <span className="whitespace-nowrap font-num text-xl font-semibold stat-good">{fmt(r.net)}</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Estimated upfront withholding: <span className="font-num">{fmt(r.withheld)}</span>. Withholding is a prepayment, not the final tax bill. The rows above estimate the final 2026 tax; any difference is settled when you file.
          </p>
        </>
      ) : (
        <>
          <dl className="mt-3 divide-y divide-border/60">
            {moneyRow('Money you already have after tax', fmt(r.net))}
            {moneyRow('Federal tax subtracted again', fmt(0))}
            {moneyRow('State tax subtracted again', fmt(0))}
            {moneyRow('Total tax subtracted here', fmt(0), true)}
          </dl>
          <div className="mt-3 flex flex-col gap-1 rounded-md bg-accent px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="text-sm font-semibold">Available before other uses</span>
            <span className="whitespace-nowrap font-num text-xl font-semibold stat-good">{fmt(r.net)}</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            You selected <strong>After tax</strong>. The planner treats this as money already in hand and does not estimate or subtract tax you previously paid.
          </p>
        </>
      )}
    </section>
  );
}

function OutcomeStrip({ inp, r }: { inp: Inputs; r: StackResult }) {
  const items: Array<[string, string]> = [
    ['After tax', fmtCompact(r.net)],
    ['Invested now', fmtCompact(r.core)],
    ['Safe yearly cash', fmtCompact(r.capacity)],
    ['Your yearly draw', fmtCompact(r.plannedDrawY2 > 0 ? r.plannedDrawY2 : inp.spend)],
    [`Left at year ${HORIZON}`, fmtCompact(r.stackEnd)],
    ['First shortfall', r.depletedYear ? `Year ${r.depletedYear}` : 'None'],
  ];
  return (
    <div className="sticky top-0 z-20 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-sm sm:grid-cols-3 xl:grid-cols-6" data-testid="outcome-strip">
      {items.map(([label, value]) => (
        <div key={label} className="bg-card px-3 py-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={`mt-0.5 whitespace-nowrap font-num text-lg font-semibold ${label === 'First shortfall' && r.depletedYear ? 'text-destructive' : ''}`}>{value}</div>
        </div>
      ))}
    </div>
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
            <button key={i} title={p.scenarios[i] ? `Replace saved setup ${LETTERS[i]} with the numbers on screen.` : `Save the numbers on screen as setup ${LETTERS[i]}.`} data-tour={i === 0 ? "saveA" : undefined} onClick={() => p.saveScenario(i)}
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
                  ['Safe to take /yr', (s: ScenarioSlot) => fmtCompact(s.result.capacity)],
                  [`Net worth @ ${HORIZON} yrs`, (s: ScenarioSlot) => fmtCompact(s.result.stackEnd)],
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
              <h4 className="font-display text-base font-semibold">{HORIZON}-year race</h4>
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
