/**
 * R4 — savings pockets.
 *
 * Each pocket carries a name, the item it is for, a target and a monthly
 * contribution. Against that the screen shows an expected completion date
 * derived from the forecast, and what a DPS at the stated rate would return
 * over the same period.
 *
 * The completion date is deliberately shown twice when the two differ: once at
 * the contribution the user planned, and once at what the forecast says is
 * actually free after this month's spending. Hiding that gap would make the
 * date look more certain than the numbers support.
 */
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Button, Card, EmptyState, Field, Input, Stat } from '../components/ui';
import { compactMoney, displayMoney, formatMoney, parseMoney } from '../lib/money';
import { monthLabel, monthLabelShort, monthOf } from '../lib/dates';
import { buildForecast, buildMonthSummary } from '../services/forecast.service';
import { projectPockets, type PocketProjection } from '../services/pocket.service';
import { useLedger } from '../store/ledger.store';
import { useToast } from '../components/Toast';
import { tooltipStyle } from './DashboardScreen';

export default function PocketsScreen() {
  const state = useLedger();
  const { addPocket, deletePocket, setDpsRate } = useLedger();
  const toast = useToast();
  const thisMonth = monthOf(state.today);

  const summary = useMemo(() => buildMonthSummary(state, thisMonth), [state, thisMonth]);
  const forecast = useMemo(() => buildForecast(summary), [summary]);
  const projections = useMemo(
    () => projectPockets(state.pockets, forecast, state.dpsAnnualRatePercent, state.today),
    [state.pockets, forecast, state.dpsAnnualRatePercent, state.today],
  );

  const [draft, setDraft] = useState({ name: '', item: '', target: '', monthly: '' });

  const onAdd = () => {
    const target = parseMoney(draft.target);
    const monthly = parseMoney(draft.monthly);
    if (!draft.name.trim() || target <= 0 || monthly <= 0) return;
    addPocket({
      name: draft.name.trim(),
      item: draft.item.trim(),
      target,
      monthlyContribution: monthly,
    });
    setDraft({ name: '', item: '', target: '', monthly: '' });
    toast.push({
      tone: 'good',
      title: `Pocket "${draft.name.trim()}" created`,
      body: `${displayMoney(target)} target at ${displayMoney(monthly)} a month.`,
    });
  };

  const totalCommitted = state.pockets.reduce((s, p) => s + p.monthlyContribution, 0);
  const surplus = forecast.projectedRemaining;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          accent="lilac"
          label="Pockets"
          value={String(state.pockets.length)}
          sub={`${displayMoney(state.pockets.reduce((s, p) => s + p.target, 0))} of targets in total`}
        />
        <Stat
          accent="peach"
          label="Committed monthly"
          value={displayMoney(totalCommitted)}
          sub="The sum of every monthly contribution"
        />
        <Stat
          accent={surplus >= 0 ? 'mint' : 'blush'}
          label="Forecast leaves"
          value={displayMoney(Math.abs(surplus))}
          tone={surplus >= 0 ? 'good' : 'bad'}
          sub={
            surplus >= 0
              ? `Free each month at the current spending rate`
              : `Projected shortfall — nothing is free to save this month`
          }
        />
        <Stat
          accent="butter"
          label="DPS rate"
          value={`${state.dpsAnnualRatePercent.toFixed(2)}% a year`}
          tone="brand"
          sub="Monthly compounding, deposit then interest"
        />
      </div>

      {/* Whether the plan is affordable at all, stated plainly. */}
      {state.pockets.length > 0 && (
        <div
          className={`rounded-2xl border px-5 py-4 ${
            totalCommitted <= surplus
              ? 'nb bg-mint'
              : 'nb bg-peach'
          }`}
        >
          <p className="text-[13px] leading-relaxed text-[var(--text)]">
            {totalCommitted <= surplus ? (
              <>
                Your pockets ask for <strong>{displayMoney(totalCommitted)}</strong> a month and the
                forecast leaves <strong>{displayMoney(surplus)}</strong> free, so every completion
                date below is fully funded.
              </>
            ) : surplus > 0 ? (
              <>
                Your pockets ask for <strong>{displayMoney(totalCommitted)}</strong> a month but the
                forecast only leaves <strong>{displayMoney(surplus)}</strong> free — a gap of{' '}
                <strong>{displayMoney(totalCommitted - surplus)}</strong>. Pockets are funded in
                order, so the dates below show both the planned pace and the pace the forecast
                actually supports.
              </>
            ) : (
              <>
                The forecast projects finishing {displayMoney(-surplus)} short this month, so no
                money is free for savings at the current spending rate. The planned dates below
                assume you find the contribution elsewhere.
              </>
            )}
          </p>
        </div>
      )}

      {state.pockets.length === 0 ? (
        <Card>
          <EmptyState
            title="No savings pockets yet"
            body="Create a pocket for something specific — a laptop, a trip, a deposit — and its completion date and DPS comparison will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {projections.map((p) => (
            <PocketCard
              key={p.pocket.id}
              projection={p}
              rate={state.dpsAnnualRatePercent}
              onDelete={() => {
                const gone = p.pocket;
                deletePocket(gone.id);
                toast.push({
                  tone: 'bad',
                  title: `Removed the "${gone.name}" pocket`,
                  body: `${displayMoney(gone.target)} target.`,
                  undo: () =>
                    addPocket({
                      name: gone.name,
                      item: gone.item,
                      target: gone.target,
                      monthlyContribution: gone.monthlyContribution,
                    }),
                });
              }}
            />
          ))}
        </div>
      )}

      <Card accent="mint" title="Create a savings pocket" subtitle="A target, and what you can put aside each month.">
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <Field label="Name">
            <Input
              placeholder="Laptop"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="Item details">
            <Input
              placeholder="MacBook Air M4"
              value={draft.item}
              onChange={(e) => setDraft({ ...draft, item: e.target.value })}
            />
          </Field>
          <Field label="Target (BDT)">
            <Input
              inputMode="decimal"
              placeholder="145000.00"
              value={draft.target}
              onChange={(e) => setDraft({ ...draft, target: e.target.value })}
            />
          </Field>
          <Field label="Monthly contribution (BDT)">
            <Input
              inputMode="decimal"
              placeholder="12000.00"
              value={draft.monthly}
              onChange={(e) => setDraft({ ...draft, monthly: e.target.value })}
            />
          </Field>
          <Button
            onClick={onAdd}
            disabled={!draft.name.trim() || parseMoney(draft.target) <= 0 || parseMoney(draft.monthly) <= 0}
          >
            Create pocket
          </Button>
        </div>
      </Card>

      <Card
        accent="butter"
        title="DPS rate"
        subtitle="The rate every DPS projection on this page is calculated at."
      >
        <div className="px-5 py-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Field label="Annual rate (%)">
                <Input
                  inputMode="decimal"
                  value={String(state.dpsAnnualRatePercent)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 0 && v <= 100) setDpsRate(v);
                  }}
                />
              </Field>
            </div>
            <p className="max-w-xl pb-2.5 text-[12px] leading-relaxed text-[var(--muted)]">
              Stated rate: <strong className="text-[var(--text)]">{state.dpsAnnualRatePercent.toFixed(2)}% a year</strong>,
              compounded monthly. Each month the deposit is added to the balance first, then interest of
              balance × rate ÷ 12 ÷ 100 is calculated, rounded half up to the paisa, and added — so
              later months earn interest on the interest already credited. This is the rule published
              with the sample data, and loading a case sets the rate it specifies.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PocketCard({
  projection: p,
  rate,
  onDelete,
}: {
  projection: PocketProjection;
  rate: number;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { pocket } = p;

  const chartData = p.dps.map((r) => ({
    month: monthLabelShort(r.month),
    dps: r.balance / 100,
    plain: r.contributedSoFar / 100,
  }));

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--edge)] px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-bold text-[var(--text)]">{pocket.name}</h2>
            {p.affordable ? (
              <Badge tone="good">funded by the forecast</Badge>
            ) : p.effectiveMonthly > 0 ? (
              <Badge tone="warn">partly funded</Badge>
            ) : (
              // Pockets are funded in order, so a later one can be left with
              // nothing even while the forecast still shows a surplus. Saying
              // only "not funded" would read as a contradiction of the banner.
              <Badge tone="bad">earlier pockets take the surplus</Badge>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            {pocket.item || 'No item details given'}
          </p>
        </div>
        <button onClick={onDelete} className="text-[12px] font-semibold text-blush-ink hover:underline">
          Remove
        </button>
      </div>

      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Target" value={displayMoney(pocket.target)} />
        <Figure label="Monthly contribution" value={displayMoney(pocket.monthlyContribution)} />
        <Figure
          label="Expected completion"
          value={p.completionMonth ? monthLabel(p.completionMonth) : 'Never at this rate'}
          sub={p.monthsToTarget ? `${p.monthsToTarget} monthly contributions` : undefined}
          tone="brand"
        />
        <Figure
          label={`Same money in a DPS at ${rate.toFixed(2)}%`}
          value={p.dpsCompletionMonth ? monthLabel(p.dpsCompletionMonth) : '—'}
          sub={
            p.dpsMonthsToTarget
              ? `Target reached in ${p.dpsMonthsToTarget} months` +
                (p.monthsSavedByDps && p.monthsSavedByDps > 0
                  ? `, ${p.monthsSavedByDps} sooner than saving alone`
                  : '')
              : undefined
          }
          tone="good"
        />
      </div>

      {/* Where the plan and the forecast disagree, both dates are shown. */}
      {!p.affordable && (
        <div className="mx-5 mb-5 rounded-xl nb bg-peach px-4 py-3">
          <p className="text-[13px] leading-relaxed text-[var(--text)]">
            {p.effectiveMonthly > 0 ? (
              <>
                The forecast only leaves <strong>{displayMoney(p.effectiveMonthly)}</strong> a month for
                this pocket rather than the <strong>{displayMoney(pocket.monthlyContribution)}</strong>{' '}
                planned. At that pace it completes{' '}
                <strong>
                  {p.completionMonthAtForecastPace
                    ? monthLabel(p.completionMonthAtForecastPace)
                    : 'not within fifty years'}
                </strong>
                {p.monthsAtForecastPace && p.monthsToTarget
                  ? `, ${p.monthsAtForecastPace - p.monthsToTarget} months later than planned.`
                  : '.'}
              </>
            ) : (
              <>
                At the current spending rate the forecast leaves nothing for this pocket, so the
                completion date above assumes the {displayMoney(pocket.monthlyContribution)} comes from
                somewhere other than this month's salary.
              </>
            )}
          </p>
        </div>
      )}

      {p.dps.length > 0 && (
        <div className="border-t border-[var(--edge)]">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-[13px] font-semibold text-lilac-ink hover:bg-lav-50"
          >
            <span>
              {open ? 'Hide' : 'Show'} the month-by-month DPS schedule ({p.dps.length} months)
            </span>
            <span aria-hidden>{open ? '−' : '+'}</span>
          </button>

          {open && (
            <div className="px-5 pb-5">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,36,64,0.12)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#6b6285' }}
                      axisLine={false}
                      tickLine={false}
                      interval={Math.max(0, Math.floor(chartData.length / 8))}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b6285' }}
                      axisLine={false}
                      tickLine={false}
                      width={58}
                      tickFormatter={(v: number) => compactMoney(v * 100)}
                    />
                    <Tooltip
                      formatter={(v: number, n: string) => [
                        displayMoney(v * 100),
                        n === 'dps' ? 'DPS balance' : 'Deposits only',
                      ]}
                      contentStyle={tooltipStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="plain"
                      stroke="#8f87a5"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                    />
                    <Line type="monotone" dataKey="dps" stroke="#7b4fd4" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-[var(--edge)]">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-[var(--card-sunk)]">
                    <tr className="text-[10px] tracking-wide text-[var(--muted)] uppercase">
                      <th className="px-3 py-2 font-semibold">Month</th>
                      <th className="px-3 py-2 text-right font-semibold">Deposit</th>
                      <th className="px-3 py-2 text-right font-semibold">Interest</th>
                      <th className="px-3 py-2 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--edge)]/15">
                    {p.dps.map((r) => (
                      <tr key={r.monthIndex}>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <span className="text-[var(--muted)]">{r.monthIndex}.</span>{' '}
                          {monthLabelShort(r.month)}
                        </td>
                        <td className="tabular px-3 py-1.5 text-right">{displayMoney(r.deposit)}</td>
                        <td className="tabular px-3 py-1.5 text-right text-mint-ink">
                          {displayMoney(r.interest)}
                        </td>
                        <td className="tabular px-3 py-1.5 text-right font-semibold">
                          {displayMoney(r.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
                Putting {displayMoney(pocket.monthlyContribution)} a month into a DPS at{' '}
                {rate.toFixed(2)}% for the {p.dps.length} months this pocket takes would return{' '}
                <strong className="text-[var(--text)]">{displayMoney(p.dpsValueAtCompletion)}</strong> —{' '}
                {displayMoney(p.dpsInterest)} more than the {displayMoney(p.contributedAtCompletion)}{' '}
                deposited, against a target of {displayMoney(pocket.target)}.
                {p.dpsMonthsToTarget && p.monthsSavedByDps !== null && p.monthsSavedByDps > 0 && (
                  <>
                    {' '}
                    Because the interest compounds, a DPS covers the{' '}
                    {displayMoney(pocket.target)} target after only{' '}
                    <strong className="text-[var(--text)]">{p.dpsMonthsToTarget} months</strong> —{' '}
                    {p.monthsSavedByDps}{' '}
                    {p.monthsSavedByDps === 1 ? 'month' : 'months'} sooner than setting the same
                    amount aside without interest.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Figure({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'brand' | 'good';
}) {
  const tones = { neutral: 'text-[var(--text)]', brand: 'text-lilac-ink', good: 'text-mint-ink' };
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase">{label}</p>
      <p className={`tabular mt-1 text-[17px] leading-tight font-bold ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">{sub}</p>}
    </div>
  );
}
