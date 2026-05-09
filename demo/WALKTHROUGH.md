# LearnEU — End-to-End Deployment Walkthrough

A reproducible, step-by-step playbook of how the **LearnEU** demo (Case Study 33 — *EdTech personalised learning, EU-only, GDPR + EU AI Act compliant*) was scaffolded and provisioned on Azure with `azd` and Bicep, including how a mid-flight model swap from `gpt-4o` to `gpt-5.4-nano` was applied without recreating the rest of the stack.

> **Scope.** This document covers Stages 0 → 3 (config, what-if, provision, post-provision verification). Stages 4–7 (apps deploy, seeding, acceptance tests, final report) are tracked separately in [DEPLOYMENT-TUTORIAL.md](DEPLOYMENT-TUTORIAL.md).

---

## 0. Inputs and target environment

| Item | Value |
|---|---|
| Workforce tenant | `esig_tenant` (`63e6b296-bb9b-4234-81a1-0718d1ea9887`, `MngEnv837178.onmicrosoft.com`) |
| Subscription | `esig_tenant` (`94223c9d-15b4-460e-95d4-5f47e3634c2b`) |
| CIAM tenant (parent/learner) | `learneu` (`6c629140-a4ec-445b-9bc9-ab1f4fb1165e`, `learneu.onmicrosoft.com`) |
| Region | `westeurope` (EU-only allowlist enforced in Bicep) |
| Resource group | `rg-learneu-demo` |
| azd env | `learneu-demo` |
| Identity used | `admin@MngEnv837178.onmicrosoft.com` (Owner at sub scope) |
| OpenAI plan | **GlobalStandard, `gpt-5.4-nano` `2026-03-17`, 50K TPM** (no PTU) |
| Purview | **disabled** (tenant has no EU service location) |
| Fabric | **disabled** (requires admin members) |

**Tooling baseline.** Azure CLI 2.x, `azd` 1.24.3, Bicep 0.43.8, PowerShell 7.5, Docker 28.2, Python ≥ 3.11, Node ≥ 20.

---

## 1. Repository layout

```
AMA/AMA_Project/demo/
  azure.yaml                      # azd manifest
  .env.local                      # tenant/sub IDs + OpenAI knobs (gitignored)
  .env.template                   # safe defaults
  infra/
    main.bicep                    # subscription-scope orchestrator
    modules/
      networking.bicep            # VNet + 3 subnets + APIM NSG
      monitor.bicep               # Log Analytics + App Insights
      keyvault.bicep              # KV + soft-delete + purge protection + PE
      openai.bicep                # AOAI + gpt-5.4-nano deployment + PE
      ai-search.bicep             # Search + PE
      content-safety.bicep        # Content Safety + PE
      aml-workspace.bicep         # AML (HBI) + PE + AppInsights link
      apim.bicep                  # APIM Developer SKU
      purview.bicep               # gated off
      fabric-capacity.bicep       # gated off
  apps/                           # learner-web, parent-portal, teacher-console
  pipelines/localisation/         # NL → DE pipeline (gpt-5.4-nano)
  ml/adaptive_model/              # train + ONNX export
  data/                           # curricula + glossaries
  scripts/                        # demo + seed scripts
  ARCHITECTURE.md                 # rendered Mermaid topology
  DEPLOYMENT-TUTORIAL.md          # live audit trail
  WALKTHROUGH.md                  # this file
```

---

## 2. Stage 0 — configuration & identity

### 2.1 Verify tools
```powershell
az version; azd version; bicep --version; pwsh --version; docker version; python --version; node --version
```

### 2.2 Sign in to the **workforce** tenant
The first attempt with a regular corporate identity (`etienne.sigwald@microsoft.com`) was blocked at the subscription scope (no `Microsoft.Resources/subscriptions/resourceGroups/write`). We switched to the tenant admin (Owner at sub scope).

```powershell
az login --use-device-code --tenant 63e6b296-bb9b-4234-81a1-0718d1ea9887
az account set --subscription 94223c9d-15b4-460e-95d4-5f47e3634c2b
azd auth login --tenant-id 63e6b296-bb9b-4234-81a1-0718d1ea9887 --use-device-code
```

