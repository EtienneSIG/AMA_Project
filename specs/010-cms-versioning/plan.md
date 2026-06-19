# Implementation Plan: CMS Versioning and Content Approval Workflow

**Branch**: `010-cms-versioning` | **Date**: 2026-06-18 | **Spec**: `/specs/010-cms-versioning/spec.md`

**Input**: Feature specification from `/specs/010-cms-versioning/spec.md`

## Summary

Implement governed content lifecycle management across authoring, review, publication, localization, and retirement. The technical design centers on immutable PostgreSQL-backed version snapshots, a configurable approval state machine with mandatory gates (pedagogy, compliance, localization lead where applicable), explicit lineage tracking for source and branch versions, safe rollback orchestration, and full audit trails for every state transition. Localization branches remain operationally independent while preserving parent-child lineage references and merge advisories. All data handling remains EU-resident and minimised.

## Technical Context

**Language/Version**: Node.js 22.x (existing LearnEU app stack), SQL migrations for PostgreSQL 15+ (Azure Database for PostgreSQL Flexible Server)

**Primary Dependencies**: `express`, `pg`, existing auth/session middleware in `demo/apps/_shared`, existing role claims model, existing notification and audit helpers

**Storage**: PostgreSQL (EU-hosted) for content snapshots, approval records, metadata tags, branch lineage, audit logs, deprecation lifecycle states

**Testing**: Contract checks for workflow APIs, DB migration validation, deterministic state-machine transition tests, rollback safety integration tests, localization branch isolation tests, operator walkthrough in `quickstart.md`

**Target Platform**: Azure App Service Linux apps in EU regions (admin and teacher-facing governance surfaces), Azure Database for PostgreSQL Flexible Server in EU regions

**Project Type**: Multi-app web platform feature (backend workflow + governance UI + shared services)

**Performance Goals**:
- Publish/rollback command acknowledgement <= 3 seconds p95
- Rollback propagation to active assignments <= 5 minutes (SC-004)
- Approval transition write latency <= 500 ms p95 for single item transitions
- Metadata-filtered content search <= 2 seconds p95 for typical curriculum lead queries

**Constraints**:
- EU residency only for content, metadata, approvals, and audit artifacts (FR-009)
- Mandatory gate sequencing: pedagogical lead, compliance lead, and localization lead for localized branches
- No bypass path around approval state machine for publish, rollback, deprecate, or archive
- Immutable version snapshots after publish; corrections must produce new versions
- Full lineage retention for audit and Art. 13 transparency

**Scale/Scope**:
- P1 scope: versioning + approvals + localization branching + metadata + deprecation lifecycle
- Expected volume: thousands of content items, multiple language branches per item, and multi-role approvals per publication cycle
- Tenant scope: pilot EU markets with expansion-ready schema for additional locales and standards sets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Content versions, approval states, metadata tags, and audit events remain in EU-region PostgreSQL only. No cross-EU replication or third-party content telemetry. |
| II. GDPR Art. 8 | PASS | Feature is governance-oriented and non-learner-facing, but touches minor-related curriculum metadata context; DPIA delta documents retention, access, and erasure handling for approval traces. |
| III. EU AI Act high-risk discipline | PASS | Localization and AI-assisted authoring governance are high-risk adjacent and held to the full obligation set: Art. 9 risk management for the versioning/approval pipeline, Art. 10 data governance for content and approval-trace classes, Art. 12 logging, Art. 13 transparency for version/approval provenance, Art. 14 human approval gates, and Art. 15 robustness for the publish/rollback integrity boundary. An Annex IV technical-file fragment is produced for the governance capability. |
| IV. Teacher-in-the-loop | PASS | Publish decisions remain human-approved through named review roles; no autonomous publication or deprecation actions. |
| V. Pedagogical sign-off | PASS | Pedagogical approval is a non-optional gate before publish or major version promotion. |
| VI. Outcome-contract driven | PASS | Directly supports localization cycle reduction (12 months to 6 weeks) and governance quality KPIs through controlled approvals and branch workflows. |
| VII. Reproducible, spec-driven delivery | PASS | All design artifacts produced under `specs/010-cms-versioning/` and traceable to this plan/spec pair. |

**EU AI Act articles touched**:
- **Art. 9 (Risk Management)**: Documented risk assessment for the content lifecycle covering unauthorized or accidental publication, rollback to a non-compliant version, merge of unreviewed localized content, loss of approval provenance, and reviewer-identity exposure; each risk maps to a mitigation (mandatory approval gates, fail-closed publish guard, immutable audit, pseudonymisation) and a residual-risk acceptance recorded before publish defaults change.
- **Art. 10 (Data Governance)**: Approved data classes for the feature (content versions, approval-state history, reviewer comments, lifecycle transitions, pseudonymous operator identity, role claims, curriculum metadata, change summaries) are documented with quality, retention, and access expectations; no new learner-level or sensitive child categories are introduced.
- **Art. 12 (Logging and traceability)**: Immutable logging of content changes, approval transitions, publish/rollback/deprecate actions, and branch merge decisions.
- **Art. 13 (Transparency)**: Version provenance, approval rationale visibility, branch origin visibility, and learner/teacher-facing version disclosure metadata.
- **Art. 14 (Human Oversight)**: Publish, promote, rollback, deprecate, and merge actions require a named human approver through the pedagogical, compliance, and localization review roles; no autonomous lifecycle action is permitted, and every override is captured with rationale.
- **Art. 15 (Robustness, Accuracy & Cybersecurity)**: Fail-closed publish/rollback guards prevent promoting unapproved or non-comparable versions, role-based access protects approval transitions, lifecycle state changes are validated server-side, and all processing and storage remain EU-resident.

