import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Legend,
} from 'recharts';
import { fmtCompact, fmt } from '../lib/calc';
import type { ProjectionRow } from '../lib/calc';

export const CHART_COLORS = {
  muni: '#4C7A3F',   // olive green
  ppli: '#E5604A',   // coral
  equity: '#D9A441', // gold
  reserve: '#7B6556',// warm brown
  baseline: '#9C9388',// warm gray
  stack: '#4C7A3F',
};

const tipStyle = {
  backgroundColor: 'hsl(40 60% 99%)',
  border: '1px solid hsl(38 28% 86%)',
  borderRadius: 10,
  fontSize: 13,
  color: 'hsl(25 55% 10%)',
};

export function AllocationDonut({ muni, ppli, equity, reserve, sleeve = 0, sleeveName = 'Sleeve' }: { muni: number; ppli: number; equity: number; reserve: number; sleeve?: number; sleeveName?: string }) {
  const data = [
    { name: 'Muni ladder (A)', value: muni, color: CHART_COLORS.muni },
    { name: 'PPLI (B)', value: ppli, color: CHART_COLORS.ppli },
    { name: 'Equities (C)', value: equity, color: CHART_COLORS.equity },
    ...(sleeve > 0 ? [{ name: sleeveName, value: sleeve, color: '#6B6359' }] : []),
    ...(reserve > 0 ? [{ name: 'Entity #4 reserve', value: reserve, color: CHART_COLORS.reserve }] : []),
  ].filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={2} strokeWidth={0}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tipStyle}
          formatter={(v: number, name: string) => [fmt(v), name]}
        />
        <text x="50%" y="47%" textAnchor="middle" className="font-num" fontSize={20} fontWeight={600} fill="hsl(25 55% 10%)">
          {fmtCompact(total)}
        </text>
        <text x="50%" y="58%" textAnchor="middle" fontSize={12.5} fill="hsl(33 9% 38%)">
          working capital
        </text>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v: string) => <span style={{ color: 'hsl(25 55% 10%)', fontSize: 13 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProjectionChart({ stack, baseline }: { stack: ProjectionRow[]; baseline: ProjectionRow[] }) {
  const data = stack.map((r, i) => ({
    year: r.year,
    'Trust stack': Math.round(r.end),
    'Plain taxable account': Math.round(baseline[i]?.end ?? 0),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="hsl(38 28% 90%)" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickFormatter={(v: number) => fmtCompact(v)}
          tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip contentStyle={tipStyle} formatter={(v: number, name: string) => [fmt(v), name]} labelFormatter={(l) => `Year ${l}`} />
        <Legend iconType="plainline" formatter={(v: string) => <span style={{ color: 'hsl(25 55% 10%)', fontSize: 13 }}>{v}</span>} />
        <Line type="monotone" dataKey="Trust stack" stroke={CHART_COLORS.stack} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="Plain taxable account" stroke={CHART_COLORS.baseline} strokeWidth={2} strokeDasharray="6 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AnnuityChart({ yearly }: { yearly: Array<{ year: number; annuityFV: number; lumpFV: number }> }) {
  const data = yearly.map((y) => ({
    year: y.year,
    'Lump sum invested': Math.round(y.lumpFV),
    'Annuity invested': Math.round(y.annuityFV),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="hsl(38 28% 90%)" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} width={64} />
        <Tooltip contentStyle={tipStyle} formatter={(v: number, name: string) => [fmt(v), name]} labelFormatter={(l) => `Year ${l}`} />
        <Legend iconType="plainline" formatter={(v: string) => <span style={{ color: 'hsl(25 55% 10%)', fontSize: 13 }}>{v}</span>} />
        <Line type="monotone" dataKey="Lump sum invested" stroke="#E5604A" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="Annuity invested" stroke="#7B6556" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** The money-flow diagram: prize → Trust #1 → engines. Inline SVG, fully code-drawn. */
export function FlowDiagram({ compact = false }: { compact?: boolean }) {
  const box = (x: number, y: number, w: number, h: number) =>
    `M${x},${y} h${w} a6,6 0 0 1 6,6 v${h} a6,6 0 0 1 -6,6 h-${w} a6,6 0 0 1 -6,-6 v-${h} a6,6 0 0 1 6,-6 z`;
  return (
    <svg viewBox="0 0 720 296" className="w-full" role="img" aria-label="Money flow: gross prize flows to Trust 1, then out to the engines">
      <defs>
        <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill="#7B6556" />
        </marker>
      </defs>
      {/* Source */}
      <path d={box(20, 96, 150, 56)} fill="#2A1A0E" />
      <text x={95} y={119} textAnchor="middle" fill="#FAF7F1" fontSize={14} fontWeight={600}>Gross prize</text>
      <text x={95} y={137} textAnchor="middle" fill="#D9CFC2" fontSize={12}>after 24% + state withholding</text>
      {/* Trust 1 */}
      <path d={box(240, 84, 168, 80)} fill="#FFFDF9" stroke="#E6DFD3" strokeWidth={1.5} />
      <text x={324} y={108} textAnchor="middle" fill="#2A1A0E" fontSize={14} fontWeight={700} fontFamily="Fraunces, serif">Trust #1 · Master</text>
      <text x={324} y={126} textAnchor="middle" fill="#6B6359" fontSize={12}>April 15 tax reserve (T-Bills)</text>
      <text x={324} y={141} textAnchor="middle" fill="#6B6359" fontSize={12}>Year-1 living reserve</text>
      {/* Engines */}
      <path d={box(486, 16, 226, 50)} fill="#FBE7E0" stroke="#E5604A" strokeWidth={1.5} />
      <text x={570} y={36} textAnchor="middle" fill="#2A1A0E" fontSize={14} fontWeight={700} fontFamily="Fraunces, serif">Trust #3 · PPLI — Engine B</text>
      <text x={570} y={52} textAnchor="middle" fill="#6B6359" fontSize={11}>untaxed growth · ~4.5% draw</text>

      <path d={box(486, 92, 226, 50)} fill="#EDF3E9" stroke="#4C7A3F" strokeWidth={1.5} />
      <text x={570} y={112} textAnchor="middle" fill="#2A1A0E" fontSize={14} fontWeight={700} fontFamily="Fraunces, serif">Trust #2 · Munis — Engine A</text>
      <text x={570} y={128} textAnchor="middle" fill="#6B6359" fontSize={12}>federal tax-free interest</text>

      <path d={box(486, 168, 226, 50)} fill="#FBF3DF" stroke="#D9A441" strokeWidth={1.5} />
      <text x={570} y={188} textAnchor="middle" fill="#2A1A0E" fontSize={14} fontWeight={700} fontFamily="Fraunces, serif">Trust #2 · Equities — Engine C</text>
      <text x={570} y={204} textAnchor="middle" fill="#6B6359" fontSize={12}>growth + daily loss harvesting</text>

      <path d={box(486, 232, 190, 34)} fill="#F6F1EA" stroke="#E6DFD3" strokeWidth={1.2} />
      <text x={570} y={245} textAnchor="middle" fill="#6B6359" fontSize={12.5}>Entity #4 · anonymous WY LLC</text>

      {/* Arrows */}
      <line x1={176} y1={124} x2={234} y2={124} stroke="#7B6556" strokeWidth={1.8} markerEnd="url(#arr)" />
      <path d="M408,110 C 446,110 446,42 480,42" fill="none" stroke="#7B6556" strokeWidth={1.8} markerEnd="url(#arr)" />
      <line x1={414} y1={117} x2={480} y2={117} stroke="#7B6556" strokeWidth={1.8} markerEnd="url(#arr)" />
      <path d="M408,138 C 446,138 446,192 480,192" fill="none" stroke="#7B6556" strokeWidth={1.8} markerEnd="url(#arr)" />
      <path d="M408,152 C 440,152 444,244 480,246" fill="none" stroke="#9C9388" strokeWidth={1.4} strokeDasharray="4 3" markerEnd="url(#arr)" />
      {!compact && (
        <text x={20} y={286} fill="#9C9388" fontSize={12}>
          Month 13+: automated tax-free draws flow back to your checking — the engines keep compounding.
        </text>
      )}
    </svg>
  );
}
