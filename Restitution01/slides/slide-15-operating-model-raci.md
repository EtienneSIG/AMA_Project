# Slide 15 · Delivery · Operating model & RACI

- **Layout (template):** Content 2-col
- **Headline:** Two councils, nine specialist agents, one accountable chain
- **Sub-headline:** Pedagogical sign-off before technical sign-off — non-negotiable
- **CXO focus:** COO · CEO · CHRO
- **Source refs:** plan/07-governance-rai.md · agents/

## Body bullets (left — Governance bodies)
- Steering Committee — monthly · KPI + risk + spend · CEO/CFO/COO/CRO chair
- Responsible AI Council — bi-weekly · release gates · CAIO/RAI Evaluator chair
- Architecture Review Board — bi-weekly · technical decisions · CTO chair
- Teacher Council — per release · pedagogical sign-off · Learning Sciences chair

## Body bullets (right — Specialist agents)
- 9 named accountable roles: Orchestrator, AI Act CO, GDPR specialist,
  Privacy-Preserving ML Eng, Learning Sciences, Localisation Lead,
  RAI Evaluator, Cross-Agent QA, Demo Deployment
- Each feature is delivered by a *named* agent, not a generic team
- Cross-Agent QA audits every deliverable before phase gate
- Decisions logged in `specs/<NNN-feature>/` (spec-driven, traceable)

## Visual
Two columns: left = 4-body governance grid; right = 9-agent ring with accountabilities.

## Speaker notes
Pour le COO : la gouvernance tient en quatre instances et neuf rôles nommés. Comité de pilotage tous les mois pour KPI/risque/budget. Conseil RAI bi-mensuel — c'est lui qui valide les release gates, pas le board ; le board délègue. ARB pour l'architecture, Teacher Council pour la pédagogie. Et neuf agents spécialistes (orchestrateur, AI Act CO, GDPR specialist, ML privacy, sciences de l'apprentissage, localisation, RAI evaluator, QA cross-agent, demo deployment) qui portent chacun un livrable nommé. Le QA cross-agent est l'auditeur interne — il vérifie les livrables des autres avant chaque gate. Tout est tracé dans le repo Spec Kit.
