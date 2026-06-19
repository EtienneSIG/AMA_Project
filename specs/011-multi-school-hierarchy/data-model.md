# Data Model: Multi-School Hierarchy, Approval Chains, and Hierarchical Reporting

## Entity: HierarchyNode

- Purpose: Canonical organization unit in the hierarchy graph.
- Fields:
  - `id` (UUID, PK)
  - `node_type` (enum: country, district, school, class)
  - `display_name` (text)
  - `country_code` (text, nullable for non-country nodes)
  - `status` (enum: active, inactive, merged)
  - `created_at`, `updated_at`
- Validation rules:
  - `node_type=country` requires `country_code`.
  - Active nodes must have at least one valid path to a country root.

## Entity: HierarchyEdge

- Purpose: Effective-dated parent-child relationship between hierarchy nodes.
- Fields:
  - `id` (UUID, PK)
  - `parent_node_id` (UUID, FK -> HierarchyNode)
  - `child_node_id` (UUID, FK -> HierarchyNode)
  - `effective_from` (timestamp)
  - `effective_to` (timestamp, nullable)
  - `change_reason` (text)
  - `created_by_user_id` (UUID)
- Validation rules:
  - No cycles allowed in active edge set.
  - `effective_to` must be greater than `effective_from` when present.

## Entity: RoleScopeGrant

- Purpose: Maps user role to authorized hierarchy scope.
- Fields:
  - `id` (UUID, PK)
  - `user_id` (UUID)
  - `role` (enum: teacher, school_director, district_pedagogist, district_curriculum_lead, district_director, country_manager, compliance_reviewer)
  - `scope_level` (enum: school, district, region, country)
  - `scope_node_id` (UUID, FK -> HierarchyNode)
  - `effective_from` (timestamp)
  - `effective_to` (timestamp, nullable)
  - `status` (enum: active, revoked, expired)
  - `granted_by_user_id` (UUID)
  - `revoked_by_user_id` (UUID, nullable)
- Validation rules:
  - One active grant per (`user_id`, `role`, `scope_node_id`) at a time.
  - Expired/revoked grants cannot authorize data access.

## Entity: DistrictApprovalWorkflow

- Purpose: Tracks district-level approval lifecycle for curriculum content.
- Fields:
  - `id` (UUID, PK)
  - `content_id` (UUID)
  - `district_node_id` (UUID, FK -> HierarchyNode)
  - `state` (enum: draft, submitted, in_review, changes_requested, rejected, approved, available_to_schools)
  - `current_gate_order` (int)
  - `expected_lock_version` (bigint)
  - `submitted_by_user_id` (UUID)
  - `submitted_at` (timestamp)
  - `resolved_at` (timestamp, nullable)
- Validation rules:
  - State transitions must follow configured gate order.
  - `available_to_schools` requires completion of all mandatory gates.

## Entity: DistrictApprovalStep

- Purpose: Immutable record for each approval decision in the chain.
- Fields:
  - `id` (UUID, PK)
  - `workflow_id` (UUID, FK -> DistrictApprovalWorkflow)
  - `gate_order` (int)
  - `required_role` (enum: district_pedagogist, district_curriculum_lead, country_manager)
  - `decision` (enum: approved, changes_requested, rejected)
  - `decision_note` (text)
  - `decided_by_user_id` (UUID)
  - `decided_at` (timestamp)
- Validation rules:
  - `decision_note` required for `changes_requested` and `rejected`.
  - One terminal decision per gate per workflow cycle.

## Entity: SchoolAdoptionDecision

- Purpose: Captures school-level adoption autonomy after district approval.
- Fields:
  - `id` (UUID, PK)
  - `workflow_id` (UUID, FK -> DistrictApprovalWorkflow)
  - `school_node_id` (UUID, FK -> HierarchyNode)
  - `decision` (enum: adopt, adapt, decline)
  - `decision_note` (text, nullable)
  - `variant_content_id` (UUID, nullable)
  - `decided_by_user_id` (UUID)
  - `decided_at` (timestamp)
- Validation rules:
  - Only allowed when workflow state is `available_to_schools`.
  - `variant_content_id` required when `decision=adapt`.

## Entity: ReportingSnapshot

- Purpose: Stores pre-aggregated metrics by school and period for rollups.
- Fields:
  - `id` (UUID, PK)
  - `period_start`, `period_end` (date)
  - `school_node_id` (UUID, FK -> HierarchyNode)
  - `subject_code` (text)
  - `cohort_size` (int)
  - `enrollment_count` (int)
  - `completion_rate` (numeric)
  - `mastery_rate` (numeric)
  - `aggregation_version` (text)
  - `created_at`
