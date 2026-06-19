# Data Model: Interoperability - SCORM, xAPI, SIS Integration

## IntegrationConfig

- Purpose: Canonical configuration for each external connector.
- Key fields: integration_id, tenant_id, integration_type, endpoint_url, auth_mode, secret_ref, status, eu_region_validated, created_by, created_at, updated_at.
- Validation rules:
  - endpoint_url must resolve to approved EU-hosted domain/IP ranges.
  - auth_mode allowed: oauth2, api_key, client_credentials.
  - secret_ref must reference Key Vault URI; plaintext values prohibited.
- State transitions: draft -> validated -> enabled -> suspended -> disabled.

## ExternalApiAuditEvent

- Purpose: Immutable audit trail for all external API calls and admin connector actions.
- Key fields: event_id, integration_id, actor_type, actor_id, correlation_id, operation, request_hash, response_code, outcome, retry_count, timestamp, pii_classification.
- Validation rules:
  - correlation_id required for every outbound request.
  - request/response payloads are hashed or redacted; no raw secrets in logs.
- State transitions: append-only (no update/delete).

## SCORMPackage

- Purpose: Metadata for uploaded SCORM 1.2/2004 packages.
- Key fields: package_id, tenant_id, standard_version, manifest_path, launch_path, objective_tags, upload_actor, uploaded_at, parse_status.
- Validation rules:
  - standard_version allowed: scorm_1_2, scorm_2004.
  - launch_path must be present after successful parse.
- State transitions: uploaded -> parsed -> enabled -> retired.

## SCORMAttempt

- Purpose: Learner runtime outcome record for SCORM sessions.
- Key fields: attempt_id, package_id, learner_id, started_at, completed_at, lesson_status, score_raw, time_spent_seconds, sync_status.
- Validation rules:
  - lesson_status values constrained to SCORM completion domain.
  - score_raw range 0-100 when provided.
- State transitions: launched -> in_progress -> completed|abandoned -> persisted.

## XAPIStatementEnvelope

- Purpose: Delivery-tracked xAPI statement abstraction.
- Key fields: statement_id, tenant_id, actor_pseudonym, verb, object_id, context_ref, result_score, queued_at, delivered_at, delivery_status, failure_reason.
- Validation rules:
  - actor must be pseudonymous unless explicit legal basis exists for identifiable actor.
  - delivery_status allowed: queued, sent, failed, dead_letter.
- State transitions: built -> queued -> sent|failed -> dead_letter (optional).

## SISSyncJob

- Purpose: Scheduled or manual SIS roster sync execution record.
- Key fields: sync_job_id, integration_id, started_at, completed_at, mode, records_seen, records_upserted, records_conflicted, outcome, checksum.
- Validation rules:
  - mode allowed: scheduled_delta, manual_full, manual_delta.
  - checksum recorded for replay safety and idempotency.
- State transitions: queued -> running -> completed|failed|partial.

## SISConflict

- Purpose: Manual review queue for identity/class enrollment conflicts.
- Key fields: conflict_id, sync_job_id, conflict_type, source_identifier, candidate_entities, resolution_status, resolved_by, resolved_at, rationale.
- Validation rules:
  - no auto-resolution for multi-match identity conflicts.
- State transitions: open -> in_review -> resolved|dismissed.

## SSOIdentityLink

- Purpose: Mapping between external IdP subject and LearnEU user identity.
- Key fields: link_id, integration_id, idp_subject, local_user_id, role, linked_at, link_status, claim_snapshot_hash.
- Validation rules:
  - one active idp_subject to one local_user_id per integration.
- State transitions: pending -> linked -> suspended -> revoked.

## CalendarSyncEvent

- Purpose: Normalized school-calendar closure/open-day events.
- Key fields: calendar_event_id, integration_id, school_id, event_date, event_type, source_etag, normalized_at.
- Validation rules:
  - event_type allowed: school_open, school_closed, holiday, exceptional_day.
- State transitions: ingested -> normalized -> applied|ignored.

## DueDateAdjustment

- Purpose: Record of assignment due-date shift due to calendar policy.
- Key fields: adjustment_id, assignment_id, old_due_at, new_due_at, adjustment_reason, teacher_override_required, confirmed_by, confirmed_at.
- Validation rules:
  - new_due_at must be >= old_due_at unless explicit manual override rationale is provided.
- State transitions: proposed -> auto_applied|pending_teacher -> confirmed|reverted.

## DataExportRequest

- Purpose: GDPR Art. 15 export request lifecycle tracking.
- Key fields: export_request_id, learner_id, requester_type, requested_at, due_by, status, package_uri, package_encrypted, download_expires_at, fulfilled_at.
- Validation rules:
  - due_by <= requested_at + 30 days.
  - package_encrypted must be true before delivery.
- State transitions: submitted -> collecting -> packaging -> ready -> delivered -> expired|cancelled.

## Data classes and minimization map

- SCORM: learner_id, attempt telemetry, score/time (no unnecessary profile attributes).
- xAPI: pseudonymous actor, activity event, score context (drop direct identifiers where possible).
- SIS: roster identity and class membership only.
- SSO: federation claims required for login/linking only.
- Calendar: school-day closure metadata only.
- Export: full learner portable record for lawful request scope only.
