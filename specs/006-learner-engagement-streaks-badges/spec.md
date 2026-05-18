# Feature Specification: Learner Engagement — Streaks, Badges, Quiz-me & Bookmarks

**Feature Branch**: `006-learner-engagement-streaks-badges`

**Created**: 2026-05-18

**Status**: Draft (back-ported from `demo/feature/learner feature.md` §6–8)

**Input**: User description: "Daily streak, badges, Quiz-me from a study
sheet, and bookmark-teacher-answer as a sheet — the learner web engagement
layer that motivates continued practice without crossing into behavioural
profiling."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Daily streak motivates return (Priority: P1)

A learner who has practised every day for 4 days sees a `4-day streak`
widget in the sidebar. After today's first attempt the streak becomes 5.
A missed day resets it to 1 on the next active day.

**Why this priority**: Engagement loop that drives time-on-task without
behavioural advertising or profiling — directly compatible with
Principle II (GDPR Art. 8).

**Independent Test**: Insert 4 days of attempts, open the app, see
`4-day streak`; submit one more attempt today, refresh, see `5`.

**Acceptance Scenarios**:

1. **Given** N consecutive active days, **When** the learner opens the
   app, **Then** `GET /api/learner/streak` returns `{ days: N }`.
2. **Given** a missed day, **When** the learner returns, **Then** the
   streak is `1` and the previous best is exposed for transparency.

### User Story 2 — Earn badges for milestones (Priority: P2)

When a learner crosses thresholds (1 mastered skill, 3 mastered skills,
first review-mode attempt, …), a badge appears in the sidebar with a
plain-language description.

**Independent Test**: Mark 1 skill mastered → `Beginner` badge present;
3 skills → `Mastered ×3`.

**Acceptance Scenarios**:

1. **Given** the learner has 0 mastered skills, **When** she masters her
   first, **Then** the `Beginner` badge appears within ≤ 2 s.
2. **Given** the learner has 3 mastered skills, **When** she opens the
   app, **Then** the `Mastered ×3` badge is visible.

### User Story 3 — Quiz me from a study sheet (Priority: P2)

A learner who has saved a study sheet wants a 5-question quiz built from
its content to self-test before a class.

**Independent Test**: Click `Quiz me` on any sheet, complete 5 questions,
verify rows are recorded in `item_attempts` with synthetic ID
`SHEET:<sheetId>:Q<n>`.

**Acceptance Scenarios**:

1. **Given** a sheet, **When** the learner clicks `Quiz me`, **Then** a
   5-question quiz is generated via `/api/chat` with a fixed system
   prompt and 5 rows land in `item_attempts`.
2. **Given** a sheet whose content is too short for 5 questions, **When**
   the learner clicks `Quiz me`, **Then** the server returns a graceful
   error message and no rows are inserted.

### User Story 4 — Bookmark a teacher answer (Priority: P3)

A learner who finds a teacher reply useful clicks a star to save it as a
study sheet with `prompt = subject` and `answer = teacher reply`.

**Independent Test**: Star a teacher answer, open the Sheets modal, see
the new sheet with `origin = 'teacher-answer-bookmark'`.

**Acceptance Scenarios**:

1. **Given** an answered teacher question, **When** the learner clicks
   the star, **Then** a sheet is created via the existing
   `POST /api/sheets` with the answer as content.
2. **Given** a teacher question still pending, **When** the learner views
   it, **Then** the star action is disabled.

### Edge Cases

- Timezone changes MUST NOT inflate the streak (`day` is computed in the
  learner's profile timezone, default Europe/Brussels).
- Quiz generation MUST be content-safety scanned before display (no
  bypass via the synthetic `SHEET:` items).
- Badges MUST be language-neutral icons + localised tooltip (no
  hard-coded English).
- Streak data MUST be derivable from `learner_activity` (feature 003),
  no shadow store.
- Bookmark on a deleted teacher question MUST fail gracefully (404).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A trigger or post-insert helper on `item_attempts` MUST
  populate the daily rollup in `learner_activity (email, day, attempts,
  correct)` (defined in feature 003).
- **FR-002**: `GET /api/learner/activity` MUST return the last 30 days
  of rollups for the signed-in learner.
- **FR-003**: `GET /api/learner/streak` MUST return
  `{ days: <current>, best: <best> }`, computed from
  `learner_activity` in the learner's timezone.
- **FR-004**: The learner web MUST render a streak widget in the
  sidebar of "My progress" (feature 001 Tab 3).
- **FR-005**: The learner web MUST render up to 6 badges based on
  thresholds documented in the learning-sciences review.
- **FR-006**: `POST /api/sheets/:id/quiz` MUST generate a 5-question
  quiz from the sheet's content via `/api/chat`, content-safety scanned,
  and write 5 rows to `item_attempts` with synthetic IDs.
- **FR-007**: The Sheets modal MUST expose a `Quiz me` button on every
  sheet.
- **FR-008**: A `★` bookmark action on answered teacher questions MUST
  call the existing `POST /api/sheets` with the answer as content and
  `origin = 'teacher-answer-bookmark'`.
- **FR-009**: No new outbound network call beyond the existing
  APIM → AOAI → Content Safety path; no behavioural profiling, no
  advertising SDK.
- **FR-010**: All learner-visible copy (badges, tooltips, quiz prompt)
  MUST be localised to NL, DE, PL, RO, FR-BE before release in each
  market.

### Key Entities

- **LearnerActivityRow**: `(email, day, attempts, correct)` —
  re-uses the table from feature 003.
- **Badge**: client-side derived from mastery + activity counters; no
  persistent table.
- **SyntheticQuizItem**: `item_attempts` row with `item_id` matching
  `SHEET:<sheetId>:Q<1..5>`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ≥ 60% of pilot learners maintain a ≥ 3-day streak in the
  first two weeks after release (engagement leading indicator for the
  **−26% outcome gap**).
- **SC-002**: Quiz-me round-trip (button → 5 questions rendered) in
  ≤ 4 s p95 on a school-grade Chromebook.
- **SC-003**: 0 GDPR finding on profiling: streak/badge state derives
  exclusively from `learner_activity`, no external tracker.
- **SC-004**: Bookmark action used ≥ once by ≥ 30% of learners during
  the pilot.
- **SC-005**: 0 content-safety bypass detected on `SHEET:` items
  (Content Safety verdicts logged).

## Assumptions

- Feature 003 (`skill_mastery` + `learner_activity`) is deployed.
- The Sheets backend (`sheets` table, CRUD routes) is stable.
- The teacher Q&A inbox (feature DONE) is stable.
- The learner timezone is available in the profile payload
  (default Europe/Brussels if missing).

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | All state on existing EU Postgres; no behavioural profile. |
| II. GDPR Art. 8 | No advertising / commercial profiling; streak ≠ behavioural targeting. |
| III. EU AI Act high-risk | Quiz-me runs through existing AOAI + Content Safety pipeline. |
| IV. Teacher-in-the-Loop | Teacher answers remain the authoritative bookmark source. |
| V. Pedagogical sign-off | Badge thresholds & quiz prompt signed off by Learning Sciences. |
| VI. Outcome-contract driven | SC-001 → −26% outcome gap leading indicator. |
| VII. Reproducible, spec-driven | Spec ships before code; deploy via the 8-step cycle. |
