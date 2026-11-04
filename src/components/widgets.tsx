import type { ReactElement, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useExplain } from '../explainNav';

function MoreLink({ more }: { more?: string }) {
  const open = useExplain();
  if (!more) return null;
  return (
    <button type="button" onClick={() => open(more)} className="mt-2 block text-left text-[13px] font-medium text-primary underline cursor-pointer">
      Open in a new tab
    </button>
  );
}

export function Tip({ text, more, children }: { text: string; more?: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-[260px] text-left text-[13px] leading-relaxed" side="top">
        {text}
        <MoreLink more={more} />
      </TooltipContent>
    </Tooltip>
  );
}

export function Stat({
  label, value, sub, tone = 'default', tip, more,
}: { label: string; value: string; sub?: string; tone?: 'default' | 'good' | 'warm'; tip?: string; more?: string }) {
  const toneCls = tone === 'good' ? 'stat-good' : tone === 'warm' ? 'stat-warm' : '';
  return (
    <div className="hairline-card p-4 md:p-5 transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
        {tip && <Explainer text={tip} more={more} />}
      </div>
      <div className={`font-num mt-1.5 text-xl md:text-2xl font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="mt-1 text-sm text-muted-foreground leading-snug">{sub}</div>}
    </div>
  );
}

export function Explainer({ text, more }: { text: string; more?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="What does this mean?"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 hover:text-primary transition-colors cursor-help"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-sm leading-relaxed" side="top">
        {text}
        <MoreLink more={more} />
      </TooltipContent>
    </Tooltip>
  );
}

export function Field({
  label, help, tip, more, children,
}: { label: string; help?: string; tip?: string; more?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium text-foreground/90">
        {label}
        {tip && <Explainer text={tip} more={more} />}
      </span>
      {children}
      {help && <span className="mt-1 block text-[14px] leading-snug text-muted-foreground">{help}</span>}
    </label>
  );
}

export function Limit({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-md border border-gold/60 bg-[hsl(var(--gold-tint))] px-3 py-2 text-[15px] font-medium leading-snug text-[hsl(var(--espresso-soft))]">
      {children}
    </p>
  );
}

export function SectionTitle({ num, title, blurb }: { num: string; title: ReactNode; blurb?: string }) {
  return (
    <div className="mb-6">
      <div className="eyebrow mb-1"><span className="eyebrow-num">{num}</span></div>
      <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-balance">{title}</h2>
      {blurb && <p className="mt-3 max-w-[68ch] text-[15px] text-muted-foreground">{blurb}</p>}
    </div>
  );
}