- Validation rules:
  - Rates in range [0, 100].
  - `cohort_size` must be non-negative.

## Entity: HierarchicalReportRequest

- Purpose: Defines a generated report and its scope context.
- Fields:
  - `id` (UUID, PK)
  - `requested_by_user_id` (UUID)
  - `scope_level` (enum: district, region, national)
  - `scope_node_id` (UUID, FK -> HierarchyNode)
  - `dimension` (enum: school, subject, cohort)
  - `period_start`, `period_end` (date)
  - `status` (enum: generated, suppressed, blocked_for_review)
  - `suppression_applied` (boolean)
  - `reid_risk_flag` (boolean)
  - `created_at`, `generated_at`
- Validation rules:
  - Scope must match an active RoleScopeGrant for requester.
  - `blocked_for_review` required when re-identification risk is high.

## Entity: PeerBenchmarkRecord

- Purpose: Captures comparison outcome and collaboration request lifecycle.
- Fields:
  - `id` (UUID, PK)
  - `school_node_id` (UUID, FK -> HierarchyNode)
  - `district_node_id` (UUID, FK -> HierarchyNode)
  - `metric_code` (text)
  - `school_value` (numeric)
  - `district_average` (numeric)
  - `national_average` (numeric, nullable)
  - `gap_percent` (numeric)
  - `recommendation_text` (text)
  - `request_status` (enum: not_started, requested, accepted, declined)
  - `created_at`, `updated_at`
- Validation rules:
  - National comparison allowed only within same country boundary policy.
  - Recommendation text generated from approved rule templates only.

## Entity: HierarchyAuditEvent

- Purpose: Immutable Art. 12-aligned audit log for hierarchy governance actions.
- Fields:
  - `id` (UUID, PK)
  - `event_type` (enum: scope_check_pass, scope_check_deny, approval_submitted, approval_decided, approval_published, school_adoption_decided, report_generated, report_suppressed, report_blocked, benchmark_requested, role_transition)
  - `actor_user_id` (UUID)
  - `actor_role` (text)
  - `scope_level` (text)
  - `scope_node_id` (UUID)
  - `subject_ref_type` (text)
  - `subject_ref_id` (UUID, nullable)
  - `event_timestamp` (timestamp)
  - `rationale` (text, nullable)
  - `details_json` (jsonb)
- Validation rules:
  - Append-only policy; no updates/deletes by application role.
  - `rationale` required for denials, rejections, suppressions, and blocked reports.

## Relationships

- `HierarchyNode` 1:N `HierarchyEdge` (as parent)
- `HierarchyNode` 1:N `HierarchyEdge` (as child)
- `HierarchyNode` 1:N `RoleScopeGrant`
- `DistrictApprovalWorkflow` 1:N `DistrictApprovalStep`
- `DistrictApprovalWorkflow` 1:N `SchoolAdoptionDecision`
- `HierarchyNode` 1:N `ReportingSnapshot` (school node)
- `HierarchyNode` 1:N `HierarchicalReportRequest` (scope node)
- `HierarchyNode` 1:N `PeerBenchmarkRecord`
- All major entities 1:N `HierarchyAuditEvent` through `subject_ref_type`/`subject_ref_id`

## State Machines

### District Approval Workflow State Machine

- `draft -> submitted -> in_review`
- `in_review -> changes_requested -> draft`
- `in_review -> rejected -> draft`
- `in_review -> approved -> available_to_schools`

Transition guards:
- Required role for current gate must match actor grant scope.
- Lock version must match current workflow version.
- Approval publish requires all gates completed.

### School Adoption Decision State

- `not_started -> adopt`
- `not_started -> adapt`
- `not_started -> decline`

Transition guards:
- School director must hold active school-scope grant.
- Decision is immutable except explicit superseding decision with audit rationale.

### Hierarchical Report Request State

- `generated`
- `suppressed`
- `blocked_for_review`

Transition guards:
- Scope authorization evaluated before aggregation.
- Suppression and re-identification checks run before final state assignment.

## Derived Views

- `v_scope_resolved_nodes`: expands active grants to accessible descendants.
- `v_reporting_school_monthly`: base school snapshots by period.
- `v_reporting_district_rollup`: district aggregates from school snapshots.
- `v_reporting_region_rollup`: region aggregates from district rollups.
- `v_reporting_national_rollup`: national aggregates from regional rollups with country boundary constraints.
- `v_pending_district_approvals`: approvals waiting for current gate role.
- `v_school_adoption_metrics`: adopt/adapt/decline rates by district and period.
- `v_audit_hierarchy_governance`: compliance view over scope checks, approvals, reporting, and benchmarking actions.
