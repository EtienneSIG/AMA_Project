# Implementation Plan: Learner Tabbed Workspace & Per-Chapter Progress

**Branch**: `001-learner-tabbed-workspace` | **Date**: 2026-06-30 | **Spec**: `/specs/001-learner-tabbed-workspace/spec.md`

**Input**: Feature specification from `/specs/001-learner-tabbed-workspace/spec.md`

> **Status**: Retrospective back-fill. The tabbed workspace shipped in `learner-web` ("Feature 4b") before the Spec Kit `plan.md`/`tasks.md` artefacts existed. This plan documents the as-built design so the feature is fully traceable through the mandatory `spec → plan → tasks` chain (constitution Principle VII). No new behaviour is introduced by this document.

## Summary

Split the single-page learner experience in `demo/apps/learner-web/` into dedicated, keyboard-accessible tabs (default **Test your knowledge**, plus **Ask your teacher** and **My progress**) and group skill mastery by **chapter** to cut scroll fatigue on school Chromebooks. The change is a pure client-side rearrangement of existing JS plus one **additive, nullable** schema field (`skills.chapter`, default `General`). No new server route, no new third-party SDK, and no new outbound call carrying learner PII are introduced; all data continues to flow through the existing APIM gateway.

## Technical Context

**Language/Version**: Node.js 22.x (existing learner-web runtime); HTML/CSS/vanilla JavaScript for the learner-facing surface; SQL for the additive `chapter` column.

**Primary Dependencies**: existing app baseline only — `express`, `cookie-parser`, `bcryptjs`, `pg`, `@azure/identity`. No new dependency added (FR-010).

**Storage**: Azure Database for PostgreSQL Flexible Server. One additive column `skills.chapter TEXT NOT NULL DEFAULT 'General'` applied idempotently via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `demo/apps/_shared/db/schema.sql`.

**Testing**: Existing PowerShell acceptance flow `demo/scripts/acceptance_tests.ps1` plus manual learner walkthrough (tab navigation, Explanation drawer toggle, Sheets modal, chapter grouping, empty-state).

**Target Platform**: Azure App Service Linux app `app-learner-web-learneu-demo`; existing demo networking, PostgreSQL connectivity and managed-identity auth.

**Project Type**: Web application — server already in place; this feature is a frontend rearrangement + additive read-model field.

**Performance Goals**:
- Cold tab load to a completable adaptive item ≤ 5 s on a school Chromebook / 4G profile (SC-001).
- Scroll on "Test your knowledge" reduced ≥ 50 % vs the pre-redesign single page (SC-002).
- Tab switches MUST NOT re-fetch data already loaded for the session (debounce/cache; Edge Case).

**Constraints**:
- EU data residency only; no new data class; no new outbound call carrying learner PII (FR-010, Principle I).
- No model change; the redesign only improves transparency via chapter grouping (Principle III).
- Tabs MUST be keyboard reachable (`role="tab"`, `aria-selected`) and screen-reader announced (Edge Case / accessibility).
- Teacher-impersonation (admin preview) MUST render the same tabs **without writing** learner activity (Edge Case).
- All learner-visible copy available in NL, DE, PL, RO, FR-BE through the existing localisation pipeline before per-market release (FR-009).

**Scale/Scope**: Single learner surface; three core tabs (Test your knowledge / Ask your teacher / My progress) plus the existing Sheets modal reachable from the topbar on every tab. Data domain unchanged apart from the `chapter` read attribute.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | No new data class and no new outbound call; only an additive, non-personal `chapter` label on the existing `skills` catalogue. |
| II. GDPR Art. 8 | PASS | No new personal-data collection; the existing under-16 parental-consent flow is unchanged. |
| III. EU AI Act high-risk discipline | PASS | No model change; chapter grouping increases learner-facing transparency (Art. 13). Existing Art. 12 logging and Art. 14 teacher override are untouched. |
| IV. Teacher-in-the-loop | PASS | The "Ask your teacher" tab strengthens the human-oversight surface; no autonomous learner decision is added. |
| V. Pedagogical sign-off | PASS | Chapter framing and all learner copy reviewed by the Learning Sciences specialist before merge (Assumptions). |
| VI. Outcome-contract driven | PASS | SC-005 maps to the programme **−26 % outcome-gap** KPI via increased time-on-task on mastery-aligned items. |
| VII. Reproducible, spec-driven | PASS (back-filled) | This plan + `tasks.md` close the previously-missing artefacts so the feature is reproducible from `spec → plan → tasks`. |

**EU AI Act articles touched**:
- **Art. 13 (Transparency)**: chapter-grouped progress and a plain-language Explanation drawer make the learner's standing more legible; no opaque scoring is introduced.
- **Art. 12 (Logging/Traceability)**: unchanged — the redesign reuses existing logging; impersonation preview writes nothing.
- **Art. 14 (Human Oversight)**: unchanged — the "Ask your teacher" tab routes learners to a human; no automation added.

