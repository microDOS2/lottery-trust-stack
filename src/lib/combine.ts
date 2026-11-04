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
    lines.push('More than one mix is on. Bonds, the policy, and stocks cannot each hold all of the money. The numbers blend the mixes you turned on. Turn one off if you want only that mix.');
  }
  if (chosen.includes('pr-act60') && chosen.includes('expatriation')) {
    lines.push('Puerto Rico keeps US citizenship. Giving up citizenship is a different life. Both are on. The investment result uses Puerto Rico. The exit tax is separate.');
  }
  if (chosen.includes('foreign-trust')) {
    lines.push('A foreign trust is on. For a US citizen it does not lower the US tax in these numbers. The other strategies still do whatever they do.');
  }
  if (chosen.includes('oz') && chosen.includes('leverage')) {
    lines.push('The opportunity-zone money is locked for ten years. A loan does not unlock it. Do not count that slice as something you can borrow against next year.');
  }
  return lines;
}

function nameOf(id: string): string {
  return STRATEGIES.find((s) => s.id === id)?.name ?? id;
}

export interface ComboView {
  result: StackResult;
  plain: StackResult;
  lines: string[];
  conflicts: string[];
}

export function describeCombo(inp: Inputs, asm: Assumptions): ComboView {
  const preview = previewInputs(inp);
  const result = computeStack(preview, asm);
  const plain = computeStack({ ...inp, chosen: [], strategyDollars: {} }, asm);
  const chosen = inp.chosen ?? [];
  const dollars = inp.strategyDollars ?? {};
  const lines: string[] = [];
  const dCash = result.capacity - plain.capacity;
  const dEnd = result.stackEnd - plain.stackEnd;
  lines.push(`With what you turned on: ${fmt(result.capacity)} a year, and ${fmt(result.stackEnd)} in 25 years. With none of the library turned on: ${fmt(plain.capacity)} a year, and ${fmt(plain.stackEnd)} in 25 years. That is ${fmt(Math.abs(dCash))} ${dCash >= 0 ? 'more' : 'less'} a year, and ${fmt(Math.abs(dEnd))} ${dEnd >= 0 ? 'more' : 'less'} in 25 years.`);

  for (const id of chosen) {
    lines.push(...effectLine(id, inp, result, dollars));
  }
  if (!chosen.length) lines.push('Nothing in the library is on. The numbers are only the cash, the spending, the debt, the home, and the business you already typed.');
  return { result, plain, lines, conflicts: conflicts(chosen) };
}

