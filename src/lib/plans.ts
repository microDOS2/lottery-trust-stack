import { computeStack, fmtCompact, HORIZON, type Assumptions, type Inputs, type StackResult } from './calc';
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
  mix: { chosen: string[]; rationale: string[] };
}

/** Turn quiz answers into a visible strategy mix with a plain-English reason for each inclusion. */
export function explainMix(answers: Record<string, number>, inputs: Inputs): { chosen: string[]; rationale: string[] } {
  const chosen: string[] = [];
  const rationale: string[] = [];
  const add = (id: string, why: string) => { if (!chosen.includes(id)) { chosen.push(id); rationale.push(why); } };

  // The base stack is always present: bonds + stocks. Insurance joins when it qualifies.
  add('engine-a', 'The muni ladder is your reliable tax-free floor — it belongs in every mix.');
  add('engine-c', 'Direct-indexed stocks are your growth engine — also in every mix.');
  if (inputs.amount >= 5_000_000) {
    add('engine-b', 'Your pool clears the $5M insurance minimum, so the PPLI wrapper is available to you.');
  }

  if (answers.live === 2) add('pr-act60', 'You said you could actually live in Puerto Rico — Act 60 is in your mix.');
  else if (answers.live === 1) rationale.push('You are open to a 0% income-tax state. That is a residency setting, not a strategy card.');
  if (answers.worry === 1) add('real-estate', 'You worry about being found. The anonymous LLC keeps your name off property and titles.');
  if (answers.sue === 1 || answers.hold >= 1) rationale.push('You want assets harder to take. The DAPT and the insurance trust are already in the base stack; umbrella insurance is the cheap add-on.');
  if (answers.business === 1) add('qsbs', 'You plan a business. QSBS startup stock can exclude up to $15M of gain after 5 years.');
  if (answers.reinvest === 1) add('oz', 'You want the surplus working somewhere sheltered — Opportunity Zone funds defer gains and erase 10-year appreciation.');
  if (answers.give === 1 || answers.give === 2 || answers.giving === 0 || answers.giving === 1) add('charitable', 'You plan to give. A DAF or a charitable remainder trust does it tax-efficiently.');
  if (answers.estate === 0) add('legacy', 'Your estate clears the $15M exclusion. The dynasty-trust layer becomes the priority.');
  if (answers.foreign === 0) add('foreign-trust', 'You asked about offshore trusts. Read the reality check: protection yes, tax savings no.');
  if (answers.renounce === 1) add('expatriation', 'You would consider renouncing. That is the exit-tax module — a life decision, not a tax play.');
  return { chosen, rationale };
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
    : `The yearly amount lasts at least ${HORIZON} years on these assumptions. That is as far as this page looks. It is not a promise you will live that long.`;
  const yEnd = result.projection[HORIZON - 1]?.end ?? result.stackEnd;
  const lines = [
    lasts,
    `In ${HORIZON} years, about ${fmtCompact(yEnd)} would still be there. That pile is a comparison, not the finish line.`,
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
  if (answers.reinvest === 1) {
    lines.push('For the venture dollars: if it is a C-corporation, startup stock can exclude up to $15M of gain after 5 years (QSBS). That is the one reinvestment that can beat the stack.');
  }
  if (answers.umbrella === 2) {
    lines.push('Umbrella liability insurance pays when you are sued. Trusts make assets harder to take. You usually want both, and the insurance is the cheaper first step.');
  }
  if (answers.foreign === 0) {
    lines.push('Offshore trusts do not save a US citizen income tax. If you fund it and benefit from it, the IRS taxes every gain to you personally. Use them for protection only.');
  }
  if (answers.estate === 0) {
    lines.push('Above the $15M-per-person federal estate exclusion, the top estate rate is 40%. The dynasty-trust layer is how growth escapes it — fund it early.');
  }
  if (answers.giving === 0) {
    lines.push('A donor-advised fund turns the big tax year into a big deduction and lets you grant the money out over time.');
  } else if (answers.giving === 1) {
    lines.push('A charitable remainder trust sells appreciated assets tax-free and pays you income for life. The remainder goes to charity.');
  }
  if (answers.spendpattern === 0) {
    lines.push('The draw is flat: the same dollars every year. Buying power slowly shrinks with inflation; more stays compounding.');
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
    dial: answers.market === 0 ? 100 : answers.market === 1 ? 0 : 50,
    flatDraw: answers.spendpattern === 0,
    drawOverrides: {},
  };
  const mix = explainMix(answers, planInputs);
  const planWithMix = { ...planInputs, chosen: mix.chosen };
  const result = computeStack(planWithMix, asm);
  const score = scoreScenario(planWithMix, result, profile, [result]).total;
  const here = stateByCode(inputs.state);
  const preface = [
    answers.claim === 1
      ? `The ${fmtCompact(inputs.amount)} you typed is money already after tax.`
      : `The ${fmtCompact(inputs.amount)} you typed is the lottery check before tax. Federal and ${here.name} tax come off first.`,
  ];
  void QUIZ;
  return {
    preface,
    mix,
    plans: [{
      id: 'outcome',
      name: 'What the money can do',
      whys: outcomeLines(planWithMix, result, answers),
      inputs: planWithMix,
      result,
      score,
    }],
  };
}

export function outcomesForQuestion(): string[] {
  return [];
}
