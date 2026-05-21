# Slide 12 · Trust · Security & EU residency

- **Layout (template):** Content 2-col
- **Headline:** Zero-trust, EU-resident, defensible under audit
- **Sub-headline:** Private Endpoints, CMK, immutable audit, EU Data Boundary
- **CXO focus:** CISO · CRO · CLO
- **Source refs:** plan/03-target-architecture.md · plan/04-compliance-eu-ai-act-gdpr.md

## Body bullets (left — Security baseline)
- All PaaS behind Private Endpoints; only APIM + web apps public
- Front Door + WAF in front; Azure Firewall on egress
- Customer-managed keys for every storage and AI service
- Confidential Computing for any centralised re-identifiable workload

## Body bullets (right — Residency & audit)
- West Europe + Germany West Central + Poland Central — DR within EU
- EU Data Boundary for Azure OpenAI / Foundry, verified per sub-processor
- Immutable audit logs (Azure Blob WORM) — AI Act Art. 12 evidence
- Defender for Cloud + Sentinel — 24×7 SOC, IR drilled quarterly

## Visual
Map of EU regions with LearnEU footprint highlighted; padlock icons over each region.

## Speaker notes
Pour le CISO : zero-trust appliqué de bout en bout. Aucune ressource PaaS exposée publiquement à part l'APIM et les web apps, qui passent derrière Front Door et WAF. Clés client sur tout le stockage et les services IA. Le centralised training, quand il a besoin de signaux ré-identifiables, tourne en Confidential Computing — donc le opérateur Azure lui-même ne voit pas la mémoire. Côté résidence : trois régions EU primaires plus DR, et un check trimestriel des sub-processors Microsoft. Les logs immuables WORM tiennent à eux seuls l'article 12 de l'AI Act. Annexe A9 et A15 pour observability et IR.
