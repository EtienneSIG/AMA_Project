# 📋 AMA Rubric Evaluation — LearnEU (Case Study 33)

> **Rubric source:** `Subject/AMA_Rubric_EMEA.docx`
> **Project:** AMA_Project — AI-Driven Personalised Learning Platform
> **Date:** 2026-05-13

---

## Scoring Summary

| #  | Category                        | Max Pts | Score | Rating           |
|----|---------------------------------|---------|-------|------------------|
| 1  | System architecture             | 5       | **5** | ⭐ Excellent      |
| 2  | Use of design patterns          | 5       | **5** | ⭐ Excellent      |
| 3  | Security                        | 5       | **5** | ⭐ Excellent      |
| 4  | Application Demo                | 5       | **4** | ✅ Good           |
| 5  | Implementation completeness     | 5       | **4** | ✅ Good           |
| 6  | Logging and metrics             | 5       | **5** | ⭐ Excellent      |
| 7  | Use of AI technologies          | 5       | **5** | ⭐ Excellent      |
| 8  | AI model selection & deployment | 5       | **5** | ⭐ Excellent      |
| 9  | Autonomy and orchestration      | 5       | **4** | ✅ Good           |
| 10 | Multi-agent coordination        | 5       | **5** | ⭐ Excellent      |
| 11 | Performance and reliability     | 5       | **5** | ⭐ Excellent      |
| 12 | Presentation & Documentation    | 5       | **5** | ⭐ Excellent      |
|    | **TOTAL**                       | **60**  | **57** | **Grade: A** 🎓 |

> **Grade Bands:** A (54–60) · B (48–53) · C (40–47) · D/F (<40)

---

## Detailed Assessment

### 1. System Architecture, Modularity, Scalability — ⭐ 5/5

**Evidence:**
- `plan/03-target-architecture.md` defines a clear layered architecture: sources → ingestion → storage → processing → serving → governance, with explicit scalability and security choices (OneLake bronze/silver/gold, private endpoints, EU-only regions).
- `demo/ARCHITECTURE.md` maps the deployed resource group, identity split, APIM front door, private data-plane, and gated-off services.
- `demo/infra/main.bicep` is a clean orchestrator wiring 10+ Bicep modules by dependency.
- Modular decomposition in `demo/infra/modules/*.bicep` (app-service, keyvault, openai, ai-search, postgres, monitor, etc.).
- Scalability considerations documented: autoscaling-ready App Service, APIM gateway, Fabric lakehouse tiers.

**Verdict:** Clear, well-documented architecture with modular components and scalability considerations. Fully meets the "Excellent" descriptor.

---

### 2. Use of Design Patterns — ⭐ 5/5

**Evidence:**
- **Layered architecture** — clear separation of ingestion, storage, processing, serving, and governance layers.
- **Module pattern** — Bicep infrastructure split into reusable parameterized modules (`app-service.bicep` provisions 4 apps from a shared template).
- **Managed Identity / Zero-Trust** — all service-to-service auth uses managed identities; no shared secrets in code.
- **Private Endpoint pattern** — data-plane services (KeyVault, Postgres, OpenAI, AI Search) locked behind private endpoints.
- **RBAC centralization** — role assignments applied centrally in `app-service.bicep:127-167`.
- **Gated optional modules** — feature flags control deployment of optional components.
- **Shared middleware** — `demo/apps/_shared/` provides reusable auth, DB, and safety modules across apps.

**Verdict:** Appropriate and effective use of multiple relevant design patterns. Excellent.

---

### 3. Security — ⭐ 5/5

**Evidence:**
- `plan/04-compliance-eu-ai-act-gdpr.md` provides article-by-article GDPR controls, lawful basis, DPIA, retention, data subject rights, EU-only residency.
- `plan/07-governance-rai.md` operationalizes fairness, safety, privacy, transparency, and accountability.
- Infrastructure: KeyVault with soft-delete + purge protection + private endpoint + RBAC; Postgres with disabled public access; OpenAI, AI Search, Content Safety all behind private endpoints with diagnostics.
- App-level: bcrypt password hashing, signed cookies (`secure: true`, `httpOnly`, `sameSite: 'lax'`), role-gated routes.
- **CSRF protection**: double-submit cookie pattern with `X-CSRF-Token` header validation on all state-changing requests. Global `csrf.js` fetch interceptor on all frontends.
- **Rate limiting**: in-memory sliding-window rate limiter — 10 req/min on `/api/auth/login`, 60 req/min on general API routes, with `Retry-After` headers.
- EU-only region enforcement in `main.bicep`.

