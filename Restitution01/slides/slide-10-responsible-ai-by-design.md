# Slide 10 · Trust · Responsible AI by design

- **Layout (template):** Content 2-col
- **Headline:** No autonomous decision touches a learner — ever
- **Sub-headline:** Human-in-the-loop is the product, not the policy
- **CXO focus:** CAIO · CRO · CLO
- **Source refs:** plan/07-governance-rai.md · agents/responsible-ai-evaluator.chatmode.md

## Body bullets (left — Design principles)
- Teacher-in-the-loop on every grading or content-difficulty change
- Explainability surfaced in the Teacher Console for every suggestion
- One-click override at pupil / class / assignment level
- Content Safety on every generative output — gate, not log

## Body bullets (right — Release gates)
- RAI release gate v1 — fairness, calibration, safety, transparency
- Per-cohort fairness disparity ≤ 5 pp (gating, not advisory)
- Calibration error (ECE) ≤ 0.05
- Quarterly RAI re-evaluation — model can be rolled back same-day

## Visual
"Decision flow" diagram: AI suggestion → explanation → teacher review → action. Override icon highlighted; kill-switch icon in bottom-right.

## Speaker notes
Pour le CAIO et le CLO : aucune décision autonome n'atteint un mineur. Le modèle adaptatif propose la prochaine activité ; l'assessment AI propose une note ; dans les deux cas, l'enseignant voit l'explication, valide ou outrepasse en un clic. C'est tracé dans Application Insights — on sait combien d'overrides ont eu lieu, sur quels items, et le taux d'override est lui-même un KPI (cible ≤ 10 % en régime stable). Côté release : un gate RAI à chaque mise en production, avec quatre critères — fairness, calibration, safety, transparency — dont la disparité par cohorte est *bloquante*. Voir annexe A14 pour la composition du Conseil RAI.
