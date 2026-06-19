# Implementation Plan: Interoperability - SCORM, xAPI, SIS Integration

**Branch**: `009-interoperability-sis` | **Date**: 2026-06-18 | **Spec**: `/specs/009-interoperability-sis/spec.md`

**Input**: Feature specification from `/specs/009-interoperability-sis/spec.md`

## Summary

Deliver a unified interoperability layer that supports SCORM 1.2/2004 package playback, xAPI statement capture and forwarding, SIS roster synchronization, SSO federation, school-calendar synchronization, and GDPR Article 15 export orchestration. The implementation extends the existing LearnEU multi-app Node.js architecture with integration adapters, credential-safe connector configuration, asynchronous sync jobs, and auditable external call pipelines.

The plan emphasizes strict EU-only data boundaries, no cross-EU transfer, integration-specific data minimization, immutable audit logs for all external API calls, and secure credential storage using managed identity plus Key Vault references.

## Technical Context

**Language/Version**: Node.js 22.x, SQL (PostgreSQL), PowerShell 7+ for operational scripts

**Primary Dependencies**: `express`, `pg`, `@azure/identity`, Azure Key Vault SDK, SCORM runtime adapter (`pipwerks`-style browser API wrapper or equivalent), xAPI statement builder/validator, OAuth 2.0/OIDC client library for SSO federation, provider SDKs for Google/Microsoft calendar APIs

**Storage**: EU-hosted PostgreSQL for integration metadata, sync state, and audit events; Azure Blob Storage (EU region) for SCORM package assets; Azure Key Vault (EU region) for external connector secrets

**Testing**: Extended `demo/scripts/acceptance_tests.ps1`, integration contract checks, sync replay tests, and compliance walkthrough from `specs/009-interoperability-sis/quickstart.md`

**Target Platform**: Azure App Service Linux apps, Azure Database for PostgreSQL Flexible Server, Azure Key Vault, Azure Blob Storage, Azure AD B2C / external OIDC identity providers

**Project Type**: Web application with background sync workers and external API integrations

**Performance Goals**:
- SCORM completion persistence <= 5 seconds p95 after learner submit
- SIS daily sync <= 30 minutes for <= 2,000 learners
- xAPI delivery success >= 95% with retry and dead-letter visibility
- SSO success >= 99% for valid identities
- Calendar due-date adjustment completes during assignment save path <= 2 seconds p95
- GDPR export request completion <= 30 days with operational median <= 24 hours

**Constraints**:
- EU residency only (West Europe / North Europe) for all personal data classes
- No cross-EU transfer to external connectors; non-EU endpoints are blocked at configuration time
- Data minimization per integration (only required fields per connector)
- Secrets must never be stored in plaintext in DB, logs, or source control
- All external API calls must be audit logged with correlation ID, outcome, and actor/system source
- Fallback behavior required when third-party dependencies are unavailable

**Scale/Scope**:
- Typical school profile: <= 2,000 learners, <= 200 teachers, daily SIS delta sync
- Integration connectors: SCORM, LRS/xAPI, SIS API, SSO IdP, calendar provider, export delivery
- Initial rollout: one connector of each type enabled per tenant/school, with future multi-connector support

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | Connector onboarding enforces EU endpoints only, blocks non-EU hosts, and limits payloads to required fields per adapter. |
| II. GDPR Art. 8 | PASS | SIS/SSO onboarding preserves under-16 consent workflow trigger; no learner access is granted before consent state is satisfied. |
| III. EU AI Act high-risk discipline | PASS | Integration layer is non-scoring but still includes Art. 12 traceability and Art. 15 robustness controls for external dependency failures. |
| IV. Teacher-in-the-loop | PASS | Calendar changes and SIS conflict resolutions remain teacher/admin reviewable; no autonomous grading or placement changes. |
| V. Pedagogical sign-off | PASS | Calendar due-date adjustment and interoperability-triggered assignment behavior require Learning Sciences review prior to release. |
| VI. Outcome-contract driven | PASS | Automation reduces manual admin work (teacher/admin time reduction) and improves continuity during school transitions. |
| VII. Reproducible, spec-driven delivery | PASS | Artifacts and runbook are produced under `specs/009-interoperability-sis/` before implementation. |

**EU AI Act articles touched**:
- **Art. 12 (Record-keeping and traceability)**: immutable logs for all external API interactions, retries, failures, and operator actions.
- **Art. 15 (Accuracy, robustness, cybersecurity)**: connector health checks, retry with backoff, dead-letter paths, idempotent sync semantics, and credential hardening.

**DPIA delta**:
Moderate processing extension due to additional external processing partners (SIS providers, LRS providers, calendar providers, SSO IdPs). Required updates:
- Processor inventory updates and DPA verification per connector
- Data flow maps showing each external transfer and legal basis
- Retention and minimization policy per integration payload
- Incident and revocation process for connector compromise

