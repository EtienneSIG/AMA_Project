# Monitoring evidence - 2026-07-24

## Authenticated observations

Authenticated non-destructive checks were executed for the five deployed LearnEU apps:

- learner
- parent
- teacher
- admin
- director

For every app, the final login check returned HTTP 200, the authenticated home request returned HTTP 200, and no persistent Loading state was observed. The learner account landed on the parental-consent gate, which is expected GDPR Art. 8 behavior for the demo student context.

Parent and admin returned transient HTTP 503 login responses during the first audit pass. An explicit retry for both apps succeeded with HTTP 200, so no persistent outage was confirmed.

## API observations

The following read-only API checks returned `application/json` HTTP 200 for every audited app:

- `/api/auth/me`
- `/api/health`

The generic candidate endpoints `/api/dashboard`, `/api/progress`, `/api/shell/config`, `/api/hierarchy/summary`, and `/api/reporting/overview` are not specified as required generic paths. These remain non-blocking.

## Non-destructive limitations

No Save, Send, Generate, Approve, Reject, Enable, Disable, Create, Start, Assign, wake-up, deployment, or other data-mutating action was performed. Login POSTs were used only for the scheduled read-only authenticated audit.

## Prioritized findings

- P0: None confirmed.
- P1: None confirmed.
- P2: Transient parent/admin login 503s resolved on retry; non-blocking exploratory generic endpoint observations as noted above.