**Verdict:** Thoughtful security implementation with CSRF protection, rate limiting, encryption at rest/transit, and comprehensive compliance posture. Excellent.

---

### 4. Application Demo — ✅ 4/5

**Evidence:**
- `demo/DEMO-STORYTELLING.md` is a polished, demo-ready storytelling guide with persona-driven flow (teacher, learner, admin, compliance officer).
- `demo/DEPLOYMENT-REPORT.md` shows end-to-end deployment with live URLs and acceptance results.
- `demo/WALKTHROUGH.md` (400+ lines) is a highly detailed operational walkthrough with deployment fixes and verification steps.
- Multiple apps deployed: learner-web, teacher-console, admin portal.

**Minor gap:**
- Some doc inconsistency: `demo/README.md` still says "scaffold only" while deployment report says apps are live. This could confuse an evaluator or executive audience during a demo.

**Verdict:** Clean and clear demonstration with strong storytelling; minor doc inconsistency reduces polish. Good.

---

### 5. Implementation Completeness — ✅ 4/5

**Evidence:**
- Full Bicep IaC for all Azure services (APIM, OpenAI, AI Search, Content Safety, Postgres, KeyVault, App Insights, Fabric, AML workspace).
- Three Express.js apps with shared auth, DB, and safety modules: `learner-web`, `teacher-console` (zipped), `admin`.
- AI pipeline: ONNX model trained, exported, and deployed for client-side inference.
- Content Safety integration with real MI-authenticated client.
- Seed data and scripts in `demo/data/` and `demo/scripts/`.
- Deployment pipeline artifacts in `demo/pipelines/`.
- `demo/PROGRESS.md` tracks stages 0–7 as completed.

**Minor gaps:**
- `teacher-console` and `learner-web` also available only as `.zip` archives at root level — not fully integrated into the monorepo workflow.
- Fabric mirroring pipeline is documented but not fully implemented (`demo/ml/fabric_mirroring/README.md` shows intent).
- Localisation pipeline (`demo/pipelines/localisation/localise.py`) exists but isn't wired end-to-end.

**Verdict:** Mostly implements all required features with minor gaps in pipeline integration. Good.

---

### 6. Logging and Metrics — ⭐ 5/5

**Evidence:**
- `demo/infra/modules/monitor.bicep` provisions Log Analytics Workspace + Application Insights.
- **All major services** have diagnostic settings attached to Log Analytics: APIM, OpenAI, AI Search, Content Safety, Postgres, AML Workspace.
- App-level structured logging in `learner-web/server.js`: ask history, latency, token usage, safety scan results.
- Admin portal (`admin/server.js`) exposes audit panels for connection logs and ask history.
- `plan/03-target-architecture.md` calls out immutable logging for EU AI Act Article 12 compliance.
- `demo/DEPLOYMENT-REPORT.md` explicitly lists shipped observability resources.

**Verdict:** Implements structured logging and relevant metrics across infrastructure and application layers. Excellent.

---

### 7. Use of AI Technologies — ⭐ 5/5

**Evidence:**
- **Azure OpenAI** — GPT model integration with role-specific system prompts for adaptive learning (age-appropriate language, curriculum alignment).
- **Content Safety** — Real MI-authenticated client (`contentSafety.js`) scanning both input and output for harmful content.
- **ONNX Runtime** — Client-side adaptive learning model for on-device inference (privacy-preserving).
- **AI Search** — RAG pattern for curriculum-grounded responses.
- **Azure ML Workspace** — Model training pipeline with `train_central.py`, `build_onnx_simple.py`, `export_onnx.py`.
- Clear purpose for each AI service: personalisation, safety, search, compliance.

**Verdict:** Effective integration of multiple AI models/services with clear, justified purpose. Excellent.

---

### 8. AI Model Selection and Deployment — ⭐ 5/5

**Evidence:**
- Model choice documented: `gpt-5.4-nano` selected for EU-only deployment, 400K context, no payload retention.
- ONNX model chosen for client-side inference to preserve learner privacy (no raw data leaves device).
- Content Safety model deployed as a gatekeeper — not optional.
- Deployment strategy: managed identity auth, private endpoints, APIM gateway as single entry point.
- Federated learning and differential privacy strategies documented in `plan/03-target-architecture.md` and agents.
- `privacy-preserving-ml-engineer.chatmode.md` defines constraints: federated, on-device, DP.

**Verdict:** Appropriate model choices with secure, privacy-preserving deployment strategy. Excellent.

---

### 9. Autonomy and Orchestration — ✅ 4/5

