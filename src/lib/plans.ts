import { computeStack, fmtCompact, pct, SLEEVE_MATH, type Assumptions, type Inputs, type StackResult } from './calc';
import { stateByCode } from './taxdata';
import { QUIZ, profileFromAnswers, scoreScenario, type GoalProfile } from './quiz';

export interface PlanOption {
  id: string;
  name: string;
  whys: string[];
  inputs: Inputs;
  result: StackResult;
  score: number;
}

export interface PlanSet {
  preface: string[];
  plans: PlanOption[];
}

function chose(answers: Record<string, number>, id: string): string {
  const q = QUIZ.find((item) => item.id === id);
  const i = answers[id];
  if (!q || i === undefined) return '';
  return q.options[i]?.label ?? '';
}

function dialFrom(profile: GoalProfile): number {
  const total = profile.income + profile.growth || 1;
  return Math.max(0, Math.min(100, Math.round((profile.income / total) * 100)));
}

interface Draft {
  id: string;
  name: (inputs: Inputs) => string;
  when: (answers: Record<string, number>, inputs: Inputs) => boolean;
  patch: (answers: Record<string, number>, inputs: Inputs, profile: GoalProfile) => Partial<Inputs>;
  reasons: (answers: Record<string, number>, inputs: Inputs, result: StackResult) => string[];
}

function drafts(): Draft[] {
  return [
    {
      id: 'stay-spend',
      name: () => 'Stay and spend more now',
      when: () => true,
      patch: () => ({ residency: 'stay', dial: 80, mode: 'balanced' }),
      reasons: (a) => {
        const lines = [
          a.work === 0
            ? `You said "${chose(a, 'work')}", so this plan points the mix at cash you can spend each year.`
            : a.horizon === 0
              ? `You said "${chose(a, 'horizon')}", so this plan takes more now and leaves less to compound.`
              : 'This is the most cash per year among the plans that keep you where you live.',
        ];
        if (a.move === 0) lines.push('You said you are not moving, so this plan does not depend on a new state.');
        if (a.pr === 0) lines.push('You said no to Puerto Rico, so this plan does not use it.');
        return lines;
      },
    },
    {
      id: 'stay-mid',
      name: () => 'Stay, with a middle mix',
      when: () => true,
      patch: (_a, _i, profile) => ({
        residency: 'stay',
        dial: Math.min(70, Math.max(30, dialFrom(profile))),
        mode: 'balanced',
      }),
      reasons: (a) => [
        a.horizon === 1 || a.work === 1
          ? `You said "${a.horizon === 1 ? chose(a, 'horizon') : chose(a, 'work')}", so this plan does not swing all the way to spending or all the way to growth.`
          : 'This is the middle if your answers did not pick a hard direction.',
        'Some cash each year, and the rest stays invested. Pick it when you do not want to be wrong in either direction.',
      ],
    },
    {
      id: 'stay-grow',
      name: () => 'Stay and let it grow',
      when: () => true,
      patch: () => ({ residency: 'stay', dial: 20, mode: 'balanced' }),
      reasons: (a) => {
        const lines = [
          a.work === 2
            ? `You said "${chose(a, 'work')}", so this plan takes less now and leaves more invested.`
            : a.horizon === 2
              ? `You said "${chose(a, 'horizon')}", so this plan favors the pile at year 25 over this year's cash.`
              : 'This is the high end of what you would have in 25 years if you stay put and spend less now.',
        ];
        if (a.legacy === 2) lines.push(`You said "${chose(a, 'legacy')}". Leaving more invested is how this plan serves that.`);
        return lines;
      },
    },
    {
      id: 'bonds',
      name: () => 'Mostly bonds, so the cash is steadier',
      when: () => true,
      patch: () => ({ residency: 'stay', dial: 100, mode: 'balanced' }),
      reasons: (a) => [
        a.risk === 0
          ? `You said "${chose(a, 'risk')}", so this plan puts as much as it can into the bond ladder. Bonds pay 4% in this model. A stock drop is not simulated.`
          : 'This is the steadiest paycheck of the five. More bonds, fewer stocks, and less left at year 25. A stock drop is not simulated.',
        a.privacy === 2 || a.lawsuit === 2
          ? 'You also said privacy or a lawsuit matters. The bond ladder sits in the trust either way. This plan does not add a house or a company on top of that.'
          : 'The trade is a calmer year and a smaller pile at year 25.',
      ],
    },
    {
      id: 'simple',
      name: () => 'Skip the insurance policy',
      when: () => true,
      patch: () => ({
        residency: 'stay',
        dial: 40,
        mode: 'manual' as const,
        manual: { a: 0.5, b: 0, c: 0.5 },
      }),
      reasons: (a, _i, result) => {
        const lines = [
          a.complexity === 0
            ? `You said "${chose(a, 'complexity')}", so this plan uses bonds and stocks only and skips the insurance policy.`
            : 'This is here so you can see the cost of skipping the insurance policy: less paperwork, and less tax-free cash.',
        ];
        if (!result.qpOk) lines.push('The insurance policy wants about $5 million left to invest. This prize is under that, so dropping it is the honest plan, not a compromise.');
        else lines.push('You give up the policy’s tax-free borrowing. You also give up the setup, the carrier, and the $5 million minimum.');
        return lines;
      },
    },
    {
      id: 'move',
      name: (inputs) => `Move to ${stateByCode(inputs.target).name}`,
      when: (a) => (a.move ?? 0) >= 1,
      patch: (_a, _i, profile) => ({ residency: 'move' as const, dial: dialFrom(profile), mode: 'balanced' as const }),
      reasons: (a, inputs) => {
        const here = stateByCode(inputs.state);
        const there = stateByCode(inputs.target);
        const lines = [
          `You said "${chose(a, 'move')}". Future investment income would be taxed in ${there.name}, not in ${here.name}.`,
        ];
        if (here.noTax) lines.push(`${here.name} already has no income tax, so moving does not cut a state tax on the investments. The prize tax does not change either.`);
        else if (there.noTax) lines.push(`The tax on the prize itself does not change. You already live in ${here.name} when you claim it. Only income earned after a real move is affected.`);
        else lines.push(`${there.name} still has an income tax, so this move is not a tax win.`);
        if (a.move === 1) lines.push('You said maybe, not yes. This is a look at the trade, not a recommendation to pack.');
        return lines;
      },
    },
    {
      id: 'pr',
      name: () => 'Live in Puerto Rico',
      when: (a) => (a.pr ?? 0) >= 1,
      patch: (_a, _i, profile) => ({ residency: 'pr' as const, dial: Math.min(dialFrom(profile), 35), mode: 'balanced' as const }),
      reasons: (a) => {
        const lines = [
          `You said "${chose(a, 'pr')}". This plan drops state tax on investment gains only if you actually live in Puerto Rico more than half the year.`,
          'The prize you already won is not untaxed by moving. A mailing address does not count.',
        ];
        if (a.pr === 1) lines.push('You asked to learn, not to move. It is on the list so you can see the dollars, and it should not outrank a plan you can use while you stay.');
        if (a.pr === 2) lines.push('You said you could live there. Read the Act 60 note and the December 31, 2026 filing deadline before you treat this as the plan.');
        return lines;
      },
    },
  ];
}

