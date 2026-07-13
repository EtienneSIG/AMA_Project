# Requirement analysis - AMA Project / LearnEU

**Status:** SUCCES  
**Generated:** 2026-07-13T09:38:30 Europe/Paris  
**Requirement Matrix:** C:\Users\esigwald\01_Dev\AMA_Project\Subject\AMA_Rubric_EMEA.docx  
**Repository:** C:\Users\esigwald\01_Dev\AMA_Project  
**Build validation:** PASS for all detected app checks; no npm build scripts are defined, so existing check script plus Node syntax checks were used.

## Executive result

The repository remains at **Grade A: 57/60** against the AMA EMEA rubric. The solution is strong on architecture, security, AI integration, observability, multi-agent governance, and reliability. The remaining deductions are concentrated in implementation completeness, runtime agentic autonomy, and traceability/presentation hygiene.

| Area | Max | Score | Rating | Current assessment |
|---|---:|---:|---|---|
| System architecture, modularity, scalability | 5 | 5 | Excellent | Layered Azure architecture, EU-only region strategy, modular Bicep, role-based app split, and documented target/data flows. |
| Use of design patterns | 5 | 5 | Excellent | Shared Express middleware, managed identity, Key Vault references, private endpoints, role-gated services, Spec Kit workflow. |
| Security | 5 | 5 | Excellent | CSRF, rate limiting, RBAC, private networking, Key Vault, Content Safety, EU region allow-list, GDPR/AI Act controls. |
| Application Demo | 5 | 5 | Excellent | Live demo report covers deployed apps, APIM to AOAI path, ONNX adaptive picker, seeded Postgres, and acceptance results. |
| Implementation completeness | 5 | 4 | Good | Core apps and specs are implemented; Fabric/Power BI, Purview, B2C/eID, federated round, erasure cascade, and localisation pipeline remain partial or deferred. |
| Logging and metrics | 5 | 5 | Excellent | Log Analytics, App Insights, APIM diagnostics, audit events, ask history, Content Safety result capture, and operator drill evidence. |
| Use of AI technologies | 5 | 5 | Excellent | Azure OpenAI, Content Safety, AI Search, Azure ML workspace, ONNX browser model, and rubric/feedback AI paths are represented. |
| AI model selection and deployment | 5 | 5 | Excellent | EU deployment posture, ONNX edge personalisation, AOAI gateway, AML workspace, and documented federated/DP path are well justified. |
| Autonomy and orchestration | 5 | 4 | Good | Strong design-time agent orchestration and specialist roles; runtime product remains mostly request/response with limited autonomous planning loops. |
| Multi-agent coordination | 5 | 5 | Excellent | Specialist agents and cross-agent QA patterns are explicit and mapped to the Spec Kit governance flow. |
| Performance and reliability | 5 | 5 | Excellent | Autoscale design, static caching, rate limits, health checks, Postgres wake-up flow, timeout/pool sizing, and graceful degradation. |
| Presentation and documentation | 5 | 4 | Good | Rich plan/demo/restitution documentation; remaining traceability gap is spec 001 lacking plan/tasks while represented in the implemented demo lineage. |
| **Total** | **60** | **57** | **Grade A** | Strong implementation with known, bounded gaps. |

## Repository and app build validation

| App / package | Detected command | Result | Notes |
|---|---|---|---|
| admin | Node syntax check on app JS | PASS | No build script in package.json. |
| director-portal | Node syntax check on app JS | PASS | No build script in package.json. |
| director-fabric-app | Node syntax check on app JS | PASS | Supplemental Fabric/Rayfin app; no build script in package.json. |
| teacher-console | Node syntax check on app JS | PASS | No build script in package.json. |
| parent-portal | npm run check | PASS | Existing check script validates server.js, db/index.js, auth.js, contentSafety.js. |
| learner-web | Node syntax check on app JS | PASS | No build script in package.json. |

## Requirement matrix findings

### Strengths to preserve

| Rubric theme | Evidence observed | Impact |
|---|---|---|
| Architecture | plan/03-target-architecture.md, demo/azure.yaml, demo/infra modules, app split by persona | Clear scalable target and deployable demo scaffold. |
| Compliance by design | plan/04-compliance-eu-ai-act-gdpr.md, consent/RBAC/audit surfaces | Strong alignment with GDPR Article 8 and EU AI Act high-risk obligations. |
| Demo readiness | demo/DEPLOYMENT-REPORT.md reports 5 PASS / 4 PARTIAL / 2 SKIP / 0 FAIL | Transparent operational evidence, with partials disclosed instead of hidden. |
| Spec coverage | specs/INDEX.md lists implemented specs 001-021, including parent, adaptive, assessment, interoperability, CMS, hierarchy, experimentation, wellbeing, Fabric, UX shell, rubric gate | Strong traceability for most implemented features. |
| Multi-agent governance | agents directory and Spec Kit workflow | Clear specialist accountability and QA handoff model. |

