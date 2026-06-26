# Implementation Plan: Director Portal — Native Fabric (Rayfin) Analytics App

**Branch**: `018-director-fabric-rayfin` | **Date**: 2026-06-26 | **Spec**: `/specs/018-director-fabric-rayfin/spec.md`

**Input**: Feature specification from `/specs/018-director-fabric-rayfin/spec.md`

## Summary

Replace the director portal's **Power BI Embedded** reporting surface with a **Rayfin Fabric App** — a full-stack app built on Microsoft's **Fabric Apps framework ("Rayfin", preview)** where **Microsoft Fabric is the backend**. The app is scaffolded and deployed with the Rayfin CLI (`npm create @microsoft/rayfin` → `npx rayfin up`); its backend/data model is **hosted on Fabric** (`rayfin/data/` → Fabric DB, configured in `rayfin/rayfin.yml`) reading the EU-resident analytics already mirrored from PostgreSQL (`demo/ml/fabric_mirroring/`), and its static frontend is **surfaced/embedded in `demo/apps/director-portal/`**. The director sees at least parity with today's KPIs (class trends, benchmarks, outcome-gap, small-cohort suppression) with equal or better interactivity. Because the backend now lives in the Rayfin Fabric App, **aggregation, row-level scope, and small-cohort suppression are enforced in the Fabric backend** (data model + backend queries) before any aggregate reaches the frontend — reusing Feature 005's approved thresholds/rules, re-implemented Fabric-side, so compliance controls remain backend controls. Migration is **configuration-driven and reversible**: the director portal's reporting surface switches (`powerbi-embedded` | `fabric-app`) and keeps Power BI Embedded as a fallback until validated parity, after which Power BI tokens are retired. No new autonomous or learner-impacting AI decisioning is introduced; reporting stays advisory and human-led, and the entire data path stays inside EU-resident Fabric capacity.

> **Relationship to Feature 005 (coordination)**: This feature **supersedes the reporting _backend_ of Feature 005** (Director Reporting Benchmarks) by replacing Power BI Embedded with the Rayfin Fabric App. Feature 005 is **already implemented** and remains the source of the approved metric/benchmark/suppression definitions and the parity baseline. 018 and 005 **share** `demo/apps/director-portal/` files (`config/reporting.json`, `reporting/report-config.js`, `server.js`, `public/index.html`); 018 tasks **EXTEND these additively** and reuse 005's suppression policy — they must **not** rework or regress 005's completed behaviour. The `backend` switch keeps 005's Power BI path available as the fallback until 018 reaches validated parity.

## Technical Context

**Language/Version**: Node.js + npm (Rayfin CLI runtime); the Rayfin app frontend is generated from a Rayfin template (TypeScript/JS SPA) with its data model in `rayfin/data/`; the host `demo/apps/director-portal/` remains Node.js 22.x for embedding/auth.

**Primary Dependencies**: `@microsoft/rayfin` (Fabric Apps CLI/framework, preview) for scaffold/deploy (`rayfin login`, `rayfin up`, `rayfin up db apply`, `rayfin up staticapp deploy`); the **Fabric Apps workload enabled in the tenant**. Host portal keeps `express`, `cookie-parser`, `pg`, `@azure/identity`. Legacy `powerbi-client` / embed-token issuance is retained **behind config** for fallback only.

**Storage**:
- **Source of truth**: existing Azure Database for PostgreSQL Flexible Server (`pg-learneu-demo`, EU-resident).
- **Reporting backend**: the **Rayfin Fabric App backend on Microsoft Fabric (EU-resident capacity)** — data model in `rayfin/data/` reading the existing EU-resident mirrored analytics (`demo/ml/fabric_mirroring/`). Aggregates only; no new personal-data categories.
- **Config**: `rayfin/rayfin.yml` (app services + deploy settings) for the Fabric app; `demo/apps/director-portal/config/reporting.json` extended with the backend selector + the embedded Rayfin app URL/Fabric item link.

**Testing**: Rayfin CLI dry-run + status (`npx rayfin up --dry-run`, `npx rayfin up status --json`) for deploy validation; extend `demo/scripts/verify-director-portal.ps1` and `acceptance_tests.ps1` with: embedded-app render, parity-vs-baseline, scope enforcement, small-cohort suppression (Fabric-backend-enforced), EU-residency assertion (Fabric workspace/capacity region), capacity-unavailable fallback, and rollback. Plus the walkthrough in `specs/018-director-fabric-rayfin/quickstart.md`.

**Target Platform**: **Microsoft Fabric (EU-resident capacity/workspace)** hosts the Rayfin app backend + static frontend; Azure App Service Linux (`app-director-portal-learneu-demo`) embeds/links it. Existing demo networking + managed-identity auth for the host portal.

**Project Type**: A **Fabric App (Rayfin)** — Fabric-hosted backend + static frontend — embedded in an existing web portal surface.

