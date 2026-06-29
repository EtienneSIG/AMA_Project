# Feature Specification: Learner Tabbed Workspace & Per-Chapter Progress

**Feature Branch**: `001-learner-tabbed-workspace`

**Created**: 2026-05-18

**Status**: Implemented (tabbed workspace shipped in learner-web — "Feature 4b": three tabs Test your knowledge / Ask your teacher / My progress + per-chapter grouping)

**Input**: User description: "Split the single-page learner experience into three
dedicated tabs (Test your knowledge / Ask your teacher / My progress) and
group skill mastery by chapter, to reduce scroll fatigue and reflect the K-12
task framing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Focus on practising (Priority: P1)

A 13-year-old learner opens the learner web app to practise fractions.
Today the page mixes the adaptive picker, the AI tutor, the explanation
drawer, the streak widget and the Q&A composer; on a school Chromebook this
forces constant scrolling. The learner wants a single "Test your knowledge"
tab that shows only what is needed to attempt the next item and read its
explanation.

**Why this priority**: This is the core daily journey. Reducing distraction
moves the **outcome-gap −26%** KPI by increasing time-on-task on
mastery-aligned items, especially for low-performing cohorts.

**Independent Test**: Log in as a learner, land on "Test your knowledge",
complete three adaptive items, open and collapse the Explanation drawer.
The MVP is shippable even without tabs 2 and 3.

**Acceptance Scenarios**:

1. **Given** a logged-in learner, **When** they open the learner web app,
   **Then** the default view is the "Test your knowledge" tab with the
   adaptive picker on the left, the AI tutor in the centre and a collapsed
   Explanation drawer on the right.
2. **Given** the learner is on "Test your knowledge", **When** they click the
   Explanation drawer toggle, **Then** the drawer expands/collapses without
   navigating away or losing the current item state.
3. **Given** the learner is on "Test your knowledge", **When** they open the
   Sheets modal from the topbar, **Then** the modal works exactly as today.

---

### User Story 2 — Ask the teacher without leaving context (Priority: P2)

The learner is stuck on an item and wants to ask their teacher. They need a
dedicated, uncluttered surface to write the question and to scroll through
past answers — and to bookmark a useful answer as a study sheet.

**Why this priority**: Supports the teacher-in-the-loop principle and feeds
the teacher-administrative-time KPI by routing low-value clarifications away
from synchronous channels.

**Independent Test**: Switch to "Ask your teacher", post a question, see it
appear in the threaded list, bookmark a past answer and verify it shows up in
Sheets.

**Acceptance Scenarios**:

1. **Given** the learner is on "Ask your teacher", **When** they submit a
   question, **Then** it appears at the top of the threaded list with a
   "pending" status.
2. **Given** an answered question, **When** the learner clicks the bookmark
   star, **Then** the answer is saved as a study sheet visible in the Sheets
   modal.

---

### User Story 3 — See progress by chapter (Priority: P3)

