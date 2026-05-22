# 📋 AMA Rubric Evaluation — LearnEU (Case Study 33)

> **Rubric source:** `Subject/AMA_Rubric_EMEA.docx`
> **Commit / branch:** `85b36e4` on `agents/ama-rubric-evaluator` (worktree `agents-ama-rubric-evaluator`)
> **Project:** AMA_Project — AI-Driven Personalised Learning Platform
> **Date:** 2026-05-22
> **Examiner:** `agents/ama-rubric-evaluator.chatmode.md`
> **Previous evaluation of record:** `Subject/AMA_Rubric_Evaluation.2026-05-13.md` (57/60 — Grade A)

---

## Scoring summary

| #  | Category                          | Max | Score   | Δ vs 2026-05-13 | Rating         |
|----|-----------------------------------|-----|---------|------------------|----------------|
| 1  | System architecture               | 5   | **5**   | —                | ⭐ Excellent    |
| 2  | Use of design patterns            | 5   | **5**   | —                | ⭐ Excellent    |
| 3  | Security                          | 5   | **5**   | —                | ⭐ Excellent    |
| 4  | Application Demo                  | 5   | **5**   | **+1**           | ⭐ Excellent    |
| 5  | Implementation completeness       | 5   | **4**   | —                | ✅ Good         |
| 6  | Logging and metrics               | 5   | **5**   | —                | ⭐ Excellent    |
| 7  | Use of AI technologies            | 5   | **5**   | —                | ⭐ Excellent    |
| 8  | AI model selection & deployment   | 5   | **5**   | —                | ⭐ Excellent    |
| 9  | Autonomy and orchestration        | 5   | **4**   | —                | ✅ Good         |
| 10 | Multi-agent coordination          | 5   | **5**   | —                | ⭐ Excellent    |
| 11 | Performance and reliability       | 5   | **5**   | —                | ⭐ Excellent    |
| 12 | Presentation & Documentation      | 5   | **4**   | **−1**           | ✅ Good         |
|    | **TOTAL**                         | **60** | **57** | **0**           | **Grade: A** 🎓 |

> **Grade bands:** A 54–60 · B 48–53 · C 40–47 · D/F < 40
> Net score unchanged at **57/60**, but composition has moved: Application Demo gained a point (parent-portal live, README fixed, 21-slide deck), Presentation lost one (spec-driven delivery breach — see §12 and the constitutional flag at the end).

---

## Detailed assessment

### 1. System architecture, modularity, scalability — ⭐ 5/5

**Evidence:**
- `demo/infra/main.bicep:19-50` — EU regions hard-pinned at subscription scope via `@allowed(['westeurope','northeurope','francecentral','germanywestcentral','polandcentral','swedencentral'])`.
- `demo/infra/modules/` — **15 modules** (app-service, keyvault, openai, ai-search, content-safety, aml-workspace, apim, monitor, networking, private-dns, postgres, app-diag, purview, fabric-capacity, apim-aoai); `main.bicep` is a thin orchestrator wiring them by dependency.
- `plan/03-target-architecture.md:41-48` — six-layer architecture (sources → ingestion → storage → processing → serving → governance) with explicit scalability and security choices.
- `demo/ARCHITECTURE.md` — deployed RG, identity split, APIM front door, private data-plane, gated-off services.

**Gaps:** none material.
**To stay at 5:** keep `main.bicep` orchestrator-only as modules grow.

---

### 2. Use of design patterns — ⭐ 5/5

**Evidence:**
- **Module pattern** — `demo/infra/modules/app-service.bicep:137-150` provisions all 4 Express apps from a single `for (n, i) in ['parent-portal','learner-web','teacher-console','admin']` loop.
- **Managed Identity / Zero-Trust** — `app-service.bicep:162` (`identity: { type: 'SystemAssigned' }`) + `:200-210` central RBAC (Key Vault Secrets Officer, Cognitive Services User).
- **Secret injection via Key Vault reference** — `app-service.bicep:184,193` uses `@Microsoft.KeyVault(VaultName=…;SecretName=…)` for APIM key + Postgres password (no plaintext).
- **Shared middleware** — `demo/apps/_shared/{auth.js,server.js,contentSafety.js,db/}` is the canonical source, synced to all 4 apps via `_shared/sync.ps1`.
- **Double-submit CSRF + sliding-window rate limit** — `_shared/auth.js:52-100` implements both patterns inside a single middleware surface.
- **Private Endpoint pattern** — applied uniformly to KV, AOAI, Search, Content Safety, Postgres, AML, Storage.

