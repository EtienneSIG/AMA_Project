# Research: CMS Versioning and Content Approval Workflow

## Decision 1: Immutable PostgreSQL Snapshot Versioning

- Decision: Store each published or review-submitted content artifact as an immutable snapshot row (`content_versions`) with parent linkage (`previous_version_id`) and branch linkage (`branch_root_version_id`, `source_version_id`).
- Rationale: Immutable snapshots provide strong auditability, deterministic rollback references, and clear Art. 13 transparency for version provenance.
- Alternatives considered:
  - Mutable single-row content with history diff table: rejected because rollback and branch lineage become harder to reason about and audit.
  - Event-sourced only stream without materialized snapshots: rejected for higher query complexity on learner-facing version resolution.

## Decision 2: Explicit Approval State Machine with Role Gates

- Decision: Implement workflow states as first-class records (`approval_workflow_instances`, `approval_steps`) with ordered, policy-driven required roles.
- Rationale: Role-gated transitions prevent bypasses, support mandatory pedagogy/compliance/localization gates, and make in-flight policy updates auditable.
- Alternatives considered:
  - Boolean flags on version rows (`is_approved_by_x`): rejected due to poor extensibility and weak sequencing controls.
  - Hardcoded workflow in application logic only: rejected because policy change would require code deploy for every variant.

## Decision 3: Localization Branch Independence with Merge Advisory

- Decision: Use copy-on-write branch snapshots for each locale, with source advancement notifications and optional merge/adapt/defer actions.
- Rationale: Enables parallel localization delivery and protects local edits from source mutation while keeping teams informed of upstream updates.
- Alternatives considered:
  - Directly binding locale versions to source version text blocks: rejected because it breaks independent localization edits.
  - Automatic forced merge from source to locale: rejected due to pedagogical and linguistic risk.

## Decision 4: Rollback as New Promotion, Not Time Rewind

- Decision: Model rollback as a new promotion event that references a previous stable snapshot, updating active assignment pointers through idempotent jobs.
- Rationale: Preserves full chronology, supports retry-safe operations, and avoids destructive history rewrites.
- Alternatives considered:
  - Re-point "current version" pointer without creating a new version event: rejected because traceability is weaker for audits.
  - Hard delete of bad version: rejected because it violates traceability and retention expectations.

## Decision 5: Audit Logging Aligned to EU AI Act Art. 12

- Decision: Record structured audit events for create/edit/submit/approve/reject/publish/rollback/deprecate/archive/merge decision actions with actor role, timestamp, item IDs, and rationale.
- Rationale: Meets traceability obligations and supports operational investigations and compliance review.
- Alternatives considered:
  - Coarse per-request logs only: rejected because action semantics and governance rationale would be incomplete.
  - Free-text logs only: rejected because queryability and forensic reliability degrade.

## Decision 6: Version Transparency Surface Aligned to Art. 13

- Decision: Expose version metadata and approval provenance in admin/teacher surfaces and include learner-safe "content updated" notices when active versions change.
- Rationale: Provides explainability of what changed, who approved, and why a version became active.
- Alternatives considered:
  - Internal-only transparency: rejected because stakeholder trust and teacher-in-the-loop requirements need visible provenance.

## Decision 7: DPIA Delta Scope and Retention

- Decision: Treat metadata tagging and approval history as governance data with retention controls and pseudonymised reviewer identifiers for long-term analytics where legally permitted.
- Rationale: Balances accountability with data minimisation and GDPR-aligned lifecycle controls.
- Alternatives considered:
  - Unlimited retention of all reviewer identifiers: rejected as unnecessary for long-term trend analysis.
  - No retention of reviewer rationale: rejected because compliance and pedagogical review audit needs would not be met.

## Resulting Technical Baseline

- PostgreSQL 15+ schema with immutable versions, workflow instances, localized branches, metadata tags, and structured audit trails.
- Policy-configurable approval engine with mandatory roles and optimistic concurrency controls.
- Rollback safety through idempotent orchestration and checkpointed assignment updates.
- EU-resident storage and operations only.
- Art. 12 and Art. 13 obligations explicitly represented in data and API surfaces.
