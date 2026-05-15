# Slide 5 · Architecture · Solution at a Glance

- **Layout (template):** Architecture
- **Headline:** One backend, three audiences, zero data egress
- **Sub-headline:** APIM internal · 4 web apps · AOAI/Search/CS via private endpoints
- **Rubric coverage:** #1, #5
- **Source refs:** demo/ARCHITECTURE.md · demo/DEPLOYMENT-REPORT.md · demo/infra/main.bicep

## Body bullets
- Learner / Teacher / Parent / Admin web apps (Express, Node 22-lts)
- APIM Internal-mode = single AOAI front door
- AOAI `gpt-5.4-nano` 50 K TPM, GlobalStandard, West Europe
- Postgres Flex `pg-learneu-demo` PG16 — private endpoint, KV-referenced password
- KV / AOAI / Search / CS / AML / Storage / ACR — public access disabled

## Visual
Re-render of the Mermaid `architecture-beta` from [demo/ARCHITECTURE.md](../demo/ARCHITECTURE.md): Entra (workforce + CIAM) → 4 apps → APIM → AOAI/CS/Search; PG to the right; LA + AppI bottom; Purview/Fabric in dashed "NOT DEPLOYED" group.

## Speaker notes
Une slice unique pour quatre publics. À gauche, les identités : tenant workforce pour les staff (Teacher, Admin), tenant CIAM `learneu` pour les end-users (Learner, Parent). Au centre, quatre applications Express déployées sur un même App Service Plan B-tier, chacune avec sa managed identity. Toutes traversent **APIM en mode internal-VNet** : c'est le seul point qui parle à Azure OpenAI. AOAI tourne `gpt-5.4-nano` version `2026-03-17` à 50 K TPM en West Europe. Postgres Flexible Server B1ms héberge `connection_logs`, `ask_history` et `sheets`. Tout ce qui touche à de la donnée — KV, OpenAI, Search, Content Safety, AML, Storage, ACR — a son **public network access désactivé**. Voir [demo/ARCHITECTURE.md](../demo/ARCHITECTURE.md).
