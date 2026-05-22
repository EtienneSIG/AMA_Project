# Implementation Plan: Learner Tabbed Workspace & Per-Chapter Progress

**Branch**: `001-learner-tabbed-workspace` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-learner-tabbed-workspace/spec.md`

**Status**: Back-fill — closes the constitutional Principle VII breach surfaced by
`Subject/AMA_Rubric_Evaluation.md` (the spec shipped without plan/tasks).
Authored under the EdTech Program Orchestrator with the EU AI Act CO and
GDPR Children's Data Specialist as co-signers.

## Summary

Split the single-page learner experience (`demo/apps/learner-web/`) into three
top-level tabs ("Test your knowledge", "Ask your teacher", "My progress") and
group skill mastery by `chapter`. The change is **UI rearrangement + one
additive schema field** (`skills.chapter`). No new model, no new outbound call,
no new SDK. The redesign is the carrier for two compliance objectives:
strengthening the teacher-in-the-loop surface (US2) and improving transparency
of mastery state to learners and guardians (US3 / AI Act Art. 13).

## Technical Context

**Language/Version**: Node.js 20 (Express) + vanilla JS / HTML / CSS on the
learner-web SPA (no framework upgrade in scope).

**Primary Dependencies**: Existing `demo/apps/learner-web/` Express stack, the
shared `_shared/` middleware (auth, CSRF, rate-limit, Content Safety), the
mastery service exposed at `/api/mastery/me`, the Sheets modal, the AI tutor
proxy to Azure OpenAI via APIM.

**Storage**: Azure SQL Database (EU North). Additive column
`skills.chapter NVARCHAR(120) NULL` with a back-fill UPDATE from
`demo/data/skills.csv`. No new table, no new index strategy.

**Testing**: Existing Playwright smoke (`demo/tests/smoke/learner.spec.ts`)
extended with three deterministic scripts — one per user story. Schema change
covered by `demo/scripts/db-verify.ps1` and the `db-sync` step of the eight-step
cycle.

**Target Platform**: School-grade Chromebook (768×1366, 4G profile, Chrome
stable), plus parity check on Edge stable for the teacher impersonation flow.

**Project Type**: Web application — additive front-end re-layout + minor
back-end schema/seed change inside the existing `demo/apps/learner-web/`
deployment slot.

**Performance Goals**: Cold-tab load to first interactive item ≤ 5 s on the
school Chromebook profile (SC-001). Tab switch reusing cached data MUST NOT
trigger a network round-trip (edge-case 4).

**Constraints**: EU-only data path (Principle I), no PII leaving APIM
(FR-010), no new third-party SDK (FR-010), localised copy in NL, DE, PL,
RO, FR-BE before market release (FR-009), all changes additive to honour
the eight-step deploy cycle.

**Scale/Scope**: ~3 000 active learners across the pilot cohorts; ~50 skills
× ~12 chapters in the seed catalogue; no change to traffic profile.

## Constitution Check

| Principle | Gate | How this plan complies |
|-----------|------|------------------------|
| I. EU-resident, data-minimised | PASS | No new data class, no new outbound call. Schema change is additive non-PII (curriculum metadata). |
| II. GDPR Art. 8 children | PASS | No new collection of personal data; consent flow unchanged. Parental review path is unaffected. |
| III. EU AI Act high-risk | PASS | No model change. Transparency improved: mastery is grouped by chapter (Art. 13). Annex IV fragment unchanged; logging unchanged. |
| IV. Teacher-in-the-loop | PASS | US2 strengthens the teacher question-and-answer surface; teacher console remains the human-oversight gate. |
| V. Pedagogical sign-off | PASS | Chapter framing reviewed by the Learning Sciences Expert before merge; bookmark-to-sheet flow reviewed for cognitive-load. |
| VI. Outcome-contract driven | PASS | SC-005 maps directly to the −26 % outcome-gap programme KPI; success metrics defined in spec. |
| VII. Reproducible, spec-driven | PASS (after this plan/tasks merge) | This back-fill closes the breach. Branch `001-learner-tabbed-workspace`, eight-step deploy cycle, conventional commits. |

**EU AI Act articles touched** (re-confirmed for this plan):

| Article | Surface affected | Evidence |
|---------|------------------|----------|
| Art. 9 — risk management | No model change → no new residual risk; risk register entry unchanged. | `demo/compliance/risk-register.md` row 7 (AI-tutor) untouched. |
| Art. 10 — data governance | No change to training data. Curriculum-only column added. | `skills.chapter` migration script. |
| Art. 12 — record-keeping | Existing prompt-hash + safety-verdict logging unchanged. No new inference path. | `ask_history` insert pipeline unchanged. |
| Art. 13 — transparency | **Improved**: mastery now grouped under named chapters; tabs labelled in learner-friendly language; copy reviewed per FR-009. | New strings in `demo/apps/learner-web/locales/*.json`. |
| Art. 14 — human oversight | **Strengthened**: "Ask your teacher" tab is a first-class oversight surface; bookmark flow keeps teacher answers in the learner record. | US2 acceptance scenarios; teacher console route unchanged. |
| Art. 15 — robustness | Empty-state and null-chapter fallbacks (edge cases) covered; tab switch debounces network. | Edge-cases list in spec.md §"Edge Cases". |

**DPIA delta**: **None.** No new personal-data category, no new processing
purpose, no new recipient. The existing DPIA
(`demo/compliance/dpia-learnEU-v1.md`) is unchanged. A one-line note is
appended confirming the review.

**Human-oversight surface**: The teacher console (out of scope here) remains
the human-in-the-loop gate. This feature *strengthens* it by routing more
clarifications through the "Ask your teacher" tab — measured via SC-003 (≥ 80 %
of learners find a past teacher answer within 30 s) and the teacher
administrative-time KPI in `plan/03-program-kpis.md`.

## Project Structure

### Documentation (this feature)

```text
specs/001-learner-tabbed-workspace/
├── spec.md                        # Existing (188 lines, on main)
├── plan.md                        # THIS FILE
├── checklists/
│   └── compliance.md              # GDPR + AI Act + RAI checklist (this back-fill)
└── tasks.md                       # Accountable agent per task (this back-fill)
```

### Source Code (repository root)

```text
demo/
├── apps/
│   └── learner-web/
│       ├── public/
│       │   ├── index.html                       # 3-tab hero (US1/US2/US3)
│       │   ├── css/tabs.css                     # New: tab strip + drawer styles
│       │   └── js/
│       │       ├── tabs.js                      # New: tab controller (keyboard a11y)
│       │       ├── tab-test.js                  # New: picker + tutor + drawer wiring
│       │       ├── tab-ask.js                   # New: composer + thread + bookmark
│       │       └── tab-progress.js              # New: streak/badges + chapter cards
│       ├── routes/
│       │   └── mastery.js                       # Modify: include `chapter` in response
│       └── locales/
│           ├── nl-NL.json  de-DE.json  pl-PL.json  ro-RO.json  fr-BE.json
│
├── data/
│   └── skills.csv                              # Modify: back-fill `chapter` column
│
├── scripts/
│   ├── db-sync.ps1                             # Modify: ADD COLUMN skills.chapter
│   └── db-verify.ps1                           # Modify: assert chapter not 100 % NULL
│
└── tests/smoke/
    └── learner.spec.ts                         # Modify: tab-switch + chapter-grouping
```

**Structure Decision**: Web application, additive change inside the existing
`demo/apps/learner-web/` slot. No new package, no new repository module. The
schema change rides the existing `db-sync.ps1` step of the eight-step deploy
cycle (`demo/feature/EXECUTION-PLAN.md` step 1 — schema). The seed back-fill
rides `demo/data/skills.csv`.

## Complexity Tracking

> No constitutional violations to justify. This feature is intentionally
> minimal: zero new tables, zero new routes, zero new SDKs. The only
> additive surface is one nullable column and three front-end controllers.
