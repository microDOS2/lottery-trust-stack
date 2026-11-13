import type { EntityItem } from '../lib/entities';
import { fmtCompact, type StackResult } from '../lib/calc';

interface Props {
  result: StackResult;
  entities: EntityItem[];
}

/** Live money flow: base stack plus every entity you've added, with amounts and purposes. */
export default function FlowLive({ result, entities }: Props) {
  const branches = [
    { name: 'Trust #3 · Insurance wrapper', sub: `~${fmtCompact(result.ppli)} · compounds untaxed`, color: '#E5604A', bg: '#FBE7E0' },
    { name: 'Trust #2 · Muni bonds', sub: `${fmtCompact(result.muni)} · federal tax-free interest`, color: '#4C7A3F', bg: '#EDF3E9' },
    { name: 'Trust #2 · Stocks', sub: `${fmtCompact(result.equity)} · growth + loss harvesting`, color: '#D9A441', bg: '#FBF3DF' },
    ...entities.map((e) => ({
      name: e.name,
      sub: `${fmtCompact(e.amount)} · ${e.purpose || e.type} · ${e.jurisdiction}`,
      color: '#7B6556',
      bg: '#F6F1EA',
    })),
  ];

  return (
    <div className="grid gap-3 md:grid-cols-[190px_200px_1fr]">
      <div className="flex items-center rounded-lg bg-[#2A1A0E] p-4 text-[#FAF7F1]">
        <div>
          <div className="font-display text-base font-semibold">Gross prize</div>
          <div className="mt-1 text-xs text-[#D9CFC2]">after 24% + state withholding</div>
          <div className="mt-2 font-num text-sm font-semibold">{fmtCompact(result.gross)}</div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="font-display text-base font-semibold">Trust #1 · Master</div>
        <div className="mt-1 text-xs text-muted-foreground">April 15 tax reserve (T-Bills)</div>
        <div className="text-xs text-muted-foreground">Year-1 living reserve</div>
        <div className="mt-2 font-num text-sm">{fmtCompact(result.yr1Reserve)}</div>
      </div>
      <div className="space-y-2">
        {branches.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground" aria-hidden>→</span>
            <div className="flex-1 rounded-md border p-2.5" style={{ borderColor: b.color, backgroundColor: b.bg }}>
              <div className="text-[13px] font-semibold leading-tight">{b.name}</div>
              <div className="text-[12px] text-muted-foreground">{b.sub}</div>
            </div>
          </div>
        ))}
        <p className="pt-1 text-[12px] text-muted-foreground">
          Month 13+: tax-free draws flow back to your checking — the engines keep compounding.
        </p>
      </div>
    </div>
  );
}