function sig(inp: Inputs): string {
  return [inp.residency, inp.sleeve ?? '', inp.mode, Math.round(inp.dial / 20), inp.entity4 > 0 ? '1' : '0'].join('|');
}

function moneyGap(n: number): string {
  if (Math.abs(n) < 1) return 'the same amount';
  return n > 0 ? `${fmtCompact(n)} more` : `${fmtCompact(-n)} less`;
}

function explainPlan(
  p: { name: string; inputs: Inputs; result: StackResult },
  best?: { name: string; result: StackResult },
): string[] {
  const w = p.result.weights;
  const lines = [
    `This plan pays ${fmtCompact(p.result.capacity)} a year and is worth ${fmtCompact(p.result.stackEnd)} in 25 years.`,
    `Of the money that is invested, ${pct(w.a, 0)} is in bonds, ${pct(w.b, 0)} is in the insurance policy, and ${pct(w.c, 0)} is in stocks.`,
  ];
  if (p.result.debtPaid > 0) lines.push(`${fmtCompact(p.result.debtPaid)} of debt is paid from the cash after tax, before anything is invested.`);
  if (p.inputs.entity4 > 0) lines.push(`${fmtCompact(p.inputs.entity4)} is set aside for a home and is not invested.`);
  if (p.inputs.residency === 'move') lines.push(`Future investment income is taxed as ${stateByCode(p.inputs.target).name}. The prize is taxed as ${stateByCode(p.inputs.state).name}.`);
  if (p.inputs.residency === 'pr') lines.push(`Later investment gains are taxed as Puerto Rico. The prize is taxed as ${stateByCode(p.inputs.state).name}.`);
  const sleeve = p.inputs.sleeve ? SLEEVE_MATH[p.inputs.sleeve] : undefined;
  if (sleeve && p.result.sleeveAmount > 0) {
    lines.push(`${fmtCompact(p.result.sleeveAmount)} is taken out of the stocks. In this plan that slice grows at ${pct(sleeve.growth)} a year and pays ${fmtCompact(p.result.sleeveAmount * sleeve.draw)} a year.`);
  }
  if (p.inputs.mode === 'manual' && p.inputs.manual.b === 0) lines.push('This plan has no insurance policy.');
  if (best) {
    lines.push(`Against ${best.name}, this pays ${moneyGap(p.result.capacity - best.result.capacity)} a year and leaves ${moneyGap(p.result.stackEnd - best.result.stackEnd)} in 25 years.`);
  }
  return lines;
}