**Gaps:** none material.

---

### 3. Security — ⭐ 5/5

**Evidence:**
- **CSRF** — `demo/apps/learner-web/public/csrf.js:1-27` wraps `window.fetch` to inject `X-CSRF-Token` on every non-GET; validated server-side in `_shared/auth.js`.
- **Rate limiting** — `_shared/auth.js:88-100` sliding-window limiter (10 req/min on `/api/auth/login`, 60 req/min on API), returns `Retry-After` and `429`.
- **Key Vault** — `demo/infra/modules/keyvault.bicep` soft-delete + purge protection + private endpoint + RBAC.
- **Postgres** — `demo/infra/modules/postgres.bicep:1-45` public network access **disabled**, admin password in KV, MI enabled, `wal_level=logical`.
- **Content Safety** as non-optional gatekeeper — `_shared/contentSafety.js:40-70` MI-authenticated client scans input *and* output, threshold = 4.
- **EU-only region allow-list** enforced in `main.bicep:19-50`.
- **Compliance posture** — `plan/04-compliance-eu-ai-act-gdpr.md` article-by-article GDPR + AI Act controls, lawful basis matrix, DPIA, retention.

**Gaps:** none material.

---

### 4. Application Demo — ⭐ 5/5 (was 4/5)

**Evidence (improvements since 2026-05-13):**
- **README fixed** — `demo/README.md:5` now reads "✅ Fully deployed. All 7 stages completed — 4 apps live, Postgres seeded, APIM → AOAI chat path verified, ONNX adaptive model running client-side." (Baseline gap was "scaffold only" vs deployment report — now consistent.)
- **Parent-portal added and live** — `demo/DEPLOYMENT-STATE.md:23` "parent-portal … all live; sign-in + /api/chat green." Full code under `demo/apps/parent-portal/` (server.js, auth.js, contentSafety.js, db/, public/).
- **Three-persona storytelling** — `demo/DEMO-STORYTELLING.md:9-17` "Parent (Sophie, NL) | Teacher (Mr Klein, DE) | Learner (Lucas, 12). Three roles, three distinct UIs, one regulated backend."
- **21-slide deck + speaker notes** — `restitution/slides/slide-01-title.md` … `slide-21-appendix.md`, `restitution/speaker-notes.md` (French, 66 lines, full 30-min flow), `restitution/coverage-matrix.md` self-maps to all 12 rubric categories.
- **Live URLs + acceptance results** — `demo/DEPLOYMENT-REPORT.md:54-68` 5 PASS / 4 PARTIAL / 2 SKIP / 0 FAIL.

**Gaps:** none material at demo level; partials are scoped and disclosed.

---

### 5. Implementation completeness — ✅ 4/5

**Evidence:**
- All 4 Express apps fully implemented under `demo/apps/` (no `.zip`-only apps remain at root or in `demo/`).
- ONNX pipeline complete — `demo/ml/adaptive_model/{train_central.py,build_onnx_simple.py,export_onnx.py}`; `demo/apps/learner-web/public/models/learner.onnx` shipped and served (`DEPLOYMENT-REPORT.md:59`).
- Seed data + scripts under `demo/data/`, `demo/scripts/`, pipelines under `demo/pipelines/`.
- Stage tracker `demo/PROGRESS.md` — stages 0–7 complete.

**Gaps / deductions (−1):**
- **Localisation pipeline** (`demo/pipelines/localisation/`) exists but not wired end-to-end — `DEPLOYMENT-REPORT.md:54-68` lists it as PARTIAL.
- **Fabric mirroring** (`demo/ml/fabric_mirroring/README.md`) is documented intent; Fabric capacity gated off, explicitly out-of-scope.
- **Federated round** (`demo/ml/adaptive_model/federated_round.md`) prepared but not activated.

