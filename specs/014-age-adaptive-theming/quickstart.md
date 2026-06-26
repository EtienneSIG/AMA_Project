# Quickstart — Age-Adaptive Learner App Theming

**Feature**: `014-age-adaptive-theming` | **Date**: 2026-06-26

Validates the three age-band themes, the token system, override, accessibility variants, and content parity.

## 1. Per-age-band theme (auto)

Sign in to the learner app with three test profiles and confirm the auto-applied theme:

| Profile age | Expected theme |
|---|---|
| 6 | `kids-draw` (hand-drawn / crayon) |
| 11 | `brick` (Lego-inspired) |
| 15 | `game-hud` |

Check the boundary: age **8** and age **13** both resolve to `brick` (8–13 inclusive).

## 2. Token propagation (SC-004)

Change one token (e.g., `--color-primary` for `brick`) in `themes/tokens.css` → confirm it updates across
home, lesson, item, and progress screens **without** editing any screen markup.

## 3. Content parity (SC-002)

Load the same lesson/item under all three themes → confirm **identical** content, available actions, and data
(only colours/typography/illustration/motion differ).

## 4. Override

As a teacher/parent, override a 15-year-old to `brick` → learner sees the brick theme; the override record
shows who set it and when.

## 5. Accessibility

- Enable OS **reduced motion** → animations suppressed in every theme.
- Enable **high contrast** → high-contrast variant applied; WCAG AA contrast holds.
- Keyboard + screen-reader pass on the home screen in each theme.

## 6. Fallback

Simulate a failed theme-asset load or unknown age → **neutral-default** theme renders; content is never blocked.

## Acceptance checklist

- [ ] Correct theme per age band (under-8 / 8–13 / 14+), boundary 8–13 inclusive (SC-001).
- [ ] One token change propagates app-wide with no screen edits (SC-004).
- [ ] Identical learning content/data across themes (SC-002).
- [ ] WCAG AA + reduced-motion + high-contrast in every theme (SC-003).
- [ ] Teacher/parent override applied + audited.
- [ ] Neutral default renders on unknown age / asset failure; 0% sessions blocked (SC-005).
- [ ] No trademarked assets; original packs only (FR-008).
