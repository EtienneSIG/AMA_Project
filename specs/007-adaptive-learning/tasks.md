# Tasks: Adaptive Learning — Next-Best-Activity, Catch-Up & Stretch

**Input**: Design documents from `/specs/007-adaptive-learning/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), `contracts/` (currently empty)

**Tests**: Test tasks are included because the feature spec requires independent test scenarios and compliance verification.

**Organization**: Tasks are grouped by phase (Setup, Foundational, User Stories, Polish) and ordered by dependencies.

## Implementation note (avoid overwrites)

This feature is mostly **greenfield**, but two existing files must be extended additively.

- **Mirror rule**: `demo/apps/_shared/` is the source of truth for `db/schema.sql`, `db/index.js`, `auth.js`, `contentSafety.js`. Edit only `_shared/` then run `demo/apps/_shared/sync.ps1`; never edit a per-app mirror directly.
- **EXTEND additively**: `demo/apps/_shared/db/schema.sql` and `db/index.js` (add adaptive tables/queries, then sync); `demo/apps/learner-web/server.js` (wire routes only — keep new logic in `server-adaptive.js`).
- **Safe to create (new)**: everything under `_shared/adaptive/*`, `_shared/auth/hierarchy.js`, learner-web & teacher-console `adaptive.js` / `server-adaptive.js` / `tests/*`, `learner.html`, `analytics.html`, `verify-adaptive.ps1`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create missing design artifacts and baseline scaffolding for implementation planning and traceability.

- [x] T001 Create adaptive research baseline document in specs/007-adaptive-learning/research.md (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T002 [P] Create adaptive data model specification in specs/007-adaptive-learning/data-model.md (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T003 [P] Create adaptive quickstart end-to-end scenarios in specs/007-adaptive-learning/quickstart.md (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T004 [P] Create adaptive API contract draft in specs/007-adaptive-learning/contracts/adaptive-api.md (Accountable: EdTech Program Orchestrator - agents/edtech-program-orchestrator.chatmode.md)
- [x] T005 [P] Create immutable audit logging contract in specs/007-adaptive-learning/contracts/audit-logging.md (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T006 [P] Create AI Act controls checklist for adaptive feature in specs/007-adaptive-learning/checklists/ai-act-controls.md (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T007 [P] Create GDPR Article 8 and children data safeguards checklist in specs/007-adaptive-learning/checklists/gdpr-art8-children-data.md (Accountable: GDPR Children's Data Specialist - agents/gdpr-children-data-specialist.chatmode.md)
- [x] T008 Create task-to-agent accountability matrix in specs/007-adaptive-learning/checklists/accountability-matrix.md (Accountable: EdTech Program Orchestrator - agents/edtech-program-orchestrator.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core adaptive engine, immutable audit infrastructure, compliance guards, and role/scope enforcement that block all user stories.

**CRITICAL**: No user story implementation starts before this phase completes.

- [x] T009 Extend adaptive entity schema and indexes in demo/apps/_shared/db/schema.sql (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T010 Create append-only guardrails for adaptive audit tables in demo/apps/_shared/db/schema.sql (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T011 [P] Add adaptive repository and query helpers in demo/apps/_shared/db/index.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T012 [P] Implement immutable adaptive audit writer utilities in demo/apps/_shared/adaptive/audit.js (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T013 [P] Implement mastery scoring and threshold helpers in demo/apps/_shared/adaptive/helpers.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T014 Implement deterministic adaptive recommendation engine in demo/apps/_shared/adaptive/engine.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T015 [P] Implement anomaly detection and high-intervention detection helpers in demo/apps/_shared/adaptive/helpers.js (Accountable: Responsible AI Evaluator - agents/responsible-ai-evaluator.chatmode.md)
- [x] T016 Implement teacher scope validation and override authorization middleware in demo/apps/_shared/auth/hierarchy.js (Accountable: GDPR Children's Data Specialist - agents/gdpr-children-data-specialist.chatmode.md)
- [x] T017 [P] Add non-adaptive fallback behavior when mastery evidence is unavailable in demo/apps/_shared/adaptive/engine.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T018 [P] Define and version transparency label copy in demo/apps/_shared/adaptive/transparency-labels.js (Accountable: Content Localisation Lead - agents/content-localisation-lead.chatmode.md)
- [x] T019 Implement adaptive telemetry and latency metrics capture in demo/apps/_shared/adaptive/audit.js (Accountable: Responsible AI Evaluator - agents/responsible-ai-evaluator.chatmode.md)
- [x] T020 Record Art. 9-15 implementation mapping for foundational components in specs/007-adaptive-learning/checklists/ai-act-controls.md (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: Foundation complete - adaptive engine, immutable logging, teacher authorization, transparency labels, and compliance guardrails are ready.

---

## Phase 3: User Story 1 - Adaptive Activity Selection Based on Learner Mastery (Priority: P1) 🎯 MVP

**Goal**: Generate transparent next-best recommendations from deterministic mastery thresholds with teacher-visible reasoning.

**Independent Test**: Complete activity at 70% mastery then 85% mastery and verify recommendation progression (peer practice then challenge), transparency label, and teacher-visible reasoning.

### Tests for User Story 1

- [x] T021 [P] [US1] Add unit tests for mastery thresholds and recommendation branching in demo/apps/_shared/adaptive/engine.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T022 [P] [US1] Add integration test for activity completion to adaptive recommendation API in demo/apps/learner-web/tests/integration/adaptive-recommendation.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T023 [US1] Add contract tests for recommendation payload and reasoning fields in demo/apps/learner-web/tests/contract/adaptive-api.contract.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 1

- [x] T024 [US1] Extend activity completion endpoint to invoke adaptive engine in demo/apps/learner-web/server.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T025 [P] [US1] Implement learner adaptive route handlers in demo/apps/learner-web/server-adaptive.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T026 [P] [US1] Add learner-facing transparency label rendering in demo/apps/learner-web/public/adaptive.js (Accountable: Content Localisation Lead - agents/content-localisation-lead.chatmode.md)
- [x] T027 [US1] Update learner activity completion UI with plain-language reason in demo/apps/learner-web/public/learner.html (Accountable: Learning Sciences Expert - agents/learning-sciences-expert.chatmode.md)
- [x] T028 [US1] Add teacher-readable decision detail endpoint in demo/apps/teacher-console/server-adaptive.js (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T029 [US1] Update adaptive API contract for recommendation and reasoning fields in specs/007-adaptive-learning/contracts/adaptive-api.md (Accountable: EdTech Program Orchestrator - agents/edtech-program-orchestrator.chatmode.md)
- [x] T030 [US1] Document independent checkpoint scenario and expected outputs in specs/007-adaptive-learning/quickstart.md (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: User Story 1 independently passes threshold-based recommendation flow with transparency labels and teacher-visible reasoning.

---

## Phase 4: User Story 2 - Catch-Up Pathways with Scaffolded Support (Priority: P1)

**Goal**: Trigger auditable catch-up sequences below 50% mastery with checkpoint advancement logic and teacher escalation path.

**Independent Test**: Run low-mastery (45%) flow to scaffolded sequence and checkpoint, then verify advancement at 75% and re-catch-up/override prompt below 70%.

### Tests for User Story 2

- [x] T031 [P] [US2] Add unit tests for catch-up sequence selection and checkpoint advancement thresholds in demo/apps/_shared/adaptive/helpers.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T032 [P] [US2] Add integration tests for catch-up progression and checkpoint transitions in demo/apps/learner-web/tests/integration/catchup-flow.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T033 [US2] Add audit assertion tests for catch-up decisions and checkpoint events in demo/apps/_shared/adaptive/audit.test.js (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)

### Implementation for User Story 2

- [x] T034 [US2] Implement catch-up sequence retrieval and persistence logic in demo/apps/_shared/adaptive/engine.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T035 [P] [US2] Add catch-up sequence state APIs in demo/apps/learner-web/server-adaptive.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T036 [P] [US2] Build catch-up progress and checkpoint components in demo/apps/learner-web/public/adaptive.js (Accountable: Learning Sciences Expert - agents/learning-sciences-expert.chatmode.md)
- [x] T037 [US2] Add catch-up progression markup and resume entry points in demo/apps/learner-web/public/learner.html (Accountable: Learning Sciences Expert - agents/learning-sciences-expert.chatmode.md)
- [x] T038 [US2] Emit immutable catch-up and checkpoint audit events in demo/apps/_shared/adaptive/audit.js (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T039 [US2] Update quickstart with low-mastery catch-up independent checkpoint procedure in specs/007-adaptive-learning/quickstart.md (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: User Story 2 independently passes scaffolded catch-up and checkpoint advancement with full immutable logging.

---

## Phase 5: User Story 3 - Stretch Activities for High-Performing Learners (Priority: P1)

**Goal**: Detect sustained high mastery and route learners to transparent stretch activities with teacher feedback capture.

**Independent Test**: Submit 3+ consecutive 85%+ performances and verify stretch recommendation, learner label, and teacher feedback capture.

### Tests for User Story 3

- [x] T040 [P] [US3] Add unit tests for stretch qualification and activity selection rules in demo/apps/_shared/adaptive/helpers.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T041 [P] [US3] Add integration test for stretch recommendation and completion flow in demo/apps/learner-web/tests/integration/stretch-flow.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T042 [US3] Add transparency-label tests for stretch messaging in demo/apps/learner-web/tests/unit/transparency-labels.test.js (Accountable: Content Localisation Lead - agents/content-localisation-lead.chatmode.md)

### Implementation for User Story 3

- [x] T043 [US3] Implement stretch opportunity detection in demo/apps/_shared/adaptive/engine.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T044 [P] [US3] Add stretch recommendation rendering and optional hint button logic in demo/apps/learner-web/public/adaptive.js (Accountable: Learning Sciences Expert - agents/learning-sciences-expert.chatmode.md)
- [x] T045 [P] [US3] Add stretch activity markup and reflection prompt to learner UI in demo/apps/learner-web/public/learner.html (Accountable: Learning Sciences Expert - agents/learning-sciences-expert.chatmode.md)
- [x] T046 [US3] Add teacher qualitative feedback write/read route for stretch outcomes in demo/apps/teacher-console/server-adaptive.js (Accountable: EdTech Program Orchestrator - agents/edtech-program-orchestrator.chatmode.md)
- [x] T047 [US3] Log stretch trigger and completion events immutably in demo/apps/_shared/adaptive/audit.js (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T048 [US3] Update quickstart with high-performer independent checkpoint scenario in specs/007-adaptive-learning/quickstart.md (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: User Story 3 independently passes stretch detection, transparency labeling, and teacher feedback visibility.

---

## Phase 6: User Story 4 - Teacher Visibility & Override of Adaptive Paths (Priority: P1)

**Goal**: Provide mandatory teacher-in-the-loop override, full reasoning visibility, override history, and high-intervention alerts.

**Independent Test**: Teacher views adaptive reasoning, applies one-click override with optional reason, and verifies immutable override records plus high-intervention alert at 3+ overrides/topic.

### Tests for User Story 4

- [x] T049 [P] [US4] Add integration tests for teacher override endpoint authorization and scope gating in demo/apps/teacher-console/tests/integration/override-authz.test.js (Accountable: GDPR Children's Data Specialist - agents/gdpr-children-data-specialist.chatmode.md)
- [x] T050 [P] [US4] Add integration tests for override lifecycle and path pause/resume behavior in demo/apps/teacher-console/tests/integration/override-lifecycle.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T051 [US4] Add compliance tests for immutable override and reasoning logs in demo/apps/_shared/adaptive/audit.test.js (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)

### Implementation for User Story 4

- [x] T052 [US4] Implement teacher adaptive path and reasoning routes in demo/apps/teacher-console/server-adaptive.js (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T053 [US4] Implement teacher override command handler and validation in demo/apps/teacher-console/server-adaptive.js (Accountable: GDPR Children's Data Specialist - agents/gdpr-children-data-specialist.chatmode.md)
- [x] T054 [P] [US4] Add override and history panel UI logic in demo/apps/teacher-console/public/adaptive.js (Accountable: Learning Sciences Expert - agents/learning-sciences-expert.chatmode.md)
- [x] T055 [P] [US4] Add teacher analytics adaptive panels and override modal markup in demo/apps/teacher-console/public/analytics.html (Accountable: Learning Sciences Expert - agents/learning-sciences-expert.chatmode.md)
- [x] T056 [US4] Emit immutable override, path_changed, and high_intervention events in demo/apps/_shared/adaptive/audit.js (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T057 [US4] Update AI Act oversight and human-override evidence in specs/007-adaptive-learning/checklists/ai-act-controls.md (Accountable: Responsible AI Evaluator - agents/responsible-ai-evaluator.chatmode.md)
- [x] T058 [US4] Update quickstart with teacher override independent checkpoint scenario in specs/007-adaptive-learning/quickstart.md (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: User Story 4 independently passes mandatory teacher override, override history visibility, and immutable oversight logging.

---

## Phase 7: User Story 5 - Cross-Device Continuation of Adaptive Path (Priority: P1)

**Goal**: Preserve adaptive checkpoint state and prior hints/feedback across devices with resilient resume behavior.

**Independent Test**: Complete 2 of 4 catch-up activities on one device, resume on another, and continue at activity 3 with state and hints restored.

### Tests for User Story 5

- [x] T059 [P] [US5] Add integration tests for adaptive path state persistence and resume API in demo/apps/learner-web/tests/integration/cross-device-resume.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T060 [P] [US5] Add regression tests for state consistency after teacher override and resume in demo/apps/learner-web/tests/integration/resume-after-override.test.js (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T061 [US5] Add performance tests for resume latency target in demo/apps/learner-web/tests/performance/adaptive-resume.performance.test.js (Accountable: Responsible AI Evaluator - agents/responsible-ai-evaluator.chatmode.md)

### Implementation for User Story 5

- [x] T062 [US5] Implement adaptive path state read/write service in demo/apps/_shared/adaptive/engine.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T063 [P] [US5] Add resume state endpoints and conflict handling in demo/apps/learner-web/server-adaptive.js (Accountable: Privacy-Preserving ML Engineer - agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T064 [P] [US5] Add cross-device resume entry UI and progress messaging in demo/apps/learner-web/public/learner.html (Accountable: Content Localisation Lead - agents/content-localisation-lead.chatmode.md)
- [x] T065 [US5] Add prior hints/feedback hydration logic on resume in demo/apps/learner-web/public/adaptive.js (Accountable: Learning Sciences Expert - agents/learning-sciences-expert.chatmode.md)
- [x] T066 [US5] Emit immutable path_changed and resume events in demo/apps/_shared/adaptive/audit.js (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T067 [US5] Update quickstart with cross-device independent checkpoint scenario in specs/007-adaptive-learning/quickstart.md (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: User Story 5 independently passes cross-device continuation with state consistency and audit traceability.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Finalize compliance evidence, operational verification, and release readiness across all user stories.

- [x] T068 [P] Finalize Annex IV technical documentation fragment for adaptive system in specs/007-adaptive-learning/checklists/annex-iv-fragment.md (Accountable: EU AI Act Compliance Officer - agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T069 [P] Finalize DPIA delta and retention controls for adaptive records in specs/007-adaptive-learning/checklists/gdpr-art8-children-data.md (Accountable: GDPR Children's Data Specialist - agents/gdpr-children-data-specialist.chatmode.md)
- [x] T070 Consolidate transparency copy review and learner-facing wording validation in specs/007-adaptive-learning/research.md (Accountable: Learning Sciences Expert - agents/learning-sciences-expert.chatmode.md)
- [x] T071 Run full adaptive verification script and capture evidence in demo/scripts/verify-adaptive.ps1 (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)
- [x] T072 Run deployment smoke checklist update for adaptive feature in demo/DEPLOYMENT-TUTORIAL.md (Accountable: Demo Deployment Agent - agents/demo-deployment-agent.chatmode.md)
- [x] T073 Capture performance results against SC-001 and SC-005 in specs/007-adaptive-learning/checklists/performance-validation.md (Accountable: Responsible AI Evaluator - agents/responsible-ai-evaluator.chatmode.md)
- [x] T074 Perform final cross-agent compliance sign-off report in specs/007-adaptive-learning/checklists/final-signoff.md (Accountable: Cross-Agent QA Verifier - agents/cross-agent-qa-verifier.chatmode.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies.
- Foundational (Phase 2): Depends on Setup completion; blocks all user stories.
- User Story phases (Phase 3-7): Depend on Foundational completion.
- Polish (Phase 8): Depends on completion of all user stories.

### User Story Dependencies

- US1 (Adaptive Selection): Starts first after Foundational; forms MVP core.
- US2 (Catch-Up): Depends on US1 recommendation flow and foundational engine.
- US3 (Stretch): Depends on US1 recommendation flow and foundational engine.
- US4 (Teacher Override): Depends on US1/US2 decision records and teacher scope middleware.
- US5 (Cross-Device Resume): Depends on US2 catch-up state and US4 override state interactions.

### Dependency Graph (Story Order)

US1 -> US2 -> US4 -> US5
US1 -> US3

---

## Parallel Opportunities

- Phase 1: T002-T007 can run in parallel after T001 starts context.
- Phase 2: T011, T012, T013, T015, T017, T018 can run in parallel after T009-T010.
- US1: T021 and T022 in parallel; T025 and T026 in parallel; then T027-T030.
- US2: T031 and T032 in parallel; T035 and T036 in parallel; then T037-T039.
- US3: T040 and T041 in parallel; T044 and T045 in parallel; then T046-T048.
- US4: T049 and T050 in parallel; T054 and T055 in parallel; then T056-T058.
- US5: T059 and T060 in parallel; T063 and T064 in parallel; then T065-T067.
- Polish: T068 and T069 can run in parallel; T073 can run in parallel with T072 after T071 starts.

### Parallel Example: User Story 4

```bash
# Run override tests in parallel:
Task: "T049 [US4] override authorization and scope gating test"
Task: "T050 [US4] override lifecycle and path pause/resume test"

# Build teacher UI surfaces in parallel:
Task: "T054 [US4] override history panel logic"
Task: "T055 [US4] adaptive analytics and override modal markup"
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1).
4. Validate US1 independent checkpoint (T030) before expanding scope.

### Incremental Delivery

1. Add US2 and validate checkpoint (T039).
2. Add US3 and validate checkpoint (T048).
3. Add US4 and validate checkpoint (T058).
4. Add US5 and validate checkpoint (T067).
5. Complete Phase 8 for compliance and go-live readiness.

### High-Risk Governance Gates

1. AI Act/GDPR checklist updates required before and after US4.
2. Teacher override (US4) and immutable audit events (T012, T038, T047, T056, T066) are non-negotiable release gates.
3. Transparency labels (T018, T026, T042, T070) must pass pedagogy and localization review before release.

---

## Notes

- All tasks follow the required checklist format: `- [ ] T### [P] [US#] Description with file path`.
- Story-labeled tasks exist only in user story phases.
- Each user story includes an explicit independent checkpoint task in quickstart.
- Accountable roles reference `agents/*.chatmode.md` for execution accountability.