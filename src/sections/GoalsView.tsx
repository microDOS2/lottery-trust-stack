import { useMemo, useState } from 'react';
import { QUIZ, QUIZ_NOW, profileFromAnswers, type GoalProfile } from '../lib/quiz';
import { computeStack, fmtCompact, type Assumptions, type Inputs } from '../lib/calc';
import { STATES } from '../lib/taxdata';
import { buildBestPlans, outcomesForQuestion } from '../lib/plans';
import { Explainer, SectionTitle, Tip } from '../components/widgets';
import { useExplain } from '../explainNav';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
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

const PLAN_MORE: Record<string, string> = {
  'stay-spend': 'spend-now', bonds: 'spend-now', 'stay-mid': 'middle', 'stay-grow': 'grow',
  simple: 'simple', move: 'move', pr: 'puerto-rico', house: 'house', business: 'business', oz: 'lockup',
};
const NOW = new Set<string>(QUIZ_NOW);

function Bars({ title, hint, tip, more, rows, tone }: {
  title: string;
  hint: string;
  tip: string;
  more: string;
  rows: Array<{ name: string; value: number; best: boolean }>;
  tone: 'spend' | 'later';
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const bar = tone === 'spend' ? 'bg-primary' : 'bg-[hsl(var(--success))]';
  return (
    <div>
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">{title}<Explainer text={tip} more={more} /></h3>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">{hint}</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className={r.best ? 'font-semibold' : ''}>{r.best ? 'Best match · ' : ''}{r.name}</span>
              <span className="font-num shrink-0">{fmtCompact(r.value)}{tone === 'spend' ? '/yr' : ''}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GoalsView({ inputs, setInputs, asm, onApplyScenario }: Props) {
  const openExplain = useExplain();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answered = Object.keys(answers).length;
  const ready = inputs.amount > 0 && answered === QUIZ.length;
  const profile = useMemo(() => profileFromAnswers(answers), [answers]);
  const set = useMemo(
    () => (ready ? buildBestPlans(answers, inputs, asm) : null),
    [ready, answers, inputs, asm],
  );
  const moveStates = STATES.filter((s) => s.noTax || s.code === inputs.target);
  const nowQs = QUIZ.filter((q) => NOW.has(q.id));
  const laterQs = QUIZ.filter((q) => !NOW.has(q.id));
  const outcomes = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const q of QUIZ) map[q.id] = outcomesForQuestion(q.id, answers, inputs, asm);
    return map;
  }, [answers, inputs, asm]);
  const preview = useMemo(() => computeStack(inputs, asm), [inputs, asm]);

  const setNum = (key: 'amount' | 'spend' | 'debt' | 'state' | 'target', value: number | string) => {
    setInputs((p) => ({ ...p, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SectionTitle
        num="02"
        title={<>Five plans, <span className="sig-italic">and why each one</span></>}
        blurb="Type the cash you could take. Answer where you are, then what you want later. You get five different plans. Each one says why it made the list, in the words of your answers."
      />

      <div className="hairline-card p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">Winning cash amount <Explainer text="The check you could take, or what is left if the tax is already paid. Not the advertised jackpot." more="trade" /></span>
            <input
              type="number"
              min={0}
              step={100000}
              value={inputs.amount}
              onChange={(e) => setNum('amount', +e.target.value || 0)}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num"
            />
            <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">The check you could take, or what is left if the tax is already paid. Not the advertised jackpot.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">State you live in now <Explainer text="This state taxes the prize. Moving later does not change that." more="move" /></span>
            <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inputs.state} onChange={(e) => setNum('state', e.target.value)}>
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">This is the state that taxes the prize.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">If you moved <Explainer text="Used only by a plan that says move. The prize tax does not change." more="move" /></span>
            <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inputs.target} onChange={(e) => setNum('target', e.target.value)}>
              {moveStates.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">Used only by a plan that says move. A no-income-tax state.</span>
          </label>
        </div>
      </div>

      <div className="hairline-card p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">
            {answered} of {QUIZ.length} answered
          </span>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${(answered / QUIZ.length) * 100}%` }} />
          </div>
        </div>

        <QuestionGroup heading="Where you are now" start={1} questions={nowQs} answers={answers} setAnswers={setAnswers} outcomes={outcomes} />
        <label className="mt-8 block max-w-md">
          <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">
            <span className="font-mono text-sm text-muted-foreground">{String(nowQs.length + 1).padStart(2, '0')}</span>
            How many dollars of debt should be paid before anything is invested?
            <Explainer text="Debt paid first is cash that is not invested." more="not-included" />
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={inputs.debt}
            onChange={(e) => setNum('debt', +e.target.value || 0)}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num"
          />
          <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
            {inputs.amount <= 0
              ? 'Enter a cash amount. Until then this has no numbers to show.'
              : `${fmtCompact(preview.debtPaid)} is paid from the cash after tax, before anything is invested.`}
          </span>
        </label>
        <div className="mt-8">
          <label className="mb-8 block max-w-md">
            <span className="mb-1.5 flex items-center gap-1.5 text-[15px] font-medium">
              <span className="font-mono text-sm text-muted-foreground">{String(nowQs.length + 2).padStart(2, '0')}</span>
              How much do you want to spend each year?
              <Explainer text="This is the check you are asking the plans to pay." more="trade" />
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={inputs.spend}
              onChange={(e) => setNum('spend', +e.target.value || 0)}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num"
            />
            <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
              {inputs.amount <= 0
                ? 'Enter a cash amount. Until then this has no numbers to show.'
                : `Year 2 is a draw of ${fmtCompact(preview.plannedDrawY2)}. The investments can pay ${fmtCompact(preview.capacity)} a year.`}
            </span>
          </label>
          <QuestionGroup heading="What you want later" start={nowQs.length + 3} questions={laterQs} answers={answers} setAnswers={setAnswers} outcomes={outcomes} />
        </div>

        {!ready && (
          <p className="mt-6 text-sm text-muted-foreground">
            {inputs.amount <= 0 ? 'Enter the cash amount. ' : ''}
            {answered < QUIZ.length ? `Answer ${QUIZ.length - answered} more. ` : ''}
            The five plans show up when both are done.
          </p>
        )}
      </div>

      {set && (
        <>
          <div className="hairline-card p-6">
            <h3 className="font-display text-xl font-semibold">What your answers added up to</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {DIM_LABELS.map(([k, label]) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-[13.5px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-num">{Math.round(profile[k] * 100)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${profile[k] * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[14px] text-muted-foreground">
              {set.preface.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>

          <div className="hairline-card p-6 md:p-8">
            <h3 className="font-display text-xl font-semibold">The trade, in two numbers</h3>
            <p className="mt-1 mb-3 max-w-[68ch] text-sm text-muted-foreground">
              No landscape. Two lists. A longer bar on the first list means more cash each year. A longer bar on the second means more left after 25 years. The plan that wins one usually loses the other.
            </p>
            <button type="button" onClick={() => openExplain('trade')} className="mb-6 text-sm font-medium text-primary underline cursor-pointer">
              Full explanation of the trade (new tab)
            </button>
            <div className="grid gap-8 lg:grid-cols-2">
              <Bars
                title="Cash you can spend each year"
                hint="Tax-free, after the first year. Year 1 is a reserve, not a paycheck."
                tip="The most the mix can pay without selling the pile. Spending more than this eats principal."
                more="trade"
                tone="spend"
                rows={set.plans.map((p, i) => ({ name: p.name, value: p.result.capacity, best: i === 0 }))}
              />
              <Bars
                title="What you would have in 25 years"
                hint="The pile if the middle rates hold. Not a promise."
                tip="What is left if the middle rates hold and you only spend the yearly amount. Not a promise."
                more="trade"
                tone="later"
                rows={set.plans.map((p, i) => ({ name: p.name, value: p.result.stackEnd, best: i === 0 }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            {set.plans.map((plan, i) => (
              <article key={plan.id} className={`hairline-card p-6 ${i === 0 ? 'border-success/40' : ''}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="flex flex-wrap items-center gap-2 font-display text-xl font-semibold">
                    <span className="font-mono text-sm text-muted-foreground">{i === 0 ? 'Best match' : `#${i + 1}`}</span>
                    {plan.name}
                    <Explainer text={plan.whys[0] ?? 'Why this plan is on the list.'} more={PLAN_MORE[plan.id] ?? 'trade'} />
                  </h3>
                  <div className="font-num text-sm text-muted-foreground">
                    {fmtCompact(plan.result.capacity)}/yr · {fmtCompact(plan.result.stackEnd)} in 25 years · score {plan.score}
                  </div>
                </div>
                <h4 className="mt-4 text-sm font-semibold">Why this one</h4>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-muted-foreground">
                  {plan.whys.map((w) => <li key={w}>{w}</li>)}
                </ul>
                <Tip text="Loads this plan into the calculator and opens it. Your answers stay here." more={PLAN_MORE[plan.id] ?? 'trade'}>
                <button
                  type="button"
                  onClick={() => { setInputs(() => plan.inputs); onApplyScenario(); }}
                  className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-95 cursor-pointer"
                >
                  Use this plan
                </button>
                </Tip>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function QuestionGroup({
  heading, start, questions, answers, setAnswers, outcomes,
}: {
  heading: string;
  start: number;
  questions: typeof QUIZ;
  answers: Record<string, number>;
  setAnswers: (fn: (a: Record<string, number>) => Record<string, number>) => void;
  outcomes: Record<string, string[]>;
}) {
  return (
    <div className="space-y-6">
      <h3 className="font-display text-lg font-semibold">{heading}</h3>
      {questions.map((q, qi) => (
        <fieldset key={q.id}>
          <legend className="mb-2 text-[15px] font-medium">
            <span className="mr-2 font-mono text-sm text-muted-foreground">{String(start + qi).padStart(2, '0')}</span>
            {q.text}
          </legend>
          <p className="mb-2 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">{q.why}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((o, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                className={`rounded-lg border px-4 py-3 text-left transition-all cursor-pointer ${
                  answers[q.id] === oi
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-card hover:border-primary/50'
                }`}
              >
                <span className="block text-[15px] font-medium">{o.label}</span>
                <span className={`mt-1 block text-[13px] leading-snug ${answers[q.id] === oi ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                  {outcomes[q.id]?.[oi]}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
