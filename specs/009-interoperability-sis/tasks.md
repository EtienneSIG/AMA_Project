# Tasks: Interoperability - SCORM, xAPI, SIS Integration

**Input**: Design documents from `/specs/009-interoperability-sis/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/interoperability-contracts.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description with file path`

## Implementation note (avoid overwrites)

This feature is mostly **greenfield** (new integration adapters), but it wires routes into existing servers that must be extended additively.

- **Mirror rule**: `demo/apps/_shared/` is the source of truth for `db/schema.sql`, `db/index.js`, `auth.js`, `contentSafety.js`. Edit only `_shared/` then run `demo/apps/_shared/sync.ps1`; never edit a per-app mirror directly (incl. `demo/apps/admin/db/*`).
- **EXTEND additively**: `demo/apps/_shared/{server.js, db/schema.sql, db/index.js}`; `demo/apps/admin/server.js`; `demo/apps/learner-web/server.js` + `public/index.html`; `demo/apps/teacher-console/server.js`; `demo/scripts/acceptance_tests.ps1`.
- **Safe to create (new)**: all of `_shared/integrations/*` and `_shared/security/secret-provider.js`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish feature scaffolding, runbook wiring, and baseline verification entry points.

**Accountable Agents**: `agents/edtech-program-orchestrator.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

- [x] T001 Create interoperability execution baseline and task ledger in specs/009-interoperability-sis/tasks.md and specs/009-interoperability-sis/quickstart.md (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T002 [P] Add feature toggles and EU-region defaults for interoperability connectors in demo/apps/_shared/server.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T003 [P] Add acceptance test placeholders for SCORM, xAPI, SIS, SSO, calendar, and GDPR export flows in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T004 [P] Add interoperability traceability matrix for FR-001 to FR-010 and SC-001 to SC-007 in specs/009-interoperability-sis/plan.md (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T005 [P] Add connector audit event catalog and correlation requirements in specs/009-interoperability-sis/contracts/interoperability-contracts.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build controls and shared infrastructure required by every integration story.

**Critical Gate**: No user story implementation begins until credentials, EU-only endpoint enforcement, external API audit logging, and retry/fallback controls are complete.

**Accountable Agents**: `agents/eu-ai-act-compliance-officer.chatmode.md`, `agents/gdpr-children-data-specialist.chatmode.md`, `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/responsible-ai-evaluator.chatmode.md`

- [x] T006 Extend interoperability entities (IntegrationConfig, ExternalApiAuditEvent, SCORMPackage, SCORMAttempt, XAPIStatementEnvelope, SISSyncJob, SISConflict, SSOIdentityLink, CalendarSyncEvent, DueDateAdjustment, DataExportRequest) in demo/apps/_shared/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T007 [P] Add admin integration tables, indexes, and conflict queue relations in demo/apps/admin/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T008 [P] Implement managed-identity secret provider and Key Vault reference resolver in demo/apps/_shared/security/secret-provider.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T009 [P] Implement integration config persistence helpers without plaintext secret storage in demo/apps/admin/db/index.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T010 [P] Implement EU-only endpoint validator for connector onboarding and runtime call guards in demo/apps/_shared/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T011 Implement immutable external API audit writer with correlation ID propagation in demo/apps/_shared/db/index.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T012 [P] Implement shared retry/backoff and dead-letter utility for partner API calls in demo/apps/_shared/integrations/retry-policy.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T013 [P] Implement fallback-mode helpers to preserve learner core access during connector outages in demo/apps/_shared/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T014 [P] Implement integration health probe runner and status transitions in demo/apps/admin/server.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T015 [P] Implement redaction and payload-hash utilities for outbound integration logs in demo/apps/_shared/integrations/audit-redaction.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T016 Add foundational verification for credential leakage prevention, EU-endpoint blocking, and external-call audit completeness in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: Foundation complete when all connectors require Key Vault secret references, non-EU endpoints fail closed, all external requests are audit logged, and retry/dead-letter/fallback controls are active.

---

## Phase 3: User Story 1 - SCORM Playback and Completion Tracking (Priority: P1) 🎯 MVP

**Goal**: Admins onboard SCORM 1.2/2004 packages and learners complete assignable SCORM activities with persisted outcomes.

**Independent Test Checkpoint**: Upload one SCORM 1.2 package, assign to learner, complete activity, and persist score/status/time within 5 seconds p95.

**Accountable Agents**: `agents/learning-sciences-expert.chatmode.md`, `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 1

