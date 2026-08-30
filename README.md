# Personal Ledger Manager

Solution for **LofiStack Hackathon 2026 — P12**

## Project information

- **Team:** `Logarithm`
- **Team ID:** `LSH26-T033`
- **Problem:** `P12 — Personal Ledger Manager`
- **Live application:** <!-- TODO: deployed URL -->
- **Demo video:** Optional link, maximum three minutes

> Judges will evaluate only the exact commit SHA entered in the Final Submission Form.

## Solution summary

<!-- TODO: 2-4 sentences on what the app does and who it helps. -->

## Requirements

| Requirement | Status | Where to verify |
| --- | --- | --- |
| R1 — Set a monthly salary; add expenses including by uploading a bill photo; show the amount, date and shop that were read and let every field be corrected before saving | Not attempted | <!-- TODO --> |
| R2 — Monthly dashboard: total spent against salary, breakdown by category, largest expenses, change vs last month | Not attempted | <!-- TODO --> |
| R3 — Forecast and written insights from the actual numbers: rest-of-month spend, expected left or short at month end, and at least three insights naming specific categories and amounts | Not attempted | <!-- TODO --> |
| R4 — Savings pockets with name, target, item details and monthly contribution, each showing an expected completion date from the forecast and the DPS return at a stated rate | Not attempted | <!-- TODO --> |

## How to test the application

1. Open the live application.
2. <!-- TODO -->

### Test or sample data

The published fixture is committed at [`sample-data/P12_personal_ledger_public.json`](sample-data/P12_personal_ledger_public.json)
(25 cases, `PUB-01`–`PUB-25`, schema 2.1). A case supplies `today`, `months.last` / `months.this`,
`salary_bdt`, 41–61 `expenses[]`, `pockets[]`, `dps_annual_rate_percent` and `dps_rule`. All money
values are decimal strings in BDT.

**DPS rule, applied verbatim from the fixture:** each month `balance = balance + deposit`, then
`interest = balance × rate / 12 / 100` rounded half up to the paisa and added to the balance, so
later months earn on accumulated interest.

<!-- TODO: how to load a case, how to enter data by hand, how to reset. -->

## Run locally

### Requirements

- <!-- TODO: runtime and version -->

### Setup

```bash
git clone https://github.com/AuvroIslam/lsh26-t033-p12.git
cd lsh26-t033-p12
# TODO: install command
cp .env.example .env.local
# TODO: run command
```

Do not include real passwords, tokens or API keys. `.env.example` lists variable names only.

<!-- TODO: confirm a judge can run and test the app without a paid account — state the fallback
     if the receipt-reading service is unavailable (e.g. manual entry path). -->

## Problem-solving approach

<!-- TODO: how the team understood the problem; the chosen solution; the most important
     technical decision; how the solution was tested. -->

## Technology used

- **Frontend:** <!-- TODO -->
- **Backend:** <!-- TODO -->
- **Database:** <!-- TODO -->
- **Deployment:** <!-- TODO -->
- **Other material tools:** <!-- TODO -->

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence |
| --- | --- | --- | --- |
| Oitijya Islam Auvro | `AuvroIslam` | <!-- TODO --> | <!-- TODO --> |
| Md. Nafiz Ahmed | `Nafiz001` | <!-- TODO --> | <!-- TODO --> |
| Dewan Salman Rahman Zisan | `ripWr3ncH` | <!-- TODO --> | <!-- TODO --> |

Commit count alone does not represent contribution.

## AI usage

- **Claude (Anthropic), via Claude Code** — used for repository scaffolding, implementation and
  review during the event window. Output was read, tested against the published fixture and accepted
  by the team.
- <!-- TODO: if a vision model reads the receipt images at runtime, declare it here too. -->

## Major design decisions

- **Decision:** <!-- TODO: how receipt reading is done -->
- **Decision:** <!-- TODO: how the forecast is derived -->
- **Decision:** <!-- TODO: decimal money arithmetic and rounding -->

## Known limitations

- <!-- TODO -->

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
