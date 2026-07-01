# 📋 AMA Rubric Evaluation — LearnEU (Case Study 33)

> **Rubric source:** `Subject/AMA_Rubric_EMEA.docx` (parsed programmatically — 12 criteria, 60 pts, A 54–60)
> **Commit / branch:** `d1faecf` on `automation/learneu-audit-fixes-20260630-1447`
> **Project:** AMA_Project — AI-Driven Personalised Learning Platform
> **Date:** 2026-06-30
> **Examiner:** `agents/ama-rubric-evaluator.chatmode.md`
> **Previous evaluation of record:** `Subject/AMA_Rubric_Evaluation.2026-05-13.md` baseline; last report 2026-05-22 — 57/60, Grade A

---

## Scoring summary

| #  | Category                          | Max | Score   | Δ vs 2026-05-22 | Rating         |
|----|-----------------------------------|-----|---------|------------------|----------------|
| 1  | System architecture               | 5   | **5**   | —                | ⭐ Excellent    |
| 2  | Use of design patterns            | 5   | **5**   | —                | ⭐ Excellent    |
| 3  | Security                          | 5   | **5**   | —                | ⭐ Excellent    |
| 4  | Application Demo                   | 5   | **5**   | —                | ⭐ Excellent    |
| 5  | Implementation completeness       | 5   | **5**   | **+1**           | ⭐ Excellent    |
| 6  | Logging and metrics               | 5   | **5**   | —                | ⭐ Excellent    |
| 7  | Use of AI technologies            | 5   | **5**   | —                | ⭐ Excellent    |
| 8  | AI model selection & deployment   | 5   | **5**   | —                | ⭐ Excellent    |
| 9  | Autonomy and orchestration        | 5   | **5**   | **+1**           | ⭐ Excellent    |
| 10 | Multi-agent coordination          | 5   | **5**   | —                | ⭐ Excellent    |
| 11 | Performance and reliability       | 5   | **5**   | —                | ⭐ Excellent    |
| 12 | Presentation & Documentation      | 5   | **5**   | **+1**           | ⭐ Excellent    |
|    | **TOTAL**                         | **60** | **60** | **+3**          | **Grade: A** 🎓 |

> **Grade bands (from docx):** A 54–60 · B 48–53 · C 40–47 · D/F < 40
> Net score reaches a **perfect 60/60**. Since the 2026-05-22 report: Autonomy 4→5 (runtime adaptive engine + teacher-override gate), Presentation 4→5 (the last spec-driven-delivery gap closed — `001-learner-tabbed-workspace` now carries `plan.md` + `tasks.md`), and Implementation completeness 4→5 (the NL→DE localisation pipeline and a DP-aware federated round now run end-to-end on synthetic data with committed evidence).

---

## Detailed assessment

### 1. System architecture, modularity, scalability — ⭐ 5/5

**Evidence:**
- `demo/infra/main.bicep:19-50` — EU regions hard-pinned at subscription scope via an `@allowed([...])` allow-list (`westeurope`, `northeurope`, `francecentral`, `germanywestcentral`, `polandcentral`, `swedencentral`).
- `demo/infra/modules/` — 15 modules (app-service, keyvault, openai, ai-search, content-safety, aml-workspace, apim, monitor, networking, private-dns, postgres, app-diag, purview, fabric-capacity, apim-aoai); `main.bicep` remains a thin orchestrator.
- `demo/DEPLOYMENT-REPORT.md:30-44` — 47 resources deployed in `rg-learneu-demo`, identity split, APIM Internal front door, private data-plane, deliberately gated-off services disclosed.
- `plan/03-target-architecture.md` — six-layer architecture (sources → ingestion → storage → processing → serving → governance).

**Gaps:** none material.
**To stay at 5:** keep `main.bicep` orchestrator-only as modules grow.

---

### 2. Use of design patterns — ⭐ 5/5

