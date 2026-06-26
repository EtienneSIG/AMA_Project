# Feature Specification: Age-Adaptive Learner App Theming

**Feature Branch**: `014-age-adaptive-theming`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Create a template for the learner app that fits the learner's age — under 8 looks like a child's drawing, 8–13 is inspired by Lego, over 13 is video-game themed. This is about the look and feel of the app (CSS, HTML, layout, typography, motion)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Age-Appropriate Theme Applied Automatically (Priority: P1)

When a learner signs in, the learner web app presents a visual theme matched to the learner's age band: a playful hand-drawn / crayon style for under 8, a colourful brick-and-baseplate (Lego-inspired) construction style for 8–13, and a sleek game-HUD style for 14 and over. Layout, colours, typography, iconography, illustrations and motion all adapt while the underlying learning content stays identical.

**Why this priority**: A single age-appropriate theme is the core requested capability and the smallest slice that delivers value — it makes the app feel right for each learner without changing pedagogy.

**Independent Test**: Sign in as a 6-year-old, an 11-year-old, and a 15-year-old profile; confirm each loads a visibly distinct theme (child-drawing, Lego-inspired, game-HUD) on the home page and across core screens, with identical learning content.

**Acceptance Scenarios**:

1. **Given** a learner profile with a known age/age-band, **When** the learner opens the app, **Then** the matching theme (under-8 / 8–13 / 14+) is applied across the home page and primary navigation without any manual selection.
2. **Given** a learner aged exactly 8 or exactly 13, **When** the theme resolves, **Then** the documented boundary rule is applied deterministically (8–13 inclusive uses the Lego-inspired theme).
3. **Given** the theme changes between age bands, **When** screens render, **Then** all core flows (home, lesson, item, progress) remain fully usable, readable, and accessible (contrast, font sizing, tap targets) in every theme.

---

### User Story 2 — Theme Token System & Reusability (Priority: P2)

The three themes are built from a shared design-token system (colours, spacing, typography, radius, motion, illustration set) so that a new theme can be added or an existing one adjusted without rewriting screens. Each screen consumes tokens, not hard-coded styles.

**Why this priority**: Maintainability and extensibility; valuable but depends on the first themed slice existing.

**Independent Test**: Change a token value (e.g., primary colour for the Lego theme) in one place and confirm it propagates across all screens using that theme without per-screen edits.

**Acceptance Scenarios**:

1. **Given** a token-based theme definition, **When** a token is changed, **Then** every screen using that token reflects the change with no per-screen code edits.
2. **Given** a request to add a fourth theme, **When** a new token set + asset pack is provided, **Then** it can be registered and selected without modifying screen markup logic.

---

### User Story 3 — Safe Theme Override & Accessibility Preferences (Priority: P2)

A teacher or parent can override the auto-selected theme for an individual learner (e.g., an older learner who prefers the simpler style, or accessibility needs), and a high-contrast / reduced-motion accessibility variant is available for every theme.

**Why this priority**: Universal Design for Learning (constitution V) and inclusivity require override and accessibility variants, but they build on the base theming.

**Independent Test**: Teacher overrides a 15-year-old to the 8–13 theme; learner sees the Lego-inspired theme. Enable reduced-motion; confirm animations are suppressed in all themes.

**Acceptance Scenarios**:

1. **Given** a teacher/parent override is set, **When** the learner signs in, **Then** the overridden theme is applied and the override is recorded with who set it and when.
2. **Given** a learner or device requests reduced motion or high contrast, **When** the theme renders, **Then** an accessible variant honours those preferences in every age theme.

### Edge Cases

