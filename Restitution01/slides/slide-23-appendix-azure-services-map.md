# Slide 23 · Appendix A02 · Azure services map

- **Layout (template):** Content 2-col
- **Headline:** A2 · Eight Azure services, EU-only, with role
- **Sub-headline:** Exact match to the case-study service list
- **CXO focus:** CIO · CTO
- **Source refs:** Subject/case-study-33-edtech-personalised-learning.md · plan/03-target-architecture.md

## Body bullets (left — Identity, data, security)
- Azure AD B2C — parent/learner identity, per-country tenants
- Microsoft Fabric — OneLake + Notebooks + embedded Power BI
- Microsoft Purview — catalog, sensitivity labels, lineage, DLP
- Azure API Management — single entry, OAuth 2.0, rate-limit, OWASP

## Body bullets (right — AI + observability)
- Azure Machine Learning — adaptive + assessment models, registry, monitoring
- Azure OpenAI — localisation + formative feedback (EU Data Boundary)
- Azure AI Content Safety — gate on every generative output
- Power BI — teacher/school/ministry dashboards (embedded in Fabric)

## Visual
Service grid 4×2 with logos + one-line role. Region badges on each tile.

## Speaker notes
Service par service, alignement strict sur la liste du case study. Chaque service joue un rôle nommé, déployé en région EU. Si une question pointe sur un service précis, on déroule l'annexe correspondante.