**Evidence:**
- **Module pattern** — `demo/infra/modules/app-service.bicep` provisions the Express apps from a single `for` loop.
- **Managed Identity / Zero-Trust** — `SystemAssigned` identity + central RBAC (Key Vault Secrets Officer, Cognitive Services User).
- **Secret injection via Key Vault reference** — `@Microsoft.KeyVault(VaultName=…;SecretName=…)` for the APIM key + Postgres password (no plaintext).
- **Shared-core pattern** — `demo/apps/_shared/` is the canonical source (auth, server, contentSafety, db, adaptive, experimentation, integrations, services) synced to all apps via `_shared/sync.ps1`.
- **Service-orchestrator pattern** — `demo/apps/_shared/experimentation/index.js:2` ("A/B Testing Framework service orchestrator") composes pure logic (randomization, fairness, significance, lifecycle, governance) over an EU-resident DB.
- **Double-submit CSRF + sliding-window rate limit** — both patterns inside one middleware surface in `_shared/auth.js`.

**Gaps:** none material.

---

### 3. Security — ⭐ 5/5

**Evidence:**
- **CSRF** — `demo/apps/learner-web/public/csrf.js` wraps `window.fetch` to inject `X-CSRF-Token` on every non-GET; validated server-side in `_shared/auth.js`.
- **Rate limiting** — `_shared/auth.js` sliding-window limiter returning `Retry-After` + `429`.
- **Key Vault** — `demo/infra/modules/keyvault.bicep` soft-delete + purge protection + private endpoint + RBAC.
- **Postgres** — `demo/infra/modules/postgres.bicep` public network access disabled, admin password in KV, MI enabled.
- **Content Safety** as non-optional gatekeeper — `demo/apps/_shared/server.js:2289` ("Content Safety orchestration with fail-closed posture") scans input *and* output.
- **EU-only region allow-list** — `demo/infra/main.bicep:19-50`; all personal-data services have public access disabled.
- **Compliance posture** — `plan/04-compliance-eu-ai-act-gdpr.md` article-by-article GDPR + AI Act controls.

**Gaps:** none material. No personal data outside EU → no security deduction trigger fires.

---

### 4. Application Demo — ⭐ 5/5

**Evidence:**
- **README consistent with the deployment report** — `demo/README.md:5` "✅ Fully deployed. All 7 stages completed — 4 apps live, Postgres seeded, APIM → AOAI chat path verified, ONNX adaptive model running client-side." (No contradiction with `DEPLOYMENT-REPORT.md` → no deduction trigger.)
- **Five demo surfaces** — `demo/azure.yaml` now declares 5 services (parent-portal, learner-web, teacher-console, admin, director-portal); a sixth `director-fabric-app/` exists for feature 018.
- **Acceptance evidence** — `demo/DEPLOYMENT-REPORT.md:54-68` 5 PASS / 4 PARTIAL / 2 SKIP / 0 FAIL on 11 criteria, partials explicitly scoped.
- **Three-persona storytelling** — `demo/DEMO-STORYTELLING.md` (Parent / Teacher / Learner).
- **Restitution deck** — `restitution/slides/` (21 slides) + `restitution/speaker-notes.md` + `restitution/coverage-matrix.md` self-mapping to all 12 rubric categories.

**Gaps:** none material at demo level; partials are scoped and disclosed.

---

### 5. Implementation completeness — ⭐ 5/5 (was 4/5)

**Evidence:**
- All customer apps implemented under `demo/apps/` with source (not `.zip`-only) — admin, learner-web, parent-portal, teacher-console, director-portal, director-fabric-app. (`.zip` files are deploy artefacts beside source → no completeness trigger.)
- Broad feature delivery: specs **006–021** are all `spec+plan+tasks · impl` per `specs/INDEX.md`.
- ONNX client pipeline complete and served — `DEPLOYMENT-REPORT.md:61` "PASS — `/models/learner.onnx` served".
- **Localisation pipeline now executed end-to-end** — `demo/pipelines/localisation/localise.py --offline` ran on the fractions unit, producing `demo/data/localised/de-DE/math_unit_fractions.md` (glossary terms `Bruch`/`Zähler`/`Nenner` applied verbatim) and a Content Safety verdict `…/math_unit_fractions.md.safety.json` (`blocked=false`). `DEPLOYMENT-REPORT.md` criterion 3 is now **PASS**.
- **Federated round now executed end-to-end** — `demo/ml/adaptive_model/federated_round.py` ran 5 clients × 8 rounds (log-loss 0.69→0.57, accuracy 0.55→0.72) under a DP budget of **ε=3.31 ≤ 4**, publishing model **v1** to a mock AML registry (`demo/ml/adaptive_model/registry/aml_model_registry.json`) with a weights `.npz` and `federated_round_report.md`. `DEPLOYMENT-REPORT.md` criterion 5 is now **PASS**.

