# Tasks: Teacher Assessment, AI Rubric Assist, and At-Risk Dashboards

**Input**: Design documents from `/specs/008-teacher-assessment/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/teacher-assessment.md, quickstart.md

> **Implementation note (avoid overwrites)**: `demo/apps/_shared/` is the source of truth for `db/schema.sql`, `db/index.js`, `auth.js`, and `contentSafety.js`; per-app copies are mirrors produced by `demo/apps/_shared/sync.ps1`. Edit `_shared/` only, then run sync — never edit a per-app mirror directly. The `content_safety_results` table, `logContentSafety()` helper, and `contentSafety.js` client already exist — REUSE them rather than duplicating. No rubric/assessment/remediation/AI-generation code exists yet, so those tables and routes are safe to add.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description with file path`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align feature scaffolding, acceptance harness, and compliance work surfaces before implementation.

**Accountable Agents**: `agents/edtech-program-orchestrator.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

- [ ] T001 Create feature task baseline and execution notes in specs/008-teacher-assessment/tasks.md and specs/008-teacher-assessment/quickstart.md (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T002 [P] Add teacher-assessment feature configuration and EU-region defaults in demo/apps/_shared/server.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T003 [P] Add feature-level acceptance test placeholders for rubric, library, remediation, AI approval gate, and dashboard paths in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T004 [P] Add feature-level audit event catalog section for high-risk AI actions in specs/008-teacher-assessment/contracts/teacher-assessment.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T004a [P] Author the Annex IV technical-file fragment for the assessment-generation capability (intended purpose, non-autonomous nature, generation + Content Safety pipeline, Art. 9 risk outcomes, Art. 10 data classes, Art. 14 oversight workflow, Art. 12/15 logging and robustness controls) in specs/008-teacher-assessment/contracts/annex-iv-fragment.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T005 [P] Add implementation traceability table for FR-001 to FR-010 and SC-001 to SC-007 in specs/008-teacher-assessment/plan.md (Accountable: agents/edtech-program-orchestrator.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build mandatory compliance and platform controls that block all story work until complete.

**Accountable Agents**: `agents/eu-ai-act-compliance-officer.chatmode.md`, `agents/gdpr-children-data-specialist.chatmode.md`, `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/responsible-ai-evaluator.chatmode.md`

**Critical Gate**: No user story implementation starts until teacher-approval gate, Content Safety flow, shared-template governance, and full audit logging are in place.

- [ ] T006 Extend canonical entities (Rubric, RubricScore, SharedAssessment, AssessmentCopy, RemediationGroup, RemediationProgress, AIGeneratedArtifact, ContentSafetyVerdict, TeacherApproval, AtRiskDashboardSnapshot, AuditLogEvent, TemplateCacheEntry) in demo/apps/_shared/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md) — **EXISTING SCHEMA (~432 lines): ADD new tables only. The `content_safety_results` table already exists — reuse it for ContentSafetyVerdict (or reference it) instead of creating a duplicate. Edit _shared/ only, then run sync.ps1 to mirror into per-app copies.**
- [ ] T007 [P] Add teacher-console feature tables and indexes for assessment workflows in demo/apps/teacher-console/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T008 [P] Add shared DB helper methods for generated artifact lifecycle, teacher approvals, and dashboard snapshots in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T009 [P] Add teacher-console DB helpers for rubric scoring, copy lineage, remediation tracking, and export reads in demo/apps/teacher-console/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T010 Implement immutable audit writer and correlation ID propagation for required event set in demo/apps/_shared/db/index.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T011 [P] Implement prohibited-practice request validator (Art. 5 checks) for generation intents in demo/apps/_shared/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T011a [P] Author the Art. 9 risk-management register for assessment generation (hallucinated/biased content, age-inappropriate output, teacher automation bias, prompt injection) with mitigation + residual-risk acceptance in specs/008-teacher-assessment/contracts/risk-register.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T011b [P] Document and enforce the Art. 10 data-governance register (approved generated-artifact data classes, quality/relevance/bias-monitoring expectations, retention) covering AIGeneratedArtifact, ContentSafetyVerdict, and lineage metadata in demo/apps/_shared/db/index.js and specs/008-teacher-assessment/data-model.md (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T011c Implement Art. 15 robustness controls for generation endpoints: input validation, prompt-injection hardening on learner-supplied context, fail-closed behavior when Content Safety is unavailable, and deterministic refusal on flagged output in demo/apps/_shared/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T012 [P] Implement Azure OpenAI generation client wrapper with model/version capture in demo/apps/_shared/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T013 [P] Implement Azure Content Safety scan orchestration for generated drafts and teacher feedback text in demo/apps/_shared/server.js (Accountable: agents/responsible-ai-evaluator.chatmode.md) — **REUSE EXISTING: the Content Safety client `demo/apps/_shared/contentSafety.js` (~63 lines) and the `logContentSafety()` helper + `content_safety_results` table already exist. Wrap/extend them for generation-draft and feedback scanning; do not re-implement the client or logging table.**
- [ ] T014 Implement mandatory teacher-approval gate utility that blocks assignment linkage without approval in demo/apps/_shared/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T015 [P] Implement template-cache governance helpers (owner, review status, deprecation, version pinning) in demo/apps/_shared/db/index.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T016 [P] Add transparency metadata formatter for AI-assisted artifacts in demo/apps/_shared/server.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T017 Add GDPR data-minimization and retention helper for prompt hash and bounded context storage in demo/apps/_shared/db/index.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T018 Add foundational verification checks for approval-gate bypass prevention, content-safety enforcement, and audit completeness in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: Foundation complete when generation calls are policy-validated, every learner-visible text path is safety-scanned, audit events are immutable, and assignment publication is impossible without teacher approval.

---

## Phase 3: User Story 1 - Rubric-Based Assessment with Qualitative Feedback (Priority: P0) 🎯 MVP

**Goal**: Teachers create rubrics, grade submissions with criterion scores, add qualitative feedback, and view at-risk flags.

**Independent Test Checkpoint**: Teacher creates 4-level rubric with 3 criteria, grades 5 submissions with feedback, and receives grade distribution plus at-risk list with no feedback submission accepted before Content Safety verdict.

**Accountable Agents**: `agents/learning-sciences-expert.chatmode.md`, `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 1