**To reach 5/5:** wire the localisation pipeline end-to-end on one NL→DE pair and demonstrate one federated round in `demo/`, even on synthetic data. **Owner:** Content Localisation Lead + Privacy-Preserving ML Engineer.

---

### 6. Logging and metrics — ⭐ 5/5

**Evidence:**
- `demo/infra/modules/monitor.bicep:1-33` — Log Analytics (PerGB2018, 90-day retention) + App Insights linked.
- `demo/infra/modules/app-diag.bicep` + per-service diagnostics on APIM, OpenAI, AI Search, Content Safety, Postgres, AML — all routed to Log Analytics.
- `demo/apps/learner-web/server.js:146-200` — `/api/chat` logs latency, tokens, Content Safety verdicts into `ask_history` + `content_safety_results`.
- `demo/apps/admin/server.js` — audit panels for `connection_logs`, `ask_history`, `content_safety_results`.
- `plan/04-compliance-eu-ai-act-gdpr.md:25` — Art. 12 record-keeping evidence path (App Insights + immutable Storage + KQL workbook).

**Gaps:** none material.

---

### 7. Use of AI technologies — ⭐ 5/5

**Evidence:**
- **Azure OpenAI** — `demo/infra/modules/openai.bicep:14,27-40` `gpt-5.4-nano`, public network disabled, `defaultAction: 'Deny'`.
- **Content Safety** — `_shared/contentSafety.js` MI-authenticated gatekeeper (input + output), threshold 4.
- **ONNX Runtime (client-side)** — `learner-web/public/models/learner.onnx` + `onnxruntime-web` picks item closest to P(correct)=0.7 (Vygotsky zone).
- **AI Search** — `demo/infra/modules/ai-search.bicep` Standard S1 with vector index, private endpoint, RAG entry point.
- **Azure ML Workspace** — `demo/infra/modules/aml-workspace.bicep` + `train_central.py` for model lifecycle.

**Gaps:** per-cohort fairness reporting not yet wired into deployed dashboards (documented in plan; not surfaced). Below the −1 threshold — flagged for next release. **Owner:** Responsible AI Evaluator.

---

### 8. AI model selection & deployment — ⭐ 5/5

**Evidence:**
- Model choice justified — `restitution/speaker-notes.md:32` "gpt-5.4-nano, 400K de contexte, raisonnement, déployé en West Europe sans rétention de payload" + Plan-B "GlobalStandard 50K TPM" rationale in `demo/DEPLOYMENT-STATE.md:40`.
- ONNX chosen for client-side personalisation to keep learner signals on-device — `restitution/speaker-notes.md:32`.
- Private/EU/MI deployment — AOAI `publicNetworkAccess: 'Disabled'`, `disableLocalAuth: true`; AML behind private endpoint; APIM Internal mode as single entry point.
- Federated + DP strategy documented in `plan/03-target-architecture.md:75` and `agents/privacy-preserving-ml-engineer.chatmode.md` (prepared; activation in roadmap).

**Gaps:** none material.

---

### 9. Autonomy and orchestration — ✅ 4/5

**Evidence:**
- Strong **design-time** autonomy — `agents/demo-deployment-agent.chatmode.md` (220+ lines) plans stages 0–7 independently with tool routing, safety rules, state tracking.
- `agents/edtech-program-orchestrator.chatmode.md` coordinates the 8 other specialists.

**Gaps / deductions (−1):**
- **Runtime autonomy in the deployed app is limited** — `demo/apps/learner-web/server.js` is request/response only; ONNX is deterministic inference, no agentic loop, planning, or tool use at runtime.
- This is partly **by design** (teacher-in-the-loop is constitutional), so we do not deduct further, but a 5 requires at least one runtime agentic surface (e.g., an autonomous "next-week study plan" composer with a teacher approval gate).

**To reach 5/5:** add one runtime agent loop in `learner-web` or `teacher-console` (e.g., LangGraph/Semantic Kernel orchestrator that proposes a week-plan and routes through teacher override). **Owner:** EdTech Program Orchestrator + Privacy-Preserving ML Engineer.

---

### 10. Multi-agent coordination — ⭐ 5/5

