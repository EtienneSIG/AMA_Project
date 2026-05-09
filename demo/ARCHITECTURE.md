# LearnEU — Target Architecture (Mermaid)

Visual representation of the deployed `rg-learneu-demo` resource group plus the surrounding identity and external systems. Generated from `infra/main.bicep` after Stage 2 fixes (Purview & Fabric gated off; APIM NSG attached; AML wired to Application Insights).

```mermaid
flowchart TB
  classDef ext fill:#fff5e1,stroke:#d18a00,color:#5a3b00
  classDef id fill:#e6f0ff,stroke:#0a4ca0,color:#0a2540
  classDef rg fill:#f0fff4,stroke:#1f7a3a,color:#0d3a1d,stroke-dasharray:0
  classDef pe fill:#f4ecff,stroke:#5b21b6,color:#2e0e62
  classDef ai fill:#fde7f1,stroke:#a4135f,color:#4a0827
  classDef sec fill:#eef2f7,stroke:#334155,color:#0f172a
  classDef obs fill:#e7f7ff,stroke:#0369a1,color:#0c4a6e
  classDef data fill:#fff7e6,stroke:#a16207,color:#451a03
  classDef gw fill:#ffe9e9,stroke:#a31616,color:#3b0a0a
  classDef gone fill:#f3f4f6,stroke:#9ca3af,color:#6b7280,stroke-dasharray:3 3

  %% External actors / consumers
  Learner["👦 Learner (web)"]:::ext
  Parent["👪 Parent (portal)"]:::ext
  Teacher["👩‍🏫 Teacher (console)"]:::ext

  %% Identity tenants
  subgraph IDP["Microsoft Entra (identity)"]
    direction TB
    Workforce["Workforce tenant<br/>esig_tenant<br/>63e6b296-…9887<br/>(MngEnv837178.onmicrosoft.com)"]:::id
    CIAM["External ID for customers (CIAM)<br/>learneu<br/>6c629140-…1165e<br/>(learneu.onmicrosoft.com)"]:::id
  end

  %% Resource group
  subgraph RG["Subscription esig_tenant • RG rg-learneu-demo • westeurope"]
    direction TB

    %% Edge / gateway
    APIM["Azure API Management<br/>apim-learneu-demo<br/>(internal VNet, NSG nsg-apim-…)"]:::gw

    %% Networking
    subgraph NET["Virtual Network vnet-learneu-demo (10.42.0.0/16)"]
      direction LR
      SnetPE["snet-pe<br/>10.42.1.0/24"]:::sec
      SnetAPIM["snet-apim<br/>10.42.2.0/24<br/>+NSG"]:::sec
      SnetAML["snet-aml<br/>10.42.3.0/24"]:::sec
      SnetAKS["snet-aks<br/>10.42.4.0/22 (reserved)"]:::sec
    end

    %% Private endpoints
    PEKV[("PE kv")]:::pe
    PEAOAI[("PE aoai")]:::pe
    PECS[("PE cs")]:::pe
    PESRCH[("PE search")]:::pe
    PEAML[("PE mlw")]:::pe

    %% Security & secrets
    KV["Key Vault<br/>kv-learneu-demo-sjoo5sdv<br/>(soft-delete, purge protection)"]:::sec

    %% AI services
    AOAI["Azure OpenAI<br/>aoai-learneu-demo-…<br/>gpt-5.4-nano 2026-03-17<br/>GlobalStandard 50K TPM<br/>(no PTU)"]:::ai
    CS["Azure AI Content Safety<br/>cs-learneu-demo-…<br/>(RAI guardrails)"]:::ai
    SRCH["Azure AI Search<br/>srch-learneu-demo-…<br/>(curriculum RAG)"]:::ai

    %% ML platform
    AML["Azure Machine Learning<br/>mlw-learneu-demo<br/>(adaptive model, HBI workspace)"]:::data
    ACR["Azure Container Registry<br/>acrqoyrpqfojnfxe (Premium)"]:::data
    SA["Storage Account<br/>stamlqoyrpqfojnfxe<br/>(AML default, public access disabled)"]:::data

    %% Observability
    LAW["Log Analytics<br/>log-learneu-demo<br/>(retention 90 d)"]:::obs
    APPI["Application Insights<br/>appi-learneu-demo"]:::obs

    %% Gated off
    PRV["Microsoft Purview<br/>(deployPurview=false)<br/>follow-up: tenant has no EU<br/>service location"]:::gone
    FAB["Microsoft Fabric F2<br/>(deployFabric=false)<br/>follow-up: requires admin members"]:::gone
  end

  %% Demo apps (logical, hosted via APIM products on top of the AI stack)
  subgraph APPS["Demo apps (deployed in stage 4)"]
    direction LR
    LW["learner-web"]:::ext
    PP["parent-portal"]:::ext
    TC["teacher-console"]:::ext
  end

  %% External user → identity → app → APIM
  Learner --> CIAM
  Parent --> CIAM
  Teacher --> Workforce
  CIAM --> LW
  CIAM --> PP
  Workforce --> TC
  LW --> APIM
  PP --> APIM
  TC --> APIM

  %% APIM → backends
  APIM --> AOAI
  APIM --> CS
  APIM --> SRCH
  APIM --> AML

  %% Private endpoint wiring
  SnetPE -.-> PEKV
  SnetPE -.-> PEAOAI
  SnetPE -.-> PECS
  SnetPE -.-> PESRCH
  SnetPE -.-> PEAML
  PEKV -.-> KV
  PEAOAI -.-> AOAI
  PECS -.-> CS
  PESRCH -.-> SRCH
  PEAML -.-> AML
  APIM -. delegated subnet .-> SnetAPIM
  AML -. compute subnet .-> SnetAML

  %% AML dependencies
  AML --> KV
  AML --> SA
  AML --> ACR
  AML --> APPI

  %% Diagnostics fan-in
  APIM --> LAW
  AOAI --> LAW
  CS --> LAW
  SRCH --> LAW
  AML --> LAW
  KV --> LAW
  APPI --> LAW

  %% Gated nodes (visual hint only)
  PRV -. not deployed .-> RG
  FAB -. not deployed .-> RG
```

## Notes
- **Gated off (dashed):** Purview & Fabric are **not** provisioned in this run. Documented as follow-ups in `DEPLOYMENT-REPORT.md`.
- **Public network access:** disabled on Key Vault, OpenAI, Content Safety, AI Search, AML, Storage, ACR. Only APIM has public ingress, fronting all backends.
- **EU residency:** all resources in `westeurope`. EU-only allowlist enforced in `infra/main.bicep`.
- **Identity split:** workforce tenant for staff (Teacher), CIAM tenant `learneu` for end users (Learner, Parent), per Case Study 33 §4.3.
- **Model:** OpenAI `gpt-5.4-nano` version `2026-03-17` (reasoning, 400K context window), GlobalStandard, 50K TPM (Plan B — no PTU available in West Europe at deployment time). Confirmed available in West Europe per Microsoft Learn region table (April 2026).

## How to render
- VS Code with the Mermaid preview extension, or
- `mmdc -i ARCHITECTURE.md -o ARCHITECTURE.svg`, or
- Push to GitHub — Mermaid is rendered natively in fenced ```mermaid blocks.
