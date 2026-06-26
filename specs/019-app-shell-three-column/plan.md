# Implementation Plan: Unified Three-Column App Shell (All Apps)

**Branch**: `019-app-shell-three-column` | **Date**: 2026-06-26 | **Spec**: `/specs/019-app-shell-three-column/spec.md`

**Input**: Feature specification from `/specs/019-app-shell-three-column/spec.md`

> **Dependency**: Consumes the design-token system from **Feature 014 (Age-Adaptive Theming)** — plan/implement 014 first. This feature is **presentation-only** (layout shell), not new data/AI/access-control.

## Summary

Give all five apps (learner, parent, teacher, admin, director) a **unified three-column shell** — fixed **left navigation rail**, scrollable **center content**, fixed **right profile/context panel** — built once as a shared shell + **per-role config** (menu items, center modules, panel widgets). Navigating updates only the center (client-side; rail + panel persist). The shell is **responsive** (rail/panel collapse to drawers on small screens), **accessible** (ARIA landmarks, keyboard order, WCAG AA, reduced motion), **localised** (incl. RTL), respects each app's theming + the learner age themes (014), preserves all existing routes (no broken deep links), and introduces **no new personal data**. Extends each app's `public/` front-end with a shared shell component.

## Technical Context

**Language/Version**: HTML/CSS + vanilla JavaScript across the five apps' front-ends; CSS Grid for the three-column layout; CSS custom properties (reuse Feature 014 tokens). Node.js 22.x hosts unchanged.

**Primary Dependencies**: none new — a shared shell module (CSS Grid + a small JS for nav/drawer/landmarks). Reuses Feature 014's token contract.

**Storage**: No new personal-data categories. Per-role `NavConfig`/`ProfilePanelConfig` are static configuration; the right panel reuses data each app already exposes.

**Testing**: Extend `demo/scripts/` verification (three-column render per app, client-side nav, responsive collapse with no overflow, a11y landmarks/contrast/reduced-motion, deep links intact); manual cross-app walkthrough.

**Target Platform**: Azure App Service Linux (all five apps); mobile-first responsive (down to 360 px).

**Project Type**: Web application — shared front-end shell across multiple portals.

**Performance Goals**: Shell frame renders first (skeletons) before content/panel data; **0** horizontal-scroll/overflow defects desktop→360 px; menu navigation has no full-page reload.

**Constraints**:
- Presentation-only — no new data collection; no AI/access-control change; existing routes/functionality preserved.
- Accessible (ARIA `nav`/`main`/`complementary`, focus order, WCAG AA, reduced motion); localised + RTL.
- Shared shell + per-role config — no per-app layout duplication; a new role module = config, not layout code.

**Scale/Scope**: Five apps, one shell, five role configs (+ learner age-theme variants from 014).

## Constitution Check

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Presentation-only; no new data; no profiling; no cross-EU transfer. |
| II. GDPR Art. 8 | PASS | No change to consent/data classes/under-16 gating; only re-arranges existing surfaces. |
| III. EU AI Act high-risk | PASS (N/A AI) | No AI behaviour change; AI surfaces hosted in the shell keep their existing logging/transparency/override. |
| IV. Teacher-in-the-loop | PASS | No change to decision flows; controls simply re-hosted in the shell. |
| V. Pedagogical sign-off | PASS | Layout reviewed for clarity, Universal Design for Learning, and age-appropriateness (with 014 themes). |
| VI. Outcome-contract driven | PASS | SC-007 maps consistent navigation to the −45% teacher admin-time KPI + usability. |
| VII. Reproducible, spec-driven | PASS | Shared shell + per-role config independently testable with measurable criteria; quickstart included. |

**EU AI Act articles touched**: none — non-AI presentation feature.

**DPIA delta**: **None.** No new personal-data categories; layout-only.

**Human oversight surface**: N/A (presentation). Existing per-role controls are unchanged, just re-hosted.

## Project Structure

### Documentation (this feature)
```text
specs/019-app-shell-three-column/
├── plan.md · research.md · data-model.md · quickstart.md · tasks.md
```

### Source Code
```text
demo/apps/
├── _shared/
│   └── public/shell/            # NEW: shared shell (CSS Grid layout + nav/drawer/landmarks JS), consumes 014 tokens
│       ├── shell.css
│       └── shell.js
├── learner-web/public/          # EXTEND: adopt shell + learner NavConfig/ProfilePanelConfig (age-themed via 014)
├── parent-portal/public/        # EXTEND: adopt shell + parent config
├── teacher-console/public/      # EXTEND: adopt shell + teacher config
├── admin/public/                # EXTEND: adopt shell + admin config
└── director-portal/public/      # EXTEND: adopt shell + director config
```

**Structure Decision**: Build one **shared shell** in `_shared/public/shell/` (CSS Grid: left rail / center outlet / right panel; JS for client-side nav, responsive drawers, ARIA landmarks) consuming Feature 014's tokens. Each app adopts the shell and supplies a **per-role config** (`NavConfig`, `ProfilePanelConfig`); existing pages are re-hosted in the center outlet so routes/deep links keep working. Mirror via `_shared/sync.ps1` where applicable.

## Complexity Tracking

> No constitution violations. Net-new: one shared shell + five role configs. Presentation-only; depends on Feature 014 tokens; no new data/AI/access-control. Risk: re-hosting existing pages without breaking deep links — mitigated by keeping routes and re-parenting content into the center outlet.
