# Feature Specification: Unified Three-Column App Shell (All Apps)

**Feature Branch**: `019-app-shell-three-column`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Adapt the interface to be more like the attached picture (Coursue dashboard): (1) menu on the left, (2) content in the center, (3) profile panel on the right. Apply to all apps — learner, parent, teacher, admin, director."

> **Reference**: The attached mock-up shows a modern learning dashboard with a fixed **left navigation rail** (brand + grouped menu + secondary links/Settings/Logout), a scrollable **center content area** (top search/filter bar, hero/announcement banner, summary cards, "Continue" carousel, and a data table), and a fixed **right profile panel** (avatar + greeting, quick actions, a progress chart, and a contextual list such as mentors/friends).

> **Profile panel placement**: The profile/context panel is placed on the **right** (confirmed with the user, matching the reference image). This spec uses **left = navigation, center = content, right = profile**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Consistent Three-Column Shell Across All Apps (Priority: P1)

Any signed-in user (learner, parent, teacher, admin, director) sees the same structural shell: a left navigation rail, a center content region, and a right profile/context panel. Only the menu items, content, and panel widgets differ per role; the layout, spacing, and interaction patterns are identical.

**Why this priority**: A single, shared shell is the core requested change and the smallest valuable slice — it makes all five apps feel like one coherent product and is the foundation every other story builds on.

**Independent Test**: Sign in to each of the five apps; confirm each renders the same three-column shell (left nav, center content, right profile panel) with role-appropriate menu, content, and panel widgets.

**Acceptance Scenarios**:

1. **Given** a user signs in to any app, **When** the page loads, **Then** they see a left navigation rail, a center content area, and a right profile panel arranged consistently across all five apps.
2. **Given** the left rail, **When** rendered, **Then** it shows the product brand/logo at top, a primary grouped menu (e.g., Overview), a secondary section, and Settings/Logout pinned near the bottom, matching the reference structure.
3. **Given** the right panel, **When** rendered, **Then** it shows the user's avatar + greeting, quick-action icons, a small progress/summary chart, and a contextual list relevant to the role.
4. **Given** the same user navigates between sections, **When** they click a menu item, **Then** only the center content updates while the left rail and right panel persist (no full-page reload).

---

### User Story 2 — Role-Tailored Navigation, Content & Panel (Priority: P1)

Each role gets menu items, center modules, and right-panel widgets appropriate to its job, while reusing the same shell components.

**Why this priority**: The shared shell is only useful if each role sees the right things; this makes the redesign real for every persona without duplicating layout code.

**Independent Test**: For each role, verify the left menu, center modules, and right-panel widgets match that role's defined configuration (e.g., director sees reporting/benchmarks; parent sees children + digest; teacher sees classes + assessment).

**Acceptance Scenarios**:

1. **Given** a learner, **When** the shell renders, **Then** the left menu shows learner sections (e.g., Dashboard, Lessons, Tasks), center shows "Continue learning" + progress, and the right panel shows the learner's profile, streak/progress chart, and mentors/classmates.
2. **Given** a parent, **When** the shell renders, **Then** the menu shows parent sections (Children, Messages, Digest, Consent), center shows the multi-child dashboard, and the right panel shows the selected child summary and quick actions.
3. **Given** a teacher, **When** the shell renders, **Then** the menu shows teacher sections (Classes, Assessment, Library, Messages), center shows class/assessment modules, and the right panel shows the teacher profile and a class/well-being summary.
4. **Given** an admin, **When** the shell renders, **Then** the menu shows platform sections (Quality, Users, Ops, Experiments), center shows operational dashboards, and the right panel shows system status/quick actions.
5. **Given** a director, **When** the shell renders, **Then** the menu shows reporting sections, center shows the analytics surface, and the right panel shows scope/profile and key KPI highlights.

---

### User Story 3 — Responsive, Accessible & Themed Shell (Priority: P1)

The three-column shell is responsive (right panel and left rail collapse gracefully on smaller screens), accessible (keyboard navigation, focus order, contrast, ARIA landmarks), and respects each app's existing theming (including the age-adaptive learner themes from Spec 014).

**Why this priority**: A redesign that breaks on mobile or fails accessibility is not shippable for a children's platform (constitution V, Universal Design for Learning); responsiveness and a11y are part of "done".

**Independent Test**: Resize each app from desktop to mobile; confirm columns collapse to an accessible single-column flow with a toggleable nav and profile drawer; run a keyboard-only and screen-reader pass on the shell landmarks.

**Acceptance Scenarios**:

1. **Given** a narrow viewport, **When** the shell renders, **Then** the left rail collapses to a toggle/drawer and the right panel moves below or into a drawer, leaving the center content usable in a single column.
2. **Given** keyboard-only navigation, **When** the user tabs through the shell, **Then** focus order is logical (nav → content → panel), landmarks (`nav`, `main`, `complementary`) are present, and all interactive elements are reachable and labelled.
3. **Given** the learner app with an age-band theme active (Spec 014), **When** the shell renders, **Then** the three-column structure is preserved while colours, typography, and motion follow the active theme.
4. **Given** any app, **When** the shell renders, **Then** it meets WCAG AA contrast and supports reduced-motion preferences.

### Edge Cases

