# Tasks: Learner Tabbed Workspace & Per-Chapter Progress

**Input**: Design documents from `/specs/001-learner-tabbed-workspace/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Included — the spec defines mandatory independent test scenarios and measurable acceptance outcomes (SC-001…SC-006).

> **Status**: Retrospective as-built ledger. The tabbed workspace shipped in `learner-web` ("Feature 4b") before this file existed; tasks are recorded here as `[X]` (done) to close the Spec Kit `spec → plan → tasks` chain (constitution Principle VII). No new work is requested by this ledger beyond the two verification follow-ups in Phase 6.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label for traceability (`[US1]` Test-your-knowledge · `[US2]` Ask-your-teacher · `[US3]` My-progress)
- Every task includes an exact file path and an accountable agent from `agents/*.chatmode.md`

## Implementation note (avoid overwrites)

The learner-web app and its tabbed UI already exist. Any future touch must **EXTEND** additively.

- **Mirror rule**: `demo/apps/_shared/` is the source of truth for `db/schema.sql`. Per-app copies are mirrors produced by `demo/apps/_shared/sync.ps1` — edit `_shared/` then sync; never edit a per-app mirror directly.
- **EXTEND (do not regenerate)**: `demo/apps/learner-web/public/index.html`, `public/home.html`, `public/nav-config.js`, `public/shell/shell.js`, `public/shell/shell.css`, `demo/scripts/acceptance_tests.ps1`.
- **Reuse**: existing mastery, Q&A, sheets and AI-tutor endpoints — FR-008 forbids new server routes.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the additive read-model field and the central tab catalogue.

- [X] T001 Add additive, nullable `chapter` column (default `General`) to the skills catalogue in demo/apps/_shared/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T002 Apply the column idempotently with `ALTER TABLE skills ADD COLUMN IF NOT EXISTS chapter ...` for existing databases in demo/apps/_shared/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)
- [X] T003 [P] Back-fill `chapter` for every existing skill in the seed data in demo/data/skills.csv (Accountable: agents/content-localisation-lead.chatmode.md)
- [X] T004 [P] Define the central tab catalogue (label/icon/tab id) in demo/apps/learner-web/public/nav-config.js (Accountable: agents/edtech-program-orchestrator.chatmode.md)

**Checkpoint**: Read-model carries `chapter`; the tab catalogue is data-driven.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tab-switching, accessibility and impersonation safety that all three stories depend on.

**CRITICAL**: No user-story tab is shippable before this phase is complete.

- [X] T005 Implement `[data-tab]` show/hide rule so only the active panel renders in demo/apps/learner-web/public/index.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T006 Implement `setTab()` switching with `role="tab"`/`aria-selected` keyboard + screen-reader wiring in demo/apps/learner-web/public/shell/shell.js (Accountable: agents/learning-sciences-expert.chatmode.md)
- [X] T007 [P] Add app-shell visibility CSS for `[data-tab].active` panels in demo/apps/learner-web/public/shell/shell.css (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T008 Ensure tab switching does not re-fetch already-loaded session data (debounce/cache) in demo/apps/learner-web/public/shell/shell.js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [X] T009 Ensure admin/teacher impersonation renders the tabs read-only with no learner-activity writes in demo/apps/learner-web/public/index.html (Accountable: agents/gdpr-children-data-specialist.chatmode.md)
- [X] T010 Return the owning skill's `chapter` on the mastery read path so the client groups without an extra round-trip in demo/apps/_shared/db/schema.sql (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)

**Checkpoint**: Tabs switch accessibly, impersonation is write-safe, mastery reads expose `chapter`.

---

## Phase 3: User Story 1 — Test your knowledge (Priority: P1) 🎯 MVP

**Goal**: A focused default tab with the adaptive picker, AI tutor and a retractable Explanation drawer.

**Independent Test**: Land on "Test your knowledge", complete three adaptive items, expand/collapse the Explanation drawer, open the Sheets modal.

### Tests for User Story 1

- [X] T011 [P] [US1] Add acceptance coverage for default-tab landing + 3-item completion + drawer toggle in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [X] T012 [P] [US1] Verify cold tab load ≤ 5 s on a 4G Chromebook profile (SC-001) in demo/scripts/acceptance_tests.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)

### Implementation for User Story 1

- [X] T013 [US1] Build the "Test your knowledge" panel (adaptive picker · AI tutor · retractable Explanation drawer) and set it as the default tab in demo/apps/learner-web/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [X] T014 [P] [US1] Keep the Sheets modal reachable from the topbar on every tab (FR-003) in demo/apps/learner-web/public/index.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [X] T015 [P] [US1] Add the home-tile deep link `/?tab=practice` into the practice tab in demo/apps/learner-web/public/home.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)

**Checkpoint**: US1 (MVP) independently passes focus, latency and Sheets-modal checks.

---

## Phase 4: User Story 2 — Ask your teacher (Priority: P2)

**Goal**: A dedicated composer + threaded history with an inline bookmark-to-sheet action.

**Independent Test**: Post a question (appears "pending" at top), bookmark a past answer, confirm it shows in Sheets.

### Tests for User Story 2

- [X] T016 [P] [US2] Add acceptance coverage for question post → pending status → bookmark → sheet visibility in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 2

- [X] T017 [US2] Build the "Ask your teacher" panel: composer on top, threaded Q&A list below, reusing existing Q&A endpoints (no new route, FR-008) in demo/apps/learner-web/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [X] T018 [P] [US2] Wire the inline bookmark action to create a sheet with origin `teacher-answer-bookmark` in demo/apps/learner-web/public/index.html (Accountable: agents/edtech-program-orchestrator.chatmode.md)

**Checkpoint**: US2 independently passes posting, threading and bookmark-to-sheet checks.

---

## Phase 5: User Story 3 — My progress by chapter (Priority: P3)

**Goal**: A streak/badges row followed by one collapsible card per chapter with a chapter-level progress bar.

**Independent Test**: Open "My progress", see the streak row, expand a chapter card and view per-skill bars; verify empty-state and `General` grouping.

### Tests for User Story 3

- [X] T019 [P] [US3] Add acceptance coverage for chapter grouping, empty-state CTA, and `General` fallback for null-chapter skills (SC-004) in demo/scripts/acceptance_tests.ps1 (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

### Implementation for User Story 3

- [X] T020 [US3] Build the "My progress" panel: streak/badges row + collapsible per-chapter cards with chapter-level progress bars in demo/apps/learner-web/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [X] T021 [P] [US3] Render the empty-state CTA when a learner has no mastery records yet in demo/apps/learner-web/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [X] T022 [P] [US3] Group skills with `NULL`/absent chapter under a default `General` card in demo/apps/learner-web/public/index.html (Accountable: agents/privacy-preserving-ml-engineer.chatmode.md)

**Checkpoint**: US3 independently passes grouping, empty-state and orphan-skill checks.

---

## Phase 6: Localisation, Accessibility & Compliance Verification

**Purpose**: Cross-cutting gates the spec mandates before per-market release.

- [X] T023 [P] Translate all tab/copy strings for NL, DE, PL, RO, FR-BE through the existing localisation pipeline (FR-009) in demo/apps/learner-web/public/nav-config.js (Accountable: agents/content-localisation-lead.chatmode.md)
- [X] T024 [P] Confirm keyboard reachability (Tab + Enter) and screen-reader announcement (`role="tab"`/`aria-selected`) on all tabs in demo/apps/learner-web/public/index.html (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T025 Re-run the Cross-Agent QA Verifier release review to confirm zero new GDPR/AI Act findings (SC-006) and record sign-off in specs/001-learner-tabbed-workspace/checklists/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T026 [P] Capture the scroll-reduction measurement (≥ 50 %, SC-002) on a 768×1366 viewport during the fixed 3-item scenario in demo/scripts/acceptance_tests.ps1 (Accountable: agents/demo-deployment-agent.chatmode.md)

**Checkpoint**: Localisation and accessibility verified; two evidence-capture follow-ups (T025–T026) remain open for the release review.

---

## Dependencies & Execution Order

1. **Phase 1 (Setup)** → **Phase 2 (Foundational)** must complete before any user-story tab.
2. **US1 (P1)** is the MVP and ships first; **US2 (P2)** and **US3 (P3)** are independently testable and can follow in any order.
3. **Phase 6** gates per-market release; T025–T026 are the only open items (evidence capture for the release review).

## Implementation Status Summary

| Phase | Tasks | Done |
|---|---|---|
| 1 Setup | T001–T004 | 4 / 4 |
| 2 Foundational | T005–T010 | 6 / 6 |
| 3 US1 (MVP) | T011–T015 | 5 / 5 |
| 4 US2 | T016–T018 | 3 / 3 |
| 5 US3 | T019–T022 | 4 / 4 |
| 6 Verification | T023–T026 | 2 / 4 |
| **Total** | **26** | **24 / 26** |

> Open items T025 (QA release sign-off, SC-006) and T026 (scroll-reduction measurement, SC-002) are verification/evidence tasks, not new feature work.
