# Slide 13 · Compliance · GDPR Art. 8 & EU AI Act

- **Layout (template):** Content 2-col
- **Headline:** Article-by-article mapping, not theatre
- **Sub-headline:** Every clause maps to a code path, infra control or runbook
- **Rubric coverage:** #3
- **Source refs:** plan/04-compliance-eu-ai-act-gdpr.md · plan/07-governance-rai.md · demo/DEPLOYMENT-REPORT.md §3

## Body bullets (left — GDPR Art. 8)
- Lawful basis: parental consent + legitimate interest, per market
- Data minimisation: anonymised features only to the model
- Children's surface ≠ rights surface (Parent Portal is its own app)
- Retention schedule + erasure cascade pipeline (planned)
- DPIA refreshed annually + per major change

## Body bullets (right — EU AI Act high-risk)
- Annex IV technical file (Art. 11) maintained from M0
- Human oversight (Art. 14): teacher override required before action
- Logging (Art. 12): App Insights immutable trace per request
- Accuracy + robustness: ECE ≤ 0.05, fairness gates per cohort
- Post-market monitoring (Art. 72): quarterly PMM report

## Visual
Two compliance ladders side by side, each rung is one article + one file path or screenshot.

## Speaker notes
Sur la conformité, on a refusé le réflexe « on collera la doc plus tard ». Article par article. Côté GDPR Article 8 : la base légale par marché — consentement parental ou intérêt légitime selon le pays —, la minimisation absolue (le modèle ne voit jamais l'identité, juste des features anonymisées), et un découpage architectural fort : la surface enfant n'est **pas** la surface des droits. Sophie, la mère, a son propre portail. Côté EU AI Act haut-risque : on a un fichier Annexe IV vivant dès le M0, l'oversight humain Article 14 est matérialisé par le bouton override enseignant — câblage prêt, événement App Insights typé —, et chaque requête est tracée pour Article 12. La PMM trimestrielle est dans le runbook. Voir [plan/04-compliance-eu-ai-act-gdpr.md](../plan/04-compliance-eu-ai-act-gdpr.md).
