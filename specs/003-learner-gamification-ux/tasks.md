# Tasks: Learner Gamification UX

**Input**: Design documents from /specs/003-learner-gamification-ux/
**Prerequisites**: spec.md, checklists/requirements.md (plan.md currently missing and generated as part of Setup)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish feature planning artifacts and baseline implementation surfaces before coding user stories.

- [ ] T001 Create implementation plan with technical stack, constraints, and architecture notes in specs/003-learner-gamification-ux/plan.md (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T002 [P] Create feature data model for quest, season, badge, and oversight entities in specs/003-learner-gamification-ux/data-model.md (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T003 [P] Draft learner and teacher API contract for gamification endpoints in specs/003-learner-gamification-ux/contracts/learner-gamification.openapi.yaml (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T004 [P] Add executable feature validation scenarios in specs/003-learner-gamification-ux/quickstart.md (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T005 Align feature compliance scope (EU residency, bias prevention, teacher oversight) in specs/003-learner-gamification-ux/checklists/requirements.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared data and backend foundations required by all user stories.

**CRITICAL**: No user story implementation starts before this phase is complete.

- [ ] T006 Add database schema for daily challenges, collaborative quests, season tiers, boss attempts, daily chest claims, badge catalog, motivation messages, and teacher oversight actions in demo/apps/learner-web/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T007 [P] Implement database access helpers for gamification entities and aggregate dashboard reads in demo/apps/learner-web/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T008 [P] Implement anti-stigmatization query patterns that only expose class/guild aggregates (no individual ranking outputs) in demo/apps/learner-web/db/index.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T009 Add oversight audit persistence helpers (action, rationale, actor, timestamp, class scope) in demo/apps/learner-web/db/index.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T010 [P] Add role-aware API guardrails and EU-residency-safe response filtering for gamification routes in demo/apps/learner-web/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T011 Seed deterministic demo records for challenge, season tiers, daily chest eligibility, and collaborative quest state in demo/scripts/seed_learners.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)

**Checkpoint**: Shared schema, access layer, and safety/compliance guardrails are available.

---

## Phase 3: User Story 1 - Complete Daily Quest Flow From Dashboard (Priority: P1) MVP

**Goal**: Deliver the Quest Dashboard as the learner main overview with challenge du jour, chest eligibility, season progress, and boss battle streak progression.

**Independent Test**: Learner lands on Quest Dashboard by default, completes challenge flow, claims a valid daily chest once, and defeats boss only after 10 consecutive correct answers.

### Implementation for User Story 1

- [ ] T012 [P] [US1] Add acceptance coverage for dashboard default entry, challenge completion, chest single-claim behavior, and 10-correct boss completion in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T013 [US1] Implement GET /api/learner/quest-dashboard aggregate endpoint in demo/apps/learner-web/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T014 [P] [US1] Implement POST endpoints for starting and completing challenge du jour with one-per-day enforcement in demo/apps/learner-web/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T015 [P] [US1] Implement POST /api/learner/daily-chest/claim with idempotent same-day protection in demo/apps/learner-web/server.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T016 [P] [US1] Implement boss battle streak tracking endpoint that resets on incorrect answers and completes exactly at 10 consecutive correct answers in demo/apps/learner-web/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T017 [US1] Make Quest Dashboard the default main learner overview structure in demo/apps/learner-web/public/index.html (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T018 [US1] Wire client data loading and live progress refresh for challenge, chest, season, and boss widgets in demo/apps/learner-web/public/index.html (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T019 [US1] Add learner feedback states for completion, streak reset, and reward notifications in demo/apps/learner-web/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)

**Checkpoint**: User Story 1 is independently functional and demo-ready.

---

## Phase 4: User Story 2 - Participate in Collaborative Motivation Features (Priority: P1)

**Goal**: Enable shared class/guild objective progress, collaborative quests, and a moderated motivation channel.

**Independent Test**: Multiple learners in the same class/guild can contribute to shared objectives, progress updates are visible collectively, and motivation posts appear with moderation controls.

### Implementation for User Story 2

- [ ] T020 [P] [US2] Add acceptance coverage for collaborative quest contribution, class objective aggregation, and motivation channel visibility in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T021 [US2] Implement class/guild objective and collaborative quest API endpoints in demo/apps/learner-web/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T022 [P] [US2] Implement motivation channel post/list endpoints with moderation status fields in demo/apps/learner-web/server.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T023 [P] [US2] Implement database operations for collaborative contributions and motivation channel records in demo/apps/learner-web/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T024 [US2] Add collaborative objective and quest cards to learner dashboard UI in demo/apps/learner-web/public/index.html (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T025 [US2] Add motivation channel composer, message thread, and moderation-state rendering in demo/apps/learner-web/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T026 [US2] Enforce non-harmful comparative presentation in collaborative widgets (aggregate progress only, no learner rank ordering) in demo/apps/learner-web/public/index.html (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: User Story 2 is independently functional with collaborative and social motivation flows.

---

## Phase 5: User Story 3 - Earn and Review Recognitions Fairly (Priority: P2)

**Goal**: Allow learners to earn rewards from daily chest and quests, then review earned and locked badges in a dedicated gallery without harmful leaderboard exposure.

**Independent Test**: Trigger reward-eligible events, verify badge issuance, open badge gallery, and confirm criteria visibility with no individual public rankings.

### Implementation for User Story 3

- [ ] T027 [P] [US3] Add acceptance coverage for chest reward issuance, quest reward issuance, and badge gallery states in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T028 [US3] Implement badge reward issuance logic connected to chest claims and quest completions in demo/apps/learner-web/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T029 [P] [US3] Implement badge catalog and learner-earned badge query helpers in demo/apps/learner-web/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T030 [US3] Build learner badge gallery UI with earned, locked, and criteria summary states in demo/apps/learner-web/public/index.html (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T031 [US3] Validate and remove any learner-visible individual leaderboard/ranking surface from gamification views in demo/apps/learner-web/public/index.html (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: User Story 3 delivers fair recognition and reflective progress visibility.

---

## Phase 6: User Story 4 - Teacher Oversight for Motivational Safety (Priority: P2)

**Goal**: Give teachers class-level controls and moderation actions for gamification safety with auditable override history.

**Independent Test**: Teacher can pause/adjust activities and moderate motivation channel content; learner views update accordingly and audit entries are available within review windows.

### Implementation for User Story 4

- [ ] T032 [P] [US4] Add acceptance coverage for teacher pause/adjust controls, moderation actions, and audit retrieval timing in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T033 [US4] Implement teacher gamification control endpoints (pause, resume, adjust objective/quest states) in demo/apps/teacher-console/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T034 [P] [US4] Implement teacher moderation endpoints for motivation messages in demo/apps/teacher-console/server.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T035 [US4] Implement oversight audit read/write API integration for teacher actions in demo/apps/learner-web/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T036 [US4] Add teacher-console UI controls for gamification safety actions and rationale capture in demo/apps/teacher-console/public/index.html (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T037 [US4] Add learner-facing handling for teacher override states on dashboard and collaboration widgets in demo/apps/learner-web/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)

**Checkpoint**: User Story 4 satisfies teacher-in-the-loop oversight and moderation requirements.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final compliance evidence, quality checks, and release readiness.

- [ ] T038 [P] Reconcile implemented endpoints with contract documentation in specs/003-learner-gamification-ux/contracts/learner-gamification.openapi.yaml (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T039 [P] Document EU AI Act and GDPR controls evidence for gamification feature release in plan/04-compliance-eu-ai-act-gdpr.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T040 Run full scripted validation and capture pass/fail evidence in demo/DEPLOYMENT-REPORT.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T041 Record final pedagogical, RAI, and cross-agent QA sign-off status in specs/003-learner-gamification-ux/checklists/requirements.md (Accountable: agents/learning-sciences-expert.chatmode.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): Starts immediately.
- Phase 2 (Foundational): Depends on Phase 1 and blocks all user stories.
- Phase 3 (US1): Depends on Phase 2.
- Phase 4 (US2): Depends on Phase 2 and can proceed in parallel with late US1 UI refinements after T013.
- Phase 5 (US3): Depends on Phase 3 baseline reward/chest flows.
- Phase 6 (US4): Depends on Phase 2 and integrates with US2 motivation surfaces.
- Phase 7 (Polish): Depends on completion of Phases 3 through 6.

### User Story Dependencies

- US1: Independent after Foundational phase completion.
- US2: Independent after Foundational phase completion, with shared dashboard integration touchpoint in learner UI.
- US3: Depends on US1 reward mechanics (daily chest and quest completion events).
- US4: Depends on US2 collaborative/motivation mechanics and Foundational audit plumbing.

### Within Each User Story

- Acceptance coverage task before endpoint and UI completion.
- Backend endpoints before client-side wiring.
- Data persistence helpers before higher-level route orchestration.
- Learner/teacher UI rendering after API contracts stabilize.

## Parallel Opportunities

- Setup: T002, T003, and T004 can run in parallel after T001 kickoff.
- Foundational: T007, T008, and T010 can run in parallel after T006.
- US1: T014, T015, and T016 can run in parallel after T013 contract shape is set.
- US2: T022 and T023 can run in parallel after T021 route planning.
- US3: T029 and T030 can run in parallel after T028 reward event definitions.
- US4: T034 and T036 can run in parallel after T033 endpoint contracts are confirmed.
- Polish: T038 and T039 can run in parallel before T040.

## Parallel Example: User Story 1

- Parallel task: T014 in demo/apps/learner-web/server.js
- Parallel task: T015 in demo/apps/learner-web/server.js
- Parallel task: T016 in demo/apps/learner-web/server.js
- Follow-up tasks: T017, T018, T019 in demo/apps/learner-web/public/index.html

## Parallel Example: User Story 2

- Parallel task: T022 in demo/apps/learner-web/server.js
- Parallel task: T023 in demo/apps/learner-web/db/index.js
- Follow-up tasks: T024, T025, T026 in demo/apps/learner-web/public/index.html

## Parallel Example: User Story 4

- Sequential core: T033 in demo/apps/teacher-console/server.js then T035 in demo/apps/learner-web/server.js
- Parallel follow-up: T034 in demo/apps/teacher-console/server.js and T036 in demo/apps/teacher-console/public/index.html
- Validation: T037 in demo/apps/learner-web/public/index.html and T032 in demo/scripts/acceptance_tests.ps1

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) as the MVP.
3. Validate dashboard-first flow and boss/chest criteria before enabling broader collaboration features.

### Incremental Delivery

1. Foundation first (Phases 1-2).
2. Ship US1 (daily loop and dashboard).
3. Ship US2 (collaborative motivation).
4. Ship US3 (fair recognition gallery).
5. Ship US4 (teacher oversight controls).
6. Complete Phase 7 evidence and release checks.

### Parallel Team Strategy

1. Backend/data team: T006-T016, T021-T023, T028-T029, T033-T035.
2. Frontend learner team: T017-T019, T024-T026, T030-T031, T037.
3. Teacher/compliance/validation team: T001-T005, T032, T036, T038-T041.
