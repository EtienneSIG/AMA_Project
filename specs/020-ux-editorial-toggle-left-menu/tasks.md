# Tasks: UX Fixes — Remove Editorial Toggle & Left-Align Primary Menu

**Input**: Design documents from `/specs/020-ux-editorial-toggle-left-menu/`

**Prerequisites**: plan.md, spec.md

**Organization**: Grouped by user story. Presentation-only; no TDD suite — PowerShell static verification + manual visual check.

> **Source-of-truth rule**: edit `_shared/public/theme-toggle.js` + `_shared/login.html` then run `sync.ps1` (never edit per-app mirrors). The `.tabbar` CSS lives in each app's own `public/index.html` (app-specific, NOT mirrored) — edit directly.

---

## Phase 1: User Story 1 — Remove the Editorial theme toggle (Priority: P1) 🎯
**Goal**: No "EDITORIAL" toggle on any app or login page; apps render default theme; prior `gic` preference no longer applies.
**Independent Test**: Load each app + login; confirm no `.theme-dongle`, default theme, no console error / layout gap.

- [X] T001 [US1] Demo Deployment Agent: rewrite `demo/apps/_shared/public/theme-toggle.js` to remove `theme-gic` from `<body>`, remove any existing `.theme-dongle`, clear the stored `learneu_theme` key, and NOT inject the dongle (idempotent, dependency-free).
- [X] T002 [US1] Demo Deployment Agent: remove the inline `.theme-dongle` markup + `applyTheme/toggleTheme/initTheme` script from `demo/apps/_shared/login.html` (leave `body.theme-gic` CSS, out of scope to delete).
- [X] T003 [US1] Demo Deployment Agent: run `demo/apps/_shared/sync.ps1` to mirror `theme-toggle.js` + `login.html` into all five apps; `node --check` the rewritten `theme-toggle.js`.

**Checkpoint**: toggle gone everywhere; default theme enforced.

---

## Phase 2: User Story 2 — Left-align the primary menu (Priority: P1)
**Goal**: Menu's left edge aligns with the content column (not overhanging).
**Independent Test**: At desktop width the first tab is flush with the logo/hero/content left margin in learner, parent, teacher apps.

- [X] T004 [P] [US2] Demo Deployment Agent: in `demo/apps/learner-web/public/index.html` change `.tabbar { max-width:1320px … }` → `max-width:1100px` (match the 1100 px content column).
- [X] T005 [P] [US2] Demo Deployment Agent: same `.tabbar` 1320→1100 change in `demo/apps/parent-portal/public/index.html`.
- [X] T006 [P] [US2] Demo Deployment Agent: same `.tabbar` 1320→1100 change in `demo/apps/teacher-console/public/index.html`. (admin already 1200-consistent; director-portal has no pill tab bar — no change.)

**Checkpoint**: menu left-aligned across the three pill-tabbar apps.

---

## Phase 3: Verification & Polish
- [X] T007 Cross-Agent QA Verifier: add `demo/scripts/verify-ux-020.ps1` (no dongle injected, no inline dongle in login, `theme-gic` actively cleared, tabbar = 1100 in the 3 apps, admin unchanged) + optional `-BaseUrl` live smoke (no `.theme-dongle` in served HTML); run after sync.
- [X] T008 EdTech Program Orchestrator: update `specs/INDEX.md` (020 → spec+plan+tasks · impl).

---

## Phase 4: Ship
- [ ] T009 Demo Deployment Agent: commit + push (`feat(ux): remove editorial toggle + left-align primary menu (spec 020)`).
- [ ] T010 Demo Deployment Agent: deploy the five apps to Azure (toggle removed everywhere; menu fix on learner/parent/teacher); verify `/api/health` 200.

---

## Dependencies & Execution Order
- Phase 1 (US1) and Phase 2 (US2) are independent; T004–T006 are parallel `[P]`.
- T003 (sync) must follow T001/T002. T007 follows T003 + T004–T006.

## Summary
- **Total tasks**: 10 (T001–T010). US1 = 3 · US2 = 3 · Verify/Polish = 2 · Ship = 2.
- **MVP**: User Story 1 (toggle removal) is independently shippable; US2 is an independent visual fix.
- **Risk**: low — presentation-only, additive/CSS-only, no server/data/AI change.
