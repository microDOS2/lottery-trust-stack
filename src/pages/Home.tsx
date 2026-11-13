import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_INPUTS, DEFAULT_ASSUMPTIONS, LEGACY_ASSUMPTIONS, computeStack, type Inputs, type Assumptions } from '../lib/calc';
import { QUIZ } from '../lib/quiz';
import CalculatorView, { type ScenarioSlot } from '../sections/CalculatorView';
import GoalsView from '../sections/GoalsView';
import LabView from '../sections/LabView';
import StrategyView from '../sections/StrategyView';
import AnnuityView from '../sections/AnnuityView';
import { GuideView, GlossaryView } from '../sections/GuideView';
import ExplainView from '../sections/ExplainView';
import { ExplainNav, explainSectionFromHash, openExplainTab } from '../explainNav';
import { Tip } from '../components/widgets';
import { Landmark, TrendingUp, Library, Scale, Map, BookOpen, Compass, ScrollText, Columns3, GraduationCap, Globe2, FileText, Activity, Shield } from 'lucide-react';
import Tour from '../components/Tour';
import CompareView from '../sections/CompareView';
import EntitiesView from '../sections/EntitiesView';
import PlanSummary from '../sections/PlanSummary';
import AnalysisView from '../sections/AnalysisView';
import LegacyView from '../sections/LegacyView';
import type { EntityItem } from '../lib/entities';

type View = 'calc' | 'lab' | 'library' | 'annuity' | 'guide' | 'glossary' | 'goals' | 'explain' | 'compare' | 'entities' | 'plan' | 'analysis' | 'legacy';

/** Bump when saved shapes change. A mismatched version is discarded instead of crashing the page. */
const SCHEMA_VERSION = 7;

