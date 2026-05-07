# 09 — Step-by-Step Tutorial: From Zero to Running Demo

> Hands-on guide to build the **LearnEU** demo from an empty Azure subscription to a working end-to-end flow (Parent → Author → Learner → Teacher → DPO).
>
> **Audience:** Solution Engineer doing the build alone or with a small squad.
> **Time:** ~10 working days following the daily plan in [08-demo-on-azure.md](08-demo-on-azure.md).
> **Outcome:** all 9 acceptance criteria from [08-demo-on-azure.md](08-demo-on-azure.md#acceptance-criteria-for-the-demo) pass.

---

## Prerequisites — install once

Run all commands from PowerShell (`pwsh`).

```powershell
# Tools
winget install --id Microsoft.AzureCLI -e
winget install --id Microsoft.Bicep -e
winget install --id Microsoft.Azd -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Python.Python.3.12 -e
winget install --id Git.Git -e
winget install --id Microsoft.PowerShell -e
winget install --id Docker.DockerDesktop -e

# VS Code extensions
code --install-extension ms-azuretools.vscode-bicep
code --install-extension ms-azuretools.azure-dev
code --install-extension ms-python.python
code --install-extension ms-azuretools.vscode-docker
code --install-extension GitHub.copilot
code --install-extension GitHub.copilot-chat
```

### Required Azure access
- One **Azure subscription** with Owner role (or contributor + User Access Admin)
- An **Entra ID tenant** with permission to create app registrations
- A **separate Entra External ID / B2C tenant** (created in Step 1.2)
- Quota in **West Europe** for: Azure OpenAI (gpt-4o), Azure AI Search S1, AKS, Fabric capacity F2, NCas-T4 v3 (1 GPU)
- A **GitHub account** for source control

> ⚠️ **Azure OpenAI quota** is approval-based. Submit the request on Day 1; without it, Step 4 (localisation) cannot run.

---

## Day 0 — Workspace bootstrap

### 0.1 Clone the repo and structure
```powershell
cd c:\Users\esigwald\Documents\03_Dev\200_AMA
mkdir AMA_Project\demo -Force
cd AMA_Project\demo
mkdir infra, infra\modules, data, data\glossaries, data\curricula, ml, ml\adaptive_model, ml\assessment_model, apps, apps\learner-web, apps\teacher-console, apps\parent-portal, pipelines, pipelines\localisation, pipelines\continuous-eval, scripts -Force
```

### 0.2 Initialise `azd` project
```powershell
azd init --template minimal --environment learneu-demo
```
Edit `azure.yaml`:
```yaml
name: learneu-demo
metadata:
  template: learneu@0.1.0
infra:
  provider: bicep
  path: infra
services:
  parent-portal:
    project: ./apps/parent-portal
    language: js
    host: appservice
  teacher-console:
    project: ./apps/teacher-console
    language: js
    host: appservice
  learner-web:
    project: ./apps/learner-web
    language: js
    host: appservice
```

### 0.3 Login & subscription
```powershell
az login
az account set --subscription "<your-subscription-id>"
azd auth login
```

### 0.4 Submit Azure OpenAI quota request
Portal → *Subscriptions* → *Usage + quotas* → *Azure OpenAI* → Request increase to **gpt-4o, 50K TPM** in **West Europe**.

---

## Day 1 — Landing zone (Bicep)

Build the Bicep skeleton. Every resource is **EU-pinned** and uses **Private Endpoints**.

### 1.1 `infra/main.bicep`
```bicep
targetScope = 'subscription'

@description('Demo environment name')
param envName string = 'learneu-demo'

@description('Primary region (EU only for Case Study 33)')
@allowed(['westeurope','northeurope','francecentral','germanywestcentral','polandcentral','swedencentral'])
param location string = 'westeurope'

param tags object = {
  program: 'LearnEU'
  caseStudy: '33'
  dataClass: 'ChildPersonalData-Restricted'
  region: 'EU'
}

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-${envName}'
  location: location
  tags: tags
}

module networking 'modules/networking.bicep' = {
  scope: rg
  name: 'networking'
  params: { envName: envName, location: location, tags: tags }
}

module kvhsm 'modules/keyvault-hsm.bicep' = {
  scope: rg
  name: 'kvhsm'
  params: { envName: envName, location: location, tags: tags, subnetId: networking.outputs.peSubnetId }
}

module monitor 'modules/monitor.bicep' = {
  scope: rg
  name: 'monitor'
  params: { envName: envName, location: location, tags: tags }
}

module purview 'modules/purview.bicep' = {
  scope: rg
  name: 'purview'
  params: { envName: envName, location: location, tags: tags }
}

module apim 'modules/apim.bicep' = {
  scope: rg
  name: 'apim'
  params: { envName: envName, location: location, tags: tags, subnetId: networking.outputs.apimSubnetId }
}

module aisearch 'modules/ai-search.bicep' = {
  scope: rg
  name: 'aisearch'
  params: { envName: envName, location: location, tags: tags, peSubnetId: networking.outputs.peSubnetId }
}

module openai 'modules/openai.bicep' = {
  scope: rg
  name: 'openai'
  params: { envName: envName, location: location, tags: tags, peSubnetId: networking.outputs.peSubnetId }
}

module contentSafety 'modules/content-safety.bicep' = {
  scope: rg
  name: 'contentsafety'
  params: { envName: envName, location: location, tags: tags, peSubnetId: networking.outputs.peSubnetId }
}

module aml 'modules/aml-workspace.bicep' = {
  scope: rg
  name: 'aml'
  params: {
    envName: envName, location: location, tags: tags
    peSubnetId: networking.outputs.peSubnetId
    keyVaultId: kvhsm.outputs.keyVaultId
    logAnalyticsId: monitor.outputs.logAnalyticsId
  }
}

module fabric 'modules/fabric-capacity.bicep' = {
  scope: rg
  name: 'fabric'
  params: { envName: envName, location: location, tags: tags }
}
```

### 1.2 Module skeletons
For each `infra/modules/*.bicep`, follow this pattern:
- Public network access **Disabled**
- Private Endpoint into the `pe` subnet
- Customer-Managed Key from Key Vault HSM
- Diagnostic settings → Log Analytics
- Tags propagated

> 📝 You don't have to write each module from scratch. Generate them with the Solution Architect mode:
>
> ```
> Use the AMA Solution Architect chat mode and prompt:
> "Generate production-quality Bicep for openai.bicep with: Standard S0, public access disabled, private endpoint into <peSubnetId>, customer-managed key from <keyVaultId>, gpt-4o deployment with PTU=50, content filter enabled, region westeurope, tags <tags>."
> ```
> Repeat for each module.

### 1.3 Provision
```powershell
azd up
```

### Day 1 checkpoint ✅
- Resource group `rg-learneu-demo` exists
- All resources show **Public access: Disabled**
- Private Endpoints visible on each PaaS
- No errors in `azd` output

---

## Day 2 — Identity (Azure AD B2C / Entra External ID)

> ℹ️ Microsoft is unifying B2C into **Microsoft Entra External ID**. The case study says B2C; either works. Steps below are for Entra External ID.

### 2.1 Create the External ID tenant
Portal → *Microsoft Entra External ID* → *Create a tenant* → choose region: **Europe**.

### 2.2 Register the apps
```powershell
$tenantId = "<external-tenant-id>"
az login --tenant $tenantId

# Apps
az ad app create --display-name "LearnEU - Parent Portal" --sign-in-audience AzureADMyOrg
az ad app create --display-name "LearnEU - Teacher Console" --sign-in-audience AzureADMyOrg
az ad app create --display-name "LearnEU - Learner Web" --sign-in-audience AzureADMyOrg
```

### 2.3 User flows
Create three flows:
1. **Sign-up & sign-in** for parents (email + password + MFA)
2. **Sign-in** for teachers (with school IdP federation)
3. **Sign-in** for learners (age-gated; <16 requires linked parental consent)

### 2.4 Custom policy: parental consent
- Use the [B2C Custom Policy starter pack](https://github.com/azure-ad-b2c/samples) (`SocialAndLocalAccounts`)
- Add a custom journey `B2C_1A_PARENTAL_CONSENT`:
  - Collect parent email + child id
  - Verify parent identity (email OTP for demo; eID in production)
  - Persist consent receipt to a backing API (will create on Day 8)

### 2.5 Mock national eID
For demo, register a SAML test IdP (e.g. SAML2 sample app). Wire it as an external IdP.

### Day 2 checkpoint ✅
- 3 app registrations created
- 3 user flows live
- Parental consent journey runs end-to-end with mocked eID

---

## Day 3 — Synthetic data, curricula, glossaries

> 🛡️ **Never use real children's data.** Generate synthetic personas only.

### 3.1 Synthetic learners
`scripts/seed_learners.ps1`
```powershell
param([int]$Count = 50, [string]$OutFile = "..\data\synthetic_learners.csv")
$markets = @("NL","DE")
$rows = 1..$Count | ForEach-Object {
  [pscustomobject]@{
    learner_id = [guid]::NewGuid()
    market = $markets | Get-Random
    grade = 7
    decile = Get-Random -Minimum 1 -Maximum 11
    sen = (Get-Random -Maximum 5) -eq 0
    pseudonym = "L-" + (Get-Random -Maximum 99999).ToString("D5")
  }
}
$rows | Export-Csv -NoTypeInformation $OutFile
```

### 3.2 Curricula
- Download / hand-curate the **Year 7 Math fractions** competencies for NL kerndoelen and DE Bildungsstandards
- Save as JSON in `data/curricula/`

### 3.3 Glossaries
`data/glossaries/math-nl-NL.csv` and `math-de-DE.csv`:
```
source,target,context
fraction,breuk,nl-NL math
numerator,teller,nl-NL math
denominator,noemer,nl-NL math
```

### 3.4 Canonical authoring sample
`data/math_unit_fractions.md`:
```markdown
---
title: "Introduction to fractions"
grade: 7
subject: math
language: en
lrmi:
  educationalAlignment: ["NL/kerndoelen/wiskunde/breuken/intro"]
---
# Introduction to fractions
A fraction represents a part of a whole...
```

### 3.5 Seed
```powershell
.\scripts\seed_learners.ps1 -Count 50
.\scripts\seed_curricula.ps1
```

### Day 3 checkpoint ✅
- 50 synthetic learners in CSV
- 2 curriculum JSON files
- 2 glossaries
- 1 canonical authoring sample

---

## Day 4 — Localisation pipeline

### 4.1 Index curricula in Azure AI Search
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install azure-search-documents azure-identity openai langchain
python pipelines\localisation\index_curricula.py
```
`index_curricula.py` (sketch):
- Read each curriculum JSON
- Generate embeddings with `text-embedding-3-large` (Azure OpenAI deployment)
- Push to a vector index `curricula-v1`

### 4.2 Localisation prompt flow
`pipelines/localisation/localise.py`:
1. Read source unit (Markdown)
2. Retrieve top-k mappings from AI Search per target market
3. Build prompt with country glossary + style pack
4. Call Azure OpenAI `gpt-4o` (chat completions, structured output)
5. Pass full output through Azure AI Content Safety (`text:analyze` + jailbreak shield)
6. Persist localised output to OneLake `/content/<market>/<unit-id>.md`

### 4.3 Run the pipeline
```powershell
python pipelines\localisation\localise.py --source ..\..\data\math_unit_fractions.md --target de-DE
```

### Day 4 checkpoint ✅
- AI Search index `curricula-v1` populated
- One unit localised NL→DE in < 2 min
- Content Safety verdict stored alongside the artifact
- Artifact visible in OneLake

---

## Day 5 — Adaptive learner model + ONNX

### 5.1 Train (centrally on synthetic data for demo speed)
`ml/adaptive_model/train_central.py`:
- Use a tiny PyTorch model (bandit / contextual bandit) over (learner_features, item_features) → next-item probability
- Apply DP-SGD via [Opacus](https://opacus.ai/) with ε ≤ 4 per term (placeholder)
- Save model card + data sheet alongside the model

```powershell
cd ml\adaptive_model
pip install torch opacus onnx onnxruntime mlflow
python train_central.py --data ..\..\data\synthetic_learners.csv --epochs 5
python export_onnx.py
```

### 5.2 Register in AML
```powershell
az ml model create --name learner-model --version 1 --path ./outputs/model.onnx --workspace-name aml-learneu --resource-group rg-learneu-demo --properties '{"epsilon":"4","dataset":"synthetic_learners.csv","modelCardPath":"outputs/model-card.md"}'
```

### 5.3 Wire into the learner web app
- `apps/learner-web` (React + Vite)
- Use [`onnxruntime-web`](https://www.npmjs.com/package/onnxruntime-web) to load `model.onnx` from a static URL or `<script type="module">`
- The next-item decision happens **in the browser**

### Day 5 checkpoint ✅
- Model artifact registered with model card + DP ε
- Browser DevTools shows ONNX inference happening client-side

---

## Day 6 — Federated round on Confidential AKS

> The demo includes **one** federated round to prove the pattern. Production uses Flower or NVIDIA FLARE on Confidential AKS.

### 6.1 Provision Confidential AKS pool
Add to `infra/modules/aml-workspace.bicep` (or a new `aks-confidential.bicep`):
- AKS cluster with one **Confidential VM (DCasv5)** node pool
- Workload identity enabled

### 6.2 Aggregator service
`ml/adaptive_model/federated_round.py`:
- Hosts a tiny gRPC endpoint that receives DP-protected gradient blobs
- Performs **Secure Aggregation** (sum gradients without decrypting individual contributions in clear)
- Updates model and pushes new ONNX to AML registry as version 2

### 6.3 Simulate clients
A short script `simulate_clients.py` simulates 50 learners contributing one round.

### Day 6 checkpoint ✅
- Model **v2** in AML registry, with model card noting the round size and DP budget
- Updated ONNX served to learner web app

---

## Day 7 — Assessment AI + APIM wiring

### 7.1 Train rubric grader
`ml/assessment_model/train.py` — small fine-tuned classifier (or LLM-as-judge with rubric prompt) that returns:
```json
{ "score": 0.82, "rationale": "...", "confidence": 0.91 }
```

### 7.2 Deploy as AML Online Endpoint with **payload retention disabled**
```yaml
# ml/assessment_model/endpoint.yml
$schema: https://azuremlschemas.azureedge.net/latest/managedOnlineEndpoint.schema.json
name: assessment-endpoint
auth_mode: aml_token
public_network_access: disabled
data_collector:
  collections:
    request: { enabled: false }
    response: { enabled: false }
```
```powershell
az ml online-endpoint create -f ml\assessment_model\endpoint.yml
az ml online-deployment create -f ml\assessment_model\deployment.yml --all-traffic
```

### 7.3 APIM facade
- Import the AML endpoint OpenAPI as an APIM API `/assessment`
- Apply policies:
  - `validate-jwt` (B2C audience)
  - `rate-limit` 60/min/parent
  - `set-header` strip PII
  - `outbound`: log decision hash + model version to App Insights (AI Act Art. 12)

### 7.4 Fallback to Azure OpenAI
If `confidence < 0.85`, APIM forwards to a **judge prompt** routed through Content Safety.

### Day 7 checkpoint ✅
- `POST /assessment` returns a graded response with rationale
- Logs in App Insights show: input hash, output, model version, confidence, override placeholder

---

## Day 8 — Teacher Console + Power BI in Fabric

### 8.1 Power BI report
- In Fabric workspace, create a report `LearnEU Teacher` from the **Gold** lakehouse layer
- Charts: class mastery heatmap, per-cohort fairness disparity, override rate trend
- **No individual learner PII** in any visual

### 8.2 Teacher Console
`apps/teacher-console` (React):
- Embed Power BI via [Embed for your customers](https://learn.microsoft.com/power-bi/developer/embedded/embed-tokens) (App-Owns-Data)
- Override flow: PUT `/assessment/{id}/override` → APIM → AML endpoint logs the override

### 8.3 Override telemetry into RAI dashboard
- AML pipeline `pipelines/continuous-eval` reads override events from App Insights → updates RAI dashboard nightly

### Day 8 checkpoint ✅
- Teacher logs in via Entra External ID
- Power BI loads embedded
- Override updates flow into the override-rate metric

---

## Day 9 — Parent Portal + erasure cascade

### 9.1 Parent Portal
`apps/parent-portal` (React + B2C MSAL):
- Tabs: *Consent*, *My child's data*, *Erase my child's data*, *Export*
- Pages call APIM `/parent/*` APIs

### 9.2 Erasure cascade
`pipelines/erasure_cascade.py` orchestrates:
1. Find all rows referencing `learner_id` in OneLake (Bronze/Silver/Gold)
2. Delete or pseudonymise per retention policy
3. Tombstone in Feature Store
4. Replace audit log entries with hashed reference (keep model version + decision class for AI Act Art. 12)
5. Confirm to portal in < 5 minutes

### 9.3 Test the rights flow
```powershell
python pipelines\erasure_cascade.py --learner-id <synthetic-id>
```

### Day 9 checkpoint ✅
- Erasure completes in < 5 min
- Purview shows updated lineage
- Audit log retains hashed reference only

---

## Day 10 — Purview catalog, Azure Monitor workbook, dry run

### 10.1 Register sources in Purview
```powershell
az purview account create --account-name purview-learneu --resource-group rg-learneu-demo
# Register OneLake, AML, AI Search via Purview portal (UI step)
```
- Apply sensitivity label **Child Personal Data — Restricted** to consent receipts and any pseudonymised tables
- Trigger scan; verify lineage end-to-end

### 10.2 Azure Monitor workbook (AI Act Art. 12)
Create a Workbook from JSON template with:
- KQL chart: assessment requests per minute
- KQL table: input hash, output, model version, override flag, confidence, timestamp
- Filter by feature, market, time window

```kql
AppEvents
| where Name == "assessment.scored"
| project TimeGenerated, hash=Properties.input_hash, model=Properties.model_version, confidence=todouble(Properties.confidence), override=tobool(Properties.override)
| order by TimeGenerated desc
```

### 10.3 Final dry run (15 minutes — the demo storyline)
Run through all 6 demo steps in [08-demo-on-azure.md](08-demo-on-azure.md#demo-storyline-15-minutes). Tick off each acceptance criterion.

### Day 10 checkpoint ✅
- All 9 acceptance criteria pass
- Demo is reproducible from `azd up` in < 60 minutes

---

## Daily smoke test (run before any demo)

`scripts/run_demo.ps1`:
```powershell
$ErrorActionPreference = "Stop"

Write-Host "1. Provision check..."
az group show --name rg-learneu-demo | Out-Null

Write-Host "2. Localisation..."
python ..\pipelines\localisation\localise.py --source ..\data\math_unit_fractions.md --target de-DE

Write-Host "3. Adaptive model registry..."
az ml model show --name learner-model --version 2 --workspace-name aml-learneu --resource-group rg-learneu-demo | Out-Null

Write-Host "4. Assessment endpoint..."
$resp = curl -s -X POST "$env:APIM_BASE/assessment" -H "Authorization: Bearer $env:DEMO_TOKEN" -d '{"answer":"3/4 of 8 is 6"}'
Write-Host $resp

Write-Host "5. Teacher dashboard ping..."
curl -s "$env:TEACHER_URL/health" | Out-Null

Write-Host "6. Erasure dry-run..."
python ..\pipelines\erasure_cascade.py --learner-id $env:SYNTHETIC_LEARNER_ID --dry-run

Write-Host "✅ Smoke test passed"
```

---

## Tear down (don't burn budget)

```powershell
azd down --force --purge
```
- This removes the resource group and **purges** soft-deleted resources (Key Vault, Cognitive Services, etc.)
- B2C/External ID tenant: delete via portal

---

## Troubleshooting cheatsheet

| Symptom | Likely cause | Fix |
|---|---|---|
| `azd up` fails on Azure OpenAI | No quota | Wait for quota approval; use `westeurope` only |
| Bicep "PrivateEndpoint location mismatch" | PE subnet in different region | Force all to `westeurope` |
| Browser fails to load ONNX | CORS on App Service | Add allowed origin in App Service config |
| AML endpoint 401 | Wrong audience in JWT | APIM `validate-jwt` audience must match B2C app id |
| Content Safety 429 | Burst above tier limit | Lower TPM in your demo loop; upgrade tier |
| Power BI embed token expired | Token TTL too short | Refresh via service principal hourly |
| Purview lineage missing | Scan not run | Trigger scan; verify managed identity has Storage Blob Data Reader on the lake |

---

## What to do next

- Promote this demo to a **deployable template** (move `infra/` into a `bicep/` repo; add CI)
- Build the **production architecture** from [03-target-architecture.md](03-target-architecture.md) (multi-region, dedicated Fabric capacity, CMK rotation, etc.)
- Drive Phase 0 deliverables in [01-phases-roadmap.md](01-phases-roadmap.md)
- Schedule the **first RAI Council** review with the demo as the unit under test
