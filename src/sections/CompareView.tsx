import { useMemo, useState } from 'react';
import { computeStack, fmtCompact, HORIZON, type Assumptions, type Inputs } from '../lib/calc';
import { profileFromStartChoices, scoreAll } from '../lib/quiz';
import { SectionTitle } from '../components/widgets';
import { ScenarioLines, useScenarioResults, type ScenarioWithResult } from '../components/CompareCharts';
import { Crown, ArrowUpRight, Trash2 } from 'lucide-react';
import type { ScenarioSlot } from './CalculatorView';

interface Props {
  scenarios: (ScenarioSlot | null)[];
  asm: Assumptions;
  onUse: (i: number) => void;
  onDelete: (i: number) => void;
}

const LETTERS = 'ABCDE';
const signed = (n: number) => n === 0 ? '—' : `${n > 0 ? '+' : '−'}${fmtCompact(Math.abs(n))}`;
const residencyLabel = (i: Inputs) => i.residency === 'pr' ? 'Puerto Rico' : i.residency === 'stay' ? 'Staying put' : i.residency === 'move' ? 'Moving state' : i.residency === 'second' ? 'Two homes' : 'No special plan';
const ppliFeeLabel = (i: Inputs) => i.ppliEnabled === false ? 'Off' : i.ppliFeeMode === 'rate' ? `${((i.ppliFeeRate ?? 0) * 100).toFixed(2)}%/yr` : i.ppliFeeMode === 'fixed' ? `${fmtCompact(i.ppliFee)}/yr` : 'Scenario not chosen';

const METRICS: Array<{ label: string; value: (r: ReturnType<typeof computeStack>) => number; lowerIsBetter?: boolean }> = [
  { label: 'After-tax pool', value: (r) => r.net },
  { label: 'Invested in the stack', value: (r) => r.core },
  { label: 'Safe to take per year', value: (r) => r.capacity },
  { label: 'Planned draw, year 2', value: (r) => r.plannedDrawY2 },
  { label: 'Fees + tax drag over 30 years', value: (r) => r.projection.reduce((a, b) => a + b.fees, 0), lowerIsBetter: true },
  { label: 'Pile at year 10', value: (r) => r.projection[9]?.end ?? 0 },
  { label: 'Pile at year 30', value: (r) => r.stackEnd },
  { label: 'Edge over a taxable account', value: (r) => r.advantage },
  { label: 'Total drawn over 30 years', value: (r) => r.cumCash },
];

function inputDifferences(a: ScenarioWithResult, b: ScenarioWithResult): Array<[string, string, string]> {
  const rows: Array<[string, (s: ScenarioWithResult) => string]> = [
    ['Prize amount', (s) => fmtCompact(s.inputs.amount)],
    ['Spending target', (s) => fmtCompact(s.inputs.spend)],
    ['Draw style', (s) => s.inputs.flatDraw ? 'Flat' : 'Grows with prices'],
    ['Residency', (s) => residencyLabel(s.inputs)],
    ['Dial (0 grow · 100 spend)', (s) => String(s.inputs.dial)],
    ['Bonds / insurance / stocks', (s) => `${Math.round(s.result.weights.a * 100)} / ${Math.round(s.result.weights.b * 100)} / ${Math.round(s.result.weights.c * 100)}`],
    ['PPLI', (s) => s.inputs.ppliEnabled === false ? 'Off' : 'On'],
    ['PPLI charge', (s) => ppliFeeLabel(s.inputs)],
    ['Annual professional costs', (s) => fmtCompact(s.inputs.annualAdmin)],
    ['Setup cost', (s) => fmtCompact(s.inputs.setupCost)],
    ['Custom draw years', (s) => String(Object.keys(s.inputs.drawOverrides ?? {}).length)],
    ['Named events', (s) => String(Object.keys(s.inputs.drawEvents ?? {}).length)],
  ];
  return rows.map(([label, fn]): [string, string, string] => [label, fn(a), fn(b)]).filter(([, av, bv]) => av !== bv);
}

