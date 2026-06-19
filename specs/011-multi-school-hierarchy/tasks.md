# Tasks: Multi-School Hierarchy, Approval Chains, and Hierarchical Reporting

**Input**: Design documents from `/specs/011-multi-school-hierarchy/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/multi-school-hierarchy.openapi.yaml`, `quickstart.md`

**Tests**: Contract, integration, negative-access, suppression, and audit validation tasks are included because the specification and quickstart require explicit verification.

**Organization**: Tasks are grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Parallelizable (different files, no dependency on incomplete tasks)
- **[Story]**: User story mapping (`US1`..`US5`)
- **Accountable**: Named accountable role from `agents/` is included in each task description

## Implementation note (avoid overwrites)

This feature touches several existing, widely-mirrored files. Extend additively; prefer the migration file for schema changes.

- **Mirror rule**: `demo/apps/_shared/` is the source of truth for `db/schema.sql`, `db/index.js`, `auth.js`, `contentSafety.js`. Edit only `_shared/` then run `demo/apps/_shared/sync.ps1`; never edit a per-app mirror directly.
- **Schema via migration (preferred)**: add new hierarchy tables in `demo/apps/_shared/db/migrations/011_multi_school_hierarchy.sql`; do not rewrite `schema.sql` wholesale.
- **EXTEND additively / SENSITIVE**: `demo/apps/_shared/auth.js` (mirrored to all 5 apps — add scope/role checks only, never replace existing logic), `_shared/server.js`, `_shared/db/index.js`; `demo/apps/admin/server.js` + `public/index.html`; `demo/apps/director-portal/server.js` + `public/index.html`; `demo/data/curricula.manifest.json`. Run sync after every `_shared/` edit.
- **Safe to create (new)**: the migration SQL file.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align feature scaffolding, validation harness, and compliance pointers before core implementation.

