# Hierarchy Governance Service (Feature 011)

Scope-aware RBAC, district approval chains, hierarchical reporting with
suppression, and peer benchmarking for the LearnEU multi-school hierarchy.

## Modules

- `scope.js` — role/scope-level map, deny-by-default grant resolution, cohort
  minimum-disclosure constant (`MIN_COHORT = 10`), learner-level access guard.
- `approvalChain.js` — pure district approval state machine. Mandatory ordered
  gates: `district_pedagogist -> district_curriculum_lead -> country_manager`
  (pedagogy first per Constitution V). Rationale required for
  `changes_requested` / `rejected`. No autonomous publish.
- `reporting.js` — school→district/region/national rollup with cohort-weighted
  averages, suppression (`< MIN_COHORT`), and a re-identification screen
  (`blocked_for_review` when a single disclosable school would be identifiable).
- `benchmarking.js` — peer comparison + approved-template recommendations
  (material gap `>= 10` pts). National comparison only within country boundary.
- `index.js` — `makeHierarchyService(db)` orchestrator. Fail-closed
  (`{ enabled:false }`) when the DB is offline; every governance action writes an
  immutable `hierarchy_audit_event` (Art. 12).

## Compliance surface

- **Art. 10** data governance: aggregation lineage IDs, scope metadata integrity.
- **Art. 12** logging: append-only `hierarchy_audit_event` + `district_approval_step`.
- **Art. 14** human oversight: every approval/adoption decision is a named human
  action; deny-by-default scope checks; no learner-level exposure above school.
- **GDPR Art. 8**: cohort minimum disclosure + re-identification screening before
  any district/region/national render or export.
