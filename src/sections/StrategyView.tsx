import { useMemo } from 'react';
import { STRATEGIES, COUNSEL_NOTES, DEEP_STRATEGIES } from '../lib/content';
import { fmt, PPLI_QP_MIN, type Assumptions, type Inputs } from '../lib/calc';
import { COMBOS, ESTATE_EXEMPTION, describeCombo, effectOf, needsDollars, previewInputs, suggestion } from '../lib/combine';
import { Explainer, SectionTitle, Chips } from '../components/widgets';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
  onUse: () => void;
}

const MUST: Record<string, string> = {
  'engine-a': 'Does not change the tax on the lottery check.',
  'engine-b': 'Minimum: $5,000,000 in the insurance box. Under that, the number stays. It is not erased. The bond box and the stock box are not changed. This does not change the prize tax.',
  'engine-c': 'Does not change the tax on the lottery check.',
  leverage: 'The pile is not sold. You still owe the loan. Does not change the prize tax.',
  oz: 'The gain has to go in within 180 days. The new gain is excluded only after 10 years. Does not change the prize tax.',
  qsbs: '50% excluded after 3 years, 75% after 4, 100% after 5. Stops at $15,000,000 per company, or 10 times what you paid if that is higher. Does not change the prize tax.',
  legacy: 'Estate tax here uses $15,000,000 per person, then 40%. The trust does not move money until a lawyer drafts it and you give the money away.',
  charitable: 'At least 10% has to go to charity. You type the dollars. Nothing is given until you do.',
  'pr-act60': 'You must be there more than half the year. Home within 2 years. $15,000 a year to local charity. File by December 31, 2026 for 0% instead of 4%. Does not change the prize tax.',
  'real-estate': 'You type the dollars. A residential building is written off over 27.5 years. That is the federal schedule.',
  'foreign-trust': 'Does not lower the US income tax in these numbers. It can matter for a lawsuit.',
  expatriation: 'Ends US tax on money from anywhere. Has its own tax on the gain as if you sold. You may not be able to live in the US again.',
};

/** One plain sentence: what flipping the toggle actually does. */
const ON_DOES: Record<string, string> = {
  'engine-a': 'On = shifts your mix toward steady, tax-free bond interest.',
  'engine-b': 'On = shifts a big slice of your money into the insurance wrapper, where growth is not taxed as it builds.',
  'engine-c': 'On = shifts your mix toward stocks that can harvest losses to offset gains.',
  leverage: 'On = adds a loan against your stocks — cash you can spend without selling. You still owe the loan.',
  oz: 'On = moves the dollars you type out of your stocks and into a zone fund, locked for ten years.',
  qsbs: 'On = moves the dollars you type into startup stock. A real startup can go to zero.',
  legacy: 'On = shows the estate-tax size on your projected pile. It moves no money.',
  charitable: 'On = gives away the dollars you type. The pile drops by the gift.',
  'pr-act60': 'On = reruns your later investment gains under Puerto Rico rules. The prize tax does not change.',
  'real-estate': 'On = moves the dollars you type into a rental building inside an LLC.',
  'foreign-trust': 'On = adds the protection note to your combination. It changes no tax number here.',
  expatriation: 'On = calculates the exit tax from the two numbers you type. Your yearly cash and your pile do not change.',
};

/** Short plain-English "works when / skip when" per card (summary of qualifies/watchOut + the money minimums). */
const WORKS_WHEN: Record<string, string> = {
  'engine-a': 'any amount — each bond lot is about $5,000, so almost any prize can start a ladder.',
  'engine-b': `you have at least ${fmt(PPLI_QP_MIN)} to put in the policy. Under that, fees usually eat the benefit.`,
  'engine-c': 'you have roughly $500K or more in stocks. Bigger accounts harvest more losses.',
  leverage: 'you have a large stock pile and keep the loan under about 30% of it.',
  oz: 'you have investment gains to roll in within 180 days, and you can lock the money away for 10 years.',
  qsbs: 'it is a new US C-corporation in an eligible business and you can hold the stock 5 years.',
  legacy: `the estate will top ${fmt(ESTATE_EXEMPTION)} per person. Under that, the exclusion already covers you.`,
  charitable: 'you genuinely want to give. At least 10% of the trust must go to charity.',
  'pr-act60': 'you will really live in Puerto Rico 183+ days a year and sell stock in a year you qualify.',
  'real-estate': 'you want a hands-on asset you can hold for the long term.',
  'foreign-trust': 'the real goal is lawsuit protection, with an irrevocable gift a lawyer drafts.',
  expatriation: 'you truly want a new home country, not just a lower tax bill.',
  wing: 'you live in a high-tax state and will not move, but want to shield future gains.',
  hiring: 'you are assembling your team and want to verify who is real.',
  'ppli-depth': 'you are considering the insurance wrapper and want to know what disqualifies it.',
  'leverage-math': 'you want the real cost of borrowing before you sign.',
  'state-estate': 'you live in a state with its own estate or inheritance tax.',
  'box-spreads': 'you want cheap financing without selling stocks.',
};

