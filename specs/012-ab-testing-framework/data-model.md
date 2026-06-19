# Data Model: A/B Testing Framework

## Overview

The model introduces governed experimentation entities for definition, assignment, monitoring, analysis, decisioning, and archival. All learner references are pseudonymous and role-scoped.

## Entities

### 1) Experiment

- Purpose: Canonical record for an experiment lifecycle.
- Key fields:
  - `experiment_id` (UUID, PK)
  - `name` (string, unique within org scope)
  - `hypothesis` (text)
  - `owner_user_id` (string)
  - `target_scope_json` (jsonb; hierarchy/cohort selector)
  - `success_metric` (enum: engagement, mastery, completion, time_on_task, custom)
  - `randomization_ratio_json` (jsonb; default 50/50)
  - `status` (enum: draft, validated, running, paused, completed, decided, archived)
  - `start_at`, `end_at` (timestamp with timezone)
  - `created_at`, `updated_at` (timestamp with timezone)
- Validation rules:
  - Minimum recommended sample size per variant >= 100 (warning threshold, policy-configurable).
  - Duration >= 7 days.
  - Success metric must map to measurable telemetry source.

### 2) ExperimentVariant

- Purpose: Variant definitions attached to an experiment.
- Key fields:
  - `variant_id` (UUID, PK)
  - `experiment_id` (UUID, FK -> Experiment)
  - `variant_key` (string; A/B/C...)
  - `variant_config_json` (jsonb)
  - `traffic_weight` (numeric)
  - `is_control` (boolean)
  - `created_at` (timestamp with timezone)
- Validation rules:
  - Traffic weights sum to 1.0.
  - Exactly one control variant for standard A/B tests.

### 3) VariantAssignment

- Purpose: Persistent learner-to-variant assignment with reproducibility metadata.
- Key fields:
  - `assignment_id` (UUID, PK)
  - `experiment_id` (UUID, FK -> Experiment)
  - `variant_id` (UUID, FK -> ExperimentVariant)
  - `learner_pseudonym` (string)
  - `strata_json` (jsonb; grade/school/mastery bucket)
  - `assignment_method` (enum: random_hash, stratified_hash, manual_exception)
  - `assignment_seed_version` (string)
  - `assigned_at` (timestamp with timezone)
  - `is_excluded_from_analysis` (boolean)
  - `exclusion_reason` (enum: dsr_request, consent_revoked, data_quality, other)
- Validation rules:
  - One active assignment per learner per experiment.
  - Assignment immutable after experiment start except explicit compliance exceptions.

### 4) ExperimentMetricSnapshot

- Purpose: Time-windowed aggregate metrics per experiment/variant/segment.
- Key fields:
  - `snapshot_id` (UUID, PK)
  - `experiment_id` (UUID, FK)
  - `variant_id` (UUID, FK)
  - `window_start`, `window_end` (timestamp with timezone)
  - `metric_name` (string)
  - `sample_size_n` (integer)
  - `mean_value`, `median_value`, `std_dev` (numeric)
  - `ci95_low`, `ci95_high` (numeric)
  - `computed_at` (timestamp with timezone)
- Validation rules:
  - `sample_size_n` must exclude marked DSR exclusions.
  - Snapshot window boundaries cannot overlap for same resolution key.

### 5) SignificanceResult

- Purpose: Statistical comparison outputs for experiment decisions.
- Key fields:
  - `result_id` (UUID, PK)
  - `experiment_id` (UUID, FK)
  - `control_variant_id` (UUID, FK)
  - `treatment_variant_id` (UUID, FK)
  - `p_value` (numeric)
  - `effect_size` (numeric)
  - `effect_interpretation` (enum: negligible, small, medium, large)
  - `absolute_delta`, `relative_delta_pct` (numeric)
  - `is_statistically_significant` (boolean)
  - `is_practically_significant` (boolean)
  - `recommended_action` (enum: continue, stop, investigate, review_for_adoption)
  - `computed_at` (timestamp with timezone)

### 6) SegmentAnalysisResult

