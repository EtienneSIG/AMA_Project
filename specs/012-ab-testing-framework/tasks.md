# Tasks: A/B Testing Framework

**Input**: Design documents from /specs/012-ab-testing-framework/

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include contract, integration, fairness, governance, and acceptance tests because the feature specification requires independent validation checkpoints.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: [ID] [P?] [Story] Description

- [P]: Can run in parallel (different files, no dependencies)
- [Story]: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Every task includes explicit file path(s)
- Every task includes accountable role from agents/

## Implementation note (avoid overwrites)

This feature adds a large **new** experimentation surface, but it extends a few existing files that must not be regenerated.

- **Mirror rule**: `demo/apps/_shared/` is the source of truth for `db/schema.sql`, `db/index.js`, `auth.js`, `contentSafety.js`. Edit only `_shared/` then run `demo/apps/_shared/sync.ps1`; never edit a per-app mirror directly.
- **EXTEND additively**: `demo/apps/_shared/{auth.js, db/schema.sql, db/index.js}`; `demo/apps/admin/server.js` + `public/index.html`; `demo/apps/director-portal/server.js`; `demo/apps/teacher-console/server.js`. Run sync after `_shared/` edits.
- **Safe to create (new)**: all of `_shared/experimentation/*`, `_shared/config/experimentation.js`, `admin/public/js/experiments-*.js`, and everything under `demo/tests/**`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare feature scaffolding, baseline docs, and test harness for experimentation module.

- [ ] T001 Create tasks baseline and accountability matrix in specs/012-ab-testing-framework/tasks.md (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T002 Add experimentation feature flags and environment defaults in demo/apps/_shared/config/experimentation.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T003 [P] Scaffold experimentation modules folder and exports in demo/apps/_shared/experimentation/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T004 [P] Scaffold contract test harness for experimentation APIs in demo/tests/contract/ab-testing-framework.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T005 [P] Scaffold integration test harness for end-to-end experiment lifecycle in demo/tests/integration/ab-testing-framework.lifecycle.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T006 [P] Add fairness/statistics test utility helpers in demo/tests/helpers/experimentation-fixtures.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T007 Add acceptance test entrypoint for feature 012 validations in demo/scripts/acceptance_tests.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core data model, immutable audit trail, governance gates, and shared services required by all user stories.

**CRITICAL**: No user story implementation begins before this phase is complete.

- [ ] T008 Implement experiment lifecycle tables and constraints in demo/apps/_shared/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T009 [P] Implement assignment, metrics, significance, segment, archive, and audit append-only tables in demo/apps/_shared/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T010 [P] Add DB indexes for monitoring freshness and archive search performance in demo/apps/_shared/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T011 Implement immutable audit write helper and hash-chain payload policy in demo/apps/_shared/experimentation/audit-log.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T012 [P] Implement experiment repository functions for lifecycle state transitions in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T013 [P] Implement governance repository functions for decision approvals and sign-off checks in demo/apps/_shared/db/index.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T014 Implement RBAC middleware for product-manager, teacher, pedagogy, and compliance roles in demo/apps/_shared/auth.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T015 Implement lifecycle transition guardrail service (draft->validated->running->paused->completed->decided->archived) in demo/apps/_shared/experimentation/lifecycle-service.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T016 Implement DSR/consent exclusion marker processing in demo/apps/_shared/experimentation/dsr-exclusion-service.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T017 Implement mandatory pedagogy+teacher sign-off validator for adopt_variant decisions in demo/apps/_shared/experimentation/governance-service.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T018 Add foundational API route wiring for experimentation in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T019 Add foundational governance audit tests for append-only behavior in demo/tests/integration/ab-testing-framework.audit.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T020 Add foundational constitution compliance checklist updates for feature 012 in specs/012-ab-testing-framework/checklists/constitution.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: Database, immutable audit, RBAC, governance sign-off gates, and DSR exclusion flow are operational.

---

## Phase 3: User Story 1 - Experiment Definition and Fair Stratified Randomization (Priority: P2)

**Goal**: Enable product managers to define experiments and launch deterministic, persistent, fair random assignments.

**Independent Test**: Create weekly-challenge experiment, randomize 1000 learners stratified by grade/school/mastery, verify persistent assignment and fairness pass/monitor/fail output.

### Tests for User Story 1

- [ ] T021 [P] [US1] Add contract tests for create/validate/start/assignment-summary endpoints in demo/tests/contract/ab-testing-framework.us1.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T022 [P] [US1] Add integration test for persistent learner assignment across sessions in demo/tests/integration/ab-testing-framework.us1.assignment-persistence.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T023 [P] [US1] Add fairness parity test for stratified assignment distribution by grade/SES/language in demo/tests/integration/ab-testing-framework.us1.fairness.test.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)

