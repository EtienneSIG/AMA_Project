# Implementation Plan: A/B Testing Framework

**Branch**: `012-ab-testing-framework` | **Date**: 2026-06-18 | **Spec**: `/specs/012-ab-testing-framework/spec.md`

**Input**: Feature specification from `/specs/012-ab-testing-framework/spec.md`

## Summary

Introduce a governed A/B experimentation capability for LearnEU that supports experiment definition, stratified learner randomization, real-time monitoring dashboards, significance testing, segmented outcome analysis, and archival learnings. The design extends the existing Node.js multi-app + EU-hosted PostgreSQL stack with fairness-safe assignment services, near-real-time analytics rollups, and immutable audit trails so every experiment state change and decision is traceable. Constitutional controls are embedded directly in workflow: no autonomous pedagogical rollout decisions, mandatory teacher/pedagogy review before adoption, bias checks on assignment and outcomes, and GDPR-compliant handling of learner assignment records.

## Technical Context

**Language/Version**: Node.js 22.x (server/runtime), SQL migrations for PostgreSQL 15+, PowerShell 7+ for verification scripts

**Primary Dependencies**: `express`, `pg`, existing shared auth/session middleware (`demo/apps/_shared`), event/stream processing via existing app worker pattern, statistical library for inference (`simple-statistics` or equivalent), existing chart/dashboard UI stack in admin/director surfaces

**Storage**: EU-hosted PostgreSQL for experiment config, variant assignments, event aggregates, significance snapshots, segment analyses, and append-only audit logs

**Testing**: Contract/API validation, deterministic randomization tests, fairness/bias checks (assignment parity and impact parity), statistical regression tests (p-value/effect-size calculations), audit completeness tests, and quickstart end-to-end walkthrough

**Target Platform**: Azure App Service Linux apps (`admin`, `director-portal`, shared services) + Azure Database for PostgreSQL Flexible Server in EU regions only

**Project Type**: Multi-app web platform extension (experimentation orchestration + analytics + governance)

**Performance Goals**:
- Assignment API resolves learner variant in <= 120 ms p95 at runtime
- Monitoring dashboard data freshness <= 60 minutes lag from source events (SC-002)
- Daily significance computation for active experiments completes <= 15 minutes per experiment window
- Archive search returns first page in < 5 seconds for at least 80% of queries (SC-006)

**Constraints**:
- No autonomous pedagogical decisions from A/B outcomes; adoption requires teacher and pedagogy review approval
- Randomization fairness must not introduce demographic bias; monitor by protected/cohort dimensions and halt on risk thresholds
- EU-only data residency; no cross-EU transfer, no third-party tracking SDKs
- Assignment records and monitoring data must support GDPR rights handling (access/erasure where lawful, exclusion markers for requests)
- Full audit trail for lifecycle transitions (`design/start/pause/stop/analyze/decide/archive`) with rationale and actor identity

**Scale/Scope**:
- Typical experiment cohort: 500-25,000 learners, 2-4 variants, 1-8 weeks duration
- Segmentation dimensions: grade, SES proxy, language, prior mastery quartile, school, district
- Scope includes product manager + pedagogy + teacher oversight workflows and archival repository for institutional learning

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Store only required experiment metadata, pseudonymous assignments, and aggregated outcomes in EU-hosted PostgreSQL; no cross-EU transfer. |
| II. GDPR Art. 8 | PASS | Under-16 consent rules remain active; learner participation honors guardian consent and opt-out/DSR exclusion processing. |
| III. EU AI Act high-risk discipline | PASS | Adds Art. 12 logging, Art. 13 transparency, and Art. 14 oversight controls for experiment lifecycle and adoption decisions. |
| IV. Teacher-in-the-loop | PASS | Experiment results are decision-support only; no automatic learner-facing rollout without teacher review and override path. |
| V. Pedagogical sign-off | PASS | Every adoption decision requires pedagogical review sign-off beyond engagement-only improvements. |
| VI. Outcome-contract driven | PASS | Improves evidence-based iteration while guarding against subgroup harm and preserving learning outcomes. |
| VII. Reproducible, spec-driven delivery | PASS | All design artifacts generated under `specs/012-ab-testing-framework/` before implementation. |

**EU AI Act articles touched**:
- **Art. 5 (Prohibited practices check)**: enforce no discriminatory or manipulative experiment behavior; run fairness checks before/while/after experiments and block rollout on bias risk.
- **Art. 12 (Logging and traceability)**: immutable logs for assignments, alerts, monitoring recalculations, state changes, and decision rationale.
- **Art. 13 (Transparency)**: learner/teacher transparency copy indicates when A/B testing is active and how outcomes are interpreted.
- **Art. 14 (Human oversight)**: mandatory human approval workflow for launch continuation and post-experiment adoption, including teacher/pedagogy review gate.

**DPIA delta**:
- New processing artifacts: `variant_assignment` records, monitoring snapshots, segment-analysis outputs, and decision rationale logs.
- Data classes touched: pseudonymous learner identifiers, cohort/hierarchy context, metric telemetry, and operational audit metadata.
- Controls added: assignment minimization, retention windows, DSR-aware exclusion markers, and role-scoped visibility for experiment data.