- Learner age is unknown or not yet set: a neutral default theme is applied until age is known; no age is guessed from imagery or behaviour.
- Learner has a birthday that crosses an age boundary: theme transition is announced gently (optional) and applied on next sign-in; no data is lost.
- Theme assets fail to load on a slow connection: a lightweight fallback theme renders so content is never blocked.
- Branding/IP: visual styles are *inspired by* construction-brick / game / hand-drawn aesthetics using original assets; no trademarked logos, brand names, or copyrighted character art are used.
- Very small or very large viewports: every theme remains responsive and legible (mobile-first).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The learner app MUST select a theme based on the learner's age band: under 8 (hand-drawn / child-drawing style), 8–13 inclusive (construction-brick / Lego-inspired style), 14 and over (video-game / game-HUD style).
- **FR-002**: Theme selection MUST be deterministic at age boundaries, with the documented rule (8–13 inclusive = brick theme) applied consistently.
- **FR-003**: Themes MUST affect only presentation (CSS/HTML structure, layout, colour, typography, iconography, illustration, motion); learning content and data MUST be identical across themes.
- **FR-004**: Themes MUST be defined via a shared design-token system enabling reuse and the addition of new themes without rewriting screen markup.
- **FR-005**: Every theme MUST meet accessibility baselines (WCAG AA contrast, scalable text, adequate tap targets) and provide reduced-motion and high-contrast variants.
- **FR-006**: Teachers/parents MUST be able to override the auto-selected theme per learner, with the override persisted and auditable.
- **FR-007**: System MUST provide a safe default/fallback theme when age is unknown or theme assets fail to load.
- **FR-008**: All theme assets MUST be original or appropriately licensed; no trademarked brand names, logos, or copyrighted characters MUST be used (styles are *inspired-by* only).
- **FR-009**: Theme selection MUST NOT infer or store any new sensitive data; it relies only on the already-collected age/age-band, and MUST NOT use facial or behavioural analysis to guess age.

### Key Entities

- **ThemeDefinition**: A named theme (under-8, 8–13, 14+, plus variants) composed of design tokens and an asset pack.
- **ThemeToken**: An individual presentational value (colour, spacing, typography, radius, motion duration) consumed by screens.
- **LearnerThemeAssignment**: The resolved theme for a learner, including auto-selection source, any override (by whom, when), and accessibility preferences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** of learners are served the correct age-band theme on first load based on their stored age band (verified across under-8, 8–13, 14+ test profiles).
- **SC-002**: Switching or overriding a theme requires **zero** changes to learning content and produces identical lesson/item data across themes.
- **SC-003**: Every theme passes WCAG AA contrast and supports reduced-motion and high-contrast variants (**100%** of core screens).
- **SC-004**: A new theme or a token change can be applied without editing individual screen markup (demonstrated by changing one token and propagating app-wide).
- **SC-005**: Theme assets render or fall back gracefully so that **0%** of sessions are blocked from content by a failed theme load.
- **SC-006**: Age-appropriate presentation contributes to learner engagement and time-on-task across age bands without altering measured learning outcomes.

## Assumptions

- Learner age / age band is already captured during onboarding and is the only signal used for theme selection.
- The learner web app (`demo/apps/learner-web`) is the surface to be themed; theming is presentation-only and does not change APIs or data models for content.
- Original or properly licensed illustration/asset packs will be produced for each theme; this spec defines the *system*, not final artwork.
- Pedagogical equivalence across themes is required: no theme may add or remove learning functionality.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Uses only the already-stored age band; no new data classes, no behavioural/biometric age inference. |
| II. GDPR Art. 8 | No new personal data collected; theme overrides are set by consented adults (teacher/parent) and audited. |
| III. EU AI Act high-risk | No AI is used to select themes (deterministic age-band rule); explicitly forbids facial/emotion/behavioural age inference (Art. 5 safe). |
| IV. Teacher-in-the-loop | Teachers/parents can override theme per learner; overrides are persisted. |
| V. Pedagogical sign-off | Themes are presentation-only and reviewed for age-appropriateness, readability, and Universal Design for Learning (accessibility variants). |
| VI. Outcome-contract driven | Age-fit presentation supports engagement and time-on-task that underpin the outcome-gap KPI, without changing pedagogy. |
| VII. Reproducible, spec-driven | Token-based, independently testable themes with measurable, technology-agnostic success criteria. |
