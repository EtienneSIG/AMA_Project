# Feature Specification: Autoscale Load Test for learner-web

**Feature Branch**: `011-autoscale-load-test`

**Created**: 2026-05-22

**Status**: Draft (Wave 2 of `Subject/ama-rubric-remediation-plan.md` — defensive,
keeps rubric category #11 at 5/5).

**Input**: User description: "Validate the App Service autoscale rules
(`demo/infra/modules/app-service.bicep:61-135`) with a reproducible load test
against `learner-web`. Sustain CPU > 70 % for ≥ 10 minutes, verify scale-out
1 → 2 in App Insights, capture p50/p95/p99 + throughput, and publish a report
under `demo/perf/LOAD-TEST-REPORT-<date>.md`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Run the load test (Priority: P1)

The Demo Deployment Agent runs `demo/scripts/load-test.ps1` against the
`learner-web` dev slot. The test ramps to a target concurrency that pushes
CPU above 70 % and holds for at least 10 minutes. Logs and App Insights
correlation IDs are captured for later analysis.

**Why this priority**: Without execution there is no evidence. This is the
gating MVP for rubric category #11.

**Independent Test**: Execute the script with default parameters; observe
load profile reaching the target; capture run id, start/end timestamps and
seed numbers in a manifest under `demo/perf/runs/<run_id>/manifest.json`.

**Acceptance Scenarios**:

1. **Given** a healthy `learner-web` dev slot, **When** the script runs
   with defaults, **Then** CPU on the App Service plan sustains > 70 % for
   ≥ 10 minutes (verified in App Insights).
2. **Given** the run completes, **When** the manifest is opened, **Then**
   it contains run id, start/end UTC, target concurrency, sustained CPU
   window and the App Insights correlation id.

---

### User Story 2 — Verify scale-out 1 → 2 (Priority: P2)

After the sustained CPU window, the App Service plan must scale from 1 to 2
instances per the existing Bicep autoscale rule. The scale event is visible
in App Insights and in the Azure activity log.

**Why this priority**: Validates the production-readiness claim against the
infrastructure-as-code rule.

**Independent Test**: After US1, query App Insights for a scale event in
the load window; verify instance count transition `1 → 2`.

**Acceptance Scenarios**:

1. **Given** the sustained CPU window in US1, **When** the verifier runs
   the App Insights query in `demo/observability/autoscale-events.kql`,
   **Then** at least one scale event with `instance_count` going from 1
   to 2 is found inside the window.
2. **Given** no scale event is found, **When** the report is generated,
   **Then** the verdict is **FAIL** and the bicep rule reference is
   surfaced for investigation.

---

### User Story 3 — Capture latency + throughput and publish report (Priority: P3)

The script records p50/p95/p99 latency and requests-per-second at the
load-generator side; combines them with the App Insights scale events; and
writes `demo/perf/LOAD-TEST-REPORT-<date>.md` containing methodology, raw
results, autoscale events table and a final verdict.

**Why this priority**: Auditable artefact is required for the rubric
defence and for the operations runbook.

**Independent Test**: Open the generated report; verify all sections are
populated; verify the verdict matches US2.

**Acceptance Scenarios**:

1. **Given** US1 and US2 are done, **When** the report generator runs,
   **Then** `demo/perf/LOAD-TEST-REPORT-<date>.md` exists with sections
   *Methodology*, *Raw results (latency + RPS)*, *Autoscale events*,
   *Verdict*, *Reproduction commands*.
2. **Given** the verdict is **FAIL**, **When** the report is reviewed,
   **Then** it lists the discrepancy against the Bicep rule and the
   recommended next action.

### Edge Cases

- The script MUST refuse to run against the production slot; only dev and
  staging slot names are accepted (FR-008).
- The test seed (random number generator) MUST be deterministic; the same
  seed reproduces the same load profile.
- A flaky network spike must not flip a PASS to FAIL: the sustained-CPU
  window is computed on a moving average over 60 s.
- The script MUST NOT generate or transmit any synthetic learner PII.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A single PowerShell entry point `demo/scripts/load-test.ps1`
  MUST run the entire test (P1–P3).
- **FR-002**: The script MUST sustain CPU > 70 % on the `learner-web` App
  Service plan for ≥ 10 minutes (US1).
- **FR-003**: The script MUST capture `p50`, `p95`, `p99` request latency
  and requests-per-second at the load-generator side.
- **FR-004**: A reproducible KQL query at
  `demo/observability/autoscale-events.kql` MUST return the scale events
  for a given time window.
- **FR-005**: A report MUST be generated at `demo/perf/LOAD-TEST-REPORT-<date>.md`
  with the sections listed in US3 Acceptance Scenario 1.
- **FR-006**: The verdict (PASS / FAIL) MUST be derived from US2 (scale
  event 1 → 2 found inside the load window).
- **FR-007**: The script MUST be runnable from a clean checkout with no
  manual intervention beyond Azure login.
- **FR-008**: The script MUST refuse to target the production slot.
- **FR-009**: The script MUST NOT emit any synthetic learner PII.
- **FR-010**: The run manifest MUST capture the seed so a second run with
  the same seed produces the same load profile.

### Key Entities

- **LoadTestRun**: (`id`, `started_at`, `ended_at`, `target_concurrency`,
  `sustained_cpu_window`, `seed`, `app_insights_operation_id`).
- **AutoscaleEvent**: (`occurred_at`, `from_instances`, `to_instances`,
  `trigger_metric`, `trigger_value`).
- **LatencyMetric**: (`p50`, `p95`, `p99`, `rps`, `sampled_over_seconds`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: One full run completes from a clean checkout in **≤ 30 minutes**.
- **SC-002**: Sustained CPU > 70 % window is **≥ 10 minutes** in the run.
- **SC-003**: A scale-out event `1 → 2` is observed within the load window
  in **100 %** of runs (modulo platform incidents documented in the report).
- **SC-004**: The report is generated automatically and contains every
  required section.
- **SC-005**: Section #11 of the next `Subject/AMA_Rubric_Evaluation.md`
  cites the report and the KQL workbook as new evidence.

## Assumptions

- The `learner-web` dev slot is provisioned and warm.
- Autoscale rule in `demo/infra/modules/app-service.bicep:61-135`
  remains: CPU > 70 % for 10 min → +1 instance (max 2 for the demo).
- The Demo Deployment Agent has the necessary Azure RBAC to read App
  Insights and to push App Service traffic to the dev slot.
- The repository already contains an Application Insights instance bound
  to the App Service plan.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Test traffic is synthetic non-PII; remains in EU North dev slot. |
| II. GDPR Art. 8 | No personal data processed. |
| III. EU AI Act high-risk | Validates resilience claim used in the conformity assessment. |
| IV. Teacher-in-the-loop | N/A — infrastructure test. |
| V. Pedagogical sign-off | N/A. |
| VI. Outcome-contract driven | Resilience underpins the SLA assumptions used in the outcome contract. |
| VII. Reproducible, spec-driven | Deterministic seed + KQL query + report template ensure reproducibility. |
