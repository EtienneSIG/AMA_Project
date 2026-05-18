# Feature Specification: Skill Mastery Data Model

**Feature Branch**: `003-skills-mastery-data-model`

**Created**: 2026-05-18

**Status**: Draft (back-ported from `demo/feature/skills progression.md`)

**Input**: User description: "Persist a true mastery profile per learner so the
adaptive picker, the teacher dashboard and the parent view all read from the
same source of truth — Postgres in West Europe."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Learner sees their progress live (Priority: P1)

A 13-year-old learner answers an adaptive item, and within two seconds her
"My progress" card updates with the new mastery counters and timestamp.

**Why this priority**: This is the demonstrable proof that the platform
learns from each interaction; foundation for every downstream feature
(streaks, badges, overrides, parent view).

**Independent Test**: Log in, submit one adaptive attempt, refresh, see the
top-6 progress bars updated.

**Acceptance Scenarios**:

1. **Given** a learner with `n` prior attempts, **When** she answers a new
   item, **Then** `GET /api/learner/mastery` returns `n+1 attempts` and an
   updated `lastSeen` within ≤ 2 s.
2. **Given** a learner with no attempts yet, **When** she opens the app,
   **Then** "My progress" shows an empty-state with a call-to-action.

### User Story 2 — Teacher reads class mastery (Priority: P1)

A teacher opens the "Class mastery" heat-map under the questions inbox and
sees one row per pseudonymous learner and one column per skill, colour-coded
by level bucket.

**Why this priority**: Required by EU AI Act Art. 14 (human oversight) —
the teacher cannot oversee the AI without seeing the same mastery numbers.

**Independent Test**: As teacher, call `GET /api/teacher/class/mastery?cohort=DE-Y7`
and render the heat-map; click a cell, see the underlying `item_attempts`.

**Acceptance Scenarios**:

1. **Given** a class with at least 3 learners and 3 skills, **When** the
   teacher opens the heat-map, **Then** every cell carries one of
   `Beginner / Practising / Proficient / Mastered`.
2. **Given** a heat-map cell, **When** the teacher clicks it, **Then** a
   read-only modal lists the underlying `item_attempts` rows.

### User Story 3 — Admin rebuilds mastery (Priority: P3)

An admin runs `POST /api/learner/mastery/recompute` to rebuild the table
idempotently from `item_attempts` after a data import or a model retrain.

**Independent Test**: Truncate `skill_mastery`, call the route, verify the
table is repopulated with the same counters.

**Acceptance Scenarios**:

1. **Given** a non-admin caller, **When** they hit the recompute route,
   **Then** the server returns 403.
2. **Given** an admin caller, **When** they hit the recompute route,
   **Then** the table is rebuilt and the call is idempotent (same result on
   second invocation).

### Edge Cases

- `PG_HOST` unset → UI shows "Database not configured" banner; no 500.
- Concurrent attempts upsert the same `(email, skill_id)` row without loss
  (last-write-wins on counters, sum on `attempts/correct`).
- A skill with `attempts = 0` MUST NOT appear in the learner's top-6 card.
- Recompute on an empty `item_attempts` produces an empty `skill_mastery`,
  not an error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A new Postgres table `skill_mastery` MUST persist, per
  `(email, skill_id)`: `attempts, correct, recent_attempts, recent_correct,
  level, last_seen`.
- **FR-002**: A new table `item_skills` MUST map `item_id → skill_id`,
  seeded idempotently from `demo/data/items_to_skills.csv` on `db.init()`.
- **FR-003**: A new table `learner_activity` MUST persist a daily rollup
  per learner (`email, day, attempts, correct`) — required for the
  streaks/badges feature (006).
- **FR-004**: `POST /api/learner/attempt` MUST upsert the affected
  `(email, skill_id)` row in `skill_mastery` synchronously.
- **FR-005**: `GET /api/learner/mastery` MUST return the signed-in
  learner's mastery list `{ skillId, label, level, attempts, correct,
  lastSeen }[]`, role-gated `student`/`admin-self`.
- **FR-006**: `POST /api/learner/mastery/recompute` MUST rebuild the
  table from `item_attempts`, idempotent, admin-only.
- **FR-007**: `GET /api/teacher/class/mastery?cohort=<id>` MUST return a
  teacher-scoped aggregate; role-gated `teacher`.
- **FR-008**: The mastery formula (see brief) MUST be deterministic and
  return one of `Beginner | Practising | Proficient | Mastered` at
  thresholds `0.4 / 0.65 / 0.85`.
- **FR-009**: All routes MUST degrade gracefully when Postgres is
  unavailable: banner on the client, no 500 on the server.
- **FR-010**: No new outbound network call; no new third-party SDK; all
  storage stays in West Europe.

### Key Entities

- **SkillMasteryRow**: `(email, skill_id, attempts, correct,
  recent_attempts, recent_correct, level, last_seen)`.
- **ItemSkill**: `(item_id, skill_id)` static mapping seeded from CSV.
- **LearnerActivityRow**: `(email, day, attempts, correct)`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 99% of new attempts are reflected in the learner's "My
  progress" card within ≤ 2 s.
- **SC-002**: Teacher heat-map renders 100 cells in ≤ 300 ms p95 from EU-West.
- **SC-003**: Recompute is idempotent: two consecutive runs produce the
  same row count and the same checksum on `(attempts, correct, level)`.
- **SC-004**: Contributes to **−26% outcome gap** by giving teachers the
  signal needed to remediate under-performing cohorts.
- **SC-005**: Contributes to **−45% admin time** by removing the manual
  computation of mastery from teacher workflows.

## Assumptions

- `curricula`, `item_attempts`, `learners`, `connection_logs` already
  exist (Day-0 schema of the demo).
- The adaptive picker continues to run client-side; this feature only
  changes the persistence and the read views.
- The teacher cohort identifier (`cohort`) is already exposed in the
  teacher session payload.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Same EU Postgres; no new personal-data class. |
| II. GDPR Art. 8 | Pseudonymous learner identifier; no new collection from minors. |
| III. EU AI Act high-risk | Provides the data backbone for Art. 14 oversight (heat-map). |
| IV. Teacher-in-the-Loop | Heat-map + cell drill-down are oversight surfaces. |
| V. Pedagogical sign-off | Mastery formula + 4-level vocabulary signed off by Learning Sciences. |
| VI. Outcome-contract driven | SC-004 → −26% outcome gap; SC-005 → −45% admin time. |
| VII. Reproducible, spec-driven | Spec ships before code; deploy via the 8-step cycle. |