export default function CompareView({ scenarios, asm, onUse, onDelete }: Props) {
  const saved = useMemo(
    () => scenarios.map((s, i) => (s ? { letter: LETTERS[i], inputs: s.inputs, index: i } : null)).filter((s): s is { letter: string; inputs: Inputs; index: number } => !!s),
    [scenarios],
  );
  const withResults = useScenarioResults(saved, asm);
  const fitScores = useMemo(() => {
    try {
      const choices = JSON.parse(localStorage.getItem('lotteryStack.startChoices') ?? 'null');
      if (!choices?.risk || !choices?.legacy || saved.length === 0) return null;
      return scoreAll(saved.map((s) => ({ letter: s.letter, inputs: s.inputs })), profileFromStartChoices(choices), asm);
    } catch { return null; }
  }, [saved, asm]);
  const bestFit = fitScores?.[0];
  const [names, setNames] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('lotteryStack.scenarioNames') ?? '{}'); } catch { return {}; }
  });
  const [left, setLeft] = useState('A');
  const [right, setRight] = useState('B');
  const [showVisuals, setShowVisuals] = useState(false);
  const rename = (letter: string, name: string) => {
    setNames((prev) => {
      const next = { ...prev, [letter]: name };
      try { localStorage.setItem('lotteryStack.scenarioNames', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const bestEnd = Math.max(0, ...withResults.map((s) => s.result.stackEnd));
  const bestLetter = withResults.find((s) => s.result.stackEnd === bestEnd)?.letter;
  const leftLetter = saved.some((s) => s.letter === left) ? left : saved[0]?.letter;
  const rightLetter = saved.some((s) => s.letter === right) ? right : saved[1]?.letter ?? leftLetter;
  const leftScenario = withResults.find((s) => s.letter === leftLetter);
  const rightScenario = withResults.find((s) => s.letter === rightLetter && s.letter !== leftLetter);
  const selectedResults = [leftScenario, rightScenario].filter((s): s is ScenarioWithResult => !!s);
  const differences = leftScenario && rightScenario ? inputDifferences(leftScenario, rightScenario) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SectionTitle num="03" title={<>Your setups, <span className="sig-italic">side by side</span></>} blurb={`Compare two plans on yearly cash, fees, year-10 and year-${HORIZON} outcomes, depletion, and the exact input differences. Optional visuals use the same data.`} />

      {saved.length === 0 ? (
        <div className="hairline-card p-5">
          <h3 className="font-display text-lg font-semibold">No saved setups yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Save a setup in Fine-tune to start comparing. Save a second setup to see what changed and which outcomes are better for your choices.</p>
        </div>
      ) : (
        <>
          {bestFit && (
            <div className="rounded-lg border border-success/40 bg-[hsl(var(--success-tint))] p-4">
              <strong className="font-display text-lg">Scenario {bestFit.letter} fits your choices best</strong>
              <span className="ml-2 font-num text-sm stat-good">score {bestFit.score.total}/100</span>
              <p className="mt-1 text-sm text-muted-foreground">It scores highest on what you said matters most — {bestFit.score.parts.slice().sort((a, b) => b.weight - a.weight).slice(0, 2).map((p) => p.label.toLowerCase()).join(' and ')}.</p>
            </div>
          )}

          <div className="hairline-card flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm font-medium">Compare</span>
            <select aria-label="Left scenario" value={leftLetter} onChange={(e) => setLeft(e.target.value)} className="rounded-md border border-input bg-card px-3 py-2 text-sm">{saved.map((s) => <option key={s.letter} value={s.letter}>{names[s.letter] || `Scenario ${s.letter}`}</option>)}</select>
            <span className="text-sm text-muted-foreground">against</span>
            <select aria-label="Right scenario" value={rightLetter} onChange={(e) => setRight(e.target.value)} className="rounded-md border border-input bg-card px-3 py-2 text-sm">{saved.map((s) => <option key={s.letter} value={s.letter}>{names[s.letter] || `Scenario ${s.letter}`}</option>)}</select>
            <button type="button" onClick={() => setShowVisuals((v) => !v)} aria-pressed={showVisuals} className={`ml-auto rounded-md border px-3 py-1.5 text-sm cursor-pointer ${showVisuals ? 'border-primary bg-accent font-medium' : 'border-input text-muted-foreground'}`}>{showVisuals ? 'Hide visuals' : 'Show visuals'}</button>
          </div>

          <div className="overflow-x-auto hairline-card p-5" data-testid="scenario-decision-table">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">What you’re comparing</th>
                  {selectedResults.map((s) => <th key={s.letter} className="py-2 pr-4 text-right font-medium"><span className="inline-flex items-center gap-1"><input value={names[s.letter] ?? ''} placeholder={s.letter} onChange={(e) => rename(s.letter, e.target.value)} className="w-16 rounded border border-transparent bg-transparent px-1 text-right font-num text-[13px] font-semibold hover:border-input focus:border-input" aria-label={`Name scenario ${s.letter}`} />{s.letter === bestLetter && <Crown className="h-3.5 w-3.5 text-success" aria-label={`Biggest ${HORIZON}-year pile`} />}</span></th>)}
                  {rightScenario && <th className="py-2 pr-4 text-right font-medium">{rightScenario.letter} − {leftScenario!.letter}</th>}
                </tr>
              </thead>
              <tbody className="font-num text-[13px]">
                {METRICS.map((metric) => (
                  <tr key={metric.label} className="border-t border-border/60">
                    <td className="py-2 pr-4 font-sans text-muted-foreground">{metric.label}</td>
                    {selectedResults.map((s) => <td key={s.letter} className="py-2 pr-4 text-right">{fmtCompact(metric.value(s.result))}</td>)}
                    {rightScenario && <td className={`py-2 pr-4 text-right ${metric.lowerIsBetter ? (metric.value(rightScenario.result) <= metric.value(leftScenario!.result) ? 'stat-good' : 'stat-warm') : (metric.value(rightScenario.result) >= metric.value(leftScenario!.result) ? 'stat-good' : 'stat-warm')}`}>{signed(metric.value(rightScenario.result) - metric.value(leftScenario!.result))}</td>}
                  </tr>
                ))}
                <tr className="border-t border-border/60">
                  <td className="py-2 pr-4 font-sans text-muted-foreground">Ever runs dry?</td>
                  {selectedResults.map((s) => <td key={s.letter} className={`py-2 pr-4 text-right ${s.result.depletedYear ? 'text-destructive' : 'stat-good'}`}>{s.result.depletedYear ? `Year ${s.result.depletedYear}` : 'No'}</td>)}
                  {rightScenario && <td className="py-2 pr-4 text-right">{rightScenario.result.depletedYear === leftScenario!.result.depletedYear ? 'Same' : 'Changed'}</td>}
                </tr>
                {([
                  ['Spending target', (s: ScenarioWithResult) => fmtCompact(s.inputs.spend)],
                  ['Draw style', (s: ScenarioWithResult) => s.inputs.flatDraw ? 'Flat' : 'Grows with prices'],
                  ['Residency', (s: ScenarioWithResult) => residencyLabel(s.inputs)],
                  ['Dial (0 grow · 100 spend)', (s: ScenarioWithResult) => String(s.inputs.dial)],
                  ['Split: bonds / insurance / stocks', (s: ScenarioWithResult) => `${Math.round(s.result.weights.a * 100)} / ${Math.round(s.result.weights.b * 100)} / ${Math.round(s.result.weights.c * 100)}`],
                ] as const).map(([label, fn]) => (
                  <tr key={label} className="border-t border-border/60"><td className="py-2 pr-4 font-sans text-muted-foreground">{label}</td>{selectedResults.map((s) => <td key={s.letter} className="py-2 pr-4 text-right">{fn(s)}</td>)}{rightScenario && <td className="py-2 pr-4 text-right">{fn(rightScenario) === fn(leftScenario!) ? 'Same' : 'Changed'}</td>}</tr>
                ))}
                <tr className="border-t border-border/60">
                  <td className="py-3 pr-4 font-sans text-muted-foreground">Actions</td>
                  {selectedResults.map((s) => (
                    <td key={s.letter} className="py-3 pr-4 text-right"><div className="inline-flex items-center gap-2"><button onClick={() => onUse(LETTERS.indexOf(s.letter))} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground cursor-pointer">Use <ArrowUpRight className="h-3 w-3" /></button><button onClick={() => onDelete(LETTERS.indexOf(s.letter))} title={`Delete scenario ${s.letter}`} className="rounded p-1 text-muted-foreground hover:text-destructive cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button></div></td>
                  ))}
                  {rightScenario && <td />}
                </tr>
              </tbody>
            </table>
          </div>

          {!rightScenario && <p className="text-sm text-muted-foreground">Choose a different second scenario to compare two plans side by side.</p>}

          {rightScenario && (
            <section aria-labelledby="input-differences-title" className="hairline-card p-5">
              <h3 id="input-differences-title" className="font-display text-lg font-semibold">What changed between {leftScenario!.letter} and {rightScenario.letter}?</h3>
              {differences.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No differences in the main plan settings.</p> : (
                <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-[12px] text-muted-foreground"><th className="py-2 pr-4 font-medium">Input</th><th className="py-2 pr-4 text-right font-medium">{leftScenario!.letter}</th><th className="py-2 pr-4 text-right font-medium">{rightScenario.letter}</th></tr></thead><tbody>{differences.map(([label, av, bv]) => <tr key={label} className="border-t border-border/60"><td className="py-2 pr-4 text-muted-foreground">{label}</td><td className="py-2 pr-4 text-right font-num">{av}</td><td className="py-2 pr-4 text-right font-num">{bv}</td></tr>)}</tbody></table>
              )}
            </section>
          )}

          {showVisuals && <div className="hairline-card p-5" data-testid="scenario-trend"><h3 className="font-display text-lg font-semibold">{HORIZON}-year trend</h3><p className="mt-1 text-sm text-muted-foreground">The same two scenarios as the decision table above.</p><ScenarioLines scenarios={selectedResults} /></div>}
        </>
      )}
    </div>
  );
}
