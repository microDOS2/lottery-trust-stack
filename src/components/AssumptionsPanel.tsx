import { useState } from 'react';
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { computeStack, DEFAULT_INPUTS, HORIZON, pct, type Assumptions, type Inputs } from '../lib/calc';
import { ASSUMPTION_REVIEW_DATE, ASSUMPTION_SOURCES, REVIEWED_ASSUMPTIONS } from '../lib/assumptionSources';

interface Props {
  inputs: Inputs;
  asm: Assumptions;
  setAsm: (a: Assumptions) => void;
}

interface Check { label: string; detail: string; pass: boolean }
interface Report { checks: Check[]; changes: string[]; updated: boolean }

function changesBetween(before: Assumptions, after: Assumptions): string[] {
  return ASSUMPTION_SOURCES.filter(({ editable }) => editable).map(({ key, label }) => {
    if (Math.abs(before[key] - after[key]) < 1e-9) return null;
    return `${label}: ${pct(before[key], 2)} → ${pct(after[key], 2)}`;
  }).filter((line): line is string => !!line);
}

function verify(values: Assumptions, inputs: Inputs): Check[] {
  const result = computeStack(inputs, values);
  const rows = [...result.projection, ...result.baseline];
  const finiteRows = rows.every((row) => Object.values(row).every((v) => typeof v !== 'number' || Number.isFinite(v)));
  const continuous = result.projection.slice(0, -1).every((row, i) => Math.abs(row.end - result.projection[i + 1].begin) < 0.01)
    && result.baseline.slice(0, -1).every((row, i) => Math.abs(row.end - result.baseline[i + 1].begin) < 0.01);
  const taxWaterfall = Math.abs(result.gross - result.fedTax - result.stateTax - result.net) < 0.01;

  const zeroFee = computeStack({ ...DEFAULT_INPUTS, amount: 100_000_000, spend: 0, annualAdmin: 0, ppliEnabled: false, ppliFeeMode: 'none', ppliFee: 0 }, values);
  const adminOnly = computeStack({ ...DEFAULT_INPUTS, amount: 100_000_000, spend: 0, annualAdmin: 18_000, adminFeeMode: 'custom', ppliEnabled: false, ppliFeeMode: 'none', ppliFee: 0 }, values);
  const half = computeStack({ ...DEFAULT_INPUTS, amount: 100_000_000, spend: 0, annualAdmin: 0, ppliEnabled: true, ppliFeeMode: 'rate', ppliFeeRate: 0.005 }, values);
  const typical = computeStack({ ...DEFAULT_INPUTS, amount: 100_000_000, spend: 0, annualAdmin: 0, ppliEnabled: true, ppliFeeMode: 'rate', ppliFeeRate: 0.008 }, values);
  const feeBehavior = zeroFee.projection.every((row) => Math.abs(row.fees) < 0.01)
    && Math.abs(adminOnly.projection[1].fees - 18_000 * (1 + values.inflation)) < 0.01
    && typical.projection[1].fees > half.projection[1].fees
    && half.projection[1].fees > 0;

  return [
    { label: 'Rates are valid', detail: 'Every assumption is finite and within its permitted range.', pass: Object.values(values).every((v) => Number.isFinite(v) && v >= 0 && v <= 1) },
    { label: 'Full horizon', detail: `Stack and taxable comparison each contain ${HORIZON} years.`, pass: result.projection.length === HORIZON && result.baseline.length === HORIZON },
    { label: 'No broken numbers', detail: 'No NaN, Infinity, or negative balances in either projection.', pass: finiteRows && rows.every((row) => row.begin >= 0 && row.end >= 0) },
    { label: 'Balances connect', detail: 'Every year ends with exactly what the next year begins with.', pass: continuous },
    { label: 'Tax waterfall reconciles', detail: 'Gross winnings minus federal and state tax equal the after-tax pool.', pass: taxWaterfall },
    { label: 'Fee behavior is correct', detail: '$0 stays $0; fixed fees inflate; percentage insurance charges scale correctly.', pass: feeBehavior },
  ];
}

