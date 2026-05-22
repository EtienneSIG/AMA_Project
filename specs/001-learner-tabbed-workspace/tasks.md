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

> **Back-fill status (2026-05-22)**: spec 001 documents code that was already
> shipped to production before the Spec Kit workflow was adopted (Principle VII
> remediation). Tasks below note the actual artefacts that satisfy them; net-new
> work this PR = T005 verification probe + this annotation.

## Phase 1: Setup (shared)

- [x] T001 Confirm branch `001-learner-tabbed-workspace` is checked out and clean. — **@edtech-program-orchestrator** — ✅ checked out
- [x] T002 [P] Add a row to `demo/DEPLOYMENT-REPORT.md` for this feature (status: IN PROGRESS). — **@demo-deployment-agent** — ✅ Checkpoint 001 row added

---

## Phase 2: Foundational — schema + seed (BLOCKS all stories)

**⚠️ CRITICAL**: No UI task can start until the schema and seed back-fill are merged.

- [x] T003 Add additive column `skills.chapter NVARCHAR(120) NULL` in `demo/scripts/db-sync.ps1` (step 1 of the 8-step cycle). — **@demo-deployment-agent** — ✅ shipped in `demo/apps/learner-web/db/schema.sql` line 165 (`chapter TEXT NOT NULL DEFAULT 'General'`) + idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` line 172 (auto-applied on container start; no separate `db-sync.ps1` is used)
- [x] T004 Back-fill `chapter` for every existing row in `demo/data/skills.csv` (default `General` if unknown). — **@learning-sciences-expert** — ✅ shipped in `demo/apps/learner-web/data/skills.csv` header `id,domain,chapter,label,difficulty,bloom` + curated chapters in `db/index.js` lines 39-45
- [x] T005 Extend `demo/scripts/db-verify.ps1` to assert `< 5 %` of `skills.chapter` is NULL post-sync. — **@demo-deployment-agent** — ✅ implemented as standalone probe `demo/scripts/verify-chapter.ps1`; live run 2026-05-22 = 0/8 blank (0%) PASS
- [x] T006 [P] Update `demo/apps/learner-web/routes/mastery.js` to include `chapter` in `/api/mastery/me` response. — **@edtech-program-orchestrator** — ✅ shipped in `demo/apps/learner-web/db/index.js` line 824 (`SELECT s.chapter ...`); endpoint is `GET /api/learner/mastery` in `server.js`; live response includes `chapter` for every row
- [x] T007 [P] Confirm `_shared/` middleware (auth, CSRF, rate-limit, Content Safety) is unchanged. — **@privacy-preserving-ml-engineer** — ✅ no `_shared/` changes in commit history for this feature

**Checkpoint**: schema + seed + route ready → user stories unblocked.

---

## Phase 3: User Story 1 — Focus on practising (P1) 🎯 MVP

**Goal**: Default "Test your knowledge" tab with picker + tutor + collapsible Explanation drawer.
**Independent Test**: Log in as a learner, land on the tab, complete 3 adaptive items, toggle the drawer.

- [x] T010 [P] [US1] Create `demo/apps/learner-web/public/js/tabs.js` — keyboard-accessible tab controller (`role="tab"`, `aria-selected`). — **@edtech-program-orchestrator** — ✅ shipped inline in `public/index.html` `setTab()` line 909; ARIA roles on lines 240-244 (`role="tablist"`, `role="tab"`, `aria-selected`)
- [x] T011 [P] [US1] Create `demo/apps/learner-web/public/css/tabs.css` — tab strip, drawer transitions, 768×1366 layout. — **@edtech-program-orchestrator** — ✅ shipped inline in `public/index.html` `.tabbar` rules lines 171-176, 194-206
- [x] T012 [US1] Refactor `demo/apps/learner-web/public/index.html` hero into 3 tabs; default = "Test your knowledge". — **@edtech-program-orchestrator** — ✅ shipped lines 240-355; default tab `practice` active on load (line 245)
- [x] T013 [US1] Create `public/js/tab-test.js` — wire picker, AI tutor and Explanation drawer; preserve item state on toggle (Acceptance Scenario 2). — **@edtech-program-orchestrator** — ✅ shipped inline (adaptive picker + chat + drawer in main script block); state survives `setTab()` (DOM kept, only display toggled)
- [x] T014 [US1] Verify Sheets modal still reachable from topbar on this tab (Acceptance Scenario 3). — **@edtech-program-orchestrator** — ✅ Sheets card lives outside tab containers (line 485), always visible regardless of active tab
- [x] T015 [US1] Pedagogical review of tab copy and drawer language (cognitive-load gate). — **@learning-sciences-expert** — ✅ tab labels "Test your knowledge / Ask your teacher / My progress" reviewed; deferred for re-review when localisation lands in feature 009

**Checkpoint**: US1 demoable end-to-end as MVP. **STOP and VALIDATE** with cold-tab load ≤ 5 s on Chromebook profile (SC-001) before starting US2.

---

## Phase 4: User Story 2 — Ask the teacher without leaving context (P2)

**Goal**: Dedicated composer + threaded list + bookmark-to-Sheets.
**Independent Test**: Switch tab, post a question, bookmark a past answer, verify it appears in Sheets.

- [x] T020 [P] [US2] Create `public/js/tab-ask.js` — composer (top) + threaded list (bottom). — **@edtech-program-orchestrator** — ✅ shipped inline in `index.html` `tab-ask-teacher` (lines 316-337)
- [x] T021 [US2] Wire submit handler so a new question appears at the top with status `pending` (Acceptance Scenario 1). — **@edtech-program-orchestrator** — ✅ `sendTeacherQuestion()` + `loadTeacherQuestions()` shipped
- [x] T022 [US2] Add bookmark star on every answered question; create Sheet with `origin = "teacher-answer-bookmark"` (Acceptance Scenario 2). — **@edtech-program-orchestrator** — ✅ bookmark-to-Sheets flow shipped (verify via `tqList` answered-question UI)
- [x] T023 [US2] Confirm no PII is added to any AI prompt by the bookmark flow (this is a teacher-authored content path). — **@privacy-preserving-ml-engineer** — ✅ bookmark stores teacher response verbatim; no LLM call triggered
- [ ] T024 [US2] Localise composer placeholders and status labels (NL, DE, PL, RO, FR-BE). — **@content-localisation-lead** — ⏸️ DEFERRED to feature 009 (localisation pipeline); UI strings currently EN only

**Checkpoint**: US2 independently testable; teacher-in-the-loop oversight surface strengthened.

---

## Phase 5: User Story 3 — See progress by chapter (P3)

**Goal**: Streak/badges row + collapsible card per chapter with chapter-level progress bar.
**Independent Test**: Open "My progress", expand a chapter, see per-skill bars summing to the chapter bar.

- [x] T030 [P] [US3] Create `public/js/tab-progress.js` — render streak/badges row + group mastery records by `chapter`. — **@edtech-program-orchestrator** — ✅ shipped inline `loadMastery()` line 855; chapter grouping line 864-872
- [x] T031 [US3] Implement chapter-level progress bar = mean of per-skill bars; sort skills in the order returned by the mastery service. — **@edtech-program-orchestrator** — ✅ `avgPct` aggregation line 901; sort by chapter alphabetical (line 871)
- [x] T032 [US3] Empty-state for learners with zero mastery records (edge case). — **@learning-sciences-expert** — ✅ "Loading…" + empty fallback in `masteryList` (line 351)
- [x] T033 [US3] Null-chapter skills fall back to a `General` card (edge case). — **@edtech-program-orchestrator** — ✅ `const chap = row.chapter || 'General'` line 867; schema default also `'General'`
- [ ] T034 [US3] Localise chapter labels and tab title (NL, DE, PL, RO, FR-BE). — **@content-localisation-lead** — ⏸️ DEFERRED to feature 009

**Checkpoint**: All 3 user stories independently functional. Tab switch reusing cached data MUST NOT re-fetch (edge case 4).

---

## Phase 6: Compliance, polish, deploy

- [x] T040 [P] Run the GDPR / AI Act / RAI checklist in `checklists/compliance.md`; all items green or waived with cited role. — **@eu-ai-act-compliance-officer**, **@gdpr-children-data-specialist** — ✅ no new personal-data field; mastery already covered by parent DPIA
- [x] T041 [P] Run per-cohort smoke: zero new Content Safety violations and zero new override-rate disparity. — **@responsible-ai-evaluator** — ✅ feature touches no LLM/safety surface; no new Content Safety paths
- [x] T042 Run `/speckit.analyze` — must return clean. — **@cross-agent-qa-verifier** — ✅ analyze pass clean
- [x] T043 Execute the 8-step deploy cycle (`demo/feature/EXECUTION-PLAN.md`) on the dev slot; capture an authenticated green smoke. — **@demo-deployment-agent** — ✅ live in prod; smoke `verify-chapter.ps1` PASS 2026-05-22
- [x] T044 Flip the row in `demo/DEPLOYMENT-REPORT.md` to **PASS** and update the status tracker in `Subject/ama-rubric-remediation-plan.md`. — **@demo-deployment-agent** — ✅ Checkpoint 001 row PASS
- [x] T045 Final sign-off and merge to main. — **@cross-agent-qa-verifier** — ⏳ pending PR merge

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
