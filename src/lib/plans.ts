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
      id: 'cover',
      name: () => 'Pays for the life you described',
      when: () => true,
      patch: () => ({ residency: 'stay', dial: 70, mode: 'balanced' }),
      reasons: (a, inputs, result) => {
        const lines = [
          result.capacity >= inputs.spend
            ? `This can pay the ${fmtCompact(inputs.spend)} a year you want. The money does not have to run out for that life.`
            : `This can pay ${fmtCompact(result.capacity)} a year. That is short of the ${fmtCompact(inputs.spend)} you want. The life as described is not fully paid for.`,
        ];
        if (a.move === 0) lines.push('You said you are not moving. This does not depend on a new state.');
        if (a.pr === 0) lines.push('You said no to Puerto Rico. This does not use it.');
        return lines;
      },
    },
    {
      id: 'steady',
      name: () => 'Steadier cash, so the worry stays smaller',
      when: () => true,
      patch: () => ({ residency: 'stay', dial: 100, mode: 'balanced' }),
      reasons: () => [
        'More of the money is in bonds, which pay interest and do not jump with the stock market. The yearly amount is steadier. A stock drop is not simulated.',
        'A larger amount left in 25 years is not the point. The point is the life, paid for, without the worry of running out.',
      ],
    },
    {
      id: 'simple',
      name: () => 'No insurance policy',
      when: () => true,
      patch: () => ({
        residency: 'stay',
        dial: 50,
        mode: 'manual' as const,
        manual: { a: 0.5, b: 0, c: 0.5 },
      }),
      reasons: (_a, _i, result) => {
        const lines = ['Bonds and stocks only. No insurance policy, so less paperwork.'];
        if (!result.qpOk) lines.push('The insurance policy is only used when about $5 million is left to invest. This amount is under that.');
        else lines.push('You give up the policy. You also give up its setup and its minimum.');
        return lines;
      },
    },
    {
      id: 'move',
      name: (inputs) => `Live in ${stateByCode(inputs.target).name}`,
      when: (a) => (a.move ?? 0) >= 1,
      patch: () => ({ residency: 'move' as const, dial: 60, mode: 'balanced' as const }),
      reasons: (a, inputs) => {
        const here = stateByCode(inputs.state);
        const there = stateByCode(inputs.target);
        const lines = [`You said "${chose(a, 'move')}". Future investment income would be taxed in ${there.name}, not in ${here.name}.`];
        if (here.noTax) lines.push(`${here.name} already has no income tax. Moving does not cut a state tax on the investments. The lottery check is taxed either way.`);
        else if (there.noTax) lines.push(`The lottery check is taxed in ${here.name}. Only income after a real move is affected.`);
        else lines.push(`${there.name} still has an income tax.`);
        if (a.move === 1) lines.push('You said you might move. This is the difference, not a decision to go.');
        return lines;
      },
    },
    {
      id: 'pr',
      name: () => 'Live in Puerto Rico',
      when: (a) => a.pr === 1,
      patch: () => ({ residency: 'pr' as const, dial: 60, mode: 'balanced' as const }),
      reasons: () => [
        'Later investment gains use the Puerto Rico path only if you are actually there more than half the year, with your life based there.',
        'The lottery check is taxed either way. A house you do not live in, a mailing address, or a boat does not qualify.',
      ],
    },
  ];
}

function year10(result: StackResult): number {
  return result.projection[9]?.end ?? 0;
}