The learner (and indirectly their parent during a guardian review) wants to
see mastery grouped by chapter (e.g. "Fractions · basics", "Fractions ·
operations") instead of a flat list of skills.

**Why this priority**: Supports transparency (AI Act Art. 13) and motivation;
also unlocks future chapter-level recommendations for the teacher console.

**Independent Test**: Open "My progress", verify the streak/badges row, then
expand a chapter card and see per-skill progress bars summing to the
chapter-level bar.

**Acceptance Scenarios**:

1. **Given** a learner with mastery records across two chapters, **When**
   they open "My progress", **Then** they see a streak/badges row followed by
   one collapsible card per chapter, each with a chapter-level progress bar.
2. **Given** a chapter card, **When** the learner expands it, **Then** per-skill
   progress bars are listed in the order returned by the mastery service.

### Edge Cases

- A learner with **no** mastery records yet sees an empty-state on "My
  progress" with a call-to-action to start practising.
- A skill whose `chapter` is `NULL` is grouped under a default `General`
  chapter rather than hidden.
- Teacher-impersonation mode (admin previewing a learner view) MUST render
  the same tabs without writing any learner activity.
- Slow network: switching tabs MUST NOT re-fetch data already loaded for the
  current session (debounce / cache).
- Accessibility: tabs MUST be reachable via keyboard (Tab + Enter) and
  announced by screen readers (`role="tab"` / `aria-selected`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The learner web app MUST expose three top-level tabs in the
  hero: "Test your knowledge" (default), "Ask your teacher", "My progress".
- **FR-002**: The "Test your knowledge" tab MUST contain the adaptive item
  picker, the AI tutor and a retractable Explanation drawer that the learner
  can collapse with a single click.
- **FR-003**: The Sheets modal MUST remain reachable from the topbar on every
  tab.
- **FR-004**: The "Ask your teacher" tab MUST provide a composer on top and a
  threaded list of past questions/answers below, with an inline bookmark
  action on each answer.
- **FR-005**: The "My progress" tab MUST display the streak/badges row, then
  one collapsible card per chapter, each with a chapter-level progress bar
  computed from the contained skills.
- **FR-006**: The `skills` catalogue MUST carry a `chapter` field
  (nullable; default `General`); the seed data in `demo/data/skills.csv` MUST
  back-fill this field for every existing skill.
- **FR-007**: The mastery service MUST return the `chapter` for each skill so
  the client can group without an extra round-trip.
- **FR-008**: No new server route is introduced; the redesign is a pure
  rearrangement of existing JS plus the additive schema change in FR-006.
- **FR-009**: All learner-visible copy MUST be available in NL, DE, PL, RO
  and FR-BE through the existing localisation pipeline before release in
  each market.
- **FR-010**: The redesign MUST NOT introduce any new third-party SDK or any
  network call that sends learner PII outside the existing APIM gateway.

### Key Entities

- **Skill**: a competency item (`id`, `name`, `competency`, `chapter`,
  locale-specific labels).
- **MasteryRecord**: per-learner, per-skill, with current mastery score and
  last-updated timestamp; grouped by `chapter` on read.
- **TeacherQuestion**: existing entity; surfaced as the canonical record of
  the "Ask your teacher" thread.
- **Sheet**: existing entity; new origin value `teacher-answer-bookmark`
  flags sheets created via the bookmark action.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can reach and complete a new adaptive item from a
  cold tab load in **≤ 5 seconds** on a school-grade Chromebook (4G profile).
- **SC-002**: Scrolling on "Test your knowledge" is reduced by **≥ 50%**
  compared to the pre-redesign single page (measured on a 768×1366 viewport
  during a fixed 3-item scenario).
- **SC-003**: **≥ 80%** of learners in a usability cohort find at least one
  past teacher answer within 30 seconds on "Ask your teacher".
- **SC-004**: **≥ 90%** of mastery records render under their correct
  chapter card; orphan skills (no chapter) appear under `General`.
- **SC-005**: Outcome-gap KPI trend (vs control cohort) improves by
  **≥ 2 percentage points** over the two weeks following release, contributing
  to the programme-level **−26%** target.
- **SC-006**: Zero new GDPR or AI Act findings raised by the Cross-Agent QA
  Verifier on the release review.

## Assumptions

- The mastery, streak/badges, Q&A, sheets and AI-tutor backends already exist
  (Features 1–4 in `demo/feature/EXECUTION-PLAN.md`) and are stable.
- The localisation pipeline can absorb the new UI strings within the
  six-week cycle mandated by the outcome contract.
- The teacher console redesign (Feature 5) is out of scope for this spec and
  tracked separately.
- All learner-facing copy is reviewed by the Learning Sciences specialist
  before merge.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | No new data classes; no new outbound calls. |
| II. GDPR Art. 8 | No new personal-data collection; existing consent flow unchanged. |
| III. EU AI Act high-risk | No model change; transparency improved (chapter grouping). |
| IV. Teacher-in-the-loop | "Ask your teacher" tab strengthens the oversight surface. |
| V. Pedagogical sign-off | Chapter framing reviewed by Learning Sciences (gate). |
| VI. Outcome-contract driven | SC-005 maps to the **−26% outcome gap** KPI. |
| VII. Reproducible, spec-driven | Spec ships before code; deploy via the eight-step cycle. |
