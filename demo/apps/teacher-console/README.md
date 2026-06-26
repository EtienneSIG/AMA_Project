# Teacher Console

Role-gated educator portal for class insight, learner support, and human-oversight workflows.

## Purpose

- Help teachers plan and explain lessons with guarded AI assistance.
- Surface class-level mastery and heatmap views.
- Support teacher-in-the-loop intervention through override and learner inbox workflows.

## Access model

- Allowed roles: `teacher` and `admin`.
- Teacher-only APIs are enforced server-side.
- Oversight and audit actions are logged in PostgreSQL when enabled.

## Key endpoints

- `GET /api/health`
- `GET /api/auth/me`
- `POST /api/chat`
- `POST /api/sheets/:id/quiz`
- `GET /api/teacher/class/mastery`
- `GET /api/teacher/class/heatmap`
- `POST /api/teacher/overrides`
- `GET /api/teacher/overrides`
- `GET /api/teacher-questions/inbox`
- `POST /api/teacher-questions/:id/answer`

## Human oversight scope

- Teacher dashboard exposes class mastery and heatmap aggregates.
- Override flow allows educators to record human-level adjustments with rationale.
- Learner inbox supports explicit human responses to learner questions.
- UI messaging emphasizes EU AI Act Art. 14 oversight responsibilities.

## Security and governance

- Cookie-session auth via shared auth module.
- Role-gated endpoints (`teacher`/`admin`).
- CSRF protection for write operations.
- Content Safety checks on inbound/outbound free text.
- Health endpoint reports APIM, model deployment, DB, and regional metadata.

## Runtime dependencies

- Shared app modules are required in this app package:
	- `auth.js`
	- `db/index.js`
	- `db/schema.sql`
	- `contentSafety.js`
- Missing shared modules in deployment artifacts cause startup failure.

## Smoke checks

Run from repository root:

```powershell
pwsh ./demo/scripts/smoke_cohort.ps1
```

This script validates teacher login, class heatmap, and learner inbox retrieval.

For full acceptance checks (grading path and app reachability):

```powershell
pwsh ./demo/scripts/acceptance_tests.ps1
```

## Class sharing log & controls (spec 013)

Teachers view per-class peer shares, approve/reject flagged notes, and disable/enable
sharing for a learner or a whole class. UI: `public/sharing-log.html`. API (in
`_shared/server.js`): `/api/share/teacher/log`, `/api/share/teacher/disable`,
`/api/share/teacher/moderate/:id`.