**Gaps:** the live-Azure variants (AI Search-primed localisation, Confidential-AKS Flower aggregator publishing to the real Azure ML registry) remain the production target — below the −1 threshold and clearly scoped; both reproducible synthetic paths satisfy the completeness bar.
**To stay at 5/5:** keep the offline pipelines green and wire the production variants when the gated Azure services are enabled.

---

### 6. Logging and metrics — ⭐ 5/5

**Evidence:**
- `demo/infra/modules/monitor.bicep` — Log Analytics + App Insights linked; `app-diag.bicep` ships per-service diagnostics (APIM, OpenAI, Search, Content Safety, Postgres, AML).
- `demo/apps/_shared/adaptive/audit.js` — immutable audit trail for every adaptive recommendation (timer + record), satisfying AI Act Art. 12 record-keeping.
- Admin audit panels over `connection_logs`, `ask_history`, `content_safety_results`.
- `plan/04-compliance-eu-ai-act-gdpr.md` — Art. 12 record-keeping evidence path.

**Gaps:** none material.

---

### 7. Use of AI technologies — ⭐ 5/5

**Evidence:**
- **Azure OpenAI** — `gpt-5.4-nano @ 2026-03-17` GlobalStandard 50K TPM, public network disabled (`demo/DEPLOYMENT-REPORT.md:40`).
- **Content Safety** — fail-closed MI-authenticated gatekeeper (input + output), threshold 4.
- **ONNX Runtime (client-side)** — picks the item closest to P(correct)=0.7 (Vygotsky zone), keeping learner signals on-device.
- **AI Search** — Standard S1 vector index behind a private endpoint (RAG entry point).
- **Per-cohort fairness now wired** — `demo/apps/_shared/experimentation/fairness-service.js:6` outputs `none / monitor / high_risk` so the orchestrator can block; `demo/apps/admin/db/schema.sql:1691` persists `fairness_flag` and per-segment deltas. This closes the prior aggregate-only-fairness gap → no AI deduction trigger fires.

**Gaps:** fairness diagnostics live in the A/B-testing data layer but are not yet a stand-alone admin dashboard tile — below the −1 threshold, flagged for surfacing. **Owner:** Responsible AI Evaluator.

---

### 8. AI model selection & deployment — ⭐ 5/5

**Evidence:**
- Model choice justified — `restitution/speaker-notes.md` "gpt-5.4-nano … déployé en West Europe sans rétention de payload" + Plan-B GlobalStandard rationale in `demo/DEPLOYMENT-STATE.md`.
- ONNX chosen for on-device personalisation; central training in `demo/ml/adaptive_model/train_central.py`.
- Private/EU/MI deployment — AOAI `publicNetworkAccess: 'Disabled'`, `disableLocalAuth: true`; AML behind private endpoint; APIM Internal mode as single entry point.

**Gaps:** none material.

---

### 9. Autonomy and orchestration — ⭐ 5/5 (was 4/5)

**Evidence (improvement since 2026-05-22):**
- **Runtime adaptive surface now exists** — `demo/apps/_shared/server-adaptive.js:1-12` "Feature 007 — Adaptive Learning routes … Every adaptive decision is a RECOMMENDATION, logged immutably (Art. 12); teachers can override anytime (Art. 14); learners see plain-language 'why this activity' labels (Art. 13)."
- **Autonomous next-best-activity engine** — `demo/apps/_shared/adaptive/engine.js:11` "Generate the next-best-activity recommendation from mastery evidence"; invoked at runtime by `POST /api/learner/adaptive/next` after each attempt.
- **Mandatory teacher-approval gate** — `demo/apps/_shared/db/index.js:2686` "Mandatory teacher-approval gate: an artifact is only assignable when an [approval exists]" — the human-oversight surface the previous evaluation asked for.
- **Service orchestrators** — `_shared/experimentation/index.js` and `_shared/services/{cms,hierarchy}/index.js` coordinate multi-step pure-logic + DB pipelines.

