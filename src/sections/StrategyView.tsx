import { STRATEGIES } from '../lib/content';
import { SectionTitle } from '../components/widgets';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function StrategyView() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SectionTitle
        num="03"
        title={<>The strategy <span className="sig-italic">library</span></>}
        blurb="Every option for tax-free income and long-term compounding, in plain English — what it is, how the tax magic works, who qualifies, and where it plugs into your 4-entity stack."
      />

      <Accordion type="single" collapsible className="space-y-3">
        {STRATEGIES.map((s) => (
          <AccordionItem key={s.id} value={s.id} className="hairline-card border px-5">
            <AccordionTrigger className="py-4 hover:no-underline">
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
            <AccordionContent className="pb-6">
              <p className="max-w-[70ch] text-[15px] leading-relaxed">{s.oneLiner}</p>
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
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Figures reflect 2026 law (including the 2025 tax act's QSBS, Opportunity Zone, and estate-exclusion changes) at summary level.
        Eligibility, diversification, and drafting requirements are fact-specific — this library is for understanding the menu, not ordering from it without your attorney and CPA.
      </p>
    </div>
  );
}
