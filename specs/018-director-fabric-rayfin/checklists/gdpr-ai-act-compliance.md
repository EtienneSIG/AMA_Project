# GDPR / EU AI Act Compliance Gate — 018 Director Fabric (Rayfin) App

**Feature**: `018-director-fabric-rayfin` | **Phase 0 gate**

> **T013 deploy (demo)** — App deployed to Azure App Service `app-director-fabric-learneu-demo` (North Europe, EU-resident) as the Rayfin Fabric-app surrogate; visual dashboard (KPIs, school benchmarks, NL map, trend) at `/api/overview`. **T031 RAI+QA sign-off**: APPROVED (demo) 2026-06-29 — cut-over verified (backend=fabric-app, fallbackAvailable=false), suppression/scope/no-cohort-leak/EU-residency confirmed. Production still needs live Rayfin CLI `up` + formal sign-off.

## T000 — EU residency + Feature 005 suppression reuse (Accountable: EU AI Act CO + GDPR Children's Data Specialist)

- **Status**: APPROVED (demo) — 2026-06-29
- Target Fabric workspace `EULearn` + capacity confirmed **EU-resident** (West/North Europe).
- Approved reuse of Feature 005 suppression policy: class ≥ 10, establishment ≥ 30, national ≥ 100 + indirect re-identification suppression, re-implemented Fabric-side in the Rayfin backend.
- No new personal-data classes; aggregates only; no cross-EU transfer.

## T000a — Fabric Apps (Rayfin) preview workload (Accountable: EU AI Act CO)

- **Status**: APPROVED (demo) — 2026-06-29
- Preview-risk accepted; mitigations: Power BI Embedded fallback retained until validated parity (`migrationState ≠ complete`) and parity gate before token retirement (T030).

## T000b — Phase 0 gate confirmation (Accountable: Privacy-Preserving ML Engineer)

- **Status**: CONFIRMED (demo) — 2026-06-29
- T000 + T000a recorded; Phase 2 unblocked.

> Demo note: approvals recorded for the demo build; production cut-over still requires the live T030/T031 sign-offs.
