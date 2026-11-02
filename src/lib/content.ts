// Plain-language content for the Strategy Library, Guide, and Glossary.
// Everything here is educational "how it works" math, not advice.

export interface Strategy {
  id: string;
  tag: string;          // short category label
  name: string;
  oneLiner: string;     // plain-English summary
  taxMagic: string;     // the mechanism that makes it tax-free / tax-deferred
  qualifies: string;    // eligibility & thresholds
  watchOut: string;     // risks and caveats
  plugsIn: string;      // where it fits in the 4-entity stack
  stat?: string;        // key 2026 figure
  statLabel?: string;
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'engine-a',
    tag: 'Core engine',
    name: 'Municipal Bond Ladder',
    oneLiner:
      'A staircase of high-grade city and state bonds that pays you interest the IRS cannot touch. Rungs mature every year, so cash keeps coming back to you on schedule.',
    taxMagic:
      'Interest on state and local bonds is excluded from federal income tax under IRC §103. Buy bonds issued in your home state and most states exempt the interest there too — making the income fully tax-free.',
    qualifies:
      'Anyone. No minimums beyond bond lot sizes (typically $5,000 per bond). Stick to AAA/AA general-obligation and essential-service revenue bonds.',
    watchOut:
      'Yields are modest (~4%+), and some "private activity" bonds trigger the AMT. Out-of-state bonds can be taxed by your home state. Interest rate rises push existing bond prices down.',
    plugsIn:
      'Lives inside Trust #2 (the DAPT). It is the reliable floor of your tax-free income — the annuity you build yourself.',
    stat: '~4.25%',
    statLabel: 'model yield, AAA/AA ladder',
  },
  {
    id: 'engine-b',
    tag: 'Core engine',
    name: 'Private Placement Life Insurance (PPLI)',
    oneLiner:
      'A hedge-fund-style portfolio wrapped inside an institutional life insurance policy. The IRS treats the growth as insurance, not investments — so it compounds untaxed and comes out tax-free.',
    taxMagic:
      'Inside a non-MEC policy, growth is not taxed as it compounds (IRC §7702). You take money out tax-free by withdrawing up to your cost basis, then switching to policy loans (IRC §72(e)). At death it all passes income-tax-free.',
    qualifies:
      'Typically requires Qualified Purchaser status — $5M+ in investments — and carrier minimum premiums around $2.5M. This is an institutional product, not retail insurance.',
    watchOut:
      'Must respect IRS diversification rules (IRC §817(h)) and investor-control doctrine — you cannot pick the stocks yourself. Fees matter; only large premiums make the math beat a taxable account. Never let it lapse with loans outstanding.',
    plugsIn:
      'Trust #3 owns the policy. It is the highest tax-free draw rate in the stack (~6.5%) and the engine that does the heaviest lifting for both income and compounding.',
    stat: '$5M',
    statLabel: 'Qualified Purchaser minimum',
  },
  {
    id: 'engine-c',
    tag: 'Core engine',
    name: 'Direct-Indexed Equities + Box Spreads',
    oneLiner:
      'Instead of an index fund, you own the hundreds of individual stocks. Every day, software sells the losers to harvest tax losses while your winners keep compounding.',
    taxMagic:
      'Harvested losses offset gains (IRC §1211). When you need cash, you can borrow against the portfolio (a box-spread loan priced near Treasury rates) instead of selling — borrowing is not a taxable event, and Section 1256 box-spread financing keeps it cheap.',
    qualifies:
      'Direct indexing is practical from roughly $500K–$1M up; the bigger the account, the more losses it can harvest.',
    watchOut:
      'Markets fall — harvesting softens but does not erase drawdowns. Leverage must stay conservative (keep loan-to-value low) or a downturn can force sales at the worst time.',
    plugsIn:
      'Lives in Trust #2 next to the muni ladder. This is your primary growth engine — the part of the stack built to compound for 25 years.',
    stat: '~9%',
    statLabel: 'model long-run growth',
  },
  {
    id: 'leverage',
    tag: 'New module',
    name: 'Buy · Borrow · Die (Portfolio Lending)',
    oneLiner:
      'The classic billionaire move: never sell. Pledge your portfolio for a credit line, spend the loan proceeds tax-free, and let the assets keep compounding. At death, heirs get a stepped-up basis and the gains vanish for tax purposes.',
    taxMagic:
      'Loans are not income, so borrowing against securities triggers zero tax. Interest on a box-spread or securities-based line of credit runs near benchmark rates — far below the 23.8% + state you would pay to sell. The §1014 basis step-up at death erases the embedded gain.',
    qualifies:
      'Any large brokerage or trust account. Lenders typically advance 50–70% against a diversified stock portfolio, less against concentrated positions.',
    watchOut:
      'This is leverage. If markets drop and your loan-to-value climbs too high, the lender sells your assets (a margin call). Keep LTV under ~25–30% and you have an enormous safety buffer. Rates float — a spike raises your carry cost.',
    plugsIn:
      'The credit line attaches to Trust #2’s equity portfolio. It is the pressure valve: big one-off purchases (a house, a car, a business) without ever interrupting compounding.',
    stat: '0%',
    statLabel: 'tax on loan proceeds',
  },
  {
    id: 'oz',
    tag: 'New module',
    name: 'Opportunity Zone Funds (OZ 2.0)',
    oneLiner:
      'Roll investment gains into a fund that builds businesses and property in designated zones. Hold 10 years and every dollar of new appreciation is permanently tax-free.',
    taxMagic:
      'Under the 2025 tax law’s permanent OZ regime (investments from 2027 onward): gains you invest are deferred on a rolling 5-year basis, you get a 10% basis step-up (30% in rural zones) at year five, and after a 10-year hold the fund’s appreciation is excluded from tax entirely.',
    qualifies:
      'You need eligible capital gains to roll in (e.g., from selling stock, a business, or property) within 180 days. Funds must hold qualified zone property.',
    watchOut:
      'Ten years is a long lockup, fund quality varies wildly, and you are betting on specific neighborhoods. Fees can be heavy. This is real investing risk, not a bond substitute.',
    plugsIn:
      'An optional satellite holding of Trust #2 — carve out a slice (say 5–10% of the equity sleeve) for OZ funds when you have gains to shelter.',
    stat: '10 yrs',
    statLabel: 'hold for tax-free appreciation',
  },
  {
    id: 'qsbs',
    tag: 'New module',
    name: 'QSBS — Startup Stock Exclusion',
    oneLiner:
      'Invest in an early-stage C-corporation, hold the stock 5+ years, and federal tax on the gain can be 100% excluded — up to $15 million per company (or 10× your basis, if higher).',
    taxMagic:
      'IRC §1202. For stock issued after July 4, 2025: 50% excluded at 3 years, 75% at 4 years, 100% at 5 years, with the per-issuer cap raised from $10M to $15M (inflation-indexed from 2027). Each trust in your stack can hold its own $15M exclusion.',
    qualifies:
      'Stock must be issued by a U.S. C-corp with under $75M in gross assets, in an eligible operating business (not finance, hospitality, or professional services), acquired at original issuance.',
    watchOut:
      'Startups fail — most go to zero. State conformity varies (California does not conform). The 5-year clock and corporate-form rules are strict; get the paperwork right at issuance.',
    plugsIn:
      'A small venture sleeve inside Trust #2 or a dedicated non-grantor trust. Size it as money you can fully lose — but each winner can exit tax-free.',
    stat: '$15M',
    statLabel: 'per-issuer federal exclusion cap',
  },
  {
    id: 'legacy',
    tag: 'New module',
    name: 'Dynasty Trust & the $15M Exemption',
    oneLiner:
      'The 25-year threat to your compounding is not income tax — it is the 40% federal estate tax. Move growth assets into a dynasty trust early, and decades of appreciation skip estate tax for generations.',
    taxMagic:
      'The 2026 federal estate/gift/GST exclusion is $15M per person ($30M per couple), now permanent and inflation-indexed. Gift assets into a properly drafted irrevocable trust (IDGT, GRAT, or SLAT) now; everything they grow into sits outside your taxable estate forever.',
    qualifies:
      'Anyone with assets above the exclusion — a $20M+ jackpot winner is a candidate on day one. Requires an estate attorney; situs states like Wyoming, South Dakota, and Nevada allow perpetual trusts.',
    watchOut:
      'Irrevocable means irrevocable — you give up direct control. Gifts above the exclusion trigger 40% gift tax. Rules on basis step-up vs. estate inclusion involve real tradeoffs; this needs professional drafting.',
    plugsIn:
      'Layered above Trusts #1–3. The trusts you already built for income become the funding source for the dynasty layer — compounding shifts from "your lifetime" to "your family’s century."',
    stat: '$15M',
    statLabel: '2026 federal exclusion per person',
  },
  {
    id: 'charitable',
    tag: 'New module',
    name: 'Charitable Remainder Trusts & DAFs',
    oneLiner:
      'Give appreciated assets to a charitable trust, sell them inside it with zero immediate tax, keep an income stream for life, and take a large deduction this year. Generosity and income are not either/or.',
    taxMagic:
      'A CRT is tax-exempt: it sells appreciated assets without paying capital gains, reinvests the full amount, and pays you an annuity or unitrust percentage for life or a term (IRC §664). You also get an upfront charitable deduction. A donor-advised fund is the simpler cousin — bunch several years of gifts into one high-income year for a big deduction.',
    qualifies:
      'Best when you have genuine charitable intent plus a high-tax year — like the year you claim the prize.',
    watchOut:
      'At least 10% of the CRT’s value must be destined for charity, and the assets truly leave your estate. Payout rates are regulated. Not an income maximizer — a tax-efficient way to combine giving and income.',
    plugsIn:
      'Sits beside the stack. In the win year, a DAF or CRT contribution can offset a slice of the prize tax while the rest flows into Trusts #1–3.',
    stat: '0%',
    statLabel: 'capital gains tax inside a CRT',
  },
];

