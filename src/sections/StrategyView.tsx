import { COUNSEL_NOTES, ENGINE_PRESETS, STRATEGIES } from '../lib/content';
import { SLEEVE_MATH } from '../lib/calc';
import { SectionTitle } from '../components/widgets';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Props {
  sleeve: string | null;
  onApplyEngine: (id: string) => void;
  onSetSleeve: (id: string | null) => void;
}

export default function StrategyView({ sleeve, onApplyEngine, onSetSleeve }: Props) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SectionTitle
        num="03"
        title={<>The strategy <span className="sig-italic">library</span></>}
        blurb="Core engines set the calculator weights. One optional sleeve can be active at a time — choosing another replaces it. OZ, QSBS, and real estate carve cash out of Engine C and change the projection. Every other item is a label only."
      />

      <Accordion type="single" collapsible className="space-y-3">
        {STRATEGIES.map((s) => {
          const isEngine = s.id in ENGINE_PRESETS;
          const changesMath = s.id in SLEEVE_MATH;
          const selected = sleeve === s.id;
          const label = isEngine ? 'Set engine' : selected ? 'Remove' : sleeve ? 'Replace' : 'Use sleeve';
          return (
            <AccordionItem key={s.id} value={s.id} className="hairline-card border px-5">
              <div className="flex items-center gap-3">
                <AccordionTrigger className="flex-1 py-4 hover:no-underline">
                  <div className="flex flex-1 items-center gap-4 text-left">
                    {s.stat && (
                      <div className="hidden w-20 shrink-0 text-center sm:block">
                        <div className="font-num text-lg font-semibold stat-warm">{s.stat}</div>
                        <div className="text-[13.5px] leading-tight text-muted-foreground">{s.statLabel}</div>
                      </div>
                    )}
                    <div>
                      <div className="font-mono text-[14px] uppercase tracking-wider text-muted-foreground">{s.tag}</div>
                      <div className="font-display text-lg font-semibold leading-tight">{s.name}</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <button
                  type="button"
                  onClick={() => (isEngine ? onApplyEngine(s.id) : onSetSleeve(selected ? null : s.id))}
                  className={`mb-1 shrink-0 rounded-md border px-3 py-2 text-sm font-semibold cursor-pointer ${
                    selected ? 'border-destructive/40 text-destructive' : 'border-primary text-primary hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              </div>
              <AccordionContent className="pb-6">
                <p className="max-w-[70ch] text-[15px] leading-relaxed">{s.oneLiner}</p>
                {!isEngine && (
                  <p className="mt-2 text-[12.5px] font-medium text-muted-foreground">
                    {changesMath
                      ? 'Changes the math. Carves a slice of core out of Engine C and uses its own model growth and draw.'
                      : 'Does not change the three-engine math.'}
                  </p>
                )}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="font-mono text-[12.5px] uppercase tracking-wider stat-good">The tax magic</div>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.taxMagic}</p>
                  </div>
                  <div>
                    <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">Who qualifies</div>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.qualifies}</p>
                  </div>
                  <div>
                    <div className="font-mono text-[12.5px] uppercase tracking-wider text-destructive">Watch out</div>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.watchOut}</p>
                  </div>
                  <div>
                    <div className="font-mono text-[12.5px] uppercase tracking-wider stat-warm">How it plugs in</div>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.plugsIn}</p>
                  </div>
                </div>
                {COUNSEL_NOTES[s.id] && (
                  <p className="mt-4 max-w-[75ch] rounded-md border border-border bg-secondary/60 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
                    {COUNSEL_NOTES[s.id]}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Figures reflect 2026 law (including the 2025 tax act's QSBS, Opportunity Zone, and estate-exclusion changes) at summary level.
        Last verified: November 2026. Eligibility, diversification, and drafting requirements are fact-specific — subject to counsel review.
        This library is for understanding the menu, not ordering from it without your attorney and CPA.
      </p>
    </div>
  );
}
