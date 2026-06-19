# Checklist: GDPR & Children's Data — Multi-School Hierarchy (Feature 011)

Status: **PASS** — verified live by `demo/scripts/verify-hierarchy-011.ps1` (23/23).

## Art. 5 — Principles (minimisation, integrity, accountability)
- [X] Data minimisation: rollups carry only aggregate school metrics; no learner records above school scope.
- [X] Integrity: approval steps and audit events are append-only at the database layer.
- [X] Accountability: every access decision is logged with actor, scope, and rationale.

## Art. 8 — Children's data / minimum disclosure
- [X] Minimum disclosable cohort = 10 (`MIN_COHORT`); smaller cohorts are suppressed.
- [X] Re-identification screen prevents a single disclosable school from being identified within a wider aggregate.
- [X] Learner-level drill-through is denied for all aggregate-only roles (district/region/country).

## Art. 25 — Data protection by design & by default
- [X] Deny-by-default RBAC: no scope is readable without an explicit active grant.
- [X] Role transitions are transactional (revoke old + grant new) with an audit trail.
- [X] EU residency unchanged: all persistence uses the existing West Europe Postgres Flexible Server.

## Art. 30 — Records of processing
- [X] `hierarchy_audit_event` provides the immutable processing record for governance actions.

## Art. 32 — Security of processing
- [X] CSRF double-submit protection on every mutating endpoint.
- [X] Parameterised SQL throughout the hierarchy helpers (no string concatenation).
- [X] Cross-country peer joins are blocked unless the same-country boundary policy holds.

## Cross-border transfer
- [X] No new cross-EU transfer introduced; benchmarking national comparison is constrained to the same country.
