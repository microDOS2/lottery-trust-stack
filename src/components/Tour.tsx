import { useEffect, useState } from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

export interface TourStep {
  view: string;
  selector?: string;
  title: string;
  text: string;
}

export const TOUR_STEPS: TourStep[] = [
  { view: 'calc', selector: '[data-tour="amount"]', title: 'Step 1 of 8 — Your prize', text: 'Type your cash amount here. Just exploring? The "Try a $100M example" button up top fills in a big round number so you can play.' },
  { view: 'calc', selector: '[data-tour="spend"]', title: 'Step 2 of 8 — Your yearly spend', text: 'How much you want to live on each year. The whole page checks one thing: can the money pay that, without running out?' },
  { view: 'calc', selector: '[data-tour="capacity"]', title: 'Step 3 of 8 — The number that matters', text: 'This is what the stack can safely pay you every year, tax-free. If your spending target is under it, the rest keeps compounding.' },
  { view: 'calc', selector: '[data-tour="saveA"]', title: 'Step 4 of 8 — Save this setup', text: 'Click Save as A. Now change the dial or the state and save B — nothing is locked in until you say so.' },
  { view: 'compare', title: 'Step 5 of 8 — Compare your setups', text: 'This tab puts every saved setup side by side: yearly cash, fees, the 25-year pile, and whether it ever runs dry. Charts included.' },
  { view: 'goals', selector: 'fieldset', title: 'Step 6 of 8 — A few plain questions', text: 'No financial jargon, no wrong answers. Just your life: where you want to live, what you worry about, who the money is for.' },
  { view: 'goals', selector: '[data-tour="result"]', title: 'Step 7 of 8 — The verdict', text: 'Finish the questions and this panel tells you which setup fits you best, in plain English, with the numbers to back it up.' },
  { view: 'calc', title: 'Step 8 of 8 — Make it yours', text: 'Edit any assumption, hide sections you do not need with "Customize sections", and use Download plan for a spreadsheet. That is the whole site.' },
];

interface Props {
  active: boolean;
  setView: (v: string) => void;
  onClose: () => void;
}

/** A small, friendly guided tour: highlights real elements and explains them in human speak. */
export default function Tour({ active, setView, onClose }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    const step = TOUR_STEPS[idx];
    setView(step.view);
    // Wait a tick for the view to render, then highlight the target.
    const t = window.setTimeout(() => {
      document.querySelectorAll('.tour-highlight').forEach((el) => el.classList.remove('tour-highlight'));
      if (step.selector) {
        const el = document.querySelector(step.selector);
        if (el) {
          el.classList.add('tour-highlight');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [active, idx, setView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!active) return null;
  const step = TOUR_STEPS[idx];

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 no-print">
      <div className="hairline-card w-full max-w-md border-primary/40 p-5 shadow-xl" role="dialog" aria-label="Site tour">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">{step.title}</h3>
          <button onClick={onClose} aria-label="Close tour" className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{step.text}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
          {idx < TOUR_STEPS.length - 1 ? (
            <button
              onClick={() => setIdx((i) => i + 1)}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground cursor-pointer"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button onClick={onClose} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground cursor-pointer">
              Done — I know my way around
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
