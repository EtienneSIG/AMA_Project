# LearnEU Demo — Deployment Progress

Resume from this file if the laptop reboots. Update after each completed step.

## Environment
- Subscription: `94223c9d-15b4-460e-95d4-5f47e3634c2b`
- Tenant: `63e6b296-bb9b-4234-81a1-0718d1ea9887`
- Resource Group: `rg-learneu-demo`
- Region: `westeurope`
- AZD env: `learneu-demo` (cwd `AMA/AMA_Project/demo`)

## Status legend
- [x] done
- [~] in progress / partial
- [ ] not started

## Stages
- [x] **Stage 0** — Tooling + auth (`az login`, `azd auth login`)
- [x] **Stage 1** — Bicep what-if
- [x] **Stage 2** — `azd provision` (11 modules, AOAI gpt-5.4-nano, APIM Internal, KV, Search, AML, Fabric, Purview, Monitor, networking)
- [x] **Stage 3** — Post-provision verification (incl. APIM diagnostic settings)
- [x] **Stage 4-A** — APIM ↔ AOAI Bicep wiring (RBAC, backend, API, policy, product, KV subscription-key secret)
- [x] **Stage 4-B** — App Service Plan + 3 Express apps with VNet integration
  - [x] Bicep provisioned (B1 Linux, Node 22-lts, MI, KV refs, App Insights, diag)
  - [x] `WEBSITE_RUN_FROM_PACKAGE=1` removed (caused `MODULE_NOT_FOUND: express`); now Oryx builds via `SCM_DO_BUILD_DURING_DEPLOYMENT=true` + `ENABLE_ORYX_BUILD=true`
  - [x] Added `privatelink.vaultcore.azure.net` private DNS zone + VNet link + A record (KV PE 10.42.1.4) so KV reference can resolve from snet-apps
  - [x] `azd deploy` (all 3 apps healthy on `/api/health`, `keyConfigured: true`)
  - [x] E2E `/api/chat` verified → APIM → AOAI gpt-5.4-nano returns completion
  - [x] EdTech Group logo + brand header added to all 3 apps
- [ ] **Stage 5** — Seed curricula JSON + glossaries + 50 synthetic learners
- [ ] **Stage 6** — 9 acceptance tests
- [ ] **Stage 7** — `DEPLOYMENT-REPORT.md`

## Resume command (after reboot)
```powershell
Set-Location 'C:\Users\esigwald\Documents\03_Dev\200_AMA\AMA\AMA_Project\demo'
az login --tenant 63e6b296-bb9b-4234-81a1-0718d1ea9887
azd auth login --tenant-id 63e6b296-bb9b-4234-81a1-0718d1ea9887
# Stage 4-B finish:
azd provision --no-prompt
azd deploy --no-prompt
# Smoke test:
$urls = 'learner-web','parent-portal','teacher-console' | ForEach-Object { "https://app-$_-learneu-demo.azurewebsites.net/api/health" }
$urls | ForEach-Object { try { Invoke-RestMethod $_ -TimeoutSec 30 } catch { "FAIL $_ : $($_.Exception.Message)" } }
```

## Known issues / fixes applied
- KV RBAC + PNA Disabled blocked secret writes → added Secrets Officer for `deployer().objectId`.
- Node 20 LTS deprecation → bumped to 22.
- APIM Internal mode → apps in same VNet (`snet-apps`, `vnetRouteAllEnabled: true`) for KV reference + APIM gateway access.
- `MODULE_NOT_FOUND: express` after first deploy → removed `WEBSITE_RUN_FROM_PACKAGE=1`, enabled Oryx build.
- KV reference status `OtherReasons / AccessToKeyVaultDenied` → missing `privatelink.vaultcore.azure.net` private DNS zone. Added zone + VNet link + A record `kv-* → 10.42.1.4`. After `az webapp restart`, KV references resolved successfully and `/api/chat` works end-to-end.

## Endpoints (post-deploy)
- learner-web:    https://app-learner-web-learneu-demo.azurewebsites.net
- parent-portal:  https://app-parent-portal-learneu-demo.azurewebsites.net
- teacher-console: https://app-teacher-console-learneu-demo.azurewebsites.net
- APIM gateway (internal): https://apim-learneu-demo.azure-api.net/aoai
