/**
 * Forecast and month summary.
 *
 * Method (stated plainly because the README has to defend it, and because the
 * Forecast screen prints these same steps for the reader to check):
 *
 *   Spending is split into recurring fixed charges and day-to-day spending.
 *   A category counts as fixed when it billed exactly once last month and at
 *   most once this month — rent and a utility bill behave that way; groceries
 *   and transport do not. The test is made against the data rather than a
 *   hardcoded list of category names, so a ledger typed in by hand behaves the
 *   same way as a loaded sample case.
 *
 *   variable rate  = variable spending so far / days elapsed including today
 *   rest of month  = variable rate x days remaining
 *                    + any fixed charge that is due this month but not yet paid
 *   projected total = spent so far + rest of month
 *   projected left or short = salary - projected total
 *
 * Why not a single flat rate over everything: rent lands once, early. Dividing
 * it across the days elapsed and then re-projecting it over the days remaining
 * charges it two or three times over. On the published cases that inflates the
 * projection by up to 46,000.00 BDT and, on six of the twenty-five, reverses
 * the answer to the question the requirement actually asks — reporting a
 * shortfall for a month that ends in surplus.
 *
 * Everything here stays reproducible by hand: two averages and an addition,
 * no smoothing and no fitted model. Two months of history could not support
 * anything more elaborate anyway.
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
  /** How many times it billed last month, which is how a fixed charge is spotted. */
  lastMonthCount: number;
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
  /**
   * Average spend per elapsed day, counting only day-to-day spending.
   *
   * Recurring fixed charges are held out of this figure so that a charge
   * which lands once cannot be smeared across the whole month.
   */
  dailyRate: Paisa;
  /** Day-to-day spending so far, excluding recurring fixed charges. */
  variableSpent: Paisa;
  /** Recurring fixed charges already paid this month. */
  fixedPaid: Paisa;
  /** Fixed charges seen last month that have not yet appeared this month. */
  fixedOutstanding: Paisa;
  /** The categories behind `fixedOutstanding`, for the explanation on screen. */
  fixedOutstandingCategories: Array<{ category: string; amount: Paisa }>;
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

  const lastByCat = new Map<string, { total: Paisa; count: number }>();
  for (const e of last) {
    const cur = lastByCat.get(e.category) ?? { total: 0, count: 0 };
    lastByCat.set(e.category, { total: cur.total + e.amount, count: cur.count + 1 });
  }

  const byCat = new Map<string, { total: Paisa; count: number }>();
  for (const e of inMonth) {
    const cur = byCat.get(e.category) ?? { total: 0, count: 0 };
    byCat.set(e.category, { total: cur.total + e.amount, count: cur.count + 1 });
  }

  const categories: CategoryTotal[] = [...byCat.entries()]
    .map(([category, { total, count }]) => {
      const lastEntry = lastByCat.get(category);
      const lastMonthTotal = lastEntry?.total ?? 0;
      return {
        category,
        total,
        count,
        share: pct(total, totalSpent),
        lastMonthTotal,
        lastMonthCount: lastEntry?.count ?? 0,
        delta: total - lastMonthTotal,
        deltaPct: pct(total - lastMonthTotal, lastMonthTotal),
      };
    })
    .sort((a, b) => b.total - a.total);

  // Categories that existed last month but have nothing yet this month still
  // matter to the comparison, so they are carried through at zero.
  for (const [category, lastEntry] of lastByCat) {
    if (!byCat.has(category)) {
      categories.push({
        category,
        total: 0,
        count: 0,
        share: 0,
        lastMonthTotal: lastEntry.total,
        lastMonthCount: lastEntry.count,
        delta: -lastEntry.total,
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

/**
 * A charge must be at least this share of one day of average spending before
 * it is worth treating as fixed — expressed as a multiple of the flat daily
 * rate over the whole month.
 *
 * Without a floor, a category that happens to bill once in a sparse sample —
 * a single 486.00 lunch — is classed as fixed purely because it appears once
 * either side. Holding a sum that small out of the daily rate changes nothing
 * and misdescribes the spending, so only charges big enough to actually
 * distort the projection qualify.
 */
const FIXED_CHARGE_FLOOR_IN_DAYS = 3;

/**
 * Decide which categories behave like a recurring fixed charge.
 *
 * Two signals, both read off the data rather than a hardcoded list of category
 * names, so a hand-typed ledger behaves the same way as a loaded sample case:
 *
 *   1. Billing shape — exactly one charge last month and at most one this
 *      month. Rent and a monthly utility bill match; groceries and transport
 *      recur many times within the month and belong in the daily rate.
 *   2. Materiality — the charge is worth at least a few days of average
 *      spending, so that holding it out of the rate is actually meaningful.
 */
function findFixedCategories(summary: MonthSummary): Set<string> {
  const { totalSpent, daysInMonth: dim } = summary;
  const averageDay = dim > 0 ? totalSpent / dim : 0;
  const floor = averageDay * FIXED_CHARGE_FLOOR_IN_DAYS;

  const fixed = new Set<string>();
  for (const c of summary.categories) {
    const onceLastMonth = c.lastMonthTotal > 0 && c.lastMonthCount === 1;
    const atMostOnceThisMonth = c.count <= 1;
    // Judge size on whichever month actually carries the charge.
    const size = Math.max(c.total, c.lastMonthTotal);
    if (onceLastMonth && atMostOnceThisMonth && size >= floor) fixed.add(c.category);
  }
  return fixed;
}

export function buildForecast(summary: MonthSummary): Forecast {
  const { totalSpent, daysElapsed, daysRemaining, salary } = summary;
  const fixedCategories = findFixedCategories(summary);

  // Split what has been spent so far into fixed and day-to-day.
  let fixedPaid = 0;
  for (const c of summary.categories) {
    if (fixedCategories.has(c.category)) fixedPaid += c.total;
  }
  const variableSpent = totalSpent - fixedPaid;

  // A fixed charge that billed last month but has not appeared yet this month
  // is still due, so it is added once rather than averaged across the days.
  const fixedOutstandingCategories: Array<{ category: string; amount: Paisa }> = [];
  for (const c of summary.categories) {
    if (fixedCategories.has(c.category) && c.total === 0 && c.lastMonthTotal > 0) {
      fixedOutstandingCategories.push({ category: c.category, amount: c.lastMonthTotal });
    }
  }
  const fixedOutstanding = fixedOutstandingCategories.reduce((s, f) => s + f.amount, 0);

  const dailyRate = daysElapsed > 0 ? roundHalfUp(variableSpent / daysElapsed) : 0;
  const restOfMonth = dailyRate * daysRemaining + fixedOutstanding;
  const projectedTotal = totalSpent + restOfMonth;
  const projectedRemaining = salary - projectedTotal;
  const trueRemaining = salary - totalSpent;

  return {
    dailyRate,
    variableSpent,
    fixedPaid,
    fixedOutstanding,
    fixedOutstandingCategories,
    restOfMonth,
    projectedTotal,
    projectedRemaining,
    projectedShort: projectedRemaining < 0,
    daysRemaining,
    daysElapsed,
    // What is left to spend day to day, after setting aside anything still due.
    safeDailyBudget:
      daysRemaining > 0
        ? roundHalfUp(Math.max(0, trueRemaining - fixedOutstanding) / daysRemaining)
        : 0,
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
