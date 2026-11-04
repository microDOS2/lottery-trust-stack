import { STRATEGIES, ENGINE_PRESETS } from './content';
import { computeStack, fmt, pct, PPLI_QP_MIN, SLEEVE_MATH, type Assumptions, type Inputs, type StackResult } from './calc';

export const ESTATE_EXEMPTION = 15_000_000;
export const ESTATE_RATE = 0.4;
export const EXIT_EXCLUSION = 910_000;
export const EXIT_RATE = 0.238;
export const COVERED_NET = 2_000_000;

const ENGINES = ['engine-a', 'engine-b', 'engine-c'] as const;

export const COMBOS: Array<{ name: string; why: string; ids: string[] }> = [
  { name: 'Steadier check', why: 'Turns on bonds.', ids: ['engine-a'] },
  { name: 'Larger pile', why: 'Turns on stocks.', ids: ['engine-c'] },
  { name: 'Bonds and stocks', why: 'Turns on both. The numbers blend the two mixes.', ids: ['engine-a', 'engine-c'] },
  { name: 'Insurance policy', why: 'Turns on the policy.', ids: ['engine-b'] },
  { name: 'Puerto Rico', why: 'Shows the result if you live there.', ids: ['pr-act60'] },
  { name: 'Family trust', why: 'Shows the estate-tax size. It does not move the money.', ids: ['legacy'] },
  { name: 'Rental', why: 'Turns on real estate. You still type the dollars.', ids: ['real-estate'] },
  { name: 'Startup stock', why: 'Turns on startup stock. You still type the dollars.', ids: ['qsbs'] },
  { name: 'Opportunity zone', why: 'Turns on the ten-year lockup. You still type the dollars.', ids: ['oz'] },
  { name: 'Gift', why: 'Turns on a charitable gift. You still type the dollars.', ids: ['charitable'] },
  { name: 'Borrow', why: 'Turns on a loan. You still type the dollars. The pile is not sold.', ids: ['leverage'] },
  { name: 'Foreign trust', why: 'Shows that this does not lower US tax.', ids: ['foreign-trust'] },
  { name: 'Give up citizenship', why: 'Asks what the assets would sell for, and what you paid.', ids: ['expatriation'] },
];

export function needsDollars(id: string): boolean {
  return id === 'oz' || id === 'qsbs' || id === 'real-estate' || id === 'charitable' || id === 'leverage';
}

export function suggestion(id: string, core: number): { amount: number; note: string } | null {
  if (core <= 0) return null;
  if (id === 'oz' || id === 'qsbs' || id === 'real-estate') {
    return { amount: Math.round(core * 0.1), note: '10% of the invested money. Nothing is taken until you use this amount.' };
  }
  if (id === 'leverage') {
    return { amount: Math.round(core * 0.25), note: '25% of the invested money. That is a warning line, not a recommendation. Nothing is borrowed until you use this amount.' };
  }
  return null;
}

export function previewInputs(inp: Inputs): Inputs {
  const chosen = inp.chosen ?? [];
  const engines = ENGINES.filter((id) => chosen.includes(id));
  let next: Inputs = { ...inp, manual: { ...inp.manual }, strategyDollars: { ...(inp.strategyDollars ?? {}) }, chosen: [...chosen] };
  if (engines.length) {
    const acc = { a: 0, b: 0, c: 0 };
    for (const id of engines) {
      acc.a += ENGINE_PRESETS[id].a;
      acc.b += ENGINE_PRESETS[id].b;
      acc.c += ENGINE_PRESETS[id].c;
    }
    next = { ...next, mode: 'manual', manual: { a: acc.a / engines.length, b: acc.b / engines.length, c: acc.c / engines.length } };
  }
  if (chosen.includes('pr-act60')) next = { ...next, residency: 'pr' };
  return next;
}