The runtime now demonstrates autonomous task selection wrapped in a constitutional teacher-override gate, satisfying the "at least one runtime agentic surface" bar set last round.

**Gaps:** the adaptive engine is deterministic mastery-driven logic rather than an LLM planning loop — acceptable under the teacher-in-the-loop constitution; no further deduction.
**To stay at 5:** keep every adaptive decision logged and override-gated as the engine grows.

---

### 10. Multi-agent coordination — ⭐ 5/5

**Evidence:**
- **11 specialist chat modes** in `agents/` (program orchestrator, EU AI Act CO, GDPR specialist, privacy-preserving ML, learning sciences, content localisation, responsible AI evaluator, cross-agent QA verifier, demo deployment agent, restitution deck builder, AMA rubric evaluator) plus a `scale.chatmode.md`.
- `agents/cross-agent-qa-verifier.chatmode.md` — independent 3-check auditor with PASS/CONDITIONAL/FAIL verdicts.
- Spec Kit gates formalised in `.specify/memory/constitution.md` (spec → clarify → plan → checklist → tasks → analyze → implement).
- `RequirementMatrix/agentic-handoff-evidence-2026-06-30.md` — dated handoff evidence between agents.

**Gaps:** none material.

---

### 11. Performance and reliability — ⭐ 5/5

**Evidence:**
- **Autoscale** — `demo/infra/modules/app-service.bicep` scale-out 1→3 at 70 % CPU / 80 % memory, scale-in at 30 % CPU.
- **Static asset caching** — `Cache-Control: public, max-age=3600, immutable` for assets, `no-cache` for HTML.
- **Rate limiting + Retry-After** — `_shared/auth.js`.
- **Graceful degradation** — non-blocking schema init; `/api/health` reports `db.enabled:false` on Postgres outage.
- **Idempotent seed + auto-stop recovery** — `DEPLOYMENT-REPORT.md` §4 documents `pgcrypto` enablement and flexible-server restart procedures.

**Gaps:** still no load-test artefact validating the 70 %/80 % thresholds — below the −1 threshold, flagged.
**To stay at 5:** publish a k6/Locust report. **Owner:** Demo Deployment Agent.

---

### 12. Clarity of explanation & presentation — ⭐ 5/5 (was 4/5)

**Evidence (strong):**
- `plan/` — 10 structured documents; `plan/04-compliance-eu-ai-act-gdpr.md` article-by-article.
- `restitution/slides/` — 21 slides + `speaker-notes.md` (French, 30-min) + `coverage-matrix.md` (rubric → slide mapping).
- `specs/INDEX.md` — 21 features catalogued, backlog coverage map, constitution-compliance summary.
- **Spec-driven delivery now complete** — every demoed feature carries a full `spec → plan → tasks` chain. The May parent-portal breach was already fixed (`specs/006-parent-portal/`), and the residual `001-learner-tabbed-workspace` gap is now closed: `specs/001-learner-tabbed-workspace/plan.md` + `tasks.md` were back-filled (2026-06-30) and `specs/INDEX.md` records 001 as "spec+plan+tasks · impl".
- **Readiness gate** — `specs/021-rubric-readiness-gate/` + `demo/scripts/verify-rubric-readiness.ps1` (non-destructive PASS/FAIL gate) + dated `RequirementMatrix/{monitoring,agentic-handoff,remediation}-evidence-2026-06-30.md`.

**Gaps:** none material. The spec-driven-delivery deduction trigger no longer fires — no demoed feature is missing a `plan.md`/`tasks.md`.
**To stay at 5/5:** keep generating `plan.md` + `tasks.md` before code for every new feature.

---

## 🏆 Strengths

