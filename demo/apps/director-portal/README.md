# Director Portal

Role-gated portal for school directors with aggregated school and region reporting only.

## Purpose

- Show approved, embedded reporting metadata for director scope.
- Enforce fail-closed behavior when reporting metadata is missing.
- Keep learner-identifying data out of this portal by default.

## Demo accounts

- Approved scope: director@learneu.demo
- No-scope state: director.noscope@learneu.demo
- Password: DemoPass2026!

## Key endpoints

- GET /api/health
- GET /api/auth/me
- GET /api/reporting/metadata
- GET /api/reporting/health
- GET /api/reporting/embed/:reportId
- POST /api/reporting/session

## Security and governance

- Access requires role=director and non-empty school/region scope.
- No-scope users are redirected to public/no-access.html or receive 403 JSON.
- Reporting metadata is loaded from config/reporting.json.
- Power BI embed tokens are issued only when `PBI_TENANT_ID`, `PBI_CLIENT_ID`, and `PBI_CLIENT_SECRET` are configured.
- When metadata is missing or empty, the portal stays fail-closed.
- Audit events are written for portal access attempts and report session usage.

## Packaging notes

- This app expects local shared modules in the app folder at deploy time:
	- auth.js
	- db/index.js
	- db/schema.sql
- If these files are missing from the deployment package, startup fails with MODULE_NOT_FOUND.

## Smoke checks

Run from repository root:

```powershell
pwsh ./demo/scripts/verify-director-portal.ps1 -BaseUrl https://app-director-portal-learneu-demo.azurewebsites.net
```

If the director portal app name differs in your environment, pass the deployed hostname with the BaseUrl parameter.
The checks require the director portal web app to be provisioned first.

This verifies:

1. approved director can access reporting metadata endpoint
2. no-scope director is blocked
3. no-access page is reachable

## Latest verification

- Verified on 2026-06-04 against https://app-director-portal-learneu-demo.azurewebsites.net.
- Smoke script result: passed (approved scope, blocked no-scope, no-access page).
- Live PostgreSQL verification: `director_profile=2`, `reporting_scope=3`, `hierarchy_exception=2`, `learner_hierarchy_assignment=10`.
- Fabric workspace verification: `Director Governance Overview` published in `EULearn` workspace with semantic model `LearnEU - Director Reporting`.
