import { useMemo } from 'react';
import { computeStack, fmt, fmtCompact, type Inputs, type Assumptions } from '../lib/calc';
import { SectionTitle, Explainer } from '../components/widgets';
import { Slider } from '@/components/ui/slider';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { HandCoins, Sprout } from 'lucide-react';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
}

/** Plain-language "spend vs. grow" page — the dial, a balance scale, and the crossing lines. */
export default function LabView({ inputs, setInputs, asm }: Props) {
  // Sample the whole slider range: what you'd get per year, and what you'd end with.
  const curve = useMemo(() => {
    const pts: Array<{ dial: number; income: number; end: number }> = [];
    for (let d = 0; d <= 100; d += 5) {
      const r = computeStack({ ...inputs, mode: 'balanced', dial: d }, asm);
      pts.push({ dial: d, income: Math.round(r.capacity), end: Math.round(r.stackEnd) });
    }
    return pts;
  }, [inputs, asm]);

  const current = useMemo(() => computeStack(inputs, asm), [inputs, asm]);
  const dial = inputs.dial;

  const stance =
    dial < 20 ? 'Maximum growth — smallest income now, biggest pile later' :
    dial < 40 ? 'Growth-leaning — modest income now, strong compounding' :
    dial <= 60 ? 'Balanced — steady income and healthy growth' :
    dial <= 80 ? 'Income-leaning — more to spend now, slower compounding' :
    'Maximum income — biggest yearly check, least left at the end';

  // Balance scale: dial 100 (max income) tips the income pan down.
  const tip = -((dial - 50) / 50) * 9;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SectionTitle
        num="06"
        title={<>Spend more now, <span className="sig-italic">or grow more for later?</span></>}
        blurb="Every tax-free dollar you take out is a dollar that stops growing. There is no right answer — only the answer that fits your life. Slide and watch the trade."
      />

      {/* ---------- The slider + balance scale ---------- */}
      <div className="hairline-card p-6 md:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium"><Sprout className="h-4 w-4 text-success" /> Grow it</span>
              <span className="inline-flex items-center gap-1.5 font-medium"><HandCoins className="h-4 w-4 text-primary" /> Spend it</span>
            </div>
            <Slider
              value={[dial]}
              min={0} max={100} step={1}
              onValueChange={([v]) => setInputs((p) => ({ ...p, dial: v, mode: 'balanced' }))}
              className="py-3"
            />
            <div className="mt-2 text-center font-display text-lg font-semibold">{stance}</div>
          </div>
          <BalanceScale tip={tip} income={current.capacity} end={current.stackEnd} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-accent p-4 text-center">
            <div className="text-[13.5px] font-medium text-accent-foreground/80">You can spend, tax-free <Explainer text="The most this mix can pay each year without selling the pile." more="trade" /></div>
            <div className="font-num mt-1 text-2xl font-semibold text-accent-foreground">{fmt(current.capacity)}<span className="text-sm font-normal">/yr</span></div>
          </div>
          <div className="rounded-lg bg-[hsl(var(--success-tint))] p-4 text-center">
            <div className="text-[13.5px] font-medium text-success/80">You'd have in 25 years <Explainer text="What is left if the middle rates hold and you only take the yearly amount." more="grow" /></div>
            <div className="font-num mt-1 text-2xl font-semibold stat-good">{fmt(current.stackEnd)}</div>
          </div>
          <div className="rounded-lg bg-secondary p-4 text-center">
            <div className="text-[13.5px] font-medium text-muted-foreground">Your money is split <Explainer text="Bonds pay cash and do not grow. The policy and the stocks are what compound." more="trade" /></div>
            <div className="font-num mt-1 text-lg font-semibold">
              {Math.round(current.weights.a * 100)}% munis · {Math.round(current.weights.b * 100)}% insurance · {Math.round(current.weights.c * 100)}% stocks
            </div>
          </div>
        </div>
      </div>

      {/* ---------- The crossing lines ---------- */}
      <div className="hairline-card p-6 md:p-8">
        <h3 className="font-display text-xl font-semibold">Watch the two lines cross</h3>
        <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
          Every possible slider setting, left to right. The <span className="font-medium text-primary">coral line</span> is your yearly
          tax-free spending money — it climbs as you slide right. The <span className="font-medium stat-good">green line</span> is what
          you'd have after 25 years — it falls. The marker is where you are now.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={curve} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="hsl(38 28% 90%)" vertical={false} />
            <XAxis
              dataKey="dial"
              tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }}
              tickLine={false} axisLine={false} tickMargin={8}
              tickFormatter={(v: number) => (v === 0 ? 'All growth' : v === 50 ? 'Balanced' : v === 100 ? 'All income' : '')}
            />
            <YAxis yAxisId="l" tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12.5, fill: 'hsl(9 76% 45%)' }} tickLine={false} axisLine={false} width={56} />
            <YAxis yAxisId="r" orientation="right" tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12.5, fill: 'hsl(99 32% 32%)' }} tickLine={false} axisLine={false} width={56} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(40 60% 99%)', border: '1px solid hsl(38 28% 86%)', borderRadius: 10, fontSize: 14 }}
              formatter={(v: number, name: string) => [name === 'income' ? `${fmt(v)}/yr` : fmt(v), name === 'income' ? 'Yearly tax-free spending' : 'Net worth at 25 yrs']}
              labelFormatter={(l) => (Number(l) === 0 ? 'Slider: all growth' : Number(l) === 50 ? 'Slider: balanced' : Number(l) === 100 ? 'Slider: all income' : `Slider: ${l}`)}
            />
            <ReferenceLine yAxisId="l" x={dial} stroke="#2A1A0E" strokeDasharray="4 3" strokeWidth={1.5} />
            <Line yAxisId="l" type="monotone" dataKey="income" stroke="#E5604A" strokeWidth={2.5} dot={false} />
            <Line yAxisId="r" type="monotone" dataKey="end" stroke="#4C7A3F" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ---------- Plain-English cards ---------- */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="hairline-card p-5">
          <h4 className="font-display font-semibold">Why the two goals fight</h4>
          <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed">
            Muni bonds pay their interest out as cash — that's income, not growth. Insurance and stocks can either pay you or keep
            compounding, not both. The slider just picks your mix; nothing here is a forced payout.
          </p>
        </div>
        <div className="hairline-card p-5">
          <h4 className="font-display font-semibold">The middle is usually right</h4>
          <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed">
            Most winners land between 40 and 60: enough tax-free income to never think about money, enough growth weight to roughly
            double the stack every decade. Revisit once a year — not every headline.
          </p>
        </div>
        <div className="hairline-card p-5">
          <h4 className="font-display font-semibold">A rule of thumb</h4>
          <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed">
            If your yearly spending stays under about {fmtCompact(current.core * current.blendedDraw * 0.8)}, the stack compounds
            while you spend freely. Push past it and the model dips into principal — the Calculator tab will warn you.
          </p>
        </div>
      </div>
    </div>
  );
}

