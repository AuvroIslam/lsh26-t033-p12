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
 * A fixed pastel per category, so a category keeps its colour across the
 * donut, the bars and the tables. Every slice is outlined in the same dark
 * edge as the rest of the interface, which is what lets tones this soft stay
 * legible next to each other. Rent leads on lilac because it is the largest
 * slice in most months, tying the chart to the accent used elsewhere.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#a98fe6',
  Groceries: '#8ed9bb',
  Food: '#ffb877',
  Transport: '#8fc4f0',
  Utilities: '#c9a8f5',
  Mobile: '#ff9dbb',
  Health: '#f78ba0',
  Education: '#7fd4dd',
  Entertainment: '#ffc46b',
  Clothing: '#b8dd7a',
  Other: '#b9b2cc',
};

export const colorFor = (c: string): string => CATEGORY_COLORS[c] ?? '#b9b2cc';

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
          accent="sky"
          label="Salary"
          value={displayMoney(summary.salary)}
          sub={`Monthly income for ${monthLabel(thisMonth)}`}
        />
        <Stat
          accent="peach"
          label="Spent this month"
          value={displayMoney(summary.totalSpent)}
          tone={summary.totalSpent > summary.salary ? 'bad' : 'neutral'}
          sub={`${summary.spentShare.toFixed(1)}% of salary over ${summary.expenses.length} entries`}
        />
        <Stat
          accent={summary.remaining >= 0 ? 'mint' : 'blush'}
          label={summary.remaining >= 0 ? 'Left so far' : 'Over salary'}
          value={displayMoney(Math.abs(summary.remaining))}
          tone={summary.remaining >= 0 ? 'good' : 'bad'}
          sub={`Day ${summary.daysElapsed} of ${summary.daysInMonth} — ${summary.daysRemaining} days remain`}
        />
        <Stat
          accent="lilac"
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
        accent="butter"
        title={`Spending against salary — ${monthLabel(thisMonth)}`}
        subtitle={`${displayMoney(summary.totalSpent)} of ${displayMoney(summary.salary)} used`}
      >
        <div className="px-5 py-5">
          <div className="nb-sm relative h-11 w-full overflow-hidden rounded-full bg-[var(--card-sunk)]">
            <div
              className={`h-full transition-[width] duration-700 ${
                summary.spentShare > 100 ? 'bg-blush' : 'bg-mint'
              }`}
              style={{ width: `${Math.min(100, summary.spentShare)}%` }}
            />
            <span className="tabular absolute inset-y-0 left-4 flex items-center text-[13px] font-extrabold text-[var(--text)]">
              {summary.spentShare.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2.5 flex justify-between text-[12px] font-semibold text-[var(--text)]/70">
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
          accent="mint"
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
                    innerRadius={44}
                    outerRadius={86}
                    paddingAngle={0}
                    stroke="#2b2440"
                    strokeWidth={1.5}
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
                    <span className="flex items-center gap-2 font-medium text-[var(--text)]">
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
                    <Meter value={c.share} color={colorFor(c.category)} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Largest expenses */}
        <Card
          className="lg:col-span-2"
          accent="peach"
          title="Largest expenses"
          subtitle="The five biggest single charges this month"
        >
          <ol className="divide-y divide-[var(--edge)]/15">
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
                  <p className="truncate text-[13px] font-semibold text-[var(--text)]">{e.shop}</p>
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
        accent="lilac"
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
                tick={{ fontSize: 11, fill: '#6b6285' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b6285' }}
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
                cursor={{ fill: 'rgba(169,143,230,0.18)' }}
              />
              <Bar dataKey="last" fill="#d9ccf7" stroke="#2b2440" strokeWidth={2} radius={[6, 6, 0, 0]} />
              <Bar dataKey="current" stroke="#2b2440" strokeWidth={2} radius={[6, 6, 0, 0]}>
                {summary.categories.map((c) => (
                  <Cell key={c.category} fill={colorFor(c.category)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border-t border-[var(--edge)] px-5 py-4">
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
              <tbody className="divide-y divide-[var(--edge)]/15">
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
                        c.delta > 0 ? 'text-blush-ink' : c.delta < 0 ? 'text-mint-ink' : 'text-[var(--muted)]'
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
                            c.delta > 0 ? 'text-blush-ink' : c.delta < 0 ? 'text-mint-ink' : 'text-[var(--muted)]'
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
  border: '2px solid #2b2440',
  fontSize: 12,
  background: '#ffffff', color: '#201a33', fontWeight: 600, boxShadow: '4px 4px 0 0 #2b2440',
} as const;

function monthLabelShortSafe(m: string): string {
  return monthLabel(m).split(' ')[0];
}
