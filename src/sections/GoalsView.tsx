import { useMemo, useState } from 'react';
import { QUIZ, profileFromAnswers, recommend, scoreAll, type GoalProfile } from '../lib/quiz';
import { computeStack, fmtCompact, pct, SLEEVE_MATH, type Assumptions, type Inputs } from '../lib/calc';
import { STRATEGIES } from '../lib/content';
import { SectionTitle } from '../components/widgets';
import Terrain3D from '../components/Terrain3D';
import { ScenarioLines, ScenarioBars, useScenarioResults, SCENARIO_COLORS } from '../components/CompareCharts';
import { Crown, Wand2 } from 'lucide-react';

export interface SavedScenario {
  letter: string;
  inputs: Inputs;
}

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
  scenarios: SavedScenario[];
  onApplyScenario: () => void;
}

const DIM_LABELS: Array<[keyof GoalProfile, string]> = [
  ['income', 'Income now'],
  ['growth', 'Compounding'],
  ['protection', 'Protection'],
  ['mobility', 'Relocation'],
  ['legacy', 'Legacy'],
  ['simplicity', 'Simplicity'],
];

export default function GoalsView({ inputs, setInputs, asm, scenarios, onApplyScenario }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const answered = Object.keys(answers).length;
  const profile = useMemo(() => profileFromAnswers(answers), [answers]);
  const rec = useMemo(() => recommend(profile, answers), [profile, answers]);

  const scored = useMemo(
    () => (done ? scoreAll(scenarios, profile, asm) : []),
    [done, scenarios, profile, asm]
  );
  const best = scored[0];

  // Terrain markers: saved scenarios + the current (unsaved) setup
  const markers = useMemo(() => {
    const ms = scenarios.map((s) => {
      const r = computeStack(s.inputs, asm);
      return { letter: s.letter, dial: s.inputs.dial, stackEnd: r.stackEnd, best: !!best && best.letter === s.letter };
    });
    return ms;
  }, [scenarios, asm, scored, best]);

  const withResults = useScenarioResults(scenarios, asm);
  const markedResults = withResults.map((s) => ({ ...s, best: !!best && best.letter === s.letter }));

  const apply = () => {
    setInputs((p) => ({
      ...p,
      dial: rec.dial,
      mode: 'balanced',
      residency: rec.residency,
      ...(rec.spend != null ? { spend: rec.spend } : {}),
      ...(rec.filing != null ? { filing: rec.filing } : {}),
      ...(rec.basis != null ? { basis: rec.basis } : {}),
    }));
    onApplyScenario();
  };

  const applyScenario = (s: SavedScenario) => {
    setInputs(() => ({ ...s.inputs }));
    onApplyScenario();
  };

  const runnerUp = scored[1];
  const bestScored = scored.find((x) => x.letter === best?.letter);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SectionTitle
        num="07"
        title={<>What kind of winner <span className="sig-italic">are you?</span></>}
        blurb="Twelve plain questions. Apply copies your spending, filing status, and whether you stay, move, or go to Puerto Rico into the calculator. It also sets how much cash you take versus how much you leave to grow."
      />

      {/* ---------- Questionnaire ---------- */}
      <div className="hairline-card p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">
            {answered} of {QUIZ.length} answered
          </span>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(answered / QUIZ.length) * 100}%` }} />
          </div>
        </div>
        <div className="space-y-6">
          {QUIZ.map((q, qi) => (
            <fieldset key={q.id}>
              <legend className="mb-2 text-[15px] font-medium">
                <span className="mr-2 font-mono text-sm text-muted-foreground">{String(qi + 1).padStart(2, '0')}</span>
                {q.text}
              </legend>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    title={o.hint}
                    className={`rounded-full border px-4 py-2 text-[14px] transition-all cursor-pointer ${
                      answers[q.id] === oi
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <button
          disabled={answered < QUIZ.length}
          onClick={() => setDone(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Wand2 className="h-4 w-4" />
          {answered < QUIZ.length ? `Answer ${QUIZ.length - answered} more` : 'Score my scenarios'}
        </button>
      </div>

      {done && (
        <>
          {/* ---------- Profile + recommendation ---------- */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="hairline-card p-6">
              <h3 className="font-display text-xl font-semibold">Your goal profile</h3>
              <div className="mt-4 space-y-3">
                {DIM_LABELS.map(([k, label]) => (
                  <div key={k}>
                    <div className="mb-1 flex justify-between text-[13.5px]">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-num">{Math.round(profile[k] * 100)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${profile[k] * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hairline-card p-6">
              <h3 className="font-display text-xl font-semibold">Recommended starting point</h3>
              <div className="font-num mt-2 text-sm text-muted-foreground">
                Spending <span className="font-semibold text-foreground">{rec.spend != null ? fmtCompact(rec.spend) : 'unchanged'}</span>
                {' · '}Filing <span className="font-semibold text-foreground">{rec.filing === 'mfj' ? 'married filing jointly' : rec.filing === 'single' ? 'single' : 'unchanged'}</span>
                {' · '}Home <span className="font-semibold text-foreground">{rec.residency === 'pr' ? 'Puerto Rico' : rec.residency === 'move' ? 'move to a no-tax state' : 'stay put'}</span>
                {' · '}Dial <span className="font-semibold text-foreground">{rec.dial}</span>
              </div>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] text-muted-foreground">
                {rec.notes.map((n, i) => <li key={i}>{n}</li>)}
                {inputs.sleeve && (
                  <li>
                    Selected sleeve: {STRATEGIES.find((s) => s.id === inputs.sleeve)?.name ?? inputs.sleeve}.
                    {inputs.sleeve in SLEEVE_MATH
                      ? ` It carves ${pct(inputs.sleevePct, 0)} of core out of Engine C, so the projection already includes it. Apply does not remove it.`
                      : ' It does not change the three-engine math. Apply does not remove it.'}
                  </li>
                )}
              </ul>
              <button
                onClick={apply}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-95 cursor-pointer"
              >
                Apply and open calculator
              </button>
            </div>
          </div>

          {/* ---------- Scenario scoreboard ---------- */}
          {scenarios.length > 0 ? (
            <div className="hairline-card p-6">
              <h3 className="font-display text-xl font-semibold">Scenario scoreboard</h3>
              <div className="mt-4 space-y-3">
                {scored.map((s) => (
                  <div key={s.letter} className={`rounded-lg border p-4 ${s.letter === best?.letter ? 'border-success/50 bg-[hsl(var(--success-tint))]' : 'border-border'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-num flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold" style={{ backgroundColor: SCENARIO_COLORS['ABCDE'.indexOf(s.letter)] + '22', color: SCENARIO_COLORS['ABCDE'.indexOf(s.letter)] }}>
                          {s.letter}
                        </span>
                        <div>
                          <div className="text-sm font-medium">
                            Scenario {s.letter}
                            {s.letter === best?.letter && <Crown className="ml-1.5 inline h-4 w-4 text-success" />}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            capacity {fmtCompact(s.result.capacity)}/yr · {fmtCompact(s.result.stackEnd)} @25y
                          </div>
                        </div>
                      </div>
                      <div className="font-num text-2xl font-semibold">{s.score.total}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {s.score.parts.map((p) => (
                        <span key={p.label} className="font-mono text-[14px] text-muted-foreground">
                          {p.label} <span className="text-foreground">{Math.round(p.score * 100)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="hairline-card p-6 text-sm text-muted-foreground">
              Save scenarios A–E on the Calculator tab and come back — they'll be scored against your profile here.
            </div>
          )}

          {/* ---------- Visual comparison ---------- */}
          {scenarios.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="hairline-card p-6">
                <h3 className="font-display text-lg font-semibold">25-year race</h3>
                <ScenarioLines scenarios={markedResults} />
              </div>
              <div className="hairline-card p-6">
                <h3 className="font-display text-lg font-semibold">Headline metrics</h3>
                <ScenarioBars scenarios={markedResults} />
              </div>
            </div>
          )}

          {/* ---------- The verdict ---------- */}
          {bestScored && (
            <div className="hairline-card border-success/40 p-6 md:p-8" style={{ boxShadow: '0 4px 20px rgba(76,122,63,0.10)' }}>
              <div className="font-mono text-[12.5px] uppercase tracking-wider stat-good">The verdict</div>
              <h3 className="font-display mt-1 text-2xl md:text-3xl font-semibold">
                <Crown className="mr-2 inline h-6 w-6 text-success" />
                Scenario {bestScored.letter} fits you best
              </h3>
              <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">
                {bestScored.score.parts.length > 0 && (
                  <>It scores highest on what you said matters most — {bestScored.score.parts
                    .slice()
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 2)
                    .map((pp) => pp.label.toLowerCase())
                    .join(' and ')}. </>
                )}
                It pays up to <span className="font-num font-semibold text-foreground">{fmtCompact(bestScored.result.capacity)}/yr</span> tax-free and grows to{' '}
                <span className="font-num font-semibold text-foreground">{fmtCompact(bestScored.result.stackEnd)}</span> in 25 years.
                {runnerUp && runnerUp.letter !== bestScored.letter && (
                  <> Runner-up: Scenario {runnerUp.letter} (score {runnerUp.score.total}), which ends at {fmtCompact(runnerUp.result.stackEnd)}.</>
                )}
              </p>
              <button
                onClick={() => applyScenario(bestScored)}
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-95 cursor-pointer"
              >
                Use Scenario {bestScored.letter} on the calculator
              </button>
            </div>
          )}

          {/* ---------- 3D terrain (optional) ---------- */}
          <details className="hairline-card p-6">
            <summary className="cursor-pointer font-display text-lg font-semibold">Curious? See it as a 3D landscape</summary>
            <p className="mt-2 mb-3 max-w-[70ch] text-sm text-muted-foreground">
              Plain English: this is a mountain range of every possible dial setting over 25 years. Left end is "all growth," right end is
              "all income." Higher ground = more money at the end. The lettered flags are your saved scenarios; the green beacon marks your best fit.
              Nothing to learn here beyond that — the verdict above is the takeaway.
            </p>
            <Terrain3D inputs={inputs} asm={asm} markers={markers} />
          </details>
        </>
      )}
    </div>
  );
}
