/**
 * R2 — the monthly dashboard.
 *
 * Total spent against salary, a breakdown by category, the largest expenses,
 * and the change against last month, all for the month that contains `today`.
 */
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Card, EmptyState, Meter, Stat } from '../components/ui';
import { compactMoney, displayMoney, pct } from '../lib/money';
import { dateLabel, monthLabel, monthOf, prevMonth } from '../lib/dates';
import { buildMonthSummary, expensesInMonth } from '../services/forecast.service';
import { useLedger } from '../store/ledger.store';

/**
 * Category colours.
 *
 * A fixed hue per category, so a category keeps its colour between the donut,
 * the bars and the table. Ordered to keep adjacent slices distinguishable.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#08584a',
  Groceries: '#14a184',
  Food: '#f59e0b',
  Transport: '#3b82f6',
  Utilities: '#8b5cf6',
  Mobile: '#ec4899',
  Health: '#ef4444',
  Education: '#0ea5e9',
  Entertainment: '#f97316',
  Clothing: '#84cc16',
  Other: '#64748b',
};

export const colorFor = (c: string): string => CATEGORY_COLORS[c] ?? '#64748b';

export default function DashboardScreen() {
  const state = useLedger();
  const thisMonth = monthOf(state.today);
  const lastMonth = prevMonth(thisMonth);

  const summary = useMemo(() => buildMonthSummary(state, thisMonth), [state, thisMonth]);
  const lastTotal = useMemo(
    () => expensesInMonth(state.expenses, lastMonth).reduce((s, e) => s + e.amount, 0),
    [state.expenses, lastMonth],
  );

  const monthDelta = summary.totalSpent - lastTotal;
  const donut = summary.categories.filter((c) => c.total > 0);

  if (state.expenses.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No expenses yet"
          body="Load one of the 25 published sample cases from the header, or add an expense by hand or from a receipt photo, and the dashboard will fill in."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Salary"
          value={displayMoney(summary.salary)}
          sub={`Monthly income for ${monthLabel(thisMonth)}`}
        />
        <Stat
          label="Spent this month"
          value={displayMoney(summary.totalSpent)}
          tone={summary.totalSpent > summary.salary ? 'bad' : 'neutral'}
          sub={`${summary.spentShare.toFixed(1)}% of salary over ${summary.expenses.length} entries`}
        />
        <Stat
          label={summary.remaining >= 0 ? 'Left so far' : 'Over salary'}
          value={displayMoney(Math.abs(summary.remaining))}
          tone={summary.remaining >= 0 ? 'good' : 'bad'}
          sub={`Day ${summary.daysElapsed} of ${summary.daysInMonth} — ${summary.daysRemaining} days remain`}
        />
        <Stat
          label={`vs ${monthLabelShortSafe(lastMonth)}`}
          value={`${monthDelta >= 0 ? '+' : '−'}${displayMoney(Math.abs(monthDelta)).slice(1)}`}
          tone={monthDelta > 0 ? 'bad' : 'good'}
          sub={
            lastTotal > 0
              ? `${monthLabel(lastMonth)} closed at ${displayMoney(lastTotal)} (${
                  monthDelta >= 0 ? '+' : ''
                }${pct(monthDelta, lastTotal).toFixed(1)}%)`
              : 'No spending recorded last month'
          }
        />
      </div>

      {/* Salary consumption bar — the single clearest read of the month. */}
      <Card
        title={`Spending against salary — ${monthLabel(thisMonth)}`}
        subtitle={`${displayMoney(summary.totalSpent)} of ${displayMoney(summary.salary)} used`}
      >
        <div className="px-5 py-5">
          <div className="relative h-9 w-full overflow-hidden rounded-xl bg-slate-100">
            <div
              className={`h-full ${summary.spentShare > 100 ? 'bg-rose-500' : 'bg-brand-500'}`}
              style={{ width: `${Math.min(100, summary.spentShare)}%` }}
            />
            <span className="tabular absolute inset-y-0 left-3 flex items-center text-[13px] font-bold text-white mix-blend-plus-lighter">
              {summary.spentShare.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-[var(--muted)]">
            <span>{displayMoney(0)}</span>
            <span>
              {summary.remaining >= 0
                ? `${displayMoney(summary.remaining)} still unspent`
                : `${displayMoney(-summary.remaining)} over salary`}
            </span>
            <span>{displayMoney(summary.salary)}</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Category breakdown */}
        <Card
          className="lg:col-span-3"
          title="Breakdown by category"
          subtitle={`${donut.length} categories with spending this month`}
        >
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-[180px_1fr] sm:items-center">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="total"
                    nameKey="category"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {donut.map((c) => (
                      <Cell key={c.category} fill={colorFor(c.category)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n: string) => [displayMoney(v), n]}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="space-y-2.5">
              {donut.map((c) => (
                <li key={c.category}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="flex items-center gap-2 font-medium text-ink-900">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: colorFor(c.category) }}
                      />
                      {c.category}
                      <span className="text-[11px] text-[var(--muted)]">
                        {c.count} {c.count === 1 ? 'entry' : 'entries'}
                      </span>
                    </span>
                    <span className="tabular shrink-0 font-semibold">
                      {displayMoney(c.total)}
                      <span className="ml-1.5 text-[11px] font-medium text-[var(--muted)]">
                        {c.share.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1">
                    <Meter value={c.share} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Largest expenses */}
        <Card
          className="lg:col-span-2"
          title="Largest expenses"
          subtitle="The five biggest single charges this month"
        >
          <ol className="divide-y divide-[var(--border)]">
            {summary.largest.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                <span className="tabular w-5 shrink-0 text-[13px] font-bold text-[var(--muted)]">
                  {i + 1}
                </span>
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: colorFor(e.category) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink-900">{e.shop}</p>
                  <p className="text-[12px] text-[var(--muted)]">
                    {e.category} · {dateLabel(e.date)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-[13px] font-bold">{displayMoney(e.amount)}</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {pct(e.amount, summary.totalSpent).toFixed(1)}% of month
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Month-on-month comparison */}
      <Card
        title={`Change against ${monthLabel(lastMonth)}`}
        subtitle="Every category that has spending in either month"
      >
        <div className="h-[240px] px-3 py-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={summary.categories.map((c) => ({
                category: c.category,
                last: c.lastMonthTotal / 100,
                current: c.total / 100,
              }))}
              margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
            >
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: '#5d6f69' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#5d6f69' }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v: number) => compactMoney(v * 100)}
              />
              <Tooltip
                formatter={(v: number, n: string) => [
                  displayMoney(v * 100),
                  n === 'last' ? monthLabel(lastMonth) : monthLabel(thisMonth),
                ]}
                contentStyle={tooltipStyle}
                cursor={{ fill: 'rgba(20,161,132,0.06)' }}
              />
              <Bar dataKey="last" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="current" fill="#14a184" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border-t border-[var(--border)] px-5 py-4">
          <div className="mb-2 flex items-center gap-4 text-[12px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-slate-300" /> {monthLabel(lastMonth)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand-400" /> {monthLabel(thisMonth)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="text-[11px] tracking-wide text-[var(--muted)] uppercase">
                  <th className="py-2 pr-3 font-semibold">Category</th>
                  <th className="py-2 pr-3 text-right font-semibold">{monthLabel(lastMonth)}</th>
                  <th className="py-2 pr-3 text-right font-semibold">{monthLabel(thisMonth)}</th>
                  <th className="py-2 pr-3 text-right font-semibold">Change</th>
                  <th className="py-2 text-right font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {summary.categories.map((c) => (
                  <tr key={c.category}>
                    <td className="py-2 pr-3 font-medium">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: colorFor(c.category) }}
                        />
                        {c.category}
                      </span>
                    </td>
                    <td className="tabular py-2 pr-3 text-right text-[var(--muted)]">
                      {displayMoney(c.lastMonthTotal)}
                    </td>
                    <td className="tabular py-2 pr-3 text-right font-semibold">
                      {displayMoney(c.total)}
                    </td>
                    <td
                      className={`tabular py-2 pr-3 text-right font-medium ${
                        c.delta > 0 ? 'text-rose-600' : c.delta < 0 ? 'text-emerald-600' : 'text-[var(--muted)]'
                      }`}
                    >
                      {c.delta === 0 ? '—' : `${c.delta > 0 ? '+' : '−'}${displayMoney(Math.abs(c.delta)).slice(1)}`}
                    </td>
                    <td className="py-2 text-right">
                      {c.lastMonthTotal === 0 ? (
                        <Badge tone="brand">new</Badge>
                      ) : (
                        <span
                          className={`tabular text-[12px] font-semibold ${
                            c.delta > 0 ? 'text-rose-600' : c.delta < 0 ? 'text-emerald-600' : 'text-[var(--muted)]'
                          }`}
                        >
                          {c.deltaPct > 0 ? '+' : ''}
                          {c.deltaPct.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8e5',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(12,31,25,0.08)',
} as const;

function monthLabelShortSafe(m: string): string {
  return monthLabel(m).split(' ')[0];
}
