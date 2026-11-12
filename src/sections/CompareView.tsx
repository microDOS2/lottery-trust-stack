import { useMemo } from 'react';
import { computeStack, fmtCompact, type Assumptions, type Inputs } from '../lib/calc';
import { SectionTitle } from '../components/widgets';
import { ScenarioLines, ScenarioBars, useScenarioResults, type ScenarioWithResult } from '../components/CompareCharts';
import { Crown, ArrowUpRight, Trash2 } from 'lucide-react';
import type { ScenarioSlot } from './CalculatorView';

interface Props {
  scenarios: (ScenarioSlot | null)[];
  asm: Assumptions;
  onUse: (i: number) => void;
  onDelete: (i: number) => void;
}

const LETTERS = 'ABCDE';

/** The scenario comparison page: every saved setup, with all the numbers that matter. */
export default function CompareView({ scenarios, asm, onUse, onDelete }: Props) {
  const saved = useMemo(
    () => scenarios.map((s, i) => (s ? { letter: LETTERS[i], inputs: s.inputs, index: i } : null)).filter((s): s is { letter: string; inputs: Inputs; index: number } => !!s),
    [scenarios],
  );
  const withResults = useScenarioResults(saved, asm);
  const bestEnd = Math.max(0, ...withResults.map((s) => s.result.stackEnd));
  const bestLetter = withResults.find((s) => s.result.stackEnd === bestEnd)?.letter;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SectionTitle
        num="03"
        title={<>Your setups, <span className="sig-italic">side by side</span></>}
        blurb="Every saved scenario with the numbers that matter: what it pays you yearly, what it costs, what it leaves in 10 and 25 years, and whether it ever runs dry. Use any of them with one click."
      />

      {saved.length === 0 ? (
        <div className="hairline-card p-6 text-[15px] text-muted-foreground">
          Nothing saved yet. On the Calculator or Goals &amp; Fit page, hit <strong>Save as A</strong> — then come back here.
          Saving a few different setups is the whole point: see which life each one buys.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto hairline-card p-5">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">What you're comparing</th>
                  {withResults.map((s) => (
                    <th key={s.letter} className="py-2 pr-4 text-right font-medium">
                      <span className="inline-flex items-center gap-1">
                        {s.letter}
                        {s.letter === bestLetter && <Crown className="h-3.5 w-3.5 text-success" aria-label="Biggest 25-year pile" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-num text-[13px]">
                {([
                  ['After-tax pool', (r: ReturnType<typeof computeStack>) => fmtCompact(r.net)],
                  ['Invested in the stack', (r: ReturnType<typeof computeStack>) => fmtCompact(r.core)],
                  ['Safe to take per year', (r: ReturnType<typeof computeStack>) => fmtCompact(r.capacity)],
                  ['Planned draw, year 2', (r: ReturnType<typeof computeStack>) => fmtCompact(r.plannedDrawY2)],
                  ['Fees over 25 years', (r: ReturnType<typeof computeStack>) => fmtCompact(r.projection.reduce((a, b) => a + b.fees, 0))],
                  ['Pile at year 10', (r: ReturnType<typeof computeStack>) => fmtCompact(r.projection[9]?.end ?? 0)],
                  ['Pile at year 25', (r: ReturnType<typeof computeStack>) => fmtCompact(r.stackEnd)],
                  ['Edge over a taxable account', (r: ReturnType<typeof computeStack>) => fmtCompact(r.advantage)],
                  ['Total drawn over 25 years', (r: ReturnType<typeof computeStack>) => fmtCompact(r.cumCash)],
                ] as const).map(([label, fn]) => (
                  <tr key={label} className="border-t border-border/60">
                    <td className="py-2 pr-4 font-sans text-muted-foreground">{label}</td>
                    {withResults.map((s) => <td key={s.letter} className="py-2 pr-4 text-right">{fn(s.result)}</td>)}
                  </tr>
                ))}
                <tr className="border-t border-border/60">
                  <td className="py-2 pr-4 font-sans text-muted-foreground">Ever runs dry?</td>
                  {withResults.map((s) => (
                    <td key={s.letter} className={`py-2 pr-4 text-right ${s.result.depletedYear ? 'text-destructive' : 'stat-good'}`}>
                      {s.result.depletedYear ? `Year ${s.result.depletedYear}` : 'No'}
                    </td>
                  ))}
                </tr>
                {([
                  ['Spending target', (s: ScenarioWithResult) => fmtCompact(s.inputs.spend)],
                  ['Draw style', (s: ScenarioWithResult) => s.inputs.flatDraw ? 'Flat' : 'Grows with prices'],
                  ['Residency', (s: ScenarioWithResult) => s.inputs.residency === 'pr' ? 'Puerto Rico' : s.inputs.residency === 'stay' ? 'Staying put' : s.inputs.residency === 'move' ? 'Moving state' : 'Two homes'],
                  ['Dial (0 grow · 100 spend)', (s: ScenarioWithResult) => String(s.inputs.dial)],
                  ['Split: bonds / insurance / stocks', (s: ScenarioWithResult) => `${Math.round(s.result.weights.a * 100)} / ${Math.round(s.result.weights.b * 100)} / ${Math.round(s.result.weights.c * 100)}`],
                ] as const).map(([label, fn]) => (
                  <tr key={label} className="border-t border-border/60">
                    <td className="py-2 pr-4 font-sans text-muted-foreground">{label}</td>
                    {withResults.map((s) => <td key={s.letter} className="py-2 pr-4 text-right">{fn(s)}</td>)}
                  </tr>
                ))}
                <tr className="border-t border-border/60">
                  <td className="py-3 pr-4 font-sans text-muted-foreground">Actions</td>
                  {withResults.map((s) => (
                    <td key={s.letter} className="py-3 pr-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => onUse(LETTERS.indexOf(s.letter))} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground cursor-pointer">
                          Use <ArrowUpRight className="h-3 w-3" />
                        </button>
                        <button onClick={() => onDelete(LETTERS.indexOf(s.letter))} title={`Delete scenario ${s.letter}`} className="rounded p-1 text-muted-foreground hover:text-destructive cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="hairline-card p-5">
              <h3 className="font-display text-lg font-semibold">The 25-year race</h3>
              <ScenarioLines scenarios={withResults} />
            </div>
            <div className="hairline-card p-5">
              <h3 className="font-display text-lg font-semibold">Headline numbers</h3>
              <ScenarioBars scenarios={withResults} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
