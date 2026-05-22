# Implementation Plan: Per-Cohort Fairness Dashboard

**Branch**: `010-per-cohort-fairness-dashboard` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-per-cohort-fairness-dashboard/spec.md`

## Summary

Add a `/admin/fairness` page to `demo/apps/admin/` that reads `ask_history`
and `content_safety_results`, broken down by `(country, language, sen_status,
gender)`, and red-flags disparities > 5 pp against the Responsible AI
Evaluator release gate. Export a deterministic CSV for Annex IV. Ship the
matching KQL workbook under `demo/observability/`. The feature is defensive:
keeps rubric category #7 at 5/5.

## Technical Context

**Language/Version**: Node.js 20 (Express) — existing admin app.

**Primary Dependencies**: Azure SQL Database (read-only on `ask_history`,
`content_safety_results`, `learners`); Application Insights (KQL workbook);
`_shared/` admin-scoped auth.

**Storage**: No new table. Queries are read-only; render-time aggregates.

**Testing**: Snapshot test on seed data, deterministic-CSV test, suppression
test (n < 10), disparity-banner test, KQL workbook query smoke.

**Target Platform**: Admin desktop browser (Chrome, Edge stable).

**Project Type**: Web application — additive page in the existing admin app.

**Performance Goals**: ≤ 2 s p95 render on ~10 k `ask_history` rows;
aggregates computed in-DB to avoid app-server fan-out.

**Constraints**: Aggregates only (FR-008); `n < 10` suppression (FR-005);
deterministic CSV (FR-006); EU-only data path inherited.

**Scale/Scope**: 1 new page; 1 new SQL view (or inline query); 1 KQL workbook.

## Constitution Check

| Principle | Gate | How this plan complies |
|-----------|------|------------------------|
| I. EU-resident, data-minimised | PASS | Aggregates only; pseudonymous axes. |
| II. GDPR Art. 8 children | PASS | No new collection; suppression at n < 10. |
| III. EU AI Act high-risk | PASS | Annex IV evidence stream; disparity surveillance. |
| IV. Teacher-in-the-loop | PASS | Feeds the release gate teachers depend on. |
| V. Pedagogical sign-off | N/A | Admin/RAI surface. |
| VI. Outcome-contract driven | PASS | Guards against improving outcome gap via disparate impact. |
| VII. Reproducible, spec-driven | PASS | KQL workbook + deterministic CSV. |

**EU AI Act articles touched**:

| Article | Surface affected | Evidence |
|---------|------------------|----------|
| Art. 9 — risk management | New monitoring surface for disparity risk; entry added to risk register. | `demo/compliance/risk-register.md` row "fairness-010". |
| Art. 10 — data governance | No new training data; aggregates only. | spec.md FR-008. |
| Art. 12 — record-keeping | CSV export carries `window_start`, `window_end`, `exported_at`. | `fairness-<yyyymmddHHmm>.csv`. |
| Art. 13 — transparency | Banner copy explicitly cites the RAI release gate threshold. | spec.md US2 Acceptance Scenario 1. |
| Art. 15 — robustness | Suppression at `n < 10`; deterministic export; KQL workbook reproduces numbers. | Tests + workbook. |

**DPIA delta**: **None.** No new personal-data category; suppression at
`n < 10` prevents re-identification. A one-line confirmation appended to
`demo/compliance/dpia-learnEU-v1.md`.

**Human-oversight surface**: The Responsible AI Evaluator consumes this
dashboard before every release; the red-flag banner is the trigger to halt or
investigate a release.

## Project Structure

### Documentation (this feature)

```text
specs/010-per-cohort-fairness-dashboard/
├── spec.md
├── plan.md                       # THIS FILE
├── checklists/
│   └── compliance.md
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/admin/
│   ├── routes/fairness.js                  # GET /admin/fairness
│   ├── services/fairness-aggregate.js      # in-DB aggregate + disparity
│   ├── services/csv-export.js              # deterministic CSV
│   ├── public/
│   │   ├── fairness.html
│   │   └── js/fairness.js                  # render + export button
│   └── views/partials/fairness-banner.ejs
│
├── observability/
│   └── fairness-workbook.kql               # Application Insights workbook
│
└── tests/
    ├── unit/fairness-disparity.test.ts
    ├── unit/fairness-csv-deterministic.test.ts
    └── integration/fairness-page.spec.ts
```

**Structure Decision**: Additive page in the existing admin app. No new
table. SQL aggregates run in-DB. KQL workbook lives alongside the page for
auditor reproducibility.

## Complexity Tracking

> No constitutional violations to justify. The `n < 10` suppression is the
> minimum-viable safeguard against re-identification; a configurable
> threshold was rejected to avoid accidental loosening across releases.
