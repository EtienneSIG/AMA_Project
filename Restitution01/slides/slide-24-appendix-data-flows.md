# Slide 24 · Appendix A03 · Key data flows

- **Layout (template):** Content 2-col
- **Headline:** A3 · Three data flows, three privacy regimes
- **Sub-headline:** Personalisation · grading · localisation
- **CXO focus:** CDO · CISO · CTO
- **Source refs:** plan/03-target-architecture.md

## Body bullets (left — Personalisation loop)
- Default = on-device inference (ONNX); no learner-level data sent
- Periodic federated round: device → DP-protected gradients → secure aggregation
- Updated model published to registry → re-deployed to devices
- Centralised training never sees raw learner data

## Body bullets (right — Grading & localisation)
- Grading: submission → APIM → AML endpoint (no payload retention) → teacher review
- Localisation: source content → AI Search retrieval → Azure OpenAI → reviewer
- All generative outputs pass Content Safety before reaching surface
- Audit log written for every AI decision (AI Act Art. 12)

## Visual
Three swimlanes (Personalisation / Grading / Localisation), each annotated with privacy regime + retention policy.

## Speaker notes
Trois flux, trois régimes. La personnalisation reste par défaut côté appareil — c'est la principale concession à GDPR Article 8. La correction passe par un endpoint AML sans rétention de payload, avec validation humaine systématique. La localisation est un pipeline RAG : on retrouve dans AI Search le bout de curriculum pertinent, on demande à OpenAI de générer, et on passe par Content Safety avant le reviewer humain. Tous les flux génératifs sont loggés de manière immuable.
