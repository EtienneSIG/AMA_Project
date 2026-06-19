# Data Model: Teacher Assessment, AI Draft Governance, and At-Risk Intervention

## Rubric

- Purpose: Structured assessment rubric used by teachers for grading and feedback.
- Key fields: rubric_id, title, creator_teacher_id, level_count (3-5), criterion_count (2-5), criteria_json, weighting_mode, status, shared_visibility, created_at, updated_at.
- Rules: Must satisfy level/criterion constraints; only published rubrics can be assigned.

## RubricScore

- Purpose: Captures teacher scoring outcome for a learner submission against a rubric.
- Key fields: rubric_score_id, learner_id, assessment_id, rubric_id, criterion_scores_json, overall_level, mastery_percent, teacher_feedback_text, feedback_safety_status, scored_by_teacher_id, scored_at.
- Rules: Feedback must pass Content Safety policy before final commit; score updates are versioned/auditable.

## SharedAssessment

- Purpose: Library-managed reusable assessment artifact with discoverability metadata.
- Key fields: shared_assessment_id, source_assessment_id, source_version, owner_teacher_id, title, description, grade_tag, subject_tag, skill_tags, difficulty_level, publish_status, usage_count, average_performance, governance_owner_id, reviewed_at.
- Rules: Copy operations create independent class-owned artifacts; source edits do not mutate existing copies.

## AssessmentCopy

- Purpose: Class-specific copy derived from a shared assessment.
- Key fields: assessment_copy_id, shared_assessment_id, destination_class_id, copied_by_teacher_id, due_date, localized_edits_json, curriculum_mapping_json, created_at.
- Rules: Mutations apply only to the copy; lineage retained for analytics and version notifications.

## RemediationGroup

- Purpose: Teacher-managed learner group for targeted catch-up workflow.
- Key fields: remediation_group_id, class_id, created_by_teacher_id, threshold_rule, learner_members_json, sequence_definition_json, status, created_at, updated_at.
- Rules: Membership is always teacher-confirmed; automated suggestions cannot auto-enroll learners.

## RemediationProgress

- Purpose: Tracks each learner's progress through remediation sequence steps.
- Key fields: remediation_progress_id, remediation_group_id, learner_id, step_id, step_status, completion_timestamp, reassessment_score, cleared_flag.
- Rules: `cleared_flag=true` requires reassessment score meeting configured threshold.

## AIGeneratedArtifact

- Purpose: Stores generated rubric/question drafts and lifecycle state.
- Key fields: artifact_id, artifact_type (rubric|question_set|remediation_suggestion), objective_text_hash, bounded_prompt_context, model_deployment, model_version, generated_text, generation_status, template_version, created_by_teacher_id, created_at.
- Rules: Artifact cannot be learner-visible until approval record exists and safety status is pass/accepted-with-review.

## ContentSafetyVerdict

- Purpose: Captures Content Safety evaluation result for generated or teacher-authored content.
- Key fields: verdict_id, artifact_id (nullable for comments), content_type, category_scores_json, flagged_categories_json, verdict_status, requires_manual_review, scanned_at.
- Rules: Flagged verdict requires explicit teacher acknowledgment before continued publish path.

## TeacherApproval

- Purpose: Immutable approval/rejection record for AI-generated artifacts.
- Key fields: approval_id, artifact_id, teacher_id, decision (approve|reject|needs_edit), decision_reason, edited_text_hash, approved_for_assignment, decided_at.
- Rules: Only `approve` with `approved_for_assignment=true` can unlock assignment linkage.

## AtRiskDashboardSnapshot

- Purpose: Aggregated class analytics used to display mastery, completion, and intervention cues.
- Key fields: snapshot_id, class_id, topic_id, mastery_percent, completion_rate, at_risk_count, ungraded_count, recommendation_summary, computed_at.
- Rules: Snapshot is advisory and cannot trigger autonomous learner interventions.

## AuditLogEvent

- Purpose: High-risk traceability for generation, safety, approval, assignment, and remediation actions.
- Key fields: event_id, event_type, actor_id, actor_role, class_scope, learner_scope_hash, artifact_id, assessment_id, model_version, safety_verdict, decision, correlation_id, created_at.
- Rules: Must support reconstruction of who approved what, when, and under which safety outcome.

## TemplateCacheEntry

- Purpose: Reusable prompt-template fragment cache for rubric/question generation consistency.
- Key fields: cache_key, template_family, template_version, pedagogical_tags_json, locale, hash, owner_role, review_status, expires_at, last_used_at.
- Rules: Only approved templates can be active; deprecated templates are not used for new generation calls.
