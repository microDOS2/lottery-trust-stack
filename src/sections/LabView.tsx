import { useMemo } from 'react';
import { computeStack, fmt, fmtCompact, pct, type Inputs, type Assumptions } from '../lib/calc';
import { FrontierChart } from '../components/viz';
import { SectionTitle } from '../components/widgets';
import { Slider } from '@/components/ui/slider';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
}

export default function LabView({ inputs, setInputs, asm }: Props) {
  // Sample the whole dial to draw the frontier: income now vs. net worth at 25 years.
  const points = useMemo(() => {
    const pts: Array<{ dial: number; income: number; end: number }> = [];
    for (let d = 0; d <= 100; d += 5) {
      const r = computeStack({ ...inputs, mode: 'balanced', dial: d }, asm);
      pts.push({ dial: d, income: r.annualFree, end: r.stackEnd });
    }
    return pts;
  }, [inputs, asm]);

  const current = useMemo(() => computeStack(inputs, asm), [inputs, asm]);
  const maxIncome = points[points.length - 1];
  const maxGrowth = points[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SectionTitle
        num="02"
        title={<>The <span className="sig-italic">income ↔ growth</span> dial</>}
        blurb="Every tax-free dollar you spend is a dollar that stops compounding. The dial below reallocates your core between the income engines (munis, PPLI draws) and the growth engine (equities) — the chart shows the trade across the whole range."
      />

      <div className="hairline-card p-6 md:p-8">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium">Max compounding</span>
          <span className="font-display text-2xl font-semibold">
            {inputs.dial < 34 ? 'Growth-leaning' : inputs.dial > 66 ? 'Income-leaning' : 'Balanced'}
          </span>
          <span className="text-sm font-medium">Max tax-free income</span>
        </div>
        <Slider
          value={[inputs.dial]}
          min={0} max={100} step={1}
          onValueChange={([v]) => setInputs((p) => ({ ...p, dial: v, mode: 'balanced' }))}
          className="py-4"
        />
        <div className="mt-2 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Tax-free income / yr</div>
            <div className="font-num mt-1 text-xl font-semibold stat-warm">{fmt(current.annualFree)}</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Allocation A / B / C</div>
            <div className="font-num mt-1 text-xl font-semibold">
              {Math.round(current.weights.a * 100)} / {Math.round(current.weights.b * 100)} / {Math.round(current.weights.c * 100)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Net worth @ 25 yrs</div>
            <div className="font-num mt-1 text-xl font-semibold stat-good">{fmt(current.stackEnd)}</div>
          </div>
        </div>
      </div>

      <div className="hairline-card p-6 md:p-8">
        <h3 className="font-display text-xl font-semibold">Your frontier</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The curve is every possible dial position for your numbers. The green dot is where you are now.
          Far left of the curve (dial 100): <span className="font-num">{fmtCompact(maxIncome?.income ?? 0)}/yr</span> income but only <span className="font-num">{fmtCompact(maxIncome?.end ?? 0)}</span> at 25 years.
          Far right (dial 0): <span className="font-num">{fmtCompact(maxGrowth?.end ?? 0)}</span> at 25 years but just <span className="font-num">{fmtCompact(maxGrowth?.income ?? 0)}/yr</span> now.
        </p>
        <FrontierChart points={points} current={{ dial: inputs.dial, income: current.annualFree, end: current.stackEnd }} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="hairline-card p-5">
          <h4 className="font-display font-semibold">Why income engines pay less later</h4>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            Muni interest is paid out, not reinvested — a {pct(asm.muniYield)} yield is income, not growth. PPLI compounds at {pct(asm.ppliGrowth)} but you draw {pct(asm.ppliDraw)} of it. Only the equity sleeve compounds close to its full {pct(asm.eqGrowth)}.
          </p>
        </div>
        <div className="hairline-card p-5">
          <h4 className="font-display font-semibold">The middle is usually right</h4>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            Most winners land between 40 and 60: enough tax-free income to never think about money, enough equity weight to roughly double the stack every decade. Revisit once a year — not every headline.
          </p>
        </div>
        <div className="hairline-card p-5">
          <h4 className="font-display font-semibold">A rule of thumb</h4>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            If your spending target is under ~{pct(current.blendedDraw * 0.8)} of the core per year, the stack compounds while you spend freely. Above that, you are slowly eating the machine that feeds you.
          </p>
        </div>
      </div>
    </div>
  );
}
