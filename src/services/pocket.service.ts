/**
 * Savings pockets: completion dates from the forecast, and the DPS comparison.
 *
 * The DPS schedule follows the published fixture's rule verbatim:
 *
 *   "Each month: balance = balance + deposit, then
 *    interest = balance x rate / 12 / 100 rounded half up to the paisa
 *    and added to the balance (interest joins the balance, so later months
 *    earn on it)."
 *
 * Deposit first, then interest on the post-deposit balance, rounded half up to
 * the paisa each month before it compounds. Implemented month by month in
 * integer paisa rather than with a closed-form annuity formula, because the
 * per-month rounding is part of the stated rule and a closed form would drift
 * from it.
 */
import type { Paisa } from '../lib/money';
import { roundHalfUp } from '../lib/money';
import type { Pocket } from '../lib/types';
import { addMonths, monthOf } from '../lib/dates';
import type { Forecast } from './forecast.service';

export interface DpsMonth {
  monthIndex: number;
  month: string;
  deposit: Paisa;
  interest: Paisa;
  balance: Paisa;
  /** Deposits only, for the "what the interest added" comparison. */
  contributedSoFar: Paisa;
}

/**
 * Run the DPS schedule for `months` months.
 *
 * @param deposit       monthly deposit in paisa
 * @param annualRatePct annual rate, e.g. 8 for 8.00%
 * @param months        number of monthly cycles
 * @param startMonth    "YYYY-MM" the first deposit lands in
 */
export function dpsSchedule(
  deposit: Paisa,
  annualRatePct: number,
  months: number,
  startMonth: string,
): DpsMonth[] {
  const rows: DpsMonth[] = [];
  let balance = 0;
  let contributed = 0;

  for (let i = 0; i < months; i++) {
    balance += deposit;
    contributed += deposit;
    const interest = roundHalfUp((balance * annualRatePct) / 12 / 100);
    balance += interest;
    rows.push({
      monthIndex: i + 1,
      month: addMonths(startMonth, i),
      deposit,
      interest,
      balance,
      contributedSoFar: contributed,
    });
  }
  return rows;
}

export interface PocketProjection {
  pocket: Pocket;
  /** Months to reach the target from contributions alone. */
  monthsToTarget: number | null;
  /** "YYYY-MM" the target is reached, from contributions alone. */
  completionMonth: string | null;
  /** Whether the forecast says the contribution is affordable. */
  affordable: boolean;
  /** Monthly surplus the forecast leaves, shared across pockets. */
  forecastSurplus: Paisa;
  /** What the pocket would actually receive at the forecast's pace. */
  effectiveMonthly: Paisa;
  /** Months to target at the effective (forecast-limited) pace. */
  monthsAtForecastPace: number | null;
  completionMonthAtForecastPace: string | null;
  /** DPS schedule over the completion horizon. */
  dps: DpsMonth[];
  /** Balance a DPS would reach by the completion month. */
  dpsValueAtCompletion: Paisa;
  /** Plain deposits over the same horizon. */
  contributedAtCompletion: Paisa;
  /** Interest the DPS adds over the horizon. */
  dpsInterest: Paisa;
}

const MAX_MONTHS = 600; // 50 years; a guard so a tiny contribution cannot spin.

function monthsToReach(target: Paisa, monthly: Paisa): number | null {
  if (monthly <= 0) return null;
  const n = Math.ceil(target / monthly);
  return n > MAX_MONTHS ? null : n;
}

/**
 * Project one pocket.
 *
 * `surplusShare` is the slice of the forecast's monthly surplus this pocket can
 * claim. Pockets are funded in the order they appear, so an earlier pocket
 * takes its full contribution before a later one gets anything — which mirrors
 * how someone actually funds savings and keeps the arithmetic explainable.
 */
export function projectPocket(
  pocket: Pocket,
  forecast: Forecast,
  annualRatePct: number,
  today: string,
  surplusShare: Paisa,
): PocketProjection {
  const startMonth = addMonths(monthOf(today), 1);
  const effectiveMonthly = Math.max(0, Math.min(pocket.monthlyContribution, surplusShare));
  const affordable = surplusShare >= pocket.monthlyContribution;

  const monthsToTarget = monthsToReach(pocket.target, pocket.monthlyContribution);
  const monthsAtForecastPace = monthsToReach(pocket.target, effectiveMonthly);

  // The DPS comparison runs over the plan's own horizon, so it answers
  // "if I put this same contribution into a DPS instead, what would it return
  // over the time this pocket takes?"
  const horizon = monthsToTarget ?? 0;
  const dps = horizon > 0 ? dpsSchedule(pocket.monthlyContribution, annualRatePct, horizon, startMonth) : [];
  const lastRow = dps[dps.length - 1];

  return {
    pocket,
    monthsToTarget,
    completionMonth: monthsToTarget ? addMonths(startMonth, monthsToTarget - 1) : null,
    affordable,
    forecastSurplus: surplusShare,
    effectiveMonthly,
    monthsAtForecastPace,
    completionMonthAtForecastPace: monthsAtForecastPace
      ? addMonths(startMonth, monthsAtForecastPace - 1)
      : null,
    dps,
    dpsValueAtCompletion: lastRow?.balance ?? 0,
    contributedAtCompletion: lastRow?.contributedSoFar ?? 0,
    dpsInterest: lastRow ? lastRow.balance - lastRow.contributedSoFar : 0,
  };
}

/** Project every pocket, funding them in order out of the forecast surplus. */
export function projectPockets(
  pockets: Pocket[],
  forecast: Forecast,
  annualRatePct: number,
  today: string,
): PocketProjection[] {
  let pool = Math.max(0, forecast.projectedRemaining);
  return pockets.map((p) => {
    const share = Math.min(pool, p.monthlyContribution);
    pool -= share;
    return projectPocket(p, forecast, annualRatePct, today, share);
  });
}
