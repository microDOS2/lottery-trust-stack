import { useMemo, useState } from 'react';
import { fmt, fmtCompact, pct } from '../lib/calc';
import { Explainer } from '../components/widgets';
import { Slider } from '@/components/ui/slider';

interface Props {
  suggestedPrice: number;
  marginalRate: number;
}

export default function RealEstatePanel({ suggestedPrice, marginalRate }: Props) {
  const [price, setPrice] = useState(0);
  const [appreciation, setAppreciation] = useState(0);
  const [rentYield, setRentYield] = useState(0);
  const [costSeg, setCostSeg] = useState(false);

  const r = useMemo(() => {
    const building = price * 0.8;
    const reclass = building * 0.25;
    const bonusDep = costSeg ? reclass : 0;
    const straightDep = building / 27.5;
    const yr1Shield = bonusDep + (costSeg ? (building - reclass) / 27.5 : straightDep);
    const shieldValue = yr1Shield * marginalRate;
    const grossRent = price * rentYield;
    const v10 = price * Math.pow(1 + appreciation, 10);
    const v25 = price * Math.pow(1 + appreciation, 25);
    const gain25 = v25 - price;
    return { building, bonusDep, yr1Shield, shieldValue, grossRent, v10, v25, gain25 };
  }, [price, appreciation, rentYield, costSeg, marginalRate]);

  return (
    <div className="hairline-card p-5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[13.5px] font-semibold uppercase tracking-wider rounded bg-accent text-accent-foreground px-1.5 py-0.5">Module</span>
        <h3 className="font-display text-lg font-semibold flex items-center gap-1">
          Real estate
          <Explainer text="A separate box for a rental property. It starts at zero. Nothing is calculated until you move the price." />
        </h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        This is not filled in for you. Move the sliders. Land is treated as 20% of the price and does not depreciate. The building is the other 80%.
        {suggestedPrice > 0 ? ` You typed ${fmt(suggestedPrice)} for a home on Goals. That number is not copied here.` : ''}
      </p>

      <div className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-[14px]">
            <span className="font-medium flex items-center gap-1">Property price <Explainer text="What you would pay. The slider starts at zero. It does not use the home amount from Goals." /></span>
            <span className="font-num text-muted-foreground">{fmtCompact(price)}</span>
          </div>
          <Slider value={[price]} min={0} max={10000000} step={50000} onValueChange={([v]) => setPrice(v)} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[14px]">
            <span className="font-medium flex items-center gap-1">Annual appreciation <Explainer text="How fast you think the property price rises each year. Zero means the price stays flat." /></span>
            <span className="font-num text-muted-foreground">{pct(appreciation)}</span>
          </div>
          <Slider value={[appreciation * 100]} min={0} max={8} step={0.25} onValueChange={([v]) => setAppreciation(v / 100)} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[14px]">
            <span className="font-medium flex items-center gap-1">Gross rent yield <Explainer text="Rent collected in a year, before expenses, as a share of the price. Zero means no rent in this box." /></span>
            <span className="font-num text-muted-foreground">{pct(rentYield)}</span>
          </div>
          <Slider value={[rentYield * 100]} min={0} max={10} step={0.25} onValueChange={([v]) => setRentYield(v / 100)} />
        </div>
        <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2">
          <span className="text-[14px] flex items-center gap-1">Cost-segregation study <Explainer text="A paid study that splits the building into parts that depreciate faster, so more of the deduction lands in year 1. Off means the building depreciates evenly over 27.5 years. The study fee is not in these numbers until you type a setup cost." /></span>
          <button title={costSeg ? 'Cost-segregation is on. More of the building’s deduction is pulled into year 1. Click to turn it off.' : 'Even depreciation over 27.5 years. Click to pull more of the deduction into year 1.'} onClick={() => setCostSeg(!costSeg)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors cursor-pointer ${costSeg ? 'bg-primary text-primary-foreground' : 'bg-card border border-input text-muted-foreground hover:border-primary/50'}`}>
            {costSeg ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-md bg-secondary p-3">
          <div className="font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Year-1 depreciation <Explainer text="The paper deduction in year 1. It is not cash. With the study off, it is the building divided by 27.5. With it on, 25% of the building is taken in year 1 and the rest still uses 27.5 years." /></div>
          <div className="font-num mt-1 text-lg font-semibold">{fmtCompact(r.yr1Shield)}</div>
          <div className="text-[12.5px] text-muted-foreground">{costSeg ? '25% of the building in year 1, rest over 27.5 years' : 'building ÷ 27.5 years'}</div>
        </div>
        <div className="rounded-md bg-secondary p-3">
          <div className="font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Tax the deduction offsets <Explainer text="Year-1 depreciation times the tax rate used on this page. It is the tax you would not pay on that much income. It is not a check." /></div>
          <div className="font-num mt-1 text-lg font-semibold stat-good">{fmtCompact(r.shieldValue)}</div>
          <div className="text-[12.5px] text-muted-foreground">at {pct(marginalRate, 0)}</div>
        </div>
        <div className="rounded-md bg-secondary p-3">
          <div className="font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Value at 10 and 25 years <Explainer text="Price grown by the appreciation you set. Rent is not added. Tax on a sale is not taken out." /></div>
          <div className="font-num mt-1 text-lg font-semibold">{fmtCompact(r.v10)} / {fmtCompact(r.v25)}</div>
          <div className="text-[12.5px] text-muted-foreground">price only, before rent and before sale tax</div>
        </div>
        <div className="rounded-md bg-secondary p-3">
          <div className="font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">Gain if sold at year 25 <Explainer text="Year-25 price minus what you paid. Selling can tax this gain and the depreciation you already took. A 1031 exchange delays that. It does not erase it unless the property is inherited." /></div>
          <div className="font-num mt-1 text-lg font-semibold stat-warm">{fmtCompact(r.gain25)}</div>
          <div className="text-[12.5px] text-muted-foreground">not taxed in this box until you sell</div>
        </div>
      </div>

      <p className="mt-4 rounded-md bg-secondary px-3 py-2 text-[14px] leading-relaxed text-muted-foreground">
        Rent in this box is about {fmt(r.grossRent)} a year before expenses. Depreciation can offset rent on paper. Selling can bring tax on the gain and on depreciation already taken.
        A 1031 exchange delays that tax. It does not remove it. The land share (20%), the study split (25%), and 27.5 years are written into this box. They are not quotes.
      </p>
    </div>
  );
}
