# Slide 32 · Appendix A11 · Cost model & TCO

- **Layout (template):** Content 2-col
- **Headline:** A11 · Cost / learner / month is the FinOps north star
- **Sub-headline:** Target ≤ €0.45 / learner / month at 3-market scale
- **CXO focus:** CFO · CIO · CSO
- **Source refs:** plan/05-kpis-outcomes.md · plan/06-risks-register.md

## Body bullets (left — Cost breakdown)
- Azure compute & storage: ~35% of run cost
- Azure OpenAI (localisation + grading): ~20% — biggest variable
- People (RAI, editorial, CSM, ops): ~35%
- Sub-processors + licences: ~10%

## Body bullets (right — Optimisation levers)
- Provisioned Throughput Units (PTU) on OpenAI for predictable load
- Caching of repeated localisations (~30% cost avoidance modelled)
- Fine-tuned small models for routine tasks; frontier on edge cases
- Region pinning + reserved instances for Fabric capacity

## Visual
Stacked donut of cost categories; line chart of cost / learner / month trajectory across 12 months.

## Speaker notes
Pour le CFO : le KPI FinOps interne est le coût par apprenant par mois — cible 0,45 € au régime 3 marchés. La plus grosse variable est Azure OpenAI, d'où les leviers PTU + cache + small-models. Les capacités Fabric sont réservées pour bloquer le prix unitaire. Pour le CSO : voir annexe A16 pour le proxy carbone aligné sur le même dénominateur.
