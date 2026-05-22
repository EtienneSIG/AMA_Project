---
description: "Task list for spec 012 — Week-Plan Composer Agent (runtime agent loop)"
---

# Tasks: Week-Plan Composer Agent

**Input**: Design documents from `/specs/012-week-plan-composer-agent/`
**Prerequisites**: spec.md ✅, plan.md ✅, checklists/compliance.md ✅
**Branch**: `012-week-plan-composer-agent`
**Deploy cycle**: `demo/feature/EXECUTION-PLAN.md` (8 steps)

## Format: `[ID] [P?] [Story] Description — @agent`

---

## Phase 1: Setup

- [ ] T001 Confirm branch clean; add IN-PROGRESS row "week-plan-composer-012" in `demo/DEPLOYMENT-REPORT.md`. — **@edtech-program-orchestrator**
- [ ] T002 [P] DPIA delta merged in `demo/compliance/dpia-learnEU-v1.md` §"Week-Plan Composer". — **@gdpr-children-data-specialist**
- [ ] T003 [P] Risk-register row "week-plan-composer-012" with auto-pause mitigation. — **@eu-ai-act-compliance-officer**
- [ ] T004 [P] Annex IV fragment `demo/compliance/annex-iv/week-plan-composer.md` drafted. — **@eu-ai-act-compliance-officer**

---

## Phase 2: Foundational — schema, gate, AI Search index (BLOCKS user stories)

- [ ] T005 Add migrations for `week_plans`, `week_plan_days`, `week_plan_decisions`, `week_plan_pauses` in `demo/scripts/db-sync.ps1`. — **@demo-deployment-agent**
- [ ] T006 Initialise AI Search curriculum index with provenance header; no learner records. — **@privacy-preserving-ml-engineer**
- [ ] T007 Implement `services/tool-trace.js` Art. 12 logger (tool sequence, model version, prompt hash, safety verdict, cohort keys). — **@eu-ai-act-compliance-officer**
- [ ] T008 [P] Implement `routes/propose.js` server-side gate: refuses persist without `teacher_approved=true` (FR-005); contract test in `tests/contract/week-plan-teacher-gate.test.ts`. — **@eu-ai-act-compliance-officer**
- [ ] T009 [P] Implement `services/release-gate.js` auto-pause logic (override > 10 %, safety > 0.1 %, disparity > 5 pp); unit test `tests/unit/week-plan-release-gate.test.ts`. — **@responsible-ai-evaluator**

**Checkpoint**: schema + gate + index + auto-pause logic green; teacher-gate contract test PASS.

---

## Phase 3: User Story 1 — Draft a week plan (P1) 🎯 MVP

- [ ] T010 [P] [US1] Implement `chain/retrieve.js` — AI Search retrieval with seeded ZPD selection (P=0.7). — **@learning-sciences-expert**
- [ ] T011 [P] [US1] Implement `chain/compose.js` — AOAI call with pseudonymous-only payload (FR-003); unit test `tests/unit/week-plan-no-pii.test.ts`. — **@privacy-preserving-ml-engineer**
- [ ] T012 [US1] Implement `chain/safeguard.js` — Content Safety scan; non-accept verdict drops the plan and logs Art. 12 failure (FR-004). — **@privacy-preserving-ml-engineer**
- [ ] T013 [US1] Implement `agent-week-plan/index.js` — cron + on-demand entry; honours consent capability flag (FR-010). — **@edtech-program-orchestrator**
- [ ] T014 [US1] Persist proposed plan via internal queue-only path; never via the public propose endpoint. — **@edtech-program-orchestrator**
- [ ] T015 [US1] Replay test: same mastery + same seed → same candidate items. — **@responsible-ai-evaluator**

**Checkpoint**: agent produces a `proposed` plan with full tool trace; nothing reaches the learner. **STOP and VALIDATE** before US2.

---

## Phase 4: User Story 2 — Teacher review with diff (P2)

- [ ] T020 [P] [US2] Implement `teacher-console/routes/week-plan-reviews.js` queue listing `proposed` plans for the teacher's classes. — **@edtech-program-orchestrator**
- [ ] T021 [P] [US2] Build `public/week-plan-reviews.html` + `js/week-plan-diff.js` day-by-day diff (added / removed / unchanged) vs previously accepted plan; "no previous" → all rows "added" (edge case). — **@edtech-program-orchestrator**
- [ ] T022 [US2] Implement `services/week-plan-decisions.js` — accept / edit / reject; records actor + timestamp + edits + comment (FR-006). — **@edtech-program-orchestrator**
- [ ] T023 [US2] On accept, invoke `POST /api/week-plan/propose` with `teacher_approved=true` carrying the final (post-edit) plan. — **@edtech-program-orchestrator**
- [ ] T024 [US2] 24-hour override window: later accept/reject reversal allowed; afterwards immutable (FR-012). — **@eu-ai-act-compliance-officer**
- [ ] T025 [US2] Localise reviewer copy (NL, DE, PL, RO, FR-BE). — **@content-localisation-lead**

**Checkpoint**: full review loop green; no plan persists without a teacher decision recorded.

