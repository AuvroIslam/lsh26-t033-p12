/**
 * Loading the published fixture.
 *
 * `sample-data/P12_personal_ledger_public.json` ships 25 cases. Each carries
 * its own `today`, salary, two months of expenses, three pockets and a DPS
 * rate, so loading a case replaces the whole ledger rather than merging into
 * it — that is what makes a judge's run reproducible.
 */
import { parseMoney } from '../lib/money';
import type { Category, Expense, LedgerState, Pocket } from '../lib/types';
import { CATEGORIES } from '../lib/types';

export interface FixtureCase {
  case_id: string;
  today: string;
  months: { last: string; this: string };
  salary_bdt: string;
  expenses: Array<{
    id: string;
    date: string;
    category: string;
    shop: string;
    amount_bdt: string;
  }>;
  pockets: Array<{
    id: string;
    name: string;
    item: string;
    target_bdt: string;
    monthly_contribution_bdt: string;
  }>;
  dps_annual_rate_percent: string;
  dps_rule: string;
}

export interface FixtureFile {
  schema_version: string;
  problem_id: string;
  format_note: string;
  cases: FixtureCase[];
}

function toCategory(raw: string): Category {
  return (CATEGORIES as readonly string[]).includes(raw) ? (raw as Category) : 'Other';
}

/** Convert one fixture case into the ledger the app runs on. */
export function caseToLedger(c: FixtureCase): LedgerState {
  const expenses: Expense[] = c.expenses.map((e) => ({
    id: e.id,
    date: e.date,
    category: toCategory(e.category),
    shop: e.shop,
    amount: parseMoney(e.amount_bdt),
    source: 'fixture',
    createdAt: new Date().toISOString(),
  }));

  const pockets: Pocket[] = c.pockets.map((p) => ({
    id: p.id,
    name: p.name,
    item: p.item,
    target: parseMoney(p.target_bdt),
    monthlyContribution: parseMoney(p.monthly_contribution_bdt),
    createdAt: new Date().toISOString(),
  }));

  return {
    salary: parseMoney(c.salary_bdt),
    expenses,
    pockets,
    dpsAnnualRatePercent: Number(c.dps_annual_rate_percent),
    today: c.today,
    caseId: c.case_id,
    audit: [
      {
        id: `audit-${Date.now()}`,
        at: new Date().toISOString(),
        kind: 'case_loaded',
        summary:
          `Loaded fixture case ${c.case_id}: salary ${c.salary_bdt} BDT, ` +
          `${c.expenses.length} expenses across ${c.months.last} and ${c.months.this}, ` +
          `${c.pockets.length} pockets, DPS ${c.dps_annual_rate_percent}% a year.`,
      },
    ],
  };
}

let cached: FixtureFile | null = null;

/** Fetch and cache the fixture. It is served as a static asset. */
export async function loadFixture(): Promise<FixtureFile> {
  if (cached) return cached;
  const res = await fetch(`${import.meta.env.BASE_URL}P12_personal_ledger_public.json`);
  if (!res.ok) throw new Error(`Could not load the sample data (HTTP ${res.status}).`);
  cached = (await res.json()) as FixtureFile;
  return cached;
}
