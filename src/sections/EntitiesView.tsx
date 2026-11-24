import { useMemo, useState, type ReactNode } from 'react';
import { ENTITY_CLASS_META, ENTITY_NOTES, JURISDICTIONS, PASSPORTS, PASSPORT_HONEST_NOTE, PPLI_WRAP_NOTE, entityClass, type EntityClass, type EntityItem } from '../lib/entities';
import { SectionTitle, Chips } from '../components/widgets';
import { fmtCompact, HORIZON, type Inputs, type StackResult } from '../lib/calc';
import { Plus, Trash2, Ship, Globe2, Landmark, Network } from 'lucide-react';
import RealEstatePanel from './RealEstatePanel';

interface Props {
  entities: EntityItem[];
  setEntities: (fn: (p: EntityItem[]) => EntityItem[]) => void;
  inputs: Inputs;
  result: StackResult;
  setInputs: (fn: (p: Inputs) => Inputs) => void;
}

const EMPTY_FORM = {
  name: '', type: 'us-llc' as EntityItem['type'], assetClass: 'holding' as EntityClass,
  jurisdiction: 'Wyoming', purpose: '', amount: 0, year: 1, ppliWrap: false,
  parentId: '', ownershipPct: 100,
};

export default function EntitiesView({ entities, setEntities, inputs, result, setInputs }: Props) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const childrenOf = (id: string) => entities.filter((e) => e.parentId === id);
  const descendantsOf = (id: string): Set<string> => {
    const out = new Set<string>();
    const walk = (parent: string) => {
      for (const child of childrenOf(parent)) {
        if (out.has(child.id)) continue;
        out.add(child.id);
        walk(child.id);
      }
    };
    walk(id);
    return out;
  };
  const parentOptions = (excludeId?: string) => {
    const excluded = excludeId ? descendantsOf(excludeId) : new Set<string>();
    if (excludeId) excluded.add(excludeId);
    return entities.filter((e) => entityClass(e) === 'holding' && !excluded.has(e.id));
  };

  const add = () => {
    if (!form.name.trim() || form.amount <= 0) {
      setNotice('Enter an entity name and an amount greater than $0 before adding it.');
      return;
    }
    if (form.parentId && !byId.has(form.parentId)) {
      setNotice('Choose a valid parent holding company, or choose No parent.');
      return;
    }
    const item: EntityItem = { id: `e${Date.now()}`, ...form };
    setEntities((prev) => [...prev, item]);
    setNotice(`${item.name} was added${item.parentId ? ` under ${byId.get(item.parentId)?.name}` : ' as a top-level entity'}.`);
    setForm({ ...EMPTY_FORM });
  };

  const remove = (id: string) => {
    const item = byId.get(id);
    const children = childrenOf(id);
    if (children.length > 0) {
      setNotice(`${item?.name ?? 'This entity'} still has ${children.length} subsidiary ${children.length === 1 ? 'entry' : 'entries'}. Move or remove those first; it was not deleted.`);
      return;
    }
    setEntities((prev) => prev.filter((e) => e.id !== id));
    setNotice(`${item?.name ?? 'Entity'} was removed.`);
    if (editingId === id) setEditingId(null);
  };

  const updateStructure = (id: string, parentId: string, ownershipPct: number) => {
    if (parentId) {
      const allowed = parentOptions(id).some((e) => e.id === parentId);
      if (!allowed) {
        setNotice('That parent would create circular ownership or is not a holding company. Choose a different parent.');
        return;
      }
    }
    setEntities((prev) => prev.map((e) => e.id === id ? { ...e, parentId: parentId || undefined, ownershipPct } : e));
    setNotice('Ownership structure updated.');
  };

  const sailboat = () => {
    const item: EntityItem = {
      id: `e${Date.now()}`,
      name: 'World sailboat', type: 'foreign-llc', assetClass: 'vehicle-boat', jurisdiction: 'Marshall Islands',
      purpose: 'Custom-built sailboat for world travel, owned by a foreign LLC (flag state matters)',
      amount: 2_500_000, year: 2, ownershipPct: 100,
    };
    setEntities((prev) => [...prev, item]);
    setInputs((p) => ({ ...p, drawOverrides: { ...p.drawOverrides, 2: Math.max(p.drawOverrides[2] ?? 0, 2_500_000) } }));
    setNotice('Added the sailboat as a year-2 asset and put $2.5M into the year-2 draw schedule.');
  };

  const entityCard = (e: EntityItem, level = 0): ReactNode => {
    const parent = e.parentId ? byId.get(e.parentId) : undefined;
    const children = childrenOf(e.id);
    const classInfo = ENTITY_CLASS_META[entityClass(e)];
    return (
      <div key={e.id} style={{ marginLeft: `${Math.min(level, 3) * 1.25}rem` }} className="space-y-3">
        <article className={`hairline-card p-4 ${level > 0 ? 'border-l-2 border-l-primary/40' : ''}`} data-entity-id={e.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {classInfo.label} · {e.type === 'us-llc' ? 'US LLC' : e.type === 'foreign-llc' ? 'Foreign LLC' : 'Foreign irrevocable trust'} · {e.jurisdiction} · year {e.year}
              </div>
              <h4 className="font-display text-base font-semibold">{e.name}</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">{e.purpose || classInfo.note}</p>
              {parent && <p className="mt-1 text-[13px] font-medium text-primary">Subsidiary of {parent.name} · {e.ownershipPct ?? 100}% owned</p>}
              {!parent && e.parentId && <p className="mt-1 text-[13px] text-destructive">Parent not found — edit the structure to choose a valid parent or make this top-level.</p>}
              {e.ppliWrap && <p className="mt-1 text-sm stat-good">PPLI wrapper inside — tax treatment comes from the policy, not the jurisdiction.</p>}
            </div>
            <div className="shrink-0 text-right">
              <div className="font-num text-lg font-semibold">{fmtCompact(e.amount)}</div>
              <div className="mt-1 flex gap-1">
                <button type="button" onClick={() => setEditingId(editingId === e.id ? null : e.id)} className="rounded px-2 py-1 text-[12px] text-muted-foreground hover:text-primary cursor-pointer">{editingId === e.id ? 'Done' : 'Edit structure'}</button>
                <button type="button" onClick={() => remove(e.id)} title={children.length ? 'Move or remove subsidiaries before deleting this parent' : 'Remove entity'} className="rounded p-1 text-muted-foreground hover:text-destructive cursor-pointer" aria-label={`Remove ${e.name}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{classInfo.note}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{ENTITY_NOTES[e.type]}</p>
          {editingId === e.id && (
            <div className="mt-3 grid grid-cols-1 gap-3 rounded-md bg-secondary p-3 sm:grid-cols-[minmax(0,1fr)_120px]">
              <label className="text-[12.5px] font-medium">Parent holding company
                <select value={e.parentId ?? ''} onChange={(ev) => updateStructure(e.id, ev.target.value, e.ownershipPct ?? 100)} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-normal">
                  <option value="">No parent — top level</option>
                  {parentOptions(e.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="text-[12.5px] font-medium">Ownership %
                <input type="number" min={1} max={100} step={1} value={e.ownershipPct ?? 100} onChange={(ev) => updateStructure(e.id, e.parentId ?? '', Math.min(100, Math.max(1, +ev.target.value || 100)))} className="mt-1 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm font-num" />
              </label>
              <p className="text-[12px] leading-relaxed text-muted-foreground sm:col-span-2">A holding company or a circular parent cannot be selected. Changes affect this structure map only; they do not change tax classification or move money.</p>
            </div>
          )}
        </article>
        {children.map((child) => entityCard(child, level + 1))}
      </div>
    );
  };

  const roots = entities.filter((e) => !e.parentId || !byId.has(e.parentId));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SectionTitle
        num="06"
        title={<>Entities &amp; <span className="sig-italic">assets</span></>}
        blurb="Create a holding company, then add separate LLCs for businesses, property, vehicles, and investments. Show who owns what, in plain English, without pretending the structure creates tax-free income."
      />

      <div className="rounded-md bg-secondary p-4 text-sm leading-relaxed text-muted-foreground">
        <div className="flex items-start gap-3"><Network className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><strong className="text-foreground">Recommended pattern:</strong> use a holding company for ownership and separate subsidiaries for different risks.<pre className="mt-2 whitespace-pre-wrap font-mono text-[12.5px] text-foreground/80">{`Holding LLC\n├── Operating Business LLC\n├── Rental Property LLC\n└── Boat or Vehicle LLC`}</pre></div></div>
      </div>

      <div className="hairline-card p-5">
        <h3 className="font-display text-lg font-semibold">Add an LLC, subsidiary, trust, or asset</h3>
        <p className="mt-1 text-sm text-muted-foreground">Asset class describes the purpose and liability bucket. It is not an IRS tax election. Choose a holding company first if you want subsidiaries.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
          <label className="text-sm font-medium sm:col-span-2">Name
            <input aria-label="Entity name" placeholder="e.g. Family Holdings LLC" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal" />
          </label>
          <label className="text-sm font-medium">Entity type
            <select aria-label="Entity type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EntityItem['type'] })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal"><option value="us-llc">US LLC</option><option value="foreign-llc">Foreign LLC</option><option value="foreign-trust">Foreign irrevocable trust</option></select>
          </label>
          <label className="text-sm font-medium">Asset or business class
            <select aria-label="Asset or business class" value={form.assetClass} onChange={(e) => setForm({ ...form, assetClass: e.target.value as EntityClass })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal">{(Object.keys(ENTITY_CLASS_META) as EntityClass[]).map((key) => <option key={key} value={key}>{ENTITY_CLASS_META[key].label}</option>)}</select>
          </label>
          <label className="text-sm font-medium">Jurisdiction
            <select aria-label="Jurisdiction" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal">{JURISDICTIONS.map((j) => <option key={j}>{j}</option>)}</select>
          </label>
          <label className="text-sm font-medium">Parent holding company (optional)
            <select aria-label="Parent holding company" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal"><option value="">No parent — top level</option>{parentOptions().map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </label>
          <label className="text-sm font-medium sm:col-span-2">Purpose
            <input aria-label="Entity purpose" placeholder="e.g. owns 100% of the coffee-business subsidiary" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal" />
          </label>
          <label className="text-sm font-medium">Parent ownership %
            <input aria-label="Parent ownership percentage" type="number" min={1} max={100} step={1} value={form.ownershipPct} onChange={(e) => setForm({ ...form, ownershipPct: Math.min(100, Math.max(1, +e.target.value || 100)) })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          </label>
          <label className="text-sm font-medium">Funding or asset amount ($)
            <input aria-label="Entity amount" type="number" min={0} step={50000} value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: +e.target.value || 0 })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-num" />
          </label>
          <div className="sm:col-span-2"><Chips chips={[{ label: '$500K', value: 500000 }, { label: '$1M', value: 1000000 }, { label: '$2.5M', value: 2500000 }, { label: '$5M', value: 5000000 }]} value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} hint="The funding or asset value for this structure map. It does not automatically change the draw schedule." /></div>
          <label className="text-sm font-medium">Purchase or funding year
            <select aria-label="Purchase or funding year" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-normal">{Array.from({ length: HORIZON }, (_, i) => i + 1).map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
          </label>
        </div>
        {form.type === 'foreign-trust' && <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={form.ppliWrap} onChange={(e) => setForm({ ...form, ppliWrap: e.target.checked })} className="mt-1" /><span>Hold a PPLI policy inside this trust — the tax treatment comes from the insurance contract, not the offshore jurisdiction.</span></label>}
        <div className="mt-3 rounded-md bg-secondary px-3 py-2 text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">{ENTITY_CLASS_META[form.assetClass].label}:</strong> {ENTITY_CLASS_META[form.assetClass].note}</div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ENTITY_NOTES[form.type]}</p>
        {form.type === 'foreign-trust' && form.ppliWrap && <p className="mt-2 rounded-md bg-[hsl(var(--success-tint))] px-3 py-2 text-sm leading-relaxed stat-good">{PPLI_WRAP_NOTE}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cursor-pointer"><Plus className="h-4 w-4" /> Add to structure</button>
          <button type="button" onClick={() => setForm({ ...EMPTY_FORM, name: 'Family Holdings LLC' })} className="rounded-md border border-input bg-card px-4 py-2 text-sm font-medium cursor-pointer">Start with a holding-company name</button>
          <button type="button" onClick={sailboat} className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary cursor-pointer"><Ship className="h-4 w-4" /> Preset: sailboat, year 2, $2.5M</button>
        </div>
      </div>

      {notice && <p role="status" className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">{notice}</p>}

      <section aria-labelledby="structure-map-title">
        <h3 id="structure-map-title" className="font-display text-xl font-semibold">Your ownership structure</h3>
        <p className="mt-1 text-sm text-muted-foreground">Subsidiaries appear beneath their parent. Edit a parent or ownership percentage at any time; removing a parent is blocked until its subsidiaries are moved or removed.</p>
        <div className="mt-3 space-y-3">
          {roots.length === 0 && <p className="text-sm text-muted-foreground">No entities yet. Start with a holding company, then add an operating business, property, vehicle, or investment subsidiary.</p>}
          {roots.map((e) => entityCard(e))}
        </div>
      </section>

      {/* ---------- Real-estate scenario ---------- */}
      <section aria-labelledby="real-estate-scenario-title" className="space-y-3">
        <div>
          <h3 id="real-estate-scenario-title" className="font-display text-xl font-semibold">Real estate, when you have a property to evaluate</h3>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
            This optional scenario belongs here with your assets, not in the main calculator. Use it only when you have a particular property in mind. Every assumption starts at zero, nothing is copied from your other answers, and this box does not change the main projection.
          </p>
        </div>
        <RealEstatePanel suggestedPrice={inputs.entity4} marginalRate={0.37 + result.futureStateRate} />
      </section>

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