---

## Phase 5: User Story 3 — Publish to the learner's tabbed workspace (P3)

- [ ] T030 [P] [US3] Implement `learner-web/routes/week-plan.js` → `GET /api/week-plan/me` returning the latest accepted plan if consent allows. — **@edtech-program-orchestrator**
- [ ] T031 [P] [US3] Extend `learner-web/public/js/tab-progress.js` to render a "Week plan" card (spec 001 host) with teacher attribution and `accepted_at`. — **@edtech-program-orchestrator**
- [ ] T032 [US3] Cache invalidation push so the learner sees the card within ≤ 5 s of accept (SC-006). — **@edtech-program-orchestrator**
- [ ] T033 [US3] Hide accepted plan immediately on consent withdrawal in learner-web (spec 008 cross-cutting). — **@privacy-preserving-ml-engineer**
- [ ] T033b [US3] Hide proposed plan entry in the Teacher Console review queue immediately on consent withdrawal (spec 008 cross-cutting). Test in `tests/unit/week-plan-consent-gate.test.ts`. — **@privacy-preserving-ml-engineer**
- [ ] T034 [US3] Localise plan-card strings (NL, DE, PL, RO, FR-BE). — **@content-localisation-lead**

**Checkpoint**: end-to-end flow live: agent → queue → teacher review → learner card.

---

## Phase 6: Release gates, observability, polish

- [ ] T040 [P] Write `demo/observability/week-plan-gates.kql` dashboard query for override / safety / disparity. — **@responsible-ai-evaluator**
- [ ] T041 [P] Auto-pause notification path: Service Bus → Responsible AI Evaluator within ≤ 5 min (CHK015). — **@responsible-ai-evaluator**
- [ ] T042 Wire spec 010 disparity calculation as the single source of truth for cohort disparity (CHK014). — **@responsible-ai-evaluator**
- [ ] T043 Update `restitution/slides/slide-09-autonomy.md` to reference the agent surface (SC-007). — **@demo-deployment-agent**

---

## Phase 7: Compliance, deploy, ship

- [ ] T050a [P] Compliance gate — GDPR & data-minimisation items (CHK001–CHK004); all green or waived with rationale. — **@gdpr-children-data-specialist**
- [ ] T050b [P] Compliance gate — EU AI Act high-risk items (CHK005–CHK011) and Annex IV fragment; all green or waived. — **@eu-ai-act-compliance-officer**
- [ ] T050c [P] Compliance gate — RAI release-gate items (CHK012–CHK015) and pedagogy items (CHK016–CHK017); all green or waived. — **@responsible-ai-evaluator**
- [ ] T051 [P] Cross-Agent QA Verifier reviews the runbook for the auto-pause kill switch. — **@cross-agent-qa-verifier**
- [ ] T052 `/speckit.analyze` clean across spec / plan / tasks. — **@cross-agent-qa-verifier**
- [ ] T053 Execute the 8-step deploy cycle on the dev slot; capture authenticated green smoke. — **@demo-deployment-agent**
- [ ] T054 Flip `demo/DEPLOYMENT-REPORT.md` row to PASS; tick row in `Subject/ama-rubric-remediation-plan.md`. — **@demo-deployment-agent**
- [ ] T055 Final sign-off and merge to main. — **@cross-agent-qa-verifier**

---

## Dependencies & Execution Order

- Phase 2 blocks all user stories.
- **External dependencies**: specs 001 (host tab), 008 (capability flag),
  010 (cohort disparity) MUST be merged before T030–T033 (US3) and T042
  (Phase 6) can land.
- US1 → US2 → US3 sequential by data; inside each, [P] tasks parallelise.
- Phase 6 (release gates + observability) can begin in parallel with US3
  once the auto-pause logic from Phase 2 is green.

### Parallel opportunities

- T002 ‖ T003 ‖ T004 in Phase 1.
- T008 ‖ T009 inside Phase 2 (after T005–T007).
- T010 ‖ T011 in US1.
- T020 ‖ T021 in US2.
- T030 ‖ T031 in US3.
- T040 ‖ T041 in Phase 6.

## Numbering cross-reference

> **Branch-number renaming**: the `Subject/ama-rubric-remediation-plan.md`
> rubric tracker refers to this feature as `004-week-plan-composer-agent`.
> The actual branch and spec folder are `012-week-plan-composer-agent`
> because stale unmerged branches `002`–`006` already existed in the repo,
> causing the auto-numbering script to jump. Similarly: rubric `002` →
> branch `008`, rubric `003` → branch `009`, rubric `005` → branch `010`,
> rubric `006` → branch `011`. T054 must update the rubric tracker row to
> reflect the `012` branch name.

## Notes

- One agent per task — Principle VII traceability.
- Conventional commits: `feat(agent-week-plan): …`, `compliance(agent-week-plan): …`.
- The auto-pause kill switch is **non-overridable in code**. The only resume
  path is a manual Responsible AI Evaluator action recorded in `week_plan_pauses`.
- This is the new high-risk runtime surface under the EU AI Act. Every
  sign-off matters; no shortcuts on the checklist.
