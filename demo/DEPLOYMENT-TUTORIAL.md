# LearnEU — Deployment Tutorial (live)

This file is updated by the `demo-deployment-agent` chatmode at each stage. It records goal, pre-conditions, executed commands, created resources, verification steps, rollback, and troubleshooting. Treat it as the audit trail for the deployment.

- Subscription : `esig_tenant` (`94223c9d-15b4-460e-95d4-5f47e3634c2b`)
- Tenant (workforce) : `63e6b296-bb9b-4234-81a1-0718d1ea9887` (default domain `MngEnv837178.onmicrosoft.com`)
- CIAM tenant (parent/learner identities) : `learneu` (`6c629140-a4ec-445b-9bc9-ab1f4fb1165e`, `learneu.onmicrosoft.com`)
- Region : `westeurope` (EU-only allowlist enforced by Bicep `@allowed`)
- Resource group : `rg-learneu-demo`
- Identity used : `admin@MngEnv837178.onmicrosoft.com` (Owner at sub scope)
- Plan B for OpenAI : **GlobalStandard, `gpt-5.4-nano` `2026-03-17`, 50K TPM** (no PTU). Reasoning model, 400K context, EU residency confirmed (West Europe per Microsoft Learn region table).
- Purview : **disabled** (`deployPurview = false`) — tenant has no EU service location for Purview; flagged as follow-up.

---

## Stage 0 — Configuration

**Goal :** load environment, verify tools, fill `.env.local`, init `azd` env.

**Pre-conditions :**
- `az`, `azd`, `bicep`, `pwsh`, `python`, `node`, `docker` installed.
- User signed in to Azure CLI on the target tenant.

**Executed :**
- `az login --use-device-code` (admin account)
- `azd auth login --tenant-id 63e6b296-... --use-device-code`
- `azd env new learneu-demo` then `azd env select learneu-demo`
- `.env.local` written with tenant + sub + CIAM + Plan B OpenAI knobs.

**Created resources :** none (config only).

**Verify :**
- `az account show` → `admin@MngEnv837178.onmicrosoft.com` on subscription `94223c9d-…`.
- RBAC at sub scope = Owner (verified via ARM REST).

**Rollback :** none required.

---

## Stage 1 — What-if (read-only)

**Goal :** generate provisioning preview, no real changes.

**Pre-conditions :** Stage 0 complete, Bicep compiles cleanly.

**Executed :**
- `az bicep build --file infra/main.bicep` → 0 errors, 0 warnings.
- `azd provision --preview --no-prompt` (logged to `.deploy/<ts>-stage1-whatif.log`).

**First run (FAILED) :**
- `Microsoft.Resources/subscriptions/resourceGroups/write` denied on `etienne.sigwald@microsoft.com` — switched identity to `admin@MngEnv837178`.
- `gpt-4o 2024-08-06` deprecating → bumped to `2024-11-20` in `infra/modules/openai.bicep` (later swapped to `gpt-5.4-nano 2026-03-17` per user request — see Stage 2 swap note).
- Purview westeurope unsupported on tenant → added `deployPurview` flag (default `false`) in `infra/main.bicep`.

**Second run (SUCCESS) :** 18 resources to create:

| Type | Name |
|---|---|
| Resource Group | `rg-learneu-demo` |
| Virtual Network | `vnet-learneu-demo` |
| Log Analytics | `log-learneu-demo` |
| Application Insights | `appi-learneu-demo` |
| Key Vault | `kv-learneu-demo-sjoo5sdv` |
| Azure OpenAI | `aoai-learneu-demo-…` |
| OpenAI deployment | `gpt-5.4-nano` (GlobalStandard, 50K TPM, version 2026-03-17) |
| Content Safety | `cs-learneu-demo-…` |
| AI Search | `srch-learneu-demo-…` |
| AML Workspace | `mlw-learneu-demo` |
| Storage | `stamlqoyrpqfojnfxe` |
| Container Registry | `acrqoyrpqfojnfxe` |
| API Management | `apim-learneu-demo` |
| Private Endpoints (5) | `pe-aoai/cs/kv/mlw/srch-…` |

