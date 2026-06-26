# Quickstart — Unified Three-Column App Shell

**Feature**: `019-app-shell-three-column` | **Date**: 2026-06-26

## 1. Consistent shell across all apps
Sign in to each of the five apps (learner, parent, teacher, admin, director) → each shows the same structure:
**left navigation rail**, **center content**, **right profile/context panel** — only menu/content/widgets differ.

## 2. Role-tailored content
Confirm each role's left menu, center modules, and right-panel widgets match its config (e.g., director → reporting;
parent → children + digest; teacher → classes + assessment; learner → continue learning + progress + mentors).

## 3. Client-side navigation
Click a menu item → only the **center** updates (rail + panel persist; no full-page reload). Existing deep links still work.

## 4. Responsive
Resize desktop → 360 px → left rail collapses to a drawer, right panel moves below/into a drawer, center stays usable
with **0** horizontal overflow.

## 5. Accessibility
Keyboard-only pass → focus order nav → content → panel; landmarks present; WCAG AA contrast; reduced-motion suppresses
animation. In the learner app, confirm the three columns persist across the 014 age themes.

## 6. Localisation
Switch language (incl. an RTL locale) → shell mirrors correctly; long labels don't overflow.

## Acceptance checklist
- [ ] 100% of the five apps render the three-column shell (SC-001).
- [ ] Menu nav updates only the center; no reload (SC-002).
- [ ] WCAG AA + keyboard + landmarks + reduced motion on core screens (SC-003).
- [ ] 0 overflow from desktop to 360 px (SC-004).
- [ ] 0 broken deep links; 0 new personal-data classes (SC-005).
- [ ] A new role module added via config without editing shell layout (SC-006).
