---
description: "Task list for spec 001 — Learner Tabbed Workspace & Per-Chapter Progress (back-fill)"
---

# Tasks: Learner Tabbed Workspace & Per-Chapter Progress

**Input**: Design documents from `/specs/001-learner-tabbed-workspace/`
**Prerequisites**: spec.md ✅, plan.md ✅, checklists/compliance.md ✅
**Branch**: `001-learner-tabbed-workspace`
**Deploy cycle**: `demo/feature/EXECUTION-PLAN.md` (8 steps)

## Format: `[ID] [P?] [Story] Description — @agent`

- **[P]** Can run in parallel with other [P] tasks (different files, no dependency).
- **[Story]** Maps the task to a user story from spec.md (US1 / US2 / US3).
- **@agent** Names the accountable agent from `agents/` per Principle VII.

---

## Phase 1: Setup (shared)

- [ ] T001 Confirm branch `001-learner-tabbed-workspace` is checked out and clean. — **@edtech-program-orchestrator**
- [ ] T002 [P] Add a row to `demo/DEPLOYMENT-REPORT.md` for this feature (status: IN PROGRESS). — **@demo-deployment-agent**

---

## Phase 2: Foundational — schema + seed (BLOCKS all stories)

**⚠️ CRITICAL**: No UI task can start until the schema and seed back-fill are merged.

- [ ] T003 Add additive column `skills.chapter NVARCHAR(120) NULL` in `demo/scripts/db-sync.ps1` (step 1 of the 8-step cycle). — **@demo-deployment-agent**
- [ ] T004 Back-fill `chapter` for every existing row in `demo/data/skills.csv` (default `General` if unknown). — **@learning-sciences-expert**
- [ ] T005 Extend `demo/scripts/db-verify.ps1` to assert `< 5 %` of `skills.chapter` is NULL post-sync. — **@demo-deployment-agent**
- [ ] T006 [P] Update `demo/apps/learner-web/routes/mastery.js` to include `chapter` in `/api/mastery/me` response. — **@edtech-program-orchestrator**
- [ ] T007 [P] Confirm `_shared/` middleware (auth, CSRF, rate-limit, Content Safety) is unchanged. — **@privacy-preserving-ml-engineer**

**Checkpoint**: schema + seed + route ready → user stories unblocked.

---

## Phase 3: User Story 1 — Focus on practising (P1) 🎯 MVP

**Goal**: Default "Test your knowledge" tab with picker + tutor + collapsible Explanation drawer.
**Independent Test**: Log in as a learner, land on the tab, complete 3 adaptive items, toggle the drawer.

- [ ] T010 [P] [US1] Create `demo/apps/learner-web/public/js/tabs.js` — keyboard-accessible tab controller (`role="tab"`, `aria-selected`). — **@edtech-program-orchestrator**
- [ ] T011 [P] [US1] Create `demo/apps/learner-web/public/css/tabs.css` — tab strip, drawer transitions, 768×1366 layout. — **@edtech-program-orchestrator**
- [ ] T012 [US1] Refactor `demo/apps/learner-web/public/index.html` hero into 3 tabs; default = "Test your knowledge". — **@edtech-program-orchestrator**
- [ ] T013 [US1] Create `public/js/tab-test.js` — wire picker, AI tutor and Explanation drawer; preserve item state on toggle (Acceptance Scenario 2). — **@edtech-program-orchestrator**
- [ ] T014 [US1] Verify Sheets modal still reachable from topbar on this tab (Acceptance Scenario 3). — **@edtech-program-orchestrator**
- [ ] T015 [US1] Pedagogical review of tab copy and drawer language (cognitive-load gate). — **@learning-sciences-expert**

**Checkpoint**: US1 demoable end-to-end as MVP. **STOP and VALIDATE** with cold-tab load ≤ 5 s on Chromebook profile (SC-001) before starting US2.

---

## Phase 4: User Story 2 — Ask the teacher without leaving context (P2)

**Goal**: Dedicated composer + threaded list + bookmark-to-Sheets.
**Independent Test**: Switch tab, post a question, bookmark a past answer, verify it appears in Sheets.

