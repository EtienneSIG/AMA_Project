# Checklist: EU AI Act — Multi-School Hierarchy (Feature 011)

Status: **PASS** — verified live by `demo/scripts/verify-hierarchy-011.ps1` (23/23).

This feature is high-risk (Annex III, education). Every control below is implemented
additively in `demo/apps/_shared/server-hierarchy.js` + `demo/apps/_shared/services/hierarchy/*`
and wired into the bespoke admin/director-portal servers and the shared server.

## Art. 9 — Risk management
- [X] Deny-by-default scope resolution; no governance action without an active grant or superuser.
- [X] Re-identification screen blocks single-disclosable aggregates (`blocked_for_review`).
- [X] Sub-threshold cohorts (`< 10`) are fully suppressed before any disclosure.

## Art. 10 — Data governance & minimisation
- [X] Aggregate-only roles never receive learner-level fields (enforced in `scope.mayAccessLearnerLevel`).
- [X] Reporting rollups expose only school-level aggregates; learner identities never flow through `reporting.rollup`.
- [X] Export guard refuses suppressed / blocked reports (HTTP 409 `export_blocked`).

## Art. 12 — Record-keeping (logging)
- [X] Append-only `hierarchy_audit_event` table (DB trigger `prevent_hierarchy_audit_mutation`).
- [X] Append-only `district_approval_step` table (DB trigger `prevent_district_step_mutation`).
- [X] Every scope check, decision, report, suppression, benchmark, and adoption emits an audit event with lineage.

## Art. 13 — Transparency
- [X] Suppression / re-id outcomes are surfaced to the operator with an explicit status (not silent nulls).
- [X] Recommendation text on peer benchmarks states the gap and the suggested human action.

## Art. 14 — Human oversight
- [X] Mandatory 3-gate approval chain: district_pedagogist → district_curriculum_lead → country_manager.
- [X] No autonomous publish: each gate is a named human decision; rationale required for changes/reject.
- [X] Role-not-authorised decisions are refused (HTTP 403) for actors lacking the gate role.
- [X] Optimistic locking (`lock_version`) prevents conflicting concurrent gate decisions.

## Art. 15 — Accuracy, robustness, fail-closed
- [X] Service fails closed (`{ enabled:false }`) when the EU-resident database is offline.
- [X] Adoption decisions are refused until content reaches `available_to_schools`.
- [X] `adapt` decisions require a linked variant reference.