const SKIP_WHEN: Record<string, string> = {
  wing: 'you expect a simple revocable trust to do the same job — this needs careful drafting.',
  hiring: 'you are tempted by guaranteed returns or urgency pitches.',
  'ppli-depth': 'you cannot pass underwriting or want to pick the stocks yourself.',
  'leverage-math': 'you are treating a loan as free money.',
  'state-estate': 'you assume the federal $15M exclusion is the only threshold.',
  'box-spreads': 'you are not comfortable with options mechanics or early assignment risk.',
  'engine-a': 'you need growth more than a steady floor — yields are modest.',
  'engine-b': `your investable core is under ${fmt(PPLI_QP_MIN)} — the minimum is not met.`,
  'engine-c': 'watching the value drop would make you sell.',
  leverage: 'a forced sale in a downturn would wreck the plan, or you would borrow more than the warning line.',
  oz: 'you might need the cash before the ten years are up.',
  qsbs: 'you cannot afford to lose the whole amount.',
  legacy: 'your projected pile stays under the exclusion — this can wait.',
  charitable: 'the goal is maximum income for you. This is not an income maximizer.',
  'pr-act60': 'you will not actually move, or you only borrow against stocks and never sell.',
  'real-estate': 'you might sell without a 1031 exchange lined up — deferred tax comes due.',
  'foreign-trust': 'someone promised it lowers your US income tax. It does not.',
  expatriation: 'it is only about tax — the exit tax usually eats the win.',
};

interface Eligibility {
  ok: boolean;
  label: string;
  reason: string;
}

/** Green "qualify" / amber "not yet" badge content for one card. */
function eligibilityOf(id: string, core: number, stackEnd: number, typed: number): Eligibility {
  switch (id) {
    case 'engine-b':
      return core >= PPLI_QP_MIN
        ? { ok: true, label: 'Your numbers qualify', reason: `Your investable core is ${fmt(core)} — above the ${fmt(PPLI_QP_MIN)} policy minimum.` }
        : { ok: false, label: 'Not yet — here\'s what\'s missing', reason: `The policy needs at least ${fmt(PPLI_QP_MIN)} in it. Your investable core is ${fmt(core)}.` };
    case 'oz':
    case 'qsbs':
    case 'real-estate':
    case 'leverage':
      if (core <= 0) {
        return { ok: false, label: 'Not yet — here\'s what\'s missing', reason: 'Type your winning cash amount on Goals & Fit first — there is no investable money yet.' };
      }
      if (typed <= 0) {
        return { ok: false, label: 'Not yet — here\'s what\'s missing', reason: `Your ${fmt(core)} core qualifies, but nothing moves until you type a dollar amount below.` };
      }
      return { ok: true, label: 'Your numbers qualify', reason: `${fmt(typed)} typed from a ${fmt(core)} investable core.` };
    case 'legacy':
      return stackEnd > ESTATE_EXEMPTION
        ? { ok: true, label: 'Your numbers qualify', reason: `Your projected 25-year pile is ${fmt(stackEnd)} — above the ${fmt(ESTATE_EXEMPTION)} exclusion. The pile is a rough proxy for your estate; a lawyer uses the real number.` }
        : { ok: false, label: 'Not yet — here\'s what\'s missing', reason: `Your projected 25-year pile is ${fmt(stackEnd)}, under the ${fmt(ESTATE_EXEMPTION)} exclusion. The pile is only a rough proxy for your estate.` };
    case 'pr-act60':
      return core > 0
        ? { ok: true, label: 'Your numbers qualify', reason: 'The math works on your numbers — but it only counts if you actually move and live there more than half the year.' }
        : { ok: false, label: 'Not yet — here\'s what\'s missing', reason: 'Type your winning cash amount on Goals & Fit first. And remember: this requires actually moving to Puerto Rico.' };
    case 'expatriation':
      return { ok: true, label: 'Always available', reason: 'Anyone can renounce. Read the exit-tax math below before treating it as an option.' };
    default:
      if (['wing', 'hiring', 'ppli-depth', 'leverage-math', 'state-estate', 'box-spreads'].includes(id)) {
        return { ok: true, label: 'Information only', reason: 'A concept explainer, not a strategy to toggle on. Read it before the related module.' };
      }
      // engine-a, engine-c, charitable: no minimum
      return { ok: true, label: 'Your numbers qualify', reason: 'No minimum — this works at any amount.' };
  }
}

