# Monitoring evidence - 2026-07-16

## Authenticated observations

Authenticated non-destructive checks were executed for the five deployed LearnEU apps:

- learner
- parent
- teacher
- admin
- director

For every app, the login request returned HTTP 200, the authenticated home request returned HTTP 200, and no persistent Loading state was observed. The learner account landed on the parental-consent gate, which is expected GDPR Art. 8 behavior for the demo student context.

## API observations

The following read-only API checks returned `application/json` HTTP 200 for every audited app:

- `/api/auth/me`
- `/api/health`

The generic candidate endpoints `/api/dashboard`, `/api/progress`, `/api/shell/config`, `/api/hierarchy/summary`, and `/api/reporting/overview` are not specified as required generic paths. Learner returned JSON 403 under the consent gate; the other apps returned HTML 404. These remain non-blocking.

## Non-destructive limitations

No Save, Send, Generate, Approve, Reject, Enable, Disable, Create, Start, Assign, wake-up, deployment, or other data-mutating action was performed. Login POSTs were used only for the scheduled read-only authenticated audit.

## Prioritized findings

- P0: None confirmed.
- P1: None confirmed.
- P2: Non-blocking exploratory generic endpoint observations as noted above.
