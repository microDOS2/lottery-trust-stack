import { fmtCompact, type Assumptions, type Inputs, type StackResult } from '../lib/calc';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  result: StackResult;
  asm: Assumptions;
}

/**
 * Per-year draw schedule editor (years 2–25; year 1 is the seasoning year).
 * Answers "can I take zero one year and double the next?" — yes: tax-free draws ride on
 * available basis/capacity, not a fixed annual allowance. Years above sustainable capacity
 * dip into principal and are flagged red.
 */
export default function DrawSchedule({ inputs, setInputs, result, asm }: Props) {
  const years = Array.from({ length: 24 }, (_, i) => i + 2); // years 2..25
  const defaultDraw = (y: number) => inputs.spend * Math.pow(1 + asm.inflation, y - 2);

  const setYear = (y: number, v: number | null) =>
    setInputs((p) => {
      const next = { ...p.drawOverrides };
      if (v === null) delete next[y];
      else next[y] = v;
      return { ...p, drawOverrides: next };
    });

  const quickSet = (y: number, mult: number) => setYear(y, mult === 1 ? null : Math.round(defaultDraw(y) * mult));
  const hasOverrides = Object.keys(inputs.drawOverrides).length > 0;

  return (
    <details className="hairline-card p-5">
      <summary className="cursor-pointer font-display text-lg font-semibold">
        Custom draw schedule{hasOverrides && <span className="ml-2 rounded bg-accent px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">edited</span>}
      </summary>
      <p className="mt-1 text-xs text-muted-foreground">
        Tax-free draws are not an annual allowance — they ride on available basis and policy-loan capacity, so a $0 year and a
        double year are both fine (the $0 year just leaves more compounding). Edit any year; blank = default target
        (spending × inflation). <span className="text-destructive font-medium">Red</span> = beyond that year's sustainable
        capacity, so principal gets dipped.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {years.map((y) => {
          const row = result.projection[y - 1];
          const override = inputs.drawOverrides[y];
          const val = override ?? Math.round(defaultDraw(y));
          const dipsPrincipal = row ? val > row.capacity + 1 : false;
          return (
            <div key={y} className="flex items-center gap-2">
              <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">Y{y}</span>
              <input
                type="number"
                min={0}
                step={10000}
                value={override ?? ''}
                placeholder={String(Math.round(defaultDraw(y)))}
                onChange={(e) => setYear(y, e.target.value === '' ? null : Math.max(0, +e.target.value))}
                className={`min-w-[120px] flex-1 rounded-md border px-2.5 py-1.5 text-sm font-num ${
                  dipsPrincipal ? 'border-destructive/60 bg-destructive/5 text-destructive' : 'border-input bg-card'
                }`}
              />
              <div className="flex shrink-0 overflow-hidden rounded-md border border-input">
                <button
                  title="Set this year to $0"
                  onClick={() => quickSet(y, 0)}
                  className={`px-2 py-1.5 font-mono text-[11px] cursor-pointer ${override === 0 ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
                >
                  0
                </button>
                <button
                  title="Double this year"
                  onClick={() => quickSet(y, 2)}
                  className="border-l border-input bg-card px-2 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  2×
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Total drawn over 25 yrs: <span className="font-num font-semibold">{fmtCompact(result.cumCash)}</span>
        </p>
        {hasOverrides && (
          <button
            onClick={() => setInputs((p) => ({ ...p, drawOverrides: {} }))}
            className="rounded-md border border-input px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
          >
            Reset schedule
          </button>
        )}
      </div>
    </details>
  );
}