- Very long menus or many panel list items: sections scroll independently without breaking the fixed three-column frame.
- A role has no meaningful right-panel content: the panel shows a relevant default (e.g., quick links/help) rather than an empty column, or collapses with the center expanding.
- Search/filter bar in the center has no results: an empty-state is shown within the center region only.
- RTL and long-translation languages (localisation): the shell mirrors correctly for RTL and tolerates longer labels without overflow.
- Slow network: shell renders its frame first (skeletons) so structure is visible before content/panel data loads.
- Existing per-app pages/routes must continue to work while migrated into the new shell (no broken deep links).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All five apps (learner, parent, teacher, admin, director) MUST present a unified three-column shell: left navigation rail, center content region, right profile/context panel.
- **FR-002**: The left rail MUST contain brand/logo, a grouped primary menu, a secondary section, and pinned Settings/Logout, consistent with the reference structure.
- **FR-003**: The right panel MUST contain the user's avatar + greeting, quick-action controls, a compact progress/summary chart, and a role-relevant contextual list.
- **FR-003a**: The right-panel **profile/identity header MUST be visually identical across all five apps** (learner is the reference): same avatar + name + role block. Where the legacy top bar exposes a profile button (`openProfile()`), the header MUST be the profile affordance and the top-bar avatar hidden; where the top-bar avatar is a non-profile control (e.g. admin sign-out), it MUST be hidden (Sign out already lives at the panel bottom) rather than relocated into the actions row — so the header never shifts between apps. The "This week" chart MUST reflect real per-user activity (`/api/activity/week`), not a fixed series.
- **FR-004**: Navigating between menu items MUST update only the center content (client-side), keeping the left rail and right panel persistent.
- **FR-005**: Menu items, center modules, and right-panel widgets MUST be configurable per role without duplicating the shell layout code (shared shell + role config).
- **FR-006**: The shell MUST be responsive: on small viewports the left rail and right panel collapse into toggles/drawers and the center content remains a usable single column.
- **FR-007**: The shell MUST be accessible: ARIA landmarks (`nav`/`main`/`complementary`), logical keyboard focus order, visible focus states, WCAG AA contrast, and reduced-motion support.
- **FR-008**: The shell MUST respect existing per-app theming and the learner age-adaptive themes (Spec 014) without altering its column structure.
- **FR-009**: The shell MUST support localisation (multiple languages, longer labels, and RTL mirroring) without layout overflow.
- **FR-010**: Migration MUST preserve existing routes/deep links and existing functionality; pages are re-hosted in the shell, not removed.
- **FR-011**: The shell MUST be presentation-only — it MUST NOT introduce new personal-data collection or change any data model, AI behaviour, or access-control rules.

### Key Entities

- **AppShell**: The shared layout component providing the three-column frame (left rail, center outlet, right panel) used by all apps.
- **NavConfig**: Per-role definition of left-rail menu groups, items, icons, and routes.
- **ProfilePanelConfig**: Per-role definition of right-panel widgets (greeting, quick actions, chart, contextual list).
- **ShellTheme**: The active theme tokens applied to the shell (per app / per learner age band), reusing Spec 014's token system where applicable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** of the five apps render the unified three-column shell (left nav, center content, right profile) for authenticated users.
- **SC-002**: Switching menu sections updates only the center region (no full-page reload) in **100%** of navigations.
- **SC-003**: The shell passes WCAG AA contrast, keyboard navigation, landmark, and reduced-motion checks on **100%** of core screens per app.
- **SC-004**: The shell is responsive with **0** horizontal-scroll/overflow defects from desktop down to a 360 px-wide viewport across all apps.
- **SC-005**: **0** existing routes/deep links break after migration; **0** new personal-data classes are introduced (presentation-only change).
- **SC-006**: A new role module (menu item + center module + panel widget) can be added via configuration without editing the shell layout code (demonstrated once).
- **SC-007**: Consistent navigation reduces time-to-locate key tasks across apps, supporting teacher admin-time reduction (−45% KPI) and overall usability.

## Assumptions

- The five apps (`demo/apps/learner-web`, `parent-portal`, `teacher-console`, `admin`, `director-portal`) are the surfaces to restyle; the change is structural/presentational.
- The reference image defines the visual intent (left nav / center / right profile); exact widgets per role are refined with the Learning Sciences and design reviewers.
- The age-adaptive theming (Spec 014) and existing per-app styles provide the visual tokens; this spec defines the **layout shell**, not new artwork.
- Profile panel is placed on the right per the reference image (confirmed with the user).

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Presentation-only shell; no new data collection, no profiling, no cross-EU transfer. |
| II. GDPR Art. 8 | No change to consent, data classes, or under-16 gating; the shell only re-arranges existing surfaces. |
| III. EU AI Act high-risk | No AI behaviour change; any AI surfaces hosted in the shell retain their existing logging/transparency/override. |
| IV. Teacher-in-the-loop | No change to decision flows or overrides; teacher/admin controls are simply re-hosted in the shell. |
| V. Pedagogical sign-off | Layout reviewed for clarity, Universal Design for Learning, and age-appropriateness (with Spec 014 themes). |
| VI. Outcome-contract driven | SC-007 maps consistent navigation to the −45% teacher admin-time KPI and usability. |
| VII. Reproducible, spec-driven | Shared shell + per-role config is independently testable with measurable, technology-agnostic criteria. |
