# Implementation Plan: Multi-School Hierarchy, Approval Chains, and Hierarchical Reporting

**Branch**: `011-multi-school-hierarchy` | **Date**: 2026-06-18 | **Spec**: `/specs/011-multi-school-hierarchy/spec.md`

**Input**: Feature specification from `/specs/011-multi-school-hierarchy/spec.md`

## Summary

Extend LearnEU hierarchy governance from school-centric reporting to district, region, and national layers with strict scope-aware RBAC, district-level approval chains, and auditable aggregation workflows. The implementation introduces PostgreSQL hierarchy extensions (effective-dated hierarchy graph, role-to-scope grants, reporting aggregation snapshots, and suppression metadata), multi-level reporting views (`district -> region -> national`), and end-to-end audit trails for access, approvals, and peer benchmarking actions. The design guarantees no cross-establishment data leakage, no learner-level exposure at district/country levels, and explicit human oversight in district-level publication and adoption decisions.

## Technical Context

**Language/Version**: Node.js 22.x (existing LearnEU app runtime), SQL migrations for PostgreSQL 15+

**Primary Dependencies**: `express`, `pg`, existing shared auth/session middleware in `demo/apps/_shared`, existing role claims model, existing reporting helpers used by director portal surfaces

**Storage**: EU-hosted PostgreSQL for hierarchy graph, role-scope grants, approval workflow instances, reporting aggregation snapshots, suppression events, and audit trails

**Testing**: Contract/API checks, role-scope negative access tests, hierarchy aggregation reconciliation tests, suppression and leakage prevention tests, approval chain state-machine tests, quickstart walkthrough validation

**Target Platform**: Azure App Service Linux apps (`director-portal`, `admin`, shared services) and Azure Database for PostgreSQL Flexible Server in EU regions

**Project Type**: Multi-app web platform extension (hierarchy governance + reporting + approval workflow)

**Performance Goals**:
- District dashboard (20-50 schools) returns aggregate cards in <= 5s p95 (SC-001)
- Hierarchical report generation (`district -> region -> national`) in <= 8s p95 for monthly views
- Approval transition writes (approve/reject/request changes/adopt/decline) in <= 700 ms p95
- Scope check on report and approval endpoints in <= 100 ms p95

**Constraints**:
- EU residency only; no cross-EU transfer and no cross-country benchmark joins when prohibited
- Cohort minimum disclosure rule (>=10) and re-identification risk screening before report render/export
- District/country manager views must remain aggregated-only; no learner names or direct learner drill-through
- Approval chains require human actors at each gate; no autonomous district-wide publish decisions
- Scope-aware RBAC must apply identically to on-screen data, exports, API responses, and benchmark workflows

**Scale/Scope**:
- Hierarchy depth: `country -> district -> school -> class -> learner`
- Pilot volume: multiple districts per country, 20-50 schools per district, monthly snapshots plus on-demand drill-down to school/class aggregates
- Feature scope: hierarchy model extension, district approvals, role/scope enforcement, hierarchical reporting, peer benchmarking workflows, audit instrumentation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | District/region/national reporting uses EU-hosted aggregated snapshots and scope metadata only. No raw learner export to higher hierarchy levels. |
| II. GDPR Art. 8 | PASS | Child data remains suppressed above school level via cohort thresholds and re-identification controls; no new learner-facing consent bypasses. |
| III. EU AI Act high-risk discipline | PASS | Reporting and governance actions add Art. 10 data governance controls, Art. 12 trace logging, and Art. 14 human oversight in approval chains. |
| IV. Teacher-in-the-loop | PASS | District approvals and school adoption remain human actions; no automated learner-impacting decisions. |
| V. Pedagogical sign-off | PASS | Approval chain explicitly includes pedagogical gate before district-wide availability. |
| VI. Outcome-contract driven | PASS | Supports outcome-gap reduction and administrative efficiency via hierarchy benchmarking and safer governance workflows. |
| VII. Reproducible, spec-driven delivery | PASS | Artifacts are produced under `specs/011-multi-school-hierarchy/` and ready for `/speckit.tasks`. |

**EU AI Act articles touched**:
- **Art. 10 (Data governance and management practices)**: hierarchy-quality controls, scope metadata integrity, suppression rule application, and aggregation lineage.
- **Art. 12 (Logging and traceability)**: immutable logs for approval actions, scope checks, report generation, suppression outcomes, and benchmark requests.
- **Art. 14 (Human oversight)**: mandatory human decision points across district approval gates and school-level adopt/adapt/decline actions.

**DPIA delta**:
- New processing objects: district/region scope metadata, role-scope mappings, approval action rationale, suppression audit records, cross-level aggregation lineage IDs.
- Data classes: pseudonymous role identity, hierarchy node metadata, aggregated performance metrics, workflow comments, and audit events.
- Additional control commitments: scope metadata retention policy, periodic access recertification, and explicit no-cross-establishment-leakage validation checks.

