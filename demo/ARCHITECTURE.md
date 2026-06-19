# LearnEU — Target Architecture (Mermaid)

Visual representation of the deployed `rg-learneu-demo` resource group plus the surrounding identity and external systems. Generated from `infra/main.bicep` after Stage 2 fixes (Purview & Fabric gated off; APIM NSG attached; AML wired to Application Insights).

> Uses Mermaid's [`architecture-beta`](https://mermaid.js.org/syntax/architecture.html) diagram type (Mermaid ≥ 10.9). Built-in icons (`cloud`/`database`/`disk`/`internet`/`server`); swap for `logos:azure-*` after registering an Iconify pack. Note: `architecture-beta` does not support `classDef`, dashed nodes, or nested subgraphs — gated/not-deployed items are rendered as a separate group with `[NOT DEPLOYED]` in the label.

```mermaid
architecture-beta
  group idp(cloud)[Microsoft Entra]
  service workforce(cloud)[Workforce esig_tenant] in idp
  service ciam(cloud)[CIAM learneu] in idp

  group apps(internet)[Demo Apps]
  service lw(internet)[learner web] in apps
  service lwm(internet)[learner mobile pwa] in apps
  service pp(internet)[parent portal] in apps
  service tc(internet)[teacher console] in apps
  service adm(internet)[admin] in apps

  group rg(cloud)[RG learneu demo westeurope]
  service apim(cloud)[APIM internal VNet] in rg
  service kv(disk)[Key Vault] in rg
  service aoai(server)[Azure OpenAI gpt 5 4 nano] in rg
  service cs(server)[Content Safety] in rg
  service srch(server)[AI Search] in rg
  service aml(database)[Azure ML mlw HBI] in rg
  service acr(database)[ACR Premium] in rg
  service sa(database)[Storage AML] in rg
  service law(cloud)[Log Analytics] in rg
  service appi(cloud)[App Insights] in rg
  service vnet(server)[VNet 10 42 0 0 16 with PE APIM AML subnets] in rg
  service pg(database)[Postgres Flex B1ms learneu db] in rg
  service fab(cloud)[Fabric F2 capacity] in rg
  service pbi(server)[Power BI Embedded] in rg

  group gated(cloud)[NOT DEPLOYED group]
  service prv(cloud)[Purview] in gated

  ciam:B --> T:lw
  ciam:B --> T:lwm
  ciam:B --> T:pp
  workforce:B --> T:tc
  workforce:B --> T:adm

  lw:B --> T:apim
  lwm:B --> T:apim
  pp:B --> T:apim
  tc:B --> T:apim
  adm:B --> T:apim

  apim:B --> T:aoai
  apim:B --> T:cs
  apim:B --> T:srch
  apim:R --> L:vnet

  aoai:B --> T:law
  aml:B --> T:law
  apim:R --> L:appi

  aml:T --> B:kv
  aml:T --> B:sa
  aml:T --> B:acr

  vnet:B --> T:aml
  lw:R --> L:pg
  lwm:R --> L:pg
  pp:R --> L:pg
  tc:R --> L:pg
  adm:R --> L:pg
  pg:B --> T:law

  pg:B --> T:fab
  fab:B --> T:pbi
  adm:B --> T:pbi
```

## Notes
- **Viewer compatibility:** some Mermaid renderers do not support `architecture-beta`. If the first diagram does not render, use the fallback `flowchart` diagram below.
- **Gated off (dashed):** Purview is **not** provisioned in this run. Documented as follow-up in `DEPLOYMENT-REPORT.md`. Fabric F2 capacity and Power BI Embedded are deployed and connected to director-portal for reporting.
- **Public network access:** disabled on Key Vault, OpenAI, Content Safety, AI Search, AML, Storage, ACR. Only APIM has public ingress, fronting all backends.
- **EU residency:** all resources in `westeurope`. EU-only allowlist enforced in `infra/main.bicep`.
- **Identity split:** workforce tenant for staff (Teacher), CIAM tenant `learneu` for end users (Learner, Parent), per Case Study 33 §4.3.
- **Learner mobile surface:** `learner mobile pwa` is a logical UX surface (`/mobile.html`) served by the same `learner-web` App Service, not a separate Azure resource.
- **Fabric + Power BI:** Postgres mirrors data to Fabric F2 capacity for analytical reporting. Director portal embeds Power BI visuals via managed embedding.
- **Model:** OpenAI `gpt-5.4-nano` version `2026-03-17` (reasoning, 400K context window), GlobalStandard, 50K TPM (Plan B — no PTU available in West Europe at deployment time). Confirmed available in West Europe per Microsoft Learn region table (April 2026).
- **App data store:** Azure Database for PostgreSQL Flexible Server (`pg-learneu-demo`), Burstable B1ms, PostgreSQL 16, 32 GB, public access disabled, private endpoint in `snet-pe`, TLS required. Three tables: `connection_logs`, `ask_history`, `sheets`. Admin password generated at deploy time and stored in Key Vault as `pg-admin-password` — every App Service consumes it via `@Microsoft.KeyVault` reference. Auto-applied schema lives in `apps/_shared/db/schema.sql`.

## Fallback Diagram (flowchart)

```mermaid
flowchart TD
  CIAM[CIAM learneu] --> LW[Learner Web]
  CIAM --> LWM[Learner Mobile PWA]
  CIAM --> PP[Parent Portal]
  WF[Workforce esig_tenant] --> TC[Teacher Console]
  WF --> ADM[Admin]

  LW --> APIM[APIM internal VNet]
  LWM --> APIM
  PP --> APIM
  TC --> APIM
  ADM --> APIM

  APIM --> AOAI[Azure OpenAI]
  APIM --> CS[Content Safety]
  APIM --> SRCH[AI Search]

  LW --> PG[Postgres Flex]
  LWM --> PG
  PP --> PG
  TC --> PG
  ADM --> PG

  PG --> FAB[Fabric F2]
  FAB --> PBI[Power BI Embedded]
  ADM --> PBI

  AML[Azure ML] --> KV[Key Vault]
  AML --> SA[Storage AML]
  AML --> ACR[ACR Premium]
  VNET[VNet 10.42.0.0/16] --> AML

  AOAI --> LAW[Log Analytics]
  AML --> LAW
  APIM --> APPI[App Insights]
  PG --> LAW

  PRV[Purview - NOT DEPLOYED]
```

## How to render
- VS Code with the Mermaid preview extension, or
- `mmdc -i ARCHITECTURE.md -o ARCHITECTURE.svg`, or
- Push to GitHub — Mermaid is rendered natively in fenced ```mermaid blocks.
