# Personal Ledger Manager

Solution for **LofiStack Hackathon 2026 — P12**

## Project information

- **Team:** `Logarithm`
- **Team ID:** `LSH26-T033`
- **Problem:** `P12 — Personal Ledger Manager`
- **Live application:** <!-- TODO: paste the deployed URL here before submitting -->
- **Demo video:** Optional link, maximum three minutes

> Judges will evaluate only the exact commit SHA entered in the Final Submission Form.

## Solution summary

A single-page web application that tracks a monthly salary against real spending. Expenses can be
typed in or read from a photograph of a bill, with the amount, date and shop shown for checking and
correction before anything is saved. From the entered figures it produces a monthly dashboard, a
forecast of where the month will end, written insights that cite the user's own categories and
amounts, and savings pockets whose completion dates come from that forecast alongside what a DPS at
a stated rate would return over the same period.

Everything runs in the browser. There is no account, no server and no API key, so a judge can open
the live URL, load any of the 25 published sample cases from the header, and exercise all four
requirements immediately.

## Requirements

| Requirement | Status | Where to verify |
| --- | --- | --- |
| R1 — Set a monthly salary; add expenses including by bill photo; show the amount, date and shop that were read and let every field be corrected before saving | Complete | **Expenses & receipts** tab. Salary at the top; *Add an expense from a receipt photo* runs OCR and opens the review panel showing the image, the raw text, and each field with a confidence badge and a note on how it was decided; *Add an expense by hand* is the manual path. Code: [`src/services/receipt.service.ts`](src/services/receipt.service.ts), [`src/screens/ExpensesScreen.tsx`](src/screens/ExpensesScreen.tsx) |
| R2 — Monthly dashboard: total spent against salary, breakdown by category, largest expenses, change vs last month | Complete | **Dashboard** tab: four summary figures, a salary consumption bar, a category donut with per-category share, the five largest single charges, and a month-on-month bar chart plus a full comparison table. Code: [`src/services/forecast.service.ts`](src/services/forecast.service.ts), [`src/screens/DashboardScreen.tsx`](src/screens/DashboardScreen.tsx) |
| R3 — Forecast and written insights from the actual numbers, with at least three insights naming specific categories and amounts | Complete | **Forecast & insights** tab: rest-of-month spend, projected month total, projected left or short, a spending-path chart against the salary line, the arithmetic shown in full under *How the forecast is calculated*, and eight ranked insights. Code: [`src/services/insight.service.ts`](src/services/insight.service.ts), [`src/screens/ForecastScreen.tsx`](src/screens/ForecastScreen.tsx) |
| R4 — Savings pockets with expected completion date from the forecast and the DPS return at a stated rate | Complete | **Savings pockets** tab: each pocket shows name, item details, target, monthly contribution, an expected completion month, whether the forecast can fund it, and an expandable month-by-month DPS schedule. The rate is stated on screen. Code: [`src/services/pocket.service.ts`](src/services/pocket.service.ts), [`src/screens/PocketsScreen.tsx`](src/screens/PocketsScreen.tsx) |

### R1 in detail — what was read, and correcting it

The requirement asks for the read to be *shown* and every field to be *correctable*. The review
panel therefore sits between reading and saving, and nothing reaches the ledger until it is
confirmed:

- the uploaded image beside the proposed values;
- the full raw OCR text, behind *Show the raw text that was read*;
- per field, a badge — **read clearly**, **please check** or **not found** — plus a note saying how
  the value was chosen ("read from the line containing 'total'", "day-first date (the first part is
  above 12)", "first line of the receipt");
- editable amount, date, shop and category;
- a line naming which fields were changed, which is stored with the expense and shown in the ledger
  as `receipt · 2 corrected` or `receipt · as read`.

The parser resolves the total against competing figures rather than taking the largest number: on
the worked example in the tests, a receipt with `Subtotal 1505.50`, `VAT 5% 75.28`, `TOTAL 1580.78`
and `Cash 2000.00` yields **1580.78**, because lines naming a subtotal, tax, cash tendered or change
are excluded. Ambiguous dates such as `05/04/2026` are read day-first, as is usual in Bangladesh,
but reported at lower confidence and flagged for confirmation rather than asserted.

## How to test the application

1. Open the live application.
2. In the header, choose a case from **Load a sample case…** — for example `PUB-01`. This replaces
   the ledger with that case's salary, expenses, pockets and DPS rate, and sets the date the app
   treats as "today" to the case's own `today` (the published cases are dated in 2026).
