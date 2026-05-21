# Slide 11 · Trust · Data strategy & governance

- **Layout (template):** Content 2-col
- **Headline:** Less data, better governed, never re-identifiable
- **Sub-headline:** Lakehouse + Purview + customer-managed keys, end-to-end
- **CXO focus:** CDO · CISO · CCO
- **Source refs:** plan/03-target-architecture.md · plan/04-compliance-eu-ai-act-gdpr.md

## Body bullets (left — Data architecture)
- Microsoft Fabric OneLake — Bronze / Silver / Gold, EU regions only
- Pseudonymisation at ingest; keys in Azure Key Vault Managed HSM
- Gold layer holds *no* learner-level data — only aggregates
- Feature store with row-level lineage in Purview

## Body bullets (right — Governance controls)
- Sensitivity label "Child Personal Data — Restricted" enforced via DLP
- Azure Policy: region pinning, CMK enforcement, no-PII-to-PaaS guardrail
- Erasure cascades through lineage — 30-day SLA, evidence in audit log
- Quarterly Microsoft sub-processor review — automatic alerting on change

## Visual
Lakehouse pyramid (Bronze → Silver → Gold), each layer tagged with retention + label. EU flag at base.

## Speaker notes
Pour le CDO : la stratégie est *moins de données, mieux gouvernées*. La donnée mineur entre pseudonymisée, vit dans le lakehouse Fabric en West Europe (ou Germany West Central pour DE), et n'arrive jamais ré-identifiable dans la couche Gold qui alimente les dashboards. Microsoft Purview porte le catalogue, les labels — dont un label spécifique "Child Personal Data — Restricted" — et la lignée qui rend l'effacement vérifiable. Azure Policy bloque par construction toute ressource déployée hors région EU ou sans clé client. Annexe A3 pour les flux de données détaillés.
