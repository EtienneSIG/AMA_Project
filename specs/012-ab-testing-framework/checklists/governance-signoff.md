# Checklist: Governance & Sign-off — A/B Testing Framework (Feature 012)

Status: **PASS** — verified live by `demo/scripts/verify-experiments.ps1` (steps 11–15, 20).

Human-oversight controls (AI Act Art. 14) implemented in
`demo/apps/_shared/experimentation/governance-service.js`,
`lifecycle-service.js`, and the decision routes in
`demo/apps/_shared/server-experiments.js`.

## Adoption gate (teacher-in-the-loop + pedagogical sign-off)
- [X] `adopt_variant` requires BOTH `teacher` and `pedagogy_reviewer` sign-offs.
- [X] Missing sign-offs -> HTTP 409 `signoff_required` with the list of missing roles.
- [X] Teacher sign-off is recorded from the Teacher Console; pedagogy sign-off from the admin console.
- [X] Once both sign-offs exist, `adopt_variant` succeeds and is audited.

## Decision integrity
- [X] Every decision requires a non-empty rationale (HTTP 400 `rationale_required`).
- [X] Decision role is constrained by schema CHECK (product_manager/teacher/pedagogy_reviewer/compliance_reviewer/admin).
- [X] Only admins may POST decisions; statistical output is advisory and cannot decide autonomously.

## Lifecycle guardrails
- [X] Legal transitions only: draft → validated → running → (paused) → completed → decided → archived.
- [X] Pre-start validation enforces ≥2 variants, exactly 1 control, weights sum to 1, duration ≥ 7 days.
- [X] `stop` moves a running experiment to completed; adoption/stop on a completed experiment moves it to decided.
- [X] Illegal transitions are rejected with an explicit reason.

## Oversight surface
- [X] Director oversight summary lists experiments + an active-alert rollup (read-only).
- [X] Sign-off and decision history are retrievable per experiment for accountability.
