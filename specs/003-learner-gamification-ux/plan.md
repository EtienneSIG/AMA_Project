# Implementation Plan: Learner Gamification UX

**Branch**: `003-learner-gamification-ux` | **Date**: 2026-06-03 | **Spec**: `/specs/003-learner-gamification-ux/spec.md`

**Input**: Feature specification from `/specs/003-learner-gamification-ux/spec.md`

## Summary

Deliver a learner-first Quest Dashboard in the learner app with daily challenge, class/guild objectives, collaborative quests, motivation channel, season tiers, daily chest rewards, boss battle streak logic, and badge gallery. Implement this on the existing Node.js + Express multi-app pattern by extending shared DB schema/helpers in `demo/apps/_shared`, learner UX/routes in `demo/apps/learner-web`, and teacher moderation/override hooks in `demo/apps/teacher-console` with explicit auditability and no public learner leaderboard.

## Technical Context

**Language/Version**: Node.js 22.x, HTML/CSS/vanilla JS in static app pages, PostgreSQL SQL migrations via startup schema init

**Primary Dependencies**: `express`, `cookie-parser`, `bcryptjs`, `pg`, `@azure/identity` (existing app baseline)

**Storage**: Azure Database for PostgreSQL Flexible Server (existing `db/schema.sql` + helper methods in `db/index.js`), no new external store

**Testing**: Existing PowerShell acceptance flow in `demo/scripts/acceptance_tests.ps1` plus role-based manual walkthrough in `specs/003-learner-gamification-ux/quickstart.md`

**Target Platform**: Azure App Service Linux apps `learner-web` and `teacher-console`; local dev with `node server.js`

**Project Type**: Web application (server routes + static frontend) with shared code sync model (`demo/apps/_shared/sync.ps1`)

**Performance Goals**:
- Quest dashboard payload (learner) <= 400 ms p95 server time for a single learner snapshot
- Motivation message publish acknowledgement <= 500 ms p95
- Teacher override action reflected to learner surfaces <= 5 minutes (matches SC-005)

**Constraints**:
- EU data residency only; no third-party telemetry SDKs
- GDPR Art. 8 gating remains enforced for under-16 learners
- No public individual rank ordering (FR-011)
- Teacher moderation and override actions must be auditable (FR-013, FR-015)
- Preserve existing LearnEU color system and accessibility contrast (FR-012)

**Scale/Scope**:
- Initial scope: one class/guild cohort model backed by current synthetic data volume
- Feature surfaces: learner dashboard + teacher moderation/config controls
- Data domain: gamification state, rewards, collaboration progress, moderation/audit logs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Store only required learner pseudonymous progress, class/guild state, and moderation metadata in existing EU-hosted Postgres. No cross-EU transfer introduced. |
| II. GDPR Art. 8 | PASS | Existing consent gate in learner app remains mandatory for under-16 usage; no bypass route added for gamification endpoints. |
| III. EU AI Act high-risk discipline | PASS | Feature is motivational/product UX rather than a new model capability; still enforces Art. 12 logging and Art. 14 human oversight on teacher controls. |
| IV. Teacher-in-the-loop | PASS | Teacher-console moderation/override APIs are first-class and required for class-level controls. |
| V. Pedagogical sign-off | PASS | Plan includes pedagogy review checkpoint before implementation tasks and release gates. |
| VI. Outcome-contract driven | PASS | SC-002/SC-003 support engagement for outcome-gap improvement; SC-005 supports teacher time efficiency via rapid visible moderation outcomes. |
| VII. Reproducible, spec-driven delivery | PASS | Artifacts created under `specs/003-learner-gamification-ux/` with concrete implementation paths and test walkthrough. |

**EU AI Act articles touched**: Art. 12 (logging for moderation/override and reward state transitions), Art. 13 (clear learner-facing progression/reward transparency), Art. 14 (teacher oversight controls).

**DPIA delta**: Moderate learner-engagement data extension. New processing purpose limited to formative motivation and class collaboration. Data classes remain pseudonymous learner progress + moderated classroom communications. No new biometric/sensitive category processing.

**Human oversight surface**: `demo/apps/teacher-console` provides pause, adjust, and moderation controls for collaborative quests/objectives and motivation channel; all actions persist rationale + timestamp for audit review.

## Project Structure

### Documentation (this feature)

```text
specs/003-learner-gamification-ux/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── learner-gamification.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── learner-web/
│   │   ├── server.js                # Learner gamification API routes and endpoint wiring
│   │   ├── db/
│   │   │   ├── index.js             # Learner gamification query/command helpers
│   │   │   └── schema.sql           # Learner-facing gamification tables/indexes/views
│   │   └── public/
│   │       └── index.html           # Quest Dashboard default surface + badge gallery UI
│   ├── teacher-console/
│   │   ├── server.js                # Teacher moderation/override endpoints
│   │   ├── db/
│   │   │   ├── index.js             # Oversight and moderation helper functions
│   │   │   └── schema.sql           # Audit tables and moderation state transitions
│   │   └── public/
│   │       └── index.html           # Oversight panel for quests/objectives/motivation
│   └── _shared/
│       ├── server.js                # Canonical shared route patterns to sync to apps
│       ├── db/
│       │   ├── index.js             # Shared helper baselines used by app-specific copies
│       │   └── schema.sql           # Shared schema source for synchronized DB structures
│       └── sync.ps1                 # Existing synchronization command for shared code
└── scripts/
    └── acceptance_tests.ps1         # Add end-to-end assertions for learner + teacher flows
```

**Structure Decision**: Extend the existing multi-app Express architecture and shared synchronization workflow rather than introducing a new service. This keeps deployment topology unchanged, reduces compliance scope, and ensures teacher oversight hooks are implemented where they are operationally used (`teacher-console`) while learner-facing UX remains in `learner-web`.

## Phase 0: Research

Research outcomes are captured in `specs/003-learner-gamification-ux/research.md` and resolve design choices for:

- Daily window and season progression time-bounding in EU context
- Fairness-safe collaboration progress model without harmful rank ordering
- Boss battle streak consistency and idempotent reward claims
- Teacher moderation patterns and auditable oversight events
- Shared-code placement across `learner-web`, `_shared`, and `teacher-console`

## Phase 1: Design & Contracts

### Data Model

Defined in `specs/003-learner-gamification-ux/data-model.md`:

- `QuestDashboardSnapshot`
- `DailyChallengeRun`
- `ClassObjective`
- `CollaborativeQuest`
- `MotivationChannelMessage`
- `SeasonTierProgress`
- `DailyChestClaim`
- `BossBattleAttempt`
- `BadgeAward`
- `TeacherOversightAction`

### Interface Contracts

Defined in:

- `specs/003-learner-gamification-ux/contracts/learner-gamification.openapi.yaml`

Contract includes learner dashboard/reward/motivation endpoints and teacher oversight/moderation endpoints.

### Quickstart

Defined in:

- `specs/003-learner-gamification-ux/quickstart.md`

Includes learner completion flow, collaborative update checks, teacher moderation scenario, fairness checks, and audit verification steps.

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| Under-16 consent gate still enforced on gamification APIs | PASS |
| No public individual leaderboard/rank ordering in learner views | PASS |
| Teacher moderation and override route exists with auditable events | PASS |
| Data classes remain EU-hosted and minimised to motivation/progress needs | PASS |
| Pedagogical review remains a required gate before implementation sign-off | PASS |

No constitution violations require waiver.

## Complexity Tracking

No constitution violations or complexity exceptions identified.