**Human oversight surface**:
- Admins approve connector onboarding and endpoint validation
- SIS identity conflicts are queued for manual review
- Teachers can confirm/override holiday due-date adjustments
- GDPR export requests are initiated and verified by authorized staff

## Project Structure

### Documentation (this feature)

```text
specs/009-interoperability-sis/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── interoperability-contracts.md
└── tasks.md
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── admin/
│   │   ├── server.js                          # integration config and admin orchestration routes
│   │   ├── db/
│   │   │   ├── index.js                       # connector config, sync logs, audit writes
│   │   │   └── schema.sql                     # integration tables and indexes
│   │   └── public/
│   │       └── integrations/                  # SCORM/SIS/SSO/calendar/xAPI admin screens
│   ├── learner-web/
│   │   ├── server.js                          # SCORM launch, completion callbacks, due-date rendering
│   │   └── public/                            # SCORM player shell and learner due-date views
│   ├── teacher-console/
│   │   └── server.js                          # calendar override and class impact visibility
│   └── _shared/
│       ├── integrations/
│       │   ├── scorm-adapter.js               # SCORM runtime and package manifest handling
│       │   ├── xapi-adapter.js                # xAPI statement build/sign/send with retry
│       │   ├── sis-adapter.js                 # roster fetch, diff, and apply
│       │   ├── sso-federation.js              # OIDC/ADFS federation metadata and claim mapping
│       │   ├── calendar-adapter.js            # school-day validation and due-date adjustment
│       │   └── gdpr-export.js                 # export orchestration and secure package delivery
│       └── security/
│           └── secret-provider.js             # managed identity + Key Vault secret resolution
├── scripts/
│   ├── acceptance_tests.ps1                   # integration flow verification
│   ├── run_sis_sync.ps1                       # operator-triggered sync
│   └── run_gdpr_export.ps1                    # operator-triggered export
└── data/
    └── interoperability/                      # test fixtures for SCORM manifests, SIS payloads, xAPI samples
```

**Structure Decision**: keep integration logic in shared adapters consumed by existing apps, avoiding a new service boundary in this increment. This minimizes deployment complexity while preserving clear adapter seams for future extraction.

## Phase 0: Research

Research outcomes are captured in `specs/009-interoperability-sis/research.md` and resolve:
- SCORM adapter strategy and package execution boundary
- xAPI envelope schema, PII minimization, and retry semantics
- SIS sync conflict resolution and idempotency strategy
- SSO federation profile (ADFS/OIDC) and account-linking policy
- Calendar API behavior differences and holiday-override policy
- GDPR export package format, encryption, and delivery controls
- Credential storage and rotation model using Key Vault
- External API audit event model and retention policy

## Phase 1: Design & Contracts

### Data Model

Defined in `specs/009-interoperability-sis/data-model.md` with entities for connector configs, sync jobs, SCORM/xAPI records, SSO links, calendar adjustments, and export requests.

### Interface Contracts

Defined in `specs/009-interoperability-sis/contracts/interoperability-contracts.md` with admin, worker, and user-facing contract boundaries across all integrations.

### Quickstart

Defined in `specs/009-interoperability-sis/quickstart.md` with end-to-end validation paths for SCORM, xAPI, SIS, SSO, calendar sync, and GDPR export.

## Implementation Phases

### Phase 2 - Connector Foundations and Secret Handling

Implement integration configuration APIs, Key Vault-backed secret resolution, endpoint EU-region validation, and baseline external call audit pipeline.

### Phase 3 - SCORM and xAPI Delivery

Implement SCORM package lifecycle (upload, parse, launch, completion capture) and xAPI statement generation/delivery with retry and dead-letter visibility.

### Phase 4 - SIS Sync and SSO Federation

Implement scheduled SIS roster synchronization, identity linkage, conflict queue handling, and SSO federation setup (ADFS/OIDC profiles).

### Phase 5 - Calendar Sync and Scheduling Guardrails

Implement school calendar ingestion, due-date adjustment logic, teacher confirmation flows, and assignment UX updates.

### Phase 6 - GDPR Export Orchestration

Implement export request workflow, package generation in open formats, zip encryption, expiring secure link delivery, and fulfillment audit reporting.

### Phase 7 - Verification, Reliability, and Compliance Evidence

Run acceptance and resilience tests, verify audit completeness, validate DPIA updates for all external partners, and publish deployment runbook evidence.

## Phase 1 Post-Design Constitution Re-Check

| Checkpoint | Result |
|---|---|
| EU-only connector endpoint policy enforced | PASS |
| Data minimization defined per integration payload | PASS |
| External API calls fully audit logged | PASS |
| Secrets resolved via managed identity + Key Vault | PASS |
| Teacher/admin oversight preserved for sensitive transitions | PASS |
| Art. 12 and Art. 15 controls mapped to implementation | PASS |

No constitution violations require waiver.

## Complexity Tracking

No constitution violations or justified complexity exceptions identified.
