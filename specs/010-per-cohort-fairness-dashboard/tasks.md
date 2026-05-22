---
description: "Task list for spec 010 — Per-Cohort Fairness Dashboard"
---

# Tasks: Per-Cohort Fairness Dashboard

**Input**: Design documents from `/specs/010-per-cohort-fairness-dashboard/`
**Prerequisites**: spec.md ✅, plan.md ✅, checklists/compliance.md ✅
**Branch**: `010-per-cohort-fairness-dashboard`
**Deploy cycle**: `demo/feature/EXECUTION-PLAN.md` (8 steps)

## Format: `[ID] [P?] [Story] Description — @agent`

---

> **Implementation status (2026-05-22)**: no production code exists for this
> feature yet. The complete tasks.md below is **NEW work** scheduled for a
> future PR sequence. Spec/plan/checklists are landed; implementation is the
> next step. DEPLOYMENT-REPORT will not flip the row for this feature until
> the user-stories ship and a green authenticated smoke is captured.
>
> **Net-new in this commit**: spec/plan/tasks/checklists scaffolding + this
> status note. No production code changed.
## Phase 1: Setup

- [ ] T001 Confirm branch clean; add IN-PROGRESS row in `demo/DEPLOYMENT-REPORT.md`. — **@edtech-program-orchestrator**
- [ ] T002 [P] Risk-register row added: `fairness-010`. — **@eu-ai-act-compliance-officer**
- [ ] T003 [P] Confirm `ask_history` and `content_safety_results` schemas expose the four cohort axes via a learner-id join. — **@responsible-ai-evaluator**

---

## Phase 2: Foundational — aggregate service (BLOCKS user stories)

- [ ] T004 Implement `demo/apps/admin/services/fairness-aggregate.js` — in-DB aggregate with `n < 10` suppression baked in (FR-005, FR-008). — **@responsible-ai-evaluator**
- [ ] T005 Add cohort-axis indexes to `ask_history` and `content_safety_results` via `demo/scripts/db-sync.ps1`. — **@demo-deployment-agent**
- [ ] T006 [P] Write `demo/observability/fairness-workbook.kql` reproducing the same numbers. — **@responsible-ai-evaluator**

**Checkpoint**: aggregate service returns rows for seed data, suppression applied.

---

## Phase 3: User Story 1 — Cohort breakdown view (P1) 🎯 MVP

- [ ] T010 [P] [US1] Implement `routes/fairness.js` → `GET /admin/fairness` reading from the aggregate service. — **@edtech-program-orchestrator**
- [ ] T011 [P] [US1] Build `public/fairness.html` + `js/fairness.js` rendering one row per cohort. — **@edtech-program-orchestrator**
- [ ] T012 [US1] Empty-cohort styling with `n=0` and blanked metrics. — **@edtech-program-orchestrator**
- [ ] T013 [US1] Page render integration test on seed data (SC-001). — **@responsible-ai-evaluator**

**Checkpoint**: dashboard visible; metrics populated from seed.

---

## Phase 4: User Story 2 — Disparity red-flag (P2)

- [ ] T020 [P] [US2] Compute `max − min` per metric; threshold 5 pp; build `views/partials/fairness-banner.ejs` (FR-004). — **@responsible-ai-evaluator**
- [ ] T021 [US2] Highlight involved rows; banner copy reviewed by RAI. — **@responsible-ai-evaluator**
- [ ] T022 [US2] Injected-disparity test ensures banner triggers in 100 % of test cases (SC-002). — **@responsible-ai-evaluator**
- [ ] T023 [US2] Release-process update: any red banner blocks release until investigation. — **@cross-agent-qa-verifier**

**Checkpoint**: disparity surveillance live; release-gate copy approved.

---

## Phase 5: User Story 3 — Annex IV CSV export (P3)

- [ ] T030 [P] [US3] Implement `services/csv-export.js` with deterministic column order and timestamp formatting (FR-006). — **@edtech-program-orchestrator**
- [ ] T031 [US3] Wire **Export CSV** button on `fairness.html`. — **@edtech-program-orchestrator**
- [ ] T032 [US3] Deterministic-CSV test (`tests/unit/fairness-csv-deterministic.test.ts`) — two consecutive exports byte-identical (SC-003). — **@responsible-ai-evaluator**
- [ ] T033 [US3] Annex IV technical file references the CSV format and the workbook. — **@eu-ai-act-compliance-officer**

**Checkpoint**: auditable evidence stream ready for the next release.

---

## Phase 6: Compliance, polish, deploy

- [ ] T040 [P] Run compliance checklist (`checklists/compliance.md`); all items green. — **@eu-ai-act-compliance-officer**, **@responsible-ai-evaluator**
- [ ] T041 [P] Section #7 of `Subject/AMA_Rubric_Evaluation.md` cites the dashboard (post next eval). — **@cross-agent-qa-verifier**
- [ ] T042 Run `/speckit.analyze` — must return clean. — **@cross-agent-qa-verifier**
- [ ] T043 Execute the 8-step deploy cycle; capture an authenticated green smoke on the dev slot. — **@demo-deployment-agent**
- [ ] T044 Flip `demo/DEPLOYMENT-REPORT.md` row to PASS; tick row in `Subject/ama-rubric-remediation-plan.md`. — **@demo-deployment-agent**
- [ ] T045 Final sign-off and merge to main. — **@cross-agent-qa-verifier**

---

## Dependencies & Execution Order

- Phase 2 blocks all user stories.
- US1 → US2 → US3 are stacked by data (you need the breakdown before
  disparity, and disparity before a useful CSV).

### Parallel opportunities

- T002 ‖ T003 in Phase 1.
- T004 ‖ T005 ‖ T006 inside Phase 2 (T005 after T004).
- T010 ‖ T011 in US1.

## Notes

- One agent per task — Principle VII traceability.
- Conventional commits: `feat(admin): fairness …`, `compliance(admin): …`.
- Aggregates only. Never expose individual data. `n < 10` suppression is
  non-negotiable.