**Performance Goals**:
- Reporting page initial render p95 **≤ 5 s**; filter/period change p95 **≤ 2 s** (SC-005).
- Suppression + scope add **≤ 200 ms p95** overhead beyond the Fabric backend query.
- Backend returns explicit result states (`ready`, `suppressed_*`, `scope_denied`, `fabric_unavailable`, `fallback_powerbi`) rather than empty/error-only payloads.

**Constraints**:
- EU data residency only; the Fabric **workspace + capacity** hosting the Rayfin app MUST be EU-resident; **no cross-EU transfer**.
- **Fabric Apps is in preview** — tenant must enable the workload; preview status is a tracked delivery risk.
- Aggregated-only; no learner-level rows exposed; reuse approved K-anonymity thresholds (class ≥ 10, establishment ≥ 30, national ≥ 100) + indirect re-identification suppression from Feature 005, re-implemented in the Fabric backend.
- Row-level/role scope enforced in the **Fabric backend** (fail-closed) before data reaches the frontend.
- Reporting is read-only and advisory; no automated learner decisions.
- Reversible migration: reporting-surface switch with rollback; **0** Power BI Embedded tokens in the live path after cut-over.
- Only **governed, parameterized** report queries run in the Fabric backend — no arbitrary SQL from the frontend.

**Scale/Scope**: One director reporting surface (Rayfin app) serving directors authorised for one or more establishments, plus compliance/program reviewers consuming audit evidence. Surfaces: report list, class-evolution trends, establishment-vs-national benchmarks, period/scope filters, suppression/unavailable/fallback states. Parity baseline = the current Power BI Embedded report set.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

| Principle | Status | Plan handling |
|---|---|---|
| I. EU-Resident, Data-Minimised | PASS | The **Fabric workspace + capacity** hosting the Rayfin app backend/frontend are EU-resident; only aggregated measures + scope/audit metadata are processed. Replacing Power BI Embedded with an EU-capacity Fabric App **improves** the residency posture by keeping backend + compute in EU Fabric. No cross-EU transfer; no new data classes. |
| II. GDPR Art. 8 | PASS | Represented learners treated as minors by default. Views are aggregated-only; small cohorts suppressed via approved K-anonymity thresholds; indirect re-identification blocked. No new child-facing collection. |
| III. EU AI Act high-risk | PASS (reporting discipline) | Not an AI decision system, but held to reporting discipline: documented data governance (Art. 10), full access logging (Art. 12), transparent compare/period/suppression/fallback states (Art. 13), human-only follow-up (Art. 14), fail-closed scope + EU-only processing (Art. 15). Annex IV reporting-controls fragment produced. |
| IV. Teacher-in-the-loop | PASS | Advisory decision support only; no learner-level action recommended or executed automatically. |
| V. Pedagogical sign-off | PASS | KPI/metric/benchmark definitions remain those reviewed by Learning Sciences; parity is validated against the approved baseline before technical sign-off. |
| VI. Outcome-contract driven | PASS | SC-007 ties improved analytics to the **−26% outcome-gap** KPI; SC-001/002/006 protect parity, residency, and reversibility. |
| VII. Reproducible, spec-driven | PASS | All artifacts under `specs/018-director-fabric-rayfin/` with concrete paths, contracts, and a reproducible quickstart; delivered by extending the existing demo. |

**EU AI Act articles touched**:
- **Art. 10 (Data Governance)**: Report definitions and Fabric datasets modeled as approved reference data; only whitelisted aggregate queries are exposed. No new personal-data categories.
- **Art. 12 (Logging/Traceability)**: Every reporting access, report/period selection, backend used (`fabric-app`/`powerbi-embedded`), suppression outcome, and scope decision is logged with actor role, scope, and correlation id. Under `fabric-app`, report-access events are **written by the Rayfin backend** and **ingested by the portal** into one shared `ReportingAccessLog`; the portal also logs metadata/health/embed events.
- **Art. 13 (Transparency)**: Each view states what is compared, the period, the active backend, and whether suppression/unavailable/fallback rules affected the result.
- **Art. 14 (Human Oversight)**: Reporting is advisory; follow-up remains a named human action outside the view.
- **Art. 15 (Robustness/Cybersecurity)**: Fail-closed scope enforcement and small-cohort suppression run in the **Rayfin Fabric backend** before data reaches the frontend; only governed, parameterized queries (no arbitrary SQL from the frontend); graceful capacity/auth failure handling; EU-only processing. **Fabric Apps preview** status is tracked as a robustness/maturity risk (see research R8) with Power BI fallback as mitigation.

