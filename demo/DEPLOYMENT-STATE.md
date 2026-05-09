# LearnEU Demo — Deployment State

> Living checklist. Update after each stage so you can resume after a laptop reboot.
> Subscription: `94223c9d-15b4-460e-95d4-5f47e3634c2b` · Tenant: `63e6b296-bb9b-4234-81a1-0718d1ea9887` · RG: `rg-learneu-demo` · Region: `westeurope`

## How to resume
1. `cd C:\Users\esigwald\Documents\03_Dev\200_AMA\AMA\AMA_Project\demo`
2. `az login --tenant 63e6b296-bb9b-4234-81a1-0718d1ea9887` (if expired)
3. `azd auth login --tenant-id 63e6b296-bb9b-4234-81a1-0718d1ea9887` (if expired)
4. Read this file → find the first ⏳ or ❌ → continue from the "Resume command" listed there.

---

## Stages

| # | Stage | Status | Notes |
|---|---|---|---|
| 0 | Config + identity (azd env, subs, RBAC) | ✅ | `azd env` = `learneu-demo`, location=westeurope |
| 1 | `azd provision --preview` (what-if) | ✅ | 22 resources, no drift |
| 2 | `azd provision` (Bicep apply) | ✅ | gpt-5.4-nano @ 50K TPM GlobalStandard |
| 3 | Post-provision verification | ✅ | APIM diag fixed in Bicep, all PNA Disabled except APIM |
| 4-A | APIM ↔ AOAI Bicep wiring | ✅ | Backend, API `/aoai`, product `learneu-demo`, KV secret `apim-subscription-key` |
| 4-B | App Service + 3 apps deploy | ⏳ | Bicep ✅. learner-web zip uploaded but **MODULE_NOT_FOUND** at runtime (see Active Issue) |
| 5 | Seed curricula + 50 synthetic learners | ❌ | not started |
| 6 | Acceptance tests (9 criteria) | ❌ | not started |
| 7 | `DEPLOYMENT-REPORT.md` | ❌ | not started |

---

## Active issue (resume here)

**learner-web returns Azure "Application Error"** — Node crashes with `MODULE_NOT_FOUND` (cannot find `express`).

**Root cause**: azd sets `WEBSITE_RUN_FROM_PACKAGE=1` on the site, which mounts the deployed zip read-only. The zip uploaded by azd does **not** include `node_modules`, and Oryx (`SCM_DO_BUILD_DURING_DEPLOYMENT=true`) is **skipped** when run-from-package is on. Result: `require('express')` fails.

**Fix path chosen**: disable run-from-package so SCM unpacks the zip and Oryx runs `npm install`.

**Resume commands**:
```pwsh
cd C:\Users\esigwald\Documents\03_Dev\200_AMA\AMA\AMA_Project\demo

# 1. Override run-from-package on all 3 sites
foreach ($a in 'app-learner-web-learneu-demo','app-parent-portal-learneu-demo','app-teacher-console-learneu-demo') {
  az webapp config appsettings set -n $a -g rg-learneu-demo --settings WEBSITE_RUN_FROM_PACKAGE=0 SCM_DO_BUILD_DURING_DEPLOYMENT=true ENABLE_ORYX_BUILD=true | Out-Null
  Write-Host "patched $a"
}

# 2. Redeploy all 3 services
azd deploy --no-prompt

# 3. Smoke test
foreach ($u in 'https://app-learner-web-learneu-demo.azurewebsites.net/api/health',
               'https://app-parent-portal-learneu-demo.azurewebsites.net/api/health',
               'https://app-teacher-console-learneu-demo.azurewebsites.net/api/health') {
  try { $r = Invoke-RestMethod -Uri $u -TimeoutSec 60; "OK $u → $($r | ConvertTo-Json -Compress)" }
  catch { "FAIL $u → $($_.Exception.Message)" }
}
```

If still failing, read logs:
```pwsh
az webapp log tail -n app-learner-web-learneu-demo -g rg-learneu-demo --provider application
```

---

## Decisions log
- Front Door advisor → declined (EU-only, no global edge needed).
- Node 20 → bumped to **Node 22-lts** in Bicep + `package.json engines`.
- APIM SKU → Developer (demo only; Premium needed for prod multi-region).
- AOAI model → `gpt-5.4-nano` v `2026-03-17`, GlobalStandard, 50K TPM.
- KV deployer role → added Secrets Officer for `deployer().objectId` so Bicep can write `apim-subscription-key`.

## Key resources (cheat sheet)
- AOAI: `aoai-learneu-demo` · endpoint `https://aoai-learneu-demo.openai.azure.com/`
- APIM: `apim-learneu-demo` (Internal) · gateway `https://apim-learneu-demo.azure-api.net`
- KV: `kv-learneu-demo-1` · secret `apim-subscription-key`
- VNet: `vnet-learneu-demo` · subnet `snet-apps` (regional VNet integration for App Service)
- ASP: `asp-learneu-demo` (B1 Linux Node 22)
- Apps: `app-{learner-web,parent-portal,teacher-console}-learneu-demo`
