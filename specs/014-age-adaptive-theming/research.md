# Phase 0 Research — Age-Adaptive Learner App Theming

**Feature**: `014-age-adaptive-theming` | **Date**: 2026-06-26

## R1 — Theme selection rule (deterministic, no inference)

- **Decision**: Resolve theme purely from the **already-stored age band**: `< 8` → kids-draw, `8–13 inclusive` → brick (Lego-inspired), `≥ 14` → game-HUD. Boundary rule documented and centralised in one resolver.
- **Rationale**: Constitution III/Art. 5 forbid biometric/behavioural age inference; a deterministic rule on existing data is compliant and testable.
- **Alternatives rejected**: inferring "maturity"/age from behaviour or imagery (prohibited); per-screen conditionals (unmaintainable).

## R2 — Design-token system

- **Decision**: Use **CSS custom properties** as the token contract (colour, spacing, typography scale, radius, motion duration, illustration set). Each theme is a token set + asset pack; screens reference tokens only.
- **Rationale**: One token change propagates app-wide (SC-004); enables a 4th theme without screen edits.
- **Alternatives rejected**: a CSS framework/preprocessor (adds build complexity); inline styles (defeats reuse).

## R3 — Accessibility variants

- **Decision**: Every theme ships **WCAG AA** colour pairs plus **reduced-motion** and **high-contrast** variants, toggled by `prefers-reduced-motion` / `prefers-contrast` and an explicit learner/teacher preference.
- **Rationale**: Constitution V (Universal Design for Learning); children's platform must be inclusive.

## R4 — Asset/IP strategy

- **Decision**: Commission/produce **original** illustration packs that are *inspired by* hand-drawn / construction-brick / game aesthetics. **No trademarked logos, brand names, or copyrighted characters.**
- **Rationale**: Avoids IP infringement while delivering the requested look & feel (FR-008). This spec defines the system, not final artwork.

## R5 — Override & fallback

- **Decision**: Teacher/parent override stored on the existing learner preferences (actor + timestamp, auditable). A **neutral default** theme renders when age is unknown or theme assets fail to load (lightweight, content never blocked).
- **Rationale**: FR-006/FR-007; resilience on slow networks.

## R6 — Content parity guarantee

- **Decision**: Themes change **presentation only**; a parity check asserts identical lesson/item data and available actions across themes.
- **Rationale**: Constitution — engagement styling must not alter pedagogy (SC-002).

### Open follow-ups (for /speckit.tasks)

- Confirm where the learner age band is read from (profile field) for the resolver.
- Confirm the final token names/scale with design + Learning Sciences before producing asset packs.
