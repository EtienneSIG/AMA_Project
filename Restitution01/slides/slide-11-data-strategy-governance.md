# Slide 11 · Trust · Data strategy & governance

- **Layout (template):** Content 2-col
- **Render:** statgrid
- **Image:** bg-hero-teal.png
- **Headline:** Less data. Better governed. Never re-identifiable.
- **Sub-headline:** Lakehouse + Purview + customer-managed keys, end-to-end
- **CXO focus:** CDO · CISO · CCO
- **Source refs:** plan/03-target-architecture.md · plan/04-compliance-eu-ai-act-gdpr.md

## Body bullets (left)
- 0 PII | in Gold aggregates · ever
- 30 days | erasure SLA · automated · evidenced

## Body bullets (right)
- 100% CMK | own your keys · own your audit
- 3 EU regions | West Europe · Germany · Poland

## Visual
2×2 grid of editable stat tiles in teal/orange/green/navy.

## Speaker notes
Pour le CDO : la stratégie est *moins de données, mieux gouvernées*. La donnée mineur entre pseudonymisée, vit dans le lakehouse Fabric en West Europe (ou Germany West Central pour DE), et n'arrive jamais ré-identifiable dans la couche Gold qui alimente les dashboards. Microsoft Purview porte le catalogue, les labels — dont un label spécifique "Child Personal Data — Restricted" — et la lignée qui rend l'effacement vérifiable. Azure Policy bloque par construction toute ressource déployée hors région EU ou sans clé client. Annexe A3 pour les flux de données détaillés.
