# Parent Portal

Role-gated portal for families focused on learner visibility, GDPR Art. 8 consent, and lightweight action flows.

## Purpose

- Give parents a clear view of each linked child (progress, activity, streaks, teacher Q&A).
- Manage parental consent for under-16 learners (grant and withdraw).
- Keep communication and oversight lightweight, not LMS-heavy.

## Access model

- Allowed roles: `parent` and `admin`.
- Parent-only endpoints enforce parent-child linkage server-side.
- Child privacy is preserved through scoped access checks.

## Key endpoints

- `GET /api/health`
- `GET /api/auth/me`
- `POST /api/chat`
- `GET /api/parent/children`
- `GET /api/parent/child/:child/mastery`
- `GET /api/parent/child/:child/streak`
- `GET /api/parent/child/:child/activity`
- `GET /api/parent/child/:child/teacher-questions`
- `GET /api/parent/consents`
- `POST /api/parent/consents`

## GDPR Art. 8 consent

- Consent records are stored in `parental_consents`.
- Active consent is evaluated as granted and not withdrawn.
- Parent flow supports both grant and withdraw operations.
- Learner under-16 access control is enforced on the learner app side and relies on these consent records.

## Security and governance

- Cookie-session auth via shared auth module.
- Role gate + linkage checks on all child-scoped APIs.
- CSRF protection for state-changing requests.
- Content Safety checks applied to assistant interactions.
- EU deployment assumptions and region metadata surfaced through `/api/health`.

## Runtime dependencies

- Shared app modules are required in this app package:
	- `auth.js`
	- `db/index.js`
	- `db/schema.sql`
	- `contentSafety.js`
- If these are missing from deployment artifacts, startup fails.

## Smoke checks

Run from repository root:

```powershell
pwsh ./demo/scripts/smoke_cohort.ps1
```

This script validates parent logins and linked-child retrieval for multiple demo users.

For full acceptance checks (including app reachability):

```powershell
pwsh ./demo/scripts/acceptance_tests.ps1
```
