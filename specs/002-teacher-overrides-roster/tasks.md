# Tasks: Teacher Overrides Audit Trail & Pseudonymous Class Roster

**Input**: Design documents from `/specs/002-teacher-overrides-roster/`
**Prerequisites**: [spec.md](spec.md) (required), [plan.md](plan.md) (required)
**Tests**: included (mandatory: contract test on roster shape per SC-003)
**Organization**: by user story; each story is an independently shippable
slice. Every task names an accountable agent from `agents/`.

## Format: `[ID] [P?] [Story] Description (owner)`

- **[P]** = can run in parallel (different files, no dependency).
- **[Story]** = `US1` (override), `US2` (audit), `US3` (roster), `X`
  (cross-cutting).
- File paths assume the repo root.

---

## Phase 1: Setup

- [ ] **T001** [X] Create branch `002-teacher-overrides-roster`
  (already done by `.specify/scripts/powershell/create-new-feature.ps1`)
  and confirm it is pushed to `origin`. *(owner: edtech-program-orchestrator)*
- [ ] **T002** [X] Pedagogical sign-off on the 4-level vocabulary
  (Beginner / Practising / Proficient / Mastered) — capture in
  [specs/002-teacher-overrides-roster/checklists/compliance.md](checklists/compliance.md).
  *(owner: learning-sciences-expert)*

## Phase 2: Foundational (BLOCKING)

- [ ] **T003** [X] Add `teacher_overrides` table to
  [demo/apps/_shared/db/schema.sql](../../demo/apps/_shared/db/schema.sql)
  per spec FR-003. *(owner: privacy-preserving-ml-engineer)*
- [ ] **T004** [X] Update the mastery read view in the same `schema.sql`
  so the latest `human_level` from `teacher_overrides` wins over the AI
  level (FR-004). *(owner: privacy-preserving-ml-engineer)*
- [ ] **T005** [X] Add helpers `recordOverride`, `listOverrides`,
  `listRoster` to
  [demo/apps/_shared/db/index.js](../../demo/apps/_shared/db/index.js).
  *(owner: privacy-preserving-ml-engineer)*
- [ ] **T006** [P] [X] Add a structured audit logger helper to
  [demo/apps/_shared/server.js](../../demo/apps/_shared/server.js) emitting
  `{route, role, filter_set, row_count, request_id}` with no raw PII
  (FR-006). *(owner: privacy-preserving-ml-engineer)*

**Checkpoint**: Foundation ready. T001–T006 must be merged before any user
story implementation starts.

---

## Phase 3: User Story 1 — Override (Priority: P1) 🎯 MVP

**Goal**: A teacher can override an AI-suggested mastery level with a
rationale, and that override is the level the platform serves from then on.

**Independent Test**: Authenticated POST against
`/api/teacher/overrides` writes a row and a subsequent
`GET /api/learner/mastery` returns `human_level`.

### Tests for US1

- [ ] **T010** [P] [US1] Contract test: `POST /api/teacher/overrides`
  schema (request + 201 response) — add to
  [demo/scripts/acceptance_tests.ps1](../../demo/scripts/acceptance_tests.ps1).
  *(owner: cross-agent-qa-verifier)*
- [ ] **T011** [P] [US1] Integration test: override then read mastery,
  assert `human_level` precedence (FR-004). *(owner: cross-agent-qa-verifier)*

### Implementation for US1

- [ ] **T012** [US1] Add route `POST /api/teacher/overrides` to
  `demo/apps/_shared/server.js`: role-gate on `teacher`/`admin` (FR-005),
  validate rationale length (FR-012), accept idempotency key, call
  `recordOverride`. *(owner: privacy-preserving-ml-engineer)*
- [ ] **T013** [US1] Wire the audit logger from T006 around T012; assert
  no PII beyond pseudonymous `learner_email`. *(owner: privacy-preserving-ml-engineer)*
- [ ] **T014** [US1] Teacher console UI: add pencil icon on every heat-map
  cell + override modal in
  [demo/apps/teacher-console/public/index.html](../../demo/apps/teacher-console/public/index.html).
  Modal MUST be `role="dialog"` with focus trap; level select is a real
  `<select>` (FR-007, accessibility edge case). *(owner: learning-sciences-expert + edtech-program-orchestrator)*
- [ ] **T015** [US1] Transparency copy in the modal: explicit notice that
  the override replaces the AI suggestion and is recorded for inspection
  (Art. 13). *(owner: eu-ai-act-compliance-officer)*
- [ ] **T016** [US1] Localise the new UI strings (NL, DE, PL, RO, FR-BE)
  via the existing pipeline (FR-013). *(owner: content-localisation-lead)*

**Checkpoint**: US1 fully functional and testable.

---

## Phase 4: User Story 2 — Audit trail (Priority: P1)

**Goal**: DPO / EU AI Act Compliance Officer can query the override
history for a given learner or teacher.

**Independent Test**: Authenticated GET against
`/api/teacher/overrides?learner=...` returns a chronologically-ordered
list.

### Tests for US2

- [ ] **T020** [P] [US2] Contract test: `GET /api/teacher/overrides`
  filters (`learner`, `teacher`, `from`, `to`) and ordering
  (`created_at DESC`). *(owner: cross-agent-qa-verifier)*

### Implementation for US2

- [ ] **T021** [US2] Add route `GET /api/teacher/overrides` to
  `server.js`: role-gate (teacher sees own class, admin/DPO sees all),
  call `listOverrides`, emit audit log line. *(owner: privacy-preserving-ml-engineer)*
