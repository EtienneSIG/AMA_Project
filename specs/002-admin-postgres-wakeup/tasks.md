# Tasks: Admin PostgreSQL Wake-Up Control

**Input**: Design documents from `/specs/002-admin-postgres-wakeup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-postgres-wakeup.openapi.yaml, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align operational scope, dependencies, and deployment surfaces before backend and UI work starts.

- [X] T001 Confirm feature environment variables and PostgreSQL ARM target naming in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T002 [P] Validate managed identity dependency and runtime assumptions in demo/apps/admin/package.json (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T003 [P] Create fallback script scaffold with parameters and usage banner in demo/scripts/postgres_wakeup.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared backend primitives required by all user stories.

**CRITICAL**: No user story implementation should start before this phase is complete.

- [X] T004 Add reusable PostgreSQL ARM helper functions (read state, request start, map outcomes) in demo/apps/admin/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T005 [P] Add operational audit persistence helper(s) for postgres status/wakeup events in demo/apps/admin/db/index.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [X] T006 [P] Add schema migration for postgres operational audit event storage in demo/apps/admin/db/schema.sql (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T007 Add correlation-id propagation and structured error mapping for postgres operations in demo/apps/admin/server.js (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: Shared ARM + audit foundations are in place.

---

## Phase 3: User Story 1 - Detect PostgreSQL availability state from admin app (Priority: P1) MVP

**Goal**: Operators can read current PostgreSQL lifecycle state quickly from the admin app.

**Independent Test**: Calling GET status from admin app shows state, checked timestamp, and non-destructive error guidance when lookup fails.

### Implementation for User Story 1

- [X] T008 [US1] Implement GET /api/admin/postgres/status with role-gated access and audit emission in demo/apps/admin/server.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T009 [P] [US1] Add PostgreSQL operations status panel markup and state legend in demo/apps/admin/public/index.html (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T010 [US1] Add client-side status fetch, refresh action, checked-at rendering, and transient-error guidance in demo/apps/admin/public/index.html (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [X] T011 [US1] Add status endpoint acceptance coverage and expected-state assertions in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: User Story 1 is independently testable in admin UI and API.

---

## Phase 4: User Story 2 - Trigger PostgreSQL wake-up safely from admin app (Priority: P1)

**Goal**: Authorized operators can wake a stopped PostgreSQL server with idempotent outcomes and progress feedback.

**Independent Test**: With PostgreSQL stopped, POST wake-up returns accepted or in-progress, and repeated status refresh reaches Ready without duplicate-start behavior.

### Implementation for User Story 2

- [X] T012 [US2] Implement POST /api/admin/postgres/wakeup with idempotent outcome handling and audit emission in demo/apps/admin/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T013 [P] [US2] Add wake-up control, outcome banner, and progress-state placeholders in demo/apps/admin/public/index.html (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T014 [US2] Wire CSRF-safe wake-up request flow and polling refresh integration in demo/apps/admin/public/csrf.js (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [X] T015 [US2] Extend PostgreSQL panel client logic for accepted, in-progress, already-running, and failed outcome messaging in demo/apps/admin/public/index.html (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [X] T016 [US2] Add wake-up endpoint acceptance coverage for stopped, starting, and ready states in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [X] T016a [US2] Add explicit unauthorized-caller checks (401/403) for POST wake-up in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: User Story 2 wake-up flow is independently testable through admin UI and API.

---

## Phase 5: User Story 3 - Use documented operational flow for incidents and demos (Priority: P2)

**Goal**: Operators can recover PostgreSQL through a documented and scripted flow when needed.

**Independent Test**: A new operator follows scripts/docs and restores PostgreSQL without tribal knowledge.

### Implementation for User Story 3

- [X] T017 [US3] Implement full fallback workflow (state check, start, readiness polling, timeout exits) in demo/scripts/postgres_wakeup.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T018 [US3] Integrate fallback invocation and operator prompts into demo/scripts/run_demo.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T019 [US3] Document admin UI recovery path and scripted fallback flow in demo/README.md (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T020 [US3] Update operator validation steps and escalation guidance in specs/002-admin-postgres-wakeup/quickstart.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [X] T021 [US3] Add failure-mode remediation notes (RBAC, ARM throttling, prolonged starting) in demo/DEPLOYMENT-TUTORIAL.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

**Checkpoint**: User Story 3 runbook and fallback execution are independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final compliance, verification, and release readiness checks spanning all stories.

- [X] T022 [P] Reconcile API responses with OpenAPI examples and update specs/002-admin-postgres-wakeup/contracts/admin-postgres-wakeup.openapi.yaml (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [X] T023 Validate constitutional compliance evidence for Art. 12 logging and Art. 14 human oversight in plan/04-compliance-eu-ai-act-gdpr.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [X] T024 Run end-to-end operator drill and capture pass/fail evidence in demo/DEPLOYMENT-REPORT.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [X] T025 Measure status endpoint p95 latency (<= 2000 ms) and wake-up acknowledgement timing (<= 3000 ms) using scripted checks in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [X] T026 Record explicit sign-off gate from responsible-ai-evaluator and cross-agent-qa-verifier in specs/002-admin-postgres-wakeup/quickstart.md before implementation release (Accountable: agents/edtech-program-orchestrator.chatmode.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): Starts immediately.
- Phase 2 (Foundational): Depends on Phase 1 and blocks all user stories.
- Phase 3 (US1): Depends on Phase 2.
- Phase 4 (US2): Depends on Phase 2; uses US1 status surfaces for progress visibility.
- Phase 5 (US3): Depends on Phase 3 and Phase 4 behavior being available for documentation and fallback parity.
- Phase 6 (Polish): Depends on completion of Phases 3, 4, and 5.

### User Story Dependencies

- US1: Independent after Phase 2.
- US2: Independent after Phase 2, with integration touchpoint to US1 status refresh panel.
- US3: Depends on validated US1 and US2 operational behavior to document exact steps.

### Within Each User Story

- Backend endpoint implementation before UI wiring.
- UI controls before acceptance test finalization.
- Acceptance validation before moving to next phase checkpoint.

## Parallel Opportunities

- Setup: T002 and T003 can run in parallel after T001.
- Foundational: T005 and T006 can run in parallel after T004.
- US1: T009 can run in parallel with T008, then T010 depends on both.
- US2: T013 can run in parallel with T012, then T014 and T015 follow.
- US3: T019 and T021 can run in parallel after T017 and T018.
- Polish: T022 and T023 can run in parallel before T024.

## Parallel Example: User Story 1

- Parallel task: T008 in demo/apps/admin/server.js
- Parallel task: T009 in demo/apps/admin/public/index.html
- Follow-up task: T010 in demo/apps/admin/public/index.html
- Verification task: T011 in demo/scripts/acceptance_tests.ps1

## Parallel Example: User Story 2

- Parallel task: T012 in demo/apps/admin/server.js
- Parallel task: T013 in demo/apps/admin/public/index.html
- Follow-up tasks: T014 in demo/apps/admin/public/csrf.js and T015 in demo/apps/admin/public/index.html
- Verification task: T016 in demo/scripts/acceptance_tests.ps1

## Parallel Example: User Story 3

- Sequential core: T017 in demo/scripts/postgres_wakeup.ps1 then T018 in demo/scripts/run_demo.ps1
- Parallel documentation: T019 in demo/README.md and T021 in demo/DEPLOYMENT-TUTORIAL.md
- Compliance verification: T020 in specs/002-admin-postgres-wakeup/quickstart.md

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) and validate status visibility.
3. Deliver Phase 4 (US2) and validate wake-up control path.
4. Run acceptance checks before broadening scope.

### Incremental Delivery

1. Foundation first (Phases 1-2).
2. Ship US1 for operator visibility.
3. Ship US2 for operator actionability.
4. Ship US3 scripts/docs for incident resilience.
5. Complete Phase 6 evidence and compliance updates.

### Parallel Team Strategy

1. One engineer handles backend ARM and audit tasks (T004, T007, T008, T012).
2. One engineer handles admin UI tasks (T009, T010, T013, T015).
3. One engineer handles scripts/docs/compliance tasks (T017-T024).