- [ ] T019 [P] [US1] Add contract test for POST /api/teacher/assessments/rubrics in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T020 [P] [US1] Add integration test for rubric grading and qualitative feedback safety scan flow in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T021 [P] [US1] Add integration test for at-risk flagging threshold behavior in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 1

- [ ] T022 [US1] Implement rubric authoring route with 3-5 levels and 2-5 criteria validation in demo/apps/teacher-console/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T023 [US1] Implement rubric persistence and publish-state transition helpers in demo/apps/teacher-console/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T024 [US1] Implement rubric scoring endpoint with criterion-level capture and mastery percent calculation in demo/apps/teacher-console/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T025 [US1] Implement qualitative feedback submission flow with mandatory Content Safety check in demo/apps/teacher-console/server.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T026 [US1] Implement rubric grading summary endpoint with distribution and at-risk learners in demo/apps/teacher-console/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T027 [US1] Implement rubric creation, scoring, and summary UI interactions in demo/apps/teacher-console/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T028 [US1] Emit audit events for rubric_created, rubric_scored, feedback_submitted, and at_risk_flagged in demo/apps/teacher-console/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T029 [US1] Add approved-only assignment read guard for rubric-linked learner views in demo/apps/learner-web/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: User Story 1 is complete when rubric grading is end-to-end functional and independently testable with safety-scanned feedback and auditable actions.

---

## Phase 4: User Story 5 - Assessment Analytics and At-Risk Dashboard (Priority: P0)

