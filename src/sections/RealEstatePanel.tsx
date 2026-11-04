import { useMemo, useState } from 'react';
import { fmt, fmtCompact, pct } from '../lib/calc';
import { Slider } from '@/components/ui/slider';

interface Props {
  suggestedPrice: number; // Entity #4 reserve
  marginalRate: number;   // for valuing the depreciation shield
}

export default function RealEstatePanel({ suggestedPrice, marginalRate }: Props) {
  const [price, setPrice] = useState(Math.max(500_000, suggestedPrice || 500_000));
  const [appreciation, setAppreciation] = useState(0.035);
  const [rentYield, setRentYield] = useState(0.04);
  const [costSeg, setCostSeg] = useState(true);

  const r = useMemo(() => {
    const building = price * 0.8;                       // land (~20%) never depreciates
    const reclass = building * 0.25;                    // typical cost-seg reclass to 5/7/15-yr property
    const bonusDep = costSeg ? reclass : 0;             // 100% bonus depreciation (2025+ law)
    const straightDep = building / 27.5;                // standard residential schedule
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
        <span className="font-mono text-[13.5px] font-semibold uppercase tracking-wider rounded bg-accent text-accent-foreground px-1.5 py-0.5">New module</span>
        <h3 className="font-display text-lg font-semibold">Real estate inside Entity #4</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The anonymous LLC can hold investment property, not just your home. Three quiet tax engines do the work:
        depreciation shields the rent, 1031 exchanges roll gains forward forever, and the basis step-up at death can erase them entirely.
      </p>

      <div className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-[14px]"><span className="font-medium">Property price</span><span className="font-num text-muted-foreground">{fmtCompact(price)}</span></div>
          <Slider value={[price]} min={250000} max={10000000} step={50000} onValueChange={([v]) => setPrice(v)} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[14px]"><span className="font-medium">Annual appreciation</span><span className="font-num text-muted-foreground">{pct(appreciation)}</span></div>
          <Slider value={[appreciation * 100]} min={0} max={8} step={0.25} onValueChange={([v]) => setAppreciation(v / 100)} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[14px]"><span className="font-medium">Gross rent yield</span><span className="font-num text-muted-foreground">{pct(rentYield)}</span></div>
          <Slider value={[rentYield * 100]} min={0} max={10} step={0.25} onValueChange={([v]) => setRentYield(v / 100)} />
        </div>
        <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2">
          <span className="text-[14px]">Cost-segregation study</span>
          <button title={costSeg ? 'A cost-segregation study is on. It pulls more of the building’s depreciation into year 1. Click to turn it off.' : 'Straight-line depreciation. Click to turn on a cost-segregation study, which front-loads the deduction.'} onClick={() => setCostSeg(!costSeg)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors cursor-pointer ${costSeg ? 'bg-primary text-primary-foreground' : 'bg-card border border-input text-muted-foreground hover:border-primary/50'}`}>
            {costSeg ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-md bg-secondary p-3">
          <div className="font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground">Year-1 depreciation</div>
          <div className="font-num mt-1 text-lg font-semibold">{fmtCompact(r.yr1Shield)}</div>
          <div className="text-[12.5px] text-muted-foreground">{costSeg ? 'cost-seg + 100% bonus' : 'straight-line 27.5 yr'}</div>
        </div>
        <div className="rounded-md bg-secondary p-3">
          <div className="font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground">Shield value</div>
          <div className="font-num mt-1 text-lg font-semibold stat-good">{fmtCompact(r.shieldValue)}</div>
          <div className="text-[12.5px] text-muted-foreground">at your {pct(marginalRate, 0)} marginal rate</div>
        </div>
        <div className="rounded-md bg-secondary p-3">
          <div className="font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground">Value @ 10 / 25 yrs</div>
          <div className="font-num mt-1 text-lg font-semibold">{fmtCompact(r.v10)} / {fmtCompact(r.v25)}</div>
          <div className="text-[12.5px] text-muted-foreground">before rent, untaxed while held</div>
        </div>
        <div className="rounded-md bg-secondary p-3">
          <div className="font-mono text-[13.5px] uppercase tracking-wider text-muted-foreground">25-yr embedded gain</div>
          <div className="font-num mt-1 text-lg font-semibold stat-warm">{fmtCompact(r.gain25)}</div>
          <div className="text-[12.5px] text-muted-foreground">deferred by 1031s, erased by step-up</div>
        </div>
      </div>

      <p className="mt-4 rounded-md bg-secondary px-3 py-2 text-[14px] leading-relaxed text-muted-foreground">
        Rent of about {fmt(r.grossRent)}/yr is largely offset by depreciation on paper. Sell and you owe tax on the gain plus
        depreciation recapture — so the playbook is to 1031-exchange into the next property instead, and let heirs inherit at
        stepped-up basis. Real estate inside the LLC compounds tax-deferred; it is the slow, steady cousin of Engine C.
      </p>
    </div>
  );
}
