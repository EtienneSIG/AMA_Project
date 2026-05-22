---
description: "Task list for spec 011 — Autoscale Load Test"
---

# Tasks: Autoscale Load Test for learner-web

**Input**: Design documents from `/specs/011-autoscale-load-test/`
**Prerequisites**: spec.md ✅, plan.md ✅, checklists/compliance.md ✅
**Branch**: `011-autoscale-load-test`

## Format: `[ID] [P?] [Story] Description — @agent`

---

## Phase 1: Setup

- [ ] T001 Confirm branch clean; add "operational resilience" row to `demo/DEPLOYMENT-REPORT.md`. — **@edtech-program-orchestrator**
- [ ] T002 [P] Choose load generator (k6 default; autocannon if already present); log decision in `demo/scripts/load-test.ps1` header. — **@demo-deployment-agent**

---

## Phase 2: Foundational

- [ ] T003 Scaffold `demo/scripts/load-test.ps1` with parameter validation (refuse production-slot names — FR-008). — **@demo-deployment-agent**
- [ ] T004 [P] Write `demo/observability/autoscale-events.kql` returning scale events for a `(start, end)` window. — **@demo-deployment-agent**
- [ ] T005 [P] Create `demo/perf/LOAD-TEST-REPORT-template.md` with the required sections. — **@demo-deployment-agent**

**Checkpoint**: scaffolding in place; refusal-of-prod test green.

---

## Phase 3: User Story 1 — Run the load test (P1) 🎯 MVP

- [ ] T010 [US1] Implement ramp-and-hold load profile reaching the target concurrency (sustain CPU > 70 % for ≥ 10 min). — **@demo-deployment-agent**
- [ ] T011 [US1] Capture run manifest (`run_id`, `started_at`, `ended_at`, `target_concurrency`, `sustained_cpu_window`, `seed`, `operation_id`). — **@demo-deployment-agent**
- [ ] T012 [US1] Deterministic seed wiring (FR-010); same seed reproduces same load profile. — **@demo-deployment-agent**
- [ ] T013 [US1] No-PII assertion test on the synthetic traffic generator. — **@privacy-preserving-ml-engineer**

**Checkpoint**: one successful run produces a populated manifest.

---

## Phase 4: User Story 2 — Verify scale-out 1 → 2 (P2)

- [ ] T020 [US2] Query App Insights via the KQL file (T004) for the run window; assert at least one `1 → 2` event. — **@demo-deployment-agent**
- [ ] T021 [US2] Verdict logic: PASS iff a `1 → 2` event is found inside the sustained-CPU window. — **@cross-agent-qa-verifier**
- [ ] T022 [US2] On FAIL, surface the Bicep rule reference `demo/infra/modules/app-service.bicep:61-135` and the observed scale-trigger metric in the report. — **@demo-deployment-agent**

**Checkpoint**: verdict reliably derived from infra observability.

---

## Phase 5: User Story 3 — Capture latency + throughput and publish report (P3)

- [ ] T030 [P] [US3] Collect `p50`, `p95`, `p99` and `rps` at the generator; persist in manifest. — **@demo-deployment-agent**
- [ ] T031 [P] [US3] Render `demo/perf/LOAD-TEST-REPORT-<date>.md` from the template (FR-005). — **@demo-deployment-agent**
- [ ] T032 [US3] Unit test the report generator (`tests/unit/load-test-report.test.ts`). — **@demo-deployment-agent**
- [ ] T033 [US3] Annex IV §"Operational resilience" updated with the report link. — **@eu-ai-act-compliance-officer**

**Checkpoint**: report PR ready; verdict visible.

---

## Phase 6: Compliance, polish, ship

- [ ] T040 [P] Run compliance checklist (`checklists/compliance.md`). — **@cross-agent-qa-verifier**
- [ ] T041 [P] Cite the report in section #11 of `Subject/AMA_Rubric_Evaluation.md` (post next eval). — **@cross-agent-qa-verifier**
- [ ] T042 `/speckit.analyze` clean. — **@cross-agent-qa-verifier**
- [ ] T043 Flip `demo/DEPLOYMENT-REPORT.md` row to PASS on first green run; tick row in `Subject/ama-rubric-remediation-plan.md`. — **@demo-deployment-agent**
- [ ] T044 Final sign-off and merge to main. — **@cross-agent-qa-verifier**

---

## Dependencies & Execution Order

- Phase 2 blocks all user stories.
- US1 → US2 → US3 sequential by data; inside each, [P] tasks parallelise.

### Parallel opportunities

- T004 ‖ T005 in Phase 2.
- T030 ‖ T031 in US3.

## Notes

- One agent per task — Principle VII traceability.
- Conventional commits: `feat(perf): load-test scaffold`, `docs(perf): report …`.
- This test runs against the **dev slot only** by hard refusal.
- No PII generated. Deterministic seed required.