- [x] T017 [P] [US1] Add contract test for POST /api/admin/scorm/packages in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T018 [P] [US1] Add contract test for POST /api/learner/scorm/{packageId}/launch in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T019 [P] [US1] Add integration test for SCORM completion commit and p95 persistence target in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 1

- [x] T020 [US1] Implement SCORM package manifest parse/upload adapter in demo/apps/_shared/integrations/scorm-adapter.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T021 [US1] Implement SCORM package metadata and lifecycle DB helpers in demo/apps/admin/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T022 [US1] Implement admin SCORM onboarding and parse-enable endpoints in demo/apps/admin/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T023 [US1] Implement learner SCORM launch and commit endpoints with validation in demo/apps/learner-web/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T024 [US1] Implement SCORM player shell UI and return-to-course flow in demo/apps/learner-web/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T025 [US1] Emit audit events for scorm_package_uploaded, scorm_launch, scorm_commit, and scorm_parse_failed in demo/apps/learner-web/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T026 [US1] Implement SCORM CDN resource failure fallback handling and learner-safe messaging in demo/apps/_shared/integrations/scorm-adapter.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: User Story 1 is complete when SCORM onboarding/playback/commit are end-to-end functional with resilient fallback behavior and auditable outcomes.

---

## Phase 4: User Story 2 - xAPI Capture and LRS Integration (Priority: P1)

**Goal**: Learner actions are translated to xAPI statements and delivered asynchronously to the configured LRS with retries and dead-letter visibility.

**Independent Test Checkpoint**: Learner completes a quiz, xAPI statement is queued and delivered; forced outage triggers retry and dead-letter record while learner flow remains unblocked.

**Accountable Agents**: `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/responsible-ai-evaluator.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 2

- [x] T027 [P] [US2] Add contract test for xapi.statement.created queue payload in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T028 [P] [US2] Add integration test for xAPI async delivery and >=95% success target in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T029 [P] [US2] Add failure-path test for retry backoff and dead-letter enqueue in demo/scripts/acceptance_tests.ps1 (Accountable: agents/responsible-ai-evaluator.chatmode.md)

### Implementation for User Story 2

- [x] T030 [US2] Implement xAPI statement builder and schema validator in demo/apps/_shared/integrations/xapi-adapter.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T031 [US2] Implement pseudonymous actor mapping and minimization rules for xAPI payloads in demo/apps/_shared/integrations/xapi-adapter.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T032 [US2] Implement xAPI queue persistence and delivery status tracking in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T033 [US2] Implement LRS delivery worker with retry/dead-letter integration in demo/apps/_shared/integrations/xapi-worker.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T034 [US2] Implement teacher analytics aggregate proxy endpoint for LRS completion insights in demo/apps/teacher-console/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T035 [US2] Emit audit events for xapi_statement_built, xapi_delivery_attempted, xapi_delivery_failed, and xapi_dead_lettered in demo/apps/_shared/integrations/xapi-worker.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: User Story 2 is complete when xAPI capture and delivery are reliable, privacy-minimized, and independently testable under both success and failure conditions.

---

## Phase 5: User Story 3 - SIS Roster Sync and SSO Federation (Priority: P1)

**Goal**: Daily SIS sync updates roster/class membership and SSO links identities while preserving consent gates and conflict oversight.

**Independent Test Checkpoint**: Add learner in SIS, run sync, learner/class records update idempotently, identity conflict enters review queue, and learner login through SSO links to the correct account.

**Accountable Agents**: `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/gdpr-children-data-specialist.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 3

- [x] T036 [P] [US3] Add contract test for POST /api/admin/sis/sync and GET /api/admin/sis/sync/{jobId} in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T037 [P] [US3] Add integration test for idempotent roster upsert and enrollment updates in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T038 [P] [US3] Add integration test for conflict queue creation and manual resolution in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T039 [P] [US3] Add integration test for SSO login mapping and under-16 consent gate enforcement in demo/scripts/acceptance_tests.ps1 (Accountable: agents/gdpr-children-data-specialist.chatmode.md)

### Implementation for User Story 3

