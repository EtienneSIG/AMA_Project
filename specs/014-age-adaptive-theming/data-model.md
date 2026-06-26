# Data Model — Age-Adaptive Learner App Theming

**Feature**: `014-age-adaptive-theming` | **Date**: 2026-06-26

Presentation-only feature: **no new personal-data categories**. Entities are theme configuration plus a
small override preference on the existing learner profile.

## ThemeDefinition

| Field | Type | Notes |
|---|---|---|
| `id` | enum `kids-draw` \| `brick` \| `game-hud` \| `neutral-default` | Theme identity. |
| `ageBand` | enum `<8` \| `8-13` \| `14+` \| `any` | Auto-selection mapping (neutral = `any`/fallback). |
| `tokens` | ThemeToken[] | The token set for this theme. |
| `assetPack` | ref | Original illustration/asset pack path. |
| `a11yVariants` | object | `reducedMotion`, `highContrast` overrides. |

## ThemeToken

| Field | Type | Notes |
|---|---|---|
| `name` | string | e.g., `--color-primary`, `--space-2`, `--font-scale`, `--radius`, `--motion-duration`. |
| `value` | string | Theme-specific value (consumed via CSS custom property). |

## LearnerThemeAssignment (resolved at runtime; override persisted on learner preferences)

| Field | Type | Notes |
|---|---|---|
| `learnerRef` | id | Existing learner (no new PII). |
| `resolvedTheme` | enum | Auto from age band, or override. |
| `source` | enum `auto` \| `override` | How it was chosen. |
| `overrideBy` / `overrideAt` | string/timestamptz | Set by teacher/parent; auditable (null if auto). |
| `a11yPrefs` | object | reducedMotion / highContrast preference. |

**Invariant**: the only persisted addition is the override fields on the existing learner preferences;
no biometric/behavioural data; age band is read, never inferred.