- [ ] T020 [P] [US2] Create `public/js/tab-ask.js` — composer (top) + threaded list (bottom). — **@edtech-program-orchestrator**
- [ ] T021 [US2] Wire submit handler so a new question appears at the top with status `pending` (Acceptance Scenario 1). — **@edtech-program-orchestrator**
- [ ] T022 [US2] Add bookmark star on every answered question; create Sheet with `origin = "teacher-answer-bookmark"` (Acceptance Scenario 2). — **@edtech-program-orchestrator**
- [ ] T023 [US2] Confirm no PII is added to any AI prompt by the bookmark flow (this is a teacher-authored content path). — **@privacy-preserving-ml-engineer**
- [ ] T024 [US2] Localise composer placeholders and status labels (NL, DE, PL, RO, FR-BE). — **@content-localisation-lead**

**Checkpoint**: US2 independently testable; teacher-in-the-loop oversight surface strengthened.

---

## Phase 5: User Story 3 — See progress by chapter (P3)

**Goal**: Streak/badges row + collapsible card per chapter with chapter-level progress bar.
**Independent Test**: Open "My progress", expand a chapter, see per-skill bars summing to the chapter bar.

- [ ] T030 [P] [US3] Create `public/js/tab-progress.js` — render streak/badges row + group mastery records by `chapter`. — **@edtech-program-orchestrator**
- [ ] T031 [US3] Implement chapter-level progress bar = mean of per-skill bars; sort skills in the order returned by the mastery service. — **@edtech-program-orchestrator**
- [ ] T032 [US3] Empty-state for learners with zero mastery records (edge case). — **@learning-sciences-expert**
- [ ] T033 [US3] Null-chapter skills fall back to a `General` card (edge case). — **@edtech-program-orchestrator**
- [ ] T034 [US3] Localise chapter labels and tab title (NL, DE, PL, RO, FR-BE). — **@content-localisation-lead**

**Checkpoint**: All 3 user stories independently functional. Tab switch reusing cached data MUST NOT re-fetch (edge case 4).

---

## Phase 6: Compliance, polish, deploy

- [ ] T040 [P] Run the GDPR / AI Act / RAI checklist in `checklists/compliance.md`; all items green or waived with cited role. — **@eu-ai-act-compliance-officer**, **@gdpr-children-data-specialist**
- [ ] T041 [P] Run per-cohort smoke: zero new Content Safety violations and zero new override-rate disparity. — **@responsible-ai-evaluator**
- [ ] T042 Run `/speckit.analyze` — must return clean. — **@cross-agent-qa-verifier**
- [ ] T043 Execute the 8-step deploy cycle (`demo/feature/EXECUTION-PLAN.md`) on the dev slot; capture an authenticated green smoke. — **@demo-deployment-agent**
- [ ] T044 Flip the row in `demo/DEPLOYMENT-REPORT.md` to **PASS** and update the status tracker in `Subject/ama-rubric-remediation-plan.md`. — **@demo-deployment-agent**
- [ ] T045 Final sign-off and merge to main. — **@cross-agent-qa-verifier**

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: no dependency.
- **Phase 2 (Foundational)**: depends on Phase 1; **blocks all user stories**.
- **Phase 3 (US1, MVP)**: depends on Phase 2; deliverable on its own.
- **Phase 4 (US2)**: depends on Phase 2; independently testable.
- **Phase 5 (US3)**: depends on Phase 2; independently testable.
- **Phase 6 (Polish/deploy)**: depends on every user story scheduled for this release.

### Parallel opportunities

- T002 ‖ T006 ‖ T007 inside Phase 2.
- T010 ‖ T011 inside US1.
- T020 (US2) ‖ T030 (US3) once Phase 2 is green.

## Notes

- Each task lists exactly one accountable agent — Principle VII traceability.
- Commits are Conventional: `feat(learner): tabbed workspace US1 scaffold`,
  `compliance(learner): checklist CHK007 — NL/DE/PL/RO/FR-BE strings landed`.
- No task introduces a new third-party SDK or a new outbound call (FR-010).
- The Cross-Agent QA Verifier MUST sign off before `/speckit.implement` and
  before the row in `demo/DEPLOYMENT-REPORT.md` flips to PASS.