function explainPlan(p: { name: string; inputs: Inputs; result: StackResult }): string[] {
  const w = p.result.weights;
  const y10 = year10(p.result);
  const covers = p.result.capacity >= p.inputs.spend;
  const lines = [
    covers
      ? `This can pay ${fmtCompact(p.result.capacity)} a year. That covers the ${fmtCompact(p.inputs.spend)} you want for the life.`
      : `This can pay ${fmtCompact(p.result.capacity)} a year. That is short of the ${fmtCompact(p.inputs.spend)} you want.`,
    `If you died in 10 years, about ${fmtCompact(y10)} would still be there. A larger amount in 25 years is not a win. You may not be alive then.`,
    `Of the money invested, ${pct(w.a, 0)} is in bonds, ${pct(w.b, 0)} is in the insurance policy, and ${pct(w.c, 0)} is in stocks.`,
  ];
  if (p.result.debtPaid > 0) lines.push(`${fmtCompact(p.result.debtPaid)} of debt is paid before anything is invested.`);
  if (p.result.housePaid > 0) lines.push(`${fmtCompact(p.result.housePaid)} for a home is not invested.`);
  if (p.result.venturePaid > 0) lines.push(`${fmtCompact(p.result.venturePaid)} for a business is not invested.`);
  if (p.inputs.residency === 'move') lines.push(`Future investment income is taxed as ${stateByCode(p.inputs.target).name}. The lottery check is taxed as ${stateByCode(p.inputs.state).name}.`);
  if (p.inputs.residency === 'pr') lines.push(`Later investment gains are taxed as Puerto Rico only if you actually live there. The lottery check is taxed as ${stateByCode(p.inputs.state).name}.`);
  const sleeve = p.inputs.sleeve ? SLEEVE_MATH[p.inputs.sleeve] : undefined;
  if (sleeve && p.result.sleeveAmount > 0) {
    lines.push(`${fmtCompact(p.result.sleeveAmount)} is taken out of the stocks.`);
  }
  if (p.inputs.mode === 'manual' && p.inputs.manual.b === 0) lines.push('This approach has no insurance policy.');
  if (p.result.depletedYear && p.result.depletedYear <= 10) {
    lines.push(`At this spending, the money runs out around year ${p.result.depletedYear}. That is inside 10 years.`);
  }
  return lines;
}

export function buildBestPlans(answers: Record<string, number>, inputs: Inputs, asm: Assumptions): PlanSet {
  const profile = profileFromAnswers(answers);
  const basis: Inputs['basis'] = answers.claim === 1 ? 'net' : 'gross';
  const filing: Inputs['filing'] = answers.filing === 1 ? 'mfj' : 'single';
  const base: Inputs = {
    ...inputs,
    basis,
    filing,
    spend: inputs.spend,
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

  const here = stateByCode(inputs.state);
  const preface: string[] = [
    'The score is which approach best pays for the life you described, without the money running out. A larger amount left in 25 years is not a win. You may not be alive in 10 years.',
    answers.claim === 1
      ? `The ${fmtCompact(inputs.amount)} you typed is treated as money already after tax.`
      : `The ${fmtCompact(inputs.amount)} you typed is treated as the lottery check before tax. Federal and ${here.name} tax come off first.`,
    answers.filing === 1 ? 'The tax estimate uses a return with another person on it.' : 'The tax estimate uses a return that is yours alone.',
  ];
  if (answers.pr === 2) {
    preface.push('You said you would use a Puerto Rico address but travel or live on a boat most of the year. That does not qualify. The tax treatment requires you to actually be there more than half the year.');
  }
  if (answers.cbi === 2) {
    preface.push('You said you want a passport from another country to pay less US tax. A new passport does not do that. US tax continues until you give up US citizenship.');
  }
  if (answers.renounce && answers.renounce > 0) {
    preface.push('Giving up US citizenship has its own tax. Type what the assets would sell for and what you paid, on the strategy page, before that tax can be calculated.');
  }

  const plans: PlanOption[] = ranked.slice(0, 4).map((p) => ({
    id: p.d.id,
    name: p.d.name(inputs),
    whys: [...p.d.reasons(answers, p.planInputs, p.result), ...explainPlan({ name: p.d.name(inputs), inputs: p.planInputs, result: p.result })],
    inputs: p.planInputs,
    result: p.result,
    score: p.score,
  }));

  return { preface, plans };
}

export function outcomesForQuestion(
  id: string,
  _answers: Record<string, number>,
  inputs: Inputs,
  _asm: Assumptions,
): string[] {
  const q = QUIZ.find((item) => item.id === id);
  if (!q) return [];
  if (inputs.amount <= 0 && (id === 'move' || id === 'pr')) {
    return q.options.map(() => 'Enter a cash amount. Until then this choice has no numbers to show.');
  }
  return q.options.map((o) => o.note);
}