**Human oversight surface**:
- Product manager may start/stop/investigate but cannot autonomously adopt pedagogical changes.
- Teacher and Learning Sciences review sign-off required before variant rollout beyond experiment scope.
- Compliance reviewer can freeze/archive experiments when fairness or GDPR guardrails fail.

## Project Structure

### Documentation (this feature)

```text
specs/012-ab-testing-framework/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ab-testing-framework.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── _shared/
│   │   ├── db/
│   │   │   ├── schema.sql                     # Experiments, assignments, metrics, segments, audits
│   │   │   └── index.js                       # Shared queries: randomization, monitoring, significance, archive
│   │   ├── auth.js                            # Role/scope gating for experimentation actions
│   │   └── server.js                          # Shared experimentation endpoints/helpers
│   ├── admin/
│   │   ├── server.js                          # Experiment lifecycle, alerts, decision and archive APIs
│   │   └── public/
│   │       └── index.html                     # Experiment setup + monitoring + significance + archive UI
│   ├── director-portal/
│   │   └── server.js                          # Aggregated oversight and fairness summary views
│   └── teacher-console/
│       └── server.js                          # Teacher review sign-off and override acknowledgement hooks
└── scripts/
    └── acceptance_tests.ps1                   # Assignment fairness, alerting, auditing, and archive checks
```

**Structure Decision**: Extend existing shared/admin/teacher/director surfaces rather than adding a new service. This keeps experimentation governance close to existing RBAC and audit infrastructure and limits operational complexity.

## Architecture Focus Areas

### 1) Experiment Definition and State Machine

- Define explicit lifecycle states: `draft -> validated -> running -> paused -> completed -> decided -> archived`.
- Validate cohort size, metric measurability, minimum duration, and randomization method before start.
- Enforce immutable snapshots of experiment config once started; updates require versioned state transitions.

### 2) Fair Stratified Randomization

- Implement deterministic assignment with experiment seed + learner key hashing, persisted in assignment table.
- Support stratification by hierarchy/cohort dimensions (grade, school, baseline mastery quantile) to balance variants.
- Run assignment fairness diagnostics to detect allocation skew by demographic/cohort dimensions and emit governance alerts.

### 3) Real-Time Monitoring and Streaming Aggregates

- Ingest learner events to rolling hourly/daily aggregates per experiment/variant/segment.
- Compute underperformance and confound detectors (outage, security patch, sample drift) and emit actionable alerts.
- Provide dashboard APIs returning metrics with confidence intervals and freshness metadata.

### 4) Statistical Significance and Segmentation

- Daily/closure jobs compute p-value, CI, effect size, and practical significance thresholds.
- Segment analysis computes per-dimension effect deltas and flags opposite-direction subgroup outcomes.
- Recommendations are advisory only and always require human decision logging for continuation/adoption.

### 5) Archive, Audit, and Compliance Surfaces

- Archive includes hypothesis, design, assignments summary, results, decisions, and lessons learned.
- Every state/action writes append-only audit events with actor, timestamp, rationale, and impact summary.
- DSR-compatible handling marks excluded learners and recomputes effective sample sizes where needed.

## Implementation Phases

### Phase 0 - Research and Clarification

Produce `research.md` decisions for randomization approach, fairness metrics, significance method, streaming cadence, GDPR/DPIA treatment of assignment records, and archive/search model.

### Phase 1 - Data and Contract Design

Produce:
- `data-model.md` with entities, relationships, validation rules, and lifecycle transitions.
- `contracts/ab-testing-framework.openapi.yaml` for experiment lifecycle, monitoring, segmentation, and archive endpoints.
- `quickstart.md` with experiment setup-to-archive validation flow and compliance checks.
- Update `.github/copilot-instructions.md` plan pointer to this feature plan.

### Phase 2 - Foundation Implementation

- Implement schema migrations and shared DB helpers for experiments, assignments, metrics, segments, and audits.
- Implement lifecycle APIs with role gating and mandatory rationale capture.
- Implement deterministic stratified assignment and fairness guardrail checks.

### Phase 3 - Monitoring and Statistical Engine

- Implement aggregation pipeline and dashboard endpoints for near-real-time monitoring.
- Implement significance calculations (CI/p-value/effect size) and underperformance/confound alert jobs.
- Add decision workflows (`stop/continue/investigate`) with explicit human rationale persistence.

### Phase 4 - Segmentation and Archive

- Implement segment analysis APIs and differential-impact flagging.
- Implement archive repository and search/export-as-template capabilities.
- Add transparency surfaces for learner/teacher messaging and compliance review.

### Phase 5 - Verification and Readiness for `/speckit.tasks`

- Verify fairness checks, GDPR controls, and audit completeness under normal and edge-case flows.
- Verify no autonomous pedagogical rollout path exists without teacher/pedagogy sign-off.
- Run constitution re-check and handoff for task breakdown.

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| Human approval gate required before any adoption decision | PASS |
| Randomization fairness checks and anti-bias alerts modeled in schema/contracts | PASS |
| Assignment and monitoring logs satisfy Art. 12 traceability | PASS |
| Transparency artifacts for active experiments included (Art. 13) | PASS |
| DSR-aware exclusion path defined for assignment/analysis records | PASS |
| EU-only data residency and minimization boundaries unchanged | PASS |

No constitution violations require waiver.

## Complexity Tracking

No constitution violations or structural complexity exceptions identified.
