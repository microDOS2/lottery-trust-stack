import { useMemo, useState } from 'react';
import { STATES } from '../lib/taxdata';
import { computeAnnuity, fmtCompact, pct } from '../lib/calc';
import type { Filing } from '../lib/taxdata';
import { AnnuityChart } from '../components/viz';
import { SectionTitle, Stat, Field } from '../components/widgets';
import { Slider } from '@/components/ui/slider';

export default function AnnuityView({ defaultState, filing }: { defaultState: string; filing: Filing }) {
  const [a, setA] = useState({
    advertised: 100_000_000,
    cashRatio: 0.47,
    years: 30,
    escalator: 0.05,
    state: defaultState,
    filing,
    investReturn: 0.07,
  });
  const r = useMemo(() => computeAnnuity(a), [a]);
  const lumpWins = r.winner === 'lump';

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SectionTitle
        num="04"
        title={<>Annuity or <span className="sig-italic">lump sum?</span></>}
        blurb="The one decision you make before anything else — and you usually get 60–90 days to make it. The annuity pays the full advertised jackpot in 30 rising installments; the lump sum is a smaller pile, immediately, that you control. Here's the math both ways."
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hairline-card h-fit space-y-4 p-5 lg:sticky lg:top-20">
          <Field label="Advertised jackpot">
            <input type="number" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" value={a.advertised} min={0} step={1000000}
              onChange={(e) => setA({ ...a, advertised: +e.target.value || 0 })} />
          </Field>
          <div>
            <div className="mb-1 flex justify-between text-[14px]"><span className="font-medium">Cash-option ratio</span><span className="font-num text-muted-foreground">{pct(a.cashRatio, 0)}</span></div>
            <Slider value={[a.cashRatio * 100]} min={35} max={60} step={1} onValueChange={([v]) => setA({ ...a, cashRatio: v / 100 })} />
            <p className="mt-1 text-[12.5px] text-muted-foreground">Powerball cash options typically run ~45–50% of the advertised jackpot.</p>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[14px]"><span className="font-medium">Reinvestment return</span><span className="font-num text-muted-foreground">{pct(a.investReturn)}</span></div>
            <Slider value={[a.investReturn * 100]} min={3} max={10} step={0.25} onValueChange={([v]) => setA({ ...a, investReturn: v / 100 })} />
            <p className="mt-1 text-[12.5px] text-muted-foreground">What the money earns after tax, either path. 7% ≈ a balanced stack.</p>
          </div>
          <Field label="State where you'd claim">
            <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={a.state} onChange={(e) => setA({ ...a, state: e.target.value })}>
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="min-w-0 space-y-6">
          <div className={`rounded-lg border p-5 ${lumpWins ? 'border-success/40 bg-[hsl(var(--success-tint))]' : 'border-gold/50 bg-[hsl(var(--gold-tint))]'}`}>
            <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">The model's verdict</div>
            <div className="font-display mt-1 text-2xl font-semibold">
              {lumpWins ? 'Lump sum, by the math' : 'Annuity, by the math'} — <span className="sig-italic">{fmtCompact(r.diff)}</span> apart
            </div>
            <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">
              {lumpWins
                ? 'Invested in the stack, the smaller immediate pile compounds into more than 30 years of checks — plus you keep control, flexibility, and a step-up in basis at death.'
                : 'The guaranteed rising checks actually out-compound the smaller lump at this return assumption — and they make it impossible to blow it all in year one.'}
              {' '}The math flips with the return slider; the discipline question never does.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Lump: cash option" value={fmtCompact(r.lumpGross)} sub={`${fmtCompact(r.lumpTaxes)} total tax`} />
            <Stat label="Lump: net invested" value={fmtCompact(r.lumpNet)} sub="day one, into the stack" tone="good" />
            <Stat label="Annuity: first check" value={fmtCompact(r.firstPayment)} sub={`rising ${pct(a.escalator, 0)}/yr for ${a.years} yrs`} />
            <Stat label="Annuity: total tax" value={fmtCompact(r.annuityTaxes)} sub={`on ${fmtCompact(r.totalPayments)} paid · 2026 brackets`} />
          </div>

          <div className="hairline-card p-5">
            <h3 className="font-display text-lg font-semibold">Value if you invest it all, year by year</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Both paths reinvest everything at {pct(a.investReturn)}. Final: lump {fmtCompact(r.lumpEnd)} vs annuity {fmtCompact(r.annuityEnd)}.
              Each annuity check is taxed on 2026 federal brackets for that year's payment, plus the state's top rate — not a flat 37%.
            </p>
            <AnnuityChart yearly={r.yearly} />
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
