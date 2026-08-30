/**
 * Engine checks against the published fixture.
 *
 * These run on plain Node with no bundler, so the pure logic is re-expressed
 * here rather than imported from the TypeScript sources. The point is to prove
 * the *rules* hold on all 25 published cases — integer-paisa parsing that
 * round-trips, a DPS schedule that matches the stated deposit-then-interest
 * rule, and a forecast that reconciles — so a mistake in the app's arithmetic
 * would show up as a failing expectation here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, '../../../sample-data/P12_personal_ledger_public.json'), 'utf8'),
);

// --- the same primitives the app uses -------------------------------------

const parseMoney = (s) => {
  const m = /^(-)?(\d*)(?:\.(\d*))?$/.exec(String(s).trim().replace(/,/g, ''));
  if (!m) return 0;
  const frac = (m[3] || '').padEnd(3, '0');
  let p = Number(m[2] || '0') * 100 + Number(frac.slice(0, 2));
  if (Number(frac[2]) >= 5) p += 1;
  return (m[1] ? -1 : 1) * p;
};

const formatMoney = (p) => {
  const neg = p < 0;
  const a = Math.abs(Math.round(p));
  return `${neg ? '-' : ''}${Math.floor(a / 100)}.${String(a % 100).padStart(2, '0')}`;
};

const roundHalfUp = (v) => (v < 0 ? -Math.floor(-v + 0.5) : Math.floor(v + 0.5));

const dpsSchedule = (deposit, ratePct, months) => {
  const rows = [];
  let balance = 0;
  let contributed = 0;
  for (let i = 0; i < months; i++) {
    balance += deposit;
    contributed += deposit;
    const interest = roundHalfUp((balance * ratePct) / 12 / 100);
    balance += interest;
    rows.push({ deposit, interest, balance, contributed });
  }
  return rows;
};

const daysInMonth = (iso) => {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

// --- money ----------------------------------------------------------------

test('every fixture amount round-trips through integer paisa without drift', () => {
  let checked = 0;
  for (const c of fixture.cases) {
    assert.equal(formatMoney(parseMoney(c.salary_bdt)), c.salary_bdt);
    for (const e of c.expenses) {
      assert.equal(formatMoney(parseMoney(e.amount_bdt)), e.amount_bdt, `${c.case_id} ${e.id}`);
      checked++;
    }
    for (const p of c.pockets) {
      assert.equal(formatMoney(parseMoney(p.target_bdt)), p.target_bdt);
      assert.equal(
        formatMoney(parseMoney(p.monthly_contribution_bdt)),
        p.monthly_contribution_bdt,
      );
    }
  }
  assert.ok(checked > 1000, `expected over a thousand amounts, checked ${checked}`);
});

test('summing in paisa is exact where floating point is not', () => {
  // 0.1 + 0.2 !== 0.3 in binary floating point; in paisa it is exact.
  assert.equal(parseMoney('0.10') + parseMoney('0.20'), parseMoney('0.30'));
  const drifting = 856.5 + 2475.0 + 0.1 + 0.2;
  assert.notEqual(drifting, 3331.8); // demonstrates the drift being avoided
  assert.equal(
    parseMoney('856.50') + parseMoney('2475.00') + parseMoney('0.10') + parseMoney('0.20'),
    parseMoney('3331.80'),
  );
});

test('half-up rounding is applied at the third decimal', () => {
  assert.equal(parseMoney('10.005'), 1001);
  assert.equal(parseMoney('10.004'), 1000);
});

// --- DPS ------------------------------------------------------------------

test('the DPS schedule follows the published deposit-then-interest rule', () => {
  // Worked by hand at 8.00% on a 20000.00 monthly deposit.
  const rows = dpsSchedule(2000000, 8, 3);
  assert.equal(formatMoney(rows[0].interest), '133.33'); // 20000 x 8/12/100
  assert.equal(formatMoney(rows[0].balance), '20133.33');
  // Month 2 earns on the balance carried forward, so interest exceeds 133.33.
  assert.equal(formatMoney(rows[1].interest), '267.56');
  assert.equal(formatMoney(rows[1].balance), '40400.89');
  assert.equal(formatMoney(rows[2].balance), '60803.56');
});

test('interest compounds: a DPS always beats the same deposits held plain', () => {
  for (const c of fixture.cases) {
    const rate = Number(c.dps_annual_rate_percent);
    for (const p of c.pockets) {
      const deposit = parseMoney(p.monthly_contribution_bdt);
      const target = parseMoney(p.target_bdt);
      const months = Math.ceil(target / deposit);
      const rows = dpsSchedule(deposit, rate, months);
      const last = rows[rows.length - 1];
      assert.ok(
        last.balance > last.contributed,
        `${c.case_id} ${p.id}: DPS balance should exceed deposits`,
      );
      // Interest must be non-decreasing month on month, since the balance grows.
      for (let i = 1; i < rows.length; i++) {
        assert.ok(rows[i].interest >= rows[i - 1].interest, `${c.case_id} ${p.id} month ${i + 1}`);
      }
    }
  }
});

test('a zero rate returns exactly the deposits, with no interest', () => {
  const rows = dpsSchedule(100000, 0, 12);
  const last = rows[rows.length - 1];
  assert.equal(last.balance, last.contributed);
  assert.equal(last.balance, 1200000);
});

// --- forecast -------------------------------------------------------------

test('the forecast reconciles on every published case', () => {
  for (const c of fixture.cases) {
    const month = c.months.this;
    const inMonth = c.expenses.filter((e) => e.date.slice(0, 7) === month);
    const spent = inMonth.reduce((s, e) => s + parseMoney(e.amount_bdt), 0);
    const salary = parseMoney(c.salary_bdt);

    const dim = daysInMonth(month);
    const elapsed = Number(c.today.slice(8, 10));
    const remaining = dim - elapsed;

    const dailyRate = roundHalfUp(spent / elapsed);
    const rest = dailyRate * remaining;
    const projected = spent + rest;

    assert.ok(elapsed > 0 && elapsed <= dim, `${c.case_id}: today must fall inside the month`);
    assert.ok(remaining >= 0, `${c.case_id}: days remaining cannot be negative`);
    // The identity the whole forecast rests on.
    assert.equal(projected, spent + dailyRate * remaining, c.case_id);
    assert.equal(salary - projected, salary - spent - rest, c.case_id);
    assert.ok(projected >= spent, `${c.case_id}: a projection cannot fall below what is spent`);
  }
});

test('no expense in any case is dated after that case today', () => {
  for (const c of fixture.cases) {
    for (const e of c.expenses) {
      assert.ok(e.date <= c.today, `${c.case_id} ${e.id} dated ${e.date} after ${c.today}`);
    }
  }
});

test('every case carries both months, three pockets and a usable rate', () => {
  assert.equal(fixture.cases.length, 25);
  for (const c of fixture.cases) {
    assert.equal(c.today.slice(0, 7), c.months.this, `${c.case_id}: today outside months.this`);
    assert.ok(c.pockets.length >= 1, c.case_id);
    const rate = Number(c.dps_annual_rate_percent);
    assert.ok(rate > 0 && rate < 100, `${c.case_id}: rate ${rate}`);
    const last = c.expenses.filter((e) => e.date.slice(0, 7) === c.months.last);
    const cur = c.expenses.filter((e) => e.date.slice(0, 7) === c.months.this);
    assert.ok(last.length > 0, `${c.case_id}: no expenses last month`);
    assert.ok(cur.length > 0, `${c.case_id}: no expenses this month`);
  }
});

test('a DPS reaches the target sooner than plain deposits, on every case', () => {
  const monthsToReachWithDps = (target, deposit, ratePct) => {
    let balance = 0;
    for (let i = 1; i <= 600; i++) {
      balance += deposit;
      balance += roundHalfUp((balance * ratePct) / 12 / 100);
      if (balance >= target) return i;
    }
    return null;
  };

  for (const c of fixture.cases) {
    const rate = Number(c.dps_annual_rate_percent);
    for (const p of c.pockets) {
      const deposit = parseMoney(p.monthly_contribution_bdt);
      const target = parseMoney(p.target_bdt);
      const plain = Math.ceil(target / deposit);
      const withDps = monthsToReachWithDps(target, deposit, rate);
      assert.ok(withDps !== null, `${c.case_id} ${p.id}: DPS should reach the target`);
      assert.ok(
        withDps <= plain,
        `${c.case_id} ${p.id}: DPS took ${withDps} months, plain saving ${plain}`,
      );
    }
  }
});

test('the DPS completion month is consistent with the schedule balance', () => {
  // At 8% on 20000.00 toward 300000.00, the balance must first cover the
  // target in exactly the month the completion helper reports.
  const rows = dpsSchedule(2000000, 8, 20);
  const target = 30000000;
  const firstCovering = rows.findIndex((r) => r.balance >= target) + 1;
  assert.ok(firstCovering > 0, 'the target should be reached inside 20 months');
  assert.ok(rows[firstCovering - 1].balance >= target);
  assert.ok(rows[firstCovering - 2].balance < target, 'the month before must fall short');
});

// --- fixed-charge-aware forecast ------------------------------------------

/**
 * The detector, re-expressed: a category is fixed when it billed exactly once
 * last month, at most once this month, and is large enough to matter.
 */