**Annex IV technical-file fragment**: This feature contributes an Annex IV fragment documenting (a) the intended purpose and governance (non-autonomous) nature of the versioning/approval capability, (b) the content lifecycle and approval-gate design, (c) the data classes and governance from Art. 10, (d) the risk-management outcomes from Art. 9, (e) the human-oversight roles and override handling from Art. 14, and (f) the logging, transparency, and robustness controls from Art. 12/13/15, to be merged into the program-level high-risk technical file.

**DPIA delta**:
- New processing coverage: content metadata enrichment, approval-state history, reviewer comments, and lifecycle transitions.
- Data classes: pseudonymous operator identity, role claims, curriculum metadata, change summaries, and status history.
- Retention controls: maintain audit integrity while enabling GDPR-aligned erasure pseudonymisation of reviewer identifiers where legally allowed.
- Risk posture: low-to-moderate governance data risk; no new biometric/sensitive child category data introduced.

**Human oversight surface**:
- Required approval gates: pedagogical lead, compliance lead, and localization lead for localized artifacts.
- Authorized humans can approve, request changes, reject, rollback, deprecate, archive, or defer merges.
- All overrides require rationale and are audit-logged.

## Project Structure

### Documentation (this feature)

```text
specs/010-cms-versioning/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cms-versioning.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── _shared/
│   │   ├── db/
│   │   │   ├── schema.sql              # Versioning/approval/lineage tables
│   │   │   └── index.js                # Shared workflow and audit helper functions
│   │   ├── server.js                   # Shared middleware and governance utility routes
│   │   └── sync.ps1
│   ├── admin/
│   │   ├── server.js                   # Approval workflow, metadata, deprecation, rollback endpoints
│   │   └── public/
│   │       └── index.html              # Governance console workflows
│   └── teacher-console/
│       ├── server.js                   # Teacher visibility of version/deprecation context
│       └── public/
│           └── index.html
└── scripts/
    └── acceptance_tests.ps1            # End-to-end workflow assertions
```

**Structure Decision**: Reuse the existing multi-app architecture with shared DB and service primitives in `_shared`, central governance actions in `admin`, and teacher-facing transparency views in `teacher-console`. This minimizes deployment risk and keeps approval and lifecycle logic in existing operator surfaces.

## Approval and Lifecycle Model

### Approval Roles and Gates

Mandatory baseline gate sequence for base-language versions:
1. Creator submission
2. Pedagogical lead review gate
3. Compliance lead review gate
4. Publish authorization

Mandatory sequence for localization branches:
1. Localization editor submission
2. Localization lead review gate
3. Pedagogical lead review gate (localized pedagogy fit)
4. Compliance lead review gate
5. Publish authorization for locale branch

Rules:
- Any reject/request-changes returns artifact to Draft-Rework state with mandatory comment.
- Re-approval reuse is allowed only when diff classifier marks change as non-material and policy permits it.
- Parallel approvals are prevented through optimistic lock/version token checks on workflow rows.

### Version Lineage and Branching

- Base version lineage uses immutable parent pointers (`previous_version_id`).
- Localization branches use `branch_root_version_id` + `source_version_id` references.
- Merge advisories are generated when source branch advances; locale branch can merge, adapt, or defer independently.
- Branch independence is guaranteed by copy-on-write content payload snapshots; source edits never mutate localized snapshots.

### Rollback Safety

- Rollback creates a new promoted version that references a previous snapshot as rollback source, preserving chronological integrity.
- Active assignment mapping updates are idempotent and journaled; if partial failure occurs, retry resumes from checkpoint.
- In-flight learner sessions receive a refresh-required marker and retain prior response history linked to original version IDs.

### Deprecation Lifecycle

State progression:
`Published -> Deprecated (with EOL + replacement) -> Archived`

Controls:
- New assignments blocked after EOL.
- Existing learner evidence remains queryable for audit and reporting.
- Archived versions remain immutable and exportable for compliance records.

## Implementation Phases

### Phase 0 - Research and Clarification

Produce `research.md` with resolved decisions for:
- PostgreSQL immutable snapshot schema and indexing strategy
- Approval state machine shape and concurrency protections
- Localization branch merge policy and conflict strategy
- Rollback orchestration and assignment remap safety
- Art. 12/13 logging/transparency field requirements

### Phase 1 - Design and Contracts

Produce:
- `data-model.md` with entities, relationships, validations, and state transitions
- `contracts/cms-versioning.openapi.yaml` with governance endpoints and response semantics
- `quickstart.md` with end-to-end validation runbook
- Update `.github/copilot-instructions.md` plan pointer to this feature plan

### Phase 2 - Implementation Planning Readiness

Prepare for `/speckit.tasks` with explicit workstreams:
- Schema/migration implementation
- Workflow engine and policy checks
- Governance UI/API integration
- Notification and audit integration
- Compliance verification and regression tests

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| Approval gates include pedagogy, compliance, and localization leads where required | PASS |
| Localization branches remain independent while preserving lineage references | PASS |
| Rollback design is auditable, idempotent, and learner-data-safe | PASS |
| Art. 12 logging fields and Art. 13 transparency surfaces are explicitly modeled | PASS |
| EU-only storage and processing boundaries remain intact | PASS |

No constitution violations require waiver.

## Complexity Tracking

No constitution violations or structural complexity exceptions identified.
