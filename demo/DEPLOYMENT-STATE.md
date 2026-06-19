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
| 4-B | App Service + 4 apps deploy | ✅ | learner-web, parent-portal, teacher-console, admin — all live; sign-in + /api/chat green |
| 5 | Seed curricula + 50 synthetic learners | ✅ | curricula=6, glossary=14, learners=50. pgcrypto allow-listed + admin `/api/data/reseed` endpoint added |
| 6 | Acceptance tests (11 criteria) | ✅ | 5 PASS · 4 PARTIAL · 2 SKIP · 0 FAIL — see `.deploy/acceptance-last.txt` |
| 7 | `DEPLOYMENT-REPORT.md` | ✅ | See `DEPLOYMENT-REPORT.md` |

---

## Active issue (resume here)

_None — all stages green._

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

---

## Feature 009 — Interoperability rollout

- **Deployed apps**: `app-admin-learneu-demo`, `app-learner-web-learneu-demo`, `app-teacher-console-learneu-demo` (West Europe). Parent-portal/director unchanged.
- **Verification**: `demo/scripts/verify-interop.ps1` — 11/11 green (EU guard, secret-reference enforcement, SCORM launch/commit, xAPI insights+drain, SIS sync+conflict queue, GDPR export, immutable audit trail).
- **New surfaces**: admin → Integrations tab (connectors, SIS sync, GDPR export, audit); learner-web → Activities tab (SCORM + due dates); teacher-console → Integrations tab (LRS insights + due-date confirmation).
- **Rollback**: routers are mounted via guarded `try/catch require` in `_shared/server.js` (`server-interop.js`) and additive routes in bespoke `admin/server.js`; removing the module/redeploying the prior zip reverts cleanly. Schema additions are `CREATE IF NOT EXISTS` + append-only audit (no destructive migration). No existing routes modified.