export function buildBestPlans(answers: Record<string, number>, inputs: Inputs, asm: Assumptions): PlanSet {
  const profile = profileFromAnswers(answers);
  const basis: Inputs['basis'] = answers.claim === 2 ? 'net' : 'gross';
  const filing: Inputs['filing'] = answers.filing === 1 ? 'mfj' : 'single';
  const spend = inputs.spend;
  const base: Inputs = {
    ...inputs,
    basis,
    filing,
    spend,
    residency: 'stay',
    mode: 'balanced',
    flatDraw: false,
    drawOverrides: {},
  };

  const built = drafts()
    .filter((d) => d.when(answers, inputs))
    .map((d) => {
      const patch = d.patch(answers, inputs, profile);
      const planInputs: Inputs = { ...base, ...patch, manual: patch.manual ?? base.manual };
      return { d, planInputs, result: computeStack(planInputs, asm) };
    });

  const allResults = built.map((b) => b.result);
  const ranked = built
    .map((b) => {
      const score = scoreScenario(b.planInputs, b.result, profile, allResults);
      return { ...b, score: score.total, parts: score.parts };
    })
    .sort((a, b) => b.score - a.score);

  const forced = new Set<string>();
  if (answers.complexity === 0) forced.add('simple');
  if ((answers.pr ?? 0) >= 1) forced.add('pr');
  if ((answers.move ?? 0) >= 1) forced.add('move');

  const chosen: typeof ranked = [];
  for (const id of forced) {
    const hit = ranked.find((p) => p.d.id === id);
    if (hit) chosen.push(hit);
  }
  for (const p of ranked) {
    if (chosen.length >= 5) break;
    if (chosen.some((c) => c.d.id === p.d.id)) continue;
    const key = sig(p.planInputs);
    if (chosen.some((c) => sig(c.planInputs) === key)) continue;
    chosen.push(p);
  }
  for (const p of ranked) {
    if (chosen.length >= 5) break;
    if (!chosen.some((c) => c.d.id === p.d.id)) chosen.push(p);
  }
  chosen.sort((a, b) => b.score - a.score);
  const best = chosen[0];

  const here = stateByCode(inputs.state);
  const preface: string[] = [
    answers.claim === 2
      ? `The ${fmtCompact(inputs.amount)} you typed is treated as money already after tax, because you said "${chose(answers, 'claim')}".`
      : `The ${fmtCompact(inputs.amount)} you typed is treated as the cash option before tax, because you said "${chose(answers, 'claim')}". Federal and ${here.name} tax come off first.`,
    answers.filing === 1 ? 'The tax estimate uses married filing jointly.' : 'The tax estimate uses a single filer.',
  ];
  const debtPaid = ranked[0]?.result.debtPaid ?? 0;
  if (inputs.debt > 0) {
    preface.push(
      debtPaid < inputs.debt
        ? `${fmtCompact(debtPaid)} of the ${fmtCompact(inputs.debt)} you entered for debt is subtracted. That is all the cash left after tax. It comes out before anything is invested.`
        : `${fmtCompact(debtPaid)} of debt is subtracted after tax, before anything is invested.`,
    );
  }

  const plans: PlanOption[] = chosen.map((p) => {
    const whys = explainPlan(
      { name: p.d.name(inputs), inputs: p.planInputs, result: p.result },
      best && best.d.id !== p.d.id ? { name: best.d.name(inputs), result: best.result } : undefined,
    );
    return { id: p.d.id, name: p.d.name(inputs), whys, inputs: p.planInputs, result: p.result, score: p.score };
  });

  return { preface, plans };
}

function planKey(set: PlanSet): string {
  return set.plans.map((p) => [
    p.id,
    Math.round(p.result.capacity),
    Math.round(p.result.stackEnd),
    Math.round(p.result.weights.a * 100),
    Math.round(p.result.weights.b * 100),
    Math.round(p.result.weights.c * 100),
    p.inputs.residency,
    p.inputs.sleeve ?? '',
    Math.round(p.inputs.entity4),
    Math.round(p.result.debtPaid),
  ].join(':')).join('|');
}

/** What picking this answer does, read off the plans. Not a written claim. */
export function outcomesForQuestion(
  id: string,
  answers: Record<string, number>,
  inputs: Inputs,
  asm: Assumptions,
): string[] {
  const q = QUIZ.find((item) => item.id === id);
  if (!q) return [];
  if (inputs.amount <= 0) {
    return q.options.map(() => 'Enter a cash amount. Until then this choice has no numbers to show.');
  }
  const sets = q.options.map((_, i) => buildBestPlans({ ...answers, [id]: i }, inputs, asm));
  const keys = sets.map(planKey);
  const allSame = keys.every((k) => k === keys[0]);
  return sets.map((set) => {
    const best = set.plans[0];
    const w = best.result.weights;
    const head = `Best match: ${best.name}. ${fmtCompact(best.result.capacity)} a year. ${fmtCompact(best.result.stackEnd)} in 25 years. ${pct(w.a, 0)} bonds, ${pct(w.b, 0)} insurance, ${pct(w.c, 0)} stocks.`;
    if (allSame) return `The five plans do not change. ${head}`;
    return `${head} The five plans are: ${set.plans.map((p) => p.name).join('; ')}.`;
  });
}
