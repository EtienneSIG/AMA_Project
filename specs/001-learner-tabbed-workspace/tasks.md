# Tasks: Learner Tabbed Workspace & Per-Chapter Progress

**Input**: Design documents from `/specs/001-learner-tabbed-workspace/`

**Prerequisites**: `spec.md`, `plan.md`, existing learner-web auth, adaptive picker, Q&A, sheets, and mastery services.

## Phase 1: Setup and traceability

**Purpose**: Close the legacy Spec Kit traceability gap without altering shipped behaviour.

- [X] T001 Confirm existing learner-web implementation scope in `demo/apps/learner-web/public/index.html` (Accountable: `agents/edtech-program-orchestrator.chatmode.md`)
- [X] T002 Backfill implementation plan in `specs/001-learner-tabbed-workspace/plan.md` (Accountable: `agents/cross-agent-qa-verifier.chatmode.md`)
- [X] T003 Backfill this task plan and map tasks to user stories in `specs/001-learner-tabbed-workspace/tasks.md` (Accountable: `agents/cross-agent-qa-verifier.chatmode.md`)

---

## Phase 2: Data metadata foundation

**Purpose**: Ensure progress grouping has a stable chapter field and default behaviour.

- [X] T004 Add additive `skills.chapter` migration with default `General` in `demo/apps/learner-web/db/schema.sql` (Accountable: `agents/privacy-preserving-ml-engineer.chatmode.md`)
- [X] T005 Backfill seeded skills with chapter values in the packaged data/reference seed path (Accountable: `agents/learning-sciences-expert.chatmode.md`)
- [X] T006 Verify orphan or null chapter skills render under `General` rather than disappearing (Accountable: `agents/cross-agent-qa-verifier.chatmode.md`)

---

## Phase 3: Backend read helpers

**Purpose**: Keep the client simple and avoid extra network calls.

- [X] T007 Ensure `listMasteryForLearner()` returns `skillId`, `label`, `domain`, `chapter`, `level`, and attempt counts in `demo/apps/learner-web/db/index.js` (Accountable: `agents/privacy-preserving-ml-engineer.chatmode.md`)
- [X] T008 Ensure mastery ordering is stable by chapter and difficulty for deterministic rendering (Accountable: `agents/learning-sciences-expert.chatmode.md`)

---

## Phase 4: User Story 1 - Focus on practising

**Goal**: Learner opens a focused `Test your knowledge` tab with adaptive practice and a collapsible explanation drawer.

**Independent Test**: Log in as `student@learneu.demo`, open learner-web, complete three adaptive items, and expand/collapse the explanation drawer without losing item state.

- [X] T009 [US1] Add accessible tabbar with `Test your knowledge` as the default tab in `demo/apps/learner-web/public/index.html` (Accountable: `agents/demo-deployment-agent.chatmode.md`)
- [X] T010 [US1] Move adaptive picker and tutor prompt into the practice tab while preserving existing endpoint calls (Accountable: `agents/privacy-preserving-ml-engineer.chatmode.md`)
- [X] T011 [US1] Add collapsible explanation drawer with no navigation or state reset (Accountable: `agents/learning-sciences-expert.chatmode.md`)
- [X] T012 [US1] Verify sheets modal remains reachable from the topbar on the practice tab (Accountable: `agents/cross-agent-qa-verifier.chatmode.md`)

---

## Phase 5: User Story 2 - Ask the teacher without leaving context

**Goal**: Learner uses a dedicated tab for teacher questions and answer history.

**Independent Test**: Switch to `Ask your teacher`, post a question, see it at the top of the list, and bookmark an answered question as a sheet.

- [X] T013 [US2] Add `Ask your teacher` tab and composer in `demo/apps/learner-web/public/index.html` (Accountable: `agents/learning-sciences-expert.chatmode.md`)
- [X] T014 [US2] Preserve `teacher_questions` create/list API calls and pending/answered statuses (Accountable: `agents/privacy-preserving-ml-engineer.chatmode.md`)
- [X] T015 [US2] Wire answer bookmark action to the existing sheets surface (Accountable: `agents/demo-deployment-agent.chatmode.md`)
- [X] T016 [US2] Verify teacher oversight messaging is visible and age-appropriate (Accountable: `agents/eu-ai-act-compliance-officer.chatmode.md`)

---

## Phase 6: User Story 3 - See progress by chapter

**Goal**: Learner sees mastery grouped by chapter with progress bars and accessible expansion.

**Independent Test**: Open `My progress`, expand a chapter card, and confirm per-skill progress bars appear under the expected chapter.

- [X] T017 [US3] Add `My progress` tab shell in `demo/apps/learner-web/public/index.html` (Accountable: `agents/demo-deployment-agent.chatmode.md`)
- [X] T018 [US3] Group mastery rows by `chapter` client-side from the existing mastery API response (Accountable: `agents/privacy-preserving-ml-engineer.chatmode.md`)
- [X] T019 [US3] Render one chapter-level card with an aggregate progress bar per chapter (Accountable: `agents/learning-sciences-expert.chatmode.md`)
- [X] T020 [US3] Render orphan skills under `General` and show an empty state when no mastery exists (Accountable: `agents/cross-agent-qa-verifier.chatmode.md`)

---

## Phase 7: Verification and release evidence

**Purpose**: Preserve current behaviour while making the feature reproducible for future examiners.

- [X] T021 Run app validation through `npm run build` for learner-web after check scripts are standardised (Accountable: `agents/demo-deployment-agent.chatmode.md`)
- [X] T022 Confirm no new third-party SDK or outbound PII route was introduced (Accountable: `agents/gdpr-children-data-specialist.chatmode.md`)
- [X] T023 Confirm the feature maps to AMA rubric categories #5 and #12 as fully traceable implementation evidence (Accountable: `agents/cross-agent-qa-verifier.chatmode.md`)

## Dependencies and execution order

- Phase 1 documents the shipped scope and can run immediately.
- Phase 2 blocks Phase 6 because chapter grouping depends on `skills.chapter`.
- Phase 3 blocks Phases 4-6 because the UI consumes existing read helpers.
- Phases 4 and 5 are independent once Phase 3 is complete.
- Phase 7 runs after all user-story evidence is available.

## Parallel opportunities

- T002 and T003 can run in parallel.
- T009/T010 and T013/T014 can be reviewed in parallel because they target independent tabs.
- T017/T018/T019 can be reviewed together once mastery responses include `chapter`.
