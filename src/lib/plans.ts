import { computeStack, fmtCompact, type Assumptions, type Inputs, type StackResult } from './calc';
import { stateByCode } from './taxdata';
import { QUIZ, profileFromAnswers, scoreScenario } from './quiz';

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

function year10(result: StackResult): number {
  return result.projection[9]?.end ?? 0;
}

function residencyFor(answers: Record<string, number>): Inputs['residency'] {
  if (answers.live === 2) return 'pr';
  if (answers.live === 1) return 'move';
  return 'stay';
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
  if (result.venturePaid > 0) lines.push(`${fmtCompact(result.venturePaid)} for a business, a rental, or something else is not invested.`);
  if (answers.live === 3) {
    lines.push('A Puerto Rico address while you travel or live on a boat most of the year does not qualify. The tax break does not apply. The lottery check is taxed the same either way.');
  } else if (answers.live === 2) {
    lines.push('Puerto Rico changes later investment gains only if you live there more than half the year. It does not change the tax on the lottery check.');
  } else if (answers.live === 1) {
    lines.push(`A move changes tax on future investment income only. The lottery check is still taxed in ${stateByCode(inputs.state).name}.`);
  } else if (answers.live === 4) {
    lines.push('Living in another country with a US passport does not turn off US tax.');
  }
  if (answers.cbi === 2) {
    lines.push('A passport from another country does not lower US tax. The tax ends only if you give up US citizenship.');
  }
  if (answers.renounce && answers.renounce > 0) {
    lines.push('Giving up US citizenship ends US tax on money from anywhere. It has its own tax, the exit tax, on the gain in your assets as if you sold them. You may not be able to live in the US again. Type what the assets would sell for and what you paid, on the calculator, to see the tax.');
  }
  if (answers.worry === 1) {
    lines.push('A trust can keep a name off a house, a car, or a court paper. It does not hide the money from the tax office.');
  }
  if (answers.gone === 2) {
    lines.push('A trust in the United States can slow a lawsuit. A foreign trust does not hide the money from the tax office.');
  }
  return lines;
}

export function buildBestPlans(answers: Record<string, number>, inputs: Inputs, asm: Assumptions): PlanSet {
  const profile = profileFromAnswers(answers);
  const basis: Inputs['basis'] = answers.claim === 1 ? 'net' : 'gross';
  const filing: Inputs['filing'] = answers.filing === 1 ? 'mfj' : 'single';
  const planInputs: Inputs = {
    ...inputs,
    basis,
    filing,
    spend: inputs.spend,
    residency: residencyFor(answers),
    mode: 'balanced',
    dial: 70,
    flatDraw: false,
    drawOverrides: {},
  };
  const result = computeStack(planInputs, asm);
  const score = scoreScenario(planInputs, result, profile, [result]).total;
  const here = stateByCode(inputs.state);
  const preface = [
    answers.claim === 1
      ? `The ${fmtCompact(inputs.amount)} you typed is money already after tax.`
      : `The ${fmtCompact(inputs.amount)} you typed is the lottery check before tax. Federal and ${here.name} tax come off first.`,
  ];
  void QUIZ;
  return {
    preface,
    plans: [{
      id: 'outcome',
      name: 'What the money can do',
      whys: outcomeLines(planInputs, result, answers),
      inputs: planInputs,
      result,
      score,
    }],
  };
}

export function outcomesForQuestion(): string[] {
  return [];
}
