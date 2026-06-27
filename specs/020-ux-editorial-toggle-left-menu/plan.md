# Implementation Plan: UX Fixes — Remove Editorial Toggle & Left-Align Primary Menu

**Branch**: `020-ux-editorial-toggle-left-menu` | **Date**: 2026-06-27 | **Spec**: `/specs/020-ux-editorial-toggle-left-menu/spec.md`

**Input**: Feature specification from `/specs/020-ux-editorial-toggle-left-menu/spec.md`

> **Presentation-only.** No data model, AI behaviour, access-control, consent, or routing change. Two focused CSS/markup edits across the existing apps. Compatible with — and a stepping stone toward — Spec 019's "menu on the left".

## Summary

Two surgical front-end fixes:

1. **Remove the Editorial theme toggle** (the top-right `.theme-dongle` / "EDITORIAL" switch) from every app surface and the shared login page. The toggle is injected by the shared `theme-toggle.js` and is also inlined in the shared `login.html`. After the change, every app renders in the standard default theme, a previously-stored `learneu_theme=gic` preference no longer applies, and no UI control to switch into the "Editorial GIC" theme remains. The alternative theme **stylesheets stay in the repo** (only the user-facing toggle is removed).

2. **Left-align the primary menu.** The pill tab bar (`.tabbar`) is `max-width:1320px` while the rest of each app's chrome (header, hero, content `main`) is `max-width:1100px` — so the menu overhangs ~110 px to the left of the content and looks misaligned. Set `.tabbar { max-width:1100px }` in `learner-web`, `parent-portal`, and `teacher-console` so the menu's left edge aligns with the logo / hero / content column. `admin` is already internally consistent (`1200px` throughout) — no change; `director-portal` uses no pill tab bar — no change.

## Technical Context

**Language/Version**: HTML/CSS + vanilla JavaScript in the apps' `public/` front-ends. Node.js hosts unchanged.

**Primary Dependencies**: none new.

**Source-of-truth / mirror rules**:
- `theme-toggle.js` and `login.html` are edited in `demo/apps/_shared/public/theme-toggle.js` and `demo/apps/_shared/login.html` (the **source of truth**), then propagated by `demo/apps/_shared/sync.ps1` to every app's `public/`. Do **not** edit the per-app mirrors directly.
- The `.tabbar` CSS lives in each app's **own** `public/index.html` (app-specific, **not** mirrored) — edit `learner-web`, `parent-portal`, `teacher-console` directly.

**Storage**: none.

**Testing**: a `demo/scripts/verify-ux-020.ps1` static checker (toggle no longer injected, no inline dongle in login, `theme-gic` actively cleared, tabbar widths corrected) + optional `-BaseUrl` live smoke (login + an app page contain no `.theme-dongle`). Manual visual check.

**Target Platform**: Azure App Service Linux (the five apps).

**Project Type**: Web application — front-end-only edits.

**Performance Goals**: no functional/perf change; no horizontal overflow introduced (down to 360 px).

**Constraints**:
- Presentation-only — no data/AI/access-control/consent/routing change; existing routes and functionality preserved.
- No empty gap / console error / failed asset request from removing the toggle.
- Menu stays start-aligned (LTR left, RTL mirrored) and wraps left-aligned.

**Scale/Scope**: 2 shared-source files (toggle + login) + 3 per-app `index.html` CSS one-liners + 1 verify script.

## Constitution Check

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Presentation-only; no new data, no profiling, no transfer. |
| II. GDPR Art. 8 | PASS | No change to consent, data classes, or under-16 gating. |
| III. EU AI Act high-risk | PASS | No AI surface added/changed; **no Annex IV impact**. |
| IV. Teacher-in-the-loop | PASS | No change to decision flows or overrides. |
| V. Pedagogical sign-off | PASS | Cleaner top bar + consistent left-aligned nav aids clarity / UDL; reviewed for age-appropriateness. |
| VI. Outcome-contract driven | PASS | Predictable navigation supports usability KPIs. |
| VII. Reproducible, spec-driven | PASS | Independently testable, measurable, low-risk, presentation-only. |

**Human-oversight surface**: none changed. **DPIA delta**: none (no personal data touched).

## Approach

### US1 — Remove the Editorial toggle
- Rewrite `demo/apps/_shared/public/theme-toggle.js` so that on load it **removes** the `theme-gic` class from `<body>`, **removes** any existing `.theme-dongle` element, **clears** the stored `learneu_theme` key, and **does not inject** the dongle. (Idempotent, dependency-free, safe on cached pages.)
- Edit `demo/apps/_shared/login.html`: delete the inline `.theme-dongle` markup and the `applyTheme/toggleTheme/initTheme` script so the body is never given `theme-gic`. Leave the `body.theme-gic` CSS in place (harmless, out of scope to delete).
- Run `sync.ps1` to mirror both files into all five apps.

### US2 — Left-align the primary menu
- In `learner-web`, `parent-portal`, `teacher-console` `public/index.html`, change `.tabbar { max-width:1320px … }` → `max-width:1100px …` to match each app's `1100px` content column. No change to `admin` (1200, already aligned) or `director-portal` (no pill tab bar).

### Verify / ship
- Add `demo/scripts/verify-ux-020.ps1`; run after sync.
- `node --check` is not required (no server JS changed) but run a JS syntax check on the rewritten `theme-toggle.js`.
- Commit + push; deploy `learner-web`, `parent-portal`, `teacher-console` (US2 surfaces) and any app whose `theme-toggle.js`/`login.html` mirror changed (all five) — deploy the five apps to keep the toggle removed everywhere.

## Out of Scope

- Deleting the "Editorial GIC" theme stylesheets/tokens (only the toggle is removed).
- The full three-column left-rail shell (Spec 019).
- Menu content/order/icon/route changes.

## Progress Tracking

- [ ] Phase 0: context confirmed (toggle injector + login inline dongle + tabbar width mismatch identified)
- [ ] Phase 1: US1 toggle removal (shared sources + sync)
- [ ] Phase 2: US2 menu left-align (3 apps)
- [ ] Phase 3: verify script + checks
- [ ] Phase 4: commit, push, deploy
