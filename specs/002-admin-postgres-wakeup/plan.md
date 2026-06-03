# Implementation Plan: Admin PostgreSQL Wake-Up Control

**Branch**: `002-admin-postgres-wakeup` | **Date**: 2026-06-03 | **Spec**: `/specs/002-admin-postgres-wakeup/spec.md`

**Input**: Feature specification from `/specs/002-admin-postgres-wakeup/spec.md`

## Summary

Add an admin-operated recovery path to detect and wake Azure PostgreSQL Flexible Server when auto-stopped. Implementation extends the existing Node.js admin app with role-gated endpoints and UI controls, uses Azure ARM through `@azure/identity` managed identity credentials (no secrets in app code), records operational audit events, and updates runbook scripts/docs under `demo/scripts` for fallback when UI is unavailable.

## Technical Context

**Language/Version**: Node.js 22.x (admin app runtime), PowerShell 7+ (demo operations scripts)

**Primary Dependencies**: `express`, `@azure/identity`, native `fetch` in Node 22, existing auth gate middleware in `demo/apps/admin/auth.js`, Azure CLI (`az`) for fallback scripts

**Storage**: Azure Database for PostgreSQL Flexible Server (existing), existing Postgres-backed admin audit tables via `demo/apps/admin/db/index.js`; no new data class

**Testing**: App-level API checks using existing `demo/scripts/acceptance_tests.ps1` pattern, manual operator workflow validation from `quickstart.md`

**Target Platform**: Azure App Service (Linux) for `demo/apps/admin`, Azure ARM control plane for PostgreSQL lifecycle operations, operator execution from PowerShell on Windows/macOS/Linux

**Project Type**: Web application (server-rendered static admin UI + JSON API backend) plus operational PowerShell scripts

**Performance Goals**:
- Status endpoint returns lifecycle state in <= 2 seconds p95 under normal ARM response conditions
- Wake-up request acknowledgement in <= 3 seconds (async server start can take minutes)
- Operator can determine current DB state in <= 30 seconds from admin console open (SC-001)

**Constraints**:
- EU region boundaries unchanged (West Europe/North Europe only)
- Managed identity authentication only for ARM calls; no embedded credentials
- Idempotent start behavior for `Ready`/`Starting` states
- No learner-facing or grading decision impact

**Scale/Scope**:
- Single PostgreSQL Flexible Server per demo resource group
- Single admin portal (`demo/apps/admin`) with admin-only access
- Incident-recovery operations volume is low (human-triggered, bursty during demos)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Uses only operational infrastructure metadata (server state, operation result, timestamp, correlation id). No new personal data class, no cross-EU transfer. |
| II. GDPR Art. 8 | PASS | Admin-only operational feature; no new child-data processing path or consent surface change. DPIA delta recorded as "operational reliability control only". |
| III. EU AI Act high-risk discipline | PASS | Feature is non-model operational control. Still preserves Art. 12 logging and Art. 14 human oversight by requiring explicit admin initiation and auditable events. |
| IV. Teacher-in-the-loop | PASS | No autonomous learner-impacting decisions; no grading/placement/content-access changes. |
| V. Pedagogical sign-off | PASS | Non-pedagogical surface. Learning logic untouched; no new pedagogy review dependency. |
| VI. Outcome-contract driven | PASS | Improves reliability and operator time-to-recovery, supporting teacher/admin time reduction objective. |
| VII. Reproducible, spec-driven delivery | PASS | Plan includes scripted fallback and docs in `demo/scripts` and `specs/002-admin-postgres-wakeup/quickstart.md`. |

**EU AI Act articles touched**: Art. 12 (logging/traceability for control action), Art. 14 (human oversight of operational recovery action).

**DPIA delta**: Low-risk operational delta only. No new data subjects, data classes, or processing purpose. Update compliance note to record new admin control/audit event type.

**Human oversight surface**: Admin operator explicitly checks status and triggers wake-up; backend does not auto-start without human action.

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-postgres-wakeup/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── admin-postgres-wakeup.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   └── admin/
│       ├── server.js                 # Add ARM-backed postgres status/wakeup endpoints
│       ├── auth.js                   # Reuse existing admin gate middleware
│       ├── db/
│       │   ├── index.js              # Add/extend operational audit write helper(s)
│       │   └── schema.sql            # Add audit table/columns only if required
│       └── public/
│           ├── index.html            # Add Postgres state panel + wake-up control
│           └── csrf.js               # Reuse existing CSRF flow for POST wake-up
├── scripts/
│   ├── acceptance_tests.ps1          # Add assertion for postgres state endpoint/wakeup flow
│   ├── run_demo.ps1                  # Add admin-led wake-up runbook step
│   └── postgres_wakeup.ps1           # New fallback script: status + start + readiness polling
└── README.md                         # Link operator flow and fallback script
```

**Structure Decision**: Keep implementation inside the existing admin web app and existing operations script area. No new service or package is introduced; this minimizes deployment and compliance surface area.

## Phase 0: Research

Research outcomes are captured in `specs/002-admin-postgres-wakeup/research.md` and resolve all technical clarifications:

- ARM API pattern and API versions for PostgreSQL flexible-server state and start action
- Idempotent wake-up behavior mapping (`Ready`, `Stopped`, `Starting`)
- Audit event schema without introducing new personal-data classes
- Fallback operational script design for operators

## Phase 1: Design & Contracts

### Data Model

Defined in `specs/002-admin-postgres-wakeup/data-model.md`:

- `PostgreSQLServiceState`
- `WakeUpRequest`
- `WakeUpOperationResult`
- `OperationalAuditEvent`

### Interface Contracts

API contract defined in:

- `specs/002-admin-postgres-wakeup/contracts/admin-postgres-wakeup.openapi.yaml`

Endpoints include admin-only status retrieval and wake-up trigger with explicit idempotent outcomes.

### Quickstart

Operator flow and validation steps are defined in:

- `specs/002-admin-postgres-wakeup/quickstart.md`

Includes admin UI path, scripted fallback path, expected state transitions, and escalation guidance.

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| No new data class introduced | PASS |
| No cross-EU transfer introduced | PASS |
| Human-triggered action only (no autonomous wake-up) | PASS |
| Auditability for status/wake-up attempts | PASS |
| Learner/pedagogical flow unchanged | PASS |

No constitution violations require waiver.

## Complexity Tracking

No constitution violations or structural complexity exceptions identified.