- [x] T040 [US3] Implement SIS adapter for delta/full sync pull and checksum tracking in demo/apps/_shared/integrations/sis-adapter.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T041 [US3] Implement SIS sync job orchestration and idempotent upsert DB helpers in demo/apps/admin/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T042 [US3] Implement SIS sync trigger/status/conflict resolution endpoints in demo/apps/admin/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T043 [US3] Implement SSO federation metadata validation and claim-map persistence in demo/apps/_shared/integrations/sso-federation.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T044 [US3] Implement SSO connector onboarding and callback linkage routes in demo/apps/admin/server.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T045 [US3] Implement identity-link DB helpers and revocation lifecycle in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T046 [US3] Emit audit events for sis_sync_started, sis_sync_completed, sis_conflict_opened, sso_link_created, and sso_login_linked in demo/apps/admin/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: User Story 3 is complete when roster sync/SSO federation are idempotent, reviewable, consent-aware, and independently testable.

---

## Phase 6: User Story 4 - Calendar Sync and Assignment Due-Date Guardrails (Priority: P1)

**Goal**: School calendar closures are synchronized and assignment due dates are adjusted safely with teacher oversight.

**Independent Test Checkpoint**: Assignment due date on closure day is adjusted to the next school-open day or explicitly confirmed by teacher; learner UI reflects adjusted date.

**Accountable Agents**: `agents/learning-sciences-expert.chatmode.md`, `agents/content-localisation-lead.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 4

- [x] T047 [P] [US4] Add contract test for POST /api/admin/calendar/sync in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T048 [P] [US4] Add integration test for due-date auto-adjust behavior on closure days in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T049 [P] [US4] Add integration test for teacher confirmation path on ambiguous closure events in demo/scripts/acceptance_tests.ps1 (Accountable: agents/learning-sciences-expert.chatmode.md)

### Implementation for User Story 4

- [x] T050 [US4] Implement calendar provider adapter and school-day normalization in demo/apps/_shared/integrations/calendar-adapter.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T051 [US4] Implement calendar sync ingestion and normalized event persistence in demo/apps/admin/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T052 [US4] Implement admin calendar sync route and health status response in demo/apps/admin/server.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T053 [US4] Implement assignment due-date adjustment policy and teacher-confirmation workflow in demo/apps/teacher-console/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T054 [US4] Implement learner due-date rendering aligned to school-day model in demo/apps/learner-web/server.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T055 [US4] Emit audit events for calendar_sync_ingested, due_date_adjusted, and due_date_override_confirmed in demo/apps/teacher-console/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: User Story 4 is complete when calendar-driven due-date guardrails are accurate, teacher-overseen, and independently testable.

---

## Phase 7: User Story 5 - GDPR Data Export and Portability (Priority: P1)

**Goal**: Authorized staff can fulfill GDPR Art. 15 requests with complete encrypted export packages and auditable delivery.

**Independent Test Checkpoint**: Export request produces encrypted ZIP (CSV/PDF/README), secure 7-day link, and completion within SLA tracking with no plaintext sensitive data leakage.

**Accountable Agents**: `agents/gdpr-children-data-specialist.chatmode.md`, `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 5

- [x] T056 [P] [US5] Add contract test for POST /api/admin/exports and GET /api/admin/exports/{requestId} in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T057 [P] [US5] Add integration test for export package structure (CSV/PDF/README) and encryption enforcement in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T058 [P] [US5] Add integration test for secure link expiry and access revocation behavior in demo/scripts/acceptance_tests.ps1 (Accountable: agents/gdpr-children-data-specialist.chatmode.md)

### Implementation for User Story 5

- [x] T059 [US5] Implement GDPR export orchestration adapter for collection, packaging, and delivery lifecycle in demo/apps/_shared/integrations/gdpr-export.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T060 [US5] Implement export request lifecycle DB helpers and SLA tracking fields in demo/apps/admin/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T061 [US5] Implement export admin trigger/status routes with authorization checks in demo/apps/admin/server.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T062 [US5] Implement encrypted ZIP generation and expiring secure-link delivery pipeline in demo/apps/_shared/integrations/gdpr-export.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T063 [US5] Emit audit events for gdpr_export_requested, gdpr_export_packaged, gdpr_export_delivered, and gdpr_export_expired in demo/apps/admin/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T064 [US5] Implement large-export asynchronous fallback path and operator notification hooks in demo/apps/_shared/integrations/gdpr-export.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: User Story 5 is complete when GDPR exports are complete, encrypted, time-bounded, and independently testable including large-package fallback.

