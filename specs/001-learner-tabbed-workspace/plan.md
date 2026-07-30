# Implementation Plan: Learner Tabbed Workspace & Per-Chapter Progress

**Branch**: `001-learner-tabbed-workspace` | **Date**: 2026-07-13 | **Spec**: `/specs/001-learner-tabbed-workspace/spec.md`

**Input**: Feature specification from `/specs/001-learner-tabbed-workspace/spec.md`

## Summary

Backfill the implementation trace for the shipped learner workspace redesign. The feature splits the learner experience into three tabs (`Test your knowledge`, `Ask your teacher`, `My progress`), keeps the adaptive practice loop focused, preserves the teacher-in-the-loop Q&A surface, and groups mastery by chapter. Delivery is intentionally additive: the existing Express app, auth, Q&A, sheets, adaptive picker, and mastery services remain unchanged except for the `skills.chapter` metadata used by the progress grouping.

## Technical Context

**Language/Version**: Node.js 22.x, HTML/CSS/vanilla JavaScript in `demo/apps/learner-web`

**Primary Dependencies**: Existing Express app, `auth.js`, `db/index.js`, `adaptive.js`, `contentSafety.js`; no new third-party SDK introduced by this feature

**Storage**: Existing PostgreSQL schema. Additive `skills.chapter TEXT NOT NULL DEFAULT 'General'` migration and seed data only.

**Testing**: App syntax checks through `npm run build`, learner UI smoke path, and manual acceptance against the three user stories.

**Target Platform**: Azure App Service Linux Node 22.x, same learner-web deployment unit.

**Project Type**: Existing web application UI rearrangement with an additive data-field migration.

**Performance Goals**:
- Learner reaches the next adaptive item in <= 5 seconds from a cold tab load on a school-grade Chromebook profile.
- Practice-tab scrolling is reduced by >= 50% versus the legacy single-page flow.
- Tab switching reuses already-loaded state and does not force unnecessary refetches.

**Constraints**:
- No new personal-data class.
- No new network call sending learner PII outside the existing APIM-controlled architecture.
- No autonomous decision changing grades, placement, or content access.
- Teacher Q&A remains the oversight path.

## Constitution Check

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Pure UI rearrangement plus skill metadata; no new data export or PII collection. |
| II. GDPR Art. 8 | PASS | Existing under-16 consent gate remains unchanged. |
| III. EU AI Act high-risk discipline | PASS | No model change; transparency improves through chapter-level mastery grouping. |
| IV. Teacher-in-the-loop | PASS | Dedicated `Ask your teacher` tab strengthens human oversight. |
| V. Pedagogical sign-off | PASS | Chapter framing maps skills to learner-understandable learning units. |
| VI. Outcome-contract driven | PASS | Supports outcome-gap reduction by increasing focused practice time. |
| VII. Reproducible, spec-driven delivery | PASS | This plan and tasks file close the legacy traceability gap for the already-shipped feature. |

**EU AI Act articles touched**: Art. 13 transparency (progress explainability), Art. 14 human oversight (teacher Q&A path).

**DPIA delta**: No new processing purpose, recipient, data class, retention rule, or transfer path.

## Project Structure

```text
specs/001-learner-tabbed-workspace/
├── spec.md
├── plan.md
└── tasks.md

demo/apps/learner-web/
├── public/index.html      # tabbed workspace, drawer, Q&A, chapter cards
├── public/adaptive.js     # existing adaptive picker surface
├── db/schema.sql          # additive skills.chapter migration
└── db/index.js            # listMasteryForLearner returns chapter
```

## Implementation Phases

### Phase 1: Data metadata

Add and seed the `chapter` field on the skill catalogue so progress can be grouped without a second client request.

### Phase 2: Read helpers

Ensure the existing mastery service returns `chapter`, `label`, `level`, `attempts`, and skill identifiers in a stable order.

### Phase 3: Learner workspace UI

Render three accessible top-level tabs, keep the practice tab as the default, preserve the sheets modal, and add a collapsible explanation drawer.

### Phase 4: Teacher-in-the-loop surface

Move the Q&A composer and answer history to the dedicated `Ask your teacher` tab without changing the underlying `teacher_questions` table or endpoints.

### Phase 5: Progress transparency

Group mastery rows into collapsible chapter cards, show an empty state for new learners, and keep orphan skills under `General`.

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| No new data class introduced | PASS |
| No cross-EU transfer introduced | PASS |
| No model or automated decision change | PASS |
| Teacher oversight preserved | PASS |
| Learner transparency improved | PASS |

No constitution waiver is required.
