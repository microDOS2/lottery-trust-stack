import {
  fmt, pct, drawForYear, computeStack, AVG_PPLI_FEE_RATE, PPLI_QP_MIN, HORIZON,
  type Inputs, type Assumptions, type StackResult,
} from '../lib/calc';
import { stateByCode } from '../lib/taxdata';
import { GUIDE_STEPS, STRATEGIES } from '../lib/content';
import type { PlanSet } from '../lib/plans';
import type { ScenarioSlot } from './CalculatorView';
import '../print.css';

interface Props {
  inputs: Inputs;
  asm: Assumptions;
  result: StackResult;
  scenarios: (ScenarioSlot | null)[];
  /** Optional plan set from the quiz flow — when passed, its strategy mix and rationale are printed. */
  set?: PlanSet | null;
}

const FILING_LABEL: Record<Inputs['filing'], string> = {
  single: 'Single',
  mfj: 'Married filing jointly',
};

function residencyLabel(inp: Inputs): string {
  const st = stateByCode(inp.state);
  const tg = stateByCode(inp.target);
  switch (inp.residency) {
    case 'stay': return `Staying in ${st.name}`;
    case 'second': return `Second home in ${tg.name}`;
    case 'move': return `Moving to ${tg.name}`;
    case 'pr': return 'Puerto Rico (Act 60)';
  }
}

const strategyName = (id: string): string => STRATEGIES.find((s) => s.id === id)?.name ?? id;

/** A labelled row in a two-column summary table. */
function Row({ label, value, strong, sub }: { label: string; value: string; strong?: boolean; sub?: boolean }) {
  return (
    <tr className={sub ? 'text-muted-foreground' : ''}>
      <td className={`py-1.5 pr-4 ${strong ? 'font-semibold' : ''}`}>{label}</td>
      <td className={`py-1.5 text-right whitespace-nowrap font-num ${strong ? 'font-semibold' : ''}`}>{value}</td>
    </tr>
  );
}