function effectLine(id: string, inp: Inputs, result: StackResult, dollars: Record<string, number>): string[] {
  const label = nameOf(id);
  if (id === 'engine-a' || id === 'engine-b' || id === 'engine-c') {
    const w = result.weights;
    const policy = id === 'engine-b' && result.ppli <= 0
      ? ` The policy is ${fmt(0)} because ${fmt(result.core)} is invested and the policy is only used from ${fmt(PPLI_QP_MIN)}.`
      : '';
    return [`${label} is on. The blend in these numbers is ${pct(w.a, 0)} bonds, ${pct(w.b, 0)} insurance, and ${pct(w.c, 0)} stocks.${policy}`];
  }
  if (id === 'oz' || id === 'qsbs' || id === 'real-estate') {
    const typed = Math.max(0, dollars[id] || 0);
    if (typed <= 0) return [`${label} is on, and the amount is ${fmt(0)}. Nothing has been taken out of the stocks yet. Type the dollars, or use the suggestion.`];
    const taken = Math.min(typed, result.sleeveAmount > 0 ? typed : 0);
    const extra = id === 'qsbs'
      ? ` The calculator grows that slice at ${pct(SLEEVE_MATH.qsbs.growth)} and pays ${pct(SLEEVE_MATH.qsbs.draw)} a year from it. A real startup can go to zero. That loss is not added on top.`
      : id === 'oz'
        ? ` That money stays locked for ten years in this description. The calculator grows it at ${pct(SLEEVE_MATH.oz.growth)} and pays ${pct(SLEEVE_MATH.oz.draw)} a year from it.`
        : ` The calculator grows that slice at ${pct(SLEEVE_MATH['real-estate'].growth)} and pays ${pct(SLEEVE_MATH['real-estate'].draw)} a year. A real building can sit empty. That loss is not added on top.`;
    return [`${label}: you accepted ${fmt(typed)}. ${fmt(Math.min(typed, taken || typed))} is the amount you set aside for it. If the stocks were smaller than that, only what was left moved.${extra}`];
  }
  if (id === 'charitable') {
    const typed = Math.max(0, dollars.charitable || 0);
    if (typed <= 0) return ['A charitable gift is on, and the amount is $0. Nothing is given until you type it.'];
    return [`You accepted a gift of ${fmt(typed)}. ${fmt(result.giftPaid)} of that is not invested. A deduction might lower the prize-year tax. This chart does not lower the tax. The yearly check and the pile are lower only because the gift is gone. At least 10% of a charitable remainder trust has to go to charity. That rule is not a dollar in this chart.`];
  }
  if (id === 'leverage') {
    const loan = Math.max(0, dollars.leverage || 0);
    if (loan <= 0) return ['Borrowing is on, and the loan is $0. The pile is unchanged until you type a loan.'];
    const hot = result.equity > 0 && loan > result.equity * 0.3;
    const loanLine = hot
      ? `The loan is more than 30% of the stocks (${fmt(result.equity)}). A drop can let the lender sell.`
      : `The stocks in this result are ${fmt(result.equity)}. If the loan climbs too high when stocks fall, the lender can sell.`;
    return [`You accepted a loan of ${fmt(loan)}. The pile is not sold, so the 25-year number does not drop by the loan. You still owe ${fmt(loan)}. This page does not guess the interest. ${loanLine}`];
  }
  if (id === 'legacy') {
    const over = Math.max(0, result.stackEnd - ESTATE_EXEMPTION);
    const tax = over * ESTATE_RATE;
    return [`The family trust is on. It does not move any money. In 25 years this result is ${fmt(result.stackEnd)}. The federal exclusion used here is ${fmt(ESTATE_EXEMPTION)} per person. The amount above that is ${fmt(over)}. At 40% that is ${fmt(tax)} if it is still in your estate when you die. The trust changes that only if a lawyer drafts it and you actually give the money away. That gift is irrevocable.`];
  }
  if (id === 'pr-act60') {
    return [`Puerto Rico is on in this result, not necessarily in the rest of the site until you use the combination. Later investment gains use the Puerto Rico path. The prize tax does not change. You would have to live there more than half the year. A mailing address does not count. The pile in this result is ${fmt(result.stackEnd)}.`];
  }
  if (id === 'foreign-trust') {
    return ['A foreign trust is on. The US tax saved in these numbers is $0. A US person who funds it and can benefit from it is taxed as if the trust were not there. It can matter for lawsuits. It does not raise the yearly check or the pile.'];
  }
  if (id === 'expatriation') {
    if (inp.assetValue <= 0) return ['Giving up citizenship is on. The exit tax cannot be calculated yet. Type what the assets would sell for today, and what you paid for them.'];
    const gain = Math.max(0, inp.assetValue - Math.max(0, inp.costBasis));
    const taxable = Math.max(0, gain - EXIT_EXCLUSION);
    const tax = taxable * EXIT_RATE;
    const covered = inp.assetValue >= COVERED_NET;
    const coveredLine = covered
      ? `That value is at or over ${fmt(COVERED_NET)}, so the covered-expatriate rules are the ones that apply here.`
      : `That value is under ${fmt(COVERED_NET)}. The covered-expatriate net-worth test is not met by this number alone. Other tests exist.`;
    return [`The assets would sell for ${fmt(inp.assetValue)}. You paid ${fmt(inp.costBasis)}. The gain is ${fmt(gain)}. ${coveredLine} The exclusion used here is ${fmt(EXIT_EXCLUSION)}. Tax at ${pct(EXIT_RATE)} on the gain above that is ${fmt(tax)}. This does not change the yearly check or the 25-year pile. Gifts to a US person after you leave can be taxed at 40%. That 40% is not in the ${fmt(tax)}.`];
  }
  return [`${label} is on.`];
}