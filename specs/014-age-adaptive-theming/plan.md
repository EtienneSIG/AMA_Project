# Implementation Plan: Age-Adaptive Learner App Theming

**Branch**: `014-age-adaptive-theming` | **Date**: 2026-06-26 | **Spec**: `/specs/014-age-adaptive-theming/spec.md`

**Input**: Feature specification from `/specs/014-age-adaptive-theming/spec.md`

## Summary

Give the learner web app a **presentation-only** theme that matches the learner's age band — under 8 (hand-drawn / crayon), 8–13 inclusive (construction-brick / Lego-inspired), 14+ (game-HUD) — built on a **shared design-token system** so themes are reusable and a new theme can be added without rewriting screens. Theme selection is **deterministic from the already-stored age band** (no facial/behavioural age inference), affects only CSS/HTML/layout/illustration/motion (learning content and data are identical across themes), meets **WCAG AA** with reduced-motion + high-contrast variants, and supports a **teacher/parent override** plus a safe default/fallback. The work extends `demo/apps/learner-web/public/` styling; no new data classes, no AI, no API behaviour changes beyond resolving which theme a learner sees.

## Technical Context

**Language/Version**: HTML/CSS + vanilla JavaScript (existing `demo/apps/learner-web` front-end); CSS custom properties (design tokens) drive theming. Node.js 22.x host unchanged.

**Primary Dependencies**: none new for rendering — CSS custom properties + a small theme-resolution helper. Reuses the existing `theme.css` / `theme-toggle.js` pattern already in the portals.

**Storage**: No new personal-data categories. Reuses the **already-collected learner age/age band**. The only persisted addition is an optional **theme override** (who set it, when) attached to the existing learner profile/preferences.

**Testing**: Extend `demo/scripts/` verification with a learner-theme check (correct band theme per age, override applied, reduced-motion/high-contrast honoured, content parity across themes); manual visual walkthrough in `quickstart.md`.

**Target Platform**: Azure App Service Linux (`app-learner-web-learneu-demo`); mobile-first responsive.

**Project Type**: Web application (front-end theming layer on an existing portal).

**Performance Goals**: Theme assets render or fall back gracefully so **0%** of sessions are blocked from content; theme switch is instant (token swap, no reload).

**Constraints**:
- Presentation-only — identical learning content/data across themes; no theme adds/removes learning functionality.
- **No biometric/behavioural age inference** (deterministic age-band rule only); boundary rule 8–13 inclusive = brick theme.
- WCAG AA contrast; reduced-motion + high-contrast variants for every theme.
- Original/licensed assets only — **no trademarked logos/brands/characters** (inspired-by styles).

**Scale/Scope**: One learner app, three base themes + accessibility variants + a neutral default/fallback; token-driven so a fourth theme is config + asset pack only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Uses only the already-stored age band; no new data classes; no behavioural/biometric inference; no cross-EU transfer. |
| II. GDPR Art. 8 | PASS | No new personal data collected; theme overrides are set by consented adults (teacher/parent) and audited. |
| III. EU AI Act high-risk | PASS (N/A AI) | No AI used to select themes — deterministic age-band rule; explicitly forbids facial/emotion/behavioural age inference (Art. 5 safe). |
| IV. Teacher-in-the-loop | PASS | Teacher/parent can override theme per learner; override persisted/auditable. |
| V. Pedagogical sign-off | PASS | Themes reviewed by Learning Sciences for age-appropriateness, readability, and Universal Design for Learning (accessibility variants). |
| VI. Outcome-contract driven | PASS | Age-fit presentation supports engagement/time-on-task underpinning the outcome-gap KPI without changing pedagogy (SC-006). |
| VII. Reproducible, spec-driven | PASS | Token-based, independently testable themes with measurable, technology-agnostic criteria; quickstart included. |

**EU AI Act articles touched**: none — this is a non-AI presentation feature. The plan explicitly **excludes** Art. 5 prohibited practices (no emotion/biometric/behavioural age inference).

**DPIA delta**: **None/negligible.** No new personal-data categories; the only new record is an optional theme-override preference (actor + timestamp) on the existing learner profile.

**Human oversight surface**: Teacher/parent theme override (persisted, auditable); accessibility preferences honoured per learner/device.

## Project Structure

### Documentation (this feature)

```text
specs/014-age-adaptive-theming/
├── plan.md
├── research.md          # token system, selection rule, asset strategy, a11y variants, fallback
├── data-model.md        # ThemeDefinition / ThemeToken / LearnerThemeAssignment (light)
├── quickstart.md        # verify per-age themes + override + a11y + content parity
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
demo/apps/learner-web/
├── public/
│   ├── theme.css                 # EXTEND: token definitions + 3 base themes + a11y variants
│   ├── theme-toggle.js           # EXTEND: resolve active theme (age band + override + a11y prefs)
│   ├── themes/                   # NEW: per-theme token sets + original illustration/asset packs
│   │   ├── tokens.css            #   shared token contract (colour/space/type/radius/motion)
│   │   ├── kids-draw/            #   under-8 theme assets
│   │   ├── brick/                #   8–13 (Lego-inspired) theme assets
│   │   └── game-hud/             #   14+ theme assets
│   └── index.html / mobile.html  # EXTEND: consume tokens (no hard-coded styles); content unchanged
└── server.js                     # EXTEND (minimal): expose resolved theme (age band + override) if needed
```

**Structure Decision**: Extend the existing learner-web front-end with a **CSS-custom-property token system**. A small resolver (`theme-toggle.js`) picks the theme from the learner's age band, applies any teacher/parent override and accessibility preferences, and sets the token set on the root element. Screens consume **tokens only** (no per-theme hard-coded styles), so adding/adjusting a theme is a token + asset change, not a screen rewrite. A neutral default renders when age is unknown or assets fail to load.

## Complexity Tracking

> No constitution violations. Presentation-only; reuses the existing theme.css/theme-toggle.js pattern; no new services, data categories, or AI. The only net-new artifacts are the token contract and per-theme asset packs.
