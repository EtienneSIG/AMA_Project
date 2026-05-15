# Slide 6 · Architecture · Target Architecture (Layered)

- **Layout (template):** Architecture
- **Headline:** Six layers, one accountable owner each
- **Sub-headline:** Sources → Ingestion → Storage → Processing → Serving → Governance
- **Rubric coverage:** #1
- **Source refs:** plan/03-target-architecture.md · demo/infra/main.bicep · demo/infra/modules/*.bicep

## Body bullets
- Sources: schools, SIS, learners, parents, content authors
- Ingestion: APIM, Event Hubs (planned), Fabric ingest (gated)
- Storage: Postgres Flex · KV · OneLake (gated) · AI Search index
- Processing: AOAI · Content Safety · AML training · ONNX picker
- Serving: 4 Express apps · ONNX Runtime web (on-device)
- Governance: LA + App Insights · DPIA · Annex IV · audit trail

## Visual
Horizontal swimlanes (6 rows). Each lane shows the Azure services that fulfil it; gated services drawn with a dotted border + "NOT DEPLOYED" tag.

## Speaker notes
On lit la stack du sud vers le nord. Sources : SIS scolaires, contenus pédagogiques, auteurs. Ingestion : aujourd'hui APIM, demain Event Hubs et Fabric mirroring (gated). Storage : Postgres pour l'opérationnel, Key Vault pour les secrets, OneLake bronze/silver/gold pour la donnée analytique — préparé en plan, pas provisionné dans cette slice pour rester sous le budget démo. Processing : Azure OpenAI pour le langage, Content Safety en gatekeeper, AML pour entraîner le modèle adaptatif, ONNX pour le servir côté navigateur. Serving : quatre Express avec rôles distincts. Et au-dessus de tout, la couche gouvernance — Log Analytics, App Insights, DPIA, fichier Annexe IV — qui rend le tout auditable. Voir [plan/03-target-architecture.md](../plan/03-target-architecture.md).
