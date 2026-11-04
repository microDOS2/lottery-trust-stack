import { SectionTitle } from '../components/widgets';
import { computeStack, DEFAULT_ASSUMPTIONS, DEFAULT_INPUTS, fmt, pct, PPLI_QP_MIN, type Inputs } from '../lib/calc';

const rates = DEFAULT_ASSUMPTIONS;

function run(over: Partial<Inputs>) {
  return computeStack({
    ...DEFAULT_INPUTS,
    basis: 'net',
    state: 'CO',
    target: 'WY',
    filing: 'single',
    residency: 'stay',
    amount: 2_000_000,
    spend: 80_000,
    debt: 0,
    entity4: 0,
    venture: 0,
    setupCost: 0,
    annualAdmin: 0,
    sleeve: null,
    sleevePct: 0,
    mode: 'balanced',
    ...over,
  }, rates);
}

const steady = run({ dial: 100 });
const growth = run({ dial: 0 });
const withHouse = run({ dial: 100, entity4: 300_000 });
const withDebt = run({ dial: 100, debt: 40_000 });
const withBusiness = run({ dial: 100, venture: 100_000 });
const bigSteady = run({ amount: 8_000_000, spend: 200_000, dial: 100 });
const stayed = run({ dial: 50 });
const moved = run({ dial: 50, residency: 'move', target: 'WY' });
const inPr = run({ dial: 50, residency: 'pr' });

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="grid gap-1 border-t border-border py-3 sm:grid-cols-[14rem_1fr]">
      <div className="text-sm font-medium">{label}</div>
      <div>
        <div className="font-num text-[15px]">{value}</div>
        {note && <div className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{note}</div>}
      </div>
    </div>
  );
}

