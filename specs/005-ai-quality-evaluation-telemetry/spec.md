# Feature Specification: AI Quality Evaluation & Telemetry

**Feature Branch**: `005-ai-quality-evaluation-telemetry`

**Created**: 2026-05-18

**Status**: Draft (back-ported from `demo/feature/evaluate.md`)

**Input**: User description: "Make every AI interaction measurable.
The platform must emit signals that operators, teachers and auditors can
rely on — latency, content-safety verdict, groundedness, learner feedback
— and persist them in Postgres for offline review."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Learner rates the assistant answer (Priority: P1)

After every AI tutor answer, a learner can tap one of three buttons —
`Helpful` / `Confusing` / `Wrong` — and optionally add a free-form note
(≤ 500 chars). The vote is recorded against the originating `ask_history`
row so quality can be measured per prompt.

**Why this priority**: Directly feeds the Responsible AI release gate and
the EU AI Act Art. 15 accuracy/robustness evidence chain.

**Independent Test**: Click `Helpful` after an answer, run
`SELECT * FROM ask_feedback WHERE ask_id = $latest` and see one row.

**Acceptance Scenarios**:

1. **Given** an assistant answer rendered in the chat surface, **When**
   the learner clicks `Helpful`, **Then** a row is inserted in
   `ask_feedback` with `rating='helpful'`, `email=<learner>`, matching
   `ask_id`, and `created_at = now()`.
2. **Given** the same surface, **When** the learner types a note longer
   than 500 chars, **Then** the client blocks the submit and the server
   would also reject with 400.

### User Story 2 — Admin sees Quality KPIs (Priority: P1)

An operator opens the admin app's new `Quality` tab and immediately sees
p50/p95 latency over 24 h, % blocked by Content Safety,
helpful/confusing/wrong ratio per role, and teacher Q&A median response
time.

**Independent Test**: After 5 prompts in a demo session, the KPI tiles
are non-zero.

**Acceptance Scenarios**:

1. **Given** ≥ 5 prompts in the last 24 h, **When** the admin opens the
   `Quality` tab, **Then** all four KPI tiles render non-zero values.
2. **Given** the same tab, **When** the admin scrolls to "Latest feedback",
   **Then** the last 50 free-form notes are listed with timestamp and
   role.

### User Story 3 — Auto-flagging low groundedness (Priority: P2)

When a learner prompt contains `Bildungsstandards` or `Kerndoelen` and
the model answer cites **no** curriculum ID, the server auto-inserts an
`ask_feedback` row with `rating='wrong'` and
`note='low_groundedness'`.

**Independent Test**: Issue a curriculum-anchored prompt with a
crafted answer missing the ID; verify the auto-row is written.

### Edge Cases

- A non-authenticated caller MUST be rejected on `POST /api/chat/feedback`.
- Voting twice on the same `ask_id` from the same learner MUST keep both
  rows (audit-trail), the dashboard de-duplicates by latest per learner.
- A `note` longer than 500 chars MUST be rejected client-side and
  server-side.
- An `ask_id` that does not exist MUST cascade-fail with 404 (foreign-key
  `ON DELETE CASCADE` guarantees consistency).
- Quality views MUST remain readable when `ask_history` is empty
  (returns zeros, not error).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: New table `ask_feedback (id BIGSERIAL, ask_id BIGINT FK
  ask_history ON DELETE CASCADE, email TEXT, rating CHECK IN
  helpful/confusing/wrong, note TEXT, created_at)` MUST be created on
  `db.init()`.
- **FR-002**: SQL views `v_quality_kpis_24h` and `v_quality_feedback`
  MUST be created in `schema.sql`, returning the four KPIs in the
  brief and the latest free-form notes.
- **FR-003**: `POST /api/chat/feedback` MUST accept
  `{ askId, rating, note? }`, validate rating in the enum, length-check
  the note, and return 201 on success.
- **FR-004**: `GET /api/admin/quality/kpis` MUST be admin-gated and
  return the four headline KPIs.
- **FR-005**: `GET /api/admin/quality/feedback?limit=50` MUST be
  admin-gated and return the latest free-form notes with `role`,
  `created_at`, redacted to remove anything Content Safety flagged.
- **FR-006**: Learner web and teacher console MUST render the three
  feedback buttons + optional textarea under every assistant answer.
- **FR-007**: Admin app MUST gain a new `Quality` tab showing KPI tiles
  + the latest-feedback table.
- **FR-008**: Auto-groundedness probe MUST run server-side on `/api/chat`
  responses whose prompt contains `Bildungsstandards` or `Kerndoelen`;
  missing curriculum ID → auto-`ask_feedback` row.
- **FR-009**: No PII other than the existing pseudonymous `email` is
  stored; notes are content-safety scanned before persistence.
- **FR-010**: All routes degrade gracefully on Postgres outage (banner,
  no 500).

### Key Entities

- **AskFeedback**: `(id, ask_id, email, rating, note, created_at)`.
- **QualityKpiSnapshot**: read-only projection of `v_quality_kpis_24h`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ≥ 95% of assistant answers carry a feedback widget on
  release day (verified by a UI scan over a recorded session).
- **SC-002**: KPI tiles populated within ≤ 1 s of opening the Quality
  tab on a dataset of 1 000 `ask_history` rows.
- **SC-003**: 0 PII leak detected in the `note` column over the release
  window (Content Safety verdicts logged).
- **SC-004**: Contributes to **EU AI Act conformity** by producing the
  Art. 15 accuracy/robustness evidence chain (latency + groundedness +
  helpfulness).
- **SC-005**: Contributes to **−45% teacher admin time** by exposing
  pending Q&A response times so principals can re-balance class load.

## Assumptions

- `ask_history`, `content_safety_results`, `teacher_questions` already
  exist (Day-0 schema of the demo).
- Content Safety is already wired on every `/api/chat` request.
- The admin app already has a tabbed navigation that can accept a new
  tab without a full rewrite.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | New table on existing EU Postgres; no new PII. |
| II. GDPR Art. 8 | No new collection from minors; pseudonymous identifier reused. |
| III. EU AI Act high-risk | Art. 12 logging + Art. 15 accuracy evidence chain. |
| IV. Teacher-in-the-Loop | Feedback signal informs teacher remediation decisions. |
| V. Pedagogical sign-off | 3-button vocabulary signed off by Learning Sciences. |
| VI. Outcome-contract driven | SC-004 → AI Act conformity; SC-005 → −45% admin time. |
| VII. Reproducible, spec-driven | Spec ships before code; deploy via the 8-step cycle. |
