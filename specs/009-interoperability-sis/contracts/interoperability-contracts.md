# Interoperability Contracts

## Purpose

Define contract boundaries for integration configuration, runtime processing, sync workflows, and export operations introduced by feature 009.

## Contract 1: Integration Configuration

### `POST /api/admin/integrations`

- Inputs:
  - integrationType (`scorm`, `xapi`, `sis`, `sso`, `calendar`, `gdpr-export`)
  - endpointUrl
  - authMode
  - secretRef (Key Vault URI)
  - tenantScope
- Behavior:
  - validates EU endpoint policy
  - validates auth mode compatibility
  - stores config without secret material
  - emits audit event `integration_config_created`

### `POST /api/admin/integrations/{id}/validate`

- Behavior:
  - runs connector health probe
  - verifies credential retrieval through managed identity
  - returns `valid`, `invalid`, or `warning`
  - emits audit event `integration_config_validated`

## Contract 2: SCORM Runtime

### `POST /api/learner/scorm/{packageId}/launch`

- Behavior:
  - records launch attempt
  - returns signed launch context and player URL
  - emits audit event `scorm_launch`

### `POST /api/learner/scorm/{packageId}/commit`

- Inputs:
  - lessonStatus
  - scoreRaw
  - sessionTime
- Behavior:
  - validates SCORM payload
  - persists attempt result
  - triggers mastery/progress update
  - emits audit event `scorm_commit`

## Contract 3: xAPI Delivery

### Internal queue contract: `xapi.statement.created`

- Required fields:
  - statementId
  - pseudonymousActorId
  - verb
  - object
  - result (optional)
  - context
- Behavior:
  - async delivery worker posts to LRS endpoint
  - retries transient failures
  - moves persistent failures to dead-letter
  - logs all attempts in external API audit stream

## Contract 4: SIS Sync

### `POST /api/admin/sis/sync`

- Inputs:
  - mode (`delta` | `full`)
- Behavior:
  - starts sync job
  - creates job record with correlation ID
  - returns job ID for status polling

### `GET /api/admin/sis/sync/{jobId}`

- Returns:
  - job state and counts
  - conflict count and conflict references

### `POST /api/admin/sis/conflicts/{conflictId}/resolve`

- Inputs:
  - resolution action and rationale
- Behavior:
  - applies manual resolution
  - appends immutable audit event

## Contract 5: SSO Federation

### `POST /api/admin/sso/connectors`

- Inputs:
  - issuer
  - clientId
  - secretRef
  - metadataUrl
  - claimMap
- Behavior:
  - validates issuer metadata
  - validates claim map completeness
  - stores connector config

### Login callback contract

- Inputs: OIDC authorization code / token response
- Behavior:
  - validates token signature and issuer
  - maps external subject to local identity
  - triggers consent gate checks for under-16 learners

## Contract 6: Calendar Sync and Due-Date Adjustment

### `POST /api/admin/calendar/sync`

- Behavior:
  - ingests school calendar events
  - normalizes into school-day model

### Assignment due-date policy

- On assignment save/update:
  - checks calendar for closure conflict
  - auto-adjusts or requests teacher confirmation
  - stores `DueDateAdjustment` record

## Contract 7: GDPR Export

### `POST /api/admin/exports`

- Inputs:
  - learnerId
  - requester
- Behavior:
  - creates export request
  - schedules async collection and package build
  - sets due date and status

### `GET /api/admin/exports/{requestId}`

- Returns:
  - progress state
  - fulfillment and delivery metadata

### Delivery contract

- Export package:
  - encrypted ZIP
  - CSV for structured records
  - PDF for narrative records
  - README with schema and caveats
- Delivery:
  - expiring secure link (default 7 days)

## Cross-cutting controls

- Every contract emits `ExternalApiAuditEvent` entries where external calls occur.
- Every connector contract must include correlation IDs for traceability.
- Contracts must redact secret and sensitive payload values from logs.
- Non-EU external endpoints are rejected during validation and execution.
