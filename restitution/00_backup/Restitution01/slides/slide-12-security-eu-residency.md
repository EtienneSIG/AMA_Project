# Slide 12 · Trust · Security & EU residency

- **Layout (template):** Content 2-col
- **Render:** hero
- **Image:** bg-hero-orange.png
- **Headline:** EU only. By design. By contract.
- **Sub-headline:** Zero-trust · Private Endpoints · CMK · Confidential Computing · WORM audit
- **CXO focus:** CISO · CRO · CLO
- **Source refs:** plan/03-target-architecture.md · plan/04-compliance-eu-ai-act-gdpr.md

## Body bullets (left)
- All PaaS behind Private Endpoints — APIM + web only public
- Customer-managed keys on every storage and AI service
- Confidential Computing for any re-identifiable central workload

## Body bullets (right)
- West Europe + Germany West Central + Poland Central
- EU Data Boundary verified per sub-processor, quarterly
- Immutable audit (WORM) = AI Act Art. 12 evidence

## Visual
Hero orange. Single line, monumental.

## Speaker notes
Pour le CISO : zero-trust appliqué de bout en bout. Aucune ressource PaaS exposée publiquement à part l'APIM et les web apps, qui passent derrière Front Door et WAF. Clés client sur tout le stockage et les services IA. Le centralised training, quand il a besoin de signaux ré-identifiables, tourne en Confidential Computing — donc le opérateur Azure lui-même ne voit pas la mémoire. Côté résidence : trois régions EU primaires plus DR, et un check trimestriel des sub-processors Microsoft. Les logs immuables WORM tiennent à eux seuls l'article 12 de l'AI Act. Annexe A9 et A15 pour observability et IR.
