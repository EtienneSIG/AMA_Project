# Quickstart — Director Portal Native Fabric (Rayfin) App

**Feature**: `018-director-fabric-rayfin` | **Date**: 2026-06-26

This runbook validates the Fabric (Rayfin) reporting app end-to-end against the demo:
scaffold + deploy the **Rayfin Fabric App**, embed it in the director portal, then verify **parity**,
**EU residency**, **scope + suppression**, **graceful fallback**, and **rollback**.

> Prerequisites: **Node.js + npm**; an **EU-resident Fabric workspace + capacity** with the
> **Fabric Apps (Rayfin) workload enabled** in the tenant (preview); the existing mirrored analytics
> (`demo/ml/fabric_mirroring/`, from `pg-learneu-demo`); the director portal deployed
> (`app-director-portal-learneu-demo`) for embedding. Authenticate the CLI with `npx rayfin login`.

---

## 1. Scaffold & deploy the Rayfin Fabric App

```bash
# scaffold into demo/apps/director-fabric-app (targets an EU Fabric workspace)
npm create @microsoft/rayfin@latest -- director-fabric-app --workspace <eu-workspace>
cd demo/apps/director-fabric-app
npx rayfin login

# model governed, aggregated views + Fabric-side suppression in rayfin/data/,
# build the report frontend (class trends, establishment-vs-national, states), then:
npm run dev                 # local frontend + backend deployed to Fabric (sanity check)
npx rayfin up --dry-run     # preview the deployment
npx rayfin up               # deploy backend + static frontend to Fabric
npx rayfin up status --json # confirm success; note the hosted app URL + Fabric item id
```

`rayfin/rayfin.yml` pins the **EU** Fabric workspace/capacity; `rayfin/data/` holds the data model
(aggregate views + K-anonymity suppression: class ≥ 10 / establishment ≥ 30 / national ≥ 100).

## 2. Embed the app in the director portal

Edit `demo/apps/director-portal/config/reporting.json`:

```jsonc
{
  "backend": "fabric-app",
  "migrationState": "pilot",
  "rayfinApp": {
    "url": "https://<app>.fabric.microsoft.com/...",   // from `rayfin up status`
    "fabricItemId": "<item-guid>",
    "region": "northeurope"
  },
  "powerbi": { "workspaceId": "...", "reportId": "...", "datasetId": "..." },  // fallback only
  "reports": [
    { "id": "class-evolution", "title": "Class outcome evolution", "kind": "trend", "enabled": true,
      "minCohort": { "class": 10, "establishment": 30, "national": 100 } },
    { "id": "establishment-vs-national", "title": "Establishment vs national", "kind": "benchmark", "enabled": true }
  ]
}
```

Restart the host portal: `az webapp restart -g rg-learneu-demo -n app-director-portal-learneu-demo`.

## 3. Verify residency + health

```powershell
curl https://app-director-portal-learneu-demo.azurewebsites.net/api/reporting/health
# Expect: backend=fabric-app, rayfinApp.region=northeurope, euResident=true, capacity=Active
```
If `euResident=false`, the portal refuses to serve `fabric-app` reports (fail-closed) — fix the workspace region first.

## 4. Sign in as a director and check parity

1. Log in as a director (e.g., a seeded director account) → open **Reporting**.
2. Confirm analytics render from the **embedded Rayfin Fabric App** (no Power BI iframe/token in the network panel).
3. Compare KPIs (class trends, establishment-vs-national benchmark, outcome-gap) against the
   previous Power BI report → **values match the parity baseline**.

```powershell
curl "https://.../api/reporting/report/class-evolution?period=2025-T2"
# Expect: backend=fabric-app, state=ready, series of aggregated class points, NO cohortSize field
```

## 5. Verify scope + suppression (compliance)

- As a director scoped to one establishment, request a class outside scope → `state=scope_denied` (never raw data).
- For a class below the cohort threshold → `state=suppressed_small_cohort`, value hidden.
- Confirm suppression is enforced **in the Rayfin Fabric backend** (no `cohortSize` ever reaches the frontend).

```powershell
& demo/scripts/verify-director-portal.ps1   # extended: parity, scope, suppression, residency, fallback, rollback
```

## 6. Verify graceful fallback

1. Pause the Fabric capacity (or simulate the Rayfin app unavailable) → request a report.
2. Expect `state=fabric_unavailable` or, if fallback enabled, `state=fallback_powerbi` with the
   legacy view — **never** an error-only page or wrong numbers.
3. Resume capacity via the admin app (`POST /api/admin/fabric/wakeup`) → reports return to `fabric-app`.

## 7. Verify rollback (reversible migration)

1. Set `"backend": "powerbi-embedded"` in `reporting.json`, restart.
2. Confirm the legacy Power BI report renders again with no portal breakage.
3. Set back to `"fabric-app"` → the embedded Rayfin app returns. This proves SC-006 (reversible in 100% of runs).

## 8. Complete the cut-over

When parity is validated and the Phase 0 compliance gate is signed off:
- Set `"migrationState": "complete"` → Power BI fallback path is disabled.
- Retire Power BI tokens/secrets (`PBI_CLIENT_SECRET`, embed config) → **0** PBI tokens in the live path (SC-001).
- Redeploy app updates with `npx rayfin up` (or `npx rayfin up staticapp deploy` for frontend-only, `npx rayfin up db apply` for data-model-only).

---

## Acceptance checklist

- [ ] Health reports `fabric-app` + EU residency true (Rayfin app region EU).
- [ ] Reporting renders from the embedded Rayfin Fabric App (no Power BI embed in live path).
- [ ] KPIs match the parity baseline (SC-002).
- [ ] Out-of-scope → `scope_denied`; small cohort → `suppressed_small_cohort`, suppressed in the Fabric backend (SC-003).
- [ ] No `cohortSize`/learner-level data in any frontend payload.
- [ ] Fabric app/capacity unavailable → graceful state/fallback, never wrong numbers (FR-008).
- [ ] Backend switch + rollback work without breakage (SC-006).
- [ ] Every access logged with backend, state, scope, correlation id (Art. 12).
- [ ] After cut-over: 0 Power BI tokens in the live path (SC-001).
