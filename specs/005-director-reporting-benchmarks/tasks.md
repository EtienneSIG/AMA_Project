# Tasks: Director Reporting Benchmarks

**Input**: Design documents from `/specs/005-director-reporting-benchmarks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/director-reporting.md, quickstart.md

**Organization**: Tasks are grouped by user story so the director benchmark increment can ship in bounded demo slices: shared reporting foundations, class trend reporting, establishment-versus-national benchmarking, then governance and audit evidence.

> **Implementation note (avoid overwrites)**: `demo/apps/_shared/` is the source of truth for `db/schema.sql`, `db/index.js`, `auth.js`, and `contentSafety.js`; per-app copies are mirrors produced by `demo/apps/_shared/sync.ps1`. Edit `_shared/` only for these files, then run sync — never edit a per-app mirror directly. App-specific files (`director-portal/server.js`, `reporting/report-config.js`, `config/reporting.json`, `public/*.html`) already contain Feature 004/005 code; EXTEND them additively as flagged per task, do not regenerate.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare deterministic demo fixtures, implementation notes, and executable verification guidance before code changes land.

**GATE: Suppression Thresholds and Re-Identification Policy Required Before Phase 2**

Director reporting suppression rules must be finalized by compliance specialists and integrated into the schema before any feature code is written. Incomplete or changing suppression policy introduces regulatory risk.

- [ ] T000 EU AI Act Compliance Officer + GDPR Children's Data Specialist: review and approve suppression policy from specs/005-director-reporting-benchmarks/data-model.md (cohort thresholds, K-anonymity rules, re-identification risk assessment); document approvals and dates in specs/005-director-reporting-benchmarks/checklists/gdpr-ai-act-compliance.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md and agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T000a Privacy-Preserving ML Engineer: block Phase 2 tasks if suppression policy approval is not present; confirm Phase 0 completion before Foundational phase begins (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T001 EdTech Program Orchestrator: update demo/apps/director-portal/README.md with the benchmark increment scope, touched files, and demo verification entry points (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING FILE: append the benchmark increment section; do not overwrite the current README.**
- [ ] T002 [P] Demo Deployment Agent: extend deterministic reporting fixtures for approved periods, in-scope classes, suppressed classes, and national benchmark snapshots in demo/scripts/seed_learners.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T003 [P] Cross-Agent QA Verifier: tighten the executable benchmark quickstart for authorized, suppressed, benchmark-unavailable, and no-scope cases in specs/005-director-reporting-benchmarks/quickstart.md (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T003a [P] EU AI Act Compliance Officer: author the Annex IV technical-file fragment for the reporting controls (intended purpose and non-autonomous nature, aggregation/benchmark pipeline, server-side suppression enforcement, Art. 9 risk outcomes, Art. 10 data classes, Art. 12 logging, Art. 13 transparency states, Art. 14 advisory-only oversight, Art. 15 fail-closed scope controls) in specs/005-director-reporting-benchmarks/contracts/annex-iv-fragment.md (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the shared schema, helper, metadata, and fail-closed route foundations that every reporting story depends on.

**CRITICAL**: No user story work starts before this phase is complete.

- [ ] T004 GDPR Children's Data Specialist: extend demo/apps/_shared/db/schema.sql with reporting period, metric definition, class trend snapshot, establishment benchmark snapshot, suppression decision, and reporting audit structures needed by the increment (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T005 [P] Privacy-Preserving ML Engineer: implement approved-period lookup, scoped class trend aggregation, national benchmark aggregation, and suppression-decision helpers in demo/apps/_shared/db/index.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T006 [P] EdTech Program Orchestrator: wire approved reporting metadata loading, period ordering, metric availability, and fail-closed defaults in demo/apps/director-portal/reporting/report-config.js and demo/apps/director-portal/config/reporting.json (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING FILES: report-config.js (~103 lines) and config/reporting.json already load and normalize the Power BI/Fabric embed config. EXTEND with period/metric availability; preserve the existing `fabric` block, `reports` array, scope filtering, and `normalizeReport`/`getApprovedReportsForScope` logic. Do not regenerate.**
- [ ] T007 EU AI Act Compliance Officer: extend demo/apps/director-portal/server.js to validate director scope, reject unsupported period and metric combinations, and expand GET /api/reporting/metadata with supported periods, metrics, and benchmark availability (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md) — **EXISTING ROUTES: GET /api/reporting/metadata and GET /api/reporting/embed/:reportId already exist in server.js (~617 lines). EXTEND the metadata response additively; keep the Power BI embed fields and the embed route intact. Do not replace the file.**

**Checkpoint**: Shared reporting data, metadata, and route guardrails are in place and user stories can begin.

---

## Phase 3: User Story 1 - Follow Class Evolution Within the Establishment (Priority: P1) MVP

**Goal**: Deliver scoped class trend reporting with approved period selection, suppression handling, and clear missing-history states.

**Independent Test**: An authorized director can load approved reporting metadata, choose a valid current and prior period, and review aggregated class trend rows for the authorized establishment only, while small cohorts are suppressed and insufficient-history classes return a clear status.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Cross-Agent QA Verifier: extend demo/scripts/verify-director-portal.ps1 to assert authorized metadata and class trend retrieval plus suppressed and missing-history trend outcomes (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T009 [US1] Privacy-Preserving ML Engineer: implement GET /api/reporting/trends orchestration and response shaping in demo/apps/director-portal/server.js using shared helper suppression and missing-history states (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T010 [P] [US1] Demo Deployment Agent: add reporting period and metric selectors plus class trend containers and loading states in demo/apps/director-portal/public/index.html (Accountable: agents/demo-deployment-agent.chatmode.md) — **EXISTING FILE: index.html (~185 lines) already provides `buildTrendPath`, `metricCard`, `formatPct`, `formatDelta`, the `Suppressed` display, and the `/api/reporting/metadata` fetch. REUSE these helpers and wire them to the new trends/benchmark endpoints; do not regenerate the page.**
- [ ] T011 [US1] Learning Sciences Expert: add plain-language trend interpretation, missing-history messaging, and advisory follow-up guidance in demo/apps/director-portal/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)

**Checkpoint**: User Story 1 is independently functional and demo-ready for scoped class evolution reporting.

---

## Phase 4: User Story 2 - Benchmark the Establishment Against the National Average (Priority: P1)

**Goal**: Deliver establishment-versus-national benchmark reporting with explicit comparability, suppression, and benchmark-unavailable states.

**Independent Test**: An authorized director can open a benchmark view for an approved metric and period, see establishment and national values computed from the same definition, and receive a clear unavailable or suppressed state when comparison rules block a result.

### Implementation for User Story 2

- [ ] T012 [P] [US2] Cross-Agent QA Verifier: extend demo/scripts/verify-director-portal.ps1 to assert ready, suppressed, and benchmark-unavailable benchmark responses for approved and blocked users (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T013 [US2] Privacy-Preserving ML Engineer: implement GET /api/reporting/benchmarks orchestration, comparability checks, and interpretation payload shaping in demo/apps/director-portal/server.js (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [ ] T014 [P] [US2] Demo Deployment Agent: add establishment-versus-national benchmark cards, delta summaries, and benchmark-unavailable rendering in demo/apps/director-portal/public/index.html (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T015 [US2] Responsible AI Evaluator: tune benchmark interpretation text and non-drillable comparison presentation in demo/apps/director-portal/public/index.html so the view remains advisory and non-misleading (Accountable: agents/responsible-ai-evaluator.chatmode.md)

**Checkpoint**: User Story 2 is independently functional and shows benchmark context without leaking unauthorized or non-comparable detail.

---

## Phase 5: User Story 3 - Review Reporting With Governance and Human Oversight Intact (Priority: P2)

**Goal**: Make reporting access, benchmark views, period changes, and suppression outcomes auditable while keeping the portal aggregated-only and advisory.

**Independent Test**: A reviewer can verify audit records for reporting access, period changes, benchmark opens, suppression outcomes, and blocked requests, while the UI clearly states that the reporting surface is aggregated-only and does not automate learner-level action.

### Implementation for User Story 3

- [ ] T016 [US3] GDPR Children's Data Specialist: extend reporting audit persistence for period selections, benchmark opens, suppression outcomes, and blocked access in demo/apps/_shared/db/index.js (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [ ] T017 [US3] EU AI Act Compliance Officer: emit audit events and transparency states for metadata, trend, benchmark, and blocked requests in demo/apps/director-portal/server.js (Accountable: agents/eu-ai-act-compliance-officer.chatmode.md)
- [ ] T018 [P] [US3] Learning Sciences Expert: add aggregated-only, teacher-led follow-up, and no-automated-decision governance copy in demo/apps/director-portal/public/index.html and demo/apps/director-portal/public/no-access.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T018a [US3] Responsible AI Evaluator: enforce and verify suppression parity for FR-008 across every output path in scope (on-screen trend/benchmark views, exports/downloads, and any saved or shared reporting state) so no path can emit values for a below-threshold cohort; assert in demo/scripts/verify-director-portal.ps1 that no unsuppressed export/share path exists (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T019 [US3] Cross-Agent QA Verifier: document audit evidence review and human-oversight acceptance checks in specs/005-director-reporting-benchmarks/quickstart.md and demo/apps/director-portal/README.md (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: User Story 3 provides reviewable compliance and governance evidence for the reporting increment.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Package, verify, and document the complete demo-ready increment.

- [ ] T020 [P] Demo Deployment Agent: run the shared mirror and package flow for the director portal benchmark increment via demo/apps/_shared/sync.ps1 and demo/apps/build-zip.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T021 Demo Deployment Agent: complete authenticated end-to-end validation for director@learneu.demo and director.noscope@learneu.demo in demo/scripts/verify-director-portal.ps1 and record the run in demo/DEPLOYMENT-REPORT.md (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T022 [P] Responsible AI Evaluator: capture suppression consistency, benchmark correctness, and unavailable-data evidence in demo/DEPLOYMENT-REPORT.md (Accountable: agents/responsible-ai-evaluator.chatmode.md)
- [ ] T023 [P] Cross-Agent QA Verifier: reconcile delivered routes and UI states with specs/005-director-reporting-benchmarks/contracts/director-reporting.md and specs/005-director-reporting-benchmarks/quickstart.md (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) starts immediately.
- Foundational (Phase 2) depends on Setup and blocks all user stories.
- User Story 1 (Phase 3) depends on the Foundational phase.
- User Story 2 (Phase 4) depends on the Foundational phase and should follow User Story 1 once the shared selector and metadata surface is stable.
- User Story 3 (Phase 5) depends on User Stories 1 and 2 because the audit and governance evidence must cover both trend and benchmark flows.
- Polish (Phase 6) depends on the completion of the desired user stories.

### User Story Dependencies

- User Story 1 is the MVP and can be validated on its own after the foundational work.
- User Story 2 reuses the approved period and metric plumbing from User Story 1 but remains independently testable once its route and UI slice are complete.
- User Story 3 depends on the implemented trend and benchmark paths so audit events and transparency copy cover the real reporting experience.

### Within Each User Story

- Extend executable verification before finalizing the route and UI slice.
- Backend route orchestration before final UI interpretation copy.
- Shared helper and audit persistence changes before server-side logging and transparency behavior.
- Full authenticated smoke verification before deployment evidence is recorded.

### Parallel Opportunities

- Setup: T002 and T003 can run in parallel after T001.
- Foundational: T005 and T006 can run in parallel after T004; T007 follows both.
- User Story 1: T008 and T010 can run in parallel once T007 is complete; T009 and T011 then finalize the trend flow.
- User Story 2: T012 and T014 can run in parallel after T007; T013 and T015 complete the benchmark behavior.
- User Story 3: T018 can run in parallel with T016; T017 and T019 finish the governance slice.
- Polish: T020, T022, and T023 can run in parallel before T021 closes the final evidence loop.

---

## Parallel Example: User Story 1

- Parallel task: T008 in demo/scripts/verify-director-portal.ps1
- Parallel task: T010 in demo/apps/director-portal/public/index.html
- Follow-up tasks: T009 in demo/apps/director-portal/server.js and T011 in demo/apps/director-portal/public/index.html

## Parallel Example: User Story 2

- Parallel task: T012 in demo/scripts/verify-director-portal.ps1
- Parallel task: T014 in demo/apps/director-portal/public/index.html
- Follow-up tasks: T013 in demo/apps/director-portal/server.js and T015 in demo/apps/director-portal/public/index.html

## Parallel Example: User Story 3

- Parallel task: T016 in demo/apps/_shared/db/index.js
- Parallel task: T018 in demo/apps/director-portal/public/index.html and demo/apps/director-portal/public/no-access.html
- Follow-up tasks: T017 in demo/apps/director-portal/server.js and T019 in specs/005-director-reporting-benchmarks/quickstart.md and demo/apps/director-portal/README.md

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 for scoped class trend reporting.
3. Validate authorized, suppressed, and missing-history trend cases before adding benchmarks.

### Incremental Delivery

1. Land shared schema, helper, metadata, and fail-closed route foundations.
2. Ship User Story 1 for class evolution reporting.
3. Ship User Story 2 for establishment-versus-national comparison.
4. Ship User Story 3 for auditability, transparency, and governance evidence.
5. Finish with sync, packaging, authenticated smoke validation, and release evidence.

### Parallel Team Strategy

1. Shared data and API team: T004-T009, T013, T016-T017.
2. Director portal UI team: T010-T011, T014-T015, T018.
3. Verification and release team: T001-T003, T008, T012, T019-T023.