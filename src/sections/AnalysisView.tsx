import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { fmt, fmtCompact, pct, HORIZON, type Assumptions, type Inputs } from '../lib/calc';
import { runMonteCarlo, runSensitivity, MC_TRIALS, TORNADO_DELTA } from '../lib/analysis';
import { Explainer, Limit, SectionTitle } from '../components/widgets';

interface Props {
  inputs: Inputs;
  asm: Assumptions;
}

const ppLabel = `${(TORNADO_DELTA * 100).toFixed(1)}%`;

export default function AnalysisView({ inputs, asm }: Props) {
  const hasPrize = inputs.amount > 0;
  const sens = useMemo(() => (hasPrize ? runSensitivity(inputs, asm) : null), [hasPrize, inputs, asm]);
  const mc = useMemo(() => (hasPrize ? runMonteCarlo(inputs, asm, MC_TRIALS) : null), [hasPrize, inputs, asm]);

  if (!hasPrize || !sens || !mc || mc.trials === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <SectionTitle
          num="A"
          title="Analysis"
          blurb="Two stress tests for your plan: which guesses matter most, and how the plan holds up when markets don't cooperate."
        />
        <div className="hairline-card p-6 md:p-8 text-[15px] text-muted-foreground">
          Enter a prize amount in the calculator first — these tools need a plan to stress-test.
        </div>
      </div>
    );
  }

  const maxSwing = Math.max(1, ...sens.rows.map((r) => r.swingEnd));
  const survivedCount = Math.round(mc.survival * mc.trials);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <SectionTitle
        num="A"
        title="Analysis: how sturdy is this plan?"
        blurb="Every plan on this site is built on educated guesses about the future — how fast stocks grow, what bonds pay, what inflation does. This page stress-tests those guesses two ways, so you can see how much of the plan is solid and how much rests on any single number being right."
      />

      <div className="hairline-card p-6 md:p-8">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          What these two tools tell you
          <Explainer text="Neither tool predicts the future. The first shows which assumptions your plan leans on hardest. The second rolls the dice hundreds of times to show a range of outcomes instead of one rosy line." />
        </h3>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-muted-foreground list-disc pl-5">
          <li><strong className="text-foreground">Which guesses matter most</strong> nudges each assumption up and down by {ppLabel} and re-runs your whole plan. If one guess swings your ending balance far more than the others, that's the number to get right — or to be conservative about.</li>
          <li><strong className="text-foreground">What if markets misbehave?</strong> replays your plan {mc.trials} times with stock returns bouncing around year to year, the way real markets do. You get a bad case, a typical case, a good case, and the share of runs where the money lasts all {HORIZON} years.</li>
        </ul>
      </div>

      {/* ---------- Sensitivity ---------- */}
      <div className="hairline-card p-6 md:p-8">
        <h3 className="text-lg font-semibold">Which guesses matter most</h3>
        {sens.top && sens.top.swingEnd > 0 ? (
          <p className="mt-2 text-[15px] leading-relaxed">
            Your plan is most sensitive to <strong>{sens.top.label.toLowerCase()}</strong> — moving it {ppLabel} either way
            swings your {HORIZON}-year balance by about <strong>{fmtCompact(sens.top.swingEnd)}</strong>.
          </p>
        ) : (
          <p className="mt-2 text-[15px] leading-relaxed">
            Your balance barely moves when any single assumption shifts {ppLabel} — the plan is not leaning hard on any one guess.
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Each bar re-runs your full plan with only that one rate changed, {ppLabel} lower and {ppLabel} higher. Bigger bar = bigger effect on your money in {HORIZON} years.
        </p>

        <div className="mt-6 space-y-4">
          {sens.rows.map((r) => (
            <div key={r.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium">{r.label} ±{ppLabel}</span>
                <span className="font-num text-sm text-muted-foreground whitespace-nowrap">
                  {fmtCompact(r.swingEnd)} swing
                </span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(2, (r.swingEnd / maxSwing) * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground font-num">
                End balance {fmtCompact(Math.min(r.lowEnd, r.highEnd))}–{fmtCompact(Math.max(r.lowEnd, r.highEnd))}
                {' · '}safe to take {fmt(Math.min(r.lowSafe, r.highSafe))}–{fmt(Math.max(r.lowSafe, r.highSafe))}/yr
              </div>
            </div>
          ))}
        </div>

        <Limit>
          Your plan as entered: {fmtCompact(sens.baseEnd)} left in {HORIZON} years, safe to take about {fmt(sens.baseSafe)} a year.
          “Safe to take” is the flat yearly amount that spends the stack down to roughly zero at the horizon.
        </Limit>
      </div>

      {/* ---------- Monte Carlo ---------- */}
      <div className="hairline-card p-6 md:p-8">
        <h3 className="text-lg font-semibold">What if markets misbehave?</h3>
        <p className="mt-2 text-[15px] leading-relaxed">
          We replayed your plan <strong>{mc.trials} times</strong>, letting each year's stock return and muni yield bounce
          around randomly the way real markets do. In <strong>{survivedCount} of {mc.trials} runs</strong> the money
          lasted all {HORIZON} years.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="hairline-card p-4">
            <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">Money lasts {HORIZON} years</div>
            <div className={`font-num mt-1.5 text-2xl font-semibold ${mc.survival >= 0.9 ? 'stat-good' : mc.survival < 0.7 ? 'stat-warm' : ''}`}>
              {pct(mc.survival, 0)}
            </div>
          </div>
          <div className="hairline-card p-4">
            <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">Typical end balance</div>
            <div className="font-num mt-1.5 text-2xl font-semibold">{fmtCompact(mc.rows[mc.rows.length - 1]?.p50 ?? 0)}</div>
            <div className="mt-1 text-sm text-muted-foreground">Half of runs did better, half worse</div>
          </div>
          <div className="hairline-card p-4">
            <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">Bad-case end balance</div>
            <div className="font-num mt-1.5 text-2xl font-semibold">{fmtCompact(mc.rows[mc.rows.length - 1]?.p10 ?? 0)}</div>
            <div className="mt-1 text-sm text-muted-foreground">1 in 10 runs ended below this</div>
          </div>
        </div>

        <div className="mt-6">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={mc.rows} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="hsl(38 28% 90%)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }}
                tickLine={false} axisLine={false} tickMargin={8}
                tickFormatter={(v: number) => (v === 0 ? 'Start' : `Yr ${v}`)}
              />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} width={64} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(40 60% 99%)', border: '1px solid hsl(38 28% 86%)', borderRadius: 10, fontSize: 14 }}
                formatter={(v: number, name: string) => [fmtCompact(v), name]}
                labelFormatter={(l) => (Number(l) === 0 ? 'At the start' : `End of year ${l}`)}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <ReferenceLine y={0} stroke="hsl(33 9% 60%)" strokeDasharray="4 3" />
              <Line type="monotone" dataKey="p90" name="Good case (1 in 10 better)" stroke="#4C7A3F" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p50" name="Typical outcome" stroke="#2A1A0E" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="p10" name="Bad case (1 in 10 worse)" stroke="#E5604A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <Limit>
          What this assumes: {mc.trials} runs with a fixed random starting point, so the chart is the same every time you look.
          Each year's stock growth is drawn from a bell curve centered on your {pct(asm.eqGrowth)} assumption with a wide ±16%
          spread; muni yield is centered on {pct(asm.muniYield)} with a ±5% spread. The insurance engine grows at its fixed
          {pct(asm.ppliGrowth)} rate. This is a simplified replay of the main model: any investment sleeve is folded into
          stocks, and the extra tax on dipping into principal is skipped — so treat the lines as a range of plausible
          outcomes, not a forecast.
        </Limit>
      </div>
    </div>
  );
}
