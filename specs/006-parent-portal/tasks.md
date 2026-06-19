# Tasks: Parent Portal - Communications, Consent & Digest

**Input**: Design documents from `/specs/006-parent-portal/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Included, because the feature spec defines mandatory independent test scenarios and measurable acceptance outcomes.

**Organization**: Tasks are grouped by setup, foundational prerequisites, and user stories (US1-US5) so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label for traceability (`[US1]` ... `[US5]`)
- Every task includes an exact file path and accountable agent assignment from `agents/*.chatmode.md`

## Implementation note (avoid overwrites)

The parent-portal app already exists. Tasks below must **EXTEND** existing files additively, not regenerate them.

- **Mirror rule**: `demo/apps/_shared/` is the source of truth for `db/schema.sql`, `db/index.js`, `auth.js`, `contentSafety.js`. Per-app copies are mirrors produced by `demo/apps/_shared/sync.ps1` — edit only `_shared/` then run sync; never edit a per-app mirror directly. This applies to `demo/apps/parent-portal/{auth.js, contentSafety.js, db/index.js, db/schema.sql}`.
- **EXTEND (do not regenerate)**: `demo/apps/parent-portal/server.js`, `public/index.html`, `public/consent-pending.html`, `package.json`, `README.md`; `demo/apps/teacher-console/server.js`; `demo/scripts/acceptance_tests.ps1`.
- **Safe to create (new)**: `public/models/*`, `public/resources.html`, `.env.example`, `data/family-resources.manifest.json`, `teacher-console/public/moderation.html`, `demo/scripts/send_digests.ps1`.
- **Reuse**: existing `contentSafety.js` + `logContentSafety()` + `content_safety_results` table for any message/digest moderation; do not add a parallel safety client.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish parent-portal project scaffolding, shared configuration, and execution entry points.

- [ ] T001 Add parent-portal environment variable template for Content Safety, digest scheduling, and consent link TTL in demo/apps/parent-portal/.env.example (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T002 Update dependency manifests for parent portal runtime and moderation/email libraries in demo/apps/parent-portal/package.json (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T003 [P] Create parent-portal task runner scripts for local verification and seed data bootstrapping in demo/apps/parent-portal/package.json (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T004 [P] Add parent-portal execution and configuration documentation in demo/apps/parent-portal/README.md (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T005 [P] Create feature compliance tracking checklist for GDPR Art. 8, EU AI Act articles, and constitution evidence in specs/006-parent-portal/checklists/compliance-gate.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T006 [P] Add parent-portal validation section to demo acceptance script orchestration in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: Setup complete - parent-portal codebase can be configured and executed consistently.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement core data, security, audit, and compliance foundations that block all user stories.

**CRITICAL**: No user story implementation starts before this phase is complete.

- [X] T007 Create parent domain tables (consent, messages, digests, preferences, audit events) with indexes and constraints in demo/apps/parent-portal/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T008 Implement DB access helpers for parent consent, dashboard aggregation, messaging threads, digest preferences, and audit write paths in demo/apps/parent-portal/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T009 [P] Extend shared role-gated authentication to support parent role isolation and per-child authorization boundaries in demo/apps/_shared/auth.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T010 [P] Wire parent session middleware and secure cookie policy in demo/apps/parent-portal/auth.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T011 [P] Implement immutable audit event helper for consent, moderation, digest, and preference changes in demo/apps/parent-portal/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [X] T012 Create GDPR Art. 8 plain-language consent disclosure template with version marker and rights copy in demo/apps/parent-portal/public/consent-pending.html (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [x] T013 [P] Implement Content Safety wrapper with verdict normalization and moderation routing contract in demo/apps/parent-portal/contentSafety.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [x] T014 [P] Add translation resource scaffold for NL/DE/FR/ES/PL/RO parent UI keys in demo/apps/parent-portal/public/models/translations.json (Accountable: agents/content-localisation-lead.chatmode.md)
- [ ] T015 [P] Create family-resources content manifest and locale mapping structure in demo/apps/parent-portal/data/family-resources.manifest.json (Accountable: agents/content-localisation-lead.chatmode.md)
- [ ] T016 Define foundational compliance acceptance cases for data minimization, EU residency assertions, and consent gating in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: Foundation ready - all user stories can now proceed, and compliance primitives are in place.

---

## Phase 3: User Story 1 - Multi-Child Dashboard with Weekly Progress Summary (Priority: P0) 🎯 MVP

**Goal**: Parent sees a unified multi-child dashboard with weekly progress, mastery, and attendance.

**Independent Test**: Parent with two children can open dashboard, switch child context within 2 seconds, and view per-child weekly metrics including no-activity fallback.

### Tests for User Story 1

- [ ] T017 [P] [US1] Add automated acceptance scenario for multi-child dashboard rendering and child switch latency in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T018 [P] [US1] Add API-level verification for weekly summary payload correctness and no-activity fallback in demo/apps/parent-portal/server.js (Accountable: agents/ama-rubric-evaluator.chatmode.md)

### Implementation for User Story 1

- [X] T019 [P] [US1] Implement weekly progress aggregation query and attendance summary composition in demo/apps/parent-portal/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T020 [US1] Add dashboard endpoint for per-child summary retrieval with access checks in demo/apps/parent-portal/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T021 [P] [US1] Implement child selector UI and summary cards in demo/apps/parent-portal/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T022 [P] [US1] Implement client-side dashboard rendering, child switching, and no-activity CTA behavior in demo/apps/parent-portal/public/models/dashboard.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T023 [US1] Add dashboard performance instrumentation and p95 capture markers for 3-second SLO in demo/apps/parent-portal/server.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T024 [US1] Add GDPR-safe response filtering to ensure only parent-owned learner data is returned in demo/apps/parent-portal/server.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)

**Checkpoint**: US1 independently passes dashboard usability, latency, and data-isolation checks.

---

## Phase 4: User Story 2 - Secure Parent-Teacher Communication & Announcements (Priority: P0)

**Goal**: Teachers and parents exchange moderated messages with notifications and read receipts.

**Independent Test**: Teacher sends announcement, parent receives in-app notification (and optional email), replies, moderation rules apply, and read receipts are visible.

### Tests for User Story 2

- [ ] T025 [P] [US2] Add acceptance flow for announcement send, parent receipt, reply, and read receipt timestamps in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T026 [P] [US2] Add moderation-path test for flagged content quarantine and non-delivery before teacher action in demo/scripts/acceptance_tests.ps1 (Accountable: agents/responsible-ai-evaluator.chatmode.md)

### Implementation for User Story 2

- [X] T027 [P] [US2] Implement message thread queries, delivery metadata, and read receipt writes in demo/apps/parent-portal/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T028 [US2] Add parent message thread read/send endpoints with authorization checks in demo/apps/parent-portal/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T029 [US2] Integrate Content Safety pre-delivery scanning and moderation decision branching in demo/apps/parent-portal/server.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [X] T030 [P] [US2] Add parent message inbox/thread UI with read state indicators in demo/apps/parent-portal/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T031 [P] [US2] Implement message compose/send/reply interactions with moderation status feedback in demo/apps/parent-portal/public/models/messages.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [X] T032 [US2] Extend teacher-side moderation endpoint handlers for approve/reject/reword actions in demo/apps/teacher-console/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [x] T033 [P] [US2] Add moderation queue UI with Content Safety verdict and teacher override controls in demo/apps/teacher-console/public/moderation.html (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [X] T034 [US2] Add EU AI Act Art. 12/13 trace logs for message scan verdicts, moderation action, and parent transparency notices in demo/apps/parent-portal/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: US2 independently passes moderated messaging, delivery integrity, and read-receipt traceability.

---

## Phase 5: User Story 3 - Parental Consent Workflow for Under-16 Learners (Priority: P0)

**Goal**: Enforce GDPR Art. 8 consent for under-16 learners before access to pedagogical/AI-enabled features.

**Independent Test**: Under-16 learner activation triggers consent request, parent signs via time-limited link, audit record persists, learner access changes from pending to active only after consent.

### Tests for User Story 3

- [ ] T035 [P] [US3] Add acceptance scenario for under-16 learner consent request, 7-day link validity, and successful consent activation in demo/scripts/acceptance_tests.ps1 (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T036 [P] [US3] Add acceptance scenario for expired consent link reminder and pending-consent enforcement in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 3

- [X] T037 [P] [US3] Implement consent token issuance, expiry validation, and versioned consent recording in demo/apps/parent-portal/db/index.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T038 [US3] Add consent request enqueue and dispatch endpoint for under-16 activation events in demo/apps/parent-portal/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T039 [US3] Implement consent submission endpoint requiring explicit checkbox consent and timestamped signature audit in demo/apps/parent-portal/server.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T040 [P] [US3] Build parent consent UX for disclosure review and explicit agreement workflow in demo/apps/parent-portal/public/consent-pending.html (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T041 [P] [US3] Implement consent page interaction logic including explicit consent assertion and failure states in demo/apps/parent-portal/public/models/consent.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [X] T042 [US3] Enforce pending-consent learner gating checks before adaptive or assignment access in demo/apps/parent-portal/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T043 [US3] Implement reminder dispatch path for unresolved consent requests at day 6 in demo/apps/parent-portal/server.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T044 [US3] Add GDPR Art. 8 evidence logging and rights-surface metadata capture for DPIA delta in demo/apps/parent-portal/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: US3 independently passes legal consent gating, auditability, and reminder/expiry behavior.

---

## Phase 6: User Story 4 - Automated Weekly Digest & "How to Help This Week" (Priority: P1)

**Goal**: Send weekly parent digests with progress summary and pedagogically approved home-support guidance.

**Independent Test**: Sunday schedule triggers digest for opted-in parents with child metrics, top subjects, one "How to help" activity, and opt-out controls; opted-out parents receive none.

### Tests for User Story 4

- [ ] T045 [P] [US4] Add acceptance scenario for digest generation, send window, and opt-out behavior in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T046 [P] [US4] Add digest content validation for celebration/support note logic and age-appropriate activity selection in demo/scripts/acceptance_tests.ps1 (Accountable: agents/learning-sciences-expert.chatmode.md)

### Implementation for User Story 4

- [X] T047 [P] [US4] Implement parent digest preference read/write and weekly summary fetch helpers in demo/apps/parent-portal/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T048 [US4] Add digest preference endpoint and opt-out workflow handling in demo/apps/parent-portal/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T049 [US4] Implement scheduled digest dispatcher with Sunday 18:00 UTC batching in demo/scripts/send_digests.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T050 [P] [US4] Create digest template renderer for per-child summary and action guidance copy in demo/apps/parent-portal/public/models/digest-template.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [X] T051 [US4] Add "How to help" recommendation sourcing from approved pedagogical resource set in demo/apps/parent-portal/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T052 [US4] Add email send audit and engagement tracking hooks for SC-003 measurement in demo/apps/parent-portal/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: US4 independently passes digest scheduling, parental preference controls, and pedagogical-content quality checks.

---

## Phase 7: User Story 5 - Parent Translation Mode & Family Resources Center (Priority: P1)

**Goal**: Deliver fully localized parent-facing UI, notifications, and resource content in supported languages.

**Independent Test**: Parent switches to Spanish (or other supported locale), all UI/email text is localized, and Family Resources content is fully translated for that locale.

### Tests for User Story 5

- [ ] T053 [P] [US5] Add acceptance scenario for language switch persistence across sessions and child contexts in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T054 [P] [US5] Add localization coverage check to verify at least 90% translated key coverage per supported language in demo/scripts/acceptance_tests.ps1 (Accountable: agents/content-localisation-lead.chatmode.md)

### Implementation for User Story 5

- [X] T055 [P] [US5] Implement language preference persistence and retrieval in parent preference store in demo/apps/parent-portal/db/index.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T056 [US5] Add language selection and localized notification/template endpoints in demo/apps/parent-portal/server.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T057 [P] [US5] Implement language picker and runtime localization binding in demo/apps/parent-portal/public/index.html (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T058 [P] [US5] Populate translated UI strings and email key variants for NL/DE/FR/ES/PL/RO in demo/apps/parent-portal/public/models/translations.json (Accountable: agents/content-localisation-lead.chatmode.md)
- [x] T059 [US5] Implement Family Resources endpoint filtered by locale, learner age range, and topic in demo/apps/parent-portal/server.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T060 [P] [US5] Build Family Resources center UI and localized content cards in demo/apps/parent-portal/public/resources.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T061 [US5] Add cultural and pedagogical review annotations for translated family resources in demo/apps/parent-portal/data/family-resources.manifest.json (Accountable: agents/learning-sciences-expert.chatmode.md)

**Checkpoint**: US5 independently passes localization fidelity and family-resource accessibility checks.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final compliance closure, performance hardening, and demo-readiness across all user stories.

- [ ] T062 [P] Run cross-agent compliance verification against constitution principles and update evidence log in specs/006-parent-portal/checklists/compliance-gate.md (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T063 [P] Complete EU AI Act compliance review (Art. 9, 10, 12, 13, 14, 15) and record sign-off notes in specs/006-parent-portal/checklists/compliance-gate.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T064 [P] Complete GDPR Art. 8 legal review for consent language, revocation path, and retention policy alignment in specs/006-parent-portal/checklists/compliance-gate.md (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T065 Execute end-to-end parent portal smoke and acceptance flow for demo readiness in demo/scripts/acceptance_tests.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T066 Validate SC-001 to SC-007 metrics collection and reporting outputs in demo/apps/parent-portal/server.js (Accountable: agents/ama-rubric-evaluator.chatmode.md)
- [ ] T067 Final responsible-AI and pedagogical sign-off for moderated messaging and weekly support guidance in specs/006-parent-portal/checklists/compliance-gate.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: Feature is production-ready for staged demo deployment with compliance evidence and measurable outcomes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies, start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories.
- **Phase 3-7 (User Stories)**: Depend on Phase 2 completion.
- **Phase 8 (Polish)**: Depends on all selected user stories being complete.

### User Story Dependencies

- **US1 (P0)**: Starts after Foundational; independent of US2-US5.
- **US2 (P0)**: Starts after Foundational; independent of US1 for backend, integrates shared auth/audit only.
- **US3 (P0)**: Starts after Foundational; legal gate for under-16 access and should be completed before broad rollout.
- **US4 (P1)**: Depends on US1 data aggregation and US3 consent state.
- **US5 (P1)**: Starts after Foundational; independent of US4.

### Recommended Delivery Order

1. Setup + Foundational
2. US1 (MVP dashboard)
3. US3 (mandatory compliance gate)
4. US2 (secure communication)
5. US4 and US5 in parallel
6. Polish and compliance sign-off

---

## Parallel Execution Examples

### US1 Parallel Block

- T017 and T018 can run together (different acceptance/API checks).
- T019, T021, and T022 can run together (DB, HTML, and client model files).

### US2 Parallel Block

- T025 and T026 can run together.
- T027, T030, and T031 can run together before integration tasks T028-T029.
- T033 can run in parallel with T032.

### US3 Parallel Block

- T035 and T036 can run together.
- T037, T040, and T041 can run together before endpoint integration tasks.

### US4 Parallel Block

- T045 and T046 can run together.
- T047 and T050 can run together before scheduler wiring in T049.

### US5 Parallel Block

- T053 and T054 can run together.
- T055, T057, T058, and T060 can run together before endpoint integration tasks.

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 for immediate parent value.
3. Complete US3 to enforce GDPR Art. 8 gating before scale-up.
4. Validate with acceptance checks before adding additional stories.

### Incremental Delivery

1. Deliver US2 after US1+US3 baseline to activate moderated communication.
2. Deliver US4 and US5 as parent-engagement accelerators.
3. Run Phase 8 for final compliance and performance closure.

### Multi-Agent Execution

1. Program orchestration and architecture: agents/edtech-program-orchestrator.chatmode.md
2. Compliance and legal gates: agents/eu-ai-act-compliance-officer.chatmode.md + agents/gdpr-children-data-specialist.chatmode.md
3. Privacy/security foundations: agents/privacy-preserving-ml-engineer.chatmode.md
4. Pedagogy and localization quality: agents/learning-sciences-expert.chatmode.md + agents/content-localisation-lead.chatmode.md
5. Final verification and release: agents/cross-agent-qa-verifier.chatmode.md + agents/demo-deployment-agent.chatmode.md

---

## Notes

- `[P]` tasks indicate independent files and no blocking dependency on incomplete work.
- Every user story has explicit independent test checkpoints.
- Compliance tasks are embedded throughout implementation and finalized in Phase 8.
- Accountable agents are assigned per task to satisfy role-based responsibility requirements.