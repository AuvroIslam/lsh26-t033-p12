/**
 * Date helpers.
 *
 * All dates are handled as plain YYYY-MM-DD strings and compared lexically.
 * Constructing a Date from "2026-04-17" parses as UTC while the browser renders
 * in local time, which silently shifts a day in negative-offset zones, so the
 * arithmetic below stays on strings and integers wherever it can.
 */

/** "2026-04-17" -> "2026-04" */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Days in the month of a "YYYY-MM" or "YYYY-MM-DD" string. */
export function daysInMonth(iso: string): number {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Day-of-month as an integer. */
export function dayOf(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

/** Previous month of a "YYYY-MM" string. */
export function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Add n months to a "YYYY-MM" string. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-04" -> "April 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** "2026-04" -> "Apr 2026" */
export function monthLabelShort(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}

/** "2026-04-17" -> "17 Apr 2026" */
export function dateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}

/** The last day of a month, as a full ISO date. */
export function endOfMonth(month: string): string {
  return `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
}

/** Today in the local timezone, as YYYY-MM-DD. Used only as a fallback. */
export function systemToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
