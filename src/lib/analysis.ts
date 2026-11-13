/**
 * Analysis math for the Analysis view: a one-at-a-time sensitivity ("tornado") scan
 * and a simplified Monte Carlo fan. Both reuse computeStack / its conventions so the
 * numbers line up with the rest of the app. The Monte Carlo loop is deliberately a
 * simplified copy of the stack projection (no sleeve carve-out, no tax on principal
 * dips) — that is disclosed in the UI.
 */
import {
  AVG_PPLI_FEE_RATE,
  HORIZON,
  computeStack,
  drawForYear,
  solveSpendForTarget,
  type Assumptions,
  type Inputs,
} from './calc';

// ---------- Sensitivity ("tornado") ----------

export const TORNADO_DELTA = 0.015; // ±1.5 percentage points on each rate

export interface TornadoRow {
  key: keyof Assumptions;
  label: string;      // plain-English name, e.g. "Stock growth"
  lowEnd: number;     // ending balance with the rate 1.5pp lower
  highEnd: number;    // ending balance with the rate 1.5pp higher
  lowSafe: number;    // safe-to-take per year with the rate lower
  highSafe: number;   // safe-to-take per year with the rate higher
  swingEnd: number;   // |highEnd - lowEnd|
  swingSafe: number;  // |highSafe - lowSafe|
}

export interface SensitivityResult {
  rows: TornadoRow[]; // sorted, biggest ending-balance swing first
  baseEnd: number;
  baseSafe: number;
  top: TornadoRow | null;
}

const TORNADO_SPECS: Array<{ key: keyof Assumptions; label: string }> = [
  { key: 'muniYield', label: 'Muni yield' },
  { key: 'ppliGrowth', label: 'Insurance growth' },
  { key: 'ppliDraw', label: 'Insurance draw' },
  { key: 'eqGrowth', label: 'Stock growth' },
  { key: 'eqDraw', label: 'Stock draw' },
  { key: 'inflation', label: 'Inflation' },
  { key: 'ltcgRate', label: 'Tax on gains' },
];

/** Safe-to-take = the flat yearly draw that spends the stack down to ~$0 at the horizon. */
function safeToTake(inp: Inputs, asm: Assumptions): number {
  return solveSpendForTarget(inp, asm, 0);
}

export function runSensitivity(inp: Inputs, asm: Assumptions, delta: number = TORNADO_DELTA): SensitivityResult {
  const base = computeStack(inp, asm);
  const baseEnd = base.stackEnd;
  const baseSafe = safeToTake(inp, asm);

  const rows: TornadoRow[] = TORNADO_SPECS.map(({ key, label }) => {
    const lowAsm = { ...asm, [key]: asm[key] - delta };
    const highAsm = { ...asm, [key]: asm[key] + delta };
    const lowEnd = computeStack(inp, lowAsm).stackEnd;
    const highEnd = computeStack(inp, highAsm).stackEnd;
    const lowSafe = safeToTake(inp, lowAsm);
    const highSafe = safeToTake(inp, highAsm);
    return {
      key, label,
      lowEnd, highEnd, lowSafe, highSafe,
      swingEnd: Math.abs(highEnd - lowEnd),
      swingSafe: Math.abs(highSafe - lowSafe),
    };
  }).sort((a, b) => b.swingEnd - a.swingEnd);

  return { rows, baseEnd, baseSafe, top: rows[0] ?? null };
}

// ---------- Monte Carlo fan ----------

export const MC_TRIALS = 250;
export const MC_EQ_SD = 0.16;   // yearly stock growth standard deviation
export const MC_MUNI_SD = 0.05; // yearly muni yield standard deviation
const MC_SEED = 20260613;       // fixed seed so the fan doesn't reshuffle on every render

export interface McRow {
  year: number;
  p10: number; // bad case: only 10% of trials ended the year below this
  p50: number; // typical (median)
  p90: number; // good case: only 10% of trials ended the year above this
}

export interface MonteCarloResult {
  rows: McRow[];      // years 0..HORIZON
  survival: number;   // share of trials with money left at the horizon (0..1)
  trials: number;
  startCore: number;
}

