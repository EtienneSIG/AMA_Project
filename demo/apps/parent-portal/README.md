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
- `GET /api/parent/child/:child/weekly-summary` — US1 dashboard summary
- `GET/POST /api/parent/messages`, `GET /api/parent/messages/thread/:id`, `POST /api/parent/messages/:id/read` — US2 messaging
- `GET/PUT /api/parent/preferences` — US4 digest opt-out + US5 language
- `GET /api/parent/digests`, `POST /api/parent/digests/generate` — US4 weekly digest
- `GET /api/parent/resources` — US5 localized family resources
- `GET /api/consent/requests/:token`, `POST /api/consent/requests/:token/decide` — US3 public consent flow
- `POST /api/consent/requests`, `GET /api/parent/consent-requests`, `POST /api/consent/reminders/run` — US3 consent lifecycle
- `GET /api/parent/metrics` — SC-001..SC-007 outcome measurement surface

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

## Configuration

Copy `.env.example` to `.env` for local runs. In Azure these are App Settings /
Key Vault references. Key groups: Postgres (`PG_*`), session/CSRF/rate limit
(`SESSION_SECRET`, `RATE_LIMIT_*`), Content Safety (`CONTENT_SAFETY_*`),
consent link TTL (`CONSENT_LINK_TTL_DAYS`, default 7), and weekly digest
scheduling (`DIGEST_*`, Sunday 18:00 UTC). EU regions only for personal data.

## Scripts

```powershell
npm run check     # node --check on server/db/auth/contentSafety
npm run seed      # apply schema + seed demo cohort (idempotent)
npm run digests   # run the weekly digest dispatcher once
npm start         # start the portal on $PORT (default 8080)
```

## Localization (US5)

- UI strings live in `public/models/translations.json` (en/nl/de/fr/es/pl/ro).
- Family resources are localized in `data/family-resources.manifest.json`.
- Language preference persists per parent and drives templates/notifications.

## Smoke checks

Run from repository root:

```powershell
pwsh ./demo/scripts/smoke_cohort.ps1
pwsh ./demo/scripts/acceptance_tests.ps1   # includes parent-portal US1-US5 cases
```

This script validates parent logins and linked-child retrieval for multiple demo users.

For full acceptance checks (including app reachability):

```powershell
pwsh ./demo/scripts/acceptance_tests.ps1
```

## Well-being notice (spec 017)

In the child tab, parents may see a **consent-gated**, supportive well-being notice when
their child has self-reported feeling low on several recent days. It is framed as a
supportive heads-up with "how to help" guidance — never a diagnosis, never raw mood logs.
No notice is surfaced without active parental consent (server-enforced).

- UI: well-being notice card in `public/index.html` (child tab).
- API (in `_shared/server.js`): `/api/mood/parent` (consent-gated).
- Verify: `pwsh demo/scripts/verify-mood-checkin.ps1`.
