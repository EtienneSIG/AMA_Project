# Feature Specification: UX Fixes — Remove Editorial Toggle & Left-Align Primary Menu

**Feature Branch**: `020-ux-editorial-toggle-left-menu`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "create a spec with those UX modification: (1) delete the toggle editorial (top right, cf photo 1); (2) Menu is not on the left so correct it (photo 2)."

> **Reference (photo 1)**: A small top-right control labelled **"EDITORIAL"** with an on/off switch — the whole-app theme toggle (the `.theme-dongle` injected by `theme-toggle.js`, switching the `theme-gic` "Editorial GIC" theme on `<body>`).

> **Reference (photo 2)**: The learner workspace primary navigation (pill tab bar: *Quest dashboard · Test your knowledge · Ask your teacher · My progress · Activities*) which does not sit flush to the left edge of the page content.

> **Relationship to Spec 019**: Spec 019 ("Unified Three-Column App Shell") established **menu-on-the-left** as the target. This spec is a focused correction of the **currently shipped** UI: it removes the now-unwanted Editorial theme toggle and aligns the existing primary menu to the left, without waiting for the full 019 shell rollout. It is presentation-only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Remove the Editorial theme toggle (Priority: P1)

A signed-in user no longer sees the top-right **"EDITORIAL"** theme switch on any app. The interface presents a single, consistent visual theme with no user-facing way to switch into the alternative "Editorial GIC" theme.

**Why this priority**: The toggle is unwanted UI clutter in the top-right corner and exposes an alternative theme that is not intended for end users; removing it is the most visible part of the request and is independently shippable.

**Independent Test**: Open each app (learner, parent, teacher, admin, director) as a signed-in user and on the login screen; confirm the top-right "EDITORIAL" toggle is absent and the page renders in the standard theme with no layout gap where the toggle used to be.

**Acceptance Scenarios**:

1. **Given** any app page (signed-in or login), **When** it loads, **Then** no "EDITORIAL" toggle/dongle is rendered anywhere on the page.
2. **Given** a user who previously enabled the Editorial theme, **When** they next load any app, **Then** the app renders in the standard default theme (the previously-stored preference no longer changes the appearance).
3. **Given** the toggle is removed, **When** the page renders, **Then** there is no empty space, broken layout, console error, or missing-asset request caused by its removal.

---

### User Story 2 — Left-align the primary navigation menu (Priority: P1)

The primary navigation menu is aligned to the left edge of the page content, consistent with the Spec 019 "menu on the left" intent, rather than appearing centered or detached from the content's left margin.

**Why this priority**: A left-aligned menu matches the agreed design direction (Spec 019) and the user's explicit correction; it improves scannability and visual consistency and is independently shippable.

**Independent Test**: Open each app at desktop width and confirm the primary menu's first item starts at the same left margin as the main page content (header/hero/content column), with no unintended centering.

**Acceptance Scenarios**:

1. **Given** an app with a primary navigation menu, **When** it renders at desktop width, **Then** the first menu item is flush with the left margin of the page's main content column.
2. **Given** the menu has more items than fit on one line, **When** it wraps, **Then** wrapped items remain left-aligned (no centering of rows).
3. **Given** a narrow/mobile viewport, **When** the menu renders, **Then** it remains left-aligned (or its mobile equivalent) without horizontal overflow.
4. **Given** all apps that share this navigation pattern, **When** they render, **Then** the left alignment is applied consistently across them.

### Edge Cases

