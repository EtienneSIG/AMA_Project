# Implementation Plan: Autoscale Load Test for learner-web

**Branch**: `011-autoscale-load-test` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-autoscale-load-test/spec.md`

## Summary

Build a reproducible load test against the `learner-web` dev slot to validate
the App Service autoscale rule (`demo/infra/modules/app-service.bicep:61-135`).
Sustain CPU > 70 % for ≥ 10 minutes, observe scale-out 1 → 2, capture
latency/throughput, publish `demo/perf/LOAD-TEST-REPORT-<date>.md`. Defensive
feature: keeps rubric category #11 at 5/5.

## Technical Context

**Language/Version**: PowerShell 7+ orchestration. Load generator: either
`autocannon` (Node) or `k6` (Go) — choose the one already available in
`demo/scripts/` if present, otherwise default to `k6` (single-binary, no
runtime). Decision logged in the run manifest.

**Primary Dependencies**: Azure CLI for authentication, Application
Insights for scale-event query (KQL), the existing dev slot of
`learner-web`.

**Storage**: No new table. Artefacts on disk under `demo/perf/`.

**Testing**: Unit test on the report generator (`tests/unit/load-test-report.test.ts`);
smoke test that the script refuses production-slot names.

**Target Platform**: Demo Deployment Agent's PowerShell runner; Azure EU North.

**Project Type**: Infrastructure validation harness.

**Performance Goals**: ≤ 30 minutes total run; sustained-CPU window ≥ 10 min.

**Constraints**: No production-slot targeting (FR-008); deterministic seed
(FR-010); no synthetic PII (FR-009).

**Scale/Scope**: 1 script, 1 KQL query, 1 report template, 1 run per release
gate at minimum.

## Constitution Check

| Principle | Gate | How this plan complies |
|-----------|------|------------------------|
| I. EU-resident, data-minimised | PASS | Synthetic non-PII traffic on EU dev slot. |
| II. GDPR Art. 8 children | N/A | No personal data. |
| III. EU AI Act high-risk | PASS | Validates the resilience claim in the conformity assessment. |
| IV. Teacher-in-the-loop | N/A | Infrastructure test. |
| V. Pedagogical sign-off | N/A. |
| VI. Outcome-contract driven | PASS | Resilience underpins SLA assumptions. |
| VII. Reproducible, spec-driven | PASS | Seed + KQL + template. |

**EU AI Act articles touched**: minimal — Art. 15 (robustness) is the only
direct touch. The autoscale validation is part of the post-market monitoring
plan documented in Annex IV §"Operational resilience".

**DPIA delta**: **None.** No personal data processed.

**Human-oversight surface**: N/A. The Demo Deployment Agent runs the script;
the Cross-Agent QA Verifier reviews the report.

## Project Structure

### Documentation (this feature)

```text
specs/011-autoscale-load-test/
├── spec.md
├── plan.md                       # THIS FILE
├── checklists/
│   └── compliance.md
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── scripts/
│   └── load-test.ps1                       # entry point (US1–US3)
│
├── observability/
│   └── autoscale-events.kql                # US2 query
│
├── perf/
│   ├── LOAD-TEST-REPORT-template.md        # template referenced by the script
│   └── runs/
│       └── <run_id>/manifest.json
│
└── tests/
    └── unit/
        ├── load-test-no-prod.test.ts
        └── load-test-report.test.ts
```

**Structure Decision**: One PowerShell entry point + one KQL query + one
report template. Artefacts on disk under `demo/perf/`. No new infra
component; the test validates existing infra.

## Complexity Tracking

> No constitutional violations to justify. Using a single-binary load
> generator (k6 default) avoids managing a Node runtime in CI; an
> autocannon-only solution was rejected because it depends on a project
> Node install.