**DPIA delta**: **None / negligible.** No new personal-data class is processed. `skills.chapter` is a non-personal catalogue attribute (curriculum metadata) with a `General` default; the mastery read path simply returns the existing per-learner mastery grouped by this label. No new retention, no new lawful basis, no cross-EU transfer. The existing learner DPIA entries remain authoritative.

**Human oversight surface**: The "Ask your teacher" tab is the explicit oversight surface — learners escalate to a teacher who answers in the loop. Admin impersonation is read-only (no learner-activity writes). No new automated decision is created.

## Project Structure

### Documentation (this feature)

```text
specs/001-learner-tabbed-workspace/
├── spec.md
├── plan.md        # this document (retrospective back-fill)
└── tasks.md       # as-built task ledger
```

### Source Code (repository root) — as built

```text
demo/
├── apps/
│   ├── learner-web/
│   │   └── public/
│   │       ├── index.html        # tab bar (role="tab"/aria-selected) + [data-tab] panels
│   │       │                     #   :195-196 show/hide rule; :268-275 tab buttons
│   │       ├── home.html          # entry tiles deep-linking to ?tab=practice (etc.)
│   │       ├── nav-config.js      # central tab catalogue (label/icon/tab id)
│   │       └── shell/
│   │           ├── shell.js       # setTab() switching + keyboard/aria wiring
│   │           └── shell.css      # [data-tab].active visibility within the app shell
│   └── _shared/
│       └── db/
│           └── schema.sql         # :165 chapter column; :172 additive ALTER ... IF NOT EXISTS
├── data/
│   └── skills.csv                 # chapter back-fill for existing skills (FR-006)
└── scripts/
    └── acceptance_tests.ps1       # learner tab/regression coverage
```

**Structure Decision**: Keep the single `learner-web` Express app and the `demo/apps/_shared/` canonical core. Tabs are implemented entirely in the static frontend (`public/`), driven by a central `nav-config.js` and the shared `shell/shell.js` switcher, so the same mechanism is reused by later cross-cutting work (the three-column app shell, feature 019). The only backend touch is the additive `chapter` column in the shared schema, synced to per-app mirrors via `demo/apps/_shared/sync.ps1`. This honours FR-008 (no new server route) and FR-010 (no new SDK / PII egress).

## Phase 0: Research

Resolved technical questions (no open `[NEEDS CLARIFICATION]`):
- **Tab mechanism**: CSS `[data-tab]/.active` show-hide over a single document (vs. SPA router) keeps cold-load fast on Chromebooks and avoids re-fetch on switch (SC-001, SC-002, debounce edge case).
- **Accessibility**: native `<button role="tab" aria-selected>` + keyboard activation chosen over a custom widget to guarantee screen-reader support with zero new dependency.
- **Chapter modelling**: a nullable, defaulted catalogue attribute (not a new table) is the minimal, DPIA-neutral way to satisfy chapter grouping; `NULL`/absent maps to `General` (Edge Case).
- **Impersonation safety**: admin preview reuses the read path with writes suppressed so no learner activity is recorded (Edge Case).

## Phase 1: Design & Contracts

### Data Model (delta only)

- **Skill** — existing entity; **+ `chapter TEXT NOT NULL DEFAULT 'General'`** (catalogue metadata, non-personal).
- **MasteryRecord** — existing; read path now returns the owning skill's `chapter` so the client groups without an extra round-trip (FR-007).
- **TeacherQuestion** — existing; surfaced as the canonical "Ask your teacher" thread (no schema change).
- **Sheet** — existing; new origin value `teacher-answer-bookmark` flags sheets created from the bookmark action.

### Interface Contracts

No new HTTP route (FR-008). The redesign consumes existing mastery, Q&A, sheets and AI-tutor endpoints. The only contract change is the **additive `chapter` field** on the mastery read response; all existing fields and status codes are unchanged, so the change is backward-compatible.

### Quickstart (as built)

Manual verification covered by `demo/scripts/acceptance_tests.ps1` and a learner walkthrough: log in → land on "Test your knowledge" → complete 3 adaptive items → toggle Explanation drawer → open Sheets modal → switch to "Ask your teacher", post + bookmark → switch to "My progress", expand a chapter card → verify empty-state and `General` grouping for orphan skills.

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| No new data class / no new PII egress | PASS — only the additive `chapter` catalogue attribute. |
| No new autonomous learner decision | PASS — redesign is presentational; "Ask your teacher" keeps a human in the loop. |
| Transparency preserved/improved | PASS — chapter grouping + Explanation drawer (Art. 13). |
| Reproducible spec→plan→tasks | PASS — this back-fill closes the Principle VII gap flagged in `Subject/AMA_Rubric_Evaluation.md`. |

## Complexity Tracking

No constitution deviations to justify. The feature deliberately minimises complexity: zero new routes, zero new dependencies, one additive nullable column.

## Progress Tracking

- [x] Phase 0 research complete (decisions captured above)
- [x] Phase 1 design & contracts complete (data-model delta + additive field)
- [x] Constitution gates passed (pre-Phase 0 and post-design)
- [x] `tasks.md` generated (`/specs/001-learner-tabbed-workspace/tasks.md`)
- [x] Implementation shipped in `learner-web` ("Feature 4b")
