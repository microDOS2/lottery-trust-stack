import { useMemo, useState } from 'react';
import { QUIZ, QUIZ_LATER, QUIZ_NOW, QUIZ_SOON, type QuizQuestion } from '../lib/quiz';
import { computeStack, fmtCompact, type Assumptions, type Inputs } from '../lib/calc';
import { STATES } from '../lib/taxdata';
import { buildBestPlans } from '../lib/plans';
import { Explainer, SectionTitle } from '../components/widgets';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
  onApplyScenario: () => void;
}

const NOW = new Set<string>(QUIZ_NOW);
const SOON = new Set<string>(QUIZ_SOON);
const LATER = new Set<string>(QUIZ_LATER);

export default function GoalsView({ inputs, setInputs, asm, onApplyScenario }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answered = Object.keys(answers).length;
  const ready = inputs.amount > 0 && answered === QUIZ.length && inputs.spend > 0;
  const set = useMemo(
    () => (ready ? buildBestPlans(answers, inputs, asm) : null),
    [ready, answers, inputs, asm],
  );
  const preview = useMemo(() => computeStack(inputs, asm), [inputs, asm]);
  const moveStates = STATES.filter((s) => s.noTax || s.code === inputs.target);
  const outcome = set?.plans[0];

  const setNum = (key: 'amount' | 'spend' | 'debt' | 'entity4' | 'venture' | 'state' | 'target', value: number | string) => {
    setInputs((p) => ({ ...p, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SectionTitle
        num="02"
        title={<>The life you want, <span className="sig-italic">and what pays for it</span></>}
        blurb="Questions for now, for a little while from now, and for later. The result is whether the money can pay for that life without running out. Allocation splits are not the result."
      />

      <div className="hairline-card p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">Lottery cash amount <Explainer text="The check you could take, or what is left if the tax is already paid. Not the advertised jackpot." more="trade" /></span>
            <input type="number" min={0} step={100000} value={inputs.amount} onChange={(e) => setNum('amount', +e.target.value || 0)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">State you live in now <Explainer text="This state taxes the lottery check. Moving later does not change that." more="move" /></span>
            <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inputs.state} onChange={(e) => setNum('state', e.target.value)}>
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <Group heading="Now" questions={QUIZ.filter((q) => NOW.has(q.id))} answers={answers} setAnswers={setAnswers} />

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">How much do you want available each year to live the way you want?</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">This is the amount that buys freedom from the worry. The result checks whether the money can pay it without running out.</p>
        <input type="number" min={0} step={1} value={inputs.spend} onChange={(e) => setNum('spend', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
        <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
          {inputs.amount <= 0 ? 'Enter a cash amount first.' : `As things stand, the money can pay ${fmtCompact(preview.capacity)} a year.`}
        </span>
      </label>

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">Debts to clear before anything else</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the dollars. Nothing is paid until you do.</p>
        <input type="number" min={0} step={1} value={inputs.debt} onChange={(e) => setNum('debt', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
      </label>

      <Group heading="In a little while" questions={QUIZ.filter((q) => SOON.has(q.id))} answers={answers} setAnswers={setAnswers} />

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">If you would move, which state?</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Used only if you said you might move. The lottery check is still taxed where you live now.</p>
        <select className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm" value={inputs.target} onChange={(e) => setNum('target', e.target.value)}>
          {moveStates.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </label>

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">Dollars for a home, if you want one</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the amount. Nothing is set aside until you do.</p>
        <input type="number" min={0} step={1} value={inputs.entity4} onChange={(e) => setNum('entity4', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
      </label>

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">Dollars for a business or a rental, if you want one</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the amount. Nothing is taken out until you do.</p>
        <input type="number" min={0} step={1} value={inputs.venture} onChange={(e) => setNum('venture', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
      </label>

      <Group heading="Later" questions={QUIZ.filter((q) => LATER.has(q.id))} answers={answers} setAnswers={setAnswers} />

      {!ready && (
        <p className="text-sm text-muted-foreground">
          {inputs.amount <= 0 ? 'Enter the cash amount. ' : ''}
          {inputs.spend <= 0 ? 'Enter the yearly amount you want available. ' : ''}
          {answered < QUIZ.length ? `Answer ${QUIZ.length - answered} more. ` : ''}
          The result shows up when those are done.
        </p>
      )}

      {outcome && (
        <article className="hairline-card border-success/40 p-6">
          <h3 className="font-display text-xl font-semibold">The result</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
            {set?.preface.map((line) => <li key={line}>{line}</li>)}
            {outcome.whys.map((w) => <li key={w}>{w}</li>)}
          </ul>
          <button
            type="button"
            onClick={() => { setInputs(() => outcome.inputs); onApplyScenario(); }}
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-95 cursor-pointer"
          >
            Open this in the calculator
          </button>
        </article>
      )}
    </div>
  );
}

function Group({
  heading, questions, answers, setAnswers,
}: {
  heading: string;
  questions: QuizQuestion[];
  answers: Record<string, number>;
  setAnswers: (fn: (a: Record<string, number>) => Record<string, number>) => void;
}) {
  return (
    <div className="space-y-6">
      <h3 className="font-display text-lg font-semibold">{heading}</h3>
      {questions.map((q) => (
        <fieldset key={q.id} className="hairline-card p-5">
          <legend className="mb-1 text-[15px] font-medium">{q.text}</legend>
          <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">{q.why}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((o, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                className={`rounded-lg border px-4 py-3 text-left cursor-pointer ${
                  answers[q.id] === oi ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card hover:border-primary/50'
                }`}
              >
                <span className="block text-[15px] font-medium">{o.label}</span>
                <span className={`mt-1 block text-[13px] leading-snug ${answers[q.id] === oi ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                  {o.note}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