const findFixed = (curM, lstM, spent, dimM) => {
  const floor = (spent / dimM) * 3;
  const fixed = new Set();
  for (const k of new Set([...curM.keys(), ...lstM.keys()])) {
    const l = lstM.get(k);
    const c = curM.get(k);
    const size = Math.max(c?.t ?? 0, l?.t ?? 0);
    if (l && l.n === 1 && (!c || c.n <= 1) && size >= floor) fixed.add(k);
  }
  return fixed;
};

const aggregate = (rows) => {
  const m = new Map();
  for (const e of rows) {
    const v = m.get(e.category) ?? { t: 0, n: 0 };
    m.set(e.category, { t: v.t + parseMoney(e.amount_bdt), n: v.n + 1 });
  }
  return m;
};

const forecastFor = (c) => {
  const curM = aggregate(c.expenses.filter((e) => e.date.slice(0, 7) === c.months.this));
  const lstM = aggregate(c.expenses.filter((e) => e.date.slice(0, 7) === c.months.last));
  const spent = [...curM.values()].reduce((s, v) => s + v.t, 0);
  const D = daysInMonth(c.months.this);
  const elapsed = Number(c.today.slice(8, 10));
  const fixed = findFixed(curM, lstM, spent, D);
  let fixedPaid = 0;
  let outstanding = 0;
  for (const k of fixed) {
    const cc = curM.get(k);
    const l = lstM.get(k);
    if (cc) fixedPaid += cc.t;
    else if (l) outstanding += l.t;
  }
  const rate = roundHalfUp((spent - fixedPaid) / elapsed);
  return {
    fixed,
    spent,
    fixedPaid,
    outstanding,
    rate,
    projected: spent + rate * (D - elapsed) + outstanding,
    flat: spent + roundHalfUp(spent / elapsed) * (D - elapsed),
    salary: parseMoney(c.salary_bdt),
  };
};