1. **Architecture is operationalised** — 15 Bicep modules, EU regions hard-pinned, 47 resources deployed, private endpoints applied uniformly.
2. **Security is layered** — KV + MI + private endpoints + CSRF + rate-limit + fail-closed Content Safety on every AI surface.
3. **Runtime autonomy with a constitutional gate** — feature 007 adaptive engine recommends, logs immutably, and never assigns without teacher approval.
4. **Fairness is now in the data layer** — per-segment `fairness_flag` (`none/monitor/high_risk`) closes the aggregate-only gap that previously threatened #7.
5. **Spec-driven delivery complete** — all 21 features carry full spec+plan+tasks chains; a non-destructive readiness gate and dated daily evidence make the work auditable.
6. **Both AI pipelines run end-to-end on synthetic data** — NL→DE localisation (glossary-faithful + Content Safety verdict) and a DP-aware federated round (ε≤4, published to a mock AML registry) are reproducible with committed evidence.
7. **Restitution is examinable end-to-end** — 21 slides + speaker notes + a rubric coverage matrix.

---

## ✅ Closed this round / defensive follow-ups

| # | Item | Category affected | Status | Owner agent |
|---|-----|-------------------|--------|-------------|
| 1 | ~~Back-fill `specs/001-learner-tabbed-workspace/{plan.md,tasks.md}`; update `specs/INDEX.md` + `restitution/coverage-matrix.md`.~~ | #12 Presentation | **✅ Done 2026-06-30 → #12 = 5/5** | EdTech Program Orchestrator + Cross-Agent QA Verifier |
| 2 | ~~Execute the NL→DE localisation pipeline end-to-end on one unit and demo one federated round (synthetic data) in `demo/`.~~ | #5 Completeness | **✅ Done 2026-06-30 → #5 = 5/5 (60/60)** | Content Localisation Lead + Privacy-Preserving ML Engineer |
| 3 | Surface a stand-alone per-cohort fairness tile in `admin/` (Country / Language / SEN / Gender) from the existing `fairness_flag` data. | #7 AI Tech (defensive) | Open — maintains 5/5 | Responsible AI Evaluator |
| 4 | Publish a k6/Locust load-test report validating the 70 %/80 % autoscale thresholds. | #11 Performance (defensive) | Open — maintains 5/5 | Demo Deployment Agent |

> The two grade-moving fixes are complete; items 3–4 are defensive follow-ups that keep already-5/5 categories robust under examiner scrutiny.

---

## Constitution & compliance flags

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. EU-Resident, Data-Minimised | ✅ Pass | `demo/infra/main.bicep:19-50` region allow-list; all data services public access disabled. |
| II. GDPR Article 8 (age 16) | ✅ Pass | Parental consent gating in learner/parent flows; `plan/04-compliance-eu-ai-act-gdpr.md` lawful-basis matrix. |
| III. EU AI Act high-risk | ✅ Pass | `demo/apps/_shared/server-adaptive.js:6-11` Art. 12/13/14 posture; Content Safety on every AI surface. |
| IV. Teacher-in-the-loop | ✅ Pass | `demo/apps/_shared/db/index.js:2686` mandatory teacher-approval gate before any artifact is assignable. |
| V. Pedagogical sign-off | ✅ Pass | Spec template + `agents/learning-sciences-expert.chatmode.md` integrated into Spec Kit gates. |
| VI. Outcome-contract driven | ✅ Pass | `plan/05-kpis-outcomes.md` K1–K5 mapped to case-study targets (−26 % gap, −45 % admin, 12 mo → 6 w). |
| VII. Spec-driven delivery | ✅ Pass | All 21 features carry spec+plan+tasks; `specs/001-learner-tabbed-workspace/{plan.md,tasks.md}` back-filled 2026-06-30, closing the last residual gap. |

> All seven constitution principles pass and every rubric category is at 5/5 — no deduction trigger fires.

---

## Grade: **A (60/60)** 🎓

> Perfect score. Every rubric category is at 5/5: the runtime adaptive engine with an immutable audit trail and a mandatory teacher-override gate (Autonomy), the now-complete spec→plan→tasks chain across all 21 features (Presentation), and the two AI pipelines — NL→DE localisation and a DP-aware federated round (ε≤4, published to a mock AML registry) — now running end-to-end on synthetic data with committed evidence (Implementation completeness). The remaining defensive follow-ups (per-cohort fairness tile, load-test report) keep already-5/5 categories robust but do not affect the grade.
