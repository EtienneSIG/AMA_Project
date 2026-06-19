# Data Model: CMS Versioning and Content Approval Workflow

## Entity: ContentItem

- Purpose: Canonical content container (lesson/module) independent of version revisions.
- Fields:
  - `id` (UUID, PK)
  - `tenant_id` (UUID)
  - `content_type` (enum: lesson, assessment, unit)
  - `default_locale` (text, e.g., `nl-NL`)
  - `current_published_version_id` (UUID, nullable)
  - `lifecycle_status` (enum: drafting, published, deprecated, archived)
  - `created_at`, `updated_at`
- Validation rules:
  - `default_locale` must be in supported locale table.
  - `lifecycle_status=archived` requires prior deprecated state unless migration override.

## Entity: ContentVersion

- Purpose: Immutable snapshot of content payload and metadata at a specific revision.
- Fields:
  - `id` (UUID, PK)
  - `content_item_id` (UUID, FK -> ContentItem)
  - `semantic_version` (text, format `major.minor.patch`)
  - `locale` (text)
  - `branch_type` (enum: source, localization)
  - `previous_version_id` (UUID, nullable FK -> ContentVersion)
  - `branch_root_version_id` (UUID, nullable FK -> ContentVersion)
  - `source_version_id` (UUID, nullable FK -> ContentVersion)
  - `change_summary` (text)
  - `payload_json` (jsonb)
  - `created_by_user_id` (UUID)
  - `created_at`
  - `is_material_change` (boolean)
- Validation rules:
  - `payload_json` immutable after submit/publish.
  - `semantic_version` unique within (`content_item_id`, `locale`).
  - For localization branch rows, `branch_root_version_id` and `source_version_id` are required.

## Entity: ApprovalWorkflowPolicy

- Purpose: Configurable approval route definitions per content type and branch type.
- Fields:
  - `id` (UUID, PK)
  - `content_type` (enum)
  - `branch_type` (enum)
  - `steps_json` (jsonb ordered roles)
  - `allow_non_material_reuse` (boolean)
  - `effective_from`, `effective_to` (nullable)
  - `created_at`
- Validation rules:
  - Must include `pedagogy_lead` and `compliance_lead` roles for all publishable content.
  - Must include `localization_lead` for `branch_type=localization` policies.

## Entity: ApprovalWorkflowInstance

- Purpose: Runtime workflow state for a specific content version submission.
- Fields:
  - `id` (UUID, PK)
  - `content_version_id` (UUID, FK -> ContentVersion, unique)
  - `policy_id` (UUID, FK -> ApprovalWorkflowPolicy)
  - `state` (enum: draft, submitted, in_review, changes_requested, rejected, approved, published)
  - `current_step_order` (int)
  - `lock_version` (bigint)
  - `submitted_by_user_id` (UUID)
  - `submitted_at` (timestamp, nullable)
  - `resolved_at` (timestamp, nullable)
- Validation rules:
  - State transitions must follow approved state machine.
  - `lock_version` increments on each transition for optimistic concurrency.

## Entity: ApprovalStepRecord

- Purpose: Immutable record for each reviewer action at each required gate.
- Fields:
  - `id` (UUID, PK)
  - `workflow_instance_id` (UUID, FK -> ApprovalWorkflowInstance)
  - `step_order` (int)
  - `required_role` (enum: pedagogy_lead, compliance_lead, localization_lead, curriculum_lead)
  - `reviewer_user_id` (UUID)
  - `decision` (enum: approved, changes_requested, rejected)
  - `comment` (text)
  - `decided_at` (timestamp)
- Validation rules:
  - One final decision per required role per active cycle.
  - `comment` required for `changes_requested` and `rejected`.

## Entity: LocalizationBranch

