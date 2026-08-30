import { useEffect, useState } from 'react';
import { Badge, Button } from './components/ui';
import { dateLabel, monthLabel, monthOf } from './lib/dates';
import { displayMoney } from './lib/money';
import { loadFixture, type FixtureCase } from './services/fixture.service';
import { useLedger } from './store/ledger.store';
import DashboardScreen from './screens/DashboardScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import ForecastScreen from './screens/ForecastScreen';
import PocketsScreen from './screens/PocketsScreen';

type Tab = 'dashboard' | 'expenses' | 'forecast' | 'pockets';

const TABS: Array<{ id: Tab; label: string; req: string }> = [
  { id: 'dashboard', label: 'Dashboard', req: 'R2' },
  { id: 'expenses', label: 'Expenses & receipts', req: 'R1' },
  { id: 'forecast', label: 'Forecast & insights', req: 'R3' },
  { id: 'pockets', label: 'Savings pockets', req: 'R4' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [cases, setCases] = useState<FixtureCase[]>([]);
  const [loadingCase, setLoadingCase] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { hydrated, hydrate, caseId, salary, today, expenses, loadCase, reset } = useLedger();

  useEffect(() => {
    hydrate();
    loadFixture()
      .then((f) => setCases(f.cases))
      .catch((e: Error) => setError(e.message));
  }, [hydrate]);

  const onPickCase = async (id: string) => {
    if (!id) return;
    setLoadingCase(true);
    setError(null);
    try {
      await loadCase(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingCase(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">
        Loading the ledger…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-[15px] font-black text-white">
                ৳
              </span>
              <div>
                <h1 className="text-[15px] leading-tight font-bold text-ink-900">
                  Personal Ledger Manager
                </h1>
                <p className="text-[12px] leading-tight text-[var(--muted)]">
                  LSH26-T033 · P12 · Team Logarithm
                </p>
              </div>
            </div>

            {/* Sample-data controls. A judge can load any of the 25 published
                cases and reset, without touching the console. */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={caseId ?? ''}
                onChange={(e) => void onPickCase(e.target.value)}
                disabled={loadingCase || cases.length === 0}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[13px] font-medium text-ink-900 outline-none focus:border-brand-400 disabled:opacity-50"
                aria-label="Load a published sample case"
              >
                <option value="">
                  {cases.length ? 'Load a sample case…' : 'Loading sample data…'}
                </option>
                {cases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id} — {c.today}, salary ৳{Number(c.salary_bdt).toLocaleString('en-US')}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={reset}>
                Clear ledger
              </Button>
            </div>
          </div>

          {/* Context strip: what the app currently treats as "today" and why. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--muted)]">
            {caseId ? (
              <Badge tone="brand">sample case {caseId}</Badge>
            ) : (
              <Badge tone="neutral">manual entry</Badge>
            )}
            <span>
              Today: <strong className="font-semibold text-ink-800">{dateLabel(today)}</strong>
            </span>
            <span>
              Month: <strong className="font-semibold text-ink-800">{monthLabel(monthOf(today))}</strong>
            </span>
            <span>
              Salary: <strong className="tabular font-semibold text-ink-800">{displayMoney(salary)}</strong>
            </span>
            <span>
              <strong className="tabular font-semibold text-ink-800">{expenses.length}</strong> expenses
            </span>
          </div>

          <nav className="mt-3 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                  tab === t.id
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-800 hover:bg-brand-50'
                }`}
              >
                {t.label}
                <span
                  className={`rounded px-1 py-px text-[10px] font-bold ${
                    tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-[var(--muted)]'
                  }`}
                >
                  {t.req}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error && (
          <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
            {error}
          </p>
        )}
        <div className="rise" key={tab}>
          {tab === 'dashboard' && <DashboardScreen />}
          {tab === 'expenses' && <ExpensesScreen />}
          {tab === 'forecast' && <ForecastScreen />}
          {tab === 'pockets' && <PocketsScreen />}
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-[12px] leading-relaxed text-[var(--muted)] sm:px-6">
        Amounts are held as integer paisa and shown in BDT. The forecast projects the
        current daily spending rate across the days left in the month; the DPS figures follow the
        deposit-then-interest rule stated in the published sample data.
      </footer>
    </div>
  );
}