3. **Dashboard** — check the total against salary, the category breakdown, the five largest
   expenses and the comparison with the previous month.
4. **Forecast & insights** — the projection, the arithmetic behind it, and the written insights.
5. **Savings pockets** — completion dates and the DPS schedule; expand *Show the month-by-month DPS
   schedule* to see every deposit, the interest credited and the running balance.
6. **Expenses & receipts** — set a salary, add an expense by hand, and upload a photograph of a bill
   to exercise the reading and correction path.
7. **Clear ledger** in the header empties everything; re-selecting a case restores it. Nothing is
   stored anywhere but the browser, so a private window gives a clean start.

### Test or sample data

The published fixture is committed at [`sample-data/P12_personal_ledger_public.json`](sample-data/P12_personal_ledger_public.json)
(25 cases, `PUB-01`–`PUB-25`, schema 2.1) and served unmodified from `public/` so the app can load
it. A case supplies `today`, `months.last` / `months.this`, `salary_bdt`, 41–61 `expenses[]`,
`pockets[]`, `dps_annual_rate_percent` and `dps_rule`. All money values are decimal strings in BDT.

**DPS rule, applied verbatim from the fixture:** each month `balance = balance + deposit`, then
`interest = balance × rate / 12 / 100` rounded half up to the paisa and added to the balance, so
later months earn on accumulated interest.

Worked check at 8.00% on a 20,000.00 monthly deposit, which the tests pin:

| Month | Deposit | Interest | Balance |
| --- | ---: | ---: | ---: |
| 1 | 20,000.00 | 133.33 | 20,133.33 |
| 2 | 20,000.00 | 267.56 | 40,400.89 |
| 3 | 20,000.00 | 402.67 | 60,803.56 |

Month 2 earns 267.56 rather than 133.33 because the interest credited in month 1 is itself earning.

## Run locally

### Requirements

- Node.js 20 or newer, and npm.

### Setup

```bash
git clone https://github.com/AuvroIslam/lsh26-t033-p12.git
cd lsh26-t033-p12
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build        # type-check and produce dist/
npm run preview      # serve the production build
npm test             # 27 checks over the published fixture, the forecast and the receipt parser
```

There is nothing to configure. [`.env.example`](.env.example) exists only to record that the
application needs no environment variables: there is no API key, token or database URL, because
receipt reading runs in the browser and the ledger is held in `localStorage`.

**A judge can run and test everything without any paid account.** Receipt reading uses Tesseract.js,
which downloads its language data from a public CDN on first use and then runs locally; if that
fetch is unavailable, the review panel reports it and the *Add an expense by hand* form remains a
complete path to the same ledger.

## Problem-solving approach

The four required items are really two engines with a interface around them: a **forecast** that
turns spending so far into an expectation for the rest of the month, and a **DPS schedule** that
turns a monthly contribution into a balance over time. R2 is the forecast's inputs displayed, R3 is
its output explained, and R4 is the DPS engine fed by it. Both were therefore written as pure
functions with no React dependency, in [`src/services/`](src/services/), and tested directly against
the published fixture.

The forecast went through one significant revision. It began as a flat daily rate over all spending,
which is the obvious implementation and is wrong: rent lands once and early, so dividing it across
the days elapsed and re-projecting it over the days remaining charges it repeatedly. Measured across
the published cases, that inflated the projection by as much as ৳46,000 and reversed the surplus or
shortfall verdict on six of the twenty-five — the projection is the requirement's central output, so
a method that gets the sign wrong on a quarter of the sample is not a rounding concern. Fixed charges
are now identified from their billing shape and held out of the rate, and a regression test records
that the flat method called eight cases short where only two genuinely are.

The most important technical decision was to hold every amount as **integer paisa** rather than a
floating-point number of Taka. The fixture supplies decimal strings such as `856.50`, and the DPS
rule compounds monthly with half-up rounding at each step, so floating-point drift would show up in
exactly the figures a judge checks. `parseMoney` converts a decimal string to paisa, all arithmetic
is integer, and formatting happens only at the edge. A test asserts that every one of the 1,200-plus
amounts across all 25 cases round-trips back to its original string.

