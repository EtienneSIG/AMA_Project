# Tasks: Age-Adaptive Learner App Theming

**Input**: Design documents from `/specs/014-age-adaptive-theming/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks grouped by user story so each ships independently: a shared token foundation, then the three age-band themes (MVP), the reusable token system, and override + accessibility.

**Tests**: Verification via the existing demo pattern (PowerShell verify script + `quickstart.md`); no TDD suite requested.

> **Implementation notes (avoid overwrites)**: this is **presentation-only**. EXTEND the existing `demo/apps/learner-web/public/theme.css` and `theme-toggle.js` (already present) — do not regenerate. Screens (`index.html`, `mobile.html`) must consume **tokens only**; learning content/data MUST stay identical across themes. No new personal data; no age inference.

---

## Phase 1: Setup

- [ ] T001 EdTech Program Orchestrator: append the theming increment scope + touched files to demo/apps/learner-web/README.md (Accountable: agents/edtech-program-orchestrator.chatmode.md) — **EXISTING FILE: append.**
- [ ] T002 [P] Learning Sciences Expert: confirm age-band → theme mapping, readability, and age-appropriateness (under-8 / 8–13 / 14+) and the accessibility baseline in specs/014-age-adaptive-theming/research.md (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T003 [P] Content Localisation Lead: confirm original (non-trademarked) illustration/asset strategy per theme; no brand/character IP in demo/apps/learner-web/public/themes/ (Accountable: agents/content-localisation-lead.chatmode.md)

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T004 Demo Deployment Agent: define the shared **token contract** (colour, spacing, typography scale, radius, motion) as CSS custom properties in demo/apps/learner-web/public/themes/tokens.css (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T005 Demo Deployment Agent: implement the **theme resolver** (read learner age band → band theme; apply override + `prefers-reduced-motion`/`prefers-contrast`; neutral default on unknown/asset-failure) in demo/apps/learner-web/public/theme-toggle.js (Accountable: agents/demo-deployment-agent.chatmode.md) — **EXISTING FILE: extend.**
- [ ] T006 [P] Demo Deployment Agent: refactor learner screens to consume **tokens only** (no hard-coded styles) in demo/apps/learner-web/public/index.html + mobile.html, preserving identical content/data (Accountable: agents/demo-deployment-agent.chatmode.md) — **EXISTING FILES: extend; do not change learning content.**

**Checkpoint**: token contract + resolver + token-consuming screens ready.

---

## Phase 3: User Story 1 — Age-Appropriate Theme Applied Automatically (Priority: P1) 🎯 MVP

**Goal**: Each learner auto-sees the band-matched theme (kids-draw / brick / game-HUD) across core screens with identical content.

**Independent Test**: 6/11/15-year-old profiles each load a visibly distinct, correct theme; boundary 8 & 13 → brick.

- [ ] T007 [P] [US1] Demo Deployment Agent: build the **kids-draw** (<8) theme token set + original asset pack in demo/apps/learner-web/public/themes/kids-draw/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T008 [P] [US1] Demo Deployment Agent: build the **brick** (8–13, Lego-inspired) theme token set + original asset pack in demo/apps/learner-web/public/themes/brick/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T009 [P] [US1] Demo Deployment Agent: build the **game-hud** (14+) theme token set + original asset pack in demo/apps/learner-web/public/themes/game-hud/ (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T010 [US1] Demo Deployment Agent: wire deterministic band selection (boundary 8–13 inclusive) into the resolver in demo/apps/learner-web/public/theme-toggle.js (depends on T005, T007–T009) (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T011 [P] [US1] Cross-Agent QA Verifier: add a learner-theme check (correct band theme per age; boundary cases; **content parity across themes**) to demo/scripts/ verification (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: US1 functional — correct age-band theme everywhere, content identical.

---

## Phase 4: User Story 2 — Theme Token System & Reusability (Priority: P2)

**Goal**: Themes built from shared tokens; a token change propagates app-wide; a new theme is config + assets.

**Independent Test**: change one token → propagates with no per-screen edits; register a 4th theme without screen markup changes.

- [ ] T012 [US2] Demo Deployment Agent: ensure all theme values flow through `tokens.css` (no per-screen hard-coded styles remain) and document how to add a theme in demo/apps/learner-web/README.md (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T013 [P] [US2] Cross-Agent QA Verifier: add a token-propagation test (one token change reflected app-wide; 4th-theme registration without markup edits) to demo/scripts/ verification (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: token system proven reusable.

---

## Phase 5: User Story 3 — Safe Theme Override & Accessibility Preferences (Priority: P2)

**Goal**: Teacher/parent per-learner override; high-contrast/reduced-motion variant for every theme.

**Independent Test**: override a 15-year-old to brick; enable reduced motion → animations suppressed in all themes.

- [ ] T014 [US3] EdTech Program Orchestrator: persist a per-learner **theme override** (actor + timestamp) on the existing learner preferences and apply it in the resolver in demo/apps/learner-web (server.js + theme-toggle.js) (Accountable: agents/edtech-program-orchestrator.chatmode.md)
- [ ] T015 [P] [US3] Demo Deployment Agent: implement **reduced-motion** + **high-contrast** variants for all three themes in demo/apps/learner-web/public/themes/ + theme.css (Accountable: agents/demo-deployment-agent.chatmode.md)
- [ ] T016 [P] [US3] Cross-Agent QA Verifier: add accessibility checks (WCAG AA contrast, reduced-motion, high-contrast, keyboard/landmarks) per theme to demo/scripts/ verification (Accountable: agents/cross-agent-qa-verifier.chatmode.md)

**Checkpoint**: override + accessibility complete.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T017 [P] Learning Sciences Expert: final age-appropriateness + Universal Design for Learning review across the three themes (Accountable: agents/learning-sciences-expert.chatmode.md)
- [ ] T018 [P] Cross-Agent QA Verifier: run the full specs/014-age-adaptive-theming/quickstart.md validation (per-band, parity, override, a11y, fallback) (Accountable: agents/cross-agent-qa-verifier.chatmode.md)
- [ ] T019 EdTech Program Orchestrator: update specs/INDEX.md (014 → planned+tasked) and note the shared token contract for **019 (app shell)** to consume (Accountable: agents/edtech-program-orchestrator.chatmode.md)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 (US1, MVP) → Phase 4 (US2) → Phase 5 (US3) → Phase 6.
- T010 depends on T005 + T007–T009; T011 after T010.
- **Downstream**: Feature **019 (app shell)** consumes this token contract — plan/implement 014 before 019.

## Parallel Execution Examples

- T007/T008/T009 (three themes) in parallel; T002/T003 in parallel in setup.
- US3: T015 (a11y variants) ∥ T016 (a11y checks).

## Implementation Strategy

- **MVP = User Story 1** (Phases 1–3): the three age-band themes auto-applied with content parity.
- Then US2 (token reuse) and US3 (override + accessibility).

---

## Summary

- **Total tasks**: 19 (T001–T019). **Per story**: US1 = 5 · US2 = 2 · US3 = 3. Setup/Foundational = 6, Polish = 3.
- **Parallel**: ~10 `[P]` tasks. **MVP**: User Story 1.
- **Independent test criteria**: US1 — correct band theme + content parity; US2 — token change propagates app-wide; US3 — override applied + a11y variants in every theme.
