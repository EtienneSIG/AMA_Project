# Slide 27 · Appendix A06 · Privacy-preserving ML

- **Layout (template):** Content 2-col
- **Headline:** A6 · On-device · Federated · Differential Privacy · Confidential Compute
- **Sub-headline:** Production-grade, EU-resident, defensible
- **CXO focus:** CAIO · CDO · CISO
- **Source refs:** agents/privacy-preserving-ml-engineer.chatmode.md · plan/03-target-architecture.md

## Body bullets (left — Techniques)
- Default: on-device inference (ONNX Runtime Web / mobile)
- Federated training: device computes gradients locally
- Differential Privacy: noise added before transmission (ε budget tracked)
- Secure aggregation in Azure Confidential VMs / AKS

## Body bullets (right — Why it works)
- Raw learner data never leaves device under default flow
- Centralised training only on opt-in cohorts with explicit consent
- Confidential Computing protects against the cloud operator itself
- Feature store carries no PII; lineage proves it in Purview

## Visual
Layered diagram: device (ONNX) → DP noise → federated aggregation in CVM → model registry → re-deploy.

## Speaker notes
Pour le CAIO et le CDO : la stack PPML qui rend le tout tenable. Inference par défaut sur l'appareil, entraînement fédéré avec différentielle privacy budgétée, et agrégation sécurisée en Confidential Computing — donc même Microsoft, en tant qu'opérateur, ne voit pas la mémoire pendant l'agrégation. C'est ce qui distingue une posture "privacy-preserving" sérieuse d'une simple promesse contractuelle.
