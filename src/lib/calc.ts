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
  debt: number;         // paid from the after-tax cash before anything is invested
  entity4: number;
  setupCost: number;    // one-time legal/professional setup of the stack (year 1)
  annualAdmin: number;  // ongoing trustee, carrier, CPA, registered-agent fees
  mode: Mode;
  residency: Residency;
  filing: Filing;
  prFiling: 'pre2027' | 'post2026';   // Act 38-2026: file by Dec 31 2026 → 0% to 2035; later → 4% to 2055
  preMoveGains: number;               // unrealized gains held before the PR move
  preMoveWindow: 'within10' | 'after10'; // when pre-move gains are realized
  dial: number; // 0 = max compounding, 100 = max tax-free income
  manual: { a: number; b: number; c: number }; // fractions summing to 1
  drawOverrides: Record<number, number>; // year (1-25) -> custom tax-free draw; overrides the spend target
  flatDraw: boolean; // true = same dollar amount every year (no inflation growth)
  sleeve: string | null; // one optional library item; a new choice replaces the old one
  sleevePct: number;   // fraction of core carved from Engine C when the sleeve has model rates
}

export interface Assumptions {
  muniYield: number;   // tax-free coupon yield on the AAA/AA muni ladder
  ppliGrowth: number;  // net growth inside the PPLI separate account (after insurance charges)
  ppliDraw: number;    // sustainable tax-free draw capacity (withdrawals to basis + policy loans)
  eqGrowth: number;    // nominal growth of direct-indexed equities
  eqDraw: number;      // tax-efficient draw capacity (basis + harvested losses + box spreads)
  divYield: number;    // equity dividend yield (taxed annually in the taxable baseline)
  ltcgRate: number;    // federal LTCG 20% + NIIT 3.8%
  inflation: number;   // spending target grows at this rate; also powers the "today's dollars" view
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  muniYield: 0.04,
  ppliGrowth: 0.062,
  ppliDraw: 0.045,
  eqGrowth: 0.07,
  eqDraw: 0.035,
  divYield: 0.015,
  ltcgRate: 0.238,
  inflation: 0.025,
};

/** Shipped before November 2026. Kept so a saved copy of these exact rates can be moved to the middle. */
export const LEGACY_ASSUMPTIONS: Assumptions = {
  muniYield: 0.0425,
  ppliGrowth: 0.085,
  ppliDraw: 0.065,
  eqGrowth: 0.09,
  eqDraw: 0.045,
  divYield: 0.015,
  ltcgRate: 0.238,
  inflation: 0.025,
};

export const DEFAULT_INPUTS: Inputs = {
  state: 'CO',
  target: 'WY',
  basis: 'gross',
  amount: 0,
  spend: 400_000,
  debt: 0,
  entity4: 0,
  setupCost: 75_000,
  annualAdmin: 25_000,
  mode: 'balanced',
  residency: 'stay',
  filing: 'single',
  prFiling: 'pre2027',
  preMoveGains: 0,
  preMoveWindow: 'within10',
  dial: 50,
  manual: { a: 0.25, b: 0.25, c: 0.5 },
  drawOverrides: {},
  flatDraw: false,
  sleeve: null,
  sleevePct: 0.08,
};

export const PPLI_QP_MIN = 5_000_000;      // Qualified Purchaser threshold (investable assets)
export const PPLI_PREMIUM_MIN = 2_500_000; // typical carrier minimum premium
export const SLEEVE_PCT_MAX = 0.25;

/** Investment sleeves carved from Engine C. Rates are model assumptions, not forecasts.
 *  Other library items are labels only and are absent from this map. */