- Purpose: Segment-level differential-impact analysis.
- Key fields:
  - `segment_result_id` (UUID, PK)
  - `experiment_id` (UUID, FK)
  - `dimension_key` (string; grade, ses, language, etc.)
  - `dimension_value` (string)
  - `control_mean`, `treatment_mean` (numeric)
  - `delta_pct` (numeric)
  - `p_value` (numeric)
  - `sample_size_n` (integer)
  - `is_opposite_effect` (boolean)
  - `fairness_flag` (enum: none, monitor, high_risk)
  - `computed_at` (timestamp with timezone)

### 7) ExperimentAlert

- Purpose: Runtime safety and fairness alerts.
- Key fields:
  - `alert_id` (UUID, PK)
  - `experiment_id` (UUID, FK)
  - `alert_type` (enum: underperformance, fairness_skew, confound, sample_drift, outage)
  - `severity` (enum: info, warning, critical)
  - `message` (text)
  - `triggered_at` (timestamp with timezone)
  - `acknowledged_by` (string, nullable)
  - `acknowledged_at` (timestamp with timezone, nullable)
  - `resolution_status` (enum: open, acknowledged, resolved)

### 8) ExperimentDecision

- Purpose: Human decision log for experiment progression and adoption.
- Key fields:
  - `decision_id` (UUID, PK)
  - `experiment_id` (UUID, FK)
  - `decision_type` (enum: continue, stop, investigate, adopt_variant, archive)
  - `decision_by` (string)
  - `decision_role` (enum: product_manager, teacher, pedagogy_reviewer, compliance_reviewer)
  - `rationale` (text)
  - `requires_followup` (boolean)
  - `decided_at` (timestamp with timezone)
- Validation rules:
  - `adopt_variant` requires linked teacher + pedagogy reviewer approvals.

### 9) ExperimentArchive

- Purpose: Searchable institutional record of completed experiments.
- Key fields:
  - `archive_id` (UUID, PK)
  - `experiment_id` (UUID, unique FK)
  - `summary_json` (jsonb)
  - `lessons_learned` (text)
  - `keywords` (text[])
  - `final_outcome` (enum: launched, inconclusive, harmful, archived_without_launch)
  - `archived_by` (string)
  - `archived_at` (timestamp with timezone)

### 10) ExperimentAuditEvent

- Purpose: Immutable audit trail for all state changes and sensitive reads.
- Key fields:
  - `audit_event_id` (UUID, PK)
  - `experiment_id` (UUID, FK)
  - `event_type` (enum: state_change, assignment_generated, alert_emitted, decision_recorded, archive_written, data_accessed)
  - `event_actor` (string)
  - `event_actor_role` (string)
  - `event_payload_hash` (string)
  - `event_payload_json` (jsonb)
  - `created_at` (timestamp with timezone)
- Validation rules:
  - Insert-only table; updates/deletes forbidden by DB policy.

## Relationships

- Experiment 1:N ExperimentVariant
- Experiment 1:N VariantAssignment
- Experiment 1:N ExperimentMetricSnapshot
- Experiment 1:N SignificanceResult
- Experiment 1:N SegmentAnalysisResult
- Experiment 1:N ExperimentAlert
- Experiment 1:N ExperimentDecision
- Experiment 1:1 ExperimentArchive
- Experiment 1:N ExperimentAuditEvent

## State Transitions

### Experiment lifecycle

- `draft -> validated`: after schema/metric/cohort checks pass.
- `validated -> running`: after explicit start decision by authorized actor.
- `running -> paused`: temporary halt due to confound or operational issue.
- `running -> completed`: planned duration ends or early stop finalized.
- `completed -> decided`: human decision recorded with rationale.
- `decided -> archived`: archive package persisted and indexed.

### Alert lifecycle

- `open -> acknowledged`: authorized reviewer confirms receipt.
- `acknowledged -> resolved`: action taken and rationale logged.

## Compliance Notes

- Assignment and monitoring records are pseudonymous and role-scoped.
- DSR/consent revocation flows use exclusion markers and recomputation flags.
- Adoption decisions remain human-governed and cannot be automated by statistical output alone.