- A user with the Editorial theme stored in `localStorage`: appearance reverts to default; no error is thrown when the stored value is read but the toggle no longer exists.
- Login / pre-auth pages that previously embedded the toggle inline must also render without it and without a layout gap.
- Very long localized menu labels (or RTL languages): the menu stays left-aligned (start-aligned) and does not overflow.
- Apps whose menu is already left-aligned: no visual regression is introduced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Editorial theme toggle (the top-right "EDITORIAL" switch / `.theme-dongle`) MUST NOT be rendered on any app surface (learner, parent, teacher, admin, director), including login/pre-auth pages.
- **FR-002**: With the toggle removed, every app MUST render in a single, consistent default theme; users MUST NOT have a UI control to switch into the alternative "Editorial GIC" theme.
- **FR-003**: Any previously-stored Editorial theme preference MUST NOT cause the alternative theme to be applied; the app MUST present the default theme regardless of prior preference.
- **FR-004**: Removing the toggle MUST NOT leave a visual gap, broken layout, JavaScript console error, or failed asset request on any page.
- **FR-005**: The primary navigation menu MUST be left-aligned with the left margin of the page's main content column on every app that uses it.
- **FR-006**: When the menu wraps onto multiple rows, the wrapped rows MUST remain left-aligned.
- **FR-007**: The left alignment MUST hold across supported viewports (desktop down to a 360 px-wide viewport) without introducing horizontal scrolling/overflow.
- **FR-008**: The change MUST be presentation-only — it MUST NOT alter any data model, AI behaviour, access-control, consent, or routing; existing pages and deep links MUST continue to work.
- **FR-009**: The menu's left alignment MUST be applied consistently across all apps that share the navigation pattern, so the apps look coherent.

### Key Entities

- **ThemeToggle**: The whole-app theme switch control (top-right dongle) being removed across all apps and pre-auth pages.
- **PrimaryNavMenu**: The app's primary navigation (e.g., the learner pill tab bar) whose horizontal alignment is being corrected to left/start.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **0** app surfaces (across all five apps + login pages) render the Editorial toggle after the change.
- **SC-002**: **100%** of app loads render in the default theme, with **0** user-facing path to the alternative theme.
- **SC-003**: **0** console errors, layout gaps, or failed asset requests are attributable to the toggle removal.
- **SC-004**: **100%** of apps with the primary menu render it left-aligned (first item flush with the content's left margin) at desktop width.
- **SC-005**: **0** horizontal-overflow defects caused by the menu from desktop down to a 360 px-wide viewport.
- **SC-006**: **0** existing routes/deep links break and **0** new personal-data classes are introduced (presentation-only change).

## Assumptions

- The affected surfaces are the five demo apps (`demo/apps/learner-web`, `parent-portal`, `teacher-console`, `admin`, `director-portal`) plus any shared/login pages that embed the toggle.
- The "default theme" to retain is the standard (non-`theme-gic`) LearnEU theme currently shown before the Editorial toggle is switched on; the alternative "Editorial GIC" theme assets may remain in the repo but become unreachable from the UI (their files are out of scope for deletion in this spec).
- "Menu on the left" means start-aligned with the main content column (left in LTR, mirrored in RTL); it does not, by itself, require the full vertical left-rail from Spec 019 — that remains the larger redesign.
- The learner age-adaptive themes (Spec 014) are unaffected; this spec only removes the separate Editorial toggle and corrects menu alignment.

## Out of Scope

- The full three-column shell migration (covered by Spec 019).
- Deleting the underlying "Editorial GIC" theme stylesheets/tokens from the repository (only the user-facing toggle is removed).
- Any change to menu **contents**, ordering, icons, or routing — only horizontal alignment changes.
- Any data-model, AI, consent, or access-control change.

## Dependencies

- **Spec 019** (Unified Three-Column App Shell) — shares the "menu on the left" direction; this spec is a compatible interim correction and must not conflict with the 019 shell when it lands.
- **Spec 014** (Age-Adaptive Theming) — must remain functional; only the Editorial toggle is removed.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Presentation-only; removes a UI control and changes alignment. No new data collection, no profiling, no cross-EU transfer. |
| II. GDPR Art. 8 | No change to consent, data classes, or under-16 gating. |
| III. EU AI Act high-risk | No AI behaviour change; no AI surface is added or modified. No Annex IV impact. |
| IV. Teacher-in-the-loop | No change to decision flows, overrides, or teacher/admin controls. |
| V. Pedagogical sign-off | Cleaner top bar and consistent left-aligned navigation support clarity and Universal Design for Learning; reviewed for age-appropriateness. |
| VI. Outcome-contract driven | Consistent, predictable navigation supports usability and teacher admin-time KPIs. |
| VII. Reproducible, spec-driven | Independently testable with measurable, technology-agnostic criteria; presentation-only and low-risk. |
