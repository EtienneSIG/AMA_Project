# Feature Specification: Teacher Class Mastery, Curriculum Browser & Class-Scoped Quality KPIs

**Feature Branch**: `007-teacher-class-mastery-curriculum-browser`

**Created**: 2026-05-18

**Status**: Draft (back-ported from `demo/feature/teacher feature.md` §4, §6, §7, §9)

**Input**: User description: "Give teachers a class mastery heat-map with
remediation suggestions, a curriculum browser to drag competencies into the
prompt, a Cite-a-competency pill for traceable answers, and a class-scoped
quality KPI panel."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Class mastery heat-map with remediation (Priority: P1)

A teacher opens the Class mastery heat-map (depends on feature 003), spots
a column of red cells on `SK-FRAC-ADD`, clicks any cell to see the
underlying `item_attempts`, and clicks `Recommend a remediation` to get a
ready-to-share study sheet built from that context.

**Why this priority**: Primary teacher workflow that moves the
**−45% admin time** KPI by turning a 20-minute manual plan into a 30-second
AI-assisted recommendation kept under teacher control.

**Independent Test**: As a teacher, click a heat-map cell, then
`Recommend a remediation`, verify a sheet is created and shared with the
class.

**Acceptance Scenarios**:

1. **Given** the heat-map is rendered, **When** the teacher clicks a
   cell, **Then** a modal opens with the underlying `item_attempts`
   rows for that `(learner, skill)` pair (read-only, EU AI Act Art. 14).
2. **Given** the modal, **When** the teacher clicks
   `Recommend a remediation`, **Then** `/api/chat` is called with the
   cell context pre-filled and the resulting plan is saved as a sheet
   with `role='teacher'`.
3. **Given** the resulting sheet, **When** the teacher clicks `Share`,
   **Then** the sheet is visible to the targeted learners via the
   existing Sheets surface.

### User Story 2 — Curriculum browser drawer (Priority: P2)

A teacher opens the right-hand curriculum drawer, filters by
country / grade / subject, and drags a competency item into the prompt
textarea to anchor the next AI answer.

**Independent Test**: Open the drawer, drag any item into the textarea,
confirm the competency ID is appended.

**Acceptance Scenarios**:

1. **Given** the drawer is open, **When** the teacher filters by
   `country=DE, grade=Y7, subject=MATH`, **Then** only matching items
   from `GET /api/data/curricula` are listed.
2. **Given** a list item, **When** the teacher drags it into the
   prompt textarea, **Then** the competency ID is appended on a new line
   with a `→ cite:` prefix.

### User Story 3 — Cite-a-competency pill (Priority: P2)

A teacher clicks a "Cite a competency" pill above the prompt textarea,
selects a competency, and submits. The model is instructed to cite that
ID verbatim in the answer for traceability.

**Independent Test**: Click pill, pick `DE-MATH-Y7-FRAC-02`, submit;
the model answer contains that exact string.

**Acceptance Scenarios**:

1. **Given** the pill is set, **When** the teacher submits, **Then**
   the system prompt is augmented with
   `Cite competency <ID> verbatim in your answer.` and the answer
   contains that ID.
2. **Given** no pill is set, **When** the teacher submits, **Then** the
   system prompt is unchanged.

### User Story 4 — Class-scoped quality KPIs (Priority: P3)

A teacher opens a "Class quality" panel mirroring the admin Quality tab
(feature 005) but restricted to her class: median teacher response time,
% of pending Q&A > 24 h, blocked-by-Content-Safety rate.

**Independent Test**: As a teacher, open the panel, verify the numbers
match a manual aggregate of her class's `teacher_questions` +
`content_safety_results`.

**Acceptance Scenarios**:

1. **Given** ≥ 5 prompts in the last 24 h within the teacher's class,
   **When** she opens the panel, **Then** all three KPIs render
   non-zero values.
2. **Given** a non-teacher caller, **When** they hit the panel's
   endpoint, **Then** the server returns 403.

### Edge Cases

- The heat-map MUST handle classes with > 35 learners by paginating
  rows (no horizontal scroll on tablet).
- `Recommend a remediation` MUST be content-safety scanned before save
  (no bypass via teacher role).
- Curriculum drawer MUST stay usable when `/api/data/curricula` is
  empty (renders an empty-state, no spinner forever).
- Citing a competency that does not exist in `curricula` MUST yield a
  client-side warning before submission.
