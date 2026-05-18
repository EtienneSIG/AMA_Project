# Feature Specification: Teacher Overrides Audit Trail & Pseudonymous Class Roster

**Feature Branch**: `002-teacher-overrides-roster`

**Created**: 2026-05-18

**Status**: Draft (back-ported from `demo/feature/teacher feature.md` §5 + §8)

**Input**: User description: "Teacher overrides audit trail and pseudonymous
class roster — make every AI-suggested mastery level overridable by a
teacher with a rationale, persist the override for audit, and expose a
class roster that shows progress without ever revealing minor PII."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Override an AI-suggested mastery level (Priority: P1)

A 4th-grade teacher reviews the class mastery heat-map and disagrees with
the AI's "Proficient" rating on the fractions skill for one of her learners.
She wants to correct the level to "Practising", write a one-line rationale
("missed the last quiz, needs another week"), and have that correction be
the level the platform uses from now on — with a clear audit entry that the
EU AI Act inspector and the school principal can read.

**Why this priority**: Direct enforcement of **Constitution Principle IV
(Teacher-in-the-Loop)** and EU AI Act **Art. 14 (human oversight)**. Without
a working override path the AI feature cannot ship at all.

**Independent Test**: Log in as a teacher, open the heat-map, click the
pencil icon on any cell, submit a new level + rationale, refresh, see the
new level reflected and the override entry retrievable via
`GET /api/teacher/overrides?learner=…`.

**Acceptance Scenarios**:

1. **Given** a teacher viewing the heat-map of her class, **When** she
   clicks the pencil icon on a cell, **Then** a modal opens pre-filled with
   the AI's current level (`ai_level`) and an empty rationale.
2. **Given** the override modal, **When** the teacher selects a new level
   (Beginner / Practising / Proficient / Mastered) and submits a non-empty
   rationale, **Then** the platform persists a row in `teacher_overrides`
   with `teacher_email`, `learner_email`, `skill_id`, `ai_level`,
   `human_level`, `rationale`, `created_at` and returns 201.
3. **Given** at least one override exists for a (learner, skill) pair,
   **When** anyone reads the learner's mastery, **Then** the latest
   `human_level` takes precedence over the AI-computed level.
4. **Given** a non-teacher user (learner / admin without grant), **When**
   they call `POST /api/teacher/overrides`, **Then** the request is
   rejected with 403 (server-side role check, not only client-side).

---

### User Story 2 — Read the audit trail (Priority: P1)

The principal, the DPO and the EU AI Act Compliance Officer need to read,
filter and export the override history for a given learner or a given
teacher to demonstrate Art. 14 oversight during an inspection.

**Why this priority**: An override without a queryable audit trail does not
satisfy Art. 12 logging or Art. 14 oversight. Cannot ship Story 1 without
Story 2.

**Independent Test**: Call `GET /api/teacher/overrides?learner=<email>` as a
teacher and confirm a chronologically-ordered list of overrides; call as a
DPO admin user and confirm broader filters work.

**Acceptance Scenarios**:

1. **Given** several overrides on different (learner, skill) pairs, **When**
   a teacher calls `GET /api/teacher/overrides?learner=<email>`, **Then** the
   response is a JSON array ordered by `created_at DESC` containing all
   fields above, scoped to learners in that teacher's class.
2. **Given** a DPO/admin role, **When** they call
   `GET /api/teacher/overrides?teacher=<email>&from=<iso>&to=<iso>`, **Then**
   the response covers all classes for that teacher in the date range.
3. **Given** any read on the endpoint, **When** the response is sent,
   **Then** a structured log line is emitted (route, role, filter set,
   row count — never raw learner PII beyond the pseudonymous identifier
   already in the request).

---

### User Story 3 — Browse the class as a pseudonymous roster (Priority: P2)

The teacher wants a "Class" tab listing every learner with their pseudonym,
overall progress, last-active timestamp and any pending teacher-question —
never their real name, never their email, never anything that identifies a
minor outside the school's own records.

**Why this priority**: Directly enforces **Principle I (data minimisation)**
and **Principle II (GDPR Art. 8)**. Adds a navigation surface that makes
Story 1 usable at class scale.

**Independent Test**: Open the "Class" tab as a teacher and verify that
every row shows only a pseudonym, progress %, last-active and pending-Q
count; verify the network response contains no PII fields.

**Acceptance Scenarios**:

1. **Given** a teacher with N learners in her class, **When** she opens the
   "Class" tab, **Then** she sees one row per learner with
   `pseudonym, progress_pct, last_active_at, pending_questions` and no
   other personal field.
2. **Given** the same view, **When** she clicks a row, **Then** the
   heat-map filters to that learner for Story 1 to be applied.
3. **Given** an admin impersonation session (read-only), **When** the
   roster is rendered, **Then** no write action (override / answer) is
   available.

### Edge Cases

- **No prior AI level**: the override modal still works; `ai_level` is
  persisted as `NULL` and the row carries only `human_level`.
- **Empty rationale**: server returns 400 with `rationale_required`; client
  blocks the submit button until non-whitespace input is provided.
- **Concurrent overrides**: last-write-wins; both rows are kept in the
  audit table; reads always use the latest `created_at`.
- **Override on a deleted learner**: still readable from the audit trail
  (right-to-erasure handled at the learner profile layer; audit entry
  pseudonymises the learner reference after erasure per DPIA).
- **Teacher tries to override outside her class**: 403 with no information
  leakage about whether the (learner, skill) exists.
- **Network failure mid-submit**: client shows a retry; idempotency key on
  the request prevents duplicate audit rows.
