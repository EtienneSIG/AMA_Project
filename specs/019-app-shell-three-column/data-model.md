# Data Model — Unified Three-Column App Shell

**Feature**: `019-app-shell-three-column` | **Date**: 2026-06-26

Presentation-only: **no new personal-data categories**. Entities are static UI configuration consumed by the shared shell.

## AppShell (shared component)

| Aspect | Notes |
|---|---|
| `regions` | left rail · center outlet · right panel (CSS Grid). |
| `theme` | consumes Feature 014 token set (per app / per learner age band). |
| `responsive` | rail/panel collapse to drawers on narrow viewports. |
| `a11y` | ARIA landmarks, focus order, WCAG AA, reduced motion. |

## NavConfig (per role)

| Field | Type | Notes |
|---|---|---|
| `role` | enum learner \| parent \| teacher \| admin \| director | |
| `brand` | object | Logo/title. |
| `groups[]` | object | Menu groups → items (label, icon, route). |
| `pinned[]` | object | Settings/Logout pinned near the bottom. |

## ProfilePanelConfig (per role)

| Field | Type | Notes |
|---|---|---|
| `role` | enum | |
| `greeting` | object | Avatar + greeting (existing identity; no new PII). |
| `quickActions[]` | object | Icon actions. |
| `chart` | ref | Compact progress/summary (reuses existing data). |
| `contextList` | ref | Role-relevant list (mentors/children/class/etc.). |

## ShellTheme

| Field | Type | Notes |
|---|---|---|
| `tokens` | ref | Feature 014 token set applied to the shell. |
| `variants` | object | High-contrast / reduced-motion. |

**Invariant**: configuration only; the right panel and charts reuse data each app already exposes — **no new data collection**, no access-control change.
