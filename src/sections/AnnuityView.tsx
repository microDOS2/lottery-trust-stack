import { useMemo, useState } from 'react';
import { STATES } from '../lib/taxdata';
import { computeAnnuity, fmtCompact, pct } from '../lib/calc';
import type { Filing } from '../lib/taxdata';
import { AnnuityChart } from '../components/viz';
import { SectionTitle, Stat, Field, Tip } from '../components/widgets';
import { Slider } from '@/components/ui/slider';

export default function AnnuityView({ defaultState, filing, onNext, onUseCash }: { defaultState: string; filing: Filing; onNext?: (cash: number) => void; onUseCash?: (cash: number) => void }) {
  const [more, setMore] = useState(false);
  const [a, setA] = useState({
    advertised: 0,
    cash: 0,
    cashRatio: 0.47,
    years: 30,
    escalator: 0.05,
    state: defaultState,
    filing,
    investReturn: 0.07,
  });
  const r = useMemo(() => computeAnnuity(a), [a]);
  const lumpWins = r.winner === 'lump';
  const hasCash = a.cash > 0;
  const hasAnnuity = a.advertised > 0;
  const canCompare = hasCash && hasAnnuity;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SectionTitle
        num="04"
        title={<>Annuity or <span className="sig-italic">lump sum?</span></>}
        blurb="Type the cash amount you would get now. Add the annuity total only if you want to compare it with 30 years of checks."
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hairline-card h-fit space-y-4 p-5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          <Field label="Cash amount, before tax" tip="The check you could take now, before tax. Not the advertised jackpot." more="trade" help="The cash option on the lottery site. The check you could take now, before tax. Not the advertised jackpot.">
            <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={a.cash || ''} min={0} step={100000}
              onChange={(e) => setA({ ...a, cash: +e.target.value || 0 })} />
          </Field>
          <Field label="Annuity total" tip="Every annuity check added together. Leave blank if you only want the cash math." more="trade" help="All the checks added together. Usually 30 payments, each 5% larger than the last. Leave blank if you only want the cash math.">
            <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={a.advertised || ''} min={0} step={1000000}
              onChange={(e) => setA({ ...a, advertised: +e.target.value || 0 })} />
          </Field>
          <Field label="State where you'd claim" tip="The state that taxes the prize. A California lottery prize bought in California is not taxed by the state." more="move">
            <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={a.state} onChange={(e) => setA({ ...a, state: e.target.value })}>
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </Field>
          <Tip text="Opens the jackpot percentage and the earnings guess. You can ignore both if you typed the cash amount." more="trade">
          <button type="button" onClick={() => setMore((v) => !v)} className="text-left text-sm font-medium text-primary hover:underline cursor-pointer">
            {more ? 'Hide extra inputs' : 'More inputs'}
          </button>
          </Tip>
          {more && (
            <>
              <div>
                <div className="mb-1 flex justify-between text-[14px]"><span className="font-medium">I only know the jackpot</span><span className="font-num text-muted-foreground">{pct(a.cashRatio, 0)}</span></div>
                <Slider value={[a.cashRatio * 100]} min={35} max={60} step={1} onValueChange={([v]) => setA({ ...a, cashRatio: v / 100, cash: Math.round(a.advertised * (v / 100)) })} />
                <p className="mt-1 text-[12.5px] text-muted-foreground">Fills the cash amount as this share of the annuity total. A cash option is often about 45–50%. Typing a cash amount yourself replaces it.</p>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[14px]"><span className="font-medium">What the money earns</span><span className="font-num text-muted-foreground">{pct(a.investReturn)}</span></div>
                <Slider value={[a.investReturn * 100]} min={3} max={10} step={0.25} onValueChange={([v]) => setA({ ...a, investReturn: v / 100 })} />
                <p className="mt-1 text-[12.5px] text-muted-foreground">Used for both paths after tax. 7% is a middle guess, not a promise.</p>
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <div className={`rounded-lg border p-5 ${canCompare ? (lumpWins ? 'border-success/40 bg-[hsl(var(--success-tint))]' : 'border-gold/50 bg-[hsl(var(--gold-tint))]') : 'border-border'}`}>
            <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">{canCompare ? "The model's verdict" : hasCash ? 'Cash only' : 'Start here'}</div>
            <div className="font-display mt-1 text-2xl font-semibold">
              {!hasCash && 'Type the cash amount.'}
              {hasCash && !hasAnnuity && <>You keep <span className="sig-italic">{fmtCompact(r.lumpNet)}</span> after tax.</>}
              {canCompare && (lumpWins ? 'Lump sum, by the math' : 'Annuity, by the math')}
              {canCompare && <> — <span className="sig-italic">{fmtCompact(r.diff)}</span> apart</>}
            </div>
            <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">
              {!hasCash && 'This is the cash option, before tax. It is not the advertised jackpot.'}
              {hasCash && !hasAnnuity && 'Add the annuity total if you want this compared with 30 years of checks. You do not need a percentage.'}
              {canCompare && lumpWins && 'Invested, the cash you take now finishes ahead of the checks — and you keep control of the money.'}
              {canCompare && !lumpWins && 'The rising checks finish ahead of the cash at this earnings guess. The cash still gives you control.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Lump: cash option" tip="The check you could take now, before tax. Not the advertised jackpot." more="trade" value={fmtCompact(r.lumpGross)} sub={`${fmtCompact(r.lumpTaxes)} total tax`} />
            <Stat label="Lump: net invested" tip="What is left after tax if you take the cash. This is what would go into the plan." more="trade" value={fmtCompact(r.lumpNet)} sub="day one, into the stack" tone="good" />
            <Stat label="Annuity: first check" tip="The first of the 30 annual checks. Each one is larger than the last." more="trade" value={fmtCompact(r.firstPayment)} sub={`rising ${pct(a.escalator, 0)}/yr for ${a.years} yrs`} />
            <Stat label="Annuity: total tax" tip="Tax on every annuity check added up, in today’s brackets. Later checks can be taxed more." more="assumptions" value={fmtCompact(r.annuityTaxes)} sub={`on ${fmtCompact(r.totalPayments)} paid · 2026 brackets`} />
          </div>

          <div className="hairline-card p-5">
            <h3 className="font-display text-lg font-semibold">Value if you invest it all, year by year</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Both paths reinvest everything at {pct(a.investReturn)}. Final: lump {fmtCompact(r.lumpEnd)} vs annuity {fmtCompact(r.annuityEnd)}.
              Each annuity check uses 2026 federal brackets. State tax is the top marginal rate on the payment above the federal standard deduction. In a graduated-bracket state that overstates tax on smaller checks.
            </p>
            <AnnuityChart yearly={r.yearly} />
          {(!hasCash && !hasAnnuity) && (
            <p className="mt-3 text-sm text-muted-foreground">Type the cash amount. Add the annuity total only if you want the comparison.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {onUseCash && hasCash && (
              <Tip text="Copies this cash amount into the calculator as the prize, before tax, and opens the calculator." more="trade">
              <button type="button" onClick={() => onUseCash(a.cash)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cursor-pointer">
                Use this cash in the calculator
              </button>
              </Tip>
            )}
            {onNext && (
              <Tip text="Opens the questions. It does not change the numbers you just typed.">
              <button type="button" onClick={() => onNext(a.cash)} className="rounded-md border border-input px-4 py-2 text-sm font-semibold cursor-pointer">
                Next: Goals & Fit
              </button>
              </Tip>
            )}
          </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="hairline-card p-5">
              <h4 className="font-display font-semibold stat-good">Lump sum — the case for</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] text-muted-foreground">
                <li>Funds the entire 4-entity stack immediately — PPLI, munis, equities, the LLC</li>
                <li>One tax event, then the engines shield everything after</li>
                <li>Step-up in basis at death; the annuity dies with you</li>
                <li>Protection against a state changing the rules later</li>
              </ul>
            </div>
            <div className="hairline-card p-5">
              <h4 className="font-display font-semibold stat-warm">Annuity — the case for</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] text-muted-foreground">
                <li>30 years of rising checks is a built-in guardrail against overspending</li>
                <li>The full advertised amount actually gets paid — no cash-option haircut</li>
                <li>Each year's tax bill is smaller and partially offset by lower brackets</li>
                <li>Mistakes in year one don't touch years two through thirty</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
