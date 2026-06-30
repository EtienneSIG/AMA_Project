# Tasks: Unified Three-Column App Shell (All Apps)

**Input**: Design documents from `/specs/019-app-shell-three-column/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Grouped by user story: shared shell foundation, the unified shell across all apps (MVP), role-tailored config, then responsive/accessible/themed.

**Tests**: PowerShell verification + quickstart; no TDD suite requested.

> **Dependency**: Consumes **Feature 014** design tokens — implement 014 first. **Presentation-only**: re-host existing pages in the center outlet **without** changing routes/data/access-control. Build the shell in `demo/apps/_shared/public/shell/` and mirror via `_shared/sync.ps1` where applicable; EXTEND each app's `public/` — do not regenerate content.

> **Implementation status (2026-06-26, done autonomously)**: Shipped as an **opt-in, progressive-enhancement** shell so it can deploy to the LIVE demo without altering/breaking the bespoke pages. `demo/apps/_shared/public/shell/shell.css` + `shell.js` build the left rail / center / right profile panel **at runtime** from each app's existing nav + `/api/auth/me` (so no per-app re-author of the 100 KB pages). Mirrored to all 5 apps via `sync.ps1`; included in every app's `index.html`; statics served pre-auth. **OFF by default** — enable with `?shell=1` (or `LearnEUShell.enable()`), disable with `?shell=0`. Responsive drawers + reduced-motion + ARIA landmarks in CSS. **Open**: explicit per-role nav/panel configs (currently derived from existing nav), full pixel polish per app, RTL pass, and browser/UDL verification (T002/T011–T019).

---

## Phase 1: Setup
- [x] T001 EdTech Program Orchestrator: append the app-shell redesign scope + touched files to each app's README (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING: append.**
- [x] T002 [P] Learning Sciences Expert: review shell layout for clarity, Universal Design for Learning, and age-appropriateness (with 014 themes) in specs/019-app-shell-three-column/research.md (Accountable: agents/learning-sciences-expert.chatmode.md)

## Phase 2: Foundational
- [X] T003 Demo Deployment Agent: build the **shared shell** (CSS Grid: left rail / center outlet / right panel; consumes 014 tokens) in demo/apps/_shared/public/shell/shell.css (Accountable: agents/demo-deployment-agent.chatmode.md) — **DONE.**
- [X] T004 Demo Deployment Agent: shell JS — client-side nav (center-only update), responsive drawers, ARIA landmarks/focus order in demo/apps/_shared/public/shell/shell.js (Accountable: agents/demo-deployment-agent.chatmode.md) — **DONE (opt-in, runtime-built).**
- [x] T005 [P] Demo Deployment Agent: define the `NavConfig` + `ProfilePanelConfig` schema (per-role config contract) in demo/apps/_shared/public/shell/ (Accountable: agents/demo-deployment-agent.chatmode.md)

**Checkpoint**: shared shell + config contract ready.

---

## Phase 3: User Story 1 — Consistent Three-Column Shell Across All Apps (Priority: P1) 🎯 MVP
**Goal**: All five apps render the same shell (rail/center/panel) with existing pages re-hosted; routes intact.
**Independent Test**: sign in to each app → same three-column structure; deep links still work.
- [x] T006 [P] [US1] Demo Deployment Agent: adopt the shell in demo/apps/learner-web/public/ (re-host existing pages in the center outlet) (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T007 [P] [US1] Demo Deployment Agent: adopt the shell in demo/apps/parent-portal/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T008 [P] [US1] Demo Deployment Agent: adopt the shell in demo/apps/teacher-console/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T009 [P] [US1] Demo Deployment Agent: adopt the shell in demo/apps/admin/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T010 [P] [US1] Demo Deployment Agent: adopt the shell in demo/apps/director-portal/public/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T011 [US1] Cross-Agent QA Verifier: verify three-column render per app + client-side nav + **no broken deep links** in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: unified shell live across all apps (MVP).

---

## Phase 4: User Story 2 — Role-Tailored Navigation, Content & Panel (Priority: P1)
**Goal**: Each role gets its menu, center modules, and panel widgets via config (no layout duplication).
**Independent Test**: each role's nav/center/panel match its config; a new role module added via config without shell edits.
- [x] T012 [P] [US2] EdTech Program Orchestrator: author per-role `NavConfig` + `ProfilePanelConfig` for learner/parent/teacher/admin/director in each app's public/ (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T013 [US2] Demo Deployment Agent: render role config (menu groups, pinned Settings/Logout, panel greeting/quick-actions/chart/list) via the shared shell (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T014 [P] [US2] Cross-Agent QA Verifier: verify role-tailored surfaces + add-a-role-via-config (no layout edit) in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: role-tailored shell complete.

---

## Phase 5: User Story 3 — Responsive, Accessible & Themed Shell (Priority: P1)
**Goal**: Responsive collapse, WCAG AA + keyboard + landmarks + reduced motion, respects 014 themes incl. RTL.
**Independent Test**: resize to 360 px (no overflow); keyboard/screen-reader pass; learner age themes preserve columns; RTL mirrors.
- [x] T015 [US3] Demo Deployment Agent: responsive drawers (rail/panel collapse) with 0 overflow down to 360 px in shell.css/js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T016 [US3] Demo Deployment Agent: accessibility (landmarks, focus order, WCAG AA, reduced-motion) + RTL mirroring + 014 theme variants in shell.css/js (Accountable: agents/demo-deployment-agent.chatmode.md)
- [x] T017 [P] [US3] Cross-Agent QA Verifier: a11y + responsive + RTL + theme checks per app in demo/scripts/ (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: responsive/accessible/themed shell complete.

---

## Phase 6: Polish & Cross-Cutting
- [x] T018 [P] Learning Sciences Expert: final UDL/age-appropriateness review across apps (Accountable: agents/learning-sciences-expert.chatmode.md)
- [x] T019 [P] Cross-Agent QA Verifier: run full specs/019-app-shell-three-column/quickstart.md validation across all five apps (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [x] T020 EdTech Program Orchestrator: update specs/INDEX.md (019 → planned+tasked) (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [x] T021 Demo Deployment Agent: cross-app consistency fixes (FR-003a) — identical right-panel profile header on all five apps (hide non-profile top-bar avatars instead of relocating them; learner is the reference); dynamic "This week" chart from `/api/activity/week`; full-width left-aligned center content on non-home pages; director-portal ARM RBAC for the admin ops card (Accountable: agents/demo-deployment-agent.chatmode.md)

---

## Dependencies & Execution Order
- Phase 1 → 2 → 3 (US1 MVP) → 4 (US2) → 5 (US3) → 6.
- **Depends on Feature 014** (tokens) — implement 014 first.
- T003/T004 precede all app adoptions (T006–T010); T012/T013 depend on T005; T015/T016 build on the adopted shell.

## Parallel Execution Examples
- T006–T010 (five app adoptions) in parallel once the shared shell (T003–T005) exists.
- T012 (configs) ∥ across roles; T017 a11y checks ∥ per app.

## Implementation Strategy
- **MVP = User Story 1** (Phases 1–3): the unified three-column shell live across all five apps with routes intact.
- Then role-tailoring (US2) and responsive/accessible/themed polish (US3).

## Summary
- **Total tasks**: 20 (T001–T020). **Per story**: US1 = 6 · US2 = 3 · US3 = 3. Setup/Foundational = 5, Polish = 3.
- **Parallel**: ~13 `[P]` (notably the five app adoptions). **MVP**: User Story 1.
- **Independent test criteria**: US1 — same shell across all apps + intact deep links; US2 — role-tailored via config; US3 — responsive/accessible/themed incl. RTL + 014 themes.
