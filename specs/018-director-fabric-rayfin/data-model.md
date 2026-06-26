# Data Model — Director Portal Native Fabric (Rayfin) App

**Feature**: `018-director-fabric-rayfin` | **Date**: 2026-06-26

This feature is **backend-on-Fabric + configuration** oriented: it introduces **no new personal-data
categories**. The reporting backend is a **Rayfin Fabric App** (Fabric Apps framework); its data model
lives in `rayfin/data/` and is deployed to Fabric via the Rayfin CLI. Entities below are (a) the Rayfin
app project/config, (b) governed report definitions executed in the Fabric backend, (c) the aggregate
result contract, and (d) audit records. Learner-level data is never modeled or exposed — only aggregates,
and suppression/scope run **inside the Fabric backend** before any aggregate reaches the frontend.

---

## 1. Rayfin app project & configuration entities

### RayfinAppConfig (`rayfin/rayfin.yml` + `rayfin/.env`)

| Field | Type | Notes |
|---|---|---|
| `workspace` | string | Target **EU-resident** Fabric workspace for the app. |
| `capacity` | string | EU-resident Fabric capacity (for status/wake-up). |
| `region` | string | Must be an EU region; asserted before serving. |
| `services[]` | object | App services + deploy settings (managed by Rayfin). |
| `dataModel` | ref | Points at `rayfin/data/` (governed aggregate views + suppression). |

### ReportingBackendConfig (host portal, `config/reporting.json`)

| Field | Type | Notes |
|---|---|---|
| `backend` | enum `powerbi-embedded` \| `fabric-app` | Active reporting surface in the director portal (migration switch). Default `fabric-app` after cut-over. |
| `migrationState` | enum `pilot` \| `cutover` \| `complete` | Governs whether PBI fallback remains active. |
| `rayfinApp.url` | string | Hosted **Rayfin app** URL embedded by the portal. |
| `rayfinApp.fabricItemId` | string | Fabric item link for the deployed app. |
| `rayfinApp.region` | string | Must be an EU region; asserted at startup/health. |
| `powerbi` | object | Legacy embed config (workspace/report/dataset ids) — fallback only. |
| `reports[]` | ReportDefinition[] | Governed report definitions surfaced by the app (see below). |

**Validation**: `rayfinApp.region` ∈ approved EU regions (fail-closed if not). When `backend = fabric-app`, the Rayfin app URL/item must be set and at least one enabled `ReportDefinition` must exist. `powerbi` may be present only while `migrationState ≠ complete`.

### ReportDefinition (governed query, executed in the Fabric backend)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable report id (e.g., `class-evolution`, `establishment-vs-national`). |
| `title` | string | Display title. |
| `kind` | enum `trend` \| `benchmark` \| `summary` | Drives the visual + result-state logic in the Rayfin app backend. |
| `query` | governed model query | Defined in `rayfin/data/`; parameterized by `:scope`, `:period`, `:metric`. **No frontend-supplied SQL.** |
| `params` | object schema | Allowed parameters + types (period id, metric id). |
| `minCohort` | object | K-anonymity thresholds (default reuse F005: class 10 / establishment 30 / national 100), enforced Fabric-side. |
| `enabled` | boolean | Toggle without code change. |

**State**: a ReportDefinition is `enabled`/disabled by config; changing `query` (a `rayfin/data/` model change deployed via `npx rayfin up db apply`) requires the same review as a metric-definition change (Art. 10 governance).

### DirectorScope (reused from Feature 004/005)

| Field | Type | Notes |
|---|---|---|
| `directorSubjectId` | string | Authenticated director identity. |
| `schoolIds[]` / `regionIds[]` | string[] | Authorised establishments/regions. |
| `role` | string | `director` (fail-closed if missing/expired). |

Used to bind `:scope` parameters in the Fabric backend; a director can never widen scope from the frontend.

### ScopeContext (signed, issued by the director portal at embed time)

| Field | Type | Notes |
|---|---|---|
| `directorSubjectId` | string | Authenticated director identity (from the portal session). |
| `schoolIds[]` / `regionIds[]` | string[] | Authorised establishments/regions (the bound scope). |
| `issuedAt` / `expiresAt` | timestamptz | Short-lived; re-minted per embed/session. |
| `signature` | string | Portal-signed; the Rayfin backend **verifies** it and enforces scope fail-closed. |