**RBAC check** (programmatic, not UI):
```powershell
$sub = '94223c9d-15b4-460e-95d4-5f47e3634c2b'
az role assignment list --assignee admin@MngEnv837178.onmicrosoft.com `
  --scope "/subscriptions/$sub" --query "[].roleDefinitionName" -o tsv
# → Owner
```

### 2.3 Verify the CIAM tenant kind
```powershell
az rest --method GET `
  --url 'https://graph.microsoft.com/v1.0/organization?$select=id,displayName,tenantType' `
  --headers "Content-Type=application/json"
# → tenantType: CIAM for "learneu"
```

### 2.4 Initialise azd env
```powershell
cd AMA\AMA_Project\demo
azd env new learneu-demo
azd env select learneu-demo
azd env set AZURE_LOCATION westeurope
azd env set AZURE_SUBSCRIPTION_ID 94223c9d-15b4-460e-95d4-5f47e3634c2b
```

### 2.5 Populate `.env.local`
Copy from `.env.template`, fill in tenant + sub + CIAM IDs, and set the OpenAI plan:
```ini
AZURE_TENANT_ID=63e6b296-bb9b-4234-81a1-0718d1ea9887
AZURE_SUBSCRIPTION_ID=94223c9d-15b4-460e-95d4-5f47e3634c2b
AZURE_LOCATION=westeurope
AZURE_ENV_NAME=learneu-demo
B2C_TENANT_ID=6c629140-a4ec-445b-9bc9-ab1f4fb1165e
B2C_TENANT_DOMAIN=learneu.onmicrosoft.com
OPENAI_DEPLOYMENT_NAME=gpt-5.4-nano
OPENAI_DEPLOYMENT_TYPE=GlobalStandard
OPENAI_TPM=50000
```

> `.env.local` is **never committed**. The deployment agent reads it but never echoes its values back to chat.

---

## 3. Stage 1 — read-only what-if

### 3.1 Compile Bicep locally
```powershell
az bicep build --file infra/main.bicep
```
Surface any drift / API-version errors before talking to ARM.

### 3.2 Generate provisioning preview
```powershell
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
azd provision --preview --no-prompt 2>&1 | Tee-Object ".deploy/$ts-stage1-whatif.log"
```

### 3.3 First-run failures and the three Bicep fixes
| Symptom | Root cause | Fix |
|---|---|---|
| `Authorization failed for ... resourceGroups/write` | Wrong identity (`etienne.sigwald@microsoft.com`, no sub-scope perm) | Switched to admin (`admin@MngEnv837178`) — see §2.2 |
| `ServiceModelDeprecating: gpt-4o,Version:2024-08-06 ... is in deprecating state` | Bicep pinned a deprecating model version | Bumped `version: '2024-11-20'` in `modules/openai.bicep` |
| `Purview is not available in westeurope for this tenant` | Tenant has no EU service location for Purview | Added `param deployPurview bool = false` to `main.bicep` and gated the module |
| `Fabric: At least one capacity administrator is required` | Module instantiated without admin members | Added `param deployFabric bool = false` |
| AML: `Missing dependent resources in workspace json` | `applicationInsights` not wired in | Added `param appInsightsId string` to `aml-workspace.bicep` and threaded it from `monitor.outputs.appInsightsId` |
| APIM: `NetworkSecurityGroupNotFound` on `snet-apim` | APIM-delegated subnets require a specific NSG | Added `nsg-apim-${envName}` to `networking.bicep` with the [3 mandatory inbound rules](https://learn.microsoft.com/azure/api-management/api-management-using-with-vnet) (3443/6390/443) |

### 3.4 Second run — SUCCESS (18 resources planned)
| Type | Name |
|---|---|
| Resource Group | `rg-learneu-demo` |
| Virtual Network | `vnet-learneu-demo` (3 subnets + APIM NSG) |
| Log Analytics | `log-learneu-demo` |
| Application Insights | `appi-learneu-demo` |
| Key Vault | `kv-learneu-demo-sjoo5sdv` (+ PE) |
| Azure OpenAI | `aoai-learneu-demo-…` (+ PE, + `gpt-5.4-nano` deployment) |
| Content Safety | `cs-learneu-demo-…` (+ PE) |
| AI Search | `srch-learneu-demo-…` (+ PE) |
| AML Workspace | `mlw-learneu-demo` (+ PE) |
| Storage | `stamlqoyrpqfojnfxe` |
| Container Registry | `acrqoyrpqfojnfxe` (Premium) |
| API Management | `apim-learneu-demo` (Developer SKU) |

---

## 4. Stage 2 — provision

### 4.1 First attempt
```powershell
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
azd up --no-prompt 2>&1 | Tee-Object ".deploy/$ts-stage2-up.log"
```

### 4.2 Transient failure on `pe-aoai-…`
The OpenAI account flips to `Accepted` while the model deployment is created; the private-endpoint creation in the same template race-condition fails:
```
AccountProvisioningStateInvalid: Account aoai-... in state Accepted
```
This is **idempotent retry territory** — Bicep deployments converge on `azd provision` re-runs, so we do **not** delete the RG. We just retry.

### 4.3 Retry loop
```powershell
azd provision --no-prompt
```
Run 2 → APIM finished, `pe-aoai` failed again with the same race.
Run 3 (after model swap, see §5) → all 18 resources `Done`, exit 0 in 1m31s.

---

## 5. Mid-flight model swap (`gpt-4o` → `gpt-5.4-nano`)

### 5.1 Verify model availability before touching anything
Source: [Microsoft Learn — *Foundry Models sold directly by Azure*](https://learn.microsoft.com/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure?tabs=europe%2Caz-global-standard%2Cglobal-standard&pivots=azure-openai#model-summary-table-and-region-availability).

- `gpt-5.4-nano` version `2026-03-17`
- ✅ Global Standard available in **West Europe** (and all other EU regions)
- No registered access required (per [Reasoning models availability](https://learn.microsoft.com/azure/foundry/openai/how-to/reasoning#availability))
- Quota: Tier 5/6 default; lower tiers require a Foundry quota request (separate from the gpt-4o quota)
- 400K context window, reasoning model

### 5.2 Edit the Bicep
Single resource in [`infra/modules/openai.bicep`](infra/modules/openai.bicep):
```bicep
@description('Azure OpenAI deployment name used by apps and pipelines (model: gpt-5.4-nano).')
param deploymentName string = 'gpt-5.4-nano'

