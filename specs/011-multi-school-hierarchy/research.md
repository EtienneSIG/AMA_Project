# Research: Multi-School Hierarchy, Approval Chains, and Hierarchical Reporting

## Decision 1: Effective-Dated Hierarchy Graph in PostgreSQL

- Decision: Model hierarchy as effective-dated nodes and edges (`country -> district -> school -> class`) with merge/split lineage support.
- Rationale: Supports historical accuracy for reports, school mergers, and role transitions without rewriting prior periods.
- Alternatives considered:
  - Static parent_id model only: rejected because it cannot preserve time-valid hierarchy changes safely.
  - Full graph database migration: rejected due to unnecessary operational complexity for current scope.

## Decision 2: Explicit Role-to-Scope Grants with Deny-by-Default

- Decision: Introduce `role_scope_grants` records tying each user role to hierarchy level and node scope, with validity windows.
- Rationale: Enables deterministic scope-aware RBAC and immediate revocation/grant handling on promotions or reassignment.
- Alternatives considered:
  - Scope embedded only in JWT claims: rejected because revocation latency and audit traceability are weaker.
  - Role-only authorization without node scope mapping: rejected because it risks cross-establishment leakage.

## Decision 3: Multi-Level Reporting via Layered Materialized Views

- Decision: Build monthly school-level aggregate snapshots and layered rollup views for district, region, and national levels.
- Rationale: Predictable performance and traceable aggregation lineage for reporting and exports.
- Alternatives considered:
  - Fully on-demand aggregation from learner events: rejected for latency and leakage-risk complexity.
  - Single denormalized reporting table: rejected because lifecycle and correction management become brittle.

## Decision 4: Suppression and Re-Identification Guardrail Pipeline

- Decision: Apply a two-step privacy gate before rendering/exporting reports: cohort threshold suppression (>=10) plus rule-based re-identification scan.
- Rationale: Prevents inferential leakage in small or highly unique slices while preserving aggregate utility.
- Alternatives considered:
  - Threshold-only suppression: rejected because combinational filters can still leak identity.
  - Manual-only compliance review: rejected because it does not scale and delays reporting.

## Decision 5: District Approval Chain as Configurable State Machine

- Decision: Implement district approval workflow with ordered required gates (pedagogist -> curriculum lead -> country manager/compliance) and mandatory rationale for non-approval outcomes.
- Rationale: Enforces human oversight and consistent governance while supporting district-wide publication controls.
- Alternatives considered:
  - Parallel approvals with no sequence: rejected because required compliance sequencing is unclear.
  - Hardcoded per-route checks only: rejected because policy updates would require code redeploy.

## Decision 6: School Autonomy Through Adopt/Adapt/Decline Records

- Decision: After district approval, each school must submit explicit adoption action (`adopt`, `adapt`, `decline`) tracked in a dedicated adoption table.
- Rationale: Preserves local pedagogical autonomy and produces measurable adoption KPIs.
- Alternatives considered:
  - Implicit auto-adopt for all schools: rejected because it violates school autonomy and oversight goals.
  - Free-text only responses: rejected due to weak analytics and policy reporting.

## Decision 7: Audit Logging Aligned to EU AI Act Art. 12

- Decision: Use append-only structured logs for hierarchy access, scope denials, approval transitions, report generation, suppression outcomes, and benchmark collaboration actions.
- Rationale: Required for traceability, accountability, and compliance investigations.
- Alternatives considered:
  - HTTP access logs only: rejected because domain intent and decision rationale are missing.
  - Mutable log records: rejected because forensic integrity would be reduced.

## Decision 8: Data Governance Controls Aligned to Art. 10 and DPIA Delta

- Decision: Add district-level scope metadata quality checks, recertification workflow for grants, and aggregation lineage references in reporting records.
- Rationale: Strengthens governance of hierarchy and scope data quality, which is now critical to access control and aggregation integrity.
- Alternatives considered:
  - Ad-hoc admin updates without recertification: rejected because stale scopes become a leakage risk.
  - Retaining no lineage identifiers: rejected because report traceability would be insufficient.

## Resulting Technical Baseline

- PostgreSQL hierarchy extension with effective dating, lineage, and scope grant model.
- Scope-aware RBAC middleware and query boundary enforcement.
- Layered district/region/national reporting views with suppression and risk checks.
- Human-gated district approval chain and school adoption tracking.
- Immutable Art. 12 audit trail across approvals, access, reporting, and benchmarking.
- DPIA delta includes district scope metadata governance and retention controls.
