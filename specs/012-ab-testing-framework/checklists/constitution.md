# Checklist: Project Constitution — A/B Testing Framework (Feature 012)

Status: **PASS** — verified live by `demo/scripts/verify-experiments.ps1` (20/20).

Implemented additively in `demo/apps/_shared/experimentation/*`,
`demo/apps/_shared/server-experiments.js`, `demo/apps/_shared/config/experimentation.js`,
and the Feature 012 block of `demo/apps/_shared/db/{schema.sql,index.js}`. Wired into the
shared server and the bespoke admin/director-portal servers; the teacher sign-off route is
served via the synced shared server in Teacher Console.

## I — EU residency
- [X] Persistence uses only the existing West Europe Postgres (`pg-learneu-demo`); no new data store.
- [X] No personal data leaves the EU region; learner references are pseudonyms only.

## II — GDPR Art. 8 (children's data)
- [X] No raw learner identity in experiment tables; only `learner_pseudonym` is stored.
- [X] DSR / consent-revocation excludes a learner from analysis (`is_excluded_from_analysis` + reason).
- [X] Effective sample recomputes after exclusion; excluded learners never contribute to results.

## III — EU AI Act high-risk obligations
- [X] Annex IV fragment present (`specs/012-ab-testing-framework/plan.md` + this checklist set).
- [X] Immutable logging: append-only `experiment_audit_event` (trigger `prevent_experiment_audit_mutation`).
- [X] Transparency: advisory recommendation + rationale surfaced; no silent automated change.
- [X] Human oversight + teacher override: adoption is sign-off gated (see governance checklist).

## IV — Teacher-in-the-loop
- [X] `adopt_variant` is blocked (HTTP 409 `signoff_required`) without a `teacher` sign-off.
- [X] Teacher sign-off is recorded from the Teacher Console (`POST /api/experiments/:id/signoff`).
- [X] Statistical output is advisory only; it can never adopt a variant on its own.

## V — Pedagogical sign-off precedes technical sign-off
- [X] `pedagogy_reviewer` sign-off is mandatory in addition to the teacher sign-off before adoption.
- [X] `validateDecision` enforces `canAdopt` (both required sign-offs) for `adopt_variant`.

## VI — Outcome-contract
- [X] Every experiment declares a typed `success_metric` (engagement/mastery/completion/time_on_task/custom).
- [X] Decisions require an explicit rationale (HTTP 400 `rationale_required` otherwise).
- [X] Archive captures hypothesis, design, results, decisions, and lessons for institutional memory.

## VII — Spec-driven delivery
- [X] spec.md / plan.md / tasks.md (88 tasks) all present and aligned for `012-ab-testing-framework`.
- [X] Implementation matches plan; live verifier asserts each behavioural contract.
