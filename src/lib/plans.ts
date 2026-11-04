import { computeStack, fmtCompact, type Assumptions, type Inputs, type StackResult } from './calc';
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

interface Draft {
  id: string;
  name: () => string;
  when: (answers: Record<string, number>) => boolean;
  patch: () => Partial<Inputs>;
}

function drafts(): Draft[] {
  return [
    { id: 'cover', name: () => 'Pays for the life', when: () => true, patch: () => ({ residency: 'stay', dial: 70, mode: 'balanced' }) },
    { id: 'steady', name: () => 'Steadier cash', when: () => true, patch: () => ({ residency: 'stay', dial: 100, mode: 'balanced' }) },
    {
      id: 'move',
      name: () => 'After a move',
      when: (a) => (a.move ?? 0) >= 1,
      patch: () => ({ residency: 'move', dial: 60, mode: 'balanced' }),
    },
    {
      id: 'pr',
      name: () => 'Living in Puerto Rico',
      when: (a) => a.pr === 1,
      patch: () => ({ residency: 'pr', dial: 60, mode: 'balanced' }),
    },
  ];
}

function year10(result: StackResult): number {
  return result.projection[9]?.end ?? 0;
}

function outcomeLines(inputs: Inputs, result: StackResult, answers: Record<string, number>): string[] {
  const covers = result.capacity >= inputs.spend && inputs.spend > 0;
  const y10 = year10(result);
  const lines = [
    covers
      ? `The money can pay the ${fmtCompact(inputs.spend)} a year you want. That is the life, paid for, without running out on these assumptions.`
      : inputs.spend > 0
        ? `The money can pay ${fmtCompact(result.capacity)} a year. You want ${fmtCompact(inputs.spend)}. It falls short. The life as described is not fully paid for.`
        : 'Type the yearly amount you want available. Until then there is no life to pay for.',
    `If you died in 10 years, about ${fmtCompact(y10)} would still be there. What is left in 25 years is not the result that matters.`,
  ];
  if (result.depletedYear && result.depletedYear <= 10) {
    lines.push(`At the yearly amount you want, the money runs out around year ${result.depletedYear}.`);
  }
  if (result.debtPaid > 0) lines.push(`${fmtCompact(result.debtPaid)} of debt is paid first and is not invested.`);
  if (result.housePaid > 0) lines.push(`${fmtCompact(result.housePaid)} for a home is not invested.`);
  if (result.venturePaid > 0) lines.push(`${fmtCompact(result.venturePaid)} for a business or rental is not invested.`);
  if (answers.pr === 2) {
    lines.push('A Puerto Rico address while you travel or live on a boat most of the year does not qualify. The tax treatment requires you to actually be there more than half the year. The lottery check is taxed either way.');
  } else if (answers.pr === 1) {
    lines.push('Puerto Rico changes later investment gains only if you live there more than half the year. It does not change the tax on the lottery check.');
  }
  if (answers.move === 2) {
    lines.push(`A move changes tax on future investment income only. The lottery check is still taxed in ${stateByCode(inputs.state).name}.`);
  }
  if (answers.cbi === 2) {
    lines.push('A passport from another country does not lower US tax. The tax ends only if you give up US citizenship.');
  }
  if (answers.abroad && answers.abroad > 0) {
    lines.push('Living in another country with a US passport does not turn off US tax.');
  }
  if (answers.renounce && answers.renounce > 0) {
    lines.push('Giving up US citizenship has its own tax. It is not treated as reversible.');
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
    .filter((d) => d.when(answers))
    .map((d) => {
      const patch = d.patch();
      const planInputs: Inputs = { ...base, ...patch, manual: patch.manual ?? base.manual };
      return { d, planInputs, result: computeStack(planInputs, asm) };
    });

  const allResults = built.map((b) => b.result);
  const ranked = built
    .map((b) => ({
      ...b,
      score: scoreScenario(b.planInputs, b.result, profile, allResults).total,
    }))
    .sort((a, b) => {
      const aCover = a.result.capacity >= inputs.spend ? 1 : 0;
      const bCover = b.result.capacity >= inputs.spend ? 1 : 0;
      if (aCover !== bCover) return bCover - aCover;
      return b.score - a.score;
    });

  const best = ranked[0];
  const here = stateByCode(inputs.state);
  const preface = [
    answers.claim === 1
      ? `The ${fmtCompact(inputs.amount)} you typed is money already after tax.`
      : `The ${fmtCompact(inputs.amount)} you typed is the lottery check before tax. Federal and ${here.name} tax come off first.`,
  ];

  const plans: PlanOption[] = best
    ? [{
        id: best.d.id,
        name: 'What the money can do',
        whys: outcomeLines(best.planInputs, best.result, answers),
        inputs: best.planInputs,
        result: best.result,
        score: best.score,
      }]
    : [];

  return { preface, plans };
}

export function outcomesForQuestion(): string[] {
  return [];
}
