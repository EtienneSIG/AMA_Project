# Phase 0 Research — Unified Three-Column App Shell

**Feature**: `019-app-shell-three-column` | **Date**: 2026-06-26

## R1 — Layout technique

- **Decision**: **CSS Grid** for the three columns (left rail / center outlet / right panel); each region scrolls independently. Consume Feature 014 design tokens for colour/spacing/typography/motion.
- **Rationale**: Native, responsive, no framework; matches the reference image; reuses the token system.

## R2 — Shared shell + per-role config

- **Decision**: One shared shell (`_shared/public/shell/`) renders the frame; each app passes a `NavConfig` (menu groups/items/routes) and `ProfilePanelConfig` (greeting, quick actions, chart, contextual list). Center content is the app's existing pages re-hosted in the outlet.
- **Rationale**: No per-app layout duplication; a new role module is config, not layout code (SC-006).

## R3 — Client-side navigation

- **Decision**: Menu clicks update **only** the center outlet (no full-page reload); rail + panel persist. Existing routes/deep links preserved.
- **Rationale**: FR-004/FR-010; keeps functionality intact.

## R4 — Responsive behaviour

- **Decision**: On narrow viewports, the left rail collapses to a toggle/drawer and the right panel moves below or into a drawer; center stays a usable single column down to 360 px with **0** horizontal overflow.
- **Rationale**: Mobile-first; children's platform.

## R5 — Accessibility

- **Decision**: ARIA landmarks (`nav`/`main`/`complementary`), logical focus order (nav → content → panel), visible focus, WCAG AA, `prefers-reduced-motion`. Honour 014's high-contrast/reduced-motion variants.
- **Rationale**: Constitution V / Universal Design for Learning.

## R6 — Localisation & RTL

- **Decision**: Shell mirrors correctly for RTL and tolerates longer translated labels without overflow.
- **Rationale**: Multi-market (NL/DE/FR/ES/PL/RO).

## R7 — Migration safety

- **Decision**: Re-host existing pages into the center outlet **without** changing routes; skeletons render the frame first on slow networks.
- **Rationale**: FR-010 (no broken deep links); resilience.

### Open follow-ups (for /speckit.tasks)

- Confirm each role's menu items, center modules, and panel widgets with design + each app owner.
- Confirm the learner shell honours 014 age themes without structural change.