**Goal**: Teachers view mastery, completion, at-risk reasons, and intervention suggestions without autonomous action.

**Independent Test Checkpoint**: Dashboard loads with mastery and completion metrics, at-risk learner table, and advisory interventions for one class in under target latency and without mutating assignments.

**Accountable Agents**: `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/learning-sciences-expert.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 5

- [ ] T030 [P] [US5] Add contract test for GET /api/teacher/analytics/at-risk in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T031 [P] [US5] Add integration test for at-risk reason codes and ungraded submission counts in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T032 [P] [US5] Add non-mutation guard test to confirm analytics endpoint does not trigger assignment changes in demo/scripts/acceptance_tests.ps1 (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

### Implementation for User Story 5

- [ ] T033 [US5] Implement dashboard snapshot query helpers for mastery, completion, at-risk counts, and reasons in demo/apps/teacher-console/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T034 [US5] Implement at-risk analytics API route with advisory-only intervention payload in demo/apps/teacher-console/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T035 [US5] Implement teacher dashboard UI panels for mastery, completion, at-risk learners, and ungraded counts in demo/apps/teacher-console/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T036 [US5] Implement learner drill-down route for recent activity and topic mastery history in demo/apps/teacher-console/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T037 [US5] Emit dashboard_viewed and intervention_suggested advisory audit events in demo/apps/teacher-console/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: User Story 5 is complete when analytics data is accurate, advisory-only, and independently testable without side effects.

---

## Phase 5: User Story 2 - Shared Library and Reaffectation Workflow (Priority: P1)

**Goal**: Teachers publish, discover, copy, and customize shared assessments while preserving copy isolation and governance.

**Independent Test Checkpoint**: Teacher A shares an assessment, Teacher B copies and customizes it, source remains unchanged, and usage lineage is visible.

**Accountable Agents**: `agents/learning-sciences-expert.chatmode.md`, `agents/content-localisation-lead.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 2

- [ ] T038 [P] [US2] Add contract test for POST /api/teacher/library/{sharedAssessmentId}/copy in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T039 [P] [US2] Add integration test for copy isolation and source-version lineage in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T040 [P] [US2] Add integration test for library search/filter tags and usage counters in demo/scripts/acceptance_tests.ps1 (Accountable: agents/learning-sciences-expert.chatmode.md)

### Implementation for User Story 2

- [ ] T041 [US2] Implement shared-assessment publish route with curriculum tags and governance owner metadata in demo/apps/teacher-console/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T042 [US2] Implement shared library search/filter/read endpoints in demo/apps/teacher-console/server.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [ ] T043 [US2] Implement copy-to-class route preserving source lineage and copy isolation in demo/apps/teacher-console/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T044 [US2] Implement copy customization persistence (due date, local edits, curriculum mapping) in demo/apps/teacher-console/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T045 [US2] Implement shared library browse, copy, and customize UI flows in demo/apps/teacher-console/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T046 [US2] Emit audit events for shared_published, shared_library_copied, and copy_customized in demo/apps/teacher-console/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T047 [US2] Add governance checklist for pedagogical sign-off, owner review, and template deprecation policy in specs/008-teacher-assessment/checklists/governance.md (Accountable: agents/learning-sciences-expert.chatmode.md)

**Checkpoint**: User Story 2 is complete when copied assessments are isolated, discoverable, governed, and independently testable.

---

## Phase 6: User Story 3 - Remediation and Grouping Workflow (Priority: P1)

**Goal**: Teachers create remediation groups, assign multi-step sequences, track progress, and clear learners on reassessment.

**Independent Test Checkpoint**: Teacher forms a group from at-risk learners, assigns reteach-practice-reassess sequence, and sees remediation-cleared status when threshold is met.

