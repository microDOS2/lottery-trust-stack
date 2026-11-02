import { federalTax, stateByCode, STD_DEDUCTION_2026, type Filing } from './taxdata';

export const fmt = (n: number, digits = 0): string =>
  '$' + n.toLocaleString(undefined, { maximumFractionDigits: digits });

export const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

export const pct = (n: number, digits = 1): string => `${(n * 100).toFixed(digits)}%`;

export type Mode = 'balanced' | 'income' | 'growth' | 'manual';
export type Residency = 'stay' | 'second' | 'move' | 'pr';
export type Basis = 'gross' | 'net';

export interface Inputs {
  state: string;
  target: string;
  basis: Basis;
  amount: number;
  spend: number;
  entity4: number;
  mode: Mode;
  residency: Residency;
  filing: Filing;
  prFiling: 'pre2027' | 'post2026';   // Act 38-2026: file by Dec 31 2026 → 0% to 2035; later → 4% to 2055
  preMoveGains: number;               // unrealized gains held before the PR move
  preMoveWindow: 'within10' | 'after10'; // when pre-move gains are realized
  dial: number; // 0 = max compounding, 100 = max tax-free income
  manual: { a: number; b: number; c: number }; // fractions summing to 1
}

export interface Assumptions {
  muniYield: number;   // tax-free coupon yield on the AAA/AA muni ladder
  ppliGrowth: number;  // net growth inside the PPLI separate account
  ppliDraw: number;    // tax-free draw rate (withdrawals to basis + policy loans)
  eqGrowth: number;    // nominal growth of direct-indexed equities
  eqDraw: number;      // tax-efficient draw (basis + harvested losses + box spreads)
  divYield: number;    // equity dividend yield (taxed annually in the taxable baseline)
  ltcgRate: number;    // federal LTCG 20% + NIIT 3.8%
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  muniYield: 0.0425,
  ppliGrowth: 0.085,
  ppliDraw: 0.065,
  eqGrowth: 0.09,
  eqDraw: 0.045,
  divYield: 0.015,
  ltcgRate: 0.238,
};

export const DEFAULT_INPUTS: Inputs = {
  state: 'CO',
  target: 'WY',
  basis: 'gross',
  amount: 18_000_000,
  spend: 400_000,
  entity4: 0,
  mode: 'balanced',
  residency: 'stay',
  filing: 'single',
  prFiling: 'pre2027',
  preMoveGains: 0,
  preMoveWindow: 'within10',
  dial: 50,
  manual: { a: 0.25, b: 0.25, c: 0.5 },
};

export const PPLI_QP_MIN = 5_000_000;      // Qualified Purchaser threshold (investable assets)
export const PPLI_PREMIUM_MIN = 2_500_000; // typical carrier minimum premium

export interface Weights { a: number; b: number; c: number }

/** Resolve engine weights from mode / dial / manual, enforcing PPLI minimums and safety floors. */
export function resolveWeights(inp: Inputs, core: number): Weights {
  if (inp.mode === 'manual') {
    const { a, b, c } = inp.manual;
    const t = a + b + c || 1;
    return { a: a / t, b: b / t, c: c / t };
  }
  const qpOk = core >= PPLI_QP_MIN;
  // Presets: growth → balanced → income
  const growth: Weights = { a: 0.2, b: 0.25, c: 0.55 };
  const balanced: Weights = { a: 0.25, b: 0.25, c: 0.5 };
  const income: Weights = { a: 0.4, b: 0.35, c: 0.25 };
  const d = Math.max(0, Math.min(100, inp.dial)) / 100;
  const lerp = (x: Weights, y: Weights, t: number): Weights => ({
    a: x.a + (y.a - x.a) * t,
    b: x.b + (y.b - x.b) * t,
    c: x.c + (y.c - x.c) * t,
  });
  let w = d <= 0.5 ? lerp(growth, balanced, d * 2) : lerp(balanced, income, (d - 0.5) * 2);
  if (!qpOk) w = { ...w, b: 0 };
  else if (w.b > 0 && w.b * core < PPLI_PREMIUM_MIN) w = { ...w, b: PPLI_PREMIUM_MIN / core };
  // Floors/caps: keep diversification sane
  w = { ...w, a: Math.min(0.55, Math.max(0.15, w.a)), c: Math.min(0.6, Math.max(0.2, w.c)) };
  const t = w.a + w.b + w.c;
  return { a: w.a / t, b: w.b / t, c: w.c / t };
}

