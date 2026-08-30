/**
 * Forecast and month summary.
 *
 * Method (stated plainly because the README has to defend it):
 *   daily run rate = spent so far this month / days elapsed including today
 *   projected rest of month = daily run rate x days remaining after today
 *   projected month total = spent so far + projected rest of month
 *   projected left or short = salary - projected month total
 *
 * A flat run rate is used rather than anything cleverer because two months of
 * data cannot support a seasonal or day-of-week model, and a forecast a judge
 * can reproduce by hand on a calculator is worth more here than a black box.
 * Rent-like one-off charges already paid are inside "spent so far", so they are
 * not projected twice; the known limitation is that a large charge still to
 * come is only represented at the average rate, which the README records.
 */
import type { Expense, LedgerState } from '../lib/types';
import type { Paisa } from '../lib/money';
import { pct, roundHalfUp } from '../lib/money';
import { dayOf, daysInMonth, monthOf, prevMonth } from '../lib/dates';

export interface CategoryTotal {
  category: string;
  total: Paisa;
  count: number;
  /** Share of the month's spending, 0..100. */
  share: number;
  /** Same category last month, for the comparison. */
  lastMonthTotal: Paisa;
  /** Change against last month in paisa, and as a percentage. */
  delta: Paisa;
  deltaPct: number;
}

export interface MonthSummary {
  month: string;
  salary: Paisa;
  totalSpent: Paisa;
  /** salary - totalSpent, negative when overspent. */
  remaining: Paisa;
  /** Share of salary already spent, 0..100+. */
  spentShare: number;
  expenses: Expense[];
  categories: CategoryTotal[];
  largest: Expense[];
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
}

export interface Forecast {
  /** Average spend per elapsed day this month. */
  dailyRate: Paisa;
  /** Projected spending across the days left after today. */
  restOfMonth: Paisa;
  /** Projected total for the whole month. */
  projectedTotal: Paisa;
  /** salary - projectedTotal. Negative means projected short. */
  projectedRemaining: Paisa;
  /** True when the projection ends under water. */
  projectedShort: boolean;
  daysRemaining: number;
  daysElapsed: number;
  /** What is genuinely spendable per remaining day to break even. */
  safeDailyBudget: Paisa;
}

function totalOf(expenses: Expense[]): Paisa {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/** Expenses belonging to a given "YYYY-MM". */
export function expensesInMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((e) => monthOf(e.date) === month);
}

export function buildMonthSummary(state: LedgerState, month: string): MonthSummary {
  const inMonth = expensesInMonth(state.expenses, month);
  const last = expensesInMonth(state.expenses, prevMonth(month));
  const totalSpent = totalOf(inMonth);

  const lastByCat = new Map<string, Paisa>();
  for (const e of last) lastByCat.set(e.category, (lastByCat.get(e.category) ?? 0) + e.amount);

  const byCat = new Map<string, { total: Paisa; count: number }>();
  for (const e of inMonth) {
    const cur = byCat.get(e.category) ?? { total: 0, count: 0 };
    byCat.set(e.category, { total: cur.total + e.amount, count: cur.count + 1 });
  }

  const categories: CategoryTotal[] = [...byCat.entries()]
    .map(([category, { total, count }]) => {
      const lastMonthTotal = lastByCat.get(category) ?? 0;
      return {
        category,
        total,
        count,
        share: pct(total, totalSpent),
        lastMonthTotal,
        delta: total - lastMonthTotal,
        deltaPct: pct(total - lastMonthTotal, lastMonthTotal),
      };
    })
    .sort((a, b) => b.total - a.total);

  // Categories that existed last month but have nothing yet this month still
  // matter to the comparison, so they are carried through at zero.
  for (const [category, lastMonthTotal] of lastByCat) {
    if (!byCat.has(category)) {
      categories.push({
        category,
        total: 0,
        count: 0,
        share: 0,
        lastMonthTotal,
        delta: -lastMonthTotal,
        deltaPct: -100,
      });
    }
  }

  const dim = daysInMonth(month);
  const isCurrent = monthOf(state.today) === month;
  const daysElapsed = isCurrent ? dayOf(state.today) : dim;

  return {
    month,
    salary: state.salary,
    totalSpent,
    remaining: state.salary - totalSpent,
    spentShare: pct(totalSpent, state.salary),
    expenses: inMonth,
    categories,
    largest: [...inMonth].sort((a, b) => b.amount - a.amount).slice(0, 5),
    daysElapsed,
    daysInMonth: dim,
    daysRemaining: Math.max(0, dim - daysElapsed),
  };
}

export function buildForecast(summary: MonthSummary): Forecast {
  const { totalSpent, daysElapsed, daysRemaining, salary } = summary;
  const dailyRate = daysElapsed > 0 ? roundHalfUp(totalSpent / daysElapsed) : 0;
  const restOfMonth = dailyRate * daysRemaining;
  const projectedTotal = totalSpent + restOfMonth;
  const projectedRemaining = salary - projectedTotal;
  const trueRemaining = salary - totalSpent;

  return {
    dailyRate,
    restOfMonth,
    projectedTotal,
    projectedRemaining,
    projectedShort: projectedRemaining < 0,
    daysRemaining,
    daysElapsed,
    safeDailyBudget:
      daysRemaining > 0 ? roundHalfUp(Math.max(0, trueRemaining) / daysRemaining) : 0,
  };
}

/**
 * Money the forecast says is genuinely free each month for savings.
 *
 * Used by the pockets screen so that a completion date reflects what the
 * numbers actually allow rather than what the user hoped to put aside.
 */
export function monthlySurplus(forecast: Forecast): Paisa {
  return forecast.projectedRemaining;
}