> The portal mints this on load and passes it to the embedded Rayfin app; the Rayfin backend verifies the
> signature and enforces the scope on every query. This is how authoritative scope (in the Fabric backend)
> stays bound to the authenticated portal session (resolves analysis finding I1).

---

## 2. Fabric read contract (aggregate-only)

### FabricAggregateRow (computed in the Rayfin Fabric backend; never exposed raw)

| Field | Type | Notes |
|---|---|---|
| `dimension` | string | e.g., class id (within scope), period label. |
| `metric` | string | Approved metric id. |
| `value` | number | Aggregated measure. |
| `cohortSize` | integer | Used by Fabric-side suppression; **never** sent to the frontend. |
| `periodId` | string | Approved reporting period. |

> The Rayfin Fabric backend computes **aggregates with cohort sizes** so its suppression layer can apply
> K-anonymity + indirect re-identification rules before producing the frontend payload. Rows below
> threshold are dropped/generalised and replaced with a suppression state. Cohort sizes never leave the backend.

### ReportResult (served by the Rayfin app backend; backend-agnostic shape)

| Field | Type | Notes |
|---|---|---|
| `reportId` | string | |
| `backend` | enum | `fabric-app` \| `powerbi-embedded` (transparency). |
| `state` | enum `ready` \| `suppressed_small_cohort` \| `scope_denied` \| `missing_period` \| `fabric_unavailable` \| `fallback_powerbi` | Explicit; never empty/error-only. |
| `series[]` | aggregate points | Only suppression-cleared aggregates. |
| `period` | object | What period is shown. |
| `notes` | string | Transparency copy (what is compared; suppression/fallback applied). |

> Under `fabric-app`, `ReportResult` is produced by the **Rayfin app backend** (`GET /api/reporting/report/:id`
> on the app), which also writes the access audit (below). The shape matches the Power BI fallback so the
> portal UI is backend-agnostic.

---

## 3. Audit & governance entities (reuse/extend Feature 005 reporting audit)

### ReportingAccessLog

| Field | Type | Notes |
|---|---|---|
| `id` | bigserial | |
| `directorSubjectId` | string | Actor. |
| `role` / `scope` | string/json | Authorised scope at access time. |
| `reportId` / `periodId` / `metric` | string | What was requested. |
| `backend` | enum | Which backend served it (`fabric-app`/`powerbi-embedded`). |
| `state` | enum | Result state (incl. suppression/fallback). |
| `correlationId` | string | Trace id. |
| `source` | enum `rayfin-backend` \| `portal` | Where the event originated (app-backend report access vs portal metadata/embed). |
| `created_at` | timestamptz | EU-resident. |

> **Audit path (I1)**: under `fabric-app`, the **Rayfin backend writes each report-access event**; the director
> portal **ingests** those events into this shared `ReportingAccessLog` (`demo/apps/_shared/db`) and also logs
> its own metadata/health/embed events, giving compliance one unified, portal-visible trail.

**Retention**: per program reporting policy; aggregates + audit only, **no raw learner records**.

---

## Relationships

```text
RayfinAppConfig (rayfin.yml)  1───1 rayfin/data/ data model (Fabric-hosted backend)
ReportingBackendConfig        1───* ReportDefinition
ReportDefinition              *───1 (approved) Metric/Period reference data   (Art. 10 governance)
DirectorScope                 1───1 ScopeContext (signed by portal)  1───* report queries
DirectorScope                 1───* ReportingAccessLog
ScopeContext + ReportDefinition + Period ──► (Rayfin Fabric backend: enforce scope + aggregate + suppress) ──► ReportResult
ReportResult ──► (Rayfin backend writes audit) ──► (portal ingests) ──► ReportingAccessLog
```

## Compliance invariants (enforced in the Rayfin Fabric backend)

1. **No learner-level row** ever leaves the backend; only suppression-cleared aggregates reach the frontend.
2. **Scope is bound in the backend** via the portal-signed `ScopeContext` (verified fail-closed); the frontend cannot widen it.
3. **EU residency**: the Rayfin app's Fabric workspace/capacity region asserted EU at startup/health; non-EU = refuse to serve.
4. **Governed queries only** (defined in `rayfin/data/`); no frontend-supplied SQL; server-side pagination/limits for large result sets (FR-010).
5. **Every access logged** (backend, state, scope, correlation id, source) — written by the Rayfin backend and **ingested by the portal** into one shared `ReportingAccessLog` (Art. 12).