export const SLEEVE_MATH: Record<string, { growth: number; draw: number; div: number }> = {
  oz: { growth: 0.06, draw: 0, div: 0 },
  qsbs: { growth: 0.04, draw: 0, div: 0 },
  'real-estate': { growth: 0.03, draw: 0.04, div: 0.04 },
};

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
  cash: number;       // to you, after engine distributions
  reinvested: number; // surplus swept back into the growth engine
  growth: number;     // engine appreciation for the year
  fees: number;       // annual admin/professional drag (stack only)
  capacity: number;   // that year's sustainable tax-free capacity (coupons + draw capacity)
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
  debtPaid: number;
  yr1Reserve: number;
  core: number;
  weights: Weights;
  muni: number;
  ppli: number;
  equity: number;           // Engine C after the sleeve carve-out
  sleeveId: string | null;
  sleeveAmount: number;     // dollars moved from Engine C; 0 when the sleeve has no model rates
  capacity: number;         // max tax-free cash the engines can pay per year (NOT a forced draw)
  plannedDrawY2: number;    // first planned draw — year 2, after the seasoning year
  reinvestY2: number;       // capacity beyond the planned draw in year 2
  blendedDraw: number;      // capacity / core
  futureStateRate: number;
  sustainable: boolean;
  requiredCore: number;
  qpOk: boolean;
  depletedYear: number | null;
  baselineDepletedYear: number | null;
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

  const yr1Reserve = inp.spend + inp.setupCost;
  const debtPaid = Math.min(Math.max(0, net), Math.max(0, inp.debt || 0));
  const core = Math.max(0, net - debtPaid - yr1Reserve - inp.entity4);
  const qpOk = core >= PPLI_QP_MIN;
  const w = resolveWeights(inp, core);

  const muni = core * w.a;
  const ppli = core * w.b;
  const equityGross = core * w.c;
  const sleeveSpec = inp.sleeve ? SLEEVE_MATH[inp.sleeve] : undefined;
  const sleevePct = Math.max(0, Math.min(SLEEVE_PCT_MAX, inp.sleevePct ?? 0));
  const sleeveAmount = sleeveSpec ? Math.min(equityGross, sleevePct * core) : 0;
  const equity = equityGross - sleeveAmount;

  // Muni interest is federal-tax-free; in 'stay' mode we assume in-state bonds → state-free too.
  // `capacity` is what the engines COULD pay tax-free each year — it is a ceiling, not a forced draw.
  const capacity = muni * asm.muniYield + ppli * asm.ppliDraw + equity * asm.eqDraw + sleeveAmount * (sleeveSpec?.draw ?? 0);
  const blendedDraw = core > 0 ? capacity / core : 0;

  const sustainable = inp.spend <= capacity + 1e-9;
  const requiredCore = blendedDraw > 0 ? inp.spend / blendedDraw : Infinity;

  // ---- Stack projection ----
  // Year 1 is the seasoning year: no draws, coupons reinvested. From year 2 you draw only your
  // (inflation-adjusted) spending target. Muni coupons arrive automatically; draws beyond coupons
  // come from PPLI, equities, and the sleeve in proportion to their draw capacity; a spending
  // shortfall dips into principal (equities, then the sleeve, then PPLI). Surplus coupons sweep
  // into the equity engine.
  const projection: ProjectionRow[] = [];
  let muniB = muni, ppliB = ppli, eqB = equity, slB = sleeveAmount;
  let cumCash = 0;
  let depletedYear: number | null = null;
  let plannedDrawY2 = 0;
  let reinvestY2 = 0;
  const slGrowth = sleeveSpec?.growth ?? 0;
  const slDrawRate = sleeveSpec?.draw ?? 0;

  for (let y = 1; y <= 25; y++) {
    const begin = muniB + ppliB + eqB + slB;
    if (begin <= 0) {
      projection.push({ year: y, begin: 0, cash: 0, reinvested: 0, growth: 0, fees: 0, capacity: 0, end: 0 });
      if (depletedYear === null) depletedYear = y;
      continue;
    }
    const coupons = muniB * asm.muniYield;
    const ppliCap = ppliB * asm.ppliDraw;
    const eqCap = eqB * asm.eqDraw;
    const slCap = slB * slDrawRate;
    const discCap = ppliCap + eqCap + slCap;
    const desired = y === 1 ? 0 : (inp.drawOverrides[y] ?? (inp.flatDraw ? inp.spend : inp.spend * Math.pow(1 + asm.inflation, y - 2)));

    let ppliDrawAmt = 0;
    let eqDrawAmt = 0;
    let slDrawAmt = 0;
    const need = Math.max(0, desired - coupons);
    if (need <= discCap) {
      ppliDrawAmt = discCap > 0 ? (need * ppliCap) / discCap : 0;
      eqDrawAmt = discCap > 0 ? (need * eqCap) / discCap : 0;
      slDrawAmt = discCap > 0 ? (need * slCap) / discCap : 0;
    } else {
      ppliDrawAmt = ppliCap;
      eqDrawAmt = eqCap;
      slDrawAmt = slCap;
      let extra = need - discCap;
      const eqRoom = Math.max(0, eqB * (1 + asm.eqGrowth) - eqDrawAmt);
      const takeEq = Math.min(extra, eqRoom);
      eqDrawAmt += takeEq; extra -= takeEq;
      const slRoom = Math.max(0, slB * (1 + slGrowth) - slDrawAmt);
      const takeSl = Math.min(extra, slRoom);
      slDrawAmt += takeSl; extra -= takeSl;
      const ppliRoom = Math.max(0, ppliB * (1 + asm.ppliGrowth) - ppliDrawAmt);
      const takePpli = Math.min(extra, ppliRoom);
      ppliDrawAmt += takePpli; extra -= takePpli;
      if (extra > 1 && depletedYear === null) depletedYear = y;
    }

    const outTotal = coupons + ppliDrawAmt + eqDrawAmt + slDrawAmt;
    const cash = Math.min(desired, outTotal);
    const reinvested = outTotal - cash;

    let newMuni = muniB;
    let newPpli = Math.max(0, ppliB * (1 + asm.ppliGrowth) - ppliDrawAmt);
    let newSl = Math.max(0, slB * (1 + slGrowth) - slDrawAmt);
    let newEq = Math.max(0, eqB * (1 + asm.eqGrowth) - eqDrawAmt + reinvested);
    const growth = ppliB * asm.ppliGrowth + eqB * asm.eqGrowth + slB * slGrowth;

    let fees = inp.annualAdmin * Math.pow(1 + asm.inflation, y - 1);
    const fromEq = Math.min(fees, newEq); newEq -= fromEq; fees -= fromEq;
    const fromSl = Math.min(fees, newSl); newSl -= fromSl; fees -= fromSl;
    const fromPpli = Math.min(fees, newPpli); newPpli -= fromPpli; fees -= fromPpli;
    const fromMuni = Math.min(fees, newMuni); newMuni -= fromMuni; fees -= fromMuni;
    const feesPaid = inp.annualAdmin * Math.pow(1 + asm.inflation, y - 1) - fees;

    const end = newMuni + newPpli + newEq + newSl;
    if (end <= 0 && depletedYear === null) depletedYear = y;

    projection.push({ year: y, begin, cash, reinvested, growth, fees: feesPaid, capacity: coupons + ppliCap + eqCap + slCap, end });
    cumCash += cash;
    if (y === 2) { plannedDrawY2 = cash; reinvestY2 = reinvested; }
    muniB = newMuni; ppliB = newPpli; eqB = newEq; slB = newSl;
  }

  // ---- Taxable baseline ----
  // Same engines, same pre-tax returns, same cash to you each year — but unshielded.
  // Interest is taxed at ordinary rates and dividends at LTCG+NIIT+state annually;
  // any shortfall is covered by selling appreciated assets, grossed up for the tax on gains.
  const ordRate = 0.37 + fsr;             // US-source interest stays federal even for PR residents
  const divDrag = asm.ltcgRate + fsr;     // US-source dividends stay federal (23.8%) even in PR
  const gainDrag = prMode ? prRate : asm.ltcgRate + fsr; // PR removes federal tax on post-move gains
  const baseline: ProjectionRow[] = [];
  let bal = core;
  let baselineDepletedYear: number | null = null;

  for (let y = 1; y <= 25; y++) {
    const begin = bal;
    if (begin <= 0) {
      baseline.push({ year: y, begin: 0, cash: 0, reinvested: 0, growth: 0, fees: 0, capacity: 0, end: 0 });
      if (baselineDepletedYear === null) baselineDepletedYear = y;
      continue;
    }
    const desired = y === 1 ? 0 : (inp.drawOverrides[y] ?? (inp.flatDraw ? inp.spend : inp.spend * Math.pow(1 + asm.inflation, y - 2)));
    const slW = core > 0 ? sleeveAmount / core : 0;
    const eqW = Math.max(0, w.c - slW);
    const interestNet = begin * w.a * asm.muniYield * (1 - ordRate);
    const divNet = begin * eqW * asm.divYield * (1 - divDrag);
    const sleeveCash = begin * slW * (sleeveSpec?.div ?? 0) * (1 - ordRate);
    const autoNet = interestNet + divNet + sleeveCash;
    const surplus = Math.max(0, autoNet - desired);
    const need = Math.max(0, desired - autoNet);
    const gainShare = Math.min(0.95, Math.max(0, 1 - core / begin));
    let grossW = need > 0 ? need / Math.max(0.05, 1 - gainShare * gainDrag) : 0;
    grossW = Math.min(grossW, begin); // can't sell more than you have
    const cash = Math.min(desired, autoNet + grossW * (1 - gainShare * gainDrag));
    const appreciation = begin * (w.b * asm.ppliGrowth + eqW * asm.eqGrowth + slW * (sleeveSpec?.growth ?? 0));
    const end = Math.max(0, begin + appreciation + surplus - grossW);
    if (end <= 0 && baselineDepletedYear === null) baselineDepletedYear = y;
    baseline.push({ year: y, begin, cash, reinvested: surplus, growth: appreciation, fees: 0, capacity: 0, end });
    bal = end;
  }

  const stackEnd = projection[24]?.end ?? 0;
  const baselineEnd = baseline[24]?.end ?? 0;

  const preMoveGainsTax = prMode
    ? inp.preMoveGains * (inp.preMoveWindow === 'within10' ? asm.ltcgRate : 0.05)
    : 0;

  return {
    prMode, prRate, preMoveGainsTax,
    gross, fedTax: fed, stateTax: stx, withheld, net, debtPaid, yr1Reserve, core,
    weights: w, muni, ppli, equity, sleeveId: inp.sleeve ?? null, sleeveAmount,
    capacity, plannedDrawY2, reinvestY2, blendedDraw,
    futureStateRate: fsr, sustainable, requiredCore, qpOk,
    depletedYear, baselineDepletedYear,
    projection, baseline, stackEnd, baselineEnd, advantage: stackEnd - baselineEnd, cumCash,
  };
}

// ---------- Annuity vs Lump Sum ----------

export interface AnnuityInputs {
  advertised: number;   // advertised jackpot (sum of the annuity checks)
  cash?: number;        // lump sum before tax, typed directly. Wins over the ratio.
  cashRatio: number;    // used only when cash is blank: cash option as a fraction of advertised
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
  const lumpGross = a.cash != null ? a.cash : a.advertised * a.cashRatio;
  const lumpTaxes = federalTax(lumpGross, a.filing) + stateRate * Math.max(0, lumpGross - STD_DEDUCTION_2026[a.filing]);
  const lumpNet = lumpGross - lumpTaxes;
  const lumpEnd = lumpNet * Math.pow(1 + g, n);

  for (let k = 0; k < n; k++) {
    const pay = first * Math.pow(1 + e, k);
    total += pay;
    // Tax that year's check on 2026 brackets (plus the state's top rate above the standard deduction).
    // A flat 37% overstates tax on smaller checks and understates nothing on jackpot-sized ones.
    const tax = federalTax(pay, a.filing) + stateRate * Math.max(0, pay - STD_DEDUCTION_2026[a.filing]);
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
