# Slide 19 · Outcomes · Roadmap & Top Risks

- **Layout (template):** Content 2-col
- **Headline:** Where we go next, what could derail us
- **Sub-headline:** 4 next iterations · 3 highest-severity risks
- **Rubric coverage:** #12
- **Source refs:** demo/DEPLOYMENT-REPORT.md §8 · plan/06-risks-register.md · plan/01-phases-roadmap.md

## Body bullets (left — next iterations)
- Move pgcrypto allow-list into Bicep (idempotent first `azd up`)
- Wire parent portal to Entra External ID (criterion #2 → PASS)
- Run end-to-end localisation pipeline (criterion #3 → PASS)
- Deploy Fabric + Power BI cohort fairness report (criterion #7)
- Implement erasure cascade (criterion #9, GDPR Art. 17)

## Body bullets (right — top 3 risks)
- R4 Localisation quality below pedagogical bar — Sev 16
- R1 National DPA blocks DPIA in one market — Sev 15
- R6 Bias disparity > 5pp on launched cohort — Sev 15

## Visual
Two columns: left = numbered backlog with effort badges (S/M/L); right = risk heat-tiles colored by severity (red ≥15).

## Speaker notes
Roadmap concentrée sur ce qui fait passer les PARTIAL en PASS. Premier mouvement : remonter l'allow-list `pgcrypto` dans Bicep pour qu'un `azd up` clean seede du premier coup — petit ticket, gros effet sur l'expérience démo. Ensuite, brancher le parent portal sur Entra External ID avec le flux eID mocké : ça fait passer le critère #2. Exécuter end-to-end le pipeline de localisation (#3). Activer Fabric et publier le rapport Power BI cohort fairness (#7). Enfin, implémenter l'erasure cascade GDPR Article 17 sur le dataset synthétique (#9). Côté risques, je surveille R4 — qualité de localisation, sévérité 16 —, R1 — blocage DPA national, sévérité 15 — et R6 — disparité de fairness > 5 points par cohorte. Voir [plan/06-risks-register.md](../plan/06-risks-register.md).
