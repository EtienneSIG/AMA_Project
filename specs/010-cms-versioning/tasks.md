# Tasks: CMS Versioning and Content Approval Workflow

**Input**: Design documents from /specs/010-cms-versioning/

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cms-versioning.openapi.yaml, quickstart.md

**Tests**: Required by spec and quickstart for independent checkpoints, negative gates, concurrency, rollback safety, and compliance traceability.

**Organization**: Tasks are grouped by phase and user story so each story is independently implementable and testable.

> **Implementation note (avoid overwrites)**: `demo/apps/_shared/` is the source of truth for `db/schema.sql`, `db/index.js`, `auth.js`, and `contentSafety.js`; per-app copies are mirrors produced by `demo/apps/_shared/sync.ps1`. Edit `_shared/` only for these files, then run sync — never edit a per-app mirror directly. No CMS/versioning/rollback/publish/lifecycle code exists yet (the only `version` references are `curricula.version` and package metadata), so the `services/cms/*` modules, `ContentItem`/`ContentVersion` tables, and `/content/*` routes are all safe to create.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish migration scaffolding, governance modules, and baseline API wiring.

- [x] T001 Create feature migration scaffold for CMS governance tables in demo/apps/_shared/db/migrations/010_cms_versioning.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T002 Create CMS domain module skeleton for versioning, approvals, localization, metadata, lifecycle, and lineage in demo/apps/_shared/services/cms/README.md (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T003 [P] Add CMS route registration shell in demo/apps/admin/server.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T004 [P] Add shared validation helpers for semantic versions, locales, and role claims in demo/apps/_shared/validation/cmsValidation.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T005 [P] Add shared role constants including pedagogy_lead, compliance_lead, localization_lead, curriculum_lead in demo/apps/_shared/auth/roles.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T006 Add acceptance test suite placeholder for feature 010 workflow checks in demo/scripts/acceptance_tests.ps1 (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T006a [P] Author the Annex IV technical-file fragment for the versioning/approval governance capability (intended purpose, non-autonomous nature, content lifecycle + approval-gate design, Art. 9 risk outcomes, Art. 10 data classes, Art. 14 oversight roles, Art. 12/13/15 logging, transparency and robustness controls) in specs/010-cms-versioning/contracts/annex-iv-fragment.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement common persistence and policy infrastructure required by all user stories.

**Critical**: No user story implementation starts before this phase completes.

- [x] T007 Implement core PostgreSQL tables for ContentItem, ContentVersion, workflow, metadata, deprecation, and audit events in demo/apps/_shared/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T008 [P] Add DB indexes and unique constraints for semantic version uniqueness, locale branches, and metadata queries in demo/apps/_shared/db/migrations/010_cms_versioning.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T009 [P] Implement immutable audit append helper enforcing no update/delete writes in demo/apps/_shared/services/cms/auditRepository.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T010 Implement approval policy repository with mandatory gate checks for pedagogy and compliance roles in demo/apps/_shared/services/cms/policyRepository.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T010a [P] Author the Art. 9 risk-management register for the content lifecycle (unauthorized/accidental publication, rollback to non-compliant version, merge of unreviewed localized content, loss of approval provenance, reviewer-identity exposure) with mitigation + residual-risk acceptance in specs/010-cms-versioning/contracts/risk-register.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T010b [P] Document and enforce the Art. 10 data-governance register (approved content, approval-trace, and metadata classes with quality, retention, and access expectations) in demo/apps/_shared/services/cms/policyRepository.js and specs/010-cms-versioning/data-model.md (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T010c Implement Art. 15 robustness controls: fail-closed publish/rollback guards preventing promotion of unapproved or non-comparable versions, server-side lifecycle state validation, and role-based protection of approval transitions in demo/apps/_shared/services/cms/decisionService.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T010d Implement and verify the Art. 14 human-oversight gate so publish, promote, rollback, deprecate, and merge actions require a named human approver with captured rationale and no autonomous lifecycle action in demo/apps/_shared/services/cms/decisionService.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T011 Implement localization policy rule requiring localization_lead for branch_type localization in demo/apps/_shared/services/cms/policyRepository.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T012 [P] Implement optimistic concurrency lock helper for workflow transitions in demo/apps/_shared/services/cms/workflowLock.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T013 Implement shared CMS service bootstrap and dependency wiring in demo/apps/_shared/services/cms/index.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T014 Add foundational migration and repository smoke checks in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: Schema, policy engine, and audit infrastructure are ready for story-level delivery.

---

## Phase 3: User Story 1 - Content Versioning and Rollback Controls (Priority: P1) MVP

**Goal**: Deliver immutable semantic version snapshots, publish promotion, rollback orchestration, and learner-safe update behavior.

**Independent Test**: Publish 1.0.0, publish 1.1.0, rollback to 1.0.0, verify reassignment within 5 minutes with archived responses retained.

### Tests for User Story 1

- [x] T015 [P] [US1] Add contract tests for POST /content/{contentItemId}/versions and POST /versions/{versionId}/publish in demo/apps/admin/tests/contract/cms.versions.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T016 [P] [US1] Add integration test for version publish and supersede flow in demo/apps/admin/tests/integration/cms.versioning.integration.test.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T017 [P] [US1] Add integration test for rollback async lifecycle and assignment remap timing target in demo/apps/admin/tests/integration/cms.rollback.integration.test.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T017a [P] [US1] Add integration test for the FR-002 24-hour rollback-eligibility window (rollback permitted within 24h of publication, eligibility guard behavior at/after the window boundary) in demo/apps/admin/tests/integration/cms.rollback.eligibility.integration.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 1

- [x] T018 [P] [US1] Implement version repository for immutable snapshot creation and lineage pointer writes in demo/apps/_shared/services/cms/versionRepository.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [x] T019 [US1] Implement publish service to enforce approved-only promotion and superseded marking in demo/apps/_shared/services/cms/publishService.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T020 [US1] Implement rollback service as new promoted event referencing target snapshot in demo/apps/_shared/services/cms/rollbackService.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T021 [US1] Implement active assignment remap job with idempotent checkpoints in demo/apps/_shared/services/cms/assignmentRemapJob.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T022 [US1] Add API handlers for create version, publish, and rollback endpoints in demo/apps/admin/routes/cms/versionLifecycleRoutes.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T023 [US1] Add teacher-facing content updated marker endpoint for active session refresh in demo/apps/teacher-console/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T024 [US1] Extend acceptance workflow script for Scenario 1 and Scenario 2 quickstart checks in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: Versioning and rollback controls operate independently with preserved learner evidence.

---

## Phase 4: User Story 2 - Approval State Machine with Mandatory Gates (Priority: P1)

**Goal**: Enforce configurable multi-step approvals with non-bypassable pedagogy and compliance gates and complete decision audit trails.

**Independent Test**: Draft submission passes only after sequential approvals by pedagogy lead and compliance lead with lock-safe transition handling.

### Tests for User Story 2

- [x] T025 [P] [US2] Add contract tests for POST /versions/{versionId}/submit and POST /workflows/{workflowId}/decisions in demo/apps/admin/tests/contract/cms.approvals.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T026 [P] [US2] Add state machine transition unit tests including reject and changes-requested loops in demo/apps/_shared/tests/unit/cms.workflowStateMachine.test.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T027 [P] [US2] Add negative test for publish without pedagogy approval in demo/apps/admin/tests/integration/cms.approvals.negative.integration.test.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T028 [P] [US2] Add negative test for publish without compliance approval in demo/apps/admin/tests/integration/cms.approvals.negative.integration.test.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T029 [P] [US2] Add concurrency conflict test for stale lock approval decision in demo/apps/admin/tests/integration/cms.approvals.concurrency.integration.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 2

- [x] T030 [P] [US2] Implement workflow state machine and transition guards in demo/apps/_shared/services/cms/workflowStateMachine.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T031 [US2] Implement workflow instance service for submit and current step progression in demo/apps/_shared/services/cms/workflowService.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T032 [US2] Implement step decision service enforcing required role sequence and mandatory comments on reject/changes requested in demo/apps/_shared/services/cms/decisionService.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T033 [US2] Add approvals API handlers and reviewer notifications in demo/apps/admin/routes/cms/approvalRoutes.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T034 [US2] Add acceptance script checks for mandatory gate sequencing and non-bypass publish protection in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: Approval workflow is independently testable and blocks all unauthorized publish attempts.

---

## Phase 5: User Story 3 - Localization Branching and Approval Branch Controls (Priority: P1)

**Goal**: Deliver independent localization branches with lineage references, merge choice workflow, and localization-lead mandatory gate.

**Independent Test**: Branch es-ES from source 1.0.0, complete localization approvals including localization lead, publish branch, then receive source update advisory and record merge choice.

### Tests for User Story 3

- [x] T035 [P] [US3] Add contract tests for POST /content/{contentItemId}/localization-branches and POST /localization-branches/{branchId}/merge-choice in demo/apps/admin/tests/contract/cms.localization.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T036 [P] [US3] Add integration test proving branch copy-on-write independence from source edits in demo/apps/admin/tests/integration/cms.localization.independence.integration.test.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T037 [P] [US3] Add negative integration test for localization publish without localization_lead approval in demo/apps/admin/tests/integration/cms.localization.gates.integration.test.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

### Implementation for User Story 3

- [x] T038 [P] [US3] Implement localization branch repository with branch_root_version_id and source_version_id lineage fields in demo/apps/_shared/services/cms/localizationRepository.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T039 [US3] Implement localization workflow service with required gate sequence localization_lead -> pedagogy_lead -> compliance_lead in demo/apps/_shared/services/cms/localizationWorkflowService.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T040 [US3] Implement source update advisory and merge choice recording service for merge adapt defer actions in demo/apps/_shared/services/cms/localizationSyncService.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T041 [US3] Add localization branch and merge choice routes in demo/apps/admin/routes/cms/localizationRoutes.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T042 [US3] Add localization queue and advisory visibility endpoint in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T043 [US3] Extend acceptance script with Scenario 3 branch independence and merge advisory checks in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: Localization branches remain independently publishable while preserving source lineage and gate enforcement.

---

## Phase 6: User Story 4 - Metadata Tagging and Governance Discovery (Priority: P1)

**Goal**: Persist complete metadata, enable curriculum discovery queries, and produce auditable prerequisite suggestions.

**Independent Test**: Tag lesson metadata, query by grade/subject/standard, verify result and assignment counts, and verify prerequisite suggestion record exists.

### Tests for User Story 4

- [x] T044 [P] [US4] Add contract test for GET /content/search metadata filters in demo/apps/admin/tests/contract/cms.metadata.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T045 [P] [US4] Add integration test for metadata completeness gate before publish in demo/apps/admin/tests/integration/cms.metadata.publish-gate.integration.test.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T046 [P] [US4] Add integration test for prerequisite suggestion generation and auditability in demo/apps/admin/tests/integration/cms.prerequisite-suggestions.integration.test.js (Accountable: agents/learning-sciences-expert.chatmode.md)

### Implementation for User Story 4

- [x] T047 [P] [US4] Implement metadata tag repository and publish-time completeness validator in demo/apps/_shared/services/cms/metadataRepository.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T048 [US4] Implement metadata search service returning version history and assignment counts in demo/apps/_shared/services/cms/metadataSearchService.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T049 [US4] Implement prerequisite suggestion service with curriculum mapping trace output in demo/apps/_shared/services/cms/prerequisiteSuggestionService.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T050 [US4] Add metadata and prerequisite APIs in demo/apps/admin/routes/cms/metadataRoutes.js (Accountable: agents/demo-deployment-agent.chatmode.md)

**Checkpoint**: Governance metadata and prerequisite discovery function independently and are audit-traceable.

---

## Phase 7: User Story 5 - Deprecation Lifecycle, Archive, and Transparency Trails (Priority: P1)

**Goal**: Manage deprecation to archive lifecycle with replacement guidance, assignment blocking, and lineage/audit transparency.

**Independent Test**: Deprecate with EOL and replacement, verify warnings and notifications, run archive transition at EOL, verify assignment block and retained evidence visibility.

### Tests for User Story 5

- [x] T051 [P] [US5] Add contract tests for POST /content/{contentItemId}/deprecate and POST /content/{contentItemId}/archive in demo/apps/admin/tests/contract/cms.lifecycle.contract.test.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T052 [P] [US5] Add contract test for GET /content/{contentItemId}/lineage transparency response in demo/apps/admin/tests/contract/cms.lineage.contract.test.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T053 [P] [US5] Add integration test for deprecation warnings and post-EOL assignment blocking in demo/apps/admin/tests/integration/cms.deprecation.integration.test.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T054 [P] [US5] Add integration test confirming archived learner evidence remains queryable for audit in demo/apps/admin/tests/integration/cms.archive-retention.integration.test.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)

### Implementation for User Story 5

- [x] T055 [P] [US5] Implement deprecation lifecycle service with EOL and replacement enforcement in demo/apps/_shared/services/cms/deprecationService.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T056 [US5] Implement archive scheduler and assignment blocking policy in demo/apps/_shared/services/cms/archiveScheduler.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T057 [US5] Implement lineage query service exposing previous, branched_from, merged_from, rollback_to edges in demo/apps/_shared/services/cms/lineageService.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T058 [US5] Add lifecycle and lineage routes including transparency payload formatting in demo/apps/admin/routes/cms/lifecycleRoutes.js (Accountable: agents/demo-deployment-agent.chatmode.md)

**Checkpoint**: Deprecation and archive lifecycle is enforceable, transparent, and auditable with retained learner evidence.

---

## Phase 8: Polish and Cross-Cutting Concerns

**Purpose**: Complete compliance hardening, role-gate review sign-off, and operational runbook quality.

- [x] T059 [P] Add teacher-console provenance view for version, approval rationale, and deprecation warnings in demo/apps/teacher-console/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T060 Add admin governance UI updates for workflow queue, lineage graph, rollback controls, and metadata insights in demo/apps/admin/public/index.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T061 [P] Add SCORM/ePub/PDF export governance checks for published versions in demo/apps/_shared/services/cms/exportService.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T062 Add compliance checklist assertions for Art. 12 logging and Art. 13 transparency in specs/010-cms-versioning/quickstart.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T063 Add mandatory approval gate matrix and accountable role sign-off notes in specs/010-cms-versioning/research.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T064 Run and document full quickstart validation results in specs/010-cms-versioning/quickstart.md (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T065 Finalize deployment and verification notes for feature rollout in demo/feature/EXECUTION-PLAN.md (Accountable: agents/demo-deployment-agent.chatmode.md)

---

## Dependencies and Execution Order

### Phase Dependencies

- Phase 1 Setup has no dependencies.
- Phase 2 Foundational depends on Phase 1 and blocks all user stories.
- Phase 3 to Phase 7 user stories depend on Phase 2 completion.
- Phase 8 Polish depends on completion of desired user stories.

### User Story Dependencies

- US1 depends only on Foundational and is the MVP path.
- US2 depends on Foundational and uses US1 publish guards for final publish integration.
- US3 depends on Foundational and reuses approval services from US2.
- US4 depends on Foundational and integrates publish-time metadata checks from US1 and US2.
- US5 depends on Foundational and consumes lineage/version outputs from US1 and US3.

### Dependency-Ordered Delivery Graph

1. Setup -> Foundational
2. Foundational -> US1
3. Foundational -> US2
4. Foundational -> US3
5. Foundational -> US4
6. Foundational -> US5
7. US1 -> US5 for rollback_to lineage edge completeness
8. US2 -> US3 for localization gate policy reuse
9. US1 + US2 + US3 + US4 + US5 -> Polish

---

## Parallel Execution Examples

### US1 Parallel Example

- Run T015, T016, and T017 together.
- Run T018 in parallel with T023.
- Run T021 after T020 begins and route work T022 can proceed concurrently once service interfaces are fixed.

### US2 Parallel Example

- Run T025 to T029 together as initial failing checks.
- Run T030 in parallel with T033 API shell.
- Run T031 and T032 sequentially after T030, then integrate through T033.

### US3 Parallel Example

- Run T035, T036, and T037 together.
- Run T038 in parallel with route scaffold T041.
- Run T039 and T040 after T038 then complete visibility API T042.

### US4 Parallel Example

- Run T044, T045, and T046 together.
- Run T047 and T049 in parallel.
- Run T048 after T047 interfaces settle, then wire APIs in T050.

### US5 Parallel Example

- Run T051 to T054 together.
- Run T055 and T057 in parallel.
- Run T056 after T055 policy definitions, then complete API integration in T058.

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) and validate independent rollback checkpoint.
3. Demo MVP with versioning and rollback controls.

### Incremental Delivery

1. Add Phase 4 for mandatory approval gates.
2. Add Phase 5 for localization branching and localized approval gates.
3. Add Phase 6 for metadata governance and prerequisite suggestions.
4. Add Phase 7 for deprecation/archive lifecycle and lineage transparency.
5. Complete Phase 8 cross-cutting hardening and runbook verification.

### Independent Test Checkpoints

- US1 checkpoint: publish forward and rollback backward with learner-safe retention.
- US2 checkpoint: publish blocked unless pedagogy and compliance approvals pass.
- US3 checkpoint: localization branch publish blocked unless localization gate plus core gates pass.
- US4 checkpoint: metadata-complete discovery query and prerequisite suggestions are auditable.
- US5 checkpoint: deprecation to archive with assignment block and retained evidence queryability.
