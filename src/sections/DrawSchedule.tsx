import { useMemo, useState } from 'react';
import { fmtCompact, HORIZON, type Assumptions, type Inputs, type StackResult } from '../lib/calc';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  result: StackResult;
  asm: Assumptions;
}

const PATTERNS: Array<{ id: string; label: string; hint: string }> = [
  { id: 'flat', label: 'Same amount every year', hint: 'A flat check, forever. More stays compounding than with inflation-linked.' },
  { id: 'inflated', label: 'Grow it with prices', hint: 'The check rises with inflation, so your lifestyle stays constant in real terms.' },
  { id: 'front', label: 'More early, less later', hint: '1.5× the target for 10 years, then half. For people who want the big life now.' },
  { id: 'back', label: 'Less early, more later', hint: 'Half the target for 10 years, then 1.5×. For people building the pile first.' },
  { id: 'oneoff', label: 'One big year (year 5)', hint: '4× the target in year 5 — a house, a business, a dream — and the normal target otherwise.' },
  { id: 'skip5', label: 'Just grow for 5 years first', hint: '$0 for five years, then the normal target. Maximum compounding up front.' },
];

/** Pattern-based draw schedule: pick a spending shape, then fine-tune individual years if you want. */
export default function DrawSchedule({ inputs, setInputs, result, asm }: Props) {
  const [fine, setFine] = useState(false);
  const years = Array.from({ length: HORIZON - 1 }, (_, i) => i + 2); // years 2..HORIZON
  const target = (y: number) => (inputs.flatDraw ? inputs.spend : inputs.spend * Math.pow(1 + asm.inflation, y - 2));

  const setYear = (y: number, v: number | null) =>
    setInputs((p) => {
      const next = { ...p.drawOverrides };
      if (v === null) delete next[y];
      else next[y] = v;
      return { ...p, drawOverrides: next };
    });

  const applyPattern = (id: string) => {
    setInputs((p) => {
      const base = { ...p, flatDraw: id === 'flat' };
      if (id === 'flat' || id === 'inflated') return { ...base, drawOverrides: {} };
      const ov: Record<number, number> = {};
      for (let y = 2; y <= HORIZON; y++) {
        const t = base.spend * Math.pow(1 + asm.inflation, y - 2);
        if (id === 'front') ov[y] = Math.round(y <= 11 ? t * 1.5 : t * 0.5);
        if (id === 'back') ov[y] = Math.round(y <= 11 ? t * 0.5 : t * 1.5);
        if (id === 'oneoff' && y === 5) ov[y] = Math.round(t * 4);
        if (id === 'skip5' && y <= 6) ov[y] = 0;
      }
      return { ...base, flatDraw: false, drawOverrides: ov };
    });
  };

  const chartData = useMemo(
    () => result.projection.map((row) => ({ year: row.year, draw: Math.round(row.cash), capacity: Math.round(row.capacity) })),
    [result],
  );
  const hasOverrides = Object.keys(inputs.drawOverrides).length > 0;

  return (
    <details className="hairline-card p-5" open={hasOverrides || undefined}>
      <summary className="cursor-pointer font-display text-lg font-semibold">
        Custom draw schedule{hasOverrides && <span className="ml-2 rounded bg-accent px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">edited</span>}
      </summary>
      <p className="mt-1 text-sm text-muted-foreground">
        This is the money the stack writes to you each year. Pick a shape below — then watch what it does to the pile at the end.
        A $0 year just leaves more compounding; a bigger year is still tax-free while it fits capacity.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPattern(p.id)}
            title={p.hint}
            className="rounded-lg border border-input bg-card px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-primary hover:text-primary cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} tickMargin={6} />
            <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 11, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} width={52} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(40 60% 99%)', border: '1px solid hsl(38 28% 86%)', borderRadius: 10, fontSize: 13 }}
              formatter={(v: number, name: string) => [fmtCompact(v), name === 'draw' ? 'Your check that year' : 'Sustainable capacity']}
              labelFormatter={(l) => `Year ${l}`}
            />
            <Bar dataKey="draw" radius={[3, 3, 0, 0]}>
              {chartData.map((d) => (
                <Cell key={d.year} fill={d.draw > d.capacity ? '#C42121' : '#E5604A'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-1 flex flex-wrap justify-between gap-2 text-[13px] text-muted-foreground">
          <span>Total drawn over {HORIZON} years: <span className="font-num font-semibold">{fmtCompact(result.cumCash)}</span></span>
          <span>Left at the end: <span className="font-num font-semibold stat-good">{fmtCompact(result.stackEnd)}</span>
            {result.depletedYear && <span className="text-destructive"> · runs dry around year {result.depletedYear}</span>}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => setFine(!fine)} className="text-sm font-medium text-primary hover:underline cursor-pointer">
          {fine ? 'Hide the year-by-year editor' : 'Fine-tune individual years'}
        </button>
        {hasOverrides && (
          <button
            onClick={() => setInputs((p) => ({ ...p, drawOverrides: {} }))}
            className="rounded-md border border-input px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
          >
            Reset schedule
          </button>
        )}
      </div>

      {fine && (
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {years.map((y) => {
            const row = result.projection[y - 1];
            const override = inputs.drawOverrides[y];
            const val = override ?? Math.round(target(y));
            const dipsPrincipal = row ? val > row.capacity + 1 : false;
            return (
              <div key={y} className="flex items-center gap-2">
                <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">Y{y}</span>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={override ?? ''}
                  placeholder={String(Math.round(target(y)))}
                  onChange={(e) => setYear(y, e.target.value === '' ? null : Math.max(0, +e.target.value))}
                  className={`min-w-[120px] flex-1 rounded-md border px-2.5 py-1.5 text-sm font-num ${
                    dipsPrincipal ? 'border-destructive/60 bg-destructive/5 text-destructive' : 'border-input bg-card'
                  }`}
                />
                <div className="flex shrink-0 overflow-hidden rounded-md border border-input">
                  <button
                    title="Set this year to $0"
                    onClick={() => setYear(y, 0)}
                    className={`px-2 py-1.5 font-mono text-[11px] cursor-pointer ${override === 0 ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
                  >
                    0
                  </button>
                  <button
                    title="Double this year"
                    onClick={() => setYear(y, Math.round(target(y) * 2))}
                    className="border-l border-input bg-card px-2 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    2×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </details>
  );
}
