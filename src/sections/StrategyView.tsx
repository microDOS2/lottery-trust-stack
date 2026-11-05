import { useMemo } from 'react';
import { STRATEGIES, COUNSEL_NOTES } from '../lib/content';
import { fmt, type Assumptions, type Inputs } from '../lib/calc';
import { COMBOS, describeCombo, effectOf, needsDollars, previewInputs, suggestion } from '../lib/combine';
import { Explainer, SectionTitle } from '../components/widgets';

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

export default function StrategyView({ inputs, setInputs, asm, onUse }: Props) {
  const chosen = inputs.chosen ?? [];
  const dollars = inputs.strategyDollars ?? {};
  const view = useMemo(() => describeCombo(inputs, asm), [inputs, asm]);
  const core = view.plain.core;

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
    <div className="mx-auto max-w-3xl space-y-8">
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
        {STRATEGIES.map((s) => {
          const on = chosen.includes(s.id);
          const sug = suggestion(s.id, core);
          const counsel = COUNSEL_NOTES[s.id];
          const fx = effectOf(s.id, inputs, asm);
          const dCash = fx.cashOn - fx.cashOff;
          const dEnd = fx.endOn - fx.endOff;
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

              <p className="mt-3 text-[15px] leading-relaxed">
                <span className="font-medium">On your numbers: </span>
                {fmt(fx.cashOff)} a year becomes {fmt(fx.cashOn)} ({fmt(Math.abs(dCash))} {dCash >= 0 ? 'more' : 'less'}).
                The year-25 pile goes from {fmt(fx.endOff)} to {fmt(fx.endOn)} ({fmt(Math.abs(dEnd))} {dEnd >= 0 ? 'more' : 'less'}). That pile is a comparison, not the finish line.
              </p>
              {MUST[s.id] && (
                <p className="mt-2 flex items-start gap-1.5 text-[15px] leading-relaxed text-muted-foreground">
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
