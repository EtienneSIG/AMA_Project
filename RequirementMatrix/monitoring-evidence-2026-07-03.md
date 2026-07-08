# Monitoring evidence - 2026-07-03

## Public endpoint observations

All five public app roots returned the shared LearnEU login portal during non-destructive HTTP checks:

- learner: login portal reachable
- parent: login portal reachable
- teacher: login portal reachable
- admin: login portal reachable
- director: login portal reachable

## Non-destructive limitations

No Save, Send, Generate, Approve, Reject, Enable, Disable, Create, Start, Assign, wake-up, health reload, deployment, or data-mutating action was performed.

## Prioritized findings

- P0: Scheduled repository shell/git access denied; final gate and publication workflow require interactive permission or automation permission change.
- P1: Post-login feature coverage remains unverified in this scheduled context.
- P2: None confirmed from public root checks.

