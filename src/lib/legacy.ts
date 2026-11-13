// Plain-English estate & legacy math for a lottery winner.
// Federal-only approximations under 2026 law. State estate/inheritance taxes,
// portability elections, and trusts drafted by a real attorney are out of scope.

import type { Filing } from './taxdata';

/** 2026 federal estate & gift tax exclusion, per filing status. */
export const FEDERAL_ESTATE_EXCLUSION: Record<Filing, number> = {
  single: 15_000_000,
  mfj: 30_000_000,
};

/** Flat federal estate tax rate on the amount above the exclusion. */
export const ESTATE_TAX_RATE = 0.4;

/** Annual gift-tax exclusion per recipient (approx, 2025–26). */
export const ANNUAL_GIFT_EXCLUSION = 19_000;

/** Top federal ordinary income bracket — where a jackpot winner lands. */
export const TOP_MARGINAL_RATE = 0.37;

/** Charitable deduction ceilings as a share of adjusted gross income. */
export const CASH_AGI_LIMIT = 0.6;
export const APPRECIATED_AGI_LIMIT = 0.3;

/** Years an unused charitable deduction can be carried forward. */
export const CARRYFORWARD_YEARS = 5;

export interface StateEstateNote {
  code: string;
  name: string;
  exemption: number;
}

/**
 * Approximate state-level estate/inheritance tax exemptions — these states can
 * tax an estate that is far below the federal line. Rounded 2026 figures.
 */
export const STATE_ESTATE_TAXES: StateEstateNote[] = [
  { code: 'OR', name: 'Oregon', exemption: 1_000_000 },
  { code: 'MA', name: 'Massachusetts', exemption: 2_000_000 },
  { code: 'WA', name: 'Washington', exemption: 3_000_000 },
  { code: 'IL', name: 'Illinois', exemption: 4_000_000 },
  { code: 'NY', name: 'New York', exemption: 7_350_000 },
  { code: 'CT', name: 'Connecticut', exemption: 15_000_000 },
];

// ---------------------------------------------------------------------------
// 1. Death-year estate tax readout
// ---------------------------------------------------------------------------

export interface EstateTaxReadout {
  estate: number;     // projected estate at death
  exclusion: number;  // federal exclusion for the filing status
  excess: number;     // amount above the exclusion
  tax: number;        // 40% of the excess
  covered: boolean;   // true when the whole estate fits under the exclusion
}

export function estateTaxReadout(estate: number, filing: Filing): EstateTaxReadout {
  const exclusion = FEDERAL_ESTATE_EXCLUSION[filing];
  const safeEstate = Math.max(0, estate);
  const excess = Math.max(0, safeEstate - exclusion);
  return {
    estate: safeEstate,
    exclusion,
    excess,
    tax: excess * ESTATE_TAX_RATE,
    covered: excess <= 0,
  };
}

// ---------------------------------------------------------------------------
// 2. Annual-exclusion gifting scheduler
// ---------------------------------------------------------------------------

export interface GiftingPlan {
  years: number;          // gifting window
  perPerson: number;      // annual exclusion per recipient
  recipients: number;     // people receiving gifts
  annualGift: number;     // total moved per year
  totalGifted: number;    // sum of all gifts, no growth
  futureValue: number;    // what those gifts grow to inside the trust
  growth: number;         // futureValue - totalGifted
  estateTaxAvoided: number; // 40% of what would have been over the exclusion
}

export function giftingPlan(opts: {
  recipients: number;
  years?: number;       // default 25
  growthRate?: number;  // default 7%
  estate: number;       // projected estate at the end of the window
  exclusion: number;    // federal exclusion to test against
}): GiftingPlan {
  const years = Math.max(1, Math.round(opts.years ?? 25));
  const growthRate = opts.growthRate ?? 0.07;
  const perPerson = ANNUAL_GIFT_EXCLUSION;
  const recipients = Math.max(1, Math.round(opts.recipients));
  const annualGift = perPerson * recipients;
  const totalGifted = annualGift * years;
  // Gifts are made at the start of each year, so each gets a full year of growth.
  const futureValue =
    annualGift * ((Math.pow(1 + growthRate, years) - 1) / growthRate) * (1 + growthRate);
  const growth = Math.max(0, futureValue - totalGifted);
  // Money (and its growth) sitting outside the estate escapes the 40% tax —
  // but only up to the amount that would actually have been over the line.
  const overLine = Math.max(0, opts.estate - opts.exclusion);
  const estateTaxAvoided = ESTATE_TAX_RATE * Math.min(futureValue, overLine);
  return { years, perPerson, recipients, annualGift, totalGifted, futureValue, growth, estateTaxAvoided };
}

// ---------------------------------------------------------------------------
// 3. Charitable bunching calculator
// ---------------------------------------------------------------------------

export type GiftAssetType = 'cash' | 'appreciated';

export interface CharitableBunching {
  gift: number;            // one-time gift in the win year
  agi: number;             // adjusted gross income used for the limits
  assetType: GiftAssetType;
  rate: number;            // marginal rate the deduction saves tax at
  limitPct: number;        // 60% cash / 30% appreciated
  limit: number;           // AGI ceiling in dollars
  deductibleNow: number;   // part of the gift deductible this year
  savedNow: number;        // federal tax saved this year
  carriedForward: number;  // excess deductible over the next 5 years
  carryYears: number;
}

export function charitableBunching(opts: {
  gift: number;
  agi: number;
  assetType?: GiftAssetType;
  marginalRate?: number;
}): CharitableBunching {
  const gift = Math.max(0, opts.gift);
  const agi = Math.max(0, opts.agi);
  const assetType = opts.assetType ?? 'cash';
  const rate = opts.marginalRate ?? TOP_MARGINAL_RATE;
  const limitPct = assetType === 'cash' ? CASH_AGI_LIMIT : APPRECIATED_AGI_LIMIT;
  const limit = agi * limitPct;
  const deductibleNow = Math.min(gift, limit);
  const carriedForward = Math.max(0, gift - deductibleNow);
  return {
    gift,
    agi,
    assetType,
    rate,
    limitPct,
    limit,
    deductibleNow,
    savedNow: deductibleNow * rate,
    carriedForward,
    carryYears: CARRYFORWARD_YEARS,
  };
}