/** A balance scale that tips with the slider — the whole tradeoff in one glance. */
function BalanceScale({ tip, income, end }: { tip: number; income: number; end: number }) {
  return (
    <svg viewBox="0 0 300 170" className="mx-auto w-full max-w-[300px]" role="img" aria-label="Balance scale tipping between yearly income and 25-year wealth">
      {/* stand */}
      <path d="M150,44 L150,128" stroke="#7B6556" strokeWidth="4" strokeLinecap="round" />
      <path d="M118,128 L182,128 L150,108 Z" fill="#E6DFD3" />
      {/* beam + pans, rotating around the pivot (150, 44) */}
      <g style={{ transform: `rotate(${tip}deg)`, transformOrigin: '150px 44px', transition: 'transform 0.35s ease-out' }}>
        <line x1="45" y1="44" x2="255" y2="44" stroke="#2A1A0E" strokeWidth="4" strokeLinecap="round" />
        {/* left pan: income */}
        <line x1="45" y1="44" x2="45" y2="66" stroke="#7B6556" strokeWidth="2" />
        <path d="M27,66 a18,10 0 0 0 36,0 Z" fill="#E5604A" />
        {/* right pan: wealth */}
        <line x1="255" y1="44" x2="255" y2="66" stroke="#7B6556" strokeWidth="2" />
        <path d="M237,66 a18,10 0 0 0 36,0 Z" fill="#4C7A3F" transform="translate(0,0)" />
      </g>
      {/* labels */}
      <text x="45" y="100" textAnchor="middle" fontSize="11" fill="#6B6359">spend/yr</text>
      <text x="45" y="114" textAnchor="middle" fontSize="12" fontWeight={700} fill="#C8472F" fontFamily="'IBM Plex Mono',monospace">{fmtCompact(income)}</text>
      <text x="255" y="100" textAnchor="middle" fontSize="11" fill="#6B6359">in 25 yrs</text>
      <text x="255" y="114" textAnchor="middle" fontSize="12" fontWeight={700} fill="#3E6B33" fontFamily="'IBM Plex Mono',monospace">{fmtCompact(end)}</text>
      <text x="150" y="158" textAnchor="middle" fontSize="10.5" fill="#9C9388">the scale tips toward whichever you prioritize</text>
    </svg>
  );
}