**Accountable Agents**: `agents/learning-sciences-expert.chatmode.md`, `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 3

- [ ] T048 [P] [US3] Add contract test for POST /api/teacher/remediation/groups in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T049 [P] [US3] Add integration test for teacher-confirmed group membership and sequence assignment in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T050 [P] [US3] Add integration test for reassessment threshold and remediation-cleared transition in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 3

- [ ] T051 [US3] Implement remediation group creation endpoint with teacher-confirmed membership enforcement in demo/apps/teacher-console/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T052 [US3] Implement remediation sequence assignment and per-learner progress persistence in demo/apps/teacher-console/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T053 [US3] Implement remediation progress and clearance update routes in demo/apps/teacher-console/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T054 [US3] Implement learner catch-up path labeling for targeted assignments in demo/apps/learner-web/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T055 [US3] Implement remediation management UI (grouping, sequence, progress, clearance) in demo/apps/teacher-console/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T056 [US3] Emit audit events for remediation_group_created, remediation_progress_updated, and remediation_cleared in demo/apps/teacher-console/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: User Story 3 is complete when remediation workflows are teacher-driven, trackable, and independently testable.

---

## Phase 7: User Story 4 - AI-Assisted Question and Rubric Generation (Priority: P2)

**Goal**: Teachers generate AI drafts, review/edit/reject/approve them, and publish only approved artifacts with full traceability.

**Independent Test Checkpoint**: Teacher generates a 5-question draft, edits two items, approves one artifact, rejects another, and only approved artifact can be assigned while complete audit lineage is present.

**Accountable Agents**: `agents/responsible-ai-evaluator.chatmode.md`, `agents/eu-ai-act-compliance-officer.chatmode.md`, `agents/privacy-preserving-ml-engineer.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`

### Tests for User Story 4

- [ ] T057 [P] [US4] Add contract test for POST /api/teacher/assessments/generate in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T058 [P] [US4] Add contract test for POST /api/teacher/assessments/generated/{artifactId}/decision in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T059 [P] [US4] Add integration test for mandatory teacher approval before assignment publication in demo/scripts/acceptance_tests.ps1 (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T060 [P] [US4] Add integration test for Content Safety flag handling and explicit teacher acknowledgment path in demo/scripts/acceptance_tests.ps1 (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T061 [P] [US4] Add integration test for audit payload completeness (model version, prompt hash, edits, decision timestamp) in demo/scripts/acceptance_tests.ps1 (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

### Implementation for User Story 4

- [ ] T062 [US4] Implement AI generation route using prohibited-practice checks, template cache lookup, and OpenAI invocation in demo/apps/teacher-console/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T063 [US4] Implement generation response persistence with safety verdict capture and draft lifecycle state in demo/apps/teacher-console/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T064 [US4] Implement teacher decision endpoint (approve, reject, needs_edit) with immutable TeacherApproval records in demo/apps/teacher-console/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T065 [US4] Implement assignment publication gate that requires approved_for_assignment and passing safety status in demo/apps/teacher-console/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T066 [US4] Implement AI draft review UI with flag-weak, edit, reject, approve, and transparency labels in demo/apps/teacher-console/public/index.html (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T067 [US4] Implement privacy-preserving weak-item feedback capture for aggregate model improvement signals in demo/apps/teacher-console/server.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T068 [US4] Emit audit events for generation_requested, generation_completed, content_safety_flagged, teacher_decision_recorded, and assignment_published in demo/apps/teacher-console/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: User Story 4 is complete when AI drafts are fully governed, non-bypassable, and independently testable end-to-end.

---

## Phase 8: Polish and Cross-Cutting Compliance

**Purpose**: Final hardening across all stories for AI Act, GDPR, governance, quality, and readiness.

**Accountable Agents**: `agents/eu-ai-act-compliance-officer.chatmode.md`, `agents/gdpr-children-data-specialist.chatmode.md`, `agents/responsible-ai-evaluator.chatmode.md`, `agents/cross-agent-qa-verifier.chatmode.md`, `agents/demo-deployment-agent.chatmode.md`

- [ ] T069 [P] Add AI Act Article 12/13/14 evidence checklist and traceability references in specs/008-teacher-assessment/checklists/ai-act.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T070 [P] Add GDPR Art. 8 and data-retention/erasure verification checklist for generated artifacts in specs/008-teacher-assessment/checklists/gdpr.md (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T071 [P] Add prohibited-practice negative test matrix for Art. 5 exclusions in specs/008-teacher-assessment/checklists/prohibited-practices.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T072 Add end-to-end acceptance sequence for quickstart steps 1-13, including audit verification, in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T073 [P] Add performance assertions for generation p95, dashboard load p95, and at-risk refresh p95 in demo/scripts/acceptance_tests.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T074 Add final cross-agent sign-off evidence log (RAI evaluator and QA verifier) in specs/008-teacher-assessment/checklists/sign-off.md (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T075 Add deployment readiness notes for teacher-console and learner-web feature rollout in demo/DEPLOYMENT-STATE.md (Accountable: agents/demo-deployment-agent.chatmode.md)

---

## Dependencies and Execution Order

### Phase Dependencies

- Setup (Phase 1) has no prerequisites.
- Foundational (Phase 2) depends on Setup and blocks all user stories.
- User stories depend on Foundational completion.
- Polish (Phase 8) depends on completion of all selected user stories.

### User Story Dependencies

- US1 (P0) depends on Foundational and can start first (MVP core).
- US5 (P0) depends on Foundational and US1 scoring data paths.
- US2 (P1) depends on Foundational and can run in parallel with US5 after US1 baseline entities are active.
- US3 (P1) depends on Foundational and US1/US5 at-risk signals.
- US4 (P2) depends on Foundational and integrates with US1/US2 publication flows.

### Dependency-Ordered Story Graph

1. US1
2. US5 and US2 (parallel after US1 data baseline)
3. US3 (after US5 at-risk paths)
4. US4 (after shared governance and assessment publication flows)

### Within-Story Ordering Rules

- Tests first, then implementation.
- Data and DB helpers before routes.
- Routes before UI wiring.
- Audit event emission and compliance assertions before story checkpoint closure.

## Parallel Opportunities

- Setup: T002, T003, T004, T005 can run in parallel.
- Foundational: T007, T008, T009, T011, T012, T013, T015, T016 can run in parallel after T006 baseline begins.
- US1: T019, T020, T021 can run in parallel; T027 can parallelize after T022 and T024 contracts stabilize.
- US5: T030, T031, T032 can run in parallel.
- US2: T038, T039, T040 can run in parallel.
- US3: T048, T049, T050 can run in parallel.
- US4: T057, T058, T059, T060, T061 can run in parallel.
- Polish: T069, T070, T071, T073 can run in parallel.

## Parallel Example: US4

- Execute T057, T058, T059, T060, and T061 in parallel in demo/scripts/acceptance_tests.ps1.
- Execute T062 and T063 in sequence, then run T066 in parallel with T067.

## Implementation Strategy

### MVP First

1. Complete Setup (Phase 1).
2. Complete Foundational (Phase 2).
3. Deliver US1 (Phase 3) and validate independent checkpoint.
4. Deliver US5 (Phase 4) for at-risk visibility.
5. Demo MVP with teacher rubric + dashboard workflow.

### Incremental Delivery

1. Add US2 for shared-library reuse and governance.
2. Add US3 for remediation orchestration.
3. Add US4 for AI-assisted generation with strict approval gate.
4. Finish with Polish and compliance evidence.

### Compliance-First Exit Criteria

- No learner-visible AI artifact is assignable without TeacherApproval.
- Content Safety scans cover generated artifacts and teacher feedback.
- Audit log reconstructs all high-risk AI and intervention decisions.
- AI Act and GDPR checklists pass with documented sign-off.
