// Plain-language content for the Strategy Library, Guide, and Glossary.
// Everything here is educational "how it works" math, not advice.

export interface Strategy {
  id: string;
  tag: string;
  name: string;
  oneLiner: string;
  taxMagic: string;
  qualifies: string;
  watchOut: string;
  plugsIn: string;
  stat?: string;
  statLabel?: string;
}

export interface GuideStep {
  phase: string;
  title: string;
  body: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  { phase: 'First', title: 'Type the cash and your age', body: 'The cash is the lottery check or what is left after tax. Age sets what short, middle, and long mean. Nothing is calculated until those are in.' },
  { phase: 'Then', title: 'Answer the life questions', body: 'Where you want to live, what worries you, who depends on the money, and what you will not do. The result uses those answers. It does not invent a plan name.' },
  { phase: 'Then', title: 'See whether the life is paid for', body: 'The result says whether the yearly amount can be paid without running out, and what would be left if you died in 10 years. A pile at year 25 is not the finish line.' },
  { phase: 'Then', title: 'Look at the strategies if you want', body: 'Each card says how the tax works, who it is for, and what can go wrong. Turn them on to see the combination. A suggested amount does nothing until you use it.' },
  { phase: 'Last', title: 'Use the calculator', body: 'Open the result or the combination in the calculator. Change a number and the figures change with it. Nothing is set up by answering a question.' },
];

export const ENGINE_PRESETS: Record<string, { a: number; b: number; c: number }> = {
  'engine-a': { a: 0.5, b: 0.2, c: 0.3 },
  'engine-b': { a: 0.2, b: 0.45, c: 0.35 },
  'engine-c': { a: 0.2, b: 0.2, c: 0.6 },
};

export const COUNSEL_NOTES: Record<string, string> = {
  oz: 'Statutory summary as of November 2026 (OZ changes in the 2025 tax act). Confirm the investment year, rural step-up, and 10-year exclusion with counsel before relying on these figures.',
  qsbs: 'Statutory summary as of November 2026 (IRC §1202 as amended in 2025). The $15M per-issuer cap, holding-period schedule, and state conformity — California does not conform — are fact-specific. Confirm with counsel.',
  legacy: 'The 2026 federal estate, gift, and GST exclusion is $15M per person ($30M per couple with portability), made permanent by the 2025 tax act and indexed from 2027. Confirm the figure and the trust form with an estate attorney. Last verified: November 2026.',
  'pr-act60': 'Act 60 / Act 38-2026 rates and the Dec 31, 2026 filing cutoff are a summary as of November 2026. Confirm bona fide residency, the decree, and pre-move gain rules with Puerto Rico and U.S. counsel before relying on 0% or 4%.',
  expatriation: 'Exit-tax and covered-expatriate rules change and are easy to get wrong. This card is a warning, not a plan. Confirm with counsel before treating expatriation as an option.',
};

