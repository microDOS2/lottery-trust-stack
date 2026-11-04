import { useMemo } from 'react';
import { STRATEGIES, COUNSEL_NOTES } from '../lib/content';
import { fmt, type Assumptions, type Inputs } from '../lib/calc';
import { COMBOS, describeCombo, needsDollars, previewInputs, suggestion } from '../lib/combine';
import { SectionTitle } from '../components/widgets';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  asm: Assumptions;
  onUse: () => void;
}

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
        num="03"
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

              <div className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-muted-foreground">
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
