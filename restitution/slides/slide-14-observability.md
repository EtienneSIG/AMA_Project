# Slide 14 · Operations · Observability & Metrics

- **Layout (template):** Content 2-col
- **Headline:** One pane of glass, three audit lenses
- **Sub-headline:** Log Analytics + App Insights + admin audit panels
- **Rubric coverage:** #6
- **Source refs:** demo/infra/modules/monitor.bicep · demo/apps/admin/server.js · demo/apps/learner-web/server.js

## Body bullets (left — infra telemetry)
- Log Analytics workspace `log-learneu-demo`
- App Insights `appi-learneu-demo`
- Diagnostic settings on APIM, AOAI, AI Search, Content Safety
- Diagnostic settings on Postgres + AML workspace
- 30-day retention default; 90-day for AI Act audit category

## Body bullets (right — app & admin telemetry)
- Structured `ask_history` rows: latency, tokens, prompt preview
- Structured `connection_logs`: app, event, email, role, IP
- Content Safety verdicts persisted in `cs_results`
- ONNX attempts logged: difficulty, prediction, latency
- Admin Console `Activity` + `Safety & Quality` tabs (live)

## Visual
Screenshot of admin "Activity" tab with `Recent connections` + `Recent asks` tables; small overlay showing AppI request waterfall.

## Speaker notes
Trois lentilles d'audit pour un seul puits de logs. Niveau infra, chaque ressource Azure envoie ses diagnostics dans Log Analytics ; APIM, OpenAI, Content Safety, AI Search, Postgres et AML sont tous instrumentés. Niveau application, on persiste structurellement chaque interaction dans Postgres : `ask_history` capture latence, tokens et un preview de prompt ; `connection_logs` trace toutes les tentatives d'auth ; les verdicts de Content Safety vivent dans `cs_results` ; les essais du picker ONNX sont stockés. Niveau opérateur, l'Admin Console — qu'on vient de réorganiser ce matin en six onglets — expose ces tables live aux Activity et Safety & Quality. C'est exactement ce qu'un superviseur EU AI Act Article 12 va demander à voir. Voir [demo/infra/modules/monitor.bicep](../demo/infra/modules/monitor.bicep).
