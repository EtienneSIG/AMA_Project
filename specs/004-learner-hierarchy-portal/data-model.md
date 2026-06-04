# Data Model: Learner Data Hierarchy and Director Portal

## LearnerHierarchyAssignment

- Purpose: Conformed hierarchy record that ties a learner to class, school, and region for a given time window.
- Key fields: learner_id, class_id, school_id, region_id, effective_from, effective_to, source_system, status, exception_flag.
- Rules: Exactly one active assignment per learner per reporting period; missing or conflicting links must be flagged rather than silently counted.

## ReportingScope

- Purpose: The set of schools and regions a director may view.
- Key fields: director_subject_id, school_id, region_id, role, effective_from, effective_to, granted_by, granted_at.
- Rules: Scope must be role-backed and time-bounded; the portal may only render reports inside the allowed scope.

## HierarchyException

- Purpose: Captures unresolved hierarchy problems that need correction before reporting is considered complete.
- Key fields: learner_id, issue_type, issue_detail, severity, detected_at, status, resolved_at, resolved_by.
- Rules: Exceptions are visible to operational reviewers, not to portal users as raw personal records.

## DirectorPortalSession

- Purpose: Records portal access and report session context for audit purposes.
- Key fields: session_id, director_subject_id, role, scope_snapshot, opened_at, report_id, outcome.
- Rules: Scope snapshots must reflect the authorization state at access time.

## EmbeddedReportReference

- Purpose: Describes which Fabric / Power BI report the portal is allowed to embed.
- Key fields: report_id, workspace_id, dataset_id, display_name, allowed_scope_dimensions, aggregation_level, sensitivity_label.
- Rules: The portal may use only approved report references; no raw learner-export payloads are part of this model.

## AuditEvent

- Purpose: Compliance trail for access, scope changes, and hierarchy updates.
- Key fields: event_type, actor_id, actor_role, target_type, target_id, scope, timestamp, outcome, correlation_id.
- Rules: Events must be immutable and suitable for compliance review.