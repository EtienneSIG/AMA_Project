# Sign-off: Multi-School Hierarchy (Feature 011)

Status: **PASS** — pedagogical sign-off precedes technical sign-off (Constitution V).

## Pedagogical sign-off (Learning Sciences)
- [X] District alert baseline (mastery < 50%) is a pedagogically defensible attention trigger, not an automated grade.
- [X] Peer-benchmark recommendations suggest human collaboration (lesson study, small-group remediation), never automated intervention.
- [X] No learner is profiled, ranked, or graded by the hierarchy layer; only school-level aggregates are produced.
- [X] Adopt / adapt / decline keeps the teaching decision with the school (teacher-in-the-loop preserved).

## Responsible AI evaluation
- [X] No facial / emotion recognition, no behavioural advertising, no autonomous grading introduced.
- [X] Suppression and re-identification outcomes are explicit and explainable to operators.
- [X] Fail-closed behaviour confirmed when the database is unavailable.

## Cross-Agent QA verification
- [X] Live end-to-end run green: `demo/scripts/verify-hierarchy-011.ps1` → 23/23.
- [X] Negative paths verified: deny-by-default, learner-level denial, unauthorised gate (403), export guard (409),
      adoption-before-publish refusal, adapt-without-variant refusal, rationale-required.
- [X] Immutable audit trail confirmed to capture submit/decide/publish, reports, suppression, scope checks.

## Technical sign-off (Demo Deployment)
- [X] Additive only: shared router + service modules; bespoke admin/director servers wired via guarded require.
- [X] `sync.ps1` extended to propagate `server-hierarchy.js` + `services/hierarchy/*`; all apps re-synced.
- [X] admin + director-portal built and deployed to Azure (`rg-learneu-demo`); schema applied idempotently at boot.
- [X] No regression to existing assessment / gamification / Feature 004 hierarchy / parent / adaptive / interop / CMS features.

## Accountable roles
- Learning Sciences Expert — pedagogical fit
- Responsible AI Evaluator — RAI controls
- GDPR Children's Data Specialist — Art. 8 suppression
- EU AI Act Compliance Officer — Annex IV / Art. 14 oversight
- Cross-Agent QA Verifier — live verification
- Demo Deployment Agent — deploy & regression
