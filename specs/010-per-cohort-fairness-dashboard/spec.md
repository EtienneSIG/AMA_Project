# Feature Specification: Per-Cohort Fairness Dashboard

**Feature Branch**: `010-per-cohort-fairness-dashboard`

**Created**: 2026-05-22

**Status**: Draft (Wave 2 of `Subject/ama-rubric-remediation-plan.md` — defensive,
keeps rubric category #7 at 5/5).

**Input**: User description: "Extend the admin app with a per-cohort fairness
dashboard that reads `ask_history` and `content_safety_results`, broken down by
Country / Language / SEN status / Gender. Surface disparities > 5 pp against
the Responsible AI Evaluator release gate. Export a CSV for the EU AI Act
Annex IV technical file."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cohort breakdown view (Priority: P1)

The Responsible AI Evaluator opens the admin app and sees, on a single page,
the acceptance rate, Content Safety violation rate and override rate for each
cohort, computed over a configurable time window (default = last 30 days).

**Why this priority**: Without the breakdown there is no signal. This is the
MVP and the rubric-defensive minimum.

**Independent Test**: Sign in as an admin reviewer, open
`/admin/fairness`, select the default window, and see one row per cohort with
the three metrics populated from seed data.

**Acceptance Scenarios**:

1. **Given** seed data containing learners in NL, DE, PL with mixed SEN
   flags, **When** the reviewer opens `/admin/fairness`, **Then** they see
   one row per `(country, language, sen_status, gender)` cohort.
2. **Given** an empty cohort (no records), **When** the page renders,
   **Then** the cohort is shown with `n=0` and metrics blanked, not hidden.

---

### User Story 2 — Disparity red-flag (Priority: P2)

The dashboard computes `disparity = max − min` per metric across cohorts. Any
disparity > 5 percentage points is highlighted in red and accompanied by a
short explanation referencing the Responsible AI Evaluator release gate.

**Why this priority**: This is the actionable signal that triggers a
release-gate review.

**Independent Test**: Inject seed data so one cohort's override rate is
12 pp above another; verify the row is highlighted and the disparity
banner appears with the correct value.

**Acceptance Scenarios**:

1. **Given** a 12 pp override-rate disparity between two cohorts, **When**
   the page renders, **Then** the two rows are highlighted and a banner
   reads *"Override-rate disparity 12 pp > 5 pp release gate (RAI)"*.
2. **Given** all disparities are ≤ 5 pp, **When** the page renders,
   **Then** no banner is shown and rows render in default style.

---

### User Story 3 — Annex IV CSV export (Priority: P3)

The reviewer exports the current view as a CSV for inclusion in the EU AI Act
Annex IV technical file. The CSV contains cohort identifiers, metric values,
sample size, time window, and the run timestamp.

**Why this priority**: Auditability — Annex IV requires reproducible
evidence per release.

**Independent Test**: Click **Export CSV**, open the file in Excel, verify
the columns and that the run timestamp matches the page render.

**Acceptance Scenarios**:

1. **Given** the current view, **When** the reviewer clicks **Export CSV**,
   **Then** the browser downloads `fairness-<yyyymmddHHmm>.csv` containing
   `country,language,sen_status,gender,n,acceptance_rate,cs_violation_rate,override_rate,window_start,window_end,exported_at`.
2. **Given** the same view exported twice, **When** the files are compared,
   **Then** metric values are identical (deterministic export).

### Edge Cases

- A cohort whose `n < 10` is rendered with metrics blanked (statistical
  minimum) and a tooltip explaining the suppression. Disparity calculation
  ignores suppressed cohorts.
- The dashboard MUST refuse to render any individual-level data; cohort
  aggregates only.
- Timezone: all timestamps in UTC; display formatted in the reviewer's
  locale.
- The same workbook MUST be reproducible from a saved KQL query in
  `demo/observability/`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST live at `/admin/fairness` inside
  `demo/apps/admin/`, gated by the existing admin-scoped auth middleware.
- **FR-002**: Cohort axes MUST be: `country`, `language`, `sen_status`
  (boolean), `gender`. (Gender values follow the constitution's
  data-minimisation rules — see assumption A1.)
- **FR-003**: Metrics MUST include `acceptance_rate`,
  `content_safety_violation_rate`, `override_rate`, each computed over a
  configurable time window (default 30 days).
- **FR-004**: Disparity `max − min` MUST be computed per metric; rows
  involved in any disparity > 5 pp MUST be highlighted with a banner
  referencing the RAI release gate.
- **FR-005**: Cohorts with `n < 10` MUST be suppressed (metrics blanked)
  and excluded from disparity computation; suppression MUST be visible.
- **FR-006**: The dashboard MUST export a deterministic CSV with the
  columns enumerated in US3 Acceptance Scenario 1.
- **FR-007**: A KQL workbook reproducing the same numbers MUST live under
  `demo/observability/fairness-workbook.kql`.
- **FR-008**: The page MUST NEVER expose individual learner data; only
  aggregates appear in the DOM and in the CSV.
- **FR-009**: All visible copy MUST be in EN (admin surface, no learner
  audience) and reviewed for clarity by the RAI Evaluator.

### Key Entities

- **AskHistory**: existing — read source for acceptance and override rates.
- **ContentSafetyResults**: existing — read source for violation rate.
- **Learner.cohort**: pseudonymous axes (country, language, sen_status,
  gender); read-only here.
- **FairnessSnapshot**: in-memory record per render (`window_start`,
  `window_end`, `rows`, `disparities`, `exported_at?`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Seed data contains ≥ 4 cohorts with non-zero `n`; the
  dashboard renders ≥ 4 rows with valid metrics on first load.
- **SC-002**: Disparity > 5 pp triggers the red-flag banner in **100 %**
  of injected-disparity test cases.
- **SC-003**: CSV export is byte-identical across two consecutive exports
  with the same window and data.
- **SC-004**: Page renders in **≤ 2 seconds** p95 over the demo dataset
  (~10 k `ask_history` rows).
- **SC-005**: Section #7 of the next `Subject/AMA_Rubric_Evaluation.md`
  cites this dashboard as new evidence.

## Assumptions

- **A1**: `learners.gender` is collected as an optional, self-declared,
  pseudonymous attribute. If the column is unavailable in production, the
  dashboard MUST collapse the axis with a UI note rather than fail.
- The `ask_history` and `content_safety_results` tables already exist
  (features 005 on main) and carry the cohort axes via a learner-id join.
- The existing admin app already supports a base layout and the
  admin-scoped auth.
- KQL workbook syntax is supported by the existing Application Insights
  instance.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Aggregates only; no individual data; pseudonymous axes. |
| II. GDPR Art. 8 | No new collection; existing pseudonymous axes only. |
| III. EU AI Act high-risk | Provides Annex IV evidence (CSV export) and disparity surveillance. |
| IV. Teacher-in-the-loop | N/A (admin/RAI surface), but feeds the release gate that teachers depend on. |
| V. Pedagogical sign-off | N/A. |
| VI. Outcome-contract driven | Supports the outcome-gap KPI by ensuring it does not improve via disparate impact. |
| VII. Reproducible, spec-driven | KQL workbook + deterministic CSV ensure reproducibility. |
