# Data Model: Admin PostgreSQL Wake-Up Control

## 1. PostgreSQLServiceState

Represents a snapshot of Azure PostgreSQL Flexible Server lifecycle state returned to admin operators.

| Field | Type | Required | Notes |
|---|---|---|---|
| `serverName` | string | Yes | Azure PostgreSQL flexible server resource name |
| `resourceGroup` | string | Yes | Azure resource group containing the server |
| `state` | enum | Yes | `Ready` \/ `Stopped` \/ `Starting` \/ `Updating` \/ `Unknown` |
| `checkedAt` | ISO-8601 datetime | Yes | UTC timestamp when backend checked ARM state |
| `freshnessSeconds` | integer | Yes | Age of state snapshot in seconds |
| `correlationId` | string | Yes | Request-level correlation id for audit trace |
| `detail` | string | No | Operator-readable details for degraded/error cases |

Validation rules:
- `checkedAt` must be UTC ISO-8601.
- `freshnessSeconds >= 0`.
- `state` must map from ARM `properties.state` or fallback to `Unknown` on parse/control-plane error.

## 2. WakeUpRequest

Operator-initiated command to start a stopped PostgreSQL server.

| Field | Type | Required | Notes |
|---|---|---|---|
| `requestedAt` | ISO-8601 datetime | Yes | UTC request timestamp |
| `actorRole` | string | Yes | Admin/operator role from authenticated session |
| `actorId` | string | No | Pseudonymous operator identifier if already present in system |
| `correlationId` | string | Yes | Generated per request for traceability |
| `action` | enum | Yes | Must be `start` |

Validation rules:
- Request accepted only for authenticated role allowed by `auth.gateMiddleware(['admin'])`.
- `action` hardcoded to `start`.

## 3. WakeUpOperationResult

Outcome returned by wake-up endpoint.

| Field | Type | Required | Notes |
|---|---|---|---|
| `outcome` | enum | Yes | `accepted` \/ `in-progress` \/ `already-running` \/ `failed` |
| `state` | enum | Yes | Latest known lifecycle state after handling request |
| `message` | string | Yes | Operator guidance for next step |
| `correlationId` | string | Yes | For logs and support escalation |
| `acknowledgedAt` | ISO-8601 datetime | Yes | UTC backend acknowledgement timestamp |
| `retryAfterSeconds` | integer | No | Suggested polling delay when startup is in progress |

State transitions:
- `Stopped` + wake-up request -> `accepted` then subsequent status -> `Starting` -> `Ready`.
- `Starting` + wake-up request -> `in-progress` (no duplicate ARM start).
- `Ready` + wake-up request -> `already-running`.
- ARM error/permission failure -> `failed` with remediation detail.

## 4. OperationalAuditEvent

Persistent operational event for compliance and troubleshooting.

| Field | Type | Required | Notes |
|---|---|---|---|
| `eventType` | enum | Yes | `postgres.status.checked` \/ `postgres.wakeup.requested` \/ `postgres.wakeup.result` |
| `timestamp` | ISO-8601 datetime | Yes | UTC event time |
| `actorRole` | string | Yes | Role only (admin) |
| `correlationId` | string | Yes | Correlates status + wake-up sequence |
| `outcome` | string | Yes | Success/failure/idempotent state |
| `detail` | string | No | Error message or guidance (no new personal data) |

Data governance constraints:
- No new personal-data classes introduced.
- Do not store raw access tokens, request bodies with secrets, or non-essential user identifiers.
