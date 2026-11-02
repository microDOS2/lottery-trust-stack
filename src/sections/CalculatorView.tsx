import { useState } from 'react';
import { STATES } from '../lib/taxdata';
import {
  fmt, fmtCompact, pct, PPLI_QP_MIN,
  type Inputs, type Assumptions, type StackResult,
} from '../lib/calc';
import { Stat, Field, SectionTitle } from '../components/widgets';
import { AllocationDonut, ProjectionChart, FlowDiagram } from '../components/viz';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Link2, Check, RotateCcw } from 'lucide-react';

export interface ScenarioSlot {
  name: string;
  inputs: Inputs;
  result: { net: number; core: number; annualFree: number; stackEnd: number; advantage: number; alloc: string };
}

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
  setAsm: (a: Assumptions) => void;
  result: StackResult;
  scenarios: (ScenarioSlot | null)[];
  saveScenario: (i: number) => void;
  clearScenarios: () => void;
  resetAll: () => void;
}

export default function CalculatorView(p: Props) {
  const { inputs: inp, result: r, asm } = p;
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => p.setInputs((prev) => ({ ...prev, [k]: v }));
  const st = STATES.find((s) => s.code === inp.state)!;
  const tg = STATES.find((s) => s.code === inp.target)!;

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${btoa(JSON.stringify(inp))}`;
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const w = r.weights;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      {/* ---------- Controls ---------- */}
      <div className="hairline-card h-fit p-5 lg:sticky lg:top-20 space-y-4 no-print">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Your numbers</h3>
          <button onClick={p.resetAll} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <Field label="Where you live now" help="Sets the state tax on the prize — and on future income if you stay.">
          <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.state} onChange={(e) => set('state', e.target.value)}>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </Field>

        <Field label="State you might move to" help="Pick a 0% income-tax state (WY, NV, TX, FL…) if you plan to relocate.">
          <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.target} onChange={(e) => set('target', e.target.value)}>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}{s.noTax ? ' — 0% tax' : ''}</option>)}
          </select>
        </Field>

        <Field label="Prize amount ($)" help={inp.basis === 'gross' ? 'The advertised cash option, before taxes.' : 'Money actually in hand after taxes.'}>
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.amount} min={0} step={100000} onChange={(e) => set('amount', +e.target.value || 0)} />
        </Field>

        <div className="flex gap-2">
          {(['gross', 'net'] as const).map((b) => (
            <button key={b} onClick={() => set('basis', b)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer ${inp.basis === b ? 'border-primary bg-accent text-accent-foreground font-medium' : 'border-input bg-card text-muted-foreground hover:border-primary/50'}`}>
              {b === 'gross' ? 'Gross cash option' : 'Net after-tax'}
            </button>
          ))}
        </div>

        <Field label="Target annual tax-free spending" help="What you want to spend each year after Year 1. Sizes the reserve and drives the sustainability check.">
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.spend} min={0} step={10000} onChange={(e) => set('spend', +e.target.value || 0)} />
        </Field>

        <Field label="Entity #4 property / vehicle reserve" help="Cash carved out for the anonymous LLC to buy a home or vehicles. $0 if none.">
          <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={inp.entity4} min={0} step={50000} onChange={(e) => set('entity4', +e.target.value || 0)} />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-medium">Income ↔ Growth dial</span>
            <span className="font-mono text-xs text-muted-foreground">{inp.mode === 'manual' ? 'manual' : inp.dial < 34 ? 'growth' : inp.dial > 66 ? 'income' : 'balanced'}</span>
          </div>
          <Slider
            value={[inp.dial]}
            min={0} max={100} step={1}
            disabled={inp.mode === 'manual'}
            onValueChange={([v]) => p.setInputs((prev) => ({ ...prev, dial: v, mode: v === 0 ? 'growth' : v === 100 ? 'income' : v === 50 ? 'balanced' : prev.mode === 'manual' ? 'balanced' : prev.mode }))}
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Compound for 25 yrs</span><span>Max tax-free income</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2">
          <span className="text-[13px]">Manual allocation</span>
          <button onClick={() => set('mode', inp.mode === 'manual' ? 'balanced' : 'manual')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${inp.mode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-card border border-input text-muted-foreground hover:border-primary/50'}`}>
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
          </select>
        </Field>

        <Field label="Filing status" help="Used only for the federal estimate on the prize.">
          <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inp.filing} onChange={(e) => set('filing', e.target.value as Inputs['filing'])}>
            <option value="single">Single</option>
            <option value="mfj">Married filing jointly</option>
          </select>
        </Field>

        <details className="rounded-md border border-input">
          <summary className="cursor-pointer px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground">Assumptions (editable)</summary>
          <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-1">
            {([
              ['muniYield', 'Muni yield'], ['ppliDraw', 'PPLI draw'], ['ppliGrowth', 'PPLI growth'],
              ['eqDraw', 'Equity draw'], ['eqGrowth', 'Equity growth'], ['divYield', 'Equity dividends'],
            ] as const).map(([k, label]) => (
              <label key={k} className="text-[11px] text-muted-foreground">
                {label}
                <input type="number" step={0.25} min={0} max={20}
                  className="mt-0.5 w-full rounded border border-input bg-card px-2 py-1 text-xs font-num"
                  value={(asm[k] * 100).toFixed(2)}
                  onChange={(e) => p.setAsm({ ...asm, [k]: (+e.target.value || 0) / 100 })} />
              </label>
            ))}
          </div>
        </details>

        <button onClick={share} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-95 cursor-pointer">
          {copied ? <><Check className="h-4 w-4" /> Link copied</> : <><Link2 className="h-4 w-4" /> Copy shareable link</>}
        </button>
      </div>

      {/* ---------- Results ---------- */}
      <div className="min-w-0 space-y-6">
        <div>
          <SectionTitle
            num="01"
            title={<>Your after-tax pool, <span className="sig-italic">working for you</span></>}
            blurb={`${st.name} prize, ${inp.basis === 'gross' ? 'starting from the gross cash option' : 'starting from money already after tax'}, ${inp.filing === 'mfj' ? 'married filing jointly' : 'single'} — 2026 rates.`}
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Federal tax on prize" value={fmtCompact(r.fedTax)} sub={`+ ${fmtCompact(r.stateTax)} state`} />
            <Stat label="Net after-tax pool" value={fmtCompact(r.net)} sub="after federal + state" tone="good" />
            <Stat label="Year-1 reserve" value={fmtCompact(r.yr1Reserve)} sub="spending + setup, in Trust #1" />
            <Stat label="Investable core" value={fmtCompact(r.core)} sub={r.qpOk ? 'Qualified Purchaser ✓' : `PPLI needs ${fmtCompact(PPLI_QP_MIN)}+ core`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Engine A · Munis" value={fmtCompact(r.muni)} sub={`${pct(w.a)} of core · ${fmtCompact(r.muni * asm.muniYield)}/yr tax-free`} />
          <Stat label="Engine B · PPLI" value={fmtCompact(r.ppli)} sub={`${pct(w.b)} · ${fmtCompact(r.ppli * asm.ppliDraw)}/yr tax-free`} />
          <Stat label="Engine C · Equities" value={fmtCompact(r.equity)} sub={`${pct(w.c)} · ${fmtCompact(r.equity * asm.eqDraw)}/yr tax-free`} />
          <Stat label="Annual tax-free income" value={fmtCompact(r.annualFree)} sub={`blended ${pct(r.blendedDraw)} draw`} tone="warm" />
        </div>

        {!r.sustainable && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <strong>Your spending target outruns the engines.</strong> You want {fmt(inp.spend)}/yr but the stack generates {fmt(r.annualFree)}/yr tax-free. Either lower the target, move the dial toward income, or grow the core — at this draw mix you'd need a core of roughly <span className="font-num font-semibold">{fmt(r.requiredCore)}</span>.
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="hairline-card p-5">
            <h3 className="font-display text-lg font-semibold">Where the core sits</h3>
            <p className="mt-1 text-xs text-muted-foreground">Trust #2 holds Engines A + C · Trust #3 holds Engine B · Entity #4 holds property cash.</p>
            <AllocationDonut muni={r.muni} ppli={r.ppli} equity={r.equity} reserve={inp.entity4} />
          </div>
          <div className="hairline-card p-5">
            <h3 className="font-display text-lg font-semibold">The compounding race</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Same engines, same returns, same net cash out — but unshielded. The gap is pure tax drag.
              Gap at year 25: <span className="font-num font-semibold stat-good">{fmtCompact(r.advantage)}</span>
            </p>
            <ProjectionChart stack={r.projection} baseline={r.baseline} />
          </div>
        </div>

        <ProjectionTable r={r} />

        <div className="hairline-card p-5">
          <h3 className="font-display text-lg font-semibold">The money flow</h3>
          <p className="mt-1 mb-3 text-xs text-muted-foreground">One wire in, four destinations. Everything after Trust #1 is engineered to be tax-free or tax-deferred.</p>
          <FlowDiagram />
        </div>

        <ScenarioCompare {...p} />
      </div>

      {/* ---------- Explanation rail ---------- */}
      <aside className="hidden h-fit space-y-4 lg:col-span-2 xl:col-span-1 xl:block">
        <ExplainRail inp={inp} r={r} />
      </aside>
    </div>
  );
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
        ['a', 'Engine A — Munis', m.a],
        ['b', 'Engine B — PPLI', m.b],
        ['c', 'Engine C — Equities', m.c],
      ] as const).map(([k, label, v]) => (
        <div key={k}>
          <div className="flex justify-between text-xs"><span>{k === 'a' ? 'Engine A — Munis' : label}</span><span className="font-num">{Math.round(v * 100)}%</span></div>
          <Slider value={[Math.round(v * 100)]} min={0} max={100} step={1} onValueChange={([x]) => upd(k, x / 100)} />
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">Sliders auto-balance to 100%. PPLI carrier minimums still apply.</p>
    </div>
  );
}

