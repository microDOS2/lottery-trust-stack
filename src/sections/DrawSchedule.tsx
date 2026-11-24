import { useEffect, useMemo, useRef, useState } from 'react';
import { computeStack, drawForYear, fmt, fmtCompact, HORIZON, solveSpendForTarget, type Assumptions, type Inputs, type StackResult } from '../lib/calc';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Copy, Redo2, Undo2 } from 'lucide-react';

interface Props {
  inputs: Inputs;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
  result: StackResult;
  asm: Assumptions;
}

type Overrides = Record<number, number>;
type Events = Record<number, string>;
interface Snapshot { overrides: Overrides; flatDraw: boolean; events: Events }
interface NamedPattern extends Snapshot { id: string; name: string }
type RangeAction = 'set' | 'zero' | 'ramp' | 'percent-up' | 'percent-down' | 'dollars-up' | 'dollars-down' | 'cap' | 'clear';
type GoalType = 'preserve' | 'legacy' | 'spenddown' | 'delay';

const PATTERNS: Array<{ id: string; label: string; hint: string }> = [
  { id: 'flat', label: 'Same amount every year', hint: 'A flat check, forever. More stays compounding than with inflation-linked.' },
  { id: 'inflated', label: 'Grow it with prices', hint: 'The check rises with inflation, so your lifestyle stays constant in real terms.' },
  { id: 'front', label: 'More early, less later', hint: '1.5× the target for 10 years, then half. For people who want the big life now.' },
  { id: 'back', label: 'Less early, more later', hint: 'Half the target for 10 years, then 1.5×. For people building the pile first.' },
  { id: 'oneoff', label: 'One big year (year 5)', hint: '4× the target in year 5 — a house, a business, a dream — and the normal target otherwise.' },
  { id: 'skip5', label: 'Just grow for 5 years first', hint: '$0 for five years, then the normal target. Maximum compounding up front.' },
];
const RANGE_ACTIONS: Array<{ id: RangeAction; label: string }> = [
  { id: 'set', label: 'Set exact amount' }, { id: 'zero', label: 'Set to $0' },
  { id: 'ramp', label: 'Ramp from A to B' }, { id: 'percent-up', label: 'Increase by %' },
  { id: 'percent-down', label: 'Decrease by %' }, { id: 'dollars-up', label: 'Add dollars' },
  { id: 'dollars-down', label: 'Subtract dollars' }, { id: 'cap', label: 'Cap at estimated capacity' },
  { id: 'clear', label: 'Clear custom edits' },
];
const EVENT_PRESETS = ['Home purchase', 'Sailboat', 'Business investment', 'Gift', 'Vehicle', 'Rental property', 'Other event'];
const snapshotOf = (inputs: Inputs): Snapshot => ({
  overrides: { ...(inputs.drawOverrides ?? {}) }, flatDraw: inputs.flatDraw, events: { ...(inputs.drawEvents ?? {}) },
});
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${fmtCompact(Math.abs(n))}`;
const totalFees = (r: StackResult) => r.projection.reduce((s, row) => s + row.fees, 0);
const totalReinvested = (r: StackResult) => r.projection.reduce((s, row) => s + row.reinvested, 0);

function loadPatterns(): NamedPattern[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('lotteryStack.drawPatterns') ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export default function DrawSchedule({ inputs, setInputs, result, asm }: Props) {
  const [history, setHistory] = useState<{ items: Snapshot[]; index: number }>(() => ({ items: [snapshotOf(inputs)], index: 0 }));
  const lastApplied = useRef(JSON.stringify(snapshotOf(inputs)));
  const lastEditKey = useRef<string | null>(null);
  const serialized = JSON.stringify(snapshotOf(inputs));
  const [baseline, setBaseline] = useState<Snapshot>(() => snapshotOf(inputs));
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(HORIZON);
  const [rangeAction, setRangeAction] = useState<RangeAction>('set');
  const [amountA, setAmountA] = useState(500000);
  const [amountB, setAmountB] = useState(1000000);
  const [percent, setPercent] = useState(10);
  const [eventYear, setEventYear] = useState(2);
  const [eventAmount, setEventAmount] = useState(2500000);
  const [eventLabel, setEventLabel] = useState('Sailboat');
  const [customEvent, setCustomEvent] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('preserve');
  const [legacyAmount, setLegacyAmount] = useState(result.core);
  const [delayYears, setDelayYears] = useState(6);
  const [patterns, setPatterns] = useState<NamedPattern[]>(loadPatterns);
  const [patternName, setPatternName] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (serialized !== lastApplied.current) {
      // Scenario loads and external edits replace the local history rather than mixing schedules.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory({ items: [snapshotOf(inputs)], index: 0 });
      setBaseline(snapshotOf(inputs));
      lastApplied.current = serialized;
      lastEditKey.current = null;
    }
  }, [serialized, inputs]);
  useEffect(() => {
    try { localStorage.setItem('lotteryStack.drawPatterns', JSON.stringify(patterns)); } catch { /* ignore */ }
  }, [patterns]);

  const commit = (next: Snapshot, editKey?: string) => {
    const clean: Snapshot = {
      overrides: { ...next.overrides }, flatDraw: next.flatDraw, events: { ...next.events },
    };
    const coalesce = !!editKey && lastEditKey.current === editKey;
    lastApplied.current = JSON.stringify(clean);
    lastEditKey.current = editKey ?? null;
    setHistory((prev) => {
      const items = coalesce && prev.index === prev.items.length - 1
        ? [...prev.items.slice(0, -1), clean]
        : [...prev.items.slice(0, prev.index + 1), clean].slice(-50);
      return { items, index: items.length - 1 };
    });
    setInputs((p) => ({ ...p, drawOverrides: clean.overrides, flatDraw: clean.flatDraw, drawEvents: clean.events }));
  };
  const applyHistory = (index: number) => {
    const snap = history.items[index];
    if (!snap) return;
    lastApplied.current = JSON.stringify(snap);
    lastEditKey.current = null;
    setHistory((prev) => ({ ...prev, index }));
    setInputs((p) => ({ ...p, drawOverrides: { ...snap.overrides }, flatDraw: snap.flatDraw, drawEvents: { ...snap.events } }));
    setNotice(index < history.items.length - 1 ? 'Undid the last schedule edit.' : 'Restored the newer schedule.');
  };
  const currentDesired = (y: number) => Math.round(drawForYear(inputs, asm, y));
  const lo = Math.min(rangeStart, rangeEnd);
  const hi = Math.max(rangeStart, rangeEnd);
  const selectYear = (y: number, shift: boolean) => {
    if (shift) setRangeEnd(y);
    else { setRangeStart(y); setRangeEnd(y); }
  };

  const applyPattern = (id: string) => {
    let next: Snapshot;
    if (id === 'flat' || id === 'inflated') next = { overrides: {}, flatDraw: id === 'flat', events: {} };
    else {
      const ov: Overrides = {};
      for (let y = 2; y <= HORIZON; y++) {
        const t = inputs.spend * Math.pow(1 + asm.inflation, y - 2);
        if (id === 'front') ov[y] = Math.round(y <= 11 ? t * 1.5 : t * 0.5);
        if (id === 'back') ov[y] = Math.round(y <= 11 ? t * 0.5 : t * 1.5);
        if (id === 'oneoff' && y === 5) ov[y] = Math.round(t * 4);
        if (id === 'skip5' && y <= 6) ov[y] = 0;
      }
      next = { overrides: ov, flatDraw: false, events: {} };
    }
    commit(next);
    setBaseline(next);
    setNotice(`${PATTERNS.find((p) => p.id === id)?.label} is now the comparison baseline.`);
  };

  const applyRange = () => {
    const overrides = { ...inputs.drawOverrides };
    const events = { ...(inputs.drawEvents ?? {}) };
    for (let y = lo; y <= hi; y++) {
      const current = currentDesired(y);
      if (rangeAction === 'clear') { delete overrides[y]; delete events[y]; continue; }
      if (rangeAction === 'set') overrides[y] = Math.max(0, Math.round(amountA));
      if (rangeAction === 'zero') overrides[y] = 0;
      if (rangeAction === 'ramp') {
        const t = hi === lo ? 0 : (y - lo) / (hi - lo);
        overrides[y] = Math.max(0, Math.round(amountA + (amountB - amountA) * t));
      }
      if (rangeAction === 'percent-up') overrides[y] = Math.max(0, Math.round(current * (1 + percent / 100)));
      if (rangeAction === 'percent-down') overrides[y] = Math.max(0, Math.round(current * (1 - percent / 100)));
      if (rangeAction === 'dollars-up') overrides[y] = Math.max(0, Math.round(current + amountA));
      if (rangeAction === 'dollars-down') overrides[y] = Math.max(0, Math.round(current - amountA));
      if (rangeAction === 'cap') overrides[y] = Math.max(0, Math.round(Math.min(current, result.projection[y - 1]?.capacity ?? 0)));
    }
    commit({ overrides, flatDraw: inputs.flatDraw, events });
    setNotice(`${RANGE_ACTIONS.find((a) => a.id === rangeAction)?.label} applied to year${lo === hi ? ` ${lo}` : `s ${lo}–${hi}`}.`);
  };

  const setYear = (y: number, value: number | null) => {
    const overrides = { ...inputs.drawOverrides };
    if (value === null) delete overrides[y]; else overrides[y] = Math.max(0, Math.round(value));
    commit({ overrides, flatDraw: inputs.flatDraw, events: { ...(inputs.drawEvents ?? {}) } }, `year:${y}:amount`);
  };
  const setEvent = (y: number, label: string) => {
    const events = { ...(inputs.drawEvents ?? {}) };
    if (label.trim()) events[y] = label.trim(); else delete events[y];
    commit({ overrides: { ...inputs.drawOverrides }, flatDraw: inputs.flatDraw, events }, `year:${y}:event`);
  };
  const resetYear = (y: number) => {
    const overrides = { ...inputs.drawOverrides };
    const events = { ...(inputs.drawEvents ?? {}) };
    delete overrides[y]; delete events[y];
    commit({ overrides, flatDraw: inputs.flatDraw, events });
  };
  const addEvent = () => {
    const label = eventLabel === 'Other event' ? customEvent.trim() : eventLabel;
    if (!label) { setNotice('Give the event a short label so the spike is understandable.'); return; }
    const overrides = { ...inputs.drawOverrides, [eventYear]: Math.max(0, Math.round(eventAmount)) };
    const events = { ...(inputs.drawEvents ?? {}), [eventYear]: label };
    commit({ overrides, flatDraw: inputs.flatDraw, events });
    setNotice(`${label} added in year ${eventYear}: ${fmt(eventAmount)}.`);
  };

  const goalPreview = useMemo(() => {
    const overrides: Overrides = { ...inputs.drawOverrides };
    let solved: number | null = null;
    if (goalType === 'delay') {
      for (let y = 1; y < delayYears; y++) overrides[y] = 0;
    } else {
      const target = goalType === 'preserve' ? result.core : goalType === 'legacy' ? Math.max(0, legacyAmount) : 0;
      solved = solveSpendForTarget({ ...inputs, drawOverrides: {}, flatDraw: true, laterSpend: 0 }, asm, target);
      for (let y = 2; y <= HORIZON; y++) overrides[y] = solved;
    }
    const preview = computeStack({ ...inputs, drawOverrides: overrides }, asm);
    return { overrides, solved, preview };
  }, [goalType, delayYears, legacyAmount, inputs, asm, result.core]);

  const applyGoal = () => {
    commit({ overrides: goalPreview.overrides, flatDraw: goalType === 'delay' ? inputs.flatDraw : true, events: { ...(inputs.drawEvents ?? {}) } });
    setNotice(goalType === 'delay' ? `Withdrawals are $0 through year ${delayYears - 1}.` : `Applied a solved draw of ${fmt(goalPreview.solved ?? 0)} per year from year 2 onward.`);
  };

  const saveNamed = (duplicate = false) => {
    const name = patternName.trim() || (duplicate ? 'Custom schedule copy' : '');
    if (!name) { setNotice('Type a name for this pattern first, or use Duplicate to make “Custom schedule copy”.'); return; }
    const item: NamedPattern = { id: `p${Date.now()}`, name, ...snapshotOf(inputs) };
    setPatterns((prev) => [...prev, item]);
    setSelectedPattern(item.id);
    setPatternName('');
    setNotice(`${name} saved as a reusable draw pattern.`);
  };
  const applyNamed = (id: string) => {
    const pattern = patterns.find((p) => p.id === id);
    if (!pattern) return;
    const next = { overrides: { ...pattern.overrides }, flatDraw: pattern.flatDraw, events: { ...pattern.events } };
    commit(next);
    setBaseline(next);
    setSelectedPattern(id);
    setNotice(`${pattern.name} applied and set as the comparison baseline.`);
  };
  const deleteNamed = (id: string) => {
    setPatterns((prev) => prev.filter((p) => p.id !== id));
    if (selectedPattern === id) setSelectedPattern('');
    setNotice('Named pattern deleted. The current schedule was not changed.');
  };
  const resetSchedule = () => {
    const next = { overrides: {}, flatDraw: inputs.flatDraw, events: {} };
    commit(next);
    setBaseline(next);
    setNotice('All custom years and event labels were cleared.');
  };

  const previousResult = useMemo(
    () => computeStack({ ...inputs, drawOverrides: baseline.overrides, flatDraw: baseline.flatDraw, drawEvents: baseline.events }, asm),
    [inputs, baseline, asm],
  );
  const chartData = result.projection.map((row) => ({ year: row.year, draw: Math.round(row.cash), requested: currentDesired(row.year), capacity: Math.round(row.capacity) }));
  const hasCustom = Object.keys(inputs.drawOverrides).length > 0 || Object.keys(inputs.drawEvents ?? {}).length > 0;

  return (
    <section className="hairline-card p-5" aria-labelledby="draw-workbench-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="draw-workbench-title" className="font-display text-lg font-semibold">Custom draw schedule <span className="ml-1 text-[12px] font-normal text-muted-foreground">workbench</span></h3>
          <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-muted-foreground">Start with a pattern, select a year or range, then apply an edit. The projection updates immediately. Undo, duplicate, or save the schedule as a named pattern.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={history.index <= 0} onClick={() => applyHistory(history.index - 1)} className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-40 cursor-pointer" title="Undo last schedule edit"><Undo2 className="h-4 w-4" /> Undo</button>
          <button type="button" disabled={history.index >= history.items.length - 1} onClick={() => applyHistory(history.index + 1)} className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-40 cursor-pointer" title="Redo schedule edit"><Redo2 className="h-4 w-4" /> Redo</button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PATTERNS.map((p) => <button type="button" key={p.id} onClick={() => applyPattern(p.id)} title={p.hint} className="rounded-lg border border-input bg-card px-3 py-2.5 text-left text-sm font-medium hover:border-primary hover:text-primary cursor-pointer">{p.label}</button>)}
      </div>

      <div className="mt-5 rounded-md border border-input p-4">
        <h4 className="font-display text-base font-semibold">Range editor</h4>
        <p className="mt-1 text-[13px] text-muted-foreground">Years {lo}–{hi} selected. Click a chart year to select it; Shift-click another year to extend the range.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[13px] font-medium">Start year<input aria-label="Range start year" type="number" min={1} max={HORIZON} value={rangeStart} onChange={(e) => setRangeStart(Math.max(1, Math.min(HORIZON, +e.target.value || 1)))} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 font-num" /></label>
          <label className="text-[13px] font-medium">End year<input aria-label="Range end year" type="number" min={1} max={HORIZON} value={rangeEnd} onChange={(e) => setRangeEnd(Math.max(1, Math.min(HORIZON, +e.target.value || HORIZON)))} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 font-num" /></label>
          <label className="text-[13px] font-medium sm:col-span-2">Action<select aria-label="Range action" value={rangeAction} onChange={(e) => setRangeAction(e.target.value as RangeAction)} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-normal">{RANGE_ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          {rangeAction !== 'zero' && rangeAction !== 'cap' && rangeAction !== 'clear' && <label className="text-[13px] font-medium">{rangeAction === 'ramp' ? 'Starting amount' : rangeAction.startsWith('percent') ? 'Percent change' : 'Amount'}<input aria-label="Range amount A" type="number" step={rangeAction.startsWith('percent') ? 1 : 10000} value={rangeAction.startsWith('percent') ? percent : amountA} onChange={(e) => rangeAction.startsWith('percent') ? setPercent(Math.max(0, +e.target.value || 0)) : setAmountA(Math.max(0, +e.target.value || 0))} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 font-num" /></label>}
          {rangeAction === 'ramp' && <label className="text-[13px] font-medium">Ending amount<input aria-label="Range amount B" type="number" min={0} step={10000} value={amountB} onChange={(e) => setAmountB(Math.max(0, +e.target.value || 0))} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 font-num" /></label>}
          <div className="flex items-end"><button type="button" onClick={applyRange} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cursor-pointer">Apply to years {lo}–{hi}</button></div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-input p-4">
        <h4 className="font-display text-base font-semibold">Add a one-time life event</h4>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[13px] font-medium">Year<select aria-label="Event year" value={eventYear} onChange={(e) => setEventYear(+e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-normal">{Array.from({ length: HORIZON }, (_, i) => i + 1).map((y) => <option key={y} value={y}>Year {y}</option>)}</select></label>
          <label className="text-[13px] font-medium">Amount<input aria-label="Event amount" type="number" min={0} step={50000} value={eventAmount} onChange={(e) => setEventAmount(Math.max(0, +e.target.value || 0))} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 font-num" /></label>
          <label className="text-[13px] font-medium">Event<select aria-label="Event label" value={eventLabel} onChange={(e) => setEventLabel(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-normal">{EVENT_PRESETS.map((label) => <option key={label}>{label}</option>)}</select></label>
          {eventLabel === 'Other event' ? <label className="text-[13px] font-medium">Custom label<input aria-label="Custom event label" value={customEvent} onChange={(e) => setCustomEvent(e.target.value)} placeholder="e.g. Vineyard" className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-normal" /></label> : <div className="flex items-end"><button type="button" onClick={addEvent} className="w-full rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary cursor-pointer">Add event</button></div>}
          {eventLabel === 'Other event' && <div className="flex items-end sm:col-span-2 lg:col-span-4"><button type="button" onClick={addEvent} className="rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary cursor-pointer">Add event</button></div>}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-input p-4">
        <h4 className="font-display text-base font-semibold">Goal-based solver</h4>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[13px] font-medium sm:col-span-2">Goal<select aria-label="Draw goal" value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-normal"><option value="preserve">Largest flat check while preserving the core</option><option value="legacy">Leave a chosen legacy</option><option value="spenddown">Use the stack up by year 30</option><option value="delay">Grow first, then start withdrawals</option></select></label>
          {goalType === 'legacy' && <label className="text-[13px] font-medium">Legacy at year {HORIZON}<input aria-label="Legacy goal amount" type="number" min={0} step={100000} value={legacyAmount} onChange={(e) => setLegacyAmount(Math.max(0, +e.target.value || 0))} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 font-num" /></label>}
          {goalType === 'delay' && <label className="text-[13px] font-medium">First withdrawal year<select aria-label="First withdrawal year" value={delayYears} onChange={(e) => setDelayYears(+e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-normal">{Array.from({ length: HORIZON - 1 }, (_, i) => i + 2).map((y) => <option key={y} value={y}>Year {y}</option>)}</select></label>}
        </div>
        <div className="mt-3 rounded-md bg-secondary px-3 py-2 text-sm leading-relaxed">
          {goalType === 'delay' ? <span>Preview: $0 through year {delayYears - 1}, then the base withdrawal pattern. Ending balance: <strong>{fmtCompact(goalPreview.preview.stackEnd)}</strong>.</span> : <span>Preview: <strong>{fmt(goalPreview.solved ?? 0)}/yr</strong> from year 2 onward · ending balance <strong>{fmtCompact(goalPreview.preview.stackEnd)}</strong>{goalPreview.preview.depletedYear ? ` · runs dry around year ${goalPreview.preview.depletedYear}` : ' · no depletion in the model'}.</span>}
        </div>
        <button type="button" onClick={applyGoal} className="mt-3 rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary cursor-pointer">Use this solved schedule</button>
      </div>

      <div className="mt-5">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} tickMargin={6} />
            <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 11, fill: 'hsl(33 9% 38%)' }} tickLine={false} axisLine={false} width={52} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(40 60% 99%)', border: '1px solid hsl(38 28% 86%)', borderRadius: 10, fontSize: 13 }}
              formatter={(v: number, name: string) => [fmtCompact(v), name === 'requested' ? 'Requested withdrawal' : name === 'draw' ? 'Actual cash to you' : 'Estimated sustainable capacity']}
              labelFormatter={(year) => `Year ${year}${inputs.drawEvents?.[year] ? ` · ${inputs.drawEvents[year]}` : ''}`}
            />
            <Bar dataKey="requested" onClick={(data, _index, event) => selectYear(data.year, event.shiftKey)} radius={[3, 3, 0, 0]} name="Requested withdrawal">
              {chartData.map((d) => <Cell key={d.year} cursor="pointer" data-year={d.year} fill={d.requested > d.capacity ? '#C42121' : d.year >= lo && d.year <= hi ? '#E5604A' : '#C9C1B7'} />)}
            </Bar>
            <Bar dataKey="capacity" fill="#4C7A3F" name="Estimated sustainable capacity" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground"><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#E5604A]" />Selected years</span><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#4C7A3F]" />Estimated sustainable capacity</span><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#C42121]" />Above capacity</span></div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-input">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary text-left text-[12px] text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Year</th><th className="px-3 py-2 font-medium">Cash to you</th><th className="px-3 py-2 font-medium">Quick actions</th><th className="px-3 py-2 text-right font-medium">Capacity</th><th className="px-3 py-2 text-right font-medium">Difference</th><th className="px-3 py-2 font-medium">Event label</th><th className="px-3 py-2 font-medium">Reset</th></tr></thead>
          <tbody>
            {chartData.map((d) => {
              const y = d.year;
              const override = inputs.drawOverrides[y];
              const event = inputs.drawEvents?.[y] ?? '';
              const difference = d.requested - d.capacity;
              return (
                <tr key={y} onClick={(e) => selectYear(y, e.shiftKey)} className={`cursor-pointer border-t border-border/60 ${y >= lo && y <= hi ? 'bg-accent/50' : ''}`}>
                  <td className="px-3 py-2 font-num">Y{y}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><input aria-label={`Withdrawal year ${y}`} type="number" min={0} step={10000} value={override ?? ''} placeholder={String(currentDesired(y))} onChange={(e) => setYear(y, e.target.value === '' ? null : Math.max(0, +e.target.value))} className={`w-32 rounded-md border px-2 py-1 font-num ${difference > 0 ? 'border-destructive/60 bg-destructive/5 text-destructive' : 'border-input bg-card'}`} /></td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><div className="flex gap-1"><button type="button" onClick={() => setYear(y, 0)} className="rounded border border-input px-2 py-1 text-[11px] cursor-pointer" title={`Set year ${y} to zero`}>0</button><button type="button" onClick={() => setYear(y, currentDesired(y) * 2)} className="rounded border border-input px-2 py-1 text-[11px] cursor-pointer" title={`Double year ${y}`}>2×</button><button type="button" onClick={() => setYear(y, Math.round(d.capacity))} className="rounded border border-input px-2 py-1 text-[11px] cursor-pointer" title={`Cap year ${y} at estimated capacity`}>Cap</button></div></td>
                  <td className="px-3 py-2 text-right font-num">{fmtCompact(d.capacity)}</td>
                  <td className={`px-3 py-2 text-right font-num ${difference > 0 ? 'text-destructive' : 'stat-good'}`}>{difference === 0 ? '—' : signed(difference)}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><input aria-label={`Event label year ${y}`} value={event} placeholder="Optional" onChange={(e) => setEvent(y, e.target.value)} className="w-32 rounded-md border border-input bg-card px-2 py-1 text-[12px]" /></td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><button type="button" onClick={() => resetYear(y)} className="rounded border border-input px-2 py-1 text-[11px] text-muted-foreground cursor-pointer">Reset</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CompareStat label="Total withdrawn" before={previousResult.cumCash} after={result.cumCash} />
        <CompareStat label={`Left at year ${HORIZON}`} before={previousResult.stackEnd} after={result.stackEnd} />
        <CompareStat label="Fees + estimated tax drag" before={totalFees(previousResult)} after={totalFees(result)} higherIsGood={false} />
        <CompareStat label="Reinvested surplus" before={totalReinvested(previousResult)} after={totalReinvested(result)} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
        <span>Before: {previousResult.depletedYear ? `runs dry around year ${previousResult.depletedYear}` : 'no depletion'} · After: {result.depletedYear ? `runs dry around year ${result.depletedYear}` : 'no depletion'}</span>
        <button type="button" onClick={() => { setBaseline(snapshotOf(inputs)); setNotice('The current schedule is now the comparison baseline.'); }} className="rounded-md border border-input px-3 py-1.5 text-[12px] cursor-pointer">Set current as comparison</button>
      </div>

      <div className="mt-4 rounded-md border border-input p-4">
        <h4 className="font-display text-base font-semibold">Named patterns and duplication</h4>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input aria-label="Named draw pattern" value={patternName} onChange={(e) => setPatternName(e.target.value)} placeholder="e.g. Sailboat in year 2" className="rounded-md border border-input bg-card px-3 py-2 text-sm" />
          <button type="button" onClick={() => saveNamed()} className="rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary cursor-pointer">Save named pattern</button>
          <button type="button" onClick={() => saveNamed(true)} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input px-4 py-2 text-sm cursor-pointer"><Copy className="h-4 w-4" /> Duplicate current</button>
        </div>
        {patterns.length > 0 && <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"><select aria-label="Saved draw patterns" value={selectedPattern} onChange={(e) => setSelectedPattern(e.target.value)} className="rounded-md border border-input bg-card px-3 py-2 text-sm"><option value="">Choose a saved pattern</option>{patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button type="button" disabled={!selectedPattern} onClick={() => applyNamed(selectedPattern)} className="rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm text-primary disabled:opacity-40 cursor-pointer">Apply pattern</button><button type="button" disabled={!selectedPattern} onClick={() => deleteNamed(selectedPattern)} className="rounded-md border border-input px-3 py-2 text-sm text-muted-foreground disabled:opacity-40 cursor-pointer">Delete pattern</button></div>}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">Withdrew more than you spent? Review it before year-end with your CPA and trustee. Future interest can be taxable, and returning cash to a trust or policy is not always a simple deposit. See the First-Year Guide.</p>
        <button type="button" disabled={!hasCustom} onClick={resetSchedule} className="rounded-md border border-input px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-40 cursor-pointer">Reset entire schedule</button>
      </div>
      {notice && <p role="status" className="mt-3 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">{notice}</p>}
    </section>
  );
}

function CompareStat({ label, before, after, higherIsGood = true }: { label: string; before: number; after: number; higherIsGood?: boolean }) {
  const favorable = after === before || (higherIsGood ? after > before : after < before);
  return <div className="rounded-md bg-secondary p-3"><div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-[12px] text-muted-foreground">Before {fmtCompact(before)}</div><div className="text-[13px] font-medium">After {fmtCompact(after)}</div><div className={`mt-0.5 text-[12px] ${after === before ? 'text-muted-foreground' : favorable ? 'stat-good' : 'stat-warm'}`}>{after === before ? 'No change' : signed(after - before)}</div></div>;
}
