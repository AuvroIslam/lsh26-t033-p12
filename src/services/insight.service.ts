/**
 * Written insights.
 *
 * The requirement is explicit that insights must "name specific categories and
 * amounts rather than giving general advice", so every generator below is
 * forbidden from producing a sentence without a real figure in it: each one
 * reads the actual month summary and forecast, and returns nothing when the
 * data does not support it. Candidates are then ranked by materiality (how much
 * money the insight is about) and the strongest are shown.
 *
 * Nothing here is a fixed string with a number pasted on the end — an insight
 * that cannot cite a category and an amount is not generated at all.
 */
import type { Paisa } from '../lib/money';
import { displayMoney, pct } from '../lib/money';
import { dateLabel, monthLabel } from '../lib/dates';
import type { Forecast, MonthSummary } from './forecast.service';

export type InsightTone = 'critical' | 'warning' | 'positive' | 'neutral';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  /** How much money this insight concerns, used for ranking. */
  materiality: number;
}

const fmt = (p: Paisa): string => displayMoney(p);

export function buildInsights(
  summary: MonthSummary,
  forecast: Forecast,
  lastMonthTotal: Paisa,
  lastMonth: string,
): Insight[] {
  const out: Insight[] = [];
  const { salary, totalSpent, categories } = summary;
  const spendingCats = categories.filter((c) => c.total > 0);
  const thisMonth = monthLabel(summary.month);

  // 1. Where the month ends: over salary, or with money left.
  if (forecast.projectedShort) {
    out.push({
      id: 'projection-short',
      tone: 'critical',
      title: `Projected ${fmt(-forecast.projectedRemaining)} short by month end`,
      body:
        `You have spent ${fmt(totalSpent)} in ${forecast.daysElapsed} days, running at ` +
        `${fmt(forecast.dailyRate)} a day on day-to-day spending. Carried across the ${forecast.daysRemaining} days left` +
        (forecast.fixedOutstanding > 0 ? `, with ${fmt(forecast.fixedOutstanding)} of fixed charges still due` : '') +
        `, `+
        `${thisMonth} ends at ${fmt(forecast.projectedTotal)} against a salary of ` +
        `${fmt(salary)} — a shortfall of ${fmt(-forecast.projectedRemaining)}. Holding spending to ` +
        `${fmt(forecast.safeDailyBudget)} a day for the rest of the month is what breaks even.`,
      materiality: Math.abs(forecast.projectedRemaining) * 3,
    });
  } else {
    out.push({
      id: 'projection-surplus',
      tone: 'positive',
      title: `On track to keep ${fmt(forecast.projectedRemaining)} this month`,
      body:
        `Day-to-day spending is running at ${fmt(forecast.dailyRate)} a day across ${forecast.daysElapsed} days` +
        (forecast.fixedPaid > 0 ? `, apart from ${fmt(forecast.fixedPaid)} of fixed charges already paid` : '') +
        `. Projecting that over the ${forecast.daysRemaining} days remaining puts ${thisMonth} at ` +
        `${fmt(forecast.projectedTotal)}, leaving ${fmt(forecast.projectedRemaining)} of your ` +
        `${fmt(salary)} salary. Another ${fmt(forecast.restOfMonth)} is expected before the month closes.`,
      materiality: forecast.projectedRemaining * 2,
    });
  }

  // 2. The single largest category, with its share of salary.
  const top = spendingCats[0];
  if (top) {
    out.push({
      id: 'top-category',
      tone: top.total > salary * 0.35 ? 'warning' : 'neutral',
      title: `${top.category} is your largest category at ${fmt(top.total)}`,
      body:
        `${top.category} accounts for ${top.share.toFixed(1)}% of the ${fmt(totalSpent)} spent this month ` +
        `across ${top.count} ${top.count === 1 ? 'entry' : 'entries'}, which is ` +
        `${pct(top.total, salary).toFixed(1)}% of your ${fmt(salary)} salary.` +
        (top.lastMonthTotal > 0
          ? ` Last month the same category came to ${fmt(top.lastMonthTotal)}.`
          : ' There was no spending in this category last month.'),
      materiality: top.total,
    });
  }

  // 3. Sharpest month-on-month rise, named.
  const riser = spendingCats
    .filter((c) => c.lastMonthTotal > 0 && c.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0];
  if (riser) {
    out.push({
      id: `riser-${riser.category}`,
      tone: riser.deltaPct > 50 ? 'warning' : 'neutral',
      title: `${riser.category} is up ${fmt(riser.delta)} on last month`,
      body:
        `${riser.category} has reached ${fmt(riser.total)} this month against ${fmt(riser.lastMonthTotal)} in ` +
        `${monthLabel(lastMonth)} — a rise of ${fmt(riser.delta)}, or ${riser.deltaPct.toFixed(1)}%. ` +
        `It is the steepest increase of any category. Bringing it back to the level of last month would free ` +
        `${fmt(riser.delta)}.`,
      materiality: riser.delta * 2,
    });
  }

  // 4. Sharpest fall, so the report is not only bad news.
  const faller = spendingCats
    .filter((c) => c.lastMonthTotal > 0 && c.delta < 0)
    .sort((a, b) => a.delta - b.delta)[0];
  if (faller) {
    out.push({
      id: `faller-${faller.category}`,
      tone: 'positive',
      title: `${faller.category} is down ${fmt(-faller.delta)} on last month`,
      body:
        `${faller.category} is at ${fmt(faller.total)} this month against ${fmt(faller.lastMonthTotal)} in ` +
        `${monthLabel(lastMonth)}, a fall of ${fmt(-faller.delta)} (${Math.abs(faller.deltaPct).toFixed(1)}%). ` +
        `That saving is the largest single improvement in your spending this month.`,
      materiality: Math.abs(faller.delta) * 1.5,
    });
  }

  // 5. Concentration: how much of the month sits in the top three categories.
  if (spendingCats.length >= 3) {
    const top3 = spendingCats.slice(0, 3);
    const top3Total = top3.reduce((s, c) => s + c.total, 0);
    out.push({
      id: 'concentration',
      tone: 'neutral',
      title: `${top3.map((c) => c.category).join(', ')} are ${pct(top3Total, totalSpent).toFixed(0)}% of spending`,
      body:
        `Your three largest categories — ${top3
          .map((c) => `${c.category} ${fmt(c.total)}`)
          .join(', ')} — come to ${fmt(top3Total)} between them, ` +
        `${pct(top3Total, totalSpent).toFixed(1)}% of everything spent this month. ` +
        `The remaining ${spendingCats.length - 3} ` +
        `${spendingCats.length - 3 === 1 ? 'category accounts' : 'categories account'} for ` +
        `${fmt(totalSpent - top3Total)}.`,
      materiality: top3Total * 0.8,
    });
  }

  // 6. The single biggest expense of the month.
  const biggest = summary.largest[0];
  if (biggest) {
    const top5 = summary.largest.reduce((s, e) => s + e.amount, 0);
    out.push({
      id: 'largest-expense',
      tone: biggest.amount > salary * 0.2 ? 'warning' : 'neutral',
      title: `Largest single expense: ${fmt(biggest.amount)} at ${biggest.shop}`,
      body:
        `${biggest.shop} on ${dateLabel(biggest.date)} took ${fmt(biggest.amount)} under ${biggest.category}, ` +
        `${pct(biggest.amount, totalSpent).toFixed(1)}% of the spending this month and ` +
        `${pct(biggest.amount, salary).toFixed(1)}% of your salary. ` +
        `Your five largest expenses total ${fmt(top5)}.`,
      materiality: biggest.amount,
    });
  }

  // 7. Overall pace against the whole of last month.
  if (lastMonthTotal > 0) {
    const diff = forecast.projectedTotal - lastMonthTotal;
    out.push({
      id: 'vs-last-month',
      tone: diff > 0 ? 'warning' : 'positive',
      title:
        diff > 0
          ? `Heading for ${fmt(diff)} more than ${monthLabel(lastMonth)}`
          : `Heading for ${fmt(-diff)} less than ${monthLabel(lastMonth)}`,
      body:
        `${monthLabel(lastMonth)} closed at ${fmt(lastMonthTotal)}. ${thisMonth} is ` +
        `projected to finish at ${fmt(forecast.projectedTotal)}, ` +
        `${diff > 0 ? 'up' : 'down'} ${fmt(Math.abs(diff))} ` +
        `(${Math.abs(pct(diff, lastMonthTotal)).toFixed(1)}%).`,
      materiality: Math.abs(diff),
    });
  }

  // 8. A frequency observation, where a category bleeds by repetition rather
  //    than through any single large charge.
  const frequent = [...spendingCats].sort((a, b) => b.count - a.count)[0];
  if (frequent && frequent.count >= 5) {
    const avg = Math.round(frequent.total / frequent.count);
    out.push({
      id: `frequency-${frequent.category}`,
      tone: 'neutral',
      title: `${frequent.count} ${frequent.category} purchases averaging ${fmt(avg)}`,
      body:
        `${frequent.category} is your most frequent category with ${frequent.count} entries this month, ` +
        `averaging ${fmt(avg)} each and ${fmt(frequent.total)} in total. ` +
        `Cutting two of those would save about ${fmt(avg * 2)}.`,
      materiality: frequent.total * 0.6,
    });
  }

  return out.sort((a, b) => b.materiality - a.materiality);
}
