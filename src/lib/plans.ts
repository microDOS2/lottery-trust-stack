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
  const lasts = result.depletedYear
    ? `The yearly amount lasts about ${Math.max(0, result.depletedYear - 1)} years. In year ${result.depletedYear} the pile is gone on these assumptions.`
    : 'The yearly amount lasts at least 25 years on these assumptions. That is as far as this page looks. It is not a promise you will live that long.';
  const y25 = result.projection[24]?.end ?? result.stackEnd;
  const lines = [
    lasts,
    `In 25 years, about ${fmtCompact(y25)} would still be there. That pile is a comparison, not the finish line.`,
    covers
      ? `The money can pay the ${fmtCompact(inputs.spend)} a year you want without running out on these assumptions.`
      : inputs.spend > 0
        ? `The money can pay ${fmtCompact(result.capacity)} a year. You want ${fmtCompact(inputs.spend)}. It falls short.`
        : 'Type the yearly amount you want available.',
    `If you died in 10 years, about ${fmtCompact(y10)} would still be there.`,
  ];
  if ((inputs.laterSpend || 0) > 0) {
    lines.push(`From year 11 on, the yearly amount is ${fmtCompact(inputs.laterSpend)} instead of the first amount.`);
  }
  if (result.debtPaid > 0) lines.push(`${fmtCompact(result.debtPaid)} of debt is paid first and is not invested.`);
  if (result.housePaid > 0) lines.push(`${fmtCompact(result.housePaid)} for a home is not invested.`);
  if (result.venturePaid > 0) lines.push(`${fmtCompact(result.venturePaid)} for a business, a rental, or something else is not invested.`);
  if (answers.live === 2) {
    lines.push('Puerto Rico changes later investment gains only if you live there more than half the year. It does not change the tax on the lottery check.');
  } else if (answers.live === 1) {
    lines.push(`A move changes tax on future investment income only. The lottery check is still taxed in ${stateByCode(inputs.state).name}.`);
  } else if (answers.live === 3) {
    lines.push('Living in another country does not end US tax. US tax continues until you give up US citizenship.');
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