**Verify :** SUCCESS, exit code 0, no resources mutated.

**Rollback :** N/A (read-only).

---

## Stage 2 — Provision (`azd up`)

**Goal :** real provisioning of all 18 resources.

**Pre-conditions :** Stage 1 SUCCESS, user explicit `GO`.

**Executed :**
- `azd up --no-prompt` (logged to `.deploy/<ts>-stage2-up.log`).
- Async terminal id captured for monitoring.

**Status :** _in progress — see live log_.

**Created resources :** _to be enumerated via `mcp_azure_mcp_group_resource_list` after success_.

**Verify (planned) :**
- `az resource list -g rg-learneu-demo -o table` returns the 18 expected resources.
- All public access disabled (`publicNetworkAccess: Disabled`).
- Diagnostic settings forwarding to Log Analytics.
- Key Vault soft-delete + purge protection on.
- OpenAI `gpt-5.4-nano` deployment shows GlobalStandard 50K TPM.

**Rollback :** `azd down --force --purge` (will be required to clean failed state).

**Troubleshooting note :**
- APIM creation alone takes 25–35 min; do not interrupt.
- If a single module fails, Bicep deploys idempotent on re-run; do not delete the RG, just re-run `azd up`.

---

_Stages 3–9 will be appended as they execute._

---

## Stage 2 — model swap note (gpt-4o → gpt-5.4-nano)

**Trigger :** explicit user instruction mid-deployment — *“I change the model gpt-4o per gpt-5.4-nano”*.

**Context :** the in-flight `azd provision` retry was running at the time of the request and had already created the `gpt-4o 2024-11-20` model deployment. The swap is applied in source so the **next** `azd provision` updates the existing OpenAI account with the new model deployment (the `Microsoft.CognitiveServices/accounts/deployments` resource is idempotent on `name` — the previous deployment is replaced in-place when `properties.model` changes).

**Pre-conditions :**
- `gpt-5.4-nano` (version `2026-03-17`) availability confirmed in **West Europe**, **Global Standard**, per Microsoft Learn `models-sold-directly-by-azure` Europe table (column ✅ for the region row).
- No registered access required for `gpt-5.4-nano` (per the reasoning models availability page).
- Quota: Tier 5/6 subscriptions get default quota; if the current subscription is below Tier 5, a separate quota request via Foundry portal will be required (distinct from the gpt-4o quota already approved).

**Files updated :**
- `infra/modules/openai.bicep` — `model.name` → `gpt-5.4-nano`, `model.version` → `2026-03-17`, default `deploymentName` → `gpt-5.4-nano`, resource symbol `gpt4o` renamed to `gptDeployment`.
- `.env.local` — `OPENAI_DEPLOYMENT_NAME=gpt-5.4-nano`.
- `.env.template` — same default.
- `ARCHITECTURE.md` — Mermaid label + Notes section.
- `README.md` — quota prerequisite note + cost section.
- `pipelines/localisation/localise.py` — default deployment name and docstrings.

**Validation :** `az bicep build --file infra/main.bicep` → 0 errors.

**Pending action :** wait for the in-flight Stage 2 run to terminate, then re-run `azd provision --no-prompt` (preceded by `azd provision --preview --no-prompt`) to apply the swap. Expected what-if delta: **Modify** on `aoai-…/gpt-4o` → new deployment `aoai-…/gpt-5.4-nano` (the old `gpt-4o` deployment is removed because it is no longer present in the template).

**Rollback :** revert the openai.bicep changes (single resource block) and re-run `azd provision`.

---

## Operational note — PostgreSQL auto-stop recovery

The admin app includes an operator control to wake PostgreSQL when Flexible Server is auto-stopped:

- `GET /api/admin/postgres/status`
- `POST /api/admin/postgres/wakeup`

Operational fallback remains available from a shell:

- `pwsh demo/scripts/postgres_wakeup.ps1 -ResourceGroup rg-learneu-demo -ServerName pg-learneu-demo`

If the wake-up endpoint fails with authorization errors, validate the admin app managed identity RBAC on the PostgreSQL server resource scope before retrying.
