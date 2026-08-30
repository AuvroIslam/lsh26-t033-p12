/**
 * R3 — the forecast and the written insights.
 *
 * The method is shown on screen rather than hidden, because a projection the
 * reader can check by hand is worth more than one they have to trust.
 */
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Card, EmptyState, Stat } from '../components/ui';
import { compactMoney, displayMoney } from '../lib/money';
import { addMonths, monthLabel, monthOf, prevMonth } from '../lib/dates';
import { buildForecast, buildMonthSummary, expensesInMonth } from '../services/forecast.service';
import { buildInsights, type Insight } from '../services/insight.service';
import { useLedger } from '../store/ledger.store';
import { tooltipStyle } from './DashboardScreen';

export default function ForecastScreen() {
  const state = useLedger();
  const thisMonth = monthOf(state.today);
  const lastMonth = prevMonth(thisMonth);

  const summary = useMemo(() => buildMonthSummary(state, thisMonth), [state, thisMonth]);
  const forecast = useMemo(() => buildForecast(summary), [summary]);
  const lastTotal = useMemo(
    () => expensesInMonth(state.expenses, lastMonth).reduce((s, e) => s + e.amount, 0),
    [state.expenses, lastMonth],
  );
  const insights = useMemo(
    () => buildInsights(summary, forecast, lastTotal, lastMonth),
    [summary, forecast, lastTotal, lastMonth],
  );

  /**
   * Cumulative actual spending day by day, then the projected line continuing
   * at the current daily rate. Both are drawn against the salary, so the point
   * where the projection crosses it is visible.
   */
  const chart = useMemo(() => {
    const byDay = new Map<number, number>();
    for (const e of summary.expenses) {
      const d = Number(e.date.slice(8, 10));
      byDay.set(d, (byDay.get(d) ?? 0) + e.amount);
    }
    const rows: Array<{ day: number; actual: number | null; projected: number | null }> = [];
    let running = 0;
    for (let d = 1; d <= summary.daysInMonth; d++) {
      if (d <= summary.daysElapsed) {
        running += byDay.get(d) ?? 0;
        rows.push({ day: d, actual: running / 100, projected: running / 100 });
      } else {
        const proj = summary.totalSpent + forecast.dailyRate * (d - summary.daysElapsed);
        rows.push({ day: d, actual: null, projected: proj / 100 });
      }
    }
    return rows;
  }, [summary, forecast]);

  if (state.expenses.length === 0 || state.salary === 0) {
    return (
      <Card>
        <EmptyState
          title="Not enough to forecast yet"
          body="A salary and at least one expense in the current month are needed before the forecast and the insights can be calculated. Load a sample case from the header to see them populated."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Daily rate so far"
          value={displayMoney(forecast.dailyRate)}
          sub={`${displayMoney(summary.totalSpent)} over ${forecast.daysElapsed} days`}
        />
        <Stat
          label="Expected rest of month"
          value={displayMoney(forecast.restOfMonth)}
          sub={`${forecast.daysRemaining} days left at the current rate`}
        />
        <Stat
          label="Projected month total"
          value={displayMoney(forecast.projectedTotal)}
          tone={forecast.projectedShort ? 'bad' : 'neutral'}
          sub={`Against a salary of ${displayMoney(summary.salary)}`}
        />
        <Stat
          label={forecast.projectedShort ? 'Projected short' : 'Projected left'}
          value={displayMoney(Math.abs(forecast.projectedRemaining))}
          tone={forecast.projectedShort ? 'bad' : 'good'}
          sub={
            forecast.projectedShort
              ? `Spending ${displayMoney(forecast.safeDailyBudget)} a day or less breaks even`
              : `Free to save or carry into ${monthLabel(addMonths(monthOf(state.today), 1))}`
          }
        />
      </div>

      <Card
        title={`Spending path through ${monthLabel(thisMonth)}`}
        subtitle="Solid to today, projected after it, against the salary line"
      >
        <div className="h-[280px] px-3 py-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14a184" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#14a184" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#5d6f69' }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(summary.daysInMonth / 10)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#5d6f69' }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v: number) => compactMoney(v * 100)}
              />
              <Tooltip
                formatter={(v: number, n: string) => [
                  displayMoney(v * 100),
                  n === 'actual' ? 'Spent' : 'Projected',
                ]}
                labelFormatter={(d: number) => `Day ${d}`}
                contentStyle={tooltipStyle}
              />
              <ReferenceLine
                y={summary.salary / 100}
                stroke="#ef4444"
                strokeDasharray="5 4"
                label={{
                  value: `Salary ${compactMoney(summary.salary)}`,
                  fontSize: 11,
                  fill: '#ef4444',
                  position: 'insideTopRight',
                }}
              />
              <Area
                type="monotone"
                dataKey="projected"
                stroke="#94a3b8"
                strokeDasharray="5 4"
                strokeWidth={2}
                fill="none"
                connectNulls
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#0b7a66"
                strokeWidth={2.5}
                fill="url(#actualFill)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* The method, in the open. */}
        <div className="border-t border-[var(--border)] bg-slate-50/60 px-5 py-4">
          <p className="text-[12px] font-semibold tracking-wide text-[var(--muted)] uppercase">
            How the forecast is calculated
          </p>
          <p className="tabular mt-1.5 text-[13px] leading-relaxed text-ink-800">
            Daily rate = {displayMoney(summary.totalSpent)} spent ÷ {forecast.daysElapsed} days elapsed
            {' '}= <strong>{displayMoney(forecast.dailyRate)}</strong> a day.
            <br />
            Rest of month = {displayMoney(forecast.dailyRate)} × {forecast.daysRemaining} days remaining
            {' '}= <strong>{displayMoney(forecast.restOfMonth)}</strong>.
            <br />
            Projected total = {displayMoney(summary.totalSpent)} + {displayMoney(forecast.restOfMonth)}
            {' '}= <strong>{displayMoney(forecast.projectedTotal)}</strong>.
            <br />
            Projected {forecast.projectedShort ? 'shortfall' : 'money left'} ={' '}
            {displayMoney(summary.salary)} − {displayMoney(forecast.projectedTotal)} ={' '}
            <strong className={forecast.projectedShort ? 'text-rose-600' : 'text-emerald-700'}>
              {displayMoney(forecast.projectedRemaining)}
            </strong>
            .
          </p>
        </div>
      </Card>

      <Card
        title="What the numbers say"
        subtitle={`${insights.length} insights, each drawn from your own figures and ordered by how much money is involved`}
      >
        <ul className="divide-y divide-[var(--border)]">
          {insights.map((ins) => (
            <InsightRow key={ins.id} insight={ins} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const tones = {
    critical: { badge: 'bad', label: 'act now', bar: 'bg-rose-500' },
    warning: { badge: 'warn', label: 'watch', bar: 'bg-amber-500' },
    positive: { badge: 'good', label: 'good', bar: 'bg-emerald-500' },
    neutral: { badge: 'neutral', label: 'note', bar: 'bg-slate-300' },
  } as const;
  const t = tones[insight.tone];

  return (
    <li className="flex gap-3 px-5 py-4">
      <span className={`mt-1 w-1 shrink-0 rounded-full ${t.bar}`} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[14px] font-semibold text-ink-900">{insight.title}</h3>
          <Badge tone={t.badge}>{t.label}</Badge>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{insight.body}</p>
      </div>
    </li>
  );
}
