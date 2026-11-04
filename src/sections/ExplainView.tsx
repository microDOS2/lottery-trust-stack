import { SectionTitle } from '../components/widgets';
import { computeStack, fmt, pct, PPLI_QP_MIN, type Assumptions, type Inputs } from '../lib/calc';
import { stateByCode } from '../lib/taxdata';

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

export default function ExplainView({ inputs, asm }: { inputs: Inputs; asm: Assumptions }) {
  const yours = computeStack(inputs, asm);
  const steady = computeStack({ ...inputs, mode: 'balanced', dial: 100 }, asm);
  const growth = computeStack({ ...inputs, mode: 'balanced', dial: 0 }, asm);
  const middle = computeStack({ ...inputs, mode: 'balanced', dial: 50 }, asm);
  const noPolicy = computeStack({ ...inputs, mode: 'manual', manual: { a: 0.5, b: 0, c: 0.5 } }, asm);
  const stayed = computeStack({ ...inputs, residency: 'stay' }, asm);
  const moved = computeStack({ ...inputs, residency: 'move' }, asm);
  const inPr = computeStack({ ...inputs, residency: 'pr' }, asm);
  const noHouse = computeStack({ ...inputs, entity4: 0 }, asm);
  const noDebt = computeStack({ ...inputs, debt: 0 }, asm);
  const noVenture = computeStack({ ...inputs, venture: 0 }, asm);
  const here = stateByCode(inputs.state);
  const there = stateByCode(inputs.target);

  if (inputs.amount <= 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <SectionTitle
          num="08"
          title={<>Your numbers, <span className="sig-italic">explained</span></>}
          blurb="This page explains the cash amount you typed, the stack, and the protection choices. There is nothing in dollars until you enter a cash amount."
        />
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Go to Goals & Fit and type the winning cash amount. This page will then use that amount. The sections below do not need a cash amount.
        </p>
        <StackFacts />
        <Protection />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SectionTitle
        num="08"
        title={<>Your numbers, <span className="sig-italic">explained</span></>}
        blurb="Every dollar on this page comes from what you typed. The stack sections explain what is tax-free, what is not, and when Puerto Rico matters."
      />

      <StackFacts />
      <Protection />

      <section id="trade" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">The choice your cash has to make</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>You typed {fmt(inputs.amount)}{inputs.basis === 'net' ? ', and you said the tax is already paid' : ', before tax'}. After tax, that is {fmt(yours.net)}. You live in {here.name}. You asked for {fmt(inputs.spend)} a year.</p>
          <p>The first year holds back {fmt(yours.yr1Reserve)}. That is the spending you typed plus setup cost, and it is not invested. {fmt(yours.core)} is what gets invested. The check from the investments starts in year 2.</p>
          <p>The same dollars can pay you more each year, or leave more later. A dollar you spend is a dollar that is no longer growing. You do not get the larger check and the larger pile. A larger amount left in 25 years is not a win. You may not be alive then. Below, your dollars are split two ways so you can see the trade. Your debt, home, and business amounts are left as you typed them.</p>
        </div>
        <div className="mt-4">
          <Row label="Steadier check" value={`${fmt(steady.capacity)} a year · ${fmt(steady.stackEnd)} in 25 years`} note={`${pct(steady.weights.a, 0)} bonds, ${pct(steady.weights.b, 0)} insurance, ${pct(steady.weights.c, 0)} stocks.`} />
          <Row label="Bigger pile later" value={`${fmt(growth.capacity)} a year · ${fmt(growth.stackEnd)} in 25 years`} note={`${pct(growth.weights.a, 0)} bonds, ${pct(growth.weights.b, 0)} insurance, ${pct(growth.weights.c, 0)} stocks.`} />
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          The steadier split pays {fmt(Math.abs(steady.capacity - growth.capacity))} {steady.capacity >= growth.capacity ? 'more' : 'less'} each year. The other is worth {fmt(Math.abs(growth.stackEnd - steady.stackEnd))} {growth.stackEnd >= steady.stackEnd ? 'more' : 'less'} in 25 years. If the check you asked for is larger than what the investments can pay, the pile is sold to make the check. Year 25 is shown only so the trade is visible. It is not the finish line.
        </p>
      </section>

      <section id="bonds" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Bonds</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          On the steadier split, {fmt(steady.muni)} of your invested money is in bonds. At the rate on the calculator, {pct(asm.muniYield)}, that pays {fmt(steady.muni * asm.muniYield)} a year. The interest does not depend on the stock market. The bonds themselves do not grow, which is why that split has the smaller pile in 25 years: {fmt(steady.stackEnd)}.
        </p>
      </section>

      <section id="stocks" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Stocks</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          On the bigger-pile split, {fmt(growth.equity)} is in stocks. The calculator grows that at {pct(asm.eqGrowth)} a year and spends {pct(asm.eqDraw)} of it a year, which is {fmt(growth.equity * asm.eqDraw)}. That split pays {fmt(growth.capacity)} a year and is worth {fmt(growth.stackEnd)} in 25 years. If stocks do worse than {pct(asm.eqGrowth)}, this is the split that loses more, because more of your money is there.
        </p>
      </section>

      <section id="policy" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">The insurance policy</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {yours.core < PPLI_QP_MIN
            ? `The policy is ${fmt(yours.ppli)}. Your invested amount is ${fmt(yours.core)}, and the policy is only used when at least ${fmt(PPLI_QP_MIN)} is left to invest. Nothing was removed to make that happen. The amount is too small.`
            : `${fmt(yours.ppli)} of your invested money is in the policy. At the calculator’s rate it can pay ${fmt(yours.ppli * asm.ppliDraw)} a year from that piece, and what stays inside grows at ${pct(asm.ppliGrowth)}. It is extra paperwork. Without it, the same dollars are worth ${fmt(noPolicy.stackEnd)} in 25 years instead of ${fmt(yours.stackEnd)}, and the yearly check is ${fmt(noPolicy.capacity)} instead of ${fmt(yours.capacity)}.`}
        </p>
      </section>

      <section id="house" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">A home</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {inputs.entity4 <= 0
            ? `You typed ${fmt(0)}. Nothing is set aside for a home.`
            : `You typed ${fmt(inputs.entity4)}. ${fmt(yours.housePaid)} of that is not invested. With it, the pile in 25 years is ${fmt(yours.stackEnd)}. Without that home amount, the same other numbers leave ${fmt(noHouse.stackEnd)}. The difference is ${fmt(Math.abs(noHouse.stackEnd - yours.stackEnd))}. The house itself is not given a price here.`}
        </p>
      </section>

      <section id="not-included" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Debt</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {inputs.debt <= 0
            ? `You typed ${fmt(0)}. Nothing is paid off before investing.`
            : `You typed ${fmt(inputs.debt)}. ${fmt(yours.debtPaid)} is paid from the cash after tax, before anything is invested. It does not change the tax. With that payment, the pile in 25 years is ${fmt(yours.stackEnd)}. Without it, ${fmt(noDebt.stackEnd)}. A gift to charity is not subtracted.`}
        </p>
      </section>

      <section id="business" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">A business</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {inputs.venture <= 0
            ? `You typed ${fmt(0)}. Nothing is taken out for a business.`
            : `You typed ${fmt(inputs.venture)}. ${fmt(yours.venturePaid)} of that is not invested. With it, the pile in 25 years is ${fmt(yours.stackEnd)}. Without it, ${fmt(noVenture.stackEnd)}. A real business can also lose the money. That loss is not added on top of this number.`}
        </p>
      </section>

      <section id="lockup" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">A slice locked for ten years</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {yours.sleeveAmount <= 0
            ? `Nothing is locked away. Your library percent is ${pct(inputs.sleevePct, 0)}, so the amount taken out of the stocks is ${fmt(0)} until you set that percent yourself.`
            : `${fmt(yours.sleeveAmount)} is taken out of the stocks because you set the library percent to ${pct(inputs.sleevePct, 0)}. That is the only lockup in your numbers.`}
        </p>
      </section>

      <section id="move" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Moving</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          The tax on the prize stays {here.name}’s. Moving does not change it. If you stay, the pile in 25 years is {fmt(stayed.stackEnd)}. If the later investment income is taxed in {there.name} instead, it is {fmt(moved.stackEnd)}. The difference is {fmt(Math.abs(moved.stackEnd - stayed.stackEnd))}.
        </p>
      </section>

      <section id="puerto-rico" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Puerto Rico</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>The prize is not from Puerto Rico. It is taxed in {here.name}, the state you live in when you receive it. Moving does not change that tax.</p>
          <p>Puerto Rico can exclude stock gains from US federal tax only in a year you are a bona fide resident. That requires the presence test, the tax-home test, and the closer-connection test for that year. The usual presence test is 183 days in Puerto Rico. Days outside Puerto Rico, on a boat or traveling, do not count. A mailing address, bills, and a license do not replace the days.</p>
          <p>Each year is separate. A year you qualify, qualifying stock gains sold that year can use the Puerto Rico path. A year you do not qualify, those gains are taxed under the ordinary US rules. Living there one year does not carry the status into the next.</p>
          <p>Compared with Nevada: Nevada has no state income tax, and traveling does not turn that off, because there is no day-count test. You still pay US federal tax on stock gains every year. Puerto Rico can remove that federal tax on qualifying gains, but only in the years you qualify.</p>
          <p>The tax-free pieces of the stack do not gain from Puerto Rico. Municipal bond interest, money taken from the insurance policy under the rules, qualifying startup-stock gains, and opportunity-zone appreciation after ten years are already federal exclusions. Puerto Rico adds nothing to them. It matters only if stocks from the stack are sold in a qualifying year. If you never sell the stocks and only borrow against them, Puerto Rico adds nothing to the stack.</p>
          <p>On your dollars, if the Puerto Rico path applied every year, the pile in 25 years is {fmt(inPr.stackEnd)}. Staying in {here.name}, it is {fmt(stayed.stackEnd)}. The difference is {fmt(Math.abs(inPr.stackEnd - stayed.stackEnd))}. That comparison assumes you qualify every year. If you do not, the difference is smaller or zero.</p>
        </div>
      </section>

      <section id="spend-now" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">A larger check now</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          On your dollars, the steadier split pays {fmt(steady.capacity)} a year and leaves {fmt(steady.stackEnd)} in 25 years. That is more cash in hand and less left later than the other split.
        </p>
      </section>

      <section id="grow" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">More left in 25 years</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          The other split pays {fmt(growth.capacity)} a year and leaves {fmt(growth.stackEnd)}. The extra pile is only there if the money stays invested. A larger pile is not a win if you are not alive to use it.
        </p>
      </section>

      <section id="middle" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">The middle split</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          A middle split of your dollars pays {fmt(middle.capacity)} a year and is worth {fmt(middle.stackEnd)} in 25 years. The check is smaller than the steadier split. The pile is smaller than the growth split.
        </p>
      </section>

      <section id="simple" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">No insurance policy</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          With the policy removed and the money split half bonds and half stocks, the yearly check is {fmt(noPolicy.capacity)} and the pile in 25 years is {fmt(noPolicy.stackEnd)}. Your current numbers pay {fmt(yours.capacity)} a year and leave {fmt(yours.stackEnd)}.
        </p>
      </section>

      <section id="assumptions" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">The rates on your numbers</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Bonds {pct(asm.muniYield)}. Stocks, growth {pct(asm.eqGrowth)}. Stocks, the amount spent {pct(asm.eqDraw)}. Policy growth {pct(asm.ppliGrowth)}. Policy paycheck {pct(asm.ppliDraw)}. Inflation {pct(asm.inflation)}. These are the rates on the calculator. Change them there and every figure on this page changes with them. They are not a promise about the next 25 years.
        </p>
      </section>
    </div>
  );
}

