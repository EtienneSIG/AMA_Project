# LearnEU monitoring and audit evidence

**Purpose:** close the AMA rubric gap on "Logging and metrics" by mapping runtime telemetry, retention, and audit evidence to concrete repository artefacts.

## Monitoring control matrix

| Control | Runtime evidence | Repository evidence | Rubric impact |
|---|---|---|---|
| Authentication audit | Login, logout, failed-login, and forbidden events are captured with actor, role, app, IP, user agent, detail, and timestamp. | `demo/apps/learner-web/db/schema.sql` -> `connection_logs`; shared auth in `demo/apps/*/auth.js`. | Structured operational logging. |
| AI interaction audit | Prompt, answer, model, token counts, latency, status, and error are captured for each AI round trip. | `demo/apps/learner-web/db/schema.sql` -> `ask_history`; `/api/chat` in `demo/apps/learner-web/server.js`. | AI traceability and latency metrics. |
| AI safety audit | Input and output Azure AI Content Safety verdicts are captured with severities, blocked flag, and raw service response. | `demo/apps/learner-web/db/schema.sql` -> `content_safety_results`; `demo/apps/learner-web/contentSafety.js`. | Safety metrics and blocked-output evidence. |
| High-risk AI record keeping | Adaptive decisions record learner ref, skill, reason, mastery band, model version, learner explanation, teacher explanation, and fallback state. | `demo/apps/learner-web/server-adaptive.js`; adaptive audit helpers under `demo/apps/learner-web/adaptive/`. | EU AI Act Art. 12 record keeping. |
| Human oversight metrics | Teacher override and experiment sign-off routes keep natural-person approval in the loop before adoption. | `demo/apps/learner-web/server-experiments.js`; teacher/adaptive routes in `server-adaptive.js`. | EU AI Act Art. 14 oversight proof. |
| Platform health | Each app exposes `/api/health`; admin can read sibling app health and managed site state. | `demo/apps/*/server.js`; `demo/apps/admin/server.js` -> `/api/admin/health`, `/api/admin/sites`. | Availability and reliability monitoring. |
| Azure telemetry export | App Service, APIM, AML, Postgres, and diagnostics are wired to Application Insights / Log Analytics in the deployment design. | `demo/infra/modules/app-service.bicep`, `demo/infra/modules/app-diag.bicep`, `demo/infra/modules/monitor.bicep`, `demo/DEPLOYMENT-REPORT.md`. | Live monitoring artefact. |
| Immutable operational audit | Admin operations record actor, outcome, correlation id, and detail; schema blocks destructive audit mutation where implemented. | `plan/04-compliance-eu-ai-act-gdpr.md` Feature 002 evidence log; `demo/apps/admin/server.js`; `demo/apps/admin/db/schema.sql`. | Compliance-grade audit trail. |

## Retention and review cadence

| Evidence stream | Retention principle | Review cadence | Owner |
|---|---|---|---|
| Auth and access logs | Keep for security/accountability; minimise direct identifiers in analytics exports. | Monthly access review. | Platform admin + DPO |
| AI prompts/answers | Retain only for audit/evaluation windows; export aggregates for dashboards. | Weekly RAI dashboard; quarterly post-market monitoring. | RAI lead |
| Content Safety verdicts | Retain verdict and raw response for incident investigation. | Weekly blocked-output review. | Safety reviewer |
| Adaptive decisions | Retain model version, reason, and explanation for AI Act Art. 12. | Release gate + quarterly PMM. | Responsible AI Evaluator |
| Experiment decisions | Retain sign-offs, monitoring snapshots, and decision rationale. | At experiment close and quarterly. | Product + pedagogy reviewer |

## Operational dashboard checklist

The following dashboard tiles are now required for a full-score submission:

1. Auth success/failure by app and role from `connection_logs`.
2. AI latency, status, model, and token usage from `ask_history`.
3. Content Safety blocked rate by direction and category from `content_safety_results`.
4. Adaptive recommendation counts by reason and fallback state from adaptive audit events.
5. Teacher override/sign-off rate from adaptive and experiment tables.
6. App health and Azure telemetry from Application Insights and Log Analytics.

## Validation command

Run:

```powershell
pwsh demo\scripts\verify-rubric-readiness.ps1
```

This non-destructive gate checks that monitoring schema, runtime alignment, lockfiles, and evidence files are present before the requirement matrix is scored at 60 / 60.
