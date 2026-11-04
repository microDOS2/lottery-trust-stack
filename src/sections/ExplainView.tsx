import { SectionTitle } from '../components/widgets';

const SECTIONS: Array<{ id: string; title: string; paragraphs: string[] }> = [
  {
    id: 'trade',
    title: 'Cash each year versus the pile in 25 years',
    paragraphs: [
      'There is one pile of money. Every dollar you spend this year is a dollar that is no longer growing. The two lists on Goals & Fit are that fact, measured two ways.',
      'After tax, the model sets aside your first year of spending and the setup cost. What remains is invested. Year 1 pays you nothing from the investments. That year is a reserve. The yearly cash starts in year 2.',
      'Your spending target rises 2.5% a year. A plan that looks comfortable in year 2 gets tighter in year 20, because the check grew and the pile was being spent the whole time. Fees rise the same way, and they come out of the investments, stocks first.',
      'If the check you asked for is bigger than the interest and the allowed draws, the model sells principal. Stocks go first, then a side slice, then the policy. That is how a plan runs out before year 25. The yearly bar can look fine while the 25-year bar collapses.',
    ],
  },
  {
    id: 'bonds',
    title: 'Bonds',
    paragraphs: [
      'Bonds pay about 4% a year, tax-free. That cash arrives whether you ask for it or not. The bond principal does not grow. You are spending the interest.',
      'A plan that spends more now owns more bonds, because 4% cash is higher than the 3.5% the model lets you take from stocks. The cost is the pile in year 25.',
    ],
  },
  {
    id: 'policy',
    title: 'The insurance policy',
    paragraphs: [
      'The policy can pay up to 4.5% a year with no tax, by taking out what you paid in and then borrowing. What is left inside grows at 6.2%. Drawing 4.5% leaves a thin margin. A bad stretch can eat it.',
      'The policy wants about $5 million left to invest. Under that, the chart drops it. Skipping it on purpose also drops the carrier, the extra trust, and the tax-free borrowing. You keep bonds and stocks, and less paperwork.',
    ],
  },
  {
    id: 'stocks',
    title: 'Stocks',
    paragraphs: [
      'Stocks are modeled at 7% growth. The model lets you spend 3.5% a year and still calls that draw tax-free, using basis, harvested losses, and loans. That tax-free treatment is easier in the early years than in year 20.',
      'This is the piece that makes the year-25 pile. A growth plan owns more of it and pays you less now. If stocks do worse than 7%, the growth plan loses more than the bond plan, because it was counting on the 7%.',
    ],
  },
  {
    id: 'spend-now',
    title: 'Spend more now, or mostly bonds',
    paragraphs: [
      'You get the larger check. You give up most of the compounding. Bonds do not grow. The policy grows slowly once you are taking 4.5%. At year 25 you have less, and less to leave to anyone.',
      'If you said debts come first, this is the pot a payoff could come from. The chart still does not subtract a loan balance.',
    ],
  },
  {
    id: 'grow',
    title: 'Let it grow',
    paragraphs: [
      'You get the larger pile. You give up cash you could have spent. If you also said you need the prize to live on, this plan and your life disagree. The pile is only larger if you actually leave it alone.',
    ],
  },
  {
    id: 'middle',
    title: 'The middle mix',
    paragraphs: [
      'You refuse the extreme of either list. The check is smaller than the spend-now plan, and the pile is smaller than the growth plan. You are paying for not having to guess which life you will want in ten years.',
    ],
  },
  {
    id: 'simple',
    title: 'Skip the insurance policy',
    paragraphs: [
      'You give up the 4.5% tax-free draw and the growth inside the policy. You also give up the carrier, the $5 million minimum, and the extra trust. What you keep is bonds and stocks, and less paperwork.',
      'If the prize is under about $5 million after the reserve, the policy was never available. Skipping it is then the honest plan, not a sacrifice.',
    ],
  },
  {
    id: 'house',
    title: 'Cash set aside for a home',
    paragraphs: [
      'That cash is pulled out before anything is invested. On a large prize it is about 12% of the cash you typed, capped at $2 million. You give up 25 years of growth on that money. You get a house, which the chart does not value. The chart only shows the smaller pile.',
    ],
  },
  {
    id: 'business',
    title: 'A slice for a business',
    paragraphs: [
      'About 8% leaves the stocks. The model grows it at 4% and pays you nothing. You give up both the 7% stock growth and any cash from that slice. You might get a company. The model does not know if the company works. It can go to zero. That loss is not in the bar.',
    ],
  },
  {
    id: 'lockup',
    title: 'A slice locked for ten years',
    paragraphs: [
      'About 8% pays you nothing and grows at 6%, and you cannot decide next year that you needed it for bills. You give up flexibility. It is only offered when you said the money should work over 20 years and you would tolerate paperwork.',
    ],
  },
  {
    id: 'move',
    title: 'Moving to another state',
    paragraphs: [
      'The prize tax does not change. You already live where you live when you claim it. What changes is state tax on future investment income that is not already sheltered.',
      'Inside the trust, bond interest and policy borrowing are modeled as tax-free either way, so moving does less for this stack than people expect. It does more for the ordinary taxable account the site uses as the comparison.',
      'If you already live in a state with no income tax, moving gives up your house and your life and buys no state-tax cut.',
    ],
  },
  {
    id: 'puerto-rico',
    title: 'Puerto Rico',
    paragraphs: [
      'You give up living where you live. You have to be there more than half the year. In return the model drops federal tax on investment gains earned after the move. It does not untax the prize. Dividends and interest from U.S. sources stay federally taxed. A mailing address does not get the rate.',
      'If you only said you wanted to learn, the dollars are there so you can see them. They are not a recommendation to go. Read the Act 60 note and the December 31, 2026 filing deadline before you treat it as a plan.',
    ],
  },
  {
    id: 'assumptions',
    title: 'Why these rates',
    paragraphs: [
      'The rates are the middle, not a forecast and not a quote. They were set in November 2026.',
      'Muni yield, 4%. A 10-year AAA municipal bond yielded about 3.4%, and a 30-year AAA bond about 4.5% to 4.8%. A ladder spread across those years is about 4%. The model holds it flat for 25 years. Real coupons will move.',
      'Stock growth, 7%. That is the middle of published 2026 long-run forecasts. Vanguard’s 30-year median was about 5.9%. J.P. Morgan’s large-cap forecast in October 2026 was 7.5%. The old 9% was the past average, which is the high end.',
      'Policy growth, 6.2%. The same 7% stocks, minus 0.8% for insurance costs. Not a quote from an insurance company.',
      'Policy draw, 4.5%. It sits under the 6.2% growth so one bad stretch does not empty the policy on the chart. The old 6.5% was a sales figure.',
      'Stock draw, 3.5%. Spending 3.5% of a 7% stock return leaves the pile growing. Treating the whole draw as tax-free for 25 years is the generous part.',
      'Dividends, 1.5%. About what the broad U.S. market pays. Used only on the normal taxable account. The trust stack does not pay tax on them in the model.',
      'Inflation, 2.5%. A bit above the Federal Reserve’s 2% target. It raises your spending, and it powers the “today’s dollars” switch.',
      'The comparison account pays 23.8% federal tax on stock gains. That is the real top rate: 20% plus the 3.8% net-investment surtax. It is the law, not a guess.',
    ],
  },
  {
    id: 'not-included',
    title: 'What none of the plans do',
    paragraphs: [
      'Debts are not subtracted. A plan with a bigger early check is only a place the payoff could come from.',
      'Charity is not spent for you. A gift in the prize year can lower that year’s tax, and you have to decide the amount with your preparer.',
      'The bars assume the middle rates hold for 25 years. They are not a promise.',
    ],
  },
];

export default function ExplainView() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SectionTitle
        num="08"
        title={<>Why the <span className="sig-italic">numbers</span> move</>}
        blurb="The glossary defines the words. This page is the trade. It opens in its own tab so the page you were on stays put."
      />
      <nav className="hairline-card p-5">
        <div className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground">On this page</div>
        <ul className="mt-3 columns-1 gap-x-8 sm:columns-2">
          {SECTIONS.map((s) => (
            <li key={s.id} className="py-1">
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="text-[15px] text-primary hover:underline"
              >{s.title}</a>
            </li>
          ))}
        </ul>
      </nav>
      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className="hairline-card scroll-mt-24 p-6">
          <h2 className="font-display text-2xl font-semibold">{s.title}</h2>
          <div className="mt-3 space-y-3">
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="text-[15px] leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