function StackFacts() {
  return (
    <>
      <section id="stack-free" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">What the stack makes tax-free</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>These are federal. They apply to a US person no matter which US state they live in. A state can still tax some of them. Nevada taxes none of them because it has no income tax.</p>
          <p>Municipal bond interest is excluded from federal income tax. Money taken from the insurance policy, up to what you put in, then as policy loans, is not taxed as income. Growth inside the policy is not taxed yearly. The death benefit is not income-taxed. Startup stock that qualifies can exclude the gain from federal tax, up to the per-company cap, after the holding period. Opportunity-zone appreciation after a 10-year hold can be excluded from federal tax.</p>
          <p>The stack does not make ordinary stock gains, dividends, or interest from US companies tax-free. Those stay federally taxable wherever you live in the US.</p>
        </div>
      </section>

      <section id="borrow" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Borrowing instead of selling</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>You can pledge the stocks and take a loan. A loan is not income, so there is no tax on the money you receive. The stocks stay in place. You still owe the loan.</p>
          <p>At death, the stocks get a new cost basis equal to their value then. The gain that built up is not taxed as income to the heirs. The loan is still a debt of the estate.</p>
          <p>Lenders typically advance 50–70% of a diversified stock portfolio. If the stocks drop and the loan is too large relative to them, the lender can force a sale. A loan above about 30% of the stocks is the point where that risk gets real. Interest is still owed.</p>
          <p>If the stocks are sold to pay the loan, whether the lender forces the sale or you choose to sell, the sale is taxed. The sale price minus what you paid is a capital gain. Using the money to pay the loan does not erase the gain. Paying off every loan by selling stock taxes each sale the same way.</p>
        </div>
      </section>

      <section id="harvest" className="hairline-card scroll-mt-24 p-6">
        <h2 className="font-display text-2xl font-semibold">Offsetting a gain</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>The direct-indexed stocks are held as individual shares. Shares that have fallen can be sold to lock in a loss. Those losses offset gains from shares that are sold to pay a loan, up to the amount of the losses. You do not buy stocks intending them to lose money. You use declines that happen.</p>
          <p>If you sell a stock at a loss and buy the same stock again within 30 days before or after the sale, the loss is disallowed. That is the wash-sale rule. You can sell the stock that is down and buy a different stock that is similar but not the same. The loss is allowed. If you wait until day 31 or later and buy the same stock, the loss is also allowed.</p>
          <p>If the whole portfolio is up, there is no loss to harvest. The bond interest and the policy do not create losses that offset stock gains.</p>
        </div>
      </section>
    </>
  );
}

