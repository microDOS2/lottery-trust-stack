import { useMemo, useState } from 'react';
import { computeStack, fmt, fmtCompact, pct, type Assumptions, type Inputs } from '../lib/calc';
import {
  ESTATE_TAX_RATE,
  FEDERAL_ESTATE_EXCLUSION,
  STATE_ESTATE_TAXES,
  TOP_MARGINAL_RATE,
  charitableBunching,
  estateTaxReadout,
  giftingPlan,
  type GiftAssetType,
} from '../lib/legacy';
import { Chips, Explainer, Field, GuidedNumber, Limit, SectionTitle, Stat } from '../components/widgets';

interface Props {
  inputs: Inputs;
  asm: Assumptions;
}

export default function LegacyView({ inputs, asm }: Props) {
  const result = useMemo(() => computeStack(inputs, asm), [inputs, asm]);

  // ---- Tool 1: death-year estate tax readout ----
  const [deathYear, setDeathYear] = useState(20);
  const estateAtDeath = result.projection[deathYear - 1]?.end ?? result.stackEnd;
  const estate = useMemo(() => estateTaxReadout(estateAtDeath, inputs.filing), [estateAtDeath, inputs.filing]);

  // ---- Tool 2: annual-exclusion gifting scheduler ----
  const [recipients, setRecipients] = useState(4);
  const gifts = useMemo(
    () =>
      giftingPlan({
        recipients,
        estate: result.projection[24]?.end ?? result.stackEnd,
        exclusion: FEDERAL_ESTATE_EXCLUSION[inputs.filing],
      }),
    [recipients, result, inputs.filing],
  );

  // ---- Tool 3: charitable bunching calculator ----
  const [giftAmount, setGiftAmount] = useState<number | undefined>(1_000_000);
  const [assetType, setAssetType] = useState<GiftAssetType>('cash');
  const bunch = useMemo(
    () => charitableBunching({ gift: giftAmount ?? 0, agi: result.gross, assetType }),
    [giftAmount, result.gross, assetType],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SectionTitle
        num="09"
        title={<>Estate &amp; <span className="sig-italic">legacy</span></>}
        blurb="What happens to the money when you are gone, and three plain-English tools to keep more of it with the people and causes you choose. Federal math only — education, not legal or tax advice."
      />

      {/* ---------- 1. Death-year estate tax readout ---------- */}
      <div className="hairline-card p-5">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-lg font-semibold">If you died in a given year</h3>
          <Explainer text="The federal estate tax takes 40 cents of every dollar above the exclusion ($15M per person in 2026, $30M for a married couple filing jointly). This uses the plan's own projection — no extra assumptions." />
        </div>
        <div className="mt-4">
          <Field label="Death year" help="Slide to any year in the 30-year plan. The estate shown is your projected stack value at the end of that year.">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={30}
                value={deathYear}
                onChange={(e) => setDeathYear(+e.target.value)}
                className="w-full accent-primary"
              />
              <span className="font-num w-20 shrink-0 text-right text-sm font-semibold">Year {deathYear}</span>
            </div>
          </Field>
        </div>

        <p className="mt-4 rounded-md border border-input bg-card px-3 py-2.5 text-[15px] font-medium leading-snug">
          {estate.covered
            ? `If you died in year ${deathYear}, the federal estate tax would be about $0 — the projected ${fmtCompact(estate.estate)} estate fits under the ${fmtCompact(estate.exclusion)} exclusion.`
            : `If you died in year ${deathYear}, the federal estate tax would be about ${fmt(Math.round(estate.tax))}.`}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Projected estate" value={fmtCompact(estate.estate)} sub={`Stack value at the end of year ${deathYear}`} />
          <Stat label="Federal exclusion" value={fmtCompact(estate.exclusion)} sub={inputs.filing === 'mfj' ? 'Married filing jointly, 2026' : 'Single, 2026'} />
          <Stat
            label="Federal estate tax"
            value={estate.covered ? '$0' : fmtCompact(estate.tax)}
            tone={estate.covered ? 'good' : 'warm'}
            sub={estate.covered ? 'Nothing above the exclusion' : `${pct(ESTATE_TAX_RATE, 0)} on ${fmtCompact(estate.excess)} above the line`}
          />
        </div>

        <Limit>
          This is federal-only math. Some states levy their own estate or inheritance tax with far lower exemptions —
          roughly: Oregon {fmtCompact(1_000_000)}, Massachusetts {fmtCompact(2_000_000)}, Washington {fmtCompact(3_000_000)},
          Illinois {fmtCompact(4_000_000)}, New York {fmtCompact(7_350_000)}, Connecticut {fmtCompact(15_000_000)}.
          {STATE_ESTATE_TAXES.some((s) => s.code === inputs.state) &&
            ` ${STATE_ESTATE_TAXES.find((s) => s.code === inputs.state)?.name} — your selected state — is one of them.`}
        </Limit>
      </div>

      {/* ---------- 2. Annual-exclusion gifting scheduler ---------- */}
      <div className="hairline-card p-5">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-lg font-semibold">Gifting into a dynasty trust</h3>
          <Explainer text="Each year you can give $19K per person to as many people as you like — no gift tax, no paperwork against your lifetime exclusion. Given to an irrevocable dynasty trust, that money (and all its growth) leaves your taxable estate for good." />
        </div>
        <div className="mt-4">
          <Field label="How many people receive gifts?" help="Children, grandchildren, anyone — the $19K annual exclusion is per recipient, per year.">
            <Chips
              chips={[
                { label: '2 people', value: 2 },
                { label: '4 people', value: 4 },
                { label: '6 people', value: 6 },
                { label: '10 people', value: 10 },
              ]}
              value={recipients}
              onChange={setRecipients}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Total gifted over 25 years" value={fmtCompact(gifts.totalGifted)} sub={`${fmtCompact(gifts.annualGift)} a year to ${gifts.recipients} people`} />
          <Stat label="Growth inside the trust" value={fmtCompact(gifts.growth)} sub={`At 7% a year, the gifts grow to ${fmtCompact(gifts.futureValue)}`} />
          <Stat
            label="Estate tax avoided"
            value={gifts.estateTaxAvoided > 0 ? fmtCompact(gifts.estateTaxAvoided) : '$0'}
            tone={gifts.estateTaxAvoided > 0 ? 'good' : 'default'}
            sub={
              gifts.estateTaxAvoided > 0
                ? `${pct(ESTATE_TAX_RATE, 0)} of ${fmtCompact(gifts.futureValue)} that would have been over the exclusion`
                : 'Projected estate at year 25 is already under the exclusion'
            }
          />
        </div>

        <p className="mt-4 rounded-md border border-input bg-card px-3 py-2.5 text-[15px] font-medium leading-snug">
          Gifting early beats gifting late because the growth is the prize: a gift made in year 1 spends 25 years
          compounding outside your estate, and every dollar of that growth escapes the 40% estate tax — the same
          gift made in year 20 barely gets started.
        </p>
      </div>

      {/* ---------- 3. Charitable bunching calculator ---------- */}
      <div className="hairline-card p-5">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-lg font-semibold">Charitable bunching in the win year</h3>
          <Explainer text="The year you claim the jackpot you sit in the top 37% bracket, so deductions are worth the most then. Bunching several years of giving into one big gift (often through a donor-advised fund) captures that rate. Cash gifts are deductible up to 60% of AGI; appreciated assets up to 30%. Anything over the limit carries forward 5 years." />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <GuidedNumber
            label="One-time gift in the win year"
            value={giftAmount}
            onChange={setGiftAmount}
            placeholder="e.g. 1000000"
            chips={[
              { label: '$250K', value: 250_000 },
              { label: '$1M', value: 1_000_000 },
              { label: '$5M', value: 5_000_000 },
              { label: '$10M', value: 10_000_000 },
            ]}
            hint="A single large gift — for example into a donor-advised fund you grant from over time."
          />
          <Field label="What are you giving?" help="Cash can be deducted up to 60% of AGI. Appreciated assets (stock, property) are capped at 30% — but you also skip the capital gains tax on them.">
            <div className="flex gap-1.5">
              {(['cash', 'appreciated'] as GiftAssetType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAssetType(t)}
                  className={`rounded-full border px-3 py-2 font-mono text-[12px] min-h-[36px] cursor-pointer ${
                    assetType === t ? 'border-primary bg-accent text-accent-foreground' : 'border-input text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {t === 'cash' ? 'Cash (60% of AGI)' : 'Appreciated assets (30%)'}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <p className="mt-4 rounded-md border border-input bg-card px-3 py-2.5 text-[15px] font-medium leading-snug">
          Give {fmtCompact(bunch.gift)} this year → save {fmt(Math.round(bunch.savedNow))} in federal tax
          {bunch.carriedForward > 0
            ? `, with ${fmtCompact(bunch.carriedForward)} carried forward to deduct over the next ${bunch.carryYears} years`
            : ', with nothing carried forward — the whole gift fits under the limit'}.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Deductible this year"
            value={fmtCompact(bunch.deductibleNow)}
            sub={`${pct(bunch.limitPct, 0)} of AGI (${fmtCompact(bunch.agi)}) = ${fmtCompact(bunch.limit)} limit`}
          />
          <Stat label="Federal tax saved" value={fmtCompact(bunch.savedNow)} tone="good" sub={`At the ${pct(TOP_MARGINAL_RATE, 0)} top bracket`} />
          <Stat
            label="Carried forward"
            value={fmtCompact(bunch.carriedForward)}
            tone={bunch.carriedForward > 0 ? 'warm' : 'default'}
            sub={bunch.carriedForward > 0 ? `Usable over the next ${bunch.carryYears} years` : 'Nothing left over'}
          />
        </div>
      </div>
    </div>
  );
}