---

## Phase 8: Polish & Cross-Cutting Compliance

**Purpose**: Final reliability hardening, compliance evidence, and deployment readiness across all stories.

**Accountable Agents**: `agents/eu-ai-act-compliance-officer.chatmode.md`, `agents/gdpr-children-data-specialist.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`, `agents/demo-deployment-agent.chatmode.md`

- [x] T065 [P] Add AI Act Art. 12 and Art. 15 interoperability evidence checklist with traceability links in specs/009-interoperability-sis/checklists/ai-act.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T066 [P] Add GDPR Art. 8 and Art. 15 export/identity compliance checklist in specs/009-interoperability-sis/checklists/gdpr.md (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T067 [P] Add EU-only data-flow and processor DPA evidence checklist in specs/009-interoperability-sis/checklists/eu-data-flow.md (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T068 Add external partner outage simulation matrix with fallback/retry assertions in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T069 [P] Add performance assertions for SCORM commit p95, SIS sync duration, xAPI delivery rate, and SSO success in demo/scripts/acceptance_tests.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T070 Add quickstart end-to-end validation sequence for steps 1-7 with audit verification in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T071 Add final cross-agent compliance sign-off log (RAI evaluator and QA verifier) in specs/009-interoperability-sis/checklists/sign-off.md (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T072 Add deployment readiness notes and rollback controls for interoperability rollout in demo/DEPLOYMENT-STATE.md (Accountable: agents/demo-deployment-agent.chatmode.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no prerequisites.
- Foundational (Phase 2) depends on Setup and blocks all user stories.
- User stories (Phases 3-7) depend on Foundational completion.
- Polish (Phase 8) depends on completion of selected user stories.

### User Story Dependencies

1. US1 (SCORM) starts first after Foundational because it establishes package and learner completion baselines.
2. US2 (xAPI) depends on US1 learner event generation paths for statement coverage.
3. US3 (SIS + SSO) can run in parallel with late US2 tasks after Foundational; identity and roster baselines feed calendar and export access controls.
4. US4 (Calendar) depends on US3 class/enrollment freshness and teacher assignment flows.
5. US5 (GDPR Export) depends on US1-US4 data pipelines to ensure complete portability output.

### Dependency-Ordered Story Graph

1. US1
2. US2 and US3 (parallel after US1 event baseline)
3. US4 (after US3 roster/calendar subject mappings)
4. US5 (after US1-US4 data completeness)

### Within-Story Ordering Rules

- Tests first, then implementation.
- Adapters and DB helpers before routes.
- Routes before UI/path integration.
- Audit and fallback controls before story checkpoint closure.

## Parallel Opportunities

- Setup: T002, T003, T004, T005 can run in parallel.
- Foundational: T007, T008, T009, T010, T012, T013, T014, T015 can run in parallel after T006 begins.
- US1: T017, T018, T019 can run in parallel.
- US2: T027, T028, T029 can run in parallel.
- US3: T036, T037, T038, T039 can run in parallel.
- US4: T047, T048, T049 can run in parallel.
- US5: T056, T057, T058 can run in parallel.
- Polish: T065, T066, T067, T069 can run in parallel.

## Parallel Example: US3

- Execute T036, T037, T038, and T039 in parallel in demo/scripts/acceptance_tests.ps1.
- Execute T040 and T043 in parallel, then T041 and T045 in parallel, then complete T042, T044, and T046.

## Implementation Strategy

### MVP First

1. Complete Setup (Phase 1).
2. Complete Foundational (Phase 2).
3. Deliver US1 (Phase 3) and validate SCORM checkpoint.
4. Deliver US2 and US3 for event portability and identity/roster automation.
5. Demo MVP with SCORM + SIS/SSO + xAPI operational baseline.

### Incremental Delivery

1. Add US4 for calendar-aware scheduling guardrails.
2. Add US5 for GDPR export fulfillment.
3. Finish with Phase 8 compliance evidence and reliability hardening.

### Compliance-First Exit Criteria

- All connector credentials are resolved from Key Vault references only.
- All external API calls are correlation-ID traced and immutable-audited.
- Non-EU endpoints are blocked at validation and runtime.
- Partner outages trigger retry/dead-letter/fallback without blocking learner core flows.
- GDPR export and EU data-flow evidence checklists pass with documented sign-off.