/** Deterministic PRNG (mulberry32) so results are stable between renders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box–Muller. */
function normal(rng: () => number): number {
  const u = Math.max(1e-12, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[i];
}

/**
 * Simplified 30-year Monte Carlo. Starting balances and weights come from a real
 * computeStack run; each trial then replays the engine loop with that year's stock
 * growth drawn from Normal(eqGrowth, 0.16) and the muni yield from Normal(muniYield, 0.05)
 * (muni yield floored at 0). Simplifications vs. the main model, disclosed in the UI:
 * the sleeve carve-out is folded into equities, principal-dip taxes are skipped, and
 * PPLI growth stays at its fixed rate. Year 1 stays a seasoning year (no draw).
 */
export function runMonteCarlo(inp: Inputs, asm: Assumptions, trials: number = MC_TRIALS): MonteCarloResult {
  const base = computeStack(inp, asm);
  const startCore = base.core;
  const empty = { rows: [], survival: 0, trials: 0, startCore };
  if (startCore <= 0 || trials <= 0) return empty;

  const rng = mulberry32(MC_SEED);
  // ends[t][y] = total balance at end of year y for trial t (index 0 = start)
  const ends: number[][] = [];

  for (let t = 0; t < trials; t++) {
    let muniB = base.muni;
    let ppliB = base.ppli;
    let eqB = base.equity + base.sleeveAmount; // sleeve folded into equities (disclosed)
    const path: number[] = [muniB + ppliB + eqB];

    for (let y = 1; y <= HORIZON; y++) {
      const begin = muniB + ppliB + eqB;
      if (begin <= 0) { path.push(0); continue; }

      const eqRate = asm.eqGrowth + MC_EQ_SD * normal(rng);
      const muniRate = Math.max(0, asm.muniYield + MC_MUNI_SD * normal(rng));

      const coupons = muniB * muniRate;
      const ppliCap = ppliB * asm.ppliDraw;
      const eqCap = eqB * asm.eqDraw;
      const discCap = ppliCap + eqCap;
      const desired = y === 1 && inp.drawOverrides[y] == null ? 0 : drawForYear(inp, asm, y);

      let ppliDrawAmt = 0;
      let eqDrawAmt = 0;
      let muniExtra = 0;
      const need = Math.max(0, desired - coupons);
      if (need <= discCap) {
        ppliDrawAmt = discCap > 0 ? (need * ppliCap) / discCap : 0;
        eqDrawAmt = discCap > 0 ? (need * eqCap) / discCap : 0;
      } else {
        ppliDrawAmt = ppliCap;
        eqDrawAmt = eqCap;
        let extra = need - discCap;
        const takeEq = Math.min(extra, Math.max(0, eqB * (1 + eqRate) - eqDrawAmt));
        eqDrawAmt += takeEq; extra -= takeEq;
        const takePpli = Math.min(extra, Math.max(0, ppliB * (1 + asm.ppliGrowth) - ppliDrawAmt));
        ppliDrawAmt += takePpli; extra -= takePpli;
        muniExtra = Math.min(extra, muniB);
      }

      const outTotal = coupons + ppliDrawAmt + eqDrawAmt + muniExtra;
      const cash = Math.min(desired, outTotal);
      const reinvested = outTotal - cash;

      const newMuni = Math.max(0, muniB - muniExtra);
      let newPpli = Math.max(0, ppliB * (1 + asm.ppliGrowth) - ppliDrawAmt);
      let newEq = Math.max(0, eqB * (1 + eqRate) - eqDrawAmt + reinvested);

      // Same fee drag as the main model: typed admin + insurance charge, or the average
      // PPLI fee rate when no dollar charge was typed.
      const inflate = Math.pow(1 + asm.inflation, y - 1);
      const typedIns = (inp.ppliFee || 0) > 0;
      let fees = (inp.annualAdmin ?? 0) * inflate + (typedIns ? inp.ppliFee * inflate : newPpli * AVG_PPLI_FEE_RATE);
      const fromPpli = Math.min(fees, newPpli); newPpli -= fromPpli; fees -= fromPpli;
      const fromEq = Math.min(fees, newEq); newEq -= fromEq;

      muniB = newMuni; ppliB = newPpli; eqB = newEq;
      path.push(muniB + ppliB + eqB);
    }
    ends.push(path);
  }

  const rows: McRow[] = [];
  for (let y = 0; y <= HORIZON; y++) {
    const col = ends.map((p) => p[y]).sort((a, b) => a - b);
    rows.push({ year: y, p10: percentile(col, 0.1), p50: percentile(col, 0.5), p90: percentile(col, 0.9) });
  }
  const survived = ends.filter((p) => p[HORIZON] > 0).length;
  return { rows, survival: survived / trials, trials, startCore };
}
