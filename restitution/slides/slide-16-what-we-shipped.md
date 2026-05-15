# Slide 16 · Delivery · What We Shipped

- **Layout (template):** Content 2-col
- **Headline:** A live slice — 47 resources, 4 apps, 11 acceptance checks
- **Sub-headline:** 5 PASS · 4 PARTIAL · 2 SKIP · 0 FAIL
- **Rubric coverage:** #5
- **Source refs:** demo/DEPLOYMENT-REPORT.md · demo/PROGRESS.md · demo/scripts/acceptance_tests.ps1

## Body bullets (left — code)
- 4 Express apps (Learner / Teacher / Parent / Admin)
- Shared middleware (`apps/_shared/`) — auth, CSRF, DB, CS
- ONNX adaptive item picker (browser-side)
- Content Safety MI client; AOAI through APIM
- Seed data: 6 curricula rows, 14 glossary terms, 50 learners

## Body bullets (right — infra & reports)
- 47 Azure resources in `rg-learneu-demo`, EU residency
- Bicep IaC `infra/main.bicep` + 10+ modules
- `azd up` reproducible (~45 min)
- Acceptance suite (`scripts/acceptance_tests.ps1`): **5 PASS · 4 PARTIAL · 2 SKIP · 0 FAIL**
- Deployment report + walkthrough + storytelling docs

## Visual
Two columns of badges. Left: app icons + lines of code rough counts. Right: 47-resource graphic + acceptance score donut (5/4/2/0).

## Speaker notes
Voici ce qui est **vraiment** déployé. Quatre applications Express, partage d'une couche middleware unique pour auth, CSRF, accès DB et Content Safety. Le picker ONNX tourne dans le navigateur, derrière session. Côté infra, 47 ressources Azure dans `rg-learneu-demo`, toutes en West Europe, provisionnées par un Bicep modulaire qui se rejoue en `azd up` en ~45 minutes. La seed contient 6 lignes de curricula NL et DE Year-7, 14 termes de glossaire et 50 apprenants synthétiques. La suite d'acceptation `scripts/acceptance_tests.ps1` me donne 5 PASS, 4 PARTIAL, 2 SKIP, 0 FAIL. Les PARTIAL et SKIP sont **explicitement out-of-scope budget** — Fabric, Purview, AKS confidentiel — pas des trous techniques. Voir [demo/DEPLOYMENT-REPORT.md](../demo/DEPLOYMENT-REPORT.md) §3.