The second decision was that receipt reading must be *checkable* rather than confident. OCR on a
photograph is never reliable, so the parser returns a proposal, a per-field confidence and a note
explaining its reasoning, and the interface refuses to save until a person has seen it. That is also
why the total is chosen by excluding subtotal, tax, cash and change lines rather than by taking the
largest number — the naive approach reads `Cash 2000.00` instead of `TOTAL 1580.78`.

Testing was done in two layers: `npm test` runs 27 assertions over the pure logic and the whole
published fixture, and the application was driven in a real browser against a generated receipt
image to confirm the reading, review and saving path works end to end.

## Technology used

- **Frontend:** React 19, TypeScript 5, Vite 8, Tailwind CSS v4, Recharts 2, Zustand 5
- **Backend:** none — the application is entirely client-side
- **Database:** browser `localStorage`
- **Receipt reading:** Tesseract.js 5, running in the browser
- **Deployment:** Vercel (static build, configuration in [`vercel.json`](vercel.json))
- **Testing:** the Node.js built-in test runner

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence |
| --- | --- | --- | --- |
| Oitijya Islam Auvro | `AuvroIslam` | <!-- TODO: fill in before submitting --> | <!-- TODO --> |
| <!-- TODO: second member --> | <!-- TODO --> | <!-- TODO --> | <!-- TODO --> |

Commit count alone does not represent contribution.

## AI usage

- **Claude (Anthropic), via Claude Code** — used for repository scaffolding, implementation and
  review during the event window. Output was read by the team, checked against the published fixture
  with `npm test`, and exercised in a browser before being accepted.
- No vision model or hosted AI service is called at runtime. Receipt reading is Tesseract.js, a
  conventional OCR engine running locally in the browser.

## Major design decisions

- **Receipt reading is done in the browser with Tesseract.js, not a hosted vision API.** A cloud
  model would read more accurately, but it needs a key, and the rules forbid committing one — which
  would leave a judge unable to exercise the feature at all. The requirement's weight is on showing
  what was read and allowing correction, which this satisfies without any account.
- **Money is integer paisa throughout.** The fixture gives decimal strings and the DPS rule
  compounds with per-month rounding; floats would drift in the figures being marked.
- **The forecast separates recurring fixed charges from day-to-day spending.** A flat rate over
  everything divides rent across the days elapsed and then re-projects it over the days remaining,
  charging it two or three times over. On the published cases that inflated the projection by up to
  ৳46,000 and, on six of the twenty-five, reversed the answer to the question the requirement asks —
  reporting a shortfall for a month that ends in surplus. A category counts as fixed when it billed
  exactly once last month, at most once this month, and is worth at least three days of average
  spending; the test is made against the data rather than a hardcoded list of category names, so a
  hand-typed ledger behaves like a loaded sample case. The method stays reproducible by hand — two
  averages and an addition — and the arithmetic is printed on the Forecast screen.
- **"Today" comes from the loaded case, not the system clock.** The published cases are dated in
  2026; using the real date would put every expense in the past and make every forecast wrong.
- **No backend and no sign-in.** P12 is a single-person ledger with no sharing, so an account would
  add a wall between a judge and the four requirements without changing a single figure on screen.
- **Insights are generated from the data, not selected from a list of advice.** Each generator reads
  the month summary and returns nothing when the data does not support it, so no insight can appear
  without a real category and amount in it; candidates are ranked by how much money they concern.

## Known limitations

- The forecast recognises a recurring fixed charge from two months of history. A charge appearing
  for the first time this month cannot be distinguished from ordinary spending, so it is absorbed
  into the daily rate; a genuinely irregular large purchase will therefore still push the projection
  up. A fixed charge that billed last month but has not yet appeared is added once, at last month's
  amount, so a rent rise is not anticipated until it lands.
- OCR accuracy depends on the photograph. A skewed, blurred or low-contrast receipt may misread the
  amount or the date, which is why every field is editable and low-confidence fields are flagged.
  Handwritten receipts are generally not readable.
- Only English-language receipt layouts are parsed. Bengali total keywords are recognised, but
  Bengali OCR itself is not enabled, so a wholly Bengali receipt will need manual correction.
- Savings pockets are funded in the order they were created when the forecast surplus cannot cover
  every contribution. Reordering priorities is not implemented.
- The ledger lives in `localStorage` for one browser on one device. Clearing site data removes it,
  and it does not sync between devices.
- The dashboard covers the month containing "today" against the month before it, matching the two
  months the fixture supplies. Longer histories are not charted.

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