export default function PlanSummary({ inputs: inp, asm, result: r, scenarios, set }: Props) {
  const st = stateByCode(inp.state);
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const carved: Array<[string, number]> = [
    ['Debts paid off', r.debtPaid],
    ['Home set aside', r.housePaid],
    ['Business set aside', r.venturePaid],
    ['Rental property set aside', r.rentalPaid],
    ['Gifts set aside', r.giftPaid],
  ];

  const savedScenarios = scenarios
    .map((s, i) => ({ s, i }))
    .filter((x): x is { s: ScenarioSlot; i: number } => x.s !== null);
  const LETTERS = 'ABCDE';

  const mix = set?.mix ?? null;
  const chosenFallback = !mix && inp.chosen.length > 0 ? inp.chosen : null;
  const sleeveName = r.sleeveId ? strategyName(r.sleeveId) : null;

  const draw2 = drawForYear(inp, asm, 2);
  const drawEnd = drawForYear(inp, asm, HORIZON);
  const overrideYears = Object.keys(inp.drawOverrides).length;
  const typedInsurance = (inp.ppliFee || 0) > 0;
  const modeledInsurance = r.ppli * AVG_PPLI_FEE_RATE;

  return (
    <div className="plan-summary mx-auto max-w-3xl px-4 py-8 text-foreground">
      {/* ---- Title block ---- */}
      <header className="ps-section border-b-2 border-foreground/70 pb-4">
        <h1 className="font-display text-3xl font-bold">Lottery Trust Stack — Plan Summary</h1>
        <p className="mt-2 text-muted-foreground">
          Prepared {today} · {st.name} · {FILING_LABEL[inp.filing]} · {residencyLabel(inp)}
        </p>
        <p className="mt-1 text-muted-foreground">
          A one-page summary of the plan you built, to hand to your attorney or CPA.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print mt-4 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 cursor-pointer"
        >
          Print this summary
        </button>
      </header>

      {/* ---- Prize waterfall ---- */}
      <section className="ps-section mt-8">
        <h2 className="font-display text-xl font-semibold">Where the prize goes</h2>
        <table className="ps-table mt-3 w-full text-base">
          <tbody>
            <Row label="Gross prize (before tax)" value={fmt(r.gross)} />
            <Row label="Less: federal income tax" value={`−${fmt(r.fedTax)}`} sub />
            <Row label={`Less: ${st.name} state tax`} value={`−${fmt(r.stateTax)}`} sub />
            <Row label="Net after-tax cash" value={fmt(r.net)} strong />
            {carved.filter(([, v]) => v > 0).map(([label, v]) => (
              <Row key={label} label={`Less: ${label.toLowerCase()}`} value={`−${fmt(v)}`} sub />
            ))}
            <Row label="Less: year-1 reserve (first-year spending + setup costs)" value={`−${fmt(r.yr1Reserve)}`} sub />
            <Row label="Investable core" value={fmt(r.core)} strong />
          </tbody>
        </table>
        {inp.basis === 'net' && (
          <p className="mt-2 text-muted-foreground">
            You typed an after-tax amount; the gross prize above is worked backward from it.
          </p>
        )}
      </section>

      {/* ---- Allocation ---- */}
      <section className="ps-section mt-8">
        <h2 className="font-display text-xl font-semibold">How the core is invested</h2>
        <table className="ps-table mt-3 w-full text-base">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1.5 pr-4 font-medium">Engine</th>
              <th className="py-1.5 pr-4 text-right whitespace-nowrap font-medium">Amount</th>
              <th className="py-1.5 text-right whitespace-nowrap font-medium">Share of core</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1.5 pr-4">Bonds — municipal bond ladder (tax-free interest)</td>
              <td className="py-1.5 pr-4 text-right whitespace-nowrap font-num">{fmt(r.muni)}</td>
              <td className="py-1.5 text-right whitespace-nowrap font-num">{r.core > 0 ? pct(r.muni / r.core) : '—'}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Insurance — private placement life insurance (tax-free growth and draws)</td>
              <td className="py-1.5 pr-4 text-right whitespace-nowrap font-num">{fmt(r.ppli)}</td>
              <td className="py-1.5 text-right whitespace-nowrap font-num">{r.core > 0 ? pct(r.ppli / r.core) : '—'}</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Stocks — direct-indexed equities (growth, tax-managed)</td>
              <td className="py-1.5 pr-4 text-right whitespace-nowrap font-num">{fmt(r.equity)}</td>
              <td className="py-1.5 text-right whitespace-nowrap font-num">{r.core > 0 ? pct(r.equity / r.core) : '—'}</td>
            </tr>
            {r.sleeveAmount > 0 && sleeveName && (
              <tr>
                <td className="py-1.5 pr-4">Sleeve — {sleeveName}</td>
                <td className="py-1.5 pr-4 text-right whitespace-nowrap font-num">{fmt(r.sleeveAmount)}</td>
                <td className="py-1.5 text-right whitespace-nowrap font-num">{pct(r.sleeveAmount / r.core)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-3">
          Safe-to-take capacity: <span className="font-num font-semibold">{fmt(r.capacity)} per year</span> — the most
          the engines could pay out each year with no tax on that cash. It is a ceiling, not a required draw.
        </p>
        {r.ppli > 0 && !r.qpOk && (
          <p className="mt-1 text-muted-foreground">
            Note: the insurance amount is below the {fmt(PPLI_QP_MIN)} minimum usually needed for this kind of policy.
          </p>
        )}
        {!r.sustainable && inp.spend > 0 && (
          <p className="mt-1 text-muted-foreground">
            Note: your yearly spending target of {fmt(inp.spend)} is above the {fmt(r.capacity)} capacity, so the plan
            dips into principal on these assumptions.
          </p>
        )}
      </section>

      {/* ---- Strategy mix ---- */}
      {(mix || chosenFallback) && (
        <section className="ps-section mt-8">
          <h2 className="font-display text-xl font-semibold">Strategy mix</h2>
          {mix ? (
            <>
              <p className="mt-2 text-muted-foreground">
                Selected: {mix.chosen.map(strategyName).join(' · ')}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {mix.rationale.map((why, i) => <li key={i}>{why}</li>)}
              </ul>
            </>
          ) : (
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {chosenFallback!.map((id) => {
                const strat = STRATEGIES.find((s) => s.id === id);
                return <li key={id}><span className="font-medium">{strategyName(id)}.</span> {strat?.oneLiner ?? ''}</li>;
              })}
            </ul>
          )}
        </section>
      )}

      {/* ---- Scenario comparison ---- */}
      {savedScenarios.length > 0 && (
        <section className="ps-section mt-8">
          <h2 className="font-display text-xl font-semibold">Saved scenarios compared</h2>
          <table className="ps-table mt-3 w-full text-base">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1.5 pr-4 font-medium">Outcome</th>
                <th className="py-1.5 pr-4 text-right whitespace-nowrap font-medium">This plan</th>
                {savedScenarios.map(({ s, i }) => (
                  <th key={i} className="py-1.5 pr-4 text-right whitespace-nowrap font-medium">
                    Scenario {LETTERS[i]}{s.name ? ` — ${s.name}` : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-num">
              {([
                ['Net after-tax', (x: StackResult) => fmt(x.net)],
                ['Investable core', (x: StackResult) => fmt(x.core)],
                ['Safe to take /yr', (x: StackResult) => fmt(x.capacity)],
                ['Left after 25 yrs', (x: StackResult) => fmt(x.projection[24]?.end ?? 0)],
                [`Left after ${HORIZON} yrs`, (x: StackResult) => fmt(x.stackEnd)],
                ['Edge over plain taxable account', (x: StackResult) => fmt(x.advantage)],
              ] as const).map(([label, fn]) => (
                <tr key={label}>
                  <td className="py-1.5 pr-4 font-sans text-muted-foreground">{label}</td>
                  <td className="py-1.5 pr-4 text-right whitespace-nowrap">{fn(r)}</td>
                  {savedScenarios.map(({ s, i }) => {
                    const res = computeStack(s.inputs, asm);
                    return <td key={i} className="py-1.5 pr-4 text-right whitespace-nowrap">{fn(res)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ---- Draw schedule ---- */}
      <section className="ps-section mt-8">
        <h2 className="font-display text-xl font-semibold">Draw schedule</h2>
        <table className="ps-table mt-3 w-full text-base">
          <tbody>
            <Row
              label="Style"
              value={inp.flatDraw ? 'Flat — the same dollars every year' : `Inflation-linked — grows ${pct(asm.inflation)} a year`}
            />
            <Row label="Yearly amount (years 1–10)" value={fmt(inp.spend)} />
            {(inp.laterSpend || 0) > 0 && <Row label="Yearly amount (year 11 on)" value={fmt(inp.laterSpend)} />}
            <Row label="First planned draw (year 2, after a seasoning year)" value={fmt(draw2)} />
            {!inp.flatDraw && <Row label={`Draw in year ${HORIZON} (after inflation growth)`} value={fmt(drawEnd)} />}
            {overrideYears > 0 && (
              <Row label="Custom overrides" value={`${overrideYears} year${overrideYears === 1 ? '' : 's'} set by hand`} />
            )}
          </tbody>
        </table>
        <p className="mt-2 text-muted-foreground">
          Year 1 is a quiet seasoning year: nothing is drawn, and bond interest is reinvested.
        </p>
      </section>

      {/* ---- Fee disclosure ---- */}
      <section className="ps-section mt-8">
        <h2 className="font-display text-xl font-semibold">Fee disclosure</h2>
        <table className="ps-table mt-3 w-full text-base">
          <tbody>
            <Row label="One-time legal and professional setup (year 1)" value={inp.setupCost > 0 ? fmt(inp.setupCost) : 'None typed'} />
            <Row
              label="Annual administration (trustee, CPA, registered agent)"
              value={(inp.annualAdmin ?? 0) > 0 ? `${fmt(inp.annualAdmin)} per year` : 'None typed'}
            />
            <Row
              label="Insurance charge"
              value={typedInsurance
                ? `${fmt(inp.ppliFee)} per year`
                : r.ppli > 0
                  ? `Modeled at ${pct(AVG_PPLI_FEE_RATE, 1)} of the insurance box (≈${fmt(modeledInsurance)} in year 1)`
                  : 'None (no insurance in the mix)'}
            />
          </tbody>
        </table>
        <p className="mt-2 text-muted-foreground">
          Typed fees rise with the inflation assumption each year. Fees come out of the engines and reduce what is left.
        </p>
      </section>

      {/* ---- First-year checklist ---- */}
      <section className="ps-section mt-8">
        <h2 className="font-display text-xl font-semibold">First-year checklist</h2>
        <ul className="ps-checklist mt-3 space-y-3">
          {GUIDE_STEPS.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="ps-box mt-1 inline-block h-4 w-4 shrink-0 rounded-sm border-2 border-foreground/60" aria-hidden="true" />
              <div>
                <span className="font-medium">{step.title}</span>
                <span className="text-muted-foreground"> — {step.body}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Assumptions ---- */}
      <section className="ps-section mt-8">
        <h2 className="font-display text-xl font-semibold">Assumptions used</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>Municipal bond yield: {pct(asm.muniYield)} (tax-free interest)</li>
          <li>Insurance growth: {pct(asm.ppliGrowth)} before charges; sustainable tax-free draw: {pct(asm.ppliDraw)}</li>
          <li>Equity growth: {pct(asm.eqGrowth)}; tax-efficient draw: {pct(asm.eqDraw)}; dividend yield: {pct(asm.divYield)}</li>
          <li>Long-term capital gains + NIIT rate: {pct(asm.ltcgRate)}</li>
          <li>Inflation: {pct(asm.inflation)} (spending target and typed fees grow at this rate)</li>
          <li>Federal brackets and the standard deduction are 2026 figures; the {st.name} top rate is {pct(st.rate)}.</li>
          <li>Projections run {HORIZON} years. They are model outputs, not forecasts.</li>
        </ul>
      </section>

      {/* ---- Not advice ---- */}
      <footer className="ps-section mt-8 border-t-2 border-foreground/70 pt-4 text-muted-foreground">
        <p>
          This summary is educational math, not legal, tax, or investment advice. It is a starting point for a
          conversation with a licensed attorney and CPA who can review your actual facts. Figures are estimates on the
          assumptions above and will differ from real-world results.
        </p>
        <p className="mt-2">Prepared {today} with the Lottery Trust Stack planner.</p>
      </footer>
    </div>
  );
}