- Purpose: Tracks branch-level locale lifecycle and source sync advisories.
- Fields:
  - `id` (UUID, PK)
  - `content_item_id` (UUID, FK -> ContentItem)
  - `locale` (text)
  - `branch_root_version_id` (UUID, FK -> ContentVersion)
  - `latest_local_version_id` (UUID, FK -> ContentVersion)
  - `latest_source_version_id_seen` (UUID, FK -> ContentVersion)
  - `sync_status` (enum: up_to_date, update_available, merge_in_progress, deferred)
  - `created_at`, `updated_at`
- Validation rules:
  - Unique (`content_item_id`, `locale`).
  - Locale cannot equal `default_locale` for localization branch rows.

## Entity: ContentMetadataTag

- Purpose: Structured curriculum and discovery metadata for search and governance.
- Fields:
  - `id` (UUID, PK)
  - `content_version_id` (UUID, FK -> ContentVersion)
  - `curriculum_standard` (text)
  - `subject` (text)
  - `grade_level` (text)
  - `difficulty` (enum)
  - `learning_objective` (text)
  - `prerequisite_version_ids` (uuid[])
  - `indexed_at` (timestamp)
- Validation rules:
  - Required fields must be present before publish.
  - `prerequisite_version_ids` must refer to published versions.

## Entity: DeprecationRecord

- Purpose: Governs end-of-life progression and replacement mapping.
- Fields:
  - `id` (UUID, PK)
  - `content_item_id` (UUID, FK -> ContentItem)
  - `deprecated_at` (timestamp)
  - `deprecated_by_user_id` (UUID)
  - `eol_date` (date)
  - `replacement_content_item_id` (UUID, nullable FK -> ContentItem)
  - `archive_at` (timestamp, nullable)
  - `status` (enum: deprecated, archived)
- Validation rules:
  - `eol_date` must be >= `deprecated_at::date`.
  - `archive_at` required when `status=archived`.

## Entity: ContentAuditEvent

- Purpose: Article 12-aligned immutable audit log for lifecycle and approval actions.
- Fields:
  - `id` (UUID, PK)
  - `event_type` (enum: create, edit, submit, approve, request_changes, reject, publish, rollback, deprecate, archive, merge_choice)
  - `content_item_id` (UUID)
  - `content_version_id` (UUID, nullable)
  - `workflow_instance_id` (UUID, nullable)
  - `actor_user_id` (UUID)
  - `actor_role` (text)
  - `event_timestamp` (timestamp)
  - `rationale` (text, nullable)
  - `details_json` (jsonb)
- Validation rules:
  - Append-only table policy; no updates/deletes by app role.
  - `rationale` required for rollback, reject, deprecate, and archive events.

## Relationships

- `ContentItem` 1:N `ContentVersion`
- `ContentVersion` 1:1 `ApprovalWorkflowInstance`
- `ApprovalWorkflowInstance` 1:N `ApprovalStepRecord`
- `ContentItem` 1:N `LocalizationBranch`
- `ContentVersion` 1:N `ContentMetadataTag`
- `ContentItem` 1:N `DeprecationRecord`
- `ContentItem` 1:N `ContentAuditEvent`

## State Machines

### Approval Workflow State Machine

- `draft -> submitted -> in_review`
- `in_review -> changes_requested -> draft`
- `in_review -> rejected -> draft` (new cycle required)
- `in_review -> approved -> published`
- `published` is terminal for the submitted version snapshot

Transition guards:
- Required role for current step must match actor role.
- Optimistic lock token must match current `lock_version`.
- Metadata completeness check required before `approved -> published`.

### Lifecycle State Machine (Content Item)

- `drafting -> published`
- `published -> deprecated`
- `deprecated -> archived`

Transition guards:
- Deprecation requires EOL date.
- Archive transition requires EOL reached or approved admin override.

## Derived Views

- `v_current_content_by_locale`: resolves active published version per locale.
- `v_pending_approvals_by_role`: role queue for reviewers.
- `v_localization_sync_gaps`: localization branches behind source updates.
- `v_content_lineage`: recursive lineage for version and branch ancestry.
