# Research: Admin PostgreSQL Wake-Up Control

## Decision 1: Use Azure ARM control plane from admin backend with managed identity

- Decision: Reuse the existing ARM helper pattern in `demo/apps/admin/server.js` and call PostgreSQL Flexible Server ARM endpoints with `DefaultAzureCredential` from `@azure/identity`.
- Rationale: The admin app already authenticates to ARM with managed identity for App Service operations. Reusing this avoids credential sprawl, preserves least-privilege RBAC, and keeps operational controls in a single trusted admin surface.
- Alternatives considered:
  - Direct `az` CLI invocation from backend: rejected due to runtime coupling and shell/process risk.
  - Separate Azure Function: rejected to avoid extra deployment surface for a narrow operational action.

## Decision 2: Model wake-up as asynchronous + idempotent operation

- Decision: Status endpoint reports current server lifecycle state. Wake-up endpoint returns one of explicit outcomes: `accepted`, `in-progress`, `already-running`, `failed`.
- Rationale: PostgreSQL start is long-running and control-plane dependent. Operators need immediate acknowledgement plus re-pollable status, not synchronous completion.
- Alternatives considered:
  - Blocking wake-up call until `Ready`: rejected because startup can exceed request timeouts.
  - Always issuing start regardless of state: rejected because it hides state truth and weakens idempotency.

## Decision 3: Keep audit logging in existing Postgres-backed admin operational logs

- Decision: Record status checks and wake-up attempts as operational audit events using existing DB logging patterns, storing actor role, timestamp, outcome, and correlation id.
- Rationale: Meets FR-007 and AI Act Art. 12 traceability while avoiding new storage systems.
- Alternatives considered:
  - Add new external telemetry sink only for this feature: rejected as unnecessary complexity.
  - No persistent audit events: rejected as non-compliant with explicit logging requirement.

## Decision 4: Add scripted fallback in `demo/scripts` for UI outage scenarios

- Decision: Add `demo/scripts/postgres_wakeup.ps1` to check state, request start, and poll readiness; reference it from runbook docs.
- Rationale: Satisfies FR-008 and supports reproducible incident recovery even when admin UI is unavailable.
- Alternatives considered:
  - Documentation-only fallback with manual CLI commands: rejected as more error-prone and less repeatable.

## Decision 5: Compliance posture remains operational-only (no new AI feature)

- Decision: Treat this as a reliability/operations control with explicit constitutional mapping: GDPR Art. 8 unchanged, AI Act Articles 12/14 supported through logging and human-initiated action.
- Rationale: The feature does not alter model behavior, learner outcomes, or consent flows.
- Alternatives considered:
  - Treat as full new AI high-risk feature package: rejected because no new AI function is introduced.

## Clarifications Resolved

- Managed identity flow for ARM calls: resolved (existing pattern already in admin backend).
- API contract surface: resolved (`GET status`, `POST wake-up`).
- Script fallback scope: resolved (`status`, `start`, `poll`, `exit codes`).
- Data governance impact: resolved (no new data class; operational metadata only).