- [ ] T001 Update plan pointer to feature 011 in `.github/copilot-instructions.md` (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T002 Create hierarchy feature migration scaffold in `demo/apps/_shared/db/migrations/011_multi_school_hierarchy.sql` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T003 [P] Add hierarchy seed fixture placeholders for country/district/school/class in `demo/data/curricula.manifest.json` (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T004 [P] Add feature acceptance test entrypoint for hierarchy suite in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T005 [P] Add contract validation command notes for hierarchy API in `specs/011-multi-school-hierarchy/quickstart.md` (Accountable: agents/responsible-ai-evaluator.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hierarchy model, scope enforcement primitives, audit foundation, and shared query paths.

**CRITICAL**: No user story phase begins until this phase is complete.

- [ ] T006 Implement hierarchy entities (`HierarchyNode`, `HierarchyEdge`) and constraints in `demo/apps/_shared/db/schema.sql` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T007 Implement `RoleScopeGrant` schema and active-grant uniqueness/effective-date checks in `demo/apps/_shared/db/schema.sql` (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T008 Implement approval/audit/reporting/benchmark core tables from `data-model.md` in `demo/apps/_shared/db/schema.sql` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T009 [P] Implement derived views (`v_scope_resolved_nodes`, rollups, adoption metrics, audit governance view) in `demo/apps/_shared/db/schema.sql` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T010 Implement shared hierarchy and scope resolution helpers in `demo/apps/_shared/db/index.js` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T011 Implement deny-by-default scope middleware and role transition cache invalidation hooks in `demo/apps/_shared/auth.js` (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T012 [P] Implement append-only hierarchy audit writer utility in `demo/apps/_shared/db/index.js` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T013 Implement shared `/api/hierarchy/rbac/scope-check` route with audit pass/deny logging in `demo/apps/_shared/server.js` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T014 Add foundational scope enforcement validation scenarios (in-scope, out-of-scope, stale-grant) in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: Foundation complete when hierarchy graph, grant model, scope check endpoint, and audit primitives pass acceptance script.

---

## Phase 3: User Story 1 - District View with School-Level Aggregation (Priority: P1) 🎯 MVP

**Goal**: District director sees school aggregates, alert flags, and class-level drill-down for selected school.

**Independent Test Checkpoint**: District director sees 10 schools with aggregate metrics, 2 low-performing alerts, and class-level drill-down without learner identities.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add contract conformance test for `GET /reporting/hierarchical` district mode in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T016 [P] [US1] Add district dashboard integration test with low-performance alert assertions in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/responsible-ai-evaluator.chatmode.md)

### Implementation for User Story 1

- [ ] T017 [P] [US1] Implement district school-aggregate query (enrollment, completion, mastery, alert baseline) in `demo/apps/_shared/db/index.js` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T018 [US1] Implement district dashboard API endpoint and school drill-down route in `demo/apps/director-portal/server.js` (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T019 [US1] Implement district dashboard cards/table rendering and alert visualization in `demo/apps/director-portal/public/index.html` (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T020 [US1] Implement class-level trend panel for selected school with no learner-level fields in `demo/apps/director-portal/public/index.html` (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T021 [US1] Add district dashboard access/report generation audit events in `demo/apps/director-portal/server.js` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T022 [US1] Execute US1 independent checkpoint script and record evidence in `specs/011-multi-school-hierarchy/quickstart.md` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

---

## Phase 4: User Story 2 - Multi-Level Approval and Governance (Priority: P1)

**Goal**: District curriculum content flows through pedagogist -> curriculum lead -> country manager gates, then schools adopt/adapt/decline with metrics.

**Independent Test Checkpoint**: Three sequential approvals lead to `available_to_schools`; School A adopts, School B adapts, School C declines; dashboard reflects rates.

### Tests for User Story 2

- [ ] T023 [P] [US2] Add approval-chain state-machine test (including stale lock and unauthorized gate actor) in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T024 [P] [US2] Add school adoption decision test for adopt/adapt/decline and variant linkage in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/learning-sciences-expert.chatmode.md)

### Implementation for User Story 2

- [ ] T025 [P] [US2] Implement district approval workflow persistence and gate transition logic in `demo/apps/admin/server.js` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T026 [US2] Implement `POST /district-approvals` and `POST /district-approvals/{workflowId}/decisions` handlers in `demo/apps/admin/server.js` (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T027 [US2] Implement `POST /district-approvals/{workflowId}/school-decisions` with adopt/adapt/decline validation in `demo/apps/admin/server.js` (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T028 [US2] Implement district adoption metrics rollup and opt-out threshold flagging in `demo/apps/_shared/db/index.js` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T029 [US2] Implement approval workflow and school adoption UX states in `demo/apps/admin/public/index.html` (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T030 [US2] Implement approval-chain audit completeness checks (submit, decide, publish, adoption) in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

---

## Phase 5: User Story 3 - Hierarchical Reporting and Comparison (Priority: P1)

**Goal**: Country manager generates district/region/national trend reports and exports compliant PDFs.

**Independent Test Checkpoint**: Six-month report returns trend lines and district averages for seven schools; PDF export succeeds for generated reports.

### Tests for User Story 3

- [ ] T031 [P] [US3] Add rollup reconciliation test (`school -> district -> region -> national`) in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T032 [P] [US3] Add export guard test for suppressed/blocked report states in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/gdpr-children-data-specialist.chatmode.md)

### Implementation for User Story 3

- [ ] T033 [P] [US3] Implement hierarchical report generation service with dimension/time filtering in `demo/apps/_shared/db/index.js` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T034 [US3] Implement suppression and re-identification anti-leakage pipeline before report finalization in `demo/apps/_shared/db/index.js` (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T035 [US3] Implement `GET /reporting/hierarchical` and status handling (`generated/suppressed/blocked_for_review`) in `demo/apps/director-portal/server.js` (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T036 [US3] Implement `POST /reporting/hierarchical/export` PDF orchestration with scope parity enforcement in `demo/apps/director-portal/server.js` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T037 [US3] Implement hierarchical trend visualization and suppression messaging in `demo/apps/director-portal/public/index.html` (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T038 [US3] Add report-generation/suppression/block audit events with lineage IDs in `demo/apps/director-portal/server.js` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

---

## Phase 6: User Story 4 - RBAC by Hierarchy Level (Priority: P1)

**Goal**: Role visibility is strictly scoped by hierarchy level, with immediate role transition enforcement and zero learner leakage above school.

**Independent Test Checkpoint**: School director sees only own school; district director sees multi-school aggregates only; country manager sees district aggregates only; unauthorized learner drill-through always denied.

### Tests for User Story 4

- [ ] T039 [P] [US4] Add role matrix access test (school_director, district_director, country_manager) in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T040 [P] [US4] Add explicit scope enforcement validation for API/export/UI parity and learner-level denial in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/gdpr-children-data-specialist.chatmode.md)

### Implementation for User Story 4

- [ ] T041 [P] [US4] Implement role transition transaction (revoke old grant, grant new scope, audit transition) in `demo/apps/_shared/db/index.js` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T042 [US4] Enforce hierarchy-level RBAC guards on director/admin hierarchy endpoints in `demo/apps/director-portal/server.js` (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T043 [US4] Enforce hierarchy-level RBAC guards on approval governance endpoints in `demo/apps/admin/server.js` (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T044 [US4] Implement suppression fallback rendering for blocked learner-level requests in `demo/apps/director-portal/public/index.html` (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T045 [US4] Add denial rationale and scope context to RBAC audit events in `demo/apps/_shared/db/index.js` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

---

## Phase 7: User Story 5 - Cross-School Peer Benchmarking and Best-Practice Sharing (Priority: P1)

**Goal**: School director compares metrics against district/national baselines, receives actionable recommendations, and can initiate peer collaboration.

**Independent Test Checkpoint**: Comparison shows school vs district/national values, recommendation appears for significant gap, and peer request transitions to `requested` with notification event.

### Tests for User Story 5

- [ ] T046 [P] [US5] Add peer comparison API test including same-country boundary constraints in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T047 [P] [US5] Add collaboration request lifecycle test (`not_started -> requested -> accepted/declined`) in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 5

- [ ] T048 [P] [US5] Implement `GET /benchmarking/peer-comparisons` aggregation and recommendation rules in `demo/apps/director-portal/server.js` (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T049 [US5] Implement `POST /benchmarking/collaboration-requests` persistence and notification trigger in `demo/apps/director-portal/server.js` (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T050 [US5] Implement benchmarking comparison panel and peer collaboration form UX in `demo/apps/director-portal/public/index.html` (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T051 [US5] Implement benchmark request/collaboration audit event logging in `demo/apps/director-portal/server.js` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T052 [US5] Implement anti-leakage check to prevent cross-country peer joins in `demo/apps/_shared/db/index.js` (Accountable: agents/gdpr-children-data-specialist.chatmode.md)

---

## Phase 8: Polish and Cross-Cutting Concerns

**Purpose**: Performance hardening, compliance evidence, and release readiness.

- [ ] T053 [P] Optimize district dashboard and hierarchical query performance to meet SC-001 p95 targets in `demo/apps/_shared/db/index.js` (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T054 [P] Add acceptance scenarios for edge cases (school merge, role promotion, non-viable suppression report) in `demo/scripts/acceptance_tests.ps1` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T055 Validate full quickstart runbook and capture pass/fail evidence in `specs/011-multi-school-hierarchy/quickstart.md` (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T056 Produce Annex IV and compliance traceability fragment for hierarchy governance feature in `specs/011-multi-school-hierarchy/research.md` (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T057 Run pedagogical fit review for dashboard alerts and peer recommendations in `specs/011-multi-school-hierarchy/spec.md` (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T058 Record final readiness handoff notes for deployment/demo in `demo/feature/EXECUTION-PLAN.md` (Accountable: agents/demo-deployment-agent.chatmode.md)

---

## Dependencies and Execution Order

### Phase Dependencies

- Phase 1 (Setup) -> no dependencies.
- Phase 2 (Foundational) -> depends on Phase 1 completion.
- Phases 3-7 (US1-US5) -> all depend on Phase 2 completion.
- Phase 8 (Polish) -> depends on completion of all selected user story phases.

### User Story Dependencies

- US1 -> depends only on Foundational phase.
- US2 -> depends only on Foundational phase.
- US3 -> depends on Foundational phase; can run in parallel with US2 after shared reporting primitives exist.
- US4 -> depends on Foundational phase; should be completed before final sign-off of US1-US3-US5.
- US5 -> depends on Foundational phase and US3 reporting aggregates.

### Recommended Completion Order

1. US1 (MVP district dashboard)
2. US2 (approval and adoption governance)
3. US3 (hierarchical reports and export)
4. US4 (full RBAC hardening and scope parity validation)
5. US5 (peer benchmarking and collaboration)

---

## Parallel Execution Opportunities

### US1

- Run T015 and T016 in parallel.
- Run T017 while UI shell work for T019 starts.

### US2

- Run T023 and T024 in parallel.
- Run T025 and T028 in parallel, then integrate via T026/T027.

### US3

- Run T031 and T032 in parallel.
- Run T033 and T034 in parallel, then wire endpoints via T035/T036.

### US4

- Run T039 and T040 in parallel.
- Run T042 and T043 in parallel after T041.

### US5

- Run T046 and T047 in parallel.
- Run T048 and UI task T050 in parallel before integrating T049/T051.

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 (Phase 3).
3. Validate US1 independent checkpoint (T022) and demonstrate district visibility without leakage.

### Incremental Delivery

1. Add US2 for governance and adoption telemetry.
2. Add US3 for hierarchical reporting/export.
3. Add US4 for strict scope parity and transition hardening.
4. Add US5 for benchmarking and collaboration.
5. Finish with Phase 8 cross-cutting validation and readiness handoff.

### Validation Gates

- Scope enforcement validation gate: T014, T040, T054.
- Approval-chain audit gate: T030.
- Anti-leakage gate: T034, T052, T054.
- Independent story checkpoint gate: T022 and scenario checks in each user story phase.
