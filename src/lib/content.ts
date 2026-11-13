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
  {
    phase: 'Day one',
    title: 'Sign it, photograph it, lock it up',
    body: 'Sign the back of the ticket immediately — an unsigned ticket is a bearer instrument, so whoever holds it owns it. Photograph the front and back, take a short video of yourself holding it, then put the original in a bank safe-deposit box. Do not post it, frame it, or carry it around.',
  },
  {
    phase: 'Week one',
    title: 'Tell almost no one',
    body: 'The fewer people who know, the fewer lawsuits, "business opportunities," and long-lost cousins you will meet. Tell your spouse, and later your attorney — and that is it. Everyone else can find out after the plan exists, if they find out at all.',
  },
  {
    phase: 'Weeks 1–6',
    title: 'Use the quiet period — and check your anonymity window',
    body: 'You usually have months before the claim deadline, so there is no reason to rush to the lottery office. Some states let winners stay anonymous or claim through a trust or LLC; others, like California, publish your name. Ask your attorney what your state allows before you claim — the entity you claim through can decide whether strangers ever learn your name.',
  },
  {
    phase: 'Before you claim',
    title: 'Hire a tax attorney first',
    body: 'Not a generalist — a tax attorney who has handled nine-figure liquidity events, plus a CPA and a fee-only (not commission) financial planner. They cost tens of thousands and routinely save millions. The lump-sum-versus-annuity election alone is a multi-million-dollar, usually irrevocable decision, and it has to be made before the money moves.',
  },
  {
    phase: 'Claiming',
    title: 'Choose lump sum or annuity — you usually get one shot',
    body: 'The lump sum is roughly 60% of the advertised jackpot, paid now; the annuity pays the full headline number over 30 years. Cash invested well usually wins on the math, but the annuity is forced discipline against blowing it. Most lotteries give you a short window — often 60 days — to elect, and the choice is permanent.',
  },
  {
    phase: 'First month',
    title: 'Park the cash somewhere boring',
    body: 'FDIC insurance covers only $250,000 per depositor per bank, so a $100M win cannot sit in one checking account. Use Treasury bills and government money-market funds — backed by the same government that taxes you — spread across custodians. Nothing exotic for now: year one’s goal is not losing money, not growing it.',
  },
  {
    phase: 'First April 15',
    title: 'Fund the tax reserve before you touch the rest',
    body: 'The prize is ordinary income: roughly 37% federal plus state tax (0% in Florida or Texas, up to ~11% in New York or California). Lottery withholding is typically only 24%, so the rest is due via quarterly estimated payments and the April 15 true-up. Safe harbor: pay at least 110% of last year’s tax and you avoid underpayment penalties even if you still owe more.',
  },
  {
    phase: 'Months 2–6',
    title: 'Build the trust stack',
    body: 'Trust #1 (revocable master) receives the money and holds the tax reserve; Trust #2 (a domestic asset-protection trust in a state like Nevada or South Dakota) holds the muni ladder and stocks; Trust #3 owns the insurance policy. Fund the protection trust before any claim or dispute exists — assets moved after a problem appears can be clawed back as a fraudulent transfer.',
  },
  {
    phase: 'Year one',
    title: 'Live through the seasoning year',
    body: 'Do nothing dramatic for twelve months: no new house, no funding friends’ businesses, no gifts beyond the annual exclusion (about $19,000 per recipient). Almost every lottery horror story happens in year one. The money will still be there after you have learned how to be rich.',
  },
  {
    phase: 'If Puerto Rico',
    title: 'Mind the Act 60 clock — the Dec 31, 2026 filing deadline',
    body: 'Moving to Puerto Rico can take qualifying capital gains to 0% federal, but only for years you are a bona fide resident, and the decree and filings have hard deadlines — the current filing cutoff is December 31, 2026. The prize itself is taxed where you lived when you won; moving does not change that. If PR is on the table, the planning starts immediately, not after the move.',
  },
  {
    phase: 'Every year after',
    title: 'Audit the day count and the residency',
    body: 'Bona fide residency is decided one tax year at a time: the presence test (usually 183 days in Puerto Rico), the tax-home test, and the closer-connection test. Keep a day-count log, flight records, and receipts as if you will be audited — high-income returns and state exits get audited. States like California and New York will happily argue you never really left.',
  },
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

