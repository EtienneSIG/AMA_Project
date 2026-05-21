# Slide 37 · Appendix A16 · Sustainability & ESG

- **Layout (template):** Content 2-col
- **Headline:** A16 · gCO₂e / learner / month — measured and reduced
- **Sub-headline:** Aligned to group ESG report; auditable proxy
- **CXO focus:** CSO · CFO
- **Source refs:** plan/05-kpis-outcomes.md

## Body bullets (left — Baseline & proxy)
- Carbon proxy = (Azure compute + storage emissions) / active learners
- Microsoft Emissions Impact Dashboard as primary source
- On-device inference reduces server-side carbon by design
- Reported quarterly into group ESG narrative

## Body bullets (right — Reduction levers)
- Region selection prioritises EU regions with high renewable share
- Small-first model routing (A07) directly reduces inference carbon
- Reserved capacity for predictable Fabric load → better PUE utilisation
- Decommissioning of legacy on-prem grading systems

## Visual
Sparkline: gCO₂e/learner/month vs target line. Renewable-share badge per region.

## Speaker notes
Pour le CSO et le CFO : on relie le KPI FinOps (coût par apprenant par mois) à un proxy carbone — mêmes dénominateurs, mêmes leviers. Les choix d'architecture qui réduisent la facture Azure (on-device, small-first, cache, PTU) réduisent aussi la trajectoire carbone. Reporting trimestriel dans le narratif ESG groupe.