### Implementation for User Story 1

- [ ] T024 [P] [US1] Implement experiment create/list API handlers in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T025 [US1] Implement experiment validation API (cohort size, metric measurability, duration >=7 days) in demo/apps/admin/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T026 [P] [US1] Implement deterministic hash randomizer with seed versioning in demo/apps/_shared/experimentation/randomization-service.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T027 [US1] Implement stratified assignment engine and persistence in demo/apps/_shared/experimentation/randomization-service.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T028 [US1] Implement assignment fairness validator (assignment parity thresholds and anti-bias checks) in demo/apps/_shared/experimentation/fairness-service.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T029 [US1] Implement start experiment endpoint invoking assignment generation and lifecycle transition in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T030 [US1] Implement assignment summary API with fairnessStatus response in demo/apps/admin/server.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T031 [US1] Implement experiment definition UI (form, validation messages, start action) in demo/apps/admin/public/index.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T032 [US1] Implement experiment definition frontend logic and API integration in demo/apps/admin/public/js/experiments-definition.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T033 [US1] Add immutable audit event emission for create/validate/start/assignment events in demo/apps/_shared/experimentation/audit-log.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T034 [US1] Add governance anti-bias runbook for assignment fairness failures in specs/012-ab-testing-framework/checklists/fairness-gates.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: US1 is independently demoable with persistent fair assignment and auditable lifecycle events.

---

## Phase 4: User Story 2 - Real-Time Monitoring and Alerts (Priority: P2)

**Goal**: Provide real-time monitoring dashboards with underperformance/confound alerts and human decision capture.

**Independent Test**: Simulate running experiment where variant B underperforms; verify alert appears, manager chooses investigate/continue/stop, and rationale is immutably logged.

### Tests for User Story 2

- [ ] T035 [P] [US2] Add contract tests for monitoring and alerts endpoints in demo/tests/contract/ab-testing-framework.us2.monitoring.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T036 [P] [US2] Add integration test for alert emission and decision logging workflow in demo/tests/integration/ab-testing-framework.us2.alert-workflow.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T037 [P] [US2] Add freshness SLA test ensuring monitoring lag <=60 minutes in demo/tests/integration/ab-testing-framework.us2.freshness.test.js (Accountable: agents/demo-deployment-agent.chatmode.md)

### Implementation for User Story 2

- [ ] T038 [P] [US2] Implement hourly aggregation job for variant metrics rollups in demo/apps/_shared/experimentation/monitoring-aggregator.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T039 [US2] Implement monitoring API endpoint returning metrics and freshness metadata in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T040 [P] [US2] Implement alert detection engine for underperformance/confound/sample drift/outage in demo/apps/_shared/experimentation/alert-engine.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T041 [US2] Implement alerts list API and acknowledge flow in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T042 [US2] Implement stop/continue/investigate decision API with rationale capture in demo/apps/admin/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T043 [US2] Implement monitoring dashboard UI cards/charts/alert panels in demo/apps/admin/public/index.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T044 [US2] Implement monitoring dashboard frontend logic (polling, alert actions, rationale modal) in demo/apps/admin/public/js/experiments-monitoring.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T045 [US2] Implement director oversight summary endpoint for active alerts and fairness posture in demo/apps/director-portal/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T046 [US2] Add immutable audit events for alert emitted/acknowledged and decision recorded in demo/apps/_shared/experimentation/audit-log.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: US2 is independently testable with dashboard freshness SLA, alerting, and auditable human decisions.

---

## Phase 5: User Story 3 - Statistical Analysis and Significance Workflows (Priority: P2)

**Goal**: Compute statistically sound significance outputs and advisory recommendations without autonomous adoption.

**Independent Test**: Complete experiment window, run significance analysis, verify p-value/CI/effect-size output and advisory recommendation; verify adopt_variant is blocked without teacher+pedagogy sign-off.

### Tests for User Story 3

- [ ] T047 [P] [US3] Add contract tests for significance and decision endpoints in demo/tests/contract/ab-testing-framework.us3.significance.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T048 [P] [US3] Add statistical regression tests for p-value, CI, and effect-size correctness in demo/tests/integration/ab-testing-framework.us3.statistics.test.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T049 [P] [US3] Add governance gate test that blocks autonomous adoption without required sign-offs in demo/tests/integration/ab-testing-framework.us3.governance-gate.test.js (Accountable: agents/learning-sciences-expert.chatmode.md)

### Implementation for User Story 3