**DPIA delta**: **Low.** No new personal-data categories — the feature changes the **reporting backend** (Power BI Embedded → Rayfin Fabric App on EU-resident Fabric) and the **rendering surface**, not what data exists. New artifacts: (1) the Rayfin app project (`rayfin/rayfin.yml`, `rayfin/data/` model), (2) governed report-query definitions executed Fabric-side, (3) reporting access/audit events (reuse/extend Feature 005's audit), (4) host-portal embed config. The change keeps backend + compute in EU Fabric. DPIA update documents: the Fabric Apps backend + its EU region, the **Fabric Apps preview** dependency, app auth (`rayfin login` / governed identity), the no-learner-level-exposure guarantee, Fabric-backend suppression enforcement points, and Power BI token retirement after cut-over.

**Human oversight surface**:
- **Suppression governance**: approved thresholds + re-identification rules owned jointly by the EU AI Act Compliance Officer and the GDPR Children's Data Specialist; unchanged from Feature 005 and enforced server-side here.
- **Backend/migration governance**: the `powerbi-embedded` → `fabric-app` cut-over and Power BI token retirement are explicit, logged, reversible operations.
- **Audit review**: reviewers can reconstruct, for any session, the director's authorised scope, the active backend, the queries run, and what the portal returned (including suppression/fallback).

### Phase 0 Compliance Gate (BLOCKS Phase 2)

Three items MUST be signed off before any Phase 2 implementation task begins:
1. **EU residency of the Fabric workspace + capacity** hosting the Rayfin app confirmed by the EU AI Act Compliance Officer (region evidence recorded).
2. **Reuse of the approved suppression policy** (thresholds + re-identification rules from Feature 005) re-confirmed by the GDPR Children's Data Specialist for the **Fabric-backend** implementation.
3. **Fabric Apps (Rayfin) preview workload enablement** in the tenant approved (preview-status risk accepted, with Power BI fallback as mitigation).

Implementation tasks are blocked until all three are recorded.

## Project Structure

### Documentation (this feature)

```text
specs/018-director-fabric-rayfin/
├── plan.md              # This file
├── research.md          # Phase 0 decisions (Rayfin = Fabric Apps framework; Fabric-hosted backend; data; suppression; migration; preview risk)
├── data-model.md        # Config + report-definition + audit entities; Fabric read contract
├── quickstart.md        # Configure Fabric endpoint, switch backend, verify parity/residency/rollback
├── contracts/           # Reporting metadata / fabric-query / embed-fallback API contracts
│   └── reporting-api.md
└── tasks.md             # Phase 2 (/speckit.tasks) — gated by the Phase 0 compliance gate
```

### Source Code (repository root)

```text
demo/
├── apps/
│   ├── director-fabric-app/                    # NEW: Rayfin Fabric App (scaffolded via `npm create @microsoft/rayfin`)
│   │   ├── rayfin/
│   │   │   ├── rayfin.yml                      # app services + deploy settings (Fabric workspace/capacity)
│   │   │   ├── .env                            # CLI env values (EU workspace; not secrets in repo)
│   │   │   └── data/                           # Fabric-hosted data model (governed aggregate views + suppression)
│   │   └── src/                                # static frontend (Rayfin template): report list, trend/benchmark visuals, states
│   └── director-portal/                        # existing host surface; embeds/links the Rayfin app
│       ├── server.js                           # reporting routes: metadata + embed/link + PBI fallback
│       ├── auth.js                             # reuse fail-closed director scope middleware (Feature 004/005)
│       ├── config/
│       │   └── reporting.json                  # + backend selector + embedded Rayfin app URL / Fabric item link
│       ├── reporting/
│       │   ├── report-config.js                # legacy PBI config (kept behind backend flag)
│       │   └── embed-token.js                  # legacy PBI token (fallback only)
│       └── public/
│           └── reporting.html                  # hosts/embeds the Rayfin app frontend + fallback states
├── ml/
│   └── fabric_mirroring/                       # existing Postgres→Fabric mirror (reused as the Rayfin app's data source)
└── scripts/
    ├── verify-director-portal.ps1              # extend: embedded-app render, parity, residency, fallback, rollback
    └── acceptance_tests.ps1                    # extend: scope, suppression, audit assertions
```

**Structure Decision**: Build the analytics app as a **Rayfin Fabric App** under `demo/apps/director-fabric-app/`, scaffolded with the Rayfin CLI. Its **backend + data model are hosted on Fabric** (`rayfin/data/`, deployed via `npx rayfin up`), reading the existing EU-resident mirrored analytics; **row-level scope and K-anonymity suppression are enforced in the Fabric backend** (reusing Feature 005's approved thresholds/rules, re-implemented Fabric-side) so the frontend only ever receives suppression-cleared aggregates. The existing `demo/apps/director-portal/` **embeds the Rayfin app frontend as an iframe** of its hosted Fabric app URL, mints a **portal-signed `ScopeContext`** that the Rayfin backend verifies fail-closed, **ingests the Rayfin backend's access audit** into the shared `ReportingAccessLog`, and owns the `powerbi-embedded | fabric-app` switch in `config/reporting.json`, keeping Power BI Embedded as a reversible fallback off the critical path.

## Complexity Tracking

> No constitution violations require justification. The feature reuses the existing auth/scope, suppression policy, audit patterns (Features 004/005) and the existing Fabric mirror; it moves the reporting backend onto the **Rayfin Fabric Apps** platform and embeds the resulting app in the director portal. **Tracked dependency/risk (not a violation)**: Fabric Apps is in **preview** — mitigated by keeping Power BI Embedded as a reversible fallback and gating cut-over on validated parity + the Phase 0 compliance sign-offs.