resource gptDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: aoai
  name: deploymentName
  sku: { name: deploymentSkuName, capacity: deploymentCapacity }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-5.4-nano'
      version: '2026-03-17'
    }
    raiPolicyName: 'Microsoft.DefaultV2'
  }
}
```
Also updated: `.env.local`, `.env.template`, `ARCHITECTURE.md`, `README.md`, `pipelines/localisation/localise.py` and the swap note in `DEPLOYMENT-TUTORIAL.md`.

### 5.3 Validate
```powershell
az bicep build --file infra/main.bicep    # 0 errors
azd provision --preview --no-prompt
```
Preview confirmed:
- `Create  : Azure AI Services Model Deployment : gpt-5.4-nano`
- `Create  : Private Endpoint                   : pe-aoai-...`
- All other resources `Skip` or `Modify` (cosmetic property normalisation only).

### 5.4 Free the quota before applying
The previous run had already created `gpt-4o` consuming 50K TPM. To avoid `InsufficientQuota` on the new deployment, delete the old one first (it is no longer in the template, so a Bicep incremental deploy would not remove it):
```powershell
az cognitiveservices account deployment delete `
  --name aoai-learneu-demo-sjoo5sdvup35s `
  --resource-group rg-learneu-demo `
  --deployment-name gpt-4o
```

### 5.5 Apply the swap
```powershell
azd provision --no-prompt
```
Result: `gpt-5.4-nano` `Succeeded`, `pe-aoai-…` `Succeeded` (the AOAI account had reached `Succeeded` provisioning state by this point), exit 0, 1m31s wall time.

---

## 6. Stage 3 — post-provision verification (read-only)

All commands below run from the `demo/` directory.

### 6.1 Inventory
```powershell
az resource list -g rg-learneu-demo --query "[].{name:name,type:type,location:location}" -o table
```
**Expected:** 18 first-class resources + 5 PE-NICs + 1 Application Insights smart-detection (`global` only).