- [ ] T050 [P] [US3] Implement significance calculation service (mean, median, SD, CI95, p-value, effect size) in demo/apps/_shared/experimentation/significance-service.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T051 [US3] Implement daily significance job and result persistence in demo/apps/_shared/experimentation/significance-job.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T052 [US3] Implement significance API endpoint and recommendation payload in demo/apps/admin/server.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T053 [US3] Implement practical significance policy evaluator and recommendation text mapping in demo/apps/_shared/experimentation/significance-policy.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T054 [US3] Implement teacher-console sign-off endpoint for adoption workflows in demo/apps/teacher-console/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T055 [US3] Implement pedagogy sign-off verification in decision service in demo/apps/_shared/experimentation/governance-service.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T056 [US3] Implement significance and recommendation UI section in demo/apps/admin/public/index.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T057 [US3] Implement significance frontend logic and recommendation rendering in demo/apps/admin/public/js/experiments-significance.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T058 [US3] Add immutable audit events for significance computed and adoption gate decisions in demo/apps/_shared/experimentation/audit-log.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: US3 is independently testable with statistically valid outputs, human-in-the-loop adoption gates, and immutable auditability.

---

## Phase 6: User Story 4 - Segmented Analysis, Fairness Validation, and Anti-Bias Checks (Priority: P2)

**Goal**: Deliver segmented effect analysis and anti-bias diagnostics to detect differential impact before rollout.

**Independent Test**: Run segmentation by grade and SES; verify segment-level metrics/significance, opposite-direction effect flags, and high-risk fairness alerts.

### Tests for User Story 4

- [ ] T059 [P] [US4] Add contract tests for segment-analysis endpoint in demo/tests/contract/ab-testing-framework.us4.segments.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T060 [P] [US4] Add integration test for opposite-effect detection and fairness flag escalation in demo/tests/integration/ab-testing-framework.us4.opposite-effect.test.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T061 [P] [US4] Add anti-bias regression test suite across protected/cohort dimensions in demo/tests/integration/ab-testing-framework.us4.anti-bias.test.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)

### Implementation for User Story 4

- [ ] T062 [P] [US4] Implement segment analysis computation service in demo/apps/_shared/experimentation/segment-analysis-service.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T063 [US4] Implement differential-impact and opposite-effect detector in demo/apps/_shared/experimentation/fairness-service.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T064 [US4] Implement segment analysis API endpoint with dimensions input in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T065 [US4] Implement fairness escalation alerts for high-risk segments in demo/apps/_shared/experimentation/alert-engine.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T066 [US4] Implement segmented dashboard UI and fairness warning banners in demo/apps/admin/public/index.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T067 [US4] Implement segmented frontend interactions and chart filters in demo/apps/admin/public/js/experiments-segmentation.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T068 [US4] Add immutable audit events for segment analysis and fairness escalations in demo/apps/_shared/experimentation/audit-log.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T069 [US4] Document fairness review checkpoint requiring Responsible AI + Learning Sciences joint sign-off in specs/012-ab-testing-framework/checklists/fairness-gates.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: US4 is independently testable with segment-level statistical context, anti-bias checks, and fairness escalation governance.

---

## Phase 7: User Story 5 - Archive and Versioned Experiment History (Priority: P2)

**Goal**: Archive complete experiment outcomes with searchable, versioned history and exportable templates.

**Independent Test**: Archive at least three experiments, search by engagement/metric/audience/outcome, open full history timeline, export one design as template.

### Tests for User Story 5

- [ ] T070 [P] [US5] Add contract tests for archive create/search endpoints in demo/tests/contract/ab-testing-framework.us5.archive.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T071 [P] [US5] Add integration test for archive packet completeness and version timeline integrity in demo/tests/integration/ab-testing-framework.us5.archive-integrity.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T072 [P] [US5] Add performance test for archive search (<5s for typical query set) in demo/tests/integration/ab-testing-framework.us5.archive-performance.test.js (Accountable: agents/demo-deployment-agent.chatmode.md)

### Implementation for User Story 5

- [ ] T073 [P] [US5] Implement archive service for hypothesis/results/decision/lessons packet assembly in demo/apps/_shared/experimentation/archive-service.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T074 [US5] Implement archive API endpoint and lessons-learned capture in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T075 [P] [US5] Implement archive search repository with metric/audience/keyword/outcome filters in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T076 [US5] Implement archive search endpoint and result pagination in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T077 [US5] Implement archive and experiment-history UI (summary card, timeline, export template action) in demo/apps/admin/public/index.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T078 [US5] Implement archive frontend logic and export-as-template workflow in demo/apps/admin/public/js/experiments-archive.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T079 [US5] Implement versioned experiment change history API backed by audit events in demo/apps/admin/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T080 [US5] Add immutable audit events for archive_write and archive_search data access events in demo/apps/_shared/experimentation/audit-log.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T081 [US5] Document pedagogy review-before-adoption governance evidence capture in specs/012-ab-testing-framework/checklists/governance-signoff.md (Accountable: agents/learning-sciences-expert.chatmode.md)

