# Personal Ledger Manager — LSH26-T033 / P12

- **Team ID:** `LSH26-T033` (Logarithm)
- **Problem ID:** `P12` — Tier 02, Personal Ledger Manager
- **Live URL:** <!-- TODO: paste deployed URL before submitting -->
- **Repository:** `lsh26-t033-p12`

## Setup and run

<!-- TODO: fill in once the stack is committed -->

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # local development
npm run build                # production build
```

Requires Node 20+.

### Environment variables

| Name | Purpose |
|---|---|
| TODO | Receipt image reading (server-side only — never committed, never exposed to the browser) |

## Proof that each required item is met

| # | Required item | Where it lives | How to verify |
|---|---|---|---|
| 1 | Set a monthly salary; add expenses, including by uploading a photo of a bill; the amount, date and shop read from the image are shown for checking and every field is editable before saving | TODO | TODO |
| 2 | Monthly dashboard: total spent against salary, breakdown by category, largest expenses, change vs last month | TODO | TODO |
| 3 | Forecast and written insights from the actual numbers: expected spend for the rest of the month, expected left/short at month end, and at least three insights naming specific categories and amounts | TODO | TODO |
| 4 | Savings pockets (name, target, item details, monthly contribution) each showing an expected completion date from the forecast, and the DPS return over that time at a stated rate | TODO | TODO |

## Sample data

`sample-data/P12_personal_ledger_public.json` — 25 public cases (`PUB-01` … `PUB-25`), schema 2.1.
Each case carries `today`, `months.last` / `months.this`, `salary_bdt`, 41–61 `expenses[]`,
`pockets[]`, `dps_annual_rate_percent` and `dps_rule`. All money values are decimal strings in BDT.

**DPS rule, applied verbatim from the data:** each month, `balance = balance + deposit`, then
`interest = balance × rate / 12 / 100` rounded half-up to the paisa and added to the balance, so
later months earn on accumulated interest.

## Major decisions

<!-- TODO: how receipt reading is done, how the forecast is derived, money arithmetic (decimal, not float), rounding -->

## Known limitations

<!-- TODO -->

## Approach

<!-- TODO: a short statement of how the team approached the problem -->

## Team contributions

| Member | GitHub username | Major contribution |
|---|---|---|
| Oitijya Islam Auvro (lead) | TODO | TODO |
| TODO | TODO | TODO |

## Disclosures

- **Pre-event material:** none. See [EVENT.md](EVENT.md).
- **Third-party material:** see [LICENSES.md](LICENSES.md).
- **AI assistant use:** Claude (Anthropic) was used during the event for scaffolding, implementation
  and review. All work was directed, reviewed and accepted by the team.
- **No secrets are committed.** API keys are supplied as environment variables and, on the live
  deployment, as platform secrets.