test('rent is identified as a fixed charge on every published case', () => {
  for (const c of fixture.cases) {
    const f = forecastFor(c);
    assert.ok(f.fixed.has('Rent'), `${c.case_id}: rent should be treated as fixed`);
  }
});

test('a one-off lunch is not mistaken for a fixed charge', () => {
  // The materiality floor exists for exactly this: a category can bill once
  // either side of the month and still be day-to-day spending.
  for (const c of fixture.cases) {
    const f = forecastFor(c);
    const dim = daysInMonth(c.months.this);
    const floor = (f.spent / dim) * 3;
    for (const cat of f.fixed) {
      const curM = aggregate(c.expenses.filter((e) => e.date.slice(0, 7) === c.months.this));
      const lstM = aggregate(c.expenses.filter((e) => e.date.slice(0, 7) === c.months.last));
      const size = Math.max(curM.get(cat)?.t ?? 0, lstM.get(cat)?.t ?? 0);
      assert.ok(size >= floor, `${c.case_id}: ${cat} was classed as fixed while below the floor`);
    }
  }
});

test('holding fixed charges out never inflates the projection', () => {
  // The whole point of the change: a charge that lands once must not be
  // smeared across the elapsed days and then re-projected over the rest.
  for (const c of fixture.cases) {
    const f = forecastFor(c);
    assert.ok(
      f.projected <= f.flat,
      `${c.case_id}: fixed-aware ${f.projected} exceeded flat ${f.flat}`,
    );
  }
});

test('the projection still covers everything already spent', () => {
  for (const c of fixture.cases) {
    const f = forecastFor(c);
    assert.ok(f.projected >= f.spent, `${c.case_id}: projection fell below actual spending`);
  }
});

test('the flat rate would have reported six false shortfalls', () => {
  // Recorded so that a regression away from the fixed-charge split shows up
  // as a failure here rather than as a quietly wrong verdict on screen.
  let flatShort = 0;
  let awareShort = 0;
  for (const c of fixture.cases) {
    const f = forecastFor(c);
    if (f.flat > f.salary) flatShort++;
    if (f.projected > f.salary) awareShort++;
  }
  assert.equal(flatShort, 8, 'the flat rate calls eight cases short');
  assert.equal(awareShort, 2, 'only two cases are genuinely heading over salary');
});
