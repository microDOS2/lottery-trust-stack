import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_INPUTS, DEFAULT_ASSUMPTIONS, LEGACY_ASSUMPTIONS, SLEEVE_MATH, computeStack, pct, type Inputs, type Assumptions } from '../lib/calc';
import CalculatorView, { type ScenarioSlot } from '../sections/CalculatorView';
import GoalsView from '../sections/GoalsView';
import LabView from '../sections/LabView';
import StrategyView from '../sections/StrategyView';
import AnnuityView from '../sections/AnnuityView';
import { GuideView, GlossaryView } from '../sections/GuideView';
import ExplainView from '../sections/ExplainView';
import { ExplainNav, explainSectionFromHash, openExplainTab } from '../explainNav';
import { Tip } from '../components/widgets';
import { ENGINE_PRESETS, STRATEGIES } from '../lib/content';
import { Landmark, TrendingUp, Library, Scale, Map, BookOpen, Compass, ScrollText } from 'lucide-react';

type View = 'calc' | 'lab' | 'library' | 'annuity' | 'guide' | 'glossary' | 'goals' | 'explain';

/** Bump when saved shapes change. A mismatched version is discarded instead of crashing the page. */
const SCHEMA_VERSION = 5;

function schemaAllowsSaved(): boolean {
  try {
    const raw = localStorage.getItem('lotteryStack.schema');
    if (raw === null) return true;
    const n = Number(raw);
    return n === 2 || n === 3 || n === 4 || n === SCHEMA_VERSION;
  } catch {
    return false;
  }
}

function stampSchema() {
  try { localStorage.setItem('lotteryStack.schema', String(SCHEMA_VERSION)); } catch { /* ignore */ }
}

function readHash(): { inputs?: Partial<Inputs>; assumptions?: Partial<Assumptions> } | null {
  try {
    const h = location.hash;
    if (!h.startsWith('#s=')) return null;
    const parsed = JSON.parse(atob(h.slice(3)));
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.inputs && typeof parsed.inputs === 'object') return parsed;
    if ('amount' in parsed) return { inputs: parsed };
    return null;
  } catch {
    return null;
  }
}

function normalizeInputs(parsed: Partial<Inputs> | undefined, migrateSleeve: boolean): Inputs {
  const hadSleeve = !!parsed && Object.prototype.hasOwnProperty.call(parsed, 'sleeve');
  const inputs: Inputs = {
    ...DEFAULT_INPUTS,
    ...(parsed ?? {}),
    manual: { ...DEFAULT_INPUTS.manual, ...(parsed?.manual ?? {}) },
    drawOverrides: { ...(parsed?.drawOverrides ?? {}) },
  };
  if (!hadSleeve && migrateSleeve) {
    try {
      const raw = localStorage.getItem('lotteryStack.modules');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr) && typeof arr[arr.length - 1] === 'string') inputs.sleeve = arr[arr.length - 1];
    } catch { /* ignore */ }
  }
  if (inputs.sleeve === undefined) inputs.sleeve = null;
  if (typeof inputs.sleevePct !== 'number') inputs.sleevePct = DEFAULT_INPUTS.sleevePct;
  if (typeof inputs.debt !== 'number') inputs.debt = 0;
  return inputs;
}

const NAV: Array<{ id: View; label: string; icon: typeof Landmark }> = [
  { id: 'annuity', label: 'Annuity vs Lump Sum', icon: Scale },
  { id: 'goals', label: 'Goals & Fit', icon: Compass },
  { id: 'calc', label: 'Calculator', icon: Landmark },
  { id: 'guide', label: 'First-Year Guide', icon: Map },
  { id: 'library', label: 'Strategy Library', icon: Library },
  { id: 'lab', label: 'Spend vs. Grow', icon: TrendingUp },
  { id: 'glossary', label: 'Glossary', icon: BookOpen },
  { id: 'explain', label: 'Explanations', icon: ScrollText },
];