**Checkpoint**: US5 is independently testable with searchable versioned archive and complete governance evidence.

---

## Phase 8: Polish and Cross-Cutting Concerns

**Purpose**: Final hardening across all stories for compliance, reliability, and release readiness.

- [ ] T082 [P] Add transparency copy for active experiments in learner/teacher experiences in demo/apps/admin/public/index.html (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T083 [P] Add security hardening for randomization seed handling and secrets access in demo/apps/_shared/experimentation/randomization-service.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T084 [P] Add GDPR retention and minimization policy enforcement job in demo/apps/_shared/experimentation/data-retention-job.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T085 Add end-to-end quickstart validation script updates for all checkpoints in demo/scripts/acceptance_tests.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T086 Add cross-agent compliance verification record for AI Act/GDPR/RAI outcomes in specs/012-ab-testing-framework/checklists/compliance-validation.md (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T087 Add pedagogy sign-off evidence pack for adoption decisions in specs/012-ab-testing-framework/checklists/governance-signoff.md (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T088 Add release readiness summary and deployment gate notes in specs/012-ab-testing-framework/quickstart.md (Accountable: agents/demo-deployment-agent.chatmode.md)

---

## Dependencies and Execution Order

### Phase Dependencies

- Phase 1 (Setup): no dependencies
- Phase 2 (Foundational): depends on Phase 1; blocks all user stories
- Phase 3 (US1): depends on Phase 2
- Phase 4 (US2): depends on Phase 2 and uses US1 experiment IDs/data
- Phase 5 (US3): depends on Phase 2 and Phase 4 monitoring aggregates
- Phase 6 (US4): depends on Phase 2 and Phase 5 significance outputs
- Phase 7 (US5): depends on Phase 2 and completed decision outcomes from US3/US4
- Phase 8 (Polish): depends on all prior phases

### User Story Dependency Graph

1. US1 -> US2 -> US3 -> US4 -> US5
2. US2 can begin once US1 APIs exist for running experiments and assignments
3. US3 uses US2 rollups and decisions, then feeds US4 segment diagnostics
4. US5 archives all prior story outputs and governance artifacts

### Within-Story Execution Rules

1. Execute test tasks first for each story and ensure failures before implementation.
2. Implement API/service/model tasks before UI wiring for the same story.
3. Complete immutable audit tasks before marking any story checkpoint complete.
4. Complete independent test checkpoint before starting next priority story.

## Parallel Opportunities

- Phase 1: T003, T004, T005, T006 can run in parallel.
- Phase 2: T009, T010, T012, T013 can run in parallel after T008.
- US1: T021, T022, T023 parallel; T024 and T026 parallel; T031 and T032 after API readiness.
- US2: T035, T036, T037 parallel; T038 and T040 parallel; T043 and T044 parallel after endpoint readiness.
- US3: T047, T048, T049 parallel; T050 and T053 parallel.
- US4: T059, T060, T061 parallel; T062 and T063 parallel.
- US5: T070, T071, T072 parallel; T073 and T075 parallel.
- Polish: T082, T083, T084 parallel.

## Parallel Example: User Story 1

- Parallel test batch: T021, T022, T023
- Parallel service batch: T024 and T026
- Parallel UI batch after APIs: T031 and T032

## Parallel Example: User Story 2

- Parallel test batch: T035, T036, T037
- Parallel backend batch: T038 and T040
- Parallel frontend batch after APIs: T043 and T044

## Parallel Example: User Story 3

- Parallel test batch: T047, T048, T049
- Parallel backend batch: T050 and T053

## Parallel Example: User Story 4

- Parallel test batch: T059, T060, T061
- Parallel backend batch: T062 and T063

## Parallel Example: User Story 5

- Parallel test batch: T070, T071, T072
- Parallel backend batch: T073 and T075

## Implementation Strategy

### MVP First (US1 scope)

1. Complete Phase 1 and Phase 2 fully.
2. Deliver Phase 3 (US1) and run US1 independent checkpoint.
3. Validate fairness pass/monitor/fail handling before moving on.

### Incremental Delivery

1. Add US2 for safety monitoring and decision logging.
2. Add US3 for statistical decision support with governance gate.
3. Add US4 for anti-bias segmentation and fairness escalation.
4. Add US5 for archive and versioned learning history.
5. Run Phase 8 hardening and release gate checks.

### Governance and Compliance Gates

1. Teacher + pedagogy sign-off required before adopt_variant decisions (T017, T055, T087).
2. Fairness validation and anti-bias checks required before rollout (T028, T063, T069).
3. Immutable audit trail required for every lifecycle change and sensitive action (T011, T033, T046, T058, T068, T080).
4. Cross-agent compliance validation required before deployment readiness sign-off (T086).