**Human oversight surface**:
- District-level chain: pedagogist -> district curriculum lead -> country manager/compliance gate.
- School-level autonomy: directors must explicitly adopt/adapt/decline district-approved content.
- Report interpretation remains decision-support only; interventions remain named human decisions outside automated flow.

## Project Structure

### Documentation (this feature)

```text
specs/011-multi-school-hierarchy/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── multi-school-hierarchy.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── _shared/
│   │   ├── db/
│   │   │   ├── schema.sql                 # Hierarchy graph, role-scope, approvals, reporting snapshots, audit tables
│   │   │   └── index.js                   # Shared hierarchy resolution, scope checks, aggregation queries, audit helpers
│   │   ├── auth.js                        # Scope-aware role enforcement middleware extensions
│   │   ├── server.js                      # Shared governance/reporting utility routes
│   │   └── sync.ps1
│   ├── director-portal/
│   │   ├── server.js                      # District/region/national reporting and peer benchmarking endpoints
│   │   └── public/
│   │       └── index.html                 # Multi-level reporting UX, benchmarking actions, suppression messaging
│   ├── admin/
│   │   ├── server.js                      # District approval chain orchestration + adoption metrics APIs
│   │   └── public/
│   │       └── index.html
│   └── teacher-console/
│       └── server.js                      # Read-only transparency hooks where teacher oversight intersects
└── scripts/
    └── acceptance_tests.ps1               # Scope leakage checks, approval chain checks, aggregation/suppression assertions
```

**Structure Decision**: Extend existing shared and director/admin app surfaces instead of introducing a new service. This keeps hierarchy, RBAC, reporting, and audit logic aligned with current LearnEU deployment and minimizes new operational complexity.

## Architecture Focus Areas

### 1) PostgreSQL Hierarchy Extensions

- Add effective-dated hierarchy node table(s) and parent-child relation table(s) for `country/district/school/class` lineage.
- Add assignment linkage for school mergers/splits and role transitions without rewriting historical reports.
- Add aggregation lineage IDs so every reported metric can be traced to source snapshot and suppression decisions.

### 2) Role/Scope Mapping and Enforcement

- Introduce explicit `role_scope_grants` model (`user`, `role`, `scope_level`, `scope_node_id`, `effective_from`, `effective_to`).
- Enforce scope at query planner boundary and route middleware boundary.
- Add deny-by-default behavior for ambiguous scope and stale assignments.

### 3) Multi-Level View Strategy

- Materialize monthly snapshots for school-level base aggregates.
- Build deterministic rollup views:
  - district view aggregates schools in authorized district
  - region view aggregates districts in authorized region/country partition
  - national view aggregates regional totals with country boundary constraints
- Apply suppression policy before render/export and persist suppression outcomes for audits.

## Implementation Phases

### Phase 0 - Research and Clarification

Produce `research.md` decisions for hierarchy graph modeling, scope claim strategy, aggregation materialization cadence, suppression/re-identification controls, and approval chain sequencing.

### Phase 1 - Data and Contract Design

Produce:
- `data-model.md` with entities, relationships, validations, and state transitions.
- `contracts/multi-school-hierarchy.openapi.yaml` for hierarchy, reporting, approvals, and benchmarking APIs.
- `quickstart.md` with end-to-end validation path and compliance checks.
- Update `.github/copilot-instructions.md` plan pointer to this feature plan.

### Phase 2 - Foundation Implementation

- Implement schema migrations and shared DB helpers.
- Implement scope-aware RBAC middleware and query constraints.
- Add audit event instrumentation for access/approval/reporting/benchmarking.

### Phase 3 - Approval Chains and Adoption Workflow

- Implement district approval chain state machine.
- Implement school adopt/adapt/decline endpoints and adoption metrics rollups.
- Add role transition and reassignment handling with immediate revocation/grant semantics.

### Phase 4 - Hierarchical Reporting and Benchmarking

- Implement district/region/national report endpoints and export safeguards.
- Implement peer benchmarking and collaboration request workflow.
- Validate no cross-establishment leakage with automated negative tests.

### Phase 5 - Verification and Readiness for `/speckit.tasks`

- Run reconciliation tests for aggregation correctness and suppression consistency.
- Verify approval-chain audit completeness and human oversight traceability.
- Final constitution re-check and readiness handoff to task planning.

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| District approval chain includes explicit human gates and rationale capture | PASS |
| Role/scope mapping prevents cross-establishment or out-of-scope data retrieval | PASS |
| Hierarchical reporting applies suppression and re-identification protections at every level | PASS |
| Art. 10 data governance, Art. 12 logging, and Art. 14 oversight are modeled in entities/contracts | PASS |
| EU-only storage/processing boundaries remain unchanged | PASS |

No constitution violations require waiver.

## Complexity Tracking

No constitution violations or structural complexity exceptions identified.
