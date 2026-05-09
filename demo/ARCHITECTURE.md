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
  service pp(internet)[parent portal] in apps
  service tc(internet)[teacher console] in apps
  service adm(internet)[admin] in apps

  group rg(cloud)[RG rg-learneu-demo westeurope]
  service apim(cloud)[APIM internal VNet] in rg
  service kv(disk)[Key Vault] in rg
  service aoai(server)[Azure OpenAI gpt-5.4-nano] in rg
  service cs(server)[Content Safety] in rg
  service srch(server)[AI Search] in rg
  service aml(database)[Azure ML mlw HBI] in rg
  service acr(database)[ACR Premium] in rg
  service sa(database)[Storage AML] in rg
  service law(cloud)[Log Analytics] in rg
  service appi(cloud)[App Insights] in rg
  service vnet(server)[VNet 10.42.0.0 16 PE+APIM+AML subnets] in rg

  group gated(cloud)[NOT DEPLOYED]
  service prv(cloud)[Purview] in gated
  service fab(cloud)[Fabric F2] in gated

  ciam:B --> T:lw
  ciam:B --> T:pp
  workforce:B --> T:tc
  workforce:B --> T:adm

  lw:B --> T:apim
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