const NAV_TIP: Record<View, string> = {
  annuity: 'Compare the cash you could take now with 30 years of checks.',
  goals: 'Type the cash, answer the questions, and get five plans with the reason for each.',
  calc: 'State, prize, and what you want to spend. The numbers on the right use the middle rates.',
  guide: 'What to do in the first year, in order.',
  library: 'Extra ideas. Each row says whether it changes the chart or is only a note.',
  lab: 'Slide between spending more now and leaving more to grow.',
  glossary: 'What the words mean. The longer why is on Explanations.',
  explain: 'The trade, the rates, and what each kind of plan gives up. Opens in a new tab, so this page stays where it is.',
};

function loadInputs(): Inputs {
  const hash = readHash();
  if (hash?.inputs) return normalizeInputs(hash.inputs, false);
  if (!schemaAllowsSaved()) return DEFAULT_INPUTS;
  try {
    const saved = localStorage.getItem('lotteryStack.inputs');
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrate = localStorage.getItem('lotteryStack.schema') !== String(SCHEMA_VERSION);
      const inputs = normalizeInputs(parsed, migrate);
      const schemaN = Number(localStorage.getItem('lotteryStack.schema') ?? 0);
      if (schemaN < 4 && inputs.amount === 18_000_000) inputs.amount = 0;
      return inputs;
    }
  } catch { /* ignore */ }
  return DEFAULT_INPUTS;
}

function loadAssumptions(): Assumptions {
  const hash = readHash();
  if (hash?.assumptions) return { ...DEFAULT_ASSUMPTIONS, ...hash.assumptions };
  if (!schemaAllowsSaved()) return DEFAULT_ASSUMPTIONS;
  try {
    const saved = localStorage.getItem('lotteryStack.assumptions');
    if (saved) {
      const parsed: Assumptions = { ...DEFAULT_ASSUMPTIONS, ...JSON.parse(saved) };
      if (localStorage.getItem('lotteryStack.schema') === '5') return parsed;
      const next = { ...parsed };
      (Object.keys(LEGACY_ASSUMPTIONS) as (keyof Assumptions)[]).forEach((k) => {
        if (Math.abs(parsed[k] - LEGACY_ASSUMPTIONS[k]) < 1e-9) next[k] = DEFAULT_ASSUMPTIONS[k];
      });
      return next;
    }
  } catch { /* ignore */ }
  return DEFAULT_ASSUMPTIONS;
}

export interface EngineNotice {
  text: string;
  undo?: () => void;
}