// Additional deep-dive cards: WING/NING, hiring defense, PPLI mechanics, leverage math, state estate taxes, box spreads.
export const DEEP_STRATEGIES: Strategy[] = [
  {
    id: 'wing',
    tag: 'Deep dive',
    name: "WING / NING Trusts (for people who won't move)",
    oneLiner: 'If you are not relocating to a 0% state, an incomplete-gift non-grantor trust sited in Wyoming or Nevada can shift state income tax on retained portfolio gains out of your high-tax home state.',
    taxMagic: 'The trust is non-grantor, so it pays its own state income tax at its situs (0% in WY/NV) on retained income and gains. You keep the federal picture the same — this is a state-tax play, not a federal one. Note that California now taxes these too, which makes honest drafting more important, not less.',
    qualifies: 'Winners in high-tax states (CA, NY, MN, OR) who do not want to move. Needs careful drafting: incomplete gift, non-grantor status, real situs (trustee, accounts, administration in the no-tax state).',
    watchOut: 'Get it wrong and your home state treats the trust as a sham — look-through to the grantor. Situs is a fact question, not a mailing address. This is specialist attorney work.',
    plugsIn: 'An optional layer beside Trust #2 for the "stay put" crowd. Not a replacement for the engines — a way to keep more of what they earn.',
    stat: '0%',
    statLabel: 'situs state tax on retained gains',
  },
  {
    id: 'hiring',
    tag: 'Deep dive',
    name: 'Hiring & Promoter Defense Playbook',
    oneLiner: 'The plan only works if the people building it are real. Here is how to find them, check them, and spot the pitches that would separate you from the money.',
    taxMagic: 'There is no tax magic here — just process. Find a tax attorney (ACTEC directory or state bar referral), a CPA (AICPA/state society), and a fee-only fiduciary advisor (NAPFA). Verify: CPAverify, SEC IAPD, CFP Board. Ask about fee models up front — on a $60M pool, a 1% AUM fee is $600K/yr and should be negotiated as flat-fee or hourly work instead.',
    qualifies: 'Everyone. Bring to the first meeting: the prize documentation, current statements, a list of entities you already have, and this plan summary (printable from the Compare tab).',
    watchOut: 'Red flags to walk away from: guaranteed returns, "offshore = tax-free" pitches, syndicated conservation easements, micro-captives, urgency tactics, anyone who sells products alongside advice, and anyone who says the structure needs no lawyer.',
    plugsIn: 'Use this before you hire anyone. The attorney drafts; the CPA keeps you compliant; the advisor keeps you honest. In that order.',
    stat: '3',
    statLabel: 'hires to make first, in order',
  },
  {
    id: 'ppli-depth',
    tag: 'Deep dive',
    name: 'PPLI Mechanics: What Actually Disqualifies You',
    oneLiner: 'The insurance wrapper is powerful, but three things kill it: paying too much too fast, not being insurable, and controlling the investments yourself.',
    taxMagic: 'The 7-pay test (IRC §7702A) caps how fast you can fund it before it becomes a modified endowment contract — which changes withdrawals and loans from tax-free to taxable. Investor control (Webber v. Commissioner) means if you direct the trades, the IRS treats the assets as yours and taxes all inside gain currently. And you must be medically insurable: age and health decide whether the policy exists at all.',
    qualifies: 'People who can pass underwriting, fund within the 7-pay limits, and let the insurance-dedicated funds do the investing. If any of those fail, the muni ladder and direct indexing still work.',
    watchOut: 'Do not chase premium to hit a number and trip the MEC line. Do not pick stocks yourself inside the policy. Do not let an over-loaned policy lapse — that is the tax bomb, not the 0.8% fee.',
    plugsIn: 'Read this before the PPLI card. It tells you whether you can use the wrapper at all, not just whether you can afford it.',
    stat: '7-pay',
    statLabel: 'funding-speed limit before MEC',
  },
  {
    id: 'leverage-math',
    tag: 'Deep dive',
    name: 'What Portfolio Loans Actually Cost',
    oneLiner: 'Borrowing against the pile is not free money — it is a rate plus a spread. Know the cost before you use the leverage module.',
    taxMagic: 'Securities-based lines typically price at SOFR + 1–2% (roughly 5–7% in recent years). Box spreads usually price closer to Treasury rates. Investment interest is deductible only up to your net investment income for the year (IRC §163(d)) — you cannot deduct your way to a free loan.',
    qualifies: 'Accounts big enough that a 25% loan-to-value line is meaningful without being dangerous. Keep LTV under ~25–30% so a 30% market drop cannot trigger a margin call.',
    watchOut: 'Rates float — a spike raises your carry cost. And margin calls sell your assets at the worst time. If the loan funds anything other than more investments, the interest is generally not deductible.',
    plugsIn: 'The cost side of the buy-borrow-die card. Use it to price a loan before you sign one.',
    stat: '5–7%',
    statLabel: 'typical SBLOC rate range',
  },
  {
    id: 'state-estate',
    tag: 'Deep dive',
    name: 'State Estate & Inheritance Taxes',
    oneLiner: 'The federal $15M exclusion is not the whole story. About a dozen states levy their own estate or inheritance taxes, several with much lower thresholds.',
    taxMagic: 'Oregon taxes estates above $1M. Massachusetts above $2M. New York above $7.35M. Illinois above $4M. Washington above $3M. Connecticut matches the federal $15M. A winner in one of these states can owe state estate tax long before the federal exclusion matters.',
    qualifies: 'Anyone domiciled in an estate-tax state. The state where you die and where your property sits both matter.',
    watchOut: 'Do not read "your pile is under the $15M federal exclusion" as "no estate tax." Your state may disagree. This module is a flag, not a calculation — verify with your CPA.',
    plugsIn: 'The legacy layer, with the state line added. If your state is on the list, the dynasty-trust conversation starts earlier.',
    stat: '$1M',
    statLabel: 'Oregon estate-tax threshold',
  },
  {
    id: 'box-spreads',
    tag: 'Deep dive',
    name: 'Box Spreads, Explained',
    oneLiner: 'A box spread is an options construction that behaves like a fixed-rate loan against your portfolio — the cheap way to borrow without selling your stocks.',
    taxMagic: 'You build it from four European-style index options that lock in a fixed payout. The implied interest rate sits near Treasury yields, and Section 1256 tax treatment makes it cheaper than most bank credit lines. It is financing, not a market bet.',
    qualifies: 'Portfolios large enough that the spread is efficient (typically $500K+). Requires an options-enabled institutional account and a broker who understands the construction.',
    watchOut: 'These are not free: early assignment, expiry, and liquidity risk exist. Do not hand-roll a box spread from a YouTube tutorial — the structure has to be exact or it is not a loan.',
    plugsIn: 'The financing mechanism inside Engine C. When you draw without selling, this is often what is actually happening under the hood.',
    stat: '~T-bill',
    statLabel: 'implied borrowing rate',
  },
];

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Trust #1 — Master Trust', def: 'The revocable trust that receives the lottery wire. It holds the tax reserve and the first-year living reserve.' },
  { term: 'Trust #2 — DAPT', def: 'A domestic asset-protection trust. You can be a beneficiary while it shields assets, if funded before a claim. Holds the muni ladder and the stocks.' },
  { term: 'Trust #3 — PPLI Trust', def: 'An irrevocable trust that owns the insurance policy.' },
  { term: 'Muni ladder', def: 'A staircase of city and state bonds with one rung maturing every year. The interest is exempt from federal income tax — and usually state tax if the bonds are from your state. Example: $5M in a 10-year ladder throws off roughly $200K a year of tax-free interest at ~4%.' },
  { term: 'PPLI', def: 'Private placement life insurance: an investment portfolio wrapped inside an institutional life policy. Growth compounds untaxed, and money comes out tax-free as withdrawals up to basis, then policy loans. Institutional products usually start around $5M.' },
  { term: 'Non-MEC', def: 'A life insurance policy that still counts as insurance for tax purposes because it passed the 7-pay funding test. Non-MEC policies allow tax-free loans and withdrawals; a MEC (modified endowment contract) loses that treatment for life.' },
  { term: '7-pay test', def: 'The IRS limit on how fast you can stuff money into a life policy. Pay more than seven years’ worth of premiums up front and the policy becomes a MEC — taxable loans, taxable withdrawals, and possibly penalties. PPLI is funded just under this line.' },
  { term: 'DAPT', def: 'Domestic asset-protection trust, set up in a state like Nevada, South Dakota, or Delaware. You can be a beneficiary while the trust shields assets from future creditors — but only if it is funded before any claim or lawsuit exists.' },
  { term: 'Direct indexing', def: 'Owning the hundreds of stocks in an index individually instead of buying the index fund. That way every stock that dips can be sold to harvest a tax loss while the portfolio still tracks the index. Practical from roughly $500K–$1M up.' },
  { term: 'Box spread', def: 'An options combination that behaves like a loan at near-Treasury rates. It lets a large portfolio raise cash without selling appreciated stock — and without triggering capital gains.' },
  { term: 'Opportunity zone', def: 'A designated low-income area where investment gains get special treatment. Roll a capital gain into a qualified fund within 180 days, hold 10 years, and the fund’s appreciation comes out federally tax-free.' },
  { term: 'QSBS', def: 'Qualified small business stock — shares of an early-stage C-corporation held 5+ years. Federal tax on the gain can be excluded up to $15 million per company (or 10× your basis, if higher). Most startups fail, so size it as money you can lose.' },
  { term: 'DAF', def: 'Donor-advised fund: a charitable checking account. You donate appreciated stock, take the full deduction in a high-income year, and decide which charities actually get the money years later.' },
  { term: 'CRT', def: 'Charitable remainder trust. You give it appreciated assets, it sells them with no immediate capital-gains tax, pays you an income stream for life, and whatever is left goes to charity. At least 10% must ultimately reach charity.' },
  { term: 'Dynasty trust', def: 'An irrevocable trust built to last for generations. Fund it inside the $15M estate/GST exclusion and decades of growth pass to kids, grandkids, and beyond without ever being hit by the 40% estate tax.' },
  { term: 'Estate exclusion', def: 'The amount you can give or leave with no federal estate, gift, or generation-skipping tax: $15M per person in 2026, $30M per couple with portability. Above that line, the rate is 40%.' },
  { term: 'Cost segregation', def: 'An engineering study that re-sorts parts of a building — carpet, wiring, landscaping — into 5- and 15-year categories instead of 27.5 or 39. The depreciation (and the tax shelter) arrives years sooner.' },
  { term: 'Step-up basis', def: 'At death, your heirs’ cost basis resets to the asset’s market value. Stock bought at $1M that is worth $10M when you die can be sold by your kids for $10M with zero capital-gains tax. This is what makes "buy, borrow, die" work.' },
  { term: 'Umbrella insurance', def: 'Cheap liability coverage stacked on top of home and auto policies — typically $1M–$10M of protection for a few hundred dollars a year. The first policy a newly rich person should buy.' },
  { term: 'AMT', def: 'Alternative minimum tax: a parallel tax calculation that claws back certain deductions and preferences. It can be triggered by "private activity" muni bonds, big stock-option exercises, or very large deductions.' },
  { term: 'NIIT', def: 'Net investment income tax: an extra 3.8% on interest, dividends, rents, and capital gains once income passes $200K (single) or $250K (married). It is why you will see 23.8% quoted as the top federal capital-gains rate.' },
  { term: 'Grantor trust', def: 'A trust the IRS ignores for income tax: all the income is taxed to you personally, as if the trust were not there. That is a feature — the trust compounds without paying its own tax bill, and your paying the tax is effectively an extra tax-free gift.' },
  { term: 'Throwback rules', def: 'The anti-avoidance regime for foreign non-grantor trusts. Income a foreign trust accumulates is taxed to US beneficiaries when distributed — plus an interest charge for every year it was deferred. It kills most "park it offshore and compound" ideas.' },
  { term: 'Subpart F', def: 'Rules that tax US owners of controlled foreign corporations on passive income (interest, dividends, rents) in the year it is earned — even if nothing is distributed. The IRS’s answer to the mailbox company abroad.' },
  { term: 'GILTI', def: 'A minimum tax on US shareholders of foreign corporations’ ongoing earnings. Along with Subpart F, it is why "my company is incorporated in the Caymans" does not make US tax disappear.' },
  { term: 'Covered expatriate', def: 'Someone who gives up US citizenship or a long-term green card with a net worth of $2M+ (or who fails the tax or certification tests). Covered status triggers the exit tax and a 40% tax on later gifts to US persons.' },
  { term: 'Exit tax', def: 'The IRS deems everything you own sold the day before you expatriate. Gains above the exclusion (~$910K in 2026) are taxed at up to 23.8% — the price of leaving the US tax net.' },
  { term: 'Bona fide resident', def: 'For Puerto Rico, decided one tax year at a time. Requires the presence test (usually 183 days in PR), the tax-home test, and the closer-connection test for that year. A mailing address and a license do not replace the days.' },
  { term: 'Act 60 / decree', def: 'Puerto Rico’s incentive program. A signed decree locks in 0% on qualifying capital gains and 4% on export-service income, in exchange for residency, filing requirements (the current cutoff is Dec 31, 2026), and a yearly charity contribution.' },
  { term: 'WING / NING trust', def: 'A Wyoming or Nevada incomplete-gift non-grantor trust. The play: the trust, not you, is the taxpayer, so gains realized inside it dodge a high-tax state’s income tax. States like California and New York audit these aggressively.' },
  { term: '1031 exchange', def: 'Swap one investment property for a like-kind one and defer the capital gain. The deadlines are strict — identify the replacement within 45 days and close within 180 — but chained exchanges plus a step-up at death can make the gain vanish entirely.' },
  { term: 'Securities-based line of credit', def: 'A loan from your broker secured by your portfolio, typically advancing 50–70% of its value. Loan proceeds are not income, so you can spend without selling and without triggering tax. Keep leverage conservative or a downturn forces sales.' },
  { term: 'Qualified purchaser', def: 'Someone with $5M+ in investments. The status unlocks 3(c)(7) private funds — including most PPLI offerings — that ordinary accredited investors cannot access.' },
  { term: 'Investor-control doctrine', def: 'If you can effectively pick the investments inside your own insurance policy, the IRS treats the account as yours and taxes the growth currently. In PPLI you choose menus and managers — never the individual stocks.' },
  { term: 'Wash sale', def: 'If you sell a stock at a loss and buy the same stock within 30 days before or after, the loss is disallowed. Buy a different similar stock, or wait until day 31.' },
];
