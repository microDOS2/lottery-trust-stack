import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { downloadPlan } from '../lib/download';
import { fmt, fmtCompact, HORIZON, type Assumptions, type Inputs, type StackResult } from '../lib/calc';
import type { ScenarioSlot } from '../sections/CalculatorView';

interface Props {
  r: StackResult;
  inp: Inputs;
  asm: Assumptions;
  scenarios: (ScenarioSlot | null)[];
}

const COLUMN_DEFS = [
  { key: 'begin', label: 'Beginning' },
  { key: 'cash', label: 'Cash to you' },
  { key: 'reinvested', label: 'Reinvested' },
  { key: 'fees', label: 'Fees' },
  { key: 'growth', label: 'Growth' },
  { key: 'end', label: 'Ending' },
  { key: 'capacity', label: 'Capacity' },
] as const;
type ColumnKey = typeof COLUMN_DEFS[number]['key'];
type TrendClickState = { activeLabel?: string | number };

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPanel({ r, inp, asm, scenarios }: Props) {
  const [columns, setColumns] = useState<ColumnKey[]>(COLUMN_DEFS.map((c) => c.key));
  const [showTrend, setShowTrend] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const visibleColumns = COLUMN_DEFS.filter((c) => columns.includes(c.key));
  const selectedRow = selectedYear === null ? undefined : r.projection[selectedYear - 1];
  const trendData = useMemo(() => r.projection.map((row, i) => ({
    year: row.year,
    stack: row.end,
    taxable: r.baseline[i]?.end ?? 0,
  })), [r]);

  const toggleColumn = (key: ColumnKey) => {
    setColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== key);
      }
      return COLUMN_DEFS.map((c) => c.key).filter((k) => [...prev, key].includes(k));
    });
  };

  const exportRows = () => {
    const header = ['Year', ...visibleColumns.map((c) => c.label)];
    const lines = [header.join(',')];
    for (const row of r.projection) {
      lines.push([row.year, ...visibleColumns.map((c) => Math.round(row[c.key]))].join(','));
    }
    downloadBlob('lottery-30-year-schedule.csv', lines.join('\n'), 'text/csv;charset=utf-8');
  };
  const exportJson = () => {
    const rows = r.projection.map((row) => Object.fromEntries([
      ['year', row.year],
      ...visibleColumns.map((c) => [c.key, row[c.key]] as const),
    ]));
    downloadBlob('lottery-30-year-schedule.json', JSON.stringify({ horizon: HORIZON, columns: visibleColumns, rows }, null, 2), 'application/json');
  };

  return (
    <section aria-labelledby="reports-title" className="hairline-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="reports-title" className="font-display text-xl font-semibold">{HORIZON}-year schedule</h3>
          <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-muted-foreground">Every row updates as you make choices. Click a year to link it to the optional trend. The table is always visible; the trend is optional.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowTrend((v) => !v)} aria-pressed={showTrend} className={`rounded-md border px-3 py-1.5 text-sm cursor-pointer ${showTrend ? 'border-primary bg-accent font-medium' : 'border-input text-muted-foreground'}`}>{showTrend ? 'Hide trend' : 'Show trend'}</button>
          <button type="button" onClick={exportRows} className="rounded-md border border-input px-3 py-1.5 text-sm cursor-pointer">CSV</button>
          <button type="button" onClick={exportJson} className="rounded-md border border-input px-3 py-1.5 text-sm cursor-pointer">JSON</button>
          <button type="button" title={`Download the full plan and ${HORIZON}-year schedule`} onClick={() => downloadPlan(inp, asm, r, scenarios)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground cursor-pointer">Download plan</button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Visible schedule columns">
        <span className="mr-1 text-[12px] font-medium text-muted-foreground">Columns:</span>
        {COLUMN_DEFS.map((c) => (
          <button key={c.key} type="button" onClick={() => toggleColumn(c.key)} aria-pressed={columns.includes(c.key)} className={`rounded-full border px-2.5 py-1 text-[12px] cursor-pointer ${columns.includes(c.key) ? 'border-primary bg-accent text-accent-foreground' : 'border-input text-muted-foreground'}`}>{c.label}</button>
        ))}
      </div>

      {showTrend && (
        <div className="mt-4 rounded-md border border-input p-2" data-testid="reports-trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} onClick={(state: TrendClickState) => {
              if (state?.activeLabel !== undefined) setSelectedYear(Number(state.activeLabel));
            }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(38 28% 86%)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 11 }} width={62} />
              <Tooltip formatter={(value: number, name: string) => [fmt(value), name === 'stack' ? 'Trust stack' : 'Taxable account']} labelFormatter={(year) => `Year ${year}`} />
              <Line type="monotone" dataKey="stack" name="Trust stack" stroke="#4C7A3F" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="taxable" name="Taxable account" stroke="#9C9388" strokeWidth={2} dot={false} />
              {selectedYear !== null && <ReferenceLine x={selectedYear} stroke="#E5604A" strokeWidth={2} strokeDasharray="4 3" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedRow && (
        <div className="mt-3 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
          Year {selectedRow.year}: <strong>{fmt(selectedRow.cash)}</strong> to you · <strong>{fmt(selectedRow.end)}</strong> ending · {selectedRow.cash > selectedRow.capacity ? 'above estimated capacity' : 'within estimated capacity'}
        </div>
      )}

      <div className="mt-4 max-h-[36rem] overflow-auto rounded-md border border-input" data-testid="reports-table">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10 bg-secondary">
            <tr className="text-left text-[12px] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Year</th>
              {visibleColumns.map((c) => <th key={c.key} className="px-3 py-2 text-right font-medium">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {r.projection.map((row) => (
              <tr
                key={row.year}
                tabIndex={0}
                aria-selected={selectedYear === row.year}
                onClick={() => setSelectedYear(row.year)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedYear(row.year); } }}
                className={`cursor-pointer border-t border-border/60 font-num text-[13px] outline-none focus:ring-1 focus:ring-primary ${selectedYear === row.year ? 'bg-accent' : 'hover:bg-secondary/60'}`}
              >
                <td className="px-3 py-2 font-medium">{row.year}</td>
                {visibleColumns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 text-right ${c.key === 'cash' && row.cash > row.capacity ? 'text-destructive' : c.key === 'end' ? 'font-semibold' : c.key === 'growth' ? 'stat-good' : ''}`}>
                    {c.key === 'reinvested' || c.key === 'fees' || c.key === 'capacity'
                      ? row[c.key] > 1 ? fmt(row[c.key]) : '—'
                      : fmt(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12.5px] text-muted-foreground">All {HORIZON} years are present in the table. Red cash means the requested draw is above estimated capacity.</p>
    </section>
  );
}