### 6.2 Public network access — should be `Disabled` everywhere except APIM
```powershell
$rg='rg-learneu-demo'
az resource list -g $rg --query "[?type=='Microsoft.CognitiveServices/accounts' || type=='Microsoft.KeyVault/vaults' || type=='Microsoft.Search/searchServices' || type=='Microsoft.MachineLearningServices/workspaces' || type=='Microsoft.ContainerRegistry/registries' || type=='Microsoft.Storage/storageAccounts'].{name:name,type:type}" -o tsv |
  ForEach-Object {
    $parts = $_ -split "`t"
    $pna = az resource show -g $rg -n $parts[0] --resource-type $parts[1] --query "properties.publicNetworkAccess" -o tsv
    "{0,-50} {1}" -f $parts[0], $pna
  }
```
**Result (May 8, 2026):**
```
kv-learneu-demo-sjoo5sdv               Disabled
srch-learneu-demo-sjoo5sdvup35s        Disabled
cs-learneu-demo-sjoo5sdvup35s          Disabled
aoai-learneu-demo-sjoo5sdvup35s        Disabled
stamlqoyrpqfojnfxe                     Disabled
acrqoyrpqfojnfxe                       Disabled
mlw-learneu-demo                       Disabled
```

### 6.3 OpenAI deployment shape
```powershell
az cognitiveservices account deployment list `
  -n aoai-learneu-demo-sjoo5sdvup35s -g rg-learneu-demo `
  --query "[].{name:name,model:properties.model.name,version:properties.model.version,sku:sku.name,capacity:sku.capacity,state:properties.provisioningState}" -o table
```
**Result:**
```
Name          Model         Version     Sku             Capacity  State
gpt-5.4-nano  gpt-5.4-nano  2026-03-17  GlobalStandard       50  Succeeded
```

### 6.4 Key Vault security posture
```powershell
az keyvault show -n kv-learneu-demo-sjoo5sdv -g rg-learneu-demo `
  --query "{softDelete:properties.enableSoftDelete,purgeProtection:properties.enablePurgeProtection,rbac:properties.enableRbacAuthorization}" -o json
```
**Expected:** all three `true`.

### 6.5 APIM identity
```powershell
az apim show -n apim-learneu-demo -g rg-learneu-demo `
  --query "{state:provisioningState,sku:sku.name,identity:identity.type,principalId:identity.principalId}" -o json
```
**Expected:** `state=Succeeded`, `sku=Developer`, `identity=SystemAssigned`. The `principalId` is what we will grant Cognitive Services User on the AOAI account in Stage 4.

### 6.6 Diagnostic settings flow into LAW
```powershell
$lawId = az monitor log-analytics workspace show -g rg-learneu-demo -n log-learneu-demo --query id -o tsv
foreach ($r in @(
  'aoai-learneu-demo-sjoo5sdvup35s',
  'cs-learneu-demo-sjoo5sdvup35s',
  'srch-learneu-demo-sjoo5sdvup35s',
  'kv-learneu-demo-sjoo5sdv',
  'apim-learneu-demo',
  'mlw-learneu-demo'
)) {
  $rid = az resource show -g rg-learneu-demo -n $r --query id -o tsv 2>$null
  if ($rid) { az monitor diagnostic-settings list --resource $rid --query "[].{name:name,workspace:workspaceId}" -o tsv }
}
```
**Expected:** every resource emits `to-law` pointing at `log-learneu-demo`.

### 6.7 Region check (EU residency)
```powershell
az resource list -g rg-learneu-demo --query "[?location!='westeurope' && location!='global'].{name:name,location:location}" -o table
```
**Expected:** empty.

---

## 7. Architecture diagram

See [`ARCHITECTURE.md`](ARCHITECTURE.md). Top-level topology:

```
External users (Learner | Parent | Teacher)
        │
        ▼
Microsoft Entra (CIAM tenant: learneu) — for parents/learners
Microsoft Entra (workforce tenant)     — for teachers
        │
        ▼
