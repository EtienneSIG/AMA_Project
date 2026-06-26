# Reporting API Contracts — Director Portal Native Fabric (Rayfin) App

**Feature**: `018-director-fabric-rayfin` | **Date**: 2026-06-26

These contracts define the reporting surface. Under `backend = fabric-app`, analytics are served by the
**Rayfin Fabric App backend** (Fabric Apps framework) and its frontend is embedded in the director portal;
the portal exposes **metadata + the embed link** and records audit. The report JSON is **backend-agnostic**:
the same shape is produced whether `backend = fabric-app` (Rayfin/Fabric) or `powerbi-embedded` (fallback).
All endpoints require an authenticated director session; **scope is bound in the backend** (fail-closed).
No endpoint accepts raw SQL; the caller selects a governed `reportId` only, and **suppression runs Fabric-side**.

---

## GET `/api/reporting/metadata`

Returns the active backend, the director's authorised scope, available reports, and periods.

**200 Response**
```json
{
  "backend": "fabric-app",
  "migrationState": "cutover",
  "scope": { "schoolIds": ["SCH-AMSTERDAM-01"], "regionIds": ["REG-NL-NORTH"] },
  "reports": [
    { "id": "class-evolution", "title": "Class outcome evolution", "kind": "trend" },
    { "id": "establishment-vs-national", "title": "Establishment vs national", "kind": "benchmark" }
  ],
  "periods": [ { "id": "2025-T1", "label": "Term 1 2025" }, { "id": "2025-T2", "label": "Term 2 2025" } ],
  "rayfinApp": { "url": "https://<app>.fabric.microsoft.com/...", "fabricItemId": "<item-guid>" },
  "residency": { "region": "northeurope", "euResident": true }
}
```
**Errors**: `401` unauthenticated, `403` no director scope.

---

## GET `/api/reporting/report/:id`

Runs a governed report definition and returns suppression-cleared aggregates.

> **Ownership (resolves analysis finding I1)**: under `backend = fabric-app` this is served by the **Rayfin app
> backend** (the embedded app calls its own Fabric backend). The backend **verifies the portal-signed
> `ScopeContext`** (fail-closed), enforces suppression, and **writes the access audit**, which the director portal
> **ingests** into the shared `ReportingAccessLog`. Under `backend = powerbi-embedded` (fallback), the portal
> serves the legacy embed instead. The portal never proxies report rows.

**Query params**: `period` (required, approved period id), `metric` (optional, approved metric id). Large result
sets are paginated/limited server-side in the Fabric backend (FR-010).

**200 Response**
```json
{
  "reportId": "class-evolution",
  "backend": "fabric-app",
  "state": "ready",
  "period": { "id": "2025-T2", "label": "Term 2 2025" },
  "series": [
    { "dimension": "CLS-7A", "points": [ { "periodId": "2025-T1", "value": 0.62 }, { "periodId": "2025-T2", "value": 0.67 } ] }
  ],
  "notes": "Aggregated class outcomes within your establishment; cohorts below 10 learners are suppressed."
}
```

**200 Response (suppressed)**
```json
{ "reportId": "class-evolution", "backend": "fabric-app", "state": "suppressed_small_cohort",
  "series": [], "notes": "One or more classes are below the minimum cohort size and were suppressed." }
```

**200 Response (Fabric unavailable, fallback enabled)**
```json
{ "reportId": "class-evolution", "backend": "powerbi-embedded", "state": "fallback_powerbi",
  "notes": "Fabric capacity is resuming; showing the Power BI fallback view." }
```

**Result states**: `ready` · `suppressed_small_cohort` · `scope_denied` · `missing_period` · `fabric_unavailable` · `fallback_powerbi`.

**Errors**: `401`, `403` (scope_denied may also be returned as a 200 state for transparency), `400` invalid/unapproved period or metric, `404` unknown/disabled reportId.

**Server guarantees**: scope bound server-side; cohort sizes never serialized; only `enabled` whitelisted definitions executed; every call written to `ReportingAccessLog`.

---

## GET `/api/reporting/health`

Operational + residency probe (used by `verify-director-portal.ps1`).

**200 Response**
```json
{ "backend": "fabric-app", "rayfinApp": { "region": "northeurope", "euResident": true, "capacity": "Active" },
  "powerbiFallbackAvailable": true }
```
If `euResident` is false, the service refuses to serve `fabric-app` reports (fail-closed) and reports `degraded`.
If `euResident` is false, the service refuses to serve `fabric-app` reports (fail-closed) and reports `degraded`.

---

## GET `/api/reporting/embed/:id` (legacy, fallback only)

Retained from the Power BI Embedded path; only reachable while `migrationState ≠ complete` and used for rollback. Returns the existing embed configuration or `embed_configuration_unavailable`.

---

## Admin / migration (reuse existing admin Fabric controls)

- `GET /api/admin/fabric/status` · `POST /api/admin/fabric/wakeup` — resume EU Fabric capacity (already implemented in the admin app).
- Backend switch is a config change to `config/reporting.json` (`backend`, `migrationState`), not a public endpoint.

---

## Contract test checklist (for /speckit.tasks)

- [ ] `metadata` returns `backend`, scope, reports, periods, the `rayfinApp` embed link, and EU `residency`.
- [ ] `report/:id` returns suppression-cleared aggregates with **no** `cohortSize` field present.
- [ ] Out-of-scope class request yields `scope_denied` (never raw data).
- [ ] Sub-threshold cohort yields `suppressed_small_cohort`.
- [ ] Fabric app paused → `fabric_unavailable` or `fallback_powerbi`, never an error-only page.
- [ ] Non-EU Rayfin app region → `health` reports not EU-resident and `report/:id` refuses (fail-closed).
- [ ] Every request appears in `ReportingAccessLog` with `backend`, `state`, scope, correlation id.
- [ ] Switching `backend` to `powerbi-embedded` restores the legacy view (rollback).