- The class-quality KPI endpoint MUST scope strictly by class — a
  teacher MUST NOT see another class's numbers (server-side check on
  `req.user.classId`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The teacher console MUST render a heat-map under the
  questions inbox: rows = pseudonymous learners, columns = skills,
  cells coloured by mastery bucket (feature 003).
- **FR-002**: Clicking a heat-map cell MUST open a read-only modal with
  the underlying `item_attempts` rows for `(learner, skill)`.
- **FR-003**: The modal MUST expose a `Recommend a remediation` button
  that calls `/api/chat` with the cell context pre-filled and saves the
  result as a sheet (`role='teacher'`).
- **FR-004**: A `Share` action on the resulting sheet MUST grant
  visibility to the targeted learners through the existing Sheets
  surface.
- **FR-005**: A right-hand `Curriculum browser` drawer MUST list
  competencies from `GET /api/data/curricula`, filterable by
  `country, grade, subject`, draggable into the prompt textarea.
- **FR-006**: A `Cite a competency` pill above the prompt textarea
  MUST inject `Cite competency <ID> verbatim in your answer.` into the
  system prompt when set.
- **FR-007**: A new admin/teacher endpoint
  `GET /api/teacher/quality/kpis` MUST return the three class-scoped
  KPIs; role-gated; class-scoped via `req.user.classId`.
- **FR-008**: A new `Class quality` panel in the teacher console MUST
  render the three KPI tiles.
- **FR-009**: Every teacher action that mutates state (sheet save,
  share) MUST be persisted with `teacher_email` + `created_at`
  (audit-grade, FR aligned with `demo/feature/teacher feature.md`
  cross-cutting NFRs).
- **FR-010**: The UI MUST never show real PII for minors — pseudonyms
  only (Constitution Principle II).
- **FR-011**: Every teacher-only route MUST be role-gated server-side
  in addition to App Service role inference.
- **FR-012**: No new outbound network call; no new third-party SDK; all
  storage stays in West Europe.

### Key Entities

- **HeatMapCell**: derived projection `(learner_pseudonym, skill_id,
  level_bucket, attempts, correct)`.
- **RemediationPlan**: a `sheets` row with `role='teacher'`,
  `origin='heatmap-remediation'`, content produced by `/api/chat`.
- **CurriculumDrawerItem**: existing `curricula` row exposed read-only
  to the drawer.
- **ClassQualityKpi**: read-only projection of the same SQL views
  defined in feature 005, filtered by class.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A teacher can go from spotting a red cell to sharing a
  remediation sheet in ≤ 90 s (target for the **−45% admin time** KPI).
- **SC-002**: Heat-map renders 35 learners × 30 skills in ≤ 500 ms p95.
- **SC-003**: 100% of `Recommend a remediation` outputs pass Content
  Safety before save (zero blocked output saved).
- **SC-004**: 100% of citations produced via the pill contain the
  exact competency ID (verified by automated post-hoc regex scan).
- **SC-005**: 0 cross-class leakage on
  `GET /api/teacher/quality/kpis` (verified by an automated
  multi-teacher contract test).
- **SC-006**: Contributes to **EU AI Act conformity** by combining
  Art. 14 oversight (heat-map drill-down) with Art. 11 traceability
  (cited competency IDs).

## Assumptions

- Feature 003 (mastery data model) is deployed.
- Feature 002 (teacher overrides) is deployed so the pencil/override
  flow already exists on the heat-map.
- Feature 004 (skill catalogue) is deployed so skills columns are
  stable.
- Feature 005 (quality views) is deployed so the class KPI panel reads
  from `v_quality_kpis_24h` filtered by class.
- The teacher session payload exposes `classId` reliably.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Reads from existing EU Postgres; no new personal-data class. |
| II. GDPR Art. 8 | Heat-map and roster strictly pseudonymous; no PII surfaced. |
| III. EU AI Act high-risk | Art. 14 oversight (drill-down) + Art. 11 traceability (cited IDs). |
| IV. Teacher-in-the-Loop | Every AI output (remediation plan) stays under teacher control before share. |
| V. Pedagogical sign-off | Remediation prompt template signed off by Learning Sciences. |
| VI. Outcome-contract driven | SC-001 → −45% admin time; SC-006 → AI Act conformity. |
| VII. Reproducible, spec-driven | Spec ships before code; deploy via the 8-step cycle. |