function Protection() {
  return (
    <section id="protection" className="hairline-card scroll-mt-24 p-6">
      <h2 className="font-display text-2xl font-semibold">Protecting you and the estate</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
        <p>A trust does not stop you from being sued. You can still be sued. What reduces the damage is insurance and distance. Liability insurance and an umbrella policy pay claims up to their limits. That is what protects you, the person. Keeping your name off a house, a car, and a bank account does not stop the suit. It makes you harder to find and harder to collect from.</p>
        <p>You can have more than one trust at the same time. A revocable trust and one or more irrevocable trusts can exist together. You can be the only beneficiary of all of them.</p>
        <p>A revocable trust can be changed or cancelled by you. You still control it, so you still own what is in it. A lawsuit can reach it while you are alive. It is useful for who gets the money after you die, and for keeping a probate court out of it. It is not asset protection.</p>
        <p>An irrevocable trust cannot be taken back, and you cannot change it on your own. Someone else is the trustee. You can still be allowed money from it, on the schedule or the conditions in the document. You no longer own what you put in. That is why a later lawsuit has a harder time taking those assets. It only works if the transfer happened before the claim, and not to dodge a creditor. A court can undo a transfer that was too late or made to hide assets.</p>
        <p>A domestic asset protection trust is an irrevocable trust in a US state that allows you to be a beneficiary and still have some protection. Nevada, South Dakota, Delaware, and Alaska are the usual ones. Protection is not absolute. It fails if the transfer was too late or made to hide assets from a known creditor.</p>
        <p>A foreign asset protection trust is the same idea, set up outside the United States. It can be harder for a US court to reach. It does not hide the money from the IRS. It can create extra reporting, and a court can jail you for refusing to bring the assets back.</p>
        <p>A spendthrift provision limits a beneficiary’s creditors. It protects the beneficiary, not you, if you created the trust and still benefit from it. An irrevocable life insurance trust holds a policy so the payout is outside your estate. It is for estate tax, not for stopping a lawsuit against you.</p>
        <p>A trustee has a legal duty to follow the trust terms and act for the beneficiary. You choose the trustee. You can name a co-trustee. You can name a trust protector who can remove the trustee. You can write distribution standards that require the trustee to pay you for living costs, care, or other needs. You can require accountings. What you cannot do is keep the power to force distributions or to remove and replace the trustee at will. That power can make the protection fail and can make the IRS treat the assets as still yours.</p>
        <p>Insurance protects you, the person. The irrevocable trust protects assets that were moved in time. A revocable trust protects neither from a lawsuit while you are alive. None of them hide money from the tax office. Answering a question does not create a trust. A lawyer has to draft it. Theft and pressure from people close to you are not solved by a trust alone. That is who can sign, who has access, and who knows.</p>
      </div>
    </section>
  );
}