- [ ] **T022** [US2] Admin "Quality" tab in `demo/apps/admin/public/index.html`:
  add an "Overrides" pane reading from the new endpoint with the
  `teacher`/`from`/`to` filters. *(owner: edtech-program-orchestrator)*
- [ ] **T023** [US2] Document the audit retention policy (12 months) in
  [plan/04-compliance-eu-ai-act-gdpr.md](../../plan/04-compliance-eu-ai-act-gdpr.md)
  as part of the Annex IV fragment for this feature. *(owner: eu-ai-act-compliance-officer)*

**Checkpoint**: US1 and US2 both shippable.

---

## Phase 5: User Story 3 — Pseudonymous roster (Priority: P2)

**Goal**: Teachers see a "Class" tab listing learners by pseudonym only,
with progress, last-active, pending-Q count, and zero PII.

**Independent Test**: Open Class tab, snapshot the JSON returned by
`/api/teacher/class/roster`, confirm only the four whitelisted fields.

### Tests for US3

- [ ] **T030** [P] [US3] Contract test: response shape of
  `/api/teacher/class/roster` is strictly
  `{pseudonym, progress_pct, last_active_at, pending_questions}` per
  row; any extra field fails the build (SC-003). *(owner: cross-agent-qa-verifier)*
- [ ] **T031** [P] [US3] Automated PII scan over a recorded response
  (regex on email / digits-of-birth-date / common first names from the
  synthetic dataset). *(owner: gdpr-children-data-specialist)*

### Implementation for US3

- [ ] **T032** [US3] Add route `GET /api/teacher/class/roster` to
  `server.js`: role-gate on `teacher`, scope to caller's class, call
  `listRoster`, project to the four fields only. *(owner: privacy-preserving-ml-engineer)*
- [ ] **T033** [US3] Teacher console UI: new "Class" tab with the roster
  table; clicking a row filters the heat-map for US1 (FR-010). *(owner: edtech-program-orchestrator)*
- [ ] **T034** [US3] Read-only mode for admin impersonation: hide write
  affordances AND ensure the server rejects writes (FR-011). *(owner: privacy-preserving-ml-engineer)*

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Cross-cutting & Release

- [ ] **T040** [P] [X] Update
  [plan/06-risks-register.md](../../plan/06-risks-register.md) with the
  risk "AI mastery miscalibrated → mitigated by teacher override".
  *(owner: eu-ai-act-compliance-officer)*
- [ ] **T041** [P] [X] Annex IV fragment appended to
  [plan/04-compliance-eu-ai-act-gdpr.md](../../plan/04-compliance-eu-ai-act-gdpr.md)
  covering Art. 9/10/12/13/14/15 for this feature. *(owner: eu-ai-act-compliance-officer)*
- [ ] **T042** [P] [X] Sync shared files into each app via
  `demo/apps/_shared/sync.ps1`. *(owner: demo-deployment-agent)*
- [ ] **T043** [X] Build the teacher console and admin zips via
  `demo/apps/build-zip.ps1`. *(owner: demo-deployment-agent)*
- [ ] **T044** [X] Deploy teacher-console + admin via
  `az webapp deploy ... --type zip --async true` and poll Kudu until
  success. *(owner: demo-deployment-agent)*
- [ ] **T045** [X] Run `demo/scripts/acceptance_tests.ps1` end-to-end on
  the deployed instance; all three new probes MUST pass. *(owner: cross-agent-qa-verifier)*
- [ ] **T046** [X] Responsible AI release gate: bias review of override
  acceptance rate per teacher cohort + transparency-copy review.
  *(owner: responsible-ai-evaluator)*
- [ ] **T047** [X] Final QA sign-off and conventional-commit chain:
  `feat(teacher): overrides audit trail and pseudonymous roster`.
  *(owner: cross-agent-qa-verifier)*

---

## Dependencies & Execution Order

- T001 → T002 (Setup)
- T003 → T004 → T005 (foundational schema before helpers)
- T006 parallel to T003–T005
- US1 (T010–T016) depends on T003–T006
- US2 (T020–T023) depends on T003–T006 and US1 T012 (route shape)
- US3 (T030–T034) depends on T003–T006, independent from US1/US2
- Cross-cutting T040–T047 depend on US1+US2+US3 complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD per
  constitution Principle VII practice).
- Schema before helpers; helpers before routes; routes before UI.
- Localisation (T016) last in US1.

### Parallel Opportunities

- T006 parallel to T003–T005.
- T010 & T011 parallel; T020 standalone; T030 & T031 parallel.
- T040–T042 parallel.

---

## Sign-off matrix (must be green before T047)

| Role | Artefact | Status |
|---|---|---|
| Learning Sciences | T002 (vocabulary) + T014 (UI sign-off) | ☐ |
| GDPR Children's Data Specialist | T031 (PII scan) + DPIA delta in plan.md | ☐ |
| EU AI Act Compliance Officer | T023 + T041 (Annex IV fragment) | ☐ |
| Privacy-Preserving ML Engineer | T003–T006 + T012 + T021 + T032 | ☐ |
| Responsible AI Evaluator | T046 (release gate) | ☐ |
| Cross-Agent QA Verifier | T010, T011, T020, T030, T031, T045, T047 | ☐ |
| Demo Deployment Agent | T042–T044 | ☐ |
| Program Orchestrator | overall sequencing, T001, T014, T022, T033 | ☐ |
