// 2026 tax data — top marginal state rates verified against Tax Foundation / EY 2026 updates.
// Withholding rates are approximations of state lottery/prize withholding; always verify with the state DOR.
export interface StateInfo {
  code: string;
  name: string;
  rate: number; // 2026 top marginal individual income tax rate
  wh: number;   // approximate lottery withholding rate
  noTax: boolean;
  lotteryExempt?: boolean;
}

export const STATES: StateInfo[] = [
  { code: 'AL', name: 'Alabama', rate: 0.05, wh: 0.0, noTax: false },
  { code: 'AK', name: 'Alaska', rate: 0.0, wh: 0.0, noTax: true },
  { code: 'AZ', name: 'Arizona', rate: 0.025, wh: 0.025, noTax: false },
  { code: 'AR', name: 'Arkansas', rate: 0.037, wh: 0.037, noTax: false },
  { code: 'CA', name: 'California', rate: 0.133, wh: 0.0, noTax: false, lotteryExempt: true },
  { code: 'CO', name: 'Colorado', rate: 0.044, wh: 0.04, noTax: false },
  { code: 'CT', name: 'Connecticut', rate: 0.0699, wh: 0.0699, noTax: false },
  { code: 'DE', name: 'Delaware', rate: 0.066, wh: 0.0, noTax: false },
  { code: 'DC', name: 'District of Columbia', rate: 0.1075, wh: 0.085, noTax: false },
  { code: 'FL', name: 'Florida', rate: 0.0, wh: 0.0, noTax: true },
  { code: 'GA', name: 'Georgia', rate: 0.0499, wh: 0.0499, noTax: false },
  { code: 'HI', name: 'Hawaii', rate: 0.11, wh: 0.0, noTax: false },
  { code: 'ID', name: 'Idaho', rate: 0.053, wh: 0.053, noTax: false },
  { code: 'IL', name: 'Illinois', rate: 0.0495, wh: 0.0495, noTax: false },
  { code: 'IN', name: 'Indiana', rate: 0.0295, wh: 0.0295, noTax: false },
  { code: 'IA', name: 'Iowa', rate: 0.038, wh: 0.038, noTax: false },
  { code: 'KS', name: 'Kansas', rate: 0.0558, wh: 0.05, noTax: false },
  { code: 'KY', name: 'Kentucky', rate: 0.035, wh: 0.035, noTax: false },
  { code: 'LA', name: 'Louisiana', rate: 0.03, wh: 0.03, noTax: false },
  { code: 'ME', name: 'Maine', rate: 0.0915, wh: 0.05, noTax: false },
  { code: 'MD', name: 'Maryland', rate: 0.065, wh: 0.0895, noTax: false },
  { code: 'MA', name: 'Massachusetts', rate: 0.09, wh: 0.05, noTax: false },
  { code: 'MI', name: 'Michigan', rate: 0.0425, wh: 0.0425, noTax: false },
  { code: 'MN', name: 'Minnesota', rate: 0.0985, wh: 0.0725, noTax: false },
  { code: 'MS', name: 'Mississippi', rate: 0.04, wh: 0.04, noTax: false },
  { code: 'MO', name: 'Missouri', rate: 0.047, wh: 0.047, noTax: false },
  { code: 'MT', name: 'Montana', rate: 0.0565, wh: 0.0565, noTax: false },
  { code: 'NE', name: 'Nebraska', rate: 0.0455, wh: 0.0455, noTax: false },
  { code: 'NV', name: 'Nevada', rate: 0.0, wh: 0.0, noTax: true },
  { code: 'NH', name: 'New Hampshire', rate: 0.0, wh: 0.0, noTax: true },
  { code: 'NJ', name: 'New Jersey', rate: 0.1075, wh: 0.08, noTax: false },
  { code: 'NM', name: 'New Mexico', rate: 0.059, wh: 0.059, noTax: false },
  { code: 'NY', name: 'New York', rate: 0.109, wh: 0.0882, noTax: false },
  { code: 'NC', name: 'North Carolina', rate: 0.0399, wh: 0.0399, noTax: false },
  { code: 'ND', name: 'North Dakota', rate: 0.025, wh: 0.025, noTax: false },
  { code: 'OH', name: 'Ohio', rate: 0.0275, wh: 0.0275, noTax: false },
  { code: 'OK', name: 'Oklahoma', rate: 0.045, wh: 0.045, noTax: false },
  { code: 'OR', name: 'Oregon', rate: 0.099, wh: 0.08, noTax: false },
  { code: 'PA', name: 'Pennsylvania', rate: 0.0307, wh: 0.0307, noTax: false },
  { code: 'RI', name: 'Rhode Island', rate: 0.0599, wh: 0.0599, noTax: false },
  { code: 'SC', name: 'South Carolina', rate: 0.0521, wh: 0.0521, noTax: false },
  { code: 'SD', name: 'South Dakota', rate: 0.0, wh: 0.0, noTax: true },
  { code: 'TN', name: 'Tennessee', rate: 0.0, wh: 0.0, noTax: true },
  { code: 'TX', name: 'Texas', rate: 0.0, wh: 0.0, noTax: true },
  { code: 'UT', name: 'Utah', rate: 0.045, wh: 0.0, noTax: false },
  { code: 'VT', name: 'Vermont', rate: 0.0875, wh: 0.06, noTax: false },
  { code: 'VA', name: 'Virginia', rate: 0.0575, wh: 0.04, noTax: false },
  { code: 'WA', name: 'Washington', rate: 0.0, wh: 0.0, noTax: true },
  { code: 'WV', name: 'West Virginia', rate: 0.0482, wh: 0.0458, noTax: false },
  { code: 'WI', name: 'Wisconsin', rate: 0.0765, wh: 0.0765, noTax: false },
  { code: 'WY', name: 'Wyoming', rate: 0.0, wh: 0.0, noTax: true },
];

export const stateByCode = (code: string): StateInfo =>
  STATES.find((s) => s.code === code) ?? STATES[0];

// 2026 federal brackets (Rev. Proc. 2025-32 era figures)
const BRACKETS_SINGLE: Array<[number, number]> = [
  [12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24],
  [256225, 0.32], [640600, 0.35], [Infinity, 0.37],
];
const BRACKETS_MFJ: Array<[number, number]> = [
  [24800, 0.1], [100800, 0.12], [211400, 0.22], [403550, 0.24],
  [512450, 0.32], [768700, 0.35], [Infinity, 0.37],
];

export const STD_DEDUCTION_2026 = { single: 16100, mfj: 32200 } as const;

export type Filing = keyof typeof STD_DEDUCTION_2026;

export function federalTax(taxable: number, filing: Filing): number {
  const brackets = filing === 'mfj' ? BRACKETS_MFJ : BRACKETS_SINGLE;
  let remaining = Math.max(0, taxable - STD_DEDUCTION_2026[filing]);
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of brackets) {
    const band = Math.min(remaining, limit - prev);
    if (band > 0) tax += band * rate;
    remaining -= band;
    prev = limit;
    if (remaining <= 0) break;
  }
  return tax;
}

// 2026 federal estate & gift exclusion (OBBBA): $15M per person, top rate 40%
export const ESTATE_EXEMPTION_2026 = 15_000_000;
export const ESTATE_TOP_RATE = 0.4;
