import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

export function Stat({
  label, value, sub, tone = 'default',
}: { label: string; value: string; sub?: string; tone?: 'default' | 'good' | 'warm' }) {
  const toneCls = tone === 'good' ? 'stat-good' : tone === 'warm' ? 'stat-warm' : '';
  return (
    <div className="hairline-card p-4 md:p-5 transition-transform duration-150 hover:-translate-y-0.5">
      <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-num mt-1.5 text-xl md:text-2xl font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="mt-1 text-sm text-muted-foreground leading-snug">{sub}</div>}
    </div>
  );
}

export function Explainer({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="What does this mean?"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-primary transition-colors cursor-help"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] text-sm leading-relaxed" side="top">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Field({
  label, help, children,
}: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-foreground/90">{label}</span>
      {children}
      {help && <span className="mt-1 block text-[14px] leading-snug text-muted-foreground">{help}</span>}
    </label>
  );
}

export function SectionTitle({ num, title, blurb }: { num: string; title: ReactNode; blurb?: string }) {
  return (
    <div className="mb-5">
      <div className="eyebrow"><span className="eyebrow-num">{num}</span></div>
      <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-balance">{title}</h2>
      {blurb && <p className="mt-2 max-w-[68ch] text-[15px] text-muted-foreground">{blurb}</p>}
    </div>
  );
}
