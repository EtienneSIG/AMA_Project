# LearnEU Demo

Deployable demo of the **Case Study 33** platform — adaptive learning, curriculum localisation, automated assessment — using only Azure services committed in the case study.

> **Status:** ✅ **Fully deployed.** All 7 stages completed — 4 apps live, Postgres seeded, APIM → AOAI chat path verified, ONNX adaptive model running client-side. See [DEPLOYMENT-REPORT.md](DEPLOYMENT-REPORT.md) for details. To redeploy from scratch, run `azd up`.

---

## What this folder is

A pragmatic starter that maps 1:1 to [`../plan/08-demo-on-azure.md`](../plan/08-demo-on-azure.md) and the daily steps in [`../plan/09-step-by-step-tutorial.md`](../plan/09-step-by-step-tutorial.md).

Layout:

```
demo/
├── azure.yaml                   # azd entrypoint (4 services: parent-portal, learner-web, teacher-console, admin)
├── infra/                       # Bicep — single subscription deployment
│   ├── main.bicep               # subscription-scope; creates RG + modules
│   └── modules/
│       ├── networking.bicep
│       ├── monitor.bicep
│       ├── keyvault.bicep
│       ├── openai.bicep
│       ├── ai-search.bicep
│       ├── content-safety.bicep
│       ├── aml-workspace.bicep
│       ├── apim.bicep
│       ├── app-service.bicep        # 4 web apps; PG_* env vars + KV refs injected
│       ├── postgres.bicep           # Postgres Flex B1ms, PE, password -> Key Vault
│       ├── private-dns.bicep        # azure-api.net + privatelink zones (KV, AOAI, Postgres)
│       ├── purview.bicep
│       └── fabric-capacity.bicep
├── data/                        # Synthetic personas + curricula + glossaries
├── ml/                          # Adaptive + assessment models
├── pipelines/                   # Localisation, content safety, continuous eval
├── apps/                        # Parent / Teacher / Learner / Admin web apps
│   ├── _shared/                 # Canonical auth.js, server.js, login.html, db/{index.js,schema.sql}; sync.ps1 propagates to each app
│   ├── admin/                   # Operator console (ARM + Postgres-backed audit panels)
│   ├── learner-web/
│   ├── parent-portal/
│   └── teacher-console/
└── scripts/                     # seed_curricula, seed_learners, run_demo, acceptance_tests
```

All modules are fully implemented. Modules previously marked **`STUB`** have been completed during the Stage 2–4 deployment cycle.

---

## Prerequisites

See [`../plan/09-step-by-step-tutorial.md`](../plan/09-step-by-step-tutorial.md#prerequisites--install-once). In short:

- `az`, `azd`, `bicep`, `python`, `node`, `git`, `docker` installed
- An Azure subscription with **Owner** in an **EU region** (default: `westeurope`)
- A separate **Entra External ID / B2C tenant** (created manually on Day 2)
- **Azure OpenAI gpt-5.4-nano quota** in West Europe (request on Day 0; deployment will fail without it). Tier 5/6 subscriptions have default quota; lower tiers require a quota request.

---

## Quick start

```powershell
# 1. Configure
Copy-Item .env.template .env.local
# edit .env.local with your tenant + subscription ids

# 2. Initialise azd
azd auth login
azd env new learneu-demo

# 3. Preview (optional — does not deploy)
azd provision --preview

# 4. Deploy everything
azd up
```

`azd provision --preview` runs a what-if and prints the resources that *would* be created. `azd up` provisions infrastructure and deploys all 4 apps.

---

## PostgreSQL wake-up (admin operations)

The demo PostgreSQL flexible server can auto-stop after inactivity. The admin app now exposes:

- `GET /api/admin/postgres/status` to read lifecycle state (`Ready`, `Stopped`, `Starting`)
- `POST /api/admin/postgres/wakeup` to send a start request through managed identity + ARM

Primary path:

1. Open the admin app and use the **PostgreSQL operations** panel.
2. Refresh state.
3. If `Stopped`, click **Wake up PostgreSQL**.
4. Refresh until `Ready` (typically 3-6 minutes).

Fallback script (when admin UI is unavailable):

```powershell
pwsh ./scripts/postgres_wakeup.ps1 -ResourceGroup rg-learneu-demo -ServerName pg-learneu-demo
```

You can also run the demo checks with pre-wakeup:

```powershell
pwsh ./scripts/run_demo.ps1 -WakePostgresIfStopped
```

---

## Cost guardrails

This scaffold is wired to demo SKUs (Developer APIM, F2 Fabric, gpt-5.4-nano GlobalStandard 50K TPM, etc.). Even so, **a full `azd up` will incur real € on your subscription**. Pause Fabric capacity and delete OpenAI deployments when not demoing. Use `azd down --purge` to fully tear down.

See the cost table in [`../plan/08-demo-on-azure.md`](../plan/08-demo-on-azure.md#demo-cost-guardrails).

---

## Hard rules (enforced by Bicep)

- **EU regions only** — `main.bicep` rejects non-EU `location`.
- **Public network access disabled** by default on every PaaS.
- **Customer-managed keys** via Key Vault (Premium SKU; HSM upgrade is a TODO).
- **No real children's data** — use only `data/synthetic_learners.csv`.
- **No payload retention** on AML online endpoints.

---

## Acceptance criteria

See [`../plan/08-demo-on-azure.md#acceptance-criteria-for-the-demo`](../plan/08-demo-on-azure.md#acceptance-criteria-for-the-demo). Run `scripts/run_demo.ps1` to walk through them.