**Evidence:**
- **10 specialist chat modes** in `agents/`: program orchestrator, EU AI Act CO, GDPR specialist, privacy-preserving ML, learning sciences, content localisation, responsible AI evaluator, cross-agent QA verifier, demo deployment agent, restitution deck builder (NEW since baseline) + this AMA rubric evaluator.
- `agents/cross-agent-qa-verifier.chatmode.md` is a true independent auditor — 3-check audit (constraints / output contract / cross-agent consistency) with PASS/CONDITIONAL/FAIL verdicts.
- Explicit handoff sequence: Orchestrator → Learning Sciences → Privacy ML → GDPR → AI Act → Localisation → RAI → QA Verifier.
- Spec Kit workflow in `.specify/memory/constitution.md` formalises the gates: spec → clarify → plan → checklist → tasks → analyze → implement.

**Gaps:** none material.

---

### 11. Performance and reliability — ⭐ 5/5

**Evidence:**
- **Autoscale** — `demo/infra/modules/app-service.bicep:61-135` scale-out 1→3 at 70 % CPU / 80 % memory, scale-in at 30 % CPU, with cooldowns.
- **Static asset caching** — `learner-web/server.js:66-73` `Cache-Control: public, max-age=3600, immutable` for assets, `no-cache` for HTML.
- **Rate limiting + Retry-After** — `_shared/auth.js:96-98`.
- **Graceful degradation** — `learner-web/server.js:24-26,38` non-blocking schema init, `/api/health` reports `db.enabled: false` on Postgres outage; documented in `demo/PROGRESS.md:48`.
- **Timeouts & pool sizing** — `_shared/db/index.js` 4-connection pool, 8 s timeouts; health probe `AbortSignal.timeout(8000)`.

**Gaps:** no load-test artefacts yet to validate the autoscale thresholds — below the −1 threshold but flagged.

---

### 12. Clarity of explanation & presentation — ✅ 4/5 (was 5/5)

**Evidence (still strong):**
- `plan/` — 10 structured documents (charter → step-by-step tutorial), `plan/04-compliance-eu-ai-act-gdpr.md` article-by-article.
- `restitution/slides/` — **21 slides** with `speaker-notes.md` (French, 30-min) and `coverage-matrix.md` (rubric → slide mapping).
- `demo/DEMO-STORYTELLING.md` — polished 10-minute persona-driven flow.
- `demo/WALKTHROUGH.md` (400+ lines) and `demo/DEPLOYMENT-REPORT.md` — exceptional operational documentation.

**Gaps / deductions (−1, trigger: "Any spec/plan/tasks artefact missing for a feature being demoed → −1 on #12 and flag spec-driven delivery violation"):**
- `specs/001-learner-tabbed-workspace/spec.md` exists (substantive) but **`plan.md` and `tasks.md` are missing** — the Spec Kit mandatory sequence (spec → clarify → plan → checklist → tasks → analyze → implement) is broken for the very feature back-ported from `demo/feature/learner feature.md`.
- **No `specs/00X-parent-portal/` directory exists**, yet `demo/apps/parent-portal/` is live and demonstrated. This violates `.specify/memory/constitution.md` Principle VII ("specs, plans and tasks live under `specs/…` and are committed **before** the corresponding code").
- Consequence: an examiner reading the deck and the live demo cannot trace the parent-portal back to a spec/plan/tasks chain — presentation integrity drops.

**To reach 5/5:** create `specs/002-parent-portal/{spec.md,plan.md,tasks.md}` and back-fill `specs/001-learner-tabbed-workspace/{plan.md,tasks.md}`, then update `restitution/coverage-matrix.md` to reference them. **Owner:** EdTech Program Orchestrator (drive `/speckit.plan` → `/speckit.tasks`); QA: Cross-Agent QA Verifier.

---

## 🏆 Strengths