export default function Home() {
  const [view, setView] = useState<View>(() => (explainSectionFromHash() !== null ? 'explain' : location.hash.startsWith('#s=') ? 'calc' : 'annuity'));
  const [explainAt] = useState<string | null>(() => explainSectionFromHash() || null);
  const [inputs, setInputsRaw] = useState<Inputs>(loadInputs);
  const [asm, setAsm] = useState<Assumptions>(loadAssumptions);
  const [scenarios, setScenarios] = useState<(ScenarioSlot | null)[]>(() => {
    if (!schemaAllowsSaved()) return [null, null, null, null, null];
    try {
      const saved = localStorage.getItem('lotteryStack.scenarios');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          const asmNow = loadAssumptions();
          return [...arr.slice(0, 5), null, null, null, null, null].slice(0, 5).map((s) => {
            if (!s || !s.inputs) return null;
            const inputs = {
              ...DEFAULT_INPUTS,
              ...s.inputs,
              manual: { ...DEFAULT_INPUTS.manual, ...(s.inputs.manual ?? {}) },
              drawOverrides: { ...(s.inputs.drawOverrides ?? {}) },
            };
            const r = computeStack(inputs, asmNow);
            return {
              name: s.name ?? 'Scenario',
              inputs,
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
  const [notice, setNotice] = useState<EngineNotice | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('lotteryStack.scenarios', JSON.stringify(scenarios.map((s) => (s ? { name: s.name, inputs: s.inputs } : null))));
      stampSchema();
    } catch { /* ignore */ }
  }, [scenarios]);

  const setInputs = (fn: (p: Inputs) => Inputs) => setInputsRaw(fn);

  useEffect(() => {
    try { localStorage.setItem('lotteryStack.inputs', JSON.stringify(inputs)); stampSchema(); } catch { /* ignore */ }
  }, [inputs]);
  useEffect(() => {
    try { localStorage.setItem('lotteryStack.assumptions', JSON.stringify(asm)); stampSchema(); } catch { /* ignore */ }
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
    setScenarios([null, null, null, null, null]);
    setNotice(null);
  };

  const applyEngine = (id: string) => {
    const preset = ENGINE_PRESETS[id];
    if (!preset) return;
    const prev = inputs;
    const name = STRATEGIES.find((s) => s.id === id)?.name ?? 'Engine';
    setInputsRaw((p) => ({ ...p, mode: 'manual', manual: { ...preset } }));
    setNotice({
      text: `${name} is now ${Math.round(preset.a * 100)}/${Math.round(preset.b * 100)}/${Math.round(preset.c * 100)} of core (A/B/C).`,
      undo: () => setInputsRaw((p) => ({ ...p, mode: prev.mode, manual: { ...prev.manual } })),
    });
    setView('calc');
  };

  const setSleeve = (id: string | null) => {
    setInputsRaw((p) => ({ ...p, sleeve: id }));
    if (!id) {
      setNotice(null);
      return;
    }
    const name = STRATEGIES.find((s) => s.id === id)?.name ?? id;
    if (SLEEVE_MATH[id]) {
      setNotice({
        text: `${name} replaces the sleeve and carves ${pct(inputs.sleevePct, 0)} of core out of Engine C. Capacity and the 25-year line use that sleeve's model rates.`,
      });
    } else {
      setNotice({ text: `${name} is the selected sleeve. It does not change the three-engine math.` });
    }
    setView('calc');
  };

  useEffect(() => {
    if (view !== 'explain' || !explainAt) return;
    const t = window.setTimeout(() => {
      document.getElementById(explainAt)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
    return () => window.clearTimeout(t);
  }, [view, explainAt]);

  const openExplain = (id?: string) => {
    openExplainTab(id);
  };

  return (
    <ExplainNav.Provider value={openExplain}>
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <Tip text="Back to the first step: cash now, or 30 years of checks.">
          <button onClick={() => setView('annuity')} className="flex items-baseline gap-2 cursor-pointer">
            <span className="font-display text-xl font-bold tracking-tight">
              Lottery <span className="sig-italic">Trust Stack</span>
            </span>
            <span className="hidden font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground md:inline">2026 ed.</span>
          </button>
          </Tip>
          <nav className="flex gap-1 overflow-x-auto" aria-label="Sections">
            {NAV.map(({ id, label, icon: Icon }) => (
              <Tip key={id} text={NAV_TIP[id]}>
              <button
                onClick={() => {
                  if (id === 'explain') { openExplainTab(); return; }
                  setView(id);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] transition-colors cursor-pointer ${
                  view === id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
              </Tip>
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
            notice={notice}
            dismissNotice={() => setNotice(null)}
            undoNotice={() => { notice?.undo?.(); setNotice(null); }}
            onOpenLibrary={() => setView('library')}
          />
        )}
        {view === 'lab' && <LabView inputs={inputs} setInputs={setInputs} asm={asm} />}
        {view === 'goals' && (
          <GoalsView
            inputs={inputs}
            setInputs={setInputs}
            asm={asm}
            onApplyScenario={() => setView('calc')}
          />
        )}
        {view === 'library' && (
          <StrategyView sleeve={inputs.sleeve} onApplyEngine={applyEngine} onSetSleeve={setSleeve} />
        )}
        {view === 'annuity' && (
          <AnnuityView
            defaultState={inputs.state}
            filing={inputs.filing}
            onNext={() => setView('goals')}
            onUseCash={(cash) => {
              setInputsRaw((p) => ({ ...p, amount: cash, basis: 'gross' }));
              setView('calc');
            }}
          />
        )}
        {view === 'guide' && <GuideView />}
        {view === 'glossary' && <GlossaryView />}
        {view === 'explain' && <ExplainView />}
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
    </ExplainNav.Provider>
  );
}