export const STRATEGIES: Strategy[] = [
  {
    id: 'engine-a',
    tag: 'Core engine',
    name: 'Municipal Bond Ladder',
    oneLiner: 'A staircase of high-grade city and state bonds that pays you interest the IRS cannot touch. Rungs mature every year, so cash keeps coming back to you on schedule.',
    taxMagic: 'Interest on state and local bonds is excluded from federal income tax under IRC §103. Buy bonds issued in your home state and most states exempt the interest there too — making the income fully tax-free. This is federal. It does not depend on Puerto Rico or any particular state.',
    qualifies: 'Anyone. No minimums beyond bond lot sizes (typically $5,000 per bond). Stick to AAA/AA general-obligation and essential-service revenue bonds.',
    watchOut: 'Yields are modest (~4%+), and some "private activity" bonds trigger the AMT. Out-of-state bonds can be taxed by your home state. Interest rate rises push existing bond prices down.',
    plugsIn: 'Lives inside Trust #2 (the DAPT). It is the reliable floor of your tax-free income.',
    stat: '~4%',
    statLabel: 'model yield, mixed ladder',
  },
  {
    id: 'engine-b',
    tag: 'Core engine',
    name: 'Private Placement Life Insurance (PPLI)',
    oneLiner: 'A hedge-fund-style portfolio wrapped inside an institutional life insurance policy. The IRS treats the growth as insurance, not investments — so it compounds untaxed and comes out tax-free.',
    taxMagic: 'Inside a non-MEC policy, growth is not taxed as it compounds (IRC §7702). You take money out tax-free by withdrawing up to your cost basis, then switching to policy loans (IRC §72(e)). At death it all passes income-tax-free. This is federal. Puerto Rico does not add to it.',
    qualifies: 'The minimum in the insurance box is $5,000,000. Under that, the number stays. It is not erased. The bond box and the stock box are not changed.',
    watchOut: 'Must respect IRS diversification rules (IRC §817(h)) and investor-control doctrine — you cannot pick the stocks yourself. Fees matter; only large premiums make the math beat a taxable account. Never let it lapse with loans outstanding.',
    plugsIn: 'Trust #3 owns the policy. The model takes about 4.5% a year tax-free, under the policy’s assumed growth.',
    stat: '$5M',
    statLabel: 'Qualified Purchaser minimum',
  },
  {
    id: 'engine-c',
    tag: 'Core engine',
    name: 'Direct-Indexed Equities + Box Spreads',
    oneLiner: 'Instead of an index fund, you own the hundreds of individual stocks. Shares that have fallen can be sold to lock in a loss. Those losses offset gains.',
    taxMagic: 'Harvested losses offset gains (IRC §1211). You do not buy stocks intending them to lose. You use declines that happen. If you sell a stock at a loss and buy the same stock within 30 days before or after, the loss is disallowed. Buy a different similar stock, or wait until day 31 to buy the same one. When you need cash, you can borrow against the portfolio instead of selling. A loan is not income.',
    qualifies: 'Direct indexing is practical from roughly $500K–$1M up; the bigger the account, the more losses it can harvest.',
    watchOut: 'Markets fall — harvesting softens but does not erase drawdowns. If the stocks are sold to pay a loan, the sale is taxed. Paying the loan does not erase the gain. Leverage must stay conservative or a downturn can force sales.',
    plugsIn: 'Lives in Trust #2 next to the muni ladder. This is the growth engine. Puerto Rico can exclude gains from these stocks only in a year you qualify as a bona fide resident and the stocks are sold that year.',
    stat: '~7%',
    statLabel: 'model long-run growth',
  },
  {
    id: 'leverage',
    tag: 'New module',
    name: 'Buy · Borrow · Die (Portfolio Lending)',
    oneLiner: 'Pledge the stocks, take a loan, and spend the loan. The stocks stay in place. You do not sell.',
    taxMagic: 'Loans are not income, so borrowing against securities triggers zero tax. At death, the stocks get a new cost basis equal to their value then. The gain that built up is not taxed as income to the heirs. The loan is still a debt of the estate.',
    qualifies: 'Any large brokerage or trust account. Lenders typically advance 50–70% against a diversified stock portfolio.',
    watchOut: 'If the stocks drop and the loan is too large relative to them, the lender can force a sale. A loan above about 30% of the stocks is the point where that risk gets real. If the stocks are sold to pay the loan, the sale is taxed. Paying the loan does not erase the gain. Interest is still owed.',
    plugsIn: 'The credit line attaches to the equity portfolio. It is how you spend without selling. If you never sell, Puerto Rico adds nothing to this piece.',
    stat: '0%',
    statLabel: 'tax on loan proceeds',
  },
  {
    id: 'oz',
    tag: 'New module',
    name: 'Opportunity Zone Funds (OZ 2.0)',
    oneLiner: 'Roll investment gains into a fund that builds businesses and property in designated zones. Hold 10 years and the new appreciation can be excluded from federal tax.',
    taxMagic: 'Under the 2025 tax law’s permanent OZ regime (investments from 2027 onward): gains you invest are deferred on a rolling 5-year basis, you get a 10% basis step-up (30% in rural zones) at year five, and after a 10-year hold the fund’s appreciation is excluded from tax. This is federal. Puerto Rico does not add to it.',
    qualifies: 'You need eligible capital gains to roll in within 180 days. Funds must hold qualified zone property.',
    watchOut: 'Ten years is a long lockup, fund quality varies, and you are betting on specific neighborhoods. Fees can be heavy.',
    plugsIn: 'An optional slice of the equity sleeve. You still type the dollars.',
    stat: '10 yrs',
    statLabel: 'hold for the exclusion',
  },
  {
    id: 'qsbs',
    tag: 'New module',
    name: 'QSBS — Startup Stock Exclusion',
    oneLiner: 'Invest in an early-stage C-corporation, hold the stock 5+ years, and federal tax on the gain can be excluded — up to $15 million per company (or 10× your basis, if higher).',
    taxMagic: 'IRC §1202. For stock issued after July 4, 2025: 50% excluded at 3 years, 75% at 4 years, 100% at 5 years, with the per-issuer cap at $15M (inflation-indexed from 2027). This is federal. Puerto Rico does not add to it.',
    qualifies: 'Stock must be issued by a U.S. C-corp with under $75M in gross assets, in an eligible operating business, acquired at original issuance.',
    watchOut: 'Startups fail — most go to zero. State conformity varies (California does not conform).',
    plugsIn: 'A small venture sleeve. Size it as money you can fully lose.',
    stat: '$15M',
    statLabel: 'per-issuer federal exclusion cap',
  },
  {
    id: 'legacy',
    tag: 'New module',
    name: 'Dynasty Trust & the $15M Exemption',
    oneLiner: 'The federal estate tax exclusion is $15 million per person. A trust changes estate tax only if a lawyer drafts it and you actually give the money away.',
    taxMagic: 'The 2026 federal estate/gift/GST exclusion is $15M per person ($30M per couple), now permanent and inflation-indexed. This is estate tax at death, not income tax while you are alive. A trust does not make investment income tax-free.',
    qualifies: 'Anyone with assets above the exclusion. Requires an estate attorney.',
    watchOut: 'Irrevocable means you give up direct control. Gifts above the exclusion trigger 40% gift tax.',
    plugsIn: 'It does not move money in the calculator. The exclusion figure is shown so you can see the size.',
    stat: '$15M',
    statLabel: '2026 federal exclusion per person',
  },
  {
    id: 'charitable',
    tag: 'New module',
    name: 'Charitable Remainder Trusts & DAFs',
    oneLiner: 'Give appreciated assets to a charitable trust. The trust can sell them without immediate capital-gains tax. You keep an income stream. You type the amount.',
    taxMagic: 'A CRT is tax-exempt: it sells appreciated assets without paying capital gains, and pays you an annuity or unitrust percentage. You also get an upfront charitable deduction. At least 10% must go to charity.',
    qualifies: 'Best when you have charitable intent and a high-tax year.',
    watchOut: 'The assets leave your estate. This is not an income maximizer.',
    plugsIn: 'You type the dollars. Nothing is given until you do.',
    stat: '0%',
    statLabel: 'capital gains tax inside a CRT',
  },
  {
    id: 'pr-act60',
    tag: 'New module · Global',
    name: 'Puerto Rico Act 60',
    oneLiner: 'Can exclude stock gains from US federal tax in a year you qualify as a bona fide resident. It does not change the prize tax. It does not add to the tax-free pieces of the stack.',
    taxMagic: 'Bona fide residency is decided one tax year at a time. You must meet the presence test, the tax-home test, and the closer-connection test for that year. The usual presence test is 183 days in Puerto Rico. Days outside Puerto Rico do not count. A mailing address, bills, and a license do not replace the days. In a year you qualify, stock gains sold that year can be Puerto Rico-source and excluded from US federal tax. In a year you do not qualify, those gains are taxed under the ordinary US rules. Living there one year does not carry the status into the next.',
    qualifies: 'You must be in Puerto Rico for the required days in the year, and meet the tax-home and closer-connection tests. A decree and the local charity contribution are separate requirements for the local rate.',
    watchOut: 'Compared with Nevada: Nevada has no state income tax, and traveling does not turn that off, because there is no day-count test. You still pay US federal tax on stock gains every year. Puerto Rico can remove that federal tax on qualifying gains, but only in the years you qualify. If you never sell the stocks and only borrow against them, Puerto Rico adds nothing to the stack. The prize is taxed in the state you live in when you receive it. Moving does not change that.',
    plugsIn: 'A residency option. It matters only if stocks are sold in a qualifying year. The bond interest, the policy withdrawals, qualifying startup-stock gains, and opportunity-zone appreciation after ten years are already federal exclusions. Puerto Rico does not add to them.',
    stat: '0% / 4%',
    statLabel: 'decree rate if you qualify that year',
  },
  {
    id: 'real-estate',
    tag: 'New module',
    name: 'Investment Real Estate in the LLC',
    oneLiner: 'Income property can use depreciation, a 1031 exchange, and a step-up at death. You type the dollars.',
    taxMagic: 'Depreciation shelters rent. A 1031 exchange rolls a gain into the next property. Hold until death and the step-up erases the deferred gain for heirs.',
    qualifies: 'Anyone. 1031 requires like-kind real estate and strict timing.',
    watchOut: 'Depreciation recapture and deferred gains come due if you sell without exchanging. A real building can sit empty.',
    plugsIn: 'You type the dollars. Nothing is taken until you do.',
    stat: '0%',
    statLabel: 'tax on gains via 1031 chain',
  },
  {
    id: 'foreign-trust',
    tag: 'Reality check · Global',
    name: 'Foreign Trusts (Cook Islands, St. Kitts)',
    oneLiner: 'Can make assets harder for a US court to reach. Income tax and estate tax are different.',
    taxMagic: 'Income tax: if a US person funds a foreign trust and can benefit from it, IRC §679 taxes the income to that person as if the trust were not there. Estate tax: an irrevocable trust, domestic or foreign, can remove assets from your estate if a lawyer drafts it and you actually give the money away. That lowers estate tax. It does not lower the yearly income tax on the investments.',
    qualifies: 'Legitimate for protection and for estate tax if the transfer is real. Not a way for a US person who can still benefit to avoid income tax.',
    watchOut: 'A court can jail you for refusing to bring the assets back. Extra reporting applies. It does not hide money from the IRS. The estate-tax effect only happens if the gift is irrevocable and you no longer own the assets.',
    plugsIn: 'Not in the income-tax math. The US income tax saved in these numbers is $0. Estate tax is separate and is not calculated here.',
    stat: '$0',
    statLabel: 'US income tax saved for a US grantor',
  },
  {
    id: 'expatriation',
    tag: 'Reality check · Global',
    name: 'Expatriation: Why It Rarely Wins',
    oneLiner: 'Giving up US citizenship is the step that ends US tax on money from anywhere. It has its own tax.',
    taxMagic: 'With a net worth of $2M+ you are a covered expatriate: the IRS deems your worldwide assets sold the day before you leave, taxing gains above a $910,000 exclusion (2026) at up to 23.8%. Future gifts to US persons can face a 40% tax.',
    qualifies: 'Anyone can renounce. The question is whether you want a new home country.',
    watchOut: 'It is irrevocable in practice. It does not unwind prior-year liabilities. The exit tax is separate from the yearly check and the pile.',
    plugsIn: 'Type what the assets would sell for and what you paid. The tax is calculated from those numbers.',
    stat: '23.8%',
    statLabel: 'deemed-sale rate on the gain above the exclusion',
  },
];

export interface GlossaryTerm { term: string; def: string }

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Trust #1 — Master Trust', def: 'The revocable trust that receives the lottery wire. It holds the tax reserve and the first-year living reserve.' },
  { term: 'Trust #2 — DAPT', def: 'A domestic asset-protection trust. You can be a beneficiary while it shields assets, if funded before a claim. Holds the muni ladder and the stocks.' },
  { term: 'Trust #3 — PPLI Trust', def: 'An irrevocable trust that owns the insurance policy.' },
  { term: 'Wash sale', def: 'If you sell a stock at a loss and buy the same stock within 30 days before or after, the loss is disallowed. Buy a different similar stock, or wait until day 31.' },
  { term: 'Bona fide resident', def: 'For Puerto Rico, decided one tax year at a time. Requires the presence test, tax home, and closer connection for that year. The usual presence test is 183 days in Puerto Rico. A mailing address does not replace the days.' },
];
