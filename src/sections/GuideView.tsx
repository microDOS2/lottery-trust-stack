import { GUIDE_STEPS, GLOSSARY } from '../lib/content';
import { SectionTitle } from '../components/widgets';
import { FlowDiagram } from '../components/viz';

export function GuideView() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <SectionTitle
        num="05"
        title={<>The first year, <span className="sig-italic">step by step</span></>}
        blurb="From 'I won' to 'the stack pays me tax-free every month.' The sequence matters as much as the pieces."
      />

      <div className="hairline-card p-5">
        <FlowDiagram compact />
      </div>

      <ol className="relative space-y-0">
        {GUIDE_STEPS.map((s, i) => (
          <li key={i} className="relative flex gap-5 pb-8 last:pb-0">
            {i < GUIDE_STEPS.length - 1 && (
              <span className="absolute left-[15px] top-10 h-full w-px bg-border" aria-hidden />
            )}
            <span className="font-num z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[14px] font-semibold text-accent-foreground">
              {i + 1}
            </span>
            <div className="pt-0.5">
              <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">{s.phase}</div>
              <h3 className="font-display mt-0.5 text-xl font-semibold">{s.title}</h3>
              <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GlossaryView() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SectionTitle
        num="06"
        title={<>Plain-English <span className="sig-italic">glossary</span></>}
        blurb="Every term on this site, translated. If a word sounds like it was invented to bill you more, the translation is here."
      />
      <dl className="grid gap-3 md:grid-cols-2">
        {GLOSSARY.map((g) => (
          <div key={g.term} className="hairline-card p-4">
            <dt className="font-display text-[15px] font-semibold">{g.term}</dt>
            <dd className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{g.def}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
