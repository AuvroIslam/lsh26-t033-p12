import type { Paisa } from './money';

/** The ten categories used by the published fixture, plus a fallback. */
export const CATEGORIES = [
  'Rent',
  'Groceries',
  'Food',
  'Transport',
  'Utilities',
  'Mobile',
  'Health',
  'Education',
  'Entertainment',
  'Clothing',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  category: Category;
  shop: string;
  amount: Paisa;
  /** Where this row came from — shown in the audit trail. */
  source: 'fixture' | 'manual' | 'receipt';
  /** Set when the row was created from a receipt photo. */
  receipt?: ReceiptRecord;
  createdAt: string;
}

/** What the OCR pass read, kept so the user's correction stays auditable. */
export interface ReceiptRecord {
  /** Full raw text returned by the OCR engine. */
  rawText: string;
  /** What the parser proposed, before the user touched it. */
  parsed: {
    amount: Paisa | null;
    date: string | null;
    shop: string | null;
  };
  /** Per-field confidence from the parser, 0..1. */
  confidence: {
    amount: number;
    date: number;
    shop: number;
  };
  /** Which fields the user changed before saving. */
  correctedFields: string[];
  /** Data URL of the uploaded image thumbnail. */
  imageDataUrl?: string;
}

export interface Pocket {
  id: string;
  name: string;
  /** Free-text item details, e.g. "MacBook Air M4". */
  item: string;
  target: Paisa;
  monthlyContribution: Paisa;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  kind:
    | 'salary_set'
    | 'expense_added'
    | 'expense_deleted'
    | 'receipt_corrected'
    | 'pocket_added'
    | 'pocket_deleted'
    | 'case_loaded'
    | 'reset';
  summary: string;
}

/** The whole ledger, as persisted. */
export interface LedgerState {
  salary: Paisa;
  expenses: Expense[];
  pockets: Pocket[];
  dpsAnnualRatePercent: number;
  /**
   * The date the app treats as "today".
   *
   * The fixture's cases are dated in 2026 and each one carries its own `today`,
   * so the forecast must run against that date rather than the system clock,
   * or every projection would be wrong when a judge loads a case.
   */
  today: string;
  /** Which fixture case is loaded, if any. */
  caseId: string | null;
  audit: AuditEntry[];
}
