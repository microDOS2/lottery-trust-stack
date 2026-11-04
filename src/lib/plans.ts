import { computeStack, fmtCompact, type Assumptions, type Inputs, type StackResult } from './calc';
import { stateByCode } from './taxdata';
import { QUIZ, SPEND_BY_ANSWER, profileFromAnswers, scoreScenario, type GoalProfile } from './quiz';

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

function houseCash(amount: number): number {
  const n = Math.round(Math.min(amount * 0.12, 2_000_000));
  return n >= 100_000 ? n : 0;
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
      patch: () => ({ residency: 'stay', dial: 80, mode: 'balanced', sleeve: null, entity4: 0 }),
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
        if (a.debts === 2) lines.push('You said debts come first. This plan produces the most cash early, which is the pot a payoff would come from. The chart does not subtract a specific loan balance.');
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
        sleeve: null,
        entity4: 0,
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
      patch: () => ({ residency: 'stay', dial: 20, mode: 'balanced', sleeve: null, entity4: 0 }),
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
      patch: () => ({ residency: 'stay', dial: 100, mode: 'balanced', sleeve: null, entity4: 0 }),
      reasons: (a) => [
        a.risk === 0
          ? `You said "${chose(a, 'risk')}" if the market drops, so this plan puts as much as it can into the bond ladder.`
          : 'This is the steadiest paycheck of the five. More bonds, fewer stocks, and less left at year 25.',
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
        sleeve: null,
        entity4: 0,
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
      patch: (_a, _i, profile) => ({ residency: 'move' as const, dial: dialFrom(profile), mode: 'balanced' as const, sleeve: null, entity4: 0 }),
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
      patch: (_a, _i, profile) => ({ residency: 'pr' as const, dial: Math.min(dialFrom(profile), 35), mode: 'balanced' as const, sleeve: null, entity4: 0 }),
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
    {
      id: 'house',
      name: () => 'Set cash aside for a home',
      when: (a, inputs) => a.house === 2 && houseCash(inputs.amount) > 0,
      patch: (_a, inputs, profile) => ({
        residency: 'stay' as const,
        dial: dialFrom(profile),
        mode: 'balanced' as const,
        sleeve: null,
        entity4: houseCash(inputs.amount),
      }),
      reasons: (a, inputs) => [
        `You said "${chose(a, 'house')}". This plan parks ${fmtCompact(houseCash(inputs.amount))} outside the investments for that purchase.`,
        'That cash is not in the bond ladder, the policy, or the stocks, so the year-25 pile is smaller. The rest of the plan stays where you live.',
      ],
    },
    {
      id: 'business',
      name: () => 'A slice for a business',
      when: (a) => (a.business ?? 0) >= 1,
      patch: (_a, _i, profile) => ({
        residency: 'stay' as const,
        dial: Math.min(dialFrom(profile), 40),
        mode: 'balanced' as const,
        sleeve: 'qsbs',
        sleevePct: 0.08,
        entity4: 0,
      }),
      reasons: (a) => {
        const lines = [
          `You said "${chose(a, 'business')}". About 8% of the invested money is pulled out of the stocks and modeled as a business.`,
          'The model grows that slice at 4% and pays you nothing from it. That is a middle guess, not a promise the company works. A real business can go to zero.',
        ];
        if (a.business === 1) lines.push('You called it a small slice, so it is not allowed to become the whole plan.');
        return lines;
      },
    },
    {
      id: 'oz',
      name: () => 'Lock a slice away for ten years',
      when: (a) => a.horizon === 2 && a.complexity !== 0 && a.business !== 2,
      patch: () => ({
        residency: 'stay' as const,
        dial: 25,
        mode: 'balanced' as const,
        sleeve: 'oz',
        sleevePct: 0.08,
        entity4: 0,
      }),
      reasons: () => [
        'You said the money should work over 20 or more years, and you did not ask for the simplest paperwork, so one plan locks about 8% away.',
        'That slice pays you nothing in the model and is grown at 6%. The lockup is real paperwork. It is not the place for money you need to live on.',
      ],
    },
  ];
}

function sig(inp: Inputs): string {
  return [inp.residency, inp.sleeve ?? '', inp.mode, Math.round(inp.dial / 20), inp.entity4 > 0 ? '1' : '0'].join('|');
}

export function buildBestPlans(answers: Record<string, number>, inputs: Inputs, asm: Assumptions): PlanSet {
  const profile = profileFromAnswers(answers);
  const basis: Inputs['basis'] = answers.claim === 2 ? 'net' : 'gross';
  const filing: Inputs['filing'] = answers.filing === 1 ? 'mfj' : 'single';
  const spend = answers.spend === undefined ? inputs.spend : SPEND_BY_ANSWER[answers.spend] ?? inputs.spend;
  const base: Inputs = {
    ...inputs,
    basis,
    filing,
    spend,
    sleeve: null,
    entity4: 0,
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
  if (answers.business === 2) forced.add('business');
  if (answers.house === 2 && houseCash(inputs.amount) > 0) forced.add('house');

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
  if (answers.debts === 2) preface.push('You said a lot of debt comes before investing. None of the five plans subtracts a loan balance. Pay that from cash in the first year, then fund the plan.');
  if ((answers.charity ?? 0) >= 2) preface.push('You said charity is a main goal. A gift in the prize year can lower that year’s tax. None of these five spends the pile on charity for you. Tell your preparer the amount before you file.');
  if (answers.house === 2 && houseCash(inputs.amount) === 0) preface.push('You want to buy a home, but the cash amount is too small to set a house aside inside the model. The plans invest what is left.');

  const plans: PlanOption[] = chosen.map((p, i) => {
    const top = [...p.parts].sort((a, b) => b.weight - a.weight).slice(0, 2).map((x) => x.label.toLowerCase());
    const whys = [...p.d.reasons(answers, inputs, p.result)];
    if (i === 0) {
      whys.unshift(top.length
        ? `Best match. It scores ${p.score} out of 100 on what your answers weighted most: ${top.join(' and ')}.`
        : `Best match. It scores ${p.score} out of 100 against your answers.`);
    } else if (best) {
      whys.unshift(`On the list because it is a different choice, not a copy of the best match. It scores ${p.score} out of 100.`);
      whys.push(`Against the best match, this pays ${fmtCompact(p.result.capacity)} a year instead of ${fmtCompact(best.result.capacity)}, and is worth ${fmtCompact(p.result.stackEnd)} in 25 years instead of ${fmtCompact(best.result.stackEnd)}.`);
    }
    return { id: p.d.id, name: p.d.name(inputs), whys, inputs: p.planInputs, result: p.result, score: p.score };
  });

  return { preface, plans };
}
