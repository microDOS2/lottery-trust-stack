// Entity & asset planning: multiple LLCs, foreign trusts, and second passports/residencies.
export interface EntityItem {
  id: string;
  name: string;
  type: 'us-llc' | 'foreign-llc' | 'foreign-trust';
  jurisdiction: string;
  purpose: string;
  amount: number;
  year: number; // 1–30, when the asset is bought or the entity funded
  ppliWrap?: boolean; // foreign trust holds a PPLI policy inside
}

export const JURISDICTIONS = [
  'Wyoming', 'Nevada', 'Delaware', 'South Dakota',
  'Marshall Islands', 'Cayman Islands', 'BVI', 'St. Kitts & Nevis', 'Cook Islands',
];

export const ENTITY_NOTES: Record<EntityItem['type'], string> = {
  'us-llc':
    'Privacy and asset separation for US property and vehicles. No change to your federal or state tax — the LLC is a wrapper, not a shelter. Registered agent runs about $100–$300 a year.',
  'foreign-llc':
    'For assets held abroad. If it elects corporate treatment, the CFC / Subpart F / GILTI rules can tax you on its income currently, even undistributed. Disregarded entities flow income straight through to you. For a vessel, the flag state matters as much as the LLC jurisdiction.',
  'foreign-trust':
    'Beneficiary, not trustee — the correct structure for protection. For a US citizen it is not a tax shelter: grantor-trust rules tax gains to you, and non-grantor distributions hit the throwback rules. Reporting: Forms 3520/3520-A and FBAR. Hold a PPLI policy inside if you want the tax-free compounding to come from the insurance contract rather than the jurisdiction.',
};

export const PPLI_WRAP_NOTE =
  'The trust holds a non-MEC PPLI policy instead of raw investments. Tax-free compounding now comes from the insurance contract (US non-MEC rules), while the foreign trust supplies the asset protection. Withdrawals to basis and policy loans can be tax-free; a lapse with loans outstanding is the thing to avoid.';

export const PASSPORTS: Array<{ name: string; cost: string; time: string; note: string }> = [
  {
    name: 'Caribbean citizenship-by-investment (St. Kitts, Antigua, Dominica, Grenada, St. Lucia)',
    cost: '≈ $200K–$250K donation + fees (St. Kitts minimum $250K, Dominica $200K)',
    time: '≈ 4–9 months',
    note: 'A second passport for visa-free travel to ~140+ countries. No US tax benefit. St. Kitts is the oldest program; due diligence is real but straightforward for a clean lottery win.',
  },
  {
    name: 'Vanuatu citizenship-by-investment',
    cost: '≈ $130K–$160K',
    time: '≈ 1–3 months',
    note: 'The fastest second passport. More limited travel coverage than the Caribbean programs. Again: travel and lifestyle, not tax.',
  },
  {
    name: 'Turkey citizenship-by-investment',
    cost: '≈ $400K real estate',
    time: '≈ 3–6 months',
    note: 'Property plus a passport. You keep the investment, which can appreciate or be rented. Resale after 3 years.',
  },
  {
    name: 'Malta naturalisation for exceptional services',
    cost: '≈ €600K–€750K + property + fees',
    time: '≈ 12–36 months',
    note: 'An EU passport with real travel and property rights inside the EU. Slower and pricier, but the strongest document on this list for Europe.',
  },
  {
    name: 'Greece golden visa (residency, not citizenship)',
    cost: '≈ €250K–€800K real estate (€800K in Athens, Thessaloniki, and the islands)',
    time: '≈ 2–4 months',
    note: 'EU residency with property you can rent out. Citizenship only after 7 years of actual residence. Useful for a European base and rental income.',
  },
];

export const PASSPORT_HONEST_NOTE =
  'A second passport or residency makes travel easier and can unlock property rights. It does nothing to US tax: the US taxes its citizens on worldwide income wherever they live or hold passports. Only renunciation changes that, and it has its own exit tax — see the expatriation reality check in the Strategy Library.';