function schemaAllowsSaved(): boolean {
  try {
    const raw = localStorage.getItem('lotteryStack.schema');
    if (raw === null) return true;
    const n = Number(raw);
    return n === 2 || n === 3 || n === 4 || n === 5 || n === 6 || n === SCHEMA_VERSION;
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
  if (typeof inputs.assetValue !== 'number') inputs.assetValue = 0;
  if (typeof inputs.costBasis !== 'number') inputs.costBasis = 0;
  if (!Array.isArray(inputs.chosen)) inputs.chosen = [];
  if (!inputs.strategyDollars || typeof inputs.strategyDollars !== 'object') inputs.strategyDollars = {};
  if (typeof inputs.debt !== 'number') inputs.debt = 0;
  if (typeof inputs.venture !== 'number') inputs.venture = 0;
  return inputs;
}

const NAV: Array<{ id: View; label: string; icon: typeof Landmark }> = [
  { id: 'goals', label: 'Start here', icon: Compass },
  { id: 'calc', label: 'Fine-tune', icon: Landmark },
  { id: 'compare', label: 'Compare & decide', icon: Columns3 },
  { id: 'plan', label: 'Plan Summary', icon: FileText },
  { id: 'analysis', label: 'Analysis', icon: Activity },
  { id: 'legacy', label: 'Estate & Legacy', icon: Shield },
  { id: 'entities', label: 'Entities & Assets', icon: Globe2 },
  { id: 'annuity', label: 'Annuity vs Lump Sum', icon: Scale },
  { id: 'guide', label: 'First-Year Guide', icon: Map },
  { id: 'library', label: 'Strategy Library', icon: Library },
  { id: 'lab', label: 'Spend vs. Grow', icon: TrendingUp },
  { id: 'glossary', label: 'Glossary', icon: BookOpen },
  { id: 'explain', label: 'Explanations', icon: ScrollText },
];

const NAV_TIP: Record<View, string> = {
  annuity: 'Compare the cash you could take now with 30 years of checks.',
  goals: 'Type the cash, answer the questions, and get five plans with the reason for each.',
  compare: 'Every saved setup, side by side: yearly cash, fees, and the 25-year pile.',
  entities: 'Multiple LLCs, foreign trusts, and second passports — with honest tax notes.',
  plan: 'A printable, plain-English summary of your plan to hand to an attorney or CPA.',
  analysis: 'Which assumptions your plan depends on most, and how often it survives a bad market.',
  legacy: 'Estate tax at death, annual-exclusion gifting, and charitable bunching.',
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
      if (schemaN < 6) {
        if (inputs.spend === 400_000) inputs.spend = 0;
        if (inputs.setupCost === 75_000) inputs.setupCost = 0;
        if (inputs.annualAdmin === 25_000) inputs.annualAdmin = 0;
      }
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
      if (Math.abs(next.ppliGrowth - 0.062) < 1e-9) next.ppliGrowth = 0.07;
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
  const [view, setView] = useState<View>(() => (explainSectionFromHash() !== null ? 'explain' : location.hash.startsWith('#s=') ? 'calc' : 'goals'));
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
  const [touring, setTouring] = useState(false);
  const [entities, setEntitiesRaw] = useState<EntityItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('lotteryStack.entities') ?? '[]'); } catch { return []; }
  });
  const setEntities = (fn: (p: EntityItem[]) => EntityItem[]) => {
    setEntitiesRaw((prev) => {
      const next = fn(prev);
      try { localStorage.setItem('lotteryStack.entities', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const [welcomed, setWelcomed] = useState<boolean>(() => {
    try { return localStorage.getItem('lotteryStack.welcomed') === '1'; } catch { return false; }
  });
  const dismissWelcome = () => {
    setWelcomed(true);
    try { localStorage.setItem('lotteryStack.welcomed', '1'); } catch { /* ignore */ }
  };
  const trySample = () => {
    const persona: Record<string, number> = {
      worry: 0, live: 0, market: 1, sue: 1, hold: 1, gone: 1, estate: 1, discipline: 0,
    };
    const allAnswers = Object.fromEntries(QUIZ.map((q) => [q.id, persona[q.id] ?? 0]));
    try {
      localStorage.setItem('lotteryStack.quizAnswers', JSON.stringify(allAnswers));
      localStorage.setItem('lotteryStack.age', '55');
    } catch { /* ignore */ }
    setInputsRaw((p) => ({ ...p, amount: 100_000_000, basis: 'gross', spend: p.spend > 0 ? p.spend : 500_000 }));
    dismissWelcome();
    setView('goals');
  };

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

  // Customary fee defaults, applied once when money is first entered. User edits win forever after.
  const feesAutoFilled = useRef(false);
  useEffect(() => {
    feesAutoFilled.current = false;
  }, []);
  useEffect(() => {
    if (feesAutoFilled.current || result.core <= 0) return;
    const amount = inputs.amount;
    const setup = amount < 10_000_000 ? 50_000 : amount <= 50_000_000 ? 75_000 : 125_000;
    const admin = Math.max(15_000, Math.round(result.core * 0.0025));
    const ppli = Math.round(result.ppli * 0.008);
    if (inputs.setupCost === setup && inputs.annualAdmin === admin && inputs.ppliFee === ppli) {
      feesAutoFilled.current = true;
      return;
    }
    feesAutoFilled.current = true;
    setInputsRaw((p) => ({ ...p, setupCost: setup, annualAdmin: admin, ppliFee: ppli }));
  }, [result.core, result.ppli, inputs.amount, inputs.setupCost, inputs.annualAdmin, inputs.ppliFee]);

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

  const loadScenario = (i: number) => {
    const slot = scenarios[i];
    if (slot) setInputsRaw(slot.inputs);
  };

  const resetAll = () => {
    setInputsRaw(DEFAULT_INPUTS);
    setAsm(DEFAULT_ASSUMPTIONS);
    setScenarios([null, null, null, null, null]);
    setNotice(null);
  };

  const globalReset = () => {
    feesAutoFilled.current = false;
    if (!window.confirm('Start completely over? This clears your numbers, quiz answers, saved scenarios, and layout. It cannot be undone.')) return;
    setInputsRaw(DEFAULT_INPUTS);
    setAsm(DEFAULT_ASSUMPTIONS);
    setScenarios([null, null, null, null, null]);
    setNotice(null);
    setWelcomed(false);
    setView('goals');
    try {
      ['lotteryStack.inputs', 'lotteryStack.assumptions', 'lotteryStack.scenarios', 'lotteryStack.quizAnswers', 'lotteryStack.layout', 'lotteryStack.welcomed'].forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
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
      <h1 className="sr-only">Lottery Trust Stack — plan tax-free income and long-term compounding after a lottery win</h1>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <Tip text="Back to Goals & Fit.">
          <button onClick={() => setView('goals')} className="flex items-baseline gap-2 cursor-pointer">
            <span className="font-display text-xl font-bold tracking-tight">
              Lottery <span className="sig-italic">Trust Stack</span>
            </span>
            <span className="hidden font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground md:inline">2026 ed.</span>
          </button>
          </Tip>
          <select
            aria-label="Sections"
            className="rounded-md border border-input bg-card px-2 py-1.5 text-sm md:hidden"
            value={view}
            onChange={(e) => {
              const v = e.target.value as View;
              if (v === 'explain') { openExplainTab(); return; }
              setView(v);
            }}
          >
            {NAV.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
          <nav className="hidden flex-nowrap gap-0.5 overflow-x-auto md:flex [mask-image:linear-gradient(to_right,black_92%,transparent)]" aria-label="Sections">
            {NAV.map(({ id, label, icon: Icon }) => (
              <Tip key={id} text={NAV_TIP[id]}>
              <button
                onClick={() => {
                  if (id === 'explain') { openExplainTab(); return; }
                  setView(id);
                }}
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[13px] transition-colors cursor-pointer ${
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 pb-2 md:px-6 no-print">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground" aria-label="Your path">
            {([['goals', '1 · Start here'], ['calc', '2 · Fine-tune'], ['compare', '3 · Compare & decide']] as const).map(([id, label], i) => (
              <span key={id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-border">→</span>}
                <button onClick={() => setView(id)} className={`rounded-full px-2.5 py-0.5 cursor-pointer ${view === id ? 'bg-accent font-semibold text-accent-foreground' : 'hover:text-foreground'}`}>{label}</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Try a sample by size"
              className="rounded-full border border-input bg-card px-2 py-1 text-[12px] font-medium"
              value=""
              onChange={(e) => {
                const amount = Number(e.target.value);
                if (!amount) return;
                setInputsRaw((p) => ({ ...p, amount, basis: 'gross', spend: amount >= 50_000_000 ? 500_000 : Math.round(amount * 0.03) }));
                setView('calc');
                e.target.value = '';
              }}
            >
              <option value="">Try a sample…</option>
              <option value="2000000">$2M</option>
              <option value="10000000">$10M</option>
              <option value="50000000">$50M</option>
              <option value="100000000">$100M</option>
              <option value="250000000">$250M</option>
              <option value="1000000000">$1B</option>
            </select>
            <button
              onClick={() => setTouring(true)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[12px] font-semibold text-primary-foreground cursor-pointer"
            >
              <GraduationCap className="h-3.5 w-3.5" /> Take the tour
            </button>
            <button
              onClick={globalReset}
              className="rounded-full border border-input bg-card px-3 py-1 text-[12px] font-medium text-muted-foreground hover:border-destructive hover:text-destructive cursor-pointer"
            >
              Start over
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {view === 'calc' && (
          <CalculatorView
            entities={entities}
            inputs={inputs}
            setInputs={setInputs}
            asm={asm}
            setAsm={setAsm}
            result={result}
            scenarios={scenarios}
            saveScenario={saveScenario}
            loadScenario={loadScenario}
            clearScenarios={() => setScenarios([null, null, null, null, null])}
            resetAll={resetAll}
            notice={notice}
            dismissNotice={() => setNotice(null)}
            undoNotice={() => { notice?.undo?.(); setNotice(null); }}
            onOpenLibrary={() => setView('library')}
          />
        )}
        {view === 'lab' && <LabView inputs={inputs} setInputs={setInputs} asm={asm} />}
        {view === 'compare' && (
          <CompareView
            scenarios={scenarios}
            asm={asm}
            onUse={(i) => { loadScenario(i); setView('calc'); }}
            onDelete={(i) => setScenarios((prev) => prev.map((s, j) => (j === i ? null : s)))}
          />
        )}
        {view === 'goals' && (
          <GoalsView
            inputs={inputs}
            setInputs={setInputs}
            asm={asm}
            scenarios={scenarios}
            saveScenario={saveScenario}
            loadScenario={loadScenario}
            onApplyScenario={() => setView('calc')}
            onStartOver={globalReset}
            onOpenLibrary={() => setView('library')}
          />
        )}
        {view === 'library' && (
          <StrategyView inputs={inputs} setInputs={setInputsRaw} asm={asm} onUse={() => setView('calc')} />
        )}
        {view === 'annuity' && (
          <AnnuityView
            defaultState={inputs.state}
            defaultAmount={inputs.amount}
            filing={inputs.filing}
            onNext={(cash) => { if (cash > 0) setInputsRaw((p) => ({ ...p, amount: cash, basis: 'gross' })); setView('goals'); }}
            onUseCash={(cash) => {
              setInputsRaw((p) => ({ ...p, amount: cash, basis: 'gross' }));
              setView('calc');
            }}
          />
        )}
        {view === 'entities' && (
          <EntitiesView entities={entities} setEntities={setEntities} setInputs={setInputs} />
        )}
        {view === 'plan' && <PlanSummary inputs={inputs} asm={asm} result={result} scenarios={scenarios} />}
        {view === 'analysis' && <AnalysisView inputs={inputs} asm={asm} />}
        {view === 'legacy' && <LegacyView inputs={inputs} asm={asm} />}
        {view === 'guide' && <GuideView />}
        {view === 'glossary' && <GlossaryView />}
        {view === 'explain' && <ExplainView inputs={inputs} asm={asm} />}
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
    {!welcomed && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[hsl(25_55%_10%/0.35)] px-4 py-6 backdrop-blur-sm no-print"
        onClick={dismissWelcome}
        onKeyDown={(e) => { if (e.key === 'Escape') dismissWelcome(); }}
        tabIndex={-1}
        ref={(el) => { el?.focus(); }}
      >
        <div className="hairline-card max-h-[90dvh] max-w-lg overflow-y-auto p-8 shadow-xl" role="dialog" aria-modal="true" aria-label="Welcome" onClick={(e) => e.stopPropagation()}>
          <div className="eyebrow"><span className="eyebrow-num">Welcome</span></div>
          <h2 className="mt-3 font-display text-3xl font-semibold text-balance">
            Can your lottery money <span className="sig-italic">pay for your life</span> — without running out?
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            That's the one question this site answers. No accounts, nothing uploaded — everything runs in your browser.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
            <li>Type your cash and answer a few plain questions.</li>
            <li>See what the money can safely pay each year, and for how long.</li>
            <li>Save setups and compare them. The quiz scores which one fits you.</li>
          </ol>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button onClick={trySample} className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-95 cursor-pointer">
              Try a sample $100M
            </button>
            <button onClick={dismissWelcome} className="flex-1 rounded-md border border-input bg-card px-4 py-2.5 text-sm font-medium hover:border-primary hover:text-primary cursor-pointer">
              Start with my own numbers
            </button>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
            Educational model, not tax or legal advice. Rates verified November 2026.
          </p>
        </div>
      </div>
    )}
      <Tour active={touring} setView={(v) => setView(v as View)} onClose={() => setTouring(false)} />
    </ExplainNav.Provider>
  );
}
