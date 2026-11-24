import type { Assumptions } from './calc';

export const ASSUMPTION_REVIEW_DATE = 'November 24, 2026';

/** Latest human-reviewed model set. The update button installs this packaged set; it is not a live feed. */
export const REVIEWED_ASSUMPTIONS: Assumptions = {
  muniYield: 0.04,
  ppliGrowth: 0.067,
  ppliDraw: 0.045,
  eqGrowth: 0.067,
  eqDraw: 0.035,
  divYield: 0.017,
  ltcgRate: 0.238,
  inflation: 0.025,
};

export interface AssumptionSource {
  key: keyof Assumptions;
  label: string;
  editable: boolean;
  basis: string;
  asOf: string;
  links: Array<{ label: string; url: string }>;
}

const JPM_URL = 'https://am.jpmorgan.com/us/en/asset-management/institutional/about-us/media/press-releases/jp-morgan-releases-2026-long-term-capital-market-assumptions/';
const JPM_DETAIL_URL = 'https://www.jpmorgan.com/insights/markets-and-economy/top-market-takeaways/tmt-october-twenty-four-twenty-five';

export const ASSUMPTION_SOURCES: AssumptionSource[] = [
  {
    key: 'muniYield', label: 'Muni yield', editable: true,
    basis: 'A conservative 4.0% ladder assumption. Dated AAA market tables showed a 3.40% 10-year and 4.85% 30-year yield; the model rounds below the 10–30-year range rather than treating any bond as guaranteed.',
    asOf: 'Market table dated November 23, 2026',
    links: [{ label: 'FMS Bonds AAA municipal market yields', url: 'https://www.fmsbonds.com/market-yields/' }],
  },
  {
    key: 'ppliGrowth', label: 'Policy growth before charges', editable: true,
    basis: 'Uses the 6.7% U.S. large-cap long-term forecast as a public equity proxy. Actual insurance-dedicated funds, carrier charges, and policy results will differ.',
    asOf: '2026 Long-Term Capital Market Assumptions, 10–15-year horizon',
    links: [{ label: 'J.P. Morgan 2026 LTCMA', url: JPM_URL }],
  },
  {
    key: 'ppliDraw', label: 'Policy draw capacity', editable: true,
    basis: 'A planner modeling choice, not an external quote. The 4.5% rate sits below expected growth, but real withdrawals, loans, interest, charges, MEC status, and lapse risk require a carrier illustration and professional review.',
    asOf: 'Model convention reviewed November 24, 2026',
    links: [],
  },
  {
    key: 'eqGrowth', label: 'Equity growth', editable: true,
    basis: 'Uses J.P. Morgan’s 6.7% U.S. large-cap annual return assumption. It is a long-term forecast, not a prediction for any one year or a guarantee.',
    asOf: '2026 Long-Term Capital Market Assumptions, 10–15-year horizon',
    links: [{ label: 'J.P. Morgan 2026 LTCMA', url: JPM_URL }],
  },
  {
    key: 'eqDraw', label: 'Equity draw capacity', editable: true,
    basis: 'A planner modeling choice, not an external quote. The 3.5% rate is below expected growth and assumes basis management, loss harvesting, and/or borrowing. It is not a promise that every withdrawal will be tax-free.',
    asOf: 'Model convention reviewed November 24, 2026',
    links: [],
  },
  {
    key: 'divYield', label: 'Equity dividends', editable: true,
    basis: 'Uses the 1.7% dividend contribution in J.P. Morgan’s long-term U.S. large-cap outlook. This is a forecast contribution, not a quote for a fund’s current yield.',
    asOf: '2026 Long-Term Capital Market Assumptions',
    links: [{ label: 'J.P. Morgan LTCMA overview', url: JPM_DETAIL_URL }],
  },
  {
    key: 'inflation', label: 'Inflation', editable: true,
    basis: 'A 2.5% planning buffer above the Federal Reserve’s 2% longer-run PCE inflation target. It is deliberately not presented as the Fed’s forecast or as a current CPI reading.',
    asOf: 'Fed target reaffirmed July 2026; projections published September 16, 2026',
    links: [
      { label: 'Federal Reserve 2% longer-run target', url: 'https://www.federalreserve.gov/monetarypolicy/2026-07-mpr-statement.htm' },
      { label: 'September 2026 FOMC projections', url: 'https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20260916.htm' },
    ],
  },
  {
    key: 'ltcgRate', label: 'Federal stock-gain tax in taxable comparison', editable: false,
    basis: '23.8% combines a 20% top federal long-term capital-gains rate with the 3.8% net-investment-income surtax. State tax is handled separately.',
    asOf: 'Tax-rule reference reviewed November 24, 2026',
    links: [{ label: 'IRS Net Investment Income Tax', url: 'https://www.irs.gov/individuals/net-investment-income-tax' }],
  },
];
