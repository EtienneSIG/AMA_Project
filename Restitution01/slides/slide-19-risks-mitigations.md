# Slide 19 · Delivery · Risks & mitigations

- **Layout (template):** Content 2-col
- **Headline:** Top 6 risks — owned, mitigated, contingent
- **Sub-headline:** None of them is a project-killer if managed actively
- **CXO focus:** CRO · CCO · CISO
- **Source refs:** plan/06-risks-register.md

## Body bullets (left — Top risks)
- R1 · National DPA blocks DPIA (sev 15) — owner DPO
- R3 · Federated learning doesn't converge (sev 12) — owner ML Lead
- R4 · Localisation quality drift (sev 16) — owner Editorial Director
- R6 · Bias disparity > 5pp on launched cohort (sev 15) — owner RAI

## Body bullets (right — Mitigations & contingencies)
- R1 → engage DPAs from M0 · contingency: delay that market only
- R3 → DP central-training fallback on opt-in cohort
- R4 → reviewer never optional · staff up if first-pass < 80%
- R6 → per-cohort gates in release · same-day rollback ready
- R8 · OpenAI cost runaway → PTU + caching · contingency € reserved
- R10 · Art. 73 serious incident → kill switch + drilled IR

## Visual
6 risk tiles colour-coded by severity, each with owner + mitigation icon.

## Speaker notes
Pour le CRO et le CCO : le registre complet est en annexe A12. Six risques justifient le board. R1 — une DPA nationale bloque le DPIA — c'est le plus gênant car asymétrique : un seul "non" peut nous coûter un marché entier. Mitigation : on les engage en Phase 0 plutôt que de leur présenter un fait accompli. R3 — la convergence du federated learning sur données réelles — on a un plan B central avec consentement explicite et différentielle privacy. R4 — la dérive qualité en localisation — on garde le reviewer humain non négociable. R6 — la disparité de fairness — un gate de release bloquant, avec rollback prêt en quelques heures. R8 et R10 sont en deuxième rideau mais traités.