export interface GlossaryTerm { term: string; def: string }

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Trust #1 — Master Trust', def: 'The revocable trust that receives the lottery wire. It holds your April 15 tax-reconciliation reserve (T-Bills) and your Year-1 living reserve in tax-exempt money market funds.' },
  { term: 'Trust #2 — DAPT', def: 'A domestic asset-protection trust (Nevada or Wyoming situs). Self-settled, so you can be a beneficiary while it shields assets. Holds the muni ladder and direct-indexed equities.' },
  { term: 'Trust #3 — PPLI Trust', def: 'An irrevocable insurance trust that owns the private placement life insurance policy, keeping the death benefit and cash value outside your estate.' },
  { term: 'Entity #4 — Anonymous LLC', def: 'A Wyoming (or similar) holding LLC that owns real estate and vehicles in its own name, keeping your personal name off public property and title records.' },
  { term: 'Non-MEC', def: 'A life insurance policy funded within IRS limits so it is not a "modified endowment contract." Non-MEC status is what allows tax-free withdrawals to basis and tax-free policy loans.' },
  { term: 'Qualified Purchaser', def: 'Under Investment Company Act §2(a)(51), generally a person with $5M+ in investments. Required for most PPLI and many private funds.' },
  { term: 'WING / NING trust', def: 'An incomplete-gift non-grantor trust sited in a no-income-tax state (Wyoming/Nevada). Properly drafted, it can shift state income tax on retained portfolio income to the 0% state.' },
  { term: 'Box spread', def: 'An options construction that behaves like a fixed-rate loan against your portfolio, priced near Treasury rates and generally eligible for Section 1256 tax treatment. A cheap way to borrow without selling.' },
  { term: 'SBLOC', def: 'Securities-based line of credit. A bank lends you cash against your brokerage or trust portfolio; the securities stay invested and keep compounding.' },
  { term: 'Step-up in basis', def: 'IRC §1014: at death, your heirs’ cost basis resets to current market value. A lifetime of unrealized gains disappears for income-tax purposes. The reason "buy, borrow, die" works.' },
  { term: 'NIIT', def: 'Net Investment Income Tax — an extra 3.8% federal tax on investment income above $200K (single) / $250K (MFJ). On top of the 20% top capital-gains rate, it makes 23.8% the real top federal rate on gains.' },
  { term: 'Tax-loss harvesting', def: 'Selling positions that are down to realize losses that offset gains elsewhere, then immediately reinvesting in similar (not identical) holdings to stay on track. Direct indexing does this daily.' },
  { term: 'Opportunity Zone', def: 'A federally designated community where investing gains through a Qualified Opportunity Fund earns deferral, a partial basis step-up, and — after 10 years — tax-free appreciation.' },
  { term: 'QSBS', def: 'Qualified Small Business Stock (IRC §1202). Stock in an eligible C-corp held 5+ years can be sold with up to $15M of gain excluded from federal tax (for stock issued after July 4, 2025).' },
  { term: 'CRT', def: 'Charitable Remainder Trust. You donate appreciated assets, the trust sells them tax-free, pays you income for life or a term, and the remainder goes to charity. You get a deduction up front.' },
  { term: 'DAF', def: 'Donor-Advised Fund. A charitable account you fund now (deduction now) and grant from over time. Ideal for bunching deductions into your high-income prize year.' },
  { term: 'IDGT / GRAT / SLAT', def: 'Estate-planning trust flavors: Intentionally Defective Grantor Trust (freeze estate value, you pay the income tax), Grantor Retained Annuity Trust (pass appreciation above a hurdle rate gift-tax-free), Spousal Lifetime Access Trust (remove assets from the estate while your spouse keeps access).' },
  { term: 'Domicile vs. residency', def: 'Domicile is your true legal home (intent + ties: license, voter registration, primary home). Statutory residency is a day-count test (often ~183 days plus a permanent abode). High-tax states audit both aggressively — track your days.' },
];

