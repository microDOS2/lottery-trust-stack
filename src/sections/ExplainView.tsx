import { SectionTitle } from '../components/widgets';
import { DEFAULT_ASSUMPTIONS, PPLI_QP_MIN, fmtCompact, pct } from '../lib/calc';

const a = DEFAULT_ASSUMPTIONS;

const SECTIONS: Array<{ id: string; title: string; paragraphs: string[] }> = [
  {
    id: 'trade',
    title: 'The check each year, or the pile in 25 years',
    paragraphs: [
      'There is one pile of money. A dollar you spend this year is a dollar that is not growing. You are choosing which of those you want more of.',
      `The check starts in year 2. Year 1 is set aside for spending and setup, and the investments are not used that year. The check you ask for rises ${pct(a.inflation)} a year. That is the inflation rate in the assumptions, so a check that feels comfortable in year 2 is a larger check in year 20.`,
      'If the check is larger than the investments can pay, the pile is sold to make up the difference. That is how a plan can show a fine yearly check and still run out before year 25.',
    ],
  },
  {
    id: 'bonds',
    title: 'Bonds',
    paragraphs: [
      `Bonds are the steady piece. In the assumptions they pay ${pct(a.muniYield)} a year, and that interest does not depend on the stock market. The principal does not grow. You are spending the interest.`,
      'Choosing a larger check puts more money here. You give up the growth you would have had in stocks.',
    ],
  },
  {
    id: 'policy',
    title: 'The insurance policy',
    paragraphs: [
      `The policy is extra paperwork. In the assumptions what is left inside grows at ${pct(a.ppliGrowth)} a year, and the plan can pay ${pct(a.ppliDraw)} a year from it.`,
      `It is used only when at least ${fmtCompact(PPLI_QP_MIN)} is left to invest. Under that, the plans leave it out. Skipping it on purpose also leaves it out: you keep bonds and stocks, and you give up that paycheck and that growth.`,
    ],
  },
  {
    id: 'stocks',
    title: 'Stocks',
    paragraphs: [
      `Stocks are the piece that can make a much bigger pile in 25 years, and the piece that can fall. In the assumptions they grow at ${pct(a.eqGrowth)} a year. The plans will spend ${pct(a.eqDraw)} a year from them.`,
      'Choosing the bigger pile puts more money here. You give up check size now. If stocks do worse than the assumption, this choice loses more than the bond choice, because it was counting on that growth.',
    ],
  },
  {
    id: 'spend-now',
    title: 'A larger check now',
    paragraphs: [
      'You get a larger check. You give up most of the growth. At year 25 you have less, and less to leave to anyone.',
    ],
  },
  {
    id: 'grow',
    title: 'A larger pile in 25 years',
    paragraphs: [
      'You get more left at year 25. You give up cash you could have spent. The pile is only larger if you leave it alone.',
    ],
  },
  {
    id: 'middle',
    title: 'Some of both',
    paragraphs: [
      'The check is smaller than the spend-now plan, and the pile is smaller than the growth plan. You are refusing to bet the whole thing on one.',
    ],
  },
  {
    id: 'simple',
    title: 'No insurance policy',
    paragraphs: [
      `You give up the policy's ${pct(a.ppliDraw)} paycheck and its ${pct(a.ppliGrowth)} growth. You also give up the extra trust and the ${fmtCompact(PPLI_QP_MIN)} minimum. What you keep is bonds and stocks.`,
    ],
  },
  {
    id: 'house',
    title: 'A home',
    paragraphs: [
      'Nothing is set aside for a home unless you type the dollars. There is no percentage and no cap. The dollars you type are not invested. You give up the growth on that cash. The numbers do not put a value on the house.',
    ],
  },
  {
    id: 'business',
    title: 'A business',
    paragraphs: [
      'Nothing is taken out for a business unless you type the dollars. There is no automatic slice.',
    ],
  },
  {
    id: 'lockup',
    title: 'A slice locked for ten years',
    paragraphs: [
      'Nothing is locked away unless you type the dollars. There is no automatic slice.',
    ],
  },
  {
    id: 'move',
    title: 'Moving',
    paragraphs: [
      'The tax on the prize does not change. You already live where you live when you claim it. What can change is state tax on future investment income that is not already sheltered.',
      'Bond interest and policy borrowing are treated as tax-free either way, so moving does less inside these plans than people expect. It does more for an ordinary taxable account.',
    ],
  },
  {
    id: 'puerto-rico',
    title: 'Puerto Rico',
    paragraphs: [
      'You would have to live there more than half the year. In return these plans drop federal tax on investment gains earned after the move. They do not untax the prize. A mailing address does not get the rate.',
    ],
  },
  {
    id: 'assumptions',
    title: 'The rates the math uses',
    paragraphs: [
      'These are the middle, not a forecast and not a quote. They are the assumptions on the calculator. Change them there and the plans change with them.',
      `Bonds: ${pct(a.muniYield)}. Stocks, growth: ${pct(a.eqGrowth)}. Stocks, the amount spent: ${pct(a.eqDraw)}. Policy growth: ${pct(a.ppliGrowth)}. Policy paycheck: ${pct(a.ppliDraw)}. Dividends, used only on the ordinary taxable account: ${pct(a.divYield)}. Inflation: ${pct(a.inflation)}. Federal tax on stock gains in that ordinary account: ${pct(a.ltcgRate)}.`,
    ],
  },
  {
    id: 'not-included',
    title: 'What the numbers leave out',
    paragraphs: [
      'Debt you type is paid from the cash after tax, before anything is invested. If the debt is larger than the cash left after tax, only the cash left is paid. Charity is not taken out, and it does not lower the tax shown here.',
      'The numbers assume these rates hold for 25 years. They are not a promise.',
    ],
  },
];

export default function ExplainView() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SectionTitle
        num="08"
        title={<>Why the <span className="sig-italic">numbers</span> move</>}
        blurb="Each choice on Goals & Fit shows the plans that choice produces. This page is the decision behind those numbers. The rates are the ones the math uses."
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
              <p key={p.slice(0, 48)} className="text-[15px] leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
