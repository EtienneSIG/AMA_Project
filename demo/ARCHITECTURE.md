# LearnEU — Target Architecture (Mermaid)

Visual representation of the deployed `rg-learneu-demo` resource group plus the surrounding identity and external systems. Generated from `infra/main.bicep` after Stage 2 fixes (Purview & Fabric gated off; APIM NSG attached; AML wired to Application Insights).

> Rendered as a layered `flowchart` (Mermaid ≥ 8.x, natively supported by GitHub, VS Code preview and `mmdc`). Nodes are grouped by tier and colour-coded to keep the data flow easy to follow. Gated / not-deployed items use a dashed grey style.

```mermaid
flowchart TB
  %% ============ IDENTITY ============
  subgraph IDP["&nbsp;Microsoft Entra&nbsp;"]
    direction LR
    WF["Workforce<br/><small>esig_tenant — staff</small>"]
    CIAM["CIAM learneu<br/><small>end users</small>"]
  end

  %% ============ APPS ============
  subgraph APPS["&nbsp;Demo Apps &middot; App Service&nbsp;"]
    direction LR
    LW["Learner Web"]
    LWM["Learner Mobile PWA"]
    PP["Parent Portal"]
    TC["Teacher Console"]
    ADM["Admin"]
  end

  %% ============ GATEWAY ============
  subgraph GW["&nbsp;Ingress &middot; Networking&nbsp;"]
    direction LR
    APIM["APIM<br/><small>internal VNet</small>"]
    VNET["VNet 10.42.0.0/16<br/><small>PE + AML subnets</small>"]
  end

  %% ============ AI SERVICES ============
  subgraph AI["&nbsp;AI Services&nbsp;"]
    direction LR
    AOAI["Azure OpenAI<br/><small>gpt-5.4-nano</small>"]
    CS["Content Safety"]
    SRCH["AI Search"]
  end

  %% ============ DATA & ANALYTICS ============
  subgraph DATA["&nbsp;Data &amp; Analytics&nbsp;"]
    direction LR
    PG["Postgres Flex<br/><small>B1ms &middot; learneu db</small>"]
    FAB["Fabric<br/><small>OneLake &middot; EU capacity</small>"]
    RAY["Rayfin App (Fabric)<br/><small>Director reporting</small>"]
    PBIR["Power BI Report<br/><small>Board FinOps &amp; Governance</small>"]
  end

  %% ============ ML PLATFORM ============
  subgraph ML["&nbsp;ML Platform&nbsp;"]
    direction LR
    AML["Azure ML<br/><small>mlw — HBI</small>"]
    KV["Key Vault"]
    SA["Storage AML"]
    ACR["ACR Premium"]
  end

  %% ============ OBSERVABILITY ============
  subgraph OBS["&nbsp;Observability&nbsp;"]
    direction LR
    LAW["Log Analytics"]
    APPI["App Insights"]
  end

  %% ============ GATED ============
  subgraph GATED["&nbsp;Not Deployed&nbsp;"]
    PRV["Purview"]
  end

  %% ---- Identity to Apps ----
  CIAM --> LW & LWM & PP
  WF --> TC & ADM

  %% ---- Apps to Gateway ----
  LW & LWM & PP & TC & ADM ==>|HTTPS| APIM

  %% ---- Apps to Data ----
  LW & LWM & PP & TC & ADM -->|PE| PG

  %% ---- Gateway fan-out ----
  APIM --> AOAI & CS & SRCH
  APIM -.-> VNET
  VNET --> AML

  %% ---- Data & analytics flow ----
  PG -->|mirror| FAB
  FAB --> RAY
  FAB --> PBIR

  %% ---- ML dependencies ----
  AML --> KV & SA & ACR

  %% ---- Observability ----
  AOAI -.-> LAW
  AML -.-> LAW
  PG -.-> LAW
  APIM -.-> APPI

  %% ============ STYLING ============
  classDef identity fill:#e8eaf6,stroke:#3f51b5,color:#1a237e;
  classDef apps fill:#e3f2fd,stroke:#1976d2,color:#0d47a1;
  classDef gw fill:#fff3e0,stroke:#e65100,color:#bf360c;
  classDef ai fill:#f3e5f5,stroke:#7b1fa2,color:#4a148c;
  classDef data fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20;
  classDef ml fill:#fce4ec,stroke:#c2185b,color:#880e4f;
  classDef obs fill:#eceff1,stroke:#455a64,color:#263238;
  classDef gated fill:#fafafa,stroke:#9e9e9e,color:#9e9e9e,stroke-dasharray:5 5;

  class WF,CIAM identity;
  class LW,LWM,PP,TC,ADM apps;
  class APIM,VNET gw;
  class AOAI,CS,SRCH ai;
  class PG,FAB,RAY,PBIR data;
  class AML,KV,SA,ACR ml;
  class LAW,APPI obs;
  class PRV gated;
```

## Notes

- **Legend:** solid bold arrows = user HTTPS traffic; solid thin arrows = service-to-service calls / private-endpoint data access; dotted arrows = telemetry and networking associations. Each tier is colour-coded (identity, apps, gateway, AI, data, ML, observability).
- **Gated off (dashed grey):** Purview is **not** provisioned in this run. Documented as follow-up in `DEPLOYMENT-REPORT.md`. The **Fabric** capacity hosts the **Rayfin app** (director reporting) and the **board Power BI report**, connected to the director / board reporting surfaces.
- **Public network access:** disabled on Key Vault, OpenAI, Content Safety, AI Search, AML, Storage, ACR. Only APIM has public ingress, fronting all backends.
- **EU residency:** all resources in `westeurope`. EU-only allowlist enforced in `infra/main.bicep`.
- **Identity split:** workforce tenant for staff (Teacher), CIAM tenant `learneu` for end users (Learner, Parent), per Case Study 33 §4.3.
- **Learner mobile surface:** `learner mobile pwa` is a logical UX surface (`/mobile.html`) served by the same `learner-web` App Service, not a separate Azure resource.
- **Fabric reporting:** Postgres mirrors to the **Fabric** capacity (OneLake). **Director** analytics run as a native **Rayfin Fabric app** surfaced in the director portal; the **board** consumes a dedicated **Power BI report** (Board FinOps & Governance) built on the same Fabric data. Power BI Embedded has been **retired** (spec 018/022).
- **Model:** OpenAI `gpt-5.4-nano` version `2026-03-17` (reasoning, 400K context window), GlobalStandard, 50K TPM (Plan B — no PTU available in West Europe at deployment time). Confirmed available in West Europe per Microsoft Learn region table (April 2026).
- **App data store:** Azure Database for PostgreSQL Flexible Server (`pg-learneu-demo`), Burstable B1ms, PostgreSQL 16, 32 GB, public access disabled, private endpoint in `snet-pe`, TLS required. Three tables: `connection_logs`, `ask_history`, `sheets`. Admin password generated at deploy time and stored in Key Vault as `pg-admin-password` — every App Service consumes it via `@Microsoft.KeyVault` reference. Auto-applied schema lives in `apps/_shared/db/schema.sql`.

## How to render

- VS Code with the Mermaid preview extension, or
- `mmdc -i ARCHITECTURE.md -o ARCHITECTURE.svg`, or
- Push to GitHub — Mermaid is rendered natively in fenced \`\`\`mermaid blocks.