/** Quiz answers saved by Goals & Fit: { questionId: optionIndex }. Absent or bad JSON → no trigger lines. */
function readQuizTriggers(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  try {
    const raw = localStorage.getItem('lotteryStack.quizAnswers');
    if (!raw) return out;
    const a = JSON.parse(raw) as Record<string, number>;
    if (!a || typeof a !== 'object') return out;
    const add = (id: string, line: string) => {
      (out[id] ??= []).push(line);
    };
    if (a.worry === 1) {
      add('real-estate', 'Suggested because you said you worry about people finding out or targeting you — an LLC keeps your name off the property.');
      add('foreign-trust', 'You said you worry about being targeted — read this so you know what it can and cannot do.');
    }
    if (a.sue === 1) add('legacy', 'Suggested because you said you are worried about being sued — a trust funded before any claim can make assets harder to reach.');
    if (a.live === 2) add('pr-act60', 'Suggested because you said you are open to living in Puerto Rico.');
    if (a.business === 1) add('qsbs', 'Suggested because you said you may start or buy a business.');
    if (a.reinvest === 1) add('oz', 'Suggested because you said you would put extra cash into a business or venture — a zone fund is the tax-deferred version of that move.');
    if (a.giving === 0 || a.giving === 1) add('charitable', 'Suggested because you said you want to give to charity.');
    if (a.estate === 0) add('legacy', 'Suggested because you said your estate will clearly top $15 million.');
    if (a.foreign === 0) add('foreign-trust', 'Suggested because someone pitched you an offshore trust — this card is the reality check.');
    if (a.renounce === 1) add('expatriation', 'Suggested because you said you would consider giving up US citizenship.');
  } catch {
    // No saved answers, storage unavailable, or bad JSON — hide the trigger lines.
  }
  return out;
}