- **Accessibility**: pencil action reachable via keyboard, modal dialog
  uses `role="dialog"` with focus trap; new level select is a real
  `<select>` with labels.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST provide a write endpoint
  `POST /api/teacher/overrides` accepting JSON
  `{ learner_email, skill_id, ai_level?, human_level, rationale }` and
  returning the persisted row.
- **FR-002**: The platform MUST provide a read endpoint
  `GET /api/teacher/overrides` supporting at minimum
  `?learner=<email>` and `?teacher=<email>&from=<iso>&to=<iso>` filters,
  ordered by `created_at DESC`.
- **FR-003**: The data store MUST persist every override in a
  `teacher_overrides` table as defined in `demo/feature/teacher feature.md`
  §5 (`id, teacher_email, learner_email, skill_id, ai_level, human_level,
  rationale, created_at`).
- **FR-004**: Mastery reads (existing `GET /api/learner/mastery`,
  `GET /api/teacher/class/mastery`) MUST return the latest `human_level`
  whenever a matching override exists, else the AI-computed level.
- **FR-005**: Every write to `/api/teacher/overrides` MUST be server-side
  role-gated on `req.user.role === 'teacher'` (or `'admin'`) in addition
  to App Service role inference; failed checks return 403.
- **FR-006**: Every write and read MUST emit a structured audit log line
  (route, role, filter set, row count) with no raw learner PII beyond the
  pseudonymous identifier already in the request.
- **FR-007**: The teacher console MUST render a pencil icon on every cell
  of the class mastery heat-map; clicking it opens a modal pre-filled with
  the current `ai_level` and an empty rationale.
- **FR-008**: The teacher console MUST add a "Class" tab listing learners
  as `{ pseudonym, progress_pct, last_active_at, pending_questions }` only;
  no real name, no email, no birth date, no school-grade label that could
  re-identify a single learner.
- **FR-009**: The platform MUST provide a read endpoint
  `GET /api/teacher/class/roster` returning the roster fields in FR-008,
  scoped to the calling teacher's class.
- **FR-010**: Selecting a roster row MUST filter the existing heat-map and
  Story 1 override flow to that single learner.
- **FR-011**: An admin impersonation session MUST render the roster and
  heat-map read-only (no override / no answer buttons visible AND server
  rejects the writes).
- **FR-012**: A rationale of fewer than 3 non-whitespace characters or
  longer than 500 characters MUST be rejected client-side and server-side
  with explicit error codes.
- **FR-013**: All learner-visible copy introduced by this feature MUST be
  available in NL, DE, PL, RO, FR-BE through the existing localisation
  pipeline before release in each market.
- **FR-014**: No new third-party SDK or outbound network call MUST be
  introduced; all traffic continues through APIM + existing AOAI/Content
  Safety endpoints in EU regions only.

### Key Entities

- **TeacherOverride**: append-only audit row `{ id, teacher_email,
  learner_email, skill_id, ai_level, human_level, rationale, created_at }`.
- **MasteryView**: read model combining the AI-computed mastery with the
  latest matching `TeacherOverride`.
- **ClassRosterRow**: pseudonymous projection
  `{ pseudonym, progress_pct, last_active_at, pending_questions }`.
- **AuditLogEntry**: structured log envelope `{ route, role, filter_set,
  row_count, request_id, timestamp }` — no PII.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A teacher can complete an end-to-end override
  (heat-map → pencil → modal → submit → refreshed level) in **≤ 20 seconds**
  on a school-grade Chromebook (4G profile).
- **SC-002**: **100%** of overrides written in a one-week pilot are
  retrievable via the audit endpoint with all eight fields populated.
- **SC-003**: **0** roster requests in production expose any field outside
  the four whitelisted in FR-008 (verified by automated contract test on
  every release).
- **SC-004**: **0** new GDPR or AI Act findings raised by the Cross-Agent
  QA Verifier and the EU AI Act Compliance Officer on the release review.
- **SC-005**: Contributes to the **−45%** teacher administrative time KPI
  by removing the need to email the principal to correct an AI rating
  (target: ≥ 5 min saved per override-worthy event).
- **SC-006**: Contributes to **100% maintained GDPR Art. 8 compliance** —
  zero PII leak detected by automated scans of `/api/teacher/class/roster`
  and `/api/teacher/overrides` responses over the release window.

## Assumptions

- The mastery store from Feature 1 (`skill_mastery`) and the skills
  catalogue from Feature 2 are deployed and stable.
- Pseudonyms already exist in the `learners` view used by the demo (see
  `demo/data/synthetic_learners.csv`).
- The existing role-resolution middleware on
  `demo/apps/_shared/server.js` exposes `req.user.role` reliably.
- Admin impersonation mode already sets a read-only flag on the session.
- The localisation pipeline (Feature: Localisation Lead) can absorb the
  new strings within the six-week cycle mandated by the outcome contract.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | New table on the existing EU Postgres; roster fields strictly pseudonymous. |
| II. GDPR Art. 8 | No new collection from minors; existing pseudonymisation honoured; right-to-erasure preserved. |
| III. EU AI Act high-risk | Article 14 oversight surface; Article 12 logging hooks; Annex IV fragment to be produced in `plan.md`. |
| IV. Teacher-in-the-Loop | Core deliverable of the feature — overrides are first-class and persisted. |
| V. Pedagogical sign-off | Learning Sciences specialist signs off the level vocabulary (Beginner/Practising/Proficient/Mastered) before implementation. |
| VI. Outcome-contract driven | SC-005 maps to **−45% teacher admin time**; SC-006 to **100% GDPR**. |
| VII. Reproducible, spec-driven | This spec is committed before any code; plan + tasks follow. |
