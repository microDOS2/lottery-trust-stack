import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
} from 'recharts';
import { computeStack, fmt, fmtCompact, type Assumptions, type Inputs } from '../lib/calc';

export const SCENARIO_COLORS = ['#E5604A', '#4C7A3F', '#D9A441', '#7B6556', '#5B7C99'];

export interface ScenarioEntry {
  letter: string;
  inputs: Inputs;
}

const tipStyle = {
  backgroundColor: 'hsl(40 60% 99%)',
  border: '1px solid hsl(38 28% 86%)',
  borderRadius: 10,
  fontSize: 14,
  color: 'hsl(25 55% 10%)',
};

export function ScenarioLines({ scenarios }: { scenarios: ScenarioWithResult[] }) {
  const data = useMemo(() => {
    const rows: Array<Record<string, number>> = [];
    for (let y = 1; y <= 30; y++) {
      const row: Record<string, number> = { year: y };
      for (const s of scenarios) row[s.letter] = Math.round(s.result.projection[y - 1]?.end ?? 0);
      rows.push(row);
    }
    return rows;
  }, [scenarios]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="hsl(38 28% 90%)" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} width={64} />
        <Tooltip contentStyle={tipStyle} formatter={(v: number, name: string) => [fmt(v), `Scenario ${name}`]} labelFormatter={(l) => `Year ${l}`} />
        <Legend iconType="plainline" formatter={(v: string) => <span style={{ color: 'hsl(25 55% 10%)', fontSize: 13 }}>Scenario {v}</span>} />
        {scenarios.map((s, i) => (
          <Line key={s.letter} type="monotone" dataKey={s.letter} stroke={SCENARIO_COLORS[i % 5]} strokeWidth={s.best ? 3 : 1.8} dot={false} strokeOpacity={s.best ? 1 : 0.75} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ScenarioBars({ scenarios }: { scenarios: ScenarioWithResult[] }) {
  const data = scenarios.map((s) => ({
    name: s.letter,
    'Tax-free capacity /yr': Math.round(s.result.capacity),
    'Net worth @25y': Math.round(s.result.stackEnd),
    'Edge over taxable': Math.round(Math.max(0, s.result.advantage)),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="hsl(38 28% 90%)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(25 55% 10%)' }} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12.5, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} width={64} />
        <Tooltip contentStyle={tipStyle} formatter={(v: number, name: string) => [fmt(v), name]} />
        <Legend formatter={(v: string) => <span style={{ color: 'hsl(25 55% 10%)', fontSize: 13 }}>{v}</span>} />
        <Bar dataKey="Tax-free capacity /yr" fill="#E5604A" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Net worth @25y" fill="#4C7A3F" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Edge over taxable" fill="#D9A441" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface ScenarioWithResult extends ScenarioEntry {
  result: ReturnType<typeof computeStack>;
  best?: boolean;
}

export function useScenarioResults(scenarios: ScenarioEntry[], asm: Assumptions): ScenarioWithResult[] {
  return useMemo(
    () => scenarios.map((s) => ({ ...s, result: computeStack(s.inputs, asm) })),
    [scenarios, asm]
  );
}
