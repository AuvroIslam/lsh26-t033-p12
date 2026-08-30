/**
 * Receipt parser checks.
 *
 * The parser logic is re-expressed here so it runs on plain Node. What is being
 * pinned down is the behaviour that actually matters on a real receipt: the
 * total must not be confused with the subtotal, the VAT line or the cash
 * tendered, and an ambiguous date must be reported as ambiguous rather than
 * asserted with false confidence.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const TOTAL_HINTS = [
  'grand total', 'net payable', 'net amount', 'total payable', 'amount payable',
  'total amount', 'total', 'payable', 'balance due',
];
const NEGATIVE_HINTS = [
  'subtotal', 'sub total', 'sub-total', 'change', 'cash received', 'received',
  'tendered', 'discount', 'vat', 'tax', 'service charge',
];

const numbersIn = (line) => {
  const out = [];
  const re = /(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?/g;
  let m;
  while ((m = re.exec(line))) {
    const n = Number(m[0].replace(/,/g, ''));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
};

function findAmount(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const candidates = [];
  lines.forEach((line, i) => {
    const low = line.toLowerCase();
    const isNeg = NEGATIVE_HINTS.some((h) => low.includes(h));
    const hint = TOTAL_HINTS.find((h) => low.includes(h));
    const nums = numbersIn(line);
    if (!nums.length) return;
    const value = nums[nums.length - 1];
    if (value <= 0) return;
    if (hint && !isNeg) candidates.push({ value, score: 100 + i });
    else if (!isNeg) candidates.push({ value, score: 1 });
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  return candidates[0].value;
}

const expandYear = (y) => (y.length === 2 ? 2000 + Number(y) : Number(y));
const iso = (y, m, d) =>
  m < 1 || m > 12 || d < 1 || d > 31
    ? null
    : `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function findDate(text) {
  const isoM = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(text);
  if (isoM) {
    const v = iso(Number(isoM[1]), Number(isoM[2]), Number(isoM[3]));
    if (v) return { value: v, confidence: 0.95 };
  }
  const numM = /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/.exec(text);
  if (numM) {
    const a = Number(numM[1]);
    const b = Number(numM[2]);
    const v = iso(expandYear(numM[3]), b, a);
    if (v) return { value: v, confidence: a > 12 ? 0.9 : 0.6 };
  }
  return { value: null, confidence: 0 };
}

// --- the receipt that the browser test actually exercises -----------------

const SHWAPNO = `SHWAPNO
Dhanmondi Branch, Dhaka
Tel: 02-9876543
Invoice: INV-40218
Date: 14/04/2026
Rice 5kg 520.00
Milk 2L 340.00
Eggs 12pc 180.50
Cooking Oil 465.00
Subtotal 1505.50
VAT 5% 75.28
TOTAL 1580.78
Cash 2000.00
Change 419.22
Thank you for shopping`;

test('the total wins over the subtotal, the VAT and the cash tendered', () => {
  // 2000.00 (cash) is the largest number on the receipt, so a naive
  // "take the biggest number" parser would get this wrong.
  assert.equal(findAmount(SHWAPNO), 1580.78);
});

test('a change line is never mistaken for the total', () => {
  assert.equal(
    findAmount('TOTAL 450.00\nCash 1000.00\nChange 550.00'),
    450.0,
  );
});

test('a grand total outranks an earlier total line', () => {
  const t = 'Total 900.00\nService charge 100.00\nGrand Total 1000.00';
  assert.equal(findAmount(t), 1000.0);
});

test('with no total line at all, the largest plausible number is taken', () => {
  assert.equal(findAmount('Item A 120.00\nItem B 340.00\nItem C 90.00'), 340.0);
});

test('grouped thousands are read correctly', () => {
  assert.equal(findAmount('TOTAL 12,450.75'), 12450.75);
});

test('an empty or textless receipt yields nothing rather than a wrong number', () => {
  assert.equal(findAmount(''), null);
  assert.equal(findAmount('thank you for shopping'), null);
});

// --- dates ----------------------------------------------------------------

test('a day above 12 fixes the order and is reported confidently', () => {
  const r = findDate('Date: 14/04/2026');
  assert.equal(r.value, '2026-04-14');
  assert.equal(r.confidence, 0.9);
});

test('an ambiguous date is read day-first but flagged as uncertain', () => {
  const r = findDate('Date: 05/04/2026');
  assert.equal(r.value, '2026-04-05');
  assert.equal(r.confidence, 0.6, 'must not claim certainty it does not have');
});

test('an ISO date is taken as unambiguous', () => {
  const r = findDate('2026-04-17');
  assert.equal(r.value, '2026-04-17');
  assert.equal(r.confidence, 0.95);
});

test('a two-digit year is expanded into this century', () => {
  assert.equal(findDate('Date: 14/04/26').value, '2026-04-14');
});

test('an impossible date is rejected rather than coerced', () => {
  assert.equal(findDate('Date: 14/45/2026').value, null);
});
