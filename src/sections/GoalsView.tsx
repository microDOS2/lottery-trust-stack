import { useMemo, useState } from 'react';
import { QUIZ, QUIZ_LONG, QUIZ_MIDDLE, QUIZ_PROTECT, QUIZ_SHORT, type QuizQuestion } from '../lib/quiz';
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

const SHORT = new Set<string>(QUIZ_SHORT);
const MIDDLE = new Set<string>(QUIZ_MIDDLE);
const PROTECT = new Set<string>(QUIZ_PROTECT);
const LONG = new Set<string>(QUIZ_LONG);

function stretches(age: number): { short: string; middle: string; long: string } {
  if (age <= 0) return { short: 'the next few years', middle: 'the next 10 years', long: 'the years after that' };
  if (age >= 75) return { short: 'the next 1 to 2 years', middle: 'about the next 5 years', long: 'the years after that, which may be under 15' };
  if (age >= 60) return { short: 'the next 2 to 3 years', middle: 'about the next 8 years', long: 'the years after that' };
  return { short: 'about the next 3 years', middle: 'about the next 10 years', long: 'the decades after that' };
}

export default function GoalsView({ inputs, setInputs, asm, onApplyScenario }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [age, setAge] = useState(0);
  const answered = Object.keys(answers).length;
  const ready = inputs.amount > 0 && age > 0 && answered === QUIZ.length && inputs.spend > 0;
  const set = useMemo(
    () => (ready ? buildBestPlans(answers, inputs, asm) : null),
    [ready, answers, inputs, asm],
  );
  const preview = useMemo(() => computeStack(inputs, asm), [inputs, asm]);
  const moveStates = STATES.filter((s) => s.noTax || s.code === inputs.target);
  const outcome = set?.plans[0];
  const span = stretches(age);

  const setNum = (key: 'amount' | 'spend' | 'debt' | 'entity4' | 'venture' | 'state' | 'target', value: number | string) => {
    setInputs((p) => ({ ...p, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SectionTitle
        num="02"
        title={<>Plan the life, <span className="sig-italic">short, middle, and long</span></>}
        blurb="One page. Age first, because a 40-year-old and a 75-year-old do not mean the same thing by later. The result is whether the money can pay for the life without running out. A pile at a fixed year 25 is not the finish line."
      />

      <div className="hairline-card p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">How old are you? <Explainer text="Age sets what short, middle, and long mean. It is not a range." more="trade" /></span>
            <input type="number" min={0} max={120} step={1} value={age || ''} onChange={(e) => setAge(+e.target.value || 0)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
            <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
              {age > 0 ? `Short is ${span.short}. Middle is ${span.middle}. Long is ${span.long}.` : 'Type your age. The three stretches are set from it.'}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">Lottery cash amount <Explainer text="The check you could take, or what is left if the tax is already paid. Not the advertised jackpot." more="trade" /></span>
            <input type="number" min={0} step={100000} value={inputs.amount || ''} onChange={(e) => setNum('amount', +e.target.value || 0)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium">State you live in now <Explainer text="This state taxes the lottery check. Moving later does not change that." more="move" /></span>
            <select className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={inputs.state} onChange={(e) => setNum('state', e.target.value)}>
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <Group heading={`Short term — ${span.short}`} questions={QUIZ.filter((q) => SHORT.has(q.id))} answers={answers} setAnswers={setAnswers} />

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">How much do you want available each year to live the way you want?</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">This is the amount that buys freedom from the worry. Include anyone who depends on you, and any care cost. The result checks whether the money can pay it without running out.</p>
        <input type="number" min={0} step={1} value={inputs.spend || ''} onChange={(e) => setNum('spend', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
        <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
          {inputs.amount <= 0 ? 'Enter a cash amount first.' : `As things stand, the money can pay ${fmtCompact(preview.capacity)} a year.`}
        </span>
      </label>

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">Debts to clear before anything else</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the dollars. Nothing is paid until you do.</p>
        <input type="number" min={0} step={1} value={inputs.debt || ''} onChange={(e) => setNum('debt', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
      </label>

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">Dollars for a home, a boat, or anything else you want to pay for soon</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the amount. Nothing is set aside until you do. That cash is not invested.</p>
        <input type="number" min={0} step={1} value={inputs.entity4 || ''} onChange={(e) => setNum('entity4', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
      </label>

      <Group heading={`Middle term — ${span.middle}`} questions={QUIZ.filter((q) => MIDDLE.has(q.id))} answers={answers} setAnswers={setAnswers} />

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">If you would move, which state?</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Used only if you said a different state. The lottery check is still taxed where you live now.</p>
        <select className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm" value={inputs.target} onChange={(e) => setNum('target', e.target.value)}>
          {moveStates.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </label>

      <label className="hairline-card block p-6">
        <span className="mb-1.5 block text-[15px] font-medium">Dollars for a business, a rental, or a gift</span>
        <p className="mb-3 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">Type the amount. Nothing is taken out until you do.</p>
        <input type="number" min={0} step={1} value={inputs.venture || ''} onChange={(e) => setNum('venture', +e.target.value || 0)} className="w-full max-w-sm rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
      </label>

      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold">Protecting you and the estate</h3>
        <div className="hairline-card p-5 text-[14.5px] leading-relaxed text-muted-foreground">
          <p>A trust does not stop you from being sued. You can still be sued. Insurance is what protects you, the person.</p>
          <p className="mt-3">A revocable trust can be changed or cancelled by you. You still control it, so a lawsuit can reach it while you are alive. It is for who gets the money after you die. It is not asset protection.</p>
          <p className="mt-3">An irrevocable trust cannot be taken back, and you cannot change it on your own. Someone else is the trustee. You no longer own what you put in. That is why a later lawsuit has a harder time taking those assets. It has to be funded before any claim. A transfer after you know about a lawsuit, or made to dodge a creditor, can be undone.</p>
          <p className="mt-3">A domestic asset protection trust is an irrevocable trust in a US state that allows you to benefit and still have some protection. Nevada, South Dakota, Delaware, and Alaska are the usual ones. A foreign trust can be harder for a US court to reach. It does not hide the money from the IRS, and it can create extra reporting. Neither kind hides money from the tax office. Answering a question does not create a trust.</p>
        </div>
        <Group heading="" questions={QUIZ.filter((q) => PROTECT.has(q.id))} answers={answers} setAnswers={setAnswers} />
      </div>

      <Group heading={`Long term — ${span.long}`} questions={QUIZ.filter((q) => LONG.has(q.id))} answers={answers} setAnswers={setAnswers} />

      {outcome && (
        <article className="hairline-card border-success/40 p-6">
          <h3 className="font-display text-xl font-semibold">The result</h3>
          <p className="mt-2 text-[14.5px] text-muted-foreground">Age {age}. Short is {span.short}. Middle is {span.middle}.</p>
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
      {heading ? <h3 className="font-display text-lg font-semibold">{heading}</h3> : null}
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
