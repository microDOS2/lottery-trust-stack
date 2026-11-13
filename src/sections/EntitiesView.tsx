import { useState } from 'react';
import { ENTITY_NOTES, JURISDICTIONS, PASSPORTS, PASSPORT_HONEST_NOTE, PPLI_WRAP_NOTE, type EntityItem } from '../lib/entities';
import { SectionTitle } from '../components/widgets';
import { fmtCompact, HORIZON, type Inputs } from '../lib/calc';
import { Plus, Trash2, Ship, Globe2, Landmark } from 'lucide-react';

interface Props {
  entities: EntityItem[];
  setEntities: (fn: (p: EntityItem[]) => EntityItem[]) => void;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
}

export default function EntitiesView({ entities, setEntities, setInputs }: Props) {
  const [form, setForm] = useState({ name: '', type: 'us-llc' as EntityItem['type'], jurisdiction: 'Wyoming', purpose: '', amount: 0, year: 1, ppliWrap: false });

  const add = () => {
    if (!form.name.trim() || form.amount <= 0) return;
    const item: EntityItem = { id: `e${Date.now()}`, ...form };
    setEntities((prev) => [...prev, item]);
    setForm({ name: '', type: 'us-llc', jurisdiction: 'Wyoming', purpose: '', amount: 0, year: 1, ppliWrap: false });
  };

  const remove = (id: string) => setEntities((prev) => prev.filter((e) => e.id !== id));

  const sailboat = () => {
    const item: EntityItem = {
      id: `e${Date.now()}`,
      name: 'World sailboat',
      type: 'foreign-llc',
      jurisdiction: 'Marshall Islands',
      purpose: 'Custom-built sailboat for world travel, owned by a foreign LLC (flag state matters)',
      amount: 2_500_000,
      year: 2,
    };
    setEntities((prev) => [...prev, item]);
    // Fund the purchase in the draw schedule.
    setInputs((p) => ({
      ...p,
      drawOverrides: { ...p.drawOverrides, 2: Math.max(p.drawOverrides[2] ?? 0, 2_500_000) },
    }));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SectionTitle
        num="06"
        title={<>Entities &amp; <span className="sig-italic">assets</span></>}
        blurb="Build your structure out loud: one US LLC for property at home, a foreign LLC for assets abroad, an irrevocable trust where you are only the beneficiary. Each entry says what it does — and what it does not do."
      />

      {/* ---------- Add an entity ---------- */}
      <div className="hairline-card p-5">
        <h3 className="font-display text-lg font-semibold">Add an entity</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input placeholder="Name (e.g. Family Home LLC, World Sailboat LLC)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm sm:col-span-2" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EntityItem['type'] })}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm">
            <option value="us-llc">US LLC (privacy wrapper)</option>
            <option value="foreign-llc">Foreign LLC (assets abroad)</option>
            <option value="foreign-trust">Foreign irrevocable trust (beneficiary only)</option>
          </select>
          <select value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm">
            {JURISDICTIONS.map((j) => <option key={j}>{j}</option>)}
          </select>
          <input placeholder="Purpose (home, sailboat, rental, business)" value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm sm:col-span-2" />
          <input type="number" min={0} step={50000} placeholder="Amount ($)" value={form.amount || ''}
            onChange={(e) => setForm({ ...form, amount: +e.target.value || 0 })}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          <select value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm">
            {Array.from({ length: HORIZON }, (_, i) => i + 1).map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>
        {form.type === 'foreign-trust' && (
          <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={form.ppliWrap} onChange={(e) => setForm({ ...form, ppliWrap: e.target.checked })} className="mt-1" />
            <span>Hold a PPLI policy inside this trust — the honest way to get tax-free compounding within a foreign trust.</span>
          </label>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ENTITY_NOTES[form.type]}</p>
        {form.type === 'foreign-trust' && form.ppliWrap && (
          <p className="mt-2 rounded-md bg-[hsl(var(--success-tint))] px-3 py-2 text-sm leading-relaxed stat-good">{PPLI_WRAP_NOTE}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={add} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cursor-pointer">
            <Plus className="h-4 w-4" /> Add entity
          </button>
          <button onClick={sailboat} className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary cursor-pointer">
            <Ship className="h-4 w-4" /> Preset: sailboat, year 2, $2.5M
          </button>
        </div>
      </div>

      {/* ---------- Your entities ---------- */}
      <div className="space-y-3">
        {entities.length === 0 && (
          <p className="text-sm text-muted-foreground">No entities yet. Add your first above, or use the sailboat preset.</p>
        )}
        {entities.map((e) => (
          <article key={e.id} className="hairline-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {e.type === 'us-llc' ? 'US LLC' : e.type === 'foreign-llc' ? 'Foreign LLC' : 'Foreign irrevocable trust'} · {e.jurisdiction} · year {e.year}
                </div>
                <h4 className="font-display text-base font-semibold">{e.name}</h4>
                <p className="mt-0.5 text-sm text-muted-foreground">{e.purpose}</p>
                {e.ppliWrap && <p className="mt-1 text-sm stat-good">PPLI wrapper inside — tax-free compounding via the policy.</p>}
              </div>
              <div className="text-right">
                <div className="font-num text-lg font-semibold">{fmtCompact(e.amount)}</div>
                <button onClick={() => remove(e.id)} title="Remove entity" className="mt-1 rounded p-1 text-muted-foreground hover:text-destructive cursor-pointer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{ENTITY_NOTES[e.type]}</p>
          </article>
        ))}
      </div>

      {/* ---------- Passports & residency ---------- */}
      <section>
        <h3 className="font-display flex items-center gap-2 text-xl font-semibold"><Globe2 className="h-5 w-5 text-primary" /> Second passports &amp; residency</h3>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">{PASSPORT_HONEST_NOTE}</p>
        <div className="mt-4 space-y-3">
          {PASSPORTS.map((p) => (
            <div key={p.name} className="hairline-card p-4">
              <div className="flex items-start gap-3">
                <Landmark className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <h4 className="text-[15px] font-medium">{p.name}</h4>
                  <div className="mt-1 font-mono text-[12px] text-muted-foreground">{p.cost} · {p.time}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
