# Teacher Assessment Contract

## Purpose

Define the contract boundaries for rubric assessment, AI-assisted draft generation, teacher approval gating, shared-library reuse, remediation grouping, and at-risk dashboard actions.

## Required Behaviors

- AI-generated rubric/question content is never assignable until teacher review and explicit approval are recorded.
- All generated learner-visible text and teacher qualitative feedback must pass through Content Safety scanning.
- Dashboard intervention suggestions are advisory only; remediation groups require teacher confirmation.
- Shared-library copy operations preserve source lineage but isolate copy edits from source artifact mutation.
- Audit logging captures generation, safety, review, approval/rejection, assignment publication, and remediation actions.

## Rubric Authoring Contract

`POST /api/teacher/assessments/rubrics`

Request fields:
- title
- levelCount
- criteria[]
- weightingMode
- sharedVisibility

Behavior:
- Enforces level and criteria constraints from spec.
- Creates draft rubric; publication is explicit follow-up action.

## AI Draft Generation Contract

`POST /api/teacher/assessments/generate`

Request fields:
- objective
- gradeBand
- outputType (`question_set` | `rubric`)
- count
- templateHint (optional)

Response fields:
- artifactId
- draftText
- modelVersion
- contentSafety
- status

Behavior:
- Runs prohibited-practice input validation (Art. 5 checks).
- Calls Azure OpenAI then Content Safety.
- Returns draft state only; assignment linkage forbidden at this stage.

## Teacher Review and Approval Contract

`POST /api/teacher/assessments/generated/{artifactId}/decision`

Request fields:
- decision (`approve` | `reject` | `needs_edit`)
- editedText (optional)
- reason

Response fields:
- artifactId
- decision
- approvedForAssignment
- decidedAt

Behavior:
- `approvedForAssignment=true` only when decision is `approve` and safety constraints satisfied.
- Rejection and edit rationale logged for audit.

## Shared Library Contract

`POST /api/teacher/library/{sharedAssessmentId}/copy`

Request fields:
- classId
- dueDate
- curriculumMapping

Response fields:
- assessmentCopyId
- sourceAssessmentId
- sourceVersion
- copyStatus

Behavior:
- Produces independent copy record.
- Preserves source linkage for usage analytics/version notification.

## Remediation Group Contract

`POST /api/teacher/remediation/groups`

Request fields:
- classId
- thresholdRule
- learnerIds[]
- sequence[]

Response fields:
- remediationGroupId
- learnerCount
- status

Behavior:
- Requires teacher-confirmed learner membership.
- Learner progress tracked by sequence step and reassessment status.

## At-Risk Dashboard Contract

`GET /api/teacher/analytics/at-risk?classId=<id>&topicId=<id>`

Response fields:
- masteryByTopic
- completionByAssignment
- atRiskLearners[]
- ungradedCount
- recommendedInterventions[]

Behavior:
- Recommendations are informational; endpoint does not mutate learner assignments.
- Includes reason codes for risk flags and refresh timestamp.

## Audit Contract

Minimum event coverage:
- generation_requested
- generation_completed
- content_safety_flagged
- teacher_decision_recorded
- assignment_published
- shared_library_copied
- remediation_group_created
- remediation_cleared

Minimum fields:
- event_id
- event_type
- actor_id
- actor_role
- class_scope
- artifact_id
- assessment_id
- model_version
- safety_verdict
- decision
- correlation_id
- created_at
