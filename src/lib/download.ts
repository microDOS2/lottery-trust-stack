import type { Assumptions, Inputs, StackResult } from './calc';

export const SCENARIO_LETTERS = 'ABCDE';

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export interface SavedScenario {
  name: string;
  result?: { net: number; core: number; capacity: number; stackEnd: number; alloc: string };
}

/** Downloads the numbers on screen, plus any saved scenarios, as a spreadsheet. */
export function downloadPlan(inp: Inputs, asm: Assumptions, r: StackResult, scenarios: (SavedScenario | null)[]) {
  const lines: string[] = ['record,c1,c2,c3,c4,c5,c6,c7'];
  const meta = (k: string, v: string | number) => lines.push(['meta', csvCell(k), csvCell(v), '', '', '', '', ''].join(','));
  meta('state', inp.state);
  meta('target', inp.target);
  meta('basis', inp.basis);
  meta('amount', inp.amount);
  meta('spend', inp.spend);
  meta('debt', inp.debt);
  meta('home', inp.entity4);
  meta('business', inp.venture);
  meta('rental', inp.rental);
  meta('gift', inp.gift);
  meta('setup_cost', inp.setupCost);
  meta('yearly_fees', inp.annualAdmin);
  meta('residency', inp.residency);
  meta('filing', inp.filing);
  meta('mode', inp.mode);
  meta('federal_tax', Math.round(r.fedTax));
  meta('state_tax', Math.round(r.stateTax));
  meta('net', Math.round(r.net));
  meta('core', Math.round(r.core));
  meta('muni', Math.round(r.muni));
  meta('ppli', Math.round(r.ppli));
  meta('equity_after_carve', Math.round(r.equity));
  meta('sleeve', r.sleeveId ?? '');
  meta('sleeve_amount', Math.round(r.sleeveAmount));
  meta('weights_abc', `${Math.round(r.weights.a * 100)}/${Math.round(r.weights.b * 100)}/${Math.round(r.weights.c * 100)}`);
  meta('fees_year_1', Math.round(r.projection[0]?.fees ?? 0));
  meta('muni_yield', asm.muniYield);
  meta('ppli_growth', asm.ppliGrowth);
  meta('ppli_draw', asm.ppliDraw);
  meta('equity_growth', asm.eqGrowth);
  meta('equity_draw', asm.eqDraw);
  meta('inflation', asm.inflation);
  scenarios.forEach((s, i) => {
    if (!s?.result) return;
    lines.push(['scenario', SCENARIO_LETTERS[i], csvCell(s.name), Math.round(s.result.net), Math.round(s.result.core), csvCell(s.result.alloc), Math.round(s.result.capacity), Math.round(s.result.stackEnd)].join(','));
  });
  lines.push('year,stack_begin,cash_to_you,reinvested,fees,growth,stack_end,baseline_end');
  r.projection.forEach((row, i) => {
    const base = r.baseline[i];
    lines.push([row.year, Math.round(row.begin), Math.round(row.cash), Math.round(row.reinvested), Math.round(row.fees), Math.round(row.growth), Math.round(row.end), Math.round(base?.end ?? 0)].join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lottery-trust-stack-plan.csv';
  a.click();
  URL.revokeObjectURL(url);
}
