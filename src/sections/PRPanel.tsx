import { fmt, type Inputs, type StackResult } from '../lib/calc';
import { CalendarClock, Home, HeartHandshake, FileCheck, AlertTriangle } from 'lucide-react';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  result: StackResult;
}

const DEADLINE = new Date('2026-12-31T23:59:59');

export default function PRPanel({ inputs, setInputs, result: r }: Props) {
  const daysLeft = Math.max(0, Math.ceil((DEADLINE.getTime() - Date.now()) / 86_400_000));
  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => setInputs((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="hairline-card border-primary/30 p-5" style={{ boxShadow: '0 2px 12px rgba(229,96,74,0.08)' }}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider rounded bg-accent text-accent-foreground px-1.5 py-0.5">New module</span>
        <h3 className="font-display text-lg font-semibold">Puerto Rico · Act 60 investor decree</h3>
      </div>

      <div className="mt-3 rounded-md bg-accent px-3 py-2.5 text-[13px] leading-snug text-accent-foreground">
        <strong>Deadline math (Act 38-2026):</strong> file your decree application by <strong>Dec 31, 2026</strong>
        {daysLeft > 0 ? <> — <span className="font-num font-semibold">{daysLeft} days left</span></> : null}
        {' '}and the rate is <strong>0%</strong> on interest, dividends, and post-move gains through 2035.
        File in 2027 or later and it's a flat <strong>4%</strong> through 2055. Still excellent — but 0% is better.
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium">When would you file?</span>
          <select
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            value={inputs.prFiling}
            onChange={(e) => set('prFiling', e.target.value as Inputs['prFiling'])}
          >
            <option value="pre2027">By Dec 31, 2026 → 0% rate</option>
            <option value="post2026">2027 or later → 4% flat</option>
          </select>
        </label>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium">Unrealized gains you hold today ($)</span>
          <div className="flex gap-2">
            <input
              type="number" min={0} step={100000}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num"
              value={inputs.preMoveGains}
              onChange={(e) => set('preMoveGains', +e.target.value || 0)}
            />
            <select
              className="rounded-md border border-input bg-card px-2 py-2 text-sm"
              value={inputs.preMoveWindow}
              onChange={(e) => set('preMoveWindow', e.target.value as Inputs['preMoveWindow'])}
            >
              <option value="within10">Sell &lt;10 yrs</option>
              <option value="after10">Sell 10+ yrs</option>
            </select>
          </div>
          {inputs.preMoveGains > 0 && (
            <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
              Pre-move appreciation stays taxable: federal {fmt(inputs.preMoveGains * 0.238)} if sold within 10 years of the move,
              or PR's 5% ({fmt(inputs.preMoveGains * 0.05)}) if you wait. Your model: <strong className="text-foreground">{fmt(r.preMoveGainsTax)}</strong>.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-[13px] leading-relaxed text-muted-foreground sm:grid-cols-2">
        <div className="flex gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong className="text-foreground">183+ days a year</strong> in PR, plus the closer-ties tests. Same day-count discipline as any domicile move — Puerto Rico's are enforced.</span></div>
        <div className="flex gap-2"><Home className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong className="text-foreground">Buy a PR home within 2 years</strong> — and under the 2026 rules it must be owned directly or through a trust, <strong className="text-foreground">not an LLC</strong>.</span></div>
        <div className="flex gap-2"><HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong className="text-foreground">$15,000/year</strong> to Puerto Rican charities (raised from $10,000 for new decrees).</span></div>
        <div className="flex gap-2"><FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong className="text-foreground">Six-year residency lookback</strong> — you generally can't have been a PR resident in 6 of the last 10 years, plus filing fees and annual reports.</span></div>
      </div>

      <p className="mt-4 rounded-md bg-secondary px-3 py-2 text-[12.5px] leading-relaxed text-muted-foreground">
        How the model treats it: Puerto Rico removes <em>federal</em> tax on post-move capital gains (IRC §933), so the taxable-baseline comparison uses {r.prRate === 0 ? '0%' : '4%'} on gains instead of 23.8% + state.
        US-source dividends and interest stay federally taxable even in PR — Act 60 portfolios are structured around growth and gains, not yield.
      </p>

      {inputs.entity4 > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-gold/50 bg-[hsl(var(--gold-tint))] px-3 py-2 text-[12.5px] text-[hsl(var(--espresso-soft))]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your Entity #4 reserve still works for other properties and vehicles — but <strong>not your PR primary residence</strong>. The 2026 rules require direct or trust ownership for that one.</span>
        </div>
      )}
    </div>
  );
}