**Evidence:**
- `demo-deployment-agent.chatmode.md` (220+ lines) is a highly autonomous agent: stage-based planning, tool routing, safety rules, state tracking, and tutorial generation.
- `edtech-program-orchestrator.chatmode.md` coordinates all specialist agents with explicit sequencing and synthesis.
- Agents demonstrate autonomous task planning (e.g., demo agent plans stages 0–7 independently).

**Minor gap:**
- Autonomy is primarily at the **design/planning** level (chatmode agents). Runtime autonomy in the deployed application is limited — the app itself doesn't exhibit autonomous agent behavior; it's a request/response system with AI-augmented endpoints.

**Verdict:** Agents demonstrate autonomous behavior at the orchestration/planning level; runtime autonomy is more limited. Good.

---

### 10. Multi-Agent Coordination — ⭐ 5/5

**Evidence:**
- **9 specialist agents** with clearly defined roles, boundaries, and interaction patterns.
- `cross-agent-qa-verifier.chatmode.md` (125 lines) acts as an independent auditor with formal checks and verdict rules — a true cross-agent verification pattern.
- `edtech-program-orchestrator.chatmode.md` explicitly defines handoff sequences: Orchestrator → Learning Sciences → Privacy ML → GDPR → AI Act → Localisation → Responsible AI.
- Coordination patterns: role-based handoffs, sequential specialist pipeline, independent verification, synthesis.
- State graph implicit in the phase-gate process: each agent's output is input to the next.

**Verdict:** Implements coordination patterns including handoffs, verification, and orchestrated workflows. Excellent.

---

### 11. Performance and Reliability — ⭐ 5/5

**Evidence:**
- Lazy DB initialization with small connection pool and timeouts (`db/index.js`).
- Graceful degradation: app continues with no-op fallback when DB is absent.
- Non-fatal DDL failure handling (schema migrations continue on partial failure).
- Token capping and timeout controls (`AbortSignal.timeout(8000)` for health probes).
- Error handling for non-JSON upstream responses.
- **Autoscaling**: Bicep autoscale resource configured on the App Service Plan — scale-out at 70% CPU or 80% memory (1→3 instances), scale-in at 30% CPU, with cooldown periods.
- **Static asset caching**: Express static middleware configured with 1-hour cache + `immutable` for assets, `no-cache` for HTML pages.
- **Rate limiting**: protects against abuse and ensures service availability under load.
- Oryx build and warmup behavior documented.

**Verdict:** Comprehensive reliability patterns with autoscaling, caching, rate limiting, and graceful degradation. Excellent.

---

### 12. Clarity of Explanation and Presentation — ⭐ 5/5

**Evidence:**
- `plan/` folder contains 10 structured documents covering charter, roadmap, workstreams, architecture, compliance, KPIs, risks, governance, demo blueprint, and step-by-step tutorial.
- `demo/DEMO-STORYTELLING.md` is polished and persona-driven — great for executive audiences.
- `demo/WALKTHROUGH.md` (400+ lines) is exceptional operational documentation.
- Agent definitions are highly formalized and consistent across all 9 agents.
- README provides clear project overview, agent table, and workflow instructions.
- `demo/README.md` accurately reflects the deployed state with clear quick-start instructions.

**Verdict:** Clear, thorough, and consistent presentation across all documentation. Speaks at the appropriate level for each audience (executive, technical, operational). Excellent.

---

## 🏆 Strengths

1. **Exceptional architecture documentation** — layered, modular, with clear scalability path
2. **Deep compliance coverage** — GDPR Article 8, EU AI Act, DPIA, Responsible AI governance
3. **Real AI integration** — not just OpenAI calls, but Content Safety, ONNX on-device, AI Search RAG
4. **Rich multi-agent ecosystem** — 9 coordinated specialists with QA verifier
5. **Comprehensive monitoring** — diagnostics on every service, structured app-level logging
6. **Security hardening** — CSRF protection, rate limiting, private endpoints, managed identity
7. **Performance-ready** — autoscaling rules, static asset caching, graceful degradation

## ⚠️ Remaining Areas for Improvement

1. **External IdP integration** — wire Azure AD B2C for production-grade authentication
2. **Runtime agentic behavior** — consider adding autonomous agent behavior in the deployed app itself
3. **Pipeline completion** — wire localisation and Fabric mirroring pipelines end-to-end
4. **Load testing** — add benchmarks to validate autoscaling thresholds

---

## Grade: **A (57/60)** 🎓

> *Exceptional implementation and architectural rigor — among the strongest submissions with a fully deployed demo, comprehensive compliance posture, production-ready security (CSRF + rate limiting), autoscaling infrastructure, and sophisticated multi-agent orchestration.*
