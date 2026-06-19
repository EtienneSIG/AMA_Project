# Implementation Plan: Director Reporting Benchmarks and Trends

**Branch**: `005-director-reporting-benchmarks` | **Date**: 2026-06-19 | **Spec**: `/specs/005-director-reporting-benchmarks/spec.md`

**Input**: Feature specification from `/specs/005-director-reporting-benchmarks/spec.md`

## Summary

Enrich the existing LearnEU director reporting experience so an authorized school director can (1) track aggregated outcome evolution by class inside their establishment across approved reporting periods, and (2) compare their establishment against the approved national average for the same metric and period. The implementation extends `demo/apps/director-portal/` and the shared DB helper layer introduced by Feature 004 rather than adding a new service. All trend, benchmark, suppression, and unavailable-data states are computed server-side in backend helpers before any JSON reaches the browser, so small-cohort protection and scope enforcement remain compliance controls rather than presentation concerns. The feature is aggregated-only by default, exposes no learner-level data, suppresses or generalizes small cohorts using approved K-anonymity thresholds, and records auditable events for every access, period selection, benchmark view, and suppression outcome. No new autonomous or learner-impacting AI decisioning is introduced; reporting remains advisory and human-led.

## Technical Context

**Language/Version**: Node.js 22.x (director portal runtime), HTML/CSS/vanilla JavaScript for director-facing reporting cards and tables, SQL-backed schema for reporting periods, metric definitions, trend/benchmark snapshots, suppression decisions, and audit records

**Primary Dependencies**: `express`, `cookie-parser`, `pg`, `@azure/identity` (existing director-portal baseline from Feature 004); optional Power BI Embedded remains available but is not required for this increment (native benchmark payloads are first-class)

**Storage**: Azure Database for PostgreSQL Flexible Server (existing `db/schema.sql` + new reporting tables for periods, metric definitions, class trend snapshots, establishment benchmark snapshots, suppression decisions, and reporting audit events); all personal and reporting data EU-resident

**Testing**: Existing PowerShell acceptance flow in `demo/scripts/acceptance_tests.ps1` extended with director reporting scenarios (class-evolution view, national benchmark view, suppressed-cohort behavior, unavailable-benchmark state, audit assertions), plus the role-based manual walkthrough in `specs/005-director-reporting-benchmarks/quickstart.md`

**Target Platform**: Azure App Service Linux app for `demo/apps/director-portal/`; existing demo networking, PostgreSQL connectivity, and managed-identity auth

**Project Type**: Web application (server routes + static frontend) extending an existing portal surface