export default function ExplainView() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SectionTitle
        num="08"
        title={<>What the money <span className="sig-italic">actually does</span></>}
        blurb="This page is one made-up winner, followed all the way through. It is not your prize, and none of these amounts are applied to you."
      />

      <section id="trade" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">The decision, in one story</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>You take the cash instead of a check every year for 30 years. Tax comes out first. What is left has two jobs that fight each other. It can pay you each year, or it can still be there in 25 years. A dollar you spend is a dollar that is no longer growing. You do not get the larger check and the larger pile.</p>
          <p>The person in this example is named Alex. Alex lives in Colorado and files taxes alone. After tax, Alex has {fmt(2_000_000)}. Alex types {fmt(80_000)} a year to live on. Alex types {fmt(0)} for debt, {fmt(0)} for a house, and {fmt(0)} for a business. The first year, {fmt(steady.yr1Reserve)} is held back and not invested. {fmt(steady.core)} is what actually gets invested. The check from the investments starts in year 2.</p>
          <p>Same person, same {fmt(2_000_000)}, two ways to invest it. The rates are the ones on the calculator right now: bonds {pct(rates.muniYield)}, stocks growing at {pct(rates.eqGrowth)}.</p>
        </div>
        <div className="mt-4">
          <Row label="Steadier check" value={`${fmt(steady.capacity)} a year · ${fmt(steady.stackEnd)} in 25 years`} note={`${pct(steady.weights.a, 0)} bonds, ${pct(steady.weights.b, 0)} insurance, ${pct(steady.weights.c, 0)} stocks.`} />
          <Row label="Bigger pile later" value={`${fmt(growth.capacity)} a year · ${fmt(growth.stackEnd)} in 25 years`} note={`${pct(growth.weights.a, 0)} bonds, ${pct(growth.weights.b, 0)} insurance, ${pct(growth.weights.c, 0)} stocks.`} />
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          The steadier mix pays {fmt(steady.capacity - growth.capacity)} more each year. The other mix is worth {fmt(growth.stackEnd - steady.stackEnd)} more in 25 years. That gap is the cost of the larger check. If Alex spends more than the investments can pay, the pile is sold to make the check, and the year-25 number falls further.
        </p>
      </section>

      <section id="bonds" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Bonds, in Alex’s steadier mix</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {fmt(steady.muni)} of Alex’s invested money is in bonds. At {pct(rates.muniYield)}, that pays {fmt(steady.muni * rates.muniYield)} a year. The interest does not depend on the stock market. The bonds themselves do not grow, so this is the mix with the smaller pile in 25 years: {fmt(steady.stackEnd)}.
        </p>
      </section>

      <section id="stocks" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Stocks, in the bigger-pile mix</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {fmt(growth.equity)} is in stocks. These rates grow that money at {pct(rates.eqGrowth)} a year and spend {pct(rates.eqDraw)} of it a year, which is {fmt(growth.equity * rates.eqDraw)}. That is why this mix pays less now ({fmt(growth.capacity)} a year) and is worth more later ({fmt(growth.stackEnd)}). If stocks do worse than {pct(rates.eqGrowth)}, this is the mix that loses more, because more of Alex’s money was sitting there. This example does not add a crash on top of that rate.
        </p>
      </section>

      <section id="policy" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">The insurance policy, and why Alex does not have one</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>The policy is extra paperwork. It is only used when at least {fmt(PPLI_QP_MIN)} is left to invest. Alex has {fmt(steady.core)} invested, which is under that, so the policy is {fmt(steady.ppli)}. Nothing was removed to make that happen. The amount was too small.</p>
          <p>Same life, but {fmt(8_000_000)} left after tax, and {fmt(200_000)} a year to spend. Now {fmt(bigSteady.ppli)} goes into the policy. At the calculator’s rates it can pay {fmt(bigSteady.ppli * rates.ppliDraw)} a year from that piece, and what stays inside grows at {pct(rates.ppliGrowth)}. Skip the policy and that paycheck and that growth are both gone. You keep the bonds and the stocks.</p>
        </div>
      </section>

      <section id="house" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">A house, only if Alex types it</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Alex types {fmt(300_000)} for a house. {fmt(withHouse.housePaid)} is not invested. There is no percentage and no cap. The steadier mix, which was worth {fmt(steady.stackEnd)} in 25 years, is worth {fmt(withHouse.stackEnd)} instead. The difference, {fmt(steady.stackEnd - withHouse.stackEnd)}, is the growth Alex gave up. The house itself is not given a price here. You only see the smaller pile. Type {fmt(0)} and nothing is set aside.
        </p>
      </section>

      <section id="not-included" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">A debt, only if Alex types it</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Alex types {fmt(40_000)} of debt. {fmt(withDebt.debtPaid)} is paid from the cash after tax, before anything is invested. It does not change the tax. The year-25 pile goes from {fmt(steady.stackEnd)} to {fmt(withDebt.stackEnd)}. A gift to charity is not in these numbers at all. Nothing is subtracted for one unless you are looking at a line that names the dollars.
        </p>
      </section>

      <section id="business" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">A business, only if Alex types it</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Alex types {fmt(100_000)} for a business. {fmt(withBusiness.venturePaid)} is not invested. The year-25 pile is {fmt(withBusiness.stackEnd)} instead of {fmt(steady.stackEnd)}. No slice is taken on its own. A real business can also lose the money. That loss is not added on top of this number.
        </p>
      </section>

      <section id="lockup" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">A slice locked for ten years</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Alex’s example does not lock anything away. These questions do not create one. A library item does that only if you turn it on and set the percent yourself. That percent starts at zero, so leaving it alone takes {fmt(0)}.
        </p>
      </section>

      <section id="move" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Moving, with the same {fmt(2_000_000)}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Alex’s prize was already taxed in Colorado. Moving does not change that. What can change is state tax on later investment income that is not already sheltered. Staying, the pile in 25 years is {fmt(stayed.stackEnd)}. Moving to Wyoming, it is {fmt(moved.stackEnd)}. The difference is {fmt(Math.abs(moved.stackEnd - stayed.stackEnd))}. It is small here because most of the yearly cash in this setup is already treated as tax-free. Moving does more for an ordinary taxable account than it does inside this one.
        </p>
      </section>

      <section id="puerto-rico" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Puerto Rico, same person, same dollars</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          If Alex actually lives in Puerto Rico more than half the year, the same {fmt(2_000_000)} is worth {fmt(inPr.stackEnd)} in 25 years, against {fmt(stayed.stackEnd)} for staying in Colorado. The prize itself stays taxed. A mailing address does not get this. The difference is {fmt(Math.abs(inPr.stackEnd - stayed.stackEnd))}.
        </p>
      </section>

      <section id="spend-now" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">What “a larger check now” costs Alex</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Alex gets {fmt(steady.capacity)} a year instead of {fmt(growth.capacity)}. In 25 years Alex has {fmt(steady.stackEnd)} instead of {fmt(growth.stackEnd)}. That is the whole trade. More cash in hand. Less left to leave to anyone.
        </p>
      </section>

      <section id="grow" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">What “leave more for later” costs Alex</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Alex gets {fmt(growth.stackEnd)} in 25 years instead of {fmt(steady.stackEnd)}, and gives up {fmt(steady.capacity - growth.capacity)} of check each year to do it. The extra pile only shows up if the money is left invested.
        </p>
      </section>

      <section id="middle" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">The middle, on the same {fmt(2_000_000)}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          A middle mix pays {fmt(stayed.capacity)} a year and is worth {fmt(stayed.stackEnd)} in 25 years. The check is {fmt(Math.abs(steady.capacity - stayed.capacity))} {steady.capacity >= stayed.capacity ? 'smaller' : 'larger'} than the steadier mix. The pile is {fmt(Math.abs(growth.stackEnd - stayed.stackEnd))} {growth.stackEnd >= stayed.stackEnd ? 'smaller' : 'larger'} than the growth mix. Alex is refusing to bet the whole thing on one.
        </p>
      </section>

      <section id="simple" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Skipping the policy</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          On Alex’s {fmt(2_000_000)}, the policy was already {fmt(0)}, because {fmt(steady.core)} is under {fmt(PPLI_QP_MIN)}. Skipping it changes nothing at this size. On the {fmt(8_000_000)} example, the policy holds {fmt(bigSteady.ppli)}. Dropping it means that money goes back to bonds and stocks, and the {fmt(bigSteady.ppli * rates.ppliDraw)} a year from the policy goes with it.
        </p>
      </section>

      <section id="assumptions" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">The rates behind every number on this page</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Bonds {pct(rates.muniYield)}. Stocks, growth {pct(rates.eqGrowth)}. Stocks, the amount spent {pct(rates.eqDraw)}. Policy growth {pct(rates.ppliGrowth)}. Policy paycheck {pct(rates.ppliDraw)}. Inflation, which raises the check you asked for, {pct(rates.inflation)}. These are the rates on the calculator. Change them there and this example changes with them. They are not a promise that the next 25 years will look like this.
        </p>
      </section>
    </div>
  );
}
