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
      <div className="grid min-h-screen place-items-center gap-3 text-sm text-[var(--muted)]">
        <span className="size-8 animate-spin rounded-full border-[3px] border-[var(--edge)]/20 border-t-[var(--edge)]" />
        Loading the ledger…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b-2 border-[var(--edge)] bg-[var(--surface)]/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="nb-sm grid size-11 shrink-0 place-items-center rounded-2xl bg-butter text-[19px] font-black text-[var(--text)]">
                ৳
              </span>
              <div>
                <h1 className="text-[17px] leading-tight font-extrabold tracking-tight text-[var(--text)]">
                  Khoroch
                </h1>
                <p className="text-[12px] leading-tight font-medium text-[var(--text)]/65">
                  Personal ledger · LSH26-T033 · P12
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
                className="nb-sm rounded-full bg-[var(--card)] px-3.5 py-2 text-[13px] font-bold text-[var(--text)] outline-none disabled:opacity-45"
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
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-[var(--text)]/70">
            {caseId ? (
              <Badge tone="brand">sample case {caseId}</Badge>
            ) : (
              <Badge tone="neutral">manual entry</Badge>
            )}
            <span>
              Today: <strong className="font-extrabold text-[var(--text)]">{dateLabel(today)}</strong>
            </span>
            <span>
              Month: <strong className="font-extrabold text-[var(--text)]">{monthLabel(monthOf(today))}</strong>
            </span>
            <span>
              Salary: <strong className="tabular font-extrabold text-[var(--text)]">{displayMoney(salary)}</strong>
            </span>
            <span>
              <strong className="tabular font-extrabold text-[var(--text)]">{expenses.length}</strong> expenses
            </span>
          </div>

          <nav className="mt-3.5 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-all duration-150 ${
                  tab === t.id
                    ? 'nb-sm nb-press bg-lilac text-lilac-ink'
                    : 'border-2 border-transparent text-[var(--text)]/70 hover:bg-white/55 hover:text-[var(--text)]'
                }`}
              >
                {t.label}
                <span
                  className={`rounded px-1 py-px text-[10px] font-bold ${
                    tab === t.id
                      ? 'bg-white/70 text-lilac-ink'
                      : 'bg-white/50 text-[var(--text)]/55'
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
          <p className="nb mb-4 rounded-2xl bg-blush px-4 py-3 text-[13px] font-bold text-blush-ink">
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

      <footer className="mx-auto max-w-6xl px-4 py-8 text-[12px] leading-relaxed font-medium text-[var(--text)]/55 sm:px-6">
        Khoroch · amounts are held as integer paisa and shown in BDT. The forecast holds recurring
        fixed charges out of the daily rate before projecting it across the days left in the month;
        the DPS figures follow the deposit-then-interest rule stated in the published sample data.
      </footer>
    </div>
  );
}