export default function StrategyView({ inputs, setInputs, asm, onUse }: Props) {
  const chosen = inputs.chosen ?? [];
  const dollars = inputs.strategyDollars ?? {};
  const view = useMemo(() => describeCombo(inputs, asm), [inputs, asm]);
  const core = view.plain.core;
  const stackEnd = view.result.stackEnd;
  const triggers = useMemo(readQuizTriggers, []);

  const toggle = (id: string) => {
    setInputs((p) => {
      const cur = p.chosen ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...p, chosen: next };
    });
  };

  const setDollars = (id: string, amount: number) => {
    setInputs((p) => ({ ...p, strategyDollars: { ...(p.strategyDollars ?? {}), [id]: amount } }));
  };

  const useCombo = (ids: string[]) => {
    setInputs((p) => ({ ...p, chosen: ids }));
  };

  const apply = () => {
    const next = previewInputs(inputs);
    setInputs(() => next);
    onUse();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SectionTitle
        num="05"
        title={<>Choose the <span className="sig-italic">strategies</span></>}
        blurb="Turn on any of them. Turn on more than one. The result below is that combination. A suggested amount does nothing until you use it."
      />

      {inputs.amount <= 0 && (
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Type the winning cash amount on Goals & Fit first. Until then every result is zero.
        </p>
      )}

      <section className="hairline-card p-6">
        <h2 className="font-display text-xl font-semibold">Combinations you can start from</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">Clicking one turns those strategies on and turns the others off. You can change it after.</p>
        <div className="mt-4 flex flex-col gap-2">
          {COMBOS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => useCombo(c.ids)}
              className="rounded-lg border border-input bg-card px-4 py-3 text-left cursor-pointer hover:border-primary/50"
            >
              <span className="block text-[15px] font-medium">{c.name}</span>
              <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">{c.why}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {[...STRATEGIES, ...DEEP_STRATEGIES].map((s) => {
          const on = chosen.includes(s.id);
          const sug = suggestion(s.id, core);
          const counsel = COUNSEL_NOTES[s.id];
          const fx = effectOf(s.id, inputs, asm);
          const dCash = fx.cashOn - fx.cashOff;
          const dEnd = fx.endOn - fx.endOff;
          const typed = Math.max(0, dollars[s.id] || 0);
          const elig = eligibilityOf(s.id, core, stackEnd, typed);
          const noChange = dCash === 0 && dEnd === 0;
          const infoOnly = (s.id === 'foreign-trust' || s.id === 'expatriation') && noChange;
          const whyLines = triggers[s.id] ?? [];
          return (
            <article key={s.id} className="hairline-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">{s.tag}</div>
                  <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.oneLiner}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold cursor-pointer ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card'}`}
                >
                  {on ? 'On' : 'Off'}
                </button>
              </div>

              {/* Eligibility strip: green = your numbers qualify, amber = what is missing */}
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${elig.ok ? 'stat-good' : 'stat-warm'} border-current`}>
                  {elig.label}
                </span>
                {infoOnly && (
                  <span className="inline-flex items-center rounded-full border border-input px-2.5 py-0.5 text-[12px] font-semibold text-muted-foreground">
                    Information only — tells you what to ask your attorney
                  </span>
                )}
                <span className="text-[13.5px] leading-snug text-muted-foreground">{elig.reason}</span>
              </div>

              {/* What On actually does, in plain words with the real numbers */}
              <p className="mt-3 text-[15px] leading-relaxed">
                <span className="font-medium">What On does. </span>
                {ON_DOES[s.id]}{' '}
                {noChange
                  ? 'On your numbers right now, turning this on does not change the safe yearly cash or the 25-year pile.'
                  : <>Turning this on takes your safe yearly cash from <span className="font-num">{fmt(fx.cashOff)}</span> to <span className="font-num">{fmt(fx.cashOn)}</span>, and your 25-year pile from <span className="font-num">{fmt(fx.endOff)}</span> to <span className="font-num">{fmt(fx.endOn)}</span>. Watch both numbers change below when you flip the switch.</>}
              </p>

              {/* Why this card is being suggested, from saved quiz answers */}
              {whyLines.length > 0 && (
                <div className="mt-2 space-y-1">
                  {whyLines.map((line) => (
                    <p key={line} className="text-[13.5px] leading-snug text-primary">{line}</p>
                  ))}
                </div>
              )}

              {/* Works when / skip when — short plain-English summary */}
              <div className="mt-3 grid gap-2 rounded-md border border-input p-3 text-[13.5px] leading-snug text-muted-foreground sm:grid-cols-2">
                <p><span className="font-medium stat-good">Works when: </span>{WORKS_WHEN[s.id]}</p>
                <p><span className="font-medium stat-warm">Skip when: </span>{SKIP_WHEN[s.id]}</p>
              </div>

              {MUST[s.id] && (
                <p className="mt-3 flex items-start gap-1.5 text-[15px] leading-relaxed text-muted-foreground">
                  <Explainer text={MUST[s.id]} />
                  <span>{MUST[s.id]}</span>
                </p>
              )}
              <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
                <p><span className="font-medium text-foreground">How the tax works. </span>{s.taxMagic}</p>
                <p><span className="font-medium text-foreground">Who it is for. </span>{s.qualifies}</p>
                <p><span className="font-medium text-foreground">What can go wrong. </span>{s.watchOut}</p>
                <p><span className="font-medium text-foreground">Where it sits. </span>{s.plugsIn}</p>
                {counsel && <p className="text-[13px] leading-snug">{counsel}</p>}
              </div>

              {on && needsDollars(s.id) && (
                <label className="mt-4 block max-w-sm">
                  <span className="mb-1 block text-sm font-medium">Dollars for this strategy</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={dollars[s.id] || ''}
                    onChange={(e) => setDollars(s.id, +e.target.value || 0)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num"
                  />
                  <Chips chips={[{label:'5% of core',value:Math.round(core*0.05)},{label:'10% of core',value:Math.round(core*0.1)},{label:'25% of core',value:Math.round(core*0.25)}]} value={dollars[s.id]} onChange={(v)=>setDollars(s.id, v)} hint="How much of your core to put into this strategy. 5–10% is a sensible sleeve; 25% is the concentration warning line." />
                  {sug && (
                    <button
                      type="button"
                      onClick={() => setDollars(s.id, sug.amount)}
                      className="mt-2 text-left text-sm text-primary hover:underline cursor-pointer"
                    >
                      Use {fmt(sug.amount)}. {sug.note}
                    </button>
                  )}
                </label>
              )}
              {on && s.id === 'expatriation' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">What the assets would sell for today</span>
                    <input type="number" min={0} step={1} value={inputs.assetValue || ''} onChange={(e) => setInputs((p) => ({ ...p, assetValue: +e.target.value || 0 }))} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">What you paid for them</span>
                    <input type="number" min={0} step={1} value={inputs.costBasis || ''} onChange={(e) => setInputs((p) => ({ ...p, costBasis: +e.target.value || 0 }))} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
                  </label>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="hairline-card p-6">
        <h2 className="font-display text-xl font-semibold">What this combination does</h2>
        {view.conflicts.length > 0 && (
          <div className="mt-4 space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-4">
            {view.conflicts.map((c) => (
              <p key={c} className="text-[14.5px] leading-relaxed text-destructive">{c}</p>
            ))}
          </div>
        )}
        <div className="mt-5 space-y-6">
          {view.sections.map((sec) => (
            <div key={sec.heading}>
              <h3 className="font-display text-lg font-semibold">{sec.heading}</h3>
              <div className="mt-2 space-y-2">
                {sec.lines.map((line) => (
                  <p key={line.slice(0, 60)} className="text-[15px] leading-relaxed text-muted-foreground">{line}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={apply} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cursor-pointer">
          Use this combination in the calculator
        </button>
      </section>
    </div>
  );
}