1. **Architecture is operationalised**, not just diagrammed — 15 Bicep modules, EU regions hard-pinned, private endpoints uniformly applied.
2. **Security is layered** — KV + MI + private endpoints + CSRF + rate-limit + Content Safety as non-optional gatekeeper.
3. **Real AI stack** — AOAI, Content Safety, on-device ONNX, AI Search RAG, AML registry — each with a clear purpose.
4. **Multi-agent ecosystem matured to 10 chat modes** with explicit handoff sequence and an adversarial QA verifier.
5. **Reliability primitives** all present — autoscale, caching, rate limiting, graceful DB degradation, timeouts.
6. **Restitution deck is now in the repo** — 21 slides + speaker notes + rubric coverage matrix make the work examinable end-to-end.

---

## ⚠️ Top fixes to lift the grade (priority order)

| # | Fix                                                                                                                                                  | Category affected | Points unlocked | Owner agent                                       |
|---|------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|-----------------|---------------------------------------------------|
| 1 | Back-fill `specs/001-learner-tabbed-workspace/{plan.md,tasks.md}` **and** create `specs/002-parent-portal/{spec.md,plan.md,tasks.md}`.               | #12 Presentation  | +1 (→ 58/60)    | EdTech Program Orchestrator + Cross-Agent QA Verifier |
| 2 | Wire the NL→DE localisation pipeline end-to-end on one unit and demo it in `demo/`.                                                                  | #5 Completeness   | +1 (→ 59/60)    | Content Localisation Lead + Privacy ML Engineer   |
| 3 | Add one runtime agent loop in `learner-web` (e.g., week-plan composer behind a teacher-approval gate).                                                | #9 Autonomy       | +1 (→ 60/60)    | EdTech Program Orchestrator + Learning Sciences Expert |
| 4 | Surface per-cohort fairness dashboard in `admin/` (Country / Language / SEN / Gender) — pulls from existing `ask_history` + `content_safety_results`. | #7 AI Tech (defensive) | maintains 5/5 | Responsible AI Evaluator                          |
| 5 | Publish a k6/Locust load-test report validating the 70 %/80 % autoscale thresholds.                                                                  | #11 Performance (defensive) | maintains 5/5 | Demo Deployment Agent                             |

---

## Constitution & compliance flags

| Principle | Status     | Evidence                                                                                                                                          |
|-----------|------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| I. EU-Resident, Data-Minimised      | ✅ Pass      | `demo/infra/main.bicep:19-50` region allow-list; all data services public access disabled.                                                       |
| II. GDPR Article 8 (age 16)         | ✅ Pass      | `demo/apps/learner-web/server.js:46-64` parental consent gate; `plan/04-compliance-eu-ai-act-gdpr.md` lawful basis matrix.                       |
| III. EU AI Act high-risk            | ✅ Pass      | `plan/04-compliance-eu-ai-act-gdpr.md:9-34` article-by-article; logging via App Insights; Content Safety on every AI surface.                    |
| IV. Teacher-in-the-loop             | ✅ Pass      | `plan/04-…:27` Art. 14 override on every assessment + content change; `demo/feature/EXECUTION-PLAN.md:35-36` override routes wired.              |
| V. Pedagogical sign-off             | ✅ Pass      | Spec template + `agents/learning-sciences-expert.chatmode.md` integrated into Spec Kit gates.                                                    |
| VI. Outcome-contract driven         | ✅ Pass      | `plan/05-kpis-outcomes.md` K1–K5 mapped to case-study targets (−26 % gap, −45 % admin, 12 mo → 6 w).                                              |
| VII. Spec-driven delivery           | ❌ **Breach** | `specs/001-learner-tabbed-workspace/` is missing `plan.md` and `tasks.md`; `demo/apps/parent-portal/` is live with **no spec at all**.            |

> The single breach above is the **only reason the grade did not move from 57 to 58 this round**. It is mechanical to fix — see Top Fix #1.

---

## Grade: **A (57/60)** 🎓

> Exceptional implementation rigour — the restitution deck and parent-portal close the demo gap that capped Application Demo at 4/5 in May, but a single spec-driven delivery breach (parent-portal shipped without `specs/`, learner-tabbed-workspace shipped without `plan.md`/`tasks.md`) pushes Presentation from 5 to 4 and keeps the total at 57/60. Back-filling the missing spec-kit artefacts and wiring one end-to-end localisation round would unlock 58–59 immediately, and adding one runtime agent loop would close the gap to a perfect 60/60.