export interface GuideStep {
  phase: string;
  title: string;
  body: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    phase: 'Before you claim',
    title: 'Sign the ticket, say nothing, hire three people',
    body: 'Sign the back of the ticket and secure it. Tell no one beyond your household. Hire a fee-only fiduciary advisor, a tax attorney, and a CPA — in that order — before you contact the lottery. If your state allows it, plan to claim through a trust or LLC to keep your name out of press releases.',
  },
  {
    phase: 'Claim week',
    title: 'Lump sum or annuity — decide with the model, not your gut',
    body: 'Use the Annuity vs. Lump Sum tab. The lump sum is smaller but gives you control, the full trust stack, and a step-up at death. The annuity is a forced-savings plan with a 5% raise every year — and a guardrail against blowing it. There is no universally right answer; there is a right answer for your discipline and your state.',
  },
  {
    phase: 'Week 1–4',
    title: 'Wire into Trust #1 and park the tax money first',
    body: 'The lottery withholds 24% federal (plus state withholding), but a giant prize is really taxed at 37% federal. The gap is due April 15. Park the difference in Treasury bills inside Trust #1 immediately — this money was never yours. Your Year-1 living reserve goes into tax-exempt money market funds next.',
  },
  {
    phase: 'Month 1–3',
    title: 'Stand up the stack',
    body: 'Your attorney drafts Trust #2 (DAPT) and Trust #3 (PPLI trust); the insurance trust applies for the policy. Open institutional custody accounts with possession-and-control protection (SEC Rule 15c3-3). Form Entity #4, the anonymous LLC, if you plan property or vehicle purchases.',
  },
  {
    phase: 'Month 1–12',
    title: 'The seasoning year — let the engines warm up',
    body: 'Fund the engines: muni ladder and direct-indexed equities into Trust #2, premium into Trust #3’s policy. Live off the Year-1 reserve. Do not touch the engines — the PPLI needs its seasoning period and the loss-harvesting needs time to accumulate losses. Boring is the whole point.',
  },
  {
    phase: 'If you are moving',
    title: 'Change domicile like you mean it',
    body: 'Driver’s license, voter registration, primary home, doctors, clubs, Declaration of Domicile — move your whole life to the 0% state, not just your mailbox. If you keep a home in the old state, stay under its day-count threshold (often ~183 days) and keep a contemporaneous day log. High-tax states audit departing lottery winners as a matter of policy.',
  },
  {
    phase: 'Month 13+',
    title: 'Turn on the tax-free tap',
    body: 'Automate the draws: muni interest from the ladder, basis withdrawals then loans from the PPLI, harvested-basis and box-spread draws from equities. The Income ↔ Growth tab shows how much you can take while the stack still compounds. Recheck the dial once a year, not once a week.',
  },
  {
    phase: 'Every year after',
    title: 'Review, rebalance, and mind the estate',
    body: 'Annual review: yields, policy performance, LTV on any credit lines, day counts, and law changes. As the stack compounds past the $15M-per-person estate exclusion, talk to your attorney about the dynasty layer — the best time to move growth assets out of your estate is while they are still (relatively) small.',
  },
];