export default function AssumptionsPanel({ inputs, asm, setAsm }: Props) {
  const [report, setReport] = useState<Report | null>(null);

  const updateAndVerify = () => {
    const changes = changesBetween(asm, REVIEWED_ASSUMPTIONS);
    setAsm({ ...REVIEWED_ASSUMPTIONS });
    setReport({ checks: verify(REVIEWED_ASSUMPTIONS, inputs), changes, updated: true });
  };
  const verifyCurrent = () => setReport({ checks: verify(asm, inputs), changes: [], updated: false });
  const changeRate = (key: keyof Assumptions, value: number) => {
    setReport(null);
    setAsm({ ...asm, [key]: value });
  };

  return (
    <div className="hairline-card p-5 no-print" data-testid="assumptions-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Return and inflation assumptions</h3>
          <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-muted-foreground">Each number below shows where it comes from. Market sources inform the starting point; the number in the box is exactly what the model uses.</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-[12px] text-muted-foreground">Reviewed {ASSUMPTION_REVIEW_DATE}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={updateAndVerify} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground cursor-pointer"><RefreshCw className="h-4 w-4" /> Update &amp; verify</button>
        <button type="button" onClick={verifyCurrent} className="rounded-md border border-input bg-card px-4 py-2.5 text-sm font-medium cursor-pointer">Verify current numbers</button>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">Update installs the latest reviewed model set dated {ASSUMPTION_REVIEW_DATE} and runs calculation checks. It does not pretend to be a live market-data feed.</p>

      <div className="mt-5 space-y-5">
        {ASSUMPTION_SOURCES.map(({ key, label, editable, basis, asOf, links }) => (
          <div key={key} className="border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
            <label className="flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
              <span>{label}{!editable && <span className="ml-2 text-[12px] font-normal text-muted-foreground">(fixed rule)</span>}</span>
              <span className="flex items-center gap-2">
                <input aria-label={`${label} percentage`} type="number" step={0.1} min={0} max={key === 'ltcgRate' ? 100 : 25} disabled={!editable} value={+(asm[key] * 100).toFixed(2)} onChange={(e) => changeRate(key, Math.max(0, (+e.target.value || 0) / 100))} className="w-28 rounded-md border border-input bg-card px-2 py-1.5 text-right font-num disabled:opacity-70" />
                <span className="text-muted-foreground">%</span>
              </span>
            </label>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{basis}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/80">Source:</span> {links.length > 0 ? links.map((link, i) => <span key={link.url}>{i > 0 && ' · '}<a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">{link.label}<ExternalLink className="h-3 w-3" /></a></span>) : 'Planner modeling choice — no external quote'}
              <br />{asOf}.
            </p>
          </div>
        ))}
      </div>

      {report && (
        <div className="mt-5 rounded-md border border-input p-4" role="status" aria-live="polite" data-testid="assumption-verification-report">
          <div className="flex items-center gap-2">
            {report.checks.every((c) => c.pass) ? <CheckCircle2 className="h-5 w-5 stat-good" /> : <XCircle className="h-5 w-5 text-destructive" />}
            <h4 className="font-display text-base font-semibold">{report.checks.filter((c) => c.pass).length}/{report.checks.length} checks passed {report.updated ? 'after update' : 'for your current numbers'}</h4>
          </div>
          {report.updated && <div className="mt-3 text-sm"><strong>Values changed:</strong>{report.changes.length === 0 ? <span> None—you already had the reviewed set.</span> : <ul className="mt-1 list-disc pl-5 text-muted-foreground">{report.changes.map((line) => <li key={line}>{line}</li>)}</ul>}</div>}
          <ul className="mt-3 space-y-2">
            {report.checks.map((check) => <li key={check.label} className="flex items-start gap-2 text-sm">{check.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 stat-good" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}<div><strong>{check.label}:</strong> <span className="text-muted-foreground">{check.detail}</span></div></li>)}
          </ul>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">These checks verify arithmetic and model consistency. They do not validate a forecast, an insurance illustration, or a legal/tax structure.</p>
        </div>
      )}
    </div>
  );
}