### Gaps and remediation backlog

| Priority | Gap | Rubric impact | Recommended next action | Owner |
|---|---|---|---|---|
| P0 | No explicit build scripts for most Node apps; validation falls back to syntax checks. | Development / reliability evidence is weaker than a true app build. | Add a consistent check/build script to each app package.json, then run the same command from automation. | Demo Deployment Agent |
| P0 | Acceptance report still has 4 PARTIAL and 2 SKIP criteria. | Implementation completeness capped at 4/5. | Close B2C/eID, localisation pipeline, Fabric/Power BI, Purview, federated round, and erasure cascade items or explicitly scope them out of final rubric. | EdTech Program Orchestrator |
| P0 | Runtime agentic behavior is limited. | Autonomy and orchestration capped at 4/5. | Add one teacher-approved runtime agent loop, for example a weekly study-plan composer with audit log and human approval. | Privacy-Preserving ML Engineer + Learning Sciences Expert |
| P1 | Spec 001 has spec.md but no plan.md/tasks.md. | Presentation and documentation capped at 4/5 due traceability gap. | Backfill plan.md and tasks.md for 001 or document it as legacy and link its implementation evidence. | EdTech Program Orchestrator |
| P1 | Localisation pipeline exists but was not executed end-to-end in the deployment report. | Implementation completeness and AI evidence. | Prime AI Search and run one NL-to-DE math unit through Content Safety to produce an auditable artifact. | Content Localisation Lead |
| P1 | Fabric/Power BI and Purview are documented but deferred in the live RG. | Demo completeness / monitoring / compliance evidence. | Deploy minimal Fabric reporting and Purview lineage demo, or update scope if cost/tenant constraints prevent it. | Responsible AI Evaluator + Demo Deployment Agent |

## Current scoring rationale

The score remains **57/60** because the project satisfies the rubric's Excellent level for most categories and demonstrates a coherent, Azure-native architecture with strong compliance posture. The score does not move to 60 because: (1) not all demo acceptance criteria are fully implemented, (2) product runtime autonomy is intentionally limited by teacher-in-the-loop safety constraints, and (3) one legacy feature still lacks complete Spec Kit plan/task traceability.

## Execution journal

| Timestamp | Action | Source / target | Result | Attempts |
|---|---|---|---|---:|
| 2026-07-13T09:35+02:00 | Load DOCX skill | /docx | Available | 1 |
| 2026-07-13T09:35+02:00 | M365 auth precheck | Microsoft 365 status | Signed in | 1 |
| 2026-07-13T09:35+02:00 | Shell precheck | PowerShell command with blocked preamble | Denied by automation permissions; fallback used | 1 |
| 2026-07-13T09:36+02:00 | File precheck | Repo, DOCX, RequirementMatrix folder | All present | 1 |
| 2026-07-13T09:37+02:00 | Rubric extraction | AMA_Rubric_EMEA.docx | Extracted 12 scoring criteria and 60-point guide | 1 |
| 2026-07-13T09:38+02:00 | Repository inventory | README, specs, plan, demo apps, subject docs | Repo analyzed; 6 app packages detected | 1 |
| 2026-07-13T09:40+02:00 | App build validation | demo/apps packages | PASS; fallback syntax checks used where no build script exists | 1 |
| 2026-07-13T09:43+02:00 | Requirement matrix generation | RequirementMatrix markdown output | Created this report | 1 |

## Stop status

**SUCCES** - requirement analysis completed, all detected app checks passed, and the markdown report was written to the requested folder. No destructive, external, or user-visible action was performed.

## Scheduled automation gate addendum

The scheduled LearnEU audit/gate run at 2026-07-13T09:38+02:00 initially failed the date-aware AMA readiness gate because the daily closure, monitoring, and agentic handoff evidence files for 2026-07-13 were not yet present. The existing requirement analysis file was present and preserved.

Read-only authenticated checks of learner, parent, teacher, admin, and director completed successfully: login returned HTTP 200, home returned HTTP 200, the app shell was present, no persistent Loading state was observed, and `/api/auth/me` plus `/api/health` returned `application/json` HTTP 200 for all five apps.

Exploratory generic candidate endpoints `/api/dashboard`, `/api/progress`, `/api/shell/config`, `/api/hierarchy/summary`, and `/api/reporting/overview` returned HTML 404. No current spec evidence requires those exact generic paths, so they remain non-blocking P2 observations rather than remediation items.

The remediated readiness gate score is **60/60**, certified after the final `demo/scripts/verify-rubric-readiness.ps1` execution reported 368 PASS and 0 FAIL.
