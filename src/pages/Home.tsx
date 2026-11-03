import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_INPUTS, DEFAULT_ASSUMPTIONS, computeStack, type Inputs, type Assumptions } from '../lib/calc';
import CalculatorView, { type ScenarioSlot } from '../sections/CalculatorView';
import GoalsView from '../sections/GoalsView';
import LabView from '../sections/LabView';
import StrategyView from '../sections/StrategyView';
import AnnuityView from '../sections/AnnuityView';
import { GuideView, GlossaryView } from '../sections/GuideView';
import { Landmark, TrendingUp, Library, Scale, Map, BookOpen, Compass } from 'lucide-react';

type View = 'calc' | 'lab' | 'library' | 'annuity' | 'guide' | 'glossary' | 'goals';

const NAV: Array<{ id: View; label: string; icon: typeof Landmark }> = [
  { id: 'calc', label: 'Calculator', icon: Landmark },
  { id: 'goals', label: 'Goals & Fit', icon: Compass },
  { id: 'lab', label: 'Spend vs. Grow', icon: TrendingUp },
  { id: 'library', label: 'Strategy Library', icon: Library },
  { id: 'annuity', label: 'Annuity vs Lump Sum', icon: Scale },
  { id: 'guide', label: 'First-Year Guide', icon: Map },
  { id: 'glossary', label: 'Glossary', icon: BookOpen },
];

function loadInputs(): Inputs {
  try {
    const h = location.hash;
    if (h.startsWith('#s=')) {
      const parsed = JSON.parse(atob(h.slice(3)));
      return { ...DEFAULT_INPUTS, ...parsed, manual: { ...DEFAULT_INPUTS.manual, ...(parsed.manual ?? {}) } };
    }
  } catch { /* ignore bad hash */ }
  try {
    const saved = localStorage.getItem('lotteryStack.inputs');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_INPUTS, ...parsed, manual: { ...DEFAULT_INPUTS.manual, ...(parsed.manual ?? {}) } };
    }
  } catch { /* ignore */ }
  return DEFAULT_INPUTS;
}

function loadAssumptions(): Assumptions {
  try {
    const saved = localStorage.getItem('lotteryStack.assumptions');
    if (saved) return { ...DEFAULT_ASSUMPTIONS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_ASSUMPTIONS;
}

export default function Home() {
  const [view, setView] = useState<View>('calc');
  const [inputs, setInputsRaw] = useState<Inputs>(loadInputs);
  const [asm, setAsm] = useState<Assumptions>(loadAssumptions);
  const [scenarios, setScenarios] = useState<(ScenarioSlot | null)[]>(() => {
    try {
      const saved = localStorage.getItem('lotteryStack.scenarios');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          const asmNow = loadAssumptions();
          return [...arr.slice(0, 5), null, null, null, null, null].slice(0, 5).map((s) => {
            if (!s || !s.inputs) return null;
            const r = computeStack(s.inputs, asmNow);
            return {
              name: s.name ?? 'Scenario',
              inputs: s.inputs,
              result: {
                net: r.net, core: r.core, capacity: r.capacity,
                stackEnd: r.stackEnd, advantage: r.advantage,
                alloc: `${Math.round(r.weights.a * 100)}/${Math.round(r.weights.b * 100)}/${Math.round(r.weights.c * 100)}`,
              },
            };
          });
        }
      }
    } catch { /* ignore */ }
    return [null, null, null, null, null];
  });

  useEffect(() => {
    try {
      localStorage.setItem('lotteryStack.scenarios', JSON.stringify(scenarios.map((s) => (s ? { name: s.name, inputs: s.inputs } : null))));
    } catch { /* ignore */ }
  }, [scenarios]);

  const setInputs = (fn: (p: Inputs) => Inputs) => setInputsRaw(fn);

  useEffect(() => {
    try { localStorage.setItem('lotteryStack.inputs', JSON.stringify(inputs)); } catch { /* ignore */ }
  }, [inputs]);
  useEffect(() => {
    try { localStorage.setItem('lotteryStack.assumptions', JSON.stringify(asm)); } catch { /* ignore */ }
  }, [asm]);

  const result = useMemo(() => computeStack(inputs, asm), [inputs, asm]);

  const saveScenario = (i: number) => {
    const r = computeStack(inputs, asm);
    const slot: ScenarioSlot = {
      name: `Scenario ${'ABCDE'[i]}`,
      inputs,
      result: {
        net: r.net, core: r.core, capacity: r.capacity, stackEnd: r.stackEnd, advantage: r.advantage,
        alloc: `${Math.round(r.weights.a * 100)}/${Math.round(r.weights.b * 100)}/${Math.round(r.weights.c * 100)}`,
      },
    };
    setScenarios((prev) => prev.map((s, j) => (j === i ? slot : s)));
  };

  const resetAll = () => {
    setInputsRaw(DEFAULT_INPUTS);
    setAsm(DEFAULT_ASSUMPTIONS);
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <button onClick={() => setView('calc')} className="flex items-baseline gap-2 cursor-pointer">
            <span className="font-display text-xl font-bold tracking-tight">
              Lottery <span className="sig-italic">Trust Stack</span>
            </span>
            <span className="hidden font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground md:inline">2026 ed.</span>
          </button>
          <nav className="flex gap-1 overflow-x-auto" aria-label="Sections">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] transition-colors cursor-pointer ${
                  view === id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {view === 'calc' && (
          <CalculatorView
            inputs={inputs}
            setInputs={setInputs}
            asm={asm}
            setAsm={setAsm}
            result={result}
            scenarios={scenarios}
            saveScenario={saveScenario}
            clearScenarios={() => setScenarios([null, null, null, null, null])}
            resetAll={resetAll}
          />
        )}
        {view === 'lab' && <LabView inputs={inputs} setInputs={setInputs} asm={asm} />}
        {view === 'goals' && (
          <GoalsView
            inputs={inputs}
            setInputs={setInputs}
            asm={asm}
            scenarios={scenarios
              .map((s, i) => (s ? { letter: 'ABCDE'[i], inputs: s.inputs } : null))
              .filter((s): s is { letter: string; inputs: Inputs } => !!s)}
            onApplyScenario={() => setView('calc')}
          />
        )}
        {view === 'library' && <StrategyView />}
        {view === 'annuity' && <AnnuityView defaultState={inputs.state} filing={inputs.filing} />}
        {view === 'guide' && <GuideView />}
        {view === 'glossary' && <GlossaryView />}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <p className="max-w-[90ch] text-sm leading-relaxed text-muted-foreground">
            This is a mathematical planning model for personal education — not tax, legal, financial, or insurance advice.
            Trust structures, PPLI eligibility, residency rules, and Opportunity Zone / QSBS requirements are fact-specific
            and change with legislation. Figures use approximate 2026 federal and state rates. Consult licensed attorneys,
            CPAs, and fiduciaries before acting on anything here.
          </p>
          <p className="mt-2 font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground/70">
            Rates last verified: November 2026 · For personal use · v1.0
          </p>
        </div>
      </footer>
    </div>
  );
}