function ProjectionTable({ r }: { r: StackResult }) {
  return (
    <details className="hairline-card p-5">
      <summary className="cursor-pointer font-display text-lg font-semibold">25-year projection, year by year</summary>
      <p className="mt-1 text-xs text-muted-foreground">
        Each engine's cash draw comes out of its total return; whatever isn't drawn keeps compounding. Growth column = the year's full pre-tax return on the stack.
      </p>
      <div className="mt-3 max-h-96 overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-secondary">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Year</th>
              <th className="px-3 py-2 text-right font-medium">Beginning</th>
              <th className="px-3 py-2 text-right font-medium">Tax-free cash</th>
              <th className="px-3 py-2 text-right font-medium">Growth</th>
              <th className="px-3 py-2 text-right font-medium">Ending</th>
            </tr>
          </thead>
          <tbody>
            {r.projection.map((row) => (
              <tr key={row.year} className="border-t border-border/60 font-num text-[13px]">
                <td className="px-3 py-1.5">{row.year}</td>
                <td className="px-3 py-1.5 text-right">{fmt(row.begin)}</td>
                <td className="px-3 py-1.5 text-right stat-warm">{fmt(row.cash)}</td>
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

function ScenarioCompare(p: Props) {
  const filled = p.scenarios.filter(Boolean).length;
  return (
    <div className="hairline-card p-5 no-print">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Scenario comparison</h3>
          <p className="text-xs text-muted-foreground">Snapshot the current setup into a slot, tweak the dial or mode, save again — outcomes recompute automatically.</p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <button key={i} onClick={() => p.saveScenario(i)}
              className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary cursor-pointer">
              Save as {'ABC'[i]}
            </button>
          ))}
          {filled > 0 && (
            <button onClick={p.clearScenarios} className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive cursor-pointer">Clear</button>
          )}
        </div>
      </div>
      {filled > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Outcome</th>
                {p.scenarios.map((s, i) => <th key={i} className="py-2 pr-3 text-right font-medium">{s ? `Scenario ${'ABC'[i]}` : '—'}</th>)}
              </tr>
            </thead>
            <tbody className="font-num text-[13px]">
              {([
                ['Net after-tax pool', (s: ScenarioSlot) => fmtCompact(s.result.net)],
                ['Investable core', (s: ScenarioSlot) => fmtCompact(s.result.core)],
                ['Allocation A/B/C', (s: ScenarioSlot) => s.result.alloc],
                ['Tax-free income /yr', (s: ScenarioSlot) => fmtCompact(s.result.annualFree)],
                ['Net worth @ 25 yrs', (s: ScenarioSlot) => fmtCompact(s.result.stackEnd)],
                ['Edge over taxable', (s: ScenarioSlot) => fmtCompact(s.result.advantage)],
              ] as const).map(([label, fn]) => (
                <tr key={label} className="border-t border-border/60">
                  <td className="py-2 pr-3 font-sans text-muted-foreground">{label}</td>
                  {p.scenarios.map((s, i) => (
                    <td key={i} className="py-2 pr-3 text-right">{s ? fn(s) : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-muted-foreground">
          <li><strong className="text-foreground">Taxes came out first.</strong> The lottery withholds 24% federal, but the real bill is ~37% — the difference is due April 15, which is why Trust #1 parks it in T-Bills.</li>
          <li><strong className="text-foreground">Year 1 is a seasoning year.</strong> You live on the reserve while the PPLI and loss-harvesting engines warm up. Patience here is worth real money.</li>
          <li><strong className="text-foreground">From month 13, the tap opens.</strong> {fmtCompact(r.annualFree)} a year flows to your checking at ~0% federal tax — while {fmtCompact(r.projection[0]?.growth ?? 0)} keeps compounding.</li>
        </ul>
      </div>
      <div className="hairline-card p-5">
        <h4 className="font-display text-base font-semibold">Your residency math</h4>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {inp.residency === 'stay'
            ? <>Staying in {st.name} means future unshielded income faces {pct(st.rate)} state tax. The stack's engines are designed so that number touches as little of your money as possible.</>
            : <>Domiciled in {tg.name} ({tg.noTax ? '0% income tax' : `${pct(tg.rate)} top rate`}), your future investment income faces <span className="font-num stat-good font-semibold">{pct(r.futureStateRate)}</span> state tax. Keep a day-count log — {st.name} will check.</>}
        </p>
      </div>
      <div className="rounded-lg border border-gold/40 bg-[hsl(var(--gold-tint))] p-4 text-[12.5px] leading-relaxed text-[hsl(var(--espresso-soft))]">
        <strong>Honest math, not advice.</strong> This is an educational model with simplified 2026 rates. Real trust drafting, PPLI underwriting, and residency law are fact-specific — run everything past a licensed attorney and CPA before acting.
      </div>
    </>
  );
}