export function conflicts(chosen: string[]): string[] {
  const lines: string[] = [];
  const engines = ENGINES.filter((id) => chosen.includes(id));
  if (engines.length > 1) {
    lines.push('More than one investment mix is on. The numbers average them. Turn one off if you want only that mix.');
  }
  if (chosen.includes('pr-act60') && chosen.includes('expatriation')) {
    lines.push('Puerto Rico and giving up citizenship are both on. They are different lives. The investment numbers use Puerto Rico. The exit tax is separate.');
  }
  if (chosen.includes('oz') && chosen.includes('leverage')) {
    lines.push('Opportunity-zone money is locked for ten years. A loan does not free it.');
  }
  return lines;
}

function nameOf(id: string): string {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

export interface ComboSection {
  heading: string;
  lines: string[];
}

export interface ComboView {
  result: StackResult;
  plain: StackResult;
  sections: ComboSection[];
  conflicts: string[];
}

export function describeCombo(inp: Inputs, asm: Assumptions): ComboView {
  const preview = previewInputs(inp);
  const result = computeStack(preview, asm);
  const plain = computeStack({ ...inp, chosen: [], strategyDollars: {} }, asm);
  const chosen = inp.chosen ?? [];
  const dollars = inp.strategyDollars ?? {};
  const sections: ComboSection[] = [];

  const dCash = result.capacity - plain.capacity;
  const dEnd = result.stackEnd - plain.stackEnd;
  sections.push({
    heading: 'The numbers',
    lines: [
      `With these on: ${fmt(result.capacity)} a year, and ${fmt(result.stackEnd)} in 25 years.`,
      `With none of the library on: ${fmt(plain.capacity)} a year, and ${fmt(plain.stackEnd)} in 25 years.`,
      `Difference: ${fmt(Math.abs(dCash))} ${dCash >= 0 ? 'more' : 'less'} a year, and ${fmt(Math.abs(dEnd))} ${dEnd >= 0 ? 'more' : 'less'} in 25 years.`,
    ],
  });

  const engines = ENGINES.filter((id) => chosen.includes(id));
  if (engines.length) {
    const w = result.weights;
    const names = engines.map(nameOf).join(', ');
    const policy = engines.includes('engine-b') && result.ppli <= 0
      ? ` The policy is ${fmt(0)} because ${fmt(result.core)} is invested and the policy starts at ${fmt(PPLI_QP_MIN)}.`
      : '';
    sections.push({
      heading: 'How the money is split',
      lines: [`${names} ${engines.length > 1 ? 'are' : 'is'} on. The blend is ${pct(w.a, 0)} bonds, ${pct(w.b, 0)} insurance, and ${pct(w.c, 0)} stocks.${policy}`],
    });
  }

  const money: string[] = [];
  for (const id of ['oz', 'qsbs', 'real-estate', 'charitable', 'leverage'] as const) {
    if (!chosen.includes(id)) continue;
    money.push(...moneyLine(id, result, dollars));
  }
  if (money.length) sections.push({ heading: 'Money you set aside or borrowed', lines: money });

  const other: string[] = [];
  if (chosen.includes('legacy')) {
    const over = Math.max(0, result.stackEnd - ESTATE_EXEMPTION);
    const tax = over * ESTATE_RATE;
    other.push(`Family trust is on. It does not move money. In 25 years the pile is ${fmt(result.stackEnd)}. The federal exclusion used here is ${fmt(ESTATE_EXEMPTION)} per person. Above that is ${fmt(over)}. At 40% that is ${fmt(tax)} if it is still in your estate when you die. A trust changes that only if a lawyer drafts it and you actually give the money away.`);
  }
  if (chosen.includes('pr-act60')) {
    other.push(`Puerto Rico is on in these numbers. Later investment gains use that path. The prize tax does not change. You would have to live there more than half the year. A mailing address does not count. The pile here is ${fmt(result.stackEnd)}.`);
  }
  if (chosen.includes('foreign-trust')) {
    other.push('Foreign trust is on. The US tax saved in these numbers is $0. A US person who funds it and can benefit from it is taxed as if the trust were not there. It can matter for lawsuits. It does not raise the yearly check or the pile.');
  }
  if (chosen.includes('expatriation')) {
    other.push(...exitLine(inp));
  }
  if (other.length) sections.push({ heading: 'Other things that are on', lines: other });

  if (!chosen.length) {
    sections.push({ heading: 'Nothing on', lines: ['Nothing in the library is on. The numbers are only the cash, the spending, the debt, the home, and the business you already typed.'] });
  }

  return { result, plain, sections, conflicts: conflicts(chosen) };
}

function moneyLine(id: string, result: StackResult, dollars: Record<string, number>): string[] {
  const label = nameOf(id);
  const typed = Math.max(0, dollars[id] || 0);
  if (id === 'oz' || id === 'qsbs' || id === 'real-estate') {
    if (typed <= 0) return [`${label}: $0. Nothing is taken from the stocks until you type an amount.`];
    const extra = id === 'qsbs'
      ? ` Grown at ${pct(SLEEVE_MATH.qsbs.growth)}, paying ${pct(SLEEVE_MATH.qsbs.draw)} a year. A real startup can go to zero. That loss is not added.`
      : id === 'oz'
        ? ` Locked for ten years. Grown at ${pct(SLEEVE_MATH.oz.growth)}, paying ${pct(SLEEVE_MATH.oz.draw)} a year.`
        : ` Grown at ${pct(SLEEVE_MATH['real-estate'].growth)}, paying ${pct(SLEEVE_MATH['real-estate'].draw)} a year. A real building can sit empty. That loss is not added.`;
    return [`${label}: ${fmt(typed)}.${extra}`];
  }
  if (id === 'charitable') {
    if (typed <= 0) return ['Charitable gift: $0. Nothing is given until you type it.'];
    return [`Charitable gift: ${fmt(typed)}. ${fmt(result.giftPaid)} is not invested. The chart does not lower the prize tax for this. The yearly check and the pile are lower only because the gift is gone.`];
  }
  if (id === 'leverage') {
    if (typed <= 0) return ['Borrowing: $0. The pile is unchanged until you type a loan.'];
    const hot = result.equity > 0 && typed > result.equity * 0.3;
    const warn = hot
      ? ` The loan is more than 30% of the stocks (${fmt(result.equity)}). A drop can let the lender sell.`
      : ` The stocks in this result are ${fmt(result.equity)}. If the loan climbs too high when stocks fall, the lender can sell.`;
    return [`Borrowing: ${fmt(typed)}. The pile is not sold, so the 25-year number does not drop by the loan. You still owe ${fmt(typed)}. This page does not guess the interest.${warn}`];
  }
  return [];
}

function exitLine(inp: Inputs): string[] {
  if (inp.assetValue <= 0) return ['Giving up citizenship: type what the assets would sell for today, and what you paid for them. The exit tax cannot be calculated yet.'];
  const gain = Math.max(0, inp.assetValue - Math.max(0, inp.costBasis));
  const taxable = Math.max(0, gain - EXIT_EXCLUSION);
  const tax = taxable * EXIT_RATE;
  const covered = inp.assetValue >= COVERED_NET;
  const coveredLine = covered
    ? `That value is at or over ${fmt(COVERED_NET)}, so the covered-expatriate rules apply here.`
    : `That value is under ${fmt(COVERED_NET)}. The net-worth test is not met by this number alone.`;
  return [`Giving up citizenship: assets would sell for ${fmt(inp.assetValue)}, you paid ${fmt(inp.costBasis)}, gain is ${fmt(gain)}. ${coveredLine} Exclusion used is ${fmt(EXIT_EXCLUSION)}. Tax at ${pct(EXIT_RATE)} on the gain above that is ${fmt(tax)}. This does not change the yearly check or the 25-year pile. Gifts to a US person after you leave can be taxed at 40%. That is not in the ${fmt(tax)}.`];
}