**Performance Goals**:
- First permitted trend or benchmark view renders in <= 30 seconds from session start (responsiveness target supporting SC-002's first-attempt interpretation outcome)
- Class-evolution view for an establishment is reachable within 2 minutes of starting the reporting task (SC-001)
- Suppression and scope checks add <= 200ms p95 server overhead to a reporting request
- Trend and benchmark endpoints return explicit result states (`ready`, `suppressed_*`, `benchmark_unavailable`, `missing_history`, `incomplete_period`) rather than empty payloads

**Constraints**:
- EU data residency only (West Europe / North Europe Azure regions); no cross-EU transfer
- Aggregated-only by default; no learner-level data, identities, or drill-through exposed
- Approved cohort thresholds enforced before data leaves the backend helper layer: class >= 10 learners, establishment >= 30 learners, national pool >= 100 learners
- Re-identification risk suppression applied even above raw thresholds (indirect inference protection)
- Read-only for directors; no automated learner placement, grading, support assignment, or content-access decisions
- National average is a non-drillable benchmark unless a separate approved basis exists
- Every access, period selection, benchmark view, suppression outcome, and scope change is auditable

**Scale/Scope**:
- Initial scope: one director portal surface serving directors authorized for one or more establishments, plus compliance/program reviewers consuming audit evidence
- Feature surfaces: class-evolution trend cards/tables, establishment-vs-national benchmark cards, period selector, suppression/unavailable explanation states
- Data domain: approved reporting periods, approved metric definitions, aggregated class trend snapshots, establishment benchmark snapshots, suppression decisions, reporting audit events
- Reporting period: multi-period trend comparison and per-period national benchmarking on approved, published periods only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Reporting inputs, scope controls, and audit records remain EU-resident. Only aggregated measures, role/scope metadata, and audit metadata are processed. No learner-level disclosure path is added; no cross-EU transfer. |
| II. GDPR Art. 8 | PASS | Represented learners are treated as minors by default. Views are aggregated-only, small cohorts are suppressed via approved K-anonymity thresholds (class >= 10, establishment >= 30, national >= 100), and indirect re-identification is blocked. No new child-facing collection is introduced. |
| III. EU AI Act high-risk discipline | PASS | Reporting-oriented but held to high-risk discipline: documented scope and suppression rules (Art. 10 data governance), full audit logging (Art. 12), transparent view labeling and unavailable/suppressed states (Art. 13), human-only follow-up (Art. 14), and fail-closed scope enforcement (Art. 15). An Annex IV technical-file fragment is produced for the reporting controls. |
| IV. Teacher-in-the-loop | PASS | The feature is advisory decision support only. No learner-level action is recommended or executed automatically; any operational response remains a named human action through existing teacher/school/program paths. |
| V. Pedagogical sign-off | PASS | Metric definitions and trend interpretations are reviewed for pedagogical validity (that movement signals are meaningful and not misleading) before the technical sign-off and before Phase 2 implementation. |
| VI. Outcome-contract driven | PASS | SC-005 (>= 30% reduction in manual benchmark reporting requests) supports the admin-time KPI; SC-003/SC-004/SC-006 protect Article 8 compliance and auditability; class and benchmark visibility supports the outcome-gap KPI by helping leadership target lower-performing cohorts. |
| VII. Reproducible, spec-driven | PASS | All artifacts live under `specs/005-director-reporting-benchmarks/` with concrete paths, data contracts, suppression policy, audit assertions, and a reproducible quickstart. The increment is deliverable end-to-end by extending the existing demo. |

**EU AI Act articles touched**:
- **Art. 9 (Risk Management)**: Risk controls for small-cohort exposure, indirect re-identification, misleading comparisons (incomplete/unavailable benchmarks), and stale post-publication corrections are identified and mitigated through explicit result states and threshold governance.
- **Art. 10 (Data Governance)**: Reporting periods and metric definitions are modeled as approved reference data; only approved period/metric combinations are exposed. No new personal data categories are introduced.
- **Art. 12 (Logging/Traceability)**: Every access attempt, period selection, benchmark view, and suppression outcome is logged with actor role, establishment scope, region scope, period, metric, outcome, and correlation id.
- **Art. 13 (Transparency)**: Each view states what is compared, which period it covers, and whether suppression or unavailable-data rules affected the result, via the user-facing suppression-state messages.
- **Art. 14 (Human Oversight)**: Reporting is advisory only; follow-up actions remain named human decisions outside the reporting view. No autonomous learner-impacting behavior is introduced.
- **Art. 15 (Robustness/Cybersecurity)**: Fail-closed scope enforcement, server-side suppression before data leaves the helper layer, role-based access, and EU-only processing protect the reporting boundary.

**DPIA delta**: Low-to-moderate. The feature reuses Feature 004's director authorization, scope, and audit model and adds aggregated reporting computation plus suppression governance. New data classes are limited to (1) aggregated class/establishment/national measures, (2) approved reporting-period and metric-definition reference data, (3) suppression decision records, and (4) reporting audit events. No biometric, emotion, behavioral-profiling, or new learner-level categories are introduced. Retention: aggregated snapshots and audit events retained per program reporting policy; no raw learner records stored by this feature. Access limited to authorized directors (their establishment scope) and compliance/program reviewers (audit evidence). DPIA update documents: lawful basis (legitimate educational oversight on aggregated data), threshold governance and ownership, suppression enforcement points, and the no-learner-level-exposure guarantee.

**Human oversight surface**:
- **Suppression governance**: Approved cohort thresholds and re-identification rules are owned jointly by the EU AI Act Compliance Officer and the GDPR Children's Data Specialist; thresholds cannot be changed without joint sign-off (see Phase 0 gate below).
- **Benchmark interpretation**: Directors receive advisory context only; any decline, anomaly, or benchmark gap is routed to existing teacher/school/program review, never to automated intervention.
- **Audit review**: Compliance reviewers can reconstruct what a director was authorized to see and what the portal actually returned for any session.

### Phase 0 Compliance Gate (BLOCKS Phase 2)

The approved suppression policy in `specs/005-director-reporting-benchmarks/data-model.md` (cohort thresholds: class >= 10, establishment >= 30, national >= 100; re-identification rules; suppression output states) MUST receive joint sign-off from the EU AI Act Compliance Officer and the GDPR Children's Data Specialist before any Phase 2 implementation task begins. Implementation tasks are blocked until this gate is recorded.

## Project Structure

### Documentation (this feature)

```text
specs/005-director-reporting-benchmarks/
├── plan.md              # This file
├── research.md          # Phase 0 decisions (extend director-portal, server-side suppression, approved reference data)
├── data-model.md        # Entities + approved suppression policy and output states
├── quickstart.md        # Role-based reporting walkthrough
├── contracts/           # Reporting metadata / trends / benchmark API contracts
└── tasks.md             # Phase 2 implementation tasks (gated by the Phase 0 compliance gate)
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── director-portal/                 # existing surface extended by this feature
│   │   ├── server.js                    # add reporting metadata / trends / benchmark routes
│   │   ├── auth.js                       # reuse fail-closed director scope middleware (Feature 004)
│   │   ├── db/
│   │   │   ├── index.js                  # add trend, benchmark, suppression, audit helpers
│   │   │   └── schema.sql                # add reporting period, metric, snapshot, suppression, audit tables
│   │   ├── services/
│   │   │   ├── reporting.js              # compute trend direction, deltas, comparability states
│   │   │   └── suppression.js            # enforce K-anonymity + re-identification rules server-side
│   │   └── public/
│   │       ├── reporting.html            # class-evolution + national benchmark cards/tables
│   │       └── styles/                   # CSS shared with LearnEU design system
│   └── _shared/
│       ├── auth.js                       # shared role gate (reuse)
│       └── db/
│           └── index.js                  # shared scope/audit helpers (reuse)
└── scripts/
    └── acceptance_tests.ps1              # extend with director reporting + suppression + audit assertions
```

**Structure Decision**: Extend the existing `demo/apps/director-portal/` web application and the shared DB helper layer from Feature 004. Suppression and scope enforcement live in dedicated server-side services (`suppression.js`, `reporting.js`) so that no compliance control depends on the browser. Native benchmark payloads are first-class; Power BI Embedded remains optional and is not on the critical path for this increment.

## Complexity Tracking

> No constitution violations require justification. The feature reuses the existing portal, auth, scope, and audit patterns; it adds reporting computation and suppression governance without new services, new personal-data categories, or new AI decisioning.