APIM (apim-learneu-demo, Developer SKU, public ingress)
        │ system-assigned identity
        ├─► Azure OpenAI (gpt-5.4-nano, 50K TPM, PE-only)
        ├─► Azure AI Content Safety (PE-only)
        ├─► Azure AI Search (PE-only, curriculum RAG)
        └─► Azure ML Workspace (HBI, PE-only)
                ├─► Storage (private)
                ├─► ACR (Premium, private)
                ├─► Key Vault (purge-protected)
                └─► Application Insights → Log Analytics
```
Public access is disabled on **every** data plane except APIM. All cross-service calls happen over private endpoints inside `vnet-learneu-demo`.

---

## 8. Cost & quota checklist

| Resource | SKU / size | Approx. monthly cost (West Europe) | Notes |
|---|---|---|---|
| Azure OpenAI `gpt-5.4-nano` | GlobalStandard, 50K TPM | Pay-per-token (no PTU reservation) | Model card: 400K ctx, reasoning |
| APIM | Developer | ~50 €/month | Single instance, NOT for production |
| AI Search | Basic | ~75 €/month | Bump to Standard for ≥ 1M docs |
| Container Registry | Premium | ~17 €/month | Required for VNet integration |
| AML | (workspace only) | quasi-nul | Compute is created on-demand |
| LAW | Pay-as-you-go | ~3 €/GB ingested | 90-day retention |
| Application Insights | Workspace-based | included in LAW | |
| Key Vault | Standard | < 1 € | |
| Storage | Standard LRS | < 1 € for demo data | |

**`azd down --force --purge`** when the demo is not running. Pause Fabric (when re-enabled) and delete the OpenAI deployment to stop residual cost.

---

## 9. Rollback & teardown

| Scenario | Command |
|---|---|
| Roll back the model swap only | Revert `infra/modules/openai.bicep` to `gpt-4o 2024-11-20`, then `azd provision`. The new deployment is removed and the old one re-created (the **deployment** resource is mutable; the **account** stays). |
| Re-create from scratch | `azd down --force --purge` then `azd up --no-prompt`. |
| Tear down everything | `azd down --force --purge` and verify with `az group exists -n rg-learneu-demo`. |

---

## 10. Lessons learned

1. **Run with the right identity from the start.** Sub-scope writes need Owner/Contributor; otherwise the first what-if fails on RG creation.
2. **Bicep `2024-08-06` model versions are deprecating** — pin the latest GA (or the new GA reasoning model `gpt-5.4-nano 2026-03-17`).
3. **APIM-delegated subnets require their own NSG.** This is checked before deployment validation; you need 3 inbound rules (3443, 6390, 443).
4. **AML workspace requires Application Insights** in the `properties.applicationInsights` field. ARM throws *"Missing dependent resources"* otherwise.
5. **AOAI private endpoint races the account state.** Re-running `azd provision` is the documented fix; it is idempotent.
6. **Model swap is non-destructive at the account level.** Deleting the obsolete deployment first frees quota; the next `azd provision` adds the new one without recreating the AOAI account.
7. **Always check region availability on Microsoft Learn**, with the correct tab (Americas / Europe / Asia Pacific). Search snippets only show one tab at a time.
8. **Purview / Fabric availability varies per tenant**, not per region. Check `az provider show ... --query resourceTypes` before assuming a service is reachable in your sub.

---

## 11. Next stages (preview)

| Stage | Goal | Main commands |
|---|---|---|
| 4 | Build, push, deploy `apps/learner-web`, `apps/parent-portal`, `apps/teacher-console` containers; create APIM products and policies | `docker build`, `az acr login`, `az acr import`, `azd deploy`, `az apim api import` |
| 5 | Seed curricula JSON + glossaries CSV, generate 50 synthetic learners, run the localisation pipeline once | `pwsh scripts/seed_curricula.ps1`, `python pipelines/localisation/localise.py`, `pwsh scripts/seed_learners.ps1` |
| 6 | Run the 9 acceptance criteria from Case Study 33 (per-persona) | `pytest tests/acceptance` |
| 7 | Emit final `DEPLOYMENT-REPORT.md` with KPIs, costs, residual risks, follow-ups | agent emits |

---

_This walkthrough was assembled by the **demo-deployment-agent** chatmode. Re-running every command in §2–6 on a fresh subscription should reproduce the same end-state up to resource names (uniqueString suffix differs)._
