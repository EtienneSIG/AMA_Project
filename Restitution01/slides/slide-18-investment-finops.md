# Slide 18 · Delivery · Investment & FinOps

- **Layout (template):** Content 2-col
- **Headline:** €18–22M build, ~€6M/yr run — predictable, optimised, sustainable
- **Sub-headline:** Provisioned throughput where it matters, PAYG where it doesn't
- **CXO focus:** CFO · CIO · CSO
- **Source refs:** plan/05-kpis-outcomes.md · plan/06-risks-register.md (R8)

## Body bullets (left — Investment shape)
- Build (12 months): €18–22M total — split 45% platform, 30% AI, 25% compliance/UX
- Run (steady-state): ~€6M/yr — Azure ~55%, people ~35%, sub-processors ~10%
- ~€2M contingency held against R8 (OpenAI cost runaway)
- Compliance cost = same whether done now or later — sunk

## Body bullets (right — FinOps levers)
- Provisioned Throughput Units (PTU) on OpenAI for predictable localisation load
- Caching of repeated localisations — ≈ 30% cost avoidance modelled
- Fine-tuned smaller models for routine grading — vs frontier for edge cases
- Cost / learner / month is a board-reported KPI (with carbon proxy in A16)

## Visual
Stacked bar: build vs run vs contingency. Sparkline showing cost/learner trajectory month-over-month.

## Speaker notes
Pour le CFO et le CIO : la forme du programme est lisible. 18 à 22 millions de build étalés sur 12 mois — la fourchette dépend du périmètre des deux derniers marchés. Le run de croisière s'établit autour de 6 millions par an, dont 55 % d'Azure. On garde 2 millions de contingence sur le risque numéro un côté coût : la facture Azure OpenAI sur la localisation à grande échelle (R8 dans le registre). On le mitige par des PTU sur la charge prévisible, du cache sur les contenus répétés, et des modèles fine-tunés plus petits pour la correction de routine. Le coût par apprenant par mois est lui-même un KPI board, suivi avec un proxy carbone en annexe A16.