/** State rate applied to future unshielded investment income. */
export function futureStateRate(inp: Inputs): number {
  const st = stateByCode(inp.state);
  const tg = stateByCode(inp.target);
  if (inp.residency === 'pr') return 0; // PR replaces the state picture; federal handled via prRate
  if (inp.residency === 'stay') return st.rate;
  if (inp.residency === 'second' && !tg.noTax) return st.rate; // second-home mode against a taxed target keeps exposure
  return tg.rate;
}

/** Solve gross prize from a target after-tax pool (fixed-point via bisection). */
export function grossFromNet(net: number, stateRate: number, filing: Filing): number {
  if (net <= 0) return 0;
  const std = STD_DEDUCTION_2026[filing];
  const netOf = (g: number) => g - federalTax(g, filing) - stateRate * Math.max(0, g - std);
  let lo = net;
  let hi = net / Math.max(0.2, 1 - 0.37 - stateRate) * 1.2 + 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (netOf(mid) < net) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface ProjectionRow {
  year: number;
  begin: number;
  cash: number;
  growth: number;
  end: number;
}

export interface StackResult {
  prMode: boolean;
  prRate: number;
  preMoveGainsTax: number;
  gross: number;
  fedTax: number;
  stateTax: number;
  withheld: number;
  net: number;
  yr1Reserve: number;
  core: number;
  weights: Weights;
  muni: number;
  ppli: number;
  equity: number;
  annualFree: number;       // year-1 tax-free cash from engines
  blendedDraw: number;
  futureStateRate: number;
  sustainable: boolean;
  requiredCore: number;
  qpOk: boolean;
  projection: ProjectionRow[];      // 25 years, stack
  baseline: ProjectionRow[];        // 25 years, plain taxable account
  stackEnd: number;
  baselineEnd: number;
  advantage: number;                // stackEnd - baselineEnd
  cumCash: number;
}

export function computeStack(inp: Inputs, asm: Assumptions): StackResult {
  const st = stateByCode(inp.state);
  const std = STD_DEDUCTION_2026[inp.filing];
  const fsr = futureStateRate(inp);
  const prMode = inp.residency === 'pr';
  const prRate = prMode ? (inp.prFiling === 'pre2027' ? 0 : 0.04) : 0;
  const prizeStateRate = st.lotteryExempt ? 0 : st.rate;

  let gross: number, fed: number, stx: number, withheld: number, net: number;
  if (inp.basis === 'gross') {
    gross = Math.max(0, inp.amount);
    withheld = 0.24 * gross + (st.wh || 0) * gross;
    fed = federalTax(gross, inp.filing);
    stx = prizeStateRate * Math.max(0, gross - std);
    net = gross - fed - stx;
  } else {
    net = Math.max(0, inp.amount);
    gross = grossFromNet(net, prizeStateRate, inp.filing);
    fed = federalTax(gross, inp.filing);
    stx = prizeStateRate * Math.max(0, gross - std);
    withheld = 0.24 * gross + (st.wh || 0) * gross;
  }

  const yr1Reserve = inp.spend + 60_000;
  const core = Math.max(0, net - yr1Reserve - inp.entity4);
  const qpOk = core >= PPLI_QP_MIN;
  const w = resolveWeights(inp, core);

  const muni = core * w.a;
  const ppli = core * w.b;
  const equity = core * w.c;

  // Muni interest is federal-tax-free; in 'stay' mode we assume in-state bonds → state-free too.
  const annualFree = muni * asm.muniYield + ppli * asm.ppliDraw + equity * asm.eqDraw;
  const blendedDraw = core > 0 ? annualFree / core : 0;
  // Each engine's total pre-tax return; draws are funded out of that return, the rest compounds.
  const blendedGross = w.a * asm.muniYield + w.b * asm.ppliGrowth + w.c * asm.eqGrowth;

  const sustainable = inp.spend <= annualFree + 1e-9;
  const requiredCore = blendedDraw > 0 ? inp.spend / blendedDraw : Infinity;

  const projection: ProjectionRow[] = [];
  let bal = core;
  for (let y = 1; y <= 25; y++) {
    const begin = bal;
    const cash = begin * blendedDraw;       // tax-free draw, funded from total return
    const growth = begin * blendedGross;    // full engine return for the year
    bal = begin + growth - cash;            // what isn't drawn keeps compounding
    projection.push({ year: y, begin, cash, growth, end: bal });
  }

  // Taxable baseline: SAME engines, SAME pre-tax returns, same net cash taken each year —
  // but with no tax shielding. Interest is taxed at ordinary rates, dividends at LTCG+NIIT+state
  // every year, and each withdrawal is grossed up by the tax on its gain portion (the gain share
  // rises as the account compounds). This isolates what the structure itself is worth.
  const ordRate = 0.37 + fsr;             // US-source interest stays federal even for PR residents
  const baseline: ProjectionRow[] = [];
  let bbal = core;
  const divDrag = asm.ltcgRate + fsr;       // US-source dividends stay federal (23.8%) even in PR
  const gainDrag = prMode ? prRate : asm.ltcgRate + fsr; // PR removes federal tax on post-move gains
  let cumCash = 0;
  for (let y = 1; y <= 25; y++) {
    const begin = bbal;
    const netCashWanted = projection[y - 1].cash;
    cumCash += netCashWanted;
    const intTax = begin * w.a * asm.muniYield * ordRate;   // taxable-bond interest, ordinary rates
    const divTax = begin * w.c * asm.divYield * divDrag;    // equity dividends, annually
    const gainShare = begin > 0 ? Math.min(0.95, Math.max(0, 1 - core / begin)) : 0;
    const grossW = netCashWanted / Math.max(0.05, 1 - gainShare * gainDrag);
    const growth = begin * blendedGross;
    bbal = begin + growth - intTax - divTax - grossW;
    if (bbal < 0) bbal = 0;
    baseline.push({ year: y, begin, cash: grossW, growth, end: bbal });
  }

  const stackEnd = projection[24]?.end ?? 0;
  const baselineEnd = baseline[24]?.end ?? 0;

  const preMoveGainsTax = prMode
    ? inp.preMoveGains * (inp.preMoveWindow === 'within10' ? asm.ltcgRate : 0.05)
    : 0;

  return {
    prMode, prRate, preMoveGainsTax,
    gross, fedTax: fed, stateTax: stx, withheld, net, yr1Reserve, core,
    weights: w, muni, ppli, equity, annualFree, blendedDraw,
    futureStateRate: fsr, sustainable, requiredCore, qpOk,
    projection, baseline, stackEnd, baselineEnd, advantage: stackEnd - baselineEnd, cumCash,
  };
}

// ---------- Annuity vs Lump Sum ----------

export interface AnnuityInputs {
  advertised: number;   // advertised jackpot
  cashRatio: number;    // cash option as fraction of advertised (Powerball ≈ 0.45–0.50)
  years: number;        // annuity term (Powerball = 30)
  escalator: number;    // annual payment growth (Powerball = 5%)
  state: string;
  filing: Filing;
  investReturn: number; // after-tax reinvestment return for annuity path / stack growth for lump path
}

export interface AnnuityResult {
  firstPayment: number;
  totalPayments: number;
  annuityTaxes: number;
  annuityEnd: number;   // FV of after-tax payments invested
  lumpGross: number;
  lumpNet: number;
  lumpTaxes: number;
  lumpEnd: number;      // FV of lump after 30 yrs
  winner: 'annuity' | 'lump';
  diff: number;
  yearly: Array<{ year: number; annuityFV: number; lumpFV: number; payment: number }>;
}

export function computeAnnuity(a: AnnuityInputs): AnnuityResult {
  const st = stateByCode(a.state);
  const stateRate = st.lotteryExempt ? 0 : st.rate;
  const n = Math.max(1, Math.round(a.years));
  const e = a.escalator;
  const g = a.investReturn;

  // Payments graduate at the escalator and sum to the advertised jackpot.
  const first = e === 0 ? a.advertised / n : (a.advertised * e) / (Math.pow(1 + e, n) - 1);

  let annuityFV = 0;
  let annuityTaxes = 0;
  let total = 0;
  const yearly: AnnuityResult['yearly'] = [];
  const lumpGross = a.advertised * a.cashRatio;
  const lumpTaxes = federalTax(lumpGross, a.filing) + stateRate * Math.max(0, lumpGross - STD_DEDUCTION_2026[a.filing]);
  const lumpNet = lumpGross - lumpTaxes;
  const lumpEnd = lumpNet * Math.pow(1 + g, n);

  for (let k = 0; k < n; k++) {
    const pay = first * Math.pow(1 + e, k);
    total += pay;
    // Large recurring payments land near the top federal bracket; use flat 37% + state.
    const tax = pay * (0.37 + stateRate);
    annuityTaxes += tax;
    annuityFV = (annuityFV + (pay - tax)) * (1 + g); // invested at year-end
    yearly.push({
      year: k + 1,
      annuityFV,
      lumpFV: lumpNet * Math.pow(1 + g, k + 1),
      payment: pay,
    });
  }

  return {
    firstPayment: first,
    totalPayments: total,
    annuityTaxes,
    annuityEnd: annuityFV,
    lumpGross,
    lumpNet,
    lumpTaxes,
    lumpEnd,
    winner: annuityFV > lumpEnd ? 'annuity' : 'lump',
    diff: Math.abs(annuityFV - lumpEnd),
    yearly,
  };
}
